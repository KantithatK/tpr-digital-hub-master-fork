// ===== src/tpr/functions/MainTask.js (แทนทั้งไฟล์) =====
// Logic layer for "งานหลัก" (tpr_project_wbs_tasks)
// - CRUD
// - code generator
// - date range validation within Phase
// - simple workday calculations (Mon–Fri) with 8h/day

import { supabase } from "../../lib/supabaseClient";

const TABLE_TASKS = "tpr_project_wbs_tasks";
const TABLE_PHASES = "tpr_project_wbs_phases";

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

export function genTaskCode(prefix = "TS") {
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

export function validateTaskRangeWithinPhase({
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

export async function listTasks({
  projectId,
  phaseId,
  workstreamId,
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

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createTask(payload, supabaseClient = supabase) {
  const { data, error } = await supabaseClient.from(TABLE_TASKS).insert([payload]).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, payload, supabaseClient = supabase) {
  if (!id) throw new Error("Missing task id");
  const { data, error } = await supabaseClient
    .from(TABLE_TASKS)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id, supabaseClient = supabase) {
  if (!id) throw new Error("Missing task id");
  const { error } = await supabaseClient.from(TABLE_TASKS).delete().eq("id", id);
  if (error) throw error;
  return true;
}

// ===== Workday calculations (UI helper) =====

export async function calcTaskEndDateFromPlannedHours({
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

export async function calcTaskPlannedHoursFromDates({ start_date, end_date }) {
  const start = String(start_date || "").trim();
  const end = String(end_date || "").trim();
  if (!start || !end) return { ok: false, planned_hours: 0 };

  const wd = countWorkdaysInclusive(start, end);
  return { ok: true, planned_hours: wd * HOURS_PER_DAY };
}
