import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createServerClient()
  const { error } = await db.from('entries').delete().eq('id', params.id)
  if (error) {
    console.error('Entry delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { category } = await request.json()
  if (!category) {
    return NextResponse.json({ error: 'category required' }, { status: 400 })
  }

  const db = createServerClient()
  const { error } = await db
    .from('entries')
    .update({ category })
    .eq('id', params.id)

  if (error) {
    console.error('Entry recategorize error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
