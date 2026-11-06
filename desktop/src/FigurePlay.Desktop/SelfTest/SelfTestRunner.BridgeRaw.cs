using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FigurePlay.Desktop.SelfTest
{
    /// <summary>向页面注入原始 JS→Host 消息并读取 window.__figplayHostMessages 中的响应（供新桥协议测试）。</summary>
    internal sealed partial class SelfTestRunner
    {
        private async Task<JObject> SendRawHostRequestAsync(
            JObject request,
            string expectedType,
            int timeoutSeconds)
        {
            string requestId = "selftest-raw-" + DateTime.Now.Ticks + "-" + Guid.NewGuid().ToString("N").Substring(0, 6);
            request["requestId"] = requestId;
            string requestJson = request.ToString(Formatting.None);
            string jsPost = "(function(){ if (!window.chrome || !window.chrome.webview) { return 'no-webview'; }" +
                            " window.chrome.webview.postMessage(" + JsonConvert.ToString(requestJson) + "); return 'sent'; })()";
            string sent = await _form.EvalStringAsync(jsPost);
            if (!string.Equals(sent, "sent", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("window.chrome.webview 不可用：" + sent);
            }

            string probe = "(function(){ var a = window.__figplayHostMessages || [];" +
                           " for (var i = 0; i < a.length; i++) {" +
                           "   var d = a[i];" +
                           "   try { var o = (typeof d === 'string') ? JSON.parse(d) : d;" +
                           "     if (o && o.type === " + JsonConvert.ToString(expectedType) +
                           " && o.requestId === " + JsonConvert.ToString(requestId) + ") {" +
                           "       return JSON.stringify({ found: true, message: o }); }" +
                           "   } catch (e) {} }" +
                           " return JSON.stringify({ found: false, count: a.length }); })()";

            Stopwatch watch = Stopwatch.StartNew();
            while (watch.Elapsed < TimeSpan.FromSeconds(timeoutSeconds))
            {
                string raw = await _form.EvalStringAsync(probe);
                if (!string.IsNullOrEmpty(raw))
                {
                    JObject found = JObject.Parse(raw);
                    if (found.Value<bool>("found"))
                    {
                        JObject message = found["message"] as JObject;
                        if (message == null)
                        {
                            throw new InvalidOperationException("原始宿主响应为空。");
                        }

                        return message;
                    }
                }

                await Task.Delay(200);
            }

            throw new InvalidOperationException(
                timeoutSeconds + " 秒内未收到 " + expectedType + " 响应。");
        }
    }
}
