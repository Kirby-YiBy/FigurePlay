# -*- coding: utf-8 -*-
"""Generate FigurePlay desktop icon (blue gradient + 4 rounded squares, matches web brand mark)."""
from PIL import Image, ImageDraw

SIZE = 256
SCALE = SIZE / 32.0
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

# diagonal gradient background: #3b82f6 -> #1d4ed8
grad = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
c1 = (59, 130, 246)
c2 = (29, 78, 216)
for y in range(SIZE):
    for x in range(SIZE):
        # diagonal interpolation
        t = (x + y) / (2.0 * (SIZE - 1))
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        gd.point((x, y), fill=(r, g, b, 255))

mask = Image.new("L", (SIZE, SIZE), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=int(9 * SCALE), fill=255)
img.paste(grad, (0, 0), mask)

draw = ImageDraw.Draw(img)
squares = [
    (2.5, 2.5, 0.95),
    (18.0, 2.5, 0.62),
    (2.5, 18.0, 0.62),
    (18.0, 18.0, 0.95),
]
size = 11.5
radius = 2.5
for (x, y, opacity) in squares:
    left = x * SCALE
    top = y * SCALE
    right = (x + size) * SCALE
    bottom = (y + size) * SCALE
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle(
        [left, top, right - 1, bottom - 1],
        radius=radius * SCALE,
        fill=(255, 255, 255, int(255 * opacity)),
    )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

out_ico = r"E:\FigurePlay\desktop\assets\figureplay.ico"
out_png = r"E:\FigurePlay\desktop\assets\figureplay-icon-256.png"
img.save(out_png)
img.save(out_ico, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icon written:", out_ico)
