# End-to-end test of the website in a real browser, against dev/mock-server.mjs.
#   1) node dev/mock-server.mjs          (set MOCK_SITE_PORT if 8080 is taken)
#   2) pip install playwright            (uses your installed Chrome; no browser download)
#   3) python dev/test_site.py           (SITE_URL=http://localhost:<port>/ if you changed the port)
import asyncio, json, os, subprocess, urllib.request
from playwright.async_api import async_playwright

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
WORKER = os.path.join(ROOT, 'worker')
SITE = os.environ.get('SITE_URL', 'http://localhost:8080/'); API = os.environ.get('MOCK_API_URL', 'http://localhost:54321')
RES = []; ERR = []
def check(name, cond, detail=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else f'  -> {str(detail)[:400]}'))
def state(): return json.load(urllib.request.urlopen(API + '/__state'))
def post(p, b): urllib.request.urlopen(urllib.request.Request(API + p, data=json.dumps(b).encode(), headers={'Content-Type': 'application/json'}, method='POST')).read()
def rows_of(uid, kind=None): return [r for r in state()['rows'] if r['user_id'] == uid and (kind is None or r['kind'] == kind)]
KEYS = json.loads(subprocess.run(['node', '-e', "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"], cwd=WORKER, capture_output=True, text=True).stdout)
BASE_CONFIG = json.loads(urllib.request.urlopen(SITE + 'config.js').read().decode().split('=', 1)[1].rstrip().rstrip(';'))
def config(cloud=True):
    c = dict(BASE_CONFIG); c['VAPID_PUBLIC_KEY'] = KEYS['publicKey']
    if not cloud: c['SUPABASE_ANON_KEY'] = 'YOUR_SUPABASE_ANON_KEY'
    return 'window.APP_CONFIG = ' + json.dumps(c) + ';'
GEM = {'mode': 'ok'}
async def route_gemini(route):
    if GEM['mode'] == '429': return await route.fulfill(status=429, body='{}', headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json')
    body = json.loads(route.request.post_data or '{}'); prompt = body['contents'][-1]['parts'][0]['text']
    out = json.dumps({'job_titles': ['Python Developer'], 'skills': ['Python'], 'locations': ['Hyderabad'], 'work_modes': [], 'experience': {'min_years': 0, 'max_years': 2}, 'salary': {'min': 400000, 'max': 700000}, 'employment_type': ['full_time'], 'company_types': [], 'industries': [], 'other_requirements': '', 'ambiguities': []}) if 'job-search request' in prompt else 'OK'
    await route.fulfill(status=200, body=json.dumps({'candidates': [{'content': {'parts': [{'text': out}]}, 'finishReason': 'STOP'}]}), headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json')
QUIET = ['favicon', 'incognito', '400 (Bad Request)', '404 (Not Found)', '429', 'push service', 'registration failed']
async def page_for(b, cloud=True, width=1300, height=900, **kw):
    ctx = await b.new_context(viewport={'width': width, 'height': height}, accept_downloads=True, **kw); page = await ctx.new_page()
    page.on('pageerror', lambda e: ERR.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: ERR.append('CONSOLE ' + m.text) if m.type == 'error' and not any(q in m.text.lower() for q in [x.lower() for x in QUIET]) else None)
    await page.route('https://generativelanguage.googleapis.com/**', route_gemini)
    await page.route(SITE + 'config.js', lambda r: r.fulfill(body=config(cloud), content_type='application/javascript'))
    await ctx.route('https://t.me/**', lambda r: r.fulfill(body='<html>telegram</html>', content_type='text/html'))
    return ctx, page
ev = lambda p, js: p.evaluate(js)
async def settle(p): await p.wait_for_function("typeof S!=='undefined' && S.mode!=='loading'", timeout=20000); await p.wait_for_timeout(300)
async def nav(p, h, w=250): await p.evaluate(f"location.hash='{h}'"); await p.wait_for_timeout(w)
async def toast(p): return await ev(p, "[...document.querySelectorAll('.toast')].map(t=>t.textContent).slice(-1)[0]||''")
async def content(p): return await ev(p, "document.querySelector('.content').innerText")
async def sign_in(p, email, pw): await p.fill('#auth-email', email); await p.fill('#auth-password', pw); await p.click('form[data-form=auth] button[type=submit]'); await settle(p)
async def search(p):
    await p.click('.content [data-act=find-jobs]'); await p.wait_for_function("!S.ui.searching", timeout=30000); await p.wait_for_timeout(500)
RESUME = """Asha Verma
asha.verma@example.com | +91 98765 43210 | Hyderabad
linkedin.com/in/ashaverma | github.com/ashaverma

SUMMARY
Computer science graduate who builds web applications with Python and Django.

SKILLS
Python, Django, REST APIs, MySQL, SQL, Git, JavaScript, React, HTML, CSS

PROJECTS
Placement Portal | Django, MySQL
- Built a placement portal with Django and MySQL used by 300 students.
- Designed REST APIs for job listings.

EXPERIENCE
Python Developer Intern, Brightleaf Software (Jan 2026 - Jun 2026)
- Built REST APIs with Django REST Framework.

EDUCATION
B.Tech in Computer Science, JNTU Hyderabad, 2026, 8.1 CGPA"""

async def main():
    urllib.request.urlopen(API + '/__reset').read()
    async with async_playwright() as pw:
        b = await pw.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL', 'chrome'))
        ctx, p = await page_for(b)
        await p.goto(SITE); await settle(p)
        # ---- sign-in page
        check('Opens on the sign-in page when not signed in', await ev(p, 'S.mode') == 'auth' and await ev(p, "!!document.querySelector('.auth-card') && !document.querySelector('.rail')"))
        check('The sign-in page explains the workflow and offers no sample data', await ev(p, "document.querySelectorAll('.pipe-step').length") == 4 and not await ev(p, "!!document.querySelector('[data-act=demo-anon]')") and 'sample' not in (await ev(p, "document.body.innerText")).lower())
        await p.set_viewport_size({'width': 1300, 'height': 420}); await p.evaluate("scrollTo(0,0)"); await p.wait_for_timeout(300)
        on0 = await ev(p, "document.querySelectorAll('.pipe-step.on').length")
        await p.mouse.wheel(0, 900); await p.wait_for_timeout(500)
        on1 = await ev(p, "document.querySelectorAll('.pipe-step.on').length")
        check('Scrolling the sign-in page walks through the steps', on0 < 4 and on1 > on0, (on0, on1))
        await p.set_viewport_size({'width': 1300, 'height': 900})
        await p.evaluate("scrollTo(0,0)")
        await sign_in(p, 'nobody@example.com', 'whatever1'); await p.wait_for_timeout(300)
        check('Wrong credentials show a clear error', 'wrong' in await ev(p, "document.querySelector('.auth-card .banner.bad')?.innerText||''"))
        await p.click('[data-act=auth-mode][data-mode=signup]'); await p.fill('#auth-email', 'bad-email'); await p.fill('#auth-password', 'short'); await p.click('form[data-form=auth] button[type=submit]'); await p.wait_for_timeout(300)
        check('Sign-up validates email and password length', 'valid email' in await ev(p, "document.querySelector('.auth-card .banner.bad')?.innerText||''"))
        await sign_in(p, 'jay@example.com', 'secret123')
        uid = await ev(p, 'S.uid')
        check('A new account starts empty, with a setup checklist and no sample data', await ev(p, 'S.mode') == 'cloud' and await ev(p, 'Object.keys(S.jobs).length') == 0 and await ev(p, '!S.profile') and await ev(p, "document.querySelectorAll('.setup .step').length") == 4 and not rows_of(uid, 'jobs'))
        await p.wait_for_timeout(700)
        check('Notification settings start with your account email', next(r for r in rows_of(uid, 'notify'))['data']['email'] == 'jay@example.com')
        check('Rail shows the signed-in account and a Sign out button', 'jay@example.com' in await ev(p, "document.querySelector('.rail-foot').innerText") and await ev(p, "!!document.querySelector('.rail-foot [data-act=signout]')"))
        check('Service worker registers', await ev(p, "navigator.serviceWorker.getRegistration().then(r=>!!r)"))
        man = json.load(urllib.request.urlopen(SITE + 'manifest.webmanifest'))
        check('Web app manifest and icons are valid (installable)', man['display'] == 'standalone' and all(urllib.request.urlopen(SITE + i['src']).status == 200 for i in man['icons']))
        check('Search is blocked until you say what job you want', await ev(p, "document.querySelector('.setup [data-act=find-jobs]').disabled"))
        # ---- resume and preferences
        await nav(p, 'resumes'); await ev(p, "document.querySelector('details').open = true")
        await p.fill('form[data-form=paste-resume] textarea', RESUME); await p.click('form[data-form=paste-resume] button[type=submit]')
        await p.wait_for_selector('[data-act=profile-apply]', timeout=15000); await p.click('[data-act=profile-apply]'); await p.wait_for_timeout(900)
        prof = next(r for r in rows_of(uid, 'profile'))['data']
        check('Resume text becomes a profile saved to your cloud database', prof['name'] == 'Asha Verma' and 'Django' in prof['skills'] and prof['education'][0]['degree'].startswith('B.Tech') and len(rows_of(uid, 'resumes')) == 1, prof)
        await nav(p, 'preferences'); await p.fill('#prefs-text', 'Find entry-level Python Developer and Full Stack Developer jobs in Hyderabad, Bengaluru and Chennai or remote. 0-2 years, 4-8 LPA')
        await p.click('form[data-form=prefs-nl] button[type=submit]'); await p.wait_for_timeout(500); await p.click('[data-act=prefs-confirm]'); await p.wait_for_timeout(800)
        prefs = next(r for r in rows_of(uid, 'prefs'))['data']
        check('Plain-language preferences are understood and saved', 'Python Developer' in prefs['titles'] and set(['Hyderabad', 'Bengaluru', 'Chennai', 'Remote']) <= set(prefs['locations']) and prefs['expMax'] == 2, prefs)
        # ---- live search
        await nav(p, 'jobs'); await search(p)
        jobs = await ev(p, "Object.values(S.jobs).map(j=>({src:j.source,title:j.title,loc:j.location,score:j.match.score,url:j.applyUrl,rel:!!j.relatedMatch,ext:j.externalId,board:j.board||'',req:j.requiredSkills}))")
        srcs = set(j['src'] for j in jobs)
        check('Search reads live boards and adds open roles from every source', srcs == {'greenhouse', 'lever', 'ashby', 'smartrecruiters', 'remotive', 'remoteok'} and len(jobs) == 7, [(j['src'], j['title']) for j in jobs])
        check('Senior, unrelated, other-country, unlisted and US-only roles are left out', not any('Senior' in j['title'] or 'Account' in j['title'] or 'Indianapolis' in j['loc'] or j['ext'] in ('ash-2', 'rok-2', '902') for j in jobs), [j['title'] + '@' + j['loc'] for j in jobs])
        check('A general software role is kept only when its skills fit', any(j['title'] == 'Software Engineer I, Backend' and j['rel'] for j in jobs) and not any('iOS' in j['title'] for j in jobs))
        check('Every job links to the employer’s own application page', all(j['url'].startswith('https://') for j in jobs) and any(j['url'].endswith('/apply') for j in jobs if j['src'] == 'lever') and any('job-boards.greenhouse.io/acme/jobs/5551' in j['url'] for j in jobs))
        best = max(jobs, key=lambda j: j['score'])
        check('Jobs are scored against the profile (best match first)', best['title'] == 'Python Developer - Payments' and best['score'] >= 80 and all(0 <= j['score'] <= 100 for j in jobs), [(j['title'], j['score']) for j in jobs])
        txt = await content(p)
        check('The search reports what it read, and which board failed', '7 new' in txt and '1 board could not be read' in txt and 'Posted today' in txt, txt[:400])
        await p.wait_for_timeout(1200)
        check('Found jobs are saved to your cloud database', len(rows_of(uid, 'jobs')) == 7)
        await nav(p, 'dashboard')
        check('Dashboard: setup is complete, totals and top matches are shown', not await ev(p, "!!document.querySelector('.setup')") and await ev(p, "document.querySelectorAll('.stat').length") == 4 and await ev(p, "document.querySelectorAll('.job-card').length") >= 3)
        check('Navigation is six plain sections', await ev(p, "[...document.querySelectorAll('.nav a')].map(a => a.querySelector('span').textContent).join('|')") == 'Home|Find jobs|Applications|My profile|Insights|Settings')
        SECTION_OF = {'dashboard': 'Home', 'discover': 'Find jobs', 'jobs': 'Find jobs', 'tracker': 'Applications', 'approvals': 'Applications', 'interviews': 'Applications', 'offers': 'Applications', 'resumes': 'My profile', 'profile': 'My profile', 'preferences': 'My profile', 'analytics': 'Insights', 'shortlisting': 'Insights', 'rejections': 'Insights', 'config': 'Settings', 'alerts': 'Settings', 'activity': 'Settings'}
        bad = []
        for h, sec in SECTION_OF.items():
            await nav(p, h, 150)
            got = await ev(p, "({nav: document.querySelector('.nav a.on')?.querySelector('span').textContent, h1: document.querySelector('h1').textContent, tab: document.querySelector('.page-tabs a.on')?.textContent.trim() || '', body: document.querySelector('.content').innerText.length})")
            if got['nav'] != sec or got['h1'] != sec or got['body'] < 40 or (h != 'dashboard' and not got['tab']): bad.append((h, got))
        check('Every page is reachable from its section, with the right tab selected (old links still work)', not bad, bad[:3])
        await nav(p, 'chat', 150)
        check('Ask AI is one click from the header and highlights no section', await ev(p, "document.querySelector('h1').textContent") == 'Ask AI' and await ev(p, "!document.querySelector('.nav a.on')") and await ev(p, "!!document.querySelector('.top a[href=\"#chat\"]')"))
        await nav(p, 'jobs', 200)
        txt = await ev(p, "document.querySelector('.job-card').innerText")
        check('Job cards show the match, not internal pipeline words', 'match' in txt.lower() and 'Analyzed' not in txt and 'not stated' not in txt.lower(), txt)
        await nav(p, 'dashboard', 200)
        check('Home stays short: search, four totals and the best matches only', await ev(p, "!document.querySelector('form[data-form=quick-chat]')") and await ev(p, "document.querySelectorAll('.content > section.card, .content > .stats').length") <= 4)
        await p.reload(); await settle(p)
        check('Session and data survive a reload', await ev(p, 'S.mode') == 'cloud' and await ev(p, 'Object.keys(S.jobs).length') == 7)
        await nav(p, 'jobs'); await search(p)
        check('Searching again adds nothing twice', await ev(p, 'Object.keys(S.jobs).length') == 7 and 'No new matches' in await toast(p), await toast(p))
        # ---- closed roles
        jid = await ev(p, "Object.values(S.jobs).find(j=>j.externalId==='5551').id")
        post('/__gone', {'ids': [5551]}); await p.reload(); await settle(p); await nav(p, 'jobs'); await search(p)
        check('A role the employer took down is flagged closed', await ev(p, f"S.jobs['{jid}'].closed") is True and next(r for r in rows_of(uid, 'jobs') if r['id'] == jid)['data'].get('closed') is True)
        await nav(p, 'job-' + jid, 400)
        check('A closed role says so and cannot be prepared', 'This role has closed' in await content(p) and await ev(p, "document.querySelector('[data-act=run-workflow]').disabled"))
        await nav(p, 'jobs'); n_open = await ev(p, "document.querySelectorAll('.job-card').length")
        check('Recommended Jobs hides closed roles by default', n_open == 6, n_open)
        post('/__gone', {'ids': []}); await nav(p, 'job-' + jid, 300); await p.click('[data-act=verify-open]'); await p.wait_for_timeout(900)
        check('“Check again” reopens a role that is listed again', await ev(p, f"S.jobs['{jid}'].closed") is False and 'Still open' in await toast(p), await toast(p))
        # ---- companies
        await nav(p, 'discover'); n_boards = await ev(p, "document.querySelectorAll('.board').length")
        await p.fill('#bd-in', 'https://jobs.lever.co/nosuchcompany'); await p.click('form[data-form=board-add] button[type=submit]'); await p.wait_for_timeout(900)
        check('Adding a company checks that its board exists', 'No public Lever board' in await toast(p), await toast(p))
        await p.fill('#bd-in', 'https://boards.greenhouse.io/acme'); await p.click('form[data-form=board-add] button[type=submit]'); await p.wait_for_timeout(500)
        check('…and refuses duplicates', 'already on your list' in await toast(p), await toast(p))
        await p.click('.board-x[data-token=missing-board]'); await p.wait_for_timeout(700)
        nrow = next(r for r in rows_of(uid, 'notify'))['data']
        check('Removing a company is saved', await ev(p, "document.querySelectorAll('.board').length") == n_boards - 1 and 'greenhouse:missing-board' in nrow['boardsOff'], nrow.get('boardsOff'))
        # ---- prepare, approve, apply
        await nav(p, 'job-' + jid, 300); await p.click('[data-act=run-workflow]'); await p.wait_for_function(f"S.jobs['{jid}'].stage==='AwaitingApproval'", timeout=20000); await p.wait_for_timeout(500)
        v = await ev(p, f"(()=>{{const j=S.jobs['{jid}'];const v=S.versions[j.app.versionId];return {{cov:v.coverage,skills:v.content.skills,guard:v.content.guard.length,need:j.app.answers.filter(a=>a.needsInput&&!a.a).map(a=>a.key),hash:location.hash}}}})()")
        check('Prepare application: tailored resume from profile facts only, then it stops for approval', v['hash'] == '#approvals' and v['cov'] >= 80 and set(v['skills']) <= set(prof['skills']) and 'notice' in v['need'], v)
        check('Approval stays locked while required answers are missing', await ev(p, f"document.querySelector('[data-act=approve][data-id=\"{jid}\"]').disabled") and await ev(p, f"S.jobs['{jid}'].stage") == 'AwaitingApproval')
        need = await ev(p, f"S.jobs['{jid}'].app.answers.filter(a=>a.needsInput&&!a.a).map(a=>[a.id,a.key])")
        fill = {'notice': 'Immediate', 'relocate': 'Yes', 'workAuth': 'Yes'}
        for aid, key in need: await p.fill('#ans-' + aid, fill.get(key, 'Yes'))
        await p.click(f'form[data-form=answers][data-id="{jid}"] button[type=submit]'); await p.wait_for_timeout(500)
        await p.click(f'[data-act=approve][data-id="{jid}"]'); await p.wait_for_selector('[data-act=dlg-yes]'); await p.click('[data-act=dlg-yes]'); await p.wait_for_function(f"S.jobs['{jid}'].stage==='Approved'", timeout=10000)
        await p.wait_for_timeout(400); await p.click(f'[data-act=submit][data-id="{jid}"]'); await p.wait_for_selector('form[data-form=submit-result]')
        modal = await ev(p, "document.querySelector('.modal').innerText")
        check('Submit opens the official application page link with your approved answers', 'job-boards.greenhouse.io/acme/jobs/5551' in await ev(p, "[...document.querySelectorAll('.modal a')].map(a=>a.href).join(' ')") and 'Immediate' in modal, modal[:300])
        await p.click('form[data-form=submit-result] button[type=submit]'); await p.wait_for_timeout(300)
        check('An application is not marked applied without a confirmation', await ev(p, f"S.jobs['{jid}'].stage") != 'Applied')
        await p.fill('#sr-ref', 'GH-7781'); await p.click('form[data-form=submit-result] button[type=submit]'); await p.wait_for_timeout(900)
        check('With a reference number it becomes Applied, saved to the cloud', next(r for r in rows_of(uid, 'jobs') if r['id'] == jid)['data']['stage'] == 'Applied')
        vid = await ev(p, f"S.jobs['{jid}'].app.versionId"); await nav(p, 'job-' + jid); await ev(p, f"S.ui.tab['{jid}']='resume'; render()")
        async with p.expect_download() as d: await p.click(f'button[data-act=dl-pdf][data-id="{vid}"]')
        dl = await d.value
        async with p.expect_download() as d2: await p.click(f'button[data-act=dl-docx][data-id="{vid}"]')
        dl2 = await d2.value
        check('Tailored resume downloads as PDF and DOCX', dl.suggested_filename.endswith('.pdf') and dl2.suggested_filename.endswith('.docx'), (dl.suggested_filename, dl2.suggested_filename))
        await p.click('.seg [data-theme=dark]'); await p.wait_for_timeout(800)
        check('Theme choice is saved to your account', next(r for r in rows_of(uid, 'settings'))['data'].get('theme') == 'dark')
        # ---- second device
        ctx2, p2 = await page_for(b); await p2.goto(SITE); await settle(p2); await sign_in(p2, 'jay@example.com', 'secret123')
        check('Second device signs in and sees the same data', await ev(p2, 'S.mode') == 'cloud' and await ev(p2, f"S.jobs['{jid}'].stage") == 'Applied' and await ev(p2, "document.documentElement.getAttribute('data-app-theme')") == 'dark')
        other = await ev(p2, "Object.values(S.jobs).find(j=>j.stage==='Analyzed').id")
        await nav(p2, 'job-' + other); await p2.click('button[data-act=stage][data-to=Archived]'); await p2.wait_for_timeout(800)
        n = await ev(p, "Store.sync()"); await p.wait_for_timeout(300)
        check('Changes on one device appear on the other after sync', n >= 1 and await ev(p, f"S.jobs['{other}'].stage") == 'Archived', n)
        await ctx2.close()
        # ---- notifications and the scheduled server job
        await nav(p, 'alerts', 400)
        check('Notifications page shows the server is waiting for its first run', 'Waiting for first run' in await content(p))
        await p.check('input[name=emailOn]'); await p.check('input[name=telegramOn]'); await p.fill('#nt-min', '50')
        await p.click('#notify-form button[type=submit]'); await p.wait_for_timeout(700)
        nrow = next(r for r in rows_of(uid, 'notify'))['data']
        check('Notification settings save without losing your company list', nrow['emailOn'] and nrow['telegramOn'] and nrow['minScore'] == 50 and nrow['feeds']['remoteok'] is True and 'greenhouse:missing-board' in nrow['boardsOff'], nrow)
        async with ctx.expect_page() as popup:
            await p.click('[data-act=tg-connect]')
        pop = await popup.value; tg_url = pop.url; await pop.close(); await p.wait_for_timeout(600)
        code = next(r for r in rows_of(uid, 'notify'))['data']['telegramCode']
        check('Connect Telegram opens the bot with a one-time code', code and tg_url.startswith('https://t.me/TestCareerBot?start=' + code), tg_url)
        await ctx.grant_permissions(['notifications'], origin=SITE.rstrip('/'))
        await p.click('[data-act=push-enable]'); await p.wait_for_timeout(1500)
        t = await toast(p)
        check('Enabling push either subscribes or explains why not (no crash)', ('on for this device' in t) or ('push' in t.lower() or 'registration' in t.lower() or 'service' in t.lower()), t)
        await p.click('[data-act=notify-test]'); await p.wait_for_timeout(600)
        post('/__tg', {'text': '/start ' + code, 'chat': 4242, 'user': 'jay'})
        env = {**os.environ, 'SUPABASE_URL': API, 'SUPABASE_SERVICE_ROLE_KEY': 'service-role-test-key', 'APP_URL': SITE, 'TELEGRAM_BOT_TOKEN': 'TGTOKEN', 'TELEGRAM_API': API + '/mock/telegram', 'RESEND_API_KEY': 'RESENDKEY', 'RESEND_API': API + '/mock/resend', 'ADZUNA_APP_ID': 'id', 'ADZUNA_APP_KEY': 'k', 'ADZUNA_API': API + '/mock/adzuna', 'REMOTIVE_API': API + '/mock/remotive', 'REMOTEOK_API': API + '/mock/remoteok', 'GREENHOUSE_API': API + '/mock/greenhouse', 'LEVER_API': API + '/mock/lever', 'ASHBY_API': API + '/mock/ashby', 'SMARTRECRUITERS_API': API + '/mock/smartrecruiters', 'BOARD_DIRECTORY_JSON': json.dumps(BASE_CONFIG['BOARDS']), 'VAPID_PUBLIC_KEY': KEYS['publicKey'], 'VAPID_PRIVATE_KEY': KEYS['privateKey'], 'NODE_TLS_REJECT_UNAUTHORIZED': '0', 'NODE_NO_WARNINGS': '1'}
        wr = subprocess.run(['node', 'run.mjs'], cwd=WORKER, env=env, capture_output=True, text=True)
        print('   worker:', (wr.stdout.strip().splitlines() or [''])[-2][:170])
        await nav(p, 'alerts', 300); await p.click('[data-act=sync-now]'); await p.wait_for_timeout(900)
        await ev(p, "document.querySelectorAll('.content details').forEach(d => d.open = true)"); txt = await content(p)
        check('After the server runs, the site shows it Running with channel and feed status', 'Running' in txt and 'Connected' in txt and 'Adzuna' in txt and 'SmartRecruiters' in txt, txt[:300])
        new = await ev(p, "Object.values(S.jobs).filter(j=>j.discoveredBy==='server').map(j=>[j.id,j.source,j.fresh,j.match.score])")
        check('The server adds what the browser cannot reach (Adzuna) and repeats nothing', len(new) == 1 and new[0][1] == 'adzuna' and new[0][2] and await ev(p, 'Object.keys(S.jobs).length') == 8, new)
        check('Server alerts appear in the bell', await ev(p, "bellItems().filter(n=>n.src==='server').length") >= 2 and await ev(p, "!!document.querySelector('.dot')"))
        check('Telegram message and test email were sent', any(m.get('chat_id') == '4242' for m in state()['telegram']) and any('Test alert' in e.get('subject', '') for e in state()['emails']))
        aj = new[0][0]; await nav(p, 'job-' + aj, 900)
        check('Adzuna jobs explain that they are short snippets', 'short description' in await content(p))
        await p.wait_for_timeout(600)
        check('Opening a new job clears its New flag in the cloud', not next(r for r in rows_of(uid, 'jobs') if r['id'] == aj)['data'].get('fresh'))
        await p.click('[data-act=notifs]'); await p.click('[data-act=notifs-read]'); await p.wait_for_timeout(800)
        check('Mark all read also marks server alerts read in the cloud', all(r['data'].get('read') for r in rows_of(uid, 'alerts')))
        await nav(p, 'discover'); await ev(p, "document.querySelectorAll('.content details').forEach(d => d.open = true)"); dt = await content(p)
        check('Companies & import lists every source with its live status', 'Where jobs come from' in dt and 'Connected' in dt and 'Scheduled search' in dt and 'running' in dt)
        # ---- motion
        await p.set_viewport_size({'width': 1300, 'height': 520}); await nav(p, 'dashboard'); await nav(p, 'jobs', 500)
        mv = await ev(p, "({hidden:document.querySelectorAll('.rv:not(.rv-in)').length, still:document.getElementById('app').classList.contains('still')})")
        await ev(p, "document.getElementById('main').scrollTo(0, 99999)"); await p.wait_for_timeout(900)
        mv2 = await ev(p, "({hidden:document.querySelectorAll('.rv:not(.rv-in)').length, shown:document.querySelectorAll('.rv.rv-in').length, prog:getComputedStyle(document.getElementById('scroll-prog')).transform, scrolled:document.getElementById('top').classList.contains('scrolled')})")
        check('Scroll animations: cards below the fold rise in as you reach them; the header tracks progress', mv['hidden'] >= 1 and not mv['still'] and mv2['hidden'] == 0 and mv2['shown'] >= 1 and mv2['scrolled'] and mv2['prog'] not in ('none', 'matrix(0, 0, 0, 1, 0, 0)'), (mv, mv2))
        await ev(p, "render()"); await p.wait_for_timeout(200)
        check('Redrawing the same page does not replay animations or hide anything', await ev(p, "document.getElementById('app').classList.contains('still') && document.querySelectorAll('.rv').length === 0"))
        await p.set_viewport_size({'width': 1300, 'height': 900})
        ctxr, pr = await page_for(b, reduced_motion='reduce'); await pr.goto(SITE); await settle(pr); await sign_in(pr, 'jay@example.com', 'secret123'); await nav(pr, 'jobs', 400)
        check('With “reduce motion” on, nothing is hidden or animated in', await ev(pr, "document.querySelectorAll('.rv').length") == 0 and await ev(pr, "document.querySelectorAll('.job-card').length") >= 5)
        await ctxr.close()
        # ---- phone layout
        ctxm, pm = await page_for(b, width=375, height=812); await pm.goto(SITE); await settle(pm)
        wide = [('sign-in', await ev(pm, "document.documentElement.scrollWidth - innerWidth"))]
        await sign_in(pm, 'jay@example.com', 'secret123')
        for h in ['dashboard', 'discover', 'jobs', 'job-' + jid, 'approvals', 'tracker', 'alerts', 'config', 'profile']:
            await nav(pm, h, 300); wide.append((h, await ev(pm, "Math.max(document.documentElement.scrollWidth - innerWidth, document.getElementById('main').scrollWidth - document.getElementById('main').clientWidth)")))
        check('Phone width (375px): no page scrolls sideways', all(w <= 1 for _, w in wide), wide)
        await pm.click('.menu-btn'); await pm.wait_for_timeout(300)
        check('Phone: the menu opens over a backdrop and closes when you tap outside', await ev(pm, "document.getElementById('rail').classList.contains('open') && getComputedStyle(document.querySelector('.rail-shade')).display === 'block'"))
        await pm.mouse.click(350, 400); await pm.wait_for_timeout(300)
        check('…and closes', not await ev(pm, "document.getElementById('rail').classList.contains('open')"))
        await ctxm.close()
        # ---- Gemini (optional AI)
        await nav(p, 'config'); await p.fill('#cfg-aikey', 'AIza-test'); await p.check('#cfg-public'); await p.click('form[data-form=settings-ai] button[type=submit]'); await p.wait_for_timeout(300)
        await nav(p, 'preferences'); await p.fill('#prefs-text', 'Python developer roles in Hyderabad, 4-7 LPA'); await p.click('form[data-form=prefs-nl] button[type=submit]'); await p.wait_for_timeout(800)
        check('Optional Gemini key powers AI features', await ev(p, "S.ui.prefDraft && S.ui.prefDraft.engine") == 'ai')
        await p.click('[data-act=prefs-discard]'); GEM['mode'] = '429'
        await p.click('form[data-form=prefs-nl] button[type=submit]'); await p.wait_for_timeout(800)
        check('If Gemini hits its free limit, the local engine takes over', await ev(p, "S.ui.prefDraft && S.ui.prefDraft.engine") == 'local' and 'limit' in (await toast(p)).lower())
        GEM['mode'] = 'ok'; await p.click('[data-act=prefs-discard]')
        check('Configuration no longer offers sample data', 'sample' not in (await ev(p, "(location.hash='config', render(), document.querySelector('.content').innerText)")).lower())
        # ---- account
        await nav(p, 'config'); await p.fill('#cfg-pw', 'newsecret456'); await p.click('form[data-form=change-password] button[type=submit]'); await p.wait_for_timeout(500)
        check('Change password works', 'changed' in (await toast(p)).lower())
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(800)
        check('Sign out returns to the sign-in page and clears data from the page', await ev(p, 'S.mode') == 'auth' and await ev(p, 'Object.keys(S.jobs).length') == 0)
        await sign_in(p, 'jay@example.com', 'newsecret456')
        check('Sign in with the new password restores everything', await ev(p, 'S.mode') == 'cloud' and await ev(p, 'Object.keys(S.jobs).length') == 8)
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(500)
        await p.click('[data-act=auth-mode][data-mode=reset]'); await p.fill('#auth-email', 'jay@example.com'); await p.click('form[data-form=auth] button[type=submit]'); await p.wait_for_timeout(400)
        check('Forgot-password sends a reset email', 'reset link' in await ev(p, "document.querySelector('.auth-card').innerText"))
        await p.click('[data-act=auth-mode][data-mode=signin]'); await sign_in(p, 'jay@example.com', 'newsecret456')
        await nav(p, 'config'); await p.click('[data-act=delete-all]'); await p.fill('#dlg-input', 'DELETE'); await p.click('[data-act=dlg-yes]'); await p.wait_for_timeout(1200)
        left = [r['kind'] for r in rows_of(uid)]
        check('Delete all erases your cloud rows and returns to the setup checklist', left == [] and await ev(p, "!!document.querySelector('.setup')"), left)
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(500)
        # ---- sample data left by the earlier version is removed on sign-in
        await p.click('[data-act=auth-mode][data-mode=signup]'); await sign_in(p, 'old@example.com', 'secret123'); uid2 = await ev(p, 'S.uid')
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(500)
        mk = lambda kind, id, data: {'user_id': uid2, 'kind': kind, 'id': id, 'data': data}
        hist = [{'from': None, 'to': 'Discovered', 't': '2026-11-01T00:00:00.000Z', 'by': 'You'}, {'from': 'Discovered', 'to': 'Analyzed', 't': '2026-11-01T00:00:00.000Z', 'by': 'You'}]
        post('/__rows', [mk('profile', 'main', {'name': 'Sample Candidate', 'skills': ['Python'], 'demo': True}), mk('prefs', 'main', {'titles': ['Python Developer'], 'locations': ['Hyderabad'], 'demo': True}), mk('meta', 'main', {'onboarded': True, 'keptDemo': True}),
            mk('jobs', 'jdemo1', {'id': 'jdemo1', 'title': 'Junior Python Developer', 'company': 'Kitebyte Labs', 'source': 'linkedin', 'demo': True, 'stage': 'Analyzed', 'history': hist, 'app': {}, 'match': {'score': 80}, 'discoveredAt': '2026-11-01T00:00:00.000Z'}),
            mk('jobs', 'jreal1', {'id': 'jreal1', 'title': 'Backend Developer', 'company': 'A Real Company', 'source': 'manual', 'stage': 'Analyzed', 'history': hist, 'app': {}, 'match': {'score': 70}, 'requiredSkills': [], 'preferredSkills': [], 'discoveredAt': '2026-11-02T00:00:00.000Z'}),
            mk('versions', 'vdemo1', {'id': 'vdemo1', 'jobId': 'jdemo1', 'demo': True, 'version': 1, 'createdAt': '2026-11-01T00:00:00.000Z', 'content': {}}), mk('resumes', 'rdemo1', {'id': 'rdemo1', 'filename': 'Sample_Candidate_Resume.pdf', 'demo': True, 'kind': 'pdf', 'uploadedAt': '2026-11-01T00:00:00.000Z', 'text': 'x'})])
        await sign_in(p, 'old@example.com', 'secret123'); await p.wait_for_timeout(1200)
        left = sorted((r['kind'], r['id']) for r in rows_of(uid2) if r['kind'] in ('profile', 'prefs', 'jobs', 'versions', 'resumes'))
        check('Sample records saved by the earlier version are deleted; your own job stays', left == [('jobs', 'jreal1')] and await ev(p, 'Object.keys(S.jobs)') == ['jreal1'] and await ev(p, '!S.profile'), left)
        await ctx.close()
        # ---- no Supabase keys: single-browser mode
        ctx3, p3 = await page_for(b, cloud=False); await p3.goto(SITE); await settle(p3)
        check('Without Supabase keys the site works in this browser only, starting empty', await ev(p3, 'S.mode') == 'local' and await ev(p3, "!!document.querySelector('.setup')") and 'saved in this browser only' in await content(p3))
        await nav(p3, 'alerts')
        check('…and explains that alerts need the cloud setup', 'Connect the cloud database first' in await content(p3))
        await ctx3.close()
        await b.close()
    failed = sum(1 for r in RES if not r[1])
    print(f"\n==== site: {len(RES) - failed} passed, {failed} failed, {len(ERR)} page errors ====")
    for e in ERR[:12]: print(e)
    raise SystemExit(1 if failed or ERR else 0)
asyncio.run(main())
