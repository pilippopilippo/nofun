# nofun

> **nofun is a modified copy of [Auuki](https://github.com/dvmarinoff/Auuki)** by Dimitar Marinov, under the GNU AGPL-3.0 (`LICENSE.txt`), first changed on 2026-11-08. It is not affiliated with auuki.com.

An indoor cycling app in the browser for structured workouts on a smart trainer over Bluetooth, with the time-crunched training plans of [timecrunchy](https://github.com/pilippopilippo/timecrunchy).

**Live:** https://pilippopilippo.github.io/nofun/

What is different from Auuki:

- **Plan page.** nofun opens on Plan: a first setup (FTP, one of the 9 time-crunched plans, the Monday it starts), then today's ride with a Ride button that loads it on the trainer, the week day by day, done and missed rides, and the zones in watts. The calendar is fixed; a ride missed earlier in the week can still be ridden that week. The plans come from timecrunchy, a pinned copy in `src/vendor/timecrunchy`; the state stays in the browser.
- **ERG inside the zone.** Intervals carry their zone (timecrunchy 1.1.0). The trainer holds one power at a time, so nofun moves the ERG target inside the zone: it starts in the middle, 5 W up when you spin 5 rpm above the step's cadence, 5 W down below it; the -/+ buttons stay inside the zone too.
- **Look.** The nofun theme (`src/css/nofun.css`): colors, Barlow fonts bundled from npm (no request to Google Fonts), menu Plan · Ride · Workouts · Settings.
- **No account.** Login, Intervals.icu, Strava and TrainingPeaks need the closed api.auuki.com backend, so they are hidden and the API is never called (`HOSTED_API: false` in `src/models/config.js`). Rides stay in the browser; download the FIT of a ride and use Garmin > Import to put it in Garmin Connect.
- **GitHub Pages.** Built for a sub path (`npm run build:pages`) and deployed by `.github/workflows/pages.yml`.
- **Name and logo.** nofun, with a new logo.
- **CI.** `npm run test:ci` skips the suites that already fail on Auuki's master (listed in `jest.ci.config.js`); `npm test` still runs everything.

## Use it

Chrome, Edge or Brave (Web Bluetooth). On Linux you may need `chrome://flags/#enable-experimental-web-platform-features`. A Tacx Flux is controlled through FTMS.

## Publish on GitHub Pages

1. Push this repository to `github.com/pilippopilippo/nofun` (public).
2. Settings > Pages > Build and deployment > Source: **GitHub Actions**.
3. Actions > Test and deploy to GitHub Pages > Run workflow (or push to `master`).

## Keep it up to date

Auuki:

```
git fetch upstream && git merge upstream/master
```

timecrunchy (after a new tag there):

```
npm run timecrunchy:update -- v1.1.0
npm run test:ci
git commit -am "timecrunchy 1.1.0"
```

## Credits

nofun is built on [Auuki](https://github.com/dvmarinoff/Auuki) by Dimitar Marinov and contributors (AGPL-3.0). The plans and zones come from *The Time-Crunched Cyclist* by Chris Carmichael (3rd edition), adapted in timecrunchy (MIT).

---

The original Auuki README follows.

<img alt="Auuki Indoor Cyling app for Structured Training" src="https://github.com/user-attachments/assets/292a3216-2f52-4994-9b15-614446e41912" />

# Auuki
Auuki is a powerful, no-nonsense app built for hammering out **structured workouts** on a smart trainer, right in your browser. No installs, no dependencies, no slow updates taking from precious training time.

**Key Features**:
* Run Zwift **.ZWO workouts**
* Connect via **Bluetooth** to smart trainers, power meters, heart rate monitors, the moxy monitor, and many more
* Full control with **ERG mode**, **Grade Simulation**, and **Resistance mode**
* Workouts with **Slope-based targets** for realistic effort control
* Record **.FIT activities** in a cross-industry standard
* Recording of native **RR intervals** in the .FIT file
* Built-in structured workouts to get you started
* **Intervals.icu and Strava** integrations for seamless syncing and uploads

Built as a **progressive web app (PWA)**, Auuki is fully browser-based and runs independently. It makes use of some of the most advanced Browser APIs like: Web Bluetooth, Web Serial, and Web Components. The web version is **free and open-source**, keeping everything on your device.
Train anywhere, with full control directly in your browser.

_Status_: Currently working on creating a full suite of Apple platform native apps (iOS, iPadOS, tvOS, watchOS).

# The Web App
- You can find the web app at [auuki.com](https://auuki.com)
- There is also a special development version which has the latest features available for preview: [dev.auuki.com](https://dev.auuki.com)
- [How to create a Profile and Connect Intervals.icu](https://forum.intervals.icu/t/auuki-com-intervals-icu-integration/87105)

## Sponsors 💖
So, if you’re loving what Auuki’s bringing to the table, consider supporting the project on [GitHub Sponsors](https://github.com/sponsors/dvmarinoff)? Think of it as buying me a coffee or, heck, a whole power meter to keep this thing cranking. Hit that sponsor button and let’s keep the good times rolling!

## Supported Browsers and Platforms

### MacOS, Windows, Andorid 

Please use either Chrome, Edge, Opera, Samsung Internet, or Brave. These browsers include built-in bluetooth.

| Chrome | Edge | Opera | Chrome Android | Samsung Internet | Brave | Firefox | Safari | Safari iOS | Chrome iOS |
|--------|------|-------|----------------|------------------|-------|---------|--------|------------|------------|
| yes    | yes  | yes   | yes            | yes              | yes*  | no      | no     | no         | no         |

If using Brave browser, you'll need to [manually enable bluetooth support](https://community.brave.com/t/can-you-enable-web-bluetooth-api-in-brave/522553/2).

### Linux
On Linux you might need to turn on the experimental platforms feature flag in your browser:

- Chrome: `chrome://flags/#enable-experimental-web-platform-features`

- Edge: `edge://flags/#enable-experimental-web-platform-features`

- Opera: `opera://flags/#enable-experimental-web-platform-features`

### iOS
Not Supported by the Web version

## Supported Trainers

### FTMS, FE-C over BLE, or WahooCPS

Works with all trainers that implement the bluetooth Fitness Machine Service (FTMS) or the Tacx FE-C over BLE solution.

The following table is copied from [DC Rainmaker Trainer Guide](https://www.dcrainmaker.com/2020/11/smart-cycle-trainer-recommendations-guide-winter.html/#technical-considerations) and shows current protocol support across the industry.

```
- Elite:    ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Gravat:   ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers
- JetBlack: ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Kinetic:  ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Minoura:  ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Saris:    ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- STAC:     ANT+ FE-C and Bluetooth FTMS on all 2020 smart trainers.
- Tacx:     ANT+ FE-C on all ‘Smart’ branded trainers (except Satori). FTMS on all non-NEO models. FEC over BLE on NEO.
- Wahoo:    ANT+ FE-C on all smart trainers. FTMS on all 2020 smart trainer.
- 4iiii:    ANT+ FE-C and Bluetooth FTMS on Fliiiight (--Ed)
- Schwinn:  Bluetooth FTMS on the IC8 / 800IC (--Ed)
```

### ANT+

Support for ANT+ is experimental at the moment. It is being rewritten right now and the code is moved to [WebANT](https://github.com/dvmarinoff/WebANT), which has a separate demo. When it becomes stable enough will be merged here. It currently has support for Ubuntu(Linux), and partially for MacOS, and Android. Windows 10 may be possible in the future.


The current development setup is using Suunto movestick mini, Garmin Fenix 5 watch broadcasting heart rate,
Tacx Heart Rate monitor, Tacx Flux S trainer, and X240 laptop with Ubuntu 20.04.2 LTS, M1 Mac, and Samsung S9 Android phone.

## Manual
- [How to create a Profile and Connect Intervals.icu](https://forum.intervals.icu/t/auuki-com-intervals-icu-integration/87105)
- [How-To: Using the connection settings](https://github.com/dvmarinoff/Auuki/discussions/91)
- [How-To: Using Auuki and another app concurrently](https://github.com/dvmarinoff/Auuki/discussions/101)

## Backers
<div>
    <a href="https://github.com/KlausMu" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/14290221?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/TClin76" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/96434118?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/fvolcic" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/59806465?s=64&v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/napfbike" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/192727271?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/sharalds" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/25537910?v=4" width="48" height="48" />
    </a>
    <a href="https://github.com/BenSimpsonAnalytics" target="_blank">
        <img style="display: inline-block;" src="https://avatars.githubusercontent.com/u/81325092?v=4" width="48" height="48" />
    </a>
</div>
