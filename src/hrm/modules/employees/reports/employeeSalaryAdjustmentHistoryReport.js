// Report: รายงานประวัติการปรับอัตราจ้าง
// Columns are based on the attached sample image. Data fetching is intentionally
// left as a placeholder (returns empty array) until you provide the table/fields.

export const title = 'รายงานประวัติการปรับอัตราจ้าง';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่งงาน', dataKey: 'position' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'dept_name' },
  { header: 'วันที่เสนอปรับ', dataKey: 'propose_date' },
  { header: 'วันที่มีผลใช้', dataKey: 'effective_date' },
  { header: 'อายุงาน (ปี-เดือน-วัน)', dataKey: 'service_age' },
  { header: 'อัตราจ้างเดิม', dataKey: 'old_rate' },
  { header: 'อัตราจ้างใหม่', dataKey: 'new_rate' },
];

export async function fetchRows() {
  // TODO: Implement real data fetch. For now return an empty array as requested.
  return [];
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
