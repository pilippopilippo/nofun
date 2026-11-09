//
// Zones from timecrunchy (github.com/pilippopilippo/timecrunchy), a pinned copy in
// src/vendor/timecrunchy (see version.js). The plan itself is in plan.js.
//

import { PLANS, ZONES, TEXT, powerTarget } from './vendor/timecrunchy/timecrunchy.js';
import { VERSION } from './vendor/timecrunchy/version.js';

// the zones in watts for an FTP: [{id, name, watts: '125–203 W', share: '50–81% FTP'}]
function zoneWatts(ftp) {
    return ZONES.map((zone) => ({
        id: zone.id,
        name: zone.name,
        watts: powerTarget(zone.id, ftp),
        share: powerTarget(zone.id),
    }));
}

export { PLANS, TEXT, VERSION, zoneWatts };
