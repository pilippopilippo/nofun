//
// Ride: the numbers that matter while riding, big
//
// Power (3 s) next to the target, the zone band (where the ERG target and the power sit
// inside the zone), interval time left with progress, cadence with its target, heart rate,
// interval average, what comes next. The DOM is built once; updates only touch text and
// a few styles, several times a second.
//

import { xf } from '../functions.js';

const MODE_ERG = 'erg';
const MODE_SLOPE = 'slope';
const MODE_RESISTANCE = 'resistance';

const mmss = (seconds) => {
    if(!Number.isFinite(seconds) || seconds < 0) return '–:––';
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};
const watts = (share, ftp) => (share > 0 && share < 9 ? Math.round(share * ftp) : Math.round(share));
const num = (value) => (Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '–');

// the next interval (warm-ups and cool-downs are made of many short steps: the next step
// would change every few seconds): { seconds, text }
function nextInterval(workout, intervalIndex, ftp) {
    const next = workout?.intervals?.[intervalIndex + 1];
    if(!next) return null;
    const steps = next.steps ?? [];
    const first = steps[0];
    const last = steps[steps.length - 1];
    const time = mmss(next.duration);
    if(!first) return { seconds: next.duration, text: time };
    if(Number.isFinite(first.slope) && !(first.power > 0)) return { seconds: next.duration, text: `${time} at slope ${first.slope}%` };
    if(!(first.power > 0)) return { seconds: next.duration, text: `${time} free ride` };
    const from = watts(first.power, ftp);
    const to = watts(last.power, ftp);
    return { seconds: next.duration, text: from === to ? `${time} at ${from} W` : `${time} from ${from} to ${to} W` };
}

// position (0..1) of a value on a scale that shows the zone with some room on both sides
function scale(range, target) {
    const [lo, hi] = range ?? [target * 0.9, target * 1.1];
    const pad = Math.max((hi - lo) * 0.5, 10);
    const min = lo - pad;
    const max = hi + pad;
    return (value) => Math.min(1, Math.max(0, (value - min) / (max - min)));
}

const TEMPLATE = `
    <section class="nf-hero" aria-label="Riding">
        <div class="nf-hero-card nf-hero-power">
            <div class="nf-hero-row">
                <div>
                    <p class="nf-hero-label">Power, 3 s</p>
                    <p class="nf-hero-big"><span data-v="power">–</span><span class="nf-hero-unit"> W</span></p>
                </div>
                <div class="nf-hero-target">
                    <p class="nf-hero-label" data-v="target-label">Target</p>
                    <p class="nf-hero-target-value" data-v="target">–</p>
                    <p class="nf-hero-label" data-v="target-note"></p>
                </div>
            </div>
            <div class="nf-band" data-v="band" hidden>
                <div class="nf-band-track"><div class="nf-band-zone" data-v="zone"></div><div class="nf-band-target" data-v="mark"></div><div class="nf-band-power" data-v="dot"></div></div>
                <p class="nf-band-labels"><span data-v="lo"></span><span data-v="band-note"></span><span data-v="hi"></span></p>
            </div>
        </div>
        <div class="nf-hero-card">
            <p class="nf-hero-label">Interval left</p>
            <p class="nf-hero-mid" data-v="left">–:––</p>
            <div class="nf-progress"><div data-v="progress"></div></div>
            <p class="nf-hero-label">Interval average <strong data-v="lap">–</strong> W</p>
        </div>
        <div class="nf-hero-card nf-hero-pair">
            <div>
                <p class="nf-hero-label">Cadence</p>
                <p class="nf-hero-mid"><span data-v="cadence">–</span><span class="nf-hero-unit"> rpm</span></p>
                <p class="nf-hero-label" data-v="cadence-target"></p>
            </div>
            <div>
                <p class="nf-hero-label">Heart rate</p>
                <p class="nf-hero-mid"><span data-v="hr">–</span><span class="nf-hero-unit"> bpm</span></p>
            </div>
        </div>
    </section>
    <div class="nf-hero-foot">
        <p class="nf-more">Elapsed <strong data-v="elapsed">0:00</strong><span>Speed <strong data-v="speed">–</strong> km/h</span><span>Distance <strong data-v="distance">–</strong> km</span><span>Energy <strong data-v="kcal">–</strong> kcal</span></p>
        <p class="nf-upnext" data-v="next-line" hidden>Up next <strong data-v="next"></strong></p>
    </div>`;

class NofunRideHero extends HTMLElement {
    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        this.innerHTML = TEMPLATE;
        this.v = Object.fromEntries([...this.querySelectorAll('[data-v]')].map((e) => [e.dataset.v, e]));
        this.s = {
            power: 0, target: 0, mode: MODE_ERG, slope: 0, resistance: 0, range: null, ftp: 0,
            workout: null, intervalIndex: 0, lapTime: NaN,
        };
        const on = (event, key, after) => xf.sub(event, (value) => { this.s[key] = value; after.call(this); }, signal);
        on('db:power3s', 'power', this.drawPower);
        on('db:powerTarget', 'target', this.drawTarget);
        on('db:mode', 'mode', this.drawTarget);
        on('db:slopeTarget', 'slope', this.drawTarget);
        on('db:resistanceTarget', 'resistance', this.drawTarget);
        on('nofun:power-range', 'range', this.drawTarget);
        on('db:ftp', 'ftp', this.drawNext);
        on('db:workout', 'workout', this.drawNext);
        on('db:intervalIndex', 'intervalIndex', this.drawNext);
        on('db:lapTime', 'lapTime', this.drawLap);
        xf.sub('db:powerLap', (v) => { this.v.lap.textContent = num(v); }, signal);
        xf.sub('db:cadence', (v) => { this.v.cadence.textContent = num(v); }, signal);
        xf.sub('db:cadenceTarget', (v) => { this.v['cadence-target'].textContent = v > 0 ? `Target ${Math.round(v)}` : ''; }, signal);
        xf.sub('db:heartRate', (v) => { this.v.hr.textContent = num(v); }, signal);
        xf.sub('db:elapsed', (v) => { this.v.elapsed.textContent = mmss(v || 0); }, signal);
        xf.sub('db:speed', (v) => { this.v.speed.textContent = v > 0 ? (v * 3.6).toFixed(1) : '–'; }, signal);   // m/s
        xf.sub('db:distance', (v) => { this.v.distance.textContent = v > 0 ? (v / 1000).toFixed(1) : '–'; }, signal); // m
        xf.sub('db:kcal', (v) => { this.v.kcal.textContent = num(v); }, signal);
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    drawPower() {
        this.v.power.textContent = num(this.s.power);
        this.drawBand();
    }
    drawTarget() {
        const { mode, target, slope, resistance, range } = this.s;
        if(mode === MODE_SLOPE) {
            this.v['target-label'].textContent = 'Slope';
            this.v.target.textContent = `${Number(slope ?? 0).toFixed(1)}%`;
            this.v['target-note'].textContent = 'You set the power with gears and legs';
        } else if(mode === MODE_RESISTANCE) {
            this.v['target-label'].textContent = 'Resistance';
            this.v.target.textContent = num(resistance);
            this.v['target-note'].textContent = 'You set the power with gears and legs';
        } else {
            this.v['target-label'].textContent = 'Target';
            this.v.target.textContent = target > 0 ? `${Math.round(target)} W` : '–';
            this.v['target-note'].textContent = range ? 'ERG · inside the zone' : (target > 0 ? 'ERG' : '');
        }
        this.drawBand();
    }
    drawBand() {
        const { mode, target, power, range } = this.s;
        const show = mode === MODE_ERG && target > 0;
        this.v.band.hidden = !show;
        if(!show) return;
        const at = scale(range, target);
        const [lo, hi] = range ?? [target, target];
        this.v.zone.style.left = `${at(lo) * 100}%`;
        this.v.zone.style.width = `${Math.max(0.5, (at(hi) - at(lo)) * 100)}%`;
        this.v.mark.style.left = `${at(target) * 100}%`;
        this.v.dot.style.left = `${at(power) * 100}%`;
        this.v.dot.hidden = !(power > 0);
        this.v.lo.textContent = range ? `${lo} W` : '';
        this.v.hi.textContent = range ? `${hi} W` : '';
        this.v['band-note'].textContent = range ? 'The target moves inside the zone with your cadence' : '';
    }
    drawLap() {
        const { lapTime, workout, intervalIndex } = this.s;
        this.v.left.textContent = mmss(lapTime);
        const duration = workout?.intervals?.[intervalIndex]?.duration;
        const done = duration > 0 && Number.isFinite(lapTime) ? 1 - lapTime / duration : 0;
        this.v.progress.style.width = `${Math.min(100, Math.max(0, done * 100))}%`;
    }
    drawNext() {
        const next = nextInterval(this.s.workout, this.s.intervalIndex, this.s.ftp);
        this.v['next-line'].hidden = !next;
        if(next) this.v.next.textContent = next.text;
        this.drawLap();
    }
}

customElements.define('nofun-ride-hero', NofunRideHero);

export { NofunRideHero, nextInterval, mmss, scale };
