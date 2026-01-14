import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานเปรียบเทียบจำนวนพนักงานตามเดือน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'employee_name' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
  { header: 'จำนวนพนักงาน', dataKey: 'count' },
  { header: 'หมายเหตุ', dataKey: 'remark' },
];

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('th-TH'); } catch { return String(d); }
}

function monthRange(year, month) {
  // month: 1..12
  const m = Number(month);
  const y = Number(year);
  if (!y || !m) return null;
  const to = new Date(y, m, 0); // last day of month
  return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: `${y}-${String(m).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}` };
}

export async function fetchRows(filters = {}) {
  // Expects filters.year (number/string) and filters.month (1-12)
  const year = Number(filters.year) || new Date().getFullYear();
  const month = Number(filters.month) || (new Date().getMonth() + 1);
  const groupFrom = filters.groupFrom;

  const range = monthRange(year, month);
  if (!range) return [];

  try {
    // hires within month
    let empQ = supabase
      .from('employees')
      .select('employee_code, title_th, first_name_th, last_name_th, start_date, department_name, position')
      .gte('start_date', range.from)
      .lte('start_date', range.to)
      .limit(20000);
    if (groupFrom) empQ = empQ.ilike('department_name', `%${groupFrom}%`);
    const { data: hires = [], error: hireErr } = await empQ;
    if (hireErr) throw hireErr;

    // terminations within month
    let termQ = supabase
      .from('employee_terminations')
      .select('doc_no, employee_code, employee_full_name, employee_first_name, employee_last_name, effective_date, unit, position, reason')
      .gte('effective_date', range.from)
      .lte('effective_date', range.to)
      .limit(20000);
    if (groupFrom) termQ = termQ.or(`unit.ilike.%${groupFrom}%`);
    const { data: terms = [], error: termErr } = await termQ;
    if (termErr) throw termErr;

    const rows = [];

    // Header row outside the table would be in the PDF title; within table we add a section label row
    rows.push({ employee_code: `พนักงานใหม่`, employee_name: ``, department_name: '', count: '', remark: '' });

    for (const h of (hires || [])) {
      const full = `${h.title_th ? h.title_th + ' ' : ''}${h.first_name_th || ''} ${h.last_name_th || ''}`.trim();
      rows.push({
        employee_code: h.employee_code || '',
        employee_name: full || '',
        department_name: h.department_name || '',
        count: 1,
        remark: h.start_date ? `เริ่มงาน ${formatDate(h.start_date)}` : '',
      });
    }

    rows.push({ employee_code: `พนักงานพ้นสภาพ`, employee_name: ``, department_name: '', count: '', remark: '' });

    for (const t of (terms || [])) {
      const full = t.employee_full_name || `${t.employee_first_name || ''} ${t.employee_last_name || ''}`.trim();
      rows.push({
        employee_code: t.employee_code || '',
        employee_name: full || '',
        department_name: t.unit || '',
        count: -1,
        remark: t.effective_date ? `พ้นสภาพ ${formatDate(t.effective_date)}` : (t.reason || ''),
      });
    }

    // summary row
    // const total = (hires || []).length - (terms || []).length;
    // rows.unshift({ employee_code: '', employee_name: `พนักงานทั้งหมด  เดือน  ${new Date(year, month - 1).toLocaleString('th-TH', { month: 'long' })}  ปี  ${year}`, department_name: '', count: total, remark: '' });

    return rows;
  } catch (err) {
    console.error('monthlyDetailReport error:', err);
    throw err;
  }
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
