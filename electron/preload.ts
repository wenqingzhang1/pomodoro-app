import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('always-on-top-changed', handler)
    return () => ipcRenderer.removeListener('always-on-top-changed', handler)
  },
})
