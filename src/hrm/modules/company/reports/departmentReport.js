import { supabase } from "@/lib/supabaseClient";

export const title = "รายงานข้อมูลหน่วยงาน";

export const columns = [
  { header: "รหัส", dataKey: "dept_id" },
  { header: "ชื่อหน่วยงาน (ไทย)", dataKey: "dept_name" },
  { header: "ชื่อหน่วยงาน (อังกฤษ)", dataKey: "dept_name_eng" },
  { header: "ประเภทหน่วยงาน", dataKey: "dept_type_name" },
  { header: "หน่วยงานหลัก", dataKey: "parent_dept_name" },
];

export async function fetchRows(filters = {}) {
  const { startGroupId, endGroupId } = filters || {};
  let query = supabase
    .from("v_department_form")
    .select(
      "dept_id, dept_name, dept_name_eng, dept_type_name, parent_dept_name"
    )
    .order("dept_id", { ascending: true });

  if (startGroupId) query = query.gte('dept_id', startGroupId);
  if (endGroupId) query = query.lte('dept_id', endGroupId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    dept_id: row.dept_id,
    dept_name: row.dept_name,
    dept_name_eng: row.dept_name_eng || "-",
    dept_type_name: row.dept_type_name || "-",
    dept_type_level: row.dept_type_level,
    parent_dept_type_level: row.parent_dept_type_level || "-",
    parent_dept_name: row.parent_dept_name || "-",
  }));
}
