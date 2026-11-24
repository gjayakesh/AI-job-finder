// Unit tests for the shared engine (worker/engine.mjs): title, seniority and location filters, posting extraction and scoring.
// No network and no mock server needed:  node dev/test-engine.mjs   (run `bash tools/build.sh` first)
globalThis.S = { jobs: {}, versions: {}, resumes: {}, settings: {} };
const E = await import('../worker/engine.mjs');
const results = []; const check = (name, ok, detail = '') => { results.push([name, !!ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(detail).slice(0, 400))); };
const all = (fn, cases) => { const bad = cases.filter(([input, want]) => fn(input) !== want).map(([input, want]) => `${JSON.stringify(input)} → ${fn(input)} (want ${want})`); return [bad.length === 0, bad]; };

// ---- titles
let m = E.titleMatcher({ titles: ['Python Developer', 'Full Stack Developer'] });
check('Title: the roles you asked for match, with common spellings', ...all(m, [
  ['Python Developer', 'strong'], ['Senior Python Engineer', 'strong'], ['Backend Engineer (Python/Django)', 'strong'], ['Full-Stack Software Engineer', 'strong'], ['Fullstack Dev', 'strong'], ['Python Developer - Payments', 'strong'],
]));
check('Title: unrelated jobs are rejected, including look-alikes', ...all(m, [
  ['Account Executive', null], ['Data Analyst (Python)', null], ['Full-Time Customer Support Associate', null], ['Sales Engineer', null], ['Escalation Engineer', null], ['Technical Services Engineer', null], ['UX Engineer', null], ['Python Developer Intern', null],
]));
check('Title: other software roles are only "related" (kept later if the skills fit)', ...all(m, [
  ['Software Engineer I, Backend', 'related'], ['SDE II', 'related'], ['Member of Technical Staff', 'related'], ['Software Engineer, iOS', 'related'], ['Frontend Engineer', 'related'],
]));
m = E.titleMatcher({ titles: ['Software Engineer'] });
check('Title: "Software Engineer" covers general software roles but not other kinds of engineer', ...all(m, [
  ['Software Engineer II', 'general'], ['Backend Developer', 'general'], ['SDE I', 'general'], ['Software Engineer, Security Platform', 'related'], ['Data Engineer (SDE 2)', 'related'], ['Mechanical Engineer', null], ['Infrastructure Engineer', null], ['Engineering Manager', null],
]));
m = E.titleMatcher({ titles: ['Data Analyst', 'Business Analyst'] });
check('Title: non-developer roles need the words together', ...all(m, [
  ['Senior Data Analyst - Power BI', 'strong'], ['Business Analyst, Marketing', 'strong'], ['Business Support Analyst (LMS Admin)', null], ['Senior Analyst - Finance Business Insights', null], ['Data Scientist', null], ['Data Engineer', null],
]));
m = E.titleMatcher({ titles: ['Python Developer Intern'], employmentTypes: ['internship'] });
check('Title: internship seekers only get internships', ...all(m, [['Python Developer Intern', 'strong'], ['Python Developer', null], ['Software Engineering Internship', null]]));
m = E.titleMatcher({ titles: ['QA Engineer', 'Machine Learning Engineer'] });
check('Title: synonyms (QA/test, ML/AI, SDET)', ...all(m, [['Quality Assurance Engineer', 'strong'], ['SDET', 'strong'], ['Test Engineer', 'strong'], ['ML Engineer', 'strong'], ['AI Engineer', 'strong'], ['Applied Scientist', null]]));

// ---- seniority
const fresher = { totalYears: 0 }, senior = { totalYears: 8 };
check('Level: a fresher (0–2 yrs) is not shown senior, lead or level II/III roles', ...all(t => E.levelGate(t, { expMin: 0, expMax: 2 }, fresher), [
  ['Senior Python Developer', false], ['Lead Engineer', false], ['SDE II', false], ['Software Engineer III', false], ['Staff Engineer', false], ['Intermediate Backend Engineer', false], ['Python Developer', true], ['SDE I', true], ['Software Engineer, New Grad', true],
]));
check('Level: up to 3 years is still not shown senior roles', E.levelGate('Senior Backend Engineer', { expMin: 0, expMax: 3 }, { totalYears: 1 }) === false && E.levelGate('Software Engineer II', { expMin: 0, expMax: 3 }, { totalYears: 2 }) === true);
check('Level: a mid-level candidate keeps senior roles but not principal or director', ...all(t => E.levelGate(t, { expMin: 2, expMax: 5 }, { totalYears: 3 }), [['Senior Data Analyst', true], ['Principal Engineer', false], ['Director of Engineering', false], ['Software Engineer II', true]]));
check('Level: a senior candidate is not shown graduate or level I roles', ...all(t => E.levelGate(t, { expMin: 6, expMax: 10 }, senior), [['Software Engineer, New Grad', false], ['SDE I', false], ['Junior Developer', false], ['Senior Software Engineer', true], ['Staff Software Engineer', true]]));
check('Level: with no range set, the profile’s years decide', E.levelGate('Senior Engineer', {}, fresher) === false && E.levelGate('Senior Engineer', {}, senior) === true);

// ---- location
const prefs = { locations: ['Hyderabad', 'Bengaluru', 'Remote'], workModes: [] };
const loc = (c, p = prefs, prof = {}) => E.locationGate(c, p, prof);
check('Location: preferred Indian cities, in any spelling', loc({ location: 'Bangalore, Karnataka, India', board: 'x' }) && loc({ location: 'IN-Hyderabad-HQ', board: 'x' }) && loc({ location: 'hyderabad', country: 'IN', board: 'x' }));
check('Location: "Indianapolis, IN" and other countries are never mistaken for India', !loc({ location: 'Indianapolis, IN, United States', board: 'x' }) && !loc({ location: 'San Francisco, CA', board: 'x' }) && !loc({ location: 'London', board: 'x' }));
check('Location: another Indian city needs "open to relocating"', !loc({ location: 'Pune, India', board: 'x' }) && loc({ location: 'Pune, India', board: 'x' }, prefs, { relocate: true }));
check('Location: remote in India or worldwide is fine; remote in another country is not', loc({ location: 'Remote - India', board: 'x' }) && loc({ location: 'Worldwide', remote: true }) && !loc({ location: 'USA', remote: true }) && !loc({ location: 'Remote', board: 'x' }) && !loc({ location: 'Remote - US', board: 'x' }));
check('Location: "India" with no city, and no city preference at all', loc({ location: 'India', board: 'x' }) && loc({ location: 'Chennai, India', board: 'x' }, { locations: [] }));
check('Location: without a remote preference, foreign remote roles are dropped', !loc({ location: 'Worldwide', remote: true }, { locations: ['Pune'], workModes: [] }));

// ---- experience and education
const longJd = `About us\nFounded 20 years ago, we have served customers for over 15 years.\nWhat you'll need\n- 3-5 years of experience building backend services.\n- Bachelor's or Master's degree in Computer Science.\nOur platform can be rapidly deployed; tell me more.`;
const x = E.parseExperience(longJd);
check('Experience: read from the requirement line, not from company history', x.min === 3 && x.max === 5, x);
check('Experience: short forms', E.parseExperience('0-2 years').max === 2 && E.parseExperience('5+ years of experience').min === 5 && E.parseExperience('Freshers welcome').min === 0 && E.parseExperience('at least 2 years').min === 2);
const jd = E.extractJobLocal(`Backend Engineer\nCompany: Testco\nLocation: Pune\n${longJd}`);
check('Education: "Bachelor’s or Master’s" asks for a Bachelor’s; ordinary words ("be", "me") are not degrees', /Bachelor/.test(jd.education) && E.scoreJob(jd, { education: [{ degree: 'B.Tech in CSE' }], skills: [] }, {}, null).components.Q.v === 100, jd.education);
const noEdu = E.extractJobLocal('Engineer\nCompany: X\nWe can be flexible. Tell me about a time you led a project. A high degree of ownership is expected.');
check('Education: nothing stated means nothing required', noEdu.education === '' , noEdu.education);

// ---- posting extraction
const post = E.extractJobLocal(`SDE I\nCompany: Hevo Data\nLocation: Bangalore, India\nAbout Hevo\nWe use Kafka and Kubernetes at scale.\nWhat you’ll own as SDE I:\n· Implement SaaS connectors.\n· Build simple REST API components.\nWhat you’ll bring to the table:\n· Proficiency in Java/TypeScript/Python, good problem-solving with data structures and algorithms.\n· Strong communication skills and teamwork.\n· Foundational knowledge of REST APIs.\nWhat will make you stand out (Preferred Qualifications)\n· Experience with Docker is a plus.\nCandidate Persona:\n· 0-1 years in software development.\n· B Tech in Computer Science or equivalent.`);
check('Posting: required and preferred skills come from the right sections', post.requiredSkills.includes('Python') && post.requiredSkills.includes('REST APIs') && post.preferredSkills.includes('Docker') && !post.requiredSkills.includes('Docker'), post);
check('Posting: the company blurb does not create requirements', !post.requiredSkills.includes('Kafka') && !post.requiredSkills.includes('Kubernetes'), post.requiredSkills);
check('Posting: soft skills are not counted as required skills', !post.requiredSkills.some(k => ['Communication', 'Teamwork', 'Problem Solving'].includes(k)), post.requiredSkills);
check('Posting: "Java/TypeScript/Python" is one requirement with alternatives', post.skillGroups.some(g => ['Java', 'TypeScript', 'Python'].every(k => g.includes(k))), post.skillGroups);
check('Posting: experience and responsibilities', post.expMin === 0 && post.expMax === 1 && post.responsibilities.length === 2, [post.expMin, post.expMax, post.responsibilities]);
const profile = { skills: ['Python', 'REST APIs', 'Data Structures & Algorithms'], education: [{ degree: 'B.Tech in Computer Science' }], projects: [], experiences: [], totalYears: 0 };
const sc = E.scoreJob(post, profile, { locations: ['Bengaluru'] }, null);
check('Score: knowing one of the alternatives satisfies that requirement', /^3\/3 required/.test(sc.components.K.note) && sc.missingRequired.length === 0 && /alternatives/.test(sc.components.K.note) && sc.components.K.v === 75, sc.components.K);
const sc2 = E.scoreJob(post, { ...profile, skills: ['REST APIs'] }, {}, null);
check('Score: knowing none of them counts as one gap, named by its first option', sc2.missingRequired.includes('Java') && !sc2.missingRequired.includes('TypeScript'), sc2.missingRequired);
const both = E.scoreJob({ title: 'Dev', location: 'Bengaluru', workMode: 'onsite', requiredSkills: [], preferredSkills: [] }, {}, { locations: ['Bengaluru', 'Remote'], workModes: ['remote'] }, null);
check('Score: asking for a city or remote does not penalise an office job in that city', both.components.L.v === 100, both.components.L);
const legacy = E.scoreJob({ title: 'Dev', requiredSkills: ['Python', 'Communication'], preferredSkills: [] }, { skills: ['Python'] }, {}, null);
check('Score: soft skills in older saved jobs no longer lower the score', legacy.components.K.v === 100, legacy.components.K);

// ---- resume
const cv = E.parseResumeLocal(`Asha Verma\nasha.verma@example.com | +91 98765 43210 | Hyderabad\n\nSKILLS\nPython, Django, REST APIs, MySQL\n\nEXPERIENCE\nPython Developer Intern, Brightleaf Software (Jan 2026 - Jun 2026)\n- Built REST APIs with Django REST Framework.\n\nEDUCATION\nB.Tech in Computer Science, JNTU Hyderabad, 2026, 8.1 CGPA`);
check('Resume: name, contact, skills, role, employer and dates are read; internships do not count as years', cv.name === 'Asha Verma' && cv.email === 'asha.verma@example.com' && cv.location === 'Hyderabad' && cv.skills.includes('Django') && cv.experiences[0].role === 'Python Developer Intern' && cv.experiences[0].employer === 'Brightleaf Software' && cv.experiences[0].start === '2026-01' && cv.experiences[0].end === '2026-06' && cv.totalYears === 0 && /B\.Tech/.test(cv.education[0].degree), cv);

// ---- boards
const refs = [['https://boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/123', 'greenhouse:razorpaysoftwareprivatelimited'], ['https://job-boards.greenhouse.io/groww', 'greenhouse:groww'], ['https://jobs.lever.co/cred/abc', 'lever:cred'], ['jobs.ashbyhq.com/spotdraft', 'ashby:spotdraft'], ['https://jobs.smartrecruiters.com/Freshworks/744000159090559-x', 'smartrecruiters:Freshworks'], ['https://www.linkedin.com/jobs/view/1', 'null']];
check('Boards: careers links are recognised', ...all(u => { const r = E.parseBoardRef(u); return r ? r.ats + ':' + r.token : 'null'; }, refs));
check('Boards: a plain name needs the system picked', E.parseBoardRef('acme') === null && E.parseBoardRef('acme', 'lever').token === 'acme');
const keys = E.BOARD_DIRECTORY.map(([a, t]) => E.boardKey({ ats: a, token: t }));
check('Boards: the suggested list has no duplicates and only supported systems', new Set(keys).size === keys.length && E.BOARD_DIRECTORY.every(([a, t, n]) => E.ATS_NAME[a] && t && n) && keys.length >= 50, keys.length);
const mine = E.boardsFor({ boardsOff: [keys[0]], companies: { lever: 'mycompany', greenhouse: '' } });
check('Boards: removed companies stay removed; added companies are searched', !mine.some(b => E.boardKey(b) === keys[0]) && mine.some(b => b.ats === 'lever' && b.token === 'mycompany') && mine.length === keys.length);
check('Boards: the board of an older saved job is read from its link', E.boardOf({ source: 'greenhouse', applyUrl: 'https://boards.greenhouse.io/acme/jobs/5551' }) === 'acme' && E.boardOf({ source: 'lever', board: 'cred' }) === 'cred');
check('Text: HTML and entities become clean lines', E.htmlToText('<p>Build &amp; ship</p><ul><li>Python</li><li>Go</li></ul><script>x()</script>') === 'Build & ship\n- Python\n- Go');

// ---- resume check and job-title suggestions
const GOOD = `Asha Verma\nasha.verma@example.com | +91 98765 43210 | Hyderabad\nlinkedin.com/in/ashaverma | github.com/ashaverma\n\nSKILLS\nPython, Django, REST APIs, MySQL, SQL, Git, JavaScript, React, HTML, CSS\n\nPROJECTS\nPlacement Portal | Django, MySQL\n- Built a placement portal with Django and MySQL used by 300 students.\n- Designed REST APIs for job listings.\n\nEXPERIENCE\nPython Developer Intern, Brightleaf Software (Jan 2026 - Jun 2026)\n- Built REST APIs with Django REST Framework.\n\nEDUCATION\nB.Tech in Computer Science, JNTU Hyderabad, 2026, 8.1 CGPA`;
const WEAK = `Ravi Kumar\ncool_boy1234@gmail.com\nBangalore\nOBJECTIVE\nSeeking a challenging position in a dynamic organization to utilize my skills.\nSKILLS\nExcel, SQL, Power BI\nEXPERIENCE\nData Analyst, Acme Corp (Jan 2022 - Present)\n- Responsible for preparing weekly reports for the team\n- Worked on dashboards for the sales team and helped with data cleaning tasks\n- Assisted in monthly meetings with managers\nDate of Birth: 12/03/1998\nMarital status: Single`;
const pa = E.parseResumeLocal(GOOD), pw = E.parseResumeLocal(WEAK);
const titlesA = E.suggestTitles(pa).map(t => t.title), titlesW = E.suggestTitles(pw).map(t => t.title);
check('Suggest: roles held come first, then roles the skills point to', titlesA[0] === 'Python Developer' && titlesA.includes('Full Stack Developer') && titlesW[0] === 'Data Analyst', [titlesA, titlesW]);
check('Suggest: nothing is suggested when the skills do not point to a role', E.suggestTitles({ skills: ['Communication'] }).length === 0 && E.suggestTitles(null).length === 0);
const prefsA = E.suggestPrefs(pa), prefsW = E.suggestPrefs(pw);
check('Prefs: a fresher gets 0–2 years and their own city plus remote; an experienced person a range around their years', prefsA.expMin === 0 && prefsA.expMax === 2 && prefsA.locations.join() === 'Hyderabad,Remote' && prefsW.expMin === 4 && prefsW.expMax === 7 && prefsW.locations[0] === 'Bengaluru', [prefsA, prefsW]);
check('Prefs: the generated filters work with the real job matcher', E.titleMatcher(prefsA)('Python Developer - Payments') === 'strong' && E.titleMatcher(prefsA)('Account Executive') === null);
const rA = E.resumeReview(GOOD, pa, []), rW = E.resumeReview(WEAK, pw, []);
check('Review: a solid resume scores high and a weak one scores low', rA.score >= 80 && rW.score <= 50 && rA.score > rW.score, [rA.score, rW.score]);
const ids = r => r.items.map(i => i.id);
check('Review: it names the real problems (generic objective, weak verbs, no numbers, personal details, missing phone and education)', ['cliche', 'weak-verbs', 'numbers', 'personal', 'phone', 'education', 'email-pro'].every(id => ids(rW).includes(id)), ids(rW));
check('Review: it does not complain about things that are fine', !ids(rA).some(id => ['email', 'phone', 'education', 'weak-verbs', 'numbers'].includes(id) && rA.items.find(i => i.id === id).level !== 'good'), ids(rA));
check('Review: most important problems are listed first', rW.items[0].level === 'fix' && rW.items.findIndex(i => i.level === 'good') > rW.items.findLastIndex(i => i.level !== 'good'));
const drafted = E.resumeReview(GOOD, { ...pa, summary: '' }, []).items.find(i => i.id === 'summary');
check('Review: a missing summary gets a draft that uses only facts from the profile', drafted && drafted.fix && /Python Developer/.test(drafted.fix.text) && /Placement Portal/.test(drafted.fix.text) && !/\d+ years/.test(drafted.fix.text), drafted && drafted.fix);
const jobs = [1, 2, 3, 4].map(n => ({ closed: false, match: { missingRequired: n < 4 ? ['Docker', 'AWS'] : ['Docker'] } }));
const gaps = E.resumeReview(GOOD, pa, jobs).gaps;
check('Review: skills that several matched jobs ask for are listed, most common first', gaps[0].skill === 'Docker' && gaps[0].count === 4 && gaps[1].skill === 'AWS' && gaps[1].count === 3, gaps);
check('Review: a skill you already have is never listed as a gap', E.resumeReview(GOOD, pa, [{ match: { missingRequired: ['Django', 'python'] } }, { match: { missingRequired: ['Django'] } }]).gaps.length === 0);
check('Review: empty input does not crash', E.resumeReview('', {}, []).score >= 20 && E.suggestPrefs({}).titles.length === 0 && E.draftSummary({}) === '');

const failed = results.filter(r => !r[1]).length;
console.log(`\n==== engine: ${results.length - failed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
