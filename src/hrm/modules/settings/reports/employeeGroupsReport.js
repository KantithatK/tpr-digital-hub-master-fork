import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลกลุ่มพนักงาน';

export const columns = [
  { header: 'รหัสกลุ่มพนักงาน', dataKey: 'emp_group_id' },
  { header: 'ชื่อกลุ่มพนักงาน (ไทย)', dataKey: 'emp_group_name_th' },
  { header: 'ชื่อกลุ่มพนักงาน (อังกฤษ)', dataKey: 'emp_group_name_en' },
  { header: 'หมายเหตุ', dataKey: 'remark' },
  { header: 'สถานะ', dataKey: 'is_active' },
];

export async function fetchRows(filters = {}) {
  // support both startEmpGroupId/endEmpGroupId and startGroupId/endGroupId for flexibility
  const start = filters.startEmpGroupId || filters.startGroupId;
  const end = filters.endEmpGroupId || filters.endGroupId;

  let query = supabase
    .from('employee_group')
    .select('emp_group_id, emp_group_name_th, emp_group_name_en, remark, is_active')
    .order('emp_group_id', { ascending: true });

  if (start) query = query.gte('emp_group_id', start);
  if (end) query = query.lte('emp_group_id', end);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    emp_group_id: r.emp_group_id,
    emp_group_name_th: r.emp_group_name_th || '-',
    emp_group_name_en: r.emp_group_name_en || '-',
    remark: r.remark || '-',
    is_active: r.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
  }));
}
