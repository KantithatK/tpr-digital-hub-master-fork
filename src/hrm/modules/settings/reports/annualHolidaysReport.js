import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานวันหยุดประจำปี';

export const pdfProps = { orientation: 'p', unit: 'mm', format: 'a4' };

export const columns = [
  { header: 'วันที่', dataKey: 'assigned_date' },
//   { header: 'วัน', dataKey: 'day_name' },
//   { header: 'วันที่', dataKey: 'day' },
//   { header: 'เดือน', dataKey: 'month' },
//   { header: 'ปี', dataKey: 'year' },
  { header: 'หัวข้อ', dataKey: 'title' },
  { header: 'รายละเอียด', dataKey: 'description' },
//   { header: 'ปฏิทิน', dataKey: 'calendar_name' },
];

const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function formatThaiDate(dStr) {
  // dStr is ISO date (YYYY-MM-DD) from Postgres
  const d = new Date(dStr + 'T00:00:00');
  const dayName = THAI_WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  const full = `วัน${dayName} ${day} ${month} ${yearBE}`;
  return { full, dayName: `วัน${dayName}`, day, month, year: yearBE };
}

export async function fetchRows(filters = {}) {
  // filters.startGroupId / endGroupId will be treated as calendar.code
  const start = filters.startGroupId;
  const end = filters.endGroupId;
  const dayType = filters.dayType; // 'holiday' | 'annual' | 'both' | undefined

  // Fetch calendars according to filters
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

    // Build query and apply optional day_type filter
    let rowsQuery = supabase
      .from('calendar_assignments')
      .select('id,assigned_date,day_type,title,description,calendar_id')
      .in('calendar_id', calendarIds);

    if (dayType) {
      if (dayType === 'both') {
        rowsQuery = rowsQuery.in('day_type', ['holiday', 'annual']);
      } else {
        rowsQuery = rowsQuery.eq('day_type', dayType);
      }
    }

    const { data: rows, error: rowsErr } = await rowsQuery.order('assigned_date', { ascending: true });

    if (rowsErr) throw rowsErr;

    return (rows || []).map((r) => {
      const fmt = formatThaiDate(r.assigned_date);
      const cal = calendars.find((c) => c.id === r.calendar_id) || {};
      return {
        assigned_date: fmt.full,
        day_name: fmt.dayName,
        day: fmt.day,
        month: fmt.month,
        year: fmt.year,
        title: r.title || '-',
        description: r.description || '-',
        calendar_name: `${cal.code || ''} ${cal.name || ''}`.trim(),
      };
    });
  } catch (err) {
    console.error('Failed to load annual holidays report rows', err);
    return [];
  }
}
