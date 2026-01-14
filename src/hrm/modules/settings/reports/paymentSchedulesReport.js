import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานรายละเอียดรูปแบบงวดการจ่าย';

// wide table -> landscape A4
export const pdfProps = { orientation: 'landscape', unit: 'mm', format: 'a4' };

export const columns = [
  { header: 'งวดที่', dataKey: 'month_index' },
  { header: 'เดือน', dataKey: 'month_name' },
  { header: 'วันที่จ่าย', dataKey: 'payment_date' },
  { header: 'เริ่มต้น-สิ้นสุดงวด', dataKey: 'period_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิดรายได้กะงาน', dataKey: 'work_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิด OT', dataKey: 'ot_range' },
  { header: 'เริ่มต้น-สิ้นสุดสวัสดิการ', dataKey: 'welfare_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิดขาด', dataKey: 'absent_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิดลา', dataKey: 'leave_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิดมาสาย', dataKey: 'late_range' },
  { header: 'เริ่มต้น-สิ้นสุดคิดวงเวลาผิด', dataKey: 'wrong_range' },
];

function fmtDate(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('th-TH');
  } catch {
    return String(d);
  }
}

function rangeLabel(start, end) {
  if (!start && !end) return '-';
  if (!start) return `${fmtDate(end)}`;
  if (!end) return `${fmtDate(start)}`;
  return `${fmtDate(start)} - ${fmtDate(end)}`;
}

export async function fetchRows(filters = {}) {
  // filters.startGroupId / endGroupId expected to be template ids (uuid) from selector
  const startId = filters.startGroupId;
  const endId = filters.endGroupId;

  // determine which template ids to include
  let templateIds = [];
  if (startId) {
    // if only start provided, use it as single template
    templateIds.push(startId);
    // if end is also provided and different, include both
    if (endId && endId !== startId) templateIds.push(endId);
  } else {
    // no filter: include all templates
    const { data: tpls, error: tplErr } = await supabase.from('payroll_payment_schedule_templates').select('id');
    if (tplErr) throw tplErr;
    templateIds = (tpls || []).map((t) => t.id);
  }

  if (!templateIds || templateIds.length === 0) return [];

  // fetch schedules for selected templates
  const { data, error } = await supabase
    .from('payroll_payment_schedules')
    .select('*')
    .in('template_id', templateIds)
    .order('template_id', { ascending: true })
    .order('month_index', { ascending: true });

  if (error) throw error;

  return (data || []).map((r) => ({
    month_index: r.month_index ?? '-',
    month_name: r.month_name || '-',
    payment_date: r.payment_date ? fmtDate(r.payment_date) : '-',
    period_range: rangeLabel(r.period_start, r.period_end),
    work_range: rangeLabel(r.work_start, r.work_end),
    ot_range: rangeLabel(r.ot_start, r.ot_end),
    welfare_range: rangeLabel(r.welfare_start, r.welfare_end),
    absent_range: rangeLabel(r.absent_start, r.absent_end),
    leave_range: rangeLabel(r.leave_start, r.leave_end),
    late_range: rangeLabel(r.late_start, r.late_end),
    wrong_range: rangeLabel(r.wrong_start, r.wrong_end),
  }));
}
