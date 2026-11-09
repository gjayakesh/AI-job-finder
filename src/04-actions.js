/* ============ Render ============ */
let _lastView = null;
function render() {
  const r = route();
  const main = $('#main'); const prevScroll = main ? main.scrollTop : 0; const sameView = _lastView === r.view + (r.id || '');
  let title = TITLES[r.view] || 'Dashboard', body;
  if (S.mode === 'loading') body = `<div class="card"><div class="busy"><span class="spin"></span>Loading your workspace…</div></div>`;
  else if (r.view === 'job') { const j = S.jobs[r.id]; title = j ? 'Job Match Analysis' : 'Job'; body = V.job(r.id); }
  else body = (V[r.view] || V.dashboard)();
  $('#app').innerHTML = layout(r.view, title, body);
  const m2 = $('#main'); if (m2 && sameView) m2.scrollTop = prevScroll;
  _lastView = r.view + (r.id || '');
  if (r.view === 'chat') { const log = $('#chat-log'); if (log) log.scrollTop = log.scrollHeight; }
}
window.addEventListener('hashchange', () => { S.ui.notifOpen = false; render(); const m = $('#main'); if (m) m.scrollTop = 0; const rail = $('#rail'); if (rail) rail.classList.remove('open'); });

/* ============ Workflow helpers ============ */
function ensureProfile() { if (!S.profile || !S.profile.name && !(S.profile.skills || []).length) { toast('Add your career profile first: upload a resume on the Resumes page.', 'bad'); go('resumes'); return false; } return true; }
function scoreAndStore(j, by = 'Job Matching Agent') {
  j.match = scoreJob(j, S.profile, S.prefs, S.settings.weights);
  if (j.stage === 'Discovered') moveStage(j, 'Analyzed', { by, note: `Score ${j.match.score} (${j.match.category})`, silent: true }); else save.job(j);
  return j;
}
function rescoreAll() {
  Object.values(S.jobs).forEach(j => { const old = j.match && j.match.ai; j.match = scoreJob(j, S.profile, S.prefs, S.settings.weights); if (old) j.match.ai = old; save.job(j); });
  logAgent('Job Matching Agent', 'Re-scored all jobs', `${Object.keys(S.jobs).length} jobs with weights ${Object.entries(S.settings.weights).map(([k, v]) => k + v).join(' ')}`);
}
async function runWorkflow(j, { local = false } = {}) {
  if (!ensureProfile()) return false;
  if (j.stage === 'Discovered') scoreAndStore(j);
  if (!j.match) j.match = scoreJob(j, S.profile, S.prefs, S.settings.weights);
  if (j.stage === 'Analyzed') moveStage(j, 'Shortlisted', { by: 'Application Agent', note: 'Selected for application', silent: true });
  if (j.stage === 'Shortlisted') { const v = await tailorResume(j, { forceLocal: local }); j.app = j.app || {}; j.app.versionId = v.id; moveStage(j, 'ResumeGenerated', { by: 'Resume Optimization Agent', note: `v${v.version}, ATS ${v.coverage}%`, silent: true }); }
  if (j.stage === 'ResumeGenerated') { await prepareApplication(j); moveStage(j, 'AwaitingApproval', { by: 'Application Agent', note: 'Stopped for your approval' }); }
  return true;
}
async function answerExtra(j, qs) {
  const p = S.profile;
  const prompt = `Answer job application questions ONLY from the verified candidate profile below. If the profile does not contain the answer, return an empty answer and needs_input true. Never invent facts, numbers, dates or skills.
${UNTRUSTED}
Profile: ${JSON.stringify({ name: p.name, location: p.location, totalYears: candidateYears(p), skills: profileSkillNames(p), experiences: p.experiences, projects: p.projects, education: p.education, noticePeriod: p.noticePeriod, relocate: p.relocate })}
Questions: <untrusted>${JSON.stringify(qs)}</untrusted>
Reply with only a JSON array: [{"question": string, "answer": string, "evidence": "which profile field supports it", "needs_input": boolean}]`;
  const localAns = q => { const sk = detectSkills(q); const have = lcSet(profileSkillNames(p)); if (sk.length && /experience|worked|know|familiar|used/i.test(q)) { const yes = sk.filter(s => have.has(s.toLowerCase())); const no = sk.filter(s => !have.has(s.toLowerCase())); if (!no.length) { const pj = (p.projects || []).find(x => yes.some(s => splitList(x.technologies).map(canonSkill).includes(s))); return { question: q, answer: `Yes. ${yes.join(', ')} ${pj ? `— used in my project ${pj.name}` : 'is listed in my skills'}.`, evidence: pj ? 'Profile › Projects' : 'Profile › Skills', needs_input: false }; } } return { question: q, answer: '', evidence: '', needs_input: true }; };
  const { out, engine } = await AI.route({ personal: true, label: 'Answering employer questions…', prompt, validate: o => Array.isArray(o), local: async () => qs.map(localAns) });
  out.forEach((o, i) => j.app.answers.push({ id: uid('q'), key: 'custom', q: String(o.question || qs[i]), a: String(o.answer || ''), evidence: o.answer ? `${engine === 'ai' ? AI.name : 'Local engine'} from ${o.evidence || 'profile'} — review` : '', needsInput: !!o.needs_input || !o.answer, required: true, draft: true }));
  save.job(j); logAgent('Application Agent', 'Answered extra questions', `${qs.length} question(s) for ${j.company}`, engine);
}
async function importJobs(url, text) {
  const parts = String(text || '').split(/^\s*-{3,}\s*$/m).map(s => s.trim()).filter(Boolean);
  if (!parts.length) { toast('Paste the job description to import it.', 'bad'); return []; }
  const created = [], dups = [];
  for (const part of parts) {
    const purl = parts.length > 1 ? ((part.match(/https?:\/\/\S+/) || [''])[0]) : (url || (part.match(/https?:\/\/\S+/) || [''])[0]);
    const local = extractJobLocal(part, purl);
    const { out, engine } = await AI.route({ personal: false, label: `Reading “${local.title.slice(0, 40)}”…`, tier: 'quick', prompt: `Extract structured fields from this job posting. ${UNTRUSTED}\n<untrusted>${part.slice(0, 20000)}</untrusted>\nURL: ${purl || 'none'}\nReply with only JSON: ${JOB_SCHEMA}`, validate: o => o && o.title, local: async () => local });
    const f = engine === 'ai' ? jobFromAI(out, local) : local;
    if (engine === 'ai' && !f.requiredSkills.length && !f.preferredSkills.length) { f.requiredSkills = local.requiredSkills; f.preferredSkills = local.preferredSkills; }
    const j = { id: uid('j'), ...f, description: part, applyUrl: purl || '', source: detectSource(purl), externalId: externalId(purl), discoveredAt: nowISO(), stage: 'Discovered', history: [{ from: null, to: 'Discovered', t: nowISO(), by: 'Job Discovery Agent', evidence: purl ? 'Imported from link' : 'Pasted description' }], extractEngine: engine, app: {} };
    const scam = scamCheck(part); if (scam || f.suspicious) { j.suspicious = true; j.suspiciousReason = scam || f.suspiciousReason; }
    if (j.deadline && j.deadline < isoDay(new Date())) j.expired = true;
    const dup = findDuplicate(j);
    if (dup) { dups.push(dup); logAgent('Job Discovery Agent', 'Skipped duplicate', `${j.title} @ ${j.company} matches existing job`, engine); continue; }
    S.jobs[j.id] = j; save.job(j); logAgent('Job Discovery Agent', 'Imported job', `${j.title} @ ${j.company} (${SOURCE_NAME[j.source]})`, engine);
    scoreAndStore(j); created.push(j);
  }
  if (dups.length) toast(`${dups.length} duplicate${dups.length > 1 ? 's' : ''} skipped (already in your list: ${dups.map(d => d.company).join(', ')})`);
  if (created.some(j => j.expired)) toast('One posting has a deadline in the past. It was imported but marked expired.');
  return created;
}

/* ============ Resume upload & profile extraction ============ */
async function handleResumeFile(file) {
  let res;
  try { res = await Busy.local(`Reading ${file.name}…`, () => extractFileText(file)); }
  catch (e) { toast(e.message || 'Could not read that file.', 'bad'); return; }
  await storeResume(file.name, res.kind, res.text, file.size);
}
async function storeResume(filename, kind, text, size) {
  if (String(text).trim().length < 60) { toast('Almost no text was found. A scanned PDF has no text layer; paste the resume text instead.', 'bad'); return; }
  const r = { id: uid('r'), filename, kind, uploadedAt: nowISO(), text: String(text).slice(0, 150000), sizeBytes: size || text.length, immutable: true };
  r.hash = await sha256(r.text); S.resumes[r.id] = r; save.resume(r);
  logAgent('Career Profile Agent', 'Stored original resume', `${filename} (${r.text.length} characters, sha256 ${r.hash.slice(0, 12)}…)`);
  await extractProfileFrom(r);
}
async function extractProfileFrom(r) {
  const local = parseResumeLocal(r.text);
  let res;
  try {
    res = await AI.route({ personal: true, label: 'Extracting your career profile…', prompt: `Extract a structured career profile from this resume. Copy facts exactly; never guess or add anything that is not written. Use "" or [] when a field is absent. ${UNTRUSTED}\n<untrusted>${r.text.slice(0, 60000)}</untrusted>\nReply with only JSON matching: ${PROFILE_SCHEMA}`, validate: o => o && (o.name || (o.skills || []).length), local: async () => local });
  } catch (e) { if (e && e.code === 'cancelled') res = { out: local, engine: 'local' }; else throw e; }
  const ex = normalizeProfile(res.engine === 'ai' ? res.out : local);
  logAgent('Career Profile Agent', 'Extracted profile', `${ex.skills.length} skills, ${ex.projects.length} projects, ${ex.experiences.length} roles, ${ex.education.length} education entries`, res.engine);
  showProfileReview(ex, res.engine);
}
let _pendingProfile = null;
function showProfileReview(ex, engine) {
  _pendingProfile = ex; const has = S.profile && (S.profile.name || (S.profile.skills || []).length);
  openModal(`<div class="row"><h2>Review the extracted profile</h2>${engineTag(engine)}</div><p class="small muted">Check this before it is saved. You can edit everything afterwards on the Career Profile page.</p>
  <div class="grid g2"><div class="stack small"><div><b>${esc(ex.name || 'Name not found')}</b></div><div>${esc([ex.email, ex.phone, ex.location].filter(Boolean).join(' · ') || 'No contact details found')}</div><div class="muted">${esc([ex.linkedin, ex.github, ex.portfolio].filter(Boolean).join(' · '))}</div><div>Level: ${esc(ex.experienceLevel)} · ${ex.totalYears} yrs full-time</div></div>
  <div class="stack small"><b>Skills (${ex.skills.length})</b>${chipList(ex.skills)}</div></div>
  <div class="grid g3 small"><div><b>Projects (${ex.projects.length})</b><ul style="margin:4px 0;padding-left:18px">${ex.projects.map(p => `<li>${esc(p.name)}${p.technologies ? ` <span class="muted">— ${esc(p.technologies)}</span>` : ''}</li>`).join('') || '<li class="muted">None found</li>'}</ul></div>
  <div><b>Experience (${ex.experiences.length})</b><ul style="margin:4px 0;padding-left:18px">${ex.experiences.map(e => `<li>${esc(e.role)}${e.employer ? ' · ' + esc(e.employer) : ''} <span class="muted">${esc(e.start)}–${esc(e.end || 'now')}</span></li>`).join('') || '<li class="muted">None found</li>'}</ul></div>
  <div><b>Education (${ex.education.length})</b><ul style="margin:4px 0;padding-left:18px">${ex.education.map(e => `<li>${esc(e.degree)}${e.institution ? ', ' + esc(e.institution) : ''} ${esc(e.year)}</li>`).join('') || '<li class="muted">None found</li>'}</ul></div></div>
  <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button>${has ? '<button class="btn" type="button" data-act="profile-apply" data-mode="merge">Merge into my profile</button>' : ''}<button class="btn primary" type="button" data-act="profile-apply" data-mode="replace">${has ? 'Replace profile details' : 'Save as my profile'}</button></div>`, { wide: true });
}
function applyExtracted(mode) {
  const ex = _pendingProfile; if (!ex) return; const cur = S.profile || {};
  const keep = { workModes: cur.workModes, employmentTypes: cur.employmentTypes, relocate: cur.relocate, noticePeriod: cur.noticePeriod, currentCtc: cur.currentCtc, expectedMin: cur.expectedMin, expectedMax: cur.expectedMax, preferredRoles: cur.preferredRoles, preferredLocations: cur.preferredLocations, workAuth: cur.workAuth };
  let p;
  if (mode === 'merge' && cur.name !== undefined) {
    p = clone(cur);
    ['name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio', 'summary'].forEach(k => { if (!p[k] && ex[k]) p[k] = ex[k]; });
    p.skills = uniqCI([...(p.skills || []), ...ex.skills]);
    const addBy = (k, key) => { const have = new Set((p[k] || []).map(key)); p[k] = [...(p[k] || []), ...ex[k].filter(x => !have.has(key(x)))]; };
    addBy('projects', x => x.name.toLowerCase()); addBy('experiences', x => (x.employer + '|' + x.role).toLowerCase()); addBy('education', x => (x.degree + '|' + x.institution).toLowerCase());
    p.certifications = uniqCI([...(p.certifications || []), ...ex.certifications]); p.achievements = uniqCI([...(p.achievements || []), ...ex.achievements]);
  } else p = { ...ex, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)) };
  p.workModes = p.workModes || []; p.employmentTypes = p.employmentTypes || ['full_time']; p.updatedAt = nowISO();
  delete p.demo;
  S.profile = p; save.profile(); _pendingProfile = null; closeModal();
  rescoreAll(); logAgent('Career Profile Agent', mode === 'merge' ? 'Merged extracted profile' : 'Saved extracted profile', `${p.skills.length} skills`);
  toast('Profile saved. Add notice period, salary and job targets to complete it.'); go('profile');
}
function collectProfile(form) {
  const fd = new FormData(form); const base = clone(S.ui.draft || S.profile || normalizeProfile({}));
  const g = k => String(fd.get(k) ?? '').trim();
  Object.assign(base, { name: g('name'), email: g('email'), phone: g('phone'), location: g('location'), linkedin: g('linkedin'), github: g('github'), portfolio: g('portfolio'), summary: g('summary'), experienceLevel: g('experienceLevel'), noticePeriod: g('noticePeriod'), workAuth: g('workAuth'), preferredLocations: g('preferredLocations') });
  base.totalYears = g('totalYears') === '' ? '' : +g('totalYears');
  base.currentCtc = g('currentCtc') === '' ? '' : +g('currentCtc');
  base.expectedMin = g('expectedMinL') === '' ? null : Math.round(+g('expectedMinL') * 1e5); base.expectedMax = g('expectedMaxL') === '' ? null : Math.round(+g('expectedMaxL') * 1e5);
  base.workModes = fd.getAll('workModes'); base.employmentTypes = fd.getAll('employmentTypes'); base.relocate = fd.get('relocate') === '1';
  base.preferredRoles = splitList(g('preferredRoles')); base.skills = uniqCI(splitList(g('skills')).map(canonSkill));
  base.certifications = g('certifications').split('\n').map(s => s.trim()).filter(Boolean); base.achievements = g('achievements').split('\n').map(s => s.trim()).filter(Boolean);
  const kinds = { projects: ['name', 'technologies', 'link', 'description'], experiences: ['role', 'employer', 'start', 'end', 'description'], education: ['degree', 'institution', 'year', 'score'] };
  for (const [k, fields] of Object.entries(kinds)) base[k] = (base[k] || []).map((it, i) => { const o = { ...it }; fields.forEach(f => { const v = fd.get(`${k}.${i}.${f}`); if (v !== null) o[f] = String(v).trim(); }); return o; });
  return base;
}

/* ============ Chat agent ============ */
let _chatNav = null, _chatCtl = null;
function overviewData() {
  const A = analytics(); const p = S.profile || {};
  return { counts: { jobs: A.total, matching70: A.matching, awaitingApproval: A.awaiting, applied: A.applied, shortlisted: A.shortlisted, rejected: A.rejected, interviews: A.interviews, offers: A.offers }, rates: { shortlist: A.shortlistRate, rejection: A.rejectionRate, interview: A.interviewRate, offer: A.offerRate }, preferences: S.prefs ? prefsToApiJSON(S.prefs) : null, profile: { hasProfile: !!p.name, years: candidateYears(p), skills: profileSkillNames(p).slice(0, 30), projects: (p.projects || []).map(x => x.name) } };
}
const jobBrief = j => ({ id: j.id, title: j.title, company: j.company, score: j.match ? j.match.score : null, stage: j.stage, location: j.workMode === 'remote' ? 'Remote' : j.location, salary: salaryRange(j.salaryMin, j.salaryMax), link: '#job-' + j.id });
function openJobs() { return Object.values(S.jobs).filter(j => !['Archived', 'EmployerRejected', 'Withdrawn', 'OfferDeclined', 'OfferAccepted', 'RejectedByUser'].includes(j.stage)); }
function topOpenForPrep(n, minScore = S.settings.autoShortlist) { return openJobs().filter(j => ['Discovered', 'Analyzed', 'Shortlisted', 'ResumeGenerated'].includes(j.stage) && !j.suspicious && !j.expired && (j.match ? j.match.score : 0) >= minScore).sort((a, b) => (b.match ? b.match.score : 0) - (a.match ? a.match.score : 0)).slice(0, n); }
async function batchPrepare(list) { const done = []; for (const j of list) { try { if (await runWorkflow(j, { local: true })) done.push({ ...jobBrief(j), needsInput: (j.app.answers || []).filter(a => a.needsInput && !a.a).length }); } catch (e) { console.warn(e); } } return done; }
function chatTools() {
  return [
    { name: 'get_overview', description: 'Returns counts by status, conversion rates, the saved job preferences and a summary of the profile (years, skills, project names).', execute: () => overviewData() },
    { name: 'list_jobs', description: 'Lists jobs with id, title, company, match score 0-100, stage, location, salary and an app link. Sorted by score.', inputSchema: { type: 'object', properties: { min_score: { type: 'number' }, stage: { type: 'string', description: 'Optional stage, e.g. Analyzed, AwaitingApproval, Applied, EmployerRejected, InterviewScheduled' }, limit: { type: 'number' } } }, execute: i => Object.values(S.jobs).filter(j => (!i.min_score || (j.match && j.match.score >= +i.min_score)) && (!i.stage || j.stage === String(i.stage))).sort((a, b) => (b.match ? b.match.score : 0) - (a.match ? a.match.score : 0)).slice(0, Math.min(+i.limit || 20, 40)).map(jobBrief) },
    { name: 'get_job', description: 'Returns one job with match components, matched and missing skills, recommendation and status history.', inputSchema: { type: 'object', properties: { job_id: { type: 'string' } }, required: ['job_id'] }, execute: i => { const j = S.jobs[String(i.job_id)]; if (!j) throw new Error('No job with that id'); return { ...jobBrief(j), required: j.requiredSkills, preferred: j.preferredSkills, match: j.match && { components: Object.fromEntries(Object.entries(j.match.components).map(([k, c]) => [COMP_LABEL[k], c.v + ' — ' + c.note])), missingRequired: j.match.missingRequired, missingPreferred: j.match.missingPreferred, recommendation: j.match.recommendation }, history: (j.history || []).map(h => h.to + ' ' + h.t.slice(0, 10)) }; } },
    { name: 'save_preferences', description: 'Saves structured job preferences, replacing the current ones, and re-scores jobs. Salary in rupees per year (4 LPA = 400000). Call only after the user stated or confirmed them.', inputSchema: { type: 'object', properties: { job_titles: { type: 'array', items: { type: 'string' } }, locations: { type: 'array', items: { type: 'string' } }, skills: { type: 'array', items: { type: 'string' } }, work_modes: { type: 'array', items: { type: 'string', enum: ['remote', 'hybrid', 'onsite'] } }, experience_min: { type: 'number' }, experience_max: { type: 'number' }, salary_min: { type: 'number' }, salary_max: { type: 'number' }, employment_type: { type: 'array', items: { type: 'string', enum: ['full_time', 'internship', 'contract', 'part_time'] } }, company_types: { type: 'array', items: { type: 'string' } }, industries: { type: 'array', items: { type: 'string' } } } }, execute: i => { const p = prefsFromAI({ job_titles: i.job_titles, locations: i.locations, skills: i.skills, work_modes: i.work_modes, experience: { min_years: i.experience_min, max_years: i.experience_max }, salary: { min: i.salary_min, max: i.salary_max }, employment_type: i.employment_type, company_types: i.company_types, industries: i.industries }, (S.chat.filter(m => m.role === 'user').slice(-1)[0] || {}).content || ''); p.engine = 'ai'; p.savedAt = nowISO(); S.prefs = p; save.prefs(); rescoreAll(); logAgent('Career Profile Agent', 'Saved preferences from chat', p.titles.join(', '), 'ai'); return { saved: prefsToApiJSON(p) }; } },
    { name: 'discovery_links', description: 'Returns search URLs for LinkedIn, Naukri, Indeed, Foundit, Internshala, Wellfound and ATS boards, built from the saved preferences. The user opens them and imports postings.', execute: () => discoveryLinks(S.prefs).map(l => ({ label: l.label, url: l.url })) },
    { name: 'import_job', description: 'Imports a job posting the user pasted into the chat: extracts details, removes duplicates and scores it. Returns the job id and score.', inputSchema: { type: 'object', properties: { url: { type: 'string' }, description: { type: 'string' } }, required: ['description'] }, execute: async i => { const save0 = S.settings.cloudPublic; S.settings.cloudPublic = false; try { const c = await importJobs(String(i.url || ''), String(i.description || '')); return c.length ? c.map(jobBrief) : 'Duplicate or empty; nothing imported.'; } finally { S.settings.cloudPublic = save0; } } },
    { name: 'set_job_filter', description: 'Filters the Recommended Jobs page by minimum score and status and opens it.', inputSchema: { type: 'object', properties: { min_score: { type: 'number' }, status: { type: 'string', enum: ['all', 'open'] } } }, execute: i => { S.ui.filter.minScore = clamp(+i.min_score || 0); S.ui.filter.status = i.status === 'all' ? 'all' : 'open'; _chatNav = 'jobs'; return { shown: Object.values(S.jobs).filter(j => j.match && j.match.score >= S.ui.filter.minScore).length }; } },
    { name: 'tailor_resume', description: 'Creates a new truthfulness-checked tailored resume version for a job (local engine). Returns version and ATS keyword coverage.', inputSchema: { type: 'object', properties: { job_id: { type: 'string' } }, required: ['job_id'] }, execute: async i => { const j = S.jobs[String(i.job_id)]; if (!j) throw new Error('No job with that id'); if (!S.profile) throw new Error('No profile yet'); const v = await tailorResume(j, { forceLocal: true }); j.app = j.app || {}; j.app.versionId = v.id; if (j.stage === 'Analyzed') moveStage(j, 'Shortlisted', { by: 'Agent', silent: true }); if (j.stage === 'Shortlisted') moveStage(j, 'ResumeGenerated', { by: 'Resume Optimization Agent', silent: true }); else { save.job(j); await invalidateIfChanged(j, 'the resume was regenerated'); } return { version: v.version, coverage: v.coverage, missing: v.keywordsMissing, link: '#job-' + j.id }; } },
    { name: 'prepare_applications', description: 'For the given job ids, or the top N open jobs scoring at or above the user\u2019s auto-shortlist threshold, scores, tailors the resume and fills answers, stopping at Awaiting approval. Never submits.', inputSchema: { type: 'object', properties: { job_ids: { type: 'array', items: { type: 'string' } }, top_n: { type: 'number' } } }, execute: async i => { if (!S.profile) throw new Error('No profile yet'); const list = (i.job_ids && i.job_ids.length) ? i.job_ids.map(id => S.jobs[String(id)]).filter(Boolean) : topOpenForPrep(clamp(+i.top_n || 5, 1, 20)); return { prepared: await batchPrepare(list), threshold: S.settings.autoShortlist, approvalCenter: '#approvals' }; } },
    { name: 'awaiting_approval', description: 'Lists applications waiting for approval, with answers that still need the user’s input.', execute: () => Object.values(S.jobs).filter(j => ['AwaitingApproval', 'Approved'].includes(j.stage)).map(j => ({ ...jobBrief(j), needsInput: (j.app.answers || []).filter(a => a.needsInput && !a.a).map(a => a.q) })) },
    { name: 'skill_gaps', description: 'Returns the most common missing required skills across scored jobs and across rejected applications.', execute: () => { const A = analytics(); return { allJobs: A.missing, rejectedJobs: A.rejMissing }; } },
    { name: 'rejection_summary', description: 'For each rejected application: confirmed reasons (employer feedback) separately from inferred ones.', execute: () => Object.values(S.jobs).filter(j => j.stage === 'EmployerRejected').map(j => { const r = (j.app.rejectionAnalysis && j.app.rejectionAnalysis.report) || rejectionLocal(j); return { ...jobBrief(j), reasons: (r.reasons || []).map(x => `${x.level}: ${x.factor}`) }; }) },
    { name: 'interview_prep', description: 'Returns the next upcoming interview (or the given job) with a day-by-day plan and practice questions.', inputSchema: { type: 'object', properties: { job_id: { type: 'string' } } }, execute: i => { let j = i.job_id && S.jobs[String(i.job_id)]; if (!j) { const nx = Object.values(S.jobs).flatMap(x => ((x.app && x.app.interviews) || []).map(iv => ({ x, iv }))).filter(o => new Date(o.iv.at) > Date.now()).sort((a, b) => a.iv.at.localeCompare(b.iv.at))[0]; j = nx && nx.x; } if (!j) return 'No upcoming interview recorded.'; const iv = (j.app.interviews || [])[0]; const plan = prepPlan(j, iv ? Math.max(1, Math.ceil((new Date(iv.at) - Date.now()) / 86400000)) : 7); return { job: jobBrief(j), interview: iv, plan: plan.plan, questions: plan.questions.slice(0, 12) }; } },
    { name: 'compare_offers', description: 'Returns all offers with fixed, variable, bonus, first-year total, location and benefits.', execute: () => Object.values(S.jobs).filter(j => reached(j, 'OfferReceived')).map(j => { const o = j.app.offer || {}; return { ...jobBrief(j), fixed: +o.fixed || null, variable: +o.variable || null, joiningBonus: +o.joiningBonus || null, total: (+o.fixed || 0) + (+o.variable || 0) + (+o.joiningBonus || 0), location: o.location, benefits: o.benefits, joiningDate: o.joiningDate }; }) },
    { name: 'open_page', description: 'Opens an app page after you reply: dashboard, jobs, approvals, tracker, discover, preferences, profile, resumes, interviews, offers, analytics, rejections, shortlisting, or job-<id>.', inputSchema: { type: 'object', properties: { page: { type: 'string' } }, required: ['page'] }, execute: i => { _chatNav = String(i.page).replace(/^#/, ''); return 'ok'; } },
  ];
}
function chatRules() {
  return `You are the AI Career Agent inside a job-search web app for a job seeker in India. Today is ${new Date().toDateString()}. Use the tools to read and change the app's data.
Rules: Never say an application was submitted; only the user can approve and submit in the Approval Center. You cannot browse the web or query job boards: for discovery, save preferences, call discovery_links, and tell the user to open the links and import postings (they can paste a posting here and you call import_job). Never invent profile facts. If a preference is ambiguous, ask before saving it, and confirm before preparing more than 10 applications. Distinguish confirmed rejection reasons from inferences. Keep replies short; use markdown bullets; link app pages as [Approval Center](#approvals) or a job as [Title at Company](#job-ID).
${UNTRUSTED}`;
}
async function chatLocal(msg) {
  const t = msg.toLowerCase();
  if (S.ui.pendingPrefs && /^(no|cancel|discard)\b/.test(t)) { S.ui.pendingPrefs = null; return 'Discarded. Your saved preferences are unchanged.'; }
  if (S.ui.pendingPrefs && /^(yes|y|confirm|ok|okay|save|correct|looks good)\b/.test(t)) { S.prefs = { ...S.ui.pendingPrefs, savedAt: nowISO() }; S.ui.pendingPrefs = null; save.prefs(); rescoreAll(); logAgent('Career Profile Agent', 'Saved preferences from chat', S.prefs.titles.join(', ')); return `Saved. Next, open the searches on [Job Discovery](#discover) and import the postings you like; each one is scored against your profile.`; }
  let m = t.match(/(?:above|over|more than|at least|>\s*)\s*(\d{2})\s*%?/);
  if (m && /compat|score|match|jobs?/.test(t)) { const n = +m[1]; S.ui.filter.minScore = n; S.ui.filter.status = 'open'; const J = openJobs().filter(j => j.match && j.match.score >= n).sort((a, b) => b.match.score - a.match.score); return J.length ? `**${J.length} open job${J.length > 1 ? 's' : ''} at ${n}% or above:**\n${J.slice(0, 10).map(j => `- [${j.title} at ${j.company}](#job-${j.id}) — ${j.match.score}`).join('\n')}\n\nThe [Recommended Jobs](#jobs) page is filtered the same way.` : `No open jobs score ${n} or above yet. Import more from [Job Discovery](#discover).`; }
  m = t.match(/prepare (?:the )?applications? for (?:my )?top (\d+)/) || t.match(/top (\d+) jobs/);
  if (m && /prepar|apply/.test(t)) { if (!ensureProfile()) return 'Add your profile first.'; const n = clamp(+m[1], 1, 20); const done = await Busy.local(`Preparing ${n} applications…`, () => batchPrepare(topOpenForPrep(n))); return done.length ? `Prepared ${done.length} application${done.length > 1 ? 's' : ''} and stopped for your approval:\n${done.map(d => `- [${d.title} at ${d.company}](${d.link}) — score ${d.score}${d.needsInput ? `, ${d.needsInput} answer(s) need you` : ''}`).join('\n')}\n\n${done.length < n ? `Only jobs scoring ${S.settings.autoShortlist}+ are included; change the threshold in [Configuration](#config). ` : ''}Nothing has been sent. Review them in the [Approval Center](#approvals).` : `No open jobs score ${S.settings.autoShortlist}+ yet. Import more on [Job Discovery](#discover) or lower the threshold in [Configuration](#config).`; }
  if (/awaiting approval|waiting for (my )?approval|pending approval/.test(t)) { const J = Object.values(S.jobs).filter(j => ['AwaitingApproval', 'Approved'].includes(j.stage)); return J.length ? `**${J.length} waiting on you:**\n${J.map(j => `- [${j.title} at ${j.company}](#job-${j.id}) — ${STAGES[j.stage].label}${(j.app.answers || []).some(a => a.needsInput && !a.a) ? ' (answers need input)' : ''}`).join('\n')}\n\nOpen the [Approval Center](#approvals).` : 'Nothing is awaiting approval.'; }
  if (/missing (technical )?skills|skill gaps?|common gaps?/.test(t)) { const A = analytics(); return A.missing.length ? `**Most common missing required skills:**\n${A.missing.slice(0, 8).map(([s, n]) => `- ${s} — ${n} job${n > 1 ? 's' : ''}`).join('\n')}${A.rejMissing.length ? `\n\nAmong rejections: ${A.rejMissing.map(([s, n]) => `${s} (${n})`).join(', ')}.` : ''}\n\nSee [Career Analytics](#analytics).` : 'No gaps recorded yet. Import and score some jobs first.'; }
  if (/reject/.test(t) && /why|analy|reason/.test(t)) { const J = Object.values(S.jobs).filter(j => j.stage === 'EmployerRejected'); if (!J.length) return 'No rejections are recorded. Rejections are only logged from a recruiter response or another reliable source.'; const lines = J.map(j => { const r = (j.app.rejectionAnalysis && j.app.rejectionAnalysis.report) || rejectionLocal(j); const c = r.reasons.filter(x => x.level === 'Confirmed'), s = r.reasons.filter(x => x.level === 'Strongly supported'); return `- [${j.company}](#job-${j.id}): ${c.length ? 'confirmed — ' + c.map(x => x.factor).join('; ') : 'no employer reason'}${s.length ? '; strongly supported — ' + s.map(x => x.factor).join('; ') : ''}`; }); return `**Rejections (${J.length}):**\n${lines.join('\n')}\n\nAnything not marked confirmed is an inference. Details on [Rejection Analysis](#rejections).`; }
  if (/interview/.test(t) && /prep|prepare|ready/.test(t)) { const nx = Object.values(S.jobs).flatMap(x => ((x.app && x.app.interviews) || []).map(iv => ({ x, iv }))).filter(o => new Date(o.iv.at) > Date.now()).sort((a, b) => a.iv.at.localeCompare(b.iv.at))[0]; if (!nx) return 'No upcoming interview is recorded. Add one from the [Application Tracker](#tracker).'; const plan = prepPlan(nx.x, Math.max(1, Math.ceil((new Date(nx.iv.at) - Date.now()) / 86400000))); return `**${nx.x.company} — ${nx.iv.type || 'Interview'} on ${fmtDT(nx.iv.at)}**\n${plan.plan.map(d => `- Day ${d.day}: ${d.focus}`).join('\n')}\n\nPractice: ${plan.questions.slice(0, 4).map(q => q.q).join(' · ')}\n\nFull plan on [Interview Prep](#interviews).`; }
  if (/compare/.test(t) && /offer/.test(t)) { const J = Object.values(S.jobs).filter(j => reached(j, 'OfferReceived')); if (!J.length) return 'No offers recorded yet.'; return `**Offers:**\n${J.map(j => { const o = j.app.offer || {}; const tot = (+o.fixed || 0) + (+o.variable || 0) + (+o.joiningBonus || 0); return `- [${j.company}](#job-${j.id}): fixed ${lpa(+o.fixed || null)}, first-year total ${lpa(tot || null)}, ${o.location || j.location || 'location n/a'}${o.benefits ? ' — ' + o.benefits : ''}`; }).join('\n')}\n\nSide-by-side on [Offers](#offers).`; }
  if (/customi[sz]e|tailor/.test(t) && /resume|cv/.test(t)) { if (!ensureProfile()) return 'Add your profile first.'; const named = Object.values(S.jobs).find(j => t.includes(j.company.toLowerCase())); const j = named || topOpenForPrep(1)[0]; if (!j) return 'Import a job first.'; const v = await Busy.local('Tailoring…', () => tailorResume(j, { forceLocal: true })); j.app = j.app || {}; j.app.versionId = v.id; if (j.stage === 'Analyzed') moveStage(j, 'Shortlisted', { silent: true }); if (j.stage === 'Shortlisted') moveStage(j, 'ResumeGenerated', { silent: true }); else save.job(j); return `Created resume v${v.version} for [${j.title} at ${j.company}](#job-${j.id}) with ${v.coverage}% keyword coverage.${v.keywordsMissing.length ? ` Not added because your profile lacks them: ${v.keywordsMissing.join(', ')}.` : ''}`; }
  if (/\b(find|search|looking for|i want|i need|get me)\b/.test(t) || new RegExp(ROLE_NOUN, 'i').test(t)) {
    const p0 = parsePrefsLocal(msg); if (!p0.titles.length && !p0.skills.length) return null;
    const keepOld = S.prefs || {}; const p = { ...keepOld };
    for (const [k, v] of Object.entries(p0)) { if (Array.isArray(v) ? v.length : (v !== null && v !== '' && v !== undefined)) p[k] = v; }
    if (!detectEmployment(msg).length && keepOld.employmentTypes) p.employmentTypes = keepOld.employmentTypes;
    p.raw = msg; p.engine = 'local'; delete p.demo; S.ui.pendingPrefs = p; const amb = prefAmbiguities(p); const nm = (t.match(/find (\d+)/) || [])[1];
    return `Here is what I understood:\n- Titles: ${p.titles.join(', ') || '—'}\n- Locations: ${p.locations.join(', ') || '—'}\n- Experience: ${p.expMin ?? '?'}–${p.expMax ?? '?'} years\n- Salary: ${salaryRange(p.salaryMin, p.salaryMax)}\n- Skills: ${p.skills.join(', ') || '—'}\n- Type: ${p.employmentTypes.map(e => EMP_LABEL[e]).join(', ')}${amb.length ? `\n\n**Please confirm:** ${amb.join(' ')}` : ''}\n\nReply **confirm** to save these preferences${nm ? `. I can’t browse job boards, so for ${nm} jobs I’ll give you search links on [Job Discovery](#discover) once saved` : ''}.`;
  }
  return null;
}
async function chatSend(msg) {
  msg = String(msg || '').trim(); if (!msg || S.ui.chatBusy) return;
  S.chat.push({ role: 'user', content: msg, t: nowISO() }); save.chat(); S.ui.chatBusy = true;
  if (route().view !== 'chat') location.hash = 'chat'; render();
  let reply = null, engine = 'local'; _chatNav = null;
  try {
    const useAI = AI.available() && S.settings.cloudPublic && await AI.allowed(true);
    if (!useAI || !CAP.toolsOK) { try { reply = await chatLocal(msg); } catch (e) { reply = 'That failed: ' + (e.message || 'error'); } }
    if (reply == null && useAI) {
      _chatCtl = new AbortController();
      const turns = [{ role: 'user', content: chatRules() + (CAP.toolsOK ? '' : `\nCurrent app data (read-only): ${JSON.stringify({ ...overviewData(), topJobs: openJobs().sort((a, b) => (b.match ? b.match.score : 0) - (a.match ? a.match.score : 0)).slice(0, 10).map(jobBrief) })}`) }, ...S.chat.slice(-14).map(m => ({ role: m.role, content: m.content }))];
      try {
        const opts = { signal: _chatCtl.signal, onText: ({ text }) => { const el = $('#chat-live'); if (el) { el.textContent = text; const log = $('#chat-log'); if (log) log.scrollTop = log.scrollHeight; } } };
        if (CAP.toolsOK) { const tl = chatTools(); opts.tools = tl.slice(0, CAP.toolMax || tl.length); } else opts.cache = false;
        const res = await AI.client()(turns, opts); reply = res.text.trim(); engine = 'ai';
        if (opts.tools) { const parts = reply.split(/\n\n+/); if (parts.length > 2 && /^(i'll|i will|let me|checking|looking|first,)/i.test(parts[0])) reply = parts.slice(1).join('\n\n'); }
        logAgent('Orchestrator', 'Chat reply', msg.slice(0, 120), 'ai');
      } catch (e) {
        if (e && e.code === 'cancelled') reply = ((e.text || '').trim() || 'Stopped.') + (e.text ? '\n\n_Stopped._' : '');
        else { AI.handleErr(e); try { reply = await chatLocal(msg); } catch (e2) { reply = null; } }
      } finally { _chatCtl = null; }
    }
  } finally { S.ui.chatBusy = false; }
  if (reply == null) reply = `I can help with:\n- Describing the job you want (e.g. “I am looking for a Junior Python Developer role in Hyderabad, 3–6 LPA”)\n- “Show only jobs with compatibility above 80%”\n- “Prepare applications for my top 10 jobs”\n- “Show me which applications are awaiting approval”\n- “Analyze why I am getting rejected”\n- “Identify the most common missing technical skills”\n- “Prepare me for my upcoming interview”\n- “Compare the salary and benefits of my offers”\n- “Customize my resume for <company>”`;
  S.chat.push({ role: 'assistant', content: reply, t: nowISO(), engine }); save.chat();
  if (_chatNav) { const n = _chatNav; _chatNav = null; render(); toast('Opening ' + (TITLES[n] || 'page')); setTimeout(() => go(n), 700); } else render();
}

/* ============ Sample data ============ */
const DEMO_JDS = [
  ['AwaitingApproval', 'https://example.com/careers/kitebyte/junior-python-developer', `Junior Python Developer\nCompany: Kitebyte Labs\nLocation: Hyderabad (Hybrid)\nCTC: 4 - 6 LPA\nExperience: 0-2 years\nAbout Kitebyte Labs\nKitebyte Labs is a SaaS company building scheduling tools for clinics.\nResponsibilities\n- Build and maintain REST APIs in Django for our scheduling product\n- Write SQL queries and optimise MySQL tables\n- Write unit tests and take part in code reviews\n- Work with the frontend team to integrate APIs\nRequirements\n- Python, Django, REST APIs\n- MySQL and Git\n- B.Tech or equivalent degree in Computer Science\nNice to have\n- Docker, Celery, AWS`],
  ['Analyzed', 'https://example.com/careers/bluepeak/full-stack-developer-fresher', `Full Stack Developer (Fresher)\nCompany: Bluepeak Fintech\nLocation: Bengaluru\nSalary: 5 - 7 LPA\nExperience: 0-1 years\nResponsibilities\n- Build customer dashboards with React\n- Develop Node.js services and REST APIs\n- Model data in MySQL\nRequirements\n- JavaScript, React, Node.js\n- MySQL, REST APIs, Git\n- Any graduate (B.E./B.Tech preferred)\nGood to have\n- TypeScript, Redux`],
  ['Analyzed', 'https://example.com/careers/northwind/python-backend-engineer', `Python Backend Engineer\nCompany: Northwind Analytics\nLocation: Remote (India)\nCompensation: 6 - 9 LPA\nExperience: 1-3 years\nWhat you'll do\n- Design FastAPI services for analytics pipelines\n- Containerise services with Docker\n- Own PostgreSQL schemas and migrations\nMust have\n- Python, FastAPI, PostgreSQL, Docker\nPreferred\n- Redis, AWS, Kafka`],
  ['InterviewScheduled', 'https://example.com/careers/orbitlane/php-developer', `PHP Developer\nCompany: Orbitlane Systems\nLocation: Hyderabad (On-site)\nCTC: 3.5 - 5 LPA\nExperience: 0-2 years\nResponsibilities\n- Develop features in Laravel for our logistics portal\n- Build responsive pages with HTML, CSS and JavaScript\n- Maintain MySQL databases\nRequirements\n- PHP, Laravel, MySQL\n- JavaScript, HTML, CSS\n- Bachelor's degree in IT or related field`],
  ['Analyzed', 'https://example.com/careers/tandem/software-engineer-1', `Software Engineer I\nCompany: Tandem Health Tech\nLocation: Pune\nCTC: 8 - 12 LPA\nExperience: 2-4 years\nResponsibilities\n- Build Java microservices on Spring Boot\n- Deploy services on Kubernetes\nRequirements\n- Java, Spring Boot, Microservices, Kubernetes\n- B.Tech/M.Tech in Computer Science\nPreferred\n- Kafka, AWS`],
  ['EmployerRejected', 'https://example.com/careers/saffron/react-developer', `React Developer\nCompany: Saffron Retail Tech\nLocation: Bengaluru (Hybrid)\nCTC: 4.5 - 6.5 LPA\nExperience: 0-2 years\nResponsibilities\n- Build storefront pages in React and Next.js\n- Improve performance and accessibility\nRequirements\n- React, Next.js, JavaScript, HTML, CSS, Git\nNice to have\n- Tailwind CSS, TypeScript`],
  ['Shortlisted', 'https://example.com/careers/quantiq/associate-data-analyst', `Associate Data Analyst\nCompany: Quantiq Data\nLocation: Chennai\nSalary: 4 - 5 LPA\nExperience: 0-1 years\nResponsibilities\n- Build reports and dashboards in Power BI\n- Query data with SQL and clean it in Python\nRequirements\n- SQL, Excel, Python, Power BI\n- Any graduate`],
  ['OfferReceived', 'https://example.com/careers/mosaic/full-stack-python-react', `Full Stack Developer (Python/React)\nCompany: Mosaic Learning\nLocation: Remote\nCTC: 6 - 8 LPA\nExperience: 0-2 years\nResponsibilities\n- Build course authoring tools with Django and React\n- Design REST APIs used by the mobile app\nRequirements\n- Python, Django, React, REST APIs\nPreferred\n- AWS, PostgreSQL`],
  ['OfferReceived', 'https://example.com/careers/lumen/python-developer', `Python Developer\nCompany: Lumen Cloud Works\nLocation: Bengaluru (Hybrid)\nCTC: 5.5 - 7 LPA\nExperience: 0-2 years\nResponsibilities\n- Build Django services and admin tools\n- Integrate third-party REST APIs\nRequirements\n- Python, Django, REST APIs, SQL\nNice to have\n- Docker, Linux`],
];
async function buildDemo() {
  const ago = d => new Date(Date.now() - d * 86400000).toISOString();
  const prof = normalizeProfile({
    name: 'Sample Candidate', email: 'sample.candidate@example.com', phone: '+91 90000 00000', location: 'Hyderabad', linkedin: 'linkedin.com/in/sample-candidate', github: 'github.com/sample-candidate',
    summary: 'Computer Science graduate who builds web applications with Python, Django and React. Comfortable designing REST APIs and working with MySQL.',
    skills: ['Python', 'Django', 'REST APIs', 'MySQL', 'SQL', 'Git', 'JavaScript', 'React', 'HTML', 'CSS', 'PHP', 'Bootstrap', 'Postman', 'Linux'],
    projects: [
      { name: 'Campus Placement Portal', technologies: 'Django, MySQL, Bootstrap', description: 'Built a placement portal where students apply to campus drives and placement staff shortlist candidates.\nDesigned the MySQL schema and Django admin workflows.\nAdded role-based access for students, recruiters and staff.' },
      { name: 'Expense Tracker API', technologies: 'Python, Django REST Framework, MySQL, JWT', description: 'Designed REST APIs for recording and categorising expenses.\nImplemented JWT authentication and pagination.\nDocumented endpoints and tested them with Postman.' },
      { name: 'Recipe Finder', technologies: 'React, JavaScript, REST APIs', description: 'Built a React single-page app that searches a public recipe API.\nAdded filters, favourites and responsive layouts.' },
      { name: 'Library Management System', technologies: 'PHP, MySQL, HTML, CSS', description: 'Built a PHP and MySQL system to issue and return books with fine calculation.' },
    ],
    experiences: [{ employer: 'Brightleaf Software', role: 'Python Developer Intern', start: '2025-01', end: '2025-06', description: 'Built Django REST endpoints for an internal inventory tool.\nWrote SQL reports for the operations team.\nFixed bugs and wrote unit tests for API views.' }],
    education: [{ degree: 'B.Tech in Computer Science and Engineering', institution: 'Sample Institute of Technology, Hyderabad', year: '2025', score: '8.1 CGPA' }, { degree: 'Intermediate (MPC)', institution: 'Sample Junior College', year: '2021', score: '92%' }],
    certifications: ['Python programming certificate (online course)', 'SQL for data analysis certificate'], achievements: ['Finalist, college hackathon 2024'], totalYears: 0,
  });
  Object.assign(prof, { noticePeriod: 'Immediate', relocate: true, workAuth: 'Yes', expectedMin: 400000, expectedMax: 700000, workModes: ['hybrid', 'remote', 'onsite'], employmentTypes: ['full_time'], preferredRoles: ['Python Developer', 'Full Stack Developer'], preferredLocations: 'Hyderabad, Bengaluru, Remote', demo: true });
  Store.apply({});
  S.profile = prof;
  S.prefs = { ...parsePrefsLocal('Find entry-level Full Stack Developer and Python Developer jobs in Hyderabad, Bengaluru and remote India. I know Python, PHP, JavaScript, React, MySQL and REST APIs. I am targeting ₹4–7 LPA and prefer companies offering fresher opportunities.'), engine: 'local', savedAt: ago(20), demo: true };
  const rText = resumeText(profileAsTailored(prof), prof);
  const r = { id: uid('r'), filename: 'Sample_Candidate_Resume.pdf', kind: 'pdf', uploadedAt: ago(21), text: rText, sizeBytes: rText.length, immutable: true, demo: true }; r.hash = await sha256(rText); S.resumes[r.id] = r;
  const days = [19, 18, 16, 15, 14, 13, 9, 17, 16];
  for (let i = 0; i < DEMO_JDS.length; i++) {
    const [target, url, jd] = DEMO_JDS[i]; const f = extractJobLocal(jd, url); const t0 = days[i];
    const j = { id: uid('j'), ...f, description: jd, applyUrl: url, source: ['linkedin', 'naukri', 'careers', 'indeed', 'linkedin', 'naukri', 'internshala', 'wellfound', 'foundit'][i], externalId: '', discoveredAt: ago(t0), postedAt: ago(t0 + 2).slice(0, 10), stage: 'Discovered', history: [{ from: null, to: 'Discovered', t: ago(t0), by: 'Job Discovery Agent', evidence: 'Sample data' }], extractEngine: 'local', app: {}, demo: true };
    S.jobs[j.id] = j; j.match = scoreJob(j, prof, S.prefs, S.settings.weights);
    const step = (to, d, extra = {}) => { j.history.push({ from: j.stage, to, t: ago(d), by: extra.by || 'You', evidence: extra.evidence || '', note: extra.note || '' }); j.stage = to; };
    step('Analyzed', t0, { by: 'Job Matching Agent', note: `Score ${j.match.score}` });
    if (['Analyzed'].includes(target)) continue;
    step('Shortlisted', t0 - 1, { by: 'Application Agent' });
    if (target === 'Shortlisted') continue;
    const v = await tailorResume(j, { forceLocal: true }); v.createdAt = ago(t0 - 1); v.demo = true; j.app.versionId = v.id; step('ResumeGenerated', t0 - 1, { by: 'Resume Optimization Agent', note: `v1, ATS ${v.coverage}%` });
    await prepareApplication(j); step('AwaitingApproval', t0 - 1, { by: 'Application Agent', note: 'Stopped for your approval' });
    if (target === 'AwaitingApproval') continue;
    j.app.approval = { hash: await snapshotHash(j), approvedAt: ago(t0 - 2), expiresAt: ago(t0 - 9), by: 'You' };
    step('Approved', t0 - 2, { evidence: 'Explicit user approval' }); step('SubmissionInProgress', t0 - 2, { note: 'Opened official application page' });
    const ref = 'APP-' + (48210 + i * 37); j.app.submission = { at: ago(t0 - 2), reference: ref, note: 'Confirmation email received' }; step('Applied', t0 - 2, { evidence: 'Confirmation email', note: 'Reference ' + ref });
    step('UnderReview', t0 - 5, { evidence: 'Job portal status' });
    if (target === 'EmployerRejected') { j.app.feedback = { text: 'We moved ahead with candidates who have production Next.js experience.', source: 'Rejection email', confirmed: true }; step('EmployerRejected', t0 - 8, { evidence: 'Rejection email' }); j.app.rejectionAnalysis = { at: ago(t0 - 8), engine: 'local', report: rejectionLocal(j) }; continue; }
    j.app.recruiter = { name: 'Recruiter (sample)', email: 'talent@example.com', phone: '', notes: '' };
    step('EmployerShortlisted', t0 - 7, { evidence: 'Recruiter email' });
    const ivAt = target === 'InterviewScheduled' ? new Date(Date.now() + 3 * 86400000 + 4 * 3600e3) : new Date(Date.now() - (t0 - 10) * 86400000);
    ivAt.setMinutes(0, 0, 0); if (target === 'InterviewScheduled') ivAt.setHours(11);
    j.app.interviews = [{ id: uid('i'), at: ivAt.toISOString(), type: target === 'InterviewScheduled' ? 'Technical round' : 'Technical + HR', notes: target === 'InterviewScheduled' ? 'Video call; live coding in PHP and SQL' : '' }];
    step('InterviewScheduled', t0 - 8, { evidence: 'Interview invitation' });
    j.app.shortlistAnalysis = { at: ago(t0 - 7), engine: 'local', report: shortlistLocal(j) };
    if (target === 'InterviewScheduled') continue;
    j.app.offer = i === 7 ? { fixed: 650000, variable: 50000, joiningBonus: 50000, benefits: 'Health insurance for family, remote work allowance, learning budget', location: 'Remote', joiningDate: isoDay(new Date(Date.now() + 25 * 86400000)), deadline: isoDay(new Date(Date.now() + 5 * 86400000)) } : { fixed: 620000, variable: 0, joiningBonus: 0, benefits: 'Health insurance, cab facility, 24 days leave', location: 'Bengaluru', joiningDate: isoDay(new Date(Date.now() + 30 * 86400000)), deadline: isoDay(new Date(Date.now() + 7 * 86400000)) };
    step('OfferReceived', t0 - 12, { evidence: 'Offer letter' });
  }
  Object.values(S.jobs).forEach(j => { j.updatedAt = j.history[j.history.length - 1].t; });
  Object.values(S.versions).forEach(v => v.demo = true);
  S.logs = [{ id: uid('l'), t: ago(0.1), agent: 'Orchestrator', action: 'Loaded sample workspace', detail: `${DEMO_JDS.length} sample jobs across every stage`, engine: 'local', status: 'ok' }];
  S.notifs = [{ id: uid('n'), t: ago(0.1), type: 'AwaitingApproval', message: 'Kitebyte Labs: Awaiting approval — Junior Python Developer', jobId: Object.values(S.jobs)[0].id, read: false }, { id: uid('n'), t: ago(0.2), type: 'InterviewScheduled', message: 'Orbitlane Systems: Technical round in 3 days', jobId: Object.values(S.jobs)[3].id, read: false }];
  S.reports = [buildReport('weekly')];
}
async function enterDemo() { S.mode = 'demo'; await buildDemo(); }
function persistAll() {
  save.profile(); save.prefs(); save.settings(); save.meta(); save.logs(); save.notifs(); save.chat(); save.reports(); if (S.notify) save.notify();
  Object.values(S.jobs).forEach(save.job); Object.values(S.versions).forEach(save.version); Object.values(S.resumes).forEach(save.resume);
}

/* ============ Click actions ============ */
const ACT = {};
ACT.menu = () => $('#rail').classList.toggle('open');
ACT.theme = el => { const t = el.dataset.theme; S.settings.theme = t; lsSet('aca:theme', t); Theme.apply(t); save.settings(); render(); };
ACT.notifs = () => { S.ui.notifOpen = !S.ui.notifOpen; render(); };
ACT['notifs-read'] = () => { S.notifs.forEach(n => n.read = true); save.notifs(); Object.values(S.alerts || {}).filter(a => !a.read).forEach(a => { a.read = true; save.alert(a); }); S.ui.notifOpen = false; render(); };
ACT['modal-bg'] = () => closeModal(false);
ACT['dlg-yes'] = () => { const i = $('#dlg-input'); closeModal(i ? i.value : true); };
ACT['dlg-no'] = () => closeModal(false);
ACT['demo-start-own'] = () => { if (CLOUD && !S.session) return goAuth(); const th = S.settings.theme; Store.apply({}); S.settings.theme = th; S.mode = S.realMode; S.meta = { onboarded: true, at: nowISO() }; save.meta(); toast('Fresh workspace ready. Upload your resume to begin.'); go('resumes'); };
ACT['demo-keep'] = () => { if (CLOUD && !S.session) return goAuth(); S.mode = S.realMode; S.meta = { onboarded: true, at: nowISO(), keptDemo: true }; persistAll(); toast(S.mode === 'db' ? 'Sample data saved to your account. Remove it any time in Configuration.' : 'Sample data kept.'); render(); };
ACT['demo-load'] = async () => {
  if (S.mode === 'demo') return toast('Sample data is already loaded.');
  if ((S.profile && S.profile.name && !S.profile.demo) || Object.keys(S.jobs).length) {
    if (!await confirmDialog({ title: 'Add sample jobs?', body: '<p>Your profile and jobs stay as they are. Nine sample jobs are added and scored against your profile, marked “Sample”.</p>', ok: 'Add sample jobs' })) return;
    for (const [, url, jd] of DEMO_JDS) { const f = extractJobLocal(jd, url); const j = { id: uid('j'), ...f, description: jd, applyUrl: url, source: 'demo', discoveredAt: nowISO(), stage: 'Discovered', history: [{ from: null, to: 'Discovered', t: nowISO(), by: 'Job Discovery Agent', evidence: 'Sample data' }], extractEngine: 'local', app: {}, demo: true }; S.jobs[j.id] = j; scoreAndStore(j); }
    toast('Sample jobs added.'); return go('jobs');
  }
  const keep = S.settings; await buildDemo(); S.settings = keep; S.meta = { onboarded: true, keptDemo: true }; persistAll(); toast('Sample workspace loaded.'); go('dashboard');
};
ACT['demo-remove'] = async () => {
  if (!await confirmDialog({ title: 'Remove sample records?', body: '<p>Deletes every job, resume version and resume marked “Sample”, plus the sample profile if it is still in use.</p>', ok: 'Remove sample records', danger: true })) return;
  let n = 0;
  Object.values(S.jobs).filter(j => j.demo).forEach(j => { delete S.jobs[j.id]; Store.put('jobs/' + j.id, null); n++; });
  Object.values(S.versions).filter(v => v.demo || !S.jobs[v.jobId]).forEach(v => { delete S.versions[v.id]; Store.put('versions/' + v.id, null); });
  Object.values(S.resumes).filter(r => r.demo).forEach(r => { delete S.resumes[r.id]; Store.put('resumes/' + r.id, null); });
  if (S.profile && S.profile.demo) { S.profile = null; Store.put('profile', null); }
  if (S.prefs && S.prefs.demo) { S.prefs = null; Store.put('prefs', null); }
  if (S.mode === 'demo') { S.mode = S.realMode; S.meta = { onboarded: true }; save.meta(); }
  logAgent('Orchestrator', 'Removed sample records', `${n} jobs`); toast(`Removed ${n} sample jobs.`); render();
};
ACT['chat-suggest'] = el => chatSend(el.dataset.msg);
ACT['chat-clear'] = () => { if (S.ui.chatBusy) return; S.chat = []; save.chat(); render(); };
ACT['chat-stop'] = () => { if (_chatCtl) _chatCtl.abort(); };
ACT['pf-add'] = el => { const f = $('#profile-form'); const d = collectProfile(f); const k = el.dataset.kind; d[k] = d[k] || []; d[k].push(k === 'projects' ? { id: uid('p'), name: '', technologies: '', link: '', description: '' } : k === 'experiences' ? { id: uid('x'), role: '', employer: '', start: '', end: '', description: '' } : { id: uid('e'), degree: '', institution: '', year: '', score: '' }); S.ui.draft = d; render(); };
ACT['pf-del'] = el => { const f = $('#profile-form'); const d = collectProfile(f); d[el.dataset.kind].splice(+el.dataset.i, 1); S.ui.draft = d; render(); };
ACT['view-original'] = el => { const r = S.resumes[el.dataset.id]; openModal(`<div class="row"><h2>${esc(r.filename)}</h2><span class="pill nodot">Original · unchanged</span><span class="sp"></span><button class="btn sm" type="button" data-act="copy-original" data-id="${r.id}">Copy</button><button class="btn sm" type="button" data-act="dlg-no">Close</button></div><p class="hash">sha256 ${esc(r.hash || '')} · uploaded ${fmtDT(r.uploadedAt)}</p><div class="pre">${esc(r.text)}</div>`, { wide: true }); };
ACT['copy-original'] = el => copyText(S.resumes[el.dataset.id].text);
ACT.reparse = el => extractProfileFrom(S.resumes[el.dataset.id]);
ACT['profile-apply'] = el => applyExtracted(el.dataset.mode);
ACT['preview-version'] = el => { const v = S.versions[el.dataset.id]; openModal(`<div class="row"><h2>${esc(v.title)}</h2>${engineTag(v.engine)}<span class="sp"></span><button class="btn sm" type="button" data-act="dl-pdf" data-id="${v.id}">PDF</button><button class="btn sm" type="button" data-act="dl-docx" data-id="${v.id}">DOCX</button><button class="btn sm" type="button" data-act="dlg-no">Close</button></div><div class="resume-doc">${resumeHTML(v.content, S.profile || {}, v.keywordsCovered)}</div>`, { wide: true }); };
ACT['compare-version'] = el => {
  const v = S.versions[el.dataset.id]; const r = S.resumes[v.resumeId] || latestResume(); const p = S.profile || {};
  const orig = r ? r.text : resumeText(profileAsTailored(p), p); const tail = resumeText(v.content, p);
  const oSk = new Set(detectSkills(orig).map(s => s.toLowerCase()));
  openModal(`<div class="row"><h2>Original vs tailored v${v.version}</h2><span class="sp"></span><button class="btn sm" type="button" data-act="dlg-no">Close</button></div>
  <div class="row small"><span class="pill acc">${v.content.skills.slice(0, 6).filter(s => (S.jobs[v.jobId] ? [...(S.jobs[v.jobId].requiredSkills || []), ...(S.jobs[v.jobId].preferredSkills || [])].map(x => x.toLowerCase()).includes(s.toLowerCase()) : false)).length} job skills now in the top 6</span><span class="pill ${v.content.guard.length ? 'warn' : 'good'}">Guard: ${v.content.guard.length ? v.content.guard.length + ' removed' : 'passed'}</span><span class="pill info">ATS coverage ${v.coverage}%</span></div>
  <div class="diff"><div><h4>Original (${r ? esc(r.filename) : 'profile'})</h4><div class="pre">${esc(orig)}</div></div><div><h4>Tailored</h4><div class="pre">${esc(tail)}</div></div></div>
  <h3>Changes</h3><ul class="small">${v.content.changeLog.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="tiny muted">Skills in the tailored version that are absent from the original file text come from your edited profile: ${esc(v.content.skills.filter(s => !oSk.has(s.toLowerCase())).join(', ') || 'none')}.</p>`, { wide: true });
};
ACT['dl-pdf'] = async el => { const v = S.versions[el.dataset.id]; try { const blob = await Busy.local('Building PDF…', () => resumePDF(v.content, S.profile || {})); await offerDownload(`${slug((S.profile || {}).name || 'resume')}-${slug(S.jobs[v.jobId] ? S.jobs[v.jobId].company : 'job')}-v${v.version}.pdf`, blob); } catch (e) { toast('Could not build the PDF: ' + e.message, 'bad'); } };
ACT['dl-docx'] = async el => { const v = S.versions[el.dataset.id]; try { const blob = await Busy.local('Building DOCX…', () => makeDocx(resumeDocxParas(v.content, S.profile || {}))); await offerDownload(`${slug((S.profile || {}).name || 'resume')}-${slug(S.jobs[v.jobId] ? S.jobs[v.jobId].company : 'job')}-v${v.version}.docx`, blob); } catch (e) { toast('Could not build the DOCX: ' + e.message, 'bad'); } };
ACT['use-version'] = async el => { const j = S.jobs[el.dataset.id]; j.app.versionId = el.dataset.v; save.job(j); await invalidateIfChanged(j, 'a different resume version was selected'); toast('Version selected.'); render(); };
ACT['prefs-discard'] = () => { S.ui.prefDraft = null; render(); };
ACT['prefs-confirm'] = () => { const f = $('#prefs-form'); FORM['prefs-edit'](f); };
ACT['copy-prefs'] = () => copyText($('#prefs-json').textContent);
ACT['open-job'] = el => go('job-' + el.dataset.id);
ACT.tab = el => { S.ui.tab[el.dataset.id] = el.dataset.tab; render(); };
ACT.score = el => { const j = S.jobs[el.dataset.id]; scoreAndStore(j); render(); };
ACT.rescore = () => { rescoreAll(); toast('All jobs re-scored.'); render(); };
ACT['ai-explain'] = async el => {
  const j = S.jobs[el.dataset.id]; const p = S.profile || {};
  if (!AI.available()) return toast('Add a Gemini key in Configuration first.');
  if (!await AI.allowed(true)) return toast('Profile data is set to stay on the local engine.');
  try { const t = await AI.text(`Give a short semantic review of how well this candidate fits this job, beyond keyword matching: transferable experience, how the projects map to the responsibilities, and the 2-3 things to emphasise in an interview. Do not invent facts. 120 words max, markdown bullets.\n${UNTRUSTED}\nCandidate: ${JSON.stringify({ years: candidateYears(p), skills: profileSkillNames(p), projects: (p.projects || []).map(x => ({ name: x.name, tech: x.technologies, d: x.description.slice(0, 300) })), experiences: (p.experiences || []).map(e => ({ role: e.role, d: e.description.slice(0, 300) })) })}\nJob: <untrusted>${JSON.stringify({ title: j.title, required: j.requiredSkills, preferred: j.preferredSkills, responsibilities: j.responsibilities })}</untrusted>\nDeterministic score: ${j.match.score}`, { label: 'Asking ' + AI.name + '…' }); j.match.ai = t; save.job(j); logAgent('Job Matching Agent', 'Semantic review', j.title, 'ai'); render(); }
  catch (e) { if (e.code !== 'cancelled') AI.handleErr(e); }
};
ACT['delete-job'] = async el => { const j = S.jobs[el.dataset.id]; if (!await confirmDialog({ title: 'Delete this job?', body: `<p>${esc(j.title)} at ${esc(j.company)}, its resume versions and its history are removed. This can’t be undone.</p>`, ok: 'Delete job', danger: true })) return; Object.values(S.versions).filter(v => v.jobId === j.id).forEach(v => { delete S.versions[v.id]; Store.put('versions/' + v.id, null); }); delete S.jobs[j.id]; Store.put('jobs/' + j.id, null); logAgent('Orchestrator', 'Deleted job', `${j.title} @ ${j.company}`); go('jobs'); };
ACT['edit-job'] = el => { const j = S.jobs[el.dataset.id]; openModal(`<h2>Edit job details</h2><form novalidate class="stack" data-form="edit-job" data-id="${j.id}"><div class="fgrid">${[['title', 'Title', j.title], ['company', 'Company', j.company], ['location', 'Location', j.location], ['applyUrl', 'Application URL', j.applyUrl]].map(([k, l, v]) => `<label class="f"><span>${l}</span><input type="text" name="${k}" id="ej-${k}" value="${esc(v || '')}"></label>`).join('')}
  <label class="f"><span>Work mode</span><select name="workMode" id="ej-mode"><option value="">Not stated</option>${['remote', 'hybrid', 'onsite'].map(m => `<option ${j.workMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
  <label class="f"><span>Salary from (LPA)</span><input type="number" step="0.1" name="smin" id="ej-smin" value="${j.salaryMin != null ? lpaNum(j.salaryMin) : ''}"></label><label class="f"><span>Salary to (LPA)</span><input type="number" step="0.1" name="smax" id="ej-smax" value="${j.salaryMax != null ? lpaNum(j.salaryMax) : ''}"></label>
  <label class="f"><span>Experience from</span><input type="number" step="0.5" name="emin" id="ej-emin" value="${j.expMin ?? ''}"></label><label class="f"><span>Experience to</span><input type="number" step="0.5" name="emax" id="ej-emax" value="${j.expMax ?? ''}"></label>
  <label class="f"><span>Deadline</span><input type="date" name="deadline" id="ej-dl" value="${esc(j.deadline || '')}"></label>
  <label class="f wide"><span>Required skills</span><input type="text" name="req" id="ej-req" value="${esc((j.requiredSkills || []).join(', '))}"></label><label class="f wide"><span>Preferred skills</span><input type="text" name="pref" id="ej-pref" value="${esc((j.preferredSkills || []).join(', '))}"></label>
  <label class="f wide"><span>Education requirement</span><input type="text" name="education" id="ej-edu" value="${esc(j.education || '')}"></label>
  <label class="f wide"><span>Full job description (paste to re-extract skills and responsibilities)</span><textarea name="desc" id="ej-desc" rows="5" placeholder="Optional">${j.snippet ? '' : esc(j.description || '')}</textarea></label></div>
  <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Save and re-score</button></div></form>`, { wide: true }); };
ACT['run-workflow'] = async el => { const j = S.jobs[el.dataset.id]; if (await runWorkflow(j)) { toast('Prepared and stopped for your approval. Nothing has been sent.'); go('approvals'); } };
ACT.stage = el => { const j = S.jobs[el.dataset.id]; const to = el.dataset.to; if (to === 'Shortlisted' && (j.stage === 'Discovered' || !j.match)) scoreAndStore(j); if (to === 'AwaitingApproval' && j.app) j.app.approval = null; moveStage(j, to); render(); };
ACT.tailor = async el => {
  const j = S.jobs[el.dataset.id]; if (!ensureProfile()) return;
  if (j.stage === 'Analyzed' || j.stage === 'Discovered') { if (j.stage === 'Discovered') scoreAndStore(j); moveStage(j, 'Shortlisted', { silent: true }); }
  const v = await tailorResume(j); j.app = j.app || {}; j.app.versionId = v.id;
  if (j.stage === 'Shortlisted') moveStage(j, 'ResumeGenerated', { by: 'Resume Optimization Agent', note: `v${v.version}, ATS ${v.coverage}%`, silent: true }); else { save.job(j); await invalidateIfChanged(j, 'the resume was regenerated'); }
  S.ui.tab[j.id] = 'resume'; toast(`Resume v${v.version} ready · ATS coverage ${v.coverage}%`); render();
};
ACT.prepare = async el => { const j = S.jobs[el.dataset.id]; await prepareApplication(j); moveStage(j, 'AwaitingApproval', { by: 'Application Agent', note: 'Stopped for your approval' }); toast('Application prepared. Review it before anything is sent.'); go('approvals'); };
function saveAnswersFrom(j) {
  const f = document.querySelector(`form[data-form="answers"][data-id="${j.id}"]`); if (!f || j.stage !== 'AwaitingApproval') return false; let changed = false;
  (j.app.answers || []).forEach(a => { const el = f.querySelector(`[name="${a.id}"]`); if (!el) return; const v = el.value.trim(); if (v !== a.a) { a.a = v; a.evidence = v ? 'Entered by you' : ''; a.draft = false; changed = true; } a.needsInput = a.required && !a.a; });
  if (changed) save.job(j); return changed;
}
ACT.approve = async el => {
  const j = S.jobs[el.dataset.id]; saveAnswersFrom(j);
  const need = j.app.answers.filter(a => a.required && !a.a.trim()); if (need.length) { render(); return toast(`Answer ${need.length} required question(s) first: ${need.map(a => a.q).slice(0, 3).join('; ')}`, 'bad'); }
  if (!S.versions[j.app.versionId]) return toast('Generate a tailored resume first.', 'bad');
  const drafts = j.app.answers.filter(a => a.draft && a.a);
  const hash = await snapshotHash(j);
  if (!await confirmDialog({ title: 'Approve this exact application?', body: `<p>${esc(j.title)} at ${esc(j.company)} with resume v${S.versions[j.app.versionId].version} and ${j.app.answers.filter(a => a.a).length} answers.</p>${drafts.length ? `<p class="small" style="color:var(--warn)">${drafts.length} answer(s) are drafts: ${drafts.map(d => esc(d.q)).join('; ')}. Approving means you have read them.</p>` : ''}<p class="hash">snapshot ${esc(hash)}</p><p class="small muted">The approval expires in ${S.settings.approvalDays} days and is cleared if anything changes.</p>`, ok: 'Approve and lock' })) return;
  j.app.approval = { hash, approvedAt: nowISO(), expiresAt: new Date(Date.now() + S.settings.approvalDays * 86400000).toISOString(), by: 'You' }; j.app.savedForLater = false;
  moveStage(j, 'Approved', { evidence: 'Explicit user approval', note: 'snapshot ' + hash.slice(0, 16) }); logAgent('Approval Center', 'Approved application', `${j.company}; snapshot ${hash.slice(0, 16)}…`); render();
};
ACT.later = el => { const j = S.jobs[el.dataset.id]; saveAnswersFrom(j); j.app.savedForLater = true; save.job(j); toast('Saved for later. It stays here until you approve or reject it.'); render(); };
ACT['reject-app'] = async el => { const j = S.jobs[el.dataset.id]; if (!await confirmDialog({ title: 'Reject this application?', body: '<p>The agent will not submit it. You can reconsider it later from the job page.</p>', ok: 'Reject', danger: true })) return; moveStage(j, 'RejectedByUser'); render(); };
ACT.unapprove = el => { const j = S.jobs[el.dataset.id]; j.app.approval = null; moveStage(j, 'AwaitingApproval', { note: 'Approval revoked' }); render(); };
ACT['add-custom'] = async el => { const j = S.jobs[el.dataset.id]; saveAnswersFrom(j); const ta = $('#ans-custom-' + j.id); const qs = (ta ? ta.value : '').split('\n').map(s => s.trim()).filter(Boolean); if (!qs.length) return toast('Type the employer’s questions first, one per line.'); await answerExtra(j, qs); render(); };
ACT.submit = async el => {
  const j = S.jobs[el.dataset.id];
  if (j.stage === 'Approved') { const st = await approvalState(j); if (!st.ok) { j.app.approval = null; moveStage(j, 'AwaitingApproval', { by: 'System', note: 'Approval invalid: ' + st.why }); toast(st.why + '. Approve it again.', 'bad'); return render(); } }
  const v = S.versions[j.app.versionId];
  openModal(`<h2>Submit: ${esc(j.title)} at ${esc(j.company)}</h2>
  <ol class="small stack" style="padding-left:18px;margin:0"><li><b>Snapshot verified.</b> <span class="hash">${esc((j.app.approval || {}).hash || '')}</span></li>
  <li><b>Open the official application page</b> and sign in yourself. The agent never bypasses logins or CAPTCHAs.<div class="row" style="margin-top:6px">${j.applyUrl ? `<a class="btn primary" href="${esc(j.applyUrl)}" target="_blank" rel="noopener noreferrer" data-act="mark-submitting" data-id="${j.id}">${icon('ext')}Open application page</a>` : '<span class="pill bad">No URL saved for this job</span>'}${v ? `<button class="btn" type="button" data-act="dl-pdf" data-id="${v.id}">Resume PDF</button><button class="btn" type="button" data-act="dl-docx" data-id="${v.id}">Resume DOCX</button>` : ''}</div></li>
  <li><b>Fill the form with your approved answers:</b><div class="stack" style="margin-top:6px;max-height:230px;overflow:auto">${j.app.answers.filter(a => a.a).map(a => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="tiny muted" style="min-width:150px">${esc(a.q)}</span><span class="small" style="flex:1;white-space:pre-wrap">${esc(a.a.length > 140 ? a.a.slice(0, 140) + '…' : a.a)}</span><button class="btn sm" type="button" data-act="copy-answer" data-id="${j.id}" data-q="${a.id}">Copy</button></div>`).join('')}</div></li>
  <li><b>Record the result.</b> The application is marked Applied only with a confirmation.</li></ol>
  <form novalidate class="stack" data-form="submit-result" data-id="${j.id}"><div class="row"><label class="check"><input type="radio" name="ok" value="yes" checked>It was submitted</label><label class="check"><input type="radio" name="ok" value="no">It failed</label></div>
  <div class="fgrid"><label class="f"><span>Reference or application number</span><input type="text" name="ref" id="sr-ref" placeholder="e.g. APP-48213"></label><label class="f"><span>Confirmation seen</span><select name="conf" id="sr-conf"><option value="">Choose…</option><option>Confirmation page</option><option>Confirmation email</option><option>Portal shows “Applied”</option></select></label><label class="f wide"><span>Note</span><input type="text" name="note" id="sr-note" placeholder="Optional"></label></div>
  <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Close</button><button class="btn primary" type="submit">Save result</button></div></form>`, { wide: true });
};
ACT['mark-submitting'] = el => { const j = S.jobs[el.dataset.id]; if (j.stage === 'Approved') { moveStage(j, 'SubmissionInProgress', { note: 'Opened official application page', silent: true }); render(); } };
ACT['copy-answer'] = el => { const j = S.jobs[el.dataset.id]; const a = j.app.answers.find(x => x.id === el.dataset.q); copyText(a.a); };
ACT.status = el => {
  const j = S.jobs[el.dataset.id]; const next = (STAGES[j.stage].next || []).filter(s => s !== 'AwaitingApproval');
  if (!next.length) return toast('This application is closed.');
  const r = (j.app && j.app.recruiter) || {};
  openModal(`<h2>Update status</h2><p class="small muted">${esc(j.title)} at ${esc(j.company)} · now ${esc(STAGES[j.stage].label)}</p><form novalidate class="stack" data-form="status" data-id="${j.id}">
  <div class="fgrid"><label class="f"><span>New status</span><select name="to" id="st-to" data-act-input="st-to">${next.map(s => `<option value="${s}">${STAGES[s].label}</option>`).join('')}</select></label>
  <label class="f"><span>Evidence (required)</span><select name="evidence" id="st-ev" required><option value="">Choose…</option>${EVIDENCE.map(e => `<option>${e}</option>`).join('')}</select></label><label class="f wide"><span>Note</span><input type="text" name="note" id="st-note"></label></div>
  <div class="repeat" id="st-iv" ${next[0] === 'InterviewScheduled' ? '' : 'hidden'}><b class="small">Interview details</b><div class="fgrid"><label class="f"><span>Date and time</span><input type="datetime-local" name="ivAt" id="st-ivat"></label><label class="f"><span>Round</span><select name="ivType" id="st-ivtype">${['Phone screen', 'Technical round', 'Coding assignment', 'HR round', 'Managerial round', 'Onsite'].map(t => `<option>${t}</option>`).join('')}</select></label><label class="f wide"><span>Notes</span><input type="text" name="ivNotes" id="st-ivnotes"></label></div></div>
  <div class="repeat" id="st-rej" ${next[0] === 'EmployerRejected' ? '' : 'hidden'}><b class="small">Employer feedback</b><label class="f"><span>What did the employer say? (leave blank if no reason was given)</span><textarea name="fb" id="st-fb" rows="2"></textarea></label><p class="tiny muted">Stored as verified feedback, separate from the AI analysis.</p></div>
  <div class="repeat" id="st-offer" ${next[0] === 'OfferReceived' ? '' : 'hidden'}><b class="small">Offer details</b><div class="fgrid"><label class="f"><span>Fixed (LPA)</span><input type="number" step="0.1" name="ofFixed" id="st-off"></label><label class="f"><span>Variable (LPA)</span><input type="number" step="0.1" name="ofVar" id="st-ofv"></label><label class="f"><span>Joining bonus (₹)</span><input type="number" step="1000" name="ofBonus" id="st-ofb"></label><label class="f"><span>Location</span><input type="text" name="ofLoc" id="st-ofl" value="${esc(j.location || '')}"></label><label class="f"><span>Joining date</span><input type="date" name="ofJoin" id="st-ofj"></label><label class="f"><span>Respond by</span><input type="date" name="ofDl" id="st-ofd"></label><label class="f wide"><span>Benefits</span><input type="text" name="ofBen" id="st-ofben"></label></div></div>
  <details><summary class="small" style="cursor:pointer">Recruiter details</summary><div class="fgrid" style="margin-top:8px"><label class="f"><span>Name</span><input type="text" name="rName" id="st-rn" value="${esc(r.name || '')}"></label><label class="f"><span>Email</span><input type="email" name="rEmail" id="st-re" value="${esc(r.email || '')}"></label><label class="f"><span>Phone</span><input type="tel" name="rPhone" id="st-rp" value="${esc(r.phone || '')}"></label></div></details>
  <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Save status</button></div></form>`);
};
ACT['edit-recruiter'] = el => { const j = S.jobs[el.dataset.id]; const r = (j.app && j.app.recruiter) || {}; openModal(`<h2>Recruiter details</h2><form novalidate class="stack" data-form="recruiter" data-id="${j.id}"><div class="fgrid"><label class="f"><span>Name</span><input type="text" name="name" id="rc-n" value="${esc(r.name || '')}"></label><label class="f"><span>Email</span><input type="email" name="email" id="rc-e" value="${esc(r.email || '')}"></label><label class="f"><span>Phone</span><input type="tel" name="phone" id="rc-p" value="${esc(r.phone || '')}"></label><label class="f wide"><span>Notes</span><textarea name="notes" id="rc-notes" rows="2">${esc(r.notes || '')}</textarea></label></div><div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`); };
function interviewModal(j) { openModal(`<h2>Add interview</h2><p class="small muted">${esc(j.title)} at ${esc(j.company)}</p><form novalidate class="stack" data-form="interview" data-id="${j.id}"><div class="fgrid"><label class="f"><span>Date and time</span><input type="datetime-local" name="at" id="iv-at" required></label><label class="f"><span>Round</span><select name="type" id="iv-type">${['Phone screen', 'Technical round', 'Coding assignment', 'HR round', 'Managerial round', 'Onsite'].map(t => `<option>${t}</option>`).join('')}</select></label><label class="f wide"><span>Notes</span><input type="text" name="notes" id="iv-notes"></label></div><div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Add interview</button></div></form>`); }
ACT['add-interview'] = el => interviewModal(S.jobs[el.dataset.id]);
ACT['add-interview-sel'] = () => { const id = $('#iv-job').value; interviewModal(S.jobs[id]); };
ACT['edit-feedback'] = el => { const j = S.jobs[el.dataset.id]; const fb = (j.app && j.app.feedback) || {}; openModal(`<h2>Employer feedback</h2><p class="small muted">Record only what the employer actually said. It becomes the “Confirmed” evidence in the analysis.</p><form novalidate class="stack" data-form="feedback" data-id="${j.id}"><label class="f"><span>Feedback</span><textarea name="text" id="fb-text" rows="4">${esc(fb.text || '')}</textarea></label><label class="f"><span>Source</span><select name="source" id="fb-src">${EVIDENCE.map(e => `<option ${fb.source === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label><div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Save and re-analyze</button></div></form>`); };
ACT['interview-prep'] = async el => {
  const j = S.jobs[el.dataset.id]; const iv = j.app.interviews.find(x => x.id === el.dataset.iv); const days = Math.max(1, Math.ceil((new Date(iv.at) - Date.now()) / 86400000));
  const local = prepPlan(j, days);
  const { out, engine } = await AI.route({ personal: true, label: 'Building your interview plan…', prompt: `Create an interview preparation plan. The ${iv.type || 'interview'} is in ${days} day(s). Base topics on the job requirements and the candidate's gaps; include questions about the candidate's own projects.\n${UNTRUSTED}\n<untrusted>${JSON.stringify({ job: { title: j.title, company: j.company, required: j.requiredSkills, preferred: j.preferredSkills, responsibilities: j.responsibilities }, candidate: { skills: profileSkillNames(S.profile), projects: (S.profile.projects || []).map(p => ({ name: p.name, tech: p.technologies })), years: candidateYears(S.profile) }, gaps: j.match && j.match.missingRequired, notes: iv.notes })}</untrusted>\nReply with only JSON: {"schedule":[{"day":number,"focus":string,"tasks":[string]}] (${Math.min(days, 14)} days),"questions":[{"topic":string,"q":string}] (12-18)}`, validate: o => o && Array.isArray(o.schedule) && Array.isArray(o.questions), local: async () => ({ schedule: local.plan, questions: local.questions }) });
  iv.prep = { at: nowISO(), engine, schedule: out.schedule, questions: out.questions }; save.job(j); logAgent('Interview Agent', 'Built preparation plan', `${j.company} ${iv.type}, ${days} day(s)`, engine); render();
};
ACT['analyze-shortlist'] = async el => {
  const j = S.jobs[el.dataset.id]; const local = shortlistLocal(j);
  const { out, engine } = await AI.route({ personal: true, label: 'Analyzing your shortlisting…', prompt: analysisPrompt('shortlist', j), validate: o => o && o.summary, local: async () => local });
  j.app.shortlistAnalysis = { at: nowISO(), engine, report: engine === 'ai' ? { ...local, ...out, requirements: local.requirements, projects: local.projects } : local }; save.job(j); logAgent('Shortlisting Analysis Agent', 'Analyzed shortlist', j.company, engine); render();
};
ACT['analyze-rejection'] = async el => {
  const j = S.jobs[el.dataset.id]; const local = rejectionLocal(j);
  const { out, engine } = await AI.route({ personal: true, label: 'Analyzing the rejection…', prompt: analysisPrompt('rejection', j), validate: o => o && Array.isArray(o.reasons), local: async () => local });
  let rep = local;
  if (engine === 'ai') { const reasons = out.reasons.filter(r => ['Confirmed', 'Strongly supported', 'Possible', 'Unknown'].includes(r.level)).map(r => ({ ...r, level: r.level === 'Confirmed' && !(j.app.feedback && j.app.feedback.text) ? 'Possible' : r.level })); if (!reasons.some(r => r.level === 'Unknown')) reasons.push(local.unknown[0]); rep = { reasons, recommendations: out.recommendations || local.recommendations, confidence: out.confidence || local.confidence }; }
  j.app.rejectionAnalysis = { at: nowISO(), engine, report: rep }; save.job(j); logAgent('Rejection Analysis Agent', 'Analyzed rejection', j.company, engine); render();
};
ACT['edit-offer'] = el => { const j = S.jobs[el.dataset.id]; const o = (j.app && j.app.offer) || {}; openModal(`<h2>Offer details</h2><p class="small muted">${esc(j.title)} at ${esc(j.company)}</p><form novalidate class="stack" data-form="offer" data-id="${j.id}"><div class="fgrid"><label class="f"><span>Fixed (LPA)</span><input type="number" step="0.1" name="fixed" id="of-f" value="${o.fixed ? lpaNum(o.fixed) : ''}"></label><label class="f"><span>Variable (LPA)</span><input type="number" step="0.1" name="variable" id="of-v" value="${o.variable ? lpaNum(o.variable) : ''}"></label><label class="f"><span>Joining bonus (₹)</span><input type="number" step="1000" name="joiningBonus" id="of-b" value="${o.joiningBonus || ''}"></label><label class="f"><span>Location</span><input type="text" name="location" id="of-l" value="${esc(o.location || j.location || '')}"></label><label class="f"><span>Joining date</span><input type="date" name="joiningDate" id="of-j" value="${esc(o.joiningDate || '')}"></label><label class="f"><span>Respond by</span><input type="date" name="deadline" id="of-d" value="${esc(o.deadline || '')}"></label><label class="f wide"><span>Benefits</span><textarea name="benefits" id="of-ben" rows="2">${esc(o.benefits || '')}</textarea></label></div><div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Cancel</button><button class="btn primary" type="submit">Save offer</button></div></form>`); };
ACT['offer-decide'] = async el => { const j = S.jobs[el.dataset.id]; const to = el.dataset.to; if (!await confirmDialog({ title: to === 'OfferAccepted' ? 'Mark offer as accepted?' : 'Mark offer as declined?', body: `<p>${esc(j.company)} — this records your decision here. Tell the employer yourself.</p>`, ok: to === 'OfferAccepted' ? 'Accepted' : 'Declined' })) return; j.app.offer = j.app.offer || {}; j.app.offer.decision = to === 'OfferAccepted' ? 'accepted' : 'declined'; moveStage(j, to, { evidence: 'Your decision' }); render(); };
ACT['analyze-offers'] = async () => {
  const J = Object.values(S.jobs).filter(j => reached(j, 'OfferReceived')); const rows = J.map(j => { const o = j.app.offer || {}; return { company: j.company, title: j.title, fixed: +o.fixed || 0, variable: +o.variable || 0, bonus: +o.joiningBonus || 0, total: (+o.fixed || 0) + (+o.variable || 0) + (+o.joiningBonus || 0), location: o.location || j.location, mode: j.workMode, benefits: o.benefits || '', match: j.match ? j.match.score : null, missing: j.match ? j.match.missingRequired : [] }; });
  const local = async () => { const byT = [...rows].sort((a, b) => b.total - a.total), byF = [...rows].sort((a, b) => b.fixed - a.fixed), byM = [...rows].sort((a, b) => (b.match || 0) - (a.match || 0)); return [`## Summary`, `- Highest first-year total: **${byT[0].company}** (${lpa(byT[0].total)})`, `- Highest fixed pay: **${byF[0].company}** (${lpa(byF[0].fixed)}); fixed pay recurs, bonuses do not`, `- Best fit with your skills: **${byM[0].company}** (match ${byM[0].match})`, ...rows.map(r => `- ${r.company}: ${r.mode || 'mode n/a'} in ${r.location || 'n/a'}${r.benefits ? '; ' + r.benefits : ''}`), '', '## Questions to ask before deciding', '- What is the in-hand monthly pay after PF and tax?', '- How is the variable component paid, and what was the payout last year?', '- What is the notice period and any service bond?', '_Figures are as entered; this is not financial advice._'].join('\n'); };
  const { out, engine } = await AI.route({ personal: true, mode: 'text', label: 'Comparing your offers…', prompt: `Compare these job offers for an early-career developer in India. Cover pay (fixed vs variable vs one-time), growth and learning fit, location and work mode, and benefits. Point out what to clarify with HR. Do not tell them which to choose; lay out the trade-offs. Markdown with short sections, under 250 words.\n<untrusted>${JSON.stringify(rows)}</untrusted>`, local });
  S.meta.offerAnalysis = { at: nowISO(), engine, md: out }; save.meta(); logAgent('Career Intelligence Agent', 'Compared offers', `${rows.length} offers`, engine); render();
};
ACT.report = el => { const r = buildReport(el.dataset.type); S.reports.unshift(r); save.reports(); logAgent('Career Intelligence Agent', `Generated ${el.dataset.type} report`, ''); render(); };
ACT['report-dl'] = async el => { const r = S.reports.find(x => x.id === el.dataset.id); const name = `career-report-${r.type}-${r.createdAt.slice(0, 10)}`; if (el.dataset.fmt === 'md') await offerDownload(name + '.md', r.md); else { const blob = await Busy.local('Building DOCX…', () => makeDocx(mdToDocxParas(r.md))); await offerDownload(name + '.docx', blob); } };
ACT['report-copy'] = el => copyText(S.reports.find(x => x.id === el.dataset.id).md);
ACT['tracker-mode'] = el => { S.ui.trackerMode = el.dataset.mode; render(); };
ACT['weights-reset'] = () => { S.settings.weights = { ...DEFAULT_WEIGHTS }; save.settings(); rescoreAll(); toast('Weights reset to 30/20/10/15/10/10/5.'); render(); };
ACT.export = async () => { const data = { exportedAt: nowISO(), profile: S.profile, preferences: S.prefs, settings: S.settings, jobs: Object.values(S.jobs), resumeVersions: Object.values(S.versions), originalResumes: Object.values(S.resumes), activity: S.logs, reports: S.reports }; await offerDownload(`ai-career-agent-export-${nowISO().slice(0, 10)}.json`, JSON.stringify(data, null, 2)); };
ACT['delete-all'] = async () => {
  const v = await confirmDialog({ title: 'Delete all your data?', body: '<p>Your profile, original resumes, every job, resume version, application, analysis, chat and log are permanently deleted.</p>', ok: 'Delete everything', danger: true, input: { label: 'Type DELETE to confirm', placeholder: 'DELETE' } });
  if (v !== 'DELETE') { if (v !== false) toast('Nothing deleted. Type DELETE exactly.'); return; }
  if (S.mode !== 'demo') { try { await Store.deleteAll(); } catch (e) { return toast('Delete failed: ' + (e.message || e), 'bad'); } }
  const th = S.settings.theme; Store.apply({}); S.settings.theme = th; S.meta = { onboarded: true }; if (S.mode === 'demo') S.mode = S.realMode; save.meta(); toast('All data deleted.'); go('dashboard');
};

/* ============ Forms ============ */
const FORM = {};
FORM['quick-chat'] = f => { const m = f.msg.value; f.msg.value = ''; chatSend(m); };
FORM.chat = f => { const m = f.msg.value; f.msg.value = ''; chatSend(m); };
FORM.profile = f => { const p = collectProfile(f); if (p.experienceLevel === undefined) p.experienceLevel = levelFor(candidateYears(p)); p.updatedAt = nowISO(); delete p.demo; S.profile = p; S.ui.draft = null; save.profile(); rescoreAll(); logAgent('Career Profile Agent', 'Updated profile', `${p.skills.length} skills, ${p.projects.length} projects`); Object.values(S.jobs).filter(j => j.stage === 'Approved').forEach(j => invalidateIfChanged(j, 'your profile changed')); toast('Profile saved. Jobs re-scored.'); render(); };
FORM['paste-resume'] = async f => { const t = f.text.value; if (!t.trim()) return; await storeResume('Pasted resume.txt', 'txt', t, t.length); };
FORM['prefs-nl'] = async f => {
  const text = f.text.value.trim(); if (!text) return toast('Describe the job you want first.');
  const local = { ...parsePrefsLocal(text) };
  const { out, engine } = await AI.route({ personal: false, label: 'Interpreting your request…', tier: 'quick', prompt: `Convert this job-search request into structured filters. Keep only what the user said; put anything unclear in ambiguities. Add a "Junior" title variant when the experience range is 0-2 years.\nRequest: <untrusted>${text}</untrusted>\nReply with only JSON: ${PREFS_SCHEMA}`, validate: o => o && Array.isArray(o.job_titles), local: async () => local });
  const p = engine === 'ai' ? prefsFromAI(out, text) : local; p.engine = engine;
  if (!p.ambiguities || !p.ambiguities.length) p.ambiguities = prefAmbiguities(p);
  S.ui.prefDraft = p; logAgent('Career Profile Agent', 'Interpreted preferences', text.slice(0, 160), engine); render();
};
FORM['prefs-edit'] = f => {
  const fd = new FormData(f); const g = k => String(fd.get(k) ?? '').trim(); const n = k => g(k) === '' ? null : +g(k);
  const base = S.ui.prefDraft || S.prefs || {};
  const p = { ...base, titles: splitList(g('titles')), skills: splitList(g('skills')).map(canonSkill), locations: splitList(g('locations')).map(x => /remote/i.test(x) ? 'Remote' : canonCity(x)), expMin: n('expMin'), expMax: n('expMax'), salaryMin: g('salMin') === '' ? null : Math.round(+g('salMin') * 1e5), salaryMax: g('salMax') === '' ? null : Math.round(+g('salMax') * 1e5), workModes: fd.getAll('workModes'), employmentTypes: fd.getAll('employmentTypes'), companyTypes: splitList(g('companyTypes')), industries: splitList(g('industries')), other: g('other'), currency: 'INR', period: 'year', savedAt: nowISO() };
  p.ambiguities = prefAmbiguities(p); delete p.demo;
  S.prefs = p; S.ui.prefDraft = null; save.prefs(); rescoreAll(); logAgent('Career Profile Agent', 'Saved job preferences', p.titles.join(', ')); toast('Preferences saved. Jobs re-scored and search links updated.'); render();
};
FORM['import-job'] = async f => { const created = await importJobs(f.url.value.trim(), f.text.value); if (created.length) { f.reset(); toast(`Imported ${created.length} job${created.length > 1 ? 's' : ''}.`); go(created.length === 1 ? 'job-' + created[0].id : 'jobs'); } };
FORM['job-filter'] = f => { const fd = new FormData(f); Object.assign(S.ui.filter, { q: String(fd.get('q') || ''), minScore: +fd.get('minScore') || 0, status: String(fd.get('status')), sort: String(fd.get('sort')) }); render(); };
FORM.answers = async f => { const j = S.jobs[f.dataset.id]; const ch = saveAnswersFrom(j); toast(ch ? 'Answers saved.' : 'No changes.'); render(); };
FORM['settings-ai'] = f => { const fd = new FormData(f); const key = String(fd.get('aiKey') || '').trim(); if (key !== S.settings.aiKey) CAP.sampleOK = true; S.settings.aiKey = key; S.settings.aiModel = String(fd.get('aiModel') || 'gemini-2.5-flash').trim(); S.settings.cloudPublic = fd.get('cloudPublic') === 'on'; S.settings.cloudPersonal = String(fd.get('cloudPersonal')); S.settings.approvalDays = clamp(+fd.get('approvalDays') || 7, 1, 60); S.settings.autoShortlist = clamp(+fd.get('autoShortlist') || 70); save.settings(); logAgent('Model Router', 'Updated AI routing', `AI: ${S.settings.cloudPublic && S.settings.aiKey ? AI.name : 'local'}; personal: ${S.settings.cloudPersonal}`); toast('AI settings saved.'); render(); };
FORM['settings-weights'] = f => { const fd = new FormData(f); Object.keys(COMP_LABEL).forEach(k => S.settings.weights[k] = +fd.get(k) || 0); if (!sum(Object.values(S.settings.weights))) S.settings.weights = { ...DEFAULT_WEIGHTS }; save.settings(); rescoreAll(); toast('Weights saved. All jobs re-scored.'); render(); };
FORM['edit-job'] = async f => {
  const j = S.jobs[f.dataset.id]; const fd = new FormData(f); const g = k => String(fd.get(k) ?? '').trim();
  Object.assign(j, { title: g('title') || j.title, company: g('company') || j.company, location: g('location'), applyUrl: g('applyUrl'), workMode: g('workMode') || null, salaryMin: g('smin') === '' ? null : Math.round(+g('smin') * 1e5), salaryMax: g('smax') === '' ? null : Math.round(+g('smax') * 1e5), expMin: g('emin') === '' ? null : +g('emin'), expMax: g('emax') === '' ? null : +g('emax'), deadline: g('deadline'), requiredSkills: splitList(g('req')).map(canonSkill), preferredSkills: splitList(g('pref')).map(canonSkill), education: g('education') });
  if (['adzuna', 'remotive', 'greenhouse', 'lever', 'demo'].indexOf(j.source) < 0) { j.source = detectSource(j.applyUrl) === 'manual' ? j.source : detectSource(j.applyUrl); j.externalId = externalId(j.applyUrl) || j.externalId; }
  const desc = g('desc'); if (desc && desc !== j.description) { const ex = extractJobLocal(desc, j.applyUrl); j.description = desc; j.snippet = false; ['requiredSkills', 'preferredSkills', 'responsibilities'].forEach(k => { if (ex[k] && ex[k].length) j[k] = ex[k]; }); if (!g('education') && ex.education) j.education = ex.education; if (j.salaryMin == null && ex.salaryMin != null) { j.salaryMin = ex.salaryMin; j.salaryMax = ex.salaryMax; } if (j.expMin == null && ex.expMin != null) { j.expMin = ex.expMin; j.expMax = ex.expMax; } }
  j.match = scoreJob(j, S.profile, S.prefs, S.settings.weights); save.job(j); closeModal();
  if (j.stage === 'Approved') { j.app.approval = null; moveStage(j, 'AwaitingApproval', { by: 'System', note: 'Approval cleared: job details changed' }); }
  logAgent('Job Discovery Agent', 'Edited job details', `${j.title} @ ${j.company}`); render();
};
FORM['submit-result'] = f => {
  const j = S.jobs[f.dataset.id]; const fd = new FormData(f); const ok = fd.get('ok') === 'yes'; const ref = String(fd.get('ref') || '').trim(), conf = String(fd.get('conf') || ''), note = String(fd.get('note') || '').trim();
  if (j.stage === 'Approved') moveStage(j, 'SubmissionInProgress', { note: 'Submission started', silent: true });
  if (ok) {
    if (!ref && !conf) return toast('Enter the reference number or pick the confirmation you saw. Without proof it can’t be marked Applied.', 'bad');
    j.app.submission = { at: nowISO(), reference: ref || '(none given)', confirmation: conf, note }; moveStage(j, 'Applied', { evidence: conf || 'Reference number', note: ref ? 'Reference ' + ref : note });
    toast('Marked as applied. The tracker follows it from here.');
  } else { j.app.approval = null; moveStage(j, 'SubmissionFailed', { note: note || 'Submission failed' }); toast('Marked as failed. Re-open it for approval when you retry.'); }
  closeModal(); render();
};
FORM.status = async f => {
  const j = S.jobs[f.dataset.id]; const fd = new FormData(f); const to = String(fd.get('to')); const ev = String(fd.get('evidence') || ''); const g = k => String(fd.get(k) ?? '').trim();
  if (!ev) return toast('Choose the evidence for this status change.', 'bad');
  j.app = j.app || {};
  if (g('rName') || g('rEmail') || g('rPhone')) j.app.recruiter = { ...(j.app.recruiter || {}), name: g('rName'), email: g('rEmail'), phone: g('rPhone') };
  if (to === 'InterviewScheduled') { if (!g('ivAt')) return toast('Add the interview date and time.', 'bad'); j.app.interviews = j.app.interviews || []; j.app.interviews.push({ id: uid('i'), at: new Date(g('ivAt')).toISOString(), type: g('ivType'), notes: g('ivNotes') }); }
  if (to === 'EmployerRejected') j.app.feedback = { text: g('fb'), source: ev, confirmed: !!g('fb') };
  if (to === 'OfferReceived') j.app.offer = { fixed: g('ofFixed') ? Math.round(+g('ofFixed') * 1e5) : null, variable: g('ofVar') ? Math.round(+g('ofVar') * 1e5) : null, joiningBonus: g('ofBonus') ? +g('ofBonus') : null, location: g('ofLoc'), joiningDate: g('ofJoin'), deadline: g('ofDl'), benefits: g('ofBen') };
  moveStage(j, to, { evidence: ev, note: g('note') });
  if (to === 'EmployerShortlisted') j.app.shortlistAnalysis = { at: nowISO(), engine: 'local', report: shortlistLocal(j) };
  if (to === 'EmployerRejected') j.app.rejectionAnalysis = { at: nowISO(), engine: 'local', report: rejectionLocal(j) };
  save.job(j); closeModal();
  if (['EmployerShortlisted', 'EmployerRejected'].includes(to)) { S.ui.tab[j.id] = 'insights'; toast(to === 'EmployerRejected' ? 'Recorded. A first rejection analysis is ready; re-run it with AI for more depth if you added a Gemini key.' : 'Recorded. Shortlisting analysis and interview topics are ready.'); go('job-' + j.id); } else render();
};
FORM.recruiter = f => { const j = S.jobs[f.dataset.id]; const fd = new FormData(f); j.app = j.app || {}; j.app.recruiter = { name: String(fd.get('name')).trim(), email: String(fd.get('email')).trim(), phone: String(fd.get('phone')).trim(), notes: String(fd.get('notes')).trim() }; save.job(j); closeModal(); render(); };
FORM.interview = f => { const j = S.jobs[f.dataset.id]; const fd = new FormData(f); j.app = j.app || {}; j.app.interviews = j.app.interviews || []; j.app.interviews.push({ id: uid('i'), at: new Date(String(fd.get('at'))).toISOString(), type: String(fd.get('type')), notes: String(fd.get('notes') || '') }); if (j.stage === 'EmployerShortlisted') moveStage(j, 'InterviewScheduled', { evidence: 'Interview invitation' }); else save.job(j); logAgent('Interview Agent', 'Interview added', `${j.company} ${fd.get('type')}`); closeModal(); render(); };
FORM.feedback = f => { const j = S.jobs[f.dataset.id]; const fd = new FormData(f); j.app.feedback = { text: String(fd.get('text')).trim(), source: String(fd.get('source')), confirmed: !!String(fd.get('text')).trim() }; j.app.rejectionAnalysis = { at: nowISO(), engine: 'local', report: rejectionLocal(j) }; save.job(j); closeModal(); render(); };
FORM.offer = f => { const j = S.jobs[f.dataset.id]; const fd = new FormData(f); const g = k => String(fd.get(k) ?? '').trim(); j.app.offer = { ...(j.app.offer || {}), fixed: g('fixed') ? Math.round(+g('fixed') * 1e5) : null, variable: g('variable') ? Math.round(+g('variable') * 1e5) : null, joiningBonus: g('joiningBonus') ? +g('joiningBonus') : null, location: g('location'), joiningDate: g('joiningDate'), deadline: g('deadline'), benefits: g('benefits') }; save.job(j); closeModal(); render(); };

/* ============ Global events ============ */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (S.ui.notifOpen && !e.target.closest('.notif-panel') && !(el && el.dataset.act === 'notifs')) { S.ui.notifOpen = false; render(); if (!el) return; }
  if (!el) return; const act = el.dataset.act;
  if (act === 'modal-bg' && e.target !== el) return;
  const fn = ACT[act]; if (!fn) return;
  if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
  if (el.tagName === 'BUTTON') el.disabled = true;
  try { await fn(el, e); } catch (err) { if (!(err && err.code === 'cancelled')) { console.error(err); toast((err && err.message) || 'Something went wrong.', 'bad'); } }
  finally { if (el.isConnected && el.tagName === 'BUTTON') el.disabled = false; }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const fn = FORM[f.dataset.form]; if (!fn) return; const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
  try { await fn(f, e); } catch (err) { if (!(err && err.code === 'cancelled')) { console.error(err); toast((err && err.message) || 'Something went wrong.', 'bad'); } }
  finally { if (btn && btn.isConnected) btn.disabled = false; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal-root').innerHTML && !Busy.ctl) closeModal(false);
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.job-card[data-act], .kcard[data-act]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chat-in') { e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'jf-min') { const o = $('#jf-min-v'); if (o) o.textContent = e.target.value; }
  if (e.target.dataset.actInput === 'weight') { const v = $('#wv-' + e.target.name); if (v) v.textContent = e.target.value + '%'; const tot = sum($$('[data-act-input="weight"]').map(i => +i.value)); const t = $('#w-total'); if (t) { t.textContent = 'Total ' + tot + '%'; t.className = 'pill ' + (tot === 100 ? 'good' : 'warn'); } }
});
document.addEventListener('change', e => {
  if (e.target.id === 'resume-file' && e.target.files && e.target.files[0]) { const file = e.target.files[0]; e.target.value = ''; handleResumeFile(file); }
  if (e.target.id === 'st-to') { const v = e.target.value; const s = (id, on) => { const el = $(id); if (el) el.hidden = !on; }; s('#st-iv', v === 'InterviewScheduled'); s('#st-rej', v === 'EmployerRejected'); s('#st-offer', v === 'OfferReceived'); }
});
document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('#drop'); if (!d) return; e.preventDefault(); d.classList.remove('over'); const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) handleResumeFile(file); });

