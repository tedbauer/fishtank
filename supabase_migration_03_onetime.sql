-- One-time tasks with optional deadline
ALTER TABLE chores ADD COLUMN IF NOT EXISTS one_time BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chores ADD COLUMN IF NOT EXISTS deadline DATE;
