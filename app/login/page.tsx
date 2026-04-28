'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      // Look up existing user
      const { data: existing, error: fetchErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmed)
        .maybeSingle()

      if (fetchErr) throw fetchErr

      let userId: string

      if (existing) {
        userId = existing.id
      } else {
        // New user — insert
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert({ email: trimmed })
          .select('id')
          .single()

        if (insertErr) throw insertErr
        userId = inserted.id
      }

      localStorage.setItem('md_user_id', userId)
      localStorage.setItem('md_email', trimmed)

      // Request notification permission on login (must be in a user gesture)
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      router.replace('/')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#13111C] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-semibold text-[#3D3553] dark:text-[#E8E4F5] tracking-tight">
              minddump
            </span>
          </div>
          <p className="text-sm text-[#B8B0CC] dark:text-[#6B6385] italic">
            for the brain that won&apos;t switch off
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#DDD8F0] dark:border-[#2D2845] bg-white dark:bg-[#1A1625] px-8 py-10"
        >
          <label className="block mb-5">
            <span className="text-sm text-[#9E94BC] dark:text-[#6B6385]">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-[#DDD8F0] dark:border-[#2D2845] bg-[#FAFAF9] dark:bg-[#0D0B14] px-4 py-3 text-[#3D3553] dark:text-[#E8E4F5] placeholder-[#D5D0E8] dark:placeholder-[#3D3553] text-sm focus:border-[#8B7DD8] focus:outline-none focus:ring-2 focus:ring-[#8B7DD8]/20 transition-all"
            />
          </label>

          {error && (
            <p className="mb-4 text-sm text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full rounded-xl bg-[#8B7DD8] px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#7A6CC7] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                One moment…
              </span>
            ) : (
              "Let's go"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
