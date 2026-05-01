'use client'

import { CategoryFilter } from '@/lib/types'

const FILTERS: { label: string; value: CategoryFilter; icon: string }[] = [
  { label: 'All',      value: 'All',      icon: '✦' },
  { label: 'Todo',     value: 'Todo',     icon: '✓' },
  { label: 'Note',     value: 'Note',     icon: '✎' },
  { label: 'Reminder', value: 'Reminder', icon: '⏰' },
  { label: 'Idea',     value: 'Idea',     icon: '💡' },
  { label: 'Feeling',  value: 'Feeling',  icon: '♡' },
]

interface FilterPillsProps {
  active: CategoryFilter
  onChange: (filter: CategoryFilter) => void
}

export default function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {FILTERS.map(({ label, value, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 text-xs transition-all ${
            active === value
              ? 'bg-[#8B7DD8]/15 text-[#8B7DD8] font-medium'
              : 'sky-filter-pill text-[#3B1A0A] hover:text-[#8B7DD8] hover:bg-[#8B7DD8]/8'
          }`}
        >
          <span className="mr-1">{icon}</span>{label}
        </button>
      ))}
    </div>
  )
}
