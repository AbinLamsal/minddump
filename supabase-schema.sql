-- Run this in your Supabase SQL editor

create table if not exists entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  content      text not null,
  category     text not null check (category in ('Todo', 'Note', 'Reminder', 'Idea', 'Feeling')),
  acknowledgement text not null,
  nature          text check (nature in ('actionable', 'spiral', 'neutral')),
  reminder_time   text,
  created_at   timestamptz not null default now()
);

-- Index for fast user-scoped queries (needed for auth phase)
create index if not exists entries_user_id_idx on entries(user_id, created_at desc);

-- Row Level Security (enable now, rules added in auth phase)
alter table entries enable row level security;

-- Temporary open policy for pre-auth MVP (remove when auth is added)
create policy "allow all for now"
  on entries for all
  using (true)
  with check (true);
