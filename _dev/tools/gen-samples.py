#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 FigurePlay E2E 测试示例素材（可重复运行）。

用法（绝对路径）：
  C:\\Users\\DragonDance\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe ^
    E:\\FigurePlay\\_dev\\tools\\gen-samples.py

产物（E:\\FigurePlay\\_dev\\samples\\）：
  sample-1..3.png  1200x900 横图（红/绿/蓝，图案各异，超大编号）
  sample-4..5.png  900x1200 竖图（紫/青）
  sample-6.png     1000x1000 方图（深底琥珀）
  sample-alpha.png 800x600 RGBA（含全透明与半透明区域）
  sample-logo.svg  简单 SVG logo
  sample-photo.jpg 1600x1200 JPEG
  manifest.json    尺寸/模式/主色/像素探针，供 E2E 断言使用
"""
import hashlib
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageStat

DEV_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES_DIR = os.path.join(DEV_DIR, "samples")
FONT_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/simhei.ttf",
]
CN_FONT_CANDIDATES = [
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/simhei.ttf",
]
PROBE_SIZE = 32
PROBE_POS = (40, 40)  # 探针方块左上角


def pick_font(candidates, size):
    for candidate in candidates:
        if os.path.exists(candidate):
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def font(size):
    return pick_font(FONT_CANDIDATES, size)


def cn_font(size):
    return pick_font(CN_FONT_CANDIDATES, size)


def centered_text(draw, box, text, fnt, fill):
    x0, y0, x1, y1 = box
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = x0 + (x1 - x0 - w) / 2 - bbox[0]
    y = y0 + (y1 - y0 - h) / 2 - bbox[1]
    draw.text((x, y), text, font=fnt, fill=fill)


def draw_corner_marks(draw, size, color):
    """四角 L 形定位标记，便于坐标映射测试。"""
    w, h = size
    arm = max(60, int(min(w, h) * 0.10))
    thick = max(6, int(min(w, h) * 0.012))
    inset = max(18, int(min(w, h) * 0.022))
    # 左上
    draw.rectangle([inset, inset, inset + arm, inset + thick], fill=color)
    draw.rectangle([inset, inset, inset + thick, inset + arm], fill=color)
    # 右上
    draw.rectangle([w - inset - arm, inset, w - inset, inset + thick], fill=color)
    draw.rectangle([w - inset - thick, inset, w - inset, inset + arm], fill=color)
    # 左下
    draw.rectangle([inset, h - inset - thick, inset + arm, h - inset], fill=color)
    draw.rectangle([inset, h - inset - arm, inset + thick, h - inset], fill=color)
    # 右下
    draw.rectangle([w - inset - arm, h - inset - thick, w - inset, h - inset], fill=color)
    draw.rectangle([w - inset - thick, h - inset - arm, w - inset, h - inset], fill=color)


def draw_pattern(draw, size, kind, color):
    w, h = size
    if kind == "stripes":
        step = 90
        for i in range(-h, w + h, step):
            draw.line([(i, 0), (i + h, h)], fill=color, width=26)
    elif kind == "dots":
        step = 80
        for y in range(step // 2, h, step):
            for x in range(step // 2, w, step):
                r = 14
                draw.ellipse([x - r, y - r, x + r, y + r], fill=color)
    elif kind == "checker":
        step = 100
        for row, y in enumerate(range(0, h, step)):
            for col, x in enumerate(range(0, w, step)):
                if (row + col) % 2 == 0:
                    draw.rectangle([x, y, min(x + step, w), min(y + step, h)], fill=color)
    elif kind == "rings":
        cx, cy = w / 2, h / 2
        for r in range(max(w, h) // 2, 0, -110):
            if (r // 110) % 2 == 0:
                draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=34)
    elif kind == "bands":
        step = 90
        for y in range(0, h, step * 2):
            draw.rectangle([0, y, w, y + step], fill=color)
    elif kind == "nested":
        step = 70
        n = min(w, h) // 2 // step
        for i in range(n, 0, -1):
            r = i * step
            cx, cy = w / 2, h / 2
            draw.rounded_rectangle(
                [cx - r, cy - r, cx + r, cy + r], radius=30, outline=color, width=18
            )


def make_sample(filename, index, w, h, bg, pattern_color, accent, pattern_kind, orientation):
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    draw_pattern(draw, (w, h), pattern_kind, pattern_color)

    # 顶部信息条
    bar_h = int(h * 0.12)
    draw.rectangle([0, 0, w, bar_h], fill=accent)
    title = "FigurePlay sample #%d" % index
    title_font = font(max(28, int(h * 0.052)))
    # 顶部左侧留出探针方块位置，标题从 14% 宽处开始
    draw.text((int(w * 0.14), int(bar_h * 0.22)), title, font=title_font, fill=bg)

    # 中央超大编号
    num = str(index)
    num_font = font(int(h * 0.62))
    centered_text(draw, (0, bar_h, w, h), num, num_font, accent)

    # 底部尺寸信息（中文验证字体/文本渲染）
    info_font = cn_font(max(18, int(h * 0.032)))
    info = "尺寸 %d x %d  %s" % (w, h, "横图" if orientation == "landscape" else orientation)
    bbox = draw.textbbox((0, 0), info, font=info_font)
    iw = bbox[2] - bbox[0]
    draw.rectangle([0, h - int(h * 0.075), w, h], fill=(0, 0, 0))
    draw.text(((w - iw) // 2, h - int(h * 0.068)), info, font=info_font, fill=(255, 255, 255))

    # 四角定位标记
    draw_corner_marks(draw, (w, h), accent)

    # 像素探针方块（纯色，便于断言画面身份与缩放）
    px, py = PROBE_POS
    draw.rectangle([px, py, px + PROBE_SIZE, py + PROBE_SIZE], fill=accent)

    # 探针处再放一个反向小方块，增强识别
    draw.rectangle([px + 8, py + 8, px + PROBE_SIZE - 8, py + PROBE_SIZE - 8], fill=bg)

    return img


def sample_specs():
    """(文件名, 编号, w, h, bg, pattern_color, accent, pattern, orientation)"""
    return [
        ("sample-1.png", 1, 1200, 900, (217, 74, 56), (240, 128, 108), (255, 255, 255), "stripes", "landscape"),
        ("sample-2.png", 2, 1200, 900, (46, 158, 91), (120, 205, 155), (255, 245, 168), "dots", "landscape"),
        ("sample-3.png", 3, 1200, 900, (47, 111, 208), (130, 172, 235), (255, 214, 102), "checker", "landscape"),
        ("sample-4.png", 4, 900, 1200, (123, 75, 196), (175, 140, 225), (255, 214, 102), "rings", "portrait"),
        ("sample-5.png", 5, 900, 1200, (23, 147, 155), (110, 205, 205), (255, 255, 255), "bands", "portrait"),
        ("sample-6.png", 6, 1000, 1000, (31, 41, 55), (70, 85, 105), (247, 183, 55), "nested", "square"),
    ]


def make_alpha_png():
    w, h = 800, 600
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    # 不透明圆
    draw.ellipse([80, 80, 420, 420], fill=(217, 74, 56, 255))
    # 半透明方块
    draw.rectangle([420, 160, 720, 460], fill=(47, 111, 208, 128))
    # 角落全透明+高亮标记
    draw.rectangle([0, 0, w, 6], fill=(46, 158, 91, 255))
    draw.rectangle([0, h - 6, w, h], fill=(46, 158, 91, 255))
    centered_text(draw, (0, 0, w, h), "A", font(int(h * 0.5)), (255, 255, 255, 220))
    cn = cn_font(30)
    draw.text((w - 250, 30), "透明 PNG", font=cn, fill=(0, 0, 0, 200))
    return img


def make_jpg():
    w, h = 1600, 1200
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = (
                int(40 + 180 * x / w),
                int(90 + 120 * y / h),
                int(160 - 90 * x / w),
            )
    draw = ImageDraw.Draw(img)
    for i in range(6):
        cx = 200 + i * 240
        cy = 300 + (i % 3) * 260
        draw.ellipse([cx - 110, cy - 110, cx + 110, cy + 110],
                     fill=(255, 255 - i * 30, 60 + i * 25))
    draw.rectangle([0, h - 160, w, h], fill=(12, 16, 24))
    centered_text(draw, (0, h - 160, w, h), "JPEG 1600x1200 照片风格", font(72), (255, 255, 255))
    centered_text(draw, (0, 0, w, 200), "FigurePlay sample JPG", font(96), (255, 255, 255))
    return img


SVG_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f6fd0" />
      <stop offset="1" stop-color="#7b4bc4" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="400" height="240" rx="18" fill="url(#g1)" />
  <circle cx="100" cy="120" r="58" fill="#ffffff" opacity="0.92" />
  <rect x="185" y="62" width="160" height="26" rx="13" fill="#ffd666" />
  <rect x="185" y="108" width="122" height="20" rx="10" fill="#ffffff" opacity="0.8" />
  <rect x="185" y="146" width="140" height="20" rx="10" fill="#ffffff" opacity="0.5" />
  <text x="200" y="205" font-family="Arial, sans-serif" font-size="22" fill="#ffffff">FigurePlay SVG</text>
</svg>
"""


def composite_on_white(img):
    """RGBA -> 白底 RGB（与浏览器 canvas 先铺白底再 drawImage 的结果对齐）。"""
    rgba = img.convert("RGBA")
    base = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(base, rgba).convert("RGB")


def manifest_pixels(img):
    """平均色 + 4x4 缩略图（白底合成），用于 E2E 断言"显示/导出的确实是某张图"。"""
    comp = composite_on_white(img)
    stat = ImageStat.Stat(comp)
    average = [int(round(v)) for v in stat.mean]
    thumb = comp.resize((4, 4), Image.LANCZOS)
    rows = []
    for y in range(4):
        row = []
        for x in range(4):
            row.append([int(v) for v in thumb.getpixel((x, y))])
        rows.append(row)
    return {"averageColor": average, "thumb4x4": rows}


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def probe_manifest(img, filename, orientation):
    """主色 + 探针颜色（探针处外圈为 accent，内圈为背景）"""
    colors = img.convert("RGB").getcolors(maxcolors=1 << 24)
    colors.sort(key=lambda item: item[0], reverse=True)
    dominant = list(colors[0][1]) if colors else None
    px, py = PROBE_POS
    probe_outer = list(img.convert("RGB").getpixel((px + 2, py + 2)))
    center = (px + PROBE_SIZE // 2, py + PROBE_SIZE // 2)
    probe_center = list(img.convert("RGB").getpixel(center))
    data = {
        "filename": filename,
        "width": img.width,
        "height": img.height,
        "mode": img.mode,
        "orientation": orientation,
        "dominantColor": dominant,
        "probeOuterColor": probe_outer,
        "probeCenterColor": probe_center,
        "probeBlock": {"x": px, "y": py, "size": PROBE_SIZE},
    }
    data.update(manifest_pixels(img))
    if img.mode == "RGBA":
        alpha_min, alpha_max = img.getchannel("A").getextrema()
        data.update({
            "alphaMin": alpha_min,
            "alphaMax": alpha_max,
            "cornerAlpha": img.getpixel((0, 0))[3],
            "centerAlpha": img.getpixel((img.width // 2, img.height // 2))[3],
        })
    if img.format:
        data["format"] = img.format
    return data


def main():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    manifest = {}

    for spec in sample_specs():
        filename = spec[0]
        img = make_sample(*spec)
        out = os.path.join(SAMPLES_DIR, filename)
        img.save(out, "PNG", optimize=True)
        info = probe_manifest(img, filename, spec[-1])
        info["bytes"] = os.path.getsize(out)
        info["sha256"] = file_sha256(out)
        manifest[filename] = info

    alpha = make_alpha_png()
    alpha_out = os.path.join(SAMPLES_DIR, "sample-alpha.png")
    alpha.save(alpha_out, "PNG", optimize=True)
    info = probe_manifest(alpha, "sample-alpha.png", "landscape")
    info["format"] = "PNG"
    info["bytes"] = os.path.getsize(alpha_out)
    info["sha256"] = file_sha256(alpha_out)
    manifest["sample-alpha.png"] = info

    jpg = make_jpg()
    jpg_out = os.path.join(SAMPLES_DIR, "sample-photo.jpg")
    jpg.save(jpg_out, "JPEG", quality=88, optimize=True)
    info = probe_manifest(jpg, "sample-photo.jpg", "landscape")
    info["format"] = "JPEG"
    info["bytes"] = os.path.getsize(jpg_out)
    info["sha256"] = file_sha256(jpg_out)
    # JPG 有损压缩，主色不是精确值，标注容差
    info["colorTolerance"] = 12
    manifest["sample-photo.jpg"] = info

    svg_out = os.path.join(SAMPLES_DIR, "sample-logo.svg")
    with open(svg_out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(SVG_CONTENT)
    manifest["sample-logo.svg"] = {
        "filename": "sample-logo.svg",
        "width": 400,
        "height": 240,
        "orientation": "landscape",
        "format": "SVG",
        "bytes": os.path.getsize(svg_out),
        "sha256": file_sha256(svg_out),
    }

    manifest_path = os.path.join(SAMPLES_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print("samples dir:", SAMPLES_DIR)
    for name in sorted(manifest):
        info = manifest[name]
        print(
            "  %-18s %5d x %-5d %-5s %8d bytes"
            % (name, info.get("width", 0), info.get("height", 0),
               info.get("mode", info.get("format", "?")), info["bytes"])
        )
    print("manifest:", manifest_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
