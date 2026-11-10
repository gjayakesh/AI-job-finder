function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), kind === 'bad' ? 6500 : 3800);
}
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { } };
const lsKeys = () => { try { return Object.keys(localStorage); } catch (e) { return []; } };

/* ============ Theme (light / dark / auto) ============ */
const Theme = {
  get() { return (S && S.settings && S.settings.theme) || lsGet('aca:theme') || 'auto'; },
  apply(t) { const r = document.documentElement; if (t === 'light' || t === 'dark') r.setAttribute('data-app-theme', t); else r.removeAttribute('data-app-theme'); },
  effective() { const t = this.get(); if (t !== 'auto') return t; const h = document.documentElement.getAttribute('data-theme'); if (h === 'light' || h === 'dark') return h; return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; },
};
Theme.apply(lsGet('aca:theme') || 'auto');


/* ============ Site configuration (edit config.js) ============ */
const CONFIG = Object.assign({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '', VAPID_PUBLIC_KEY: '', TELEGRAM_BOT_USERNAME: '', APP_NAME: 'AI Career Agent' }, window.APP_CONFIG || {});
const CLOUD = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && !/YOUR[-_]/i.test(CONFIG.SUPABASE_ANON_KEY));
const SITE_URL = location.origin + location.pathname;

/* ============ Capabilities ============ */
const CAP = { sb: null, toolsOK: false, sampleOK: true };

/* ============ App state ============ */
const DEFAULT_SETTINGS = {
  weights: { ...DEFAULT_WEIGHTS }, theme: undefined, cloudPublic: false, cloudPersonal: 'ask', approvalDays: 7, autoShortlist: 70,
  aiKey: '', aiModel: 'gemini-2.5-flash',
};
const DEFAULT_NOTIFY = () => ({
  email: '', emailOn: false, telegramOn: false, telegramChatId: '', telegramCode: '', pushOn: true, pushSubs: [],
  events: { newJobs: true, interviews: true, deadlines: true, approvals: true, followups: true, digest: true, weekly: true },
  minScore: 70, digestHour: 9, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'),
  feeds: { adzuna: true, remotive: true, remoteok: true, ats: true }, companies: { greenhouse: '', lever: '', ashby: '', smartrecruiters: '' }, boardsOff: [], useDirectory: true, testAt: null,
});
const S = {
  mode: 'loading', // cloud | local | memory | auth
  realMode: null, uid: null, session: null, loadNote: '',
  profile: null, prefs: null, settings: clone(DEFAULT_SETTINGS), meta: {}, notify: null,
  jobs: {}, versions: {}, resumes: {}, alerts: {}, server: {},
  logs: [], notifs: [], chat: [], reports: [],
  ui: { tab: {}, filter: { minScore: 0, status: 'open', q: '', sort: 'score' }, notifOpen: false, draft: null, prefDraft: null, auth: { mode: 'signin', msg: '', err: '' } },
};
const SINGLES = ['profile', 'prefs', 'settings', 'meta', 'logs', 'notifs', 'chat', 'reports', 'notify'];
const COLLS = ['jobs', 'versions', 'resumes', 'alerts'];
const withTimeout = (p, ms, code = 'timeout') => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej({ code, message: 'Timed out' }), ms); })]).finally(() => clearTimeout(t)); };

/* ============ Storage: Supabase cloud database (or this browser when not configured) ============ */
const Store = {
  w: {}, lastSync: null, syncing: false, offline: false,
  async init() {
    if (CLOUD && CAP.sb) {
      const { data, error } = await CAP.sb.auth.getSession();
      S.session = data.session || null;
      // A network failure while refreshing keeps the saved session, so say "offline" rather than "signed out".
      this.offline = !S.session && !!error && /fetch|network|retryable/i.test(`${error.name} ${error.message}`) && storedSession();
      if (S.session) { S.uid = S.session.user.id; S.realMode = 'cloud'; } else S.realMode = 'signedout';
    } else if (lsSet('aca:probe', '1')) { lsDel('aca:probe'); S.realMode = 'local'; }
    else S.realMode = 'memory';
  },
  async fetchRows(since) {
    const all = []; let from = 0;
    for (;;) {
      let q = CAP.sb.from('docs').select('kind,id,data,updated_at').order('updated_at', { ascending: true }).range(from, from + 999);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q; if (error) throw error;
      all.push(...data); if (data.length < 1000) break; from += 1000;
    }
    return all;
  },
  absorb(rows, target) {
    for (const r of rows) {
      if (COLLS.includes(r.kind)) (target[r.kind] = target[r.kind] || {})[r.id] = r.data;
      else if (r.kind === 'server') (target.server = target.server || {})[r.id] = r.data;
      else if (SINGLES.includes(r.kind)) target[r.kind] = r.data;
      if (!this.lastSync || r.updated_at > this.lastSync) this.lastSync = r.updated_at;
    }
  },
  async load() {
    const target = {};
    if (S.realMode === 'cloud') { this.lastSync = null; this.absorb(await withTimeout(this.fetchRows(), 20000), target); }
    else if (S.realMode === 'local') {
      SINGLES.forEach(n => { const v = lsGet('aca:' + n); if (v) try { target[n] = JSON.parse(v); } catch (e) { } });
      COLLS.forEach(c => { target[c] = {}; });
      lsKeys().forEach(k => { const m = k.match(/^aca:(jobs|versions|resumes|alerts)\/(.+)$/); if (m) try { target[m[1]][m[2]] = JSON.parse(lsGet(k)); } catch (e) { } });
    }
    return target;
  },
  applySingle(kind, d) {
    if (kind === 'settings') { S.settings = Object.assign(clone(DEFAULT_SETTINGS), d || {}); S.settings.weights = Object.assign({ ...DEFAULT_WEIGHTS }, (d || {}).weights || {}); }
    else if (kind === 'notify') S.notify = d ? Object.assign(DEFAULT_NOTIFY(), d, { events: Object.assign(DEFAULT_NOTIFY().events, d.events || {}), feeds: Object.assign(DEFAULT_NOTIFY().feeds, d.feeds || {}), companies: Object.assign(DEFAULT_NOTIFY().companies, d.companies || {}) }) : null;
    else if (['logs', 'notifs', 'chat', 'reports'].includes(kind)) S[kind] = (d && d.items) || [];
    else S[kind] = d || (kind === 'meta' ? {} : null);
  },
  apply(t) {
    SINGLES.forEach(k => this.applySingle(k, t[k]));
    S.jobs = t.jobs || {}; S.versions = t.versions || {}; S.resumes = t.resumes || {}; S.alerts = t.alerts || {}; S.server = t.server || {};
  },
  put(key, data) {
    if (!['cloud', 'local'].includes(S.mode)) return;
    const st = this.w[key] || (this.w[key] = { busy: false, next: undefined });
    st.next = data === null ? null : clone(data);
    if (!st.busy) this._flush(key);
  },
  dirty(key) { const st = this.w[key]; return !!(st && (st.busy || st.next !== undefined)); },
  async _flush(key) {
    const st = this.w[key]; st.busy = true;
    while (st.next !== undefined) {
      const d = st.next; st.next = undefined;
      try { await this._write(key, d); }
      catch (e) {
        const msg = String((e && (e.message || e.code)) || e);
        if (/fetch|network|timeout/i.test(msg)) { await sleep(800 + Math.random() * 1200); try { await this._write(key, d); continue; } catch (e2) { e = e2; } }
        console.warn('save failed', key, e);
        if (/JWT|expired|401/i.test(msg)) toast('Your session expired. Sign in again to keep saving.', 'bad');
        else if (e && e.code === 'quota_exceeded') toast('Browser storage is full. Delete old jobs or resume versions in Configuration.', 'bad');
        else toast('A change could not be saved (' + msg.slice(0, 80) + '). Check your connection.', 'bad');
      }
    }
    st.busy = false;
  },
  async _write(key, d) {
    const [kind, id = 'main'] = key.split('/');
    if (S.realMode === 'cloud') {
      const r = d === null ? await CAP.sb.from('docs').delete().match({ kind, id }) : await CAP.sb.from('docs').upsert({ user_id: S.uid, kind, id, data: d }, { onConflict: 'user_id,kind,id' });
      if (r.error) throw r.error;
    } else if (S.realMode === 'local') { if (d === null) lsDel('aca:' + key); else if (!lsSet('aca:' + key, JSON.stringify(d))) throw { code: 'quota_exceeded' }; }
  },
  pending() { return Object.values(this.w).some(s => s.busy || s.next !== undefined); },
  async deleteAll() {
    if (S.realMode === 'cloud') { const { error } = await CAP.sb.from('docs').delete().eq('user_id', S.uid); if (error) throw error; }
    else lsKeys().filter(k => k.startsWith('aca:') && k !== 'aca:theme').forEach(lsDel);
  },
  /** Pull rows changed by the server worker or another device since the last sync. */
  async sync() {
    if (S.mode !== 'cloud' || this.syncing) return 0;
    this.syncing = true; let changed = 0; const fresh = [];
    try {
      const rows = await this.fetchRows(this.lastSync);
      for (const r of rows) {
        if (!this.lastSync || r.updated_at > this.lastSync) this.lastSync = r.updated_at;
        const key = COLLS.includes(r.kind) ? r.kind + '/' + r.id : r.kind;
        if (this.dirty(key)) continue;
        if (COLLS.includes(r.kind)) { const cur = S[r.kind][r.id]; if (stableStringify(cur) !== stableStringify(r.data)) { if (r.kind === 'alerts' && !cur) fresh.push(r.data); S[r.kind][r.id] = r.data; changed++; } }
        else if (r.kind === 'server') { S.server[r.id] = r.data; changed++; }
        else if (SINGLES.includes(r.kind)) { this.applySingle(r.kind, r.data); changed++; }
      }
    } catch (e) { console.warn('sync failed', e); }
    finally { this.syncing = false; }
    fresh.sort((a, b) => a.t.localeCompare(b.t)).slice(-3).forEach(a => toast(a.title + (a.body ? ' — ' + a.body.slice(0, 80) : '')));
    if (changed) { if (typeof pruneDeadPush === 'function') pruneDeadPush(); renderSoon(); }
    return changed;
  },
};
const save = {
  profile: () => Store.put('profile', S.profile || {}),
  prefs: () => Store.put('prefs', S.prefs || {}),
  settings: () => Store.put('settings', S.settings),
  meta: () => Store.put('meta', S.meta),
  notify: () => Store.put('notify', S.notify || DEFAULT_NOTIFY()),
  logs: () => Store.put('logs', { items: S.logs.slice(0, 300) }),
  notifs: () => Store.put('notifs', { items: S.notifs.slice(0, 120) }),
  chat: () => Store.put('chat', { items: S.chat.slice(-60) }),
  reports: () => Store.put('reports', { items: S.reports.slice(0, 24) }),
  job: j => { j.updatedAt = nowISO(); Store.put('jobs/' + j.id, j); },
  version: v => Store.put('versions/' + v.id, v),
  resume: r => Store.put('resumes/' + r.id, r),
  alert: a => Store.put('alerts/' + a.id, a),
};
/** Re-render unless the user is typing in a field; then wait until they leave it. */
let _renderWait = false;
function renderSoon() {
  const a = document.activeElement;
  if (a && a.closest && a.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { if (!_renderWait) { _renderWait = true; a.addEventListener('blur', () => { _renderWait = false; setTimeout(render, 50); }, { once: true }); } return; }
  render();
}

/* ============ Audit log & notifications ============ */
function logAgent(agent, action, detail = '', engine = 'local', status = 'ok') {
  S.logs.unshift({ id: uid('l'), t: nowISO(), agent, action, detail: String(detail).slice(0, 400), engine, status });
  if (S.logs.length > 300) S.logs.length = 300;
  save.logs();
}
function notify(type, message, jobId = null) {
  S.notifs.unshift({ id: uid('n'), t: nowISO(), type, message, jobId, read: false });
  if (S.notifs.length > 120) S.notifs.length = 120;
  save.notifs();
}

/* ============ Library loader (lazy) ============ */
const LIBS = {
  supabase: ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js'],
  pdfjs: ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
  mammoth: ['https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'],
  jszip: ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'],
  jspdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'],
};
const _libP = {};
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
}
function lib(name) {
  if (!_libP[name]) _libP[name] = (async () => { for (const src of LIBS[name]) await loadScript(src); })().catch(e => { delete _libP[name]; throw e; });
  return _libP[name];
}

/* ============ Downloads (native) ============ */
const MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', md: 'text/markdown', json: 'application/json', txt: 'text/plain', csv: 'text/csv' };
async function offerDownload(filename, data) {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: MIME[filename.split('.').pop()] || 'application/octet-stream' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) { toast('Download failed: ' + e.message, 'bad'); return false; }
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copied to clipboard'); } catch (e) { toast('Copy was blocked by the browser. Select the text and copy it manually.', 'bad'); }
}

/* ============ AI provider: Google Gemini free tier (optional) ============ */
function parseJSONLoose(text) {
  const t = String(text || '').trim();
  try { return JSON.parse(t); } catch (e) { }
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch (e) { } }
  const a = Math.min(...['{', '['].map(c => t.indexOf(c)).filter(i => i >= 0)); const b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (isFinite(a) && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { } }
  throw { code: 'invalid_json', text: t, message: 'Reply was not valid JSON' };
}
function makeGemini() {
  const key = S.settings.aiKey; if (!key) return null;
  const model = (S.settings.aiModel || 'gemini-2.5-flash').trim();
  const call = async (input, opts = {}) => {
    const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    const contents = [];
    for (const t of turns) { const role = t.role === 'assistant' ? 'model' : 'user'; const last = contents[contents.length - 1]; if (last && last.role === role) last.parts[0].text += '\n\n' + t.content; else contents.push({ role, parts: [{ text: t.content }] }); }
    const body = { contents, generationConfig: { temperature: 0.4, ...(opts.json ? { responseMimeType: 'application/json' } : {}) } };
    let res;
    try { res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }); }
    catch (e) { if (e && e.name === 'AbortError') throw { code: 'cancelled' }; throw { code: 'upstream_error', message: e.message }; }
    if (res.status === 429) throw { code: 'rate_limited', message: 'Gemini free-tier limit reached' };
    if (res.status === 400 || res.status === 403) { const j = await res.json().catch(() => ({})); throw { code: 'not_granted', message: (j.error && j.error.message) || 'Key rejected' }; }
    if (!res.ok) throw { code: 'upstream_error', message: 'HTTP ' + res.status };
    const data = await res.json(); const cand = (data.candidates || [])[0];
    if (!cand || cand.finishReason === 'SAFETY') throw { code: 'refused' };
    const text = ((cand.content && cand.content.parts) || []).map(p => p.text || '').join('');
    if (!text.trim()) throw { code: 'empty_completion' };
    if (opts.onText) opts.onText({ text, delta: text });
    return { text, truncated: cand.finishReason === 'MAX_TOKENS' };
  };
  call.json = async (input, opts = {}) => parseJSONLoose((await call(input, { ...opts, json: true })).text);
  return call;
}
const AI = {
  name: 'Gemini',
  available() { return !!S.settings.aiKey && CAP.sampleOK !== false; },
  client() { return makeGemini(); },
  async allowed(personal) {
    if (!this.available() || !S.settings.cloudPublic) return false;
    if (!personal) return true;
    if (S.settings.cloudPersonal === 'allow') return true;
    if (S.settings.cloudPersonal === 'deny') return false;
    const ok = await confirmDialog({
      title: 'Send your profile to Gemini?',
      body: `<p>This step uses your resume and career profile. Gemini can write it with judgment; the local engine uses rules and templates and never leaves your browser.</p><p class="muted small">On Google’s free tier, prompts may be used to improve Google’s products. You can change this any time in Configuration.</p>`,
      ok: 'Allow Gemini for profile data', cancel: 'Use local engine',
    });
    S.settings.cloudPersonal = ok ? 'allow' : 'deny'; save.settings();
    logAgent('Model Router', 'Privacy choice', ok ? 'Personal data may be processed by Gemini' : 'Personal data stays on the local engine');
    return ok;
  },
  handleErr(e) {
    const c = e && e.code;
    if (c === 'not_granted') { CAP.sampleOK = false; toast('Gemini rejected the API key (' + ((e && e.message) || '').slice(0, 80) + '). Check it in Configuration. Using the local engine.', 'bad'); }
    else if (c === 'rate_limited') toast('Gemini’s free-tier limit is reached. Used the local engine instead; try again later.');
    else if (c === 'cancelled') { }
    else if (c === 'refused') toast('Gemini declined this request. Used the local engine instead.');
    else toast('AI request failed (' + (c || 'error') + '). Used the local engine instead.');
  },
  async json(prompt, { label = 'Working…', signal } = {}) { const c = this.client(); return Busy.run(label, async (onText, sig) => c.json(prompt, { onText, signal: sig }), signal); },
  async text(prompt, { label = 'Working…' } = {}) { const c = this.client(); return Busy.run(label, async (onText, sig) => (await c(prompt, { onText, signal: sig })).text); },
  /** Run a task through the AI provider when allowed, otherwise the local engine. Returns {out, engine}. */
  async route({ personal, prompt, local, label, validate, mode = 'json' }) {
    if (await this.allowed(personal)) {
      try {
        const out = mode === 'json' ? await this.json(prompt, { label }) : await this.text(prompt, { label });
        if (!validate || validate(out)) return { out, engine: 'ai' };
        toast('The AI answer was incomplete. Used the local engine instead.');
      } catch (e) { if (e && e.code === 'cancelled') throw e; this.handleErr(e); }
    }
    return { out: await local(), engine: 'local' };
  },
};

/* Busy overlay with live stream + Stop */
const Busy = {
  ctl: null,
  async run(label, fn, extSignal) {
    const ctl = new AbortController(); this.ctl = ctl;
    if (extSignal) extSignal.addEventListener('abort', () => ctl.abort());
    const el = document.createElement('div'); el.className = 'overlay-busy';
    el.innerHTML = `<div class="box" role="dialog" aria-label="${esc(label)}"><div class="row"><span class="spin"></span><b>${esc(label)}</b><span class="sp"></span><button class="btn sm" type="button" id="busy-stop">Stop</button></div><div class="stream" id="busy-stream">Thinking…</div></div>`;
    document.body.appendChild(el);
    el.querySelector('#busy-stop').onclick = () => ctl.abort();
    const st = el.querySelector('#busy-stream');
    try { return await fn(({ text }) => { st.textContent = text.slice(-1200); st.scrollTop = st.scrollHeight; }, ctl.signal); }
    finally { el.remove(); this.ctl = null; }
  },
  async local(label, fn) {
    const el = document.createElement('div'); el.className = 'overlay-busy';
    el.innerHTML = `<div class="box"><div class="row"><span class="spin"></span><b>${esc(label)}</b></div></div>`;
    document.body.appendChild(el);
    try { await sleep(30); return await fn(); } finally { el.remove(); }
  },
};

/* ============ Modals ============ */
function openModal(html, { wide = false, onClose } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg" data-act="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root._onClose = onClose; root._back = root._back || window._trigger || document.activeElement;
  const f = root.querySelector('input,textarea,select,button.primary'); if (f) setTimeout(() => f.focus(), 20);
}
function closeModal(val) { const root = $('#modal-root'); const cb = root._onClose, back = root._back; root._onClose = null; root._back = null; root.innerHTML = ''; if (cb) cb(val); setTimeout(() => { if (back && back.isConnected && !back.disabled && !$('#modal-root').innerHTML) back.focus(); }, 40); }
function confirmDialog({ title, body = '', ok = 'Confirm', cancel = 'Cancel', danger = false, input = null }) {
  return new Promise(res => {
    openModal(`<h2>${esc(title)}</h2><div class="stack">${body}</div>${input ? `<label class="f"><span>${esc(input.label)}</span><input type="text" id="dlg-input" placeholder="${esc(input.placeholder || '')}"></label>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="dlg-no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" type="button" data-act="dlg-yes">${esc(ok)}</button></div>`,
      { onClose: v => res(v) });
  });
}
