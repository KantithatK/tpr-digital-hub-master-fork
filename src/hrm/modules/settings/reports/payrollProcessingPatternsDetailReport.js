import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานรายละเอียดรูปแบบประมวลผล';

// Keep A4 landscape because patterns can be wide
export const pdfProps = { orientation: 'landscape', unit: 'mm', format: 'a4' };

export const columns = [
  { header: 'รหัสรูปแบบ', dataKey: 'code' },
  { header: 'ชื่อรูปแบบ', dataKey: 'name' },
  { header: 'ชื่อค่าแรงรายวัน', dataKey: 'daily_wage_desc' },
  { header: 'ชื่อค่าแรงรายชั่วโมง', dataKey: 'hourly_wage_desc' },
  { header: 'คำนวณเป็นวันเดียว', dataKey: 'calculate_one_day' },
  { header: 'จ่ายค่าแรงวันหยุด', dataKey: 'holiday_pay_enabled' },
  { header: 'ไม่เกิน (วัน)', dataKey: 'holiday_max_days' },
  { header: 'ชื่อรายได้พนักงานรายวัน (วันหยุด)', dataKey: 'holiday_daily_wage_desc' },
  { header: 'ชื่อรายได้พนักงานชั่วโมง (วันหยุด)', dataKey: 'holiday_hourly_wage_desc' },
  { header: 'จ่ายเป็นรายวัน (วันหยุด)', dataKey: 'holiday_pay_daily' },
  { header: 'จ่ายเป็นรายชั่วโมง (วันหยุด)', dataKey: 'holiday_pay_hourly' },
  { header: 'จ่ายเมื่อเกิดวันเกิด (วันหยุด)', dataKey: 'holiday_pay_birth_same_day' },
  { header: 'รวม OT กับวันหยุด', dataKey: 'holiday_pay_overtime_same_day' },
  { header: 'สร้างเมื่อ', dataKey: 'created_at' },
  { header: 'ปรับปรุงเมื่อ', dataKey: 'updated_at' },
];

export async function fetchRows(filters = {}) {
  const start = filters.startGroupId || filters.startPatternCode;
  const end = filters.endGroupId || filters.endPatternCode;

  let query = supabase
    .from('payroll_processing_patterns')
    .select(
      'code, name, daily_wage_code, daily_wage_desc, hourly_wage_code, hourly_wage_desc, calculate_one_day, holiday_pay_enabled, holiday_max_days, holiday_emp_daily_enabled, holiday_daily_wage_code, holiday_daily_wage_desc, holiday_emp_hourly_enabled, holiday_hourly_wage_code, holiday_hourly_wage_desc, holiday_pay_daily, holiday_pay_hourly, holiday_pay_birth_same_day, holiday_pay_overtime_same_day, created_at, updated_at'
    )
    .order('code', { ascending: true });

  if (start) query = query.gte('code', start);
  if (end) query = query.lte('code', end);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    code: r.code,
    name: r.name || '-',
    daily_wage_desc: r.daily_wage_desc || '-',
    hourly_wage_desc: r.hourly_wage_desc || '-',
    calculate_one_day: r.calculate_one_day ? 'ใช่' : 'ไม่',
    holiday_pay_enabled: r.holiday_pay_enabled ? 'ใช่' : 'ไม่',
    holiday_max_days: r.holiday_max_days ?? '-',
    holiday_daily_wage_desc: r.holiday_daily_wage_desc || '-',
    holiday_hourly_wage_desc: r.holiday_hourly_wage_desc || '-',
    holiday_pay_daily: r.holiday_pay_daily ? 'ใช่' : 'ไม่',
    holiday_pay_hourly: r.holiday_pay_hourly ? 'ใช่' : 'ไม่',
    holiday_pay_birth_same_day: r.holiday_pay_birth_same_day ? 'ใช่' : 'ไม่',
    holiday_pay_overtime_same_day: r.holiday_pay_overtime_same_day ? 'ใช่' : 'ไม่',
    created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '-',
    updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '-',
  }));
}
