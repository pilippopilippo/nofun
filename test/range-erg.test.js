/**
 * @jest-environment jsdom
 */

import { stepRange, nextTarget } from '../src/range-erg.js';

describe('ERG inside a range', () => {
    const ss = {power: 0.98, powerrangelow: '0.956', powerrangehigh: '1'};

    test('the range of a step in watts', () => {
        expect(stepRange(ss, 250)).toEqual([239, 250]);
        expect(stepRange({powerrangelow: '0.5', powerrangehigh: '0.811'}, 250)).toEqual([125, 203]);
        expect(stepRange({power: 0.55}, 250)).toBe(null);
        expect(stepRange(ss, 0)).toBe(null);
    });

    test('cadence moves the target inside the range, 5 W at a time', () => {
        const range = [239, 250];
        expect(nextTarget({target: 245, range, cadence: 96, cadenceTarget: 90})).toBe(250);
        expect(nextTarget({target: 250, range, cadence: 100, cadenceTarget: 90})).toBe(250);
        expect(nextTarget({target: 245, range, cadence: 84, cadenceTarget: 90})).toBe(240);
        expect(nextTarget({target: 240, range, cadence: 70, cadenceTarget: 90})).toBe(239);
        expect(nextTarget({target: 245, range, cadence: 92, cadenceTarget: 90})).toBe(245);
    });

    test('no cadence target: 90 rpm; not pedaling or no range: no change', () => {
        expect(nextTarget({target: 245, range: [239, 250], cadence: 96, cadenceTarget: 0})).toBe(250);
        expect(nextTarget({target: 245, range: [239, 250], cadence: 0, cadenceTarget: 90})).toBe(245);
        expect(nextTarget({target: 138, range: null, cadence: 110, cadenceTarget: 90})).toBe(138);
    });
});
