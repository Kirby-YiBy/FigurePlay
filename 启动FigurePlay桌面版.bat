@echo off
setlocal
if exist "%~dp0desktop\dist-single\FigurePlay.exe" (
  start "" "%~dp0desktop\dist-single\FigurePlay.exe"
) else (
  start "" "%~dp0desktop\dist\FigurePlay.exe"
)
exit /b 0
