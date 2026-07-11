import { useEffect, useMemo, useState } from 'react'
import useTimer, { SESSIONS_PER_CYCLE } from './hooks/useTimer'
import type {
  ThemePreference,
  TimerDurations,
  TimerMode,
  TimerSettings,
  TimerStatus,
} from './hooks/useTimer'
import './index.css'

const MODES: { key: TimerMode; label: string; completion: string }[] = [
  { key: 'focus', label: '专注', completion: '专注完成' },
  { key: 'shortBreak', label: '短休', completion: '短休结束' },
  { key: 'longBreak', label: '长休', completion: '长休结束' },
]

const MODE_LABELS: Record<TimerMode, string> = {
  focus: '专注',
  shortBreak: '短休',
  longBreak: '长休',
}

const STATUS_TEXT: Record<TimerStatus, string> = {
  idle: '已就绪',
  running: '专注当下',
  paused: '已暂停',
}

const THEME_LABELS: Record<ThemePreference, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

const RADIUS = 96
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const electronAPI = typeof window === 'undefined' ? undefined : window.electronAPI

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

interface SettingsPanelProps {
  durations: TimerDurations
  settings: TimerSettings
  onClose: () => void
  onDurationsChange: (durations: TimerDurations) => void
  onRestoreDefaults: () => void
  onSettingsChange: (settings: Partial<TimerSettings>) => void
}

function SettingsPanel({
  durations,
  settings,
  onClose,
  onDurationsChange,
  onRestoreDefaults,
  onSettingsChange,
}: SettingsPanelProps) {
  const [minutes, setMinutes] = useState<Record<TimerMode, number>>({
    focus: durations.focus / 60,
    shortBreak: durations.shortBreak / 60,
    longBreak: durations.longBreak / 60,
  })

  const setDuration = (mode: TimerMode, value: string) => {
    const parsed = Number(value)
    setMinutes((current) => ({
      ...current,
      [mode]: Number.isFinite(parsed) ? parsed : current[mode],
    }))
  }

  const saveAndClose = (event: React.FormEvent) => {
    event.preventDefault()
    onDurationsChange({
      focus: minutes.focus * 60,
      shortBreak: minutes.shortBreak * 60,
      longBreak: minutes.longBreak * 60,
    })
    onClose()
  }

  const restoreDefaults = () => {
    setMinutes({ focus: 25, shortBreak: 5, longBreak: 15 })
    onRestoreDefaults()
  }

  return (
    <div className="settings-backdrop no-drag" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-header">
          <div>
            <p className="eyebrow">PREFERENCES</p>
            <h2 id="settings-title">设置</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭设置" title="关闭设置">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={saveAndClose}>
          <div className="settings-section">
            <div className="section-title-row">
              <h3>计时时长</h3>
              <button type="button" className="text-button" onClick={restoreDefaults}>恢复默认</button>
            </div>
            <div className="duration-grid">
              {MODES.map(({ key, label }) => (
                <label key={key}>
                  <span>{label}</span>
                  <span className="number-field">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={minutes[key]}
                      onChange={(event) => setDuration(key, event.target.value)}
                      aria-label={`${label}时长（分钟）`}
                    />
                    <small>分钟</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>外观</h3>
            <div className="theme-picker" role="group" aria-label="主题模式">
              {(Object.keys(THEME_LABELS) as ThemePreference[]).map((theme) => (
                <button
                  type="button"
                  key={theme}
                  className={settings.theme === theme ? 'active' : ''}
                  onClick={() => onSettingsChange({ theme })}
                  aria-pressed={settings.theme === theme}
                >
                  {THEME_LABELS[theme]}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section settings-toggles">
            <button
              type="button"
              role="switch"
              aria-checked={settings.soundEnabled}
              onClick={() => onSettingsChange({ soundEnabled: !settings.soundEnabled })}
            >
              <span><strong>完成提示音</strong><small>阶段结束时播放柔和提示音</small></span>
              <i className={settings.soundEnabled ? 'switch active' : 'switch'} aria-hidden="true" />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.notificationsEnabled}
              onClick={() => onSettingsChange({ notificationsEnabled: !settings.notificationsEnabled })}
            >
              <span><strong>系统通知</strong><small>隐藏到托盘时也能及时提醒</small></span>
              <i className={settings.notificationsEnabled ? 'switch active' : 'switch'} aria-hidden="true" />
            </button>
          </div>

          <div className="shortcut-hint">空格 开始/暂停 · R 重置 · 1/2/3 切换</div>
          <button type="submit" className="save-button">完成</button>
        </form>
      </section>
    </div>
  )
}

function App() {
  const timer = useTimer({
    onComplete: ({ completedMode, nextMode, settings }) => {
      if (!settings.notificationsEnabled || !electronAPI) return
      const completedLabel = MODES.find(({ key }) => key === completedMode)?.completion ?? '阶段完成'
      void electronAPI.showNotification({
        title: completedLabel,
        body: `接下来：${MODE_LABELS[nextMode]}。准备好后再开始。`,
      })
    },
  })
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { start, pause, reset } = timer

  const progressOffset = useMemo(() => {
    const ratio = timer.totalTime === 0 ? 0 : timer.timeLeft / timer.totalTime
    return CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, ratio)))
  }, [timer.timeLeft, timer.totalTime])

  useEffect(() => {
    const root = document.documentElement
    if (timer.settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = timer.settings.theme
  }, [timer.settings.theme])

  useEffect(() => {
    document.title = `${formatTime(timer.timeLeft)} · ${MODE_LABELS[timer.mode]} · 番茄钟`
    if (!electronAPI) return
    electronAPI.updateTrayStatus({
      mode: timer.mode,
      status: timer.status,
      timeLabel: formatTime(timer.timeLeft),
    })
  }, [timer.mode, timer.status, timer.timeLeft])

  useEffect(() => {
    if (!electronAPI) return
    void electronAPI.getAlwaysOnTop().then(setAlwaysOnTop)
    return electronAPI.onAlwaysOnTopChanged(setAlwaysOnTop)
  }, [])

  useEffect(() => {
    if (!electronAPI) return
    return electronAPI.onTimerCommand((command) => {
      if (command === 'start') start()
      if (command === 'pause') pause()
      if (command === 'reset') reset()
    })
  }, [pause, reset, start])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
        else electronAPI?.hideWindow()
        return
      }
      if (settingsOpen) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (timer.status === 'running') timer.pause()
        else timer.start()
      }
      if (event.key.toLowerCase() === 'r') timer.reset()
      if (event.key === '1') timer.switchMode('focus')
      if (event.key === '2') timer.switchMode('shortBreak')
      if (event.key === '3') timer.switchMode('longBreak')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settingsOpen, timer])

  const toggleStart = () => {
    if (timer.status === 'running') timer.pause()
    else timer.start()
  }

  const toggleAlwaysOnTop = async () => {
    if (!electronAPI) return
    setAlwaysOnTop(await electronAPI.toggleAlwaysOnTop())
  }

  const cycleTheme = () => {
    const order: ThemePreference[] = ['system', 'light', 'dark']
    const nextTheme = order[(order.indexOf(timer.settings.theme) + 1) % order.length]
    timer.updateSettings({ theme: nextTheme })
  }

  const completedInCycle = timer.completedSessions % SESSIONS_PER_CYCLE

  return (
    <main className={`app-shell mode-${timer.mode}`}>
      <header className="titlebar">
        <div className="brand window-drag">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>番茄钟</span>
        </div>
        <div className="titlebar-actions no-drag">
          <button className="icon-button" onClick={cycleTheme} aria-label={`当前${THEME_LABELS[timer.settings.theme]}，切换主题`} title={`主题：${THEME_LABELS[timer.settings.theme]}`}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6L7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="打开设置" title="设置">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2h-4V21a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 00.3-1.9A1.7 1.7 0 003 14H2.8v-4H3a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 009 4.6 1.7 1.7 0 0010 3v-.2h4V3a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.2v4H21a1.7 1.7 0 00-1.6 1z" /></svg>
          </button>
          {electronAPI && (
            <>
              <button className={`icon-button ${alwaysOnTop ? 'active' : ''}`} onClick={toggleAlwaysOnTop} aria-pressed={alwaysOnTop} aria-label={alwaysOnTop ? '取消窗口置顶' : '窗口置顶'} title={alwaysOnTop ? '取消置顶' : '窗口置顶'}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8l-1 6 3 3H6l3-3-1-6zM12 13v7" /></svg>
              </button>
              <button className="icon-button" onClick={() => electronAPI.hideWindow()} aria-label="隐藏到系统托盘" title="隐藏到托盘">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </>
          )}
        </div>
      </header>

      <section className="timer-content" aria-label="番茄钟计时器">
        <nav className="mode-picker" aria-label="计时模式">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => timer.switchMode(key)}
              disabled={timer.status === 'running'}
              className={timer.mode === key ? 'active' : ''}
              aria-pressed={timer.mode === key}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="timer-ring" aria-label={`${MODE_LABELS[timer.mode]}剩余 ${formatTime(timer.timeLeft)}`}>
          <svg width="220" height="220" aria-hidden="true">
            <circle className="ring-track" cx="110" cy="110" r={RADIUS} />
            <circle
              className="ring-progress"
              cx="110"
              cy="110"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={progressOffset}
            />
          </svg>
          <div className="timer-display">
            <span className="time-value">{formatTime(timer.timeLeft)}</span>
            <span className="status-label"><i className={timer.status} />{STATUS_TEXT[timer.status]}</span>
          </div>
        </div>

        <div className="timer-actions">
          <button className="secondary-action" onClick={timer.reset} disabled={timer.status === 'idle'} aria-label="重置计时" title="重置 (R)">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" /></svg>
          </button>
          <button className="primary-action" onClick={toggleStart} aria-label={timer.status === 'running' ? '暂停计时' : '开始计时'} title={timer.status === 'running' ? '暂停 (空格)' : '开始 (空格)'}>
            <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="currentColor">
              {timer.status === 'running' ? <><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></> : <path d="M8 5.5v13l10.5-6.5z" />}
            </svg>
          </button>
          <button className="secondary-action" onClick={() => setSettingsOpen(true)} aria-label="打开计时设置" title="设置">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" /></svg>
          </button>
        </div>
      </section>

      <footer className="cycle-footer">
        <div className="cycle-dots" aria-label={`本轮已完成 ${completedInCycle} 个番茄钟`}>
          {Array.from({ length: SESSIONS_PER_CYCLE }).map((_, index) => (
            <i key={index} className={index < completedInCycle ? 'complete' : ''} />
          ))}
        </div>
        <span>{timer.completedSessions === 0 ? '从一个番茄开始' : `累计专注 ${timer.completedSessions} 次`}</span>
      </footer>

      {settingsOpen && (
        <SettingsPanel
          durations={timer.durations}
          settings={timer.settings}
          onClose={() => setSettingsOpen(false)}
          onDurationsChange={timer.updateDurations}
          onRestoreDefaults={timer.restoreDefaultDurations}
          onSettingsChange={timer.updateSettings}
        />
      )}
    </main>
  )
}

export default App
