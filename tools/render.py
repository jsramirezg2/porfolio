"""Render the raster assets in public/ with headless Chrome.

  og.png               1200 x 630 link preview, from tools/og.html (night)
  favicon.ico          16/32/48 px, light-tab variant of favicon.svg
  apple-touch-icon.png 180 px, night variant on the night background

Usage: python3 tools/render.py [path/to/chrome]
Needs: pip install playwright pillow
"""
import base64
import io
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
CHROME = sys.argv[1] if len(sys.argv) > 1 else None


def icon_page(svg, size, bg, pad):
    data = base64.b64encode(svg.encode()).decode()
    inner = size - 2 * pad
    return (
        "<!doctype html><html><body style='margin:0;background:%s'>"
        "<div id='i' style='width:%dpx;height:%dpx;display:flex;align-items:center;justify-content:center'>"
        "<img src='data:image/svg+xml;base64,%s' width='%d' height='%d'></div></body></html>"
    ) % (bg, size, size, data, inner, inner)


def main():
    svg = (PUBLIC / "favicon.svg").read_text(encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()

        page = browser.new_page(viewport={"width": 1200, "height": 630})
        page.goto((ROOT / "tools" / "og.html").as_uri())
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(300)
        page.locator("#card").screenshot(path=str(PUBLIC / "og.png"))
        page.close()

        # favicon.ico: light variant, transparent background, rendered at 4x then reduced
        page = browser.new_page(viewport={"width": 256, "height": 256})
        page.emulate_media(color_scheme="light")
        page.set_content(icon_page(svg, 256, "transparent", 0))
        big = Image.open(io.BytesIO(page.locator("#i").screenshot(omit_background=True))).convert("RGBA")
        big.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        page.close()

        # apple-touch-icon: night variant on the night background
        page = browser.new_page(viewport={"width": 180, "height": 180})
        page.emulate_media(color_scheme="dark")
        page.set_content(icon_page(svg, 180, "#0f1624", 26))
        page.locator("#i").screenshot(path=str(PUBLIC / "apple-touch-icon.png"))
        page.close()

        browser.close()


if __name__ == "__main__":
    main()
