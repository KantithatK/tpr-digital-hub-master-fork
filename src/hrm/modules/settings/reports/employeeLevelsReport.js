import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลระดับพนักงาน';

export const columns = [
  { header: 'รหัสระดับพนักงาน', dataKey: 'level_id' },
  { header: 'ชื่อระดับพนักงาน (ไทย)', dataKey: 'level_name_th' },
  { header: 'ชื่อระดับพนักงาน (อังกฤษ)', dataKey: 'level_name_en' },
  { header: 'รายละเอียด', dataKey: 'description' },
  { header: 'สถานะ', dataKey: 'is_active' },
];

export async function fetchRows(filters = {}) {
  const start = filters.startLevelId || filters.startGroupId || filters.startEmpGroupId;
  const end = filters.endLevelId || filters.endGroupId || filters.endEmpGroupId;

  let query = supabase
    .from('employee_level')
    .select('level_id, level_name_th, level_name_en, description, is_active')
    .order('level_id', { ascending: true });

  if (start) query = query.gte('level_id', start);
  if (end) query = query.lte('level_id', end);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    level_id: r.level_id,
    level_name_th: r.level_name_th || '-',
    level_name_en: r.level_name_en || '-',
    description: r.description || '-',
    is_active: r.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
  }));
}
