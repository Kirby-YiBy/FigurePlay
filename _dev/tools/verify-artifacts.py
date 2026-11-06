#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""校验 Playwright 下载/截图产物：能真实打开、尺寸/格式正确。

用法（绝对路径）：
  C:\\Users\\DragonDance\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe ^
    E:\\FigurePlay\\_dev\\tools\\verify-artifacts.py --json ^
    E:\\FigurePlay\\_dev\\artifacts\\downloads\\smoke-download.png

退出码：
  0 = 所有文件存在且可校验（图片能被 PIL 打开）
  2 = 有文件缺失/为空
  3 = 有图片无法被 PIL 打开
输出：
  默认逐行打印；--json 时输出单个 JSON 对象（Node 侧解析用）。
"""
import argparse
import json
import os
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None


def sniff(path):
    with open(path, "rb") as fh:
        head = fh.read(512)
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"GIF87a") or head.startswith(b"GIF89a"):
        return "gif"
    if head.startswith(b"%PDF"):
        return "pdf"
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "webp"
    stripped = head.lstrip(b"\xef\xbb\xbf \t\r\n")
    if stripped.startswith(b"<svg") or stripped.startswith(b"<?xml"):
        return "svg"
    return "unknown"


def verify_one(path):
    result = {"path": os.path.abspath(path), "exists": os.path.exists(path)}
    if not result["exists"]:
        result["ok"] = False
        result["error"] = "file not found"
        return result
    size = os.path.getsize(path)
    result["size"] = size
    result["sniff"] = sniff(path)
    if size == 0:
        result["ok"] = False
        result["error"] = "empty file"
        return result

    if result["sniff"] in ("png", "jpeg", "gif", "webp"):
        if Image is None:
            result["ok"] = True
            result["warning"] = "Pillow not installed; skipped image decode"
            return result
        try:
            with Image.open(path) as img:
                img.load()
                info = {
                    "format": img.format,
                    "width": img.width,
                    "height": img.height,
                    "mode": img.mode,
                }
                if img.mode in ("RGBA", "LA", "PA"):
                    alpha = img.getchannel("A").getextrema()
                    info["alphaExtrema"] = list(alpha)
                result["image"] = info
            result["ok"] = True
        except Exception as exc:  # noqa: BLE001 - 需要把失败原因完整带回
            result["ok"] = False
            result["error"] = "PIL decode failed: %s: %s" % (type(exc).__name__, exc)
        return result

    if result["sniff"] == "pdf":
        try:
            with open(path, "rb") as fh:
                data = fh.read()
            result["pdfHeaderOk"] = data.startswith(b"%PDF")
            result["pdfTrailerOk"] = b"%%EOF" in data[-2048:]
            result["ok"] = bool(result["pdfHeaderOk"] and result["pdfTrailerOk"])
        except Exception as exc:  # noqa: BLE001
            result["ok"] = False
            result["error"] = str(exc)
        return result

    # 文本类：给出 UTF-8 预览与行数
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read(4000)
        result["textPreview"] = text[:300]
        result["textLines"] = text.count("\n") + (0 if text.endswith("\n") else 1)
        result["ok"] = True
    except Exception as exc:  # noqa: BLE001
        result["ok"] = False
        result["error"] = str(exc)
    return result


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    results = [verify_one(path) for path in args.files]
    missing = [r for r in results if not r.get("exists")]
    bad_images = [r for r in results if r.get("sniff") in ("png", "jpeg", "gif", "webp") and not r.get("ok")]

    if args.json:
        json.dump({"files": results}, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        for r in results:
            status = "OK " if r.get("ok") else "FAIL"
            if r.get("image"):
                img = r["image"]
                print("[%s] %s  %s %dx%d %s  %d bytes" % (
                    status, r["path"], img["format"], img["width"], img["height"],
                    img["mode"], r["size"]))
            elif r.get("sniff") == "pdf":
                print("[%s] %s  PDF header=%s trailer=%s  %d bytes" % (
                    status, r["path"], r.get("pdfHeaderOk"), r.get("pdfTrailerOk"), r["size"]))
            elif r.get("textPreview") is not None:
                print("[%s] %s  text %d bytes, %d lines: %r" % (
                    status, r["path"], r["size"], r.get("textLines", 0), r["textPreview"][:80]))
            else:
                print("[%s] %s  %s  %s" % (status, r["path"], r.get("sniff"), r.get("error", "")))

    if missing:
        return 2
    if bad_images:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
