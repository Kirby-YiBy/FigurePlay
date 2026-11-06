# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的风格，版本号使用 `MAJOR.MINOR.PATCH`。

## [v1.5.2] - 2026-11-07

### Fixed
- 修复原生“另存为”点取消后仍回退下载/保存的问题；工程、配置、日志、导出取消后均不写文件。
- 修复关闭提示按钮“退出程序”最后文字被裁切。
- 修复深色主题下配置/期刊弹窗白底、文字对比度不足的问题。
- 修复图页删除后默认页名不自动重排（图2 仍显示为图2）的问题。

### Changed
- 弹窗支持按住标题栏拖动；去掉背景毛玻璃虚化，确认提示更清晰。
- 主题色精简为：蓝、靛蓝、翠绿、粉色、玫红、琥珀；旧的青绿自动迁移到翠绿，紫罗兰自动迁移到粉色。
- 关闭提示的最小化改为“最小化到托盘”，增加托盘图标、双击恢复和右键菜单。

## [v1.5.1] - 2026-11-06

### Added
- 原生保存路径：工程文件、配置、PNG/JPG/SVG/PDF 导出优先使用 Windows“另存为”对话框。
- 诊断日志面板：查看、刷新、导出 `.log`、清空，最多 300 条，本地存储。
- 页签自动编号：删除/新建图页后 `图 N` 自动重排；复制页保持“副本”名称。
- NotifyIcon 托盘：最小化到托盘、显示主窗口、退出程序。
- 更新检查/下载接入真实 WebView2 桥。

## [v1.5.0] - 2026-11-06

### Added
- 完整工程文件 `.figureplay-project` 保存/打开：图片、图页、编号、网格、分组、导出设置。
- 配置模板备份恢复 UI。
- 内置期刊配置库（Nature/IEEE/Elsevier/Science/学位论文等 11 个版式）。
- 图片预检：有效 DPI、像素尺寸、拉伸变形提示。
- 全页矢量 PDF：同尺寸图页一次输出多页 PowerPoint 矢量 PDF，失败回退多页位图。
- 桌面安装器/卸载器；可配置的更新检查与 SHA256 校验。
- 关闭提示：最小化/退出/取消 + 记住选择。

## [v1.4.2] - 2026-11-06

### Fixed
- 配置模板写入 `%APPDATA%\FigurePlay\configs` 并自动备份，更新 exe/清 WebView2 缓存不再丢失配置。

## [v1.4.1] - 2026-11-06

### Fixed
- 矢量 PDF 编号按实际预览 bbox 校正，水平/垂直 WYSIWYG。

## [v1.4.0] - 2026-11-06

### Added
- 配置模板保存/应用/JSON 导入导出。
- 修复矢量 PDF 编号整体左偏。

## [v1.3.x]

- v1.3.4：浅色/深色/跟随系统 + 主题色。
- v1.3.3：持久 PowerPoint 会话加速矢量 PDF；负间距顶层描边。
- v1.3.2：编号防裁安全边距；负行/列间距。
- v1.3.1：按实际墨迹裁剪 PDF 白边；EMF 矢量 PDF。
- v1.3.0：EMF 矢量 PDF、编号越界自动页距、保存位置、自定义网格、数字滑块输入。

## 早期版本

- v1.0–v1.2：网格排版、合并单元格、单/双栏模板、批量编号、粘贴小画布、多页与分组、撤销/重做、MATLAB `.fig` 导入、多页导出。

[v1.5.2]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.5.1...v1.5.2
[v1.5.1]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.5.0...v1.5.1
[v1.5.0]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.4.2...v1.5.0
[v1.4.2]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.4.1...v1.4.2
[v1.4.1]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.4.0...v1.4.1
[v1.4.0]: https://github.com/Kirby-YiBy/FigurePlay/compare/v1.3.4...v1.4.0
