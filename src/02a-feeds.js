/* ============ Live job feeds ============
   Shared by the website (search runs in your browser) and the scheduled server job.
   Every source here is a public job-board API that lists only roles that are open right now,
   and each job keeps the employer's own application link. Nothing is scraped. */
const FEED_API = {
  greenhouse: 'https://boards-api.greenhouse.io/v1/boards', lever: 'https://api.lever.co/v0/postings', ashby: 'https://api.ashbyhq.com/posting-api/job-board',
  smartrecruiters: 'https://api.smartrecruiters.com/v1/companies', remotive: 'https://remotive.com/api/remote-jobs', remoteok: 'https://remoteok.com/api',
};
const FEED_OPTS = { headers: { Accept: 'application/json' }, timeoutMs: 25000 };
const ATS_NAME = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', smartrecruiters: 'SmartRecruiters' };
const REMOTE_NAME = { remotive: 'Remotive', remoteok: 'Remote OK' };
Object.assign(SOURCE_NAME, { ashby: 'Ashby', smartrecruiters: 'SmartRecruiters', remoteok: 'Remote OK' });

// Company career boards that answered with open roles in India when checked on 10 Nov 2026: [system, board id, company].
// A board that later moves or closes is skipped and reported; add or remove companies on the Job Discovery page.
const BOARD_DIRECTORY = [
  ['greenhouse', 'razorpaysoftwareprivatelimited', 'Razorpay'], ['greenhouse', 'groww', 'Groww'], ['greenhouse', 'inmobi', 'InMobi'], ['greenhouse', 'glance', 'Glance'],
  ['greenhouse', 'sigmoid', 'Sigmoid'], ['greenhouse', 'druva', 'Druva'], ['greenhouse', 'hackerrank', 'HackerRank'], ['greenhouse', 'observeai', 'Observe.AI'],
  ['greenhouse', 'turing', 'Turing'], ['greenhouse', 'tide', 'Tide'], ['greenhouse', 'okta', 'Okta'], ['greenhouse', 'databricks', 'Databricks'],
  ['greenhouse', 'zscaler', 'Zscaler'], ['greenhouse', 'mongodb', 'MongoDB'], ['greenhouse', 'stripe', 'Stripe'], ['greenhouse', 'gitlab', 'GitLab'],
  ['greenhouse', 'rubrik', 'Rubrik'], ['greenhouse', 'celonis', 'Celonis'], ['greenhouse', 'toast', 'Toast'], ['greenhouse', 'fivetran', 'Fivetran'],
  ['greenhouse', 'netskope', 'Netskope'], ['greenhouse', 'elastic', 'Elastic'], ['greenhouse', 'twilio', 'Twilio'], ['greenhouse', 'agoda', 'Agoda'],
  ['greenhouse', 'coinbase', 'Coinbase'], ['greenhouse', 'zoominfo', 'ZoomInfo'], ['greenhouse', 'commvault', 'Commvault'], ['greenhouse', 'sumologic', 'Sumo Logic'],
  ['greenhouse', 'singlestore', 'SingleStore'], ['greenhouse', 'starburst', 'Starburst'], ['greenhouse', 'jfrog', 'JFrog'], ['greenhouse', 'zuora', 'Zuora'],
  ['greenhouse', 'newrelic', 'New Relic'], ['greenhouse', 'launchdarkly', 'LaunchDarkly'], ['greenhouse', 'mixpanel', 'Mixpanel'], ['greenhouse', 'neo4j', 'Neo4j'],
  ['greenhouse', 'yugabyte', 'Yugabyte'],
  ['lever', 'paytm', 'Paytm'], ['lever', 'meesho', 'Meesho'], ['lever', 'cred', 'CRED'], ['lever', 'hevodata', 'Hevo Data'], ['lever', 'zeta', 'Zeta'],
  ['lever', 'mindtickle', 'Mindtickle'], ['lever', 'fampay', 'FamPay'], ['lever', 'acceldata', 'Acceldata'], ['lever', 'nium', 'Nium'], ['lever', 'outreach', 'Outreach'],
  ['ashby', 'tekion', 'Tekion'], ['ashby', 'sarvam', 'Sarvam AI'], ['ashby', 'ema', 'Ema'], ['ashby', 'spotdraft', 'SpotDraft'], ['ashby', 'uipath', 'UiPath'],
  ['ashby', 'atlan', 'Atlan'], ['ashby', 'composio', 'Composio'], ['ashby', 'redis', 'Redis'],
  ['smartrecruiters', 'swiggy', 'Swiggy'], ['smartrecruiters', 'freshworks', 'Freshworks'], ['smartrecruiters', 'servicenow', 'ServiceNow'], ['smartrecruiters', 'wise', 'Wise'],
  ['smartrecruiters', 'grab', 'Grab'], ['smartrecruiters', 'lokal', 'Lokal'], ['smartrecruiters', 'shipsy', 'Shipsy'],
];
const boardKey = b => b.ats + ':' + String(b.token).toLowerCase();
const prettyToken = t => String(t || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const directoryBoards = () => BOARD_DIRECTORY.map(([ats, token, name]) => ({ ats, token, name }));

/** The boards to search: the suggested list (minus any the user removed) plus the companies they added. */
function boardsFor(n) {
  n = n || {}; const off = new Set((n.boardsOff || []).map(x => String(x).toLowerCase())); const out = []; const seen = new Set();
  const add = b => { const k = boardKey(b); if (seen.has(k) || off.has(k)) return; seen.add(k); out.push(b); };
  if (n.useDirectory !== false) directoryBoards().forEach(add);
  for (const ats of Object.keys(ATS_NAME)) String((n.companies || {})[ats] || '').split(/[\s,]+/).filter(Boolean).forEach(token => add({ ats, token, name: prettyToken(token), custom: true }));
  return out;
}
/** Turns a careers link or a plain board id into {ats, token}. Returns null when the system is not one of the supported ones. */
function parseBoardRef(input, fallbackAts) {
  const s = String(input || '').trim(); if (!s) return null;
  let m = s.match(/(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i) || s.match(/greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i);
  if (m) return { ats: 'greenhouse', token: m[1].toLowerCase() };
  m = s.match(/jobs(?:\.eu)?\.lever\.co\/([a-z0-9_.-]+)/i) || s.match(/api\.lever\.co\/v0\/postings\/([a-z0-9_.-]+)/i); if (m) return { ats: 'lever', token: m[1].toLowerCase() };
  m = s.match(/jobs\.ashbyhq\.com\/([^/?#\s]+)/i) || s.match(/ashbyhq\.com\/posting-api\/job-board\/([^/?#\s]+)/i); if (m) return { ats: 'ashby', token: decodeURIComponent(m[1]) };
  m = s.match(/(?:jobs|careers)\.smartrecruiters\.com\/([^/?#\s]+)/i) || s.match(/smartrecruiters\.com\/v1\/companies\/([^/?#\s]+)/i); if (m) return { ats: 'smartrecruiters', token: decodeURIComponent(m[1]) };
  if (/^[a-z0-9][a-z0-9_.-]{1,60}$/i.test(s) && ATS_NAME[fallbackAts]) return { ats: fallbackAts, token: fallbackAts === 'ashby' || fallbackAts === 'smartrecruiters' ? s : s.toLowerCase() };
  return null;
}
/** The board a saved job came from (older records only have the application link). */
function boardOf(j) {
  if (j.board) return String(j.board);
  const r = parseBoardRef(j.applyUrl || j.postingUrl || ''); return r && r.ats === j.source ? r.token : '';
}

/* ---------- text ---------- */
const decodeEntities = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&ndash;|&mdash;/g, '-').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&');
const tidyText = t => String(t || '').replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
const htmlToText = h => decodeEntities(String(h || '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<\s*(br|\/p|\/li|\/h\d|\/div|\/tr|\/ul|\/ol)\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '\n- ').replace(/<h\d[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();

/* ---------- fetching ---------- */
async function feedJSON(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), FEED_OPTS.timeoutMs);
    try {
      const r = await fetch(url, { headers: FEED_OPTS.headers, signal: ctl.signal });
      if (r.status === 429 || r.status >= 500) { const e = new Error('HTTP ' + r.status); e.retry = true; throw e; }
      if (!r.ok) { const e = new Error(r.status === 404 ? 'board not found' : 'HTTP ' + r.status); e.status = r.status; throw e; }
      return await r.json();
    } catch (e) {
      lastErr = e && e.name === 'AbortError' ? new Error('timed out') : e;
      const again = e && (e.retry || e.name === 'AbortError' || e.name === 'TypeError');
      if (!again || attempt) break;
      await new Promise(res => setTimeout(res, 900));
    } finally { clearTimeout(timer); }
  }
  throw lastErr;
}
async function pool(items, size, fn) {
  let i = 0; const out = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const day10 = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
const WORKPLACE = { remote: 'remote', hybrid: 'hybrid', onsite: 'onsite', 'on-site': 'onsite', 'on site': 'onsite', office: 'onsite' };
const workplaceOf = v => WORKPLACE[String(v || '').toLowerCase().replace(/_/g, '-')] || null;
function employmentOf(label) {
  const t = String(label || '').toLowerCase();
  if (/intern/.test(t)) return 'internship'; if (/contract|temporary|freelance|fixed/.test(t)) return 'contract'; if (/part/.test(t)) return 'part_time'; if (/full|permanent|regular/.test(t)) return 'full_time'; return null;
}

/* Each adapter returns candidates: {source, board, extId, title, company, location, url, ...}. `needsDetail` means the description is fetched only for roles that pass the title and location filters. */
const FEEDS = {
  greenhouse: {
    async list(b) {
      const j = await feedJSON(`${FEED_API.greenhouse}/${encodeURIComponent(b.token)}/jobs`);
      return { complete: true, items: (j.jobs || []).map(r => ({ source: 'greenhouse', board: b.token, extId: String(r.id), title: String(r.title || '').trim(), company: b.name || r.company_name || prettyToken(b.token), location: (r.location && r.location.name) || '', url: r.absolute_url, postedAt: day10(r.first_published || r.updated_at), deadline: day10(r.application_deadline), needsDetail: true })) };
    },
    async detail(c) { const r = await feedJSON(`${FEED_API.greenhouse}/${encodeURIComponent(c.board)}/jobs/${encodeURIComponent(c.extId)}`); c.description = htmlToText(decodeEntities(r.content || '')); },
  },
  lever: {
    async list(b) {
      const j = await feedJSON(`${FEED_API.lever}/${encodeURIComponent(b.token)}?mode=json`);
      return { complete: true, items: (Array.isArray(j) ? j : []).map(r => {
        const cat = r.categories || {};
        const body = [r.descriptionPlain || htmlToText(r.description), ...(r.lists || []).map(l => (l.text ? l.text + ':\n' : '') + htmlToText(l.content)), r.additionalPlain || htmlToText(r.additional)].filter(Boolean).join('\n\n');
        const sal = r.salaryRange && r.salaryRange.min ? `${r.salaryRange.currency || ''} ${r.salaryRange.min} - ${r.salaryRange.max} per ${r.salaryRange.interval || 'year'}` : '';
        return { source: 'lever', board: b.token, extId: String(r.id), title: String(r.text || '').trim(), company: b.name || prettyToken(b.token), location: cat.location || '', allLocations: cat.allLocations || [], country: r.country || '', workMode: workplaceOf(r.workplaceType), url: r.hostedUrl, applyUrl: r.applyUrl || r.hostedUrl, description: body, postedAt: day10(r.createdAt), employmentType: employmentOf(cat.commitment), salaryText: sal };
      }) };
    },
  },
  ashby: {
    async list(b) {
      const j = await feedJSON(`${FEED_API.ashby}/${encodeURIComponent(b.token)}?includeCompensation=true`);
      return { complete: true, items: (j.jobs || []).filter(r => r.isListed !== false).map(r => {
        const addr = (r.address && r.address.postalAddress) || {};
        return { source: 'ashby', board: b.token, extId: String(r.id), title: String(r.title || '').trim(), company: b.name || prettyToken(b.token), location: r.location || addr.addressLocality || '', allLocations: [addr.addressLocality, ...(r.secondaryLocations || []).map(x => x.location)].filter(Boolean), country: addr.addressCountry || '', workMode: r.isRemote ? 'remote' : workplaceOf(r.workplaceType), url: r.jobUrl, applyUrl: r.applyUrl || r.jobUrl, description: r.descriptionPlain || htmlToText(r.descriptionHtml), postedAt: day10(r.publishedAt), employmentType: employmentOf(r.employmentType), salaryText: (r.compensation && r.compensation.compensationTierSummary) || '' };
      }) };
    },
  },
  smartrecruiters: {
    async list(b) {
      const items = []; let total = 0;
      for (let offset = 0; offset < 1000; offset += 100) {
        const j = await feedJSON(`${FEED_API.smartrecruiters}/${encodeURIComponent(b.token)}/postings?country=in&limit=100&offset=${offset}`);
        total = j.totalFound || 0; const page = j.content || [];
        for (const r of page) {
          const loc = r.location || {};
          items.push({ source: 'smartrecruiters', board: b.token, extId: String(r.id), title: String(r.name || '').trim(), company: b.name || (r.company && r.company.name) || prettyToken(b.token), location: [loc.city, 'India'].filter(Boolean).join(', '), country: 'IN', workMode: loc.remote ? 'remote' : loc.hybrid ? 'hybrid' : null, url: `https://jobs.smartrecruiters.com/${encodeURIComponent(b.token)}/${encodeURIComponent(r.id)}`, postedAt: day10(r.releasedDate), employmentType: employmentOf(r.typeOfEmployment && r.typeOfEmployment.label), levelLabel: (r.experienceLevel && r.experienceLevel.label) || '', needsDetail: true });
        }
        if (page.length < 100 || items.length >= total) break;
      }
      return { complete: items.length >= total, items };
    },
    async detail(c) {
      const r = await feedJSON(`${FEED_API.smartrecruiters}/${encodeURIComponent(c.board)}/postings/${encodeURIComponent(c.extId)}`);
      const sec = (r.jobAd && r.jobAd.sections) || {};
      c.description = ['jobDescription', 'qualifications', 'additionalInformation'].map(k => sec[k] && sec[k].text ? (sec[k].title ? sec[k].title + ':\n' : '') + htmlToText(sec[k].text) : '').filter(Boolean).join('\n\n');
      if (r.postingUrl) c.url = r.postingUrl; if (r.applyUrl) c.applyUrl = r.applyUrl;
    },
  },
};
const REMOTIVE_CATEGORY = [[/data|analyst|scientist|analytics|\bml\b/, 'data'], [/design|ux|ui\b/, 'design'], [/devops|sre|reliability|cloud|platform/, 'devops'], [/qa|test/, 'qa'], [/product manager|product owner/, 'product'], [/market|seo|content/, 'marketing'], [/sales|account executive|business development/, 'sales'], [/support|customer/, 'customer-support'], [/writer|writing|editor/, 'writing'], [/hr\b|recruit|talent/, 'hr'], [/financ|account|legal/, 'finance-legal']];
const REMOTE_FEEDS = {
  async remotive(prefs) {
    const t = normTitle(((prefs && prefs.titles) || []).join(' '));
    const cats = uniq([/developer|engineer|programmer/.test(t) || !t.trim() ? 'software-dev' : null, ...REMOTIVE_CATEGORY.filter(([re]) => re.test(t)).map(x => x[1])]).slice(0, 2);
    const out = [];
    for (const cat of (cats.length ? cats : ['software-dev'])) {
      const j = await feedJSON(`${FEED_API.remotive}?category=${cat}`);
      for (const r of (j.jobs || [])) out.push({ source: 'remotive', extId: String(r.id), title: String(r.title || '').trim(), company: r.company_name || 'Unknown company', location: r.candidate_required_location || '', remote: true, workMode: 'remote', url: r.url, description: htmlToText(r.description) + (r.tags && r.tags.length ? '\nSkills: ' + r.tags.join(', ') : ''), postedAt: day10(r.publication_date), employmentType: employmentOf(r.job_type), salaryText: r.salary || '' });
    }
    return out;
  },
  async remoteok() {
    const j = await feedJSON(FEED_API.remoteok);
    return (Array.isArray(j) ? j : []).filter(r => r && r.id && r.position).map(r => ({ source: 'remoteok', extId: String(r.id), title: String(r.position).trim(), company: r.company || 'Unknown company', location: r.location || '', remote: true, workMode: 'remote', url: r.url || r.apply_url, description: htmlToText(r.description) + (r.tags && r.tags.length ? '\nSkills: ' + r.tags.join(', ') : ''), postedAt: day10(r.date) }));
  },
};

/* ---------- title matching ---------- */
function normTitle(s) {
  return ' ' + String(s || '').toLowerCase().replace(/&/g, ' and ')
    .replace(/\bfull[\s-]*stack\b/g, 'fullstack').replace(/\bfront[\s-]*end\b/g, 'frontend').replace(/\bback[\s-]*end\b/g, 'backend')
    .replace(/\bmember of (the )?technical staff\b|\bmts\b/g, 'software engineer').replace(/\b(sde|swe)\b[\s-]*(\d|i{1,3}\b)?/g, 'software engineer $2 ').replace(/\bsdet\b/g, 'qa engineer')
    .replace(/\bdevs?\b/g, 'developer').replace(/\bengg?r?\b/g, 'engineer').replace(/\bui developer\b/g, 'frontend developer')
    .replace(/\b(node|react|vue|next|angular|express)\.?js\b/g, '$1').replace(/\bgolang\b/g, 'go')
    .replace(/\bmachine[\s-]*learning\b|\bai\s*\/\s*ml\b|\bml\s*\/\s*ai\b|\bartificial intelligence\b|\bgen(erative)?[\s-]*ai\b|\bai\b/g, 'ml')
    .replace(/\bquality assurance\b|\btesting\b|\btest\b/g, 'qa').replace(/\btesters?\b/g, 'qa engineer').replace(/\bdev[\s-]*ops\b/g, 'devops')
    .replace(/\binternships?\b|\binterns\b/g, 'intern').replace(/[^a-z0-9+#.]+/g, ' ').replace(/(^|\s)\.+|\.+(\s|$)/g, ' ').replace(/\s+/g, ' ') + ' ';
}
const TITLE_LEVEL = new Set(['junior', 'jr', 'senior', 'sr', 'entry', 'level', 'trainee', 'associate', 'lead', 'staff', 'principal', 'fresher', 'freshers', 'graduate', 'i', 'ii', 'iii', 'iv', '1', '2', '3', '4', 'the', 'and', 'of', 'for', 'in', 'a', 'an', 'to', 'with', 'remote', 'hybrid', 'india', 'role', 'position', 'job', 'jobs']);
const ROLE_GROUP = { developer: 'dev', engineer: 'dev', programmer: 'dev', coder: 'dev', analyst: 'analyst', scientist: 'scientist', designer: 'designer', architect: 'architect', administrator: 'admin', admin: 'admin', consultant: 'consultant', specialist: 'specialist', manager: 'manager', executive: 'executive', writer: 'writer', recruiter: 'recruiter', accountant: 'accountant', representative: 'rep', researcher: 'researcher', coordinator: 'coordinator', strategist: 'strategist', officer: 'officer', advisor: 'advisor', marketer: 'marketer' };
// "Engineer" also names many jobs that are not software development.
const NOT_SOFTWARE = /\b(sales|presales|pre sales|solutions?|support|customer|success|mechanical|electrical|electronics|civil|hardware|network|field|process|manufacturing|chemical|structural|design|rf|asic|vlsi|fpga|silicon|firmware|facilities|maintenance|service|implementation|deployed|partner|quality|validation|verification|systems? engineer|security|data|analytics|devops|reliability|sre|qa|ml|research|mobile|android|ios|game|graphics|embedded|kernel|compiler|blockchain)\b/;
// Words that mark a general software-development title.
const SOFT_CORE = /\b(software|backend|frontend|fullstack|web|application|applications|developer|programmer|platform|api|product engineer)\b/;
function parseTitle(s) {
  const tokens = normTitle(s).trim().split(' ').filter(Boolean);
  const groups = new Set(), specific = new Set();
  for (const w of tokens) { if (ROLE_GROUP[w]) groups.add(ROLE_GROUP[w]); else if (w === 'intern') continue; else if (!TITLE_LEVEL.has(w)) specific.add(w); }
  return { tokens: new Set(tokens), groups, specific, intern: tokens.includes('intern'), phrase: ' ' + tokens.filter(w => !TITLE_LEVEL.has(w) && w !== 'intern').join(' ') + ' ' };
}
/** Returns title => 'strong' | 'general' | 'related' | null.
 *  strong  = one of the roles you asked for;
 *  general = a general software role, when you asked for "Software Engineer / Developer" (kept unless its skills are far from yours);
 *  related = a software role outside your titles, kept only if its skills fit your profile. */
function titleMatcher(prefs) {
  const wanted = uniqCI((prefs && prefs.titles) || []).map(parseTitle).filter(p => p.specific.size || p.groups.size);
  const wantsIntern = wanted.some(p => p.intern) || ((prefs && prefs.employmentTypes) || []).includes('internship');
  const onlyIntern = wanted.length > 0 && wanted.every(p => p.intern);
  const generic = p => [...p.specific].every(w => ['software', 'application', 'applications', 'web'].includes(w));
  const softwareSeeker = wanted.some(p => p.groups.has('dev') && (generic(p) || !NOT_SOFTWARE.test([...p.specific].join(' '))));
  return title => {
    const t = parseTitle(title);
    if (t.intern && !wantsIntern) return null;
    if (onlyIntern && !t.intern) return null;
    for (const p of wanted) {
      const roleOK = !p.groups.size || [...p.groups].some(g => t.groups.has(g));
      if (!roleOK) continue;
      if (p.groups.has('dev') && generic(p)) continue;                 // "Software Engineer": handled below as the general software family
      if (!p.specific.size) { if (!p.groups.has('dev')) return 'strong'; continue; }
      // Developer titles tolerate extra words ("Python Backend Developer"); for other roles the words must sit together ("Business Analyst", not "Business Support Analyst").
      if (p.groups.has('dev') || !p.groups.size ? [...p.specific].every(w => t.tokens.has(w)) : t.phrase.includes(p.phrase)) return 'strong';
    }
    if (!softwareSeeker || !t.groups.has('dev')) return null;
    const nt = normTitle(title); if (!SOFT_CORE.test(nt)) return null;
    // A specialised variant (data, security, test, mobile...) is kept only if its skills fit your profile.
    if (NOT_SOFTWARE.test(nt)) return 'related';
    return wanted.some(p => p.groups.has('dev') && generic(p)) ? 'general' : 'related';
  };
}
/** Seniority check from the title alone, using your experience range (or your profile's years when no range is set). */
function levelGate(title, prefs, profile) {
  const t = normTitle(title); const years = candidateYears(profile);
  const cap = (prefs && prefs.expMax != null) ? +prefs.expMax : years + 2;
  const floor = (prefs && prefs.expMin != null) ? +prefs.expMin : Math.max(0, years - 2);
  if (cap <= 3 && /\b(senior|sr|lead|principal|staff|manager|head|director|architect|vp|president|distinguished|expert|iii|iv|3|4)\b/.test(t)) return false;
  if ((cap < 2 || (cap <= 2 && years < 1.5)) && /\b(ii|2|intermediate|mid)\b/.test(t)) return false;
  if (cap <= 5 && /\b(principal|staff|director|head|vp|president|distinguished|architect)\b/.test(t)) return false;
  if (floor >= 4 && /\b(intern|trainee|graduate|grad|fresher|freshers|junior|jr|apprentice|entry|i|1)\b/.test(t)) return false;
  return true;
}

/* ---------- location ---------- */
const OPEN_TO_INDIA = /\b(worldwide|anywhere|global|globally|international|apac|asia|india)\b/i;
function candidateGeo(c) {
  const raw = [c.location, ...(c.allLocations || [])].filter(Boolean).join('; ');
  const cities = detectCities(raw);
  const country = String(c.country || '').trim();
  const india = /^(in|ind|india)$/i.test(country) || /\bindia\b/i.test(raw) || cities.length > 0;
  return { raw, cities, india, remote: !!c.remote || c.workMode === 'remote' || /\bremote\b/i.test(raw) };
}
function locationGate(c, prefs, profile) {
  const g = candidateGeo(c); const pr = prefs || {};
  const locs = (pr.locations || []).map(l => /remote/i.test(l) ? 'Remote' : canonCity(l)); const prefCities = locs.filter(l => l !== 'Remote');
  const wantsRemote = locs.includes('Remote') || (pr.workModes || []).includes('remote');
  if (!g.india) {
    if (!g.remote || !(wantsRemote || !prefCities.length)) return false;
    const rest = g.raw.replace(/\bremote\b/ig, '').replace(/[\s,;()\-–|/]+/g, ' ').trim();
    return rest ? OPEN_TO_INDIA.test(rest) : !c.board;   // a company board that only says "Remote" usually means its home country
  }
  if (!prefCities.length) return true;
  if (g.cities.some(x => prefCities.includes(x))) return true;
  if (g.remote && wantsRemote) return true;
  if (!g.cities.length) return true;                       // "India" with no city
  return !!(profile && profile.relocate);
}

/* ---------- candidate -> scored job ---------- */
function findDuplicateIn(j, jobs, excludeId) {
  const nu = normalizeUrl(j.applyUrl), ex = j.externalId || externalId(j.applyUrl), fp = fingerprint(j);
  return jobs.find(o => o.id !== excludeId && ((nu && normalizeUrl(o.applyUrl) === nu) || (ex && String(o.externalId || externalId(o.applyUrl)) === String(ex) && o.source === j.source) || (fp.split('|')[0] && fingerprint(o) === fp)));
}
function candidateToJob(c, profile, prefs, weights, now) {
  const text = `${c.title}\nCompany: ${c.company}\nLocation: ${c.location || 'Not stated'}\n${c.salaryText ? 'Salary: ' + c.salaryText + '\n' : ''}${tidyText(c.description)}`;
  const ex = extractJobLocal(text, c.url); const t = (now || new Date()).toISOString();
  const job = {
    id: uid('j'), ...ex, title: c.title.slice(0, 140), company: String(c.company || 'Unknown company').slice(0, 80), location: c.location || ex.location,
    workMode: c.workMode || (c.remote ? 'remote' : detectWorkMode(c.location) || null), salaryMin: c.salaryMin ?? ex.salaryMin, salaryMax: c.salaryMax ?? ex.salaryMax,
    employmentType: c.employmentType || ex.employmentType, description: text.slice(0, 15000), applyUrl: c.applyUrl || c.url, postingUrl: c.url, source: c.source, externalId: String(c.extId),
    postedAt: c.postedAt || '', deadline: c.deadline || ex.deadline || '', discoveredAt: t, stage: 'Analyzed', extractEngine: c.by === 'server' ? 'server' : 'local', app: {}, fresh: true,
  };
  if (c.board) { job.board = c.board; job.verifiedOpenAt = t; }
  if (c.snippet) job.snippet = true;
  job.discoveredBy = c.by || 'search';
  const scam = scamCheck(text); if (scam) { job.suspicious = true; job.suspiciousReason = scam; }
  if (job.deadline && job.deadline < isoDay(now || new Date())) job.expired = true;
  job.match = scoreJob(job, profile || {}, prefs || {}, weights); job.match.engine = 'local';
  const who = c.by === 'server' ? ' (server)' : '';
  job.history = [{ from: null, to: 'Discovered', t, by: 'Job Discovery Agent' + who, evidence: SOURCE_NAME[c.source] || c.source }, { from: 'Discovered', to: 'Analyzed', t, by: 'Job Matching Agent' + who, note: `Score ${job.match.score} (${job.match.category})` }];
  job.updatedAt = t;
  return job;
}

/* ---------- the search ---------- */
const PRE_APPLY = ['Discovered', 'Analyzed', 'Shortlisted', 'ResumeGenerated', 'AwaitingApproval', 'Approved', 'RejectedByUser', 'Archived'];
const _boardCache = new Map();
/**
 * Searches the boards and remote feeds for open roles that fit, and checks saved jobs against the boards.
 * opts: prefs, profile, weights, boards [{ats, token, name}], remote {remotive, remoteok}, existing [jobs], extra [candidates from other sources],
 *       maxNew, maxRelated, perBoard, now, by ('server' for the scheduled job), cacheMs, onProgress(evt)
 * Returns {fresh, closed, reopened, verified, stats}. Nothing is saved here; the caller stores the results.
 */
async function discoverJobs(opts) {
  const { prefs, profile, weights } = opts; const now = opts.now || new Date(); const started = Date.now();
  const existing = opts.existing || []; const say = opts.onProgress || (() => { });
  const maxNew = opts.maxNew || 60, maxRelated = opts.maxRelated ?? 30, perBoard = opts.perBoard || 8, cacheMs = opts.cacheMs ?? 10 * 60e3;
  const stats = { boards: 0, boardsOk: 0, failed: [], remote: {}, listed: 0, matched: 0, related: 0, added: 0, perSource: {}, skippedKnown: 0 };
  const match = titleMatcher(prefs); const cands = []; const openIds = {};
  const boards = opts.boards || []; stats.boards = boards.length; let done = 0;
  await pool(boards, 6, async b => {
    const key = boardKey(b);
    try {
      let res = _boardCache.get(key); if (!res || Date.now() - res.at > cacheMs || cacheMs === 0) { res = { ...(await FEEDS[b.ats].list(b)), at: Date.now() }; _boardCache.set(key, res); }
      stats.boardsOk++; stats.listed += res.items.length;
      if (res.complete) openIds[key] = new Set(res.items.map(x => String(x.extId)));
      for (const it of res.items) cands.push({ ...it });
    } catch (e) { stats.failed.push({ ...b, error: String((e && e.message) || e).slice(0, 80) }); }
    say({ phase: 'boards', done: ++done, total: boards.length, board: b });
  });
  for (const [name, on] of Object.entries(opts.remote || {})) {
    if (!on) { stats.remote[name] = on === false ? 'off' : 'skipped'; continue; }
    try { const r = await REMOTE_FEEDS[name](prefs); stats.remote[name] = 'ok'; stats.listed += r.length; cands.push(...r); }
    catch (e) { stats.remote[name] = 'error: ' + String((e && e.message) || e).slice(0, 80); }
    say({ phase: 'remote', source: name });
  }
  for (const c of (opts.extra || [])) cands.push(c);

  // 1) title, seniority and location, straight from the listing
  const known = new Set(existing.map(j => j.source + ':' + j.externalId)); const seen = new Set(); const pick = [];
  const prefCities = ((prefs && prefs.locations) || []).map(canonCity);
  for (const c of cands) {
    if (!c.title || !c.url) continue; const id = c.source + ':' + c.extId;
    if (seen.has(id)) continue; seen.add(id);
    if (known.has(id)) { stats.skippedKnown++; continue; }
    if (!c.board && c.postedAt && now - new Date(c.postedAt) > 30 * 86400e3) continue;   // aggregators keep stale posts; boards list only open ones
    const tier = match(c.title); if (!tier) continue;
    if (!levelGate(c.title, prefs, profile) || !locationGate(c, prefs, profile)) continue;
    c.tier = tier; c.rank = (tier === 'strong' ? 0 : tier === 'general' ? 3 : 10) + (candidateGeo(c).cities.some(x => prefCities.includes(x)) ? 0 : 2) + (c.board ? 0 : 1);
    pick.push(c);
  }
  pick.sort((a, b) => a.rank - b.rank || String(b.postedAt || '').localeCompare(String(a.postedAt || '')));
  const perB = {}; const shortlist = []; let nRelated = 0;
  for (const c of pick) {
    const bk = c.board ? c.source + ':' + c.board : c.source; perB[bk] = (perB[bk] || 0) + 1;
    if (c.board && perB[bk] > perBoard) continue;
    if (c.tier === 'related') { if (nRelated >= maxRelated) continue; nRelated++; }
    shortlist.push(c); if (shortlist.length >= maxNew + maxRelated) break;
  }
  stats.related = shortlist.filter(c => c.tier === 'related').length; stats.matched = shortlist.length - stats.related;

  // 2) full description only for the shortlist
  const need = shortlist.filter(c => c.needsDetail && FEEDS[c.source] && FEEDS[c.source].detail); let d = 0;
  await pool(need, 5, async c => { try { await FEEDS[c.source].detail(c); } catch (e) { c.detailFailed = true; } say({ phase: 'details', done: ++d, total: need.length }); });

  // 3) score, drop poor fits and duplicates
  const fresh = []; const pool2 = existing.slice(); const years = candidateYears(profile);
  const cap = (prefs && prefs.expMax != null) ? +prefs.expMax : years + 2;
  const floor = (prefs && prefs.expMin != null) ? +prefs.expMin : Math.max(0, years - 2);
  for (const c of shortlist) {
    if (c.detailFailed) continue;
    if (opts.by) c.by = opts.by;
    const job = candidateToJob(c, profile, prefs, weights, now);
    if (job.expMin != null && job.expMin >= Math.max(cap, years) + 1) continue;                        // asks for more experience than you have or want
    if (job.expMax != null && job.expMax < floor - 1) continue;                                          // far too junior for you
    const K = job.match.components.K;
    if (c.tier === 'general' && !K.unknown && K.v < 25) continue;                                        // a software role, but on a different stack
    if (c.tier === 'related') { if (K.unknown || K.v < 50 || job.match.score < 50) continue; job.relatedMatch = true; }
    if (findDuplicateIn(job, pool2)) continue;
    pool2.push(job); fresh.push(job); stats.perSource[c.source] = (stats.perSource[c.source] || 0) + 1;
    if (fresh.length >= maxNew) break;
  }
  stats.added = fresh.length;

  // 4) are the jobs you already saved still listed?
  const closed = [], reopened = [], verified = [];
  for (const j of existing) {
    if (!ATS_NAME[j.source] || !j.externalId) continue; const set = openIds[j.source + ':' + String(boardOf(j)).toLowerCase()]; if (!set) continue;
    if (set.has(String(j.externalId))) { verified.push(j.id); if (j.closed) reopened.push(j.id); }
    else if (!j.closed && PRE_APPLY.includes(j.stage)) closed.push(j.id);
  }
  stats.closed = closed.length; stats.ms = Date.now() - started;
  return { fresh, closed, reopened, verified, stats };
}
/** Is one saved job still listed on its board? Returns true, false, or null when it cannot be checked. */
async function checkJobOpen(j) {
  if (!ATS_NAME[j.source] || !j.externalId) return null; const token = boardOf(j); if (!token) return null;
  const res = await FEEDS[j.source].list({ ats: j.source, token, name: j.company });
  _boardCache.set(j.source + ':' + token.toLowerCase(), { ...res, at: Date.now() });
  if (!res.complete) return res.items.some(x => String(x.extId) === String(j.externalId)) ? true : null;
  return res.items.some(x => String(x.extId) === String(j.externalId));
}
