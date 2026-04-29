'use client'

import { useState, useEffect } from 'react'
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
  const [category, setCategory] = useState<Category>(entry.category)
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
          <button
            onClick={() => setShowPicker((v) => !v)}
            title="Change category"
            className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${style.bg} ${style.text} hover:${style.activeBg} cursor-pointer`}
          >
            {style.label}
            <span className="opacity-50 text-[10px]">▾</span>
          </button>

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
          <button
            onClick={handleDelete}
            title="Delete entry"
            className="rounded-lg p-1 text-[#D4C8EA] dark:text-[#3D3860] opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-400 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
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

      {nature === 'spiral' && (
        <p className="mt-3 rounded-xl border border-[#E8C99A] dark:border-[#FBE2C3]/30 bg-[#FBE2C3] dark:bg-[#FBE2C3]/20 px-3 py-2 text-xs text-[#6B5F8A] dark:text-[#C4B8E0] leading-relaxed italic">
          This might be your anxiety talking — you don&apos;t have to solve this right now.
        </p>
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
