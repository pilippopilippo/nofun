//
// Formats for your rides and the laps table (pure, tested)
//

// "Sat 14 Nov 2026 · 18:42"
function rideWhen(timestamp, locale = 'en-GB') {
    const d = new Date(timestamp);
    if(Number.isNaN(d.valueOf())) return '';
    // composed by hand: browsers disagree on the comma after the weekday
    const part = (options) => d.toLocaleDateString(locale, options);
    const day = `${part({ weekday: 'short' })} ${d.getDate()} ${part({ month: 'short' })} ${d.getFullYear()}`;
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
}

// seconds → "45 min" / "1 h 32 min" / "40 s"
function rideLength(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    if(s < 60) return `${s} s`;
    const m = Math.round(s / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

// which optional sensors have data in any lap: the laps table shows only those columns
const SENSOR_FIELDS = {
    smo2: 'saturated_hemoglobin_percent',
    thb: 'total_hemoglobin_conc',
    core: 'core_temperature',
    skin: 'skin_temperature',
};
function sensorsInLaps(laps = []) {
    return Object.keys(SENSOR_FIELDS).filter((key) =>
        laps.some((lap) => Number.isFinite(lap?.[SENSOR_FIELDS[key]]) && lap[SENSOR_FIELDS[key]] !== 0));
}

export { rideWhen, rideLength, sensorsInLaps, SENSOR_FIELDS };
