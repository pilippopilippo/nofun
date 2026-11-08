//
// Training plans and zones from timecrunchy (github.com/pilippopilippo/timecrunchy),
// a pinned copy in src/vendor/timecrunchy (see version.js).
//
// The chosen plan is kept in this browser; its rides for the trainer are added to the
// workout list when the app starts.
//

import { PLANS, DEFAULT_PLAN, ZONES, TEXT, planRides, powerTarget } from './vendor/timecrunchy/timecrunchy.js';
import { VERSION } from './vendor/timecrunchy/version.js';

const storageKey = 'nofun:plan';
const NONE = 'none';

function selectedPlanId(storage = globalThis.localStorage) {
    let id = null;
    try {
        id = storage?.getItem(storageKey) ?? null;
    } catch(e) {
        // storage blocked: the default plan
    }
    if(id === NONE) return null;
    return PLANS.some((plan) => plan.id === id) ? id : DEFAULT_PLAN;
}

function selectPlan(id, storage = globalThis.localStorage) {
    try {
        storage?.setItem(storageKey, id ?? NONE);
    } catch(e) {
        // storage blocked: the choice lasts until the page is closed
    }
}

// .zwo of every ride for the trainer of a plan, in plan order
function planWorkouts(id = selectedPlanId()) {
    const plan = PLANS.find((p) => p.id === id);
    return plan ? planRides(plan).filter((ride) => ride.trainer).map((ride) => ride.zwo) : [];
}

// the zones in watts for an FTP: [{id, name, watts: '125–203 W', share: '50–81% FTP'}]
function zoneWatts(ftp) {
    return ZONES.map((zone) => ({
        id: zone.id,
        name: zone.name,
        watts: powerTarget(zone.id, ftp),
        share: powerTarget(zone.id),
    }));
}

export { PLANS, TEXT, NONE, VERSION, selectedPlanId, selectPlan, planWorkouts, zoneWatts };
