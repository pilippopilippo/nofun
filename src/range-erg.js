//
// ERG inside a range
//
// The trainer holds one power at a time (FTMS Set Target Power carries one value in watts).
// When a workout step has a power range (PowerRangeLow/PowerRangeHigh, from timecrunchy),
// nofun moves the ERG target inside it:
// - the step starts at its Power, the middle of the zone
// - every few seconds a cadence 5 rpm above the step's cadence raises the target 5 W,
//   5 rpm below lowers it 5 W
// - the -/+ buttons and any other change of target stay inside the range
// Only in ERG, with the workout running. Steps without a range work as before.
//

import { xf } from './functions.js';
import { ControlMode } from './ble/enums.js';

const STEP_WATTS      = 5;
const CADENCE_BAND    = 5;
const DEFAULT_CADENCE = 90;
const PERIOD_MS       = 3000;

// [low, high] in watts, rounded like the zones in Settings, or null
// (not models.ftp.toAbsolute, which rounds the share to 2 decimals first)
function stepRange(step, ftp) {
    const low  = Number(step?.powerrangelow);
    const high = Number(step?.powerrangehigh);
    if(!Number.isFinite(low) || !Number.isFinite(high) || low > high || !(ftp > 0)) return null;
    return [Math.round(low * ftp), Math.round(high * ftp)];
}

function clamp(value, [low, high]) {
    return Math.min(high, Math.max(low, value));
}

// the next ERG target from the cadence
function nextTarget({target, range, cadence, cadenceTarget}) {
    if(!range || !(cadence > 0)) return target;
    const reference = cadenceTarget > 0 ? cadenceTarget : DEFAULT_CADENCE;
    let next = target;
    if(cadence >= reference + CADENCE_BAND) next = target + STEP_WATTS;
    if(cadence <= reference - CADENCE_BAND) next = target - STEP_WATTS;
    return clamp(next, range);
}

function RangeErg() {
    const state = {
        workout: null, intervalIndex: 0, stepIndex: 0, ftp: 0, mode: undefined,
        powerTarget: 0, cadence: 0, cadenceTarget: 0, watchStatus: 'stopped', range: null,
    };

    function update() {
        const step = state.workout?.intervals?.[state.intervalIndex]?.steps?.[state.stepIndex];
        state.range = stepRange(step, state.ftp);
        xf.dispatch('nofun:power-range', state.range);
    }

    xf.sub('db:workout',       (workout) => { state.workout = workout; update(); });
    xf.sub('db:intervalIndex', (index)   => { state.intervalIndex = index; });
    xf.sub('db:stepIndex',     (index)   => { state.stepIndex = index; update(); });
    xf.sub('db:ftp',           (ftp)     => { state.ftp = ftp; update(); });
    xf.sub('db:mode',          (mode)    => { state.mode = mode; });
    xf.sub('db:cadence',       (cadence) => { state.cadence = cadence; });
    xf.sub('db:cadenceTarget', (target)  => { state.cadenceTarget = target; });
    xf.sub('db:watchStatus',   (status)  => { state.watchStatus = status; });
    xf.sub('db:powerTarget',   (target)  => {
        state.powerTarget = target;
        if(state.range && target > 0) {
            const inside = clamp(target, state.range);
            if(inside !== target) xf.dispatch('ui:power-target-set', inside);
        }
    });

    setInterval(() => {
        if(state.watchStatus !== 'started' || state.mode !== ControlMode.erg || !state.range) return;
        const next = nextTarget({
            target: state.powerTarget, range: state.range,
            cadence: state.cadence, cadenceTarget: state.cadenceTarget,
        });
        if(next !== state.powerTarget) xf.dispatch('ui:power-target-set', next);
    }, PERIOD_MS);

    return Object.freeze({ state });
}

export { RangeErg, stepRange, nextTarget, clamp, STEP_WATTS, CADENCE_BAND, DEFAULT_CADENCE };
