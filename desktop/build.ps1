#requires -Version 5.1
<#
.SYNOPSIS
    FigurePlay 桌面版一键构建脚本（多文件版 + 单文件版）。

.DESCRIPTION
    .NET Framework 4.8 + Microsoft.Web.WebView2 外壳构建流程：
      1. 从网页版源目录（默认 E:\FigurePlay）复制最新的 index.html / assets / js / vendor 到 dist\wwwroot；
      2. dotnet publish 构建 net48 多文件版 exe 到 dist；
      3. 运行 dist\FigurePlay.exe --selftest（加载应用、三栏布局、EMF 剪贴板、桥 E2E、MATLAB .fig 导入、截图）；
      4. 把整个 dist 打成 payload.zip，构建单文件版 dist-single\FigurePlay.exe；
      5. 在干净临时目录中运行单文件版 --selftest（验证自解压到 %LOCALAPPDATA%\FigurePlay\bin 后可运行）；
      6. 生成多文件版与单文件版两个 zip。

.PARAMETER Configuration
    Release（默认）或 Debug。

.PARAMETER AppSource
    网页版源目录，默认为 desktop 目录的上级（即 E:\FigurePlay）。

.PARAMETER DotnetPath
    dotnet.exe 路径；默认从 PATH / C:\Program Files\dotnet 自动查找。

.PARAMETER SkipBuild
    跳过主程序 dotnet publish，只重新复制网页应用并跑自测（用于网页端更新后快速重打包；exe 未变时可用）。

.PARAMETER SkipSelfTest
    跳过自测（多文件版与单文件版都跳过）。

.PARAMETER SkipZip
    跳过 zip 打包。

.PARAMETER SkipSingleFile
    跳过单文件版构建与自测，只产出多文件版。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File E:\FigurePlay\desktop\build.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File E:\FigurePlay\desktop\build.ps1 -SkipBuild -SkipZip
#>
[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')]
    [string]$Configuration = 'Release',

    [string]$AppSource,

    [string]$DotnetPath,

    [switch]$SkipBuild,

    [switch]$SkipSelfTest,

    [switch]$SkipZip,

    [switch]$SkipSingleFile
)

$ErrorActionPreference = 'Stop'

$desktopDir = $PSScriptRoot
if (-not $desktopDir) {
    $desktopDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

$mainProject = Join-Path $desktopDir 'src\FigurePlay.Desktop'
$singleProject = Join-Path $desktopDir 'src\FigurePlay.SingleFile'
$payloadDir = Join-Path $singleProject 'payload'
$payloadZip = Join-Path $payloadDir 'payload.zip'

$distDir = Join-Path $desktopDir 'dist'
$singleDir = Join-Path $desktopDir 'dist-single'
$selftestDir = Join-Path $desktopDir 'selftest'
$selftestSingleDir = Join-Path $desktopDir 'selftest-single'

$zipPath = Join-Path $desktopDir 'FigurePlay-desktop-1.4.2-win-x64.zip'
$singleZipPath = Join-Path $desktopDir 'FigurePlay-1.4.2-single-win-x64.zip'

if (-not $AppSource) {
    $AppSource = Split-Path -Parent $desktopDir
}
$AppSource = [System.IO.Path]::GetFullPath($AppSource)

function Write-Step([string]$Text) {
    Write-Host ''
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Write-Info([string]$Text) {
    Write-Host "    $Text"
}

function Fail([string]$Text) {
    throw $Text
}

function Get-MatlabInfo {
    try {
        $envPath = [Environment]::GetEnvironmentVariable('FIGPLAY_MATLAB_PATH')
        if ($envPath -and (Test-Path $envPath)) {
            return @{ Path = $envPath; Source = '环境变量 FIGPLAY_MATLAB_PATH' }
        }
    }
    catch { }

    try {
        $configPath = Join-Path $env:LOCALAPPDATA 'FigurePlay\matlab-path.txt'
        if (Test-Path $configPath) {
            $configured = (Get-Content -Path $configPath -Raw -ErrorAction SilentlyContinue)
            if ($configured) {
                $configured = $configured.Trim()
                if ($configured -and (Test-Path $configured)) {
                    return @{ Path = $configured; Source = '配置文件 matlab-path.txt' }
                }
            }
        }
    }
    catch { }

    try {
        $matlabKeys = Get-ChildItem 'HKLM:\SOFTWARE\MathWorks\MATLAB' -ErrorAction SilentlyContinue |
            Sort-Object PSChildName -Descending
        foreach ($key in $matlabKeys) {
            $root = (Get-ItemProperty -Path $key.PSPath -Name MATLABROOT -ErrorAction SilentlyContinue).MATLABROOT
            if ($root) {
                $candidate = Join-Path $root 'bin\matlab.exe'
                if (Test-Path $candidate) {
                    return @{ Path = $candidate; Source = '注册表 MathWorks\MATLAB' }
                }
            }
        }
    }
    catch { }

    foreach ($base in @('D:\Program Files\MATLAB', 'C:\Program Files\MATLAB', 'C:\Program Files (x86)\MATLAB')) {
        try {
            if (Test-Path $base) {
                $versionDir = Get-ChildItem -Path $base -Directory -Filter 'R*' -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    Select-Object -First 1
                if ($versionDir) {
                    $candidate = Join-Path $versionDir.FullName 'bin\matlab.exe'
                    if (Test-Path $candidate) {
                        return @{ Path = $candidate; Source = '常见安装目录' }
                    }
                }
            }
        }
        catch { }
    }

    return $null
}

function Read-SelfTestReport([string]$ReportPath, [string]$Label) {
    if (-not (Test-Path $ReportPath)) {
        Fail "$Label 自测未生成报告：$ReportPath"
    }

    $report = Get-Content -Path $ReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Info "报告          : $ReportPath"
    if ($report.app) {
        Write-Info ("应用就绪      : {0}（{1} ms，版本 {2}）" -f $report.app.ready, $report.app.readyWaitMs, $report.app.version)
    }
    if ($report.layout) {
        $grid = $report.layout.metrics.gridColumns
        $stageWidth = [math]::Round($report.layout.metrics.stage.width, 1)
        Write-Info ("三栏布局      : ok={0} grid={1} stage={2}px viewport={3}x{4}" -f $report.layout.ok, $grid, $stageWidth, $report.layout.metrics.viewport.innerWidth, $report.layout.metrics.viewport.innerHeight)
    }
    if ($report.clipboardEmf) {
        Write-Info ("EMF→PNG       : ok={0} {1} {2}x{3} {4} bytes" -f $report.clipboardEmf.ok, $report.clipboardEmf.sourceFormat, $report.clipboardEmf.width, $report.clipboardEmf.height, $report.clipboardEmf.pngBytes)
    }
    if ($report.bridgeE2E) {
        Write-Info ("桥端到端      : ok={0}（{1} ms）" -f $report.bridgeE2E.ok, $report.bridgeE2E.latencyMs)
    }
    if ($report.appDesktopApi) {
        Write-Info ("应用 JS 桥    : ok={0}（{1} ms）" -f $report.appDesktopApi.ok, $report.appDesktopApi.latencyMs)
    }
    if ($report.matlabFig) {
        if ($report.matlabFig.available) {
            Write-Info ("MATLAB .fig   : ok={0} {1}x{2} {3}（转换 {4} ms，MATLAB {5}）" -f $report.matlabFig.ok, $report.matlabFig.width, $report.matlabFig.height, $report.matlabFig.response.sourceFormat, $report.matlabFig.response.convertMs, $report.matlabFig.matlabVersion)
        }
        else {
            Write-Info "MATLAB .fig   : skipped（未检测到 MATLAB）"
        }
    }
    if ($report.vectorPdf) {
        if ($report.vectorPdf.available) {
            $pageW = $report.vectorPdf.checks.pageWidthPt
            $pageH = $report.vectorPdf.checks.pageHeightPt
            Write-Info ("矢量 PDF      : ok={0} engine={1} 页面={2}x{3}pt vectorPanels={4} rasterPanels={5}（{6} ms）" -f $report.vectorPdf.ok, $report.vectorPdf.engine, $pageW, $pageH, $report.vectorPdf.vectorPanels, $report.vectorPdf.rasterPanels, $report.vectorPdf.latencyMs)
        }
        else {
            Write-Info '矢量 PDF      : skipped（未安装 PowerPoint）'
        }
    }
    if ($report.appVectorE2E) {
        if ($report.appVectorE2E.available) {
            $appPageW = $report.appVectorE2E.checks.pageWidthPt
            $appPageH = $report.appVectorE2E.checks.pageHeightPt
            Write-Info ("应用矢量 E2E  : ok={0} 页面={1}x{2}pt 位图数={3} 标签={4}（导入 {5} ms / 导出 {6} ms）" -f $report.appVectorE2E.ok, $appPageW, $appPageH, $report.appVectorE2E.checks.imageCount, $report.appVectorE2E.checks.labelTextOk, $report.appVectorE2E.importMs, $report.appVectorE2E.exportMs)
            if ($report.appVectorE2E.trim) {
                $trimObj = $report.appVectorE2E.trim
                $trimOk = $trimObj.ok
                $basic = $trimObj.basic
                $bChecks = $basic.checks
                Write-Info ("  trim 基础   : ok={0} 页={1}x{2}mm 余量 L/T/R/B={3}/{4}/{5}/{6}mm 位图={7}" -f $basic.ok, $bChecks.pageWidthMm, $bChecks.pageHeightMm, $bChecks.leftMarginMm, $bChecks.topMarginMm, $bChecks.rightMarginMm, $bChecks.bottomMarginMm, $bChecks.imageCount)
                $lt0 = $trimObj.labelTrim0
                if ($lt0) {
                    $l0 = $lt0.checks
                    Write-Info ("  编号 trim=0 : ok={0} 页={1}x{2}mm 余量 L/T/R/B={3}/{4}/{5}/{6}mm 底部编号墨迹={7}px 文本={8}" -f $lt0.ok, $l0.pageWidthMm, $l0.pageHeightMm, $l0.leftMarginMm, $l0.topMarginMm, $l0.rightMarginMm, $l0.bottomMarginMm, $l0.bottomLabelInkPixels, $l0.labelTextOk)
                }
                $lt2 = $trimObj.labelTrim2
                if ($lt2) {
                    $l2 = $lt2.checks
                    Write-Info ("  编号 trim=2 : ok={0} 页={1}x{2}mm 余量 L/T/R/B={3}/{4}/{5}/{6}mm 底部编号墨迹={7}px 文本={8}" -f $lt2.ok, $l2.pageWidthMm, $l2.pageHeightMm, $l2.leftMarginMm, $l2.topMarginMm, $l2.rightMarginMm, $l2.bottomMarginMm, $l2.bottomLabelInkPixels, $l2.labelTextOk)
                }
                Write-Info ("  trim 汇总   : ok={0}" -f $trimOk)
            }
        }
        else {
            Write-Info '应用矢量 E2E  : skipped（MATLAB .fig 不可用）'
        }
    }
    if ($report.vectorPdf -and $report.vectorPdf.labelCenter) {
        $lbl = $report.vectorPdf.labelCenter
        Write-Info ("编号中心      : ok={0} (a)={1}mm/err={2}mm (b)={3}mm/err={4}mm 容差={5}mm" -f $lbl.ok, $lbl.checks.centerAMm, $lbl.checks.centerAErrorMm, $lbl.checks.centerBMm, $lbl.checks.centerBErrorMm, $lbl.checks.toleranceMm)
    }
    if ($report.configPersistence) {
        $cp = $report.configPersistence
        if ($cp.available) {
            $cc = $cp.checks
            Write-Info ("配置持久化    : ok={0} path={1} 备份={2} 文件配置数={3} reload恢复={4} 真实APPDATA未写={5}" -f $cp.ok, $cp.profilesPath, $cc.backupFirst, $cc.fileProfileCount, $cc.reloadRecovered, $cc.realAppDataUntouched)
        }
        else {
            Write-Info '配置持久化    : skipped'
        }
    }

    if ($report.config1Label) {
        $cfg = $report.config1Label
        if ($cfg.available) {
            $cc = $cfg.checks
            Write-Info ("config1 编号  : ok={0} 垂直误差 top={1}mm bottom={2}mm center={3}mm 水平误差={4}mm 位图={5}" -f $cfg.ok, $cc.verticalTopErrorMm, $cc.verticalBottomErrorMm, $cc.verticalCenterErrorMm, $cc.horizontalCenterErrorMm, $cc.imageCount)
        }
        else {
            Write-Info 'config1 编号  : skipped'
        }
    }

    if ($report.appearanceSmoke) {
        $smoke = $report.appearanceSmoke
        $dark = $smoke.checks.dark
        $restored = $smoke.checks.restored
        Write-Info ("主题冒烟      : ok={0} dark={1}/{2} bodyLum={3} shellWhite={4} PNG一致={5}/{6} consoleΔ={7}" -f $smoke.ok, $dark.dataTheme, $dark.dataAccent, $dark.bodyLuminance, $dark.shellWhite, $smoke.checks.pngEqualDark, $smoke.checks.pngEqualRestored, $smoke.checks.consoleErrorDelta)
    }
    if ($report.powerPointLifecycle) {
        $lc = $report.powerPointLifecycle
        $lcResidual = @($lc.residualPids).Count
        Write-Info ("PowerPoint会话: 冷={0}ms 热={1}ms 提速={2}% 实例创建={3}ms 残留POWERPNT={4} shutdownOk={5}" -f $lc.coldExportMs, $lc.hotExportMs, $lc.speedupPercent, $lc.instanceCreateMs, $lcResidual, $lc.shutdownOk)
    }
    if ($report.saveFilePicker) {
        Write-Info ("保存 API      : showSaveFilePicker={0} isSecureContext={1}" -f $report.saveFilePicker.hasShowSaveFilePicker, $report.saveFilePicker.isSecureContext)
    }
    if ($report.console) {
        Write-Info ("console error : {0}" -f $report.console.errorCount)
    }
    if ($report.screenshot) {
        Write-Info ("截图          : {0}（{1}x{2}）" -f $report.screenshot.path, $report.screenshot.width, $report.screenshot.height)
    }

    if (-not $report.success) {
        $failureLines = @()
        if ($report.failures) {
            foreach ($item in @($report.failures)) {
                $failureLines += (' - ' + [string]$item)
            }
        }
        $message = "$Label 自测报告 success=false。" + [Environment]::NewLine
        if ($failureLines.Count -gt 0) {
            $message += ($failureLines -join [Environment]::NewLine) + [Environment]::NewLine
        }
        $message += "详见 $ReportPath"
        Fail $message
    }

    return $report
}

$totalWatch = [System.Diagnostics.Stopwatch]::StartNew()
$buildSeconds = 0.0
$mainSelftestSeconds = 0.0
$singleSelftestSeconds = 0.0
$singleBuildSeconds = 0.0

Write-Host '=========================================================='
Write-Host ' FigurePlay 桌面版构建（.NET Framework 4.8 + WebView2）'
Write-Host '=========================================================='
Write-Info "desktop 目录 : $desktopDir"
Write-Info "网页源目录   : $AppSource"
Write-Info "配置文件     : $Configuration"

# ---------------------------------------------------------------- 前置检查

Write-Step '检查构建环境'

if (-not (Test-Path (Join-Path $AppSource 'index.html'))) {
    Fail "找不到网页应用源文件：$(Join-Path $AppSource 'index.html')。请用 -AppSource 指定正确的 E:\FigurePlay 目录。"
}

if (-not (Test-Path $mainProject)) {
    Fail "找不到多文件版项目目录：$mainProject"
}

if (-not $SkipSingleFile -and -not (Test-Path $singleProject)) {
    Fail "找不到单文件版项目目录：$singleProject"
}

if (-not $DotnetPath) {
    $dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
    if ($dotnetCommand) {
        $DotnetPath = $dotnetCommand.Source
    }
    elseif (Test-Path (Join-Path $env:ProgramFiles 'dotnet\dotnet.exe')) {
        $DotnetPath = Join-Path $env:ProgramFiles 'dotnet\dotnet.exe'
    }
    else {
        Fail '未找到 dotnet.exe。请安装 .NET SDK 8.0（仅构建机需要；最终用户只需要 .NET Framework 4.8）。'
    }
}

if (-not (Test-Path $DotnetPath)) {
    Fail "dotnet.exe 不存在：$DotnetPath"
}

$dotnetVersion = (& $DotnetPath --version 2>$null | Out-String).Trim()
Write-Info "dotnet SDK   : $dotnetVersion ($DotnetPath)"

$webView2Version = $null
$webView2Keys = @(
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
)
foreach ($key in $webView2Keys) {
    try {
        $value = (Get-ItemProperty -Path $key -Name pv -ErrorAction Stop).pv
        if ($value) {
            $webView2Version = [string]$value
            break
        }
    }
    catch {
        # 继续尝试其它注册表位置
    }
}
if (-not $webView2Version) {
    $webView2Roots = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\EdgeWebView\Application'),
        (Join-Path $env:ProgramFiles 'Microsoft\EdgeWebView\Application')
    )
    foreach ($root in $webView2Roots) {
        if ($root -and (Test-Path $root)) {
            $candidate = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
                Sort-Object Name -Descending |
                Select-Object -First 1
            if ($candidate) {
                $webView2Version = $candidate.Name
                break
            }
        }
    }
}
if ($webView2Version) {
    Write-Info "WebView2 运行时: $webView2Version"
}
else {
    Write-Warning '未检测到 Microsoft Edge WebView2 Runtime。构建仍可继续，但运行 FigurePlay.exe 前必须安装：https://go.microsoft.com/fwlink/p/?LinkId=2124703'
}

$matlabInfo = Get-MatlabInfo
if ($matlabInfo) {
    $matlabVersion = (Get-Item $matlabInfo.Path).VersionInfo.ProductVersion
    Write-Info "MATLAB       : $($matlabInfo.Path)（$matlabVersion，$($matlabInfo.Source)）"
}
else {
    Write-Warning '未检测到 MATLAB。.fig 导入 selftest 将记为 skipped（不影响其它自测项）。'
}

# ---------------------------------------------------------------- 清理 + 构建主程序

Write-Step '清理旧输出目录'
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
Write-Info "dist: $distDir"
if (Test-Path $singleDir) {
    Remove-Item -Path $singleDir -Recurse -Force
}

if (-not $SkipBuild) {
    Write-Step "dotnet publish 主程序（$Configuration）"
    $buildWatch = [System.Diagnostics.Stopwatch]::StartNew()
    & $DotnetPath publish $mainProject -c $Configuration -o $distDir --nologo -v:m
    $buildExit = $LASTEXITCODE
    $buildWatch.Stop()
    $buildSeconds = [Math]::Round($buildWatch.Elapsed.TotalSeconds, 1)
    if ($buildExit -ne 0) {
        Fail "dotnet publish 失败（退出码 $buildExit）。"
    }
    Write-Info "构建完成，用时 ${buildSeconds}s"
}
else {
    Write-Info '已指定 -SkipBuild，跳过 dotnet publish（沿用现有 exe 与 dll）。'

    if (-not (Test-Path (Join-Path $distDir 'FigurePlay.exe'))) {
        Write-Warning 'dist 中没有 FigurePlay.exe，自动执行完整构建。'
        $buildWatch = [System.Diagnostics.Stopwatch]::StartNew()
        & $DotnetPath publish $mainProject -c $Configuration -o $distDir --nologo -v:m
        $buildExit = $LASTEXITCODE
        $buildWatch.Stop()
        $buildSeconds = [Math]::Round($buildWatch.Elapsed.TotalSeconds, 1)
        if ($buildExit -ne 0) {
            Fail "dotnet publish 失败（退出码 $buildExit）。"
        }
    }
}

# ---------------------------------------------------------------- 复制网页应用

Write-Step '复制最新网页应用到 dist\wwwroot'
$wwwroot = Join-Path $distDir 'wwwroot'
New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null

$excludeNames = @('_dev', 'docs', 'desktop', 'README.md', '启动FigurePlay.bat', '启动FigurePlay桌面版.bat', '.git', '.gitignore', '.gitattributes')
$copied = 0
$totalBytes = 0
Get-ChildItem -Path $AppSource -Force | Where-Object { $excludeNames -notcontains $_.Name } | ForEach-Object {
    $destination = Join-Path $wwwroot $_.Name
    Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
    if ($_.PSIsContainer) {
        $files = Get-ChildItem -Path $destination -Recurse -File -ErrorAction SilentlyContinue
        $copied += $files.Count
        $totalBytes += ($files | Measure-Object -Property Length -Sum).Sum
    }
    else {
        $copied += 1
        $totalBytes += $_.Length
    }
}
Write-Info ("已复制 {0} 个文件，共 {1:N0} 字节" -f $copied, $totalBytes)

foreach ($required in @('index.html', 'assets', 'js', 'vendor')) {
    if (-not (Test-Path (Join-Path $wwwroot $required))) {
        Fail "dist\wwwroot 缺少必要内容：$required"
    }
}

# ---------------------------------------------------------------- 整理 dist

Write-Step '整理 dist 目录并校验依赖'
$loaderPath = Join-Path $distDir 'WebView2Loader.dll'
if (-not (Test-Path $loaderPath)) {
    $packageRoot = Join-Path $env:USERPROFILE '.nuget\packages\microsoft.web.webview2'
    $candidateLoader = $null
    if (Test-Path $packageRoot) {
        $candidateLoader = Get-ChildItem -Path $packageRoot -Recurse -Filter 'WebView2Loader.dll' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\runtimes\\win-x64\\native\\' } |
            Sort-Object FullName -Descending |
            Select-Object -First 1
    }
    if ($candidateLoader) {
        Copy-Item -Path $candidateLoader.FullName -Destination $loaderPath -Force
        Write-Info '已从 NuGet 缓存补齐 WebView2Loader.dll'
    }
}

Get-ChildItem -Path $distDir -File -Filter '*.pdb' -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $distDir -File -Filter '*.xml' -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $distDir -File -Filter '*.lib' -ErrorAction SilentlyContinue | Remove-Item -Force

$wpfDll = Join-Path $distDir 'Microsoft.Web.WebView2.Wpf.dll'
if (Test-Path $wpfDll) {
    Remove-Item -Path $wpfDll -Force
}

$runtimesDir = Join-Path $distDir 'runtimes'
if ((Test-Path $loaderPath) -and (Test-Path $runtimesDir)) {
    Remove-Item -Path $runtimesDir -Recurse -Force
}

$requiredFiles = @(
    'FigurePlay.exe',
    'FigurePlay.exe.config',
    'Microsoft.Web.WebView2.Core.dll',
    'Microsoft.Web.WebView2.WinForms.dll',
    'WebView2Loader.dll',
    'Newtonsoft.Json.dll',
    'wwwroot\index.html'
)
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path (Join-Path $distDir $requiredFile))) {
        Fail "dist 缺少必要文件：$requiredFile"
    }
}

$readmeText = @'
FigurePlay 桌面版（Windows 10/11 x64）
=====================================

启动方式
 双击 FigurePlay.exe 即可（首次启动可能稍慢）。

系统要求
 1. Windows 10 / Windows 11（64 位）；
 2. Microsoft Edge WebView2 Runtime（Win10/11 通常已自带；若启动提示缺失，
    请安装：https://go.microsoft.com/fwlink/p/?LinkId=2124703 ）。

关于 SmartScreen
 本程序没有商业代码签名证书，从网络下载的 zip 解压后首次运行，
 Windows 可能提示“Windows 已保护你的电脑”。点击“更多信息”→“仍要运行”即可。

从 MATLAB 复制图形
 在 MATLAB 图形窗口选择「编辑 → 复制图形（Copy Figure）」，
 再回到 FigurePlay 点击粘贴按钮。默认的 EMF 矢量格式会以约 4400px 宽、
 约 650dpi 转成高清 PNG（4000–4800px，单张 <8MB），同时保留真实 EMF 原始字节供矢量 PDF。

导入 MATLAB .fig 文件
 可直接上传/拖入 .fig 文件，桌面版会调用本机 MATLAB（R2020a 或更新）将其转换为
 600dpi PNG（例如 4004×2898），并尽量同时导出真实 EMF 供矢量 PDF 使用。
 第一次转换需要 10–40 秒（MATLAB 启动较慢），请耐心等待。
 若未自动找到 MATLAB，可设置环境变量 FIGPLAY_MATLAB_PATH 指向 matlab.exe，
 或把完整路径写入 %LOCALAPPDATA%\FigurePlay\matlab-path.txt。

矢量 PDF 导出（需 Microsoft PowerPoint）
 当页面中的子图来自 EMF / .fig（矢量）时，可导出真正的矢量 PDF（放大不糊），
 并支持可选“自动裁剪白边”（crop）。开启裁剪时，桌面版还会用 PowerPoint 实际渲染结果
 再做一次墨迹校正（把四周残余白边压到 ≤0.5mm），避免 PPT 导出后仍留白。
 要求本机安装桌面版 PowerPoint 2016 或更高版本；第一次导出需要 20–40 秒
 （PowerPoint 启动较慢），属正常现象；超时上限 120 秒。
 没有 PowerPoint 时会自动回退为高分辨率位图 PDF。

保存位置
 网页端优先使用浏览器/WebView2 的“选择保存位置”能力；若不可用则回退为下载到默认目录。

单文件版
 本目录为多文件版。若拿到单独的 FigurePlay.exe（单文件版），
 可放在任意目录直接运行，首次启动会自解压到 %LOCALAPPDATA%\FigurePlay\bin。

数据位置
 网页数据（IndexedDB / localStorage）保存在：
   %LOCALAPPDATA%\FigurePlay\WebView2
 卸载时删除整个 dist 目录与该数据目录即可。

自测
 命令行运行：FigurePlay.exe --selftest --out .\selftest
 会生成 selftest-report.json 与截图，退出码 0 表示通过。
'@
$readmePath = Join-Path $distDir '使用说明.txt'
Set-Content -Path $readmePath -Value $readmeText -Encoding UTF8
Write-Info '已写入 dist\使用说明.txt'

# ---------------------------------------------------------------- 多文件版自测

$mainSelftestPassed = $false
if (-not $SkipSelfTest) {
    Write-Step '多文件版自测（布局/EMF/桥/MATLAB .fig）'
    if (Test-Path $selftestDir) {
        Remove-Item -Path $selftestDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $selftestDir -Force | Out-Null

    $exePath = Join-Path $distDir 'FigurePlay.exe'
    $selftestWatch = [System.Diagnostics.Stopwatch]::StartNew()
    $process = Start-Process -FilePath $exePath -ArgumentList @('--selftest', '--out', $selftestDir) -PassThru
    $exited = $process.WaitForExit(600000)
    $selftestWatch.Stop()
    $mainSelftestSeconds = [Math]::Round($selftestWatch.Elapsed.TotalSeconds, 1)

    if (-not $exited) {
        try { $process.Kill() } catch { }
        Fail "多文件版自测超过 600 秒未退出，已强制结束。请检查 $selftestDir 下的日志。"
    }

    $reportPath = Join-Path $selftestDir 'selftest-report.json'
    Write-Info "退出码        : $($process.ExitCode)"
    if ($process.ExitCode -ne 0) {
        $null = Read-SelfTestReport -ReportPath $reportPath -Label '多文件版'
        Fail "多文件版自测失败（退出码 $($process.ExitCode)），详见 $reportPath"
    }

    $mainReport = Read-SelfTestReport -ReportPath $reportPath -Label '多文件版'
    if ($mainReport -and $matlabInfo -and $mainReport.matlabFig -and -not $mainReport.matlabFig.available) {
        Write-Warning '构建机检测到 MATLAB，但 selftest 报告 MATLAB 不可用，请检查探测逻辑。'
    }
    $mainSelftestPassed = $true
    Write-Host '    ✅ 多文件版自测通过' -ForegroundColor Green
}
else {
    Write-Info '已指定 -SkipSelfTest，跳过自测。'
}

# ---------------------------------------------------------------- 单文件版

$singleExe = $null
$singleSelftestPassed = $false
if (-not $SkipSingleFile) {
    Write-Step '构建单文件版（payload + 自解压启动器）'
    if (-not (Test-Path $payloadDir)) {
        New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
    }
    if (Test-Path $payloadZip) {
        Remove-Item -Path $payloadZip -Force
    }
    $payloadWatch = [System.Diagnostics.Stopwatch]::StartNew()
    Compress-Archive -Path (Join-Path $distDir '*') -DestinationPath $payloadZip -CompressionLevel Optimal
    $payloadWatch.Stop()
    Write-Info ("payload.zip   : {0:N0} 字节（{1:N1} s）" -f (Get-Item $payloadZip).Length, $payloadWatch.Elapsed.TotalSeconds)

    $singleBuildWatch = [System.Diagnostics.Stopwatch]::StartNew()
    & $DotnetPath publish $singleProject -c $Configuration -o $singleDir --nologo -v:m
    $singleBuildExit = $LASTEXITCODE
    $singleBuildWatch.Stop()
    $singleBuildSeconds = [Math]::Round($singleBuildWatch.Elapsed.TotalSeconds, 1)
    if ($singleBuildExit -ne 0) {
        Fail "单文件版 dotnet publish 失败（退出码 $singleBuildExit）。"
    }

    # 只保留一个 exe：单文件版不应依赖目录中的其它文件
    Get-ChildItem -Path $singleDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne 'FigurePlay.exe' } |
        Remove-Item -Force
    $singleExe = Join-Path $singleDir 'FigurePlay.exe'
    if (-not (Test-Path $singleExe)) {
        Fail "单文件版 exe 未生成：$singleExe"
    }
    $singleFileCount = (Get-ChildItem -Path $singleDir -File).Count
    if ($singleFileCount -ne 1) {
        Fail "dist-single 目录应只包含一个 exe，实际有 $singleFileCount 个文件。"
    }
    Write-Info ("单文件 exe    : {0}（{1:N0} 字节，构建 {2}s）" -f $singleExe, (Get-Item $singleExe).Length, $singleBuildSeconds)

    if (-not $SkipSelfTest) {
        Write-Step '单文件版干净目录自测（自解压 + 布局/EMF/桥/MATLAB .fig）'
        if (Test-Path $selftestSingleDir) {
            Remove-Item -Path $selftestSingleDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $selftestSingleDir -Force | Out-Null

        $cleanRoot = Join-Path $env:TEMP ('figureplay-single-test-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
        New-Item -ItemType Directory -Path $cleanRoot -Force | Out-Null
        Copy-Item -Path $singleExe -Destination (Join-Path $cleanRoot 'FigurePlay.exe') -Force

        # 模拟一个旧版本解压目录，验证启动时会清理
        $binRoot = Join-Path $env:LOCALAPPDATA 'FigurePlay\bin'
        $staleDir = Join-Path $binRoot 'app-stale0000000000'
        try {
            if (Test-Path $staleDir) {
                Remove-Item -Path $staleDir -Recurse -Force
            }
            New-Item -ItemType Directory -Path $staleDir -Force | Out-Null
            Set-Content -Path (Join-Path $staleDir 'stale.txt') -Value 'stale' -Encoding ASCII
        }
        catch {
            Write-Warning '无法创建用于验证清理逻辑的旧版本目录：' + $_.Exception.Message
        }

        Write-Info "干净测试目录 : $cleanRoot（仅含 FigurePlay.exe）"
        $singleTestWatch = [System.Diagnostics.Stopwatch]::StartNew()
        $singleProcess = Start-Process -FilePath (Join-Path $cleanRoot 'FigurePlay.exe') `
            -ArgumentList @('--selftest', '--out', $selftestSingleDir) `
            -PassThru
        $singleExited = $singleProcess.WaitForExit(600000)
        $singleTestWatch.Stop()
        $singleSelftestSeconds = [Math]::Round($singleTestWatch.Elapsed.TotalSeconds, 1)

        if (-not $singleExited) {
            try { $singleProcess.Kill() } catch { }
            Fail "单文件版自测超过 600 秒未退出，已强制结束。请检查 $selftestSingleDir 下的日志与 %LOCALAPPDATA%\FigurePlay\bin\singlefile.log。"
        }

        $singleReportPath = Join-Path $selftestSingleDir 'selftest-report.json'
        Write-Info "退出码        : $($singleProcess.ExitCode)"
        if ($singleProcess.ExitCode -ne 0) {
            $null = Read-SelfTestReport -ReportPath $singleReportPath -Label '单文件版'
            Fail "单文件版自测失败（退出码 $($singleProcess.ExitCode)），详见 $singleReportPath"
        }

        $null = Read-SelfTestReport -ReportPath $singleReportPath -Label '单文件版'

        # 干净目录里仍然只能有 exe，说明没有依赖旁置 dll/assets
        $sideFiles = Get-ChildItem -Path $cleanRoot -File -ErrorAction SilentlyContinue
        if ($sideFiles.Count -ne 1) {
            $names = ($sideFiles | ForEach-Object { $_.Name }) -join ', '
            Fail "单文件版干净目录中出现额外文件（不应依赖旁置 dll/assets）：$names"
        }

        # 自解压目录检查
        $runtimeDirs = @(Get-ChildItem -Path $binRoot -Directory -Filter 'app-*' -ErrorAction SilentlyContinue)
        if ($runtimeDirs.Count -eq 0) {
            Fail '单文件版未在 %LOCALAPPDATA%\FigurePlay\bin 下找到解压后的运行时目录。'
        }
        $runtimeDirText = (($runtimeDirs | ForEach-Object { $_.FullName }) -join '; ')
        Write-Info ('自解压目录    : ' + $runtimeDirText)

        if (Test-Path $staleDir) {
            Write-Warning '旧版本解压目录未被清理（可能是权限或占用），请人工检查。'
        }
        else {
            Write-Info '旧版本解压目录: 已清理 ✓'
        }

        if (-not (Test-Path (Join-Path $binRoot 'singlefile.log'))) {
            Write-Warning '未找到 singlefile.log（不影响功能）。'
        }

        Remove-Item -Path $cleanRoot -Recurse -Force -ErrorAction SilentlyContinue
        $singleSelftestPassed = $true
        Write-Host '    ✅ 单文件版自测通过' -ForegroundColor Green
    }
    else {
        Write-Info '已指定 -SkipSelfTest，跳过单文件版自测。'
    }
}
else {
    Write-Info '已指定 -SkipSingleFile，跳过单文件版构建。'
}

# ---------------------------------------------------------------- zip

$zipBytes = 0
$singleZipBytes = 0
if (-not $SkipZip) {
    Write-Step '生成 zip 分发包'
    if (Test-Path $zipPath) {
        Remove-Item -Path $zipPath -Force
    }
    Compress-Archive -Path (Join-Path $distDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
    $zipBytes = (Get-Item $zipPath).Length
    Write-Info ("多文件版 zip : {0}（{1:N1} MB）" -f $zipPath, ($zipBytes / 1MB))

    if (-not $SkipSingleFile -and $singleExe -and (Test-Path $singleExe)) {
        if (Test-Path $singleZipPath) {
            Remove-Item -Path $singleZipPath -Force
        }
        Compress-Archive -Path $singleExe -DestinationPath $singleZipPath -CompressionLevel Optimal
        $singleZipBytes = (Get-Item $singleZipPath).Length
        Write-Info ("单文件版 zip : {0}（{1:N2} MB）" -f $singleZipPath, ($singleZipBytes / 1MB))
    }
}

# 删除旧版本 zip，避免 E: 盘重复占用（仅保留本次生成的两个 zip）
try {
    Get-ChildItem -Path $desktopDir -File -Filter 'FigurePlay-*-win-x64.zip' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -ne $zipPath -and $_.FullName -ne $singleZipPath } |
        ForEach-Object {
            Remove-Item -Path $_.FullName -Force
            Write-Info ('已清理旧版本 zip : ' + $_.Name)
        }
}
catch {
    # ignore
}
# ---------------------------------------------------------------- 清理构建中间件

try {
    if (Test-Path $payloadZip) {
        Remove-Item -Path $payloadZip -Force
    }
    if ((Test-Path $payloadDir) -and ((Get-ChildItem -Path $payloadDir -Force | Measure-Object).Count -eq 0)) {
        Remove-Item -Path $payloadDir -Force -Recurse
    }
}
catch {
    # ignore
}

# ---------------------------------------------------------------- 总结

$totalWatch.Stop()

$mainExePath = Join-Path $distDir 'FigurePlay.exe'
$mainExeSize = (Get-Item $mainExePath).Length
$distFiles = Get-ChildItem -Path $distDir -Recurse -File
$distBytes = ($distFiles | Measure-Object -Property Length -Sum).Sum
$mainExeHash = (Get-FileHash -Path $mainExePath -Algorithm SHA256).Hash
$appJsPath = Join-Path $wwwroot 'js\app.js'
$appJsHash = $null
$appJsSize = 0
if (Test-Path $appJsPath) {
    $appJsSize = (Get-Item $appJsPath).Length
    $appJsHash = (Get-FileHash -Path $appJsPath -Algorithm SHA256).Hash
}

Write-Host ''
Write-Host '=========================================================='
Write-Host ' 构建结果'
Write-Host '=========================================================='
Write-Info ("多文件版 exe : {0}（{1:N0} 字节）" -f $mainExePath, $mainExeSize)
Write-Info ("  SHA256     : $mainExeHash")
Write-Info ("dist 总大小  : {0:N1} MB（{1} 个文件）" -f ($distBytes / 1MB), $distFiles.Count)
if ($appJsHash) {
    Write-Info ("app.js       : {0:N0} 字节  SHA256=$appJsHash" -f $appJsSize)
}
if ($singleExe -and (Test-Path $singleExe)) {
    $singleExeSize = (Get-Item $singleExe).Length
    $singleExeHash = (Get-FileHash -Path $singleExe -Algorithm SHA256).Hash
    Write-Info ("单文件版 exe : {0}（{1:N0} 字节）" -f $singleExe, $singleExeSize)
    Write-Info ("  SHA256     : $singleExeHash")
}
if (-not $SkipZip) {
    Write-Info ("多文件版 zip : {0}（{1:N1} MB）" -f $zipPath, ($zipBytes / 1MB))
    if ($singleZipBytes -gt 0) {
        Write-Info ("单文件版 zip : {0}（{1:N2} MB）" -f $singleZipPath, ($singleZipBytes / 1MB))
    }
}
if ($SkipSelfTest) {
    Write-Info '自测         : 跳过'
}
else {
    $mainText = '未通过'
    if ($mainSelftestPassed) { $mainText = "通过（${mainSelftestSeconds}s）" }
    Write-Info ("多文件版自测 : {0}" -f $mainText)
    if (-not $SkipSingleFile) {
        $singleText = '未通过'
        if ($singleSelftestPassed) { $singleText = "通过（${singleSelftestSeconds}s）" }
        Write-Info ("单文件版自测 : {0}" -f $singleText)
    }
}
Write-Info ("构建耗时     : {0}s（publish {1}s）" -f ([Math]::Round($totalWatch.Elapsed.TotalSeconds, 1)), $buildSeconds)
Write-Host ''
Write-Host '完成。' -ForegroundColor Green

if (-not $SkipSelfTest -and -not $mainSelftestPassed) {
    exit 1
}
if (-not $SkipSelfTest -and -not $SkipSingleFile -and -not $singleSelftestPassed) {
    exit 1
}
exit 0
