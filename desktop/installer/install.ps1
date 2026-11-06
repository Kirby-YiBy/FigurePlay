# FigurePlay 安装器（无需管理员权限，单文件版）
# 用法：
#   powershell -ExecutionPolicy Bypass -File install.ps1 [-ExePath ..\dist-single\FigurePlay.exe] [-DesktopShortcut]
# 说明：
#   - 安装到 %LOCALAPPDATA%\Programs\FigurePlay\FigurePlay.exe；
#   - 创建开始菜单快捷方式，可选桌面快捷方式；
#   - 不写系统目录/注册表；用户配置在 %APPDATA%\FigurePlay，WebView2 数据在 %LOCALAPPDATA%\FigurePlay；
#   - 升级：关闭程序后重新运行本脚本即可（不会动用户配置）。

param(
    [string]$ExePath = (Join-Path $PSScriptRoot '..\dist-single\FigurePlay.exe'),
    [switch]$DesktopShortcut
)

$ErrorActionPreference = 'Stop'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\FigurePlay'
$TargetExe = Join-Path $InstallDir 'FigurePlay.exe'

Write-Host "== FigurePlay 安装器 ==" -ForegroundColor Cyan
$ExePath = [System.IO.Path]::GetFullPath($ExePath)
if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "找不到单文件版 exe：$ExePath`n请先运行 desktop\build.ps1，或用 -ExePath 指定 FigurePlay.exe。"
}

$existing = @(Get-Process -Name FigurePlay -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0) {
    throw "FigurePlay 正在运行，请先关闭后再安装/升级。"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Write-Host "复制程序：$ExePath -> $TargetExe"
Copy-Item -LiteralPath $ExePath -Destination $TargetExe -Force

# 安装信息（便于卸载/排障）
$info = [ordered]@{
    name = 'FigurePlay'
    version = (Get-Item $TargetExe).VersionInfo.FileVersion
    installedAt = (Get-Date).ToString('o')
    exe = $TargetExe
    dataDir = (Join-Path $env:APPDATA 'FigurePlay')
    webViewData = (Join-Path $env:LOCALAPPDATA 'FigurePlay\WebView2')
}
$info | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $InstallDir 'install-info.json') -Encoding UTF8

# 卸载脚本随程序一起安装
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'uninstall.ps1') -Destination (Join-Path $InstallDir 'uninstall.ps1') -Force

$shell = New-Object -ComObject WScript.Shell
$startMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
$lnk = $shell.CreateShortcut((Join-Path $startMenuDir 'FigurePlay.lnk'))
$lnk.TargetPath = $TargetExe
$lnk.WorkingDirectory = $InstallDir
$lnk.IconLocation = "$TargetExe,0"
$lnk.Description = 'FigurePlay · 论文子图排版'
$lnk.Save()

if ($DesktopShortcut) {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $lnk2 = $shell.CreateShortcut((Join-Path $desktop 'FigurePlay.lnk'))
    $lnk2.TargetPath = $TargetExe
    $lnk2.WorkingDirectory = $InstallDir
    $lnk2.IconLocation = "$TargetExe,0"
    $lnk2.Description = 'FigurePlay · 论文子图排版'
    $lnk2.Save()
    Write-Host "已创建桌面快捷方式。"
}

Write-Host "安装完成：$TargetExe" -ForegroundColor Green
Write-Host "开始菜单快捷方式：FigurePlay"
Write-Host "用户数据保留在：$env:APPDATA\FigurePlay 与 $env:LOCALAPPDATA\FigurePlay（升级/卸载默认不删除）"
