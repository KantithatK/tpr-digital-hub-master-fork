import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลใบอนุญาตขับขี่หมดอายุ';

export const columns = [
  { header: 'เลขที่ใบขับขี่', dataKey: 'driver_license_number' },
  { header: 'ประเภทใบขับขี่', dataKey: 'driver_license_type' },
  { header: 'วันที่บัตรหมดอายุ', dataKey: 'expiry_date' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'department_name' },
];

export async function fetchRows(filters = {}) {
  const { groupFrom, groupTo, positionFrom, positionTo, employeeFrom, employeeTo, expiryFrom, expiryTo } = filters;

  let q = supabase
    .from('employees')
    .select('employee_code, title_th, first_name_th, last_name_th, position, department_id, department_name, driver_license_number, driver_license_type, driver_license_expiry')
    .order('driver_license_expiry', { ascending: true });

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

  // expiry filter: default show expired as of today when no range
  const today = new Date().toISOString().slice(0, 10);
  if (expiryFrom) q = q.gte('driver_license_expiry', expiryFrom);
  if (expiryTo) q = q.lte('driver_license_expiry', expiryTo);
  if (!expiryFrom && !expiryTo) q = q.lte('driver_license_expiry', today);

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  return (data || []).map((r) => ({
    driver_license_number: r.driver_license_number || '-',
    driver_license_type: r.driver_license_type || '-',
    expiry_date: r.driver_license_expiry ? new Date(r.driver_license_expiry).toLocaleDateString('th-TH') : '-',
    employee_code: r.employee_code || '-',
    full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
    position: r.position || '-',
    department_name: r.department_name || '-',
  }));
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
