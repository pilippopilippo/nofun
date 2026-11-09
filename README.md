# nofun

> **nofun is a modified copy of [Auuki](https://github.com/dvmarinoff/Auuki)** by Dimitar Marinov, under the GNU AGPL-3.0 (`LICENSE.txt`), first changed on 2026-11-08. It is not affiliated with auuki.com.

An indoor cycling app in the browser for structured workouts on a smart trainer over Bluetooth, with the time-crunched training plans of [timecrunchy](https://github.com/pilippopilippo/timecrunchy).

**Live:** https://pilippopilippo.github.io/nofun/


<<<<<<< Updated upstream
- **Plan page.** nofun opens on Plan: a first setup (FTP, one of the 9 time-crunched plans, the Monday it starts), then today's ride with a Ride button that loads it on the trainer, the week day by day, done and missed rides, and the zones in watts. The calendar is fixed; a ride missed earlier in the week can still be ridden that week. The plans come from timecrunchy, a pinned copy in `src/vendor/timecrunchy`; the state stays in the browser.
- **You, FTP and ramp test.** The setup asks name, weight (speed and climbs in slope mode) and FTP; without an FTP the plan starts with an automatic ramp test: ERG from 100 W, +20 W a minute, it ends by itself when the cadence stays under 50 rpm (or the power under half the target) for 5 s, FTP = 75% of the best minute, then 5 minutes of cool-down. Or the 20-minute test: warm-up with three openers, 20 minutes as hard as you can hold on a 1% slope with your gears, FTP = 95% of the average; while it runs Ride shows the average and the FTP it gives. Both tests are at the top of the workout list too (they replace Auuki's manual Ramp Test). Every result goes to the FTP history (Settings > Profile) and you choose whether to use it.
- **Your data stays yours.** Everything is in the browser; Settings > Profile > Your data exports and restores a backup file, and on Chrome/Edge desktop rewrites a file of your choice at every change (File System Access API). nofun asks the browser for persistent storage. After clearing the browser's data, the setup offers to restore a backup.
- **ERG inside the zone.** Intervals carry their zone (timecrunchy 1.1.0). The trainer holds one power at a time, so nofun moves the ERG target inside the zone: it starts in the middle, 5 W up when you spin 5 rpm above the step's cadence, 5 W down below it; the -/+ buttons stay inside the zone too.
- **Look and use.** The nofun theme (`src/css/nofun.css`): colors, Barlow fonts bundled from npm (no request to Google Fonts), menu Plan · Ride · Workouts · Settings. Today's ride is the current workout when the app opens, so the play button starts it; Trainer and Heart rate instead of Controllable and HRM; the Intervals.icu planned list is hidden; Moxy, CORE and Open Bike Control are under More sensors; the zones are on Plan.
- **No account.** Login, Intervals.icu, Strava and TrainingPeaks need the closed api.auuki.com backend, so they are hidden and the API is never called (`HOSTED_API: false` in `src/models/config.js`). Rides stay in the browser; download the FIT of a ride and use Garmin > Import to put it in Garmin Connect.
- **GitHub Pages.** Built for a sub path (`npm run build:pages`) and deployed by `.github/workflows/pages.yml`.
- **Name and logo.** nofun, with a new logo.
- **CI.** `npm run test:ci` skips the suites that already fail on Auuki's master (listed in `jest.ci.config.js`); `npm test` still runs everything.
=======
>>>>>>> Stashed changes

## Use it

Chrome, Edge or Brave (Web Bluetooth). On Linux you may need `chrome://flags/#enable-experimental-web-platform-features`. A Tacx Flux is controlled through FTMS.

## Credits

nofun is built on [Auuki](https://github.com/dvmarinoff/Auuki) by Dimitar Marinov and contributors (AGPL-3.0). The plans and zones come from *The Time-Crunched Cyclist* by Chris Carmichael (3rd edition), adapted in timecrunchy (MIT).

---

