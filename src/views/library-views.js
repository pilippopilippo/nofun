//
// Library: search, filters, upload, create, and the workout you picked
//
// Works on top of Auuki's workout list (select, expand, delete stay Auuki's): it only
// hides the items that don't match and adds the buttons around the list.
//

import { xf } from '../functions.js';
import { workouts as workoutsFile } from '../workouts/workouts.js';
import { RAMP, TWENTY } from '../ramp-test.js';

const TESTS = new Set([RAMP.name, TWENTY.name]);
// names of Auuki's own workouts: everything else in the list was uploaded or made by you
const AUUKI = new Set(workoutsFile.map((zwo) => (zwo.match(/<(?:n|name)>([^<]*)<\/(?:n|name)>/) ?? [])[1]).filter(Boolean));

const FILTERS = [
    ['all', 'All'],
    ['tests', 'FTP tests'],
    ['auuki', 'Auuki classics'],
    ['yours', 'Yours'],
];

function kindOf(name) {
    if(TESTS.has(name)) return 'tests';
    if(AUUKI.has(name)) return 'auuki';
    return 'yours';
}

function matches(item, filter, query) {
    const name = item.querySelector('.workout--name')?.textContent.trim() ?? '';
    const type = item.querySelector('.workout--type')?.textContent.trim() ?? '';
    if(filter !== 'all' && kindOf(name) !== filter) return false;
    return !query || `${name} ${type}`.toLowerCase().includes(query);
}

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

class NofunLibraryTools extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.filter = 'all';
        this.query = '';
        this.innerHTML = `
            <div class="nf-lib">
                <div class="nf-lib-row">
                    <label class="nf-lib-search"><span class="nf-sr">Search workouts</span>
                        <input type="search" name="nf-search" placeholder="Search by name or type" autocomplete="off"></label>
                    <button type="button" class="nf-btn" data-action="upload">Upload .zwo</button>
                    <button type="button" class="nf-btn nf-light" data-action="create">Create workout</button>
                </div>
                <div class="nf-lib-row" role="group" aria-label="Show">
                    ${FILTERS.map(([id, label]) => `<button type="button" class="nf-chip" data-filter="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('')}
                </div>
                <p class="nf-lib-current" hidden><span class="nf-muted">Selected</span> <strong data-v="current"></strong>
                    <button type="button" class="nf-btn nf-primary" data-action="ride">Ride it</button></p>
                <p class="nf-muted nf-lib-empty" hidden>No workout matches.</p>
            </div>`;
        this.addEventListener('click', (e) => this.onClick(e), signal);
        this.addEventListener('input', (e) => {
            if(e.target.name !== 'nf-search') return;
            this.query = e.target.value.trim().toLowerCase();
            this.apply();
        }, signal);
        xf.sub('db:workout', (workout) => {
            const name = workout?.meta?.name;
            this.querySelector('.nf-lib-current').hidden = !name;
            this.querySelector('[data-v="current"]').textContent = name ?? '';
        }, signal);
        // the list re-renders on its own (uploads, deletes): filter again
        this.observer = new MutationObserver(() => this.apply());
        const list = this.list();
        if(list) this.observer.observe(list, { childList: true });
    }
    disconnectedCallback() {
        this.abortController?.abort();
        this.observer?.disconnect();
    }
    list() {
        return this.closest('.sub-tab, #view--workouts-workouts')?.querySelector('workout-list') ?? document.querySelector('workout-list');
    }
    onClick(event) {
        const chip = event.target.closest('[data-filter]');
        if(chip) {
            this.filter = chip.dataset.filter;
            this.querySelectorAll('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
            this.apply();
            return;
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if(action === 'upload') document.querySelector('#view--workouts-workouts input[type="file"], #workouts-page input[type="file"]')?.click();
        if(action === 'create') xf.dispatch('action:nav', 'workouts:editor');
        if(action === 'ride') xf.dispatch('ui:page-set', 'home');
    }
    apply() {
        const items = [...(this.list()?.querySelectorAll('workout-item') ?? [])];
        let shown = 0;
        for(const item of items) {
            const ok = matches(item, this.filter, this.query);
            item.classList.toggle('nf-filtered-out', !ok);
            if(ok) shown++;
        }
        this.querySelector('.nf-lib-empty').hidden = shown > 0 || items.length === 0;
    }
}

customElements.define('nofun-library-tools', NofunLibraryTools);

export { NofunLibraryTools, kindOf, matches };
