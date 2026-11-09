// End-to-end test of worker/run.mjs against dev/mock-server.mjs
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
const API = 'http://localhost:54321';
const j = async (p, b) => (await fetch(API + p, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : {})).json();
const U = '11111111-1111-4111-8111-111111111111';
const H = 3600e3, D = 24 * H, iso = ms => new Date(Date.now() + ms).toISOString();
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const sub = (id) => ({ endpoint: 'https://localhost:54443/push/' + id, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') }, label: 'Test ' + id });
const row = (kind, id, data) => ({ user_id: U, kind, id, data });
const hist = (...a) => a.map(([to, ms]) => ({ to, t: iso(ms), by: 'You' }));
const tomorrow = new Date(Date.now() + D); const dl = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
await j('/__reset');
await j('/__rows', [
  row('profile', 'main', { name: 'Test User', skills: ['Python', 'Django', 'REST APIs', 'MySQL', 'Git', 'PostgreSQL'], projects: [{ name: 'API', technologies: 'Python, Django, MySQL', description: 'REST APIs' }], experiences: [], education: [{ degree: 'B.Tech CSE' }], totalYears: 0 }),
  row('prefs', 'main', { titles: ['Python Developer', 'Junior Python Developer', 'Full Stack Developer'], locations: ['Hyderabad', 'Bengaluru', 'Remote'], expMin: 0, expMax: 2, salaryMin: 400000, salaryMax: 700000, workModes: [], employmentTypes: ['full_time'] }),
  row('settings', 'main', { weights: { K: 30, E: 20, Q: 10, P: 15, R: 10, L: 10, C: 5 } }),
  row('notify', 'main', { email: 'me@example.com', emailOn: true, telegramOn: true, telegramCode: 'abc12345', pushOn: true, pushSubs: [sub('dev1'), sub('gone')], events: { newJobs: true, interviews: true, deadlines: true, approvals: true, followups: true, digest: true, weekly: true }, minScore: 50, digestHour: 0, tz: 'Asia/Kolkata', feeds: { adzuna: true, remotive: true, ats: true }, companies: { greenhouse: 'acme\nnosuchco', lever: 'cred' }, testAt: new Date().toISOString() }),
  row('jobs', 'jA', { id: 'jA', title: 'Backend Dev', company: 'InterviewCo', stage: 'InterviewScheduled', history: hist(['InterviewScheduled', -D]), app: { interviews: [{ id: 'iv1', at: iso(20 * H), type: 'Technical round' }, { id: 'iv2', at: iso(1.5 * H), type: 'HR round' }] }, match: { score: 80 } }),
  row('jobs', 'jB', { id: 'jB', title: 'Python Dev', company: 'DeadlineCo', stage: 'Analyzed', deadline: dl, history: hist(['Analyzed', -D]), app: {}, match: { score: 75 } }),
  row('jobs', 'jC', { id: 'jC', title: 'Django Dev', company: 'WaitCo', stage: 'AwaitingApproval', history: hist(['AwaitingApproval', -2 * D]), app: {}, match: { score: 70 } }),
  row('jobs', 'jD', { id: 'jD', title: 'API Dev', company: 'ExpireCo', stage: 'Approved', history: hist(['Approved', -6 * D]), app: { approval: { expiresAt: iso(10 * H) } }, match: { score: 70 } }),
  row('jobs', 'jE', { id: 'jE', title: 'Web Dev', company: 'QuietCo', stage: 'Applied', history: hist(['Applied', -12 * D]), app: { recruiter: { email: 'hr@quiet.example' } }, match: { score: 66 } }),
]);
await j('/__tg', { text: '/start abc12345', chat: 555, user: 'testuser' });
const env = { ...process.env, SUPABASE_URL: API, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key', APP_URL: 'https://me.github.io/ai-career-agent/', TELEGRAM_BOT_TOKEN: 'TGTOKEN', TELEGRAM_API: API + '/mock/telegram', RESEND_API_KEY: 'RESENDKEY', RESEND_API: API + '/mock/resend', ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key', ADZUNA_API: API + '/mock/adzuna', REMOTIVE_API: API + '/mock/remotive', GREENHOUSE_API: API + '/mock/greenhouse', LEVER_API: API + '/mock/lever', NODE_TLS_REJECT_UNAUTHORIZED: '0', NODE_NO_WARNINGS: '1' };
const keys = JSON.parse(spawnSync('node', ['-e', "const w=require('web-push');console.log(JSON.stringify(w.generateVAPIDKeys()))"], { cwd: 'worker' }).stdout);
Object.assign(env, { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey, VAPID_SUBJECT: 'mailto:me@example.com' });
const run = (extra = {}) => { const r = spawnSync('node', ['run.mjs'], { cwd: 'worker', env: { ...env, ...extra }, encoding: 'utf8' }); return { code: r.status, out: (r.stdout + r.stderr).trim() }; };
const results = []; const check = (name, ok, detail = '') => { results.push([name, !!ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(detail).slice(0, 400))); };

const r1 = run(); console.log(r1.out.split('\n').map(l => '   | ' + l).join('\n'));
let s = await j('/__state'); const rows = k => s.rows.filter(r => r.user_id === U && r.kind === k);
const newJobs = rows('jobs').filter(r => r.data.discoveredBy === 'server').map(r => r.data);
check('Worker exits cleanly', r1.code === 0, r1.out.slice(-300));
check('Discovers relevant jobs from Adzuna, Remotive, Greenhouse and Lever', ['adzuna', 'remotive', 'greenhouse', 'lever'].every(src => newJobs.some(x => x.source === src)), newJobs.map(x => x.source + ':' + x.title));
check('Filters out senior roles, unrelated titles and US-only remote jobs', !newJobs.some(x => /Senior|Accountant/.test(x.title) || x.company === 'US Only Inc'), newJobs.map(x => x.title));
check('New jobs are scored, staged Analyzed and flagged New', newJobs.every(x => x.stage === 'Analyzed' && x.match && typeof x.match.score === 'number' && x.fresh && x.history.length === 2));
check('Adzuna jobs are marked as snippets; HTML stripped from titles', newJobs.filter(x => x.source === 'adzuna').every(x => x.snippet && !/</.test(x.title)));
check('Greenhouse HTML-escaped content is decoded into skills', (newJobs.find(x => x.source === 'greenhouse') || {}).requiredSkills?.includes('Django'), newJobs.find(x => x.source === 'greenhouse'));
check('Telegram /start code links the chat', (s.rows.find(r => r.kind === 'server' && r.id === 'links') || {}).data?.telegramChatId === '555');
check('Telegram confirmation sent to the linked chat', s.telegram.some(m => m.chat_id === 555 && /Connected/.test(m.text)));
const al = rows('alerts').map(r => r.data);
const types = al.map(a => a.key.split(':')[0]);
check('Alerts: new matches, interview 24h + 2h, deadline, approval waiting + expiring, follow-up, digest, test', ['new', 'iv24', 'iv2', 'dl', 'ap', 'ax', 'fu', 'digest', 'test'].every(t => types.includes(t)), types);
check('Telegram messages delivered with links back to the site', s.telegram.filter(m => m.chat_id === '555').length >= 8 && s.telegram.some(m => /#job-/.test(m.text)), s.telegram.length);
check('Emails only for interview-tomorrow, deadline, digest, weekly and test', s.emails.filter(e => e.from).every(e => /Interview tomorrow|Apply by|job search today|weekly|Test alert/i.test(e.subject)) && s.emails.filter(e => e.from).length >= 3, s.emails.map(e => e.subject));
check('Web push delivered encrypted (aes128gcm) with VAPID auth', s.pushes.some(p => p.id === 'dev1' && p.encoding === 'aes128gcm' && /^vapid/.test(p.auth)), s.pushes.slice(0, 2));
check('Expired push device (410) is recorded for cleanup', (s.rows.find(r => r.kind === 'server' && r.id === 'links') || {}).data?.deadPush?.some(e => e.endsWith('/gone')));
const status = (s.rows.find(r => r.kind === 'server' && r.id === 'status') || {}).data || {};
check('Status report: channels configured, sources ok, error for unknown board', status.channels?.email === 'configured' && status.channels?.telegram === 'configured' && /^ok/.test(status.sources?.adzuna) && /^ok/.test(status.sources?.greenhouse) && (status.errors || []).some(e => /nosuchco/.test(e.msg)), status);
check('Test request acknowledged', !!status.lastTestAt);
const nAlerts = al.length, nTg = s.telegram.length, nJobs = rows('jobs').length;
const r2 = run(); s = await j('/__state');
check('Second run: no duplicate alerts or messages, no new search within 6 h', r2.code === 0 && s.rows.filter(r => r.user_id === U && r.kind === 'alerts').length === nAlerts && s.telegram.length === nTg && s.rows.filter(r => r.kind === 'jobs').length === nJobs, { a: s.rows.filter(r => r.kind === 'alerts').length, nAlerts, tg: s.telegram.length, nTg });
const r3 = run({ FORCE_DISCOVERY: 'true' }); s = await j('/__state');
check('Forced search: already-known jobs are not added twice', r3.code === 0 && s.rows.filter(r => r.kind === 'jobs').length === nJobs, s.rows.filter(r => r.kind === 'jobs').length);
const r4 = run({ TELEGRAM_BOT_TOKEN: '', RESEND_API_KEY: '', VAPID_PRIVATE_KEY: '', ADZUNA_APP_ID: '' }); s = await j('/__state');
const st2 = (s.rows.find(r => r.kind === 'server' && r.id === 'status') || {}).data || {};
check('Missing secrets are reported, not crashed', r4.code === 0 && /missing/.test(st2.channels.telegram) && /missing/.test(st2.channels.email) && /missing/.test(st2.channels.push), st2.channels);
const r6 = run({ SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_testkey' });
check('New-style sb_secret_ key works (sent only in the apikey header)', r6.code === 0 && /user done/.test(r6.out), r6.out.slice(-200));
const r5 = spawnSync('node', ['run.mjs'], { cwd: 'worker', env: { ...env, SUPABASE_SERVICE_ROLE_KEY: '' }, encoding: 'utf8' });
check('Missing database secret stops with a clear message', r5.status === 1 && /SUPABASE_SERVICE_ROLE_KEY/.test(r5.stderr), r5.stderr);
console.log(`\n==== worker: ${results.filter(r => r[1]).length} passed, ${results.filter(r => !r[1]).length} failed ====`);
