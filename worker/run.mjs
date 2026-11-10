// AI Career Agent — scheduled server job (runs on GitHub Actions every 30 minutes, free).
// 1) Links Telegram chats  2) Searches public job boards for open roles, scores them and flags saved roles that have closed
// 3) Works out what needs your attention  4) Sends alerts by Telegram, email and browser push
// 5) Writes alerts, new jobs and a status report back to your Supabase database.
import webpush from 'web-push';
import * as E from './engine.mjs';

const env = process.env;
const VERSION = '2.0.0';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = (env.APP_URL || '').replace(/#.*$/, '');
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_API = (env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/+$/, '');
const RESEND_KEY = env.RESEND_API_KEY || '';
const RESEND_API = (env.RESEND_API || 'https://api.resend.com').replace(/\/+$/, '');
const MAIL_FROM = env.ALERT_FROM_EMAIL || 'AI Career Agent <onboarding@resend.dev>';
const VAPID_PUB = env.VAPID_PUBLIC_KEY || '', VAPID_PRIV = env.VAPID_PRIVATE_KEY || '', VAPID_SUBJECT = env.VAPID_SUBJECT || 'mailto:alerts@example.com';
const ADZ_ID = env.ADZUNA_APP_ID || '', ADZ_KEY = env.ADZUNA_APP_KEY || '';
const ADZ_API = env.ADZUNA_API || 'https://api.adzuna.com/v1/api/jobs/in/search/1';
// The job-board feeds live in engine.mjs (shared with the website). Tests point them at a mock.
for (const [k, v] of Object.entries({ greenhouse: env.GREENHOUSE_API, lever: env.LEVER_API, ashby: env.ASHBY_API, smartrecruiters: env.SMARTRECRUITERS_API, remotive: env.REMOTIVE_API, remoteok: env.REMOTEOK_API })) if (v) E.FEED_API[k] = v.replace(/\/+$/, '');
if (env.BOARD_DIRECTORY_JSON) E.BOARD_DIRECTORY.splice(0, E.BOARD_DIRECTORY.length, ...JSON.parse(env.BOARD_DIRECTORY_JSON));
const FORCE = env.FORCE_DISCOVERY === 'true';
const DRY = env.DRY_RUN === 'true';
const NOW = env.NOW_OVERRIDE ? new Date(env.NOW_OVERRIDE) : new Date();
const H = 3600e3, DAY = 24 * H;
const UA = 'AI-Career-Agent/2.0 (personal job alerts)';
E.FEED_OPTS.headers = { Accept: 'application/json', 'User-Agent': UA };

if (!SB_URL || !SB_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret. See README step 7.'); process.exit(1); }
const PUSH_OK = !!(VAPID_PUB && VAPID_PRIV);
if (PUSH_OK) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUB, VAPID_PRIV);

/* ---------------- helpers ---------------- */
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const htmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const htmlToText = E.htmlToText;
const hash = s => { let h1 = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619); } return (h1 >>> 0).toString(36); };
const jobUrl = id => APP_URL ? `${APP_URL}#job-${id}` : '';
const pageUrl = p => APP_URL ? `${APP_URL}#${p}` : '';
async function fetchJSON(url, opts = {}, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status >= 500) { if (i + 1 < tries) { await sleep(1500 * (i + 1)); continue; } }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i + 1 >= tries) throw e; await sleep(1000); }
  }
}

/* ---------------- Supabase (service role, server only) ---------------- */
async function sb(path, { method = 'GET', body, prefer } = {}) {
  // New Supabase secret keys (sb_secret_…) go only in the apikey header; legacy service_role JWTs also need Authorization.
  const authHeaders = SB_KEY.startsWith('sb_') ? { apikey: SB_KEY } : { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: { ...authHeaders, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]} → ${r.status} ${(await r.text()).slice(0, 300)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function listUsers() { const rows = await sb('docs?select=user_id&kind=in.(notify,prefs,profile)&limit=10000'); return [...new Set(rows.map(r => r.user_id))]; }
async function loadUser(uid) {
  const all = []; for (let off = 0; ; off += 1000) { const rows = await sb(`docs?select=kind,id,data,updated_at&user_id=eq.${uid}&order=kind.asc,id.asc&limit=1000&offset=${off}`); all.push(...rows); if (rows.length < 1000) break; }
  const U = { uid, jobs: {}, versions: {}, alerts: {}, server: {}, single: {} };
  for (const r of all) { if (['jobs', 'versions', 'alerts', 'resumes'].includes(r.kind)) (U[r.kind] = U[r.kind] || {})[r.id] = r.data; else if (r.kind === 'server') U.server[r.id] = r.data; else U.single[r.kind] = r.data; }
  return U;
}
async function upsert(uid, docs) {
  if (DRY || !docs.length) return;
  for (let i = 0; i < docs.length; i += 200) await sb('docs?on_conflict=user_id,kind,id', { method: 'POST', body: docs.slice(i, i + 200).map(d => ({ user_id: uid, kind: d.kind, id: d.id, data: d.data })), prefer: 'resolution=merge-duplicates,return=minimal' });
}
async function pruneAlerts(uid) { if (DRY) return; await sb(`docs?user_id=eq.${uid}&kind=eq.alerts&updated_at=lt.${new Date(NOW - 45 * DAY).toISOString()}`, { method: 'DELETE', prefer: 'return=minimal' }); }

/* ---------------- settings ---------------- */
const DEFAULT_NOTIFY = { email: '', emailOn: false, telegramOn: false, telegramChatId: '', telegramCode: '', pushOn: true, pushSubs: [], events: { newJobs: true, interviews: true, deadlines: true, approvals: true, followups: true, digest: true, weekly: true }, minScore: 70, digestHour: 9, tz: 'Asia/Kolkata', feeds: { adzuna: true, remotive: true, remoteok: true, ats: true }, companies: { greenhouse: '', lever: '', ashby: '', smartrecruiters: '' }, boardsOff: [], useDirectory: true, testAt: null };
function notifyOf(U) { const n = U.single.notify || {}; return { ...DEFAULT_NOTIFY, ...n, events: { ...DEFAULT_NOTIFY.events, ...(n.events || {}) }, feeds: { ...DEFAULT_NOTIFY.feeds, ...(n.feeds || {}) }, companies: { ...DEFAULT_NOTIFY.companies, ...(n.companies || {}) } }; }
function localParts(tz) {
  let f; try { f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hour12: false }); } catch (e) { f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hour12: false }); }
  const p = Object.fromEntries(f.formatToParts(NOW).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24, weekday: p.weekday };
}
const fmtWhen = (iso, tz) => { try { return new Date(iso).toLocaleString('en-IN', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };

/* ---------------- Telegram linking (bot-wide) ---------------- */
async function tg(method, body) {
  const r = await fetch(`${TG_API}/bot${TG_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({})); if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || r.status}`); return j.result;
}
async function linkTelegram(users) {
  if (!TG_TOKEN) return;
  let updates;
  try { updates = await tg('getUpdates', { timeout: 0, allowed_updates: ['message'] }); } catch (e) { log('telegram getUpdates failed:', e.message); return; }
  if (!updates.length) return;
  for (const u of updates) {
    const m = u.message; if (!m || !m.text) continue;
    const code = (m.text.match(/^\/start\s+([a-z0-9]{4,32})/i) || [])[1];
    const owner = code && users.find(U => notifyOf(U).telegramCode === code);
    if (owner) {
      owner.linksOut = { ...(owner.server.links || {}), telegramChatId: String(m.chat.id), telegramUser: (m.from && m.from.username) || '', linkedAt: NOW.toISOString() };
      log('linked telegram chat for a user');
      if (!DRY) await tg('sendMessage', { chat_id: m.chat.id, text: '✅ Connected. Job alerts from your AI Career Agent will arrive here.' }).catch(() => { });
    } else if (/^\/start/.test(m.text) && !DRY) {
      await tg('sendMessage', { chat_id: m.chat.id, text: 'To link this chat, open your AI Career Agent website → Notifications → Connect Telegram.' }).catch(() => { });
    }
  }
  if (!DRY) await tg('getUpdates', { offset: updates[updates.length - 1].update_id + 1, timeout: 0, limit: 1 }).catch(() => { });
}

/* ---------------- Job discovery ---------------- */
function queries(prefs) {
  const titles = (prefs.titles || []).filter(t => !/^junior /i.test(t)).slice(0, 2); const cities = (prefs.locations || []).filter(l => l !== 'Remote').slice(0, 2);
  const out = []; titles.forEach(t => (cities.length ? cities : ['']).forEach(c => out.push({ what: t, where: c }))); return out.slice(0, 3);
}
async function fromAdzuna(prefs) {
  const out = [];
  for (const q of queries(prefs)) {
    const u = new URL(ADZ_API); Object.entries({ app_id: ADZ_ID, app_key: ADZ_KEY, results_per_page: '30', what: q.what, where: q.where, max_days_old: '3', sort_by: 'date', 'content-type': 'application/json' }).forEach(([k, v]) => v && u.searchParams.set(k, v));
    const j = await fetchJSON(u.toString());
    for (const r of j.results || []) {
      const predicted = String(r.salary_is_predicted) === '1';
      out.push({ source: 'adzuna', extId: r.id, title: htmlToText(r.title), company: (r.company && r.company.display_name) || 'Unknown company', location: (r.location && r.location.display_name) || '', url: r.redirect_url, description: htmlToText(r.description), postedAt: (r.created || '').slice(0, 10), salaryMin: predicted ? null : (r.salary_min ? Math.round(r.salary_min) : null), salaryMax: predicted ? null : (r.salary_max ? Math.round(r.salary_max) : null), employmentType: r.contract_time === 'part_time' ? 'part_time' : r.contract_type === 'contract' ? 'contract' : null, snippet: true });
    }
    await sleep(2500);
  }
  return out;
}
const FEED_KEYS = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'remotive', 'remoteok', 'adzuna'];
const NOTHING = () => ({ fresh: [], closed: [], reopened: [], verified: [] });
async function discover(U, ctx) {
  const { n, prefs, profile, weights, state, status } = ctx;
  status.sources = { ...(status.sources || {}) };
  if (!prefs || !(prefs.titles || []).length) { FEED_KEYS.forEach(k => { status.sources[k] = 'waiting for job preferences'; }); return NOTHING(); }
  const last = status.lastDiscoveryAt ? new Date(status.lastDiscoveryAt) : null;
  if (!FORCE && last && NOW - last < 6 * H - 10 * 60e3) return NOTHING();
  const extra = [];
  if (!n.feeds.adzuna) status.sources.adzuna = 'off';
  else if (!ADZ_ID || !ADZ_KEY) status.sources.adzuna = 'missing ADZUNA_APP_ID / ADZUNA_APP_KEY secrets';
  else { try { extra.push(...await fromAdzuna(prefs)); status.sources.adzuna = 'ok'; } catch (e) { status.sources.adzuna = 'error: ' + e.message; ctx.err('adzuna: ' + e.message); } }
  const boards = n.feeds.ats === false ? [] : E.boardsFor(n);
  state.remoteAt = { ...(state.remoteAt || {}) };
  const due = k => FORCE || !state.remoteAt[k] || NOW - new Date(state.remoteAt[k]) > 23 * H;
  const remote = {}; for (const k of Object.keys(E.REMOTE_NAME)) remote[k] = n.feeds[k] === false ? false : due(k) ? true : null;
  const res = await E.discoverJobs({ prefs, profile, weights, boards, remote, extra, existing: Object.values(U.jobs), maxNew: 40, now: NOW, by: 'server', cacheMs: 0 });
  const st = res.stats;
  for (const ats of Object.keys(E.ATS_NAME)) {
    const mine = boards.filter(b => b.ats === ats), bad = st.failed.filter(f => f.ats === ats);
    status.sources[ats] = n.feeds.ats === false ? 'off' : !mine.length ? 'no companies followed' : bad.length === mine.length ? 'error: no board could be read' : bad.length ? `ok (${bad.length} of ${mine.length} boards unreachable)` : 'ok';
  }
  for (const k of Object.keys(E.REMOTE_NAME)) {
    const v = st.remote[k] || 'off';
    status.sources[k] = v === 'skipped' ? 'ok (checked daily)' : v;
    if (v === 'ok') state.remoteAt[k] = NOW.toISOString();
    if (/^error/.test(v)) ctx.err(`${k}: ${v}`);
  }
  if (st.failed.length) ctx.err(`boards unreachable: ${st.failed.slice(0, 6).map(f => f.ats + '/' + f.token).join(', ')}${st.failed.length > 6 ? '…' : ''}`);
  status.lastDiscoveryAt = NOW.toISOString(); status.discovered = { ...st.perSource };
  status.lastSearch = { boards: st.boards, boardsOk: st.boardsOk, listed: st.listed, added: st.added, closed: res.closed.length };
  for (const j of res.fresh) U.jobs[j.id] = j;
  log(`discovery: ${st.listed} open roles on ${st.boardsOk}/${st.boards} boards, ${res.fresh.length} new, ${res.closed.length} closed`);
  return res;
}

/* ---------------- What needs attention ---------------- */
const OPEN = ['Discovered', 'Analyzed', 'Shortlisted', 'ResumeGenerated', 'AwaitingApproval', 'Approved'];
const lastEntry = (j, st) => [...(j.history || [])].reverse().find(h => h.to === st);
function buildAlerts(U, ctx, fresh, closedJobs = []) {
  const { n, state, tz } = ctx; const A = []; const sent = state.sent;
  const add = a => { if (sent[a.key]) return; A.push(a); };
  if (n.events.newJobs) {
    const good = fresh.filter(j => j.match.score >= n.minScore && !j.suspicious && !j.expired).sort((a, b) => b.match.score - a.match.score);
    good.slice(0, 5).forEach(j => add({ key: 'new:' + j.id, type: 'new_match', via: ['telegram', 'push'], jobId: j.id, url: jobUrl(j.id), title: `New ${j.match.score}% match: ${j.title}`, body: `${j.company} · ${j.workMode === 'remote' ? 'Remote' : (j.location || 'Location n/a')} · ${E.salaryRange(j.salaryMin, j.salaryMax)} · via ${E.SOURCE_NAME[j.source]}` }));
    if (good.length > 5) add({ key: 'newmore:' + NOW.toISOString().slice(0, 13), type: 'new_match', via: ['telegram'], url: pageUrl('jobs'), title: `${good.length - 5} more new matches`, body: 'Open Recommended Jobs to see them all.' });
  }
  // a role you were preparing has been taken down by the employer
  if (n.events.deadlines) closedJobs.filter(j => ['Shortlisted', 'ResumeGenerated', 'AwaitingApproval', 'Approved'].includes(j.stage)).forEach(j => add({ key: 'closed:' + j.id, type: 'closed', via: ['telegram', 'push'], jobId: j.id, url: jobUrl(j.id), title: `Role closed: ${j.title}`, body: `${j.company} no longer lists this role, so it can’t be applied to.` }));
  for (const j of Object.values(U.jobs)) {
    if (n.events.interviews && j.app) for (const iv of (j.app.interviews || [])) {
      const hrs = (new Date(iv.at) - NOW) / H; if (!(hrs > 0)) continue;
      if (hrs <= 2.5) { sent['iv24:' + iv.id] = sent['iv24:' + iv.id] || NOW.toISOString(); add({ key: 'iv2:' + iv.id, type: 'interview', via: ['telegram', 'push'], jobId: j.id, url: pageUrl('interviews'), title: `Interview in ${Math.max(1, Math.round(hrs * 60 / 15) * 15)} min: ${j.company}`, body: `${iv.type || 'Interview'} at ${fmtWhen(iv.at, tz)}${iv.notes ? ' · ' + iv.notes : ''}` }); }
      else if (hrs <= 26) add({ key: 'iv24:' + iv.id, type: 'interview', via: ['telegram', 'push', 'email'], jobId: j.id, url: pageUrl('interviews'), title: `Interview tomorrow: ${j.company}`, body: `${iv.type || 'Interview'} for ${j.title} at ${fmtWhen(iv.at, tz)}. Your prep plan is on the Interview Prep page.` });
    }
    if (n.events.deadlines) {
      if (j.deadline && OPEN.includes(j.stage) && !j.closed) { const d = (new Date(j.deadline + 'T23:59:00') - NOW) / DAY; if (d >= 0 && d <= 2) add({ key: `dl:${j.id}:${j.deadline}`, type: 'deadline', via: ['telegram', 'push', 'email'], jobId: j.id, url: jobUrl(j.id), title: `Apply by ${E.fmtDate(j.deadline)}: ${j.title}`, body: `${j.company} · ${STAGE_LABEL(j.stage)}` }); }
      const o = j.app && j.app.offer; if (o && o.deadline && j.stage === 'OfferReceived') { const d = (new Date(o.deadline + 'T23:59:00') - NOW) / DAY; if (d >= 0 && d <= 2) add({ key: `od:${j.id}:${o.deadline}`, type: 'deadline', via: ['telegram', 'push', 'email'], jobId: j.id, url: pageUrl('offers'), title: `Offer response due ${E.fmtDate(o.deadline)}: ${j.company}`, body: 'Compare your offers before you reply.' }); }
    }
    if (n.events.approvals) {
      if (j.stage === 'AwaitingApproval' && !j.closed) { const h = lastEntry(j, 'AwaitingApproval'); if (h && NOW - new Date(h.t) > DAY) add({ key: `ap:${j.id}:${h.t}`, type: 'approval', via: ['telegram', 'push'], jobId: j.id, url: pageUrl('approvals'), title: `Waiting for your approval: ${j.title}`, body: `${j.company} · prepared ${E.fmtDate(h.t)}. Nothing is sent until you approve.` }); }
      const ap = j.app && j.app.approval; if (j.stage === 'Approved' && ap && ap.expiresAt) { const h = (new Date(ap.expiresAt) - NOW) / H; if (h > 0 && h <= 24) add({ key: `ax:${j.id}:${ap.expiresAt}`, type: 'approval', via: ['telegram', 'push'], jobId: j.id, url: pageUrl('approvals'), title: `Approval expires soon: ${j.company}`, body: `Submit ${j.title} before ${fmtWhen(ap.expiresAt, tz)} or approve it again later.` }); }
    }
    if (n.events.followups && ['Applied', 'UnderReview'].includes(j.stage)) { const h = (j.history || [])[j.history.length - 1]; if (h && NOW - new Date(h.t) > 10 * DAY) add({ key: `fu:${j.id}:${h.t}`, type: 'followup', via: ['telegram'], jobId: j.id, url: jobUrl(j.id), title: `No update for ${Math.floor((NOW - new Date(h.t)) / DAY)} days: ${j.company}`, body: `Consider a polite follow-up about ${j.title}${j.app && j.app.recruiter && j.app.recruiter.email ? ' to ' + j.app.recruiter.email : ''}.` }); }
  }
  // daily digest
  const L = localParts(tz);
  if (n.events.digest && L.hour >= n.digestHour && !sent['digest:' + L.date]) {
    const all = Object.values(U.jobs); const since = NOW - DAY;
    const newJobs = all.filter(j => j.discoveredAt && new Date(j.discoveredAt) > since && j.stage === 'Analyzed').sort((a, b) => b.match.score - a.match.score);
    const waiting = all.filter(j => j.stage === 'AwaitingApproval' || j.stage === 'Approved');
    const ivs = all.flatMap(j => ((j.app && j.app.interviews) || []).filter(iv => new Date(iv.at) > NOW && new Date(iv.at) - NOW < 7 * DAY).map(iv => ({ j, iv }))).sort((a, b) => a.iv.at.localeCompare(b.iv.at));
    const lines = [];
    if (newJobs.length) lines.push(`${newJobs.length} new job${newJobs.length > 1 ? 's' : ''} found; best: ${newJobs.slice(0, 3).map(j => `${j.title} at ${j.company} (${j.match.score})`).join('; ')}`);
    if (waiting.length) lines.push(`${waiting.length} application${waiting.length > 1 ? 's' : ''} waiting for your approval`);
    if (ivs.length) lines.push(`Upcoming: ${ivs.slice(0, 3).map(x => `${x.j.company} ${fmtWhen(x.iv.at, tz)}`).join('; ')}`);
    if (lines.length) add({ key: 'digest:' + L.date, type: 'digest', via: ['email', 'telegram'], url: pageUrl('dashboard'), title: `Your job search today (${L.date})`, body: lines.join(' · '), lines, html: digestHTML(lines, newJobs.slice(0, 8), waiting, ivs, tz) });
    else sent['digest:' + L.date] = NOW.toISOString();
  }
  if (n.events.weekly && L.weekday === 'Mon' && L.hour >= n.digestHour && !sent['weekly:' + L.date]) {
    globalThis.S = { jobs: U.jobs, versions: U.versions, profile: U.single.profile, prefs: U.single.prefs };
    const r = E.buildReport('weekly');
    add({ key: 'weekly:' + L.date, type: 'weekly', via: ['email', 'telegram'], url: pageUrl('analytics'), title: 'Your weekly career report', body: r.md.split('\n').filter(l => /^- /.test(l)).slice(0, 4).map(l => l.slice(2).replace(/\*\*/g, '')).join(' · '), html: mdToEmailHTML(r.md) });
  }
  if (n.testAt && (!state.lastTestAt || n.testAt > state.lastTestAt)) { A.push({ key: 'test:' + n.testAt, type: 'test', via: ['email', 'telegram', 'push'], url: pageUrl('alerts'), title: 'Test alert from your AI Career Agent', body: 'If you can read this, alerts on this channel work.' }); state.lastTestAt = n.testAt; ctx.status.lastTestAt = NOW.toISOString(); }
  return A;
}
const STAGE_LABEL = s => (E.STAGES[s] || { label: s }).label;
function digestHTML(lines, jobs, waiting, ivs, tz) {
  const li = (h, a) => `<li style="margin:4px 0">${a ? `<a href="${htmlEsc(a)}" style="color:#0B6B63">${h}</a>` : h}</li>`;
  return `${lines.map(l => `<p style="margin:6px 0">${htmlEsc(l)}</p>`).join('')}
  ${jobs.length ? `<h3 style="font:600 15px Arial;margin:16px 0 6px">New jobs</h3><ul style="padding-left:18px">${jobs.map(j => li(`<b>${j.match.score}</b> · ${htmlEsc(j.title)} — ${htmlEsc(j.company)} <span style="color:#666">(${htmlEsc(E.SOURCE_NAME[j.source] || j.source)})</span>`, jobUrl(j.id))).join('')}</ul>` : ''}
  ${waiting.length ? `<h3 style="font:600 15px Arial;margin:16px 0 6px">Waiting for your approval</h3><ul style="padding-left:18px">${waiting.map(j => li(`${htmlEsc(j.title)} — ${htmlEsc(j.company)}`, pageUrl('approvals'))).join('')}</ul>` : ''}
  ${ivs.length ? `<h3 style="font:600 15px Arial;margin:16px 0 6px">Interviews this week</h3><ul style="padding-left:18px">${ivs.map(x => li(`${htmlEsc(x.j.company)} · ${htmlEsc(x.iv.type || 'Interview')} · ${htmlEsc(fmtWhen(x.iv.at, tz))}`, pageUrl('interviews'))).join('')}</ul>` : ''}`;
}
function mdToEmailHTML(md) {
  return md.split('\n').map(l => { const t = htmlEsc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>'); if (/^# /.test(l)) return `<h2 style="font:700 18px Arial">${t.slice(2)}</h2>`; if (/^## /.test(l)) return `<h3 style="font:600 15px Arial;margin:14px 0 4px">${t.slice(3)}</h3>`; if (/^- /.test(l)) return `<div style="margin:2px 0 2px 12px">• ${t.slice(2)}</div>`; return t ? `<p style="margin:6px 0">${t}</p>` : ''; }).join('');
}

/* ---------------- Senders ---------------- */
function emailHTML(a) {
  return `<div style="font:14px/1.5 Arial,sans-serif;color:#13201E;max-width:560px;margin:auto"><div style="background:#0B6B63;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0"><b>AI Career Agent</b></div><div style="border:1px solid #D9E1DF;border-top:0;padding:18px;border-radius:0 0 10px 10px"><h2 style="font:700 17px Arial;margin:0 0 10px">${htmlEsc(a.title)}</h2>${a.html || `<p>${htmlEsc(a.body)}</p>`}${a.url ? `<p style="margin-top:18px"><a href="${htmlEsc(a.url)}" style="background:#0B6B63;color:#fff;padding:9px 14px;border-radius:8px;text-decoration:none">Open AI Career Agent</a></p>` : ''}<p style="color:#5A6B68;font-size:12px;margin-top:18px">You get this because email alerts are on in your Notifications settings.</p></div></div>`;
}
async function sendEmail(to, a) {
  const r = await fetch(`${RESEND_API}/emails`, { method: 'POST', headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: a.title, html: emailHTML(a), text: `${a.title}\n\n${(a.lines || [a.body]).join('\n')}\n\n${a.url || ''}` }), signal: AbortSignal.timeout(20000) });
  if (!r.ok) { const t = await r.text(); throw new Error(`Resend ${r.status}: ${t.slice(0, 160)}`); }
}
async function sendTelegram(chat, a) {
  const text = `<b>${htmlEsc(a.title)}</b>\n${htmlEsc(a.lines ? a.lines.map(l => '• ' + l).join('\n') : a.body)}${a.url ? `\n<a href="${htmlEsc(a.url)}">Open in AI Career Agent</a>` : ''}`;
  await tg('sendMessage', { chat_id: chat, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true });
}
async function sendPush(sub, a) { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: a.title, body: a.body.slice(0, 180), url: a.url, tag: a.type + ':' + (a.jobId || a.key) }), { TTL: 12 * 3600, urgency: a.type === 'interview' ? 'high' : 'normal' }); }

/* ---------------- Per-user run ---------------- */
async function processUser(U) {
  const errors = []; const err = m => { errors.push({ t: NOW.toISOString(), msg: String(m).slice(0, 240) }); log('error:', m); };
  const n = notifyOf(U); const prefs = U.single.prefs || null; const profile = U.single.profile || null;
  const settings = U.single.settings || {}; const weights = { ...E.DEFAULT_WEIGHTS, ...(settings.weights || {}) };
  const state = { sent: {}, ...(U.server.state || {}) }; state.sent = { ...(state.sent || {}) };
  const prevStatus = U.server.status || {};
  const status = { ...prevStatus, lastRunAt: NOW.toISOString(), version: VERSION, errors: (prevStatus.errors || []).filter(e => NOW - new Date(e.t) < 2 * DAY).slice(0, 5),
    channels: { email: !RESEND_KEY ? 'missing RESEND_API_KEY secret' : n.emailOn ? (n.email ? 'configured' : 'missing address') : 'off', telegram: !TG_TOKEN ? 'missing TELEGRAM_BOT_TOKEN secret' : n.telegramOn ? ((n.telegramChatId || (U.linksOut || U.server.links || {}).telegramChatId) ? 'configured' : 'not linked yet') : 'off', push: !PUSH_OK ? 'missing VAPID secrets' : n.pushOn ? ((n.pushSubs || []).length ? `configured (${n.pushSubs.length} device${n.pushSubs.length > 1 ? 's' : ''})` : 'no devices yet') : 'off' } };
  const ctx = { n, prefs, profile, weights, state, status, tz: n.tz || 'Asia/Kolkata', err };
  let found = NOTHING();
  try { found = await discover(U, ctx); } catch (e) { err('discovery: ' + e.message); }
  const fresh = found.fresh; const touched = [];
  for (const id of found.closed) { const j = U.jobs[id]; if (!j) continue; j.closed = true; j.closedAt = NOW.toISOString(); j.updatedAt = NOW.toISOString(); touched.push(j); }
  for (const id of found.reopened) { const j = U.jobs[id]; if (!j) continue; j.closed = false; delete j.closedAt; j.verifiedOpenAt = NOW.toISOString(); j.updatedAt = NOW.toISOString(); touched.push(j); }
  const alerts = buildAlerts(U, ctx, fresh, touched.filter(j => j.closed));
  const links = U.linksOut || U.server.links || {};
  const chat = n.telegramChatId || links.telegramChatId;
  const dead = new Set(links.deadPush || []);
  const sentCount = { email: 0, telegram: 0, push: 0 };
  const alertDocs = [];
  for (const a of alerts.slice(0, 15)) {
    const used = [];
    if (a.via.includes('telegram') && n.telegramOn && chat && TG_TOKEN) { try { if (!DRY) await sendTelegram(chat, a); used.push('telegram'); sentCount.telegram++; } catch (e) { err('telegram: ' + e.message); } }
    if (a.via.includes('email') && n.emailOn && n.email && RESEND_KEY) { try { if (!DRY) await sendEmail(n.email, a); used.push('email'); sentCount.email++; } catch (e) { err('email: ' + e.message); } }
    if (a.via.includes('push') && n.pushOn && PUSH_OK) for (const sub of (n.pushSubs || []).filter(s => !dead.has(s.endpoint))) {
      try { if (!DRY) await sendPush(sub, a); if (!used.includes('push')) used.push('push'); sentCount.push++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { dead.add(sub.endpoint); log('push subscription expired'); } else err('push: ' + (e.body || e.message || e)); }
    }
    state.sent[a.key] = NOW.toISOString();
    const id = 'a' + hash(a.key);
    alertDocs.push({ kind: 'alerts', id, data: { id, key: a.key, t: NOW.toISOString(), type: a.type, title: a.title, body: a.body, jobId: a.jobId || null, url: a.url || '', channels: used, read: false } });
  }
  for (const k of Object.keys(state.sent)) if (NOW - new Date(state.sent[k]) > 120 * DAY) delete state.sent[k];
  status.errors = [...errors, ...status.errors].slice(0, 5);
  status.sent = sentCount;
  const linksOut = { ...links, deadPush: [...dead].slice(-20) };
  const docs = [
    ...[...fresh, ...touched].map(j => ({ kind: 'jobs', id: j.id, data: j })),
    ...alertDocs,
    { kind: 'server', id: 'state', data: state },
    { kind: 'server', id: 'status', data: status },
  ];
  if (JSON.stringify(linksOut) !== JSON.stringify(U.server.links || {})) docs.push({ kind: 'server', id: 'links', data: linksOut });
  await upsert(U.uid, docs);
  await pruneAlerts(U.uid).catch(e => log('prune failed', e.message));
  log(`user done: ${fresh.length} new jobs, ${touched.filter(j => j.closed).length} closed, ${alerts.length} alerts (telegram ${sentCount.telegram}, email ${sentCount.email}, push ${sentCount.push})${DRY ? ' [dry run]' : ''}`);
  return { fresh: fresh.length, closed: touched.filter(j => j.closed).length, alerts: alerts.length, sent: sentCount, errors: errors.length };
}

async function main() {
  log(`AI Career Agent worker v${VERSION}${FORCE ? ' (forced discovery)' : ''}${DRY ? ' (dry run)' : ''}`);
  const ids = await listUsers();
  if (!ids.length) { log('No users yet. Sign in on the website and save your preferences or notification settings.'); return; }
  const users = []; for (const id of ids) users.push(await loadUser(id));
  await linkTelegram(users);
  const summary = [];
  for (const U of users) { try { summary.push(await processUser(U)); } catch (e) { console.error('user failed:', e.message); summary.push({ error: e.message }); } }
  log('summary', JSON.stringify(summary));
  if (summary.some(s => s.error)) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exit(1); });
