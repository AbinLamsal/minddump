import { GoogleGenerativeAI } from '@google/generative-ai'
import { Category, Nature } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const SYSTEM_PROMPT = `You are a calm, warm assistant helping an overthinker process their thoughts.

You will receive a new brain dump and optionally a list of recent entries from this person.

Respond in JSON only with this structure:
{
  "acknowledgement": string,
  "category": "Todo" | "Note" | "Reminder" | "Idea" | "Feeling",
  "reminderIntent": boolean,
  "nature": "actionable" | "spiral" | "neutral",
  "loopDetected": boolean,
  "loopMessage": string | null
}

Rules:
- acknowledgement: one warm sentence, max 12 words, never clinical, never use productivity language
- nature "actionable": something concrete they can actually do something about
- nature "spiral": anxiety, rumination, catastrophising, circular worrying, things outside their control
- nature "neutral": everything else — observations, facts, plans, ideas without distress
- reminderIntent: true if the entry mentions anything time-sensitive that someone would want reminding of (calls, appointments, bills, tasks with a deadline, etc.)
- loopDetected: true only if this thought is substantially similar to 2 or more of the recent entries provided
- loopMessage: if loopDetected is true, write one warm sentence gently surfacing the pattern (e.g. "You've come back to this a few times — want to make a small plan, or just let it out?"); otherwise null
- Always be gentle. Never clinical.`

export async function POST(request: NextRequest) {
  try {
    const { content, windDown, recentEntries = [], userId } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    })

    const userMessage = recentEntries.length > 0
      ? `New brain dump: ${content.trim()}\n\nRecent entries for loop detection:\n${JSON.stringify(recentEntries)}`
      : content.trim()

    const result = await model.generateContent(userMessage)
    const rawText = result.response.text()

    let parsed: {
      acknowledgement: string
      category: Category
      reminderIntent: boolean
      nature: Nature
      loopDetected: boolean
      loopMessage: string | null
    }

    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const entryId = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    const entry = {
      id: entryId,
      user_id: userId ?? null,
      content: content.trim(),
      category: parsed.category,
      nature: parsed.nature,
      acknowledgement: parsed.acknowledgement,
      reminder_time: null,
      reminder_sent: false,
      created_at: createdAt,
    }

    const closing = windDown
      ? 'Your head is clear. These thoughts are safe here. Sleep well. 🌙'
      : null

    return NextResponse.json({
      entry,
      loopDetected: parsed.loopDetected ?? false,
      loopMessage: parsed.loopMessage ?? null,
      closingMessage: closing,
      reminderIntent: parsed.reminderIntent ?? (parsed.category === 'Reminder'),
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
