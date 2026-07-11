import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DURATIONS,
  advanceTimer,
  applyDurations,
  createDefaultSnapshot,
  pauseTimer,
  resetTimer,
  restoreTimerSnapshot,
  startTimer,
  switchTimerMode,
} from './timerCore'

describe('timer state transitions', () => {
  it('starts from the current remaining time and pauses using the real clock', () => {
    const started = startTimer(createDefaultSnapshot(), 1_000)
    expect(started.status).toBe('running')
    expect(started.endAt).toBe(1_501_000)

    const paused = pauseTimer(started, 2_250)
    expect(paused.status).toBe('paused')
    expect(paused.timeLeft).toBe(1_499)
    expect(paused.endAt).toBeNull()
  })

  it('resets and switches modes only when not running', () => {
    const paused = { ...createDefaultSnapshot(), status: 'paused' as const, timeLeft: 42 }
    const reset = resetTimer(paused)
    expect(reset.status).toBe('idle')
    expect(reset.timeLeft).toBe(DEFAULT_DURATIONS.focus)

    const shortBreak = switchTimerMode(reset, 'shortBreak')
    expect(shortBreak.mode).toBe('shortBreak')
    expect(shortBreak.timeLeft).toBe(DEFAULT_DURATIONS.shortBreak)

    const running = startTimer(shortBreak, 0)
    expect(switchTimerMode(running, 'longBreak')).toBe(running)
  })

  it('enters a short break after an ordinary focus session', () => {
    const started = startTimer({ ...createDefaultSnapshot(), timeLeft: 60 }, 0)
    const completed = advanceTimer(started, 60_000)
    expect(completed).toMatchObject({
      mode: 'shortBreak',
      status: 'idle',
      completedSessions: 1,
      timeLeft: DEFAULT_DURATIONS.shortBreak,
      endAt: null,
    })
  })

  it('enters a long break after every fourth focus session', () => {
    const snapshot = { ...createDefaultSnapshot(), completedSessions: 3, timeLeft: 60 }
    const completed = advanceTimer(startTimer(snapshot, 0), 60_000)
    expect(completed.mode).toBe('longBreak')
    expect(completed.completedSessions).toBe(4)
    expect(completed.timeLeft).toBe(DEFAULT_DURATIONS.longBreak)
  })

  it('returns from a break without incrementing focus sessions', () => {
    const snapshot = {
      ...createDefaultSnapshot(),
      mode: 'shortBreak' as const,
      timeLeft: 60,
      completedSessions: 2,
    }
    const completed = advanceTimer(startTimer(snapshot, 0), 60_000)
    expect(completed.mode).toBe('focus')
    expect(completed.completedSessions).toBe(2)
  })

  it('applies custom durations immediately only to an idle session', () => {
    const durations = { focus: 50 * 60, shortBreak: 10 * 60, longBreak: 20 * 60 }
    const idle = applyDurations(createDefaultSnapshot(), durations)
    expect(idle.timeLeft).toBe(50 * 60)

    const paused = applyDurations({ ...createDefaultSnapshot(), status: 'paused', timeLeft: 99 }, durations)
    expect(paused.timeLeft).toBe(99)
    expect(resetTimer(paused).timeLeft).toBe(50 * 60)
  })
})

describe('timer persistence recovery', () => {
  it('recovers a running timer from its deadline after background delay', () => {
    const started = startTimer(createDefaultSnapshot(), 1_000)
    const restored = restoreTimerSnapshot(JSON.stringify(started), 11_000)
    expect(restored.status).toBe('running')
    expect(restored.timeLeft).toBe(1_490)
    expect(restored.endAt).toBe(started.endAt)
  })

  it('settles an expired saved session exactly once', () => {
    const started = startTimer({ ...createDefaultSnapshot(), completedSessions: 3, timeLeft: 60 }, 0)
    const restored = restoreTimerSnapshot(JSON.stringify(started), 90_000)
    expect(restored).toMatchObject({ mode: 'longBreak', status: 'idle', completedSessions: 4 })

    const restoredAgain = restoreTimerSnapshot(JSON.stringify(restored), 120_000)
    expect(restoredAgain.completedSessions).toBe(4)
    expect(restoredAgain.mode).toBe('longBreak')
  })

  it('falls back safely for corrupted or incompatible data', () => {
    expect(restoreTimerSnapshot('{broken', 0)).toEqual(createDefaultSnapshot())
    expect(restoreTimerSnapshot(JSON.stringify({ version: 2 }), 0)).toEqual(createDefaultSnapshot())
  })
})
