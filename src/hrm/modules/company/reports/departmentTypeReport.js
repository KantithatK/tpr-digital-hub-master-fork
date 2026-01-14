import { supabase } from "@/lib/supabaseClient";

export const title = "รายงานข้อมูลประเภทหน่วยงาน";

export const columns = [
  { header: "รหัส", dataKey: "dept_type_id" },
  { header: "ชื่อประเภทหน่วยงาน (ไทย)", dataKey: "dept_type_name" },
  { header: "ชื่อประเภทหน่วยงาน (อังกฤษ)", dataKey: "dept_type_name_eng" },
  { header: "ระดับ", dataKey: "dept_type_level" },
  { header: "รายละเอียด", dataKey: "description" },
];

export async function fetchRows(filters = {}) {
  const { startGroupId, endGroupId } = filters || {};
  let query = supabase
    .from("department_type")
    .select(
      "dept_type_id, dept_type_name, dept_type_name_eng, dept_type_level, description"
    )
    .order("dept_type_id", { ascending: true });

  if (startGroupId) query = query.gte('dept_type_id', startGroupId);
  if (endGroupId) query = query.lte('dept_type_id', endGroupId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    dept_type_id: row.dept_type_id,
    dept_type_name: row.dept_type_name,
    dept_type_name_eng: row.dept_type_name_eng || "-",
    dept_type_level: row.dept_type_level,
    description: row.description || "-",
  }));
}
