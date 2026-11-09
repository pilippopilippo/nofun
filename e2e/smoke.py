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
FIXED_DATE = f"""const __fixed = {TODAY}; const __Real = Date;
globalThis.Date = class extends __Real {{ constructor(...a) {{ if (a.length === 0) super(__fixed); else super(...a); }} static now() {{ return __fixed; }} }};"""
# Chromium for tests has no Web Bluetooth: without it nofun shows its "browser not supported"
# banner, which a real user never sees in Chrome. A stub keeps the layout of a supported browser.
BLUETOOTH_STUB = """if (!('bluetooth' in navigator)) Object.defineProperty(navigator, 'bluetooth', { value: {
    getAvailability: async () => true,
    requestDevice: async () => { throw new DOMException('No devices in tests', 'NotFoundError'); },
    getDevices: async () => [],
    addEventListener() {}, removeEventListener() {},
} });"""
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

TABS = {'Plan': 'plan', 'Ride': 'home', 'Workouts': 'workouts', 'Settings': 'settings'}

def go(page, label):
    page.click(f'#{TABS[label]}-tab-btn', force=True)
    page.wait_for_timeout(300)
    active = page.evaluate("document.querySelector('.page.active')?.getAttribute('page')")
    assert active == TABS[label], f'{label}: active page is {active}'

def main():
    if not (DIST / 'index.html').exists():
        sys.exit('dist/ is missing: run npm run build:pages first')
    server, url = serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        context.add_init_script(FIXED_DATE)
        context.add_init_script(BLUETOOTH_STUB)
        page = context.new_page()
        page.set_default_timeout(8000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url, wait_until='load')
        page.wait_for_timeout(1500)

        @check('opens on the setup, menu Plan · Ride · Workouts · Settings')
        def _():
            assert page.evaluate("document.querySelector('.page.active')?.getAttribute('page')") == 'plan'
            labels = page.evaluate("[...document.querySelectorAll('.menu--btn--label')].map(e => e.textContent.trim())")
            assert labels == ['Plan', 'Ride', 'Workouts', 'Settings'], labels
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
            page.click('#watch-lap')
            page.click('#watch-pause')
            page.wait_for_timeout(1200)
            paused = text(page, '#elapsed-time')
            page.wait_for_timeout(1200)
            assert text(page, '#elapsed-time') == paused, 'timer runs while paused'
            page.click('#watch-stop')
            page.wait_for_timeout(500)
        _()

        @check('workouts: both FTP tests first, select, upload a .zwo')
        def _():
            go(page, 'Workouts')
            names = page.evaluate("[...document.querySelectorAll('.workout--name')].map(e => e.textContent.trim())")
            assert names[:2] == ['Ramp test', '20-minute test'], names[:3]
            assert 'Ramp Test' not in names
            page.locator('.workout--summary:has(.workout--name:text-is("20-minute test")) .workout--select').click()
            page.wait_for_timeout(300)
            assert '20-minute test' in bottom_bar(page), bottom_bar(page)
            zwo = Path(tempfile.mkdtemp()) / 'e2e.zwo'
            zwo.write_text(ZWO)
            page.set_input_files('#workouts-page input[type="file"], input[type="file"]', str(zwo))
            page.wait_for_timeout(600)
            assert page.locator('.workout--name:text-is("E2E upload")').count() == 1
        _()

        @check('workouts: editor and ride report open')
        def _():
            page.click('#link--workouts-editor')
            page.wait_for_timeout(300)
            page.click('#link--workouts-report')
            page.wait_for_timeout(300)
            page.click('#link--workouts-workouts')
        _()

        @check('settings: options and devices are there, More sensors opens')
        def _():
            go(page, 'Settings')
            click(page, '#link--settings-settings')
            assert page.locator('.connection-switch--label:text-is("Trainer")').count() == 1
            click(page, '.nf-more-sensors > summary')
            assert page.get_attribute('.nf-more-sensors', 'open') is not None
            assert page.locator('.option--name:text-is("Auto Start")').count() == 1
        _()

        @check('profile: both FTP tests, export backup')
        def _():
            click(page, '#link--settings-profile')
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

