import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลกลุ่มผู้ใช้';

export const columns = [
  { header: 'รหัสกลุ่มผู้ใช้งาน', dataKey: 'group_id' },
  { header: 'ชื่อกลุ่มผู้ใช้งาน (ไทย)', dataKey: 'group_name_th' },
  { header: 'ชื่อกลุ่มผู้ใช้งาน (อังกฤษ)', dataKey: 'group_name_en' },
  { header: 'รายละเอียด', dataKey: 'description' },
  { header: 'สถานะ', dataKey: 'is_active' },
];

export async function fetchRows(filters = {}) {
  const { startGroupId, endGroupId } = filters || {};
  let query = supabase
    .from('user_group')
    .select('group_id, group_name_th, group_name_en, description, is_active')
    .order('group_id', { ascending: true });

  if (startGroupId) query = query.gte('group_id', startGroupId);
  if (endGroupId) query = query.lte('group_id', endGroupId);

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((r) => ({
    group_id: r.group_id,
    group_name_th: r.group_name_th || '-',
    group_name_en: r.group_name_en || '-',
    description: r.description || '-',
    is_active: r.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
  }));
}
