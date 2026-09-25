# Moss & Ember

A woodland homeschool planner made for Makaylah: mushrooms, a quiet dragon named Ember, and a growing collection of curious little creatures.

## Start here

1. Unzip this package. The `moss-and-ember` folder is the project.
2. Create a GitHub repository and upload **the contents** of that folder. You should see `netlify.toml`, `package.json`, and the `public` folder at the repository’s top level. Include everything inside `public`.
3. In Netlify, add a project by importing that GitHub repository.
4. Use these settings if Netlify asks:

   | Setting | Value |
   | --- | --- |
   | Base directory | Leave blank |
   | Build command | Leave blank |
   | Publish directory | `public` |

   The included `netlify.toml` already specifies `public`. No build step, database, paid API, or environment variables are needed.
5. Open the live HTTPS address on Makaylah’s device. In **Settings**, adjust her subject times. In **This week**, add her actual assignments.

If the repository instead contains a wrapper directory called `moss-and-ember`, set Netlify’s base directory to `moss-and-ember` and its publish directory to `public`. Keeping the project contents at the repository root is simpler.

For a manual deployment, upload the **public** folder to Netlify. The GitHub workflow above also applies the security headers in `netlify.toml` and is the recommended setup.

## What is included

- **Today:** the day’s subjects, assignment links, optional learning notes, and completion buttons.
- **This week:** a weekly view for planning ahead or opening earlier dates.
- **Field notes:** a dated record of completed work, subject filtering, CSV export, and printing.
- **Creature den:** Ember earns 10 XP per completed subject. A snail, moth, jumping spider, beetle, and mushroom keeper unlock over time. Ember levels up every 100 XP.
- **Focus timer:** 15-, 25-, or 40-minute sessions, pause/resume, and recovery after reloading. A timer ending does **not** automatically mark a lesson complete.
- **Reminders:** in-app nudges, optional browser notifications, an optional quiet chime, and a calendar download.
- **Backups:** export and restore all settings, assignments, notes, and progress as JSON.
- **Offline use:** after the first successful online load, the app can reopen offline. Lesson links still need whatever access their websites require.

There are no streak penalties, ads, analytics, chat, or outside accounts. Rest days do not remove progress. Marking an accidental completion unfinished removes its associated 10 XP, so the same lesson cannot earn repeated rewards.

## Starting schedule

All four subjects appear on **Monday, Tuesday, Wednesday, and Friday**. Thursday, Saturday, and Sunday are rest days. These times are suggested starting points, not assignments you provided:

| Subject | Start | Planned time |
| --- | --- | --- |
| Algebra | 9:00 a.m. | 40 minutes |
| Writing | 9:50 a.m. | 30 minutes |
| Biology | 10:30 a.m. | 40 minutes |
| Literature | 11:20 a.m. | 30 minutes |

Change times, durations, or school days in Settings. The app rejects overlapping subjects. All times use the device’s local time zone. Actual lesson content is left blank for you to enter. Each subject currently has one assignment slot per school day; you can include multiple tasks in its text.

You can plan future dates, but completion buttons remain disabled until that school date. Use the date selector to record past work. Schedule changes update the calendar view; previously completed records stay saved. The app does not yet support separate subject schedules for different weekdays, holiday exclusions, or multiple students.

## Make the reminders useful

**While the planner is open:** enable reminders in Settings. The app checks for a subject during its scheduled time window and gives one nudge for that subject each day. If a completed subject is already checked off, it is skipped. Optional desktop alerts require browser permission and HTTPS. Keep the device awake: browser background throttling can delay reminders. Opening the app after a subject’s time window has ended does not replay every earlier alert.

**With the planner closed:** choose **Download calendar alerts**. Pick your term dates, download the `.ics` file, and import it into the calendar Makaylah already uses. Each subject repeats on the selected school days and includes an alert five minutes before its start.

Generate the download from the live website so each event includes a link back to the app. Import into a separate calendar named “Moss & Ember.” Check that the calendar’s time zone and notification settings are correct, and test an alert on her device. Some calendar services ignore alarms in imported files; add an alert in the calendar if necessary. Events use floating local times so the displayed school times follow the calendar’s local time zone.

The downloaded calendar is a snapshot, not a live subscription. Completion does not dismiss calendar alerts. Holidays are not automatically excluded. After changing the schedule, delete or replace the old imported events before importing a fresh file to avoid duplicates.

This version has **no closed-app web push, email, or SMS service**. A service worker caches the app and displays browser notifications; it does not independently schedule notifications after the page closes.

## Where the records live

Assignments and progress live in browser storage **on the device and site address where you entered them**. Nothing is uploaded to GitHub or Netlify when she checks off her work. A parent opening the website on another device will have a separate, empty planner.

Use one primary device/browser. Download a JSON backup regularly, especially before clearing browser data, changing devices, or changing the Netlify/domain address. Keep backups in your own files, outside the public GitHub repository. To move her work, open the same app on the new device and restore the backup there. Restoring replaces the current device’s planner after confirmation.

CSV export gives you a readable completion record. Its duration column contains **planned** minutes, not measured attendance or verified instructional time. The CSV is for review and printing; restore uses JSON backups.

The app has no password or parent-only controls. Anyone with access to that browser profile can read and edit the records. A parent portal with shared live data would require authentication and a database; those are not connected in this package.

## Run it locally

Install Node.js 20 or later, open a terminal in this folder, and run:

```sh
npm start
```

Open `http://localhost:3000`. There are no package dependencies to install. Avoid double-clicking `index.html`: browser modules and offline features need a local server or the deployed HTTPS website.

Run the included logic tests with:

```sh
npm test
```

## Files and customization

| File | Purpose |
| --- | --- |
| `public/index.html` | Page structure and original SVG icon set |
| `public/styles.css` | Responsive woodland theme |
| `public/grove.svg` | Original dragon-and-mushroom illustration |
| `public/app.mjs` | Planner screens, events, timer, and reminders |
| `public/core.mjs` | Schedule, validation, exports, and reward rules |
| `public/sw.js` | Offline app shell and notification click behavior |
| `public/manifest.webmanifest` | App installation metadata |
| `netlify.toml` | Publish folder and security headers |
| `scripts/serve.mjs` | Dependency-free local preview server |
| `tests/core.test.mjs` | Logic tests for dates, records, backup safety, and exports |

All artwork is included locally. No external fonts or image services are required.

When publishing code changes, **increment the `CACHE` version in `public/sw.js`** (for example, `shell-v1` to `shell-v2`). The offline cache keeps a complete, consistent version of the app. A new service worker activates after existing app tabs close; close and reopen the app to get an update. Updating the code does not erase her browser-stored assignments. Keep the storage key and schema compatible, or implement a data migration before changing them.

## Technical references

- [Netlify build configuration](https://docs.netlify.com/build/configure-builds/overview/)
- [Netlify file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/)
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN: Using notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)

## Validation and first-use check

The included five automated logic tests pass. They cover the school-day/date rules, one completion reward per subject/day, backup validation, CSV handling, and recurring calendar events. JavaScript syntax and packaged file references were also checked.

A live browser preview was blocked in the creation environment. The desktop/mobile layout, browser interactions, notifications, and installed/offline behavior have not been confirmed on a real device. Before relying on the planner, use her deployed app to add one assignment, mark it done, refresh, and confirm it remains saved. Then undo that test completion. Try the reminder button, save a backup, and import a calendar alert to confirm her device’s notification settings.

This package is ready to upload. It has not been published to a GitHub repository or deployed to Netlify on your behalf.
