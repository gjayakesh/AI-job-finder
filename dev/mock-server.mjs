// Local test double for Supabase (auth + PostgREST subset), job APIs, Telegram, Resend and Web Push.
// Usage: node dev/mock-server.mjs  → API on http://localhost:54321, site on http://localhost:8080, push on https://localhost:54443
// (change the ports with MOCK_API_PORT, MOCK_SITE_PORT and MOCK_PUSH_PORT if they are taken)
// The site it serves gets a test config.js, so signing up locally never touches your real database.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_PORT = +process.env.MOCK_API_PORT || 54321, SITE_PORT = +process.env.MOCK_SITE_PORT || 8080, PUSH_PORT = +process.env.MOCK_PUSH_PORT || 54443;
const API_ORIGIN = 'http://localhost:' + API_PORT;
const SERVICE_KEY = 'service-role-test-key', ANON_KEY = 'anon-test-key';
const AUTOCONFIRM = process.env.MOCK_AUTOCONFIRM !== '0';
const st = { users: [], rows: [], sessions: {}, emails: [], telegram: [], tgQueue: [], pushes: [], log: [], clock: 0, confirmTokens: {}, deleted: [] };
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
    if (st.docsFail) return send(res, 500, { code: 'XX000', message: 'internal error (test double)' });
    const body = await readBody(req); const arr = Array.isArray(body) ? body : [body];
    for (const b of arr) { if (!who.admin && b.user_id && b.user_id !== who.uid) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "docs"' }); }
    for (const b of arr) { const owner = b.user_id || who.uid; if (st.deleted.includes(owner)) return send(res, 409, { code: '23503', details: `Key (user_id)=(${owner}) is not present in table "users".`, hint: null, message: 'insert or update on table "docs" violates foreign key constraint "docs_user_id_fkey"' }); }
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
// public.delete_my_account(): removes the caller's login and, by cascade, every row they own. POST /__rpc switches its behaviour: {"missing":true} = a database that never got the function; {"fail":true} = a server error, nothing deleted; {"lose":true} = deleted, but the reply never arrives; {"expired":true} = 401 JWT expired; {"denied":true} = 42501 permission denied; {"delay":ms} = answer late (combine with the others).
// Two more switches shape GoTrue: {"userErr":"session_not_found"|"bad_jwt"} makes GET /user refuse a valid token, {"logoutFail":true} makes POST /logout answer 500.
async function deleteAccountRpc(req, res) {
  if (!req.headers.apikey) return send(res, 401, { message: 'No API key found in request' });
  if (req.method !== 'POST') return send(res, 405, { message: 'method' });
  if (st.rpcMissing) return send(res, 404, { code: 'PGRST202', message: 'Could not find the function public.delete_my_account without parameters in the schema cache', hint: null, details: 'Searched for the function public.delete_my_account without parameters, but no matches were found in the schema cache.' });
  const who = whoami(req);
  if (who.expired) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
  if (who.badjwt) return send(res, 401, { code: 'PGRST301', message: 'Invalid JWT' });
  if (!who.uid) return send(res, 401, { code: '42501', message: 'permission denied for function delete_my_account' });
  if (st.rpcDelay) await new Promise(r => setTimeout(r, st.rpcDelay));
  if (st.rpcExpired) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
  if (st.rpcDenied) return send(res, 403, { code: '42501', message: 'permission denied for function delete_my_account' });
  if (st.rpcFail) return send(res, 500, { code: 'XX000', message: 'internal error (test double: nothing was deleted)' });
  st.rows = st.rows.filter(r => r.user_id !== who.uid);
  st.users = st.users.filter(u => u.id !== who.uid);
  for (const [rt, id] of Object.entries(st.sessions)) if (id === who.uid) delete st.sessions[rt];
  if (!st.deleted.includes(who.uid)) st.deleted.push(who.uid);
  st.log.push('deleted account ' + who.uid);
  if (st.rpcLose) { req.socket.destroy(); return; }
  return send(res, 204);
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
    const who = whoami(req); const u = st.users.find(x => x.id === who.uid); if (!u) return who.uid ? err(403, 'User from sub claim in JWT does not exist', 'user_not_found') : err(401, 'invalid JWT', 'bad_jwt');
    if (st.userErr === 'session_not_found') return err(403, 'Session from session_id claim in JWT does not exist', 'session_not_found');
    if (st.userErr === 'bad_jwt') return err(401, 'invalid JWT: unable to parse or verify signature', 'bad_jwt');
    if (req.method === 'PUT' && body.password) u.password = body.password;
    return send(res, 200, userJSON(u));
  }
  if (p === '/logout') {   // like GoTrue: a valid token whose user is gone gets 403 user_not_found (supabase-js ignores that); {"logoutFail":true} answers 500 (supabase-js does not)
    const who = whoami(req); if (st.logoutFail) return err(500, 'logout failed (test double)', 'unexpected_failure');
    if (who.uid && !st.users.some(x => x.id === who.uid)) return err(403, 'User from sub claim in JWT does not exist', 'user_not_found');
    return send(res, 204);
  }
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
const ghJob = (id, title, loc, content) => ({ id, title, absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/' + id, location: { name: loc }, updated_at: today + 'T00:00:00Z', first_published: today + 'T00:00:00Z', company_name: 'Acme Payments', content });
const GREENHOUSE = { acme: { jobs: [
  ghJob(5551, 'Python Developer - Payments', 'Bengaluru, India', '&lt;p&gt;Requirements: Python, Django, REST APIs, MySQL, Git. 0-2 years of experience.&lt;/p&gt;&lt;p&gt;Fee: none&lt;/p&gt;'),
  ghJob(5552, 'Senior Staff Python Engineer', 'Bengaluru, India', '&lt;p&gt;10+ years of experience with Python.&lt;/p&gt;'),
  ghJob(5553, 'Python Developer', 'Indianapolis, IN, United States', '&lt;p&gt;Python, Django. 1-2 years of experience.&lt;/p&gt;'),
  ghJob(5554, 'Account Executive', 'Bengaluru, India', '&lt;p&gt;Sell things.&lt;/p&gt;'),
  ghJob(5555, 'Software Engineer I, Backend', 'Hyderabad, India', '&lt;p&gt;What you need: Python, Django, PostgreSQL, REST APIs and Git. 0-2 years of experience building web services.&lt;/p&gt;'),
  ghJob(5556, 'Software Engineer, iOS', 'Hyderabad, India', '&lt;p&gt;Requirements: Swift, Objective-C, Xcode and UIKit. 1-2 years of experience shipping iOS apps.&lt;/p&gt;'),
] } };
const LEVER = { cred: [{ id: 'lv-1', text: 'Python Developer (Backend)', hostedUrl: 'https://jobs.lever.co/cred/lv-1', applyUrl: 'https://jobs.lever.co/cred/lv-1/apply', country: 'IN', categories: { location: 'Bengaluru', commitment: 'Full-time', allLocations: ['Bengaluru'] }, workplaceType: 'hybrid', descriptionPlain: 'Work on Python services.', lists: [{ text: 'Requirements', content: '<li>Python</li><li>Django</li><li>Git</li>' }], additionalPlain: '', createdAt: Date.now() - 3600e3 }] };
const ASHBY = { orbit: { apiVersion: '1', jobs: [
  { id: 'ash-1', title: 'Full Stack Developer', employmentType: 'FullTime', location: 'Orbit HQ, Bengaluru', secondaryLocations: [], publishedAt: today + 'T00:00:00.000+00:00', isListed: true, isRemote: false, workplaceType: 'Hybrid', address: { postalAddress: { addressCountry: 'India', addressLocality: 'Bangalore' } }, jobUrl: 'https://jobs.ashbyhq.com/orbit/ash-1', applyUrl: 'https://jobs.ashbyhq.com/orbit/ash-1/application', descriptionPlain: 'Requirements:\n- Python and Django for the API\n- React and JavaScript for the web app\n- MySQL, Git\n0-2 years of experience.' },
  { id: 'ash-2', title: 'Python Developer', location: 'Bengaluru', isListed: false, address: { postalAddress: { addressCountry: 'India' } }, jobUrl: 'https://jobs.ashbyhq.com/orbit/ash-2', descriptionPlain: 'Unlisted role.' },
] } };
const SMART = { Freshdesk: [
  { id: 'sr-1', name: 'Python Developer', company: { identifier: 'Freshdesk', name: 'Freshdesk' }, releasedDate: today + 'T00:00:00.000Z', location: { city: 'Chennai', country: 'in', remote: false, hybrid: true, fullLocation: 'Chennai, , India' }, typeOfEmployment: { id: 'permanent', label: 'Full-time' }, experienceLevel: { id: 'entry_level', label: 'Entry Level' }, jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Build internal tools.</p>' }, qualifications: { title: 'Qualifications', text: '<p>Python, Flask, REST APIs, SQL and Git. 0-1 years of experience.</p>' } } }, postingUrl: 'https://jobs.smartrecruiters.com/Freshdesk/sr-1-python-developer', applyUrl: 'https://jobs.smartrecruiters.com/Freshdesk/sr-1-python-developer?oga=true' },
] };
const REMOTEOK = [{ legal: 'Mock terms' }, { id: 'rok-1', slug: 'remote-python-developer-rok-1', date: today + 'T00:00:00+00:00', company: 'Farflung', position: 'Python Developer', tags: ['python', 'django'], description: '<p>Python, Django and PostgreSQL. 1-2 years of experience.</p>', location: 'Worldwide', url: 'https://remoteok.com/remote-jobs/remote-python-developer-rok-1', apply_url: 'https://remoteok.com/remote-jobs/remote-python-developer-rok-1', salary_min: 0, salary_max: 0 }, { id: 'rok-2', date: today + 'T00:00:00+00:00', company: 'Stateside', position: 'Python Developer', tags: ['python'], description: 'US only', location: 'Houston', url: 'https://remoteok.com/remote-jobs/rok-2' }];
st.gone = [];
async function external(req, res, url) {
  const p = url.pathname;
  if (p.startsWith('/mock/adzuna')) { st.log.push('adzuna ' + url.search); if (!url.searchParams.get('app_id')) return send(res, 401, { error: 'auth' }); return send(res, 200, ADZUNA); }
  if (p.startsWith('/mock/remotive')) { st.log.push('remotive'); return send(res, 200, REMOTIVE); }
  const live = arr => arr.filter(x => !st.gone.includes(String(x.id)));
  let m = p.match(/^\/mock\/greenhouse\/([^/]+)\/jobs(?:\/(\d+))?/);
  if (m) {
    st.log.push('greenhouse ' + m[1] + (m[2] ? ' job ' + m[2] : '')); const b = GREENHOUSE[m[1]]; if (!b) return send(res, 404, { status: 404 });
    if (m[2]) { const one = live(b.jobs).find(x => String(x.id) === m[2]); return one ? send(res, 200, one) : send(res, 404, { status: 404 }); }
    const full = url.searchParams.get('content') === 'true';
    return send(res, 200, { jobs: live(b.jobs).map(x => full ? x : { ...x, content: undefined }), meta: { total: live(b.jobs).length } });
  }
  m = p.match(/^\/mock\/lever\/([^/?]+)/); if (m) { st.log.push('lever ' + m[1]); return LEVER[m[1]] ? send(res, 200, live(LEVER[m[1]])) : send(res, 404, { ok: false }); }
  m = p.match(/^\/mock\/ashby\/([^/?]+)/); if (m) { st.log.push('ashby ' + m[1]); return ASHBY[m[1]] ? send(res, 200, { ...ASHBY[m[1]], jobs: live(ASHBY[m[1]].jobs) }) : send(res, 404, {}); }
  m = p.match(/^\/mock\/smartrecruiters\/([^/]+)\/postings(?:\/([^/?]+))?/);
  if (m) {
    st.log.push('smartrecruiters ' + m[1] + (m[2] ? ' posting ' + m[2] : '')); const b = SMART[m[1]]; if (!b) return send(res, 404, {});
    if (m[2]) { const one = live(b).find(x => x.id === m[2]); return one ? send(res, 200, one) : send(res, 404, {}); }
    const list = live(b).map(x => ({ ...x, jobAd: undefined, applyUrl: undefined, postingUrl: undefined })); return send(res, 200, { offset: 0, limit: 100, totalFound: list.length, content: list });
  }
  if (p.startsWith('/mock/remoteok')) { st.log.push('remoteok'); return send(res, 200, REMOTEOK); }
  if (p === '/__gone') { const body = await readBody(req); st.gone = (body.ids || []).map(String); return send(res, 200, { ok: true }); }
  m = p.match(/^\/mock\/telegram\/bot([^/]+)\/(\w+)/);
  if (m) {
    const body = await readBody(req); if (m[1] !== 'TGTOKEN') return send(res, 401, { ok: false, description: 'Unauthorized' });
    if (m[2] === 'getUpdates') { if (body.offset) { st.tgQueue = st.tgQueue.filter(u => u.update_id >= body.offset); return send(res, 200, { ok: true, result: [] }); } return send(res, 200, { ok: true, result: st.tgQueue }); }
    if (m[2] === 'sendMessage') { st.telegram.push(body); return send(res, 200, { ok: true, result: { message_id: st.telegram.length } }); }
    return send(res, 200, { ok: true, result: true });
  }
  if (p === '/mock/resend/emails') { const body = await readBody(req); if ((req.headers.authorization || '') !== 'Bearer RESENDKEY') return send(res, 401, { message: 'API key is invalid' }); st.emails.push({ to: body.to, subject: body.subject, html: body.html, from: body.from }); return send(res, 200, { id: 'em_' + st.emails.length }); }
  if (p === '/__state') return send(res, 200, st);
  if (p === '/__reset') { Object.assign(st, { users: [], rows: [], sessions: {}, emails: [], telegram: [], tgQueue: [], pushes: [], log: [], gone: [], deleted: [], rpcMissing: false, rpcFail: false, rpcLose: false, rpcExpired: false, rpcDenied: false, rpcDelay: 0, userErr: null, logoutFail: false, docsFail: false }); return send(res, 200, { ok: true }); }
  if (p === '/__rpc') { const body = await readBody(req); Object.assign(st, { rpcMissing: !!body.missing, rpcFail: !!body.fail, rpcLose: !!body.lose, rpcExpired: !!body.expired, rpcDenied: !!body.denied, rpcDelay: +body.delay || 0, userErr: body.userErr || null, logoutFail: !!body.logoutFail }); return send(res, 200, { ok: true }); }
  if (p === '/__docs') { const body = await readBody(req); st.docsFail = !!body.fail; return send(res, 200, { ok: true }); }   // {"fail":true}: every write to docs answers 500 (a genuine database failure, for the worker test)
  if (p === '/__deleted') { const body = await readBody(req); st.deleted = (body.ids || []).map(String); return send(res, 200, { ok: true }); }   // marks accounts as deleted without removing their rows, to test a deletion that happens in the middle of a run
  if (p === '/__tg') { const body = await readBody(req); st.tgQueue.push({ update_id: 1000 + st.tgQueue.length, message: { message_id: 1, chat: { id: body.chat || 777001 }, from: { username: body.user || 'tester' }, text: body.text } }); return send(res, 200, { ok: true }); }
  if (p === '/__rows') { const body = await readBody(req); for (const b of body) { const row = { ...b, updated_at: now() }; const i = st.rows.findIndex(r => r.user_id === row.user_id && r.kind === row.kind && r.id === row.id); if (i >= 0) st.rows[i] = row; else st.rows.push(row); } return send(res, 200, { ok: true }); }
  return send(res, 404, { message: 'no mock for ' + p });
}
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/rest/v1/rpc/delete_my_account') return deleteAccountRpc(req, res);
    if (url.pathname.startsWith('/rest/v1/docs')) return rest(req, res, url);
    if (url.pathname.startsWith('/auth/v1')) return auth(req, res, url);
    return external(req, res, url);
  } catch (e) { console.error(e); send(res, 500, { message: e.message }); }
}).listen(API_PORT, () => console.log('mock api on :' + API_PORT)).keepAliveTimeout = 120000;
// static site
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
// Unless MOCK_REAL_CONFIG=1, the site is pointed at this mock (never at your real Supabase project) and at the mock job feeds.
const TEST_CONFIG = () => 'window.APP_CONFIG = ' + JSON.stringify({
  SUPABASE_URL: API_ORIGIN, SUPABASE_ANON_KEY: ANON_KEY, VAPID_PUBLIC_KEY: process.env.MOCK_VAPID_PUBLIC_KEY || '', TELEGRAM_BOT_USERNAME: 'TestCareerBot', APP_NAME: 'AI Career Agent',
  FEED_API: { greenhouse: API_ORIGIN + '/mock/greenhouse', lever: API_ORIGIN + '/mock/lever', ashby: API_ORIGIN + '/mock/ashby', smartrecruiters: API_ORIGIN + '/mock/smartrecruiters', remotive: API_ORIGIN + '/mock/remotive', remoteok: API_ORIGIN + '/mock/remoteok' },
  BOARDS: [['greenhouse', 'acme', 'Acme Payments'], ['lever', 'cred', 'CRED'], ['ashby', 'orbit', 'Orbit'], ['smartrecruiters', 'Freshdesk', 'Freshdesk'], ['greenhouse', 'missing-board', 'Missing Board']],
}) + ';';
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/config.js' && process.env.MOCK_REAL_CONFIG !== '1') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); return res.end(TEST_CONFIG()); }
  let f = path.join(SITE, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
}).listen(SITE_PORT, () => console.log('site on :' + SITE_PORT));
// push endpoint (https, self-signed). Needs openssl once to make a throwaway certificate; skipped when it is unavailable.
const certDir = path.join(os.tmpdir(), 'aca-mockcert');
try {
  if (!fs.existsSync(path.join(certDir, 'key.pem'))) {
    fs.mkdirSync(certDir, { recursive: true });
    const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-subj', '/CN=localhost', '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
    if (r.status !== 0) throw new Error('openssl not available');
  }
  https.createServer({ key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }, async (req, res) => {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
      const id = req.url.split('/').pop(); st.pushes.push({ id, bytes: Buffer.concat(chunks).length, encoding: req.headers['content-encoding'], ttl: req.headers.ttl, auth: (req.headers.authorization || '').slice(0, 10) });
      if (id === 'gone') { res.writeHead(410); return res.end(); } res.writeHead(201); res.end();
    });
  }).listen(PUSH_PORT, () => console.log('push on :' + PUSH_PORT));
} catch (e) { console.log('push mock skipped: ' + e.message); }
