// ===== src/tpr/functions/workstream.js (แทนทั้งไฟล์) =====
// Logic for ProjectSub (Workstream phases)
// Tables:
// - tpr_workstreams
// - tpr_project_wbs_phases (phases)  ✅ ใช้ตารางนี้ทำ "เฟสงาน"

// ✅ NOTE:
// - ไฟล์นี้ “ห้าม” export default เพราะฝั่ง UI มัก import แบบ named exports
// - ปรับให้ปลอดภัยขึ้น: normalize status, กัน NaN ใน timeline, map status ภาษาไทย, helper format
// - ไม่ยุ่งกับ UI (มีแต่ logic ล้วน)

import { supabase } from '../../lib/supabaseClient';

const TABLE_WORKSTREAMS = 'tpr_workstreams';
const TABLE_PHASES = 'tpr_project_wbs_phases';

// ให้เหมือน workstreams (ตามที่คุณสั่ง)
export const WORKSTREAM_STATUSES = ['ยังไม่เริ่ม', 'ทำอยู่', 'เสี่ยง', 'ล่าช้า', 'เสร็จแล้ว', 'Planning'];
const STATUS_SET = new Set(WORKSTREAM_STATUSES);

// -------------------- utils --------------------
function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toISODate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function normalizeStatus(v) {
  const s = String(v || '').trim();
  if (!s) return 'Planning';
  if (STATUS_SET.has(s)) return s;

  // รองรับค่า legacy/อังกฤษ (กันข้อมูลเก่า)
  const low = s.toLowerCase();
  if (low === 'planning') return 'Planning';
  if (low === 'done' || low === 'completed' || low === 'complete' || low === 'finished') return 'เสร็จแล้ว';
  if (low === 'delay' || low === 'delayed' || low === 'late') return 'ล่าช้า';
  if (low === 'risk' || low === 'at risk') return 'เสี่ยง';
  if (low === 'doing' || low === 'in progress' || low === 'progress') return 'ทำอยู่';
  if (low === 'pending' || low === 'not started' || low === 'new') return 'ยังไม่เริ่ม';

  // ถ้าไม่รู้จักจริง ๆ ให้เก็บไว้เป็น Planning (เพื่อไม่ให้ chart/summary พัง)
  return 'Planning';
}

// PH-YYYYMMDD-HHMMSS
export function genPhaseCode(now = new Date()) {
  const pad2 = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return `PH-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

// -------------------- queries --------------------
export async function getWorkstreamById(workstreamId) {
  if (!workstreamId) return null;

  const { data, error } = await supabase
    .from(TABLE_WORKSTREAMS)
    .select('*')
    .eq('id', workstreamId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function listPhases({ projectId, workstreamId }) {
  if (!projectId) return [];

  let q = supabase.from(TABLE_PHASES).select('*').eq('project_id', projectId);

  if (workstreamId) q = q.eq('workstream_id', workstreamId);

  // เรียงตามวันเริ่ม/วันจบ/สร้าง
  const { data, error } = await q
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('end_date', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  // normalize status ให้เป็นชุดเดียวกันเสมอ
  return rows.map((r) => ({ ...r, status: normalizeStatus(r?.status) }));
}

export async function createPhase(payload) {
  // payload: { project_id, workstream_id, workstream_code, code, name, planned_hours, fee, owner, start_date, end_date, status, note, metadata }

  const clean = {
    project_id: payload?.project_id,
    workstream_id: payload?.workstream_id || null,
    workstream_code: payload?.workstream_code || null,
    code: String(payload?.code || genPhaseCode()).trim(),
    name: String(payload?.name || '').trim(),
    planned_hours: asNumber(payload?.planned_hours, 0),
    fee: asNumber(payload?.fee, 0),
    owner: payload?.owner ? String(payload.owner).trim() : null, // (คุณบอกไม่ต้องเลือกพนักงาน แต่คอลัมน์มีอยู่ จึงปล่อย optional)
    start_date: toISODate(payload?.start_date),
    end_date: toISODate(payload?.end_date),
    status: normalizeStatus(payload?.status || 'Planning'),
    note: payload?.note ? String(payload.note).trim() : null,
    metadata: payload?.metadata || null,
  };

  if (!clean.project_id) throw new Error('project_id is required');
  if (!clean.code) throw new Error('code is required');
  if (!clean.name) throw new Error('name is required');

  const { data, error } = await supabase.from(TABLE_PHASES).insert(clean).select('*').single();
  if (error) throw error;

  return { ...data, status: normalizeStatus(data?.status) };
}

export async function updatePhase(phaseId, patch) {
  if (!phaseId) throw new Error('phaseId is required');

  const clean = {
    ...(patch?.code !== undefined ? { code: String(patch.code || '').trim() } : {}),
    ...(patch?.name !== undefined ? { name: String(patch.name || '').trim() } : {}),
    ...(patch?.planned_hours !== undefined ? { planned_hours: asNumber(patch.planned_hours, 0) } : {}),
    ...(patch?.fee !== undefined ? { fee: asNumber(patch.fee, 0) } : {}),
    ...(patch?.owner !== undefined ? { owner: patch.owner ? String(patch.owner).trim() : null } : {}),
    ...(patch?.start_date !== undefined ? { start_date: toISODate(patch.start_date) } : {}),
    ...(patch?.end_date !== undefined ? { end_date: toISODate(patch.end_date) } : {}),
    ...(patch?.status !== undefined ? { status: normalizeStatus(patch.status || 'Planning') } : {}),
    ...(patch?.note !== undefined ? { note: patch.note ? String(patch.note).trim() : null } : {}),
    ...(patch?.metadata !== undefined ? { metadata: patch.metadata || null } : {}),
    ...(patch?.workstream_id !== undefined ? { workstream_id: patch.workstream_id || null } : {}),
    ...(patch?.workstream_code !== undefined ? { workstream_code: patch.workstream_code || null } : {}),
  };

  // กัน update ว่าง ๆ แล้วทำให้ supabase บางที error
  if (!Object.keys(clean).length) {
    const cur = await supabase.from(TABLE_PHASES).select('*').eq('id', phaseId).maybeSingle();
    if (cur.error) throw cur.error;
    return cur.data ? { ...cur.data, status: normalizeStatus(cur.data?.status) } : null;
  }

  const { data, error } = await supabase
    .from(TABLE_PHASES)
    .update(clean)
    .eq('id', phaseId)
    .select('*')
    .single();

  if (error) throw error;
  return { ...data, status: normalizeStatus(data?.status) };
}

export async function deletePhase(phaseId) {
  if (!phaseId) throw new Error('phaseId is required');
  const { error } = await supabase.from(TABLE_PHASES).delete().eq('id', phaseId);
  if (error) throw error;
  return true;
}

// -------------------- summary + charts --------------------
export function summarizePhases(phases = []) {
  const list = Array.isArray(phases) ? phases : [];
  const total = list.length;

  const byStatus = WORKSTREAM_STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {});

  let unknown = 0;
  let hoursTotal = 0;
  let feeTotal = 0;

  for (const p of list) {
    const s = normalizeStatus(p?.status || 'Planning');
    if (byStatus[s] === undefined) unknown += 1;
    else byStatus[s] += 1;

    hoursTotal += asNumber(p?.planned_hours, 0);
    feeTotal += asNumber(p?.fee, 0);
  }

  const doneCount = byStatus['เสร็จแล้ว'] || 0;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return {
    total,
    byStatus,
    unknown,
    hoursTotal,
    feeTotal,
    progressPct,
  };
}

export function buildApexSeries(phases = []) {
  const list = Array.isArray(phases) ? phases : [];

  // Timeline (rangeBar) — กัน Invalid date
  const timeline = list
    .filter((p) => p?.start_date && p?.end_date)
    .map((p) => {
      const start = new Date(p.start_date).getTime();
      const end = new Date(p.end_date).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      return {
        x: p.code || p.name || 'Phase',
        y: [start, end],
        meta: { ...p, status: normalizeStatus(p?.status) },
      };
    })
    .filter(Boolean);

  // Hours by Status (bar)
  const hoursByStatus = WORKSTREAM_STATUSES.map((s) => {
    const sum = list.reduce((acc, p) => {
      const st = normalizeStatus(p?.status || 'Planning');
      return st === s ? acc + asNumber(p?.planned_hours, 0) : acc;
    }, 0);
    return sum;
  });

  // Donut counts
  const countsByStatus = WORKSTREAM_STATUSES.map(
    (s) => list.filter((p) => normalizeStatus(p?.status || 'Planning') === s).length
  );

  return {
    timelineSeries: [{ name: 'เฟสงาน', data: timeline }],
    hoursBar: { categories: WORKSTREAM_STATUSES, series: [{ name: 'ชั่วโมง (planned)', data: hoursByStatus }] },
    statusDonut: { labels: WORKSTREAM_STATUSES, series: countsByStatus },
  };
}
