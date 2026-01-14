// Report: รายงานประวัติการโอนย้ายสาขา
// Columns (no data fetching implemented yet) and PDF props (A4 landscape)

export const title = 'รายงานประวัติการโอนย้ายสาขา';

export const columns = [
  { header: 'เลขที่เอกสาร', dataKey: 'document_number' },
  { header: 'วันที่เอกสาร', dataKey: 'document_date' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่งงาน', dataKey: 'position' },
  { header: 'องค์กรเดิม', dataKey: 'old_organization' },
  { header: 'สาขาเดิม', dataKey: 'old_branch' },
  { header: 'องค์กรใหม่', dataKey: 'new_organization' },
  { header: 'สาขาใหม่', dataKey: 'new_branch' },
  { header: 'วันที่มีผล', dataKey: 'effective_date' },
  { header: 'สถานะ', dataKey: 'status' },
];

export async function fetchRows() {
  // TODO: Implement data fetching from the backend (employees/transfer table)
  // For now return an empty array as requested.
  return [];
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
