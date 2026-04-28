export type Category = 'Todo' | 'Note' | 'Reminder' | 'Idea' | 'Feeling'
export type Nature = 'actionable' | 'spiral' | 'neutral'

export interface Entry {
  id: string
  user_id: string
  content: string
  category: Category
  nature: Nature | null
  acknowledgement: string
  reminder_time: string | null
  reminder_sent: boolean
  created_at: string
}

export type CategoryFilter = 'All' | Category
