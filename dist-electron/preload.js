import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	toggleAlwaysOnTop: () => t.invoke("toggle-always-on-top"),
	getAlwaysOnTop: () => t.invoke("get-always-on-top"),
	hideWindow: () => t.send("hide-window"),
	showNotification: (e) => t.invoke("show-notification", e),
	updateTrayStatus: (e) => t.send("update-tray-status", e),
	onAlwaysOnTopChanged: (e) => {
		let n = (t, n) => e(n);
		return t.on("always-on-top-changed", n), () => t.removeListener("always-on-top-changed", n);
	},
	onTimerCommand: (e) => {
		let n = (t, n) => e(n);
		return t.on("timer-command", n), () => t.removeListener("timer-command", n);
	}
});
//#endregion
