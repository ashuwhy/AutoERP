"""The AutoERP logo: ERP in Forum, with "auto" in vermilion Archivo hung from its cap line like a
superscript. The toolbar icon is that "a" on a vermilion tile. One drawing, every size.

    python brand/mark.py    writes the extension icons, images/wordmark.svg, brand/kit, the README
                            buttons and the downloads counter's glyphs

Needs rsvg-convert, fontTools, brotli and uharfbuzz. The type is outlined from brand/fonts and the
extension's own Archivo, so no SVG needs an installed font.
"""

import io
import json
import subprocess
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FORUM = ROOT / "brand/fonts/Forum-Regular.ttf"
ARCHIVO = ROOT / "extension-src/chrome/fonts/archivo.woff2"

PAPER, MANILA, INK = "#FFF8EE", "#EFE6D2", "#1B1814"
VERMILION, VERMILION_DARK = "#D9381E", "#F0563A"

# Wordmark units: ERP's cap height is 100. Forum has one weight, so "auto" stays small and bold
# to sit on it the way a superscript does, not to compete with it.
CAP = 100
AUTO_X_HEIGHT = 38
GAP = 10


def outline(font, text, axes=None):
    """Outlines of text as one SVG path in font units (y down, baseline at 0), the ink bounds,
    the font's cap and x-heights, and the advance."""
    ttf = TTFont(font)
    # HarfBuzz reads plain sfnt only, so a woff2 goes in decompressed.
    ttf.flavor = None
    raw = io.BytesIO()
    ttf.save(raw)
    hb_font = hb.Font(hb.Face(hb.Blob(raw.getvalue())))
    if axes:
        hb_font.set_variations(axes)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {"kern": True, "liga": True})
    glyphs = ttf.getGlyphSet(location=axes) if axes else ttf.getGlyphSet()
    order = ttf.getGlyphOrder()
    # Variable-font instances come out as 15-digit floats; a tenth of a font unit is plenty.
    path = SVGPathPen(glyphs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    ink, x = BoundsPen(glyphs), 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        flip = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)
        glyphs[order[info.codepoint]].draw(TransformPen(path, flip))
        glyphs[order[info.codepoint]].draw(TransformPen(ink, flip))
        x += pos.x_advance
    return path.getCommands(), ink.bounds, ttf["OS/2"].sCapHeight, ttf["OS/2"].sxHeight, x


def wordmark(ink, red, background=None, pad=0, extension=False):
    """SVG of the wordmark. extension=True leaves the colours to the page's CSS: ERP takes
    currentColor and "auto" takes var(--red) through its class."""
    erp, erp_ink, cap, _, _ = outline(FORUM, "ERP")
    auto, auto_ink, _, x_height, _ = outline(ARCHIVO, "auto", {"wght": 700, "wdth": 100})
    k, j = CAP / cap, AUTO_X_HEIGHT / x_height
    auto_x = erp_ink[2] * k + GAP - auto_ink[0] * j
    auto_y = -CAP + x_height * j
    left = erp_ink[0] * k
    top = min(erp_ink[1] * k, auto_y + auto_ink[1] * j)
    width = auto_x + auto_ink[2] * j - left
    height = max(erp_ink[3] * k, auto_y + auto_ink[3] * j) - top
    box = f"{left - pad:.2f} {top - pad:.2f} {width + 2 * pad:.2f} {height + 2 * pad:.2f}"
    back = (f'<rect x="{left - pad:.2f}" y="{top - pad:.2f}" width="{width + 2 * pad:.2f}" '
            f'height="{height + 2 * pad:.2f}" fill="{background}"/>') if background else ""
    erp_fill = "currentColor" if extension else ink
    auto_attrs = f'class="auto" fill="{VERMILION}"' if extension else f'fill="{red}"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" class="wordmark" viewBox="{box}" '
            f'width="{width + 2 * pad:.2f}" height="{height + 2 * pad:.2f}" role="img" aria-label="AutoERP">'
            f'{back}<path d="{erp}" fill="{erp_fill}" transform="scale({k:.5f})"/>'
            f'<path d="{auto}" {auto_attrs} transform="translate({auto_x:.2f} {auto_y:.2f}) scale({j:.5f})"/>'
            '</svg>'), (width + 2 * pad) / (height + 2 * pad)


def icon(padding=0, small=False):
    """The "a" of auto on a vermilion tile, 100 units square. small=True is for 16 px: a
    bigger, heavier letter so it does not break up into pixels. padding is in 100ths of the
    canvas, for the store icon's empty border."""
    a, a_ink, _, x_height, _ = outline(ARCHIVO, "a", {"wght": 800 if small else 700, "wdth": 100})
    k = (52 if small else 46) / x_height
    # Centred on the letter's ink, not its advance; Archivo's "a" has uneven sidebearings.
    dx = 50 - (a_ink[0] + a_ink[2]) / 2 * k
    dy = 50 - (a_ink[1] + a_ink[3]) / 2 * k
    scale = (100 - 2 * padding) / 100
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            f'<g transform="translate({padding} {padding}) scale({scale})">'
            f'<rect width="100" height="100" rx="23" fill="{VERMILION}"/>'
            f'<path d="{a}" fill="{PAPER}" transform="translate({dx:.2f} {dy:.2f}) scale({k:.5f})"/>'
            '</g></svg>')


def button(label, fill, text):
    """The popup's Start button as an SVG, for the README's store links. GitHub shows README
    images without web fonts, so the label is outlined."""
    glyphs, ink, _, _, _ = outline(ARCHIVO, label, {"wght": 700, "wdth": 100})
    k = 16 / TTFont(ARCHIVO)["head"].unitsPerEm
    width = (ink[2] - ink[0]) * k + 56
    # Centred on the ink, which for a label with no descenders is the cap height.
    dx = 28 - ink[0] * k
    dy = 24 - (ink[1] + ink[3]) / 2 * k
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} 48" width="{width:.1f}" '
            f'height="48" role="img" aria-label="{label}">'
            f'<rect width="{width:.1f}" height="48" rx="24" fill="{fill}"/>'
            f'<path d="{glyphs}" fill="{text}" transform="translate({dx:.2f} {dy:.2f}) scale({k:.5f})"/></svg>')


def counter_glyphs():
    """glyphs.js for brand/counter, the Worker that draws the README's downloads count as a
    popup chip (600 weight, like .chips span). The count changes, so the digits and the comma
    go in one glyph each for the Worker to set; " downloads" is one run that follows them."""
    axes = {"wght": 600, "wdth": 100}
    digits = {}
    for c in "0123456789,":
        d, ink, _, _, advance = outline(ARCHIVO, c, axes)
        digits[c] = {"d": d, "left": round(ink[0], 1), "advance": advance}
    label, ink, _, _, _ = outline(ARCHIVO, " downloads", axes)
    # The label's ink sets the vertical centre, as in button(); a comma hangs below it.
    return ("// Written by brand/mark.py, do not edit.\n"
            f"export const EM = {TTFont(ARCHIVO)['head'].unitsPerEm};\n"
            f"export const TOP = {ink[1]:.1f};\n"
            f"export const BOTTOM = {ink[3]:.1f};\n"
            f"export const DIGITS = {json.dumps(digits)};\n"
            f"export const LABEL = {json.dumps({'d': label, 'right': round(ink[2], 1)})};\n")


def png(svg, out, px, height=None):
    out.write_bytes(subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(height or px)],
                                   input=svg.encode(), capture_output=True, check=True).stdout)


if __name__ == "__main__":
    images = ROOT / "extension-src/chrome/images"
    png(icon(small=True), images / "icon16.png", 16)
    png(icon(), images / "icon32.png", 32)
    png(icon(), images / "icon48.png", 48)
    # Chrome Web Store: 96 px of artwork inside 16 px of transparent border.
    png(icon(padding=12.5), images / "icon128.png", 128)
    (images / "wordmark.svg").write_text(wordmark(INK, VERMILION, extension=True)[0])

    kit = ROOT / "brand/kit"
    kit.mkdir(exist_ok=True)
    (kit / "icon.svg").write_text(icon())
    png(icon(), kit / "icon.png", 512)
    for name, (ink, red, background) in {
        "wordmark": (INK, VERMILION, "#F2EBDC"),
        "wordmark-dark": (MANILA, VERMILION_DARK, "#000000"),
    }.items():
        (kit / f"{name}.svg").write_text(wordmark(ink, red)[0])
        framed, ratio = wordmark(ink, red, background, pad=40)
        png(framed, kit / f"{name}.png", round(400 * ratio), 400)

    # Chrome is the primary button, red like Start; Firefox is the secondary, ink on light
    # GitHub and manila on dark.
    readme = ROOT / "brand/readme"
    readme.mkdir(exist_ok=True)
    (readme / "add-chrome.svg").write_text(button("Add to Chrome", VERMILION, PAPER))
    (readme / "add-firefox.svg").write_text(button("Add to Firefox", INK, PAPER))
    (readme / "add-firefox-dark.svg").write_text(button("Add to Firefox", MANILA, INK))
    (ROOT / "brand/counter/glyphs.js").write_text(counter_glyphs())
