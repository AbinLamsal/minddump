'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import DumpBox from '@/components/DumpBox'
import EntryCard from '@/components/EntryCard'
import Sidebar from '@/components/Sidebar'
import { Entry, Category, CategoryFilter } from '@/lib/types'
import { useSkyState } from '@/lib/skyState'
import { supabase } from '@/lib/supabase'

const CATEGORIES: Category[] = ['Todo', 'Note', 'Reminder', 'Idea', 'Feeling']

const STARS = Array.from({ length: 12 })

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filter, setFilter] = useState<CategoryFilter>('All')
  const [loading, setLoading] = useState(true)
  const [loopMessage, setLoopMessage] = useState<string | null>(null)
  const [isLateNight, setIsLateNight] = useState(false)
  const [windDownDismissed, setWindDownDismissed] = useState(false)
  const [founderMode, setFounderMode] = useState(false)
  const [overrideTime, setOverrideTime] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  // Track which entry IDs need the reminder prompt shown
  const [reminderPromptIds, setReminderPromptIds] = useState<Set<string>>(new Set())

  const notifTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const overrideHour = founderMode && overrideTime
    ? parseInt(overrideTime.split(':')[0], 10)
    : null

  const { sky, skyOpacity } = useSkyState(overrideHour)

  useEffect(() => {
    const uid = localStorage.getItem('md_user_id')
    if (!uid) {
      window.location.replace('/login')
      return
    }
    setUserId(uid)
    setIsLateNight(() => { const h = new Date().getHours(); return h >= 21 || h < 4 })

    supabase
      .from('entries')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setEntries(data as Entry[])
          scheduleNotifications(data as Entry[])
        }
        setLoading(false)
      })

    return () => {
      // Clear all scheduled notification timeouts on unmount
      Object.values(notifTimeouts.current).forEach(clearTimeout)
    }
  }, [])

  function scheduleNotifications(loadedEntries: Entry[]) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    loadedEntries.forEach((e) => {
      if (!e.reminder_time || e.reminder_sent) return
      const delay = new Date(e.reminder_time).getTime() - now
      if (delay <= 0 || delay > weekMs) return

      notifTimeouts.current[e.id] = setTimeout(() => {
        new Notification('MindDump reminder 🧠', {
          body: e.content,
          icon: '/favicon.ico',
        })
      }, delay)
    })
  }

  function handleEntryAdded(entry: Entry, loopDetected: boolean, msg: string | null, reminderIntent: boolean) {
    setEntries((prev) => [entry, ...prev])
    if (loopDetected && msg) setLoopMessage(msg)
    if (reminderIntent) {
      setReminderPromptIds((prev) => new Set(Array.from(prev).concat(entry.id)))
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (userId) {
      await supabase.from('entries').delete().eq('id', id)
    }
  }

  async function handleRecategorize(id: string, category: Category) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, category } : e))
    if (userId) {
      await supabase.from('entries').update({ category }).eq('id', id)
    }
  }

  function handleReminderSet(id: string, reminderTime: string) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, reminder_time: reminderTime } : e))
    setReminderPromptIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    // Schedule browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const delay = new Date(reminderTime).getTime() - Date.now()
      const weekMs = 7 * 24 * 60 * 60 * 1000
      if (delay > 0 && delay < weekMs) {
        const entry = entries.find((e) => e.id === id)
        if (entry) {
          if (notifTimeouts.current[id]) clearTimeout(notifTimeouts.current[id])
          notifTimeouts.current[id] = setTimeout(() => {
            new Notification('MindDump reminder 🧠', { body: entry.content, icon: '/favicon.ico' })
          }, delay)
        }
      }
    }
  }

  const filtered = filter === 'All' ? entries : entries.filter((e) => e.category === filter)

  const counts: Partial<Record<CategoryFilter, number>> = {
    All: entries.length,
    ...Object.fromEntries(
      CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c).length])
    ),
  }

  const recentEntries = entries.slice(0, 20).map((e) => e.content)

  return (
    <div data-sky={sky.key} className="sky-root">

      {/* ── Sky layer ── */}
      <div className="sky-layer" style={{ opacity: skyOpacity, transition: 'opacity 0.6s ease' }}>
        <div className="sky-gradient" />
        <div className="sky-horizon" />

        {/* Stars */}
        <div className="sky-stars">
          {STARS.map((_, i) => <div key={i} className="sky-star" />)}
        </div>

        {/* Clouds */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="sky-cloud" />
          <div className="sky-cloud" />
        </div>

        {/* Sun */}
        {sky.key === 'twilight' ? (
          <div className="sky-sun" style={{ bottom: '12%', left: '82%' }} />
        ) : sky.sun ? (
          <div
            className="sky-sun"
            style={{ left: `${sky.sun.x}%`, bottom: `${sky.sun.y}%` }}
          />
        ) : null}

        {/* Moon */}
        <div className="sky-moon" />

        {/* Ground */}
        <div className="sky-ground" />

        {/* Grass */}
        <div className="sky-grass" />
      </div>

      {/* ── Content ── */}
      <div className="sky-content">

        {/* Header */}
        <header className="sky-header border-b border-[#EDE9F8] dark:border-[#2D2845] bg-white/80 dark:bg-[#1A1625]/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <span className="sky-app-name text-lg font-semibold text-[#3D3553] dark:text-[#E8E4F5] tracking-tight">
                  minddump
                </span>
              </div>
              <p className="sky-tagline-text ml-8 text-xs italic text-[#B8B0CC] dark:text-[#6B6385]">
                {sky.copy.tagline}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/wind-down"
                className="sky-winddown-link rounded-full bg-[#1E1A2E] px-3 py-1.5 text-xs text-[#9E94BC] hover:text-[#C4BBDA] transition-colors"
              >
                🌙 wind down
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10">

          {/* Late night wind-down nudge */}
          {isLateNight && !windDownDismissed && (
            <div className="sky-nudge-banner mb-6 flex items-center justify-between rounded-2xl bg-[#1E1A2E] px-5 py-3.5">
              <p className="sky-nudge-text text-sm text-[#9E94BC]">
                🌙 It&apos;s getting late —{' '}
                <Link href="/wind-down" className="text-[#8B7DD8] underline underline-offset-2 hover:text-[#A99EE8]">
                  wind-down mode
                </Link>{' '}
                might feel gentler right now.
              </p>
              <button
                onClick={() => setWindDownDismissed(true)}
                className="ml-4 text-[#4A4368] hover:text-[#6B6385] text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Hero */}
          <div className="mb-8 text-center">
            <h1 className="sky-hero-title text-3xl font-semibold tracking-tight text-[#3D3553] dark:text-[#E8E4F5]">
              {sky.copy.tagline}
            </h1>
            <p className="sky-hero-sub mt-2 text-[#9E94BC] dark:text-[#7B7098]">
              {sky.copy.sub}
            </p>
          </div>

          {/* Dump box */}
          <div className="mx-auto max-w-2xl">
            <DumpBox
              onEntryAdded={handleEntryAdded}
              skyPlaceholder={sky.copy.placeholder}
              skyButtonText={sky.copy.button}
              recentEntries={recentEntries}
              userId={userId}
            />
          </div>

          {/* Loop detector message */}
          {loopMessage && (
            <div className="mx-auto mt-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#8B7DD8]/30 bg-[#8B7DD8]/8 dark:bg-[#8B7DD8]/10 px-5 py-4">
                <div className="flex gap-3">
                  <span className="text-lg">🔁</span>
                  <p className="text-sm text-[#5A4F72] dark:text-[#C4BBDA] leading-relaxed">
                    {loopMessage}
                  </p>
                </div>
                <button
                  onClick={() => setLoopMessage(null)}
                  className="shrink-0 text-[#B8B0CC] hover:text-[#8B7DD8] text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Entries area */}
          {(entries.length > 0 || loading) && (
            <div className="mt-12 flex gap-8">
              <Sidebar active={filter} onChange={setFilter} counts={counts} />
              <div className="flex-1">
                {!loading && filtered.length > 0 && (
                  <p className="sky-section-label mb-4 text-xs font-semibold uppercase tracking-widest text-[#B8B0CC] dark:text-[#4A4368]">
                    {sky.copy.cardLabel}
                  </p>
                )}

                {loading ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#EDE9F8]/60 dark:bg-[#2D2845]/60" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DDD8F0] dark:border-[#2D2845] py-12 text-center">
                    <p className="text-sm text-[#B8B0CC] dark:text-[#6B6385]">Nothing here yet in this category</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filtered.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onDelete={handleDelete}
                        onRecategorize={handleRecategorize}
                        onReminderSet={handleReminderSet}
                        showReminderPrompt={reminderPromptIds.has(entry.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && !loading && (
            <div className="mt-16 text-center">
              <p className="text-2xl">☁️</p>
              <p className="sky-hero-sub mt-3 text-sm text-[#B8B0CC] dark:text-[#6B6385]">
                Your entries will appear here, gently sorted.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Founder time-skip panel */}
      <div className="fixed bottom-4 right-4 z-50">
        {founderMode ? (
          <div className="flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-md px-3 py-2 border border-white/10 shadow-lg">
            <span className="text-[10px] text-white/40 select-none">⏰</span>
            <input
              type="time"
              value={overrideTime}
              onChange={(e) => setOverrideTime(e.target.value)}
              className="bg-transparent text-xs text-white/75 focus:outline-none w-[72px] tabular-nums"
            />
            <button
              onClick={() => { setFounderMode(false); setOverrideTime('') }}
              className="text-sm text-white/25 hover:text-white/60 transition-colors leading-none ml-0.5"
              aria-label="Close time override"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => setFounderMode(true)}
            className="w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-[11px] text-white/25 hover:text-white/55 hover:bg-black/35 transition-all flex items-center justify-center"
            aria-label="Open founder time override"
          >
            ◷
          </button>
        )}
      </div>
    </div>
  )
}
