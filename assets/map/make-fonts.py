# Builds the map's label fonts: MapLibre can't use .ttf files directly, it wants each font cut into "glyph" files
# (assets/map/fonts/<font name>/<range>.pbf), where every character is a small distance-field image (SDF).
# This makes those from the IM FELL fonts (free, SIL Open Font License: see fonts/OFL.txt).
#
# Run it again only if you change fonts:   python3 assets/map/make-fonts.py <folder with the .ttf files>
# Needs Pillow and numpy. Download the .ttf files from github.com/google/fonts (ofl/imfellenglish, ofl/imfellenglishsc).
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
FONTS = {                       # the name the style uses -> file
    'IM Fell English Regular': 'IMFeENrm28P.ttf',
    'IM Fell English Italic': 'IMFeENit28P.ttf',
    'IM Fell English SC': 'IMFeENsc28P.ttf',
}
RANGES = range(0, 8448, 256)    # Latin, accents and punctuation (quotes, dashes); map labels here need no more
SIZE, BUFFER, RADIUS, CUTOFF = 24, 3, 8, .25   # MapLibre's glyph conventions
TOP_LINE = 26                   # MapLibre measures `top` down from ~26px above the baseline (matches its own fonts)
INF = 1e20

def edt1d(f):
    # 1D squared distance transform (Felzenszwalb & Huttenlocher), as used by MapLibre's TinySDF
    n = len(f); d = np.zeros(n); v = np.zeros(n, int); z = np.full(n + 1, INF); z[0] = -INF; k = 0
    for q in range(1, n):
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while s <= z[k]:   # z[0] is -INF, so this always stops
            k -= 1
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        k += 1; v[k] = q; z[k] = s; z[k + 1] = INF
    k = 0
    for q in range(n):
        while z[k + 1] < q: k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d

def edt(grid):
    g = grid.copy()
    for x in range(g.shape[1]): g[:, x] = edt1d(g[:, x])
    for y in range(g.shape[0]): g[y, :] = edt1d(g[y, :])
    return g

def sdf(alpha):
    # alpha: coverage 0..1 -> signed distance field 0..255, the way TinySDF does it
    outer = np.where(alpha >= 1, 0, np.where(alpha <= 0, INF, np.maximum(0, .5 - alpha) ** 2))
    inner = np.where(alpha >= 1, INF, np.where(alpha <= 0, 0, np.maximum(0, alpha - .5) ** 2))
    d = np.sqrt(edt(outer)) - np.sqrt(edt(inner))
    return np.clip(np.round(255 - 255 * (d / RADIUS + CUTOFF)), 0, 255).astype(np.uint8)

# self-check: a filled square reads as "inside" (above MapLibre's 192 edge) in its middle, "outside" far from it
_t = np.zeros((20, 20)); _t[6:14, 6:14] = 1
_s = sdf(_t)
assert _s[10, 10] > 192 and _s[0, 0] < 100 and 150 < _s[10, 6] < 230, (_s[10, 10], _s[0, 0], _s[10, 6])

# protobuf, written by hand (the format is tiny)
def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7f; n >>= 7
        out.append(b | (0x80 if n else 0))
        if not n: return bytes(out)
def field(num, wire, payload):
    key = varint(num << 3 | wire)
    return key + (varint(payload) if wire == 0 else varint(len(payload)) + payload)
zigzag = lambda n: (n << 1) ^ (n >> 31)

def glyph(font, cp):
    ch = chr(cp)
    advance = round(font.getlength(ch))
    x0, y0, x1, y1 = font.getbbox(ch, anchor='ls')
    w, h = x1 - x0, y1 - y0
    msg = field(1, 0, cp)
    if w > 0 and h > 0:
        img = Image.new('L', (w + 2 * BUFFER, h + 2 * BUFFER), 0)
        ImageDraw.Draw(img).text((BUFFER - x0, BUFFER - y0), ch, font=font, fill=255, anchor='ls')
        msg += field(2, 2, sdf(np.asarray(img, float) / 255).tobytes())
    else:
        w = h = 0
    msg += field(3, 0, w) + field(4, 0, h) + field(5, 0, zigzag(x0 if w else 0)) + field(6, 0, zigzag(-y0 - TOP_LINE if h else -TOP_LINE)) + field(7, 0, advance)
    return msg

for name, file in FONTS.items():
    font = ImageFont.truetype(os.path.join(SRC, file), SIZE)
    from fontTools.ttLib import TTFont
    has = set(TTFont(os.path.join(SRC, file)).getBestCmap())
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    for start in RANGES:
        rng = f'{start}-{start + 255}'
        stack = field(1, 2, name.encode()) + field(2, 2, rng.encode())
        for cp in range(start, start + 256):
            if cp in has: stack += field(3, 2, glyph(font, cp))
        open(os.path.join(OUT, name, f'{rng}.pbf'), 'wb').write(field(1, 2, stack))
    print('built', name)
