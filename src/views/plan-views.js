//
// Plan page: first setup (FTP, plan, start date), then today's ride and the week.
// The Ride button loads the ride on the trainer and opens Ride; a ride is marked done
// when the workout ends or is stopped after 80% of it.
//

import { xf } from '../functions.js';
import { models } from '../models/models.js';
import { TEXT, ZONES, powerTarget } from '../vendor/timecrunchy/timecrunchy.js';
import * as P from '../plan.js';
import { loadProfile, saveProfile, loadHistory, addFtpResult } from '../profile.js';
import { startTest, restoreBackup } from './profile-views.js';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const longDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (d) => `${DAYS[P.dayIndex(d)]} ${d.getDate()}`;
const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const round1 = (x) => (Math.round(x * 2) / 2).toString().replace(/\.0$/, '');

const ZONE_COLOR = { EM: 'var(--nf-em)', T: 'var(--nf-t)', SS: 'var(--nf-ss)', CR: 'var(--nf-cr)', PI: 'var(--nf-pi)' };

function zonesOf(title) {
    const z = new Set();
    if(/\bPI\b|SEPI|PFPI|PI efforts|TL/.test(title)) z.add('PI');
    if(/\bCR\b|OU|TL/.test(title)) z.add('CR');
    if(/\bSS\b|OU|TL/.test(title)) z.add('SS');
    if(/\bEM\b/.test(title)) z.add('EM');
    return ['PI', 'CR', 'SS', 'EM'].filter((id) => z.has(id));
}
const targets = (title, ftp) => zonesOf(title).map((id) => `${id} ${powerTarget(id, ftp)}`).join(' · ');

// workout profile from the .zwo: [{seconds, from, to}] shares of FTP
function profile(zwo) {
    const segments = [];
    const attr = (tag, name) => Number((tag.match(new RegExp(`\\b${name}="([\\d.]+)"`)) ?? [])[1] ?? 0);
    for(const [tag, name] of zwo.matchAll(/<(SteadyState|Warmup|Cooldown|IntervalsT|FreeRide)\b[^>]*>/g)) {
        if(name === 'SteadyState') segments.push({ seconds: attr(tag, 'Duration'), from: attr(tag, 'Power'), to: attr(tag, 'Power') });
        else if(name === 'IntervalsT') {
            for(let i = 0; i < attr(tag, 'Repeat'); i++) {
                segments.push({ seconds: attr(tag, 'OnDuration'), from: attr(tag, 'OnPower'), to: attr(tag, 'OnPower') });
                segments.push({ seconds: attr(tag, 'OffDuration'), from: attr(tag, 'OffPower'), to: attr(tag, 'OffPower') });
            }
        } else if(name === 'FreeRide') segments.push({ seconds: attr(tag, 'Duration'), from: 0.5, to: 0.5 });
        else segments.push({ seconds: attr(tag, 'Duration'), from: attr(tag, 'PowerLow'), to: attr(tag, 'PowerHigh') });
    }
    return segments;
}
function colorOf(power) {
    if(power >= 1.12) return ZONE_COLOR.PI;
    if(power >= 1.05) return ZONE_COLOR.CR;
    if(power >= 0.95) return ZONE_COLOR.SS;
    if(power <= 0.56) return 'var(--nf-rec)';
    return ZONE_COLOR.EM;
}
function profileSvg(zwo, label, opacity = 1) {
    const segments = profile(zwo);
    const total = segments.reduce((s, x) => s + x.seconds, 0) || 1;
    const w = 240, h = 44, max = 1.4;
    const y = (p) => (h - (Math.min(p, max) / max) * h).toFixed(1);
    let t = 0;
    const paths = segments.map((s) => {
        const x0 = ((t / total) * w).toFixed(1);
        t += s.seconds;
        const x1 = ((t / total) * w).toFixed(1);
        return `<path d="M${x0} ${h}V${y(s.from)}L${x1} ${y(s.to)}V${h}Z" fill="${colorOf(Math.max(s.from, s.to))}" fill-opacity="${opacity}"></path>`;
    }).join('');
    return `<svg class="nf-profile" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">${paths}</svg>`;
}

// the ride that is on the trainer, to mark it done
let active = null;
let elapsed = 0;

function rideNow(ride, { go = true } = {}) {
    const workout = models.workout.parse(ride.zwo);
    xf.dispatch('workout', workout);
    active = { key: ride.key, name: workout?.meta?.name, seconds: ride.minutes * 60 };
    if(go) xf.dispatch('ui:page-set', 'home');
}

// when the app opens, today's ride becomes the current workout: the play button starts it
let preselected = false;
function preselectToday() {
    if(preselected) return;
    preselected = true;
    const state = P.loadState();
    if(!state || state === P.NONE) return;
    const today = P.todayView(state);
    if(today.status === 'ride') rideNow(today.ride, { go: false });
}
xf.sub('workout:restore', () => setTimeout(preselectToday, 0));
setTimeout(preselectToday, 2000);
function finish() {
    if(!active) return;
    const state = P.loadState();
    if(state && state !== P.NONE) P.markDone(state, active.key);
    active = null;
    document.querySelectorAll('nofun-plan').forEach((el) => el.render());
}
xf.sub('watch:elapsed', (time) => { elapsed = time; });
xf.sub('db:workout', (workout) => { if(active && workout?.meta?.name !== active.name) active = null; });
xf.sub('workout:done', finish);
xf.sub('watch:stopped', () => { if(active && elapsed >= 0.8 * active.seconds) finish(); });

class NofunPlan extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        this.ftp = undefined;
        this.setup = null;   // {step, ftp, planId, start} while setting up
        this.shownWeek = null;
        xf.sub('db:ftp', (ftp) => { this.ftp = ftp; this.render(); }, { signal: this.abortController.signal });
        xf.sub('db:weight', (weight) => { this.weight = weight; }, { signal: this.abortController.signal });
        this.addEventListener('click', this.onClick.bind(this), { signal: this.abortController.signal });
        this.addEventListener('change', this.onChange.bind(this), { signal: this.abortController.signal });
        this.render();
        // open on Plan, unless the rider chose no plan; again once Auuki has restored the
        // last page it showed, which would otherwise win
        const openPlan = () => { if(P.loadState() !== P.NONE) xf.dispatch('ui:page-set', 'plan'); };
        setTimeout(openPlan, 0);
        xf.sub('workout:restore', () => setTimeout(openPlan, 0), { signal: this.abortController.signal });
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }

    onChange(event) {
        const t = event.target;
        if(!this.setup) return;
        if(t.name === 'nf-plan') this.setup.planId = t.value;
        if(t.name === 'nf-ftp') this.setup.ftp = parseInt(t.value, 10);
        if(t.name === 'nf-name') this.setup.name = t.value;
        if(t.name === 'nf-weight') this.setup.weight = parseFloat(t.value);
        if(t.name === 'nf-import' && t.files[0]) import('../backup.js').then((b) => b.importBackup(t.files[0])).catch((e) => alert(e.message));
        if(t.name === 'nf-start') this.setup.start = t.value;
        if(t.name === 'nf-plan') this.render();
    }
    onClick(event) {
        const el = event.target.closest('[data-action]');
        if(!el) return;
        const action = el.dataset.action;
        const state = P.loadState();
        if(action === 'setup') {
            const current = state && state !== P.NONE ? state.planId : 'new-granfondo';
            this.setup = { step: 1, ftp: this.ftp, weight: this.weight, name: loadProfile().name, planId: current, start: P.isoDate(P.mondayOf(new Date())) };
        }
        if(action === 'next') {
            if(this.setup.step === 1) {
                const value = (name) => this.querySelector(`[name="${name}"]`)?.value ?? '';
                const ftp = value('nf-ftp') === '' ? null : parseInt(value('nf-ftp'), 10);
                const weight = parseFloat(value('nf-weight'));
                const error = this.querySelector('.nf-error');
                if(!(weight >= 30 && weight <= 200)) { error.textContent = 'Enter your weight in kg, between 30 and 200.'; return; }
                if(ftp !== null && !(ftp >= 50 && ftp <= 600)) { error.textContent = 'Enter your FTP in watts, between 50 and 600, or leave it empty.'; return; }
                Object.assign(this.setup, { name: value('nf-name'), weight, ftp, ftpKnown: ftp !== null });
            }
            this.setup.step += 1;
        }
        if(action === 'back') this.setup.step = Math.max(1, this.setup.step - 1);
        if(action === 'cancel') this.setup = null;
        if(action === 'start') {
            if(this.setup.name !== undefined) saveProfile({ name: this.setup.name });
            if(this.setup.weight && this.setup.weight !== this.weight) xf.dispatch('ui:weight-set', this.setup.weight);
            if(this.setup.ftpKnown) {
                if(this.setup.ftp !== this.ftp) xf.dispatch('ui:ftp-set', this.setup.ftp);
                if(!loadHistory().length) addFtpResult({ ftp: this.setup.ftp, source: 'setup' });
            }
            P.startPlan(this.setup.planId, this.setup.start);
            this.setup = null;
            this.shownWeek = null;
        }
        if(action === 'no-plan') {
            P.saveState(P.NONE);
            this.setup = null;
            xf.dispatch('ui:page-set', 'home');
        }
        if(action === 'week') this.shownWeek = Number(el.dataset.week);
        if(action === 'ramp') { startTest('ramp'); return; }
        if(action === 'twenty') { startTest('twenty'); return; }
        if(action === 'restore') { restoreBackup(this.querySelector('[name="nf-import"]')); return; }
        if(action === 'ride') {
            const view = P.weekView(state, Number(el.dataset.week));
            const ride = view.days.flatMap((d) => d.rides).find((r) => r.key === el.dataset.key);
            if(ride) rideNow(ride);
            return;
        }
        this.render();
    }

    render() {
        const typing = this.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'radio';
        if(typing) return;
        const state = P.loadState();
        if(this.setup || !state || state === P.NONE) {
            if(!this.setup) this.setup = { step: 1, ftp: loadHistory().length ? this.ftp : undefined, weight: this.weight, name: loadProfile().name, planId: 'new-granfondo', start: P.isoDate(P.mondayOf(new Date())), first: !state };
            this.innerHTML = this.setupHtml(state);
            return;
        }
        this.innerHTML = this.planHtml(state);
    }

    // ---------------------------------------------------------------- setup
    setupHtml(state) {
        const s = this.setup;
        const steps = ['You', 'Plan', 'Start date'].map((name, i) => {
            const n = i + 1;
            const done = n < s.step;
            const label = n === 1 && done && s.ftpKnown ? `1 · FTP ${s.ftp} W` : `${n} · ${name}`;
            return `<li class="nf-step${n === s.step ? ' current' : ''}${done ? ' done' : ''}"${n === s.step ? ' aria-current="step"' : ''}>${esc(label)}</li>`;
        }).join('');
        const cancel = state && state !== P.NONE
            ? '<button type="button" class="nf-btn" data-action="cancel">Cancel</button>'
            : '<button type="button" class="nf-btn nf-link" data-action="no-plan">No plan, just ride</button>';
        let body = '';
        if(s.step === 1) {
            body = `
                <h1 class="nf-h1">About you</h1>
                <p class="nf-lead">Weight sets the speed and the climbs in slope mode; every target is a share of your FTP.</p>
                <div class="nf-form">
                    <label class="nf-field"><span>Name</span><input name="nf-name" type="text" autocomplete="nickname" maxlength="40" value="${esc(s.name ?? '')}"></label>
                    <label class="nf-field"><span>Weight, kg</span><input name="nf-weight" type="number" inputmode="decimal" min="30" max="200" step="0.1" value="${esc(s.weight ?? '')}" required></label>
                    <label class="nf-field"><span>FTP, W</span><input name="nf-ftp" type="number" inputmode="numeric" min="50" max="600" value="${esc(s.ftp ?? '')}"></label>
                </div>
                <p class="nf-muted">Don't know your FTP? Leave it empty: the plan starts with an automatic ramp test.</p>
                <p class="nf-error" role="alert"></p>
                ${state ? '' : '<p class="nf-muted">Used nofun before? <button type="button" class="nf-btn nf-link" data-action="restore">Restore a backup</button><input name="nf-import" type="file" accept=".json,application/json" hidden></p>'}
                <div class="nf-actions">${cancel}<button type="button" class="nf-btn nf-primary" data-action="next">Next: plan</button></div>`;
        }
        if(s.step === 2) {
            const groups = [...new Set(P.PLANS.map((p) => p.group))];
            body = `
                <h1 class="nf-h1">What are you training for?</h1>
                <p class="nf-lead">Pick a plan. Rides and targets follow your FTP. You can change it later from Plan.</p>
                <fieldset class="nf-plans"><legend class="nf-sr">Training plan</legend>
                ${groups.map((g) => `
                    <section class="nf-plan-group"><h2 class="nf-h2">${esc(TEXT.groups[g])}</h2>
                    <div class="nf-cards">${P.PLANS.filter((p) => p.group === g).map((p) => {
                        const st = P.planStats(p);
                        const text = g === 'commute'
                            ? `${st.weeks} weeks · built on your commute, about ${Math.max(1, Math.round(st.ridesPerWeek))} ride a week on the trainer`
                            : `${st.weeks} weeks · ${Math.round(st.ridesPerWeek)} rides a week · about ${round1(st.hoursPerWeek)} h${st.outdoorPerWeek >= 0.5 ? ` · ${Math.round(st.outdoorPerWeek)} outdoors` : ''}`;
                        return `<label class="nf-card${p.id === s.planId ? ' selected' : ''}"><input type="radio" name="nf-plan" value="${p.id}"${p.id === s.planId ? ' checked' : ''}>
                            <span><span class="nf-card-title">${esc(p.name)}</span><span class="nf-muted">${esc(text)}</span></span></label>`;
                    }).join('')}</div></section>`).join('')}
                </fieldset>
                <div class="nf-actions"><button type="button" class="nf-btn" data-action="back">Back</button><button type="button" class="nf-btn nf-primary" data-action="next">Next: start date</button></div>`;
        }
        if(s.step === 3) {
            const plan = P.planById(s.planId);
            const thisMonday = P.mondayOf(new Date());
            const nextMonday = P.addDays(thisMonday, 7);
            const option = (date, label) => {
                const iso = P.isoDate(date);
                return `<label class="nf-card${s.start === iso ? ' selected' : ''}"><input type="radio" name="nf-start" value="${iso}"${s.start === iso ? ' checked' : ''}><span><span class="nf-card-title">${esc(label)}</span><span class="nf-muted">${esc(longDate(date))}</span></span></label>`;
            };
            body = `
                <h1 class="nf-h1">When does week 1 start?</h1>
                <p class="nf-lead">${esc(plan.name)} · ${P.planWeeks(plan).length} weeks. A plan week runs Monday to Sunday.</p>
                <div class="nf-cards">${option(thisMonday, 'This week')}${option(nextMonday, 'Next week')}</div>
                <div class="nf-actions"><button type="button" class="nf-btn" data-action="back">Back</button><button type="button" class="nf-btn nf-primary" data-action="start">Start the plan</button></div>`;
        }
        return `<div class="nf-page nf-setup"><ol class="nf-steps" aria-label="Setup steps">${steps}</ol>${body}</div>`;
    }

    // ---------------------------------------------------------------- plan
    planHtml(state) {
        const ftp = this.ftp;
        const today = P.todayView(state);
        const plan = P.planById(state.planId);
        const total = P.planWeeks(plan).length;
        const current = P.currentWeekNumber(state);
        const shown = this.shownWeek ?? Math.min(Math.max(current, 1), total);
        const view = P.weekView(state, shown);
        const summary = P.weekSummary(view);
        const started = P.fromIso(state.start);

        const header = `
            <div class="nf-head">
                <div>${loadProfile().name ? `<p class="nf-muted">Hi ${esc(loadProfile().name)}</p>` : ''}<h1 class="nf-h1">${esc(plan.name)}</h1>
                <p class="nf-muted">${current >= 1 && current <= total ? `Week ${current} of ${total}` : `${total} weeks`} · ${current >= 1 ? 'started' : 'starts'} ${esc(longDate(started))}${ftp ? ` · FTP ${ftp} W` : ''}</p></div>
                <button type="button" class="nf-btn" data-action="setup">Change plan</button>
            </div>`;

        const rideButton = (ride, week, label = 'Ride', primary = false) =>
            `<button type="button" class="nf-btn${primary ? ' nf-primary nf-ride' : ''}" data-action="ride" data-week="${week}" data-key="${esc(ride.key)}">${primary ? '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 4L18 11L6 18Z" fill="currentColor"></path></svg>' : ''}${esc(label)}</button>`;

        let hero = '';
        if(today.status === 'ride') {
            const r = today.ride;
            hero = `
                <section class="nf-today" aria-label="Today">
                    <div class="nf-today-main">
                        <p class="nf-accent">Today · ${esc(longDate(new Date()))}</p>
                        <h2 class="nf-today-title">${esc(r.title)}</h2>
                        <p class="nf-muted">${esc(duration(r.minutes))}${ftp ? ` · ${esc(targets(r.title, ftp))}` : ''}</p>
                        ${profileSvg(r.zwo, `Profile of ${r.title}`)}
                    </div>
                    <div class="nf-today-go">${rideButton(r, current, 'Ride', true)}<p class="nf-muted nf-small">Loads the workout on the trainer</p></div>
                </section>`;
        } else {
            const messages = {
                'done': 'Done for today.',
                'rest': 'Rest day.',
                'outdoors': 'Today is planned outdoors.',
                'not-started': `The plan starts on ${longDate(today.startsOn ?? started)}.`,
                'finished': 'Plan finished. Pick the next one, or Maintenance between plans.',
            };
            const firstRide = today.status === 'not-started'
                ? P.weekView(state, 1).days.flatMap((d) => d.rides).find((r) => r.trainer)
                : null;
            const extra = firstRide
                ? `<p class="nf-muted">You can start before: ${esc(firstRide.title)}</p>${rideButton(firstRide, 1, 'Ride it now', true)}`
                : today.missed
                ? `<p class="nf-muted">Missed earlier this week: ${esc(today.missed.title)}</p>${rideButton(today.missed, current, 'Ride it now')}`
                : (today.next ? `<p class="nf-muted">Next: ${esc(DAYS[today.next.day])} · ${esc(today.next.title)}</p>` : '');
            hero = `<section class="nf-today nf-today-quiet" aria-label="Today"><div class="nf-today-main"><h2 class="nf-today-title">${esc(messages[today.status])}</h2>${extra}</div>
                ${today.status === 'finished' ? '<div class="nf-today-go"><button type="button" class="nf-btn nf-primary" data-action="setup">Choose a plan</button></div>' : ''}</section>`;
        }

        const weeks = [];
        for(const label of plan.labels) {
            const [from, to = from] = String(label).split('–').map(Number);
            const active = shown >= from && shown <= to;
            const past = to < current;
            weeks.push(`<button type="button" class="nf-week${active ? ' active' : ''}${past ? ' past' : ''}" data-action="week" data-week="${active ? shown : from}"${active ? ' aria-current="true"' : ''}>W${esc(label)}</button>`);
        }

        const days = view.days.map((d) => {
            if(!d.rides.length) return `<div class="nf-day nf-rest"><span class="nf-day-name">${esc(shortDate(d.date))}</span>Rest</div>`;
            return d.rides.map((r) => {
                const slot = r.slot ? ` <span class="nf-muted">${r.slot === 'am' ? 'morning' : 'evening'}</span>` : '';
                const name = `<span class="nf-day-name">${esc(shortDate(d.date))}${d.today ? '<br><span class="nf-accent">Today</span>' : ''}</span>`;
                if(!r.trainer) {
                    return `<article class="nf-day nf-outdoor">${name}<div class="nf-day-main"><p class="nf-day-title">${esc(r.text)}${slot}</p><p class="nf-muted">Outdoors</p></div></article>`;
                }
                let side = '';
                let note = ftp ? targets(r.title, ftp) : '';
                // every indoor ride can be ridden by hand, on any day: today, early, again, late
                const week = view.week.number;
                const thisWeek = week === current || (current < 1 && week === 1);
                if(r.status === 'done') side = `<span class="nf-done"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9.5L7 13.5L15 4.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>Done</span>${rideButton(r, week, 'Again')}`;
                else if(r.status === 'missed-open') { note = 'Missed. You can still ride it this week.'; side = rideButton(r, week); }
                else if(r.status === 'missed') { note = 'Missed.'; side = rideButton(r, week, 'Ride anyway'); }
                else if(r.status === 'today') side = '<span class="nf-muted">Above</span>';
                else if(r.outdoorSuggested) { note = `Better outdoors. Indoors: ${duration(r.minutes)}.`; side = rideButton(r, week, 'Ride indoors'); }
                else side = rideButton(r, week, thisWeek ? 'Ride early' : 'Ride now');
                const cls = r.status === 'today' ? ' nf-is-today' : (r.status.startsWith('missed') ? ' nf-missed' : (r.outdoorSuggested ? ' nf-outdoor' : ''));
                return `<article class="nf-day${cls}">${name}<div class="nf-day-main"><p class="nf-day-title">${esc(r.title)}${slot}</p><p class="nf-muted${r.status.startsWith('missed') ? ' nf-warn' : ''}">${esc(note)}</p></div>${profileSvg(r.zwo, `Profile of ${r.title}`, r.status === 'done' ? 0.5 : 1)}<span class="nf-day-side">${side}</span></article>`;
            }).join('');
        }).join('');

        const zones = ZONES.map((z) => `<tr><th scope="row"><span class="nf-swatch" style="background:${ZONE_COLOR[z.id]}"></span>${esc(z.id)}</th><td>${ftp ? esc(powerTarget(z.id, ftp)) : '–'}</td></tr>`).join('');

        const rampFirst = loadHistory().length ? '' : `
            <section class="nf-today nf-ramp-first" aria-label="Find your FTP">
                <div class="nf-today-main"><p class="nf-accent">First, find your FTP</p>
                <h2 class="nf-today-title">Ramp test, about 20 minutes</h2>
                <p class="nf-muted">Every target of the plan is a share of your FTP. The test ends by itself and saves the result. Prefer a longer effort? <button type="button" class="nf-btn nf-link" data-action="twenty">Do the 20-minute test</button></p></div>
                <div class="nf-today-go"><button type="button" class="nf-btn nf-primary nf-ride" data-action="ramp">Ramp test</button></div>
            </section>`;
        return `<div class="nf-page">
            ${header}
            ${rampFirst}
            ${hero}
            <div class="nf-columns">
                <section class="nf-week-col" aria-label="Week ${view.week.number}">
                    <nav class="nf-weeks" aria-label="Weeks">${weeks.join('')}</nav>
                    <h2 class="nf-h2 nf-week-title">Week ${view.week.number} · ${esc(longDate(view.days[0].date))} to ${esc(longDate(view.days[6].date))}</h2>
                    ${days}
                </section>
                <aside class="nf-aside">
                    <section class="nf-box" aria-label="This week"><h2 class="nf-h2">${view.week.number === current ? 'This week' : `Week ${view.week.number}`}</h2>
                        <p class="nf-big">${summary.done} of ${summary.rides} <span class="nf-muted">rides done</span></p>
                        <p class="nf-muted">${summary.missed ? `${summary.missed} missed · ` : ''}${esc(duration(summary.minutesDone))} of ${esc(duration(summary.minutes))}</p></section>
                    <section class="nf-box" aria-label="Zones"><h2 class="nf-h2">${ftp ? `Zones for FTP ${ftp} W` : 'Zones'}</h2><table class="nf-zones"><tbody>${zones}</tbody></table>
                        <p class="nf-muted nf-small">In ERG the target moves inside the zone with your cadence.</p></section>
                    <p class="nf-muted nf-small">Plans from <i>The Time-Crunched Cyclist</i> by Chris Carmichael, via <a href="https://pilippopilippo.github.io/timecrunchy/" target="_blank" rel="noopener">timecrunchy</a>.</p>
                </aside>
            </div>
        </div>`;
    }
}

// Ride: the range the ERG target moves in
class NofunPowerRange extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        xf.sub('nofun:power-range', (range) => {
            this.textContent = range ? `Zone ${range[0]}–${range[1]} W` : '';
            this.hidden = !range;
        }, { signal: this.abortController.signal });
        this.hidden = true;
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
}

customElements.define('nofun-plan', NofunPlan);
customElements.define('nofun-power-range', NofunPowerRange);

export { NofunPlan, NofunPowerRange, profile, zonesOf };
