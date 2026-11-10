//
// Ride before and after riding
//
// Ready: the workout, the devices (connect with one tap, Auuki's own switch events),
//        what nofun knows (FTP, weight), Start. "Ride screen" shows the riding layout
//        without starting, to set the mode or the target first.
// Done:  after Stop, a summary of the ride (time, averages, energy, distance, the work
//        intervals against their target), the FIT file, back to the plan.
//
// Nothing here replaces Auuki's controls: the bottom bar keeps start, pause, lap and stop.
//

import { xf } from '../functions.js';
import { models } from '../models/models.js';
import { loadHistory } from '../profile.js';
import { loadState, NONE } from '../plan.js';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const mmss = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
const mean = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0);
const watts = (share, ftp) => (share > 0 && share < 9 ? Math.round(share * ftp) : Math.round(share || 0));

const DEVICES = [
    { for: 'ble:controllable', name: 'Smart trainer', note: 'Needed to ride in ERG, slope or resistance' },
    { for: 'ble:heartRateMonitor', name: 'Heart rate', note: 'Optional' },
    { for: 'ble:powerMeter', name: 'Power meter', note: 'Optional: the trainer measures power' },
];

// a small profile of a parsed workout: [{x0, x1, power}] in shares of the total time
function profilePaths(workout, ftp) {
    const intervals = workout?.intervals ?? [];
    const total = intervals.reduce((s, i) => s + (i.duration || 0), 0) || 1;
    const max = Math.max(1.4 * (ftp || 250), ...intervals.flatMap((i) => i.steps.map((st) => watts(st.power, ftp))));
    const color = (w) => {
        const share = ftp ? w / ftp : 0.6;
        if(share >= 1.12) return 'var(--nf-pi)';
        if(share >= 1.05) return 'var(--nf-cr)';
        if(share >= 0.95) return 'var(--nf-ss)';
        if(share <= 0.56) return 'var(--nf-rec)';
        return 'var(--nf-em)';
    };
    let t = 0;
    const paths = [];
    for(const interval of intervals) {
        for(const step of interval.steps) {
            const w = step.power > 0 ? watts(step.power, ftp) : (ftp || 250) * 0.5;
            const x0 = (t / total) * 240;
            t += step.duration || 0;
            const x1 = (t / total) * 240;
            const y = 44 - (Math.min(w, max) / max) * 44;
            paths.push(`<path d="M${x0.toFixed(1)} 44V${y.toFixed(1)}H${x1.toFixed(1)}V44Z" fill="${color(w)}"></path>`);
        }
    }
    return paths.join('');
}

class NofunRideFlow extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.view = 'ready';           // ready | riding | done
        this.status = 'stopped';
        this.workout = null;
        this.ftp = 0;
        this.weight = 0;
        this.devices = Object.fromEntries(DEVICES.map((d) => [d.for, { status: 'off', name: '' }]));
        this.live = { power: 0, cadence: 0, heartRate: 0, distance: 0, kcal: 0, target: 0, intervalIndex: 0 };
        this.ride = null;              // what the summary shows
        this.activityId = null;

        for(const d of DEVICES) {
            xf.sub(`${d.for}:connected`, () => this.device(d.for, 'on'), signal);
            xf.sub(`${d.for}:disconnected`, () => this.device(d.for, 'off'), signal);
            xf.sub(`${d.for}:connecting`, () => this.device(d.for, 'loading'), signal);
            xf.sub(`${d.for}:name`, (name) => { this.devices[d.for].name = name; if(this.view === 'ready') this.render(); }, signal);
        }
        xf.sub('db:workout', (workout) => { this.workout = workout; if(this.status === 'stopped' && this.view !== 'done') this.show('ready'); }, signal);
        xf.sub('db:ftp', (ftp) => { this.ftp = ftp; if(this.view === 'ready') this.render(); }, signal);
        xf.sub('db:weight', (weight) => { this.weight = weight; }, signal);
        // live values, only while riding: Auuki resets them right after Stop
        const live = (event, key) => xf.sub(event, (v) => { if(this.status !== 'stopped') this.live[key] = v; }, signal);
        live('db:power', 'power');
        live('db:cadence', 'cadence');
        live('db:heartRate', 'heartRate');
        live('db:distance', 'distance');
        live('db:kcal', 'kcal');
        live('db:powerTarget', 'target');
        xf.sub('db:intervalIndex', (index) => this.onInterval(index), signal);
        xf.sub('db:watchStatus', (status) => this.onStatus(status), signal);
        // back on Ride while stopped: the ready screen again (after a look at Ride screen)
        xf.sub('db:page', (page) => { if(page === 'home' && this.status === 'stopped' && this.view === 'riding') this.show('ready'); }, signal);
        xf.sub('watch:stopped', () => this.onStopped(), signal);
        xf.sub('activity:add', (summary) => { this.activityId = summary?.id ?? null; }, signal);
        this.addEventListener('click', (e) => this.onClick(e), signal);

        this.tick = setInterval(() => this.sample(), 1000);
        this.show('ready');
    }
    disconnectedCallback() {
        this.abortController?.abort();
        clearInterval(this.tick);
    }

    device(id, status) {
        this.devices[id].status = status;
        if(this.view === 'ready') this.render();
    }
    onStatus(status) {
        const was = this.status;
        this.status = status;
        if(status === 'started' && was === 'stopped') {
            this.ride = { seconds: 0, power: [], cadence: [], heartRate: [], intervals: [], current: this.newInterval(this.live.intervalIndex) };
        }
        if(status === 'started') this.show('riding');
    }
    newInterval(index) {
        return { index, seconds: 0, target: 0, power: [], cadence: [], heartRate: [] };
    }
    onInterval(index) {
        if(this.ride && this.status !== 'stopped') {
            this.closeInterval();
            this.ride.current = this.newInterval(index);
        }
        this.live.intervalIndex = index;
    }
    closeInterval() {
        const c = this.ride?.current;
        if(c && c.seconds >= 30) this.ride.intervals.push(c);
    }
    sample() {
        if(this.status !== 'started' || !this.ride) return;
        const { power, cadence, heartRate, target } = this.live;
        const r = this.ride;
        r.seconds += 1;
        if(power > 0) r.power.push(power);
        if(cadence > 0) r.cadence.push(cadence);
        if(heartRate > 0) r.heartRate.push(heartRate);
        const c = r.current;
        c.seconds += 1;
        c.target = Math.max(c.target, target || 0);
        if(power > 0) c.power.push(power);
        if(cadence > 0) c.cadence.push(cadence);
        if(heartRate > 0) c.heartRate.push(heartRate);
    }
    onStopped() {
        if(!this.ride) return;
        this.closeInterval();
        this.ride.distance = this.live.distance;
        this.ride.kcal = this.live.kcal;
        this.ride.name = this.workout?.meta?.name ?? 'Ride';
        this.ride.date = new Date();
        // the plan marks a ride done on Stop: read it after that has happened
        setTimeout(() => this.show('done'), 0);
    }
    show(view) {
        this.view = view;
        this.hidden = view === 'riding';
        this.render();
    }
    onClick(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if(!action) return;
        if(action === 'start') { xf.dispatch('ui:watchStart'); xf.dispatch('ui:workoutStart'); }
        if(action === 'preview') this.show('riding');
        if(action === 'connect') xf.dispatch(`ui:${event.target.closest('[data-for]').dataset.for}:switch`);
        if(action === 'download' && this.activityId) models.activity.download(this.activityId);
        if(action === 'plan') { this.show('ready'); xf.dispatch('ui:page-set', 'plan'); }
        if(action === 'rides') { this.show('ready'); xf.dispatch('ui:page-set', 'workouts'); }
        if(action === 'new') this.show('ready');
    }

    render() {
        if(this.view === 'riding') { this.innerHTML = ''; return; }
        this.innerHTML = this.view === 'done' ? this.doneHtml() : this.readyHtml();
    }

    readyHtml() {
        const w = this.workout;
        const name = w?.meta?.name ?? 'Free ride';
        const duration = w?.meta?.duration ?? w?.intervals?.reduce((s, i) => s + i.duration, 0) ?? 0;
        const history = loadHistory();
        const ftpNote = history.length
            ? `${history[0].source === 'ramp' ? 'ramp test' : history[0].source === 'twenty' ? '20-minute test' : history[0].source === 'setup' ? 'set at setup' : 'set by hand'}, ${new Date(history[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
            : 'not tested yet';
        const devices = DEVICES.map((d) => {
            const st = this.devices[d.for];
            const on = st.status === 'on';
            const label = on ? 'Disconnect' : st.status === 'loading' ? 'Connecting…' : 'Connect';
            return `<div class="nf-device${on ? ' on' : ''}" data-for="${d.for}">
                <span class="nf-device-dot" aria-hidden="true"></span>
                <div class="nf-device-text"><p class="nf-device-name">${esc(d.name)}</p><p class="nf-muted">${on ? `${esc(st.name || 'Connected')} · connected` : esc(d.note)}</p></div>
                <button type="button" class="nf-btn${on ? '' : ' nf-light'}" data-action="connect"${st.status === 'loading' ? ' disabled' : ''}>${label}</button>
            </div>`;
        }).join('');
        const trainerOn = this.devices['ble:controllable'].status === 'on';
        return `<div class="nf-flow">
            <section class="nf-flow-main" aria-label="Workout">
                <p class="nf-accent">${esc(w?.meta?.category ?? 'Workout')}</p>
                <h2 class="nf-flow-title">${esc(name)}</h2>
                <p class="nf-muted">${duration ? esc(mmss(duration)) : ''}${this.ftp ? ` · FTP ${this.ftp} W` : ''}</p>
                ${w ? `<svg class="nf-flow-profile" viewBox="0 0 240 44" preserveAspectRatio="none" role="img" aria-label="Profile of ${esc(name)}">${profilePaths(w, this.ftp)}</svg>` : ''}
                <div class="nf-row">
                    <button type="button" class="nf-btn nf-primary nf-ride" data-action="start"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 4L18 11L6 18Z" fill="currentColor"></path></svg>Start</button>
                    <button type="button" class="nf-btn" data-action="preview">Ride screen</button>
                </div>
                <p class="nf-muted nf-small">${trainerOn ? 'In ERG, ride in the small chainring with a middle cog: the trainer has room to adjust.' : 'Connect the smart trainer first: without it nofun can only record time.'}</p>
            </section>
            <section class="nf-flow-side" aria-label="Devices">
                <h2 class="nf-h2">Devices</h2>
                ${devices}
                <div class="nf-box nf-checklist">
                    <p class="nf-device-name">Before you start</p>
                    <ul>
                        <li>FTP ${this.ftp ? `${this.ftp} W` : '–'}, ${esc(ftpNote)}</li>
                        <li>Weight ${this.weight ? `${this.weight} kg` : '–'}</li>
                        <li>Calibrate the trainer with the Tacx app after moving the bike.</li>
                    </ul>
                </div>
            </section>
        </div>`;
    }

    doneHtml() {
        const r = this.ride ?? { seconds: 0, power: [], heartRate: [], intervals: [] };
        const state = loadState();
        const inPlan = state && state !== NONE && Object.values(state.done).includes(new Date().toISOString().slice(0, 10)) && /^W\d/.test(r.name ?? '');
        const stat = (label, value) => `<div class="nf-stat"><p class="nf-muted">${esc(label)}</p><p class="nf-stat-value">${esc(value)}</p></div>`;
        const work = r.intervals.filter((i) => this.ftp && i.target >= 0.8 * this.ftp);
        const rows = work.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(mmss(i.seconds))}</td><td>${Math.round(i.target)} W</td><td><strong>${mean(i.power) || '–'}</strong> W</td><td>${mean(i.cadence) || '–'} rpm</td><td>${mean(i.heartRate) || '–'} bpm</td></tr>`).join('');
        return `<div class="nf-flow nf-flow-done">
            <section class="nf-flow-head" aria-label="Done">
                <div>
                    <p class="nf-done-line">${inPlan ? 'Done · marked in your plan' : 'Done'}</p>
                    <h2 class="nf-flow-title">${esc(r.name ?? 'Ride')}</h2>
                </div>
                <div class="nf-row">
                    ${state && state !== NONE ? '<button type="button" class="nf-btn nf-primary" data-action="plan">Back to the plan</button>' : ''}
                    <button type="button" class="nf-btn" data-action="new">New ride</button>
                </div>
            </section>
            <div class="nf-stats">
                ${stat('Time', mmss(r.seconds))}
                ${stat('Average power', mean(r.power) ? `${mean(r.power)} W` : '–')}
                ${stat('Average heart rate', mean(r.heartRate) ? `${mean(r.heartRate)} bpm` : '–')}
                ${stat('Energy', r.kcal ? `${Math.round(r.kcal)} kcal` : '–')}
                ${stat('Distance', r.distance ? `${(r.distance / 1000).toFixed(1)} km` : '–')}
            </div>
            ${work.length ? `<section class="nf-box" aria-label="Work intervals"><h3 class="nf-h2">Work intervals: target and what you held</h3>
                <div class="nf-scroll"><table class="nf-table"><thead><tr><th>#</th><th>Time</th><th>Target</th><th>Average</th><th>Cadence</th><th>Heart rate</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : ''}
            <section class="nf-box nf-file" aria-label="Ride file">
                <div><p class="nf-device-name">The ride is saved in this browser</p><p class="nf-muted">Download the FIT to keep it or to import it in another app.</p></div>
                <div class="nf-row">
                    <button type="button" class="nf-btn nf-light" data-action="download"${this.activityId ? '' : ' disabled'}>Download FIT</button>
                    <button type="button" class="nf-btn" data-action="rides">All rides</button>
                </div>
            </section>
        </div>`;
    }
}

customElements.define('nofun-ride-flow', NofunRideFlow);



// Stop, confirmed inside the app (Auuki used a browser dialog)
class NofunStopDialog extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.innerHTML = `
            <dialog class="nf-dialog nf-stop-dialog" aria-labelledby="nf-stop-title">
                <h2 id="nf-stop-title" class="nf-h1">End the ride?</h2>
                <p class="nf-lead">The ride is saved and you see its summary.</p>
                <div class="nf-row">
                    <button type="button" class="nf-btn nf-primary" data-action="end">End ride</button>
                    <button type="button" class="nf-btn" data-action="keep" autofocus>Keep riding</button>
                </div>
            </dialog>`;
        this.dialog = this.querySelector('dialog');
        xf.sub('nofun:stop-request', () => { if(!this.dialog.open) this.dialog.showModal(); }, signal);
        this.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if(!action) return;
            this.dialog.close();
            if(action === 'end') xf.dispatch('ui:watchStopConfirmed');
        }, signal);
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
}

customElements.define('nofun-stop-dialog', NofunStopDialog);
export { NofunRideFlow, NofunStopDialog, profilePaths };
