'use client'

import { useState, useEffect, useRef } from 'react'

export type SkyKey = 'dawn' | 'morning' | 'afternoon' | 'golden' | 'twilight' | 'midnight'

export interface SkyCopy {
  tagline: string
  sub: string
  placeholder: string
  button: string
  cardLabel: string
}

export interface CelestialPosition {
  x: number  // left %
  y: number  // bottom %
}

export interface SkyState {
  key: SkyKey
  sun: CelestialPosition | null
  starOpacity: number
  cloudOpacity: number
  copy: SkyCopy
}

function getSkyKey(hour: number): SkyKey {
  if (hour >= 5 && hour < 7)  return 'dawn'
  if (hour >= 7 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 16) return 'afternoon'
  if (hour >= 16 && hour < 19) return 'golden'
  if (hour >= 19 && hour < 21) return 'twilight'
  return 'midnight'
}

function getSunPosition(now: Date): CelestialPosition | null {
  const hours = now.getHours() + now.getMinutes() / 60
  if (hours < 5 || hours >= 19) return null
  const progress = (hours - 5) / 14  // 0 at 5am → 1 at 7pm
  const x = 12 + progress * 76
  const y = 28 + Math.sin(progress * Math.PI) * 60
  return { x, y }
}

const STAR_OPACITY: Record<SkyKey, number> = {
  dawn: 0.3, morning: 0, afternoon: 0, golden: 0.2, twilight: 0.7, midnight: 0.85,
}

const CLOUD_OPACITY: Record<SkyKey, number> = {
  dawn: 0, morning: 0.6, afternoon: 0.55, golden: 0, twilight: 0, midnight: 0,
}

const SKY_COPY: Record<SkyKey, SkyCopy> = {
  dawn: {
    tagline: 'a new day is breaking.',
    sub: 'what did you carry through the night?',
    placeholder: 'what did you bring from yesterday?',
    button: 'let it go →',
    cardLabel: 'breaking thoughts',
  },
  morning: {
    tagline: 'morning is yours.',
    sub: "what's already on your mind?",
    placeholder: "what's taking up space already?",
    button: 'clear it →',
    cardLabel: 'morning thoughts',
  },
  afternoon: {
    tagline: 'the day is full.',
    sub: 'what needs to come out?',
    placeholder: "what's cluttering your head right now?",
    button: 'dump it →',
    cardLabel: 'midday thoughts',
  },
  golden: {
    tagline: 'the day is almost done.',
    sub: 'how did it really go?',
    placeholder: 'how was today, honestly?',
    button: 'reflect →',
    cardLabel: 'end of day',
  },
  twilight: {
    tagline: 'the day is slipping away.',
    sub: 'what are you holding onto?',
    placeholder: 'what are you carrying into tonight?',
    button: 'release it →',
    cardLabel: 'twilight thoughts',
  },
  midnight: {
    tagline: 'the night is quiet.',
    sub: "what isn't?",
    placeholder: "what's keeping you awake?",
    button: 'write it down →',
    cardLabel: "tonight's thoughts",
  },
}

export function computeSkyState(): SkyState {
  const now = new Date()
  const key = getSkyKey(now.getHours())
  return {
    key,
    sun: getSunPosition(now),
    starOpacity: STAR_OPACITY[key],
    cloudOpacity: CLOUD_OPACITY[key],
    copy: SKY_COPY[key],
  }
}

export function computeSkyStateForHour(hour: number): SkyState {
  const key = getSkyKey(hour)
  const fakeDate = new Date()
  fakeDate.setHours(hour, 30, 0, 0)
  return {
    key,
    sun: getSunPosition(fakeDate),
    starOpacity: STAR_OPACITY[key],
    cloudOpacity: CLOUD_OPACITY[key],
    copy: SKY_COPY[key],
  }
}

export function useSkyState(overrideHour?: number | null) {
  const [sky, setSky] = useState<SkyState>(() =>
    overrideHour != null ? computeSkyStateForHour(overrideHour) : computeSkyState()
  )
  const [skyOpacity, setSkyOpacity] = useState(1)
  const skyKeyRef = useRef(sky.key)

  function applyNext(next: SkyState) {
    if (next.key !== skyKeyRef.current) {
      setSkyOpacity(0)
      setTimeout(() => {
        setSky(next)
        skyKeyRef.current = next.key
        setSkyOpacity(1)
      }, 600)
    } else {
      setSky(next)
    }
  }

  // Respond to override hour changes (including reset to null)
  useEffect(() => {
    applyNext(overrideHour != null ? computeSkyStateForHour(overrideHour) : computeSkyState())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideHour])

  // Real-time tick — disabled while override is active
  useEffect(() => {
    if (overrideHour != null) return
    const interval = setInterval(() => applyNext(computeSkyState()), 60_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideHour])

  return { sky, skyOpacity }
}
