/*
  # Shared approve_task_completion RPC

  Single source of truth for task approval logic, used by both the web app
  and the mobile app.

  ## What it does
  1. Marks the task_completion row as approved and sets reviewed_at
  2. Awards stars to the child's stars_balance
  3. Decrements stars_pending by the same amount
  4. Resets the task status based on reset_mode:
     - 'instant' → status back to 'in_progress' immediately (always-available)
     - 'daily'   → status set to 'approved' (stays done until daily reset)
     Also falls back to legacy `repeatable` / `frequency = 'always_available'`
     so tasks created by either app are handled correctly.

  ## Parameters
  - p_completion_id  uuid   the task_completions row to approve
  - p_review_notes   text   optional parent note (may be null)

  ## Returns
  - JSON object with keys: ok (bool), stars_balance (int), task_status (text)
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
  -- 1. Load and lock the completion row
  SELECT * INTO v_completion
  FROM task_completions
  WHERE id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'completion not found: %', p_completion_id;
  END IF;

  -- 2. Load the parent task
  SELECT * INTO v_task
  FROM tasks
  WHERE id = v_completion.task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task not found: %', v_completion.task_id;
  END IF;

  -- 3. Mark the completion approved
  UPDATE task_completions
  SET
    status      = 'approved',
    reviewed_at = now(),
    review_notes = p_review_notes
  WHERE id = p_completion_id;

  -- 4. Award stars and reduce pending
  SELECT stars_balance INTO v_child_stars
  FROM child_profiles
  WHERE id = v_completion.child_profile_id;

  v_new_balance := COALESCE(v_child_stars, 0) + COALESCE(v_completion.stars_earned, 0);

  UPDATE child_profiles
  SET
    stars_balance  = v_new_balance,
    stars_pending  = GREATEST(0, COALESCE(stars_pending, 0) - COALESCE(v_completion.stars_earned, 0))
  WHERE id = v_completion.child_profile_id;

  -- 5. Determine new task status using reset_mode (canonical) with
  --    fallback to legacy repeatable / frequency fields so tasks from
  --    either app are handled correctly.
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
    'ok',           true,
    'stars_balance', v_new_balance,
    'task_status',   v_new_status
  );
END;
$$;
