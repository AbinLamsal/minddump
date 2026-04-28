-- Run this in Supabase SQL Editor to add the nature column

alter table entries
  add column if not exists nature text
  check (nature in ('actionable', 'spiral', 'neutral'));
