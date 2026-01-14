import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานบัตรประจำตัวประชาชนหมดอายุ';

export const columns = [
  { header: 'เลขที่บัตรประชาชน', dataKey: 'national_id' },
  { header: 'วันที่ออกบัตร', dataKey: 'issue_date' },
  { header: 'วันที่บัตรหมดอายุ', dataKey: 'expiry_date' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'department_name' },
];

// helper left out (not needed currently)
export async function fetchRows(filters = {}) {
  const { groupFrom, groupTo, positionFrom, positionTo, employeeFrom, employeeTo, expiryFrom, expiryTo } = filters;

  // Base query
  let q = supabase
    .from('employees')
    .select('employee_code, title_th, first_name_th, last_name_th, position, department_id, department_name, national_id, national_id_issue_date, national_id_expiry_date')
    .order('national_id_expiry_date', { ascending: true });

  // employee code range
  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);

  // position range (by text)
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  // department filter: if groupFrom/groupTo present, resolve department ids like other reports
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

  // expiry date filter: default to show expired as of today when no range provided
  const today = new Date().toISOString().slice(0, 10);
  if (expiryFrom) q = q.gte('national_id_expiry_date', expiryFrom);
  if (expiryTo) q = q.lte('national_id_expiry_date', expiryTo);
  if (!expiryFrom && !expiryTo) q = q.lte('national_id_expiry_date', today);

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  return (data || []).map((r) => ({
    national_id: r.national_id || '-',
    issue_date: r.national_id_issue_date ? new Date(r.national_id_issue_date).toLocaleDateString('th-TH') : '-',
    expiry_date: r.national_id_expiry_date ? new Date(r.national_id_expiry_date).toLocaleDateString('th-TH') : '-',
    employee_code: r.employee_code || '-',
    full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
    position: r.position || '-',
    department_name: r.department_name || '-',
  }));
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
