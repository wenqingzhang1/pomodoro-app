# 番茄钟

一款轻盈、可靠的 Apple 风格桌面番茄钟，使用 Electron、React、TypeScript、Vite 和 Tailwind CSS 构建。

## 功能

- 25 分钟专注、5 分钟短休、15 分钟长休，时长可自定义
- 基于真实截止时间的可靠计时，支持暂停、恢复和重启恢复
- 跟随系统、浅色、深色三种主题
- 柔和提示音与系统原生通知
- 系统托盘倒计时及开始、暂停、重置、置顶操作
- 无边框毛玻璃窗口，适配减少动画偏好
- 键盘快捷键：`空格` 开始/暂停、`R` 重置、`1/2/3` 切换模式、`Esc` 隐藏

## 开发

```bash
npm install
npm run electron:dev
```

只预览浏览器界面：

```bash
npm run dev
```

## 质量检查

```bash
npm run lint
npm test
npm run build
```

## 打包

```bash
npm run electron:build
```

Windows 默认生成 NSIS 安装包。关闭主窗口会隐藏到系统托盘，使用托盘菜单中的“退出番茄钟”才会完全结束应用。
