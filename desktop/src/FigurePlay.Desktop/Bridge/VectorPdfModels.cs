using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>矢量 PDF 导出 spec（单页）。字段单位均为 mm / pt，颜色为 #RRGGBB。</summary>
    internal sealed class VectorPdfSpec
    {
        public double WidthMm { get; set; }

        public double HeightMm { get; set; }

        public string Background { get; set; } = "#ffffff";

        /// <summary>可选：PDF 自动裁剪白边（相对原页面左上角，mm）。无效时忽略（整页输出），不报错。</summary>
        public bool HasCrop { get; set; }

        public double CropXmm { get; set; }

        public double CropYmm { get; set; }

        public double CropWmm { get; set; }

        public double CropHmm { get; set; }

        /// <summary>
        /// v1.3.2：裁剪后保留的安全边距（mm，0–20，默认 1）。应用对用户“裁剪留边”取
        /// max(1, 用户值) 后通过 spec.trimMarginMm 传入；宿主二次墨迹校正以“实际 ink bbox + 该边距”
        /// 为目标，避免把底部编号等贴边内容裁掉。
        /// </summary>
        public double TrimMarginMm { get; set; } = 1.0;

        public double EffectiveWidthMm
        {
            get { return HasCrop ? CropWmm : WidthMm; }
        }

        public double EffectiveHeightMm
        {
            get { return HasCrop ? CropHmm : HeightMm; }
        }

        public List<VectorPdfPanel> Panels { get; } = new List<VectorPdfPanel>();

        public List<VectorPdfLabel> Labels { get; } = new List<VectorPdfLabel>();

        public const int MaxPanels = 200;

        public const int MaxLabels = 500;

        public static bool TryParse(JObject json, out VectorPdfSpec spec, out string error)
        {
            spec = null;
            error = null;

            if (json == null)
            {
                error = "导出参数无效：缺少 spec。";
                return false;
            }

            VectorPdfSpec result = new VectorPdfSpec();

            double widthMm;
            double heightMm;
            if (!TryGetDouble(json, "widthMm", out widthMm) || !TryGetDouble(json, "heightMm", out heightMm))
            {
                error = "导出参数无效：缺少页面宽度/高度（widthMm/heightMm）。";
                return false;
            }

            // PowerPoint 幻灯片尺寸限制约 1–56 英寸（25.4–1422.4 mm）
            if (widthMm < 20 || heightMm < 20 || widthMm > 1400 || heightMm > 1400)
            {
                error = "UNSUPPORTED_TRANSFORM";
                return false;
            }

            result.WidthMm = widthMm;
            result.HeightMm = heightMm;
            result.Background = GetString(json, "background", "#ffffff");
            result.TrimMarginMm = Math.Max(0, Math.Min(20, GetDouble(json, "trimMarginMm", 1.0)));

            // 可选白边裁剪：crop 无效（越界/过小）时静默忽略，输出整页
            JObject crop = json["crop"] as JObject;
            if (crop != null)
            {
                double cropX;
                double cropY;
                double cropW;
                double cropH;
                if (TryGetDouble(crop, "xMm", out cropX) &&
                    TryGetDouble(crop, "yMm", out cropY) &&
                    TryGetDouble(crop, "wMm", out cropW) &&
                    TryGetDouble(crop, "hMm", out cropH) &&
                    cropW >= 5 && cropH >= 5 &&
                    cropX >= -0.5 && cropY >= -0.5 &&
                    cropX + cropW <= widthMm + 1.0 &&
                    cropY + cropH <= heightMm + 1.0)
                {
                    result.HasCrop = true;
                    result.CropXmm = Math.Max(0, cropX);
                    result.CropYmm = Math.Max(0, cropY);
                    result.CropWmm = Math.Min(cropW, widthMm - result.CropXmm);
                    result.CropHmm = Math.Min(cropH, heightMm - result.CropYmm);
                }
            }

            JArray panels = json["panels"] as JArray;
            if (panels == null || panels.Count == 0)
            {
                error = "导出参数无效：没有可导出的面板（panels 为空）。";
                return false;
            }

            if (panels.Count > MaxPanels)
            {
                error = "导出参数无效：面板数量过多（" + panels.Count + "）。";
                return false;
            }

            foreach (JToken token in panels)
            {
                JObject panelJson = token as JObject;
                if (panelJson == null)
                {
                    error = "导出参数无效：panels 项不是对象。";
                    return false;
                }

                VectorPdfPanel panel = new VectorPdfPanel();
                panel.XMm = GetDouble(panelJson, "xMm", 0);
                panel.YMm = GetDouble(panelJson, "yMm", 0);
                panel.WMm = GetDouble(panelJson, "wMm", 0);
                panel.HMm = GetDouble(panelJson, "hMm", 0);
                if (panel.WMm <= 0 || panel.HMm <= 0)
                {
                    error = "导出参数无效：面板尺寸必须大于 0。";
                    return false;
                }

                panel.Fit = GetString(panelJson, "fit", "contain").Trim().ToLowerInvariant();
                if (panel.Fit != "contain" && panel.Fit != "stretch")
                {
                    // cover / zoom / offset 等复杂变换由前端回退位图
                    error = "UNSUPPORTED_TRANSFORM";
                    return false;
                }

                if (!string.IsNullOrEmpty(GetString(panelJson, "zoom", null)) ||
                    !string.IsNullOrEmpty(GetString(panelJson, "offsetX", null)) ||
                    !string.IsNullOrEmpty(GetString(panelJson, "offsetY", null)))
                {
                    error = "UNSUPPORTED_TRANSFORM";
                    return false;
                }

                panel.Rotation = GetDouble(panelJson, "rotation", 0);

                JObject image = panelJson["image"] as JObject;
                if (image == null)
                {
                    error = "导出参数无效：面板缺少 image。";
                    return false;
                }

                panel.Kind = GetString(image, "kind", "emf").Trim().ToLowerInvariant();
                string base64 = GetString(image, "base64", null);
                if (string.IsNullOrEmpty(base64))
                {
                    error = "导出参数无效：面板图像缺少 base64 内容。";
                    return false;
                }

                byte[] imageBytes;
                try
                {
                    imageBytes = Convert.FromBase64String(base64);
                }
                catch (FormatException)
                {
                    error = "导出参数无效：面板图像 base64 解码失败。";
                    return false;
                }

                if (imageBytes.Length < 16)
                {
                    error = "导出参数无效：面板图像数据过小。";
                    return false;
                }

                panel.ImageBytes = imageBytes;
                panel.ImageWidthPx = GetDouble(image, "width", 0);
                panel.ImageHeightPx = GetDouble(image, "height", 0);
                if (panel.Kind == "emf")
                {
                    if (!EmfValidator.LooksLikeEmf(imageBytes))
                    {
                        error = "UNSUPPORTED_TRANSFORM";
                        return false;
                    }
                }
                else if (panel.Kind == "png")
                {
                    if (!(imageBytes[0] == 0x89 && imageBytes[1] == 0x50 && imageBytes[2] == 0x4E && imageBytes[3] == 0x47))
                    {
                        error = "导出参数无效：PNG 面板数据不是有效 PNG。";
                        return false;
                    }
                }
                else if (panel.Kind == "jpg" || panel.Kind == "jpeg")
                {
                    panel.Kind = "jpg";
                    if (!(imageBytes[0] == 0xFF && imageBytes[1] == 0xD8))
                    {
                        error = "导出参数无效：JPG 面板数据不是有效 JPEG。";
                        return false;
                    }
                }
                else
                {
                    error = "导出参数无效：不支持的面板图像类型 " + panel.Kind + "。";
                    return false;
                }

                JObject border = panelJson["border"] as JObject;
                if (border != null)
                {
                    panel.BorderOn = GetBool(border, "on", false);
                    panel.BorderWidthMm = GetDouble(border, "widthMm", 0.25);
                    panel.BorderColor = GetString(border, "color", "#000000");
                }

                result.Panels.Add(panel);
            }

            JArray labels = json["labels"] as JArray;
            if (labels != null)
            {
                if (labels.Count > MaxLabels)
                {
                    error = "导出参数无效：标签数量过多（" + labels.Count + "）。";
                    return false;
                }

                foreach (JToken token in labels)
                {
                    JObject labelJson = token as JObject;
                    if (labelJson == null)
                    {
                        continue;
                    }

                    VectorPdfLabel label = new VectorPdfLabel();
                    label.Text = GetString(labelJson, "text", string.Empty);
                    if (string.IsNullOrEmpty(label.Text))
                    {
                        continue;
                    }

                    label.XMm = GetDouble(labelJson, "xMm", 0);
                    label.YMm = GetDouble(labelJson, "yMm", 0);
                    label.BoxXmm = GetDouble(labelJson, "boxXmm", label.XMm);
                    label.BoxYmm = GetDouble(labelJson, "boxYmm", label.YMm);
                    label.BoxWmm = GetDouble(labelJson, "boxWmm", 0);
                    label.BoxHmm = GetDouble(labelJson, "boxHmm", 0);
                    label.FontSizePt = GetDouble(labelJson, "fontSizePt", 10);
                    if (label.FontSizePt <= 0 || label.FontSizePt > 300)
                    {
                        label.FontSizePt = 10;
                    }

                    label.FontName = GetString(labelJson, "fontName", "Times New Roman");
                    label.Bold = GetBool(labelJson, "bold", false);
                    label.Italic = GetBool(labelJson, "italic", false);
                    label.Color = GetString(labelJson, "color", "#000000");
                    label.Align = GetString(labelJson, "align", "left").Trim().ToLowerInvariant();
                    label.Bg = GetString(labelJson, "bg", "none").Trim().ToLowerInvariant();
                    label.BgColor = GetString(labelJson, "bgColor", "#ffffff");
                    label.BgOpacity = GetDouble(labelJson, "bgOpacity", 1);

                    // 未提供 box 时按文字长度估算一个文本框
                    if (label.BoxWmm <= 0)
                    {
                        double estimated = Math.Max(6.0, label.Text.Length * label.FontSizePt * 0.55 * 0.3528);
                        label.BoxWmm = Math.Min(estimated, 300);
                    }

                    if (label.BoxHmm <= 0)
                    {
                        label.BoxHmm = Math.Max(2.0, label.FontSizePt * 1.8 * 0.3528);
                    }

                    result.Labels.Add(label);
                }
            }

            spec = result;
            return true;
        }

        private static bool TryGetDouble(JObject json, string key, out double value)
        {
            value = 0;
            JToken token = json[key];
            if (token == null || token.Type == JTokenType.Null)
            {
                return false;
            }

            try
            {
                value = token.Value<double>();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static double GetDouble(JObject json, string key, double defaultValue)
        {
            double value;
            return TryGetDouble(json, key, out value) ? value : defaultValue;
        }

        private static string GetString(JObject json, string key, string defaultValue)
        {
            JToken token = json[key];
            if (token == null || token.Type == JTokenType.Null)
            {
                return defaultValue;
            }

            string value = token.Type == JTokenType.String ? token.Value<string>() : token.ToString();
            return value ?? defaultValue;
        }

        private static bool GetBool(JObject json, string key, bool defaultValue)
        {
            JToken token = json[key];
            if (token == null || token.Type == JTokenType.Null)
            {
                return defaultValue;
            }

            try
            {
                return token.Value<bool>();
            }
            catch
            {
                return defaultValue;
            }
        }
    }

    internal sealed class VectorPdfPanel
    {
        public double XMm { get; set; }

        public double YMm { get; set; }

        public double WMm { get; set; }

        public double HMm { get; set; }

        public string Kind { get; set; } = "emf";

        public byte[] ImageBytes { get; set; }

        /// <summary>应用侧提供的前端显示像素宽高（用于 contain 时保持预览一致的比例）。</summary>
        public double ImageWidthPx { get; set; }

        public double ImageHeightPx { get; set; }

        public string Fit { get; set; } = "contain";

        public double Rotation { get; set; }

        public bool BorderOn { get; set; }

        public double BorderWidthMm { get; set; } = 0.25;

        public string BorderColor { get; set; } = "#000000";
    }

    internal sealed class VectorPdfLabel
    {
        public string Text { get; set; }

        public double XMm { get; set; }

        public double YMm { get; set; }

        public double BoxXmm { get; set; }

        public double BoxYmm { get; set; }

        public double BoxWmm { get; set; }

        public double BoxHmm { get; set; }

        public double FontSizePt { get; set; } = 10;

        public string FontName { get; set; } = "Times New Roman";

        public bool Bold { get; set; }

        public bool Italic { get; set; }

        public string Color { get; set; } = "#000000";

        public string Align { get; set; } = "left";

        public string Bg { get; set; } = "none";

        public string BgColor { get; set; } = "#ffffff";

        public double BgOpacity { get; set; } = 1;
    }

    /// <summary>矢量 PDF 导出结果。</summary>
    internal sealed class VectorPdfResult
    {
        public bool Ok { get; set; }

        public string Error { get; set; }

        public byte[] PdfBytes { get; set; }

        public string Engine { get; set; } = "PowerPoint";

        public int VectorPanels { get; set; }

        public int RasterPanels { get; set; }

        public List<string> Diagnostics { get; } = new List<string>();

        public static VectorPdfResult Fail(string error)
        {
            return new VectorPdfResult
            {
                Ok = false,
                Error = error,
            };
        }
    }
}
