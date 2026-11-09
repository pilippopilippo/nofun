/**
 * @jest-environment jsdom
 */

import { zwo } from '../src/workouts/zwo.js';
import { PLANS, zoneWatts } from '../src/timecrunchy.js';
import { planRides } from '../src/vendor/timecrunchy/timecrunchy.js';

describe('timecrunchy plans in nofun', () => {
    test('every ride for the trainer of every plan is read with its length', () => {
        let count = 0;
        for(const plan of PLANS) {
            for(const ride of planRides(plan).filter((r) => r.trainer)) {
                const workout = zwo.readToInterval(ride.zwo);
                expect(workout.meta.duration).toBe(ride.minutes * 60);
                expect(workout.meta.category).toBe(plan.name);
                count++;
            }
        }
        expect(count).toBe(256);
    });

    test('zones in watts for an FTP', () => {
        const zones = zoneWatts(250);
        expect(zones.find((z) => z.id === 'EM').watts).toBe('125–203 W');
        expect(zones.find((z) => z.id === 'SS').watts).toBe('239–250 W');
        expect(zones.find((z) => z.id === 'PI').watts).toBe('>281 W');
        expect(zones.find((z) => z.id === 'EM').share).toBe('50–81% FTP');
    });
});
