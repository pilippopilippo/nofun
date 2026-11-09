//
// Keeping nofun's data outside the browser, still on this computer:
// - export / import a backup file (any browser)
// - an automatic backup file, rewritten at every change (File System Access API:
//   Chrome and Edge on desktop); after the browser's data is cleared, restoring
//   from that file brings everything back
// - persistent storage, so the browser doesn't evict the data by itself
//
// The backup is every localStorage entry of this site: plan and progress,
// profile, FTP history, and Auuki's settings (FTP, weight, ...). Activities and
// uploaded workouts (IndexedDB) are not in it.
//

import { isoDate } from './plan.js';

const FORMAT  = 'nofun-backup';
const VERSION = 1;
const HANDLE_KEY = 'backup-file';

function snapshot(storage = globalThis.localStorage, now = new Date()) {
    const data = {};
    for(let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        data[key] = storage.getItem(key);
    }
    return { format: FORMAT, version: VERSION, savedAt: now.toISOString(), data };
}

function restore(backup, storage = globalThis.localStorage) {
    if(!backup || backup.format !== FORMAT || typeof backup.data !== 'object' || backup.data === null) {
        throw new Error('This is not a nofun backup file.');
    }
    let count = 0;
    for(const [key, value] of Object.entries(backup.data)) {
        if(typeof value === 'string') {
            storage.setItem(key, value);
            count++;
        }
    }
    return count;
}

const backupName = (date = new Date()) => `nofun-backup-${isoDate(date)}.json`;
const toText = (storage) => JSON.stringify(snapshot(storage), null, 1);

function exportBackup() {
    const url = URL.createObjectURL(new Blob([toText()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupName();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importBackup(file) {
    const count = restore(JSON.parse(await file.text()));
    location.reload();
    return count;
}

// ---- the file handle lives in IndexedDB (it can't go in localStorage)
function idb(mode, fn) {
    return new Promise((resolve, reject) => {
        const open = indexedDB.open('nofun', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('handles');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
            const tx = open.result.transaction('handles', mode);
            const req = fn(tx.objectStore('handles'));
            tx.oncomplete = () => { resolve(req?.result); open.result.close(); };
            tx.onerror = () => reject(tx.error);
        };
    });
}
const getHandle = () => idb('readonly', (store) => store.get(HANDLE_KEY));
const setHandle = (handle) => idb('readwrite', (store) => store.put(handle, HANDLE_KEY));

const status = { fileSupported: false, file: null, state: 'off', lastSaved: null, persisted: null, error: '' };
let handle = null;
let timer = null;

function emit() {
    globalThis.dispatchEvent?.(new CustomEvent('nofun:backup-status', { detail: { ...status } }));
}

const fileTypes = [{ description: 'nofun backup', accept: { 'application/json': ['.json'] } }];

async function initBackup() {
    status.fileSupported = 'showSaveFilePicker' in globalThis;
    try {
        if(navigator.storage?.persist) {
            status.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
        }
    } catch(e) {
        status.persisted = false;
    }
    if(status.fileSupported) {
        try {
            handle = await getHandle();
            if(handle) {
                status.file = handle.name;
                status.state = (await handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'ok' : 'needs-permission';
            }
        } catch(e) {
            handle = null;
        }
    }
    globalThis.addEventListener?.('nofun:data-changed', scheduleSave);
    emit();
    if(status.state === 'ok') scheduleSave();
}

async function writeFile() {
    if(!handle || status.state !== 'ok') return;
    try {
        const writable = await handle.createWritable();
        await writable.write(toText());
        await writable.close();
        status.lastSaved = new Date().toISOString();
        status.error = '';
    } catch(e) {
        status.state = 'error';
        status.error = e.message;
    }
    emit();
}

function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(writeFile, 1500);
}

// user gestures
async function chooseFile() {
    handle = await globalThis.showSaveFilePicker({ suggestedName: 'nofun-backup.json', types: fileTypes });
    await setHandle(handle);
    status.file = handle.name;
    status.state = 'ok';
    await writeFile();
}

async function allowFile() {
    if(!handle) return;
    status.state = (await handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? 'ok' : 'needs-permission';
    if(status.state === 'ok') await writeFile();
    emit();
}

async function restoreFromFile() {
    const [picked] = await globalThis.showOpenFilePicker({ types: fileTypes });
    restore(JSON.parse(await (await picked.getFile()).text()));
    await setHandle(picked);
    location.reload();
}

export {
    FORMAT, snapshot, restore, backupName, exportBackup, importBackup,
    initBackup, chooseFile, allowFile, restoreFromFile, status,
};
