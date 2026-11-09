/**
 * @jest-environment jsdom
 */
import { snapshot, restore } from '../src/backup.js';
import { loadProfile, saveProfile, loadHistory, addFtpResult } from '../src/profile.js';
import { bestAverage, rampFtp, rampTick, buildRampWorkout, isRampWorkout, RAMP } from '../src/ramp-test.js';
import { models } from '../src/models/models.js';

describe('backup', () => {
    beforeEach(() => localStorage.clear());
    test('snapshot and restore every entry', () => {
        localStorage.setItem('ftp', '250');
        localStorage.setItem('nofun:plan-state', '{"planId":"maintenance","start":"2026-11-09","done":{}}');
        const backup = JSON.parse(JSON.stringify(snapshot()));
        expect(backup.format).toBe('nofun-backup');
        localStorage.clear();
        expect(restore(backup)).toBe(2);
        expect(localStorage.getItem('ftp')).toBe('250');
    });
    test('refuses other files', () => {
        expect(() => restore({ hello: 'world' })).toThrow('not a nofun backup');
    });
});

describe('profile and FTP history', () => {
    beforeEach(() => localStorage.clear());
    test('name and history, newest first', () => {
        saveProfile({ name: '  pilippopilippo  ' });
        expect(loadProfile().name).toBe('pilippopilippo');
        addFtpResult({ date: '2026-10-01T10:00:00Z', ftp: 240, source: 'setup' });
        addFtpResult({ date: '2026-11-09T10:00:00Z', ftp: 252, source: 'ramp', best1min: 336 });
        expect(loadHistory().map((e) => e.ftp)).toEqual([252, 240]);
    });
});

describe('ramp test', () => {
    test('best minute and FTP', () => {
        const samples = [...Array(120)].map((_, i) => 100 + i); // rising power
        expect(bestAverage(samples)).toBe(Math.round((160 + 219) / 2));
        expect(rampFtp(336)).toBe(252);
    });
    test('ends after 5 s under 50 rpm or under half the target', () => {
        let c = {};
        for(let i = 0; i < 4; i++) { c = rampTick(c, { cadence: 40, power: 300, target: 320 }); expect(c.end).toBe(false); }
        expect(rampTick(c, { cadence: 40, power: 300, target: 320 }).end).toBe(true);
        c = {};
        for(let i = 0; i < 5; i++) c = rampTick(c, { cadence: 85, power: 120, target: 320 });
        expect(c.end).toBe(true);
        expect(rampTick({ lowCadence: 4 }, { cadence: 90, power: 320, target: 320 }).end).toBe(false);
    });
    test('the workout: warm-up, the ramp as one interval, cool-down', () => {
        const workout = buildRampWorkout((x) => models.workout.parse(x));
        expect(isRampWorkout(workout)).toBe(true);
        expect(workout.intervals.length).toBe(3);
        const ramp = workout.intervals[1];
        expect(ramp.steps.length).toBe((RAMP.max - RAMP.start) / RAMP.step + 1);
        expect(ramp.steps[0].power).toBe(100);
        expect(ramp.steps[1].power).toBe(120);
        expect(ramp.duration).toBe(ramp.steps.length * 60);
        expect(models.ftp.toAbsolute(ramp.steps[3].power, 250)).toBe(160);
    });
});
