//
// Settings > Profile: name, weight, FTP and its history, the ramp test, your data (backup).
// Ride: the result of a ramp test.
//

import { xf } from '../functions.js';
import { models } from '../models/models.js';
import { dataChanged } from '../data-events.js';
import { loadProfile, saveProfile, loadHistory, addFtpResult } from '../profile.js';
import { buildRampWorkout, RampTest, RAMP } from '../ramp-test.js';
import * as backup from '../backup.js';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function startRampTest() {
    xf.dispatch('workout', buildRampWorkout((zwo) => models.workout.parse(zwo)));
    xf.dispatch('ui:page-set', 'home');
}

// restore: the File System Access picker when there is one (it also links the file
// for automatic saving), a file input otherwise
async function restoreBackup(fileInput) {
    if(backup.status.fileSupported) {
        try { await backup.restoreFromFile(); } catch(e) { if(e.name !== 'AbortError') alert(e.message); }
        return;
    }
    fileInput.click();
}

class NofunProfile extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.ftp = undefined;
        this.weight = undefined;
        this.backupStatus = { ...backup.status };
        xf.sub('db:ftp', (ftp) => { this.ftp = ftp; this.render(); }, signal);
        xf.sub('db:weight', (weight) => { this.weight = weight; this.render(); }, signal);
        window.addEventListener('nofun:backup-status', (e) => { this.backupStatus = e.detail; this.render(); }, signal);
        window.addEventListener('nofun:data-changed', () => this.render(), signal);
        this.addEventListener('click', this.onClick.bind(this), signal);
        this.addEventListener('change', this.onChange.bind(this), signal);
        this.render();
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    async onClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        try {
            if(action === 'ramp') startRampTest();
            if(action === 'save-profile') {
                const name = this.querySelector('[name="nf-name"]').value;
                const weight = parseFloat(this.querySelector('[name="nf-weight"]').value);
                const ftp = parseInt(this.querySelector('[name="nf-ftp"]').value, 10);
                saveProfile({ name });
                if(weight >= 30 && weight <= 200 && weight !== this.weight) xf.dispatch('ui:weight-set', weight);
                if(ftp >= 50 && ftp <= 600 && ftp !== this.ftp) {
                    xf.dispatch('ui:ftp-set', ftp);
                    addFtpResult({ ftp, source: 'manual' });
                }
                this.querySelector('.nf-saved').textContent = 'Saved.';
            }
            if(action === 'export') backup.exportBackup();
            if(action === 'import') await restoreBackup(this.querySelector('[name="nf-import"]'));
            if(action === 'choose-file') await backup.chooseFile();
            if(action === 'allow-file') await backup.allowFile();
        } catch(e) {
            if(e.name !== 'AbortError') alert(e.message);
        }
    }
    async onChange(event) {
        if(event.target.name === 'nf-import' && event.target.files[0]) {
            try { await backup.importBackup(event.target.files[0]); } catch(e) { alert(e.message); }
        }
    }
    render() {
        if(this.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; // don't wipe typing
        const profile = loadProfile();
        const history = loadHistory();
        const st = this.backupStatus;
        const rows = history.length
            ? history.map((h) => `<tr><td>${esc(day(h.date))}</td><td><strong>${esc(h.ftp)} W</strong></td><td>${esc(h.source === 'ramp' ? `Ramp test · best minute ${h.best1min} W` : h.source === 'setup' ? 'Set at setup' : 'Set by hand')}</td><td>${h.applied ? 'Used' : 'Not used'}</td></tr>`).join('')
            : '<tr><td colspan="4" class="nf-muted">No tests yet.</td></tr>';
        let auto = '<p class="nf-muted">Automatic backup to a file needs Chrome or Edge on a computer. Use Export and Import here.</p>';
        if(st.fileSupported) {
            if(st.state === 'off') auto = '<p class="nf-muted">Choose a file once, for example in a synced folder: nofun rewrites it at every change.</p><button type="button" class="nf-btn" data-action="choose-file">Save to a file…</button>';
            if(st.state === 'ok') auto = `<p><strong>Saving to ${esc(st.file)}</strong>${st.lastSaved ? ` · last saved ${esc(time(st.lastSaved))}` : ''}</p><button type="button" class="nf-btn" data-action="choose-file">Change file…</button>`;
            if(st.state === 'needs-permission') auto = `<p class="nf-warn">Saving to ${esc(st.file)} is paused: the browser asks again for permission.</p><button type="button" class="nf-btn nf-primary" data-action="allow-file">Allow saving</button>`;
            if(st.state === 'error') auto = `<p class="nf-warn">Could not save to ${esc(st.file)}: ${esc(st.error)}</p><button type="button" class="nf-btn" data-action="choose-file">Choose the file again…</button>`;
        }
        this.innerHTML = `
            <div class="nf-page nf-profile">
                <section class="nf-box" aria-label="You">
                    <h2 class="nf-h2">You</h2>
                    <div class="nf-form">
                        <label class="nf-field"><span>Name</span><input name="nf-name" type="text" autocomplete="nickname" maxlength="40" value="${esc(profile.name)}"></label>
                        <label class="nf-field"><span>Weight, kg</span><input name="nf-weight" type="number" inputmode="decimal" min="30" max="200" step="0.1" value="${esc(this.weight ?? '')}"></label>
                        <label class="nf-field"><span>FTP, W</span><input name="nf-ftp" type="number" inputmode="numeric" min="50" max="600" value="${esc(this.ftp ?? '')}"></label>
                    </div>
                    <p class="nf-muted nf-small">Weight sets the speed and the climbs in slope mode.</p>
                    <div class="nf-row"><button type="button" class="nf-btn nf-primary" data-action="save-profile">Save</button><span class="nf-saved nf-muted" role="status"></span></div>
                </section>
                <section class="nf-box" aria-label="FTP">
                    <div class="nf-row nf-spread"><h2 class="nf-h2">FTP history</h2><button type="button" class="nf-btn" data-action="ramp">Ramp test</button></div>
                    <p class="nf-muted nf-small">The ramp starts at ${RAMP.start} W and adds ${RAMP.step} W every minute. It ends by itself when your cadence stays under ${RAMP.endCadence} rpm; FTP is 75% of your best minute.</p>
                    <div class="nf-scroll"><table class="nf-table"><thead><tr><th>Date</th><th>FTP</th><th>How</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
                </section>
                <section class="nf-box" aria-label="Your data">
                    <h2 class="nf-h2">Your data</h2>
                    <p class="nf-muted nf-small">Everything stays on this device. Clearing the browser's site data deletes it: keep a backup file. Activities and uploaded workouts are not in it.</p>
                    ${auto}
                    <div class="nf-row"><button type="button" class="nf-btn" data-action="export">Export backup</button><button type="button" class="nf-btn" data-action="import">Restore a backup…</button>
                    <input name="nf-import" type="file" accept=".json,application/json" hidden></div>
                    <p class="nf-muted nf-small">${st.persisted ? 'The browser keeps this data even when it runs low on space.' : 'The browser may delete this data when it runs low on space.'}</p>
                </section>
            </div>`;
    }
}

class NofunRampResult extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.ftp = undefined;
        xf.sub('db:ftp', (ftp) => { this.ftp = ftp; }, signal);
        xf.sub('nofun:ramp-result', (result) => this.show(result), signal);
        this.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if(!action || !this.result) return;
            const use = action === 'use';
            if(use) xf.dispatch('ui:ftp-set', this.result.ftp);
            addFtpResult({ ftp: this.result.ftp, source: 'ramp', best1min: this.result.best1min, peak: this.result.peak, applied: use });
            this.result = null;
            this.querySelector('dialog')?.close();
        }, signal);
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    show(result) {
        this.result = result;
        this.innerHTML = `
            <dialog class="nf-dialog" aria-labelledby="nf-ramp-title">
                <h2 id="nf-ramp-title" class="nf-h1">Ramp test: FTP ${esc(result.ftp)} W</h2>
                <p class="nf-lead">Best minute ${esc(result.best1min)} W, highest step ${esc(result.peak)} W. ${this.ftp ? `Your FTP now is ${esc(this.ftp)} W.` : ''}</p>
                <p class="nf-muted">The cool-down is running. The result goes to your FTP history either way.</p>
                <div class="nf-row"><button type="button" class="nf-btn nf-primary" data-action="use">Use ${esc(result.ftp)} W</button><button type="button" class="nf-btn" data-action="keep">Keep ${esc(this.ftp ?? 'the current FTP')}${this.ftp ? ' W' : ''}</button></div>
            </dialog>`;
        this.querySelector('dialog').showModal();
    }
}

customElements.define('nofun-profile', NofunProfile);
customElements.define('nofun-ramp-result', NofunRampResult);

// runtime
RampTest();
backup.initBackup();
xf.sub('db:ftp', dataChanged);
xf.sub('db:weight', dataChanged);

export { startRampTest, restoreBackup, NofunProfile, NofunRampResult };
