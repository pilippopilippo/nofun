/**
 * @jest-environment jsdom
 */
import { intervalStarts, workoutPosition, tracePath } from '../../src/views/workout-graph.js';

describe('workout graph: the trace of the ride', () => {
    const intervals = [{ duration: 600 }, { duration: 300 }, { duration: 1200 }];

    test('each interval starts where the ones before end', () => {
        expect(intervalStarts(intervals)).toEqual([0, 600, 900]);
        expect(intervalStarts([])).toEqual([]);
        expect(intervalStarts(undefined)).toEqual([]);
    });

    test('the second of the workout from the interval and the time left in it', () => {
        const starts = intervalStarts(intervals);
        expect(workoutPosition(intervals, starts, 0, 600)).toBe(0);
        expect(workoutPosition(intervals, starts, 0, 1)).toBe(599);
        expect(workoutPosition(intervals, starts, 1, 300)).toBe(600);
        expect(workoutPosition(intervals, starts, 2, 0)).toBe(2100);
        // never outside the interval, nothing when the time left is unknown
        expect(workoutPosition(intervals, starts, 1, 400)).toBe(600);
        expect(workoutPosition(intervals, starts, 1, -5)).toBe(900);
        expect(workoutPosition(intervals, starts, 1, undefined)).toBe(-1);
        expect(workoutPosition(intervals, starts, 7, 10)).toBe(-1);
    });

    test('a path one point a second, with a gap where the rider skipped', () => {
        const y = (v) => 100 - v;
        expect(tracePath([], y)).toBe('');
        expect(tracePath([10, 20, 30], y)).toBe('M0 90.0L1 80.0L2 70.0');
        const skipped = [10, 20];
        skipped[5] = 50;
        skipped[6] = 60;
        expect(tracePath(skipped, y)).toBe('M0 90.0L1 80.0M5 50.0L6 40.0');
    });

    test('a long workout on a narrow graph: one point every few seconds, their average', () => {
        const y = (v) => v;
        expect(tracePath([10, 20, 30, 40, 50], y, 2)).toBe('M0.5 15.0L2.5 35.0L4 50.0');
        const skipped = [10, 20, 30, 40];
        skipped[8] = 100;
        skipped[9] = 200;
        expect(tracePath(skipped, y, 2)).toBe('M0.5 15.0L2.5 35.0M8.5 150.0');
    });
});
