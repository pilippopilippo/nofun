//
// FTP tests, automatic
//
// Ramp test: ERG from 100 W, +20 W every minute (the classic ramp). It ends by itself
// when the rider can't hold it any more: cadence under 50 rpm, or power under half the
// target, for 5 seconds. FTP = 75% of the best 1-minute average power.
//
// 20-minute test: warm-up with three 1-minute openers in ERG, then 20 minutes as hard
// as the rider can hold, in slope mode (1%) so the rider sets the pace with gears and
// legs. FTP = 95% of the 20-minute average power.
//
// Both end with a cool-down; the result goes to the FTP history and the rider decides
// whether to use it. While a test runs, nofun:test-status reports how it is going.
//

import { xf } from './functions.js';

const RAMP = {
    id: 'ramp', name: 'Ramp test',
    warmup: 300, warmupPower: 100,
    start: 100, step: 20, stepSeconds: 60, max: 1000,
    cooldown: 300, cooldownPower: 90,
    endCadence: 50, endPowerShare: 0.5, endSeconds: 5, minSeconds: 120,
    ftpShare: 0.75,
};

const TWENTY = {
    id: 'twenty', name: '20-minute test',
    seconds: 1200, slope: 1, minSeconds: 1080, ftpShare: 0.95,
};

const average = (samples) => (samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0);

// ---------------------------------------------------------------- ramp
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

// best average over `window` consecutive 1 s samples
function bestAverage(samples, window = 60) {
    if(samples.length < window) return Math.round(average(samples));
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

// ---------------------------------------------------------------- 20 minutes
function twentyZwo(t = TWENTY) {
    return `<workout_file>
    <author>nofun</author>
    <name>${t.name}</name>
    <description>Warm-up with three 1-minute openers, then 20 minutes as hard as you can hold, in slope mode: you set the pace with gears and legs. FTP = 95% of your 20-minute average.</description>
    <sportType>bike</sportType>
    <category>Test</category>
    <workout>
        <Warmup Duration="600" PowerLow="0.45" PowerHigh="0.7"><textevent timeoffset="0" message="Warm-up, easy and then steady."/></Warmup>
        <SteadyState Duration="60" Power="1"><textevent timeoffset="0" message="Opener: 1 minute at FTP."/></SteadyState>
        <SteadyState Duration="60" Power="0.5"/>
        <SteadyState Duration="60" Power="1"/>
        <SteadyState Duration="60" Power="0.5"/>
        <SteadyState Duration="60" Power="1"/>
        <SteadyState Duration="300" Power="0.55"><textevent timeoffset="0" message="Easy. The test starts in 5 minutes: pick a gear for a steady hard pace."/></SteadyState>
        <SteadyState Duration="${t.seconds}"><textevent timeoffset="0" message="20 minutes as hard as you can hold. Start a bit below what you think, keep it even, empty the tank in the last 2 minutes."/></SteadyState>
        <Cooldown Duration="600" PowerLow="0.6" PowerHigh="0.4"><textevent timeoffset="0" message="Cool-down"/></Cooldown>
    </workout>
</workout_file>`;
}

// the 20 minutes ride on a slope; returns the workout and the index of the test interval
function buildTwentyWorkout(parse, t = TWENTY) {
    const workout = parse(twentyZwo(t));
    const index = workout.intervals.findIndex((i) => i.duration === t.seconds);
    const intervals = workout.intervals.map((interval, i) => (i !== index ? interval : {
        ...interval,
        steps: interval.steps.map((step) => ({ ...step, power: 0, slope: t.slope })),
    }));
    return { ...workout, intervals, measured: index };
}

const twentyFtp = (avg, t = TWENTY) => Math.round(avg * t.ftpShare);

// ---------------------------------------------------------------- which test
function testOf(workout) {
    if(workout?.meta?.author !== 'nofun') return null;
    if(workout.meta.name === RAMP.name) return RAMP;
    if(workout.meta.name === TWENTY.name) return TWENTY;
    return null;
}
const isRampWorkout = (workout) => testOf(workout) === RAMP;
const measuredInterval = (workout) => (testOf(workout) === RAMP ? 1 : workout?.intervals?.findIndex((i) => i.duration === TWENTY.seconds));

function FtpTests() {
    const s = {
        workout: null, test: null, measured: -1, intervalIndex: 0, watchStatus: 'stopped',
        power: 0, cadence: 0, target: 0,
        samples: [], counters: {}, peak: 0, done: false,
    };
    const measuring = () => s.test && s.intervalIndex === s.measured;

    function result() {
        if(s.test === RAMP) {
            const best1min = bestAverage(s.samples);
            return { test: 'ramp', ftp: rampFtp(best1min), best1min, peak: s.peak };
        }
        const avg = Math.round(average(s.samples));
        return { test: 'twenty', ftp: twentyFtp(avg), avg20: avg };
    }

    function finish(reason) {
        if(s.done || !s.test) return;
        if(s.samples.length < s.test.minSeconds) {
            if(s.samples.length > 0) xf.dispatch('nofun:test-status', { test: s.test.id, short: true });
            return;
        }
        s.done = true;
        xf.dispatch('nofun:test-status', null);
        xf.dispatch('nofun:ramp-result', { ...result(), seconds: s.samples.length, reason });
        if(reason === 'auto') xf.dispatch('ui:watchLap');
    }

    xf.sub('db:workout', (workout) => {
        Object.assign(s, { workout, test: testOf(workout), measured: measuredInterval(workout), samples: [], counters: {}, peak: 0, done: false });
        xf.dispatch('nofun:test-status', null);
    });
    xf.sub('db:intervalIndex', (index) => {
        const leaving = measuring() && index !== s.measured;
        s.intervalIndex = index;
        if(leaving) finish(s.test === RAMP ? 'lap' : 'auto-end');
    });
    xf.sub('db:watchStatus', (status) => { s.watchStatus = status; });
    xf.sub('db:power',       (power)  => { s.power = power; });
    xf.sub('db:cadence',     (cadence) => { s.cadence = cadence; });
    xf.sub('db:powerTarget', (target) => { s.target = target; });
    xf.sub('watch:stopped',  () => finish('stopped'));

    setInterval(() => {
        if(s.done || s.watchStatus !== 'started' || !measuring()) return;
        s.samples.push(s.power);
        if(s.test === RAMP) {
            s.peak = Math.max(s.peak, s.target);
            const tick = rampTick(s.counters, { cadence: s.cadence, power: s.power, target: s.target });
            s.counters = tick;
            xf.dispatch('nofun:test-status', { test: 'ramp', seconds: s.samples.length, best1min: bestAverage(s.samples), target: s.target });
            if(tick.end && s.samples.length >= RAMP.minSeconds) finish('auto');
        } else {
            const avg = Math.round(average(s.samples));
            xf.dispatch('nofun:test-status', { test: 'twenty', seconds: s.samples.length, left: Math.max(0, TWENTY.seconds - s.samples.length), avg, ftp: twentyFtp(avg) });
        }
    }, 1000);

    return Object.freeze({ state: s });
}

const RampTest = FtpTests;

export {
    RAMP, TWENTY, rampZwo, buildRampWorkout, isRampWorkout, bestAverage, rampFtp, rampTick,
    twentyZwo, buildTwentyWorkout, twentyFtp, testOf, FtpTests, RampTest,
};
