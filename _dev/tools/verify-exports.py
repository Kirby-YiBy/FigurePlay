#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""校验 FigurePlay 导出产物：PNG/JPG（尺寸、非空白、透明/白底）、SVG（结构、mm 尺寸、图/文字数量）、PDF（单页、MediaBox、渲染）。

由 _dev/e2e.mjs 通过 spawnSync 调用，输出 JSON 供 Node 断言与报告使用。

用法示例：
  python verify-exports.py --json --kind image --file out.png \
      --expect-width 2008 --expect-height 1338 --tolerance 1
  python verify-exports.py --json --kind image --file out.png \
      --expect-width 2008 --expect-height 1338 --expect-alpha true --expect-corner-alpha 0
  python verify-exports.py --json --kind svg --file out.svg \
      --expect-width-mm 170 --expect-height-mm 113.27 \
      --expect-images 6 --expect-labels 6 --expect-label-texts "a|b|c"
  python verify-exports.py --json --kind pdf --file out.pdf \
      --expect-width-mm 170 --expect-height-mm 113.27 --render-dir <dir> --render-prefix png300

退出码：0=全部 checks 通过；1=有 check 失败；2=文件缺失/无法解析。
"""
import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

try:
    from PIL import Image, ImageStat
except ImportError:  # pragma: no cover
    Image = None
    ImageStat = None

GS = os.environ.get("GSWIN64C", r"D:\gmt\Ghostscript\gs10.04.0\bin\gswin64c.exe")
PDFTOPPM = os.environ.get("PDFTOPPM", r"D:\texlive\2023\bin\windows\pdftoppm.exe")
PDFINFO = os.environ.get("PDFINFO", r"D:\texlive\2023\bin\windows\pdfinfo.exe")
MM_PER_INCH = 25.4
PT_PER_INCH = 72.0


# --------------------------------------------------------------------------- #
# 通用
# --------------------------------------------------------------------------- #
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def add_check(checks, name, passed, detail=None):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})


def result_file_meta(path):
    meta = {"file": os.path.abspath(path), "exists": os.path.exists(path)}
    if meta["exists"]:
        meta["size"] = os.path.getsize(path)
        meta["sha256"] = sha256_file(path)
    else:
        meta["size"] = 0
    return meta


def parse_number(text):
    m = re.search(r"-?[\d.]+", str(text or ""))
    return float(m.group(0)) if m else None


def mm_attr_to_mm(value):
    """'170mm' -> (170.0, True)；'170' -> (170.0, False)。"""
    if value is None:
        return None, False
    text = str(value).strip()
    m = re.match(r"^\s*(-?[\d.]+)\s*(mm|cm|in|pt|px)?\s*$", text, re.I)
    if not m:
        return None, False
    number = float(m.group(1))
    unit = (m.group(2) or "").lower()
    if unit == "mm":
        return number, True
    if unit == "cm":
        return number * 10.0, True
    if unit == "in":
        return number * 25.4, True
    if unit == "pt":
        return number * MM_PER_INCH / PT_PER_INCH, True
    return number, False  # 无单位（按 mm 数值直读，但记录无 mm 单位）


def image_stats(path):
    """PIL 打开图片，返回尺寸/模式/非空白统计/四角像素等。"""
    with Image.open(path) as img:
        img.load()
        info = {
            "format": img.format,
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
        }
        rgb = img.convert("RGB")
        stat = ImageStat.Stat(rgb)
        info["stddev"] = [round(v, 3) for v in stat.stddev]
        info["mean"] = [round(v, 2) for v in stat.mean]
        colors = rgb.getcolors(maxcolors=1 << 20)
        info["uniqueColors"] = None if colors is None else len(colors)
        info["isBlank"] = max(info["stddev"]) < 1.0 and (info["uniqueColors"] or 0) <= 2
        corners = {
            "tl": list(rgb.getpixel((0, 0))),
            "tr": list(rgb.getpixel((img.width - 1, 0))),
            "bl": list(rgb.getpixel((0, img.height - 1))),
            "br": list(rgb.getpixel((img.width - 1, img.height - 1))),
        }
        info["cornerPixels"] = corners
        if "A" in img.getbands():
            alpha = img.getchannel("A")
            info["alphaExtrema"] = list(alpha.getextrema())
            corner_alpha = {
                "tl": img.getpixel((0, 0))[3],
                "tr": img.getpixel((img.width - 1, 0))[3],
                "bl": img.getpixel((0, img.height - 1))[3],
                "br": img.getpixel((img.width - 1, img.height - 1))[3],
            }
            info["cornerAlpha"] = corner_alpha
        thumb = rgb.resize((4, 4), Image.LANCZOS)
        info["thumb4x4"] = [[list(thumb.getpixel((x, y))) for x in range(4)] for y in range(4)]
        info["averageColor"] = [int(round(v)) for v in stat.mean]
        return info


def load_json_file(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def measure_ink_margins(path, dpi, tolerance=14, background=(255, 255, 255)):
    """扫描渲染图非背景像素，返回四边留白（mm）与墨迹像素 bbox。

    用于验证 PDF 白边裁剪是否彻底：页面四边的实际非白墨迹余量应接近 0。
    tolerance 吸收 JPEG 压缩/抗锯齿造成的近白像素误差。
    """
    if Image is None:
        return {"marginsMm": None, "error": "Pillow 不可用"}
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        width, height = rgb.size
        pixels = list(rgb.getdata())
    tol = max(0, int(tolerance))
    bg = background
    min_x, min_y = width, height
    max_x, max_y = -1, -1
    for index, pixel in enumerate(pixels):
        if (abs(pixel[0] - bg[0]) > tol or abs(pixel[1] - bg[1]) > tol or
                abs(pixel[2] - bg[2]) > tol):
            x = index % width
            y = index // width
            if x < min_x:
                min_x = x
            if y < min_y:
                min_y = y
            if x > max_x:
                max_x = x
            if y > max_y:
                max_y = y
    if max_x < 0:
        return {
            "marginsMm": None,
            "boxPx": None,
            "imagePx": [width, height],
            "error": "渲染图无非背景墨迹（可能整页空白）",
        }
    px_per_mm = max(1.0, float(dpi)) / MM_PER_INCH

    def mm(value):
        return round(value / px_per_mm, 3)

    return {
        "marginsMm": {
            "top": mm(min_y),
            "right": mm(width - 1 - max_x),
            "bottom": mm(height - 1 - max_y),
            "left": mm(min_x),
        },
        "boxPx": {"x": min_x, "y": min_y, "w": max_x - min_x + 1, "h": max_y - min_y + 1},
        "imagePx": [width, height],
        "dpi": dpi,
        "tolerance": tol,
    }


def point_region_average(img, x, y, radius=1):
    """取 (x,y) 附近 (2r+1)^2 区域的平均 RGBA（越界自动 clamp）。"""
    rgba = img.convert("RGBA")
    width, height = rgba.size
    cx = max(0, min(width - 1, int(round(x))))
    cy = max(0, min(height - 1, int(round(y))))
    totals = [0.0, 0.0, 0.0, 0.0]
    count = 0
    for py in range(max(0, cy - radius), min(height, cy + radius + 1)):
        for px in range(max(0, cx - radius), min(width, cx + radius + 1)):
            pixel = rgba.getpixel((px, py))
            for channel in range(4):
                totals[channel] += pixel[channel]
            count += 1
    return [round(value / max(1, count), 2) for value in totals]


def verify_probe_points(info_path, checks, file_path):
    """按 JSON 探针点校验像素内容。"""
    if not info_path:
        return None
    try:
        config = load_json_file(info_path)
    except Exception as exc:  # noqa: BLE001
        add_check(checks, "探针点 JSON 可读取", False, str(exc))
        return None
    points = config.get("points") if isinstance(config, dict) else config
    if not isinstance(points, list) or not points:
        add_check(checks, "探针点列表非空", False, points)
        return None
    if Image is None:
        add_check(checks, "探针点校验需要 Pillow", False)
        return None
    try:
        with Image.open(file_path) as img:
            img.load()
            results = []
            for point in points:
                name = point.get("name") or ("x=%s,y=%s" % (point.get("x"), point.get("y")))
                expected = point.get("expect", "nonwhite")
                tolerance = float(point.get("tolerance", 20))
                rgba = point_region_average(img, point.get("x", 0), point.get("y", 0),
                                            int(point.get("radius", 1)))
                rgb = rgba[:3]
                alpha = rgba[3]
                if expected == "white":
                    ok = all(channel >= 255 - tolerance for channel in rgb) and alpha >= 255 - tolerance
                elif expected == "nonwhite":
                    ok = any(channel <= 255 - tolerance for channel in rgb) or alpha <= 255 - tolerance
                elif expected == "transparent":
                    ok = alpha <= tolerance
                elif expected == "opaque":
                    ok = alpha >= 255 - tolerance
                elif expected == "color":
                    target = point.get("color") or [0, 0, 0]
                    ok = all(abs(rgb[i] - target[i]) <= tolerance for i in range(3))
                else:
                    ok = False
                results.append({"name": name, "expected": expected, "actual": rgba, "passed": ok})
                add_check(checks, "探针点 %s（%s）" % (name, expected), ok,
                          {"actualRGBA": rgba, "tolerance": tolerance})
            return results
    except Exception as exc:  # noqa: BLE001
        add_check(checks, "探针点校验可执行", False, "%s: %s" % (type(exc).__name__, exc))
        return None


# --------------------------------------------------------------------------- #
# image (PNG/JPG)
# --------------------------------------------------------------------------- #
def verify_image(args):
    checks = []
    details = {}
    base = result_file_meta(args.file)
    if not base["exists"]:
        add_check(checks, "文件存在", False, args.file)
        return base, checks, details, 2
    add_check(checks, "文件存在且非空", base["size"] > 0, {"size": base["size"]})
    if Image is None:
        add_check(checks, "Pillow 可用", False)
        return base, checks, details, 2

    try:
        info = image_stats(args.file)
    except Exception as exc:  # noqa: BLE001
        add_check(checks, "PIL 可打开图片", False, "%s: %s" % (type(exc).__name__, exc))
        return base, checks, details, 2
    details["image"] = info
    add_check(checks, "PIL 可打开图片", True, {"format": info["format"], "mode": info["mode"]})

    if args.expect_format:
        add_check(checks, "格式 = %s" % args.expect_format.upper(),
                  str(info["format"]).upper() == args.expect_format.upper(), info["format"])

    if args.expect_width is not None and args.expect_height is not None:
        ok_w = abs(info["width"] - args.expect_width) <= args.tolerance
        ok_h = abs(info["height"] - args.expect_height) <= args.tolerance
        add_check(checks, "像素宽度 ≈ %d ±%d" % (args.expect_width, args.tolerance),
                  ok_w, {"actual": info["width"]})
        add_check(checks, "像素高度 ≈ %d ±%d" % (args.expect_height, args.tolerance),
                  ok_h, {"actual": info["height"]})

    non_blank = (not info["isBlank"]) and (
        info["uniqueColors"] is None or info["uniqueColors"] >= args.min_unique_colors
    )
    add_check(checks, "内容非空白（stddev>1 且颜色数>=%d）" % args.min_unique_colors,
              non_blank, {"stddev": info["stddev"], "uniqueColors": info["uniqueColors"]})

    has_alpha = "alphaExtrema" in info
    fully_opaque = has_alpha and info["alphaExtrema"][0] == 255
    if args.expect_alpha is not None:
        if args.expect_alpha:
            add_check(checks, "有 alpha 通道", has_alpha,
                      {"hasAlpha": has_alpha, "mode": info["mode"],
                       "alphaExtrema": info.get("alphaExtrema")})
        else:
            add_check(checks, "不透明（无 alpha 通道或 alpha 全 255）",
                      (not has_alpha) or fully_opaque,
                      {"hasAlpha": has_alpha, "mode": info["mode"],
                       "alphaExtrema": info.get("alphaExtrema")})
    if args.expect_corner_alpha is not None:
        corner_alpha = info.get("cornerAlpha") or {}
        ok = has_alpha and bool(corner_alpha) and all(
            value == args.expect_corner_alpha for value in corner_alpha.values())
        add_check(checks, "四角 alpha = %d" % args.expect_corner_alpha, ok, corner_alpha)
    if args.expect_white_corners:
        ok = all(all(channel >= 250 for channel in corner)
                 for corner in info["cornerPixels"].values())
        add_check(checks, "四角背景为白色（>=250）", ok, info["cornerPixels"])
    probe_details = verify_probe_points(getattr(args, "probe_points_json", None), checks, args.file)
    if probe_details is not None:
        details["probePoints"] = probe_details
    return base, checks, details, 0


# --------------------------------------------------------------------------- #
# svg
# --------------------------------------------------------------------------- #
def local_name(tag):
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def verify_svg(args):
    checks = []
    details = {}
    base = result_file_meta(args.file)
    if not base["exists"]:
        add_check(checks, "文件存在", False, args.file)
        return base, checks, details, 2
    add_check(checks, "文件存在且非空", base["size"] > 0, {"size": base["size"]})
    try:
        with open(args.file, "rb") as fh:
            raw = fh.read()
        root = ET.fromstring(raw)
    except Exception as exc:  # noqa: BLE001
        add_check(checks, "XML 可解析", False, "%s: %s" % (type(exc).__name__, exc))
        return base, checks, details, 2
    add_check(checks, "XML 可解析", True)
    add_check(checks, "根元素为 <svg>", local_name(root.tag) == "svg", local_name(root.tag))

    width_val, width_mm_unit = mm_attr_to_mm(root.get("width"))
    height_val, height_mm_unit = mm_attr_to_mm(root.get("height"))
    view_box = (root.get("viewBox") or "").strip()
    vb_numbers = [float(item) for item in re.split(r"[\s,]+", view_box) if item] if view_box else []

    image_els = [el for el in root.iter() if local_name(el.tag) == "image"]
    image_active = [el for el in image_els
                    if (el.get("display") or "").lower() != "none"
                    and (el.get("href") or el.get("{http://www.w3.org/1999/xlink}href") or "").strip()]
    cell_els = [el for el in root.iter() if el.get("data-i") is not None]
    label_els = [el for el in root.iter()
                 if local_name(el.tag) == "text" and "label-text" in (el.get("class") or "")]
    label_texts = ["".join(el.itertext()).strip() for el in label_els]
    label_positions = []
    for el in label_els:
        try:
            label_positions.append({
                "text": "".join(el.itertext()).strip(),
                "x": float(el.get("x") or 0),
                "y": float(el.get("y") or 0),
                "anchor": el.get("text-anchor"),
            })
        except (TypeError, ValueError):
            continue
    backgrounds = [el for el in root.iter() if "figure-bg" in (el.get("class") or "")]
    tag_counts = {}
    for el in root.iter():
        name = local_name(el.tag)
        tag_counts[name] = tag_counts.get(name, 0) + 1

    # 合并面板/裁剪区域：<clipPath><rect …/></clipPath> 的矩形（mm 坐标系）
    clip_rects = []
    for el in root.iter():
        if local_name(el.tag) != "clipPath":
            continue
        for child in list(el):
            if local_name(child.tag) != "rect":
                continue
            try:
                box = {
                    "id": el.get("id"),
                    "x": float(child.get("x") or 0),
                    "y": float(child.get("y") or 0),
                    "w": float(child.get("width") or 0),
                    "h": float(child.get("height") or 0),
                }
            except (TypeError, ValueError):
                continue
            if box["w"] > 0 and box["h"] > 0:
                clip_rects.append(box)

    details.update({
        "root": local_name(root.tag),
        "widthAttr": root.get("width"),
        "heightAttr": root.get("height"),
        "viewBox": view_box,
        "widthMm": width_val,
        "heightMm": height_val,
        "widthHasMmUnit": width_mm_unit,
        "heightHasMmUnit": height_mm_unit,
        "imageCount": len(image_els),
        "imageWithHrefCount": len(image_active),
        "cellCount": len(cell_els),
        "labelCount": len(label_els),
        "labelTexts": label_texts,
        "labelPositions": label_positions,
        "tagCounts": tag_counts,
        "clipRects": clip_rects,
        "figureBgFill": backgrounds[0].get("fill") if backgrounds else None,
        "imageHrefPrefix": (image_active[0].get("href")
                            or image_active[0].get("{http://www.w3.org/1999/xlink}href"))[:40]
        if image_active else None,
    })

    tolerance = args.tolerance
    if args.expect_width_mm is not None:
        add_check(checks, "width ≈ %.3fmm ±%s" % (args.expect_width_mm, tolerance),
                  width_val is not None and abs(width_val - args.expect_width_mm) <= tolerance,
                  {"actual": width_val, "attr": root.get("width")})
        add_check(checks, "width 带 mm 单位", width_mm_unit, root.get("width"))
    if args.expect_height_mm is not None:
        add_check(checks, "height ≈ %.3fmm ±%s" % (args.expect_height_mm, tolerance),
                  height_val is not None and abs(height_val - args.expect_height_mm) <= tolerance,
                  {"actual": height_val, "attr": root.get("height")})
        add_check(checks, "height 带 mm 单位", height_mm_unit, root.get("height"))
    if args.expect_width_mm is not None and args.expect_height_mm is not None:
        ok_vb = (len(vb_numbers) == 4
                 and abs(vb_numbers[0]) <= 0.01 and abs(vb_numbers[1]) <= 0.01
                 and abs(vb_numbers[2] - args.expect_width_mm) <= tolerance
                 and abs(vb_numbers[3] - args.expect_height_mm) <= tolerance)
        add_check(checks, 'viewBox ≈ "0 0 W H"', ok_vb, view_box)
    if args.expect_images is not None:
        add_check(checks, "含 %d 张有效 <image>" % args.expect_images,
                  len(image_active) == args.expect_images,
                  {"withHref": len(image_active), "total": len(image_els)})
    if args.expect_cells is not None:
        add_check(checks, "格子数 = %d" % args.expect_cells, len(cell_els) == args.expect_cells,
                  len(cell_els))
    if args.expect_labels is not None:
        add_check(checks, "编号文字数 = %d" % args.expect_labels,
                  len(label_els) == args.expect_labels, label_texts)
    if args.expect_label_texts:
        expected = [item for item in args.expect_label_texts.split("|")]
        add_check(checks, "编号文字内容一致", label_texts == expected,
                  {"expected": expected, "actual": label_texts})
    if args.expect_bg in ("white", "transparent"):
        fill = details["figureBgFill"]
        if args.expect_bg == "white":
            ok = str(fill).lower() in ("#ffffff", "#fff", "white")
            add_check(checks, "背景为白色", ok, fill)
        else:
            ok = str(fill).lower() in ("none", "transparent", "")
            add_check(checks, "背景为透明（fill=none）", ok, fill)
    # 合并面板：期望 clip 矩形（mm）与不重叠校验
    if args.expect_clip_rects_count is not None:
        add_check(checks, "面板 clip 矩形数量 = %d" % args.expect_clip_rects_count,
                  len(clip_rects) == args.expect_clip_rects_count, len(clip_rects))
    if args.expect_no_overlap:
        overlaps = []
        for i in range(len(clip_rects)):
            for j in range(i + 1, len(clip_rects)):
                a, b = clip_rects[i], clip_rects[j]
                overlap_w = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
                overlap_h = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
                if overlap_w > 0.05 and overlap_h > 0.05:
                    overlaps.append({"a": a, "b": b, "overlap": [round(overlap_w, 3), round(overlap_h, 3)]})
        add_check(checks, "面板 clip 矩形互不重叠", len(overlaps) == 0, overlaps[:3])
    if args.expect_clip_rects_json:
        try:
            expected_config = load_json_file(args.expect_clip_rects_json)
            expected_rects = expected_config.get("rects") if isinstance(expected_config, dict) else expected_config
            tolerance = float(expected_config.get("tolerance", 0.05)) if isinstance(expected_config, dict) else 0.05
            if not isinstance(expected_rects, list):
                raise ValueError("rects 不是数组")
            unused = list(range(len(clip_rects)))
            unmatched = []
            for expected in expected_rects:
                matched = None
                for pos in unused:
                    actual = clip_rects[pos]
                    if (abs(actual["x"] - expected["x"]) <= tolerance
                            and abs(actual["y"] - expected["y"]) <= tolerance
                            and abs(actual["w"] - expected["w"]) <= tolerance
                            and abs(actual["h"] - expected["h"]) <= tolerance):
                        matched = pos
                        break
                if matched is None:
                    unmatched.append(expected)
                else:
                    unused.remove(matched)
            add_check(checks, "面板 clip 矩形与期望几何一致（%d 个）" % len(expected_rects),
                      len(unmatched) == 0 and not unused,
                      {"unmatchedExpected": unmatched, "unexpectedActual": [clip_rects[i] for i in unused]})
        except Exception as exc:  # noqa: BLE001
            add_check(checks, "期望 clip 矩形 JSON 可解析", False, "%s: %s" % (type(exc).__name__, exc))
    return base, checks, details, 0


# --------------------------------------------------------------------------- #
# pdf
# --------------------------------------------------------------------------- #
def run_command(cmd, timeout=60):
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return proc.returncode, proc.stdout or "", proc.stderr or ""
    except Exception as exc:  # noqa: BLE001
        return -1, "", "%s: %s" % (type(exc).__name__, exc)


def pdf_mediabox_via_gs(path):
    if not os.path.exists(GS):
        return None, None, "ghostscript 不存在: " + GS
    escaped = path.replace("\\", "/")
    script = (
        '(%s) (r) file runpdfbegin ' % escaped
        + 'pdfpagecount = '
        + '1 pdfgetpage /MediaBox get == quit'
    )
    code, out, err = run_command([GS, "-q", "-dNODISPLAY", "-dNOSAFER", "-c", script])
    if code != 0:
        return None, None, "gs exit=%s stderr=%s" % (code, err.strip()[:400])
    lines = [line.strip() for line in out.splitlines() if line.strip()]
    page_count = None
    media_box = None
    for line in lines:
        if re.fullmatch(r"\d+", line) and page_count is None:
            page_count = int(line)
        elif line.startswith("[") and media_box is None:
            numbers = [float(item) for item in re.findall(r"-?[\d.]+", line)]
            if len(numbers) >= 4:
                media_box = numbers[-4:]
    return page_count, media_box, None


def pdf_mediabox_raw(path):
    try:
        with open(path, "rb") as fh:
            raw = fh.read()
    except OSError:
        return None, None
    text = raw.decode("latin-1", errors="ignore")
    page_count = None
    count_matches = re.findall(r"/Count\s+(\d+)", text)
    if count_matches:
        page_count = int(count_matches[0])
    match = re.search(r"/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]", text)
    media_box = None
    if match:
        media_box = [float(item) for item in match.groups()]
    return page_count, media_box


def render_pdf_first_page(path, render_dir, prefix, dpi):
    os.makedirs(render_dir, exist_ok=True)
    out_prefix = os.path.join(render_dir, prefix)
    # 清理旧文件
    for name in os.listdir(render_dir):
        if name.startswith(prefix):
            try:
                os.remove(os.path.join(render_dir, name))
            except OSError:
                pass
    cmd = [PDFTOPPM, "-png", "-r", str(dpi), "-f", "1", "-l", "1", "-singlefile", path, out_prefix]
    code, out, err = run_command(cmd)
    render_path = out_prefix + ".png"
    return {
        "command": " ".join(cmd),
        "returncode": code,
        "stdout": out.strip()[:400],
        "stderr": err.strip()[:400],
        "path": render_path if os.path.exists(render_path) else None,
    }


def render_all_pages_count(path, dpi=24):
    tmp = tempfile.mkdtemp(prefix="fp-pdf-pages-")
    code, out, err = run_command(
        [PDFTOPPM, "-png", "-r", str(dpi), path, os.path.join(tmp, "p")])
    files = [name for name in os.listdir(tmp) if name.lower().endswith(".png")]
    return {"returncode": code, "pages": len(files), "stderr": err.strip()[:300], "dir": tmp}


def pdf_pages_via_pdfinfo(path):
    """用 pdfinfo 读取页数（Task 契约要求优先使用 pdfinfo）。"""
    if not os.path.exists(PDFINFO):
        return None, "pdfinfo 不存在: " + PDFINFO
    code, out, err = run_command([PDFINFO, "--", path])
    if code != 0:
        return None, "pdfinfo exit=%s stderr=%s" % (code, err.strip()[:300])
    match = re.search(r"^Pages:\s+(\d+)", out, re.M)
    if not match:
        return None, "pdfinfo 输出无 Pages 字段"
    return int(match.group(1)), None


def verify_pdf(args):
    checks = []
    details = {}
    base = result_file_meta(args.file)
    if not base["exists"]:
        add_check(checks, "文件存在", False, args.file)
        return base, checks, details, 2
    add_check(checks, "文件存在且非空", base["size"] > 0, {"size": base["size"]})

    with open(args.file, "rb") as fh:
        head = fh.read(8)
    add_check(checks, "PDF 头 %PDF-", head.startswith(b"%PDF-"), head.decode("latin-1"))

    gs_pages, gs_box, gs_error = pdf_mediabox_via_gs(args.file)
    raw_pages, raw_box = pdf_mediabox_raw(args.file)
    pdfinfo_pages, pdfinfo_error = pdf_pages_via_pdfinfo(args.file)
    page_count = pdfinfo_pages if pdfinfo_pages is not None else (
        gs_pages if gs_pages is not None else raw_pages)
    media_box = gs_box if gs_box is not None else raw_box
    details["pageCount"] = page_count
    details["pageCountSource"] = (
        "pdfinfo" if pdfinfo_pages is not None
        else ("ghostscript" if gs_pages is not None else "raw-regex"))
    details["pdfinfoPages"] = pdfinfo_pages
    details["pdfinfoError"] = pdfinfo_error
    details["gsPages"] = gs_pages
    details["mediaBox"] = media_box
    details["gsError"] = gs_error
    details["mediaBoxSource"] = "ghostscript" if gs_box is not None else "raw-regex"

    if args.expect_pages is not None:
        add_check(checks, "页数 = %d" % args.expect_pages, page_count == args.expect_pages, page_count)
    if args.expect_width_mm is not None or args.expect_height_mm is not None:
        expected_w = (args.expect_width_mm * PT_PER_INCH / MM_PER_INCH
                      if args.expect_width_mm is not None else None)
        expected_h = (args.expect_height_mm * PT_PER_INCH / MM_PER_INCH
                      if args.expect_height_mm is not None else None)
        details["expectedSizePt"] = [
            round(value, 3) if value is not None else None for value in (expected_w, expected_h)
        ]
        if media_box is None:
            add_check(checks, "MediaBox 可读取", False, gs_error)
        else:
            w, h = media_box[2] - media_box[0], media_box[3] - media_box[1]
            details["sizePt"] = [round(w, 3), round(h, 3)]
            tol = args.tolerance_pt
            if expected_w is not None:
                add_check(checks, "MediaBox 宽度 ≈ %.2fpt ±%s" % (expected_w, tol),
                          abs(w - expected_w) <= tol, {"actual": round(w, 3)})
            if expected_h is not None:
                add_check(checks, "MediaBox 高度 ≈ %.2fpt ±%s" % (expected_h, tol),
                          abs(h - expected_h) <= tol, {"actual": round(h, 3)})
            if expected_w is not None and expected_h is not None:
                normal = abs(w - expected_w) <= tol and abs(h - expected_h) <= tol
                swapped = abs(w - expected_h) <= tol and abs(h - expected_w) <= tol
                add_check(checks, "页面方向正确（宽高未交换）", normal or not swapped,
                          {"normal": normal, "looksSwapped": swapped})

    # 渲染第一页并做非空白校验
    render_dir = args.render_dir or tempfile.mkdtemp(prefix="fp-pdf-render-")
    prefix = args.render_prefix or "page"
    render = render_pdf_first_page(args.file, render_dir, prefix, args.render_dpi)
    details["render"] = render
    add_check(checks, "pdftoppm 可渲染", render["path"] is not None,
              {"stderr": render["stderr"], "returncode": render["returncode"]})
    if render["path"] and Image is not None:
        try:
            info = image_stats(render["path"])
            details["renderImage"] = info
            add_check(checks, "渲染图非空白", not info["isBlank"],
                      {"stddev": info["stddev"], "uniqueColors": info["uniqueColors"]})
            if args.expect_width_mm is not None and args.expect_height_mm is not None:
                expected_render_w = args.expect_width_mm / MM_PER_INCH * args.render_dpi
                expected_render_h = args.expect_height_mm / MM_PER_INCH * args.render_dpi
                ok_w = abs(info["width"] - expected_render_w) <= 2
                ok_h = abs(info["height"] - expected_render_h) <= 2
                add_check(checks, "渲染像素尺寸 ≈ %.1fx%.1f" % (expected_render_w, expected_render_h),
                          ok_w and ok_h, {"actual": [info["width"], info["height"]]})
        except Exception as exc:  # noqa: BLE001
            add_check(checks, "PIL 可打开渲染图", False, "%s: %s" % (type(exc).__name__, exc))

    # 实际墨迹四边留白（PDF 白边裁剪验证）
    if args.max_ink_margin_mm is not None:
        if not render["path"]:
            add_check(checks, "墨迹留白可测（需渲染图）", False, render.get("stderr"))
        elif Image is None:
            add_check(checks, "墨迹留白可测（Pillow 不可用）", False, None)
        else:
            try:
                ink = measure_ink_margins(render["path"], args.render_dpi, args.ink_tolerance)
                details["inkMarginsMm"] = ink["marginsMm"]
                details["inkBoxPx"] = ink["boxPx"]
                details["inkImagePx"] = ink["imagePx"]
                details["inkTolerance"] = args.ink_tolerance
                if not ink.get("marginsMm"):
                    add_check(checks, "墨迹 bbox 可测（非空白页面）", False, ink.get("error"))
                else:
                    for side, label in (
                        ("top", "上"), ("right", "右"), ("bottom", "下"), ("left", "左"),
                    ):
                        margin = ink["marginsMm"][side]
                        add_check(
                            checks,
                            "墨迹%s边留白 %.2fmm ≤ %.2fmm" % (label, margin, args.max_ink_margin_mm),
                            margin <= args.max_ink_margin_mm + 1e-6,
                            {"marginMm": margin, "limitMm": args.max_ink_margin_mm})
            except Exception as exc:  # noqa: BLE001
                add_check(checks, "墨迹留白计算", False, "%s: %s" % (type(exc).__name__, exc))

    count_check = render_all_pages_count(args.file)
    details["renderPageCount"] = count_check["pages"]
    if args.expect_pages is not None and page_count is None:
        add_check(checks, "pdftoppm 页数 = %d" % args.expect_pages,
                  count_check["pages"] == args.expect_pages, count_check["pages"])
    return base, checks, details, 0


# --------------------------------------------------------------------------- #
# zip（多页 ZIP 导出）
# --------------------------------------------------------------------------- #
def inspect_image_bytes(data, name):
    """对 ZIP 内的单个文件做格式/可解码校验，返回详情 dict。"""
    info = {"name": name, "size": len(data)}
    lower = name.lower()
    try:
        if lower.endswith(".svg"):
            root = ET.fromstring(data)
            info["type"] = "svg"
            info["root"] = local_name(root.tag)
            info["ok"] = local_name(root.tag) == "svg"
            return info
        if Image is None:
            info["type"] = "image"
            info["ok"] = False
            info["error"] = "Pillow 不可用"
            return info
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            info.update({
                "type": "image", "format": img.format,
                "width": img.width, "height": img.height, "mode": img.mode,
                "ok": True,
            })
        return info
    except Exception as exc:  # noqa: BLE001
        info["ok"] = False
        info["error"] = "%s: %s" % (type(exc).__name__, exc)
        return info


def verify_zip(args):
    checks = []
    details = {}
    base = result_file_meta(args.file)
    if not base["exists"]:
        add_check(checks, "文件存在", False, args.file)
        return base, checks, details, 2
    add_check(checks, "文件存在且非空", base["size"] > 0, {"size": base["size"]})
    try:
        with zipfile.ZipFile(args.file) as archive:
            names = archive.namelist()
            entries = []
            for name in names:
                try:
                    data = archive.read(name)
                except Exception as exc:  # noqa: BLE001
                    entries.append({"name": name, "ok": False, "error": str(exc), "size": 0})
                    continue
                entry = inspect_image_bytes(data, name)
                entries.append(entry)
            bad_crc = archive.testzip()
    except Exception as exc:  # noqa: BLE001
        add_check(checks, "ZIP 可解析", False, "%s: %s" % (type(exc).__name__, exc))
        return base, checks, details, 2
    add_check(checks, "ZIP 可解析", True)
    add_check(checks, "ZIP CRC 全部有效", bad_crc is None, bad_crc)
    details.update({
        "entries": entries,
        "entryCount": len(entries),
        "names": names,
        "type": "zip",
    })
    if args.expect_entries is not None:
        add_check(checks, "ZIP 条目数 = %d" % args.expect_entries,
                  len(entries) == args.expect_entries, len(entries))
    if args.expect_ext:
        ext = args.expect_ext.lower().lstrip(".")
        bad = [entry["name"] for entry in entries if not entry["name"].lower().endswith("." + ext)]
        add_check(checks, "ZIP 内文件扩展名均为 .%s" % ext, len(bad) == 0, bad)
    if args.expect_name_pattern:
        try:
            pattern = re.compile(args.expect_name_pattern)
            unmatched = [entry["name"] for entry in entries if not pattern.search(entry["name"])]
            add_check(checks, "ZIP 内文件名符合正则", len(unmatched) == 0, unmatched[:5])
        except re.error as exc:
            add_check(checks, "ZIP 文件名正则有效", False, str(exc))
    bad_entries = [entry for entry in entries if not entry.get("ok")]
    add_check(checks, "ZIP 内每个文件可解码（PNG/JPG/SVG）", len(bad_entries) == 0,
              bad_entries[:3])
    if args.expect_image_width is not None or args.expect_image_height is not None:
        dims_bad = []
        for entry in entries:
            if entry.get("type") != "image":
                continue
            if args.expect_image_width is not None and entry.get("width") != args.expect_image_width:
                dims_bad.append({"name": entry["name"], "width": entry.get("width")})
            if args.expect_image_height is not None and entry.get("height") != args.expect_image_height:
                dims_bad.append({"name": entry["name"], "height": entry.get("height")})
        add_check(checks, "ZIP 内图片尺寸符合预期", len(dims_bad) == 0, dims_bad[:5])
    return base, checks, details, 0


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main(argv):
    # 统一 UTF-8 输出，避免 Windows 管道下 GBK 导致父进程解析失败
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001 - 老版本 Python 无 reconfigure
        pass
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", required=True, choices=["image", "svg", "pdf", "zip"])
    parser.add_argument("--file", required=True)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--tolerance", type=float, default=1.0)
    parser.add_argument("--tolerance-pt", type=float, default=0.6)
    # image
    parser.add_argument("--expect-width", type=int)
    parser.add_argument("--expect-height", type=int)
    parser.add_argument("--expect-format")
    parser.add_argument("--expect-alpha", type=lambda v: v.lower() in ("1", "true", "yes"))
    parser.add_argument("--expect-corner-alpha", type=int)
    parser.add_argument("--expect-white-corners", action="store_true")
    parser.add_argument("--min-unique-colors", type=int, default=16)
    parser.add_argument("--probe-points-json")
    # svg
    parser.add_argument("--expect-width-mm", type=float)
    parser.add_argument("--expect-height-mm", type=float)
    parser.add_argument("--expect-cells", type=int)
    parser.add_argument("--expect-images", type=int)
    parser.add_argument("--expect-labels", type=int)
    parser.add_argument("--expect-label-texts")
    parser.add_argument("--expect-bg", choices=["white", "transparent", "any"], default="any")
    parser.add_argument("--expect-clip-rects-json")
    parser.add_argument("--expect-clip-rects-count", type=int)
    parser.add_argument("--expect-no-overlap", action="store_true")
    # pdf
    parser.add_argument("--expect-pages", type=int)
    parser.add_argument("--render-dir")
    parser.add_argument("--render-prefix")
    parser.add_argument("--render-dpi", type=int, default=72)
    parser.add_argument("--max-ink-margin-mm", type=float)
    parser.add_argument("--ink-tolerance", type=int, default=14)
    # zip
    parser.add_argument("--expect-entries", type=int)
    parser.add_argument("--expect-ext")
    parser.add_argument("--expect-name-pattern")
    parser.add_argument("--expect-image-width", type=int)
    parser.add_argument("--expect-image-height", type=int)
    args = parser.parse_args(argv)

    if args.kind == "image":
        base, checks, details, hard_fail = verify_image(args)
    elif args.kind == "svg":
        base, checks, details, hard_fail = verify_svg(args)
    elif args.kind == "zip":
        base, checks, details, hard_fail = verify_zip(args)
    else:
        base, checks, details, hard_fail = verify_pdf(args)

    failed = [check for check in checks if not check["passed"]]
    ok = hard_fail == 0 and not failed
    report = {
        "kind": args.kind,
        "file": base["file"],
        "exists": base["exists"],
        "size": base.get("size", 0),
        "sha256": base.get("sha256"),
        "ok": ok,
        "checks": checks,
        "details": details,
        "failedChecks": [check["name"] for check in failed],
    }
    if args.json:
        json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        status = "OK" if ok else "FAIL"
        print("[%s] %s (%d checks, %d failed)" % (status, base["file"], len(checks), len(failed)))
        for check in checks:
            mark = "  OK  " if check["passed"] else "  FAIL"
            print("%s %s" % (mark, check["name"]))
    if hard_fail:
        return hard_fail
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
