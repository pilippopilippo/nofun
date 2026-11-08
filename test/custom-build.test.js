/**
 * @jest-environment jsdom
 */

import { sourceUrl, linkSource } from '../src/custom-build.js';

const nofun = 'https://github.com/pilippopilippo/nofun';

describe('source link', () => {
    test('always the nofun repository', () => {
        expect(sourceUrl({hostname: 'pilippopilippo.github.io', pathname: '/nofun/'})).toBe(nofun);
        expect(sourceUrl({hostname: 'localhost', pathname: '/'})).toBe(nofun);
    });

    test('fills every marked link', () => {
        document.body.innerHTML = '<a data-source-link href="#"></a>';
        linkSource(document);
        expect(document.querySelector('a').href).toBe(nofun);
    });
});
