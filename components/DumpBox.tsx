'use client'

import { useState } from 'react'
import { Entry } from '@/lib/types'

interface DumpBoxProps {
  onEntryAdded: (entry: Entry, loopDetected: boolean, loopMessage: string | null, reminderIntent: boolean) => void
  windDown?: boolean
  skyPlaceholder?: string
  skyButtonText?: string
  recentEntries?: string[]
  userId?: string | null
}

export default function DumpBox({ onEntryAdded, windDown = false, skyPlaceholder, skyButtonText, recentEntries = [], userId }: DumpBoxProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, windDown, recentEntries, userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      onEntryAdded(
        data.entry,
        data.loopDetected ?? false,
        data.loopMessage ?? null,
        data.reminderIntent ?? false,
      )
      setContent('')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = content.trim().length === 0

  const defaultPlaceholder = windDown
    ? "What's still swirling before you sleep…"
    : "What's taking up space in your head right now?"

  const defaultButtonText = windDown ? 'Let it go for tonight' : 'Get it out of my head'

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={skyPlaceholder ?? defaultPlaceholder}
          rows={windDown ? 4 : 5}
          className={`sky-textarea w-full resize-none rounded-2xl border px-5 py-4 text-base leading-relaxed transition-all focus:outline-none
            ${windDown
              ? 'border-[#2D2845] bg-[#1A1625] text-[#E8E4F5] placeholder-[#4A4368] focus:border-[#8B7DD8] focus:ring-2 focus:ring-[#8B7DD8]/20'
              : 'border-[#E8E4F0] dark:border-[#2D2845] bg-white dark:bg-[#1E1A2E] text-[#3D3553] dark:text-[#E8E4F5] placeholder-[#B8B0CC] dark:placeholder-[#4A4368] focus:border-[#8B7DD8] focus:ring-2 focus:ring-[#8B7DD8]/20'
            }`}
          disabled={loading}
        />
        <div className={`absolute bottom-3 right-4 text-xs ${windDown ? 'text-[#4A4368]' : 'text-[#B8B0CC] dark:text-[#4A4368]'}`}>
          {content.length > 0 && content.length}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-rose-400">{error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isEmpty || loading}
          className={`sky-submit-btn rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]
            ${windDown
              ? 'bg-[#6B5FC4] hover:bg-[#5A4FB3]'
              : 'bg-[#8B7DD8] hover:bg-[#7B6DC8]'
            }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {windDown ? 'Setting it down…' : 'Holding this for you…'}
            </span>
          ) : (
            skyButtonText ?? defaultButtonText
          )}
        </button>
      </div>
    </form>
  )
}
