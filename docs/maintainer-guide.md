# Maintainer guide

Threads Organizer | by Dr. Kangabu

This guide is for people who change, test and release the extension. The project is a Chrome Manifest V3 extension written as plain ES modules. There is no build step. Users of the extension should read the [user guide](user-guide.md).

## Contents

- [Project layout](#project-layout)
- [Set up the dev environment](#set-up-the-dev-environment)
- [Run the tests](#run-the-tests)
- [Load the working copy in Chrome and reload after edits](#load-the-working-copy-in-chrome-and-reload-after-edits)
- [Fix broken post detection after Threads changes its markup](#fix-broken-post-detection-after-threads-changes-its-markup)
- [Regenerate the documentation screenshots](#regenerate-the-documentation-screenshots)
- [Continuous integration](#continuous-integration)
- [Make a release](#make-a-release)
- [First-time publication to GitHub](#first-time-publication-to-github)
- [Checklist before the first public release](#checklist-before-the-first-public-release)
- [Commit conventions](#commit-conventions)
- [Privacy and permissions review checklist](#privacy-and-permissions-review-checklist)
- [Known limitations](#known-limitations)

## Project layout

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension definition: permissions, hosts, background worker, side panel, content script. Holds the version. |
| `package.json` | Test script (`npm test`) and the dev dependency `jsdom`. `"type": "module"`. |
| `src/background.js` | Service worker. Makes a click on the toolbar icon open the side panel. |
| `src/content/loader.js` | Content script entry. Loads `main.js` with a dynamic `import()` so that `main.js` can use ES modules. |
| `src/content/main.js` | Adds the stack-of-cards button to posts, places it, handles save and remove clicks, refreshes counts of saved posts, rescans when the page changes. |
| `src/content/selectors.js` | The only file that knows Threads' page structure. Finds post elements, reads post data and counts, finds the "..." menu button. |
| `src/content/content.css` | Styles of the button. Uses `!important` so that page styles cannot change it. |
| `src/lib/post.js` | Parses post links and cleans untrusted post objects (used on import). |
| `src/lib/store.js` | Storage layer over `chrome.storage.local`: save, update, delete, folders, merge. Writes are queued one at a time. |
| `src/lib/search.js` | Filtering and sorting of posts, and the tag list with counts. |
| `src/lib/format.js` | Formats counts for display (`1.2K`) and parses displayed counts. |
| `src/lib/exporter.js` | Builds the Markdown and JSON exports and validates imported JSON. |
| `src/panel/panel.html` | Side panel page. |
| `src/panel/panel.js` | Side panel logic: chips, filters, cards, export, import. |
| `src/panel/panel.css` | Side panel styles. |

Other paths:

| Path | Purpose |
| --- | --- |
| `tests/*.test.js` | Unit tests. See [Run the tests](#run-the-tests). |
| `tests/fixtures/post.html` | Sample Threads markup used by `tests/selectors.test.js`. |
| `tests/helpers.js` | An in-memory storage area and a post builder for tests. |
| `.github/workflows/ci.yml` | Test workflow. |
| `.github/workflows/release.yml` | Release workflow. |
| `docs/` | These guides, and `docs/images/` (screenshots and demo GIF). |
| `tools/screenshots/` | Mock Threads pages and `capture.py`, which regenerates `docs/images/`. See [Regenerate the documentation screenshots](#regenerate-the-documentation-screenshots). |

All data is kept in `chrome.storage.local`, one key per item: `tops:post:<id>` holds a post, `tops:folder:<id>` holds a folder and `tops:counts:<id>` holds a post's engagement counts `{likes, replies, reposts}`. Only `updateCounts` writes the counts key, so a Threads tab refreshing counts cannot overwrite a note, tags or folder edited in the panel; `getAll()` merges the counts back into `post.counts`. Builds from e9d86f0 stored counts inside the post; the reader still accepts that (a counts key wins, and any other write of the post moves the old value to the counts key). A one-time copy of the pre-upgrade library (the old `threadsOrganizer` value) is kept under `tops:legacy-backup`, written in the same `set` as the migrated keys. The extension never reads or deletes it. To drop it, run `chrome.storage.local.remove('tops:legacy-backup')` in the DevTools console of the side panel page. `createStore(area)` in `src/lib/store.js` still returns `{ posts, folders }` maps keyed by id, built with no prototype so ids such as `__proto__` are plain data. Each write touches only the keys that changed (`area.set` for changed items, `area.remove` for deleted ones), so the panel and several Threads tabs can edit different posts at the same time without overwriting each other. Two contexts editing the same post still resolve as last writer wins for that post. Listen for changes with `isStoreChange(changes, areaName)` from the same module.

**Migration from the old layout.** Versions before this change kept everything in one key, `threadsOrganizer` (`{ posts, folders }`). On the first read or write, the store copies each legacy post and folder to its new key only when that key does not exist yet (legacy posts get the same defaults as new saves), then removes `threadsOrganizer`. It never overwrites a new key, and the legacy key is removed only after the copy succeeded, so it is safe to repeat or to run from two contexts at once. Keep this code until you are sure no install still holds the old key.

## Set up the dev environment

**Purpose**
Prepare a machine to run the tests.

**Before you start**
- Node.js 22 or later (CI uses Node 22).
- Git.

**Steps**
1. Clone the repository and open its folder in a terminal.
2. Run `node --version`. Confirm it prints `v22` or higher.
3. Run `npm install`.

**Expected result**
A `node_modules` folder exists. `jsdom` is the only dependency. It is a dev dependency used by the tests.

**If it does not work**
Check the Node version. Delete `node_modules` and run `npm install` again.

## Run the tests

**Purpose**
Check that a change does not break behavior.

**Before you start**
- The dev environment is set up.

**Steps**
1. Run `npm test`.

The script runs `node --test "tests/**/*.test.js"` with the built-in Node test runner.

**Expected result**
All tests pass and the summary shows `fail 0`.

**If it does not work**
Read the first failing test name and its message. Fix the code or, if behavior changed on purpose, the test.

What each test file covers:

| File | Covers |
| --- | --- |
| `tests/post.test.js` | `parsePermalink` (relative and absolute links, `threads.net`, query removal, non-post links) and `normalizePost` (defaults, wrong-typed fields, rejected posts, counts handling). |
| `tests/store.test.js` | Saving never overwrites, batch save counts, only editable fields change, delete, deleting a folder unfiles its posts, merge keeps existing and drops dangling folder IDs, queued writes lose no updates, `updateCounts`. |
| `tests/search.test.js` | Sorting newest saved first, query terms combined across text, author, note and tags, folder filter, tag, author and date filters, tag counts. |
| `tests/exporter.test.js` | Markdown grouping and content, engagement line and plurals, JSON round trip with used folders only, invalid dates, `parseImport` rejecting and tolerating input. |
| `tests/format.test.js` | `formatCount` and `parseCount`, including grouped and suffixed numbers. |
| `tests/selectors.test.js` | Post detection and host choice for notification rows and nested posts, `parsePost` fields and text cleaning (time, Translate label, page markers), menu button detection (label, dots, geometry, localized), row neighbors, and `parseCounts` strategies. |

## Load the working copy in Chrome and reload after edits

**Purpose**
Try a change in the real browser.

**Before you start**
- A clone of the repository.

**Steps**
1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder (the one with `manifest.json`).
4. Edit a file under `src/`.
5. On the extension card, click the reload icon.
6. Refresh every Threads tab.
7. For the side panel, close and reopen it.

**Expected result**
The change is visible. No build step is needed.

**If it does not work**
Click **Errors** on the extension card. See [Extension context invalidated](troubleshooting.md#extension-context-invalidated-or-nothing-happens-after-reloading).

## Fix broken post detection after Threads changes its markup

`src/content/selectors.js` is the only file that knows Threads' page structure. Fix detection there and nowhere else. `main.js`, the panel and the libraries must not read Threads markup.

**Purpose**
Restore post detection, text, counts or icon placement when Threads changes its markup.

**Before you start**
- The dev environment is set up.
- A Threads page where the problem is visible.
- Read the [troubleshooting entry](troubleshooting.md#how-to-read-the-diagnostic-attributes) on `data-to-anchor` and `data-to-counts`.

**Steps**
1. Open the affected post on threads.com.
2. Right-click the icon > **Inspect** and note `data-to-anchor` and `data-to-counts`.
3. In DevTools > **Console**, run: `copy(document.querySelector('a[href*="/post/"]').closest('div').parentElement.parentElement.outerHTML)`. Add or remove `.parentElement` calls until the copy holds the whole post.
4. Paste the markup into a new file under `tests/fixtures/`, for example `tests/fixtures/post-activity.html`.
5. Anonymize the file. Replace names, handles, post text, image URLs and IDs with dummy values. Keep the structure, attributes and element order unchanged.
6. Add a test to `tests/selectors.test.js` that loads the fixture and asserts the expected result (for example the post list, `parsePost` text, `findMenuAnchorInfo` result or `parseCounts` numbers). Follow the existing tests, which build a DOM with `jsdom`.
7. Run `npm test`. Confirm the new test fails for the reason you expect.
8. Change only `src/content/selectors.js`.
9. Run `npm test`. Confirm all tests pass.
10. Reload the extension, refresh Threads, and check the post in the browser.
11. Commit with a `fix:` message. Include the fixture and the test in the same commit.

**Expected result**
The new test passes, the old tests still pass, and the icon, text and counts are right on the live page.

**If it does not work**
Keep the failing fixture and test. Narrow the change in `selectors.js` until the test passes. jsdom has no layout, so checks that depend on position (`geometry`, row neighbors) must be verified in Chrome.

## Regenerate the documentation screenshots

**Purpose**
Rebuild the images in `docs/images/` (`feed-icon.png`, `panel-overview.png`, `card-detail.png`, `footer-export.png`, `activity.png`, `demo.gif`) from the real extension.

**Before you start**
- Python 3 with the `playwright` package and its Chromium build installed, and Pillow.
- A display (or xvfb). The script starts Chromium with `--headless=new`, which needs the usual Chromium system libraries.

**Steps**
1. From the repository root, run `python3 tools/screenshots/capture.py`.

**Expected result**
The script loads the working copy as an extension, serves `tools/screenshots/mock-feed.html` and `mock-activity.html` as `https://www.threads.com/` through request interception, prints each stack button with its `data-to-anchor` and `data-to-counts`, drives the real side panel, and lists the files it wrote. It needs no network.

**What to check**
- Open each image. The stack icon sits left of the pencil and "..." on every post, with one icon per Activity row.
- The panel shows folders, tags, notes and a counts line such as `@lin.bakes · 11/18/2026 | 2.3K | 132 | 58`.
- Each PNG is under 500 KB and `demo.gif` is under 3 MB.

**If it does not work**
The script stops with a message when no `button.to-save-btn` appears. The mock pages stand in for Threads. If you change how `src/content/selectors.js` finds posts, menu buttons, neighbors or counts, update the mock pages to match and rerun. Commit the new images with the change.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and every pull request. It does the following on `ubuntu-latest`:

1. Check out the code (`actions/checkout@v4`).
2. Set up Node 22 with the npm cache (`actions/setup-node@v4`).
3. Run `npm ci`.
4. Run `npm test`.

`npm ci` needs `package-lock.json`. Commit it when dependencies change.

## Make a release

**Purpose**
Publish a ZIP that users can install.

**Before you start**
- The `main` branch passes `npm test` and CI.
- The repository exists on GitHub and Actions is enabled. See [First-time publication to GitHub](#first-time-publication-to-github).
- You are on `main` with a clean working tree.

**Steps**
1. Choose the new version, for example `0.1.1`.
2. Edit `manifest.json` and set `"version"` to it.
3. Commit the change, for example `git commit -am "chore: release 0.1.1"`.
4. Run `git tag v0.1.1`. The tag must be `v` followed by the exact manifest version.
5. Run `git push` and then `git push --tags`.
6. Open the repository's **Actions** tab and wait for the **Release** workflow to finish.
7. Open the **Releases** page and confirm the new release has the file `threads-organizer-v0.1.1.zip`.

What `.github/workflows/release.yml` does when a tag starting with `v` is pushed:
1. Checks that `v` plus the `version` in `manifest.json` equals the tag name. If not, the workflow fails and no release is made.
2. Creates `threads-organizer-<tag>.zip` containing `manifest.json`, `src`, `docs`, `LICENSE` and `README.md` (so the README's links to `docs/` work). Tests are not included. It runs `npm ci && npm test` first and builds with `zip -X`, so a failing test stops the release.
3. Creates a GitHub Release for the tag with generated notes, and attaches the ZIP.

The workflow has `contents: write` permission so it can create the release.

**Expected result**
The Release page lists the ZIP. Extracting it gives `manifest.json` at the top level.

**If it does not work**
- The workflow fails at the first step: the tag and the manifest version differ. Delete the tag (`git tag -d vX.Y.Z` and `git push --delete origin vX.Y.Z`), fix `manifest.json`, commit, and tag again.
- No workflow ran: check that Actions is enabled and that the tag was pushed (`git ls-remote --tags origin`).

## First-time publication to GitHub

**Purpose**
Put the repository on GitHub and make the first release.

**Before you start**
- All work is committed on `main`.
- `npm test` passes.
- A GitHub account.

**Steps, with the GitHub CLI**
1. Run `gh auth status` and sign in with `gh auth login` if needed.
2. From the repository folder, run `gh repo create <name> --public --source=. --push`.

**Steps, with the website**
1. On github.com, create a new empty public repository. Do not add a README, license or `.gitignore`.
2. Run `git remote add origin <repository-url>`.
3. Run `git push -u origin main`.

**Then, for both methods**
1. Open **Settings** > **Actions** > **General** and confirm Actions are allowed.
2. Open the **Actions** tab and confirm the **CI** run for the first push is green.
3. Suggested: open **Settings** > **Branches** and add a protection rule for `main` that requires the **CI** check (job `test`) to pass before merging.
4. Complete the [checklist before the first public release](#checklist-before-the-first-public-release).
5. Confirm `manifest.json` has `"version": "0.1.0"`.
6. Run `git tag v0.1.0` and `git push --tags`.
7. Open the **Releases** page and confirm release `v0.1.0` has `threads-organizer-v0.1.0.zip`.

**Expected result**
The repository is public, CI is green, and the first release has the ZIP.

**If it does not work**
See the "If it does not work" part of [Make a release](#make-a-release).

## Checklist before the first public release

- [ ] `npm test` passes.
- [ ] CI is green on `main`.
- [ ] `LICENSE` is present and is MIT.
- [ ] `README.md` matches the code: install steps, permissions, privacy statement.
- [ ] `manifest.json` version matches the tag you will create.
- [ ] Manual check in Chrome with the unpacked extension (below).

Manual check, using the [user guide](user-guide.md):
- [ ] The extension loads at `chrome://extensions` with no error.
- [ ] Clicking the toolbar icon opens the side panel with the title **Threads Organizer | by Dr. Kangabu**.
- [ ] On a feed, a stack icon appears on posts. Tooltip: **Save & organize**.
- [ ] Clicking it saves the post. Tooltip: **Saved. Click to remove**. The post is in **To sort**.
- [ ] The card shows `@author · date | ♥ n | n | n`.
- [ ] A folder can be created, a post moved into it, and the folder deleted. The post returns to **To sort**.
- [ ] Tags and a note can be added and found with search, tag chips and author list.
- [ ] Removing a post that has a note, tags or a folder shows a confirmation.
- [ ] **Copy link**, **Copy text** and **Open** work.
- [ ] **Export MD** and **Export JSON** download files.
- [ ] **Import JSON** with the exported file reports 0 new and all already here. After removing a post, importing re-adds it.
- [ ] The same checks pass on a profile page, a post page and the Activity page.

## Commit conventions

Commit subjects use a type prefix, a colon and a short lower-case description. The history uses these types:

| Type | Use for |
| --- | --- |
| `feat:` | A new user-visible capability. |
| `fix:` | A bug fix, including selector fixes after Threads changes. |
| `style:` | Look and feel changes with no behavior change. |
| `refactor:` | Code changes with no behavior change. |
| `ci:` | Workflow changes. |
| `docs:` | Documentation changes. |

The history also uses `chore:` for scaffolding. Keep one logical change per commit.

## Privacy and permissions review checklist

Run this for every change that touches `manifest.json` or `src/`.

- [ ] `permissions` in `manifest.json` is still exactly `storage`, `sidePanel`, `unlimitedStorage`.
- [ ] `host_permissions` and content script `matches` are still only `https://*.threads.com/*` and `https://*.threads.net/*`.
- [ ] No network calls were added: no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, remote scripts, or remote images or fonts. Check with `grep -rnE 'fetch\(|XMLHttp|WebSocket|sendBeacon' src`.
- [ ] No `innerHTML`, `insertAdjacentHTML` or `eval` with page data. Page data is untrusted. Use `textContent` and DOM creation. Check with `grep -rnE 'innerHTML|insertAdjacentHTML|eval\(' src`.
- [ ] Data stays in `chrome.storage.local`.
- [ ] Imported data goes through `normalizePost`.
- [ ] `README.md` and the user guide still describe the permissions correctly.

## Known limitations

- Threads' markup is not controlled by this project. Detection can break when Threads changes it. Fix it as described in [Fix broken post detection](#fix-broken-post-detection-after-threads-changes-its-markup).
- The button is added to elements that contain a post link. A post nested inside, or containing, an element that already has a button does not get its own button.
- Saving is one post at a time. There is no bulk import and no auto-scroll import.
- Counts are snapshots of the last time the post was seen on Threads. They are refreshed only while a saved post is visible on a Threads page.
- The post text, author and date are copied at save time and are not refreshed.
- There is no sync between devices or browsers. Move data with Export JSON and Import JSON.
- Import never overwrites an existing post, so it cannot be used to update posts.
- The date filter uses the saved date, not the published date.
- Export covers the current view only.
- Detection of the "..." menu button relies on a built-in list of labels in some languages, three-dot icons, and a position fallback. Other interface languages can fall back to `geometry` or `none`.
- Saved image links (`media`) are stored in the data and in the JSON export, but the side panel does not display them.
- The side panel does not confirm **Remove** or folder deletion.
- The manifest declares no minimum Chrome version.
- The default group name **To sort** is fixed. It is not a folder and cannot be renamed or deleted.
