# Troubleshooting

Threads Organizer | by Dr. Kangabu

Find your symptom in the table. Open its entry and run the checks in order. Stop at the first check that fixes the problem. For installation and daily use, see the [user guide](user-guide.md).

## Symptoms

| Symptom | Entry |
| --- | --- |
| No stack icon on posts | [No stack icon on posts](#no-stack-icon-on-posts) |
| Icon is in the wrong place or overlaps something | [Icon in the wrong place or overlapping](#icon-in-the-wrong-place-or-overlapping) |
| Two icons on one row | [Two icons on one row](#two-icons-on-one-row) |
| Counts are missing or zero | [Counts missing or zero](#counts-missing-or-zero) |
| Saved post has wrong or extra text | [Wrong or extra text in a saved post](#wrong-or-extra-text-in-a-saved-post) |
| Side panel does not open | [Side panel does not open](#side-panel-does-not-open) |
| Nothing happens after reloading the extension, or "Extension context invalidated" | [Extension context invalidated or nothing happens after reloading](#extension-context-invalidated-or-nothing-happens-after-reloading) |
| Export or import fails | [Export and import problems](#export-and-import-problems) |
| Errors on the extension card | [Extension errors page](#extension-errors-page) |
| You need to report a bug | [How to collect a bug report](#how-to-collect-a-bug-report) |

## How to read the diagnostic attributes

The icon button carries two attributes that describe what the extension found. To read them:

1. Right-click the stack icon on a post.
2. Click **Inspect**.
3. In the Elements panel, the `<button class="to-save-btn ...">` element is highlighted. Read its attributes.

| Attribute | Values | Meaning |
| --- | --- | --- |
| `data-to-anchor` | `label` | The post's "..." menu button was found by its accessible label (for example "More"). |
| | `dots` | It was found by an icon drawing three dots. |
| | `geometry` | It was found by position: the right-most small button near the top of the post. |
| | `none` | It was not found. The icon uses a default position near the top right of the post. |
| `data-to-counts` | `likes/replies/reposts`, for example `219/2/1` | The counts read from the post. |
| | `none` | No like, reply and repost icons were found, so no counts are stored. |

The button also has `data-to-btn`, which is the post ID. The post element holds `data-to-id` with the same ID.

## No stack icon on posts

**Checks, in order**
1. Confirm the address starts with `threads.com` or `threads.net`. The extension works on no other site.
2. Open `chrome://extensions`. Confirm the extension is on and has no **Errors** button. See [Extension errors page](#extension-errors-page).
3. Refresh the Threads tab. A tab that was open before you installed or reloaded the extension has no icons until it is refreshed.
4. Scroll a little. Icons are added shortly after posts appear.
5. Check that the item is a post. The button is added to items that contain a link of the form `/@name/post/ID`. Other items do not get one.
6. Open DevTools (F12) > **Console**. Look for lines that start with `[Threads Organizer]`.
7. If the icon is still missing, Threads probably changed its page structure. Send a bug report with the steps in [How to collect a bug report](#how-to-collect-a-bug-report).

## Icon in the wrong place or overlapping

**Checks, in order**
1. Refresh the tab and resize the window slightly. The icon is placed again on resize.
2. Right-click the icon > **Inspect**. Read `data-to-anchor` using the table above.
3. If the value is `none`, the extension could not find the "..." button and used a default position. Send a bug report.
4. If the value is `geometry` or `dots`, the placement is a best guess. If the icon overlaps another control, send a bug report.
5. If the value is `label` and the icon is still wrong, send a bug report.

**What to send**
- The page type (feed, profile, post page or Activity).
- The value of `data-to-anchor`.
- A screenshot that shows the icon and the post's "..." menu.
- The Chrome and extension versions, and the language of the Threads interface.

## Two icons on one row

The extension removes extra icons on each scan and does not add an icon to a post that is nested in, or contains, a post that already has one. Two icons can appear on the same row when Threads shows one post as two separate elements.

**Checks, in order**
1. Refresh the tab. The extension removes stray icons when it scans.
2. Wait a second after scrolling and check again.
3. Right-click each icon > **Inspect**. Note the `data-to-btn` value of both. If they are the same, send a bug report. Both icons then belong to one post.
4. Note the page type. Notification rows on Activity are the usual case.
5. Send a bug report with a screenshot and both `data-to-btn` values.

## Counts missing or zero

**Checks, in order**
1. Right-click the icon > **Inspect**. Read `data-to-counts`.
2. If it is `none`, the extension could not find the like, reply and repost icons. No counts are stored for that post. Send a bug report.
3. If it is `0/0/0` and the post has engagement, the icons were found but the numbers were not read. Send a bug report.
4. If the values are right on Threads but the saved card shows none, view the post on Threads again. The extension updates a saved post's counts each time it sees the post. Posts saved by an older version fill in this way.
5. Remember that counts are a snapshot taken the last time the post was seen. They do not update while the post is off screen. Hover the numbers in the panel: the tooltip reads **Counts when last seen on Threads**.

## Wrong or extra text in a saved post

The saved text is taken from the post's text blocks at the moment you click save. The extension leaves out the time label, "Translate" labels in several languages, and page markers such as `1/2`. Other interface text can still be captured when Threads changes its markup.

**Checks, in order**
1. Open the post on Threads and compare it with the card. Text is copied once at save time and is not edited later.
2. If the text is wrong, remove the post and save it again. See the [user guide](user-guide.md#remove-a-saved-post).
3. If the new save is still wrong, collect the post's HTML with the snippet in [How to collect a bug report](#how-to-collect-a-bug-report) and send it with the expected text.

The extension does not edit saved text. Use the note field for your own comments.

## Side panel does not open

**Checks, in order**
1. Click the extension icon in the Chrome toolbar. If you cannot see it, click the puzzle-piece icon and pin the extension.
2. Open `chrome://extensions`. Confirm the extension is on.
3. Click the reload icon on the extension card and click the toolbar icon again.
4. Open `chrome://version` and read the Chrome version. The side panel needs a Chrome release that has the `chrome.sidePanel` API. If Chrome is old, update it.
5. On the extension card, click **service worker** (or **Errors**) and read the messages. A message that starts with an error from `chrome.sidePanel.setPanelBehavior` points to an unsupported Chrome.
6. If the problem remains, send a bug report.

## Extension context invalidated or nothing happens after reloading

When you reload or update the extension, Threads tabs that were already open keep the old copy of the script. That copy can no longer reach the extension. The console shows **Extension context invalidated**. Clicking the icon either does nothing or turns it red with the tooltip **Couldn't save this post**.

**Checks, in order**
1. Refresh every Threads tab.
2. Click the icon again.
3. If it still fails, open `chrome://extensions` and check for errors. See [Extension errors page](#extension-errors-page).
4. If it still fails, close the tab, open Threads in a new tab, and try again.

## Export and import problems

**Export checks, in order**
1. Export saves the current view only. If the file has fewer posts than you expect, click **All**, clear the search box, set the author list to **All authors**, clear **From** and **To**, and export again.
2. If no download starts, check Chrome's download settings and the downloads bar.
3. Look for `threads-export.md` or `threads-export.json` in your download folder. Chrome may add a number to the name.

**Import checks, in order**

Import reads a JSON file made by **Export JSON**. The status line shows **Not a Threads Organizer export** when the file is rejected. The rules in `src/lib/exporter.js` and `src/lib/post.js` are:

| Condition | Result |
| --- | --- |
| The file is not valid JSON | Rejected |
| The top level is not an object with a `posts` list | Rejected |
| `posts` has entries but none is usable | Rejected |
| `posts` is an empty list | Accepted. Nothing is added. |
| A post is not an object | Skipped |
| A post has no `id` text or no `url` text | Skipped |
| A post `url` is not a Threads post link of the form `/@name/post/ID` | Skipped |
| A post has wrong-typed optional fields | The field is replaced by an empty or default value |
| A post `counts` value has a missing, negative or non-numeric number | The counts are dropped and the post is kept |
| A post `id` already exists in the extension | Not added and not changed. Counted as already here |
| A folder has no `id` text or no `name` text | Skipped |
| A post refers to a folder that does not exist | The post goes to To sort |

Steps:
1. Confirm the file came from **Export JSON**, not **Export MD**. Markdown cannot be imported.
2. Open the file in a text editor. It must start with `{` and contain `"posts": [`.
3. If the file was edited by hand, check commas and quotes.
4. If the status line says **Imported 0 new, N already here**, the posts are already saved. Existing posts are never overwritten.
5. If posts were skipped, check that each has a `url` such as `https://www.threads.com/@name/post/ID` and a text `id`.

## Extension errors page

**Checks, in order**
1. Open `chrome://extensions`.
2. If the extension card shows **Errors**, click it. Read the message and the file name.
3. Click **Clear all**, refresh the Threads tab, and repeat the action that failed. Check whether the error returns.
4. Click the reload icon on the card and refresh the Threads tab.
5. If the error returns, copy its text and the file name into a bug report.
6. If the card shows a manifest error when you load the folder, the folder is wrong. Select the folder that directly contains `manifest.json`.

## How to collect a bug report

Collect these items before you open an issue. Use the issue template in `.github/ISSUE_TEMPLATE/bug_report.md`.

1. **Chrome version.** Open `chrome://version` and copy the first line.
2. **Extension version.** Open `chrome://extensions` and read the version on the extension card. It equals `version` in `manifest.json`.
3. **Page type.** Feed, profile, post page, or Activity.
4. **What happened and what you expected.**
5. **Diagnostic attributes.** Right-click the icon > **Inspect**. Copy `data-to-anchor` and `data-to-counts`.
6. **Screenshot.** Include the icon and the post's "..." menu.
7. **Post markup (optional).** Run this in DevTools > **Console** on the Threads page:

   ```js
   copy(document.querySelector('a[href*="/post/"]').closest('div').parentElement.parentElement.outerHTML)
   ```

   The command copies the HTML around the first post link on the page to the clipboard. Paste it into a text file.
   - It captures the first post on the page. Scroll so the post you want is the first one, or reload the page on that post's own address.
   - If the copy is too small to show the whole post, add another `.parentElement` before `.outerHTML`.
   - The copy can contain your name, other people's names, post text, image links and IDs. Remove or replace all of them before you share it.
   - If you are unsure, skip the markup and send the other items.
