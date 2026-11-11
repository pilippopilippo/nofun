//
// Ride has tabs: Ride, Library, Editor, Report
//
// Library, Editor and Report are Auuki's workouts page and its three views; the same tab
// row sits on top of Ride and of that page, so they read as one section. Nothing moves in
// the DOM: a tab sets the page and the view with Auuki's own events.
//

import { xf } from '../functions.js';

const TABS = [
    { id: 'ride', label: 'Ride', page: 'home' },
    { id: 'library', label: 'Library', page: 'workouts', view: 'workouts:workouts' },
    { id: 'editor', label: 'Editor', page: 'workouts', view: 'workouts:editor' },
    { id: 'report', label: 'Report', page: 'workouts', view: 'workouts:report' },
];

// shared by every <nofun-ride-tabs>
const state = { page: 'home', view: 'workouts:workouts' };

class NofunRideTabs extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.innerHTML = `<nav class="nf-tabs" aria-label="Ride">${TABS.map((t) =>
            `<button type="button" class="nf-tab" data-tab="${t.id}">${t.label}</button>`).join('')}</nav>`;
        this.addEventListener('click', (e) => {
            const tab = TABS.find((t) => t.id === e.target.closest('[data-tab]')?.dataset.tab);
            if(!tab) return;
            xf.dispatch('ui:page-set', tab.page);
            if(tab.view) xf.dispatch('action:nav', tab.view);
        }, signal);
        xf.sub('db:page', (page) => { state.page = page; this.draw(); }, signal);
        xf.sub('action:nav', (view) => { if(String(view).startsWith('workouts:')) { state.view = view; this.draw(); } }, signal);
        this.draw();
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    draw() {
        const active = state.page === 'workouts' ? (TABS.find((t) => t.view === state.view)?.id ?? 'library') : 'ride';
        this.querySelectorAll('[data-tab]').forEach((b) => {
            const on = b.dataset.tab === active;
            b.classList.toggle('active', on);
            if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
    }
}

customElements.define('nofun-ride-tabs', NofunRideTabs);

export { NofunRideTabs, TABS };
