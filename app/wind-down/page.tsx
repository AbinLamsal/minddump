'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Entry } from '@/lib/types'

export default function WindDown() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closingMessage, setClosingMessage] = useState<string | null>(null)
  const [savedEntry, setSavedEntry] = useState<Entry | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('md_user_id')
    if (!uid) { window.location.replace('/login'); return }
    setUserId(uid)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, windDown: true, userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      setSavedEntry(data.entry)
      setClosingMessage(data.closingMessage)
      setContent('')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = content.trim().length === 0

  return (
    <div className="min-h-screen bg-[#0D0B14] flex flex-col">
      {/* Minimal header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌙</span>
          <span className="text-sm font-medium text-[#6B6385]">wind down</span>
        </div>
        <Link href="/" className="text-xs text-[#4A4368] hover:text-[#6B6385] transition-colors">
          ← back
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-lg">
          {/* Heading */}
          <div className="mb-10 text-center">
            <div className="mb-4 text-4xl">✦</div>
            <h1 className="text-2xl font-semibold text-[#C4BBDA] tracking-tight">
              Empty it out before you sleep
            </h1>
            <p className="mt-2 text-sm text-[#4A4368]">
              Whatever&apos;s still spinning — leave it here.
            </p>
          </div>

          {/* Closing message shown after submit */}
          {closingMessage && savedEntry ? (
            <div className="text-center">
              <div className="mb-6 rounded-2xl border border-[#2D2845] bg-[#1A1625] px-6 py-5">
                <p className="text-sm font-medium text-[#9E94BC] leading-relaxed">
                  {savedEntry.acknowledgement}
                </p>
                <p className="mt-2 text-xs text-[#4A4368] leading-relaxed">
                  {savedEntry.content}
                </p>
              </div>

              <div className="mb-8">
                <p className="text-lg font-medium text-[#C4BBDA] leading-relaxed">
                  {closingMessage}
                </p>
              </div>

              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => { setClosingMessage(null); setSavedEntry(null) }}
                  className="rounded-xl bg-[#1E1A2E] px-6 py-3 text-sm text-[#8B7FA8] hover:text-[#C4BBDA] transition-colors"
                >
                  There&apos;s one more thing…
                </button>
                <Link
                  href="/"
                  className="text-xs text-[#4A4368] hover:text-[#6B6385] transition-colors"
                >
                  Back to main
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's still swirling before you sleep…"
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-[#2D2845] bg-[#1A1625] px-5 py-4 text-[#E8E4F5] placeholder-[#4A4368] text-base leading-relaxed transition-all focus:border-[#6B5FC4] focus:outline-none focus:ring-2 focus:ring-[#6B5FC4]/20"
                  disabled={loading}
                />
                <div className="absolute bottom-3 right-4 text-xs text-[#4A4368]">
                  {content.length > 0 && content.length}
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-rose-400">{error}</p>
              )}

              <div className="mt-3 flex justify-center">
                <button
                  type="submit"
                  disabled={isEmpty || loading}
                  className="rounded-xl bg-[#2D2845] px-8 py-3 text-sm font-medium text-[#9E94BC] shadow-sm transition-all hover:bg-[#3D3860] hover:text-[#C4BBDA] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#9E94BC]/30 border-t-[#9E94BC]" />
                      Setting it down…
                    </span>
                  ) : (
                    'Let it go for tonight'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer stars */}
      <footer className="pb-8 text-center">
        <p className="text-xs text-[#2D2845] tracking-widest">✦ &nbsp; ✦ &nbsp; ✦</p>
      </footer>
    </div>
  )
}
