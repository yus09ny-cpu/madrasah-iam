import { useState, useEffect, useRef } from 'react'
import {
  loadPrayerTimings,
  getPrayerWindows,
  getCurrentWindow,
  getNextWindow,
  getUserLocation,
  scheduleNotifications,
  type PrayerTimings,
  type PrayerWindow,
} from '@/lib/prayerTimes'

export interface PrayerTimeState {
  timings: PrayerTimings | null
  loading: boolean
  windows: PrayerWindow[]
  currentWindow: PrayerWindow | null
  nextWindow: PrayerWindow | null
  msUntilNext: number
  now: Date
  locationLabel: string
  refreshLocation: () => void
}

export function usePrayerTimes(): PrayerTimeState {
  const [timings, setTimings] = useState<PrayerTimings | null>(null)
  const [loading, setLoading] = useState(true)
  const [locationLabel, setLocationLabel] = useState('Kuala Lumpur')
  const [now, setNow] = useState(() => new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchRef = useRef(0)

  // Tick every second
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function fetchTimes() {
    const id = ++fetchRef.current
    setLoading(true)

    const coords = await getUserLocation()
    if (id !== fetchRef.current) return

    const result = await loadPrayerTimings(
      coords?.lat,
      coords?.lng,
    )
    if (id !== fetchRef.current) return

    setTimings(result)
    setLocationLabel(coords ? 'Lokasi anda 📍' : result.city)
    setLoading(false)

    // Schedule browser notifications (non-blocking)
    const windows = getPrayerWindows(result, new Date())
    scheduleNotifications(windows)
  }

  useEffect(() => {
    fetchTimes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const windows = timings ? getPrayerWindows(timings, now) : []
  const currentWindow = getCurrentWindow(windows, now)
  const nextWindow = getNextWindow(windows, now)
  const msUntilNext = nextWindow ? Math.max(0, nextWindow.start.getTime() - now.getTime()) : 0

  return {
    timings,
    loading,
    windows,
    currentWindow,
    nextWindow,
    msUntilNext,
    now,
    locationLabel,
    refreshLocation: fetchTimes,
  }
}
