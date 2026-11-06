#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""verify-exports.py 自检：用可控的合成产物验证"校验器本身"的判断正确（正确通过 + 错误必失败）。

用法：
  C:\\Users\\DragonDance\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe ^
    E:\\FigurePlay\\_dev\\tools\\verify-exports-selftest.py

产物：E:\\FigurePlay\\_dev\\artifacts\\fixtures\\*（可重复生成）
退出码：0=自检全部符合预期；1=有不符合。
"""
import json
import os
import subprocess
import sys
import zipfile
from io import BytesIO

from PIL import Image, ImageDraw

DEV_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(DEV_DIR, "artifacts", "fixtures")
VERIFY = os.path.join(DEV_DIR, "tools", "verify-exports.py")
SAMPLES = os.path.join(DEV_DIR, "samples")
MM_PER_INCH = 25.4
PT_PER_INCH = 72.0

SVG_FIXTURE = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="170mm" height="113.27mm" viewBox="0 0 170 113.27">
  <title>fixture</title>
  <rect class="figure-bg" x="0" y="0" width="170" height="113.27" fill="#ffffff"/>
  <g data-i="0" clip-path="url(#c0)"><clipPath id="c0"><rect x="0" y="0" width="54" height="54"/></clipPath>
    <image x="0" y="0" width="100" height="100" preserveAspectRatio="none" href="data:image/png;base64,AAAA"/></g>
  <g data-i="1" clip-path="url(#c1)"><clipPath id="c1"><rect x="56" y="0" width="54" height="54"/></clipPath>
    <image x="0" y="0" width="100" height="100" preserveAspectRatio="none" href="data:image/png;base64,BBBB"/></g>
  <g data-i="2"><rect x="112" y="0" width="54" height="54" fill="#ffffff"/></g>
  <image x="0" y="0" width="1" height="1" display="none" href=""/>
  <g class="labels-layer">
    <text class="label-text" x="5" y="10" font-size="3.17">(a)</text>
    <text class="label-text" x="61" y="10" font-size="3.17">(b)</text>
  </g>
</svg>
"""


def run_verify(args):
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run([sys.executable, VERIFY, "--json"] + args,
                          capture_output=True, text=True, encoding="utf-8",
                          errors="replace", env=env)
    try:
        report = json.loads(proc.stdout or "")
    except json.JSONDecodeError:
        report = {"raw": proc.stdout, "stderr": proc.stderr}
    return proc.returncode, report


def main():
    os.makedirs(FIXTURES, exist_ok=True)
    checks = []

    def check(name, condition, detail=None):
        checks.append({"name": name, "passed": bool(condition), "detail": detail})
        print(("[PASS] " if condition else "[FAIL] ") + name + ("" if condition else " :: " + str(detail)))

    # ---- fixtures ----
    png_path = os.path.join(FIXTURES, "fixture-source.png")
    with Image.open(os.path.join(SAMPLES, "sample-3.png")) as img:
        img.save(png_path, "PNG")

    jpg_path = os.path.join(FIXTURES, "fixture-photo.jpg")
    with Image.open(os.path.join(SAMPLES, "sample-1.png")) as img:
        img.convert("RGB").save(jpg_path, "JPEG", quality=90)

    svg_path = os.path.join(FIXTURES, "fixture-export.svg")
    with open(svg_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(SVG_FIXTURE)

    pdf_path = os.path.join(FIXTURES, "fixture-export.pdf")
    pdf_w, pdf_h = 482, 321
    pdf_img = Image.new("RGB", (pdf_w, pdf_h), (255, 255, 255))
    draw = ImageDraw.Draw(pdf_img)
    draw.rectangle([20, 20, 250, 160], fill=(217, 74, 56))
    draw.rectangle([260, 40, 460, 280], fill=(47, 111, 208))
    draw.ellipse([60, 180, 220, 300], fill=(46, 158, 91))
    pdf_img.save(pdf_path, "PDF", resolution=72.0)
    expected_pdf_w_mm = pdf_w * MM_PER_INCH / PT_PER_INCH
    expected_pdf_h_mm = pdf_h * MM_PER_INCH / PT_PER_INCH

    # ---- 1) PNG 正确预期应通过 ----
    code, report = run_verify([
        "--kind", "image", "--file", png_path,
        "--expect-width", "1200", "--expect-height", "900", "--tolerance", "1",
        "--expect-alpha", "false", "--expect-format", "png",
    ])
    check("PNG 正确预期 -> 通过", code == 0 and report.get("ok") is True, report.get("failedChecks"))
    image_details = report.get("details", {}).get("image", {})
    check("PNG 报告尺寸正确", image_details.get("width") == 1200 and image_details.get("height") == 900,
          [image_details.get("width"), image_details.get("height")])
    check("PNG 非空白判定", image_details.get("isBlank") is False, image_details.get("stddev"))

    # ---- 2) PNG 错误尺寸必须失败 ----
    code, report = run_verify([
        "--kind", "image", "--file", png_path,
        "--expect-width", "999", "--expect-height", "900",
    ])
    check("PNG 错误尺寸 -> 失败", code == 1 and any("宽度" in item for item in report.get("failedChecks", [])),
          report.get("failedChecks"))

    # ---- 3) JPG 正确预期应通过 ----
    code, report = run_verify([
        "--kind", "image", "--file", jpg_path,
        "--expect-width", "1200", "--expect-height", "900", "--expect-format", "jpeg",
        "--expect-alpha", "false",
    ])
    check("JPG 正确预期 -> 通过", code == 0, report.get("failedChecks"))

    # ---- 4) 透明 PNG 检测 ----
    transparent_png = os.path.join(FIXTURES, "fixture-transparent.png")
    rgba = Image.new("RGBA", (300, 200), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rgba)
    for i in range(6):
        draw.rectangle([10 + i * 46, 10, 50 + i * 46, 190],
                       fill=(40 + i * 30, 90 + i * 20, 160 - i * 20, 255))
    rgba.save(transparent_png, "PNG")
    code, report = run_verify([
        "--kind", "image", "--file", transparent_png,
        "--expect-width", "300", "--expect-height", "200",
        "--expect-alpha", "true", "--expect-corner-alpha", "0",
        "--min-unique-colors", "4",
    ])
    check("透明 PNG alpha=0 -> 通过", code == 0, report.get("failedChecks"))

    # ---- 5) SVG 正确预期应通过 ----
    code, report = run_verify([
        "--kind", "svg", "--file", svg_path,
        "--expect-width-mm", "170", "--expect-height-mm", "113.27",
        "--expect-cells", "3", "--expect-images", "2", "--expect-labels", "2",
        "--expect-label-texts", "(a)|(b)", "--expect-bg", "white",
    ])
    check("SVG 正确预期 -> 通过", code == 0, report.get("failedChecks"))
    svg_details = report.get("details", {})
    check("SVG 解析 viewBox/图片/文字", svg_details.get("viewBox") == "0 0 170 113.27"
          and svg_details.get("imageWithHrefCount") == 2
          and svg_details.get("labelTexts") == ["(a)", "(b)"],
          {k: svg_details.get(k) for k in ("viewBox", "imageWithHrefCount", "labelTexts")})

    # ---- 6b) SVG clip 矩形 / 合并面板无重叠 ----
    clip_json = os.path.join(FIXTURES, "fixture-clip-rects.json")
    with open(clip_json, "w", encoding="utf-8") as fh:
        json.dump({"tolerance": 0.05, "rects": [
            {"x": 0, "y": 0, "w": 54, "h": 54},
            {"x": 56, "y": 0, "w": 54, "h": 54},
        ]}, fh)
    code, report = run_verify([
        "--kind", "svg", "--file", svg_path,
        "--expect-clip-rects-count", "2", "--expect-no-overlap",
        "--expect-clip-rects-json", clip_json,
    ])
    check("SVG clip 矩形/无重叠 -> 通过", code == 0, report.get("failedChecks"))
    wrong_clip_json = os.path.join(FIXTURES, "fixture-clip-rects-wrong.json")
    with open(wrong_clip_json, "w", encoding="utf-8") as fh:
        json.dump({"tolerance": 0.05, "rects": [{"x": 0, "y": 0, "w": 999, "h": 54}]}, fh)
    code, report = run_verify([
        "--kind", "svg", "--file", svg_path, "--expect-clip-rects-json", wrong_clip_json,
    ])
    check("SVG 错误 clip 矩形 -> 失败", code == 1, report.get("failedChecks"))

    # ---- 6c) 像素探针 ----
    probe_json = os.path.join(FIXTURES, "fixture-probe-points.json")
    with open(probe_json, "w", encoding="utf-8") as fh:
        json.dump({"points": [
            {"name": "左上透明", "x": 0, "y": 0, "expect": "transparent", "tolerance": 2},
            {"name": "中心有内容", "x": 150, "y": 100, "expect": "nonwhite", "tolerance": 15},
        ]}, fh)
    code, report = run_verify([
        "--kind", "image", "--file", transparent_png, "--probe-points-json", probe_json,
        "--min-unique-colors", "4",
    ])
    check("PNG 像素探针 -> 通过", code == 0, report.get("failedChecks"))

    code, report = run_verify([
        "--kind", "svg", "--file", svg_path,
        "--expect-label-texts", "(x)|(y)",
    ])
    check("SVG 错误编号文字 -> 失败", code == 1, report.get("failedChecks"))

    # ---- 7) PDF 校验（MediaBox / 页数 / 渲染）----
    code, report = run_verify([
        "--kind", "pdf", "--file", pdf_path,
        "--expect-width-mm", str(expected_pdf_w_mm), "--expect-height-mm", str(expected_pdf_h_mm),
        "--expect-pages", "1",
        "--render-dir", FIXTURES, "--render-prefix", "selftest-pdf",
    ])
    check("PDF 正确预期 -> 通过", code == 0, report.get("failedChecks"))
    pdf_details = report.get("details", {})
    check("PDF MediaBox 来源 = ghostscript", pdf_details.get("mediaBoxSource") == "ghostscript",
          pdf_details.get("gsError"))
    check("PDF 渲染图存在", bool(pdf_details.get("render", {}).get("path")),
          pdf_details.get("render", {}).get("stderr"))

    # ---- 8) PDF 错误尺寸必须失败 ----
    code, report = run_verify([
        "--kind", "pdf", "--file", pdf_path,
        "--expect-width-mm", "999",
    ])
    check("PDF 错误尺寸 -> 失败", code == 1, report.get("failedChecks"))

    # ---- 10) 多页 PDF（pdfinfo 页数）----
    multi_pdf = os.path.join(FIXTURES, "fixture-multipage.pdf")
    page_a = Image.new("RGB", (240, 180), (255, 255, 255))
    draw = ImageDraw.Draw(page_a)
    draw.rectangle([20, 20, 120, 160], fill=(217, 74, 56))
    draw.rectangle([140, 40, 220, 150], fill=(47, 111, 208))
    page_b = Image.new("RGB", (240, 180), (255, 255, 255))
    draw = ImageDraw.Draw(page_b)
    draw.ellipse([40, 20, 200, 160], fill=(46, 158, 91))
    page_a.save(multi_pdf, "PDF", resolution=72.0, save_all=True, append_images=[page_b])
    code, report = run_verify([
        "--kind", "pdf", "--file", multi_pdf,
        "--expect-pages", "2",
        "--render-dir", FIXTURES, "--render-prefix", "selftest-multipdf",
    ])
    check("多页 PDF（Pages=2）-> 通过", code == 0, report.get("failedChecks"))
    pdf_details = report.get("details", {})
    check("多页 PDF 页数来源 pdfinfo", pdf_details.get("pageCountSource") == "pdfinfo"
          and pdf_details.get("pdfinfoPages") == 2,
          {k: pdf_details.get(k) for k in ("pageCount", "pageCountSource", "pdfinfoPages", "pdfinfoError")})
    check("多页 PDF 渲染页数=2", pdf_details.get("renderPageCount") == 2,
          pdf_details.get("renderPageCount"))

    # ---- 10b) PDF 实际墨迹四边留白（ink trim 验证能力）----
    code, report = run_verify([
        "--kind", "pdf", "--file", multi_pdf,
        "--render-dir", FIXTURES, "--render-prefix", "selftest-ink", "--render-dpi", "96",
        "--max-ink-margin-mm", "100",
    ])
    ink_details = report.get("details", {})
    ink_margins = ink_details.get("inkMarginsMm") or {}
    check("PDF 墨迹四边留白可测（inkMarginsMm 结构完整）",
          code == 0 and all(side in ink_margins for side in ("top", "right", "bottom", "left")),
          {"code": code, "margins": ink_margins, "boxPx": ink_details.get("inkBoxPx")})
    check("PDF 墨迹留白数值为合理非负 mm",
          all(0 <= ink_margins.get(side, -1) <= 100 for side in ("top", "right", "bottom", "left")),
          ink_margins)
    code, report = run_verify([
        "--kind", "pdf", "--file", multi_pdf,
        "--render-dir", FIXTURES, "--render-prefix", "selftest-ink-strict", "--render-dpi", "96",
        "--max-ink-margin-mm", "0.1",
    ])
    check("PDF 墨迹留白阈值过严 -> 失败", code == 1,
          report.get("failedChecks"))

    # ---- 11) ZIP 多页导出校验 ----
    zip_path = os.path.join(FIXTURES, "fixture-pages.zip")
    with zipfile.ZipFile(zip_path, "w") as archive:
        for index in (1, 2):
            buffer = BytesIO()
            image = Image.new("RGB", (200, 150), (255, 255, 255))
            draw = ImageDraw.Draw(image)
            draw.rectangle([10, 10, 100 + index * 20, 140], fill=(40 + index * 60, 90, 160 - index * 30))
            image.save(buffer, "PNG")
            archive.writestr("figure-p%02d.png" % index, buffer.getvalue())
    code, report = run_verify([
        "--kind", "zip", "--file", zip_path,
        "--expect-entries", "2", "--expect-ext", "png",
        "--expect-name-pattern=-p\\d{2}\\.png$",
        "--expect-image-width", "200", "--expect-image-height", "150",
    ])
    check("ZIP 2 页 PNG -> 通过", code == 0, report.get("failedChecks"))
    zip_details = report.get("details", {})
    check("ZIP 解析出 2 个条目且可解码",
          zip_details.get("entryCount") == 2
          and all(entry.get("ok") for entry in zip_details.get("entries", [])),
          zip_details.get("names"))
    code, report = run_verify(["--kind", "zip", "--file", zip_path, "--expect-entries", "3"])
    check("ZIP 错误条目数 -> 失败", code == 1, report.get("failedChecks"))

    # ---- 9) 文件缺失 -> 退出码 2 ----
    code, report = run_verify(["--kind", "image", "--file", os.path.join(FIXTURES, "not-exist.png")])
    check("缺失文件 -> 退出码 2", code == 2, code)

    failed = [item for item in checks if not item["passed"]]
    print("\nSELFTEST %s (%d checks, %d failed)" % ("PASS" if not failed else "FAIL", len(checks), len(failed)))
    print("fixtures:", FIXTURES)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
