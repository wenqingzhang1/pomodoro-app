import { contextBridge, ipcRenderer } from 'electron'

type TimerCommand = 'start' | 'pause' | 'reset'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('get-always-on-top'),
  hideWindow: (): void => ipcRenderer.send('hide-window'),
  showNotification: (notification: { title: string; body: string }): Promise<boolean> => (
    ipcRenderer.invoke('show-notification', notification)
  ),
  updateTrayStatus: (status: { mode: string; status: string; timeLabel: string }): void => (
    ipcRenderer.send('update-tray-status', status)
  ),
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('always-on-top-changed', handler)
    return () => ipcRenderer.removeListener('always-on-top-changed', handler)
  },
  onTimerCommand: (callback: (command: TimerCommand) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: TimerCommand) => callback(command)
    ipcRenderer.on('timer-command', handler)
    return () => ipcRenderer.removeListener('timer-command', handler)
  },
})
