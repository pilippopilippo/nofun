//
// Rider profile and FTP history, kept in this browser (localStorage).
// FTP and weight themselves stay in Auuki's settings (ui:ftp-set, ui:weight-set).
//

import { dataChanged } from './data-events.js';

const PROFILE_KEY = 'nofun:profile';
const HISTORY_KEY = 'nofun:ftp-history';

function read(key, fallback, storage = globalThis.localStorage) {
    try {
        const value = JSON.parse(storage?.getItem(key) ?? 'null');
        return value ?? fallback;
    } catch(e) {
        return fallback;
    }
}
function write(key, value, storage = globalThis.localStorage) {
    try {
        storage?.setItem(key, JSON.stringify(value));
    } catch(e) {
        // storage blocked
    }
    dataChanged();
    return value;
}

const loadProfile = (storage) => ({ name: '', ...read(PROFILE_KEY, {}, storage) });
const saveProfile = (profile, storage) => write(PROFILE_KEY, { name: String(profile.name ?? '').trim().slice(0, 40) }, storage);

// newest first: [{date: ISO string, ftp, source: 'ramp' | 'setup' | 'manual', best1min?, peak?, applied}]
function loadHistory(storage) {
    const list = read(HISTORY_KEY, [], storage);
    return Array.isArray(list) ? [...list].sort((a, b) => String(b.date).localeCompare(String(a.date))) : [];
}
function addFtpResult(result, storage) {
    const entry = { date: new Date().toISOString(), applied: true, ...result };
    write(HISTORY_KEY, [entry, ...loadHistory(storage)].slice(0, 200), storage);
    return entry;
}

export { PROFILE_KEY, HISTORY_KEY, loadProfile, saveProfile, loadHistory, addFtpResult };
