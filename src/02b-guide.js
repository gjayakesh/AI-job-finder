/* ============ Resume check and job-title suggestions ============
   Plain rules that run in the browser: no AI key needed and nothing leaves the device.
   They only read what the resume already says. They never invent experience or skills. */

const FE_SKILLS = ['React', 'Angular', 'Vue.js', 'Next.js', 'Svelte', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Bootstrap', 'jQuery', 'Redux'];
const BE_SKILLS = ['Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', '.NET', 'NestJS', 'Ruby on Rails', 'REST APIs', 'MySQL', 'PostgreSQL', 'MongoDB', 'Java', 'Python', 'PHP', 'SQL'];
// [job title, skills that point to it, how many must be present, skills of which at least one must be present]
const ROLE_RULES = [
  ['Python Developer', ['Python', 'Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy', 'PyTest', 'Celery'], 2, ['Python']],
  ['Java Developer', ['Java', 'Spring Boot', 'Hibernate', 'Maven', 'JUnit', 'Gradle', 'Microservices'], 2, ['Java']],
  ['.NET Developer', ['C#', '.NET', 'SQL Server', 'Azure'], 2, ['C#', '.NET']],
  ['Frontend Developer', FE_SKILLS, 3, ['React', 'Angular', 'Vue.js', 'Next.js', 'Svelte', 'JavaScript', 'TypeScript']],
  ['Backend Developer', BE_SKILLS, 3, ['Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', '.NET', 'NestJS', 'Ruby on Rails', 'REST APIs', 'Java', 'Python', 'PHP']],
  ['Data Analyst', ['SQL', 'Excel', 'Power BI', 'Tableau', 'Pandas', 'Data Analysis', 'Data Visualization', 'Statistics', 'Looker', 'NumPy'], 2, ['SQL', 'Excel', 'Power BI', 'Tableau', 'Data Analysis']],
  ['Machine Learning Engineer', ['Machine Learning', 'Deep Learning', 'scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'NLP', 'Computer Vision', 'Hugging Face', 'MLOps'], 2, null],
  ['Data Scientist', ['Machine Learning', 'Statistics', 'scikit-learn', 'Pandas', 'NumPy', 'Deep Learning', 'NLP', 'Data Analysis', 'A/B Testing'], 3, ['Machine Learning', 'Statistics']],
  ['Data Engineer', ['ETL', 'Apache Spark', 'Airflow', 'Kafka', 'Hadoop', 'Snowflake', 'BigQuery', 'Redshift', 'dbt', 'Databricks'], 2, null],
  ['DevOps Engineer', ['Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'GitHub Actions', 'Linux', 'AWS', 'Azure', 'GCP', 'Prometheus', 'Grafana', 'Helm', 'ArgoCD'], 3, null],
  ['Mobile App Developer', ['Android', 'Kotlin', 'Flutter', 'React Native', 'Swift', 'iOS', 'SwiftUI', 'Dart'], 2, ['Android', 'Flutter', 'React Native', 'iOS', 'Kotlin', 'Swift']],
  ['QA Engineer', ['Selenium', 'Cypress', 'Appium', 'Manual Testing', 'Automation Testing', 'TestNG', 'Playwright', 'PyTest', 'Postman', 'JUnit', 'Unit Testing'], 2, null],
  ['UI/UX Designer', ['Figma', 'Photoshop', 'Accessibility', 'Responsive Design'], 1, ['Figma', 'Photoshop']],
];
const SOFTWARE_SKILLS = ['Data Structures & Algorithms', 'OOP', 'Java', 'Python', 'C++', 'C#', 'JavaScript', 'Go', 'System Design', 'Design Patterns', 'Microservices', 'TypeScript'];
const ROLE_WORD = /\b(developer|engineer|analyst|designer|tester|scientist|architect|consultant|administrator|programmer)\b/i;

/** Job titles that fit this profile, best first: roles you have held, then roles your skills point to. */
function suggestTitles(p) {
  p = p || {};
  const have = new Set((p.skills || []).map(s => canonSkill(s).toLowerCase()));
  const hit = names => names.filter(n => have.has(n.toLowerCase()));
  const out = []; const seen = new Set();
  const push = (title, why) => { const k = title.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ title, why }); } };
  const pref = Array.isArray(p.preferredRoles) ? p.preferredRoles : String(p.preferredRoles || '').split(/[,;\n]/);
  pref.map(s => String(s).trim()).filter(Boolean).forEach(t => push(t, 'You said you want this role'));
  (p.experiences || []).forEach(e => {
    const t = String(e.role || '').replace(/\b(intern(ship)?|trainee|junior|senior|jr\.?|sr\.?|associate)\b/ig, ' ').replace(/[-–|,()]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (t && t.length < 50 && ROLE_WORD.test(t)) push(t.replace(/\b([a-z])/g, m => m.toUpperCase()), `You worked as “${e.role}”`);
  });
  const fe = hit(FE_SKILLS), be = hit(BE_SKILLS);
  if (fe.length >= 2 && be.length >= 3 && hit(['React', 'Angular', 'Vue.js', 'Next.js', 'Svelte']).length) push('Full Stack Developer', `Your skills cover both front end (${fe.slice(0, 3).join(', ')}) and back end (${be.slice(0, 3).join(', ')})`);
  const scored = [];
  for (const [title, skills, min, must] of ROLE_RULES) {
    const h = hit(skills); if (h.length < min) continue; if (must && !hit(must).length) continue;
    scored.push({ title, n: h.length, why: `Your resume lists ${h.slice(0, 4).join(', ')}` });
  }
  scored.sort((a, b) => b.n - a.n).forEach(s => push(s.title, s.why));
  if (out.length < 3 && hit(SOFTWARE_SKILLS).length >= 2) push('Software Engineer', `Your resume lists ${hit(SOFTWARE_SKILLS).slice(0, 4).join(', ')}`);
  return out.slice(0, 5);
}

/** Search settings made from the resume, so a first-time user never has to fill in a form. */
function suggestPrefs(p) {
  p = p || {}; const yrs = +p.totalYears || 0; const t = suggestTitles(p);
  const city = p.location ? canonCity(p.location) : '';
  const extra = String(p.preferredLocations || '').split(/[,;\n]/).map(s => canonCity(s.trim())).filter(Boolean);
  return {
    titles: t.slice(0, 3).map(x => x.title), skills: (p.skills || []).filter(s => skillCat(s) !== 'Soft skill').slice(0, 12),
    locations: uniqCI([city, ...extra, 'Remote'].filter(Boolean)), workModes: [],
    expMin: yrs < 1 ? 0 : Math.max(0, Math.round(yrs - 1)), expMax: yrs < 1 ? 2 : Math.round(yrs + 2),
    salaryMin: null, salaryMax: null, currency: 'INR', period: 'year',
    employmentTypes: ['full_time'], companyTypes: [], industries: [], other: '', raw: '', engine: 'resume', ambiguities: [],
  };
}

/** A short, true summary built only from the profile, for resumes that have none. */
function draftSummary(p) {
  p = p || {}; const t = suggestTitles(p)[0]; const role = t ? t.title : '';
  const skills = (p.skills || []).filter(s => skillCat(s) !== 'Soft skill').slice(0, 4);
  if (!role && skills.length < 2) return '';
  const yrs = Math.round(+p.totalYears || 0);
  const head = yrs >= 1 ? `${role || 'Professional'} with ${yrs} year${yrs === 1 ? '' : 's'} of experience` : `Entry-level ${role || 'professional'}`;
  const list = skills.length > 1 ? `${skills.slice(0, -1).join(', ')} and ${skills[skills.length - 1]}` : skills[0] || '';
  const out = [`${head}${list ? ` skilled in ${list}` : ''}.`];
  const pr = (p.projects || []).filter(x => x.name);
  const ex = (p.experiences || []).find(e => e.role && e.employer);
  if (pr.length) out.push(pr.length === 1 ? `Built a project: ${pr[0].name}.` : `Built ${pr.length} projects, including ${pr[0].name}.`);
  else if (ex) out.push(`Worked as ${ex.role} at ${ex.employer}.`);
  const ed = (p.education || [])[0];
  if (yrs < 1 && ed && ed.degree) out.push(`Holds a ${ed.degree}${ed.institution ? ' from ' + ed.institution : ''}.`);
  return out.join(' ');
}

const WEAK_START = /^(responsible for|worked on|worked with|helped( to)?|assisted( in| with)?|involved in|participated in|duties included|tasked with|was responsible)\b/i;
const CLICHE = /seeking a (challenging|good|suitable|responsible)|to obtain a (position|job)|utili[sz]e my skills|dynamic organi[sz]ation|growth[- ]oriented|self[- ]motivated (and|team)/i;
const PERSONAL = /\b(date of birth|d\.?o\.?b\.?|marital status|father'?s? name|mother'?s? name|nationality|religion|passport (no|number))\b/i;

/**
 * Checks a resume and says what to fix, in plain words. `items` are ordered most important first.
 * `gaps` lists skills that several of your matched jobs ask for and your resume does not show.
 */
function resumeReview(text, p, jobs = []) {
  const t = String(text || ''); p = p || {};
  const lines = t.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const words = (t.match(/\S+/g) || []).length;
  const sec = {}; let cur = 'top';
  for (const l of lines) { const h = headingOf(l); if (h) { cur = h; sec[cur] = sec[cur] || []; continue; } (sec[cur] = sec[cur] || []).push(l); }
  const items = []; const fix = (cost, id, title, why, how, extra = {}) => items.push({ level: 'fix', cost, id, title, why, how, ...extra });
  const improve = (cost, id, title, why, how, extra = {}) => items.push({ level: 'improve', cost, id, title, why, how, ...extra });
  const good = (id, title) => items.push({ level: 'good', cost: 0, id, title });
  const techSkills = (p.skills || []).filter(s => skillCat(s) !== 'Soft skill');
  const isTech = techSkills.filter(s => ['Language', 'Framework', 'Library', 'Database'].includes(skillCat(s))).length >= 2;
  const fresher = !(+p.totalYears >= 1);

  // Contact details
  if (!p.email) fix(12, 'email', 'Add your email address', 'Employers cannot reach you without it.', 'Put your email at the very top of the resume.', { go: 'profile', goLabel: 'Add it in My details' });
  else if (/\d{4,}|(cool|hot|sexy|boy|girl|king|queen|lover|dude|baby|star)/i.test(p.email.split('@')[0])) improve(4, 'email-pro', 'Use a professional email address', `“${p.email}” may look unprofessional to a recruiter.`, 'Create a simple one such as firstname.lastname@gmail.com and use it on your resume.');
  else good('email', 'Your email address is there');
  if (!p.phone) fix(10, 'phone', 'Add your phone number', 'Recruiters usually call before they email.', 'Add a number you answer, with the country code (+91).', { go: 'profile', goLabel: 'Add it in My details' });
  else good('phone', 'Your phone number is there');
  if (!p.linkedin) improve(4, 'linkedin', 'Add your LinkedIn link', 'Most recruiters look you up on LinkedIn before they call.', 'Copy your profile link (linkedin.com/in/your-name) into the contact line.', { go: 'profile', goLabel: 'Add it in My details' }); else good('linkedin', 'Your LinkedIn link is there');
  if (isTech && !p.github) improve(4, 'github', 'Add your GitHub link', 'For tech jobs, recruiters want to see real code.', 'Add github.com/your-name, and pin your best 2–3 projects there.', { go: 'profile', goLabel: 'Add it in My details' }); else if (p.github) good('github', 'Your GitHub link is there');

  // Summary
  const sum = String(p.summary || '').trim(); const sumWords = (sum.match(/\S+/g) || []).length;
  if (!sum) { const d = draftSummary(p); improve(6, 'summary', 'Add a 2-line summary at the top', 'It tells a recruiter who you are in five seconds.', d ? 'Here is a draft built only from facts in your resume. Read it and change anything that is not true.' : 'Write two lines: what you do, your best skills, and one thing you built or achieved.', d ? { fix: { act: 'apply-summary', label: 'Use this summary', text: d } } : {}); }
  else if (CLICHE.test(sum)) improve(5, 'cliche', 'Replace the generic “objective” with facts', 'Phrases like “seeking a challenging position” say nothing about you.', 'Say what you can do instead: your role, top skills and one result. Keep it to 2–3 lines.', { go: 'profile', goLabel: 'Edit my summary' });
  else if (sumWords > 90) improve(4, 'summary-long', 'Shorten your summary', `It is ${sumWords} words. Recruiters read only the first lines.`, 'Keep it to 2–3 lines (about 40–60 words).', { go: 'profile', goLabel: 'Edit my summary' });
  else good('summary', 'You have a clear summary');

  // Skills
  if (techSkills.length < 5) improve(6, 'skills-few', 'List more of your skills', `Only ${techSkills.length} skill${techSkills.length === 1 ? ' was' : 's were'} found. Job filters search for skill words.`, 'Add a “Skills” section with the languages, tools and technologies you really know.', { go: 'profile', goLabel: 'Add skills' });
  else if (techSkills.length > 28) improve(4, 'skills-many', 'Keep only your strongest skills', `${techSkills.length} skills looks like a keyword dump.`, 'Keep the 12–20 you could talk about in an interview.', { go: 'profile', goLabel: 'Edit skills' });
  else good('skills', `${techSkills.length} skills found`);

  // Experience, projects, education
  const nExp = (p.experiences || []).length, nProj = (p.projects || []).length;
  if (!nExp && !nProj) fix(14, 'nothing', 'Show what you have built or done', 'There are no projects or work experience on the resume.', 'Add 2–3 projects (even college ones) or any internship, with what you built and which tools you used.', { go: 'profile', goLabel: 'Add a project' });
  else if (fresher && nProj < 2 && !nExp) improve(7, 'projects', 'Add one or two more projects', 'Without work experience, projects are your proof that you can do the job.', 'Add a project with 2–3 bullets: what it does, tools used, and how many people used it.', { go: 'profile', goLabel: 'Add a project' });
  else good('work', 'You show projects or experience');
  if (!(p.education || []).length) (fresher ? fix : improve)(fresher ? 10 : 5, 'education', 'Add your education', 'Degree, college and year are the first things recruiters check.', 'Add one line: degree, college, year of passing and CGPA or %.', { go: 'profile', goLabel: 'Add education' }); else good('education', 'Your education is listed');
  if ((p.experiences || []).some(e => e.role && e.employer && !e.start)) improve(4, 'dates', 'Add dates to every job or internship', 'Roles without dates look incomplete.', 'Write the start and end month, for example “Jan 2026 – Jun 2026”.', { go: 'profile', goLabel: 'Add dates' });

  // Bullet points: strong verbs and numbers
  const desc = [...(sec.experience || []), ...(sec.projects || [])].map(l => ({ raw: l, clean: l.replace(BULLET_RE, '').trim() })).filter(x => x.clean.split(/\s+/).length >= 5 && (BULLET_RE.test(x.raw) || x.clean.length >= 45));
  if (desc.length >= 2) {
    const weak = desc.filter(x => WEAK_START.test(x.clean));
    if (weak.length) improve(6, 'weak-verbs', 'Start each line with a strong action word', `${weak.length} line${weak.length === 1 ? ' starts' : 's start'} with a weak phrase such as “${weak[0].clean.split(/\s+/).slice(0, 3).join(' ')}”.`, 'Begin with what you did: Built, Designed, Led, Improved, Automated, Tested. Only use words that are true.', { examples: weak.slice(0, 3).map(x => x.clean.slice(0, 110)) }); else good('verbs', 'Your lines start with action words');
    const withNum = desc.filter(x => /\d/.test(x.clean)).length;
    if (withNum / desc.length < 0.25) improve(8, 'numbers', 'Add numbers to show the result', `Only ${withNum} of ${desc.length} lines contain a number.`, 'Add real figures: how many users, how much faster, how many records. “Built a placement portal” becomes “Built a placement portal used by 300 students”. Skip a number if you do not know it.', { examples: desc.filter(x => !/\d/.test(x.clean)).slice(0, 2).map(x => x.clean.slice(0, 110)) }); else good('numbers', 'Your lines include numbers');
  } else if (nExp || nProj) improve(6, 'bullets', 'Describe each project or job in short bullet points', 'Long paragraphs are skipped by recruiters.', 'Use 2–3 bullets for each: what you built, which tools, and the result.', { go: 'profile', goLabel: 'Edit descriptions' });

  // Length and things to remove
  if (words < 150) improve(8, 'short', 'Your resume looks very short', `Only ${words} words were found.`, 'If the file is a scan or image, upload a text-based PDF or a DOCX. Otherwise add more detail to projects and experience.');
  else if (words > (fresher ? 650 : 1000)) improve(6, 'long', 'Make your resume shorter', `It has about ${words} words.${fresher ? ' Freshers should fit on one page.' : ' Keep it to two pages at most.'}`, 'Cut old or minor items and keep what helps for the job you want.');
  else good('length', 'The length is right');
  if (PERSONAL.test(t)) improve(4, 'personal', 'Remove personal details you do not need', 'Date of birth, marital status or parents’ names are not needed and can lead to unfair judging.', 'Delete those lines. Keep only name, phone, email, city and links.');
  if ((t.match(/\b(I am|I have|I was|I worked|my)\b/g) || []).length > 3) improve(3, 'first-person', 'Avoid “I” and “my”', 'Resumes read better without them.', 'Write “Built a login system” instead of “I built my login system”.');

  // Skills the matched jobs ask for that the resume does not show
  const mine = new Set((p.skills || []).map(s => canonSkill(s).toLowerCase())); const count = new Map(); let seen = 0;
  for (const j of jobs) { if (!j.match || j.closed || j.expired) continue; seen++; for (const s of (j.match.missingRequired || [])) { const k = canonSkill(s); if (!mine.has(k.toLowerCase())) count.set(k, (count.get(k) || 0) + 1); } }
  const gaps = [...count.entries()].filter(([, n]) => n >= (seen >= 4 ? 2 : 1)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, n]) => ({ skill, count: n, of: seen }));

  const cost = items.reduce((a, x) => a + x.cost, 0);
  const score = Math.max(20, Math.min(100, 100 - cost));
  const order = { fix: 0, improve: 1, good: 2 };
  items.sort((a, b) => order[a.level] - order[b.level] || b.cost - a.cost);
  return { score, label: score >= 85 ? 'Strong' : score >= 70 ? 'Good' : score >= 50 ? 'Needs some work' : 'Needs a lot of work', items, gaps, words };
}
