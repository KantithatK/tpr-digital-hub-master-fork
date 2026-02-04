// ===== src/tpr/functions/SubTask.js (แทนทั้งไฟล์) =====
// Logic layer for "งานย่อย" (tpr_project_wbs_sub_tasks)
// - CRUD
// - code generator
// - date range validation within Phase
// - simple workday calculations (Mon–Fri) with 8h/day
// - audit fields: created_by / updated_by

import { supabase } from "../../lib/supabaseClient";

const TABLE_SUBTASKS = "tpr_project_wbs_sub_tasks";
const TABLE_PHASES = "tpr_project_wbs_phases";
const TABLE_PROJECT_MEMBERS = "tpr_project_members";

const HOURS_PER_DAY = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODateOnly(d) {
  if (!d) return "";
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return "";
  const y = dd.getFullYear();
  const m = pad2(dd.getMonth() + 1);
  const day = pad2(dd.getDate());
  return `${y}-${m}-${day}`;
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
  // startISO: YYYY-MM-DD, workdaysToAdd: integer >= 1
  // returns endISO (inclusive) counting start day as day 1 (if not weekend)
  const startMs = parseISODateOnlyToMs(startISO);
  if (!Number.isFinite(startMs)) return "";

  let d = new Date(startMs);
  d.setHours(0, 0, 0, 0);

  // If start is weekend, move to next Monday as the first day
  while (isWeekend(d)) d = new Date(d.getTime() + MS_PER_DAY);

  let counted = 1;
  while (counted < Math.max(1, workdaysToAdd)) {
    d = new Date(d.getTime() + MS_PER_DAY);
    if (isWeekend(d)) continue;
    counted += 1;
  }
  return toISODateOnly(d);
}

function countWorkdaysInclusive(startISO, endISO) {
  const a = parseISODateOnlyToMs(startISO);
  const b = parseISODateOnlyToMs(endISO);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;

  let startMs = a;
  let endMs = b;
  if (endMs < startMs) [startMs, endMs] = [endMs, startMs];

  let c = 0;
  for (let t = startMs; t <= endMs; t += MS_PER_DAY) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    if (!isWeekend(d)) c += 1;
  }
  return c;
}

// ===== Public APIs =====

export function genSubTaskCode(prefix = "SUB") {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${prefix}-${y}${m}${day}-${hh}${mm}${ss}`;
}

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

export function validateSubTaskRangeWithinPhase({
  start_date,
  end_date,
  phase_start,
  phase_end,
}) {
  const start = String(start_date || "").trim();
  const end = String(end_date || "").trim();
  const pStart = String(phase_start || "").trim();
  const pEnd = String(phase_end || "").trim();

  if (!start || !end) {
    return { ok: false, errorKey: "REQUIRED", messageTh: "กรุณาเลือกวันที่เริ่มและวันที่สิ้นสุด" };
  }

  const sMs = parseISODateOnlyToMs(start);
  const eMs = parseISODateOnlyToMs(end);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) {
    return { ok: false, errorKey: "INVALID_DATE", messageTh: "รูปแบบวันที่ไม่ถูกต้อง" };
  }
  if (eMs < sMs) {
    return { ok: false, errorKey: "END_BEFORE_START", messageTh: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" };
  }

  // If phase bounds exist, enforce within
  const psMs = parseISODateOnlyToMs(pStart);
  const peMs = parseISODateOnlyToMs(pEnd);

  if (Number.isFinite(psMs) && sMs < psMs) {
    return { ok: false, errorKey: "START_BEFORE_PHASE", messageTh: "วันที่เริ่มต้องไม่ก่อนช่วงของเฟส" };
  }
  if (Number.isFinite(peMs) && eMs > peMs) {
    return { ok: false, errorKey: "END_AFTER_PHASE", messageTh: "วันที่สิ้นสุดต้องไม่เกินช่วงของเฟส" };
  }

  return { ok: true };
}

export async function listSubTasks({
  projectId,
  phaseId,
  taskId,
  ownerId,
  supabaseClient = supabase,
}) {
  if (!projectId) return [];

  let q = supabaseClient
    .from(TABLE_SUBTASKS)
    .select("*")
    .eq("project_id", projectId)
    .order("id", { ascending: true });

  if (phaseId != null) q = q.eq("phase_id", phaseId);
  if (taskId != null) q = q.eq("task_id", taskId);
  if (ownerId) q = q.eq("owner", ownerId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createSubTask(payload, supabaseClient = supabase) {
  const { data, error } = await supabaseClient
    .from(TABLE_SUBTASKS)
    .insert([payload])
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubTask(id, payload, supabaseClient = supabase) {
  if (!id) throw new Error("Missing sub task id");
  const { data, error } = await supabaseClient
    .from(TABLE_SUBTASKS)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubTask(id, supabaseClient = supabase) {
  if (!id) throw new Error("Missing sub task id");
  const { error } = await supabaseClient.from(TABLE_SUBTASKS).delete().eq("id", id);
  if (error) throw error;
  return true;
}

// ===== Workday calculations (UI helper) =====

export async function calcSubTaskEndDateFromPlannedHours({
  start_date,
  planned_hours,
  boundary_start, // optional: phase_start
  boundary_end,   // optional: phase_end
}) {
  const start = String(start_date || "").trim();
  const hours = Number(planned_hours || 0);

  if (!start || !Number.isFinite(hours) || hours <= 0) {
    return { ok: false, messageTh: "กรุณาระบุวันที่เริ่ม และชั่วโมงวางแผนให้ถูกต้อง" };
  }

  const sMs = parseISODateOnlyToMs(start);
  if (!Number.isFinite(sMs)) {
    return { ok: false, messageTh: "รูปแบบวันที่เริ่มไม่ถูกต้อง" };
  }

  const days = Math.max(1, Math.ceil(hours / HOURS_PER_DAY));
  let endISO = addWorkdays(start, days);

  // clamp within boundary if provided
  const bStart = String(boundary_start || "").trim();
  const bEnd = String(boundary_end || "").trim();

  if (bStart) {
    const bsMs = parseISODateOnlyToMs(bStart);
    if (Number.isFinite(bsMs) && sMs < bsMs) {
      return { ok: false, errorKey: "START_BEFORE_BOUNDARY", messageTh: "วันที่เริ่มต้องไม่ก่อนช่วงที่กำหนด" };
    }
  }
  if (bEnd) {
    const beMs = parseISODateOnlyToMs(bEnd);
    const eMs = parseISODateOnlyToMs(endISO);
    if (Number.isFinite(beMs) && Number.isFinite(eMs) && eMs > beMs) {
      return { ok: false, errorKey: "END_AFTER_BOUNDARY", messageTh: "ชั่วโมงที่ใส่ทำให้วันสิ้นสุดเกินช่วงที่กำหนด" };
    }
  }

  return { ok: true, startISO: start, endISO };
}

export async function calcSubTaskPlannedHoursFromDates({ start_date, end_date }) {
  const start = String(start_date || "").trim();
  const end = String(end_date || "").trim();
  if (!start || !end) return { ok: false, planned_hours: 0 };

  const wd = countWorkdaysInclusive(start, end);
  return { ok: true, planned_hours: wd * HOURS_PER_DAY };
}

// ===== Project Members (Owner Picker Source) =====
// ใช้สำหรับ UI เลือก “ผู้รับผิดชอบ” โดยจำกัดเฉพาะสมาชิกในโปรเจค
export async function listProjectMembers({ projectId, supabaseClient = supabase } = {}) {
  if (!projectId) return [];
  try {
    // 1) member employee_ids
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

    // 2) load employees (chunked)
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < uniqIds.length; i += chunkSize) {
      chunks.push(uniqIds.slice(i, i + chunkSize));
    }

    const allEmployees = [];
    for (const ids of chunks) {
      const { data: emps, error: empErr } = await supabaseClient
        .from("employees")
        .select("*")
        .in("id", ids);
      if (empErr) throw empErr;
      if (Array.isArray(emps) && emps.length) allEmployees.push(...emps);
    }

    const list = Array.isArray(allEmployees) ? allEmployees : [];
    list.sort((a, b) => String(a?.employee_code || "").localeCompare(String(b?.employee_code || ""), "th"));
    return list;
  } catch (e) {
    console.error("[SubTask.listProjectMembers]", e?.message || e);
    return [];
  }
}

// ===== Audit helpers (optional) =====
// ถ้าคุณต้องการให้ UI ส่ง userId เข้ามา จะได้เติม audit ให้สม่ำเสมอ
export function withCreateAudit(payload, userId) {
  const uid = String(userId || "").trim() || null;
  if (!uid) return payload;
  return { ...payload, created_by: uid, updated_by: uid };
}

export function withUpdateAudit(payload, userId) {
  const uid = String(userId || "").trim() || null;
  if (!uid) return payload;
  return { ...payload, updated_by: uid };
}

// ===== Employee helpers (moved from UI)
export async function listEmployees(supabaseClient = supabase) {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .order("employee_code", { ascending: true })
      .limit(2000);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[SubTask.listEmployees]", e?.message || e);
    return [];
  }
}

export function formatEmployee(emp) {
  if (!emp) return "";
  const thParts = [String(emp.first_name_th || "").trim(), String(emp.last_name_th || "").trim()].filter(Boolean);
  if (thParts.length) return thParts.join(" ");
  const enParts = [String(emp.title_en || "").trim(), String(emp.first_name_en || "").trim(), String(emp.last_name_en || "").trim()].filter(Boolean);
  if (enParts.length) return enParts.join(" ");
  const nick = String(emp.nickname_th || emp.nickname_en || "").trim();
  if (nick) return nick;
  return String(emp.employee_code || emp.employee_id || emp.id || "");
}
