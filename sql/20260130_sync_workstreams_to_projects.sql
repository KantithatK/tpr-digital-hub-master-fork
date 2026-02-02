-- 2026-01-30: Sync workstreams -> projects (TPR)
-- Requirements:
-- - tpr_workstreams.status is Thai and is the source of truth
-- - Project progress = round(done * 100 / total)
--   - total = count(workstreams where deleted=false and archived=false)
--   - done  = count(workstreams where deleted=false and archived=false and status='เสร็จแล้ว')
-- - Do NOT use budget/spent/progress per workstream
-- - Trigger AFTER INSERT/UPDATE/DELETE on public.tpr_workstreams
-- - Must handle project_id changes (update old + new)

begin;

create or replace function public.sync_workstreams_to_projects()
returns trigger
language plpgsql
as $$
declare
  old_pid uuid;
  new_pid uuid;
begin
  if (tg_op = 'INSERT') then
    new_pid := new.project_id;
  elsif (tg_op = 'DELETE') then
    old_pid := old.project_id;
  else
    old_pid := old.project_id;
    new_pid := new.project_id;
  end if;

  -- Recompute for NEW project
  if new_pid is not null then
    with stats as (
      select
        count(*)::int as total,
        count(*) filter (where status = 'เสร็จแล้ว')::int as done
      from public.tpr_workstreams
      where project_id = new_pid
        and deleted = false
        and archived = false
    )
    update public.tpr_projects p
    set
      progress = case
        when stats.total = 0 then 0
        else round((stats.done * 100.0) / stats.total)::int
      end,
      updated_at = now()
    from stats
    where p.id = new_pid;
  end if;

  -- If project_id changed (or DELETE), also recompute for OLD project
  if old_pid is not null and old_pid is distinct from new_pid then
    with stats as (
      select
        count(*)::int as total,
        count(*) filter (where status = 'เสร็จแล้ว')::int as done
      from public.tpr_workstreams
      where project_id = old_pid
        and deleted = false
        and archived = false
    )
    update public.tpr_projects p
    set
      progress = case
        when stats.total = 0 then 0
        else round((stats.done * 100.0) / stats.total)::int
      end,
      updated_at = now()
    from stats
    where p.id = old_pid;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_workstreams_to_projects on public.tpr_workstreams;
create trigger trg_sync_workstreams_to_projects
after insert or update or delete on public.tpr_workstreams
for each row
execute function public.sync_workstreams_to_projects();

-- Backfill once: recompute progress for every project
with ws as (
  select
    project_id,
    count(*) filter (where deleted = false and archived = false)::int as total,
    count(*) filter (where deleted = false and archived = false and status = 'เสร็จแล้ว')::int as done
  from public.tpr_workstreams
  group by project_id
),
calc as (
  select
    p.id as project_id,
    case
      when coalesce(ws.total, 0) = 0 then 0
      else round((coalesce(ws.done, 0) * 100.0) / ws.total)::int
    end as progress
  from public.tpr_projects p
  left join ws on ws.project_id = p.id
)
update public.tpr_projects p
set progress = calc.progress,
    updated_at = now()
from calc
where p.id = calc.project_id;

commit;
