#!/usr/bin/env python3
"""Regenerate the documentation screenshots and demo GIF in docs/images/.

Runs the REAL extension (repo root) in Playwright's Chromium against the mock pages in this
folder. The pages are served at https://www.threads.com/ through request interception, so the
manifest's content script is injected normally. No network is needed.

Usage: python3 tools/screenshots/capture.py   (needs Python 3, playwright + its Chromium, Pillow, a display)
"""
import io, os, pathlib, shutil, sys, tempfile

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = REPO / "docs" / "images"
FEED = (HERE / "mock-feed.html").read_text(encoding="utf-8")
ACTIVITY = (HERE / "mock-activity.html").read_text(encoding="utf-8")
FEED_VP = {"width": 700, "height": 900}
PANEL_VP = {"width": 420, "height": 900}
written = []


def fail(msg):
    print(f"\nFAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def img(png_bytes):
    return Image.open(io.BytesIO(png_bytes)).convert("RGB")


def save_png(im, name, max_w=1000, limit=500_000):
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    path = OUT / name
    im.save(path, optimize=True)
    if path.stat().st_size > limit:
        im.quantize(256, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)
    written.append((name, path.stat().st_size))
    return im


def font(size, bold=False):
    names = ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"] if bold else ["DejaVuSans.ttf"]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def stack(top, bottom, label_a, label_b):
    pad, bar = 12, 26
    w = max(top.width, bottom.width)
    im = Image.new("RGB", (w, top.height + bottom.height + 2 * bar + 3 * pad), "#ffffff")
    d = ImageDraw.Draw(im)
    f = font(22, True)
    d.text((pad, pad // 2), label_a, fill="#555", font=f)
    im.paste(top, (0, bar + pad // 2))
    y = bar + pad // 2 + top.height + pad
    d.text((pad, y), label_b, fill="#0a7cff", font=f)
    im.paste(bottom, (0, y + bar))
    return im


def frame(feed_im, panel_im, caption, width=1000, gap=16):
    """Side-by-side storyboard frame: feed on the left, panel on the right, caption bar under."""
    h = 820
    fi = feed_im.resize((round(feed_im.width * h / feed_im.height), h), Image.LANCZOS)
    pi = panel_im.resize((round(panel_im.width * h / panel_im.height), h), Image.LANCZOS)
    total = fi.width + pi.width + gap
    sc = width / total
    if sc < 1:
        fi = fi.resize((round(fi.width * sc), round(h * sc)), Image.LANCZOS)
        pi = pi.resize((round(pi.width * sc), round(h * sc)), Image.LANCZOS)
    bar = 56
    im = Image.new("RGB", (width, fi.height + bar), "#ffffff")
    x = (width - (fi.width + pi.width + gap)) // 2
    im.paste(fi, (x, 0))
    im.paste(pi, (x + fi.width + gap, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, fi.height, width, fi.height + bar], fill="#101012")
    f = font(24, True)
    tw = d.textlength(caption, font=f)
    d.text(((width - tw) / 2, fi.height + 14), caption, fill="#ffffff", font=f)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scratch = pathlib.Path(os.environ.get("TO_SCRATCH") or tempfile.gettempdir())
    profile = tempfile.mkdtemp(prefix="to-profile-", dir=scratch)
    try:
        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(
                profile, headless=False, viewport=FEED_VP, device_scale_factor=2, locale="en-US",
                timezone_id="UTC", color_scheme="light",
                args=["--headless=new", f"--disable-extensions-except={REPO}", f"--load-extension={REPO}",
                      "--no-first-run", "--no-default-browser-check"])
            run(ctx)
            ctx.close()
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    print("\nWrote:")
    for name, size in written:
        print(f"  docs/images/{name}  {size/1024:.0f} KB")


def run(ctx):
    def handler(route):
        path = route.request.url.split("threads.com", 1)[1].split("?", 1)[0]
        if path.startswith("/activity"):
            return route.fulfill(status=200, content_type="text/html; charset=utf-8", body=ACTIVITY)
        if path in ("/", ""):
            return route.fulfill(status=200, content_type="text/html; charset=utf-8", body=FEED)
        return route.fulfill(status=404, body="")

    ctx.route("https://www.threads.com/**", handler)
    ctx.on("dialog", lambda d: d.accept())

    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker", timeout=15000)
    ext_id = sw.url.split("/")[2]
    print(f"extension id: {ext_id}")

    feed = ctx.new_page()
    feed.goto("https://www.threads.com/")
    try:
        feed.wait_for_selector("button.to-save-btn", timeout=10000)
    except Exception:
        fail("no button.to-save-btn appeared on the mock feed. The content script did not inject or "
             "selectors.js no longer recognises the mock markup (data-pressable-container, a[href*='/post/'], "
             "aria-label=More). Check chrome://extensions load errors and update tools/screenshots/mock-feed.html.")
    feed.wait_for_timeout(800)
    btns = feed.query_selector_all("button.to-save-btn")
    print(f"stack buttons on feed: {len(btns)}")
    for b in btns:
        print(f"  {b.get_attribute('data-to-btn')}: anchor={b.get_attribute('data-to-anchor')} "
              f"counts={b.get_attribute('data-to-counts')}")
    if len(btns) != 6:
        print(f"  WARNING: expected 6 buttons, found {len(btns)}")

    def header_clip(i):
        post = feed.query_selector_all("[data-pressable-container]")[i]
        r = post.bounding_box()
        return {"x": r["x"], "y": r["y"], "width": r["width"], "height": 68}

    def shot_header(i):
        feed.mouse.move(5, 5)
        return img(feed.screenshot(clip=header_clip(i)))

    def feed_shot():
        feed.mouse.move(5, 5)
        feed.wait_for_timeout(250)
        return img(feed.screenshot())

    def click_btn(i):
        feed.query_selector_all("button.to-save-btn")[i].click()
        feed.wait_for_timeout(500)

    panel = ctx.new_page()
    panel.set_viewport_size(PANEL_VP)
    panel.goto(f"chrome-extension://{ext_id}/src/panel/panel.html")
    panel.wait_for_selector("#posts")
    panel.wait_for_timeout(300)

    def panel_shot(full=False):
        panel.wait_for_timeout(250)
        return img(panel.screenshot(full_page=full))

    frames = []
    feed.bring_to_front()
    before_feed = feed_shot()
    before_panel = panel_shot()
    frames.append(("1. Click the stack icon on any post", before_feed, before_panel))

    # Before/after of the same header.
    before = shot_header(0)
    save_png(before.copy(), "feed-icon.png")
    feed.query_selector_all("button.to-save-btn")[0].hover()
    click_btn(0)
    after = shot_header(0)
    combo = stack(before, after, "Before: not saved", "After: saved (blue)")
    save_png(combo, "feed-icon.png")
    for i in (2, 4, 5):
        click_btn(i)
    click_btn(1)
    click_btn(3)
    state = feed_shot()
    panel.bring_to_front()
    panel.wait_for_selector("article.card")
    frames.append(("2. It lands in To sort", state, panel_shot()))

    # Folders through the real UI.
    for name in ("Writing", "Recipes", "Travel"):
        panel.fill("#folder-name", name)
        panel.press("#folder-name", "Enter")
        panel.wait_for_timeout(300)
    panel.click("#folders .chip:has-text('All')")
    panel.wait_for_timeout(300)

    def card(text):
        return panel.locator("article.card", has_text=text)

    plan = [
        ("Draft one is the ugliest", "Writing", "writing, drafts", "A reminder for my Monday routine."),
        ("Sourdough update", "Recipes", "bread, baking", "Try this hydration next weekend."),
        ("Night train", "Travel", "trains, slow-travel", "Ask Nora about the route."),
        ("Small habit", None, "testing", "Share with the team."),
        ("Reading list", None, "books", ""),
    ]
    for text, folder, tags, note in plan:
        c = card(text)
        if folder:
            c.locator("select").select_option(label=folder)
            panel.wait_for_timeout(200)
    state = feed_shot()
    frames.append(("3. Move it to a folder", state, panel_shot()))
    for text, folder, tags, note in plan:
        c = card(text)
        c.locator("input").fill(tags)
        c.locator("input").blur()
        if note:
            c.locator("textarea").fill(note)
            c.locator("textarea").blur()
        panel.wait_for_timeout(150)
    frames.append(("4. Add tags and a note", state, panel_shot()))

    # Overview: all posts.
    panel.fill("#search", "")
    panel.click("#folders .chip:has-text('All')")
    panel.wait_for_timeout(300)
    panel.evaluate("window.scrollTo(0,0)")
    ov = save_png(panel_shot(), "panel-overview.png")

    # Layout check (not published): the meta line must stay on one row at narrow widths.
    scratch_dir = pathlib.Path(os.environ.get("TO_SCRATCH") or tempfile.gettempdir())
    for w in (320, 360, 420):
        panel.set_viewport_size({"width": w, "height": PANEL_VP["height"]})
        panel.wait_for_timeout(250)
        rows = panel.evaluate("""() => [...document.querySelectorAll('.card .meta')].map(m => {
            const kids = [...m.children]; const tops = kids.flatMap(k => k.classList.contains('counts') ? [...k.children] : [k]).map(k => Math.round(k.getBoundingClientRect().top));
            return Math.max(...tops) - Math.min(...tops) < 8; })""")
        print(f"meta single-row at {w}px: {all(rows)} ({sum(rows)}/{len(rows)})")
        (scratch_dir / f"panel-{w}.png").write_bytes(panel.screenshot())
    panel.set_viewport_size(PANEL_VP)
    panel.wait_for_timeout(250)

    # Card detail: the Recipes card.
    c = card("Sourdough update")
    c.scroll_into_view_if_needed()
    panel.wait_for_timeout(200)
    bb = c.bounding_box()
    detail = img(panel.screenshot(clip={"x": max(0, bb["x"] - 8), "y": bb["y"] - 8,
                                        "width": min(PANEL_VP["width"], bb["width"] + 16), "height": bb["height"] + 16}))
    save_png(detail, "card-detail.png")
    print("card meta line:", c.locator(".meta").inner_text().replace("\n", " "))

    # Search and filter.
    panel.evaluate("window.scrollTo(0,0)")
    panel.fill("#search", "sourdough")
    panel.wait_for_timeout(300)
    frames.append(("5. Search and filter", state, panel_shot()))
    panel.fill("#search", "")
    panel.wait_for_timeout(300)

    # Footer.
    panel.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    panel.wait_for_timeout(300)
    ft = panel.query_selector("footer").bounding_box()
    footer = img(panel.screenshot(clip={"x": 0, "y": max(0, ft["y"] - 150), "width": PANEL_VP["width"],
                                        "height": min(PANEL_VP["height"] - max(0, ft["y"] - 150), ft["height"] + 150)}))
    save_png(footer, "footer-export.png")
    frames.append(("6. Copy or export", state, panel_shot()))

    # Activity page.
    feed.bring_to_front()
    feed.goto("https://www.threads.com/activity")
    try:
        feed.wait_for_selector("button.to-save-btn", timeout=10000)
    except Exception:
        fail("no stack icons on the mock activity page")
    feed.wait_for_timeout(900)
    abtns = feed.query_selector_all("button.to-save-btn")
    print(f"stack buttons on activity: {len(abtns)} (rows: {len(feed.query_selector_all('.row'))})")
    for b in abtns:
        host = b.evaluate_handle("b => b.parentElement")
        dots = host.as_element().query_selector("[aria-label=More]").bounding_box()
        bb = b.bounding_box()
        kids = host.as_element().query_selector_all("button.to-save-btn")
        print(f"  {b.get_attribute('data-to-btn')}: anchor={b.get_attribute('data-to-anchor')} "
              f"counts={b.get_attribute('data-to-counts')} icon_right={bb['x']+bb['width']:.0f} dots_left={dots['x']:.0f} "
              f"icons_in_row={len(kids)}")
    feed.mouse.move(5, 5)
    top = feed.query_selector(".top").bounding_box()
    last = feed.query_selector_all(".row")[-1].bounding_box()
    act = img(feed.screenshot(clip={"x": FEED_VP["width"] / 2 - 310, "y": 0, "width": 620,
                                    "height": last["y"] + last["height"] + 2}))
    save_png(act, "activity.png")

    # GIF.
    gifs = [frame(f, p, cap) for cap, f, p in frames]
    w, h = gifs[0].size
    pal = [g.convert("P", palette=Image.ADAPTIVE, colors=128) for g in gifs]
    path = OUT / "demo.gif"
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=1600, loop=0, optimize=True, disposal=1)
    written.append(("demo.gif", path.stat().st_size))
    print(f"demo.gif: {len(gifs)} frames, {w}x{h}")


if __name__ == "__main__":
    main()
