'use client'

import { CategoryFilter } from '@/lib/types'

const FILTERS: { label: string; value: CategoryFilter; emoji: string }[] = [
  { label: 'All',       value: 'All',      emoji: '🗂️' },
  { label: 'Todos',     value: 'Todo',     emoji: '✅' },
  { label: 'Notes',     value: 'Note',     emoji: '📝' },
  { label: 'Reminders', value: 'Reminder', emoji: '⏰' },
  { label: 'Ideas',     value: 'Idea',     emoji: '💡' },
  { label: 'Feelings',  value: 'Feeling',  emoji: '💜' },
]

interface SidebarProps {
  active: CategoryFilter
  onChange: (filter: CategoryFilter) => void
  counts: Partial<Record<CategoryFilter, number>>
}

export default function Sidebar({ active, onChange, counts }: SidebarProps) {
  return (
    <aside className="sky-sidebar-wrap w-48 shrink-0">
      <p className="sky-sidebar-label mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#B8B0CC] dark:text-[#4A4368]">
        Filter
      </p>
      <nav className="flex flex-col gap-0.5">
        {FILTERS.map(({ label, value, emoji }) => {
          const isActive = active === value
          const count = counts[value] ?? 0

          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`sky-sidebar-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                isActive
                  ? 'sky-active bg-[#8B7DD8]/10 font-medium text-[#8B7DD8]'
                  : 'text-[#7E7391] dark:text-[#8B7FA8] hover:bg-[#F4F0FD] dark:hover:bg-[#2D2845] hover:text-[#5A4F72] dark:hover:text-[#E8E4F5]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{emoji}</span>
                {label}
              </span>
              {count > 0 && (
                <span
                  className={`sky-sidebar-count rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? 'bg-[#8B7DD8]/20 text-[#8B7DD8]' : 'bg-[#EDE9F8] dark:bg-[#2D2845] text-[#9E94BC] dark:text-[#6B6385]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
