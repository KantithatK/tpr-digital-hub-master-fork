import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลประสบการณ์การทำงานของพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่งงานปัจจุบัน', dataKey: 'current_position' },
  { header: 'ประเภทพนักงาน', dataKey: 'employee_type' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'department_name' },

  { header: 'ชื่อบริษัท', dataKey: 'employer' },
  { header: 'ประเภทธุรกิจ', dataKey: 'business_type' },
  { header: 'ตำแหน่งงาน', dataKey: 'position' },
  { header: 'ลักษณะงานที่ทำ', dataKey: 'responsibilities' },

  { header: 'วันที่เริ่มต้น', dataKey: 'start_date' },
  { header: 'วันที่สิ้นสุด', dataKey: 'end_date' },
  { header: 'เงินเดือนเริ่มต้น', dataKey: 'start_salary' },
  { header: 'เงินเดือนล่าสุด', dataKey: 'last_salary' },
];

export async function fetchRows(filters = {}) {
  const { groupFrom, positionFrom, positionTo, employeeFrom, employeeTo } = filters;

  // Build base employee query
  let q = supabase
    .from('employees')
    .select('employee_code, title_th, first_name_th, last_name_th, position, employee_type, department_name, work_experiences')
    .order('employee_code', { ascending: true })
    .limit(5000);

  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  if (groupFrom) {
    if (typeof groupFrom === 'string' && /^[0-9a-fA-F-]{36}$/.test(groupFrom)) {
      q = q.eq('department_id', groupFrom);
    } else {
      q = q.or(`department_name.ilike.%${groupFrom}%,unit.ilike.%${groupFrom}%`);
    }
  }

  const { data: employees, error } = await q;
  if (error) throw error;

  const rows = [];
  (employees || []).forEach((emp) => {
    const base = {
      employee_code: emp.employee_code || '',
      full_name: `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
      current_position: emp.position || '',
      employee_type: emp.employee_type || '',
      department_name: emp.department_name || '',
    };

    const works = emp.work_experiences && Array.isArray(emp.work_experiences) ? emp.work_experiences : [];
    if (works.length === 0) return; // skip employees without work entries

    works.forEach((w) => {
      rows.push({
        ...base,
        employer: w.employer || '',
        business_type: w.business_type || '',
        position: w.position || '',
        responsibilities: w.responsibilities || '',
        start_date: w.start_date || '',
        end_date: w.end_date || '',
        start_salary: (typeof w.start_salary !== 'undefined' && w.start_salary !== null) ? String(w.start_salary) : '',
        last_salary: (typeof w.last_salary !== 'undefined' && w.last_salary !== null) ? String(w.last_salary) : '',
      });
    });
  });

  return rows;
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
