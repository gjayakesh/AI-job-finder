/* ============ Self-hosted site: auth, notifications, push, sync ============ */
Object.assign(SOURCE_NAME, { adzuna: 'Adzuna', remotive: 'Remotive', greenhouse: 'Greenhouse', lever: 'Lever' });
// Tests and local development point the job feeds at a mock; the live site uses the public APIs.
Object.assign(FEED_API, CONFIG.FEED_API || {});
if (Array.isArray(CONFIG.BOARDS)) BOARD_DIRECTORY.splice(0, BOARD_DIRECTORY.length, ...CONFIG.BOARDS);

/* ---------- Auth screens ---------- */
const AUTH_TITLES = { signin: 'Sign in', signup: 'Create your account', magic: 'Email me a sign-in link', reset: 'Reset your password', newpass: 'Choose a new password' };
V.auth = () => {
  const a = S.ui.auth; const m = a.mode;
  const field = (n, l, t, ac) => t === 'password'
    ? `<label class="f"><span id="lbl-${n}">${l}</span><span class="pw"><input type="password" name="${n}" id="auth-${n}" aria-labelledby="lbl-${n}" autocomplete="${ac}"><button type="button" class="pw-toggle" aria-label="Show password" title="Show password">Show</button></span></label>`
    : `<label class="f"><span>${l}</span><input type="${t}" name="${n}" id="auth-${n}" autocomplete="${ac}" ${n === 'email' ? `value="${esc(a.email || '')}"` : ''}></label>`;
  const story = [
    ['Upload your resume', 'A PDF or Word file. We read it for you, so there is nothing to type.'],
    ['We find jobs for you', `We pick the job titles that fit you and search ${BOARD_DIRECTORY.length} company career pages and remote job feeds. Only jobs that are open right now are kept.`],
    ['See how well you fit', 'Every job gets a score out of 100 with simple reasons: skills, experience, city and pay.'],
    ['Improve and apply', 'We show what to fix in your resume and tailor it for each job. Nothing is sent to an employer until you say yes.'],
  ];
  return `<div class="landing"><header class="landing-top"><div class="brand" style="padding:0"><div class="brand-mark">AC</div><div><b>${esc(CONFIG.APP_NAME)}</b><small>Job search, under your control</small></div></div>${themeSeg()}</header>
  <div class="landing-grid">
  <section class="landing-story"><h1>Upload your resume. We find jobs that fit it.</h1>
  <p class="lede">Free and private. It takes about a minute. We find open jobs, show how well each one fits you, and tell you how to improve your resume. Nothing is sent to an employer without your approval.</p>
  <ol class="pipe" id="pipe">${story.map(([t, d], i) => `<li class="pipe-step"><span class="pipe-n" aria-hidden="true">${i + 1}</span><div><h2>${t}</h2><p>${d}</p></div></li>`).join('')}</ol></section>
  <aside class="auth-card" aria-label="Your account">${['signin', 'signup'].includes(m) ? `<div class="auth-switch" role="group" aria-label="Sign in or create an account"><a href="#" data-act="auth-mode" data-mode="signin" class="${m === 'signin' ? 'on' : ''}" ${m === 'signin' ? 'aria-current="true"' : ''}>I have an account</a><a href="#" data-act="auth-mode" data-mode="signup" class="${m === 'signup' ? 'on' : ''}" ${m === 'signup' ? 'aria-current="true"' : ''}>I’m new here</a></div>` : ''}<h2 class="auth-title">${AUTH_TITLES[m]}</h2>
  ${a.err ? `<div class="banner bad" role="alert"><span>${esc(a.err)}</span></div>` : ''}${a.msg ? `<div class="banner info" role="status"><span>${esc(a.msg)}</span></div>` : ''}
  <form novalidate class="stack" data-form="auth" data-mode="${m}">
    ${m !== 'newpass' ? field('email', 'Email', 'email', 'email') : ''}
    ${['signin', 'signup', 'newpass'].includes(m) ? field('password', m === 'signin' ? 'Password' : 'Password (8+ characters)', 'password', m === 'signin' ? 'current-password' : 'new-password') : ''}
    <button class="btn primary" type="submit" style="justify-content:center">${{ signin: 'Sign in', signup: 'Create account', magic: 'Send link', reset: 'Send reset link', newpass: 'Save password' }[m]}</button>
  </form>
  <div class="stack small">${m === 'signin' ? `<a href="#" data-act="auth-mode" data-mode="magic">Sign in with an email link instead</a><a href="#" data-act="auth-mode" data-mode="reset">Forgot password?</a>` : m === 'signup' ? '<span class="muted">Use any email and a password of 8 or more characters. We email you one link to confirm your address, then you can sign in.</span>' : `<a href="#" data-act="auth-mode" data-mode="signin">Back to sign in</a>`}</div>
  <p class="tiny muted">You stay signed in on this device until you sign out, or until it goes ${IDLE_DAYS} days without being used. Your data is private: only your account can read it.</p></aside>
  </div></div>`;
};
function authErr(e) {
  const m = String((e && e.message) || e || '');
  if (/invalid login/i.test(m)) return 'Email or password is wrong.';
  if (/not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you, then sign in.';
  if (/already registered|already exists/i.test(m)) return 'An account with this email already exists. Sign in instead.';
  if (/rate limit|security purposes/i.test(m)) return 'Too many emails sent. Wait a minute and try again.';
  if (/signups not allowed|signup is disabled/i.test(m)) return 'New sign-ups are turned off for this site.';
  if (/fetch|network/i.test(m)) return 'Can’t reach the server. Check your connection, or the Supabase project may be paused (restore it in the Supabase dashboard).';
  return m || 'Something went wrong.';
}
function goAuth(mode = 'signin') { S.mode = 'auth'; S.ui.auth = { mode, msg: '', err: '', email: (S.ui.auth && S.ui.auth.email) || '' }; render(); }
FORM.auth = async f => {
  const m = f.dataset.mode; const email = String((f.email && f.email.value) || '').trim(); const pw = String((f.password && f.password.value) || '');
  S.ui.auth.email = email; S.ui.auth.err = ''; S.ui.auth.msg = '';
  const need = (c, msg) => { if (!c) { S.ui.auth.err = msg; render(); throw { code: 'cancelled' }; } };
  if (m !== 'newpass') need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'Enter a valid email address.');
  if (['signup', 'newpass'].includes(m)) need(pw.length >= 8, 'Use at least 8 characters for the password.');
  if (m === 'signin') need(pw, 'Enter your password.');
  let r;
  if (m === 'signin') r = await CAP.sb.auth.signInWithPassword({ email, password: pw });
  if (m === 'signup') r = await CAP.sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: SITE_URL } });
  if (m === 'magic') r = await CAP.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: SITE_URL, shouldCreateUser: false } });
  if (m === 'reset') r = await CAP.sb.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
  if (m === 'newpass') r = await CAP.sb.auth.updateUser({ password: pw });
  if (r.error) { S.ui.auth.err = authErr(r.error); return render(); }
  if (m === 'signup') lsSet(SEEN_KEY, '1');
  if (m === 'signup' && !(r.data && r.data.session)) { S.ui.auth = { mode: 'signin', email, err: '', msg: 'Check your inbox and open the confirmation link, then sign in here.' }; return render(); }
  if (m === 'magic') { S.ui.auth.msg = 'Check your inbox for the sign-in link.'; return render(); }
  if (m === 'reset') { S.ui.auth.msg = 'If that email has an account, a reset link is on its way.'; return render(); }
  const { data } = await CAP.sb.auth.getSession();
  if (data.session) { if (m === 'newpass') toast('Password updated.'); await afterLogin(data.session); }
};
FORM['change-password'] = async f => { const pw = f.pw.value; if (pw.length < 8) return toast('Use at least 8 characters.', 'bad'); const { error } = await CAP.sb.auth.updateUser({ password: pw }); if (error) return toast(authErr(error), 'bad'); f.reset(); toast('Password changed.'); };
ACT['auth-mode'] = (el, e) => { e.preventDefault(); S.ui.auth = { mode: el.dataset.mode, msg: '', err: '', email: S.ui.auth.email }; render(); };
ACT['goto-auth'] = () => goAuth();
ACT.signout = async () => {
  if (Store.pending()) { toast('Saving your last changes…'); for (let i = 0; i < 20 && Store.pending(); i++) await sleep(200); }
  await CAP.sb.auth.signOut(); Idle.reset(); S.session = null; S.uid = null; Store.apply({}); Store.lastSync = null; S.realMode = 'signedout'; goAuth();
};

/* ---------- Delete account ----------
   The database function public.delete_my_account() (supabase/schema.sql) removes the login and, by cascade, every row the
   account owns. Saving is switched off while it runs so no late write fails. Only a reply that proves the function never ran
   (function missing, sign-in expired) is reported as "nothing was deleted"; after a lost reply the auth server is asked. */
const DELETE_WORD = 'DELETE';
/** This app's own sign-in keys in localStorage. Other apps on the same site address may keep theirs there too: leave those alone. */
function ownTokenKeys() { try { const ref = new URL(CONFIG.SUPABASE_URL).hostname.split('.')[0]; return lsKeys().filter(k => k === `sb-${ref}-auth-token` || k === `sb-${ref}-auth-token-code-verifier`); } catch (e) { return []; } }
const rejectedBeforeRunning = (e, status) => ['PGRST202', 'PGRST301', 'PGRST303', '42501', '28000'].includes(e && e.code) || status === 401 || status === 404 || /could not find the function|JWT expired|schema cache/i.test(String((e && e.message) || ''));
function deleteAccountError(e, status, stillThere) {
  const m = String((e && (e.message || e.code)) || e || ''), c = e && e.code;
  if (c === 'PGRST202' || status === 404 || /could not find the function|schema cache/i.test(m)) return 'Deleting accounts is not switched on in this site’s database yet, so nothing was deleted. Whoever runs the site needs to run the latest supabase/schema.sql once (README, step 2).';
  if (c === 'PGRST301' || c === 'PGRST303' || status === 401 || /JWT|expired|invalid token/i.test(m)) return 'Your sign-in has expired, so nothing was deleted. Sign out, sign in again, then try once more.';
  if (c === '42501') return 'This account is not allowed to delete itself, so nothing was deleted. Whoever runs the site should run the latest supabase/schema.sql.';
  if (stillThere === true && !(e && e.code === 'timeout')) return 'The server did not answer properly, but your account is still there, so nothing was deleted. Try again in a moment.';
  return 'We could not confirm the result. If you can no longer sign in, the account was deleted. It is safe to try again.';
}
/** After a reply we could not use: does the auth server still know this sign-in? true = yes, false = it says the account does not exist, null = could not tell (every other kind of refusal included). */
async function accountStillExists() {
  try {
    const { data, error } = await withTimeout(CAP.sb.auth.getUser(), 12000);
    if (data && data.user) return true;
    if (error && (error.code === 'user_not_found' || /does not exist/i.test(String(error.message || '')))) return false;
  } catch (e) { }
  return null;
}
/** Forget the account on this device and show the sign-up page with a message. Every step runs even if another fails or hangs; nothing here throws. */
async function forgetAccount(message) {
  S.mode = 'auth';   // first, so the sign-out event below does not redraw the page without our message
  Store.frozen = true;
  if ($('#modal-root').innerHTML) closeModal(false);   // a dialog left open would sit on top of the page below
  const step = async f => { try { await f(); } catch (e) { console.warn('clean-up step failed', e); } };
  await step(() => withTimeout((async () => { const sub = await Push.current(); if (sub) await sub.unsubscribe(); })(), 5000));
  await step(() => { Idle.reset(); return endLocalSession(); });
  await step(() => { [...ownTokenKeys(), ...lsKeys().filter(k => k.startsWith('aca:') && k !== 'aca:theme')].forEach(lsDel); });   // keeps only the light/dark choice
  S.session = null; S.uid = null; S.realMode = 'signedout'; Store.apply({}); Store.lastSync = null; Store.w = {}; Store.frozen = false;
  S.ui = { tab: {}, filter: { minScore: 0, status: 'open', q: '', sort: 'score' }, notifOpen: false, draft: null, prefDraft: null, auth: { mode: 'signup', msg: message, err: '', email: '' } };
  history.replaceState(null, '', location.pathname + location.search);
  render();
}
async function deleteAccount() {
  if (S.mode !== 'cloud' || !CAP.sb) throw new Error('You are not signed in.');
  for (let i = 0; i < 25 && Store.pending(); i++) await sleep(200);   // let the last saves finish first
  // The sign-in is shared by every tab of this browser: right before the call, make sure it still belongs to the account the dialog named.
  const cur = await CAP.sb.auth.getSession();
  if (cur.error) throw new Error('Could not check your sign-in. Check your connection and try again.');
  if (!cur.data.session) throw new Error('You are signed out in another tab. Reload this page and sign in again.');
  if (cur.data.session.user.id !== S.uid) throw new Error('You are signed in as a different account now. Reload the page, then try again.');
  Store.frozen = true;   // changes made from here on are kept and sent by thaw() if the deletion fails
  let r; try { r = await withTimeout(CAP.sb.rpc('delete_my_account'), 25000); } catch (e) { r = { error: e }; }
  if (S.mode !== 'cloud') return;   // a refused save already signed this account out while we waited: that page is showing
  if (r.error) {
    // Only some replies prove the function never ran. After a lost reply or a server error, ask the auth server whether the account is still there.
    const stillThere = rejectedBeforeRunning(r.error, r.status) ? true : await accountStillExists();
    if (S.mode !== 'cloud') return;
    if (stillThere !== false) { Store.thaw(); throw new Error(deleteAccountError(r.error, r.status, stillThere)); }
  }
  await forgetAccount('Your account and everything saved in it have been deleted.');
}
/** The database refused a save because this account no longer exists (it was deleted, probably on another device). */
let _gone = false;
async function accountGone() {
  if (_gone || S.mode !== 'cloud') return; _gone = true;
  try { await forgetAccount('This account was deleted, so you have been signed out here too.'); } finally { _gone = false; }
}
ACT['delete-account'] = () => {
  if (S.mode !== 'cloud') return;
  const n = o => Object.keys(o || {}).length, many = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  openModal(`<form novalidate class="stack" data-form="delete-account" style="gap:14px"><h2>Delete your account?</h2>
    <p>This permanently deletes <b>${esc((S.session && S.session.user.email) || 'your account')}</b> and everything saved in it:</p>
    <ul class="plain small"><li>Your resume, profile and job choices</li><li>${many(n(S.jobs), 'job')} and ${many(n(S.versions), 'tailored resume')}</li><li>Your alert settings, connected devices and activity history</li></ul>
    <p class="small"><b>This cannot be undone.</b> You will be signed out on every device. If you might want your data later, download a copy first.</p>
    <div class="row"><button class="btn sm" type="button" data-act="export">${icon('dl')}Download my data</button></div>
    <p class="tiny muted">Backups and system logs may keep a copy for a short time, and messages already sent to your email or Telegram stay where they are.</p>
    <label class="f"><span>To confirm, type <b>${DELETE_WORD}</b></span><input type="text" name="confirm" id="del-confirm" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="del-err"></label>
    <div class="banner bad" role="alert" id="del-err" hidden></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">Keep my account</button><button class="btn danger solid" type="submit" id="del-go" disabled>Delete my account</button></div></form>`);
};
FORM['delete-account'] = async f => {
  const ok = () => String(f.confirm.value || '').trim().toUpperCase() === DELETE_WORD, sync = () => { const g = $('#del-go'); if (g) g.disabled = !ok(); };
  if (!ok()) return sync();
  const err = $('#del-err'); err.hidden = true;
  f.inert = true;   // nothing in the dialog can be used, or dismissed, while the deletion runs
  try { await Busy.local('Deleting your account…', deleteAccount); }
  catch (e) {
    f.inert = false; const msg = (e && e.message) || 'The account could not be deleted. Try again.';
    if (err.isConnected) { err.textContent = msg; err.hidden = false; } else toast(msg, 'bad');   // the dialog is gone: still say what happened
    return sync();
  }
  closeModal();
};
document.addEventListener('input', e => { if (e.target.id === 'del-confirm') { const g = $('#del-go'); if (g) g.disabled = e.target.value.trim().toUpperCase() !== DELETE_WORD; } });
document.addEventListener('click', e => {   // show / hide the password while typing it
  const b = e.target.closest && e.target.closest('.pw-toggle'); const i = b && b.parentElement.querySelector('input'); if (!i) return;
  const show = i.type === 'password', label = show ? 'Hide password' : 'Show password'; i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.title = label; b.setAttribute('aria-label', label);
});

/* ---------- Staying signed in ----------
   Supabase keeps the session in this browser and refreshes it automatically, so a sign-in survives
   reloads, closed tabs and restarts. It ends only when you sign out, or after 30 days with no activity
   on this device. Opening the site, clicking, typing and scrolling all count as activity. */
const IDLE_DAYS = 30, IDLE_MS = IDLE_DAYS * 24 * 3600e3, IDLE_KEY = 'aca:lastActive';
const SEEN_KEY = 'aca:seen';   // set once someone has signed in or signed up on this browser; until then the sign-in page opens on "Create your account"
const IDLE_MSG = `You were signed out because this device had no activity for ${IDLE_DAYS} days. Sign in again to continue.`;
const storedSession = () => lsKeys().some(k => /^sb-.+-auth-token$/.test(k));
const Idle = {
  _w: 0, // when this tab last wrote the timestamp, so ordinary clicks don't touch storage every time
  last() { const v = Number(lsGet(IDLE_KEY)); return v > 0 ? v : 0; },
  expired() { const l = this.last(); return l > 0 && Date.now() - l > IDLE_MS; },
  // fresh = a sign-in just happened, so record it without the expiry check
  touch(fresh = false) {
    if (!S.session) return;
    const now = Date.now();
    if (!fresh) { if (now - this._w < 60e3) return; if (this.expired()) return idleSignOut(); }
    this._w = now; lsSet(IDLE_KEY, String(now));
  },
  check() { if (S.session && this.expired()) idleSignOut(); },
  reset() { this._w = 0; lsDel(IDLE_KEY); },
};
// Ends this device's session only; other signed-in devices keep theirs.
async function endLocalSession() {
  try { const r = await withTimeout(CAP.sb.auth.signOut({ scope: 'local' }), 10000); if (r && r.error) throw r.error; }
  catch (e) { console.warn('local sign-out', e); ownTokenKeys().forEach(lsDel); }
}
let _idleOut = false;
async function idleSignOut() {
  if (_idleOut || !CAP.sb) return; _idleOut = true;
  try {
    Idle.reset();
    S.session = null; S.uid = null; Store.apply({}); Store.lastSync = null; S.realMode = 'signedout';
    S.mode = 'auth'; S.ui.auth = { mode: 'signin', msg: IDLE_MSG, err: '', email: '' }; render();
    await endLocalSession();
  } finally { _idleOut = false; }
}

let _entering = false;
async function afterLogin(session) {
  if (_entering) return; _entering = true;
  try {
    S.session = session; S.uid = session.user.id; S.realMode = 'cloud'; S.mode = 'loading'; Idle.touch(true); lsSet(SEEN_KEY, '1'); render();
    await loadAndEnter();
  } finally { _entering = false; }
}
async function loadAndEnter() {
  let target = {};
  try { target = await Store.load(); }
  catch (e) {
    console.warn('load failed', e);
    S.loadError = 'Your saved data could not be loaded (' + authErr(e) + ')'; S.mode = 'error'; return render();
  }
  S.loadError = ''; S.loadNote = '';
  Store.apply(target);
  if (S.settings.theme) { lsSet('aca:theme', S.settings.theme); Theme.apply(S.settings.theme); } else { const lt = lsGet('aca:theme'); if (lt) S.settings.theme = lt; }
  S.mode = S.realMode;
  if (S.mode === 'cloud' && !S.notify) { S.notify = DEFAULT_NOTIFY(); S.notify.email = (S.session && S.session.user.email) || ''; save.notify(); }
  const purged = purgeSampleData();
  pruneDeadPush();
  for (const j of Object.values(S.jobs)) {
    if (j.stage === 'Approved') await invalidateIfChanged(j, 'the approval expired');
    if (S.mode === 'local') ((j.app && j.app.interviews) || []).forEach(iv => { const h = (new Date(iv.at) - Date.now()) / 3600e3; if (h > 0 && h < 72 && !iv.notified) { iv.notified = true; notify('interview', `${j.company}: ${iv.type || 'interview'} on ${fmtDT(iv.at)}`, j.id); save.job(j); } });
  }
  render();
  if (purged) toast(`Removed ${purged} sample record${purged === 1 ? '' : 's'} left over from the earlier version.`);
}
ACT['retry-load'] = async () => { S.mode = 'loading'; render(); await loadAndEnter(); };

/* ---------- Browser push ---------- */
function pruneDeadPush() { const dead = ((S.server && S.server.links) || {}).deadPush || []; if (S.mode !== 'cloud' || !S.notify || !dead.length) return; const before = (S.notify.pushSubs || []).length; S.notify.pushSubs = (S.notify.pushSubs || []).filter(p => !dead.includes(p.endpoint)); if (S.notify.pushSubs.length !== before) save.notify(); }
const b64uToBytes = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
function deviceLabel() { const u = navigator.userAgent; const os = /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iPhone/iPad' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'Device'; const br = /Edg\//.test(u) ? 'Edge' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Browser'; return `${br} on ${os}`; }
const Push = {
  supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol !== 'file:'; },
  async current() { try { if (!this.supported()) return null; const r = await navigator.serviceWorker.getRegistration(); return r ? await r.pushManager.getSubscription() : null; } catch (e) { return null; } },
  async enable() {
    if (!CONFIG.VAPID_PUBLIC_KEY) throw new Error('Browser alerts are not set up on this site yet. (Site owner: add VAPID_PUBLIC_KEY to config.js, README step 6.)');
    if (!this.supported()) throw new Error(/iPhone|iPad/.test(navigator.userAgent) ? 'On iPhone, add this site to your Home Screen (Share → Add to Home Screen) and open it from there to enable notifications.' : 'This browser does not support push notifications.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.');
    const reg = await withTimeout(navigator.serviceWorker.ready, 10000);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(CONFIG.VAPID_PUBLIC_KEY) });
    const j = sub.toJSON();
    S.notify.pushSubs = (S.notify.pushSubs || []).filter(x => x.endpoint !== j.endpoint).concat([{ endpoint: j.endpoint, keys: j.keys, label: deviceLabel(), at: nowISO() }]);
    S.notify.pushOn = true; save.notify();
    try { reg.showNotification(CONFIG.APP_NAME, { body: 'Notifications are on for this device.', icon: 'icons/icon-192.png', badge: 'icons/badge-72.png', tag: 'aca-enabled' }); } catch (e) { }
  },
  async disable() { const sub = await this.current(); if (sub) { S.notify.pushSubs = (S.notify.pushSubs || []).filter(x => x.endpoint !== sub.endpoint); try { await sub.unsubscribe(); } catch (e) { } save.notify(); } },
};
function registerSW() { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker', e)); }

/* ---------- Notifications page ---------- */
const relTime = iso => { if (!iso) return 'never'; const m = Math.round((Date.now() - new Date(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 48) return h + ' h ago'; return Math.round(h / 24) + ' days ago'; };
const statusPill = v => { const s = String(v || 'unknown'); return `<span class="pill ${/^(ok|configured|active)/.test(s) ? 'good' : /^(missing|not configured|off|disabled)/.test(s) ? '' : /^error/.test(s) ? 'bad' : 'warn'}">${esc(s.length > 40 ? s.slice(0, 40) + '…' : s)}</span>`; };
function feedQueries() { const p = S.prefs || {}; const titles = (p.titles || []).filter(t => !/^junior /i.test(t)).slice(0, 2); const cities = (p.locations || []).filter(l => l !== 'Remote').slice(0, 2); const out = []; titles.forEach(t => (cities.length ? cities : ['India']).forEach(c => out.push(`${t} · ${c}`))); return out.slice(0, 3); }
V.alerts = () => {
  if (CLOUD && S.mode !== 'cloud') return `<div class="card">${emptyState('Sign in to set up notifications', 'Alerts are sent by your scheduled server job to the account you sign in with.', CLOUD ? '<button class="btn primary" type="button" data-act="goto-auth">Sign in</button>' : '')}</div>`;
  if (!CLOUD) return `<div class="card">${emptyState('Connect the cloud database first', 'Email, Telegram and push alerts need the Supabase database and the scheduled GitHub job. Follow the README to add your keys to <code>config.js</code>.')}</div>`;
  const n = S.notify || DEFAULT_NOTIFY(); const st = (S.server && S.server.status) || null; const links = (S.server && S.server.links) || {};
  const tgChat = n.telegramChatId || links.telegramChatId; const stale = st && st.lastRunAt && (Date.now() - new Date(st.lastRunAt)) > 3 * 3600e3;
  const alerts = Object.values(S.alerts || {}).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 15);
  const ev = [['newJobs', 'New jobs that match your profile', 'From the job feeds, at or above your minimum score'], ['interviews', 'Interview reminders', '24 hours and 2 hours before'], ['deadlines', 'Deadlines', 'Application deadlines and offer response dates within 2 days'], ['approvals', 'Applications waiting for approval', 'After 24 hours, and before an approval expires'], ['followups', 'Follow-up nudges', 'When an application has had no update for 10 days'], ['digest', 'Daily digest', 'One summary a day at the hour below'], ['weekly', 'Weekly report', 'Mondays, with conversion rates and skill gaps']];
  return `<div class="card"><div class="card-h"><h2>Alerts status</h2>${st ? (stale ? '<span class="pill bad">Not running</span>' : '<span class="pill good">Running</span>') : '<span class="pill warn">Waiting for first run</span>'}<span class="sp"></span><span class="small muted">Last run: <b>${esc(st ? relTime(st.lastRunAt) : 'never')}</b>${st && st.lastDiscoveryAt ? ` · last job search ${esc(relTime(st.lastDiscoveryAt))}` : ''}</span></div>
  ${st ? `<details class="more"><summary class="small">Technical details</summary><div class="grid g2" style="margin-top:10px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Channel</th><th>Server</th></tr></thead><tbody>${['email', 'telegram', 'push'].map(c => `<tr><td>${{ email: 'Email (Resend)', telegram: 'Telegram bot', push: 'Browser push' }[c]}</td><td>${statusPill((st.channels || {})[c])}</td></tr>`).join('')}</tbody></table></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Job feed</th><th>Status</th><th class="r">New last run</th></tr></thead><tbody>${['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'remotive', 'remoteok', 'adzuna'].map(c => `<tr><td>${SOURCE_NAME[c]}</td><td>${statusPill((st.sources || {})[c])}</td><td class="r num">${((st.discovered || {})[c]) ?? '—'}</td></tr>`).join('')}</tbody></table></div></div></details>
  ${(st.errors || []).length ? `<div class="stripe bad small"><b>Recent server errors</b>${st.errors.slice(0, 3).map(e => `<div>${esc(fmtDT(e.t))}: ${esc(e.msg)}</div>`).join('')}</div>` : ''}` : `<p class="small">Alerts have not started yet. A background job checks for new jobs every 30 minutes and sends the alerts. If you run this site yourself, finish step 7 of the README (GitHub → Actions → “Career agent” → Run workflow) and this page updates within a minute. Otherwise, ask whoever runs the site.</p>`}
  ${stale ? '<p class="small" style="color:var(--bad)">GitHub turns off scheduled jobs after 60 days without repository activity, and can delay runs when busy. Open Actions and click “Enable workflow” if you see a warning there.</p>' : ''}</div>
  <form novalidate class="stack" style="gap:16px" data-form="notify" id="notify-form">
  <div class="card"><div class="card-h"><h2>Where to send alerts</h2><span class="sp"></span><button class="btn sm primary" type="submit">Save</button></div>
  <p class="small muted">Choose how you want to hear about new jobs and reminders. Tick at least one, then press Save.</p>
  <div class="repeat"><label class="check"><input type="checkbox" name="emailOn" ${n.emailOn ? 'checked' : ''}><b>Email</b></label><label class="f"><span>Send to</span><input type="email" name="email" id="nt-email" value="${esc(n.email)}" placeholder="you@example.com"></label><p class="tiny muted">On Resend’s free plan, mail is delivered only to the address you signed up to Resend with, so use that address here.</p></div>
  <div class="repeat"><label class="check"><input type="checkbox" name="telegramOn" ${n.telegramOn ? 'checked' : ''}><b>Telegram</b></label>
  <div class="row">${tgChat ? `<span class="pill good">Connected</span><span class="small muted">chat ${esc(String(tgChat))}${links.telegramUser ? ' · @' + esc(links.telegramUser) : ''}</span>` : '<span class="pill">Not connected</span>'}${CONFIG.TELEGRAM_BOT_USERNAME ? `<button class="btn sm" type="button" data-act="tg-connect">${tgChat ? 'Reconnect' : 'Connect Telegram'}</button>` : '<span class="tiny muted">Telegram is not set up on this site yet. (Site owner: add TELEGRAM_BOT_USERNAME to config.js.)</span>'}</div>
  ${n.telegramCode && !tgChat && CONFIG.TELEGRAM_BOT_USERNAME ? `<p class="small">Open <a href="https://t.me/${esc(CONFIG.TELEGRAM_BOT_USERNAME)}?start=${esc(n.telegramCode)}" target="_blank" rel="noopener noreferrer">t.me/${esc(CONFIG.TELEGRAM_BOT_USERNAME)}</a> and tap <b>Start</b>. The next server run links your chat and sends a confirmation.</p>` : ''}
  <label class="f"><span>Or enter your chat ID manually</span><input type="text" inputmode="numeric" name="telegramChatId" id="nt-tg" value="${esc(n.telegramChatId)}" placeholder="e.g. 123456789"></label></div>
  <div class="repeat"><label class="check"><input type="checkbox" name="pushOn" ${n.pushOn ? 'checked' : ''}><b>Browser push</b> <span class="small muted">(urgent alerts only)</span></label>
  <div class="row" id="push-row"><span class="small muted" id="push-state">Checking this device…</span><span class="sp"></span><button class="btn sm" type="button" data-act="push-enable">Enable on this device</button><button class="btn sm" type="button" data-act="push-disable">Disable on this device</button></div>
  ${(n.pushSubs || []).length ? `<ul class="list small">${n.pushSubs.map((p, i) => `<li><span class="pill acc nodot">${i + 1}</span><span>${esc(p.label || 'Device')} · added ${esc(fmtDate(p.at))}</span><span class="sp"></span><button class="btn sm ghost danger" type="button" data-act="push-remove" data-i="${i}">Remove</button></li>`).join('')}</ul>` : '<p class="tiny muted">No devices yet.</p>'}
  <p class="tiny muted">On iPhone, first add this site to your Home Screen and open it from there.</p></div></div>
  <div class="card"><h2>What to alert me about</h2><div class="stack">${ev.map(([k, l, d]) => `<label class="check" style="align-items:flex-start"><input type="checkbox" name="ev_${k}" ${n.events[k] ? 'checked' : ''}><span><b>${l}</b><br><span class="tiny muted">${d}</span></span></label>`).join('')}</div>
  <div class="fgrid"><label class="f"><span>Only alert me about new jobs scoring at least (0–100)</span><input type="number" min="0" max="100" name="minScore" id="nt-min" value="${n.minScore}"></label><label class="f"><span>Daily digest time</span><select name="digestHour" id="nt-hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${n.digestHour === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></label><label class="f"><span>Time zone</span><input type="text" name="tz" id="nt-tz" value="${esc(n.tz)}"></label></div></div>
  <div class="card"><div class="card-h"><h2>Scheduled job search</h2><p>The alert server repeats your job search every 6 hours using the choices under <a href="#preferences">What job I want</a>, adds new matches to your jobs list and flags roles that have closed.</p></div>
  <div class="stack"><label class="check"><input type="checkbox" name="feed_ats" ${n.feeds.ats ? 'checked' : ''}><span><b>Company career pages</b> <span class="small muted">the ${boardsFor(n).length} companies on your <a href="#discover">Add more jobs</a> list</span></span></label>
  <label class="check"><input type="checkbox" name="feed_remotive" ${n.feeds.remotive ? 'checked' : ''}><span><b>Remotive</b> <span class="small muted">remote roles open to India, checked daily</span></span></label>
  <label class="check"><input type="checkbox" name="feed_remoteok" ${n.feeds.remoteok ? 'checked' : ''}><span><b>Remote OK</b> <span class="small muted">remote roles open to India or worldwide, checked daily</span></span></label>
  <label class="check"><input type="checkbox" name="feed_adzuna" ${n.feeds.adzuna ? 'checked' : ''}><span><b>Adzuna</b> <span class="small muted">India-wide search (needs a free Adzuna key in GitHub secrets)</span></span></label></div>
  <p class="small">Adzuna searches run for: ${feedQueries().length ? feedQueries().map(q => `<span class="chip">${esc(q)}</span>`).join(' ') : '<span class="muted">choose job titles and cities under What job I want first</span>'}</p>
  <div class="row"><span class="sp"></span><button class="btn primary" type="submit">Save notification settings</button></div></div></form>
  <div class="grid g2"><div class="card"><h2>Test your setup</h2><p class="small">Sends a test message to every channel that is switched on. It goes out on the next server run (every 30 minutes), or right away if you run the workflow manually in GitHub → Actions.</p><div class="row"><button class="btn" type="button" data-act="notify-test">Send a test alert</button>${n.testAt ? `<span class="small muted">Requested ${esc(relTime(n.testAt))}${st && st.lastTestAt && st.lastTestAt >= n.testAt ? ' · <b>sent</b>' : ' · waiting for server'}</span>` : ''}</div></div>
  <div class="card"><div class="card-h"><h2>Recent alerts</h2><span class="sp"></span><button class="btn sm" type="button" data-act="sync-now">Check for updates</button></div>${alerts.length ? `<ul class="list small">${alerts.map(a => `<li><span class="tiny muted num" style="min-width:84px">${fmtDT(a.t)}</span><span><b>${esc(a.title)}</b>${a.body ? ' — ' + esc(a.body) : ''}${a.jobId && S.jobs[a.jobId] ? ` · <a href="#job-${a.jobId}">Open</a>` : ''}<br><span class="tiny muted">${esc((a.channels || []).join(', ') || 'in-app only')}</span></span></li>`).join('')}</ul>` : '<p class="muted small">No alerts yet.</p>'}</div></div>`;
};
async function refreshPushState() {
  const el = $('#push-state'); if (!el) return;
  if (!Push.supported()) { el.textContent = /iPhone|iPad/.test(navigator.userAgent) ? 'Add this site to your Home Screen to enable push on iPhone.' : 'Push isn’t supported in this browser.'; return; }
  const sub = await Push.current(); const perm = Notification.permission;
  el.textContent = sub && (S.notify.pushSubs || []).some(p => p.endpoint === sub.endpoint) ? `This device (${deviceLabel()}) receives push alerts.` : perm === 'denied' ? 'Notifications are blocked for this site in this browser.' : `This device (${deviceLabel()}) is not subscribed.`;
}
FORM.notify = f => {
  const fd = new FormData(f); const g = k => String(fd.get(k) ?? '').trim(); const n = S.notify || DEFAULT_NOTIFY();
  n.emailOn = fd.get('emailOn') === 'on'; n.email = g('email'); n.telegramOn = fd.get('telegramOn') === 'on'; n.telegramChatId = g('telegramChatId').replace(/[^\d-]/g, ''); n.pushOn = fd.get('pushOn') === 'on';
  Object.keys(n.events).forEach(k => n.events[k] = fd.get('ev_' + k) === 'on');
  n.minScore = clamp(+g('minScore') || 70); n.digestHour = clamp(+g('digestHour') || 0, 0, 23); n.tz = g('tz') || 'Asia/Kolkata';
  try { new Intl.DateTimeFormat('en', { timeZone: n.tz }); } catch (e) { return toast('Unknown time zone. Use a name like Asia/Kolkata.', 'bad'); }
  n.feeds = { adzuna: fd.get('feed_adzuna') === 'on', remotive: fd.get('feed_remotive') === 'on', remoteok: fd.get('feed_remoteok') === 'on', ats: fd.get('feed_ats') === 'on' };
  if (n.emailOn && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.email)) return toast('Enter a valid email address for email alerts.', 'bad');
  S.notify = n; save.notify(); logAgent('Notification Agent', 'Updated notification settings', `email ${n.emailOn ? 'on' : 'off'}, telegram ${n.telegramOn ? 'on' : 'off'}, push ${n.pushOn ? 'on' : 'off'}`); toast('Notification settings saved.'); render();
};
ACT['tg-connect'] = () => { const n = S.notify; n.telegramCode = Math.random().toString(36).slice(2, 10); n.telegramOn = true; save.notify(); render(); window.open(`https://t.me/${CONFIG.TELEGRAM_BOT_USERNAME}?start=${n.telegramCode}`, '_blank', 'noopener'); };
ACT['push-enable'] = async () => { try { await Push.enable(); toast('Push notifications are on for this device.'); } catch (e) { toast(e.message || String(e), 'bad'); } render(); };
ACT['push-disable'] = async () => { await Push.disable(); toast('Push turned off for this device.'); render(); };
ACT['push-remove'] = el => { S.notify.pushSubs.splice(+el.dataset.i, 1); save.notify(); render(); };
ACT['notify-test'] = () => { S.notify.testAt = nowISO(); save.notify(); toast('Test requested. It arrives on the next server run.'); render(); };
ACT['sync-now'] = async () => { const n = await Store.sync(); toast(n ? `Updated ${n} item${n > 1 ? 's' : ''}.` : 'Everything is up to date.'); render(); };

/* ---------- Render hooks ---------- */
const _render = render;
render = function () {
  if (S.mode === 'auth') { const fresh = _lastView !== 'auth'; $('#app').innerHTML = V.auth(); _lastView = 'auth'; Motion.after(fresh); return; }
  _render();
  if (route().view === 'alerts') refreshPushState();
};
