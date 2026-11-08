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

if(globalThis.document) {
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => linkSource());
    } else {
        linkSource();
    }
}

export { sourceUrl, linkSource, upstream };
