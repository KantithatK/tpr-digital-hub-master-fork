import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลเงินเดือนและรายได้–รายหักประจำ';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
  { header: 'เงินเดือน', dataKey: 'salary' },
];

export async function fetchRows(filters = {}) {
  const { groupFrom, groupTo, positionFrom, positionTo, employeeFrom, employeeTo } = filters;

  let q = supabase
    .from('employees')
    .select('employee_code, title_th, first_name_th, last_name_th, position, department_id, department_name, salary_rate')
    .order('employee_code', { ascending: true });

  // employee code range
  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);

  // position range
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  // department range resolution
  if (groupFrom || groupTo) {
    try {
      let dq = supabase.from('department').select('id,dept_id');
      if (groupFrom && groupTo) dq = dq.gte('dept_id', groupFrom).lte('dept_id', groupTo).order('dept_id', { ascending: true }).limit(1000);
      else if (groupFrom) dq = dq.or(`dept_id.eq.${groupFrom},id.eq.${groupFrom}`);
      else if (groupTo) dq = dq.or(`dept_id.eq.${groupTo},id.eq.${groupTo}`);
      const { data: drows, error: derr } = await dq;
      if (!derr && drows && drows.length) {
        const ids = drows.map((d) => d.id).filter(Boolean);
        if (ids.length) q = q.in('department_id', ids);
      }
    } catch (e) {
      // department lookup failed
    }
  }

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  return (data || []).map((r) => ({
    employee_code: r.employee_code || '-',
    full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
    position: r.position || '-',
    department_name: r.department_name || '-',
    salary: r.salary_rate != null ? Number(r.salary_rate).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '-',
  }));
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
