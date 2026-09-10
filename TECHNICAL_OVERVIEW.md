# Technical overview — how the pieces fit together

This is the "what is all this stuff in the folder and why does it matter" guide. The
[README](README.md) covers *playing* and *adding content*; this file covers the plumbing:
Google sign-in, Firebase, the native app build (`www/`, `capacitor.config.ts`, `ios/`,
`android/`, `node_modules/`), the JSON files, and what has to be true for the game to run.

---

## 1. The 30-second map

```
medsci-runner.html   the whole game (HTML + CSS + one <script type="module">)
game-data.js         every course / topic / item / question, as plain JS data
developer-tool.html  maintainer content editor (never shipped in the app)
icons/               topic + theme icons drawn on the canvas and in menus
images/              a few legacy image files (item images are links now)
scripts/copy-web-assets.js   rebuilds www/ from the files above
www/                 GENERATED copy of the game that the phone app wraps
capacitor.config.ts  tells Capacitor what to wrap and which sign-in providers to enable
ios/  android/       the native Xcode / Android Studio projects (generated shells + Firebase config)
package.json         the list of tools/libraries the native build needs
node_modules/        those tools/libraries, downloaded (never committed)
```

Two very different ways to run the same game:

| | Browser (desktop / phone browser) | Native app (iOS / Android via Capacitor) |
|---|---|---|
| What runs | `medsci-runner.html` opened directly, or hosted on a website | `www/index.html` inside a WebView, wrapped by the native project |
| Needs internet? | Only for Group Race, sign-in, contributions, analytics | Same |
| Sign-in flow | Firebase JS SDK popup (`signInWithPopup`) | Native Google sign-in via the Capacitor Firebase Authentication plugin, then handed to the JS SDK |
| Needs Node / npm? | **No** — zero build step | Yes, to sync and build the native projects |

---

## 2. Firebase — what it is and what we use it for

Firebase is Google's hosted backend. We use one Firebase project, `runner-9b11b`, and only
two of its products:

| Product | Used for |
|---|---|
| **Realtime Database** (the URL ending in `firebasedatabase.app`, region `asia-southeast1`) | Group Race rooms, answer statistics, player contributions, cross-device sync of a signed-in player's data |
| **Authentication** (Google provider only) | Optional "Sign in with Google" so progress/settings follow a person across devices |

Nothing else — no Firestore, no Storage, no Cloud Functions, no Hosting (as of this writing).

### 2.1 How the game talks to Firebase

The game **does not bundle the Firebase SDK**. Near the top of the `<script type="module">`
in `medsci-runner.html` it does:

```js
const appMod  = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js');
const dbMod   = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js');
const authMod = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
```

Those are dynamic `import()`s straight from Google's CDN (`gstatic.com`) at page load. Two
consequences:

- **Offline / blocked network:** the imports fail, the game logs a warning, sets
  `firebaseReady = false`, and everything that only needs local files (solo Runner,
  Study & Practice, Custom run, Review) keeps working. Group Race, sign-in, contributions and
  analytics are simply unavailable until there's a connection.
- **Database and Auth are loaded independently.** A failure loading the Auth SDK only disables
  sign-in; the database features still work signed-out. That's why there are two flags,
  `firebaseReady` and `authReady`.

### 2.2 The config block (the "API key" that's safe to be public)

```js
const firebaseConfig = {
  apiKey: "AIza…",                       // identifies the project — NOT a secret
  authDomain: "runner-9b11b.firebaseapp.com",
  databaseURL: "https://runner-9b11b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "runner-9b11b",
  storageBucket: "runner-9b11b.firebasestorage.app",
  messagingSenderId: "…",
  appId: "…",
};
```

People often worry about this being visible in an HTML file. It's fine: the Firebase web API key
only says *which project* to talk to. What actually protects the data is the project's
**Security Rules** (set in the Firebase console → Realtime Database → Rules), which decide who
can read/write which paths. Those rules are not stored in this repo — they live in the console.

The **same** config block is duplicated in `developer-tool.html`, so the dev tool reads the same
database.

### 2.3 What's in the database

Everything is one JSON tree. The paths the code reads and writes:

| Path | Written by | Read by | What it holds |
|---|---|---|---|
| `rooms/<CODE>` | Group Race host (creates), every racer (updates own player) | Every racer in that room, live via `onValue` | `status` (waiting/countdown/finished), `countdownAt`, `theme` + filters, `players/<playerId>` (name, glucose, stage, correct/incorrect counts, `done`, `doneReason`, …), `winner` |
| `stats/<itemId>::<qId>` | The game, every time any player answers (a transaction that increments `correct` or `wrong`) | `developer-tool.html` → Analytics tab | Aggregate per-question correct/wrong counts, used for the miss-rate table |
| `contributions/<pushKey>` | The game's "Contribute" section on an item page, and the dev tool's "Add to batch" | `developer-tool.html` → Team Queue | Suggested fun facts / notes / flags / new items+questions, waiting for a maintainer to review and merge into `game-data.js` |
| `users/<uid>/sync/<key>` | The game, whenever a **signed-in** player changes something syncable | The game, on sign-in and live afterwards | `theme`, `font`, `playerCustomization`, `srsState` (spaced-repetition history, merged per-entry by newest `lastSeen`) |
| `.info/serverTimeOffset` | Firebase itself | The game | Clock offset between this device and Firebase's servers, so the Group Race countdown is the same on every device even if someone's clock is wrong |

Nothing a player submits ever appears to other players directly — content only becomes real
when a maintainer merges it into `game-data.js` through the dev tool.

### 2.4 The dev tool's "maintainer PIN"

The dev tool's destructive sections (delete/overwrite content, Analytics, merging the queue)
sit behind a PIN check that lives *in the HTML*. It's a convenience gate to stop a casual opener
clicking the wrong button — it is **not** security. Anyone who can read the file can read the
PIN, and the database's real protection is the Security Rules in the console.

---

## 3. Google sign-in — the actual mechanism

Sign-in is optional. Its only job is to make `users/<uid>/sync` work (see above). There are two
completely different code paths, chosen at runtime by `isNativeApp()`, which just checks whether
`window.Capacitor` exists and reports a native platform.

### 3.1 In a browser

1. Player clicks **Sign in** → `signInWithPopup(fbAuth, new GoogleAuthProvider())`.
2. The Firebase JS SDK opens a popup on `runner-9b11b.firebaseapp.com/__/auth/handler`, which
   bounces to Google's account chooser, then back.
3. Google returns an OAuth token; Firebase Auth turns it into a Firebase user (`uid`,
   display name, …) and fires `onAuthStateChanged`.
4. `handleAuthStateChanged(user)` reads `users/<uid>/sync` once, applies it, then subscribes
   with `onValue` so changes from another device arrive live.

**Why "auth/unauthorized-domain" happens.** Google will only complete step 2 for web origins
that are on the project's allow-list (Firebase console → Authentication → Settings →
Authorized domains). A file opened straight from the desktop has origin `file://`, which can
never be on that list, so sign-in from a downloaded copy always fails with that error. The game
now detects `file:` up front and explains this instead of opening the popup. To have sign-in work
on the web the game has to be served from a real address (e.g. GitHub Pages, Firebase Hosting)
and that address added to Authorized domains.

### 3.2 In the native app

Google blocks its OAuth pages inside embedded WebViews, so the popup path is a dead end there.
Instead:

1. `window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle()` — this is the
   `@capacitor-firebase/authentication` plugin (listed in `package.json`, enabled in
   `capacitor.config.ts` with `providers: ['google.com']`). It runs the **native** Google
   sign-in sheet using the native Firebase SDK.
2. That gives back an OAuth `idToken` / `accessToken`. The native SDK is now signed in, but the
   **JS** Firebase SDK inside the WebView (the one all the sync code listens to) is not.
3. So the game wraps the token with `GoogleAuthProvider.credential(idToken, accessToken)` and
   calls `signInWithCredential(fbAuth, cred)` on the JS SDK. Only now does
   `onAuthStateChanged` fire and the same `handleAuthStateChanged` path run.
4. Sign-out has to be done on **both** SDKs for the same reason.

Two native-only details worth knowing:

- On native, Auth is created with `initializeAuth(fbApp, { persistence: browserLocalPersistence })`
  instead of `getAuth()`. Plain `getAuth()` pre-loads a hidden iframe from `authDomain` for
  popup flows; inside Capacitor's `capacitor://localhost` origin that iframe never finishes and
  every later Auth call silently queues behind it. `initializeAuth` skips it.
- The native SDKs need their own project config files (section 5) — the JS `firebaseConfig`
  block is not enough for the native layer.

---

## 4. `www/`, `capacitor.config.ts`, `ios/`, `android/`, `node_modules/` — the native build

### 4.1 What Capacitor is

Capacitor (from the Ionic team) takes a folder of web files and wraps it in a real iOS / Android
app: a native shell whose entire UI is a full-screen WebView showing your HTML. It also provides
the bridge (`window.Capacitor`) that lets the page call native plugins like Google sign-in.

### 4.2 `www/` — generated, disposable, required

- Capacitor is told (`webDir: 'www'` in `capacitor.config.ts`) to ship **whatever is in `www/`**.
- `www/` is **not** hand-edited and is **gitignored**. It's rebuilt by
  `scripts/copy-web-assets.js`, which wipes it and copies:
  - `medsci-runner.html` → `www/index.html` (renamed — the WebView loads `index.html`)
  - `game-data.js`, `icons/`, `images/`
  - and deliberately **not** `developer-tool.html` (maintainer-only, has write access).
- Because it's a copy, **any change to the root files is invisible to the app until you rebuild
  it**. The workflow is:

  ```sh
  npm run copy-web   # rebuild www/ from the root files
  npx cap sync       # copy www/ into ios/ and android/, update native plugin wiring
  # or both at once:
  npm run sync
  npm run open:ios   # opens Xcode        (then Run)
  npm run open:android
  ```

  Forgetting this is the classic "I fixed it but the phone still shows the old version" trap.

### 4.3 `capacitor.config.ts` — the only TypeScript file

```ts
const config: CapacitorConfig = {
  appId: 'com.easonchiang.medscirunner',   // bundle id on iOS / package name on Android
  appName: 'Medsci Runner',
  webDir: 'www',
  plugins: { FirebaseAuthentication: { providers: ['google.com'] } },
};
```

It's TypeScript purely because Capacitor's CLI reads it that way (the `typescript` package in
`devDependencies` exists only for this). `npx cap sync` compiles it into
`capacitor.config.json` copies inside `ios/App/App/` and `android/app/src/main/assets/` — those
JSON copies are generated and gitignored. The game itself never reads this file.

### 4.4 `ios/` and `android/`

Generated native projects (`npx cap add ios` / `android`), committed so they can be opened and
built. Inside them the parts that actually matter:

| File | Why it matters |
|---|---|
| `ios/App/App/GoogleService-Info.plist` | The **iOS** Firebase project config (same project, native format). Downloaded from the Firebase console. Without it native Auth can't start. |
| `ios/App/App/AppDelegate.swift` | Calls `FirebaseApp.configure()` at launch — required before any native Firebase call. |
| `ios/App/CapApp-SPM/Package.swift` | Swift Package Manager manifest pulling in Capacitor and the Firebase Authentication plugin (pointing at `node_modules/@capacitor-firebase/authentication` — another reason `node_modules` must exist before opening Xcode). |
| `android/app/build.gradle` + `android/build.gradle` | Android build config. It looks for `android/app/google-services.json` and only applies the Google Services plugin if found. **That file is currently not in the repo**, so native Google sign-in on Android is not wired up yet — download it from the Firebase console (Project settings → Your apps → Android) and drop it there when Android sign-in is needed. |
| `android/app/capacitor.build.gradle` | Generated by `cap sync`; lists the native plugin modules (`capacitor-firebase-authentication`). Don't edit by hand. |

### 4.5 `package.json`, `package-lock.json`, `node_modules/`

- `package.json` lists the tooling: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`,
  `@capacitor/android`, `@capacitor-firebase/authentication`, plus `typescript`. It also defines
  the `npm run …` shortcuts used above.
- `package-lock.json` pins the exact versions that were installed so every machine gets the
  same ones. Commit it; don't edit it by hand.
- `node_modules/` is what `npm install` downloads from that list. It's gitignored and can be
  deleted and recreated at any time with `npm install`. It is **only** needed for the native
  build (Capacitor CLI, native plugin sources). The browser game has no dependency on it at all.

---

## 5. The JSON (and JSON-like) files, one by one

| File | Hand-written? | Committed? | Purpose |
|---|---|---|---|
| `package.json` | Yes | Yes | Dependencies + npm scripts for the native build |
| `package-lock.json` | No (npm) | Yes | Exact dependency versions |
| `ios/App/App/GoogleService-Info.plist` | No (Firebase console download) | Yes | iOS native Firebase config (XML plist, JSON-equivalent) |
| `android/app/google-services.json` | No (Firebase console download) | **Missing** | Android native Firebase config — needed for Android sign-in |
| `ios/App/App/capacitor.config.json`, `android/app/src/main/assets/capacitor.config.json` | No (`cap sync`) | No (gitignored) | Compiled copies of `capacitor.config.ts` |
| `ios/App/App/Assets.xcassets/Contents.json` | No (Xcode) | Yes | App icon / asset catalog metadata |
| `game-data.js` | Via the dev tool (or by hand) | Yes | **Not JSON** but JSON-shaped: a JS file that sets `window.RUNNER_DATA = {…}`. It's JS rather than `.json` on purpose — a `<script src>` works from `file://` where `fetch('data.json')` would be blocked by the browser. |

Data that is *not* in files at all: the Realtime Database contents (section 2.3), the database
Security Rules, and the Auth "Authorized domains" list — all live in the Firebase console.

---

## 6. What has to be true for the game to run

**Browser copy (what most people use):**

1. `medsci-runner.html`, `game-data.js`, `icons/` (and `images/`) must sit in the **same
   folder** — the HTML loads `game-data.js` via `<script src="game-data.js">` and icons by
   relative path. Opening the HTML from inside a ZIP breaks this.
2. Nothing else is required. No server, no Node, no internet for solo modes.
3. With internet, the page pulls the Firebase SDK from `gstatic.com` and the optional
   OpenDyslexic font from `cdn.jsdelivr.net`. If a network blocks either, the game still runs;
   only the dependent features (Group Race / sign-in / contributions / dyslexia font) drop out.
4. Sign-in specifically needs the page to be served from an **authorized https domain**, never
   `file://`.
5. `game-data.js` must parse. A quick check after editing it by hand:
   `node --check game-data.js`. The dev tool's "Generate merged game-data.js" produces a
   complete file, so prefer that over hand edits.

**Native app:**

6. `npm install` once (creates `node_modules/`).
7. After **every** change to the root files: `npm run sync` (rebuild `www/`, push into the native
   projects).
8. iOS: `GoogleService-Info.plist` present, open with `npm run open:ios`, build in Xcode.
   Android: add `google-services.json` first if sign-in is needed, then `npm run open:android`.
9. The `FirebaseAuthentication` provider list in `capacitor.config.ts` must include every
   provider you expect to use (it does not infer them from the console).

**Developer tool:**

10. `developer-tool.html` also needs `game-data.js` beside it (it reads the live content to know
    existing courses/topics/items) and internet for the Team Queue / Analytics (Firebase).
    It is intentionally excluded from `www/` and should never be shipped in the app.

---

## 7. Common failure → likely cause

| Symptom | Look at |
|---|---|
| Blank game / no courses listed | `game-data.js` not next to the HTML, or a syntax error in it (`node --check game-data.js`) |
| "Sign-in failed: auth/unauthorized-domain" | Opened from `file://`, or the hosting domain isn't in Firebase → Authentication → Authorized domains |
| Sign-in button never appears | Auth SDK failed to load (offline, `gstatic.com` blocked) — check the console warning |
| Group Race "unavailable" | Database SDK failed to load (same causes), or Security Rules deny the write |
| Phone app shows old content | `www/` not rebuilt — run `npm run sync` |
| Xcode can't find CapacitorFirebaseAuthentication | `node_modules/` missing — run `npm install` |
| Android sign-in does nothing | `android/app/google-services.json` is absent |
