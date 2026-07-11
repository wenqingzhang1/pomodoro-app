export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type ThemePreference = 'system' | 'light' | 'dark'

export type TimerDurations = Record<TimerMode, number>

export interface TimerSettings {
  theme: ThemePreference
  soundEnabled: boolean
  notificationsEnabled: boolean
}

export interface TimerSnapshot {
  version: 1
  mode: TimerMode
  status: TimerStatus
  timeLeft: number
  endAt: number | null
  completedSessions: number
  durations: TimerDurations
  settings: TimerSettings
}

export const STORAGE_KEY = 'pomodoro.timer.v1'
export const SESSIONS_PER_CYCLE = 4

export const DEFAULT_DURATIONS: TimerDurations = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

export const DEFAULT_SETTINGS: TimerSettings = {
  theme: 'system',
  soundEnabled: true,
  notificationsEnabled: true,
}

const MODES: TimerMode[] = ['focus', 'shortBreak', 'longBreak']
const STATUSES: TimerStatus[] = ['idle', 'running', 'paused']
const THEMES: ThemePreference[] = ['system', 'light', 'dark']
const MIN_DURATION = 60
const MAX_DURATION = 120 * 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function clampDuration(value: number): number {
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(value / 60) * 60))
}

function parseDurations(value: unknown): TimerDurations | null {
  if (!isRecord(value)) return null
  if (!MODES.every((mode) => isNumber(value[mode]))) return null
  return {
    focus: clampDuration(value.focus as number),
    shortBreak: clampDuration(value.shortBreak as number),
    longBreak: clampDuration(value.longBreak as number),
  }
}

function parseSettings(value: unknown): TimerSettings | null {
  if (!isRecord(value)) return null
  if (!THEMES.includes(value.theme as ThemePreference)) return null
  if (typeof value.soundEnabled !== 'boolean' || typeof value.notificationsEnabled !== 'boolean') return null
  return {
    theme: value.theme as ThemePreference,
    soundEnabled: value.soundEnabled,
    notificationsEnabled: value.notificationsEnabled,
  }
}

export function createDefaultSnapshot(): TimerSnapshot {
  return {
    version: 1,
    mode: 'focus',
    status: 'idle',
    timeLeft: DEFAULT_DURATIONS.focus,
    endAt: null,
    completedSessions: 0,
    durations: { ...DEFAULT_DURATIONS },
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function getNextMode(mode: TimerMode, completedSessions: number): TimerMode {
  if (mode === 'focus') {
    return completedSessions % SESSIONS_PER_CYCLE === 0 ? 'longBreak' : 'shortBreak'
  }
  return 'focus'
}

export function getRemainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000))
}

function completeTimer(snapshot: TimerSnapshot): TimerSnapshot {
  const completedSessions = snapshot.mode === 'focus'
    ? snapshot.completedSessions + 1
    : snapshot.completedSessions
  const mode = getNextMode(snapshot.mode, completedSessions)

  return {
    ...snapshot,
    mode,
    status: 'idle',
    timeLeft: snapshot.durations[mode],
    endAt: null,
    completedSessions,
  }
}

export function advanceTimer(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.status !== 'running' || snapshot.endAt === null) return snapshot
  const timeLeft = getRemainingSeconds(snapshot.endAt, now)
  return timeLeft === 0 ? completeTimer(snapshot) : { ...snapshot, timeLeft }
}

export function startTimer(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.status === 'running' || snapshot.timeLeft <= 0) return snapshot
  return {
    ...snapshot,
    status: 'running',
    endAt: now + snapshot.timeLeft * 1000,
  }
}

export function pauseTimer(snapshot: TimerSnapshot, now: number): TimerSnapshot {
  if (snapshot.status !== 'running' || snapshot.endAt === null) return snapshot
  const advanced = advanceTimer(snapshot, now)
  return advanced.status === 'idle'
    ? advanced
    : { ...advanced, status: 'paused', endAt: null }
}

export function resetTimer(snapshot: TimerSnapshot): TimerSnapshot {
  return {
    ...snapshot,
    status: 'idle',
    timeLeft: snapshot.durations[snapshot.mode],
    endAt: null,
  }
}

export function switchTimerMode(snapshot: TimerSnapshot, mode: TimerMode): TimerSnapshot {
  if (snapshot.status === 'running' || snapshot.mode === mode) return snapshot
  return {
    ...snapshot,
    mode,
    status: 'idle',
    timeLeft: snapshot.durations[mode],
    endAt: null,
  }
}

export function applyDurations(snapshot: TimerSnapshot, durations: TimerDurations): TimerSnapshot {
  const nextDurations: TimerDurations = {
    focus: clampDuration(durations.focus),
    shortBreak: clampDuration(durations.shortBreak),
    longBreak: clampDuration(durations.longBreak),
  }
  return {
    ...snapshot,
    durations: nextDurations,
    timeLeft: snapshot.status === 'idle' ? nextDurations[snapshot.mode] : snapshot.timeLeft,
  }
}

export function restoreTimerSnapshot(raw: string | null, now: number): TimerSnapshot {
  if (!raw) return createDefaultSnapshot()

  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1) return createDefaultSnapshot()
    if (!MODES.includes(value.mode as TimerMode) || !STATUSES.includes(value.status as TimerStatus)) {
      return createDefaultSnapshot()
    }

    const durations = parseDurations(value.durations)
    const settings = parseSettings(value.settings)
    if (!durations || !settings || !isNumber(value.timeLeft) || !isNumber(value.completedSessions)) {
      return createDefaultSnapshot()
    }

    const mode = value.mode as TimerMode
    const status = value.status as TimerStatus
    const endAt = value.endAt === null ? null : value.endAt
    if (status === 'running' && !isNumber(endAt)) return createDefaultSnapshot()

    const snapshot: TimerSnapshot = {
      version: 1,
      mode,
      status,
      timeLeft: Math.max(0, Math.min(Math.round(value.timeLeft), durations[mode])),
      endAt: status === 'running' ? endAt as number : null,
      completedSessions: Math.max(0, Math.floor(value.completedSessions)),
      durations,
      settings,
    }
    return advanceTimer(snapshot, now)
  } catch {
    return createDefaultSnapshot()
  }
}
