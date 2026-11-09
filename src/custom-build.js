//
// Custom build helpers.
//
// The source of this copy is linked from the app (AGPL-3.0, section 13).
// On GitHub Pages https://<user>.github.io/<repo>/ is built from
// https://github.com/<user>/<repo>; on any other host set sourceOverride.
//

const upstream = 'https://github.com/dvmarinoff/Auuki';
const sourceOverride = 'https://github.com/pilippopilippo/nofun';

function sourceUrl(location = globalThis.location) {
    if(sourceOverride) return sourceOverride;
    const match = (location?.hostname ?? '').match(/^([a-z0-9-]+)\.github\.io$/i);
    if(!match) return upstream;
    const user = match[1].toLowerCase();
    const repo = (location.pathname ?? '/').split('/').filter(Boolean)[0];
    return `https://github.com/${user}/${repo ?? `${user}.github.io`}`;
}

function linkSource(root = globalThis.document) {
    root?.querySelectorAll?.('[data-source-link]').forEach(($a) => {
        $a.href = sourceUrl();
    });
}

// the fixed bottom bar (current workout, timer, menu) has a height that depends on the
// screen: it becomes --nf-bottom-bar, so Ride can take exactly the rest of the screen
function measureBottomBar(root = globalThis.document) {
    const bar = root?.querySelector?.('.fixed-bottom');
    if(!bar || !globalThis.ResizeObserver) return;
    const set = () => root.documentElement.style.setProperty('--nf-bottom-bar', `${bar.offsetHeight}px`);
    new ResizeObserver(set).observe(bar);
    set();
}

if(globalThis.document) {
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { linkSource(); measureBottomBar(); });
    } else {
        linkSource();
        measureBottomBar();
    }
}

export { sourceUrl, linkSource, measureBottomBar, upstream };
