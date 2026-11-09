//
// Ramp test, automatic
//
// ERG from 100 W, +20 W every minute (the classic ramp). The test ends by itself when
// the rider can't hold it any more: cadence under 50 rpm, or power under half the
// target, for 5 seconds. FTP = 75% of the best 1-minute average power. Then 5 minutes
// of cool-down; the result goes to the FTP history and the rider decides whether to
// use it.
//

import { xf } from './functions.js';

const RAMP = {
    name: 'Ramp test',
    warmup: 300, warmupPower: 100,
    start: 100, step: 20, stepSeconds: 60, max: 1000,
    cooldown: 300, cooldownPower: 90,
    endCadence: 50, endPowerShare: 0.5, endSeconds: 5, minSeconds: 120,
    ftpShare: 0.75,
};

function rampZwo(r = RAMP) {
    const steps = [];
    for(let power = r.start; power <= r.max; power += r.step) {
        steps.push(`<SteadyState Duration="${r.stepSeconds}" Power="${power}"/>`);
    }
    return `<workout_file>
    <author>nofun</author>
    <name>${r.name}</name>
    <description>ERG from ${r.start} W, +${r.step} W every minute until you can't hold it. Keep your usual cadence; the test ends by itself when the cadence drops under ${r.endCadence} rpm. FTP = 75% of your best minute.</description>
    <sportType>bike</sportType>
    <category>Test</category>
    <workout>
        <SteadyState Duration="${r.warmup}" Power="${r.warmupPower}"><textevent timeoffset="0" message="Warm-up. The ramp starts in 5 minutes."/></SteadyState>
        ${steps.join('\n        ')}
        <SteadyState Duration="${r.cooldown}" Power="${r.cooldownPower}"><textevent timeoffset="0" message="Cool-down"/></SteadyState>
    </workout>
</workout_file>`;
}

// warm-up, the whole ramp as one interval (so one lap jumps to the cool-down), cool-down
function buildRampWorkout(parse) {
    const workout = parse(rampZwo());
    const [warmup, ...rest] = workout.intervals;
    const cooldown = rest.pop();
    const ramp = { duration: rest.reduce((s, i) => s + i.duration, 0), steps: rest.flatMap((i) => i.steps) };
    return { ...workout, intervals: [warmup, ramp, cooldown] };
}

const isRampWorkout = (workout) => workout?.meta?.name === RAMP.name && workout?.meta?.author === 'nofun';

// best average over `window` consecutive 1 s samples
function bestAverage(samples, window = 60) {
    if(samples.length < window) return samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0;
    let sum = samples.slice(0, window).reduce((a, b) => a + b, 0);
    let best = sum;
    for(let i = window; i < samples.length; i++) {
        sum += samples[i] - samples[i - window];
        best = Math.max(best, sum);
    }
    return Math.round(best / window);
}

const rampFtp = (best1min, r = RAMP) => Math.round(best1min * r.ftpShare);

// one second of the ramp: returns the new counters and whether the test is over
function rampTick({ lowCadence = 0, lowPower = 0 }, { cadence, power, target }, r = RAMP) {
    const next = {
        lowCadence: cadence < r.endCadence ? lowCadence + 1 : 0,
        lowPower: target > 0 && power < target * r.endPowerShare ? lowPower + 1 : 0,
    };
    return { ...next, end: next.lowCadence >= r.endSeconds || next.lowPower >= r.endSeconds };
}

function RampTest() {
    const s = {
        workout: null, intervalIndex: 0, watchStatus: 'stopped',
        power: 0, cadence: 0, target: 0,
        samples: [], counters: {}, peak: 0, done: false,
    };
    const inRamp = () => isRampWorkout(s.workout) && s.intervalIndex === 1;

    function finish(reason) {
        if(s.done || s.samples.length < RAMP.minSeconds) return;
        s.done = true;
        const best1min = bestAverage(s.samples);
        xf.dispatch('nofun:ramp-result', {
            ftp: rampFtp(best1min), best1min, peak: s.peak, seconds: s.samples.length, reason,
        });
        if(reason === 'auto') xf.dispatch('ui:watchLap');
    }

    xf.sub('db:workout', (workout) => {
        s.workout = workout;
        s.samples = [];
        s.counters = {};
        s.peak = 0;
        s.done = false;
    });
    xf.sub('db:intervalIndex', (index) => {
        const leaving = isRampWorkout(s.workout) && s.intervalIndex === 1 && index !== 1;
        s.intervalIndex = index;
        if(leaving) finish('lap');
    });
    xf.sub('db:watchStatus', (status) => { s.watchStatus = status; });
    xf.sub('db:power',       (power)  => { s.power = power; });
    xf.sub('db:cadence',     (cadence) => { s.cadence = cadence; });
    xf.sub('db:powerTarget', (target) => { s.target = target; });
    xf.sub('watch:stopped',  () => { if(isRampWorkout(s.workout)) finish('stopped'); });

    setInterval(() => {
        if(s.done || s.watchStatus !== 'started' || !inRamp()) return;
        s.samples.push(s.power);
        s.peak = Math.max(s.peak, s.target);
        const tick = rampTick(s.counters, { cadence: s.cadence, power: s.power, target: s.target });
        s.counters = tick;
        if(tick.end && s.samples.length >= RAMP.minSeconds) finish('auto');
    }, 1000);

    return Object.freeze({ state: s });
}

export { RAMP, rampZwo, buildRampWorkout, isRampWorkout, bestAverage, rampFtp, rampTick, RampTest };
