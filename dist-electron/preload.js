import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
	getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
	onAlwaysOnTopChanged: (callback) => {
		const handler = (_event, value) => callback(value);
		ipcRenderer.on("always-on-top-changed", handler);
		return () => ipcRenderer.removeListener("always-on-top-changed", handler);
	}
});
//#endregion
