/* ============ Boot ============ */
window.addEventListener('hashchange', () => {
  const r = route();
  if (r.view === 'job' && S.jobs[r.id] && S.jobs[r.id].fresh) { S.jobs[r.id].fresh = false; save.job(S.jobs[r.id]); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Idle.touch(); Store.sync(); } });
setInterval(() => { if (document.visibilityState === 'visible') Store.sync(); }, 120000);
// Activity that keeps you signed in (see Idle in 05-site.js); an hourly check covers tabs left open and untouched.
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => window.addEventListener(t, () => Idle.touch(), { capture: true, passive: true }));
setInterval(() => Idle.check(), 3600e3);
window.addEventListener('beforeunload', e => { if (Store.pending()) { e.preventDefault(); e.returnValue = ''; } });

async function boot() {
  render();
  registerSW();
  const qs = new URLSearchParams(location.search); const hs = new URLSearchParams(location.hash.replace(/^#/, ''));
  const urlErr = qs.get('error_description') || hs.get('error_description');
  // Decided before the client starts, so its own start-up token refresh can't count as activity.
  const idleOut = CLOUD && storedSession() && Idle.expired();
  if (!idleOut && !storedSession()) Idle.reset();
  if (CLOUD) {
    try {
      await lib('supabase');
      CAP.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      CAP.sb.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
          if (event === 'PASSWORD_RECOVERY') { S.session = session; S.mode = 'auth'; S.ui.auth = { mode: 'newpass', msg: 'Choose a new password for your account.', err: '' }; render(); }
          else if (event === 'SIGNED_IN' && session && S.mode === 'auth' && S.ui.auth.mode !== 'newpass') afterLogin(session);
          else if (event === 'TOKEN_REFRESHED' && session) S.session = session;
          else if (event === 'SIGNED_OUT' && S.mode === 'cloud') { Idle.reset(); S.session = null; S.uid = null; Store.apply({}); S.realMode = 'signedout'; goAuth(); }
        }, 0);
      });
      if (idleOut) { Idle.reset(); await endLocalSession(); }
    } catch (e) { console.warn(e); S.loadNote = 'Could not load the sign-in library. Check your internet connection and reload.'; }
  }
  try { await Store.init(); } catch (e) { console.warn('auth init', e); S.realMode = CAP.sb ? 'signedout' : 'local'; }
  if (qs.has('code') || qs.has('error') || qs.has('error_description') || hs.has('error_description')) history.replaceState(null, '', location.pathname + (hs.has('error_description') ? '' : location.hash));
  if (S.mode === 'auth' && S.ui.auth.mode === 'newpass') return render();
  if (S.realMode === 'signedout') {
    const linkErr = urlErr ? (/expired|invalid/i.test(urlErr) ? 'That email link has expired or was already used. Sign in with your password or request a new link.' : urlErr) : '';
    const netErr = Store.offline ? 'Can’t reach the server right now. You are still signed in on this device: check your connection, then reload the page.' : '';
    S.mode = 'auth'; S.ui.auth = { mode: 'signin', msg: idleOut ? IDLE_MSG : qs.has('code') && !urlErr ? 'Your email is confirmed. Sign in to continue.' : '', err: linkErr || netErr };
    return render();
  }
  if (S.realMode === 'cloud') return afterLogin(S.session);
  await loadAndEnter();
}
boot();
