# FigurePlay 卸载器（默认保留用户数据）
# 用法：
#   powershell -ExecutionPolicy Bypass -File uninstall.ps1
#   powershell -ExecutionPolicy Bypass -File uninstall.ps1 -RemoveUserData   # 需二次确认
# 默认只删除程序文件与快捷方式；绝默认不删除：
#   %APPDATA%\FigurePlay（配置模板/prefs/update.json）
#   %LOCALAPPDATA%\FigurePlay（WebView2 用户数据、解压缓存）

param(
    [switch]$RemoveUserData
)

$ErrorActionPreference = 'Stop'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\FigurePlay'
$DataDir = Join-Path $env:APPDATA 'FigurePlay'
$LocalDataDir = Join-Path $env:LOCALAPPDATA 'FigurePlay'

Write-Host "== FigurePlay 卸载器 ==" -ForegroundColor Cyan
$existing = @(Get-Process -Name FigurePlay -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0) {
    throw "FigurePlay 正在运行，请先关闭后再卸载。"
}

# 快捷方式
$shell = New-Object -ComObject WScript.Shell
$shortcuts = @(
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\FigurePlay.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'FigurePlay.lnk')
)
foreach ($lnk in $shortcuts) {
    if (Test-Path -LiteralPath $lnk) {
        Remove-Item -LiteralPath $lnk -Force
        Write-Host "已删除快捷方式：$lnk"
    }
}

# 程序文件
if (Test-Path -LiteralPath $InstallDir) {
    Remove-Item -LiteralPath $InstallDir -Recurse -Force
    Write-Host "已删除程序目录：$InstallDir"
}

if ($RemoveUserData) {
    Write-Host ""
    Write-Host "警告：将删除用户配置与 WebView2 数据：" -ForegroundColor Yellow
    Write-Host "  $DataDir"
    Write-Host "  $LocalDataDir"
    $answer = Read-Host "确认删除？输入 DELETE 继续，其它任意输入取消"
    if ($answer -ceq 'DELETE') {
        foreach ($dir in @($DataDir, $LocalDataDir)) {
            if (Test-Path -LiteralPath $dir) {
                Remove-Item -LiteralPath $dir -Recurse -Force
                Write-Host "已删除：$dir"
            }
        }
    }
    else {
        Write-Host "已取消删除用户数据。"
    }
}
else {
    Write-Host "用户数据已保留：$DataDir 与 $LocalDataDir" -ForegroundColor Green
    Write-Host "（如需彻底删除，请显式运行带 -RemoveUserData 的卸载器并二次确认）"
}
Write-Host "卸载完成。"
