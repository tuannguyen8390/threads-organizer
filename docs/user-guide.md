# User guide

Threads Organizer | by Dr. Kangabu

This guide covers every task a user performs. Each procedure has the same parts: Purpose, Before you start, Steps, Expected result, and If it does not work. Problems are described in [troubleshooting.md](troubleshooting.md).

## Contents

- [Glossary](#glossary)
- [Install from a release ZIP](#install-from-a-release-zip)
- [Install from a clone](#install-from-a-clone)
- [Update to a new version](#update-to-a-new-version)
- [Open the side panel](#open-the-side-panel)
- [Save a post](#save-a-post)
- [Remove a saved post](#remove-a-saved-post)
- [Create and delete a folder](#create-and-delete-a-folder)
- [Move a post to a folder](#move-a-post-to-a-folder)
- [Add tags](#add-tags)
- [Add a note](#add-a-note)
- [Find posts](#find-posts)
- [Copy a link or text](#copy-a-link-or-text)
- [Export the current view](#export-the-current-view)
- [Restore from a JSON backup](#restore-from-a-json-backup)
- [Where data is stored and how to wipe it](#where-data-is-stored-and-how-to-wipe-it)
- [Permissions](#permissions)

## Glossary

| Term | Meaning |
| --- | --- |
| To sort | The default group. A saved post is in To sort until you move it to a folder. |
| Folder | A group you create. A post is in one folder at a time, or in To sort. |
| Tag | A short word you add to a post. A post can have many tags. Tags are stored in lower case without `#`. |
| Note | Free text you attach to a post. |
| Snapshot counts | The likes, replies and reposts numbers shown on a saved card. They are the numbers last seen on Threads, not live numbers. |
| Side panel | The Chrome panel that opens beside the page. It lists your saved posts. |
| Current view | The posts shown in the side panel after search and filters are applied. Export uses the current view. |

The engagement line on a card has this form:

`@author · date | ♥ n | n | n`

The three numbers are likes, replies and reposts. The date is the date the post was published on Threads. If that date is not known, it is the date you saved the post. The numbers are refreshed each time the post is seen on Threads while the extension is active. Posts saved by an older version have no numbers until you view them on Threads again.

## Install from a release ZIP

**Purpose**
Install the extension from a downloaded release.

**Before you start**
- Chrome on a desktop computer.
- Access to the repository's **Releases** page.

**Steps**
1. Open the repository's **Releases** page.
2. Download the file `threads-organizer-vX.Y.Z.zip` from the newest release.
3. Create a new empty folder where it can stay permanently, for example `Documents/threads-organizer`.
4. Extract the ZIP into that folder. The file `manifest.json` must be directly inside the folder.
5. Open `chrome://extensions` in Chrome.
6. Turn on **Developer mode** (top right).
7. Click **Load unpacked**.
8. Select the folder that contains `manifest.json`.
9. Click the puzzle-piece icon in the Chrome toolbar and pin **Threads Organizer | by Dr. Kangabu**.

**Expected result**
The extension appears on the `chrome://extensions` page with no error. Its icon is in the toolbar.

**If it does not work**
See [Extension errors page](troubleshooting.md#extension-errors-page).

Note: Chrome reads the extension from the folder each time it starts. Do not delete or move the folder.

## Install from a clone

**Purpose**
Install the extension from the source repository.

**Before you start**
- Chrome on a desktop computer.
- Git installed.

**Steps**
1. Open a terminal.
2. Run `git clone <repository-url>`.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select the cloned folder (the one that contains `manifest.json`).
7. Pin the extension from the puzzle-piece menu.

**Expected result**
The extension is listed and enabled. No build step or `npm install` is needed to use it.

**If it does not work**
See [Extension errors page](troubleshooting.md#extension-errors-page).

## Update to a new version

**Purpose**
Replace the installed files with a newer release without losing saved posts.

**Before you start**
- The extension is installed as an unpacked extension from a folder.
- Optional but recommended: make a backup with [Export JSON](#export-the-current-view). Set the view to All first.
- Keep using the same folder path. Chrome ties the stored data of an unpacked extension to the extension entry. If you load the files from a different folder, Chrome may create a new entry with empty storage. Restore from your JSON backup in that case.

**Steps**
1. Download the new release ZIP.
2. Open the folder you used to install the extension.
3. Delete the old contents of that folder.
4. Extract the new ZIP into the same folder.
5. Open `chrome://extensions`.
6. Find the **Threads Organizer | by Dr. Kangabu** card and click its reload icon (circular arrow).
7. Refresh every open Threads tab.

If you installed from a clone, run `git pull` instead of steps 1 to 4, then continue at step 5.

**Expected result**
The version number on the extension card matches the new release. Saved posts are still listed in the side panel.

**If it does not work**
See [Extension context invalidated](troubleshooting.md#extension-context-invalidated-or-nothing-happens-after-reloading) and [Extension errors page](troubleshooting.md#extension-errors-page).

## Open the side panel

**Purpose**
Show the list of saved posts.

**Before you start**
- The extension is installed and pinned.

**Steps**
1. Click the extension icon in the Chrome toolbar.

**Expected result**
The side panel opens beside the page with the title **Threads Organizer | by Dr. Kangabu**. It has a search box, folder chips, tag chips, an author list, **From** and **To** date fields, the post cards, and a footer with **Share or back up**.

**If it does not work**
See [Side panel does not open](troubleshooting.md#side-panel-does-not-open).

## Save a post

**Purpose**
Add a Threads post to your collection.

**Before you start**
- The extension is installed.
- You are on threads.com or threads.net (feed, profile, post page or Activity).
- Saving is one post at a time. There is no bulk import.

**Steps**
1. Find the post.
2. Locate the stack-of-cards icon button on the post, to the left of the post's "..." menu.
3. Hover the button. The tooltip reads **Save & organize**.
4. Click the button.

**Expected result**
The icon turns blue and its top card is filled. The tooltip now reads **Saved. Click to remove**. The post appears in the side panel under **To sort**, with its author, date, text and counts.

**If it does not work**
- No icon: see [No stack icon on posts](troubleshooting.md#no-stack-icon-on-posts).
- Icon in the wrong place: see [Icon in the wrong place or overlapping](troubleshooting.md#icon-in-the-wrong-place-or-overlapping).
- The icon turns red and the tooltip reads **Couldn't save this post**: refresh the tab and try again. See [Extension context invalidated](troubleshooting.md#extension-context-invalidated-or-nothing-happens-after-reloading).

Notes:
- Saving a post that is already saved never overwrites it.
- The text, author and date are copied when you save. They do not change later. Only the counts are refreshed.

## Remove a saved post

**Purpose**
Delete a post from your collection.

**Before you start**
- The post is saved.

**Steps, from the Threads page**
1. Click the blue stack icon on the post. Its tooltip reads **Saved. Click to remove**.
2. If a dialog asks **Remove this post and its note/tags/folder?**, click **OK** to remove or **Cancel** to keep it.

The dialog appears only when the post has a note, tags or a folder. A post with none of these is removed at once.

**Steps, from the side panel**
1. Find the card.
2. Click **Remove** on the card.

The side panel does not ask for confirmation.

**Expected result**
The card disappears from the side panel. The icon on the Threads post returns to the grey **Save & organize** state.

**If it does not work**
Refresh the Threads tab. See [Extension context invalidated](troubleshooting.md#extension-context-invalidated-or-nothing-happens-after-reloading).

## Create and delete a folder

**Purpose**
Group saved posts.

**Before you start**
- The side panel is open.

**Steps to create**
1. Click the **New folder** field.
2. Type a name.
3. Click **Add**.

**Steps to delete**
1. Click the folder's chip so it is the active chip. A **×** appears on it.
2. Click the **×** (tooltip: **Delete folder (posts move back to To sort)**).

**Expected result**
- Create: the folder chip appears and becomes the active view.
- Delete: the folder chip disappears. Its posts move back to **To sort**. The posts themselves are not deleted. There is no confirmation dialog.

**If it does not work**
Close and reopen the side panel. If the problem remains, see [How to collect a bug report](troubleshooting.md#how-to-collect-a-bug-report).

Note: an empty name is ignored.

## Move a post to a folder

**Purpose**
File a post in a folder, or return it to To sort.

**Before you start**
- At least one folder exists, if you want to move a post into a folder.

**Steps**
1. Find the card in the side panel.
2. Open the folder dropdown on the card. Its first option is **To sort**.
3. Choose a folder.

**Expected result**
The post is stored in that folder. It shows under that folder's chip. If you are viewing a different folder, the card leaves the current view.

**If it does not work**
Make sure the folder exists as a chip. See [Create and delete a folder](#create-and-delete-a-folder).

## Add tags

**Purpose**
Label a post so you can filter by the label.

**Before you start**
- The post is saved.

**Steps**
1. Click the tags field on the card (placeholder **tags, comma separated**).
2. Type tags separated by commas, for example `ai, reading list`.
3. Click outside the field or press Tab.

**Expected result**
The tags are saved. A chip such as `#ai 1` appears in the tag row. The number is how many posts carry the tag. Tags are converted to lower case, a leading `#` is removed, and duplicates are dropped.

**If it does not work**
Tags are saved when you leave the field. If the tags are missing after you leave the field, see [How to collect a bug report](troubleshooting.md#how-to-collect-a-bug-report).

## Add a note

**Purpose**
Record why a post matters.

**Before you start**
- The post is saved.

**Steps**
1. Click the note field on the card (placeholder **Why does this matter?**).
2. Type the note.
3. Click outside the field.

**Expected result**
The note is saved with the post. Search also looks inside notes.

**If it does not work**
The note is saved when you leave the field. Click elsewhere in the panel and reopen the card to check.

## Find posts

**Purpose**
Narrow the list to the posts you need.

**Before you start**
- The side panel is open and has saved posts.

**Steps**
1. To search by words, type in the search box (placeholder **Search posts, authors, notes, tags**). Every word you type must match somewhere in the post text, author, note or tags. Case does not matter.
2. To filter by folder, click a folder chip. **All** shows everything and clears any tag filter. **To sort** shows posts without a folder.
3. To filter by tag, click a tag chip. Click it again to clear it.
4. To filter by author, open the author list (default **All authors**) and choose an author.
5. To filter by date, set **From**, **To**, or both. The dates are compared with the day you saved the post, not the day it was published. Both days are included.

Filters combine. A post must pass all of them.

**Expected result**
Only matching cards are shown, newest saved first. If nothing matches, the panel shows an empty-state message.

**If it does not work**
Clear the search box, click **All**, set the author list to **All authors**, and clear both dates.

## Copy a link or text

**Purpose**
Copy a saved post's URL or text to the clipboard.

**Before you start**
- The side panel is open.

**Steps**
1. Find the card.
2. Click **Copy link** to copy the post URL, or **Copy text** to copy the saved text.

Other card buttons: **Open** opens the post in a new tab. **Remove** deletes the post.

**Expected result**
The status line at the top of the panel reads **Copy link: copied** or **Copy text: copied**.

**If it does not work**
If the status line reads **copy failed**, click inside the panel and try again. The copy is done by Chrome's clipboard and can be refused.

## Export the current view

**Purpose**
Create a Markdown or JSON file of the posts you see.

**Before you start**
- The side panel is open.
- Set the search and filters so the view shows exactly the posts you want. To export everything, click **All**, clear the search box, set the author list to **All authors**, and clear both dates.

**Steps**
1. In the footer, find **Share or back up**.
2. Click **Export MD** for a Markdown file, or **Export JSON** for a JSON file.
3. Save the downloaded file where you want it.

**Expected result**
Chrome downloads `threads-export.md` or `threads-export.json`.

- The Markdown file has one section per folder (posts without a folder are under To sort). Each post lists author, date, quoted text, link, engagement line, tags and note.
- The JSON file holds the posts and the folders those posts use. Use JSON for backups.

**If it does not work**
See [Export and import problems](troubleshooting.md#export-and-import-problems).

## Restore from a JSON backup

**Purpose**
Bring posts from a JSON export into this browser. Use it to restore a backup or move data to another computer.

**Before you start**
- A JSON file made with **Export JSON**.
- The side panel is open.

**Steps**
1. In the footer, click **Import JSON**.
2. Choose the `.json` file.
3. Read the status line.

**Expected result**
The status line reads **Imported N new, M already here**.

What is kept:
- Posts whose ID is not already saved are added with their folder, tags, note and counts.
- Posts whose ID is already saved are left as they are. Import never overwrites an existing post, so notes or tags you changed here are kept.
- Folders in the file are added if their ID does not exist here. Existing folders are not renamed.
- A post whose folder is not available is placed in To sort.
- Posts in the file that are malformed are skipped without a message. The URL of each imported post is normalized to a threads.com link.

**If it does not work**
If the status line reads **Not a Threads Organizer export**, see [Export and import problems](troubleshooting.md#export-and-import-problems).

## Where data is stored and how to wipe it

**Purpose**
Know where your data is and remove it when you want to.

**Where data is stored**
- Saved posts, folders, tags and notes are in `chrome.storage.local` in your Chrome profile on this computer.
- Each saved post and each folder is stored as its own item (`tops:post:...` and `tops:folder:...`). If you used an earlier version, the extension moves your saved posts to this layout automatically the first time it runs, without changing them.
- The extension makes no network requests. Nothing is sent to a server.
- Exports (Markdown and JSON) include your private notes, tags and folder names. Check a file before you share it.
- Nothing syncs between devices. Use Export JSON and Import JSON to move data.

**Steps to remove individual data**
1. To remove a post, follow [Remove a saved post](#remove-a-saved-post).
2. To remove a folder, follow [Create and delete a folder](#create-and-delete-a-folder). This does not delete its posts.

**Steps to remove all data**
1. Optional: make a backup with **Export JSON**.
2. Open `chrome://extensions`.
3. Find the **Threads Organizer | by Dr. Kangabu** card and click **Remove**.
4. Confirm.

**Expected result**
Chrome deletes the extension's storage together with the extension. The extension has no separate **delete all** button. Exported files that you saved are not affected. Delete them yourself if needed.

**If it does not work**
Reload `chrome://extensions` and check that the card is gone.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Keep saved posts in `chrome.storage.local`. |
| `sidePanel` | Show the side panel. |
| `unlimitedStorage` | Remove Chrome's storage size limit for the extension. |
| Host access to `*.threads.com` and `*.threads.net` | Add the button to posts and read the post on those two sites. No other site is accessed. |

Chrome version: the extension uses the side panel API (`chrome.sidePanel.setPanelBehavior`). Use a current Chrome release. The manifest does not declare a minimum version.
