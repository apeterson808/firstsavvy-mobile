/*
  # Add weekly and monthly reset_mode values

  Expands the reset_mode column on tasks to support 'weekly' and 'monthly'
  in addition to the existing 'instant' and 'daily' values.

  No schema change is needed (column is unconstrained text), but we update
  the column default from 'daily' to 'instant' to match the new app default.

  ## Changes
  - tasks.reset_mode default changed from 'daily' → 'instant'
*/

ALTER TABLE tasks ALTER COLUMN reset_mode SET DEFAULT 'instant';
