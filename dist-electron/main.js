import { BrowserWindow as e, Menu as t, Notification as n, Tray as r, app as i, ipcMain as a, nativeImage as o, shell as s } from "electron";
import c from "path";
//#region electron/main.ts
var l = {
	focus: "专注",
	shortBreak: "短休",
	longBreak: "长休"
}, u = {
	idle: "已就绪",
	running: "进行中",
	paused: "已暂停"
}, d = process.env.VITE_DEV_SERVER_URL, f = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVQ4T2NkYPj/n4EBBJgYKAQMowYMQwMGhgYMDIMeDAwMDBS7gZFBiICBgd4AAOcLBfFqGJt5AAAAAElFTkSuQmCC", p = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path fill=\"#b98574\" d=\"M16 7c7.2 0 12 4.6 12 11.1C28 25 23.1 29 16 29S4 25 4 18.1C4 11.6 8.8 7 16 7Z\"/><path fill=\"#70866f\" d=\"M16 8c-3.3 0-5.6-2-6.8-4.4 2.7-.6 5.3.1 6.8 2 1.5-1.9 4.1-2.6 6.8-2C21.6 6 19.3 8 16 8Z\"/><path fill=\"none\" stroke=\"#fff\" stroke-linecap=\"round\" stroke-width=\"2\" d=\"M16 12v6l4 2\"/></svg>", m = null, h = null, g = !1, _ = !1, v = {
	mode: "focus",
	status: "idle",
	timeLabel: "25:00"
};
function y() {
	m && (m.isMinimized() && m.restore(), m.show(), m.focus());
}
function b(e) {
	y(), m?.webContents.send("timer-command", e);
}
function x(e) {
	return g = e, m?.setAlwaysOnTop(e), m?.webContents.send("always-on-top-changed", e), C(), e;
}
function S() {
	let e = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p)}`, t = o.createFromDataURL(e);
	return t.isEmpty() ? o.createFromDataURL(f) : t.resize({
		width: 16,
		height: 16
	});
}
function C() {
	if (!h) return;
	let e = l[v.mode], n = u[v.status], r = v.status === "running";
	h.setToolTip(`${v.timeLabel} · ${e} · ${n}`), process.platform === "darwin" && h.setTitle(v.timeLabel), h.setContextMenu(t.buildFromTemplate([
		{
			label: `${v.timeLabel}  ${e} · ${n}`,
			enabled: !1
		},
		{ type: "separator" },
		{
			label: "显示番茄钟",
			click: y
		},
		{
			label: r ? "暂停计时" : "开始计时",
			click: () => b(r ? "pause" : "start")
		},
		{
			label: "重置当前计时",
			click: () => b("reset")
		},
		{
			label: "窗口置顶",
			type: "checkbox",
			checked: g,
			click: (e) => x(e.checked)
		},
		{ type: "separator" },
		{
			label: "退出番茄钟",
			click: () => {
				_ = !0, i.quit();
			}
		}
	]));
}
function w() {
	m = new e({
		width: 360,
		height: 500,
		minWidth: 320,
		minHeight: 460,
		resizable: !1,
		maximizable: !1,
		fullscreenable: !1,
		frame: !1,
		transparent: !0,
		backgroundColor: "#00000000",
		show: !1,
		center: !0,
		alwaysOnTop: g,
		hasShadow: !0,
		icon: c.join(__dirname, "../dist/icon.svg"),
		webPreferences: {
			preload: c.join(__dirname, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0,
			backgroundThrottling: !1
		}
	}), d ? m.loadURL(d) : m.loadFile(c.join(__dirname, "../dist/index.html")), m.once("ready-to-show", () => m?.show()), m.on("close", (e) => {
		_ || (e.preventDefault(), m?.hide());
	}), m.on("closed", () => {
		m = null;
	}), m.webContents.setWindowOpenHandler(({ url: e }) => (e.startsWith("https://") && s.openExternal(e), { action: "deny" })), m.webContents.on("will-navigate", (e, t) => {
		let n = d ?? `file://${c.join(__dirname, "../dist/index.html")}`;
		t.startsWith(n) || e.preventDefault();
	});
}
function T() {
	h = new r(S()), C(), h.on("click", () => {
		m?.isVisible() ? m.hide() : y();
	});
}
function E() {
	a.handle("toggle-always-on-top", () => x(!g)), a.handle("get-always-on-top", () => g), a.on("hide-window", () => m?.hide()), a.on("update-tray-status", (e, t) => {
		if (!t || typeof t != "object") return;
		let n = t;
		!n.mode || !n.status || typeof n.timeLabel != "string" || !(n.mode in l) || !(n.status in u) || (v = {
			mode: n.mode,
			status: n.status,
			timeLabel: n.timeLabel.slice(0, 8)
		}, C());
	}), a.handle("show-notification", (e, t) => {
		if (!n.isSupported() || !t || typeof t != "object") return !1;
		let r = t;
		if (typeof r.title != "string" || typeof r.body != "string") return !1;
		let i = new n({
			title: r.title.slice(0, 80),
			body: r.body.slice(0, 180),
			silent: !0
		});
		return i.on("click", y), i.show(), !0;
	});
}
i.requestSingleInstanceLock() ? (i.on("second-instance", y), i.on("before-quit", () => {
	_ = !0;
}), i.on("activate", () => {
	m ? y() : w();
}), i.on("window-all-closed", () => {
	process.platform !== "darwin" && _ && i.quit();
}), i.whenReady().then(() => {
	E(), w(), T();
})) : i.quit();
//#endregion
