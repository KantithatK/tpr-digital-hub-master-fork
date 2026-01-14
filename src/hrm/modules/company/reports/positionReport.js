import { supabase } from "@/lib/supabaseClient";

export const title = "รายงานข้อมูลตำแหน่งงาน";

export const columns = [
  { header: "รหัสตำแหน่ง", dataKey: "position_code" },
  { header: "ชื่อตำแหน่ง (ไทย)", dataKey: "position_name" },
  { header: "ชื่อตำแหน่ง (อังกฤษ)", dataKey: "position_name_eng" },
  { header: "ตำแหน่งหัวหน้างาน", dataKey: "supervisor_position_name" },
  { header: "รายละเอียด", dataKey: "description" },
];

export async function fetchRows(filters = {}) {
  const { startGroupId, endGroupId } = filters || {};
  let query = supabase
    .from("positions")
    .select(
      "id, position_code, position_name, position_name_eng, supervisor_position_id, description"
    )
    .order("position_code", { ascending: true });

  if (startGroupId) query = query.gte('position_code', startGroupId);
  if (endGroupId) query = query.lte('position_code', endGroupId);

  const { data, error } = await query;

  if (error) throw error;

  const list = data || [];
  const map = {};
  for (const it of list) {
    map[it.id] = it;
  }

  return list.map((row) => ({
    position_code: row.position_code,
    position_name: row.position_name,
    position_name_eng: row.position_name_eng || "-",
    supervisor_position_name: map[row.supervisor_position_id]?.position_name || "-",
    description: row.description || "-",
  }));
}
