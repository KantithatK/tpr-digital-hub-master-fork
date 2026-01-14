// Report: รายงานการปรับอัตราค่าจ้าง (แยกตามประเภทการปรับ)
// A4 landscape. Columns returned depend on filters provided by the caller.

export const title = 'รายงานการปรับอัตราค่าจ้าง (แยกตามประเภทการปรับ)';

// columns is a function that accepts filters and returns an array of column defs.
// Expected filter flags (boolean, optional):
// - include_employee_type_change
// - include_salary_change
// - include_position_change
// - include_level_change
export const columns = (filters = {}) => {
  const cols = [
    { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
    { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
    { header: 'เลขที่เอกสาร', dataKey: 'doc_no' },
    { header: 'สถานะ', dataKey: 'status' },
    { header: 'วันที่อนุมัติ', dataKey: 'approved_at' },
    { header: 'วันที่มีผล', dataKey: 'effective_date' },
  ];

  if (filters.include_employee_type_change) {
    cols.push({ header: 'ปรับประเภทพนักงาน', dataKey: 'employee_type_change' });
  }
  if (filters.include_salary_change) {
    cols.push({ header: 'ปรับเงินเดือน/อัตราค่าจ้าง', dataKey: 'salary_change' });
  }
  if (filters.include_position_change) {
    cols.push({ header: 'ปรับตำแหน่ง/โยกย้ายหน่วยงาน', dataKey: 'position_transfer' });
  }
  if (filters.include_level_change) {
    cols.push({ header: 'ปรับระดับพนักงาน', dataKey: 'level_change' });
  }

  return cols;
};

export async function fetchRows() {
  // Placeholder: no data fetching implemented yet as requested.
  // When needed, implement querying of the adjustments table and map rows to the
  // dataKeys used by the columns function.
  return [];
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
