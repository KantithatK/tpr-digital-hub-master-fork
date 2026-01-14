-- Create attachments table for task files
create table if not exists public.tpr_task_attachments (
  id bigserial primary key,
  task_id bigint not null references public.tpr_project_wbs_tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint null,
  mime_type text null,
  uploaded_by uuid null,
  created_at timestamptz not null default now()
);

-- Create comments table for task comments
create table if not exists public.tpr_task_comments (
  id bigserial primary key,
  task_id bigint not null references public.tpr_project_wbs_tasks(id) on delete cascade,
  comment_text text not null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

-- Create a view that returns tasks with attachments and comments counts
create or replace view public.v_project_board_tasks as
select
  t.*,
  coalesce(a.attachments_count, 0) as attachments_count,
  coalesce(c.comments_count, 0)   as comments_count
from public.tpr_project_wbs_tasks t
left join (
  select task_id, count(*) as attachments_count
  from public.tpr_task_attachments
  group by task_id
) a on a.task_id = t.id
left join (
  select task_id, count(*) as comments_count
  from public.tpr_task_comments
  group by task_id
) c on c.task_id = t.id;

-- Grant select on view to authenticated role if using Supabase policies (optional)
-- grant select on public.v_project_board_tasks to authenticated;
