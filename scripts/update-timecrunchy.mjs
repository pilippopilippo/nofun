// Updates src/vendor/timecrunchy to a tag of github.com/pilippopilippo/timecrunchy:
//   npm run timecrunchy:update -- v1.1.0
// Checks out the tag, runs its tests, builds it and copies the library here. Review the diff, run npm test, commit.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2];
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
    console.error('usage: npm run timecrunchy:update -- vX.Y.Z');
    process.exit(2);
}
const vendor = fileURLToPath(new URL('../src/vendor/timecrunchy/', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'timecrunchy-'));
try {
    const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, stdio: 'inherit' });
    execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', tag, 'https://github.com/pilippopilippo/timecrunchy.git', dir], { stdio: 'inherit' });
    run('npm', ['ci', '--no-audit', '--no-fund']);
    run('npm', ['test']);
    copyFileSync(join(dir, 'dist', 'timecrunchy.js'), join(vendor, 'timecrunchy.js'));
    copyFileSync(join(dir, 'LICENSE'), join(vendor, 'LICENSE'));
    writeFileSync(join(vendor, 'version.js'), `export const VERSION = '${tag.slice(1)}';\nexport const TAG = '${tag}';\n`);
    console.log(`timecrunchy ${tag} copied to src/vendor/timecrunchy`);
} finally {
    rmSync(dir, { recursive: true, force: true });
}
