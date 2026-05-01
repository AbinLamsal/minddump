'use client'

import { useState, useEffect, useRef } from 'react'
import { Entry, Category, Nature } from '@/lib/types'

const CATEGORIES: Category[] = ['Todo', 'Note', 'Reminder', 'Idea', 'Feeling']

const CATEGORY_STYLES: Record<Category, { bg: string; text: string; activeBg: string; label: string }> = {
  Todo:     { bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-800 dark:text-violet-200',  activeBg: 'bg-violet-200 dark:bg-violet-800/50',  label: 'To do'    },
  Note:     { bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-800 dark:text-blue-200',      activeBg: 'bg-blue-200 dark:bg-blue-800/50',      label: 'Note'     },
  Reminder: { bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-800 dark:text-amber-200',    activeBg: 'bg-amber-200 dark:bg-amber-800/50',    label: 'Reminder' },
  Idea:     { bg: 'bg-emerald-100 dark:bg-emerald-900/30',text: 'text-emerald-800 dark:text-emerald-200',activeBg: 'bg-emerald-200 dark:bg-emerald-800/50',label: 'Idea'     },
  Feeling:  { bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-800 dark:text-pink-200',      activeBg: 'bg-pink-200 dark:bg-pink-800/50',      label: 'Feeling'  },
}

const NATURE_BORDER: Record<Nature, string> = {
  actionable: 'border-l-[3px] border-l-emerald-400 dark:border-l-emerald-500',
  spiral:     'border-l-[3px] border-l-[#8B7DD8] dark:border-l-[#7B6DC8]',
  neutral:    '',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatReminderTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Default datetime-local value: 1 hour from now, rounded to the nearest 15 min
function defaultPickerValue() {
  const d = new Date()
  d.setHours(d.getHours() + 1)
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  return d.toISOString().slice(0, 16)
}

interface EntryCardProps {
  entry: Entry
  onDelete: (id: string) => void
  onRecategorize: (id: string, category: Category) => void
  onReminderSet: (id: string, reminderTime: string) => void
  showReminderPrompt?: boolean
}

export default function EntryCard({ entry, onDelete, onRecategorize, onReminderSet, showReminderPrompt = false }: EntryCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [category, setCategory] = useState<Category>(entry.category)

  useEffect(() => {
    if (!showMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])
  const [showReminder, setShowReminder] = useState(showReminderPrompt && !entry.reminder_time)
  const [reminderValue, setReminderValue] = useState('')

  useEffect(() => {
    setReminderValue(defaultPickerValue())
  }, [])

  const style = CATEGORY_STYLES[category]
  const nature = entry.nature ?? 'neutral'
  const natureBorder = NATURE_BORDER[nature]

  function handleDelete() {
    onDelete(entry.id)
  }

  function handleRecategorize(newCategory: Category) {
    if (newCategory === category) { setShowPicker(false); return }
    setCategory(newCategory)
    setShowPicker(false)
    onRecategorize(entry.id, newCategory)
  }

  function handleReminderConfirm() {
    if (!reminderValue) return
    const iso = new Date(reminderValue).toISOString()

    // Optimistic update — UI responds immediately
    onReminderSet(entry.id, iso)
    setShowReminder(false)

    // Persist to DB in background
    fetch(`/api/entries/${entry.id}/reminder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder_time: iso }),
    }).catch(() => {})

    if ('Notification' in window && Notification.permission === 'granted') {
      const delay = new Date(iso).getTime() - Date.now()
      if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          new Notification('MindDump reminder 🧠', {
            body: entry.content,
            icon: '/favicon.ico',
          })
        }, delay)
      }
    }
  }

  return (
    <div className={`sky-card group rounded-2xl border border-[#EDE9F8] dark:border-[#2D2845] bg-white dark:bg-[#1E1A2E] px-5 py-4 shadow-sm transition-shadow hover:shadow-md ${natureBorder}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Todo checkbox */}
          {category === 'Todo' && (
            <button
              onClick={handleDelete}
              title="Mark as done"
              className="shrink-0 w-4 h-4 rounded border-2 border-violet-300 dark:border-violet-600 hover:border-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
              aria-label="Complete and delete"
            />
          )}
          {/* Category badge */}
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
          </span>

          {nature === 'actionable' && (
            <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              ✓ actionable
            </span>
          )}

          {/* Bell indicator when reminder is set */}
          {entry.reminder_time && (
            <span
              title={`Reminder: ${formatReminderTime(entry.reminder_time)}`}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs text-amber-500 dark:text-amber-400"
              suppressHydrationWarning
            >
              🔔 {formatReminderTime(entry.reminder_time)}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="sky-card-muted text-xs text-[#C4BBDA] dark:text-[#4A4368]" suppressHydrationWarning>{formatTime(entry.created_at)}</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setShowMenu((v) => !v); setShowPicker(false) }}
              title="More options"
              className="rounded-lg px-1.5 py-1 text-[#D4C8EA] dark:text-[#3D3860] opacity-0 group-hover:opacity-100 hover:bg-[#F0EDFB] dark:hover:bg-[#2D2845] hover:text-[#8B7DD8] transition-all text-sm leading-none"
            >
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl border border-[#EDE9F8] dark:border-[#2D2845] bg-white dark:bg-[#1E1A2E] shadow-lg py-1">
                <button
                  onClick={() => { setShowPicker(true); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#5A4F72] dark:text-[#C4BBDA] hover:bg-[#F5F3FC] dark:hover:bg-[#2D2845] transition-colors"
                >
                  Change category
                </button>
                <button
                  onClick={() => { handleDelete(); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline category picker */}
      {showPicker && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const s = CATEGORY_STYLES[c]
            const isActive = c === category
            return (
              <button
                key={c}
                onClick={() => handleRecategorize(c)}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-all ${s.bg} ${s.text} ${isActive ? 'ring-2 ring-offset-1 ring-[#8B7DD8]/40' : 'opacity-60 hover:opacity-100'}`}
              >
                {s.label}
                {isActive && <span className="ml-1">✓</span>}
              </button>
            )
          })}
          <button
            onClick={() => setShowPicker(false)}
            className="rounded-full px-2 py-0.5 text-xs text-[#B8B0CC] dark:text-[#4A4368] hover:text-[#8B7DD8] transition-colors"
          >
            cancel
          </button>
        </div>
      )}

      {/* Content */}
      <p className="sky-card-primary mt-3 text-sm font-medium text-[#5A4F72] dark:text-[#C4BBDA] leading-relaxed">
        {entry.acknowledgement}
      </p>
      <p className="sky-card-muted mt-2 text-sm text-[#7E7391] dark:text-[#8B7FA8] leading-relaxed">
        {entry.content}
      </p>

      {entry.spiral_nudge && (
        <div className="sky-spiral-note mt-3 flex items-start gap-2 rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200/60 dark:border-violet-500/20 px-4 py-3">
          <span className="text-base mt-0.5">🫧</span>
          <p className="sky-card-primary text-xs text-violet-900 dark:text-violet-200 leading-relaxed">
            <span className="font-semibold sky-card-primary">Heads up: </span>{entry.spiral_nudge}
          </p>
        </div>
      )}

      {/* Reminder prompt — shown when AI detected reminder intent */}
      {showReminder && !entry.reminder_time && (
        <div className="mt-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
            🔔 When should we remind you?
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="datetime-local"
              value={reminderValue}
              onChange={(e) => setReminderValue(e.target.value)}
              className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-white dark:bg-[#1A1625] px-3 py-1.5 text-xs text-[#5A4F72] dark:text-[#C4BBDA] focus:border-[#8B7DD8] focus:outline-none focus:ring-2 focus:ring-[#8B7DD8]/20 transition-all"
            />
            <button
              onClick={handleReminderConfirm}
              disabled={!reminderValue}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              Set reminder
            </button>
            <button
              onClick={() => setShowReminder(false)}
              className="text-xs text-[#B8B0CC] hover:text-[#8B7DD8] transition-colors"
            >
              not now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
