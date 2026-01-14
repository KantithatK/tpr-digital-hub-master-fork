import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานสรุปจำนวนวันทำงานของพนักงานตามปฏิทิน';
export const pdfProps = { orientation: 'p', unit: 'mm', format: 'a4' };

export const columns = [
  { header: 'ปี', dataKey: 'year' },
  { header: 'เดือน', dataKey: 'month' },
  { header: 'วันทำงาน (วัน)', dataKey: 'work_days' },
  { header: 'วันหยุด (วัน)', dataKey: 'holiday_days' },
  { header: 'วันหยุดประจำปี (วัน)', dataKey: 'annual_days' },
];

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export async function fetchRows(filters = {}) {
  const start = filters.startGroupId;
  const end = filters.endGroupId;

  try {
    let calQuery = supabase.from('company_calendars').select('id,code,name').order('code', { ascending: true });
    if (start && end) {
      calQuery = calQuery.gte('code', start).lte('code', end);
    } else if (start) {
      calQuery = calQuery.eq('code', start);
    }
    const { data: calendars, error: calErr } = await calQuery;
    if (calErr) throw calErr;
    if (!calendars || calendars.length === 0) return [];

    const calendarIds = calendars.map((c) => c.id);

    const { data: assignments, error: rowsErr } = await supabase
      .from('calendar_assignments')
      .select('assigned_date, day_type')
      .in('calendar_id', calendarIds);

    if (rowsErr) throw rowsErr;

    const map = {};
    (assignments || []).forEach((r) => {
      const dStr = (typeof r.assigned_date === 'string') ? r.assigned_date : (new Date(r.assigned_date)).toISOString().slice(0,10);
      const [y, m] = dStr.split('-');
      const year = Number(y);
      const monthIndex = Number(m) - 1;
      const key = `${year}-${monthIndex}`;
      if (!map[key]) map[key] = { holiday: 0, annual: 0 };
      if (r.day_type === 'holiday') map[key].holiday += 1;
      else if (r.day_type === 'annual') map[key].annual += 1;
    });

    const keys = Object.keys(map).sort((a,b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      if (ay !== by) return ay - by;
      return am - bm;
    });

    const rows = keys.map((k) => {
      const [y, m] = k.split('-').map(Number);
      const counts = map[k] || { holiday: 0, annual: 0 };
      const dim = daysInMonth(y, m);
      const work = Math.max(0, dim - counts.holiday - counts.annual);
      return {
        year: y,
        month: THAI_MONTHS[m] || '',
        work_days: work,
        holiday_days: counts.holiday,
        annual_days: counts.annual,
      };
    });

    return rows;
  } catch (err) {
    console.error('Failed to load working days summary', err);
    return [];
  }
}
