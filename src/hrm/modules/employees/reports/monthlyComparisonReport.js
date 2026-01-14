import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานเปรียบเทียบจำนวนพนักงานตามเดือน (สรุป)';

// months headers (Thai short months)
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const columns = [
  { header: 'กลุ่ม', dataKey: 'group' },
  ...MONTHS.map((m, i) => ({ header: m, dataKey: `m${i + 1}` })),
  { header: 'รวม', dataKey: 'total' },
];

function toMonthIndex(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.getMonth() + 1; // 1..12
}

function makeEmptyRow(label) {
  const base = { group: label };
  for (let i = 1; i <= 12; i++) {
    base[`m${i}`] = 0;
  }
  base.total = 0;
  return base;
}

export async function fetchRows(filters = {}) {
  // filters: yearFrom, yearTo (number/string), groupFrom (department/unit text)
  const yearFrom = Number(filters.yearFrom) || new Date().getFullYear();
  const yearTo = Number(filters.yearTo) || yearFrom;
  const groupFrom = filters.groupFrom;

  // date range for the year range
  const from = `${yearFrom}-01-01`;
  const to = `${yearTo}-12-31`;

  try {
    // fetch hires: employees.start_date within year
    // Note: employees table does not have `unit` column; use department_name instead
    let empQ = supabase.from('employees').select('employee_code, start_date, department_name').gte('start_date', from).lte('start_date', to).limit(20000);
    if (groupFrom) {
      // simple text filter on department_name
      empQ = empQ.ilike('department_name', `%${groupFrom}%`);
    }
    const { data: hires = [], error: hireError } = await empQ;
    if (hireError) throw hireError;

    // fetch terminations: employee_terminations.effective_date within year
    let termQ = supabase.from('employee_terminations').select('id, employee_code, effective_date, unit').gte('effective_date', from).lte('effective_date', to).limit(20000);
    if (groupFrom) {
      termQ = termQ.or(`unit.ilike.%${groupFrom}%`);
    }
    const { data: terms = [], error: termError } = await termQ;
    if (termError) throw termError;

    // aggregate by month
    const hiresRow = makeEmptyRow('พนักงานใหม่');
    const termRow = makeEmptyRow('พนักงานพ้นสภาพ');

    for (const h of (hires || [])) {
      const mi = toMonthIndex(h.start_date);
      if (!mi) continue;
      hiresRow[`m${mi}`] = (hiresRow[`m${mi}`] || 0) + 1;
      hiresRow.total = (hiresRow.total || 0) + 1;
    }

    for (const t of (terms || [])) {
      const mi = toMonthIndex(t.effective_date);
      if (!mi) continue;
      termRow[`m${mi}`] = (termRow[`m${mi}`] || 0) + 1;
      termRow.total = (termRow.total || 0) + 1;
    }

    // Optionally compute net change per month row
    const netRow = makeEmptyRow('สุทธิ (ใหม่ - พ้นสภาพ)');
    for (let i = 1; i <= 12; i++) {
      const val = (hiresRow[`m${i}`] || 0) - (termRow[`m${i}`] || 0);
      netRow[`m${i}`] = val;
      netRow.total += val;
    }

    return [hiresRow, termRow, netRow];
  } catch (err) {
    console.error('monthlyComparisonReport error:', err);
    throw err;
  }
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
