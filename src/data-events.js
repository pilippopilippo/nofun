// nofun keeps its data in localStorage; every change is announced so the
// automatic backup file can be rewritten.
function dataChanged() {
    try {
        globalThis.dispatchEvent?.(new CustomEvent('nofun:data-changed'));
    } catch(e) {
        // no window (tests in node)
    }
}

export { dataChanged };
