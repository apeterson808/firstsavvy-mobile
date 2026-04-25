/*
  # Update approve_task_completion RPC for weekly/monthly reset modes

  Extends the RPC to handle 'weekly' and 'monthly' reset_mode values.

  ## Behaviour
  - 'instant' → status back to 'in_progress' immediately (as before)
  - 'daily'   → status set to 'approved' (stays done until daily reset)
  - 'weekly'  → status set to 'approved' (stays done until weekly reset)
  - 'monthly' → status set to 'approved' (stays done until monthly reset)
  - legacy repeatable/frequency fallback preserved
*/

CREATE OR REPLACE FUNCTION approve_task_completion(
  p_completion_id uuid,
  p_review_notes  text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completion  task_completions%ROWTYPE;
  v_task        tasks%ROWTYPE;
  v_child_stars int;
  v_new_balance int;
  v_new_status  text;
BEGIN
  SELECT * INTO v_completion
  FROM task_completions
  WHERE id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'completion not found: %', p_completion_id;
  END IF;

  SELECT * INTO v_task
  FROM tasks
  WHERE id = v_completion.task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task not found: %', v_completion.task_id;
  END IF;

  UPDATE task_completions
  SET
    status       = 'approved',
    reviewed_at  = now(),
    review_notes = p_review_notes
  WHERE id = p_completion_id;

  SELECT stars_balance INTO v_child_stars
  FROM child_profiles
  WHERE id = v_completion.child_profile_id;

  v_new_balance := COALESCE(v_child_stars, 0) + COALESCE(v_completion.stars_earned, 0);

  UPDATE child_profiles
  SET
    stars_balance = v_new_balance,
    stars_pending = GREATEST(0, COALESCE(stars_pending, 0) - COALESCE(v_completion.stars_earned, 0))
  WHERE id = v_completion.child_profile_id;

  -- instant resets immediately; daily/weekly/monthly stay approved until scheduled reset
  IF v_task.reset_mode = 'instant'
     OR v_task.repeatable = true
     OR v_task.frequency  = 'always_available'
  THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'approved';
  END IF;

  UPDATE tasks
  SET
    status       = v_new_status,
    approved_at  = now(),
    completed_at = NULL
  WHERE id = v_task.id;

  RETURN json_build_object(
    'ok',            true,
    'stars_balance', v_new_balance,
    'task_status',   v_new_status
  );
END;
$$;
