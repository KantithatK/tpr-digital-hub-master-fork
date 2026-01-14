-- Migration: 20251215_create_manager_project_tracking_views.sql
-- Purpose: Create indexes, status->progress mapping table, and views for Manager Project Tracking.
-- Idempotent: safe to run multiple times.

BEGIN;

-- A) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_metadata_status
  ON public.tpr_project_wbs_tasks ((metadata->>'status'));

CREATE INDEX IF NOT EXISTS idx_time_entries_project_status_date
  ON public.tpr_time_entries (project_id, status, entry_date);

CREATE INDEX IF NOT EXISTS idx_wbs_phases_project_end_date
  ON public.tpr_project_wbs_phases (project_id, end_date);

-- B) Mapping table status -> progress
CREATE TABLE IF NOT EXISTS public.tpr_task_status_progress_map (
  status text PRIMARY KEY,
  progress int NOT NULL CHECK (progress BETWEEN 0 AND 100)
);

-- Upsert canonical mapping values
INSERT INTO public.tpr_task_status_progress_map (status, progress) VALUES
  ('todo', 0),
  ('doing', 40),
  ('review', 80),
  ('revise', 60),
  ('done', 100),
  ('cancelled', 0)
ON CONFLICT (status) DO UPDATE SET progress = EXCLUDED.progress;

-- C) VIEW 1: v_wbs_tasks_with_progress
-- Read status from metadata->>'status'; default to 'todo'
CREATE OR REPLACE VIEW public.v_wbs_tasks_with_progress AS
SELECT
  t.*,
  coalesce(t.metadata->>'status', 'todo') AS task_status,
  coalesce(m.progress, 0) AS task_progress
FROM public.tpr_project_wbs_tasks t
LEFT JOIN public.tpr_task_status_progress_map m
  ON m.status = coalesce(t.metadata->>'status', 'todo');

-- D) VIEW 2: v_phase_progress
-- Weighted average of task progress by planned_hours; exclude cancelled tasks
CREATE OR REPLACE VIEW public.v_phase_progress AS
SELECT
  p.id AS phase_id,
  p.project_id,
  round(
    CASE
      WHEN sum(coalesce(t.planned_hours, 0)) = 0 THEN 0
      ELSE sum(coalesce(t.planned_hours, 0) * t.task_progress)::numeric
           / sum(coalesce(t.planned_hours, 0))
    END
  )::int AS phase_progress
FROM public.tpr_project_wbs_phases p
LEFT JOIN public.v_wbs_tasks_with_progress t
  ON t.phase_id = p.id
-- exclude cancelled tasks from calculation
WHERE coalesce(t.task_status, '') <> 'cancelled'
   OR t.task_status IS NULL
GROUP BY p.id, p.project_id;

-- E) VIEW 3: v_project_progress
-- Weighted average across all tasks in project; fallback to pr.progress
CREATE OR REPLACE VIEW public.v_project_progress AS
SELECT
  pr.id AS project_id,
  round(
    CASE
      WHEN sum(coalesce(t.planned_hours, 0)) = 0 THEN coalesce(pr.progress, 0)
      ELSE sum(coalesce(t.planned_hours, 0) * t.task_progress)::numeric
           / sum(coalesce(t.planned_hours, 0))
    END
  )::int AS project_progress
FROM public.tpr_projects pr
LEFT JOIN public.v_wbs_tasks_with_progress t
  ON t.project_id = pr.id
WHERE pr.deleted = false
GROUP BY pr.id, pr.progress;

-- F) VIEW 4: v_project_budget_hours
-- Prefer sum(workstreams.planned_hours) if non-zero, else sum(phases.planned_hours)
CREATE OR REPLACE VIEW public.v_project_budget_hours AS
WITH ws AS (
  SELECT project_id, sum(coalesce(planned_hours,0)) AS budget_hours_ws
  FROM public.tpr_workstreams
  WHERE deleted = false AND archived = false
  GROUP BY project_id
),
ph AS (
  SELECT project_id, sum(coalesce(planned_hours,0)) AS budget_hours_phase
  FROM public.tpr_project_wbs_phases
  GROUP BY project_id
)
SELECT
  pr.id AS project_id,
  coalesce(nullif(ws.budget_hours_ws, 0), ph.budget_hours_phase, 0) AS budget_hours
FROM public.tpr_projects pr
LEFT JOIN ws ON ws.project_id = pr.id
LEFT JOIN ph ON ph.project_id = pr.id
WHERE pr.deleted = false;

-- G) VIEW 5: v_project_actuals
-- Sum approved hours and cost/bill values using project role rates joined by employee position
CREATE OR REPLACE VIEW public.v_project_actuals AS
SELECT
  te.project_id,
  sum(te.hours) FILTER (WHERE te.status = 'Approved') AS actual_hours_approved,
  sum((te.hours * coalesce(prr.cost_rate, 0))) FILTER (WHERE te.status = 'Approved') AS actual_cost_labor,
  sum((te.hours * coalesce(prr.bill_rate, 0))) FILTER (WHERE te.status = 'Approved') AS actual_billable_value
FROM public.tpr_time_entries te
JOIN public.employees e
  ON e.id = te.user_id
LEFT JOIN public.tpr_project_role_rates prr
  ON prr.project_id = te.project_id
  AND prr.position_id = e.position_id
WHERE te.project_id IS NOT NULL
GROUP BY te.project_id;

-- H) VIEW 6: v_project_budget_cost
-- Choose budget cost from finances (fees_budget, contract_value), then project.budget, then workstreams budget
CREATE OR REPLACE VIEW public.v_project_budget_cost AS
WITH ws AS (
  SELECT project_id, sum(coalesce(budget_amount,0)) AS budget_amount_ws
  FROM public.tpr_workstreams
  WHERE deleted = false AND archived = false
  GROUP BY project_id
)
SELECT
  pr.id AS project_id,
  coalesce(
    pf.fees_budget,
    pf.contract_value,
    pr.budget,
    ws.budget_amount_ws,
    0
  ) AS budget_cost
FROM public.tpr_projects pr
LEFT JOIN public.tpr_project_finances pf
  ON pf.project_id = pr.id
LEFT JOIN ws ON ws.project_id = pr.id
WHERE pr.deleted = false;

-- I) VIEW 7: v_project_next_milestone
-- Next phase end_date in future with phase_progress < 100
CREATE OR REPLACE VIEW public.v_project_next_milestone AS
SELECT
  ph.project_id,
  min(ph.end_date) AS next_milestone_date
FROM public.tpr_project_wbs_phases ph
JOIN public.v_phase_progress vp ON vp.phase_id = ph.id
WHERE ph.end_date IS NOT NULL
  AND ph.end_date >= current_date
  AND vp.phase_progress < 100
GROUP BY ph.project_id;

-- J) VIEW 8: v_project_tracking_kpi
-- Combine project progress, budgets, actuals, planned progress, EV, CPI, SPI, and risk
CREATE OR REPLACE VIEW public.v_project_tracking_kpi AS
WITH base AS (
  SELECT
    pr.id AS project_id,
    pr.project_code,
    pr.name_th,
    pr.manager_id,
    pr.status,
    pr.start_date,
    pr.end_date,
    pp.project_progress,
    bh.budget_hours,
    bc.budget_cost,
    coalesce(pa.actual_hours_approved, 0) AS actual_hours,
    coalesce(pa.actual_cost_labor, 0) AS actual_cost,
    nm.next_milestone_date
  FROM public.tpr_projects pr
  LEFT JOIN public.v_project_progress pp ON pp.project_id = pr.id
  LEFT JOIN public.v_project_budget_hours bh ON bh.project_id = pr.id
  LEFT JOIN public.v_project_budget_cost bc ON bc.project_id = pr.id
  LEFT JOIN public.v_project_actuals pa ON pa.project_id = pr.id
  LEFT JOIN public.v_project_next_milestone nm ON nm.project_id = pr.id
  WHERE pr.deleted = false AND pr.archived = false
),
plan AS (
  SELECT
    b.*,
    CASE
      WHEN b.start_date IS NULL OR b.end_date IS NULL OR b.end_date <= b.start_date THEN NULL
      WHEN current_date <= b.start_date THEN 0
      WHEN current_date >= b.end_date THEN 100
      ELSE round(
        ((current_date - b.start_date)::numeric / nullif((b.end_date - b.start_date), 0)::numeric) * 100
      )::int
    END AS planned_progress
  FROM base b
),
ev AS (
  SELECT
    p.*,
    (p.budget_cost * (p.project_progress/100.0)) AS earned_value
  FROM plan p
)
SELECT
  e.*,
  CASE WHEN nullif(e.actual_cost,0) IS NULL THEN NULL
       ELSE (e.earned_value / nullif(e.actual_cost,0))
  END AS cpi,
  CASE WHEN e.planned_progress IS NULL OR e.planned_progress = 0 THEN NULL
       ELSE (e.project_progress::numeric / e.planned_progress::numeric)
  END AS spi,
  CASE
    WHEN e.next_milestone_date IS NOT NULL
     AND e.next_milestone_date <= (current_date + 7)
     AND e.project_progress < 80 THEN true
    ELSE false
  END AS is_at_risk
FROM ev e;

-- K) VIEW 9: v_manager_project_tracking_summary
CREATE OR REPLACE VIEW public.v_manager_project_tracking_summary AS
SELECT
  manager_id,
  count(*) FILTER (WHERE status NOT IN ('Completed','Archived')) AS active_count,
  count(*) FILTER (WHERE status = 'Completed') AS completed_count,
  count(*) FILTER (WHERE is_at_risk = true) AS at_risk_count,
  avg(cpi) AS avg_cpi,
  avg(spi) AS avg_spi,
  count(*) FILTER (WHERE cpi IS NOT NULL AND cpi < 0.9) AS cpi_lt_09_count,
  count(*) FILTER (WHERE spi IS NOT NULL AND spi < 0.9) AS spi_lt_09_count
FROM public.v_project_tracking_kpi
GROUP BY manager_id;

COMMIT;

-- End of migration
