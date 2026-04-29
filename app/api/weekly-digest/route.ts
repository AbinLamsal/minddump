import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)

const DIGEST_PROMPT = `You are a warm, gentle assistant helping an overthinker understand their thought patterns over the past week.

Here are their brain dump entries from the past 7 days (JSON array with content, category, nature, acknowledgement fields):
ENTRIES_PLACEHOLDER

Respond in JSON only:
{
  "headline": string,
  "spiralTheme": string | null,
  "brightSpot": string | null,
  "gentleNudge": string,
  "stats": { "total": number, "spiral": number, "actionable": number, "neutral": number }
}

Rules:
- headline: one warm sentence capturing this week's overall emotional tone (max 12 words)
- spiralTheme: if 2+ entries were spiral/anxious, name the recurring worry gently (max 15 words); otherwise null
- brightSpot: if 2+ entries were actionable, name what they were moving toward (max 15 words); otherwise null
- gentleNudge: one warm, practical suggestion based on the patterns you saw (max 20 words)
- stats: count entries by nature field
Be warm, non-clinical, and focus on patterns not judgement.`

interface DigestResult {
  headline: string
  spiralTheme: string | null
  brightSpot: string | null
  gentleNudge: string
  stats: { total: number; spiral: number; actionable: number; neutral: number }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: users, error: usersError } = await db.from('users').select('id, email')
  if (usersError) {
    console.error('Users fetch error:', usersError)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const { data: entries, error } = await db
        .from('entries')
        .select('content, category, nature, acknowledgement')
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: true })

      if (error || !entries || entries.length < 3) return

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const prompt = DIGEST_PROMPT.replace('ENTRIES_PLACEHOLDER', JSON.stringify(entries))

      const result = await model.generateContent(prompt)
      const raw = result.response.text()
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

      let digest: DigestResult
      try {
        digest = JSON.parse(cleaned)
      } catch {
        console.error('Failed to parse digest for', user.email)
        return
      }

      const categoryBreakdown = entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1
        return acc
      }, {})

      const categoryRows = Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => `<tr><td style="padding:4px 12px 4px 0;color:#7E7391;">${cat}</td><td style="padding:4px 0;color:#3D3553;font-weight:500;">${count}</td></tr>`)
        .join('')

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'MindDump <reminders@minddump.app>',
        to: user.email,
        subject: 'Your weekly mind check-in 🧠',
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#3D3553;">
            <div style="font-size:28px;text-align:center;margin-bottom:8px;">🧠</div>
            <p style="text-align:center;color:#9E94BC;font-size:12px;margin:0 0 24px;text-transform:uppercase;letter-spacing:.08em;">Weekly mind check-in</p>

            <div style="background:#F7F5FE;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
              <p style="font-size:17px;font-style:italic;color:#5A4F72;margin:0;">"${digest.headline}"</p>
            </div>

            <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">${categoryRows}</table>

            ${digest.spiralTheme ? `
            <div style="border-left:3px solid #F4A6B0;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:16px;background:#FEF5F6;">
              <p style="font-size:12px;color:#C47080;margin:0 0 4px;text-transform:uppercase;letter-spacing:.06em;">A pattern worth noticing</p>
              <p style="font-size:14px;color:#7E7391;margin:0;">${digest.spiralTheme}</p>
            </div>` : ''}

            ${digest.brightSpot ? `
            <div style="border-left:3px solid #8B7DD8;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:16px;background:#F7F5FE;">
              <p style="font-size:12px;color:#8B7DD8;margin:0 0 4px;text-transform:uppercase;letter-spacing:.06em;">A bright spot</p>
              <p style="font-size:14px;color:#7E7391;margin:0;">${digest.brightSpot}</p>
            </div>` : ''}

            <div style="background:#F0EDF9;border-radius:12px;padding:16px 20px;margin-bottom:32px;">
              <p style="font-size:13px;color:#8B7DD8;margin:0 0 4px;font-weight:600;">One gentle suggestion</p>
              <p style="font-size:14px;color:#5A4F72;margin:0;">${digest.gentleNudge}</p>
            </div>

            <p style="color:#B8B0CC;font-size:12px;text-align:center;">
              ${digest.stats.total} entries this week · ${digest.stats.spiral} spirals · ${digest.stats.actionable} action items
            </p>
            <p style="color:#D5D0E8;font-size:11px;text-align:center;margin-top:16px;">— minddump, for the brain that won't switch off</p>
          </div>
        `,
      })
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
