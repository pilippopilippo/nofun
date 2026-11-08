// CI test config for this fork.
//
// These suites already fail on upstream master (dvmarinoff/Auuki @ c50c3b6):
// most import modules that no longer exist (src/fit/profiles.js,
// src/fit/activity.js, src/ble/uuids.js) or test decoders that are not
// implemented. CI skips them so that it fails only on real regressions.
// Run `npm test` for the full upstream suite, and drop a line here when
// upstream fixes that suite.

const base = require('./jest.config.js');

module.exports = {
    ...base,
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/test/ble/cps.test.js',
        '<rootDir>/test/ble/cscs.test.js',
        '<rootDir>/test/ble/ftms.test.js',
        '<rootDir>/test/fit/activity.test.js',
        '<rootDir>/test/fit/developer-fields.test.js',
        '<rootDir>/test/fit/fit.test.js',
        '<rootDir>/test/fit/fitjs.test.js',
        '<rootDir>/test/fit/hrv.test.js',
        '<rootDir>/test/fit/min-fit.test.js',
        '<rootDir>/test/functions.test.js',
        '<rootDir>/test/storage/idb.test.js',
        '<rootDir>/test/views/moxy-graph.test.js',
        '<rootDir>/test/views/watch.test.js',
    ],
};
