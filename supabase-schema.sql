-- Run this in your Supabase SQL editor
-- Safe to re-run: uses IF NOT EXISTS and DROP IF EXISTS guards

-- ── Users table (custom email login) ──────────────────────────────────────
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
drop policy if exists "allow all for now" on users;
create policy "allow all for now" on users for all using (true) with check (true);

-- ── Entries table ──────────────────────────────────────────────────────────
create table if not exists entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade,
  content         text not null,
  category        text not null check (category in ('Todo', 'Note', 'Reminder', 'Idea', 'Feeling')),
  acknowledgement text not null,
  nature          text check (nature in ('actionable', 'spiral', 'neutral')),
  spiral_nudge    text,
  reminder_time   text,
  reminder_sent   boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Fix FK if table was created with the old auth.users reference
alter table entries
  drop constraint if exists entries_user_id_fkey;
alter table entries
  add constraint entries_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- Add reminder_sent column if running against an existing table
alter table entries
  add column if not exists reminder_sent boolean not null default false;

-- Add spiral_nudge column if running against an existing table
alter table entries
  add column if not exists spiral_nudge text;

create index if not exists entries_user_id_idx on entries(user_id, created_at desc);
create index if not exists entries_reminder_idx on entries(reminder_time) where reminder_sent = false;

alter table entries enable row level security;
drop policy if exists "allow all for now" on entries;
create policy "allow all for now" on entries for all using (true) with check (true);
