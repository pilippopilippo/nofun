/**
 * @jest-environment jsdom
 */
import { nextInterval, mmss, scale } from '../src/views/ride-views.js';

describe('ride hero helpers', () => {
    const workout = { intervals: [
        { duration: 600, steps: [{ duration: 600, power: 0.6 }] },
        { duration: 300, steps: [{ duration: 120, power: 1.2 }, { duration: 180, power: 0.55 }] },
        { duration: 1200, steps: [{ duration: 1200, power: 0, slope: 1 }] },
    ] };
    test('the next interval: one power, a ramp, a slope, the end', () => {
        const ramp = { intervals: [{ duration: 60, steps: [{ duration: 60, power: 0.5 }] }, { duration: 600, steps: [{ duration: 300, power: 0.45 }, { duration: 300, power: 0.65 }] }] };
        expect(nextInterval(ramp, 0, 250)).toEqual({ seconds: 600, text: '10:00 from 113 to 163 W' });
        expect(nextInterval(workout, 0, 250)).toEqual({ seconds: 300, text: '5:00 from 300 to 138 W' });
        expect(nextInterval(workout, 1, 250).text).toBe('20:00 at slope 1%');
        expect(nextInterval(workout, 2, 250)).toBe(null);
        const flat = { intervals: [{ duration: 60, steps: [] }, { duration: 180, steps: [{ duration: 180, power: 0.55 }] }] };
        expect(nextInterval(flat, 0, 250).text).toBe('3:00 at 138 W');
    });
    test('times', () => {
        expect(mmss(47)).toBe('0:47');
        expect(mmss(3725)).toBe('1:02:05');
        expect(mmss(NaN)).toBe('–:––');
    });
    test('the zone band scale', () => {
        const at = scale([281, 325], 300);
        expect(at(281)).toBeGreaterThan(0);
        expect(at(325)).toBeLessThan(1);
        expect(at(1000)).toBe(1);
        expect(at(0)).toBe(0);
    });
});
