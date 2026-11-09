import asyncio, json, os, subprocess, urllib.request
from playwright.async_api import async_playwright
NM = '/home/claude/libs/node_modules'; SITE = 'http://localhost:8080/'; API = 'http://localhost:54321'
RES = []; ERR = []
def check(name, cond, detail=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else f'  -> {str(detail)[:300]}'))
def state(): return json.load(urllib.request.urlopen(API + '/__state'))
def post(p, b): urllib.request.urlopen(urllib.request.Request(API + p, data=json.dumps(b).encode(), headers={'Content-Type': 'application/json'}, method='POST')).read()
KEYS = json.loads(subprocess.run(['node', '-e', "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"], cwd='/home/claude/site/worker', capture_output=True, text=True).stdout)
def config(cloud=True): return "window.APP_CONFIG = " + json.dumps({'SUPABASE_URL': API if cloud else 'https://vrytpkcxmmgjltihptee.supabase.co', 'SUPABASE_ANON_KEY': 'anon-test-key' if cloud else 'YOUR_SUPABASE_ANON_KEY', 'VAPID_PUBLIC_KEY': KEYS['publicKey'], 'TELEGRAM_BOT_USERNAME': 'TestCareerBot', 'APP_NAME': 'AI Career Agent'}) + ';'
async def route_cdn(route):
    p = route.request.url.split('cdn.jsdelivr.net/npm/')[1]; pkg, rest = (p.split('/', 2)[0] + '/' + p.split('/', 2)[1], p.split('/', 2)[2]) if p.startswith('@') else p.split('/', 1)
    await route.fulfill(path=os.path.join(NM, pkg.rsplit('@', 1)[0], rest), content_type='application/javascript')
GEM = {'mode': 'ok'}
async def route_gemini(route):
    if GEM['mode'] == '429': return await route.fulfill(status=429, body='{}', headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json')
    body = json.loads(route.request.post_data or '{}'); prompt = body['contents'][-1]['parts'][0]['text']
    out = json.dumps({'job_titles': ['Python Developer'], 'skills': ['Python'], 'locations': ['Hyderabad'], 'work_modes': [], 'experience': {'min_years': 0, 'max_years': 2}, 'salary': {'min': 400000, 'max': 700000}, 'employment_type': ['full_time'], 'company_types': [], 'industries': [], 'other_requirements': '', 'ambiguities': []}) if 'job-search request' in prompt else 'OK'
    await route.fulfill(status=200, body=json.dumps({'candidates': [{'content': {'parts': [{'text': out}]}, 'finishReason': 'STOP'}]}), headers={'Access-Control-Allow-Origin': '*'}, content_type='application/json')
async def page_for(b, cloud=True, **kw):
    ctx = await b.new_context(viewport={'width': 1300, 'height': 900}, accept_downloads=True, **kw); page = await ctx.new_page()
    page.on('pageerror', lambda e: ERR.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: ERR.append('CONSOLE ' + m.text) if m.type == 'error' and 'favicon' not in m.text and 'incognito' not in m.text and '400 (Bad Request)' not in m.text and '429' not in m.text and 'push service' not in m.text.lower() and 'registration failed' not in m.text.lower() else None)
    await page.route('https://cdn.jsdelivr.net/**', route_cdn)
    await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    await page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    await page.route('https://generativelanguage.googleapis.com/**', route_gemini)
    await page.route(SITE + 'config.js', lambda r: r.fulfill(body=config(cloud), content_type='application/javascript'))
    await ctx.route('https://t.me/**', lambda r: r.fulfill(body='<html>telegram</html>', content_type='text/html'))
    return ctx, page
ev = lambda p, js: p.evaluate(js)
async def settle(p): await p.wait_for_function("typeof S!=='undefined' && S.mode!=='loading'", timeout=20000); await p.wait_for_timeout(300)
async def nav(p, h, w=200): await p.evaluate(f"location.hash='{h}'"); await p.wait_for_timeout(w)
async def toast(p): return await ev(p, "[...document.querySelectorAll('.toast')].map(t=>t.textContent).slice(-1)[0]||''")

async def main():
    urllib.request.urlopen(API + '/__reset').read()
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx, p = await page_for(b)
        await p.goto(SITE); await settle(p)
        check('Opens on the sign-in screen when not signed in', await ev(p, 'S.mode') == 'auth' and await ev(p, "!!document.querySelector('.auth-card') && !document.querySelector('.rail')"))
        await p.fill('#auth-email', 'nobody@example.com'); await p.fill('#auth-password', 'whatever1'); await p.click('form[data-form=auth] button[type=submit]'); await p.wait_for_timeout(400)
        check('Wrong credentials show a clear error', 'wrong' in await ev(p, "document.querySelector('.auth-card .banner.bad')?.innerText||''"))
        await p.click('[data-act=auth-mode][data-mode=signup]'); await p.fill('#auth-email', 'bad-email'); await p.fill('#auth-password', 'short'); await p.click('form[data-form=auth] button[type=submit]'); await p.wait_for_timeout(200)
        check('Sign-up validates email and password length', 'valid email' in await ev(p, "document.querySelector('.auth-card .banner.bad')?.innerText||''"))
        await p.fill('#auth-email', 'jay@example.com'); await p.fill('#auth-password', 'secret123'); await p.click('form[data-form=auth] button[type=submit]'); await settle(p)
        check('Create account signs in and offers sample data or a fresh start', await ev(p, 'S.mode') == 'demo' and await ev(p, "!!S.session") and await ev(p, "!!document.querySelector('[data-act=demo-keep]')"))
        await p.click('[data-act=demo-keep]'); await p.wait_for_timeout(2500)
        uid = await ev(p, 'S.uid'); rows = [r for r in state()['rows'] if r['user_id'] == uid]
        check('Keeping sample data saves it to the cloud database under your account', await ev(p, 'S.mode') == 'cloud' and len(rows) >= 20 and any(r['kind'] == 'jobs' for r in rows) and any(r['kind'] == 'notify' for r in rows), len(rows))
        check('Notification settings start with your account email', next(r for r in rows if r['kind'] == 'notify')['data']['email'] == 'jay@example.com')
        check('Rail shows the signed-in account and a Sign out button', 'jay@example.com' in await ev(p, "document.querySelector('.rail-foot').innerText") and await ev(p, "!!document.querySelector('.rail-foot [data-act=signout]')"))
        check('Service worker registers', await ev(p, "navigator.serviceWorker.getRegistration().then(r=>!!r)"))
        man = json.load(urllib.request.urlopen(SITE + 'manifest.webmanifest'))
        icons_ok = all(urllib.request.urlopen(SITE + i['src']).status == 200 for i in man['icons'])
        check('Web app manifest and icons are valid (installable)', man['display'] == 'standalone' and icons_ok)
        await p.reload(); await settle(p)
        check('Session and data survive a reload', await ev(p, 'S.mode') == 'cloud' and await ev(p, 'Object.keys(S.jobs).length') == 9)
        jid = await ev(p, "Object.values(S.jobs).find(j=>j.stage==='Analyzed').id")
        await nav(p, 'job-' + jid); await p.click('button[data-act=stage][data-to=Shortlisted]'); await p.wait_for_timeout(800)
        check('Edits are written to the cloud', next(r for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'jobs' and r['id'] == jid)['data']['stage'] == 'Shortlisted')
        await p.click('.seg [data-theme=dark]'); await p.wait_for_timeout(800)
        check('Theme choice is saved to your account', next(r for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'settings')['data'].get('theme') == 'dark')
        # second device sync
        ctx2, p2 = await page_for(b); await p2.goto(SITE); await settle(p2)
        await p2.fill('#auth-email', 'jay@example.com'); await p2.fill('#auth-password', 'secret123'); await p2.click('form[data-form=auth] button[type=submit]'); await settle(p2)
        check('Second device signs in and sees the same data', await ev(p2, 'S.mode') == 'cloud' and await ev(p2, f"S.jobs['{jid}'].stage") == 'Shortlisted' and await ev(p2, "document.documentElement.getAttribute('data-app-theme')") == 'dark')
        await nav(p2, 'job-' + jid); await p2.click('button[data-act=stage][data-to=Archived]'); await p2.wait_for_timeout(800)
        n = await ev(p, "Store.sync()"); await p.wait_for_timeout(300)
        check('Changes on one device appear on the other after sync', n >= 1 and await ev(p, f"S.jobs['{jid}'].stage") == 'Archived', n)
        await ctx2.close()
        # notifications page
        await nav(p, 'alerts', 400)
        check('Notifications page shows the server is waiting for its first run', 'Waiting for first run' in await ev(p, "document.querySelector('.content').innerText"))
        await p.check('input[name=emailOn]'); await p.check('input[name=telegramOn]')
        await p.fill('#nt-min', '50'); await p.fill('#nt-gh', 'https://boards.greenhouse.io/acme\nbad name!'); await p.fill('#nt-lever', 'cred')
        await p.click('#notify-form button[type=submit]'); await p.wait_for_timeout(700)
        nrow = next(r for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'notify')['data']
        check('Notification settings save; company links are cleaned to board names', nrow['emailOn'] and nrow['telegramOn'] and nrow['minScore'] == 50 and nrow['companies']['greenhouse'] == 'acme' and nrow['companies']['lever'] == 'cred', nrow['companies'])
        async with ctx.expect_page() as popup:
            await p.click('[data-act=tg-connect]')
        pop = await popup.value; tg_url = pop.url; await pop.close(); await p.wait_for_timeout(600)
        code = next(r for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'notify')['data']['telegramCode']
        check('Connect Telegram opens the bot with a one-time code', code and tg_url.startswith('https://t.me/TestCareerBot?start=' + code), tg_url)
        await ctx.grant_permissions(['notifications'], origin=SITE.rstrip('/'))
        await p.click('[data-act=push-enable]'); await p.wait_for_timeout(1500)
        t = await toast(p)
        check('Enabling push either subscribes or explains why not (no crash)', ('on for this device' in t) or ('push' in t.lower() or 'registration' in t.lower() or 'service' in t.lower()), t)
        await p.click('[data-act=notify-test]'); await p.wait_for_timeout(600)
        # run the real worker against the mock
        post('/__tg', {'text': '/start ' + code, 'chat': 4242, 'user': 'jay'})
        env = {**os.environ, 'SUPABASE_URL': API, 'SUPABASE_SERVICE_ROLE_KEY': 'service-role-test-key', 'APP_URL': SITE, 'TELEGRAM_BOT_TOKEN': 'TGTOKEN', 'TELEGRAM_API': API + '/mock/telegram', 'RESEND_API_KEY': 'RESENDKEY', 'RESEND_API': API + '/mock/resend', 'ADZUNA_APP_ID': 'id', 'ADZUNA_APP_KEY': 'k', 'ADZUNA_API': API + '/mock/adzuna', 'REMOTIVE_API': API + '/mock/remotive', 'GREENHOUSE_API': API + '/mock/greenhouse', 'LEVER_API': API + '/mock/lever', 'VAPID_PUBLIC_KEY': KEYS['publicKey'], 'VAPID_PRIVATE_KEY': KEYS['privateKey'], 'NODE_TLS_REJECT_UNAUTHORIZED': '0', 'NODE_NO_WARNINGS': '1'}
        wr = subprocess.run(['node', 'run.mjs'], cwd='/home/claude/site/worker', env=env, capture_output=True, text=True)
        print('   worker:', (wr.stdout.strip().splitlines() or [''])[-2][:160])
        await nav(p, 'alerts', 300); await p.click('[data-act=sync-now]'); await p.wait_for_timeout(800)
        txt = await ev(p, "document.querySelector('.content').innerText")
        check('After the server runs, the site shows it Running with channel and feed status', 'Running' in txt and 'Connected' in txt and 'Adzuna' in txt, txt[:300])
        new = await ev(p, "Object.values(S.jobs).filter(j=>j.discoveredBy==='server').map(j=>[j.id,j.source,j.fresh,j.match.score])")
        check('Jobs found by the server appear in the app, marked New', len(new) >= 3 and all(x[2] for x in new), new)
        check('Server alerts appear in the bell', await ev(p, "bellItems().filter(n=>n.src==='server').length") >= 2 and await ev(p, "!!document.querySelector('.dot')"))
        check('Telegram message and test email were sent', any(m.get('chat_id') == '4242' for m in state()['telegram']) and any('Test alert' in e.get('subject', '') for e in state()['emails']))
        await nav(p, 'jobs'); fresh_pills = await ev(p, "document.querySelectorAll('.job-card .pill.hi').length")
        aj = next(x for x in new if x[1] == 'adzuna')[0]
        await nav(p, 'job-' + aj, 900)
        check('Recommended Jobs shows New badges; Adzuna jobs explain they are snippets', fresh_pills >= 3 and 'short description' in await ev(p, "document.querySelector('.content').innerText"))
        await p.wait_for_timeout(600)
        check('Opening a new job clears its New flag in the cloud', not next(r for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'jobs' and r['id'] == aj)['data'].get('fresh'))
        await p.click('[data-act=notifs]'); await p.click('[data-act=notifs-read]'); await p.wait_for_timeout(800)
        check('Mark all read also marks server alerts read in the cloud', all(r['data'].get('read') for r in state()['rows'] if r['user_id'] == uid and r['kind'] == 'alerts'))
        await nav(p, 'discover'); dt = await ev(p, "document.querySelector('.content').innerText")
        check('Job Discovery lists the automatic feeds with live status', 'Automatic discovery' in dt and 'Connected' in dt)
        # downloads
        vid = await ev(p, "Object.keys(S.versions)[0]"); vj = await ev(p, f"S.versions['{vid}'].jobId")
        await nav(p, 'job-' + vj); await ev(p, f"S.ui.tab['{vj}']='resume'; render()")
        async with p.expect_download() as d: await p.click(f'button[data-act=dl-pdf][data-id="{vid}"]')
        dl = await d.value
        async with p.expect_download() as d2: await p.click(f'button[data-act=dl-docx][data-id="{vid}"]')
        dl2 = await d2.value
        check('Resume downloads work natively (PDF and DOCX)', dl.suggested_filename.endswith('.pdf') and dl2.suggested_filename.endswith('.docx'), (dl.suggested_filename, dl2.suggested_filename))
        # Gemini
        await nav(p, 'config'); await p.fill('#cfg-aikey', 'AIza-test'); await p.check('#cfg-public'); await p.click('form[data-form=settings-ai] button[type=submit]'); await p.wait_for_timeout(300)
        await nav(p, 'preferences'); await p.fill('#prefs-text', 'Python developer roles in Hyderabad, 4-7 LPA'); await p.click('form[data-form=prefs-nl] button[type=submit]'); await p.wait_for_timeout(800)
        check('Optional Gemini key powers AI features', await ev(p, "S.ui.prefDraft && S.ui.prefDraft.engine") == 'ai')
        await p.click('[data-act=prefs-discard]'); GEM['mode'] = '429'
        await p.click('form[data-form=prefs-nl] button[type=submit]'); await p.wait_for_timeout(800)
        check('If Gemini hits its free limit, the local engine takes over', await ev(p, "S.ui.prefDraft && S.ui.prefDraft.engine") == 'local' and 'limit' in (await toast(p)).lower())
        GEM['mode'] = 'ok'; await p.click('[data-act=prefs-discard]')
        # change password + sign out + sign in
        await nav(p, 'config'); await p.fill('#cfg-pw', 'newsecret456'); await p.click('form[data-form=change-password] button[type=submit]'); await p.wait_for_timeout(500)
        check('Change password works', 'changed' in (await toast(p)).lower())
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(800)
        check('Sign out returns to the sign-in screen and clears data from the page', await ev(p, 'S.mode') == 'auth' and await ev(p, 'Object.keys(S.jobs).length') == 0)
        await p.fill('#auth-email', 'jay@example.com'); await p.fill('#auth-password', 'newsecret456'); await p.click('form[data-form=auth] button[type=submit]'); await settle(p)
        check('Sign in with the new password restores everything', await ev(p, 'S.mode') == 'cloud' and await ev(p, 'Object.keys(S.jobs).length') >= 12)
        await p.click('.rail-foot [data-act=signout]'); await p.wait_for_timeout(500)
        await p.click('[data-act=auth-mode][data-mode=reset]'); await p.fill('#auth-email', 'jay@example.com'); await p.click('form[data-form=auth] button[type=submit]'); await p.wait_for_timeout(400)
        check('Forgot-password sends a reset email', 'reset link' in await ev(p, "document.querySelector('.auth-card').innerText"))
        await p.click('[data-act=auth-mode][data-mode=signin]'); await p.click('[data-act=demo-anon]'); await p.wait_for_timeout(500)
        check('Explore sample data without an account (nothing saved)', await ev(p, 'S.mode') == 'demo' and 'Sign in' in await ev(p, "document.querySelector('.banner').innerText"))
        before = len(state()['rows'])
        await nav(p, 'jobs'); await ev(p, "moveStage(Object.values(S.jobs).find(j=>j.stage==='Analyzed'),'Shortlisted')"); await p.wait_for_timeout(500)
        check('Sample mode never writes to the database', len(state()['rows']) == before)
        await p.click('[data-act=goto-auth]'); await p.fill('#auth-email', 'jay@example.com'); await p.fill('#auth-password', 'newsecret456'); await p.click('form[data-form=auth] button[type=submit]'); await settle(p)
        await nav(p, 'config'); await p.click('[data-act=delete-all]'); await p.fill('#dlg-input', 'DELETE'); await p.click('[data-act=dlg-yes]'); await p.wait_for_timeout(1200)
        left = [r['kind'] for r in state()['rows'] if r['user_id'] == uid]
        check('Delete all erases your cloud rows (only the onboarding marker remains)', left == ['meta'], left)
        await ctx.close()
        # local mode (no Supabase keys yet)
        ctx3, p3 = await page_for(b, cloud=False); await p3.goto(SITE); await settle(p3)
        check('Without Supabase keys the site still works in this browser (sample data)', await ev(p3, 'S.mode') == 'demo' and await ev(p3, 'S.realMode') == 'local')
        await p3.click('[data-act=demo-keep]'); await p3.wait_for_timeout(300); await nav(p3, 'alerts')
        check('…and explains that alerts need the cloud setup', 'Connect the cloud database first' in await ev(p3, "document.querySelector('.content').innerText"))
        await ctx3.close()
        await b.close()
    print(f"\n==== site: {sum(1 for r in RES if r[1])} passed, {sum(1 for r in RES if not r[1])} failed, {len(ERR)} page errors ====")
    for e in ERR[:12]: print(e)
asyncio.run(main())
