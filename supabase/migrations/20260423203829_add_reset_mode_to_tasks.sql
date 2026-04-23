/*
  # Add reset_mode to tasks

  Adds a `reset_mode` column to the `tasks` table to control when a completed
  and approved task becomes available again.

  ## Changes
  - `tasks.reset_mode` (text, default 'daily')
    - 'daily'   – task resets at the start of each day (existing behaviour)
    - 'instant' – task resets immediately after it is approved, so it can be
                  done and awarded again right away

  Existing rows default to 'daily' to preserve current behaviour.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reset_mode'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reset_mode text NOT NULL DEFAULT 'daily';
  END IF;
END $$;
