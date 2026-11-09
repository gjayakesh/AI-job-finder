// Local test double for Supabase (auth + PostgREST subset), job APIs, Telegram, Resend and Web Push.
// Usage: node dev/mock-server.mjs  → API on http://localhost:54321, site on http://localhost:8080, push on https://localhost:54443
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SERVICE_KEY = 'service-role-test-key', ANON_KEY = 'anon-test-key';
const AUTOCONFIRM = process.env.MOCK_AUTOCONFIRM !== '0';
const st = { users: [], rows: [], sessions: {}, emails: [], telegram: [], tgQueue: [], pushes: [], log: [], clock: 0, confirmTokens: {} };
const now = () => { const t = Math.max(Date.now(), st.clock + 1); st.clock = t; return new Date(t).toISOString().replace('Z', '000+00:00'); };
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u, ttl = 3600) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + ttl, session_id: crypto.randomUUID() })}.sig`;
const userJSON = u => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.confirmed ? u.created : null, confirmed_at: u.confirmed ? u.created : null, created_at: u.created, updated_at: u.created, app_metadata: { provider: 'email' }, user_metadata: {}, identities: [] });
const session = u => { const rt = crypto.randomBytes(12).toString('hex'); st.sessions[rt] = u.id; return { access_token: jwt(u), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: rt, user: userJSON(u) }; };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer, range, x-client-info, accept-profile, content-profile, x-supabase-api-version, x-goog-api-key', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count' };
function send(res, code, body, headers = {}) { res.writeHead(code, { ...cors, 'Content-Type': 'application/json', ...headers }); res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)); }
const readBody = req => new Promise(r => { let d = []; req.on('data', c => d.push(c)); req.on('end', () => { const s = Buffer.concat(d).toString(); try { r(s ? JSON.parse(s) : {}); } catch (e) { r(s); } }); });
function whoami(req) {
  const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tok && req.headers.apikey === 'sb_secret_testkey') return { admin: true };
  if (/^sb_/.test(tok) && tok !== req.headers.apikey) return { badjwt: true };
  if (tok === SERVICE_KEY) return { admin: true };
  if (!tok || tok === ANON_KEY) return { anon: true };
  try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); if (p.exp * 1000 < Date.now()) return { expired: true }; return { uid: p.sub }; } catch (e) { return { anon: true }; }
}
function applyFilters(rows, q) {
  for (const [k, v] of q.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    const m = String(v).match(/^(eq|gt|lt|gte|lte|neq|in)\.(.*)$/); if (!m) continue;
    const [, op, val] = m; const vals = op === 'in' ? val.replace(/^\(|\)$/g, '').split(',') : null;
    rows = rows.filter(r => { const x = String(r[k]); if (op === 'eq') return x === val; if (op === 'neq') return x !== val; if (op === 'gt') return x > val; if (op === 'lt') return x < val; if (op === 'gte') return x >= val; if (op === 'lte') return x <= val; if (op === 'in') return vals.includes(x); return true; });
  }
  return rows;
}
async function rest(req, res, url) {
  if (!req.headers.apikey) return send(res, 401, { message: 'No API key found in request' });
  const who = whoami(req); if (who.expired) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' }); if (who.badjwt) return send(res, 401, { code: 'PGRST301', message: 'Invalid JWT' });
  if (who.anon) return send(res, 401, { code: '42501', message: 'permission denied for table docs' });
  const scope = r => who.admin || r.user_id === who.uid;
  const q = url.searchParams;
  if (req.method === 'GET') {
    let rows = applyFilters(st.rows.filter(scope), q);
    const ord = q.get('order'); if (ord) { const keys = ord.split(',').map(o => o.split('.')); rows = [...rows].sort((a, b) => { for (const [k, d] of keys) { const c = String(a[k]).localeCompare(String(b[k])); if (c) return d === 'desc' ? -c : c; } return 0; }); }
    const off = +(q.get('offset') || 0), lim = +(q.get('limit') || 1000);
    const page = rows.slice(off, off + lim).map(r => { const sel = (q.get('select') || '*').split(','); return sel[0] === '*' ? r : Object.fromEntries(sel.map(s => [s, r[s]])); });
    return send(res, 200, page, { 'Content-Range': `${off}-${off + page.length - 1}/*` });
  }
  if (req.method === 'POST') {
    const body = await readBody(req); const arr = Array.isArray(body) ? body : [body];
    for (const b of arr) { if (!who.admin && b.user_id && b.user_id !== who.uid) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "docs"' }); }
    for (const b of arr) {
      const row = { user_id: b.user_id || who.uid, kind: b.kind, id: b.id, data: b.data, updated_at: now() };
      const i = st.rows.findIndex(r => r.user_id === row.user_id && r.kind === row.kind && r.id === row.id);
      if (i >= 0) st.rows[i] = row; else st.rows.push(row);
    }
    return send(res, 201, (req.headers.prefer || '').includes('return=representation') ? arr : undefined);
  }
  if (req.method === 'DELETE') {
    const del = applyFilters(st.rows.filter(scope), q); st.rows = st.rows.filter(r => !del.includes(r));
    return send(res, 204);
  }
  return send(res, 405, { message: 'method' });
}
async function auth(req, res, url) {
  const p = url.pathname.replace('/auth/v1', ''); const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
  const err = (code, msg, ec) => send(res, code, { code, error_code: ec, msg, error_description: msg, message: msg });
  if (p === '/signup') {
    if (st.users.find(u => u.email === body.email)) return err(422, 'User already registered', 'user_already_exists');
    const u = { id: crypto.randomUUID(), email: body.email, password: body.password, created: new Date().toISOString(), confirmed: AUTOCONFIRM }; st.users.push(u);
    if (AUTOCONFIRM) return send(res, 200, session(u));
    const t = crypto.randomBytes(8).toString('hex'); st.confirmTokens[t] = u.id; st.emails.push({ to: u.email, subject: 'Confirm your signup', confirm: t });
    return send(res, 200, userJSON(u));
  }
  if (p === '/token') {
    const g = url.searchParams.get('grant_type');
    if (g === 'password') { const u = st.users.find(x => x.email === body.email && x.password === body.password); if (!u) return err(400, 'Invalid login credentials', 'invalid_credentials'); if (!u.confirmed) return err(400, 'Email not confirmed', 'email_not_confirmed'); return send(res, 200, session(u)); }
    if (g === 'refresh_token') { const id = st.sessions[body.refresh_token]; const u = st.users.find(x => x.id === id); if (!u) return err(400, 'Invalid Refresh Token', 'refresh_token_not_found'); return send(res, 200, session(u)); }
    return err(400, 'unsupported grant', 'validation_failed');
  }
  if (p === '/user') {
    const who = whoami(req); const u = st.users.find(x => x.id === who.uid); if (!u) return err(401, 'invalid JWT', 'bad_jwt');
    if (req.method === 'PUT' && body.password) u.password = body.password;
    return send(res, 200, userJSON(u));
  }
  if (p === '/logout') return send(res, 204);
  if (p === '/recover' || p === '/otp') { st.emails.push({ to: body.email, subject: p }); return send(res, 200, {}); }
  if (p === '/settings') return send(res, 200, { external: { email: true }, disable_signup: false, mailer_autoconfirm: AUTOCONFIRM });
  return err(404, 'not found ' + p, 'not_found');
}
// ---- external API fixtures ----
const today = new Date().toISOString().slice(0, 10);
const ADZUNA = { results: [
  { id: 'adz-1', title: 'Junior <strong>Python Developer</strong>', company: { display_name: 'Kestrel Software' }, location: { display_name: 'Hyderabad, Telangana' }, redirect_url: 'https://www.adzuna.in/details/adz-1', created: today + 'T04:00:00Z', description: 'We need a Python developer with Django, REST APIs, MySQL and Git. 0-2 years experience. B.Tech preferred…', salary_min: 400000, salary_max: 600000, salary_is_predicted: '0', contract_time: 'full_time' },
  { id: 'adz-2', title: 'Senior Python Developer', company: { display_name: 'Big Corp' }, location: { display_name: 'Hyderabad' }, redirect_url: 'https://www.adzuna.in/details/adz-2', created: today + 'T04:00:00Z', description: 'Python, 8+ years…', salary_is_predicted: '1' },
  { id: 'adz-3', title: 'Accountant', company: { display_name: 'Ledger Co' }, location: { display_name: 'Hyderabad' }, redirect_url: 'https://www.adzuna.in/details/adz-3', created: today + 'T04:00:00Z', description: 'Tally…' },
] };
const REMOTIVE = { jobs: [
  { id: 901, url: 'https://remotive.com/remote-jobs/software-dev/python-backend-901', title: 'Python Backend Developer', company_name: 'Nimbus Remote', candidate_required_location: 'Worldwide', job_type: 'full_time', publication_date: today + 'T00:00:00', salary: '', tags: ['python', 'django', 'postgresql'], description: '<p>Build APIs with <b>Python</b>, Django and PostgreSQL. 1-3 years experience.</p>' },
  { id: 902, url: 'https://remotive.com/remote-jobs/software-dev/python-us-902', title: 'Python Developer', company_name: 'US Only Inc', candidate_required_location: 'USA', job_type: 'full_time', publication_date: today + 'T00:00:00', description: 'US only' },
] };
const GREENHOUSE = { acme: { jobs: [{ id: 5551, title: 'Python Developer - Payments', absolute_url: 'https://boards.greenhouse.io/acme/jobs/5551', location: { name: 'Bengaluru, India' }, updated_at: today + 'T00:00:00Z', company_name: 'Acme Payments', content: '&lt;p&gt;Requirements: Python, Django, REST APIs, MySQL, Git. 0-2 years.&lt;/p&gt;&lt;p&gt;Fee: none&lt;/p&gt;' }] } };
const LEVER = { cred: [{ id: 'lv-1', text: 'Python Developer (Backend)', hostedUrl: 'https://jobs.lever.co/cred/lv-1', categories: { location: 'Bengaluru', commitment: 'Full-time' }, workplaceType: 'hybrid', descriptionPlain: 'Work on Python services.', lists: [{ text: 'Requirements', content: '<li>Python</li><li>Django</li><li>Git</li>' }], additionalPlain: '', createdAt: Date.now() - 3600e3 }] };
async function external(req, res, url) {
  const p = url.pathname;
  if (p.startsWith('/mock/adzuna')) { st.log.push('adzuna ' + url.search); if (!url.searchParams.get('app_id')) return send(res, 401, { error: 'auth' }); return send(res, 200, ADZUNA); }
  if (p.startsWith('/mock/remotive')) { st.log.push('remotive'); return send(res, 200, REMOTIVE); }
  let m = p.match(/^\/mock\/greenhouse\/([^/]+)\/jobs/); if (m) { st.log.push('greenhouse ' + m[1]); return GREENHOUSE[m[1]] ? send(res, 200, GREENHOUSE[m[1]]) : send(res, 404, { status: 404 }); }
  m = p.match(/^\/mock\/lever\/([^/?]+)/); if (m) { st.log.push('lever ' + m[1]); return LEVER[m[1]] ? send(res, 200, LEVER[m[1]]) : send(res, 404, { ok: false }); }
  m = p.match(/^\/mock\/telegram\/bot([^/]+)\/(\w+)/);
  if (m) {
    const body = await readBody(req); if (m[1] !== 'TGTOKEN') return send(res, 401, { ok: false, description: 'Unauthorized' });
    if (m[2] === 'getUpdates') { if (body.offset) { st.tgQueue = st.tgQueue.filter(u => u.update_id >= body.offset); return send(res, 200, { ok: true, result: [] }); } return send(res, 200, { ok: true, result: st.tgQueue }); }
    if (m[2] === 'sendMessage') { st.telegram.push(body); return send(res, 200, { ok: true, result: { message_id: st.telegram.length } }); }
    return send(res, 200, { ok: true, result: true });
  }
  if (p === '/mock/resend/emails') { const body = await readBody(req); if ((req.headers.authorization || '') !== 'Bearer RESENDKEY') return send(res, 401, { message: 'API key is invalid' }); st.emails.push({ to: body.to, subject: body.subject, html: body.html, from: body.from }); return send(res, 200, { id: 'em_' + st.emails.length }); }
  if (p === '/__state') return send(res, 200, st);
  if (p === '/__reset') { Object.assign(st, { users: [], rows: [], sessions: {}, emails: [], telegram: [], tgQueue: [], pushes: [], log: [] }); return send(res, 200, { ok: true }); }
  if (p === '/__tg') { const body = await readBody(req); st.tgQueue.push({ update_id: 1000 + st.tgQueue.length, message: { message_id: 1, chat: { id: body.chat || 777001 }, from: { username: body.user || 'tester' }, text: body.text } }); return send(res, 200, { ok: true }); }
  if (p === '/__rows') { const body = await readBody(req); for (const b of body) { const row = { ...b, updated_at: now() }; const i = st.rows.findIndex(r => r.user_id === row.user_id && r.kind === row.kind && r.id === row.id); if (i >= 0) st.rows[i] = row; else st.rows.push(row); } return send(res, 200, { ok: true }); }
  return send(res, 404, { message: 'no mock for ' + p });
}
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/rest/v1/docs')) return rest(req, res, url);
    if (url.pathname.startsWith('/auth/v1')) return auth(req, res, url);
    return external(req, res, url);
  } catch (e) { console.error(e); send(res, 500, { message: e.message }); }
}).listen(54321, () => console.log('mock api on :54321')).keepAliveTimeout = 120000;
// static site
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost'); let f = path.join(SITE, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
}).listen(8080, () => console.log('site on :8080'));
// push endpoint (https, self-signed)
const certDir = '/tmp/mockcert';
https.createServer({ key: fs.readFileSync(certDir + '/key.pem'), cert: fs.readFileSync(certDir + '/cert.pem') }, async (req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    const id = req.url.split('/').pop(); st.pushes.push({ id, bytes: Buffer.concat(chunks).length, encoding: req.headers['content-encoding'], ttl: req.headers.ttl, auth: (req.headers.authorization || '').slice(0, 10) });
    if (id === 'gone') { res.writeHead(410); return res.end(); } res.writeHead(201); res.end();
  });
}).listen(54443, () => console.log('push on :54443'));
