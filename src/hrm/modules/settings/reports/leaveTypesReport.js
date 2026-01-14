import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลประเภทการลา';

export const columns = [
  { header: 'รหัสประเภทการลา', dataKey: 'leave_id' },
  { header: 'ชื่อประเภทการลา (ไทย)', dataKey: 'leave_name_th' },
  { header: 'ชื่อประเภทการลา (อังกฤษ)', dataKey: 'leave_name_en' },
  { header: 'กลุ่มประเภทการลา', dataKey: 'leave_group' },
  { header: 'จำนวนวันที่อนุญาต', dataKey: 'allowed_days' },
  { header: 'รายละเอียด', dataKey: 'description' },
//   { header: 'สถานะ', dataKey: 'is_active' },
];

export async function fetchRows(filters = {}) {
  const start = filters.startGroupId || filters.startLeaveId;
  const end = filters.endGroupId || filters.endLeaveId;

  let query = supabase
    .from('leave_type')
    .select('leave_id, leave_name_th, leave_name_en, leave_group, allowed_days, description, is_active')
    .order('leave_id', { ascending: true });

  if (start) query = query.gte('leave_id', start);
  if (end) query = query.lte('leave_id', end);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    leave_id: r.leave_id,
    leave_name_th: r.leave_name_th || '-',
    leave_name_en: r.leave_name_en || '-',
    leave_group: r.leave_group || '-',
    allowed_days: r.allowed_days ?? '-',
    description: r.description || '-',
    is_active: r.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
  }));
}
