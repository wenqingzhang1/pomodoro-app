import { useState, useEffect } from 'react'
import useTimer, { SESSIONS_PER_CYCLE } from './hooks/useTimer'
import type { TimerMode, TimerStatus } from './hooks/useTimer'
import './index.css'

const MODES: { key: TimerMode; label: string }[] = [
  { key: 'focus', label: '专注' },
  { key: 'shortBreak', label: '短休' },
  { key: 'longBreak', label: '长休' },
]

const MODE_COLORS: Record<TimerMode, string> = {
  focus: 'text-[var(--color-accent)]',
  shortBreak: 'text-[var(--color-accent-secondary)]',
  longBreak: 'text-[var(--color-accent-tertiary)]',
}

const STATUS_TEXT: Record<TimerStatus, string> = {
  idle: '已就绪',
  running: '进行中',
  paused: '已暂停',
}

const RADIUS = 96
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const isElectron = Boolean((typeof window !== 'undefined') && (window as any).electronAPI)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function App() {
  const { mode, status, timeLeft, totalTime, completedSessions, switchMode, start, pause, reset } = useTimer()
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI!.getAlwaysOnTop().then(setAlwaysOnTop)
    const unsubscribe = window.electronAPI!.onAlwaysOnTopChanged(setAlwaysOnTop)
    return unsubscribe
  }, [])

  const offset = CIRCUMFERENCE * (timeLeft / totalTime)

  const handleModeSwitch = (key: TimerMode) => {
    if (key !== mode) switchMode(key)
  }

  const toggleStart = () => {
    if (status === 'running') pause()
    else start()
  }

  const toggleAlwaysOnTop = async () => {
    if (!isElectron) return
    const newState = await window.electronAPI!.toggleAlwaysOnTop()
    setAlwaysOnTop(newState)
  }

  const hideWindow = () => {
    if (!isElectron) return
    window.close()
  }

  return (
    <div className="glass-bg h-screen w-screen flex flex-col items-center justify-center select-none">
      <div className="fixed top-0 left-0 right-0 h-9 flex items-center justify-between px-3 text-xs text-[var(--color-muted)]/50">
        <div className="flex-1 h-full flex items-center gap-2 window-drag">
          <div className="w-2 h-2 rounded-full bg-[var(--color-muted)]/20" />
          番茄钟
        </div>

        {isElectron && (
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={toggleAlwaysOnTop}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-[var(--color-surface)]/50 ${
                alwaysOnTop ? 'text-[var(--color-accent)]' : ''
              }`}
              title={alwaysOnTop ? '取消置顶' : '窗口置顶'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" /><path d="M5 10l7-7 7 7" /><path d="M5 21h14" />
              </svg>
            </button>
            <button
              onClick={hideWindow}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-[var(--color-surface)]/50"
              title="隐藏到托盘"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <path d="M15 3h6v6" /><path d="M10 14L21 3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-8 mt-4">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleModeSwitch(key)}
            disabled={status === 'running'}
            className={`
              px-4 py-1.5 rounded-full text-xs font-medium tracking-wide
              transition-all duration-300 ease-out
              ${mode === key
                ? 'bg-[var(--color-surface)]/80 text-[var(--color-text)] shadow-sm backdrop-blur-xl'
                : 'text-[var(--color-muted)]/60 hover:text-[var(--color-muted)]/90 hover:bg-[var(--color-surface)]/30'}
              ${status === 'running' && mode !== key ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-8">
        <svg width="220" height="220" className="-rotate-90">
          <circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="6"
            className="opacity-50"
          />
          <circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={`${MODE_COLORS[mode]} transition-all duration-1000 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light tracking-[2px] tabular-nums text-[var(--color-text)]">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs text-[var(--color-muted)]/60 mt-1 uppercase tracking-[3px]">
            {STATUS_TEXT[status]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleStart}
          className="
            w-16 h-16 rounded-full flex items-center justify-center
            bg-[var(--color-surface)]/80 backdrop-blur-xl text-[var(--color-text)]
            shadow-lg shadow-black/5
            transition-all duration-300 ease-out
            hover:scale-105 active:scale-95
            hover:bg-[var(--color-surface)] hover:shadow-xl hover:shadow-black/10
          "
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            {status === 'running' ? (
              <>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </>
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>

        <button
          onClick={reset}
          disabled={status === 'idle'}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            hover:bg-[var(--color-surface)]/50
            active:scale-90
            ${status === 'idle' ? 'text-[var(--color-muted)]/20' : 'text-[var(--color-muted)]/50 hover:text-[var(--color-muted)]/80'}
          `}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12h6" />
          </svg>
        </button>
      </div>

      <div className="fixed bottom-6 flex flex-col items-center gap-1">
        <div className="flex gap-1.5">
          {Array.from({ length: SESSIONS_PER_CYCLE }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i < completedSessions % SESSIONS_PER_CYCLE
                  ? 'bg-[var(--color-accent)]/60'
                  : 'bg-[var(--color-surface)]'
              }`}
            />
          ))}
        </div>
        <div className="text-[10px] text-[var(--color-muted)]/20 tracking-wider">
          POMODORO v0.1
        </div>
      </div>
    </div>
  )
}

export default App
