import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reminder_time } = await request.json()

    if (!reminder_time || typeof reminder_time !== 'string') {
      return NextResponse.json({ error: 'reminder_time is required' }, { status: 400 })
    }

    const db = createServerClient()
    const { error } = await db
      .from('entries')
      .update({ reminder_time })
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Reminder update error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
