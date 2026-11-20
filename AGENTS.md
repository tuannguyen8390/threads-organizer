# AGENTS.md

Guidance for AI agents (coding assistants and chat assistants) working in this repository or helping someone use it. Humans: see [README.md](README.md) and [docs/](docs/).

**Threads Organizer | by Dr. Kangabu** is a Chrome (Manifest V3) extension. It adds a stack-of-cards button to posts on threads.com and threads.net. Saved posts live in a side panel where the user sorts them into folders (default group: **To sort**), tags them, adds notes, searches, and exports Markdown or JSON. Plain ES modules, no build step, no runtime dependencies.

## Rules that must not be broken

1. **No new permissions or hosts.** `manifest.json` allows exactly `storage`, `sidePanel`, `unlimitedStorage`, with host access to `*.threads.com` and `*.threads.net` only.
2. **No network calls** from extension code (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, remote scripts, fonts or images). The only outside link is the "Dr. Kangabu" credit, which the user must click.
3. **No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`** or `javascript:` URLs with any data from Threads pages, imported files, or the user. Use `textContent` and DOM APIs.
4. **Only `src/content/selectors.js` may know Threads' markup.** If Threads changes its page, fix that file and add a fixture test. Do not scatter selectors elsewhere.
5. **Storage layout is a contract.** One key per item: `tops:post:<id>`, `tops:folder:<id>`, `tops:counts:<id>`, plus `tops:legacy-backup`. Any change needs a migration that cannot lose data, with tests. Never go back to a single whole-library key.
6. **Saving is one post at a time.** Bulk import of saved posts was built and removed on purpose. Do not re-add it. JSON import (restore from a backup file) is a different feature and stays.
7. **No real people's data** in tests, fixtures, docs, screenshots or commit messages. Use fictional handles and text.
8. **Do not push, tag, publish a release, change repository visibility, or rewrite git history** unless the user explicitly asks in this conversation. Do not commit `.superpowers/`, `node_modules/` or `*.zip`.

## Commands

| Task | Command |
|---|---|
| Install dev dependencies (jsdom only; Node 22 or newer) | `npm install` |
| Run all tests | `npm test` |
| Syntax-check one file | `node --check src/panel/panel.js` |
| Regenerate documentation screenshots (optional; needs Python 3, Playwright and its Chromium) | `python3 tools/screenshots/capture.py` |

Run the full suite before every commit. Write the failing test first, watch it fail, then make it pass. Do not weaken or delete a test to get green.

## Project map

| Path | Role |
|---|---|
| `manifest.json` | Extension manifest (name, permissions, content script, side panel) |
| `src/background.js` | Opens the side panel when the toolbar icon is clicked |
| `src/content/loader.js` | Classic content script that dynamically imports `main.js` |
| `src/content/main.js` | Adds and positions the save button, toggles save and remove, refreshes counts |
| `src/content/selectors.js` | **The only file that knows Threads' DOM**: post detection, text, counts, menu button, neighbours |
| `src/content/content.css` | Styles for the injected button, hardened against Threads' own CSS |
| `src/lib/store.js` | Storage layer (per-item keys, migration, write queue) |
| `src/lib/post.js`, `search.js`, `exporter.js`, `format.js` | Post normalization, filtering, Markdown/JSON export and import, number formatting |
| `src/panel/` | Side panel UI (`panel.html`, `panel.css`, `panel.js`) |
| `tests/` | `node --test` suites; `tests/fixtures/` holds synthetic HTML |
| `tools/screenshots/` | Mock Threads pages and the script that photographs the real extension |
| `docs/` | User guide, troubleshooting, maintainer guide |

## Pitfalls already hit (do not repeat)

- `JSON.stringify([undefined])` gives `[null]`. A cache key built that way made the "All" and "To sort" chips look identical, so the highlight never moved. Use explicit sentinels.
- Threads' CSS restyles plain buttons in some panels. The save button's rules use doubled-class selectors and `!important` for that reason.
- React can re-render a post and drop the injected button. The button is re-added whenever it is missing, and its post id is re-checked.
- A notification row links to the same post several times (avatar, text, thumbnail). Candidates are collapsed to one host per row.
- Posts embedded inside other posts (quotes, context) are not separate saves.
- A `MutationObserver` that writes DOM can loop. It observes child lists only, and style writes are safe.
- Maps returned by the store have no prototype. Use `Object.hasOwn` or `in`, not `obj.hasOwnProperty`.
- Never let a count refresh share a storage key with notes or tags, or it can overwrite a user's edit.

## Helping a user install the extension

There is no Chrome Web Store listing. People install it by loading the folder as an unpacked extension. You cannot click Chrome's interface for them; guide them through it.

1. **Get the files.** Once a release exists, download `threads-organizer-vX.Y.Z.zip` from the repository's Releases page and unzip it into a folder the user will keep, or run `git clone` on the repository. Check that `manifest.json` is directly inside the chosen folder, not one level deeper. Ask before downloading or writing anything on the user's machine.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the folder that contains `manifest.json`.
5. The card **Threads Organizer | by Dr. Kangabu** appears. If it shows an **Errors** button, read the message and see [docs/troubleshooting.md](docs/troubleshooting.md).
6. Pin it from the puzzle-piece menu, then open threads.com and refresh the page. A stack icon appears beside the "…" on posts. Click the toolbar icon to open the side panel.

Tell the user: Chrome loads the extension from that folder, so moving or deleting the folder breaks it. To update, replace the folder's contents, click the reload icon on the extension card, and refresh Threads tabs. Before updating or removing, suggest **Export JSON** in the panel footer as a backup. Full procedures are in [docs/user-guide.md](docs/user-guide.md).

## Testing the extension in a browser (for agents with browser automation)

`tools/screenshots/capture.py` is a working example: launch Chromium with `--disable-extensions-except=<repo>` and `--load-extension=<repo>`, read the extension id from the service worker URL, serve a mock page as `https://www.threads.com/` through request interception so the content script injects, and open `chrome-extension://<id>/src/panel/panel.html` in a tab to exercise the panel. Each save button carries `data-to-anchor` (`none`, `label`, `dots`, `geometry`: how the "…" menu was found) and `data-to-counts` (`none` or `likes/replies/reposts`) for debugging.

## Where things are documented

- Install, use, back up, remove: [docs/user-guide.md](docs/user-guide.md)
- Something is wrong: [docs/troubleshooting.md](docs/troubleshooting.md)
- Develop, fix selectors, release, publish, limitations: [docs/maintainer-guide.md](docs/maintainer-guide.md)
- Commit prefixes in use: `feat:`, `fix:`, `style:`, `refactor:`, `ci:`, `docs:`, `chore:`
