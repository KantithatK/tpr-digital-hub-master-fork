import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานรายชื่อพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
];

function looksLikeUuid(v) {
  return typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v);
}

export async function fetchRows(filters = {}) {
  const { groupFrom, positionFrom, positionTo, employeeFrom, employeeTo } = filters;

  let q = supabase.from('employees').select('employee_code, title_th, first_name_th, last_name_th, position, department_name').order('employee_code', { ascending: true });

  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);

  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  if (groupFrom) {
    if (looksLikeUuid(groupFrom)) {
      q = q.eq('department_id', groupFrom);
    } else {
      // try matching by department_name or unit (denormalized fields)
      q = q.or(`department_name.ilike.%${groupFrom}%,unit.ilike.%${groupFrom}%`);
    }
  }

  // Note: groupTo is not used for department ranges because department filtering typically selects a single dept.

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  return (data || []).map((r) => ({
    employee_code: r.employee_code || '',
    full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
    department_name: r.department_name || '',
    position: r.position || '',
  }));
}

export const pdfProps = { orientation: 'p', unit: 'mm', format: 'a4' };
