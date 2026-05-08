export {}

declare global {
  interface Window {
    electronAPI?: {
      toggleAlwaysOnTop: () => Promise<boolean>
      getAlwaysOnTop: () => Promise<boolean>
      onAlwaysOnTopChanged: (callback: (value: boolean) => void) => () => void
    }
  }
}
