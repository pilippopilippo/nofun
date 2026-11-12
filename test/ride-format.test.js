/**
 * @jest-environment jsdom
 */
import { rideWhen, rideLength, sensorsInLaps } from '../src/ride-format.js';
import '../src/views/activity-list.js';

describe('your rides and laps', () => {
    test('when and how long', () => {
        expect(rideWhen(new Date(2026, 10, 14, 18, 42).valueOf())).toBe('Sat 14 Nov 2026 · 18:42');
        expect(rideWhen(NaN)).toBe('');
        expect(rideLength(40)).toBe('40 s');
        expect(rideLength(2700)).toBe('45 min');
        expect(rideLength(5520)).toBe('1 h 32 min');
    });
    test('sensor columns only with data', () => {
        expect(sensorsInLaps([{ avgPower: 200 }])).toEqual([]);
        expect(sensorsInLaps([{ saturated_hemoglobin_percent: 0 }, { core_temperature: 37.6 }])).toEqual(['core']);
        expect(sensorsInLaps([{ saturated_hemoglobin_percent: 61, total_hemoglobin_conc: 12.1 }])).toEqual(['smo2', 'thb']);
    });
    test('a ride row: name, when, length, Download FIT, Delete with confirmation', () => {
        const list = document.createElement('activity-list');
        document.body.append(list);
        const html = list.template(0, { id: 'a1', name: 'W3 Sat · 90 min', timestamp: new Date(2026, 10, 14, 18, 42).valueOf(), duration: 5400, status: {} });
        const box = document.createElement('div');
        box.innerHTML = html;
        expect(box.querySelector('.activity--name').textContent).toBe('W3 Sat · 90 min');
        expect(box.querySelector('.nf-ride-meta').textContent).toBe('Sat 14 Nov 2026 · 18:42 · 1 h 30 min');
        expect(box.querySelector('[action=":download"]').textContent).toBe('Download FIT');
        expect(box.querySelector('[action=":options"]').textContent).toBe('Delete');
        expect(box.querySelector('[action=":remove"]').textContent).toBe('Delete this ride');
        expect(box.querySelector('[action=":image"]')).toBe(null);
    });
});
