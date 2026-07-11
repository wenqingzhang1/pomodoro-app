import type { TimerMode, TimerStatus } from '../hooks/timerCore'

export {}

type TimerCommand = 'start' | 'pause' | 'reset'

declare global {
  interface Window {
    electronAPI?: {
      toggleAlwaysOnTop: () => Promise<boolean>
      getAlwaysOnTop: () => Promise<boolean>
      hideWindow: () => void
      showNotification: (notification: { title: string; body: string }) => Promise<boolean>
      updateTrayStatus: (status: { mode: TimerMode; status: TimerStatus; timeLabel: string }) => void
      onAlwaysOnTopChanged: (callback: (value: boolean) => void) => () => void
      onTimerCommand: (callback: (command: TimerCommand) => void) => () => void
    }
  }
}
