#!/usr/bin/env python3
"""End-to-end smoke test of the built app (dist/), served like GitHub Pages under /nofun/.

Every user-facing feature gets a quick check, so a change of layout can't silently break one:
setup, plan, ride controls, timer, FTP tests, workout list and upload, editor, report, settings,
profile and backup. No trainer is needed: the app runs without devices.

    npm run build:pages && python e2e/smoke.py
"""
import functools, http.server, json, os, shutil, sys, tempfile, threading, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
TODAY = 'new Date(2026, 10, 14, 10, 0, 0).valueOf()'  # Saturday of week 3 of a plan started 26 October
# the clock starts on that Saturday and keeps running (a frozen clock made every lap 0 s long,
# and Auuki drops laps of 0 s)
FIXED_DATE = f"""const __fixed = {TODAY}; const __start = performance.now(); const __Real = Date;
const __now = () => __fixed + (performance.now() - __start);
globalThis.Date = class extends __Real {{ constructor(...a) {{ if (a.length === 0) super(__now()); else super(...a); }} static now() {{ return __now(); }} }};"""
# Browsers under test have no usable Web Bluetooth (no adapter, or no API at all): nofun would
# show its "browser not supported" banner, which a real user never sees in Chrome. The same stub
# in every browser keeps the layout of a supported one.
BLUETOOTH_STUB = """try { Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: {
    getAvailability: async () => true,
    requestDevice: async () => { throw new DOMException('No devices in tests', 'NotFoundError'); },
    getDevices: async () => [],
    addEventListener() {}, removeEventListener() {},
} }); } catch (e) { /* keep the browser's own */ }"""
ZWO = """<workout_file><author>e2e</author><name>E2E upload</name><sportType>bike</sportType><workout>
<SteadyState Duration="300" Power="0.6"/></workout></workout_file>"""

results = []

# Known bugs, reported but not failing the run until they are fixed (see README, CI section).
KNOWN = set()

def check(name):
    def wrap(fn):
        @functools.wraps(fn)
        def run(*args):
            try:
                fn(*args)
                results.append((name, None))
                print(f'ok   {name}')
            except Exception as e:  # noqa: BLE001 - report every failure, keep going
                results.append((name, e))
                print(f'FAIL {name}: {e}')
                traceback.print_exc(limit=1)
        return run
    return wrap

def serve():
    tmp = Path(tempfile.mkdtemp())
    shutil.copytree(DIST, tmp / 'nofun')
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(tmp))
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(tmp))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_port}/nofun/'

def text(page, selector):
    return page.locator(selector).first.inner_text().strip()

def bottom_bar(page):
    return page.evaluate("document.querySelector('.menu')?.parentElement?.textContent.replace(/\\s+/g, ' ').trim()")

def click(page, selector):
    # scroll to the middle first: the fixed bottom bar covers the bottom edge of the page
    page.locator(selector).first.evaluate("e => e.scrollIntoView({block: 'center'})")
    page.wait_for_timeout(200)
    # force: Auuki's <page-group> is display: inline around block pages, and Playwright's
    # hit check reports it as covering the control; the browser itself hits the control
    page.click(selector, force=True)

TABS = {'Plan': 'plan', 'Ride': 'home', 'Workouts': 'workouts', 'Library': 'workouts', 'Settings': 'settings', 'You': 'settings'}

def go(page, label):
    if label in ('Library', 'Workouts'):  # a tab of Ride
        page.evaluate("document.querySelector('nofun-ride-tabs [data-tab=\"library\"]').click()")
    else:
        page.click(f'#{TABS[label]}-tab-btn', force=True)
    page.wait_for_timeout(300)
    active = page.evaluate("document.querySelector('.page.active')?.getAttribute('page')")
    assert active == TABS[label], f'{label}: active page is {active}'

def tab(page, name):
    page.evaluate(f"document.querySelector('.page.active nofun-ride-tabs [data-tab=\"{name}\"]').click()")
    page.wait_for_timeout(300)

def launch(p):
    """E2E_CHANNEL=chrome uses the Chrome already installed on the machine (GitHub's runners
    have it): nothing to download. Without it, or if that Chrome can't start, Playwright's own
    Chromium is used (python -m playwright install chromium)."""
    channel = os.environ.get('E2E_CHANNEL')
    if channel:
        try:
            browser = p.chromium.launch(channel=channel)
            print(f'browser: {channel} {browser.version}')
            return browser
        except Exception as e:  # noqa: BLE001
            print(f'browser: {channel} not usable ({str(e).splitlines()[0]}), using Playwright Chromium')
    browser = p.chromium.launch()
    print(f'browser: Playwright Chromium {browser.version}')
    return browser

def main():
    if not (DIST / 'index.html').exists():
        sys.exit('dist/ is missing: run npm run build:pages first')
    server, url = serve()
    errors = []
    with sync_playwright() as p:
        browser = launch(p)
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        context.add_init_script(FIXED_DATE)
        context.add_init_script(BLUETOOTH_STUB)
        page = context.new_page()
        page.set_default_timeout(8000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())  # Auuki asks "Confirm Stop?"
        page.goto(url, wait_until='load')
        page.wait_for_timeout(1500)

        @check('opens on the setup, menu Plan · Ride · Library · You')
        def _():
            assert page.evaluate("document.querySelector('.page.active')?.getAttribute('page')") == 'plan'
            labels = page.evaluate("[...document.querySelectorAll('.menu--btn')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim())")
            assert labels == ['Plan', 'Ride', 'Library', 'You'], labels
            assert text(page, 'nofun-plan .nf-h1') == 'About you'
        _()

        @check('setup: you, plan, start date')
        def _():
            page.fill('[name="nf-name"]', 'E2E')
            page.fill('[name="nf-weight"]', '72')
            page.fill('[name="nf-ftp"]', '250')
            page.click('nofun-plan [data-action="next"]')
            page.click('nofun-plan [data-action="next"]')
            page.click('nofun-plan [data-action="start"]')
            page.wait_for_timeout(300)
            state = page.evaluate("JSON.parse(localStorage.getItem('nofun:plan-state'))")
            assert state['planId'] == 'new-granfondo' and state['start'] == '2026-11-09', state
            assert page.evaluate("localStorage.getItem('weight')") == '72'
            history = page.evaluate("JSON.parse(localStorage.getItem('nofun:ftp-history'))")
            assert history and history[0]['ftp'] == 250 and history[0]['source'] == 'setup', history
        _()

        @check('plan: week 3, today, done and missed, the Ride button loads the ride')
        def _():
            page.evaluate("localStorage.setItem('nofun:plan-state', JSON.stringify({planId: 'new-granfondo', start: '2026-10-26', done: {'3:new-granfondo-w3-wed': '2026-11-11'}}))")
            page.reload(wait_until='load')
            page.wait_for_timeout(1500)
            assert 'Week 3 of 11' in text(page, 'nofun-plan .nf-head'), text(page, 'nofun-plan .nf-head')
            assert text(page, '.nf-today .nf-today-title') == '90 min EM + 2×[4×2 min] SEPI'
            sides = page.evaluate("[...document.querySelectorAll('.nf-day .nf-day-side')].map(e => e.textContent.trim())")
            assert 'Done' in sides and 'Ride' in sides, sides
            assert 'W3 Sat' in bottom_bar(page), bottom_bar(page)  # today's ride is preselected
            page.click('.nf-today .nf-ride')
            page.wait_for_timeout(500)
            assert page.evaluate("document.querySelector('.page.active')?.getAttribute('page')") == 'home'
        _()

        @check('ride ready: workout, devices, Start, Ride screen')
        def _():
            flow = page.locator('nofun-ride-flow')
            assert flow.is_visible(), 'the ready screen is not shown'
            assert 'W3 Sat' in text(page, 'nofun-ride-flow .nf-flow-title'), text(page, 'nofun-ride-flow .nf-flow-title')
            assert page.locator('nofun-ride-flow .nf-device').count() == 3
            assert page.locator('nofun-ride-flow [data-action="start"]').count() == 1
            click(page, 'nofun-ride-flow [data-action="preview"]')
            assert not flow.is_visible(), 'Ride screen did not show the riding layout'
        _()

        @check('ride: the hero shows the target, the zone and what comes next')
        def _():
            target = text(page, 'nofun-ride-hero [data-v="target"]')
            control = page.input_value('#power-control-btn input')
            assert target == (f'{control} W' if int(control or 0) > 0 else '–'), (target, control)
            assert page.locator('nofun-ride-hero [data-v="next-line"]').is_visible()
            assert ' W' in text(page, 'nofun-ride-hero [data-v="next"]'), text(page, 'nofun-ride-hero [data-v="next"]')
        _()

        @check('ride: the whole screen, no scrollbar, at every size')
        def _():
          try:
            for width, height in [(1920, 969), (1366, 657), (1280, 900), (1024, 600), (390, 844), (844, 390)]:
                page.set_viewport_size({'width': width, 'height': height})
                page.wait_for_timeout(250)
                problem = page.evaluate("""(() => {
                    const doc = document.scrollingElement;
                    if (doc.scrollHeight > innerHeight + 1) return `page scrolls: ${doc.scrollHeight} > ${innerHeight}`;
                    for (const e of document.querySelectorAll('.wrapper, #home-page, #home-page-wrapper'))
                        if (e.scrollHeight > e.clientHeight + 1) return `${e.id || e.className} scrolls`;
                    const fb = document.querySelector('.fixed-bottom').getBoundingClientRect();
                    const bar = fb.top > 0 ? fb.top : innerHeight;  // Auuki's phone-on-its-side layout: bar on the right
                    for (const sel of ['nofun-ride-hero', '#targets', '#graph-workout', '.data-tiles']) {
                        if (!document.querySelector(sel)) continue;
                        const e = document.querySelector(sel);
                        if (getComputedStyle(e).display === 'none') continue;  // dropped on very low screens
                        const r = e.getBoundingClientRect();
                        if (r.bottom > bar + 1 || r.height < 20) return `${sel} not fully visible (${Math.round(r.top)}-${Math.round(r.bottom)}, bar at ${Math.round(bar)})`;
                    }
                    for (const card of document.querySelectorAll('.nf-hero-card'))
                        if (card.scrollHeight > card.clientHeight + 1) return `a hero card is cut: ${card.textContent.trim().slice(0, 30)}`;
                    return '';
                })()""")
                assert not problem, f'{width}x{height}: {problem}'
                side = width >= 500 and height <= 432
                if not side:
                    bar = page.evaluate("document.querySelector('.fixed-bottom').getBoundingClientRect().height")
                    assert bar <= (56 if width >= 900 or height <= 480 else 96) + 1, f'{width}x{height}: bottom bar {bar}px'
          finally:
            page.set_viewport_size({'width': 1280, 'height': 900})
            page.wait_for_timeout(250)
        _()

        @check('ride: trainer modes switch with one tap')
        def _():
            for mode in ['resistance', 'slope', 'erg']:
                page.click(f'#{mode}-mode-btn')
                page.wait_for_timeout(150)
                assert 'active' in page.get_attribute(f'#{mode}-mode-controls', 'class'), mode
        _()

        @check('ride: ERG target -/+')
        def _():
            before = page.input_value('#power-control-btn input')
            page.click('#power-target-inc')
            page.wait_for_timeout(150)
            after = page.input_value('#power-control-btn input')
            assert after != before, (before, after)
            page.click('#power-target-dec')
        _()

        @check('ride: timer start, pause, lap, stop')
        def _():
            page.click('#watch-start')
            page.wait_for_timeout(2300)
            elapsed = text(page, '#elapsed-time')
            assert elapsed not in ('', '--:--:--'), elapsed
            assert text(page, 'nofun-ride-hero [data-v="left"]') != '–:––', 'interval time left not shown'
            off = page.evaluate("""(() => {
                const bar = document.querySelector('.fixed-bottom').getBoundingClientRect();
                const mid = (r) => (r.top + r.bottom) / 2;
                return [...document.querySelectorAll('.watch .control--btn')].filter(e => getComputedStyle(e).display !== 'none')
                    .map(e => Math.abs(mid(e.querySelector('svg').getBoundingClientRect()) - mid(bar))); })()""")
            assert off and max(off) <= 2, f'timer icons off centre by {off} px'
            left = lambda: text(page, 'nofun-ride-hero [data-v="left"]')
            first = left()
            click(page, 'nofun-ride-hero [data-action="skip"]')
            page.wait_for_timeout(1200)
            skipped = left()
            assert skipped != first and skipped.startswith(('1:5', '2:0')), f'Skip: {first} -> {skipped}'
            click(page, 'nofun-ride-hero [data-action="back"]')
            page.wait_for_timeout(1200)
            assert left().startswith(('9:5', '10:0')), f'Previous: {left()}'
            page.click('#watch-pause')
            page.wait_for_timeout(1200)
            paused = text(page, '#elapsed-time')
            page.wait_for_timeout(1200)
            assert text(page, '#elapsed-time') == paused, 'timer runs while paused'
            page.click('#watch-stop')
            page.wait_for_timeout(300)
            assert page.locator('.nf-stop-dialog').is_visible(), 'no in-app confirmation for Stop'
            click(page, '.nf-stop-dialog [data-action="end"]')
            page.wait_for_timeout(600)
        _()

        @check('ride done: summary, FIT download, new ride')
        def _():
            assert page.locator('nofun-ride-flow .nf-flow-done').is_visible(), 'no summary after Stop'
            values = page.evaluate("[...document.querySelectorAll('nofun-ride-flow .nf-stat-value')].map(e => e.textContent)")
            assert values[0] not in ('0:00', ''), values
            with page.expect_download() as download:
                click(page, 'nofun-ride-flow [data-action="download"]')
            assert download.value.suggested_filename.endswith('.fit'), download.value.suggested_filename
            click(page, 'nofun-ride-flow [data-action="new"]')
            assert page.locator('nofun-ride-flow .nf-device').count() == 3
        _()

        @check('workouts: both FTP tests first, select, upload a .zwo')
        def _():
            go(page, 'Workouts')
            names = page.evaluate("[...document.querySelectorAll('.workout--name')].map(e => e.textContent.trim())")
            assert names[:2] == ['Ramp test', '20-minute test'], names[:3]
            assert 'Ramp Test' not in names
            click(page, 'workout-item:has(.workout--name:text-is("20-minute test")) .workout--name')
            page.wait_for_timeout(300)
            assert '20-minute test' in bottom_bar(page), bottom_bar(page)
            zwo = Path(tempfile.mkdtemp()) / 'e2e.zwo'
            zwo.write_text(ZWO)
            page.set_input_files('#workouts-page input[type="file"], input[type="file"]', str(zwo))
            page.wait_for_timeout(600)
            assert page.locator('.workout--name:text-is("E2E upload")').count() == 1
        _()

        @check('library: search, filters, Create workout')
        def _():
            go(page, 'Library')
            visible = lambda: page.evaluate("[...document.querySelectorAll('workout-item')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.querySelector('.workout--name').textContent.trim())")
            click(page, 'nofun-library-tools [data-filter="tests"]')
            assert visible() == ['Ramp test', '20-minute test'], visible()
            click(page, 'nofun-library-tools [data-filter="yours"]')
            assert visible() == ['E2E upload'], visible()
            click(page, 'nofun-library-tools [data-filter="all"]')
            page.fill('nofun-library-tools input[name="nf-search"]', 'chili')
            assert visible() and all('Chili' in n for n in visible()), visible()
            page.fill('nofun-library-tools input[name="nf-search"]', '')
            click(page, 'nofun-library-tools [data-action="create"]')
            page.wait_for_timeout(400)
            assert 'active' in (page.get_attribute('#view--workouts-editor', 'class') or ''), 'Create workout did not open Create'
            tab(page, 'library')
        _()

        @check('library: every card shows its graph, Ride opens the workout')
        def _():
            go(page, 'Library')
            hidden = page.evaluate("[...document.querySelectorAll('#view--workouts-workouts workout-item')].filter(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e.querySelector('.workout--full-info')).display === 'none').length")
            assert hidden == 0, f'{hidden} cards without their graph'
            click(page, 'workout-item:has(.workout--name:text-is("Ramp test")) .nf-card-ride')
            assert page.evaluate("document.querySelector('.page.active')?.getAttribute('page')") == 'home'
            assert 'Ramp test' in bottom_bar(page), bottom_bar(page)
            go(page, 'Library')
        _()

        @check('while riding, nofun stays nofun (no account UI, no Planned list)')
        def _():
            go(page, 'Ride')
            state = page.evaluate("(() => { const f = document.querySelector('nofun-ride-flow'); return [f.hidden, f.view, f.status]; })()")
            assert state[1] == 'ready' and not state[0], f'ride flow: {state}'
            page.evaluate("document.querySelector('nofun-ride-flow [data-action=\"start\"]').click()")
            page.wait_for_timeout(800)
            assert page.evaluate("document.documentElement.classList.contains('no-hosted-api')")
            go(page, 'Library')
            assert not page.locator('.nf-planned').is_visible(), 'the Planned list came back'
            go(page, 'You')
            click(page, '#link--settings-profile')
            assert not page.locator('auth-forms').is_visible() and not page.locator('#profile').is_visible(), 'account UI came back'
            page.click('#watch-pause', force=True)
            page.click('#watch-stop', force=True)
            page.wait_for_timeout(200)
            page.evaluate("document.querySelector('.nf-stop-dialog [data-action=\"end\"]').click()")
            page.wait_for_timeout(500)
            page.evaluate("document.querySelector('nofun-ride-flow [data-action=\"new\"]')?.click()")
            go(page, 'Library')
        _()

        @check('library tabs: Workouts, Create (save lands in Yours), Rides')
        def _():
            go(page, 'Library')
            tabs = page.evaluate("[...document.querySelectorAll('.page.active nofun-ride-tabs .nf-tab')].map(e => e.textContent.trim())")
            assert tabs == ['Workouts', 'Create', 'Rides'], tabs
            tab(page, 'editor')
            assert page.locator('#view--workouts-editor').is_visible()
            labels = page.evaluate("[...document.querySelectorAll('.nf-editor-btn')].map(e => e.textContent.trim())")
            assert labels == ['Add interval', 'Remove interval', 'Save to Workouts', 'Download .zwo'], labels
            page.fill('#view--workouts-editor .editor--name, #view--workouts-editor input', 'E2E created')
            click(page, '#view--workouts-editor .editor--save')
            page.wait_for_timeout(800)
            assert 'active' in (page.get_attribute('#view--workouts-workouts', 'class') or ''), 'Save did not go back to Workouts'
            assert page.get_attribute('nofun-library-tools [data-filter="yours"]', 'aria-pressed') == 'true'
            shown = page.evaluate("[...document.querySelectorAll('workout-item')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.querySelector('.workout--name').textContent.trim())")
            assert 'E2E created' in shown, shown
            click(page, 'nofun-library-tools [data-filter="all"]')
            tab(page, 'report')
            assert page.locator('#view--workouts-report activity-list').count() == 1, 'your rides are not in Rides'
            assert page.locator('#view--workouts-report laps-list').count() == 1
            inside = page.evaluate("""[...document.querySelectorAll('#view--workouts-report .power--zone-bar')].every(bar => {
                const b = bar.getBoundingClientRect(), c = bar.closest('.power--zone--item').getBoundingClientRect();
                return b.left >= c.left - 0.5 && b.right <= c.right + 0.5 && b.bottom <= c.bottom + 0.5; })""")
            assert inside, 'a zone bar is drawn outside its card'
            tab(page, 'library')
            assert page.locator('#home-page nofun-ride-tabs').count() == 0, 'Ride still has a tab row'
        _()

        @check('rides: one card per ride, Download FIT, Delete asks first')
        def _():
            go(page, 'Library')
            tab(page, 'report')
            rows = page.locator('#view--workouts-report activity-item.nf-ride')
            n = rows.count()
            assert n >= 1, 'no ride listed'
            first = rows.first
            assert first.locator('.activity--name').inner_text().strip(), 'a ride without its name'
            meta = first.locator('.nf-ride-meta').inner_text()
            assert ' · ' in meta and ('min' in meta or ' s' in meta), meta
            assert first.locator('.action--intervals').is_hidden() and first.locator('.action--strava').is_hidden(), 'account buttons shown'
            with page.expect_download() as download:
                click(page, '#view--workouts-report activity-item.nf-ride:first-child .action--download')
            assert download.value.suggested_filename.endswith('.fit'), download.value.suggested_filename
            assert first.locator('.nf-ride-confirm').is_hidden(), 'Delete without asking'
            click(page, '#view--workouts-report activity-item.nf-ride:first-child .nf-ride-delete')
            assert first.locator('.nf-ride-confirm').is_visible(), 'no confirmation for Delete'
            click(page, '#view--workouts-report activity-item.nf-ride:first-child .nf-ride-confirm')
            page.wait_for_timeout(300)
            assert rows.count() == n - 1, f'{rows.count()} rides after deleting one of {n}'
        _()

        @check('rides: the laps table, header and rows in the same columns, no empty sensor columns')
        def _():
          try:
            # a short ride with one skipped interval, so this ride has a lap
            go(page, 'Ride')
            page.evaluate("document.querySelector('nofun-ride-flow [data-action=\"start\"]')?.click()")
            page.wait_for_timeout(3000)
            page.evaluate("document.querySelector('nofun-ride-hero [data-action=\"skip\"]').click()")
            page.wait_for_timeout(1500)
            go(page, 'Library')
            tab(page, 'report')
            laps = page.locator('#view--workouts-report .lap--item')
            info = page.evaluate("(() => { const f = document.querySelector('nofun-ride-flow'); return [f.view, f.status, document.querySelectorAll('.lap--item').length, document.querySelector('nofun-ride-hero [data-v=\"left\"]').textContent]; })()")
            assert laps.count() == 1, f'this ride has one lap so far, the table shows {laps.count()} {info}'
            assert page.locator('#view--workouts-report .nf-laps-empty').is_hidden()
            shape = page.evaluate("""(() => {
                const visible = (els) => [...els].filter(e => getComputedStyle(e).display !== 'none');
                const head = visible(document.querySelectorAll('#view--workouts-report .lap--header--item'));
                const row = visible(document.querySelector('#view--workouts-report .lap--item--inner').children);
                const lefts = (els) => els.map(e => Math.round(e.getBoundingClientRect().left));
                const h = document.querySelector('#view--workouts-report .laps--header');
                const r = document.querySelector('#view--workouts-report .lap--item--inner');
                const css = (e) => [getComputedStyle(e).display, getComputedStyle(e).gridTemplateColumns, Math.round(e.getBoundingClientRect().left)].join(' ');
                return { head: head.map(e => e.textContent.trim()), headLeft: lefts(head), rowLeft: lefts(row), css: [css(h), css(r), document.querySelectorAll('#view--workouts-report .laps--header').length, document.querySelectorAll('#view--workouts-report .lap--item--inner').length] };
            })()""")
            assert shape['head'] == ['#', 'Time', 'Power', 'Cadence', 'Heart rate'], shape['head']
            assert shape['headLeft'] == shape['rowLeft'], f"columns not aligned: {shape['headLeft']} vs {shape['rowLeft']} {shape['css']}"
          finally:
            go(page, 'Ride')
            page.click('#watch-pause', force=True)
            page.click('#watch-stop', force=True)
            page.wait_for_timeout(200)
            page.evaluate("document.querySelector('.nf-stop-dialog[open], .nf-stop-dialog') && document.querySelector('.nf-stop-dialog [data-action=\"end\"]').click()")
            page.wait_for_timeout(500)
            page.evaluate("document.querySelector('nofun-ride-flow [data-action=\"new\"]')?.click()")
        _()

        @check('settings: options and devices are there, More sensors opens')
        def _():
            go(page, 'Settings')
            click(page, '#link--settings-settings')
            assert page.locator('.connection-switch--label:text-is("Trainer")').count() == 1
            assert not page.locator('#ftp-settings').is_visible() and not page.locator('#weight-settings').is_visible(), 'FTP and weight twice in You'
            click(page, '.nf-more-sensors > summary')
            assert page.get_attribute('.nf-more-sensors', 'open') is not None
            assert page.locator('.option--name:text-is("Auto Start")').count() == 1
        _()

        @check('profile: both FTP tests, export backup')
        def _():
            click(page, '#link--settings-profile')
            assert page.locator('#link--settings-profile').inner_text().strip().lower() == 'profile'
            page.wait_for_timeout(300)
            assert page.locator('nofun-profile [data-action="ramp"]').count() == 1
            assert page.locator('nofun-profile [data-action="twenty"]').count() == 1
            with page.expect_download() as download:
                click(page, 'nofun-profile [data-action="export"]')
            data = json.loads(Path(download.value.path()).read_text())
            assert data['format'] == 'nofun-backup' and 'nofun:plan-state' in data['data'], list(data['data'])
        _()

        @check('the last button of a page is not under the bottom bar')
        def _():
            hit = page.evaluate("""(() => {
                const e = document.querySelector('nofun-profile [data-action="import"]');
                for (const scroller of [document.scrollingElement, ...document.querySelectorAll('.wrapper')]) scroller.scrollTop = scroller.scrollHeight;
                const bar = document.querySelector('.fixed-bottom').getBoundingClientRect();
                return e.getBoundingClientRect().bottom <= bar.top; })()""")
            assert hit, 'covered by the bottom bar'
        _()

        @check('ramp test starts from the profile')
        def _():
            click(page, 'nofun-profile [data-action="ramp"]')
            page.wait_for_timeout(400)
            assert 'Ramp test' in bottom_bar(page), bottom_bar(page)
        _()

        @check('the plan survives a reload')
        def _():
            page.reload(wait_until='load')
            page.wait_for_timeout(1200)
            assert page.evaluate("document.querySelector('.page.active')?.getAttribute('page')") == 'plan'
            assert text(page, 'nofun-plan .nf-h1') == 'Granfondo · Rookie'
        _()

        @check('no JavaScript errors')
        def _():
            assert not errors, errors
        _()

        @check('works at phone width')
        def _():
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(300)
            width = page.evaluate('document.documentElement.scrollWidth')
            assert width <= 392, f'page is {width}px wide'
        _()
        browser.close()
    server.shutdown()
    failed = [n for n, e in results if e and n not in KNOWN]
    known = [n for n, e in results if e and n in KNOWN]
    fixed = [n for n, e in results if not e and n in KNOWN]
    print(f'\n{len(results) - len(failed) - len(known)} passed, {len(failed)} failed, {len(known)} known bugs')
    for n in fixed:
        print(f'fixed now, remove from KNOWN: {n}')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

