//
// The training plan: which plan, from which Monday, which rides are done.
// Kept in this browser (localStorage). Dates are local days (YYYY-MM-DD).
//
// The calendar is fixed: every date has its rides. A ride missed earlier in the
// current week can still be ridden this week; after that it stays missed.
//

import { PLANS, planRides } from './vendor/timecrunchy/timecrunchy.js';
import { dataChanged } from './data-events.js';

const KEY  = 'nofun:plan-state';
const NONE = 'none';

const pad      = (n) => String(n).padStart(2, '0');
const isoDate  = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso  = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays  = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayIndex = (d) => (d.getDay() + 6) % 7; // Monday 0
const mondayOf = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dayIndex(d));
const daysBetween = (a, b) => Math.round((fromIso(isoDate(b)) - fromIso(isoDate(a))) / 86400000);

function loadState(storage = globalThis.localStorage) {
    try {
        const value = JSON.parse(storage?.getItem(KEY) ?? 'null');
        if(value === NONE) return NONE;
        if(value && PLANS.some((p) => p.id === value.planId) && /^\d{4}-\d{2}-\d{2}$/.test(value.start)) {
            return { planId: value.planId, start: value.start, done: value.done ?? {} };
        }
    } catch(e) {
        // unreadable: no plan yet
    }
    return null;
}

function saveState(state, storage = globalThis.localStorage) {
    try {
        storage?.setItem(KEY, JSON.stringify(state));
    } catch(e) {
        // storage blocked: the plan lasts until the page is closed
    }
    dataChanged();
    return state;
}

const planById = (id) => PLANS.find((p) => p.id === id);

// the weeks one by one: the label '9–11' becomes weeks 9, 10 and 11 with the same rides
function planWeeks(plan) {
    const weeks = [];
    plan.labels.forEach((label) => {
        const [from, to = from] = String(label).split('–').map(Number);
        for(let number = from; number <= to; number++) weeks.push({ number, label });
    });
    return weeks;
}

// rides a week and hours a week on the trainer, outdoor rides a week
function planStats(plan) {
    const weeks = planWeeks(plan);
    const rides = planRides(plan);
    let trainer = 0, minutes = 0, outdoor = 0;
    for(const week of weeks) {
        for(const ride of rides.filter((r) => r.week === week.label)) {
            if(ride.trainer) { trainer++; minutes += ride.minutes; } else outdoor++;
        }
    }
    return {
        weeks: weeks.length,
        ridesPerWeek: trainer / weeks.length,
        hoursPerWeek: minutes / 60 / weeks.length,
        outdoorPerWeek: outdoor / weeks.length,
    };
}

// 1 for the week of the start date; < 1 before it, > the plan's weeks after it
const currentWeekNumber = (state, today = new Date()) => Math.floor(daysBetween(fromIso(state.start), today) / 7) + 1;
const doneKey = (weekNumber, ride) => `${weekNumber}:${ride.id}`;

// one week of the plan, day by day, with the status of each ride
function weekView(state, weekNumber, today = new Date()) {
    const plan    = planById(state.planId);
    const weeks   = planWeeks(plan);
    const week    = weeks[Math.min(Math.max(weekNumber, 1), weeks.length) - 1];
    const monday  = addDays(fromIso(state.start), (week.number - 1) * 7);
    const rides   = planRides(plan).filter((r) => r.week === week.label);
    const todayIso = isoDate(today);
    const current  = currentWeekNumber(state, today);

    const days = [0, 1, 2, 3, 4, 5, 6].map((day) => {
        const date = addDays(monday, day);
        const iso  = isoDate(date);
        return {
            date, iso, day,
            today: iso === todayIso,
            rides: rides.filter((r) => r.day === day).map((ride) => {
                const key = doneKey(week.number, ride);
                let status = 'upcoming';
                if(state.done[key]) status = 'done';
                else if(iso === todayIso) status = 'today';
                else if(iso < todayIso) status = week.number === current ? 'missed-open' : 'missed';
                return { ...ride, key, status };
            }),
        };
    });
    return { plan, weeks, week, days, current };
}

// what to ride today
function todayView(state, today = new Date()) {
    const plan  = planById(state.planId);
    const total = planWeeks(plan).length;
    const n     = currentWeekNumber(state, today);
    if(n < 1) return { status: 'not-started', startsOn: fromIso(state.start) };
    if(n > total) return { status: 'finished' };
    const view  = weekView(state, n, today);
    const todays = view.days[dayIndex(today)].rides;
    const ride  = todays.find((r) => r.trainer && r.status === 'today');
    if(ride) return { status: 'ride', ride, view };
    const next = view.days.slice(dayIndex(today) + 1).flatMap((d) => d.rides.map((r) => ({ ...r, date: d.date }))).find((r) => r.trainer);
    const missed = view.days.flatMap((d) => d.rides).find((r) => r.trainer && r.status === 'missed-open');
    if(todays.some((r) => r.status === 'done')) return { status: 'done', next, missed, view };
    if(todays.some((r) => !r.trainer)) return { status: 'outdoors', rides: todays, next, missed, view };
    return { status: 'rest', next, missed, view };
}

function weekSummary(view) {
    const rides = view.days.flatMap((d) => d.rides).filter((r) => r.trainer);
    const done  = rides.filter((r) => r.status === 'done');
    return {
        rides: rides.length,
        done: done.length,
        missed: rides.filter((r) => r.status === 'missed' || r.status === 'missed-open').length,
        minutes: rides.reduce((sum, r) => sum + r.minutes, 0),
        minutesDone: done.reduce((sum, r) => sum + r.minutes, 0),
    };
}

function startPlan(planId, start, storage) {
    return saveState({ planId, start: isoDate(mondayOf(fromIso(start))), done: {} }, storage);
}

function markDone(state, key, date = new Date(), storage) {
    if(!state || state === NONE || state.done[key]) return state;
    return saveState({ ...state, done: { ...state.done, [key]: isoDate(date) } }, storage);
}

export {
    KEY, NONE, PLANS, loadState, saveState, planById, planWeeks, planStats, currentWeekNumber,
    weekView, todayView, weekSummary, startPlan, markDone, doneKey,
    isoDate, fromIso, addDays, mondayOf, dayIndex,
};
