import { GoogleGenerativeAI } from '@google/generative-ai'
import { Category, Nature } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const CLASSIFY_PROMPT = `You are a calm, warm assistant helping an overthinker process their thoughts.

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
- acknowledgement: one warm sentence, max 12 words, never clinical, never use productivity language. It must be specific to what they actually wrote — never generic. Never say "anxiety", "spiral", "worry", or "stress". Don't repeat the same phrase twice across entries. Reflect the actual content back to them gently.
- nature "actionable": something concrete they can actually do something about
- nature "spiral": anxiety, rumination, catastrophising, circular worrying, things outside their control
- nature "neutral": everything else — observations, facts, plans, ideas without distress
- reminderIntent: true if the entry mentions anything time-sensitive that someone would want reminding of (calls, appointments, bills, tasks with a deadline, etc.)
- loopDetected: true only if this thought is substantially similar to 2 or more of the recent entries provided
- loopMessage: if loopDetected is true, write one warm sentence gently surfacing the pattern (e.g. "You've come back to this a few times — want to make a small plan, or just let it out?"); otherwise null
- Always be gentle. Never clinical.`

const CROSS_SESSION_PROMPT = `You are analysing recurring thought patterns for someone who journals their worries.

You will receive a new spiral/anxious entry and their historical spiral entries from the past 30 days.

Look for a genuine recurring theme — a specific person, situation, fear, or worry that appears in the new entry AND in multiple historical entries. Count occurrences carefully.

Only flag a pattern if the same specific theme appears in the new entry PLUS at least 2 historical entries (3+ total). Be specific — "your mum" is better than "relationships". Surface observations, not therapy.

Respond in JSON only:
{
  "patternDetected": boolean,
  "nudge": string | null
}

nudge format when patternDetected is true: warm, specific, factual — e.g. "You've mentioned your mum 4 times in the past two weeks." or "Work stress has come up 5 times this month." Max 20 words. No advice, just observation. null if no clear pattern.`

export async function POST(request: NextRequest) {
  try {
    const { content, windDown, recentEntries = [], userId } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: CLASSIFY_PROMPT,
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

    // Cross-session loop detection — only for spiral entries by logged-in users
    let spiralNudge: string | null = null
    if (parsed.nature === 'spiral' && userId) {
      try {
        const db = createServerClient()
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: historicalSpirals } = await db
          .from('entries')
          .select('content, created_at')
          .eq('user_id', userId)
          .eq('nature', 'spiral')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(25)

        if (historicalSpirals && historicalSpirals.length >= 2) {
          const crossModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: CROSS_SESSION_PROMPT,
          })

          const crossMessage = `New entry: ${content.trim()}\n\nHistorical spiral entries:\n${JSON.stringify(
            historicalSpirals.map(e => ({ content: e.content, date: e.created_at.slice(0, 10) }))
          )}`

          const crossResult = await crossModel.generateContent(crossMessage)
          const crossRaw = crossResult.response.text()
          const crossCleaned = crossRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
          const crossParsed = JSON.parse(crossCleaned)

          if (crossParsed.patternDetected && crossParsed.nudge) {
            spiralNudge = crossParsed.nudge
          }
        }
      } catch (err) {
        // Cross-session analysis is best-effort — don't fail the whole request
        console.error('Cross-session loop detection error:', err)
      }
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
      spiral_nudge: spiralNudge,
      reminder_time: null,
      reminder_sent: false,
      created_at: createdAt,
    }

    if (userId) {
      const db = createServerClient()
      const { error: saveError } = await db.from('entries').insert({
        id: entryId,
        user_id: userId,
        content: entry.content,
        category: entry.category,
        nature: entry.nature,
        acknowledgement: entry.acknowledgement,
        spiral_nudge: spiralNudge,
        reminder_time: null,
        reminder_sent: false,
        created_at: createdAt,
      })
      if (saveError) {
        console.error('Entry save error:', saveError)
        return NextResponse.json({ error: `DB error: ${saveError.message}` }, { status: 500 })
      }
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
