using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using FigurePlay.Desktop.Bridge;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>v1.5.1 save-file 原生保存路径桥：selftest 不弹窗、隔离写文件、校验内容/字节/路径安全。</summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> RunSaveFileTestAsync()
        {
            JObject result = new JObject();
            try
            {
                string outDir = Path.GetFullPath(_options.OutDir);
                byte[] payload = Encoding.UTF8.GetBytes("{\"marker\":\"figureplay-save-file-selftest\",\"n\":42}");
                JObject request = new JObject
                {
                    ["type"] = BridgeProtocol.TypeSaveFile,
                    ["suggestedName"] = "工程测试.figureplay.json",
                    ["filterName"] = "FigurePlay 工程",
                    ["filterExtensions"] = new JArray("figureplay.json"),
                    ["base64"] = Convert.ToBase64String(payload),
                };
                JObject response = await SendRawHostRequestAsync(
                    request,
                    BridgeProtocol.TypeFileSaved,
                    60);
                string path = response.Value<string>("path") ?? string.Empty;
                int bytes = response.Value<int?>("bytes") ?? -1;
                bool ok = response.Value<bool>("ok") && !response.Value<bool>("canceled") &&
                          bytes == payload.Length && File.Exists(path) &&
                          string.Equals(Path.GetFullPath(path),
                              Path.GetFullPath(Path.Combine(outDir, "save-file", "工程测试.figureplay.json")),
                              StringComparison.OrdinalIgnoreCase) &&
                          File.ReadAllBytes(path).Length == payload.Length;
                result["ok"] = ok;
                result["path"] = path;
                result["bytes"] = bytes;
                result["expectedBytes"] = payload.Length;

                JObject traversal = new JObject
                {
                    ["type"] = BridgeProtocol.TypeSaveFile,
                    ["suggestedName"] = "..\\..\\evil.json",
                    ["filterName"] = "测试",
                    ["filterExtensions"] = new JArray("json"),
                    ["base64"] = Convert.ToBase64String(new byte[] { 1, 2, 3 }),
                };
                JObject traversalResponse = await SendRawHostRequestAsync(
                    traversal,
                    BridgeProtocol.TypeFileSaved,
                    60);
                string traversalPath = traversalResponse.Value<string>("path") ?? string.Empty;
                bool traversalSafe = traversalResponse.Value<bool>("ok") &&
                                     traversalPath.StartsWith(Path.GetFullPath(Path.Combine(outDir, "save-file")) + Path.DirectorySeparatorChar,
                                         StringComparison.OrdinalIgnoreCase);
                result["traversalSafe"] = traversalSafe;
                result["traversalPath"] = traversalPath;

                JObject bad = new JObject
                {
                    ["type"] = BridgeProtocol.TypeSaveFile,
                    ["suggestedName"] = "bad.bin",
                    ["filterExtensions"] = new JArray("bin"),
                    ["base64"] = "!!!not-base64!!!",
                };
                JObject badResponse = await SendRawHostRequestAsync(
                    bad,
                    BridgeProtocol.TypeFileSaved,
                    60);
                result["invalidBase64Rejected"] = !badResponse.Value<bool>("ok") &&
                                                  !string.IsNullOrEmpty(badResponse.Value<string>("error"));
                result["ok"] = ok && traversalSafe && result.Value<bool>("invalidBase64Rejected");
                if (!result.Value<bool>("ok"))
                {
                    result["error"] = "save-file 测试失败：ok=" + ok + " traversalSafe=" + traversalSafe +
                                      " invalidBase64Rejected=" + result.Value<bool>("invalidBase64Rejected");
                }
            }
            catch (Exception ex)
            {
                result["ok"] = false;
                result["error"] = "save-file 测试异常：" + ex.Message;
            }

            return result;
        }
    }
}
