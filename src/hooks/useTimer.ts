import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_DURATIONS,
  STORAGE_KEY,
  advanceTimer,
  applyDurations,
  pauseTimer,
  resetTimer,
  restoreTimerSnapshot,
  startTimer,
  switchTimerMode,
} from './timerCore'
import type {
  TimerDurations,
  TimerMode,
  TimerSettings,
  TimerSnapshot,
} from './timerCore'

export type {
  ThemePreference,
  TimerDurations,
  TimerMode,
  TimerSettings,
  TimerSnapshot,
  TimerStatus,
} from './timerCore'
export { DEFAULT_DURATIONS, SESSIONS_PER_CYCLE } from './timerCore'

interface CompletionDetails {
  completedMode: TimerMode
  nextMode: TimerMode
  settings: TimerSettings
}

interface UseTimerOptions {
  onComplete?: (details: CompletionDetails) => void
}

function readInitialSnapshot(): TimerSnapshot {
  try {
    return restoreTimerSnapshot(window.localStorage.getItem(STORAGE_KEY), Date.now())
  } catch {
    return restoreTimerSnapshot(null, Date.now())
  }
}

function playCompletionSound() {
  try {
    const AudioContextClass = window.AudioContext
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(784, context.currentTime)
    oscillator.frequency.setValueAtTime(988, context.currentTime + 0.16)
    gain.gain.setValueAtTime(0.18, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.5)
    oscillator.addEventListener('ended', () => void context.close(), { once: true })
  } catch {
    // Audio can be unavailable before the first user gesture.
  }
}

function useTimer(options: UseTimerOptions = {}) {
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(readInitialSnapshot)
  const snapshotRef = useRef(snapshot)
  const onCompleteRef = useRef(options.onComplete)

  useEffect(() => {
    onCompleteRef.current = options.onComplete
  }, [options.onComplete])

  const commit = useCallback((next: TimerSnapshot) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  const syncFromClock = useCallback(() => {
    const current = snapshotRef.current
    const next = advanceTimer(current, Date.now())
    if (next === current || (next.timeLeft === current.timeLeft && next.status === current.status)) return

    const completed = current.status === 'running' && next.status === 'idle' && next.mode !== current.mode
    commit(next)
    if (completed) {
      if (current.settings.soundEnabled) playCompletionSound()
      onCompleteRef.current?.({
        completedMode: current.mode,
        nextMode: next.mode,
        settings: current.settings,
      })
    }
  }, [commit])

  useEffect(() => {
    snapshotRef.current = snapshot
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // The timer remains usable when storage is unavailable.
    }
  }, [snapshot])

  useEffect(() => {
    if (snapshot.status !== 'running') return
    syncFromClock()
    const intervalId = window.setInterval(syncFromClock, 250)
    const handleVisibility = () => syncFromClock()
    window.addEventListener('focus', handleVisibility)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleVisibility)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [snapshot.status, syncFromClock])

  const start = useCallback(() => commit(startTimer(snapshotRef.current, Date.now())), [commit])
  const pause = useCallback(() => commit(pauseTimer(snapshotRef.current, Date.now())), [commit])
  const reset = useCallback(() => commit(resetTimer(snapshotRef.current)), [commit])
  const switchMode = useCallback((mode: TimerMode) => {
    commit(switchTimerMode(snapshotRef.current, mode))
  }, [commit])
  const updateDurations = useCallback((durations: TimerDurations) => {
    commit(applyDurations(snapshotRef.current, durations))
  }, [commit])
  const restoreDefaultDurations = useCallback(() => {
    commit(applyDurations(snapshotRef.current, { ...DEFAULT_DURATIONS }))
  }, [commit])
  const updateSettings = useCallback((settings: Partial<TimerSettings>) => {
    const current = snapshotRef.current
    commit({ ...current, settings: { ...current.settings, ...settings } })
  }, [commit])

  return {
    ...snapshot,
    totalTime: snapshot.durations[snapshot.mode],
    start,
    pause,
    reset,
    switchMode,
    updateDurations,
    restoreDefaultDurations,
    updateSettings,
  }
}

export default useTimer
