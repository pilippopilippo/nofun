/**
 * @jest-environment jsdom
 */
import { loadState, startPlan, markDone, weekView, todayView, weekSummary, planWeeks, planStats, planById, currentWeekNumber, NONE } from '../src/plan.js';

const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 10); };

describe('training plan', () => {
    beforeEach(() => localStorage.clear());

    test('weeks one by one and stats', () => {
        const plan = planById('new-granfondo');
        expect(planWeeks(plan).map((w) => w.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(planWeeks(plan)[10].label).toBe('9–11');
        const stats = planStats(plan);
        expect(stats.weeks).toBe(11);
        expect(Math.round(stats.ridesPerWeek)).toBe(4);
    });

    test('a plan starts on the Monday of its week and is kept', () => {
        const state = startPlan('new-granfondo', '2026-10-28');
        expect(state.start).toBe('2026-10-26');
        expect(loadState()).toEqual({ planId: 'new-granfondo', start: '2026-10-26', done: {} });
        localStorage.setItem('nofun:plan-state', JSON.stringify(NONE));
        expect(loadState()).toBe(NONE);
    });

    test('week 3, Saturday: today, done, missed this week', () => {
        let state = startPlan('new-granfondo', '2026-10-26');
        expect(currentWeekNumber(state, day('2026-11-14'))).toBe(3);
        let view = weekView(state, 3, day('2026-11-14'));
        const wed = view.days[2].rides[0];
        state = markDone(state, wed.key, day('2026-11-11'));
        view = weekView(state, 3, day('2026-11-14'));
        expect(view.days[2].rides[0].status).toBe('done');
        expect(view.days[3].rides[0].status).toBe('missed-open');
        expect(view.days[5].rides[0].status).toBe('today');
        expect(view.days[5].rides[0].title).toBe('90 min EM + 2×[4×2 min] SEPI');
        const summary = weekSummary(view);
        expect(summary).toMatchObject({ rides: 4, done: 1, missed: 1 });
        const today = todayView(state, day('2026-11-14'));
        expect(today.status).toBe('ride');
        expect(today.ride.key).toBe('3:new-granfondo-w3-sat');
    });

    test('a missed ride stays missed after its week', () => {
        const state = startPlan('new-granfondo', '2026-10-26');
        expect(weekView(state, 3, day('2026-11-17')).days[3].rides[0].status).toBe('missed');
    });

    test('before the start and after the end', () => {
        const state = startPlan('maintenance', '2026-11-16');
        expect(todayView(state, day('2026-11-10')).status).toBe('not-started');
        expect(todayView(state, day('2026-12-21')).status).toBe('finished');
    });

    test('weeks 9–11 keep separate done marks', () => {
        let state = startPlan('new-granfondo', '2026-10-26');
        const ride = weekView(state, 9, day('2026-12-21')).days.flatMap((d) => d.rides).find((r) => r.trainer);
        state = markDone(state, ride.key);
        expect(weekView(state, 10, day('2026-12-21')).days.flatMap((d) => d.rides).find((r) => r.id === ride.id).status).not.toBe('done');
    });
});
