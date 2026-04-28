import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  // Verify cron secret so only Vercel (or you) can trigger this
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()

  // Fetch due reminders with the user's email via join
  const { data: entries, error } = await db
    .from('entries')
    .select('id, content, acknowledgement, reminder_time, users(email)')
    .lte('reminder_time', new Date().toISOString())
    .eq('reminder_sent', false)
    .not('reminder_time', 'is', null)

  if (error) {
    console.error('Supabase fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      const userEmail = (entry.users as unknown as { email: string } | null)?.email
      if (!userEmail) return

      const reminderDate = new Date(entry.reminder_time!).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'MindDump <reminders@minddump.app>',
        to: userEmail,
        subject: 'A little reminder from your mind 🧠',
        html: `
          <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D3553;">
            <div style="font-size: 28px; text-align: center; margin-bottom: 24px;">🧠</div>
            <p style="color: #9E94BC; font-size: 13px; margin-bottom: 8px;">You asked to be reminded on ${reminderDate}</p>
            <div style="background: #F7F5FE; border-left: 3px solid #8B7DD8; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
              <p style="font-size: 15px; font-style: italic; color: #5A4F72; margin: 0 0 8px;">${entry.acknowledgement}</p>
              <p style="font-size: 14px; color: #7E7391; margin: 0;">${entry.content}</p>
            </div>
            <p style="color: #B8B0CC; font-size: 13px; text-align: center; margin-top: 32px;">
              Take a breath. You've got this. 💜
            </p>
            <p style="color: #D5D0E8; font-size: 11px; text-align: center; margin-top: 24px;">
              — minddump, for the brain that won't switch off
            </p>
          </div>
        `,
      })

      // Mark as sent
      await db
        .from('entries')
        .update({ reminder_sent: true })
        .eq('id', entry.id)
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
