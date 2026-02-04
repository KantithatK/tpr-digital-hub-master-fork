// ===== src/tpr/functions/MainTask.js (แทนทั้งไฟล์) =====
// Logic layer for "งานหลัก" (tpr_project_wbs_tasks)
// - CRUD
// - multi owners (tpr_project_wbs_main_task_owners)
// - code generator
// - date range validation within Phase
// - workday calculations (Mon–Fri) with 8h/day

import { supabase } from "../../lib/supabaseClient";

const TABLE_TASKS = "tpr_project_wbs_tasks";
const TABLE_PHASES = "tpr_project_wbs_phases";
const TABLE_TASK_OWNERS = "tpr_project_wbs_main_task_owners";
const TABLE_PROJECT_MEMBERS = "tpr_project_members";

const HOURS_PER_DAY = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ================= helpers ================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODateOnly(d) {
  if (!d) return "";
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return "";
  return `${dd.getFullYear()}-${pad2(dd.getMonth() + 1)}-${pad2(dd.getDate())}`;
}

function parseISODateOnlyToMs(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function isWeekend(dateObj) {
  const day = dateObj.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
}

function addWorkdays(startISO, workdaysToAdd) {
  const startMs = parseISODateOnlyToMs(startISO);
  if (!Number.isFinite(startMs)) return "";

  let d = new Date(startMs);
  d.setHours(0, 0, 0, 0);

  while (isWeekend(d)) d = new Date(d.getTime() + MS_PER_DAY);

  let counted = 1;
  while (counted < Math.max(1, workdaysToAdd)) {
    d = new Date(d.getTime() + MS_PER_DAY);
    if (!isWeekend(d)) counted++;
  }
  return toISODateOnly(d);
}

function countWorkdaysInclusive(startISO, endISO) {
  const a = parseISODateOnlyToMs(startISO);
  const b = parseISODateOnlyToMs(endISO);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;

  let startMs = Math.min(a, b);
  let endMs = Math.max(a, b);

  let c = 0;
  for (let t = startMs; t <= endMs; t += MS_PER_DAY) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    if (!isWeekend(d)) c++;
  }
  return c;
}

/* ================= public APIs ================= */

export function genTaskCode(prefix = "TS") {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(
    d.getDate()
  )}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

/* ===== Phase ===== */

export async function getPhaseBounds({ phaseId, supabaseClient = supabase }) {
  if (!phaseId) return null;

  const { data, error } = await supabaseClient
    .from(TABLE_PHASES)
    .select("id, project_id, workstream_id, start_date, end_date")
    .eq("id", phaseId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export function validateTaskRangeWithinPhase({
  start_date,
  end_date,
  phase_start,
  phase_end,
}) {
  const sMs = parseISODateOnlyToMs(start_date);
  const eMs = parseISODateOnlyToMs(end_date);

  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) {
    return { ok: false, messageTh: "รูปแบบวันที่ไม่ถูกต้อง" };
  }
  if (eMs < sMs) {
    return { ok: false, messageTh: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" };
  }

  const psMs = parseISODateOnlyToMs(phase_start);
  const peMs = parseISODateOnlyToMs(phase_end);

  if (Number.isFinite(psMs) && sMs < psMs) {
    return { ok: false, messageTh: "วันที่เริ่มต้องไม่ก่อนช่วงของเฟส" };
  }
  if (Number.isFinite(peMs) && eMs > peMs) {
    return { ok: false, messageTh: "วันที่สิ้นสุดต้องไม่เกินช่วงของเฟส" };
  }

  return { ok: true };
}

/* ===== Tasks ===== */

export async function listTasks({
  projectId,
  phaseId,
  workstreamId,
  withOwners = true,
  supabaseClient = supabase,
}) {
  if (!projectId) return [];

  let q = supabaseClient
    .from(TABLE_TASKS)
    .select("*")
    .eq("project_id", projectId)
    .order("id", { ascending: true });

  if (phaseId != null) q = q.eq("phase_id", phaseId);
  if (workstreamId) q = q.eq("workstream_id", workstreamId);

  const { data: tasks, error } = await q;
  if (error) throw error;
  if (!withOwners || !tasks?.length) return tasks || [];

  const taskIds = tasks.map((t) => t.id);

  const { data: owners } = await supabaseClient
    .from(TABLE_TASK_OWNERS)
    .select("task_id, user_id, role")
    .in("task_id", taskIds);

  const map = {};
  for (const o of owners || []) {
    if (!map[o.task_id]) map[o.task_id] = [];
    map[o.task_id].push(o);
  }

  return tasks.map((t) => ({
    ...t,
    owners: map[t.id] || [],
  }));
}

/* ===== Project Members (Owner Picker Source) ===== */

export async function listProjectMembers({ projectId, supabaseClient = supabase } = {}) {
  if (!projectId) return [];

  // 1) Get member employee_ids
  const { data: memRows, error: memErr } = await supabaseClient
    .from(TABLE_PROJECT_MEMBERS)
    .select("employee_id")
    .eq("project_id", projectId)
    .limit(5000);

  if (memErr) throw memErr;

  const memberIds = Array.isArray(memRows)
    ? memRows
        .map((r) => String(r?.employee_id || "").trim())
        .filter(Boolean)
    : [];

  const uniqIds = Array.from(new Set(memberIds));
  if (!uniqIds.length) return [];

  // 2) Load employees by ids (chunked to avoid URL length / IN-list limits)
  const chunkSize = 1000;
  const chunks = [];
  for (let i = 0; i < uniqIds.length; i += chunkSize) {
    chunks.push(uniqIds.slice(i, i + chunkSize));
  }

  const allEmployees = [];
  for (const ids of chunks) {
    const { data: emps, error: empErr } = await supabaseClient
      .from("employees")
      .select(
        "id, employee_code, title_th, first_name_th, last_name_th, title_en, first_name_en, last_name_en, nickname_th, nickname_en"
      )
      .in("id", ids);
    if (empErr) throw empErr;
    if (Array.isArray(emps) && emps.length) allEmployees.push(...emps);
  }

  const mapById = new Map();
  for (const e of allEmployees) {
    const id = String(e?.id || "").trim();
    if (!id) continue;

    const employee_code = String(e?.employee_code || "").trim();
    mapById.set(id, {
      id,
      employee_code,
      title_th: e?.title_th ?? null,
      first_name_th: e?.first_name_th ?? null,
      last_name_th: e?.last_name_th ?? null,
      title_en: e?.title_en ?? null,
      first_name_en: e?.first_name_en ?? null,
      last_name_en: e?.last_name_en ?? null,
      nickname_th: e?.nickname_th ?? null,
      nickname_en: e?.nickname_en ?? null,
    });
  }

  const list = Array.from(mapById.values());
  list.sort((a, b) => {
    const ac = String(a.employee_code || "");
    const bc = String(b.employee_code || "");
    if (ac && bc) return ac.localeCompare(bc, "th");
    if (ac) return -1;
    if (bc) return 1;
    const an = `${String(a.first_name_th || a.first_name_en || "").trim()} ${String(a.last_name_th || a.last_name_en || "").trim()}`.trim();
    const bn = `${String(b.first_name_th || b.first_name_en || "").trim()} ${String(b.last_name_th || b.last_name_en || "").trim()}`.trim();
    return an.localeCompare(bn, "th");
  });

  return list;
}

export async function createTask(
  { owners = [], ...payload },
  supabaseClient = supabase
) {
  const { data: task, error } = await supabaseClient
    .from(TABLE_TASKS)
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;

  if (Array.isArray(owners) && owners.length > 0) {
    const rows = owners.map((user_id) => ({
      task_id: task.id,
      user_id,
    }));
    const { error: oe } = await supabaseClient
      .from(TABLE_TASK_OWNERS)
      .insert(rows);
    if (oe) throw oe;
  }

  return task;
}

export async function updateTask(
  id,
  { owners = null, ...payload },
  supabaseClient = supabase
) {
  if (!id) throw new Error("Missing task id");

  const { data: task, error } = await supabaseClient
    .from(TABLE_TASKS)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  if (Array.isArray(owners)) {
    await supabaseClient
      .from(TABLE_TASK_OWNERS)
      .delete()
      .eq("task_id", id);

    if (owners.length > 0) {
      const rows = owners.map((user_id) => ({
        task_id: id,
        user_id,
      }));
      const { error: oe } = await supabaseClient
        .from(TABLE_TASK_OWNERS)
        .insert(rows);
      if (oe) throw oe;
    }
  }

  return task;
}

export async function deleteTask(id, supabaseClient = supabase) {
  if (!id) throw new Error("Missing task id");
  const { error } = await supabaseClient
    .from(TABLE_TASKS)
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

/* ===== Workday calculations ===== */

export async function calcTaskEndDateFromPlannedHours({
  start_date,
  planned_hours,
  boundary_end,
}) {
  const hours = Number(planned_hours || 0);
  if (!start_date || !Number.isFinite(hours) || hours <= 0) {
    return { ok: false, messageTh: "ข้อมูลไม่ครบ" };
  }

  const days = Math.max(1, Math.ceil(hours / HOURS_PER_DAY));
  const endISO = addWorkdays(start_date, days);

  const eMs = parseISODateOnlyToMs(endISO);
  const beMs = parseISODateOnlyToMs(boundary_end);

  if (Number.isFinite(beMs) && Number.isFinite(eMs) && eMs > beMs) {
    return { ok: false, messageTh: "วันสิ้นสุดเกินช่วงของเฟส" };
  }

  return { ok: true, startISO: start_date, endISO };
}

export async function calcTaskPlannedHoursFromDates({
  start_date,
  end_date,
}) {
  const wd = countWorkdaysInclusive(start_date, end_date);
  return { ok: true, planned_hours: wd * HOURS_PER_DAY };
}
 