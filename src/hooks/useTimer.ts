import { useState, useRef, useCallback, useEffect } from 'react'

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

const DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

export const SESSIONS_PER_CYCLE = 4

function getNextMode(mode: TimerMode, completedSessions: number): TimerMode {
  if (mode === 'focus') {
    return completedSessions % SESSIONS_PER_CYCLE === 0 ? 'longBreak' : 'shortBreak'
  }
  return 'focus'
}

function playNotification() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch {
    // audio not available
  }
}

function useTimer() {
  const [mode, setMode] = useState<TimerMode>('focus')
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus)
  const [completedSessions, setCompletedSessions] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const modeRef = useRef(mode)
  const completedSessionsRef = useRef(completedSessions)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { completedSessionsRef.current = completedSessions }, [completedSessions])

  const totalTime = DURATIONS[mode]

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer()
    setMode(newMode)
    setTimeLeft(DURATIONS[newMode])
    setStatus('idle')
  }, [clearTimer])

  const start = useCallback(() => {
    if (timeLeft <= 0) return
    setStatus('running')
  }, [timeLeft])

  const pause = useCallback(() => {
    clearTimer()
    setStatus('paused')
  }, [clearTimer])

  const reset = useCallback(() => {
    clearTimer()
    setTimeLeft(DURATIONS[mode])
    setStatus('idle')
  }, [clearTimer, mode])

  // Handle timer completion — runs once when timeLeft hits 0 while running
  useEffect(() => {
    if (status !== 'running' || timeLeft > 0) return

    playNotification()
    clearTimer()

    const currentMode = modeRef.current
    const currentSessions = completedSessionsRef.current
    const newSessions = currentMode === 'focus' ? currentSessions + 1 : currentSessions
    const nextMode = getNextMode(currentMode, newSessions)

    if (currentMode === 'focus') {
      setCompletedSessions(newSessions)
    }
    setMode(nextMode)
    setTimeLeft(DURATIONS[nextMode])
    setStatus('idle')
  }, [timeLeft, status, clearTimer])

  // Timer tick interval
  useEffect(() => {
    if (status !== 'running') {
      clearTimer()
      return
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return clearTimer
  }, [status, clearTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return {
    mode, status, timeLeft, totalTime, completedSessions,
    switchMode, start, pause, reset,
  }
}

export default useTimer
