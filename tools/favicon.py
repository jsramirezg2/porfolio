"""Build public/favicon.svg: the block-shade ASCII ball (favicon F).

A 9x9 sphere lit from the upper left. Each cell's brightness
b = 0.12 + 0.88 * max(0, n.L)^0.9 picks a glyph from " ░░▒▒▓▓██".
Light browser chrome gets the inverted map (b' = 1.08 - b) in navy,
dark chrome gets the direct map in mint. Glyphs are Geist Mono SemiBold
outlines, so the icon does not depend on any installed font.

Usage: python3 tools/favicon.py path/to/GeistMono-SemiBold.woff2
"""
import math
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

N = 9
RAMP = " ░░▒▒▓▓██"
NAMES = {"░": "a", "▒": "b", "▓": "c", "█": "d"}
SIZE = 64
PITCH = 56 / 9                     # cell pitch used in the design
FONT_SIZE = 6.53                   # design font size in the 64-unit box
LIGHT = (-0.55, -0.62, 0.56)


def norm(v):
    m = math.sqrt(sum(c * c for c in v))
    return tuple(c / m for c in v)


def ball(inverted):
    L = norm(LIGHT)
    rows = []
    for j in range(N):
        row = []
        for i in range(N):
            x = (i + 0.5) / N * 2 - 1
            y = (j + 0.5) / N * 2 - 1
            r2 = x * x + y * y
            if r2 > 1:
                row.append(" ")
                continue
            n = (x, y, math.sqrt(1 - r2))
            b = 0.12 + 0.88 * max(0.0, sum(a * c for a, c in zip(n, L))) ** 0.9
            if inverted:
                b = 1.08 - b
            k = max(1, min(8, round(b * 8)))
            row.append(RAMP[k])
        rows.append(row)
    return rows


def glyph_paths(font_path):
    font = TTFont(font_path)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    asc, desc = font["hhea"].ascent, font["hhea"].descent
    s = FONT_SIZE / upm
    out = {}
    for ch, name in NAMES.items():
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        # text-anchor: middle and dominant-baseline: central, as the design rendered it
        tp = TransformPen(pen, (s, 0, 0, -s, -g.width / 2 * s, (asc + desc) / 2 * s))
        g.draw(tp)
        out[name] = pen.getCommands()
    return out


def uses(rows):
    out = []
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == " ":
                continue
            x = SIZE / 2 + (i - (N - 1) / 2) * PITCH
            y = SIZE / 2 + (j - (N - 1) / 2) * PITCH
            out.append('<use href="#%s" x="%.2f" y="%.2f"/>' % (NAMES[ch], x, y))
    return "".join(out)


def main():
    paths = glyph_paths(sys.argv[1])
    defs = "".join('<path id="%s" d="%s"/>' % (k, v) for k, v in paths.items())
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        "<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>"
        "<defs>%s</defs>"
        '<g class="l" fill="#1e3a66">%s</g>'
        '<g class="d" fill="#7fe0c3">%s</g>'
        "</svg>\n"
    ) % (defs, uses(ball(True)), uses(ball(False)))
    with open("public/favicon.svg", "w", encoding="utf-8") as fh:
        fh.write(svg)
    for label, rows in (("light", ball(True)), ("dark", ball(False))):
        print(label)
        print("\n".join("".join(r) for r in rows))


if __name__ == "__main__":
    main()
