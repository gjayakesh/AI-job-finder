/* ============ Skill dictionary ============ */
const SKILL_DEFS = [
  // [canonical, category, aliases '|' separated, caseSensitiveAliases]
  ['Python', 'Language', 'python|python3'], ['Java', 'Language', 'java|core java|advanced java'], ['JavaScript', 'Language', 'javascript|js|es6|ecmascript'],
  ['TypeScript', 'Language', 'typescript|ts'], ['C', 'Language', 'c programming|c language'], ['C++', 'Language', 'c++|cpp'], ['C#', 'Language', 'c#|csharp|c sharp'],
  ['Go', 'Language', 'golang|go lang'], ['Rust', 'Language', 'rust'], ['PHP', 'Language', 'php'], ['Ruby', 'Language', 'ruby'], ['Kotlin', 'Language', 'kotlin'],
  ['Swift', 'Language', '', 'Swift'], ['Dart', 'Language', 'dart'], ['Scala', 'Language', 'scala'], ['R', 'Language', 'r programming|r language'], ['SQL', 'Language', 'sql|pl/sql|plsql|t-sql'],
  ['Bash', 'Language', 'bash|shell scripting|shell script'], ['HTML', 'Language', 'html|html5'], ['CSS', 'Language', 'css|css3|scss|sass'],
  ['Django', 'Framework', 'django|django rest framework|drf'], ['Flask', 'Framework', 'flask'], ['FastAPI', 'Framework', 'fastapi|fast api'],
  ['Spring Boot', 'Framework', 'spring boot|springboot|spring framework|spring mvc'], ['Node.js', 'Framework', 'node.js|nodejs|node js|node'], ['Express.js', 'Framework', 'express.js|expressjs|express js'],
  ['React', 'Framework', 'react|react.js|reactjs|react js'], ['Next.js', 'Framework', 'next.js|nextjs|next js'], ['Angular', 'Framework', 'angular|angularjs|angular.js'],
  ['Vue.js', 'Framework', 'vue|vue.js|vuejs'], ['Svelte', 'Framework', 'svelte'], ['jQuery', 'Framework', 'jquery'], ['Bootstrap', 'Framework', 'bootstrap'],
  ['Tailwind CSS', 'Framework', 'tailwind|tailwind css|tailwindcss'], ['Laravel', 'Framework', 'laravel'], ['CodeIgniter', 'Framework', 'codeigniter'],
  ['.NET', 'Framework', '.net|asp.net|dotnet|.net core'], ['Ruby on Rails', 'Framework', 'ruby on rails|rails'], ['React Native', 'Framework', 'react native'],
  ['Flutter', 'Framework', 'flutter'], ['Redux', 'Framework', 'redux'], ['GraphQL', 'Framework', 'graphql'],
  ['REST APIs', 'Concept', 'rest api|rest apis|restful|restful api|restful apis|restful services|rest services|api development|web apis'],
  ['Pandas', 'Library', 'pandas'], ['NumPy', 'Library', 'numpy'], ['scikit-learn', 'Library', 'scikit-learn|sklearn|scikit learn'], ['TensorFlow', 'Library', 'tensorflow'],
  ['PyTorch', 'Library', 'pytorch'], ['Keras', 'Library', 'keras'], ['OpenCV', 'Library', 'opencv'], ['LangChain', 'Library', 'langchain'], ['Hibernate', 'Library', 'hibernate'],
  ['Celery', 'Library', 'celery'], ['Selenium', 'Tool', 'selenium'], ['Playwright', 'Tool', 'playwright'], ['Jest', 'Tool', 'jest'], ['PyTest', 'Tool', 'pytest'], ['JUnit', 'Tool', 'junit'],
  ['Material UI', 'Library', 'material ui|material-ui|mui'], ['WordPress', 'Tool', 'wordpress'], ['Power BI', 'Tool', 'power bi|powerbi'], ['Tableau', 'Tool', 'tableau'],
  ['Excel', 'Tool', 'ms excel|microsoft excel|advanced excel', 'Excel'],
  ['MySQL', 'Database', 'mysql'], ['PostgreSQL', 'Database', 'postgresql|postgres|psql'], ['MongoDB', 'Database', 'mongodb|mongo'], ['SQLite', 'Database', 'sqlite'],
  ['Oracle', 'Database', 'oracle db|oracle database|oracle sql', 'Oracle'], ['SQL Server', 'Database', 'sql server|mssql|ms sql'], ['Redis', 'Database', 'redis'],
  ['Elasticsearch', 'Database', 'elasticsearch|elastic search'], ['Firebase', 'Database', 'firebase|firestore'], ['DynamoDB', 'Database', 'dynamodb'], ['MariaDB', 'Database', 'mariadb'],
  ['AWS', 'Cloud', 'aws|amazon web services|ec2|s3|aws lambda'], ['Azure', 'Cloud', 'azure|microsoft azure'], ['GCP', 'Cloud', 'gcp|google cloud|google cloud platform'],
  ['Docker', 'DevOps', 'docker|containerization'], ['Kubernetes', 'DevOps', 'kubernetes|k8s'], ['Jenkins', 'DevOps', 'jenkins'], ['CI/CD', 'DevOps', 'ci/cd|ci cd|cicd|continuous integration'],
  ['GitHub Actions', 'DevOps', 'github actions'], ['Terraform', 'DevOps', 'terraform'], ['Linux', 'DevOps', 'linux|ubuntu|unix'], ['Nginx', 'DevOps', 'nginx'],
  ['Git', 'Tool', 'git|github|gitlab|bitbucket|version control'], ['Jira', 'Tool', 'jira'], ['Postman', 'Tool', 'postman'], ['Figma', 'Tool', 'figma'], ['Webpack', 'Tool', 'webpack'], ['Vite', 'Tool', 'vite'],
  ['OOP', 'Concept', 'oop|oops|object oriented programming|object-oriented programming|object oriented'], ['Data Structures & Algorithms', 'Concept', 'data structures|algorithms|dsa|data structures and algorithms'],
  ['Microservices', 'Concept', 'microservices|micro services|microservice'], ['System Design', 'Concept', 'system design'], ['Machine Learning', 'Concept', 'machine learning|ml'],
  ['Deep Learning', 'Concept', 'deep learning'], ['NLP', 'Concept', 'nlp|natural language processing'], ['Computer Vision', 'Concept', 'computer vision'], ['Generative AI', 'Concept', 'generative ai|genai|gen ai|llm|llms|large language models'],
  ['Data Analysis', 'Concept', 'data analysis|data analytics'], ['Data Visualization', 'Concept', 'data visualization|data visualisation'], ['Unit Testing', 'Concept', 'unit testing|unit tests|test driven development|tdd'],
  ['Agile', 'Concept', 'agile|scrum|kanban'], ['MVC', 'Concept', 'mvc'], ['Responsive Design', 'Concept', 'responsive design|responsive web design|mobile-first'], ['SEO', 'Concept', 'seo'],
  ['ETL', 'Concept', 'etl|data pipelines|data pipeline'], ['Apache Spark', 'Concept', 'apache spark|pyspark', 'Spark'], ['Kafka', 'Concept', 'kafka'], ['RabbitMQ', 'Concept', 'rabbitmq'],
  ['WebSockets', 'Concept', 'websockets|websocket|socket.io'], ['JWT', 'Concept', 'jwt|json web token'], ['OAuth', 'Concept', 'oauth|oauth2'],
  ['Android', 'Framework', 'android|android sdk|android development'], ['iOS', 'Framework', 'ios development|ios sdk', 'iOS'], ['SwiftUI', 'Framework', 'swiftui'], ['Jetpack Compose', 'Framework', 'jetpack compose'],
  ['Objective-C', 'Language', 'objective-c|objective c'], ['MATLAB', 'Language', 'matlab'], ['Perl', 'Language', 'perl'], ['Elixir', 'Language', 'elixir'], ['Solidity', 'Language', 'solidity'],
  ['NestJS', 'Framework', 'nestjs|nest.js'], ['Nuxt', 'Framework', 'nuxt|nuxt.js'], ['Remix', 'Framework', 'remix.run'], ['Electron', 'Framework', 'electron.js|electronjs'], ['Three.js', 'Library', 'three.js|threejs'],
  ['gRPC', 'Concept', 'grpc'], ['Snowflake', 'Database', '', 'Snowflake'], ['BigQuery', 'Database', 'bigquery|big query'], ['Redshift', 'Database', 'redshift'], ['Cassandra', 'Database', 'cassandra'],
  ['ClickHouse', 'Database', 'clickhouse'], ['Supabase', 'Database', 'supabase'], ['NoSQL', 'Concept', 'nosql|no-sql'], ['Hadoop', 'Concept', 'hadoop|hdfs'], ['Hive', 'Concept', 'apache hive', 'Hive'],
  ['Airflow', 'Tool', 'airflow|apache airflow'], ['dbt', 'Tool', '', 'dbt'], ['Databricks', 'Tool', '', 'Databricks'], ['Looker', 'Tool', 'looker|looker studio'], ['SAP', 'Tool', '', 'SAP'],
  ['Salesforce', 'Tool', 'salesforce crm|salesforce development|apex', 'Salesforce'], ['ServiceNow', 'Tool', '', 'ServiceNow'], ['Photoshop', 'Tool', 'photoshop|adobe photoshop'], ['Illustrator', 'Tool', 'adobe illustrator', 'Illustrator'],
  ['Ansible', 'DevOps', 'ansible'], ['Helm', 'DevOps', 'helm charts', 'Helm'], ['Prometheus', 'DevOps', 'prometheus'], ['Grafana', 'DevOps', 'grafana'], ['ArgoCD', 'DevOps', 'argocd|argo cd'],
  ['Maven', 'Tool', 'maven'], ['Gradle', 'Tool', 'gradle'], ['Cypress', 'Tool', 'cypress'], ['Appium', 'Tool', 'appium'], ['TestNG', 'Tool', 'testng'], ['Storybook', 'Tool', 'storybook'],
  ['Hugging Face', 'Library', 'hugging face|huggingface'], ['Transformers', 'Concept', 'transformer models|transformers library'], ['RAG', 'Concept', 'retrieval augmented generation|retrieval-augmented generation', 'RAG'],
  ['Prompt Engineering', 'Concept', 'prompt engineering'], ['MLOps', 'Concept', 'mlops|ml ops'], ['Statistics', 'Concept', 'statistics|statistical analysis|statistical modeling|statistical modelling'],
  ['A/B Testing', 'Concept', 'a/b testing|ab testing|a/b tests'], ['Distributed Systems', 'Concept', 'distributed systems|distributed computing'], ['Design Patterns', 'Concept', 'design patterns'],
  ['API Design', 'Concept', 'api design'], ['Accessibility', 'Concept', 'web accessibility|wcag|a11y'], ['Performance Optimization', 'Concept', 'performance optimization|performance optimisation|performance tuning'],
  ['Manual Testing', 'Concept', 'manual testing'], ['Automation Testing', 'Concept', 'automation testing|test automation'], ['Communication', 'Soft skill', 'communication skills|communication'],
  ['Problem Solving', 'Soft skill', 'problem solving|problem-solving'], ['Teamwork', 'Soft skill', 'teamwork|team player|collaboration'],
];
const SKILLS = SKILL_DEFS.map(([name, cat, al, cs]) => {
  const aliases = (al ? al.split('|') : []).filter(Boolean);
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\\/#]/g, m => '\\' + m);
  const mk = (list, flags) => list.length ? new RegExp('(?<![A-Za-z0-9])(?:' + list.map(reEsc).sort((a, b) => b.length - a.length).join('|') + ')(?![A-Za-z0-9+#])', flags) : null;
  return { name, cat, aliases, re: mk(aliases, 'i'), reCS: mk(cs ? cs.split('|') : [], ''), lc: name.toLowerCase() };
});
const SKILL_BY_LC = new Map(); SKILLS.forEach(s => { SKILL_BY_LC.set(s.lc, s); s.aliases.forEach(a => { if (!SKILL_BY_LC.has(a)) SKILL_BY_LC.set(a, s); }); });
function canonSkill(n) { const k = String(n || '').trim(); if (!k) return ''; const s = SKILL_BY_LC.get(k.toLowerCase()); return s ? s.name : k.replace(/\s+/g, ' '); }
function skillCat(n) { const s = SKILL_BY_LC.get(String(n).toLowerCase()); return s ? s.cat : 'Other'; }
function detectSkills(text) {
  const t = String(text || ''); if (!t) return [];
  const found = [];
  for (const s of SKILLS) {
    let idx = -1;
    if (s.re) { const m = s.re.exec(t); if (m) idx = m.index; }
    if (s.reCS) { const m = s.reCS.exec(t); if (m && (idx < 0 || m.index < idx)) idx = m.index; }
    if (idx >= 0) found.push([idx, s.name]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
const lcSet = arr => new Set((arr || []).map(x => canonSkill(x).toLowerCase()));

/* ============ Text helpers ============ */
const STOP = new Set('a an and the of to in for on with at by from as is are be or this that will you your we our us it its their they them who what which into across within using use used via per over under can may must should would could also etc such other more most very well good strong excellent ability able work working team teams role roles job jobs candidate candidates experience experienced years year required requirements preferred plus knowledge understanding skills skill familiarity familiar including include includes responsibilities responsible looking opportunity company join new help make build building based related relevant hands-on hands least minimum etc. e.g. i.e. like day days time part full high quality key core great environment fast-paced passionate motivated'.split(' '));
function stem(w) { if (w.length > 6 && w.endsWith('ing')) return w.slice(0, -3); if (w.length > 5 && w.endsWith('ed')) return w.slice(0, -2); if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1); return w; }
function keywords(text, max = 40) {
  const freq = new Map();
  String(text || '').toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/\s+/).forEach(w => {
    w = w.replace(/^[.-]+|[.-]+$/g, ''); if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) return;
    const s = stem(w); freq.set(s, (freq.get(s) || 0) + 1);
  });
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(x => x[0]);
}
const CITY_DEFS = [['Hyderabad', 'hyderabad|secunderabad|hitec city|gachibowli'], ['Bengaluru', 'bengaluru|bangalore|blr'], ['Chennai', 'chennai|madras'], ['Mumbai', 'mumbai|bombay|navi mumbai|thane'],
  ['Pune', 'pune'], ['Delhi NCR', 'delhi ncr|ncr|delhi|new delhi|gurugram|gurgaon|noida|greater noida|faridabad|ghaziabad'], ['Kolkata', 'kolkata|calcutta'], ['Ahmedabad', 'ahmedabad'],
  ['Kochi', 'kochi|cochin|ernakulam'], ['Thiruvananthapuram', 'thiruvananthapuram|trivandrum'], ['Coimbatore', 'coimbatore'], ['Visakhapatnam', 'visakhapatnam|vizag'], ['Vijayawada', 'vijayawada'],
  ['Jaipur', 'jaipur'], ['Chandigarh', 'chandigarh|mohali'], ['Indore', 'indore'], ['Bhubaneswar', 'bhubaneswar'], ['Mysuru', 'mysuru|mysore'], ['Mangaluru', 'mangaluru|mangalore'],
  ['Nagpur', 'nagpur'], ['Lucknow', 'lucknow'], ['Warangal', 'warangal'], ['Guntur', 'guntur'], ['Tirupati', 'tirupati'], ['Madurai', 'madurai'], ['Surat', 'surat'], ['Vadodara', 'vadodara|baroda'], ['Bhopal', 'bhopal']];
const CITIES = CITY_DEFS.map(([n, a]) => ({ n, re: new RegExp('(?<![a-z])(' + a + ')(?![a-z])', 'i') }));
function detectCities(text) { const t = String(text || ''); return CITIES.filter(c => c.re.test(t)).map(c => c.n); }
function canonCity(c) { const d = detectCities(c); return d[0] || String(c || '').trim(); }
const isRemoteText = t => /\bremote\b|work from home|\bwfh\b|anywhere in india/i.test(t || '');
function detectWorkMode(t) { t = String(t || ''); if (/\bhybrid\b/i.test(t)) return 'hybrid'; if (isRemoteText(t)) return 'remote'; if (/on-?site|work from office|\bwfo\b|in-office|office-based/i.test(t)) return 'onsite'; return null; }
function detectEmployment(t) {
  t = String(t || ''); const out = [];
  if (/\bintern(ship)?s?\b/i.test(t)) out.push('internship'); if (/full[- ]?time|permanent/i.test(t)) out.push('full_time');
  if (/\bcontract(ual)?\b|freelanc/i.test(t)) out.push('contract'); if (/part[- ]?time/i.test(t)) out.push('part_time');
  return out;
}
const EMP_LABEL = { full_time: 'Full-time', internship: 'Internship', contract: 'Contract', part_time: 'Part-time' };
function parseSalary(t) {
  t = String(t || '').replace(/,/g, '');
  let m = t.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|l\b)?\s*(?:-|–|—|to|and)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?(?:\s*per\s*annum)?|l\b|lacs?)/i);
  if (m) { const a = +m[1], b = +m[2]; if (a < 200 && b < 200) return { min: Math.round(a * 1e5), max: Math.round(b * 1e5) }; }
  m = t.match(/(?:₹|rs\.?|inr)\s*(\d{5,8})\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*(\d{5,8})\s*(per\s*(annum|year)|p\.?a\.?|\/\s*year|ctc)?/i);
  if (m) { let a = +m[1], b = +m[2]; if (/month/i.test(t.slice(m.index, m.index + 80)) && b < 500000) { a *= 12; b *= 12; } return { min: a, max: b }; }
  m = t.match(/(?:above|over|at least|minimum|min\.?|upto|up to|till)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lpa|lakhs?)/i);
  if (m) { const v = Math.round(+m[1] * 1e5); return /up\s?to|till/i.test(m[0]) ? { min: null, max: v } : { min: v, max: null }; }
  m = t.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lpa|lakhs? per annum)/i);
  if (m) { const v = Math.round(+m[1] * 1e5); return { min: v, max: v }; }
  return { min: null, max: null };
}
const EXP_NOISE = /founded|since (19|20)\d\d|years? ago|years? old|anniversar|in business|over the (past|last)|for (over|more than) \d+ years,? (we|our|the company)|\d+\+? years? (of )?(history|heritage|legacy)/i;
function expFromText(t) {
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i); if (m && +m[1] <= +m[2] && +m[2] < 40) return { min: +m[1], max: +m[2] };
  m = t.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)/i); if (m && +m[1] < 40) return { min: +m[1], max: null };
  m = t.match(/(?:minimum|at least|min\.?|atleast)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i); if (m && +m[1] < 40) return { min: +m[1], max: null };
  m = t.match(/(?:up ?to|under|less than|maximum of)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i); if (m && +m[1] < 40) return { min: 0, max: +m[1] };
  m = t.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:relevant\s*|professional\s*|industry\s*|work\s*|hands[- ]on\s*)*(?:experience|exp\b)/i); if (m && +m[1] < 40) return { min: +m[1], max: null };
  return null;
}
function parseExperience(t) {
  t = String(t || '');
  const fresher = () => /\bfreshers?\b|entry[- ]level|graduate trainee|\b0\s*years?|no (prior |previous )?experience|recent graduates?|new grads?/i.test(t) ? { min: 0, max: /\bfreshers?\b/i.test(t) ? 1 : 2 } : null;
  if (t.length < 300) return expFromText(t) || fresher() || { min: null, max: null };
  // Long text (a full posting): only trust lines that are about the candidate's experience.
  const lines = t.split(/\n|(?<=[.;!?])\s+/).filter(l => /\d/.test(l) && /years?|yrs?/i.test(l) && !EXP_NOISE.test(l));
  const about = lines.filter(l => /experience|\bexp\b|professional|hands[- ]on|working (with|in|on|as)|industry|background|relevant|proven|track record|expertise|years? (of|in) /i.test(l));
  for (const l of about) { const r = expFromText(l); if (r) return r; }
  return fresher() || { min: null, max: null };
}
const DEG = [
  [5, /ph\.?\s?d\b|doctorate|doctoral/i],
  [4, /m\.?\s?tech\b|master|\bmca\b|\bmba\b|m\.?\s?sc\b|post[- ]?graduat|\bpgdm\b|\bm\.e\b|\bm\.s\b/i, /\bM\.?E\.?(?![a-z])|\bM\.?S\.?(?![a-z])/],
  [3, /b\.?\s?tech\b|bachelor|\bbca\b|b\.?\s?sc\b|b\.?\s?com\b|\bbba\b|undergraduate|graduation|\bgraduate\b|\bdegree\b|\bb\.e\b|\bb\.s\b/i, /\bB\.?E\.?(?![a-z])|\bB\.?S\.?(?![a-z])|\bB\.?A\.?(?![a-z])/],
  [2, /diploma|polytechnic/i],
  [1, /12th|\bxii\b|class\s*12|intermediate|\bhsc\b|senior secondary|higher secondary|\bpuc\b|pre-university/i],
  [0, /10th|class\s*10|class\s*x\b|\bssc\b|matriculation|secondary school|\bcbse\b|\bicse\b/i],
];
function degreeLevels(t) { t = String(t || ''); return DEG.filter(([, re, cs]) => re.test(t) || (cs && cs.test(t))).map(x => x[0]); }
function degreeLevel(t) { const l = degreeLevels(t); return l.length ? Math.max(...l) : null; }
const DEG_NAME = { 5: 'Doctorate', 4: "Master's", 3: "Bachelor's", 2: 'Diploma', 1: 'Class 12', 0: 'Class 10' };
// A line such as "Bachelor's or Master's degree" asks for the lower of the two.
function jobEduLevel(job) {
  const t = job.education || ''; if (!t) return null;
  if (/any graduate|any degree/i.test(t)) return 3;
  const l = degreeLevels(t).filter(x => x >= 2); return l.length ? Math.min(...l) : null;
}
const EDU_REQ = /bachelor|master'?s|b\.?\s?tech\b|m\.?\s?tech\b|\bmca\b|\bbca\b|b\.?\s?sc\b|m\.?\s?sc\b|\bmba\b|ph\.?\s?d\b|degree (in|or|from)|(university|college|engineering|graduate|undergraduate|technical|relevant|equivalent) degree|any graduate|any degree|diploma in|\bb\.e\b|\bm\.e\b/i;
const EDU_REQ_CS = /\bB\.?E\.?(?![a-z])|\bB\.?S\.?(?![a-z])|\bM\.?S\.?(?![a-z])|\bBTech\b|\bMTech\b/;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const DATE_TOK = '(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s*[\'’]?\\d{2,4}|\\d{1,2}\\/\\d{2,4}|\\d{4})';
const DATE_RANGE = new RegExp('(' + DATE_TOK + ')\\s*(?:-|–|—|to|till)\\s*(' + DATE_TOK + '|present|current|now|till date|ongoing)', 'i');
function parseDateTok(s) {
  if (!s) return null; s = s.toLowerCase().trim();
  if (/present|current|now|till date|ongoing/.test(s)) return new Date();
  let m = s.match(/^([a-z]+)\.?\s*[\'’]?(\d{2,4})/); if (m && MONTHS[m[1].slice(0, 3)] != null) { let y = +m[2]; if (y < 100) y += 2000; return new Date(y, MONTHS[m[1].slice(0, 4) === 'sept' ? 'sep' : m[1].slice(0, 3)], 1); }
  m = s.match(/^(\d{1,2})\/(\d{2,4})/); if (m) { let y = +m[2]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, 1); }
  m = s.match(/^(\d{4})/); if (m) return new Date(+m[1], 0, 1);
  return null;
}
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoMonth = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '';
function monthsBetween(a, b) { const s = a ? new Date(a + (a.length === 7 ? '-01' : '')) : null; const e = b ? new Date(b + (b.length === 7 ? '-01' : '')) : new Date(); if (!s || isNaN(s) || isNaN(e)) return 0; return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1); }
const isIntern = e => /intern|trainee|apprentice/i.test((e.role || '') + ' ' + (e.type || ''));
function candidateYears(p) {
  if (!p) return 0;
  if (p.totalYears !== '' && p.totalYears != null && !isNaN(p.totalYears)) return +p.totalYears;
  const m = sum((p.experiences || []).filter(e => !isIntern(e)).map(e => monthsBetween(e.start, e.end)));
  return Math.round(m / 12 * 10) / 10;
}
function eduLevel(p) { const lv = (p && p.education || []).map(e => degreeLevel(e.degree)).filter(x => x != null); return lv.length ? Math.max(...lv) : null; }
function profileSkillNames(p) {
  if (!p) return [];
  return uniqCI([...(p.skills || []).map(canonSkill), ...(p.projects || []).flatMap(pr => splitList(pr.technologies).map(canonSkill)), ...(p.experiences || []).flatMap(e => detectSkills(e.description))]);
}

/* ============ Resume parsing (local engine) ============ */
const HEADS = [
  ['summary', /^(professional\s+|career\s+)?(summary|profile|objective|about me|professional profile)$/i],
  ['skills', /^(technical\s+|key\s+|core\s+|it\s+)?(skills|skill set|skills summary|competencies|technologies|tech stack|technical proficiency|technical expertise)$/i],
  ['education', /^(education|academics?|academic (details|background|qualifications?)|educational (details|qualifications?)|qualifications?)$/i],
  ['experience', /^(work\s+|professional\s+|relevant\s+)?(experience|employment( history)?|work history|internships?|internship experience|experience & internships)$/i],
  ['projects', /^(academic\s+|personal\s+|key\s+|major\s+|selected\s+)?projects?( undertaken)?$/i],
  ['certifications', /^(certifications?|certificates?|courses|licenses|certifications? & courses|trainings?)$/i],
  ['achievements', /^(achievements?|awards?|honou?rs|accomplishments|awards & achievements)$/i],
  ['other', /^(languages( known)?|hobbies|interests|extra[- ]?curricular( activities)?|activities|declaration|personal (details|information)|references|strengths|publications|volunteer(ing)?|positions of responsibility)$/i],
];
const BULLET_RE = /^\s*(?:[•\-–*▪●◦·○■►✓➢]|\d+[.)])\s+/;
function headingOf(line) {
  const t = line.replace(BULLET_RE, '').replace(/[:|]+\s*$/, '').trim();
  if (t.length > 42 || t.split(/\s+/).length > 5) return null;
  for (const [k, re] of HEADS) if (re.test(t)) return k;
  return null;
}
function parseResumeLocal(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const sec = { top: [] }; let cur = 'top';
  for (const l of lines) { const h = headingOf(l); if (h) { cur = h; sec[cur] = sec[cur] || []; continue; } (sec[cur] = sec[cur] || []).push(l); }
  const all = lines.join('\n');
  const email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0];
  const phone = ((all.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/) || all.match(/\+?\d[\d\s-]{8,14}\d/) || [''])[0]).trim();
  const linkedin = (all.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w-]+\/?/i) || [''])[0];
  const github = (all.match(/(?:https?:\/\/)?github\.com\/[\w-]+\/?/i) || [''])[0];
  const portfolio = ((all.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[\w.-]+\.[a-z]{2,}[\w\/.-]*/i) || [''])[0]);
  let name = '';
  for (const l of (sec.top || lines).slice(0, 6)) { const c = l.split(/[|•,]/)[0].trim(); if (/^[A-Za-z][A-Za-z.' ]{2,40}$/.test(c) && c.split(' ').length >= 2 && c.split(' ').length <= 4 && !headingOf(c)) { name = c.replace(/\b([a-z])/g, m => m.toUpperCase()); if (c === c.toUpperCase()) name = c.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()); break; } }
  const location = detectCities((sec.top || []).slice(0, 8).join(' '))[0] || '';
  const summary = (sec.summary || []).join(' ').slice(0, 900);
  const skills = uniqCI([...detectSkills((sec.skills || []).join('\n')), ...detectSkills(all)]).filter(s => skillCat(s) !== 'Soft skill' || /communication|problem|team/i.test((sec.skills || []).join(' ')));
  // entries splitter for experience/projects
  const splitEntries = (ls, isNewHead) => {
    const out = []; let e = null;
    for (const l of ls) {
      const bullet = BULLET_RE.test(l); const clean = l.replace(BULLET_RE, '').trim();
      if (!bullet && (!e || isNewHead(l, e))) { e = { head: [clean], body: [] }; out.push(e); }
      else if (!bullet && e && e.body.length === 0 && e.head.length < 3 && clean.length < 110) e.head.push(clean);
      else { if (!e) { e = { head: [], body: [] }; out.push(e); } e.body.push(clean); }
    }
    return out;
  };
  const expEntries = splitEntries(sec.experience || [], (l, e) => DATE_RANGE.test(l) && (e.body.length > 0 || e.head.some(h => DATE_RANGE.test(h))) || (e.body.length > 0 && l.length < 90 && !/[.;]$/.test(l)));
  const ROLE_RE = /intern|developer|engineer|analyst|trainee|associate|manager|consultant|designer|lead|executive|programmer|architect|specialist|administrator|tester|scientist/i;
  const experiences = expEntries.filter(e => e.head.length).map(e => {
    const head = e.head.join(' | '); const dm = head.match(DATE_RANGE);
    const start = dm ? isoMonth(parseDateTok(dm[1])) : ''; const endRaw = dm ? dm[2] : ''; const end = /present|current|now|till|ongoing/i.test(endRaw) ? '' : isoMonth(parseDateTok(endRaw));
    const parts = head.replace(DATE_RANGE, '').replace(/[(\[]\s*[)\]]/g, ' ').split(/\s+(?:at|@)\s+|\s*[|,–—]\s*|\s+-\s+/).map(s => s.trim()).filter(s => s && s.length > 1 && !/^\(?\)?$/.test(s) && !detectCities(s).length || (s && s.length > 20));
    let role = parts.find(p => ROLE_RE.test(p)) || parts[0] || ''; let employer = parts.find(p => p !== role && !DATE_RANGE.test(p) && !/^\d/.test(p)) || '';
    return { id: uid('x'), employer: employer.slice(0, 80), role: role.slice(0, 80), start, end, current: dm ? /present|current|now|till|ongoing/i.test(endRaw) : false, description: e.body.join('\n').slice(0, 1500) };
  }).slice(0, 8);
  const projEntries = splitEntries(sec.projects || [], (l, e) => e.body.length > 0 && l.length < 100 && !/[.;]$/.test(l));
  const projects = projEntries.filter(e => e.head.length || e.body.length).map(e => {
    const headRaw = e.head.join(' ') || e.body[0] || 'Project';
    const techLine = [...e.head, ...e.body].find(l => /tech(nologies|nology| stack)?\s*(used)?\s*:/i.test(l));
    const name = headRaw.split(/\s*[|–—:(]\s*|\s+-\s+/)[0].trim().slice(0, 80);
    const techs = uniqCI([...detectSkills(techLine || ''), ...detectSkills(e.head.join(' ') + '\n' + e.body.join('\n'))]);
    return { id: uid('p'), name, technologies: techs.join(', '), description: e.body.filter(l => l !== techLine).join('\n').slice(0, 1200), link: ((e.head.join(' ') + e.body.join(' ')).match(/https?:\/\/\S+/) || [''])[0] };
  }).filter(p => p.name).slice(0, 10);
  // education
  const eduLines = sec.education || [];
  const education = []; let cur2 = null;
  for (const l of eduLines) {
    const clean = l.replace(BULLET_RE, '');
    if (degreeLevel(clean) != null && (!cur2 || cur2.degree)) { cur2 = { id: uid('e'), degree: '', institution: '', year: '', score: '' }; education.push(cur2); }
    if (!cur2) { cur2 = { id: uid('e'), degree: '', institution: '', year: '', score: '' }; education.push(cur2); }
    if (!cur2.degree && degreeLevel(clean) != null) cur2.degree = clean.split(/\s*[|,–—]\s*|\s+-\s+/)[0].slice(0, 90);
    else if (!cur2.institution && /universit|college|institute|school|iit|nit|iiit|academy|vidyalaya/i.test(clean)) cur2.institution = clean.split(/\s*[|,–—]\s*/)[0].slice(0, 100);
    const ys = clean.match(/(?:19|20)\d{2}/g); if (ys && !cur2.year) cur2.year = ys[ys.length - 1];
    const sc = clean.match(/(?:cgpa|gpa|sgpa)\s*[:\-]?\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?|(\d(?:\.\d+)?)\s*\/\s*10|(\d{2}(?:\.\d+)?)\s*%/i);
    if (sc && !cur2.score) cur2.score = sc[1] ? sc[1] + ' CGPA' : sc[2] ? sc[2] + '/10' : sc[3] + '%';
    if (!cur2.institution && cur2.degree && /universit|college|institute|school/i.test(clean)) { const parts = clean.split(/\s*[|,–—]\s*/); cur2.institution = (parts.find(p => /universit|college|institute|school/i.test(p)) || '').slice(0, 100); }
  }
  const certifications = (sec.certifications || []).map(l => l.replace(BULLET_RE, '')).filter(Boolean).slice(0, 15);
  const achievements = (sec.achievements || []).map(l => l.replace(BULLET_RE, '')).filter(Boolean).slice(0, 15);
  const p = { name, email, phone, location, linkedin, github, portfolio: portfolio.replace(/[).,]+$/, ''), summary, skills, experiences, projects, education: education.filter(e => e.degree || e.institution), certifications, achievements };
  const yrs = candidateYears({ experiences });
  p.totalYears = yrs; p.experienceLevel = levelFor(yrs);
  return p;
}
function levelFor(y) { return y < 1 ? 'Fresher' : y < 3 ? 'Junior (1–3 yrs)' : y < 6 ? 'Mid-level (3–6 yrs)' : 'Senior (6+ yrs)'; }
async function extractFileText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    await lib('pdfjs'); const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfjs[1];
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const out = [];
    for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
      const page = await doc.getPage(i); const tc = await page.getTextContent();
      const rows = [];
      for (const it of tc.items) { if (!it.str) continue; const y = Math.round(it.transform[5]); let r = rows.find(r => Math.abs(r.y - y) <= 3); if (!r) { r = { y, items: [] }; rows.push(r); } r.items.push({ x: it.transform[4], s: it.str, w: it.width }); }
      rows.sort((a, b) => b.y - a.y).forEach(r => { r.items.sort((a, b) => a.x - b.x); let line = '', lastEnd = null; for (const it of r.items) { if (lastEnd != null && it.x - lastEnd > 2.5 && !line.endsWith(' ') && !it.s.startsWith(' ')) line += ' '; line += it.s; lastEnd = it.x + (it.w || 0); } out.push(line.trim()); });
      out.push('');
    }
    return { text: out.join('\n').replace(/\n{3,}/g, '\n\n'), kind: 'pdf' };
  }
  if (name.endsWith('.docx')) { await lib('mammoth'); const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); return { text: r.value, kind: 'docx' }; }
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) return { text: await file.text(), kind: 'txt' };
  if (name.endsWith('.doc')) throw new Error('Old .doc files can’t be read here. Save it as .docx or PDF and upload again.');
  throw new Error('Unsupported file type. Upload a PDF, DOCX or TXT resume.');
}
const PROFILE_SCHEMA = `{"name":string,"email":string,"phone":string,"location":string (city),"linkedin":string,"github":string,"portfolio":string,"summary":string,"totalYears":number (full-time experience only, internships excluded),"skills":[string],"experiences":[{"employer":string,"role":string,"start":"YYYY-MM","end":"YYYY-MM" or "" if current,"description":string}],"projects":[{"name":string,"technologies":"comma separated","description":string,"link":string}],"education":[{"degree":string,"institution":string,"year":string,"score":string}],"certifications":[string],"achievements":[string]}`;
function normalizeProfile(p) {
  p = p || {};
  const arr = v => Array.isArray(v) ? v : [];
  const out = {
    name: String(p.name || ''), email: String(p.email || ''), phone: String(p.phone || ''), location: String(p.location || ''), linkedin: String(p.linkedin || ''), github: String(p.github || ''), portfolio: String(p.portfolio || ''),
    summary: String(p.summary || ''), skills: uniqCI(arr(p.skills).map(canonSkill)),
    experiences: arr(p.experiences).map(e => ({ id: e.id || uid('x'), employer: String(e.employer || ''), role: String(e.role || ''), start: String(e.start || '').slice(0, 7), end: String(e.end || '').slice(0, 7), description: String(e.description || '') })),
    projects: arr(p.projects).map(x => ({ id: x.id || uid('p'), name: String(x.name || ''), technologies: Array.isArray(x.technologies) ? x.technologies.join(', ') : String(x.technologies || ''), description: String(x.description || ''), link: String(x.link || '') })).filter(x => x.name),
    education: arr(p.education).map(e => ({ id: e.id || uid('e'), degree: String(e.degree || ''), institution: String(e.institution || ''), year: String(e.year || ''), score: String(e.score || '') })),
    certifications: arr(p.certifications).map(String), achievements: arr(p.achievements).map(String),
  };
  out.totalYears = (p.totalYears !== undefined && p.totalYears !== '' && !isNaN(p.totalYears)) ? +p.totalYears : candidateYears({ experiences: out.experiences });
  out.experienceLevel = p.experienceLevel || levelFor(out.totalYears);
  return out;
}

/* ============ Natural-language job preferences ============ */
const ROLE_NOUN = '(?:developer|engineer|analyst|intern|designer|architect|scientist|tester|administrator|consultant|programmer|specialist|associate|trainee|manager)';
function parsePrefsLocal(text) {
  const t = String(text || '');
  const titles = [];
  const chunks = t.split(/\b(?:and|or)\b|[,;/]|\.(?=\s)/i);
  const TITLE_STOP = /^(find|search|get|show|me|i|am|im|i'm|looking|for|a|an|the|want|need|some|any|entry-level|entry|level|fresher|freshers|roles?|jobs?|positions?|openings?|as|in|at|prefer|preferably|remote|hybrid|onsite|only|also|like|interested|suitable|good|best|top|\d+)$/i;
  for (const c of chunks) {
    const m = c.match(new RegExp('((?:[A-Za-z.+#-]+\\s+){0,4})(' + ROLE_NOUN + ')s?\\b', 'i'));
    if (!m) continue;
    let words = (m[1] || '').trim().split(/\s+/).filter(Boolean);
    while (words.length && TITLE_STOP.test(words[0])) words.shift();
    const title = [...words, m[2]].join(' ').replace(/\b([a-z])/g, x => x.toUpperCase()).replace(/\bJs\b/g, 'JS').replace(/\bUi\b/g, 'UI').replace(/\bUx\b/g, 'UX').replace(/\bQa\b/g, 'QA').replace(/\bAi\b/g, 'AI').replace(/\bMl\b/g, 'ML');
    if (words.length || /intern|analyst|designer/i.test(m[2])) titles.push(title);
  }
  const exp = parseExperience(t);
  const sal = parseSalary(t);
  const remote = /\bremote\b/i.test(t), hybrid = /\bhybrid\b/i.test(t), onsite = /on-?site|office/i.test(t);
  const cities = detectCities(t);
  const locs = [...cities, ...(remote ? ['Remote'] : [])];
  const fresher = /\bfreshers?\b|entry[- ]level|graduate/i.test(t);
  let titleList = uniqCI(titles);
  if (fresher || (exp.max != null && exp.max <= 2)) titleList = uniqCI([...titleList, ...titleList.filter(x => !/^(junior|senior|lead|associate|trainee)/i.test(x) && !/intern/i.test(x)).map(x => 'Junior ' + x)]);
  const companyTypes = [];
  if (/startup/i.test(t)) companyTypes.push('Startup'); if (/product[- ]based|product compan/i.test(t)) companyTypes.push('Product company'); if (/service[- ]based|it services/i.test(t)) companyTypes.push('IT services');
  if (/\bmnc/i.test(t)) companyTypes.push('MNC'); if (/fresher (opportunities|friendly|hiring)|offering fresher|hire freshers/i.test(t)) companyTypes.push('Fresher-friendly');
  const industries = ['fintech', 'edtech', 'healthtech', 'e-commerce', 'ecommerce', 'saas', 'banking', 'gaming', 'logistics', 'retail', 'insurance', 'telecom', 'automotive', 'media'].filter(w => new RegExp('\\b' + w + '\\b', 'i').test(t)).map(w => w === 'ecommerce' ? 'E-commerce' : w[0].toUpperCase() + w.slice(1));
  let emp = detectEmployment(t); if (!emp.length) emp = ['full_time'];
  return {
    titles: titleList, skills: detectSkills(t), locations: uniqCI(locs), workModes: uniq([remote && 'remote', hybrid && 'hybrid', onsite && 'onsite']),
    expMin: exp.min ?? (fresher ? 0 : null), expMax: exp.max ?? (fresher ? 2 : null), salaryMin: sal.min, salaryMax: sal.max, currency: 'INR', period: 'year',
    employmentTypes: emp, companyTypes, industries, other: '', raw: t,
  };
}
const PREFS_SCHEMA = `{"job_titles":[string],"skills":[string],"locations":[string] (cities; use "Remote" for remote),"work_modes":["remote"|"hybrid"|"onsite"],"experience":{"min_years":number|null,"max_years":number|null},"salary":{"min":number|null,"max":number|null,"currency":"INR","period":"year"} (absolute rupees per year, so 4 LPA = 400000),"employment_type":["full_time"|"internship"|"contract"|"part_time"],"company_types":[string],"industries":[string],"other_requirements":string,"ambiguities":[string] (anything unclear that the user should confirm)}`;
function prefsFromAI(o, raw) {
  const a = v => Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  const num = v => (v === null || v === undefined || v === '' || isNaN(v)) ? null : +v;
  return {
    titles: uniqCI(a(o.job_titles)), skills: uniqCI(a(o.skills).map(canonSkill)), locations: uniqCI(a(o.locations).map(x => /remote/i.test(x) ? 'Remote' : canonCity(x))),
    workModes: a(o.work_modes).map(x => x.toLowerCase()).filter(x => ['remote', 'hybrid', 'onsite'].includes(x)),
    expMin: num(o.experience && o.experience.min_years), expMax: num(o.experience && o.experience.max_years),
    salaryMin: num(o.salary && o.salary.min), salaryMax: num(o.salary && o.salary.max), currency: 'INR', period: 'year',
    employmentTypes: a(o.employment_type).filter(x => EMP_LABEL[x]), companyTypes: a(o.company_types), industries: a(o.industries), other: String(o.other_requirements || ''), raw,
    ambiguities: a(o.ambiguities),
  };
}
function prefsToApiJSON(p) {
  return { job_titles: p.titles, locations: p.locations, experience: { min_years: p.expMin, max_years: p.expMax }, salary: { min: p.salaryMin, max: p.salaryMax, currency: 'INR', period: 'year' }, employment_type: p.employmentTypes, work_modes: p.workModes, skills: p.skills, company_types: p.companyTypes, industries: p.industries };
}
function prefAmbiguities(p) {
  const out = [];
  if (!p.titles.length) out.push('No job title was recognised. Add at least one role.');
  if (!p.locations.length) out.push('No location given. Jobs anywhere will score as "location unknown".');
  if (p.salaryMin == null && p.salaryMax == null) out.push('No salary range given. Compensation will not affect scores.');
  if (p.expMin == null) out.push('No experience range given.');
  return out;
}

/* ============ Job platforms & discovery links ============ */
const PLATFORMS = [
  { id: 'boards', name: 'Company career pages', status: 'Connected', note: 'Greenhouse, Lever, Ashby and SmartRecruiters publish each company’s open roles through a public API. Searched live from your browser; every job links to the employer’s own application page.' },
  { id: 'remote', name: 'Remotive and Remote OK', status: 'Connected', note: 'Public remote-job APIs. Only roles open to India or worldwide are kept; each links back to the original listing.' },
  { id: 'adzuna', name: 'Adzuna', status: 'Limited', note: 'India-wide search through the scheduled server job. Needs your free Adzuna key in GitHub secrets (README).' },
  { id: 'linkedin', name: 'LinkedIn', status: 'Manual', note: 'LinkedIn prohibits unauthorized scraping and automated applications. Open the search, then import jobs by link and description.' },
  { id: 'naukri', name: 'Naukri', status: 'Manual', note: 'No public API for individual job seekers. Use the search link, then import.' },
  { id: 'indeed', name: 'Indeed', status: 'Manual', note: 'Partner APIs are for employers and ATS vendors. Search, then import.' },
  { id: 'careers', name: 'Other company career pages', status: 'Manual', note: 'Workday, Workable and custom career sites: import each posting by link and description.' },
  { id: 'internshala', name: 'Internshala', status: 'Manual', note: 'Search, then import.' },
  { id: 'wellfound', name: 'Wellfound', status: 'Manual', note: 'Startup roles. Search, then import.' },
  { id: 'foundit', name: 'Foundit', status: 'Manual', note: 'Search, then import.' },
];
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function discoveryLinks(prefs) {
  const p = prefs || {}; const title = (p.titles || []).find(x => !/^junior /i.test(x)) || (p.titles || [])[0] || 'Software Developer';
  const cities = (p.locations || []).filter(l => l !== 'Remote'); const city = cities[0] || ''; const remote = (p.locations || []).includes('Remote') || (p.workModes || []).includes('remote');
  const q = encodeURIComponent(title); const l = encodeURIComponent(city || (remote ? 'India' : 'India'));
  const fresh = p.expMax != null && p.expMax <= 2;
  const out = [];
  const locsForLinks = cities.length ? cities.slice(0, 3) : [''];
  for (const c of locsForLinks) {
    const lc = encodeURIComponent(c || 'India');
    out.push({ platform: 'linkedin', label: `LinkedIn · ${title}${c ? ' · ' + c : ''}`, url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${lc}${fresh ? '&f_E=1%2C2' : ''}` });
    out.push({ platform: 'naukri', label: `Naukri · ${title}${c ? ' · ' + c : ''}`, url: `https://www.naukri.com/${slug(title)}-jobs${c ? '-in-' + slug(c === 'Delhi NCR' ? 'delhi-ncr' : c) : ''}${p.expMin != null ? '?experience=' + Math.floor(p.expMin) : ''}` });
    out.push({ platform: 'indeed', label: `Indeed · ${title}${c ? ' · ' + c : ''}`, url: `https://in.indeed.com/jobs?q=${q}&l=${lc}` });
    out.push({ platform: 'foundit', label: `Foundit · ${title}${c ? ' · ' + c : ''}`, url: `https://www.foundit.in/srp/results?query=${q}${c ? '&locations=' + lc : ''}` });
  }
  if (remote) out.push({ platform: 'linkedin', label: `LinkedIn · ${title} · Remote`, url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=India&f_WT=2` });
  out.push({ platform: 'internshala', label: `Internshala · ${title}`, url: `https://internshala.com/jobs/keywords-${encodeURIComponent(title.toLowerCase())}` });
  out.push({ platform: 'wellfound', label: `Wellfound · ${title}`, url: `https://wellfound.com/role/${slug(title)}` });
  out.push({ platform: 'careers', label: `Greenhouse & Lever boards · ${title}`, url: `https://www.google.com/search?q=${encodeURIComponent(`(site:boards.greenhouse.io OR site:jobs.lever.co OR site:apply.workable.com) "${title}" ${city || 'India'}`)}` });
  out.push({ platform: 'careers', label: `Google Jobs · ${title} ${city || 'India'}`, url: `https://www.google.com/search?q=${encodeURIComponent(title + ' jobs ' + (city || 'India'))}&ibp=htl;jobs` });
  return out;
}
function detectSource(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('linkedin.')) return 'linkedin'; if (u.includes('naukri.')) return 'naukri'; if (u.includes('indeed.')) return 'indeed'; if (u.includes('internshala.')) return 'internshala';
  if (u.includes('wellfound.') || u.includes('angel.co')) return 'wellfound'; if (u.includes('foundit.') || u.includes('monsterindia')) return 'foundit';
  if (u.includes('greenhouse.io')) return 'greenhouse'; if (u.includes('lever.co')) return 'lever'; if (u.includes('ashbyhq.com')) return 'ashby'; if (u.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (u) return 'careers'; return 'manual';
}
const SOURCE_NAME = { adzuna: 'Adzuna', remotive: 'Remotive', greenhouse: 'Greenhouse', lever: 'Lever', linkedin: 'LinkedIn', naukri: 'Naukri', indeed: 'Indeed', internshala: 'Internshala', wellfound: 'Wellfound', foundit: 'Foundit', careers: 'Company career page', manual: 'Manual entry' };
function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(/^https?:/i.test(url) ? url : 'https://' + url);
    const keep = ['currentjobid', 'jk', 'id', 'jobid', 'job_id', 'gh_jid', 'vjk'];
    const params = [...u.searchParams.entries()].filter(([k]) => keep.includes(k.toLowerCase())).sort();
    return (u.hostname.replace(/^www\.|^in\.|^m\./, '') + u.pathname.replace(/\/+$/, '')).toLowerCase() + (params.length ? '?' + params.map(([k, v]) => k.toLowerCase() + '=' + v).join('&') : '');
  } catch (e) { return String(url).trim().toLowerCase(); }
}
function externalId(url) {
  const u = String(url || '');
  const m = u.match(/linkedin\.com\/jobs\/view\/(?:[^/?]*-)?(\d{6,})/i) || u.match(/currentJobId=(\d+)/i) || u.match(/[?&](?:jk|vjk)=([a-f0-9]+)/i) || u.match(/naukri\.com\/.*-(\d{9,})/i) || u.match(/greenhouse\.io\/.*\/jobs\/(\d+)/i) || u.match(/gh_jid=(\d+)/i) || u.match(/lever\.co\/[^/]+\/([0-9a-f-]{36})/i) || u.match(/ashbyhq\.com\/[^/]+\/([0-9a-f-]{36})/i) || u.match(/smartrecruiters\.com\/[^/]+\/(\d{6,})/i) || u.match(/workable\.com\/.*\/j\/([A-Z0-9]+)/i);
  return m ? m[1] : '';
}
const normText = s => String(s || '').toLowerCase().replace(/\b(pvt|private|ltd|limited|inc|llp|technologies|technology|solutions|software|india)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function fingerprint(j) { return normText(j.title) + '|' + normText(j.company) + '|' + normText((detectCities(j.location)[0] || j.location || '')); }
function findDuplicate(j, excludeId) { return findDuplicateIn(j, Object.values(S.jobs), excludeId); }

/* ============ Job description extraction (local engine) ============ */
function extractJobLocal(text, url = '') {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const field = re => { for (const l of lines) { const m = l.match(re); if (m && m[1] && m[1].trim()) return m[1].trim(); } return ''; };
  let title = field(/^(?:job\s*title|position|role|designation)\s*[:\-–]\s*(.+)$/i);
  if (!title) { const cand = lines.slice(0, 4).find(l => l.length < 90 && new RegExp(ROLE_NOUN, 'i').test(l)); title = cand || lines[0] || 'Untitled role'; }
  title = title.replace(/\s*[|–—-]\s*(?:job|jobs|careers?)\b.*$/i, '').replace(/\s+at\s+.+$/i, '').slice(0, 100);
  let company = field(/^(?:company(?:\s*name)?|employer|organi[sz]ation)\s*[:\-–]\s*(.+)$/i);
  if (!company) { const m = raw.slice(0, 600).match(/\bat\s+([A-Z][\w&.\- ]{1,40}?)(?:\s+(?:in|is|we|located|,|\.|\n|-|–))/); if (m) company = m[1].trim(); }
  if (!company) { const m = raw.match(/about\s+(?:the\s+company|us)?\s*[:\-–]?\s*\n?\s*([A-Z][\w&.\- ]{1,40}?)\s+(?:is|was|builds|helps|provides)/i); if (m) company = m[1].trim(); }
  if (!company && url) { try { const h = new URL(/^https?:/.test(url) ? url : 'https://' + url); const gh = h.pathname.split('/').filter(Boolean)[0]; if (/greenhouse|lever|workable/.test(h.hostname) && gh) company = gh.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); else if (!/linkedin|naukri|indeed|internshala|wellfound|foundit|google/.test(h.hostname)) company = h.hostname.replace(/^(www|careers|jobs)\./, '').split('.')[0].replace(/\b\w/g, c => c.toUpperCase()); } catch (e) { } }
  let location = field(/^(?:job\s*)?location[s]?\s*[:\-–]\s*(.+)$/i) || detectCities(raw.slice(0, 1500)).join(', ');
  const workMode = detectWorkMode(location + ' ' + raw.slice(0, 2500));
  if (!location && workMode === 'remote') location = 'Remote';
  const sal = parseSalary(field(/^(?:salary|ctc|compensation|package|stipend|pay)\s*[:\-–]\s*(.+)$/i) || raw);
  const exp = parseExperience(field(/^(?:experience|exp)\s*(?:required)?\s*[:\-–]\s*(.+)$/i) || raw);
  // sections: a heading switches the bucket that the following lines fall into
  const SEC = [
    ['pref', /^(preferred|nice[- ]to[- ]haves?|good[- ]to[- ]haves?|bonus( points)?|desirable|desired|what (will|would) make you stand out|stand[- ]?out|extra credit|brownie points|even better|added advantage|it would be great|pluses|plus\b|additional qualifications?|great to have|we'?d also love)/i],
    ['req', /^(requirements?|required|must[- ]haves?|qualifications?|minimum (qualifications?|requirements?)|basic (qualifications?|requirements?)|what (we'?re|we are) looking for|who (you are|we'?re looking for|we are looking for|you'?ll be)|what you('ll| will)? (need|bring|have)|what you should have|you (have|bring|are|should have|will have|might be|may be)|about you|your (skills|experience|profile|background|expertise|qualifications)|skills?( required| needed| and experience| & experience| and qualifications)?|key skills|eligibility|desired (skills|profile)|technical (skills|requirements)|experience (and|&) skills|candidate (persona|profile|requirements)|ideal candidate|essentials?|we'?d love (to hear from you if|you to have)|you('ll| will) (need|bring|have)|required (skills|qualifications|experience)|education)\b/i],
    ['resp', /^((key |job |role & |roles and |roles & |your |core |primary )?responsibilit(y|ies)|what you('ll| will) (do|be doing|own|work on|achieve|be working on)|what (you'll|you will) be responsible for|your (role|impact|mission|day)|the (role|job|opportunity|position|team|work)|about the (role|job|position|team|opportunity)|role( overview| description| summary| expectations)?|job (description|summary|overview)|position (summary|overview)|duties|day[- ]to[- ]day|in this role|you will|key result areas|overview)\b/i],
    ['skip', /^(about (us|the company)|about [A-Z][\w.&-]*$|who we are|our (story|mission|culture|values|team|company)|company (description|overview)|why (join|work|us|you'll love)|what we offer|what'?s in it for you|benefits|perks|compensation|pay (range|transparency)|salary range|equal opportunity|eeo|diversity|life at|additional information|how to apply|hiring process|interview process|disclaimer|privacy|recruitment fraud)\b/i],
  ];
  const kindOf = txt => { for (const [k, re] of SEC) if (re.test(txt)) return k; return null; };
  const headKind = line => {
    if (BULLET_RE.test(line) || /^[.·]\s/.test(line)) return null;
    const clean = line.replace(/[:：]\s*$/, '').trim();
    if (clean.length > 80 || clean.split(/\s+/).length > 11 || /[.!?;,]$/.test(clean)) return null;
    const paren = (clean.match(/\(([^)]{3,60})\)\s*$/) || [])[1] || '';
    return (paren && kindOf(paren)) || kindOf(clean.replace(/\s*\([^)]*\)\s*$/, ''));
  };
  const buckets = { req: [], pref: [], resp: [], other: [], skip: [] }; let cur = 'other';
  for (const l0 of lines) {
    const l = l0.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    const h = headKind(l); if (h) { cur = h; continue; }
    const lab = l.match(/^([A-Za-z][A-Za-z' ()&\/-]{2,44}):\s+(\S.+)$/); const lk = lab && !BULLET_RE.test(l) && kindOf(lab[1].trim());
    if (lk) { cur = lk; buckets[cur].push(lab[2]); continue; }
    buckets[cur].push(l);
  }
  // "preferred / nice to have" sentences that sit inside a requirements list
  const PREF_INLINE = /\b(preferred|nice to have|good to have|is a plus|a plus|an advantage|bonus|added advantage|desirable|not (required|mandatory))\b/i;
  const inlinePref = []; buckets.req = buckets.req.filter(l => { if (PREF_INLINE.test(l)) { inlinePref.push(l); return false; } return true; });
  buckets.other = buckets.other.filter(l => { if (PREF_INLINE.test(l)) { inlinePref.push(l); return false; } return true; });
  const hard = t => detectSkills(t).filter(k => skillCat(k) !== 'Soft skill');
  // Skills joined by "or" or "/" (or introduced by "one of", "such as") are alternatives: one of them is enough.
  const units = line => {
    const all = hard(line); if (all.length < 2) return all.map(k => [k]);
    if (/\b(one|any) (or more )?of\b|at least one|such as|e\.g\.?|\blike\b|or (similar|equivalent|related|comparable|other|another|any other)/i.test(line)) return [all];
    const out = [];
    for (const seg of line.split(/,|;|\band\b|&/i)) { const sk = hard(seg); if (sk.length > 1 && /\bor\b|\//i.test(seg)) out.push(sk); else sk.forEach(k => out.push([k])); }
    return out;
  };
  const prefSkills = uniqCI(hard([...buckets.pref, ...inlinePref].join('\n')));
  const reqUnits = buckets.req.flatMap(units);
  let reqSkills = uniqCI(reqUnits.flat()).filter(k => !prefSkills.includes(k));
  const otherSkills = hard(buckets.other.join('\n') + '\n' + buckets.resp.join('\n')).filter(k => !reqSkills.includes(k) && !prefSkills.includes(k));
  if (!reqSkills.length) reqSkills = otherSkills.splice(0, 8);
  reqSkills = reqSkills.slice(0, 16);
  const seenG = new Set(); const skillGroups = [];
  for (const u of reqUnits) { const g = uniqCI(u).filter(k => reqSkills.includes(k) && !seenG.has(k)); if (g.length > 1) { skillGroups.push(g); g.forEach(k => seenG.add(k)); } }
  const finalPref = uniqCI([...prefSkills, ...otherSkills]).slice(0, 12);
  const eduPool = [...buckets.req, ...buckets.pref, ...inlinePref, ...buckets.other, ...buckets.resp];
  const eduLine = eduPool.find(l => l.length < 260 && (EDU_REQ.test(l) || EDU_REQ_CS.test(l))) || '';
  const responsibilities = buckets.resp.map(l => l.replace(BULLET_RE, '')).filter(l => l.length > 12).slice(0, 12);
  const deadlineM = raw.match(/(?:apply by|last date(?: to apply)?|deadline|closing date)\s*[:\-–]?\s*([0-9]{1,2}[\s\-/][A-Za-z0-9]{2,9}[\s\-/][0-9]{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i);
  let deadline = ''; if (deadlineM) { const d = new Date(deadlineM[1].replace(/-/g, ' ')); if (!isNaN(d)) deadline = isoDay(d); }
  const emp = detectEmployment(title + ' ' + raw.slice(0, 1500));
  return {
    title, company: company || 'Unknown company', location: location || '', workMode: workMode || null,
    salaryMin: sal.min, salaryMax: sal.max, expMin: exp.min, expMax: exp.max,
    requiredSkills: reqSkills, skillGroups, preferredSkills: finalPref, education: eduLine.replace(BULLET_RE, '').slice(0, 200), responsibilities,
    employmentType: emp[0] || 'full_time', deadline, postedAt: '',
  };
}
const JOB_SCHEMA = `{"title":string,"company":string,"location":string,"work_mode":"remote"|"hybrid"|"onsite"|null,"salary_min":number|null,"salary_max":number|null (rupees per year; 6 LPA = 600000; null when not stated),"experience_min":number|null,"experience_max":number|null,"required_skills":[string] (mandatory only),"preferred_skills":[string] (nice-to-have only),"education":string,"responsibilities":[string],"employment_type":"full_time"|"internship"|"contract"|"part_time","deadline":"YYYY-MM-DD" or "","posted_at":"YYYY-MM-DD" or "","suspicious":boolean (true if it asks for fees, deposits, or looks like a scam),"suspicious_reason":string}`;
function jobFromAI(o, fallback) {
  const a = v => Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  const num = v => (v === null || v === undefined || v === '' || isNaN(v)) ? null : +v;
  return {
    title: String(o.title || fallback.title), company: String(o.company || fallback.company), location: String(o.location || fallback.location || ''),
    workMode: ['remote', 'hybrid', 'onsite'].includes(o.work_mode) ? o.work_mode : fallback.workMode,
    salaryMin: num(o.salary_min), salaryMax: num(o.salary_max), expMin: num(o.experience_min), expMax: num(o.experience_max),
    requiredSkills: uniqCI(a(o.required_skills).map(canonSkill)), preferredSkills: uniqCI(a(o.preferred_skills).map(canonSkill)),
    education: String(o.education || ''), responsibilities: a(o.responsibilities).slice(0, 14), employmentType: EMP_LABEL[o.employment_type] ? o.employment_type : fallback.employmentType,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(o.deadline || '') ? o.deadline : '', postedAt: /^\d{4}-\d{2}-\d{2}$/.test(o.posted_at || '') ? o.posted_at : '',
    suspicious: !!o.suspicious, suspiciousReason: String(o.suspicious_reason || ''),
  };
}
function scamCheck(text) {
  const t = String(text || '');
  if (/registration fee|security deposit|pay (a|the)? ?(fee|deposit)|processing fee|training fee|refundable deposit|send money|whatsapp only/i.test(t)) return 'The posting asks for a fee or deposit, a common sign of a fraudulent listing.';
  return '';
}

/* ============ Match scoring: S = 0.30K + 0.20E + 0.10Q + 0.15P + 0.10R + 0.10L + 0.05C ============ */
const COMP_LABEL = { K: 'Technical skills', E: 'Experience', Q: 'Qualification', P: 'Project relevance', R: 'Responsibilities', L: 'Location & work mode', C: 'Compensation' };
function category(score) { return score >= 85 ? { k: 'ex', label: 'Excellent match', tone: 'good' } : score >= 70 ? { k: 'gd', label: 'Good match', tone: 'acc' } : score >= 50 ? { k: 'md', label: 'Moderate match', tone: 'warn' } : { k: 'pr', label: 'Poor match', tone: 'bad' }; }
function scoreJob(job, profile, prefs, weights) {
  const p = profile || {}; const pr = prefs || {}; const W = weights || DEFAULT_WEIGHTS;
  const have = lcSet(profileSkillNames(p));
  const hardOnly = s => skillCat(s) !== 'Soft skill';
  const req = uniqCI((job.requiredSkills || []).map(canonSkill)).filter(hardOnly), pref = uniqCI((job.preferredSkills || []).map(canonSkill)).filter(s => hardOnly(s) && !req.includes(s));
  const has = s => have.has(s.toLowerCase());
  const reqM = req.filter(has), prefM = pref.filter(has);
  // Alternatives ("Java, Go or Python") are one requirement: any one of them satisfies it.
  const groups = (job.skillGroups || []).map(g => uniqCI(g.map(canonSkill)).filter(s => req.includes(s))).filter(g => g.length > 1);
  const grouped = new Set(groups.flat()); const singles = req.filter(s => !grouped.has(s));
  const nReq = singles.length + groups.length, nReqM = singles.filter(has).length + groups.filter(g => g.some(has)).length;
  const altNote = groups.length ? ' (alternatives count once)' : '';
  const C = {};
  // K
  if (nReq && pref.length) C.K = { v: 100 * (0.75 * nReqM / nReq + 0.25 * prefM.length / pref.length), note: `${nReqM}/${nReq} required${altNote} and ${prefM.length}/${pref.length} preferred skills matched` };
  else if (nReq) C.K = { v: 100 * nReqM / nReq, note: `${nReqM}/${nReq} required skills matched${altNote}` };
  else if (pref.length) C.K = { v: 50 + 50 * prefM.length / pref.length, note: `No mandatory skills listed; ${prefM.length}/${pref.length} preferred matched` };
  else C.K = { v: 60, note: 'The posting lists no specific skills', unknown: true };
  // E
  const y = candidateYears(p);
  if (job.expMin == null && job.expMax == null) C.E = { v: 70, note: 'Experience requirement not stated', unknown: true };
  else {
    const mn = job.expMin ?? 0, mx = job.expMax;
    if (y >= mn && (mx == null || y <= mx + 0.5)) C.E = { v: 100, note: `You have ${y} yrs; role asks ${mn}${mx != null ? '–' + mx : '+'} yrs` };
    else if (y < mn) C.E = { v: clamp(100 - (mn - y) * 30), note: `Role asks ${mn}${mx != null ? '–' + mx : '+'} yrs; you have ${y} yrs (${Math.round((mn - y) * 10) / 10} short)` };
    else C.E = { v: clamp(100 - (y - mx) * 8, 60), note: `You have ${y} yrs, above the ${mn}–${mx} yr range (may be seen as overqualified)` };
  }
  // Q
  const jl = jobEduLevel(job), cl = eduLevel(p);
  if (jl == null) C.Q = { v: 75, note: 'No education requirement stated', unknown: true };
  else if (cl == null) C.Q = { v: 50, note: `Role asks for ${DEG_NAME[jl]}; add your education to the profile`, unknown: true };
  else if (cl >= jl) C.Q = { v: 100, note: `Your ${DEG_NAME[cl]} meets the ${DEG_NAME[jl]} requirement` };
  else C.Q = { v: cl === jl - 1 ? 55 : 25, note: `Role asks for ${DEG_NAME[jl]}; profile shows ${DEG_NAME[cl]}` };
  // P
  const jobSk = new Set([...req, ...pref].map(s => s.toLowerCase()));
  const projRel = (p.projects || []).map(pj => {
    const t = uniqCI([...splitList(pj.technologies).map(canonSkill), ...detectSkills(pj.name + '\n' + pj.description)]);
    const hits = t.filter(s => jobSk.has(s.toLowerCase()));
    const rel = jobSk.size ? Math.min(1, hits.length / Math.min(jobSk.size, 4)) : 0.5;
    return { name: pj.name, rel: Math.round(rel * 100), hits };
  }).sort((a, b) => b.rel - a.rel);
  if (!projRel.length) C.P = { v: 25, note: 'No projects in your profile' };
  else { const top = projRel.slice(0, 2); C.P = { v: top.length > 1 ? 0.7 * top[0].rel + 0.3 * top[1].rel : top[0].rel, note: top.map(x => `${x.name} (${x.rel}%)`).join(', ') }; }
  // R
  const jobKw = keywords((job.responsibilities || []).join(' ') || job.description || '', 25);
  const candKw = new Set(keywords([p.summary, ...(p.experiences || []).map(e => e.role + ' ' + e.description), ...(p.projects || []).map(x => x.name + ' ' + x.description + ' ' + x.technologies)].join(' '), 400));
  if (!jobKw.length) C.R = { v: 65, note: 'No responsibilities listed', unknown: true };
  else { const ov = jobKw.filter(k => candKw.has(k)); C.R = { v: clamp(ov.length / Math.min(10, jobKw.length) * 100), note: ov.length ? `Overlap: ${ov.slice(0, 6).join(', ')}` : 'Little overlap with your project and work descriptions' }; }
  // L
  const locs = uniqCI([...(pr.locations || []), ...splitList(p.preferredLocations)].map(canonCity));
  const modes = uniq([...(pr.workModes || []), ...(p.workModes || [])]);
  const wantsRemote = locs.includes('Remote') || modes.includes('remote');
  const jobCities = detectCities(job.location);
  const prefCities = locs.filter(l => l !== 'Remote');
  if (job.workMode === 'remote') C.L = { v: (wantsRemote || !locs.length) ? 100 : 75, note: 'Remote role' + (wantsRemote ? ' and you accept remote' : '') };
  else if (!jobCities.length) C.L = { v: 70, note: 'Location not stated', unknown: true };
  else if (!locs.length && !modes.length) C.L = { v: 70, note: 'Set preferred locations to score this', unknown: true };
  else if (jobCities.some(c => prefCities.includes(c))) {
    C.L = { v: 100, note: `${jobCities.join(', ')} is a preferred location${job.workMode ? ' (' + job.workMode + ')' : ''}` };
  } else if (p.relocate) C.L = { v: 65, note: `${jobCities.join(', ')} is not preferred, but you are open to relocating` };
  else C.L = { v: 20, note: `${jobCities.join(', ')} is outside your preferred locations` };
  // C
  const emin = pr.salaryMin ?? p.expectedMin ?? null, emax = pr.salaryMax ?? p.expectedMax ?? null;
  if (job.salaryMin == null && job.salaryMax == null) C.C = { v: 70, note: 'Salary not stated', unknown: true };
  else if (emin == null && emax == null) C.C = { v: 75, note: 'Set an expected salary to score this', unknown: true };
  else {
    const hi = job.salaryMax ?? job.salaryMin, lo = job.salaryMin ?? job.salaryMax;
    if (hi >= (emin ?? 0) && lo <= (emax ?? Infinity)) C.C = { v: 100, note: `${salaryRange(job.salaryMin, job.salaryMax)} overlaps your ${salaryRange(emin, emax)} target` };
    else if (hi < (emin ?? 0)) C.C = { v: clamp(100 - (emin - hi) / emin * 250), note: `Pays up to ${lpa(hi)}, below your ${lpa(emin)} minimum` };
    else C.C = { v: 100, note: `Pays above your target range` };
  }
  const wsum = sum(Object.keys(COMP_LABEL).map(k => +W[k] || 0)) || 1;
  let raw = sum(Object.keys(COMP_LABEL).map(k => (+W[k] || 0) * C[k].v)) / wsum;
  Object.values(C).forEach(c => c.v = Math.round(c.v));
  const score = Math.round(raw);
  const cat = category(score);
  const strengths = [], weaknesses = [];
  if (reqM.length) strengths.push(`Matches required skills: ${reqM.join(', ')}`);
  if (projRel[0] && projRel[0].rel >= 50) strengths.push(`Project "${projRel[0].name}" uses ${projRel[0].hits.join(', ')}`);
  if (C.E.v === 100) strengths.push(C.E.note); if (C.L.v === 100) strengths.push(C.L.note); if (C.C.v === 100 && !C.C.unknown) strengths.push(C.C.note);
  const missReq = [...singles.filter(s => !has(s)), ...groups.filter(g => !g.some(has)).map(g => g[0])], missPref = pref.filter(s => !has(s));
  if (missReq.length) weaknesses.push(`Missing required: ${missReq.join(', ')}`);
  if (C.E.v < 70) weaknesses.push(C.E.note); if (C.L.v < 50) weaknesses.push(C.L.note); if (C.C.v < 60) weaknesses.push(C.C.note); if (C.Q.v < 60 && !C.Q.unknown) weaknesses.push(C.Q.note);
  if (C.P.v < 40) weaknesses.push('Projects show little use of this role’s stack');
  const unknowns = Object.entries(C).filter(([, c]) => c.unknown).map(([k, c]) => `${COMP_LABEL[k]}: ${c.note}`);
  let rec;
  if (score >= 85) rec = 'Strong fit. Generate a tailored resume and prepare the application.';
  else if (score >= 70) rec = `Good fit. Tailor the resume to lead with ${(reqM.slice(0, 3).join(', ') || 'your most relevant skills')}${missReq.length ? ` and be ready to discuss ${missReq.slice(0, 2).join(', ')}` : ''}.`;
  else if (score >= 50) rec = `Possible fit. ${missReq.length ? `Main gaps: ${missReq.slice(0, 3).join(', ')}. ` : ''}Apply if you can point to related work; missing preferred skills alone should not stop you.`;
  else rec = `Weak fit on the current profile${missReq.length ? ` (gaps: ${missReq.slice(0, 3).join(', ')})` : ''}. Consider other roles first, or close the gaps.`;
  return {
    score, raw: Math.round(raw * 100) / 100, category: cat.label, components: C, weights: { ...W },
    matchedRequired: reqM, missingRequired: missReq, matchedPreferred: prefM, missingPreferred: missPref,
    projects: projRel.slice(0, 4), strengths, weaknesses, unknowns, recommendation: rec, at: nowISO(), engine: 'local',
  };
}

/* ============ Resume tailoring ============ */
function relevance(text, jobSkillsLc, jobKw) {
  const sk = detectSkills(text).filter(s => jobSkillsLc.has(s.toLowerCase())).length;
  const kw = keywords(text, 60).filter(k => jobKw.has(k)).length;
  return sk * 3 + kw;
}
function splitBullets(desc) { return String(desc || '').split(/\n|(?<=\.)\s+(?=[A-Z])/).map(s => s.replace(BULLET_RE, '').trim()).filter(s => s.length > 3); }
function tailorLocal(p, job, match) {
  const req = (job.requiredSkills || []).map(canonSkill), pref = (job.preferredSkills || []).map(canonSkill);
  const jobLc = new Set([...req, ...pref].map(s => s.toLowerCase()));
  const jobKw = new Set(keywords((job.responsibilities || []).join(' ') + ' ' + (job.description || ''), 40));
  const profSkills = profileSkillNames(p);
  const rank = s => req.some(r => r.toLowerCase() === s.toLowerCase()) ? 0 : pref.some(r => r.toLowerCase() === s.toLowerCase()) ? 1 : [...req, ...pref].some(r => skillCat(r) === skillCat(s)) ? 2 : 3;
  const skills = [...profSkills].sort((a, b) => rank(a) - rank(b));
  const projects = (p.projects || []).map(pj => ({ ...pj, _r: relevance(pj.name + ' ' + pj.technologies + ' ' + pj.description, jobLc, jobKw) })).sort((a, b) => b._r - a._r);
  const keepProjects = (projects.length <= 3 ? projects : projects.slice(0, 3)).map(pj => ({ name: pj.name, technologies: pj.technologies, link: pj.link, bullets: splitBullets(pj.description).sort((a, b) => relevance(b, jobLc, jobKw) - relevance(a, jobLc, jobKw)) }));
  const exps = [...(p.experiences || [])].sort((a, b) => (b.end || '9999') .localeCompare(a.end || '9999') || (b.start || '').localeCompare(a.start || '')).map(e => ({ employer: e.employer, role: e.role, start: e.start, end: e.end, bullets: splitBullets(e.description).sort((a, b) => relevance(b, jobLc, jobKw) - relevance(a, jobLc, jobKw)) }));
  const matched = skills.filter(s => rank(s) <= 1);
  const lead = (matched.length ? matched : skills).slice(0, 4);
  const y = candidateYears(p);
  const lvl = y < 1 ? 'Entry-level developer' : `Developer with ${y} year${y === 1 ? '' : 's'} of experience`;
  const edu = (p.education || [])[0];
  const parts = [`${lvl} applying for the ${job.title} role, with hands-on work in ${lead.join(', ') || 'software development'}.`];
  if (keepProjects[0]) parts.push(`Projects include ${keepProjects.slice(0, 2).map(x => x.name + (x.technologies ? ` (${splitList(x.technologies).slice(0, 3).join(', ')})` : '')).join(' and ')}.`);
  const e0 = exps[0]; if (e0 && e0.role) parts.push(`Experience includes ${e0.role}${e0.employer ? ' at ' + e0.employer : ''}.`);
  if (edu && edu.degree) parts.push(`${edu.degree}${edu.institution ? ', ' + edu.institution : ''}${edu.year ? ' (' + edu.year + ')' : ''}.`);
  const sectionOrder = (y < 1 && keepProjects.length) ? ['summary', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements'] : ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements'];
  const changeLog = [
    `Summary rewritten to target "${job.title}" using only profile facts`,
    `Skills reordered: ${matched.length} job-relevant skills moved to the front`,
    projects.length > 3 ? `Selected the 3 most relevant of ${projects.length} projects: ${keepProjects.map(x => x.name).join(', ')}` : `Projects ordered by relevance: ${keepProjects.map(x => x.name).join(', ') || 'none in profile'}`,
    `Bullets within each project and job reordered by keyword relevance`,
    `Section order: ${sectionOrder.join(' → ')}`,
  ];
  return { summary: parts.join(' '), skills, projects: keepProjects, experiences: exps, education: clone(p.education || []), certifications: clone(p.certifications || []), achievements: clone(p.achievements || []), sectionOrder, changeLog, guard: [] };
}
/** Truthfulness guard: drop anything mentioning skills or years not supported by the profile. */
function guardTailored(t, p, job) {
  const allowed = lcSet(profileSkillNames(p)); const y = candidateYears(p); const removed = [];
  const okText = (s0, extra = new Set()) => {
    const s = job && job.title ? String(s0).split(job.title).join(' ') : String(s0);
    const bad = detectSkills(s).filter(k => !allowed.has(k.toLowerCase()) && !extra.has(k.toLowerCase()));
    const yrs = [...String(s).matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi)].map(m => +m[1]).filter(v => Math.abs(v - y) > 0.6);
    return { ok: !bad.length && !yrs.length, why: bad.length ? 'mentions ' + bad.join(', ') : yrs.length ? `claims ${yrs[0]} years (profile: ${y})` : '' };
  };
  const sentences = String(t.summary || '').split(/(?<=[.!?])\s+/);
  t.summary = sentences.filter(s => { const r = okText(s); if (!r.ok) removed.push(`Summary sentence removed: ${r.why}`); return r.ok; }).join(' ');
  const before = t.skills.length; t.skills = t.skills.filter(s => allowed.has(s.toLowerCase())); if (t.skills.length < before) removed.push(`${before - t.skills.length} skill(s) not in your profile removed`);
  const profProjects = new Map((p.projects || []).map(x => [x.name.toLowerCase(), x]));
  t.projects = t.projects.filter(x => { if (!profProjects.has(String(x.name).toLowerCase())) { removed.push(`Unknown project "${x.name}" removed`); return false; } return true; });
  t.projects.forEach(x => { const src = profProjects.get(x.name.toLowerCase()); const extra = lcSet(splitList(src.technologies)); x.technologies = src.technologies; x.link = src.link; x.bullets = (x.bullets || []).filter(b => { const r = okText(b, extra); if (!r.ok) removed.push(`Bullet in "${x.name}" removed: ${r.why}`); return r.ok; }); if (!x.bullets.length) x.bullets = splitBullets(src.description); });
  const profExp = (p.experiences || []);
  t.experiences = (t.experiences || []).filter(e => { const m = profExp.find(o => o.employer.toLowerCase() === String(e.employer || '').toLowerCase() || (o.role.toLowerCase() === String(e.role || '').toLowerCase() && o.role)); if (!m) { removed.push(`Unknown employer "${e.employer}" removed`); return false; } e.start = m.start; e.end = m.end; e.employer = m.employer; e.role = m.role; e.bullets = (e.bullets || []).filter(b => { const r = okText(b); if (!r.ok) removed.push(`Bullet at ${m.employer} removed: ${r.why}`); return r.ok; }); if (!e.bullets.length) e.bullets = splitBullets(m.description); return true; });
  profExp.forEach(o => { if (!t.experiences.find(e => e.employer === o.employer && e.role === o.role)) t.experiences.push({ employer: o.employer, role: o.role, start: o.start, end: o.end, bullets: splitBullets(o.description) }); });
  t.education = clone(p.education || []); t.certifications = clone(p.certifications || []); t.achievements = clone(p.achievements || []);
  t.guard = removed;
  return t;
}
function tailorPrompt(p, job) {
  const prof = { summary: p.summary, totalYears: candidateYears(p), skills: profileSkillNames(p), projects: (p.projects || []).map(x => ({ name: x.name, technologies: x.technologies, description: x.description })), experiences: (p.experiences || []).map(e => ({ employer: e.employer, role: e.role, start: e.start, end: e.end || 'present', description: e.description })), education: p.education, certifications: p.certifications };
  return `You tailor a resume for one job. Use ONLY facts in the candidate profile. Never invent skills, tools, employers, dates, metrics, years of experience, certifications or achievements. You may reorder, select and reword. Do not add numbers that are not in the profile.
${UNTRUSTED}
Candidate profile (verified):
${JSON.stringify(prof)}
Job:
<untrusted>${JSON.stringify({ title: job.title, company: job.company, required: job.requiredSkills, preferred: job.preferredSkills, responsibilities: job.responsibilities, description: String(job.description || '').slice(0, 5000) })}</untrusted>
Reply with only JSON: {"summary": string (2-3 sentences, ATS-friendly, targets this role), "skills": [profile skills only, most relevant first], "projects": [{"name": exact profile project name, "bullets": [string]}] (2-4 most relevant), "experiences": [{"employer": exact, "role": exact, "bullets": [string]}], "notes": [string] (what you changed and why)}`;
}
async function tailorResume(job, { forceLocal = false } = {}) {
  const p = S.profile; const match = job.match || scoreJob(job, p, S.prefs, S.settings.weights);
  const base = tailorLocal(p, job, match);
  const { out, engine } = forceLocal ? { out: base, engine: 'local' } : await AI.route({
    personal: true, label: 'Tailoring your resume…', prompt: tailorPrompt(p, job), tier: 'default',
    validate: o => o && typeof o.summary === 'string' && Array.isArray(o.skills),
    local: async () => base,
  });
  let t;
  if (engine === 'ai') {
    t = { ...base, summary: out.summary, skills: uniqCI([...(out.skills || []).map(canonSkill), ...base.skills]), projects: (out.projects || []).map(x => ({ name: x.name, bullets: (x.bullets || []).map(String) })), experiences: (out.experiences || []).map(e => ({ employer: e.employer, role: e.role, bullets: (e.bullets || []).map(String) })), changeLog: [...(out.notes || []).map(String).slice(0, 8), `Section order: ${base.sectionOrder.join(' → ')}`] };
    if (!t.projects.length) t.projects = base.projects;
  } else t = base;
  t = guardTailored(t, p, job);
  if (!t.projects.length && base.projects.length) { t.projects = base.projects; t.guard.push('Projects fell back to the local engine’s selection from your profile'); }
  if (!String(t.summary || '').trim()) { t.summary = base.summary; t.guard.push('Summary fell back to the local engine’s version'); }
  const kws = uniqCI([...(job.requiredSkills || []), ...(job.preferredSkills || [])].map(canonSkill));
  const text = resumeText(t, p);
  const covered = kws.filter(k => detectSkills(text).map(x => x.toLowerCase()).includes(k.toLowerCase()) || text.toLowerCase().includes(k.toLowerCase()));
  const versionNo = Object.values(S.versions).filter(v => v.jobId === job.id).length + 1;
  const v = { id: uid('v'), jobId: job.id, resumeId: (latestResume() || {}).id || null, version: versionNo, createdAt: nowISO(), engine, content: t, coverage: pct(covered.length, kws.length), keywordsCovered: covered, keywordsMissing: kws.filter(k => !covered.includes(k)), title: `${p.name || 'Resume'} — ${job.company} ${job.title}` };
  v.hash = await sha256(text);
  S.versions[v.id] = v; save.version(v);
  logAgent('Resume Optimization Agent', 'Generated tailored resume v' + versionNo, `${job.title} @ ${job.company}; keyword match ${v.coverage}%; fact check removed ${t.guard.length} item(s)`, engine);
  return v;
}
function latestResume() { return Object.values(S.resumes).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0] || null; }
const fmtMonth = m => { if (!m) return 'Present'; const d = new Date(m + '-01'); return isNaN(d) ? m : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };
function resumeText(t, p) {
  const L = [];
  L.push(p.name || ''); L.push([p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | '));
  for (const s of t.sectionOrder) {
    if (s === 'summary' && t.summary) { L.push('', 'SUMMARY', t.summary); }
    if (s === 'skills' && t.skills.length) { L.push('', 'SKILLS', t.skills.join(', ')); }
    if (s === 'experience' && t.experiences.length) { L.push('', 'EXPERIENCE'); t.experiences.forEach(e => { L.push(`${e.role}${e.employer ? ', ' + e.employer : ''} (${fmtMonth(e.start)} – ${fmtMonth(e.end)})`); e.bullets.forEach(b => L.push('• ' + b)); }); }
    if (s === 'projects' && t.projects.length) { L.push('', 'PROJECTS'); t.projects.forEach(x => { L.push(`${x.name}${x.technologies ? ' | ' + x.technologies : ''}`); x.bullets.forEach(b => L.push('• ' + b)); if (x.link) L.push(x.link); }); }
    if (s === 'education' && t.education.length) { L.push('', 'EDUCATION'); t.education.forEach(e => L.push([e.degree, e.institution, e.year, e.score].filter(Boolean).join(' | '))); }
    if (s === 'certifications' && t.certifications.length) { L.push('', 'CERTIFICATIONS'); t.certifications.forEach(c => L.push('• ' + c)); }
    if (s === 'achievements' && t.achievements.length) { L.push('', 'ACHIEVEMENTS'); t.achievements.forEach(c => L.push('• ' + c)); }
  }
  return L.join('\n');
}
function resumeHTML(t, p, highlight = []) {
  const hl = s => { let h = esc(s); for (const k of highlight) { if (!k) continue; const re = new RegExp('(?<![A-Za-z0-9])(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![A-Za-z0-9])', 'gi'); h = h.replace(re, '<span class="kw">$1</span>'); } return h; };
  const out = [`<h2>${esc(p.name || 'Your name')}</h2><div style="color:#444;font-size:12px">${esc([p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join(' · '))}</div>`];
  for (const s of t.sectionOrder) {
    if (s === 'summary' && t.summary) out.push(`<h3>Summary</h3><p>${hl(t.summary)}</p>`);
    if (s === 'skills' && t.skills.length) out.push(`<h3>Skills</h3><p>${t.skills.map(hl).join(', ')}</p>`);
    if (s === 'experience' && t.experiences.length) out.push(`<h3>Experience</h3>` + t.experiences.map(e => `<div><b>${esc(e.role)}</b>${e.employer ? ', ' + esc(e.employer) : ''} <span style="color:#555;float:right">${esc(fmtMonth(e.start))} – ${esc(fmtMonth(e.end))}</span><ul>${e.bullets.map(b => `<li>${hl(b)}</li>`).join('')}</ul></div>`).join(''));
    if (s === 'projects' && t.projects.length) out.push(`<h3>Projects</h3>` + t.projects.map(x => `<div><b>${esc(x.name)}</b>${x.technologies ? ` <span style="color:#555">| ${hl(x.technologies)}</span>` : ''}<ul>${x.bullets.map(b => `<li>${hl(b)}</li>`).join('')}</ul></div>`).join(''));
    if (s === 'education' && t.education.length) out.push(`<h3>Education</h3>` + t.education.map(e => `<div><b>${esc(e.degree)}</b>${e.institution ? ', ' + esc(e.institution) : ''} <span style="color:#555">${esc([e.year, e.score].filter(Boolean).join(' · '))}</span></div>`).join(''));
    if (s === 'certifications' && t.certifications.length) out.push(`<h3>Certifications</h3><ul>${t.certifications.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`);
    if (s === 'achievements' && t.achievements.length) out.push(`<h3>Achievements</h3><ul>${t.achievements.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`);
  }
  return out.join('');
}
function profileAsTailored(p) { return { summary: p.summary, skills: profileSkillNames(p), projects: (p.projects || []).map(x => ({ name: x.name, technologies: x.technologies, link: x.link, bullets: splitBullets(x.description) })), experiences: (p.experiences || []).map(e => ({ employer: e.employer, role: e.role, start: e.start, end: e.end, bullets: splitBullets(e.description) })), education: p.education || [], certifications: p.certifications || [], achievements: p.achievements || [], sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements'] }; }

/* PDF (jsPDF) and DOCX (JSZip) generation */
const pdfSafe = s => String(s || '').replace(/₹/g, 'INR ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•]/g, '');
async function resumePDF(t, p) {
  await lib('jspdf'); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, M = 48; let y = 56;
  const need = h => { if (y + h > 800) { doc.addPage(); y = 56; } };
  const text = (s, size = 10, style = 'normal', indent = 0, gap = 3) => { doc.setFont('helvetica', style); doc.setFontSize(size); const lines = doc.splitTextToSize(pdfSafe(s), W - 2 * M - indent); lines.forEach(l => { need(size + gap); doc.text(l, M + indent, y); y += size + gap; }); };
  const head = s => { y += 8; need(24); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(s.toUpperCase(), M, y); y += 4; doc.setDrawColor(150); doc.line(M, y, W - M, y); y += 13; };
  text(p.name || '', 18, 'bold', 0, 6); text([p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join('  |  '), 9);
  for (const s of t.sectionOrder) {
    if (s === 'summary' && t.summary) { head('Summary'); text(t.summary); }
    if (s === 'skills' && t.skills.length) { head('Skills'); text(t.skills.join(', ')); }
    if (s === 'experience' && t.experiences.length) { head('Experience'); t.experiences.forEach(e => { text(`${e.role}${e.employer ? ', ' + e.employer : ''}   (${fmtMonth(e.start)} – ${fmtMonth(e.end)})`, 10.5, 'bold'); e.bullets.forEach(b => text('•  ' + b, 10, 'normal', 8)); y += 3; }); }
    if (s === 'projects' && t.projects.length) { head('Projects'); t.projects.forEach(x => { text(x.name + (x.technologies ? '  |  ' + x.technologies : ''), 10.5, 'bold'); x.bullets.forEach(b => text('•  ' + b, 10, 'normal', 8)); if (x.link) text(x.link, 9, 'normal', 8); y += 3; }); }
    if (s === 'education' && t.education.length) { head('Education'); t.education.forEach(e => text([e.degree, e.institution, e.year, e.score].filter(Boolean).join('  |  '))); }
    if (s === 'certifications' && t.certifications.length) { head('Certifications'); t.certifications.forEach(c => text('•  ' + c, 10, 'normal', 8)); }
    if (s === 'achievements' && t.achievements.length) { head('Achievements'); t.achievements.forEach(c => text('•  ' + c, 10, 'normal', 8)); }
  }
  return doc.output('blob');
}
const xmlEsc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
async function makeDocx(paras) {
  await lib('jszip'); const zip = new window.JSZip();
  const run = (t, { b, sz, color } = {}) => `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${b ? '<w:b/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:sz w:val="${sz || 21}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
  const body = paras.map(p => {
    if (p.type === 'h') return `<w:p><w:pPr><w:spacing w:before="200" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr>${run(p.text.toUpperCase(), { b: true, sz: 22 })}</w:p>`;
    if (p.type === 'title') return `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>${run(p.text, { b: true, sz: 36 })}</w:p>`;
    if (p.type === 'li') return `<w:p><w:pPr><w:ind w:left="360" w:hanging="220"/><w:spacing w:after="20"/></w:pPr>${run('•  ' + p.text)}</w:p>`;
    if (p.type === 'b') return `<w:p><w:pPr><w:spacing w:before="80" w:after="20"/></w:pPr>${run(p.text, { b: true })}${p.after ? run('  ' + p.after, { color: '555555' }) : ''}</w:p>`;
    return `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>${run(p.text, { sz: p.sz, color: p.color })}</w:p>`;
  }).join('');
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function resumeDocxParas(t, p) {
  const P = [{ type: 'title', text: p.name || '' }, { type: 'p', text: [p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | '), sz: 18, color: '444444' }];
  for (const s of t.sectionOrder) {
    if (s === 'summary' && t.summary) P.push({ type: 'h', text: 'Summary' }, { type: 'p', text: t.summary });
    if (s === 'skills' && t.skills.length) P.push({ type: 'h', text: 'Skills' }, { type: 'p', text: t.skills.join(', ') });
    if (s === 'experience' && t.experiences.length) { P.push({ type: 'h', text: 'Experience' }); t.experiences.forEach(e => { P.push({ type: 'b', text: `${e.role}${e.employer ? ', ' + e.employer : ''}`, after: `${fmtMonth(e.start)} – ${fmtMonth(e.end)}` }); e.bullets.forEach(b => P.push({ type: 'li', text: b })); }); }
    if (s === 'projects' && t.projects.length) { P.push({ type: 'h', text: 'Projects' }); t.projects.forEach(x => { P.push({ type: 'b', text: x.name, after: x.technologies }); x.bullets.forEach(b => P.push({ type: 'li', text: b })); if (x.link) P.push({ type: 'p', text: x.link, sz: 18 }); }); }
    if (s === 'education' && t.education.length) { P.push({ type: 'h', text: 'Education' }); t.education.forEach(e => P.push({ type: 'p', text: [e.degree, e.institution, e.year, e.score].filter(Boolean).join(' | ') })); }
    if (s === 'certifications' && t.certifications.length) { P.push({ type: 'h', text: 'Certifications' }); t.certifications.forEach(c => P.push({ type: 'li', text: c })); }
    if (s === 'achievements' && t.achievements.length) { P.push({ type: 'h', text: 'Achievements' }); t.achievements.forEach(c => P.push({ type: 'li', text: c })); }
  }
  return P;
}
function mdToDocxParas(md) {
  return String(md).split('\n').filter(l => l.trim()).map(l => {
    if (/^#\s/.test(l)) return { type: 'title', text: l.replace(/^#\s/, '') };
    if (/^#{2,}\s/.test(l)) return { type: 'h', text: l.replace(/^#+\s/, '') };
    if (/^\s*[-*]\s/.test(l)) return { type: 'li', text: l.replace(/^\s*[-*]\s/, '').replace(/\*\*/g, '') };
    return { type: 'p', text: l.replace(/\*\*/g, '') };
  });
}

/* ============ Application state machine ============ */
const STAGES = {
  Discovered: { label: 'Discovered', tone: '', next: ['Analyzed', 'Archived'] },
  Analyzed: { label: 'Analyzed', tone: 'info', next: ['Shortlisted', 'Archived'] },
  Shortlisted: { label: 'Shortlisted', tone: 'acc', next: ['ResumeGenerated', 'Archived'] },
  ResumeGenerated: { label: 'Resume generated', tone: 'acc', next: ['AwaitingApproval', 'Archived'] },
  AwaitingApproval: { label: 'Awaiting approval', tone: 'hi', next: ['Approved', 'RejectedByUser'] },
  Approved: { label: 'Approved', tone: 'good', next: ['SubmissionInProgress', 'AwaitingApproval'] },
  SubmissionInProgress: { label: 'Submitting', tone: 'hi', next: ['Applied', 'SubmissionFailed'] },
  SubmissionFailed: { label: 'Submission failed', tone: 'bad', next: ['AwaitingApproval'] },
  Applied: { label: 'Applied', tone: 'info', next: ['UnderReview', 'EmployerRejected', 'Withdrawn'] },
  UnderReview: { label: 'Under review', tone: 'info', next: ['EmployerShortlisted', 'EmployerRejected', 'Withdrawn'] },
  EmployerShortlisted: { label: 'Shortlisted by employer', tone: 'good', next: ['InterviewScheduled', 'EmployerRejected', 'Withdrawn'] },
  InterviewScheduled: { label: 'Interview scheduled', tone: 'good', next: ['OfferReceived', 'EmployerRejected', 'Withdrawn'] },
  OfferReceived: { label: 'Offer received', tone: 'good', next: ['OfferAccepted', 'OfferDeclined'] },
  OfferAccepted: { label: 'Offer accepted', tone: 'good', next: [] },
  OfferDeclined: { label: 'Offer declined', tone: '', next: [] },
  EmployerRejected: { label: 'Rejected by employer', tone: 'bad', next: [] },
  RejectedByUser: { label: 'Rejected by you', tone: '', next: ['AwaitingApproval', 'Archived'] },
  Withdrawn: { label: 'Withdrawn', tone: '', next: [] },
  Archived: { label: 'Archived', tone: '', next: ['Analyzed'] },
};
const EMPLOYER_STAGES = ['UnderReview', 'EmployerShortlisted', 'InterviewScheduled', 'OfferReceived', 'OfferAccepted', 'OfferDeclined', 'EmployerRejected', 'Withdrawn'];
const EVIDENCE = ['Recruiter email', 'Job portal status', 'Phone call', 'Interview invitation', 'Offer letter', 'Rejection email', 'In person', 'Other'];
const stagePill = st => `<span class="pill ${(STAGES[st] || {}).tone || ''}">${esc((STAGES[st] || { label: st }).label)}</span>`;
const reached = (j, st) => j.stage === st || (j.history || []).some(h => h.to === st);
function canMove(j, to) { return (STAGES[j.stage] || { next: [] }).next.includes(to); }
function moveStage(j, to, { by = 'You', evidence = '', note = '', silent = false } = {}) {
  if (!canMove(j, to)) throw new Error(`Can’t move from ${STAGES[j.stage].label} to ${STAGES[to].label}.`);
  j.history = j.history || []; j.history.push({ from: j.stage, to, t: nowISO(), by, evidence, note });
  j.stage = to; save.job(j);
  logAgent('Application Tracking Agent', `${STAGES[to].label}`, `${j.title} @ ${j.company}${evidence ? ' · evidence: ' + evidence : ''}${note ? ' · ' + note : ''}`);
  if (!silent && ['AwaitingApproval', 'Applied', 'EmployerShortlisted', 'InterviewScheduled', 'OfferReceived', 'EmployerRejected', 'SubmissionFailed'].includes(to)) notify(to, `${j.company}: ${STAGES[to].label} — ${j.title}`, j.id);
}
function advanceTo(j, target, opts) { // walk the machine along the happy path
  const path = ['Discovered', 'Analyzed', 'Shortlisted', 'ResumeGenerated', 'AwaitingApproval'];
  let guard = 0; while (j.stage !== target && guard++ < 8) { const i = path.indexOf(j.stage); const nx = path[i + 1]; if (i < 0 || !nx || !canMove(j, nx)) break; moveStage(j, nx, { ...opts, silent: nx !== target }); }
}

/* ============ Application preparation ============ */
const STD_QUESTIONS = [
  ['name', 'Full name', true], ['email', 'Email address', true], ['phone', 'Phone number', true], ['location', 'Current location', true],
  ['linkedin', 'LinkedIn profile', false], ['portfolio', 'GitHub or portfolio link', false], ['totalExp', 'Total experience (years)', true],
  ['currentCtc', 'Current CTC', false], ['expectedCtc', 'Expected CTC', true], ['notice', 'Notice period', true], ['relocate', 'Willing to relocate?', true],
  ['qualification', 'Highest qualification', true], ['gradYear', 'Year of graduation', false], ['skills', 'Key skills', true], ['workAuth', 'Are you legally authorised to work in India?', true],
  ['whyUs', 'Why do you want to join {company}?', true], ['cover', 'Cover note', false],
];
function answerFromProfile(key, p, job, v) {
  const pr = S.prefs || {}; const edu = [...(p.education || [])].sort((a, b) => (degreeLevel(b.degree) ?? -1) - (degreeLevel(a.degree) ?? -1))[0];
  const y = candidateYears(p);
  switch (key) {
    case 'name': return [p.name, 'Profile › Contact'];
    case 'email': return [p.email, 'Profile › Contact'];
    case 'phone': return [p.phone, 'Profile › Contact'];
    case 'location': return [p.location, 'Profile › Contact'];
    case 'linkedin': return [p.linkedin, 'Profile › Contact'];
    case 'portfolio': return [p.github || p.portfolio, 'Profile › Contact'];
    case 'totalExp': return [String(y), y ? 'Profile › Experience' : 'Profile › Experience (no full-time roles)'];
    case 'currentCtc': return [p.currentCtc ? lpa(+p.currentCtc) : (y < 1 && !(p.experiences || []).some(e => !isIntern(e)) ? 'Not applicable (fresher)' : ''), p.currentCtc ? 'Profile › Compensation' : 'Profile › Experience'];
    case 'expectedCtc': { const a = pr.salaryMin ?? p.expectedMin, b = pr.salaryMax ?? p.expectedMax; return [(a != null || b != null) ? salaryRange(a, b) : '', 'What job I want › Salary']; }
    case 'notice': return [p.noticePeriod || '', 'Profile › Availability'];
    case 'relocate': return [p.relocate === true ? 'Yes' : p.relocate === false ? 'No' : '', 'Profile › Availability'];
    case 'qualification': return [edu ? [edu.degree, edu.institution].filter(Boolean).join(', ') : '', 'Profile › Education'];
    case 'gradYear': return [edu ? edu.year : '', 'Profile › Education'];
    case 'skills': return [((v && v.content.skills) || profileSkillNames(p)).slice(0, 10).join(', '), v ? 'Tailored resume › Skills' : 'Profile › Skills'];
    case 'workAuth': return [p.workAuth || '', 'Profile › Availability'];
    case 'whyUs': {
      const m = job.match || {}; const lead = (m.matchedRequired || []).slice(0, 3); const pj = (m.projects || [])[0];
      return [`The ${job.title} role matches the work I have been doing${lead.length ? ' with ' + lead.join(', ') : ''}.${pj && pj.rel >= 40 ? ` My project ${pj.name} used ${pj.hits.join(', ')}, which maps to this role.` : ''} I would like to grow this experience at ${job.company}.`, 'Draft from verified profile — review'];
    }
    case 'cover': {
      const e0 = (p.experiences || [])[0];
      return [`Dear Hiring Team,\n\nI am applying for the ${job.title} position at ${job.company}. ${(v && v.content.summary) || p.summary || ''}\n\n${e0 ? `Most recently I worked as ${e0.role}${e0.employer ? ' at ' + e0.employer : ''}. ` : ''}I would welcome the chance to discuss how I can contribute.\n\nRegards,\n${p.name || ''}`.trim(), 'Draft from verified profile — review'];
    }
  }
  return ['', ''];
}
async function prepareApplication(j, { custom = [] } = {}) {
  const p = S.profile; const v = S.versions[j.app && j.app.versionId];
  let answers = STD_QUESTIONS.map(([k, q, req]) => { const [a, ev] = answerFromProfile(k, p, j, v); return { id: uid('q'), key: k, q: q.replace('{company}', j.company), a: a || '', evidence: a ? ev : '', needsInput: !a && req, required: req, draft: /Draft/.test(ev) }; });
  const extra = custom.filter(Boolean);
  if (extra.length) {
    const prompt = `Answer job application questions ONLY from the verified candidate profile below. If the profile does not contain the answer, reply with an empty answer and needs_input true. Never invent facts, numbers, dates or skills.
${UNTRUSTED}
Profile: ${JSON.stringify({ name: p.name, location: p.location, totalYears: candidateYears(p), skills: profileSkillNames(p), experiences: p.experiences, projects: p.projects, education: p.education, noticePeriod: p.noticePeriod, relocate: p.relocate })}
Questions: <untrusted>${JSON.stringify(extra)}</untrusted>
Reply with only a JSON array: [{"question": string, "answer": string, "evidence": "which profile field supports it", "needs_input": boolean}]`;
    const { out, engine } = await AI.route({ personal: true, label: 'Answering employer questions…', prompt, validate: o => Array.isArray(o), local: async () => extra.map(q => ({ question: q, answer: '', evidence: '', needs_input: true })) });
    out.forEach((o, i) => answers.push({ id: uid('q'), key: 'custom', q: String(o.question || extra[i]), a: String(o.answer || ''), evidence: o.answer ? `${engine === 'ai' ? AI.name : 'Local'} answer from ${o.evidence || 'profile'} — review` : '', needsInput: !!o.needs_input || !o.answer, required: true, draft: true }));
  }
  j.app = j.app || {}; j.app.answers = answers; j.app.preparedAt = nowISO(); j.app.approval = null;
  logAgent('Application Agent', 'Prepared application', `${j.title} @ ${j.company}: ${answers.filter(a => a.needsInput).length} answer(s) need your input`);
  return j;
}
function snapshotOf(j) {
  const v = S.versions[j.app && j.app.versionId];
  return { jobId: j.id, title: j.title, company: j.company, applyUrl: j.applyUrl || '', versionId: v ? v.id : null, resumeHash: v ? v.hash : null, answers: ((j.app && j.app.answers) || []).map(a => ({ q: a.q, a: a.a })) };
}
async function snapshotHash(j) { return sha256(stableStringify(snapshotOf(j))); }
async function approvalState(j) {
  const ap = j.app && j.app.approval; if (!ap) return { ok: false, why: 'Not approved yet' };
  if (ap.expiresAt && new Date(ap.expiresAt) < new Date()) return { ok: false, why: 'Approval expired', expired: true };
  const h = await snapshotHash(j); if (h !== ap.hash) return { ok: false, why: 'The application changed after you approved it', changed: true };
  return { ok: true, hash: h };
}
async function invalidateIfChanged(j, reason) {
  if (j.stage === 'Approved') { const st = await approvalState(j); if (!st.ok) { j.app.approval = null; moveStage(j, 'AwaitingApproval', { by: 'System', note: 'Approval invalidated: ' + (reason || st.why) }); notify('invalidated', `${j.company}: approval cleared because ${reason || st.why.toLowerCase()}`, j.id); } }
}

/* ============ Shortlist / interview / rejection intelligence ============ */
const QBANK = {
  'Python': ['How do lists, tuples and dicts differ, and when would you pick each?', 'Explain generators and why they save memory.', 'What does the GIL mean for multi-threaded Python code?'],
  'Django': ['Walk through the request/response cycle in Django.', 'How do you avoid N+1 queries with select_related and prefetch_related?', 'How do migrations work and how do you resolve a migration conflict?'],
  'Flask': ['How do you structure a larger Flask app with blueprints?', 'How does Flask handle application and request context?'],
  'FastAPI': ['How does FastAPI use type hints for validation?', 'When would you use async endpoints, and what can block the event loop?'],
  'REST APIs': ['How do you design resource URLs and status codes for a REST API?', 'What makes an API idempotent? Which HTTP methods should be?', 'How would you version and paginate an API?'],
  'MySQL': ['Explain indexes; when can an index make writes slower?', 'Write a query to find the second-highest salary.', 'What are the differences between INNER, LEFT and RIGHT joins?'],
  'PostgreSQL': ['What is a transaction isolation level and which does PostgreSQL default to?', 'When would you use JSONB columns?'],
  'SQL': ['What is normalisation? Explain 1NF–3NF with an example.', 'Explain GROUP BY with HAVING versus WHERE.'],
  'JavaScript': ['Explain closures with an example.', 'What is the event loop? How do microtasks differ from macrotasks?', 'Difference between == and ===, and between let, const and var.'],
  'TypeScript': ['What is the difference between an interface and a type alias?', 'How do generics help in TypeScript?'],
  'React': ['How does reconciliation work and why are keys needed?', 'When do you use useMemo or useCallback?', 'How would you manage state that many components share?'],
  'Next.js': ['Compare server-side rendering, static generation and client rendering in Next.js.', 'What are server components?'],
  'Node.js': ['How does Node handle concurrency with a single thread?', 'How do you handle errors in async/await code in Express?'],
  'PHP': ['What changed in PHP 8 that you use day to day?', 'How do you prevent SQL injection in PHP?'],
  'Laravel': ['Explain Eloquent relationships and eager loading.', 'How does middleware work in Laravel?'],
  'Java': ['Explain the difference between an abstract class and an interface.', 'How does HashMap work internally?'],
  'Spring Boot': ['What does @SpringBootApplication do?', 'How does dependency injection work in Spring?'],
  'Git': ['How do you resolve a merge conflict?', 'Difference between merge and rebase; when would you use each?'],
  'Docker': ['What is the difference between an image and a container?', 'How do you keep Docker images small?'],
  'AWS': ['Which AWS services would you use to host a web app and why?', 'What is the difference between S3 and EBS?'],
  'MongoDB': ['When would you choose MongoDB over a relational database?', 'How do indexes work in MongoDB?'],
  'Data Structures & Algorithms': ['Reverse a linked list. What is the complexity?', 'Find two numbers in an array that add up to a target.'],
  'OOP': ['Explain the four pillars of OOP with examples.', 'What is the difference between composition and inheritance?'],
  'HTML': ['What is semantic HTML and why does it matter for accessibility?'], 'CSS': ['Explain the box model and how flexbox differs from grid.'],
  'Machine Learning': ['Explain the bias–variance trade-off.', 'How do you handle class imbalance?'],
  'Linux': ['How do you find which process is using a port?', 'Explain file permissions and chmod.'],
  'Unit Testing': ['What makes a good unit test?', 'How do you mock an external API in tests?'],
};
const HR_QS = ['Tell me about yourself.', 'Why do you want to work here?', 'Describe a technical problem you got stuck on and how you solved it.', 'Where do you see yourself in two years?', 'What are your salary expectations?'];
const CERT_HINTS = { AWS: 'AWS Certified Cloud Practitioner', Azure: 'Microsoft Azure Fundamentals (AZ-900)', GCP: 'Google Cloud Digital Leader', Docker: 'Docker / container fundamentals course', Kubernetes: 'Kubernetes and Cloud Native Associate (KCNA)', Python: 'PCEP / PCAP Python certification', Java: 'Oracle Java SE certification', 'Machine Learning': 'Google or DeepLearning.AI ML specialisation', SQL: 'Database / SQL certification (e.g. Oracle, Microsoft)', React: 'Meta Front-End Developer certificate', JavaScript: 'JavaScript algorithms and data structures certificate' };
function prepPlan(job, days = 7) {
  const m = job.match || scoreJob(job, S.profile, S.prefs, S.settings.weights);
  const topics = uniqCI([...m.missingRequired.map(s => ({ s, k: 'learn' })), ...m.matchedRequired.map(s => ({ s, k: 'revise' })), ...m.missingPreferred.slice(0, 3).map(s => ({ s, k: 'basics' })), ...m.matchedPreferred.slice(0, 3).map(s => ({ s, k: 'revise' }))].map(x => JSON.stringify(x))).map(x => JSON.parse(x));
  const n = clamp(Math.round(days), 1, 14);
  const plan = []; const per = Math.max(1, Math.ceil(topics.length / Math.max(1, n - 1)));
  for (let d = 0; d < n; d++) {
    if (d === n - 1) { plan.push({ day: d + 1, focus: 'Mock interview and review', tasks: ['Run a 45-minute mock interview with the questions below', `Rehearse a 2-minute walk-through of ${(m.projects[0] || {}).name || 'your best project'}`, `Research ${job.company}: product, customers, recent news`] }); continue; }
    const slice = topics.slice(d * per, d * per + per);
    if (!slice.length) { plan.push({ day: d + 1, focus: 'Practice problems', tasks: ['Solve 3 coding problems (arrays, strings, hashing)', 'Re-read the job description and map each line to an example from your work'] }); continue; }
    plan.push({ day: d + 1, focus: slice.map(x => x.s).join(', '), tasks: slice.map(x => x.k === 'learn' ? `Learn the fundamentals of ${x.s} and build a small demo (gap: required by the role)` : x.k === 'basics' ? `Skim ${x.s} basics (nice-to-have)` : `Revise ${x.s}: core concepts and the questions below`) });
  }
  const skillQs = [...m.matchedRequired, ...m.missingRequired, ...m.matchedPreferred].flatMap(s => (QBANK[s] || []).slice(0, 2).map(q => ({ topic: s, q })));
  const projQs = (m.projects || []).slice(0, 2).map(x => ({ topic: 'Project', q: `Walk me through ${x.name}. Why did you choose ${(x.hits || []).slice(0, 2).join(' and ') || 'that stack'}, and what would you change?` }));
  return { topics, plan, questions: [...skillQs.slice(0, 14), ...projQs, ...HR_QS.map(q => ({ topic: 'HR', q }))] };
}
function shortlistLocal(j) {
  const m = j.match || scoreJob(j, S.profile, S.prefs, S.settings.weights); const v = S.versions[j.app && j.app.versionId];
  const reqs = [...(j.requiredSkills || []).map(s => ({ req: s, status: m.matchedRequired.includes(canonSkill(s)) ? 'met' : 'gap', kind: 'Required skill' })), ...(j.preferredSkills || []).map(s => ({ req: s, status: m.matchedPreferred.includes(canonSkill(s)) ? 'met' : 'partial', kind: 'Preferred skill' })),
    { req: `Experience: ${j.expMin ?? '?'}${j.expMax != null ? '–' + j.expMax : '+'} yrs`, status: m.components.E.v >= 90 ? 'met' : m.components.E.unknown ? 'partial' : 'gap', kind: 'Experience', note: m.components.E.note },
    { req: `Education: ${j.education || 'not stated'}`, status: m.components.Q.v >= 90 ? 'met' : m.components.Q.unknown ? 'partial' : 'gap', kind: 'Education', note: m.components.Q.note }];
  const plan = prepPlan(j, j.app && j.app.interviews && j.app.interviews[0] ? Math.max(1, Math.ceil((new Date(j.app.interviews[0].at) - Date.now()) / 86400000)) : 7);
  return {
    requirements: reqs, contributors: [...m.matchedRequired.map(s => `Skill: ${s}`), ...m.projects.filter(x => x.rel >= 50).map(x => `Project: ${x.name} (${x.hits.join(', ')})`), m.components.E.v >= 90 ? 'Experience within the requested range' : null].filter(Boolean),
    sections: [v ? `Tailored summary and skills (ATS coverage ${v.coverage}%)` : 'Skills section', ...m.projects.slice(0, 2).map(x => `Projects › ${x.name}`), (S.profile.experiences || [])[0] ? `Experience › ${(S.profile.experiences || [])[0].role}` : null].filter(Boolean),
    projects: m.projects, prepTopics: plan.topics.map(t => `${t.s} — ${t.k === 'learn' ? 'learn (required gap)' : t.k === 'basics' ? 'basics (nice-to-have)' : 'revise'}`),
    questions: plan.questions, weaknesses: [...m.weaknesses, ...m.unknowns.map(u => 'Unclear: ' + u)], schedule: plan.plan,
    summary: `Your application most likely stood out for ${m.matchedRequired.slice(0, 3).join(', ') || 'your overall profile'}${m.projects[0] && m.projects[0].rel >= 50 ? ` and the ${m.projects[0].name} project` : ''}. This is an inference from the job requirements, not employer feedback.`,
  };
}
function rejectionLocal(j) {
  const m = j.match || scoreJob(j, S.profile, S.prefs, S.settings.weights); const v = S.versions[j.app && j.app.versionId]; const fb = (j.app && j.app.feedback) || {};
  const R = [];
  const fbText = String(fb.text || '');
  if (fbText.trim()) R.push({ level: 'Confirmed', factor: 'Employer feedback', detail: fbText, source: fb.source || 'Employer' });
  const fbMentions = s => fbText && new RegExp('(?<![a-z])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])', 'i').test(fbText);
  m.missingRequired.forEach(s => R.push({ level: fbMentions(s) ? 'Confirmed' : 'Strongly supported', factor: `Missing required skill: ${s}`, detail: `Listed as required in the posting; not in your profile.`, source: 'Job description vs profile' }));
  if (m.components.E.v < 70 && !m.components.E.unknown) R.push({ level: /experience/i.test(fbText) ? 'Confirmed' : 'Strongly supported', factor: 'Insufficient experience', detail: m.components.E.note, source: 'Job description vs profile' });
  if (m.components.Q.v < 60 && !m.components.Q.unknown) R.push({ level: 'Strongly supported', factor: 'Education mismatch', detail: m.components.Q.note, source: 'Job description vs profile' });
  if (m.components.C.v < 60 && !m.components.C.unknown) R.push({ level: /salary|budget|ctc|compensation/i.test(fbText) ? 'Confirmed' : 'Possible', factor: 'Salary expectation above budget', detail: m.components.C.note, source: 'Stated salary vs your expectation' });
  if (m.components.L.v < 50 && !m.components.L.unknown) R.push({ level: /location|relocat/i.test(fbText) ? 'Confirmed' : 'Possible', factor: 'Location', detail: m.components.L.note, source: 'Job location vs preferences' });
  if (v && v.coverage < 60) R.push({ level: 'Possible', factor: 'Keyword mismatch', detail: `Tailored resume covered ${v.coverage}% of the posting’s skills (missing: ${v.keywordsMissing.slice(0, 5).join(', ')}).`, source: 'Resume version ' + v.version });
  if (!v) R.push({ level: 'Possible', factor: 'Generic resume', detail: 'No job-specific resume version was generated for this application.', source: 'Application record' });
  if (m.components.P.v < 40) R.push({ level: 'Possible', factor: 'Weak project relevance', detail: 'Your listed projects show little of this role’s stack.', source: 'Projects vs job skills' });
  const appliedH = (j.history || []).find(h => h.to === 'Applied'); const posted = j.postedAt || j.discoveredAt;
  if (appliedH && posted && (new Date(appliedH.t) - new Date(posted)) / 86400000 > 21) R.push({ level: 'Possible', factor: 'Late application', detail: `Applied ${Math.round((new Date(appliedH.t) - new Date(posted)) / 86400000)} days after the job was posted or found.`, source: 'Application timeline' });
  R.push({ level: 'Unknown', factor: 'Competition, timing and internal decisions', detail: 'Other candidates, an internal hire, budget changes or a paused role can cause rejections that no resume change would fix.', source: 'Insufficient information' });
  const recs = [];
  if (m.missingRequired.length) recs.push(`Learn ${m.missingRequired.slice(0, 3).join(', ')} and add a small project that uses ${m.missingRequired.length > 1 ? 'them' : 'it'}.`);
  if (v && v.keywordsMissing.length) { const inProfile = v.keywordsMissing.filter(k => lcSet(profileSkillNames(S.profile)).has(k.toLowerCase())); if (inProfile.length) recs.push(`Your profile has ${inProfile.join(', ')} but the resume did not show ${inProfile.length > 1 ? 'them' : 'it'}; add project bullets that use ${inProfile.length > 1 ? 'them' : 'it'}.`); }
  m.missingRequired.filter(s => CERT_HINTS[s]).slice(0, 2).forEach(s => recs.push(`Consider: ${CERT_HINTS[s]}.`));
  if (m.components.E.v < 70) recs.push('Target roles that ask for 0–2 years, or internships that convert to full-time.');
  if (m.components.P.v < 50) recs.push('Rewrite project descriptions to state the problem, your role, the stack and the outcome.');
  recs.push('Ask the recruiter for feedback; a confirmed reason is worth more than any inference here.');
  const hasConfirmed = R.some(r => r.level === 'Confirmed');
  return { reasons: R, confirmed: R.filter(r => r.level === 'Confirmed'), inferred: R.filter(r => r.level === 'Strongly supported' || r.level === 'Possible'), unknown: R.filter(r => r.level === 'Unknown'), recommendations: recs, confidence: hasConfirmed ? 'High (employer feedback available)' : R.some(r => r.level === 'Strongly supported') ? 'Medium (documented requirement gaps)' : 'Low (no employer feedback)' };
}
function analysisPrompt(kind, j) {
  const p = S.profile; const v = S.versions[j.app && j.app.versionId];
  const ctx = { profile: { totalYears: candidateYears(p), skills: profileSkillNames(p), projects: (p.projects || []).map(x => ({ name: x.name, technologies: x.technologies })), experiences: (p.experiences || []).map(e => ({ role: e.role, employer: e.employer })), education: p.education },
    job: { title: j.title, company: j.company, required: j.requiredSkills, preferred: j.preferredSkills, experience: [j.expMin, j.expMax], education: j.education, responsibilities: j.responsibilities }, match: j.match && { score: j.match.score, components: j.match.components, missingRequired: j.match.missingRequired }, tailoredResumeCoverage: v && v.coverage, timeline: (j.history || []).map(h => ({ to: h.to, t: h.t.slice(0, 10), evidence: h.evidence })), employerFeedback: j.app && j.app.feedback };
  if (kind === 'rejection') return `Analyse why this job application may have been rejected. Classify each reason as "Confirmed" (directly stated in employerFeedback), "Strongly supported" (backed by application evidence such as a documented mandatory requirement), "Possible" (inferred) or "Unknown". Never present an inference as the employer's reasoning. Always include competition/timing as Unknown. Do not assume every rejection is caused by the resume.
${UNTRUSTED}
<untrusted>${JSON.stringify(ctx)}</untrusted>
Reply with only JSON: {"reasons":[{"level":"Confirmed"|"Strongly supported"|"Possible"|"Unknown","factor":string,"detail":string,"source":string}],"recommendations":[string] (skills, projects, resume changes, certifications, job categories, interview prep),"confidence":string}`;
  return `Write a shortlisting analysis and interview preparation plan for this candidate, who was shortlisted. Base everything on the data; label guesses as likely, not certain.
${UNTRUSTED}
<untrusted>${JSON.stringify(ctx)}</untrusted>
Reply with only JSON: {"summary":string,"contributors":[string],"sections":[string],"prepTopics":[string],"questions":[{"topic":string,"q":string}] (10-15, specific to the stack and projects),"weaknesses":[string],"schedule":[{"day":number,"focus":string,"tasks":[string]}] (7 days)}`;
}

/* ============ Analytics ============ */
function analytics(jobsArg) {
  const jobs = jobsArg || Object.values(S.jobs);
  const applied = jobs.filter(j => reached(j, 'Applied'));
  const short = applied.filter(j => reached(j, 'EmployerShortlisted') || reached(j, 'InterviewScheduled') || reached(j, 'OfferReceived'));
  const rej = applied.filter(j => j.stage === 'EmployerRejected');
  const inter = applied.filter(j => reached(j, 'InterviewScheduled') || (j.app && (j.app.interviews || []).length));
  const offers = applied.filter(j => reached(j, 'OfferReceived'));
  const matching = jobs.filter(j => j.match && j.match.score >= 70);
  const missing = new Map(); jobs.filter(j => j.match).forEach(j => (j.match.missingRequired || []).forEach(s => missing.set(s, (missing.get(s) || 0) + 1)));
  const rejMissing = new Map(); rej.forEach(j => ((j.match && j.match.missingRequired) || []).forEach(s => rejMissing.set(s, (rejMissing.get(s) || 0) + 1)));
  const catOf = j => { const t = j.title.toLowerCase(); if (/full[- ]?stack/.test(t)) return 'Full Stack'; if (/front[- ]?end|react|ui/.test(t)) return 'Frontend'; if (/back[- ]?end|api/.test(t)) return 'Backend'; if (/python|django/.test(t)) return 'Python'; if (/data|analyst|ml|machine/.test(t)) return 'Data / ML'; if (/test|qa/.test(t)) return 'QA / Testing'; if (/java\b|spring/.test(t)) return 'Java'; if (/php|laravel|wordpress/.test(t)) return 'PHP'; if (/intern/.test(t)) return 'Internship'; return 'Other'; };
  const cats = {}; jobs.forEach(j => { const c = catOf(j); cats[c] = cats[c] || { jobs: 0, applied: 0, shortlisted: 0, avgScore: 0, _s: [] }; cats[c].jobs++; if (j.match) cats[c]._s.push(j.match.score); if (reached(j, 'Applied')) cats[c].applied++; if (short.includes(j)) cats[c].shortlisted++; });
  Object.values(cats).forEach(c => { c.avgScore = c._s.length ? Math.round(sum(c._s) / c._s.length) : null; delete c._s; });
  const locs = {}; jobs.forEach(j => { const cs = j.workMode === 'remote' ? ['Remote'] : (detectCities(j.location).length ? detectCities(j.location) : ['Unspecified']); cs.forEach(c => { locs[c] = locs[c] || { jobs: 0, scores: [], sal: [] }; locs[c].jobs++; if (j.match) locs[c].scores.push(j.match.score); if (j.salaryMin != null || j.salaryMax != null) locs[c].sal.push(((j.salaryMin ?? j.salaryMax) + (j.salaryMax ?? j.salaryMin)) / 2); }); });
  const sources = {}; jobs.forEach(j => { const s = SOURCE_NAME[j.source] || j.source; sources[s] = sources[s] || { jobs: 0, applied: 0, shortlisted: 0 }; sources[s].jobs++; if (reached(j, 'Applied')) sources[s].applied++; if (short.includes(j)) sources[s].shortlisted++; });
  const companies = uniq(short.map(j => j.company));
  const cov = arr => { const v = arr.map(j => S.versions[j.app && j.app.versionId]).filter(Boolean).map(v => v.coverage); return v.length ? Math.round(sum(v) / v.length) : null; };
  const salMonth = {}; jobs.forEach(j => { if (j.salaryMin == null && j.salaryMax == null) return; const m = (j.postedAt || j.discoveredAt || '').slice(0, 7); if (!m) return; salMonth[m] = salMonth[m] || []; salMonth[m].push(((j.salaryMin ?? j.salaryMax) + (j.salaryMax ?? j.salaryMin)) / 2); });
  const hist = [0, 0, 0, 0, 0]; jobs.filter(j => j.match).forEach(j => { const s = j.match.score; hist[s >= 85 ? 4 : s >= 70 ? 3 : s >= 50 ? 2 : s >= 30 ? 1 : 0]++; });
  return {
    total: jobs.length, matching: matching.length, applied: applied.length, shortlisted: short.length, rejected: rej.length, interviews: inter.length, offers: offers.length,
    awaiting: jobs.filter(j => j.stage === 'AwaitingApproval' || j.stage === 'Approved').length,
    shortlistRate: pct(short.length, applied.length), rejectionRate: pct(rej.length, applied.length), interviewRate: pct(inter.length, applied.length), offerRate: pct(offers.length, inter.length),
    missing: [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10), rejMissing: [...rejMissing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    cats, locs, sources, companies, coverageShort: cov(short), coverageRej: cov(rej), salMonth, hist,
  };
}
function buildReport(type) {
  const days = type === 'weekly' ? 7 : 30; const since = Date.now() - days * 86400000;
  const all = Object.values(S.jobs);
  const inPeriod = t => t && new Date(t).getTime() >= since;
  const found = all.filter(j => inPeriod(j.discoveredAt));
  const moved = to => all.filter(j => (j.history || []).some(h => h.to === to && inPeriod(h.t)));
  const A = analytics(); const P = analytics(found.length ? found : []);
  const lines = [`# ${type === 'weekly' ? 'Weekly' : 'Monthly'} career report`, `Period: ${fmtDate(new Date(since).toISOString())} – ${fmtDate(nowISO())}`, '',
    '## This period', `- Jobs discovered: **${found.length}** (${found.filter(j => j.match && j.match.score >= 70).length} matched 70+)`, `- Applications submitted: **${moved('Applied').length}**`,
    `- Shortlisted by employers: **${moved('EmployerShortlisted').length}**`, `- Interviews scheduled: **${moved('InterviewScheduled').length}**`, `- Rejections: **${moved('EmployerRejected').length}**`, `- Offers: **${moved('OfferReceived').length}**`, '',
    '## All-time conversion', `- Shortlisting rate: **${A.shortlistRate}%** of ${A.applied} applications`, `- Rejection rate: **${A.rejectionRate}%**`, `- Interview rate: **${A.interviewRate}%**`, `- Offer conversion (offers ÷ interviews): **${A.offerRate}%**`, '',
    '## Most common missing skills', ...(A.missing.length ? A.missing.slice(0, 6).map(([s, n]) => `- ${s}: missing in ${n} job${n > 1 ? 's' : ''}`) : ['- None recorded yet']), '',
    '## Where the opportunities are', ...Object.entries(A.locs).sort((a, b) => b[1].jobs - a[1].jobs).slice(0, 5).map(([c, v]) => `- ${c}: ${v.jobs} job${v.jobs > 1 ? 's' : ''}${v.scores.length ? `, average match ${Math.round(sum(v.scores) / v.scores.length)}` : ''}${v.sal.length ? `, median pay ${lpa(v.sal.sort((a, b) => a - b)[Math.floor(v.sal.length / 2)])}` : ''}`), '',
    '## Resume performance', `- Average keyword match on shortlisted applications: ${A.coverageShort ?? '—'}%`, `- Average keyword match on rejected applications: ${A.coverageRej ?? '—'}%`, '',
    '## Recommendations', ...(A.missing[0] ? [`- Close the most frequent gap: ${A.missing.slice(0, 2).map(x => x[0]).join(' and ')}.`] : []),
    ...(A.applied < 5 ? ['- Apply to more roles: fewer than 5 applications make the rates above unreliable.'] : []),
    ...(A.awaiting ? [`- ${A.awaiting} application${A.awaiting > 1 ? 's are' : ' is'} waiting for your approval.`] : []),
    ...(Object.entries(A.cats).filter(([, c]) => c.applied >= 2).sort((a, b) => (b[1].shortlisted / b[1].applied) - (a[1].shortlisted / a[1].applied)).slice(0, 1).map(([c, v]) => `- Your best-performing category is ${c} (${v.shortlisted}/${v.applied} shortlisted). Weight discovery toward it.`)),
    '', '_Rates are computed from the records in this workspace. Reasons for outcomes are inferences unless an employer stated them._'];
  return { id: uid('r'), type, createdAt: nowISO(), md: lines.join('\n') };
}
function mdHTML(md) {
  const inline = s => esc(s).replace(/\[([^\]]+)\]\((#[a-z0-9-]+|https:\/\/[^\s)]+)\)/gi, (m, t, u) => `<a href="${u}"${u[0] === '#' ? '' : ' target="_blank" rel="noopener noreferrer"'}>${t}</a>`).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\s)_(.+?)_(?=\s|$|[.,])/g, '$1<i>$2</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out = []; let inList = false;
  for (const l of String(md || '').split('\n')) {
    if (/^\s*[-*]\s+/.test(l)) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue; }
    if (inList) { out.push('</ul>'); inList = false; }
    if (/^#\s/.test(l)) out.push('<h2>' + inline(l.slice(2)) + '</h2>'); else if (/^#{2,3}\s/.test(l)) out.push('<h3>' + inline(l.replace(/^#+\s/, '')) + '</h3>'); else if (l.trim()) out.push('<p>' + inline(l) + '</p>');
  }
  if (inList) out.push('</ul>');
  return out.join('');
}
