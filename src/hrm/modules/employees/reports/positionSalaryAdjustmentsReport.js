import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานการปรับตำแหน่งและเงินเดือน';

export const columns = [
  { header: 'เลขที่เอกสาร', dataKey: 'doc_no' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ประเภทการปรับ', dataKey: 'adjustment_type' },
  { header: 'วันที่เสนอปรับ', dataKey: 'propose_date' },
  { header: 'วันที่อนุมัติ', dataKey: 'approved_at' },
  { header: 'วันที่มีผลใช้', dataKey: 'effective_date' },
  { header: 'สถานะ', dataKey: 'status' },
];

export async function fetchRows(filters = {}) {
  const { positionFrom, positionTo, employeeFrom, employeeTo, expiryFrom, expiryTo } = filters;

  let q = supabase
    .from('employee_position_salary_adjustments')
    .select('doc_no, doc_date, propose_date, effective_date, employee_code, employee_full_name, position, adjustment_type, approved_at, status')
    .order('doc_no', { ascending: false });

  // employee code range
  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);

  // position range (text)
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  // allow filtering by propose_date if expiryFrom/To passed (optional)
  if (expiryFrom) q = q.gte('propose_date', expiryFrom);
  if (expiryTo) q = q.lte('propose_date', expiryTo);

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  return (data || []).map((r) => ({
    doc_no: r.doc_no || '-',
    employee_code: r.employee_code || '-',
    full_name: r.employee_full_name || '-',
    position: r.position || '-',
    adjustment_type: r.adjustment_type || '-',
    propose_date: r.propose_date ? new Date(r.propose_date).toLocaleDateString('th-TH') : '-',
    approved_at: r.approved_at ? new Date(r.approved_at).toLocaleDateString('th-TH') : '-',
    effective_date: r.effective_date ? new Date(r.effective_date).toLocaleDateString('th-TH') : '-',
    status: r.status || '-',
  }));
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
