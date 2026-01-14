import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลสรุปแบบเครื่องลงเวลา';

export const columns = [
  { header: 'รหัสรูปแบบ', dataKey: 'device_format_id' },
  { header: 'ชื่อเครื่องลงเวลา', dataKey: 'device_format_code' },
  { header: 'ชื่อยี่ห้อ', dataKey: 'device_format_desc' },
  { header: 'หมายเลขเครื่อง', dataKey: 'device_format_no' },
  // { header: 'วันที่สร้าง', dataKey: 'created_at' },
  // { header: 'วันที่ปรับปรุง', dataKey: 'updated_at' },
  // { header: 'สถานะ', dataKey: 'is_active' },
];

export async function fetchRows(filters = {}) {
  const start = filters.startGroupId || filters.startDeviceFormatId;
  const end = filters.endGroupId || filters.endDeviceFormatId;

  let query = supabase
    .from('time_device_format')
    .select('device_format_id, device_format_code, device_format_desc, device_format_no, created_at, updated_at, is_active')
    .order('device_format_id', { ascending: true });

  if (start) query = query.gte('device_format_id', start);
  if (end) query = query.lte('device_format_id', end);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    device_format_id: r.device_format_id,
    device_format_code: r.device_format_code || '-',
    device_format_desc: r.device_format_desc || '-',
    device_format_no: r.device_format_no || '-',
    created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '-',
    updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '-',
    is_active: r.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน',
  }));
}
