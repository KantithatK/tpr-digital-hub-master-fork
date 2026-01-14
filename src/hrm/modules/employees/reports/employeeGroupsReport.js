import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลพนักงานสำหรับกลุ่มผู้ใช้';

// We'll output a grouped report: for each employee group we emit a header row
// (showing group code + name) followed by the member employees.
export const columns = [
  { header: 'รหัสกลุ่มผู้ใช้', dataKey: 'emp_group_id' },
  { header: 'ชื่อกลุ่มผู้ใช้', dataKey: 'emp_group_name' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ประเภทพนักงาน', dataKey: 'employee_type' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
];

export async function fetchRows(filters = {}) {
  // Accept several possible filter names for group range for backwards compatibility
  const start = filters.groupFrom || filters.startEmpGroupId || filters.startGroupId || undefined;
  const end = filters.groupTo || filters.endEmpGroupId || filters.endGroupId || undefined;

  // Load user groups in range (use `user_group` table as requested)
  let gq = supabase.from('user_group').select('id, group_id, group_name_th').order('group_id', { ascending: true });
  if (start) gq = gq.gte('group_id', start);
  if (end) gq = gq.lte('group_id', end);
  const { data: groups, error: gErr } = await gq;
  if (gErr) throw gErr;

  const out = [];

  // For each group, fetch its employees and append a header row + member rows
  for (const g of (groups || [])) {
    // Header row for the group (use user_group fields)
    out.push({
      emp_group_id: g.group_id || '',
      emp_group_name: g.group_name_th || '',
      employee_code: '',
      full_name: '',
      position: '',
      employee_type: '',
      department_name: '',
    });

    // Fetch employees that belong to this user group via employee_user_groups
    const { data: mapping, error: mErr } = await supabase
      .from('employee_user_groups')
      .select('employee_id')
      .eq('user_group_id', g.id)
      .order('created_at', { ascending: true })
      .limit(5000);

    if (mErr) {
      console.error('Failed loading employee_user_groups for group', g.group_id, mErr);
      continue;
    }

    const empIds = (mapping || []).map((m) => m.employee_id).filter(Boolean);
    let emps = [];
    if (empIds.length) {
      const { data: empRows, error: eErr } = await supabase
        .from('employees')
        .select('id, employee_code, title_th, first_name_th, last_name_th, position, employee_type, department_name')
        .in('id', empIds)
        .order('employee_code', { ascending: true })
        .limit(5000);

      if (eErr) {
        console.error('Failed loading employees for group', g.group_id, eErr);
      } else {
        emps = empRows || [];
      }
    }

    // If employee fetch failed, we already logged it above; continue to next group

    (emps || []).forEach((r) => {
      out.push({
        emp_group_id: '',
        emp_group_name: '',
        employee_code: r.employee_code || '',
        full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
        position: r.position || '',
        employee_type: r.employee_type || '',
        department_name: r.department_name || '',
      });
    });
  }

  return out;
}
