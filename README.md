# Threads Organizer

Save, organize and share your Threads posts. Everything stays on your device.

## Install (no tooling needed)

1. Download the latest ZIP from the repo's **Releases** page (or `git clone` the repo) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.
4. Pin the extension. Click its icon to open the side panel.

## Use

- Click **Save** on any post on threads.com.
- To import everything you've already saved: click **Import saved…** in the panel, then **Import all saved posts** on the page that opens.
- Organize with folders, tags and notes. Search across everything. Copy link/text, or export a view as Markdown or JSON. JSON import moves data between machines.

## Privacy

No servers, no accounts, no network requests. Data lives in `chrome.storage.local`.

## Develop

`npm install`, `npm test`. No build step. Edit, then click reload on `chrome://extensions`.

## If posts stop saving

Threads changes its markup. Fix `src/content/selectors.js` (the only file that knows Threads' DOM) and update the fixture test.

## Releasing

Bump `version` in `manifest.json`, then `git tag vX.Y.Z && git push --tags`. The workflow publishes the ZIP.

## License

MIT.
