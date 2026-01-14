import { supabase } from '@/lib/supabaseClient';

// Termination report (พ้นสภาพความเป็นพนักงาน)
export const title = 'รายงานรายชื่อพนักงานพ้นสภาพความเป็นพนักงาน';

export const columns = [
  { header: 'เลขที่เอกสาร', dataKey: 'doc_no' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'employee_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
  { header: 'วันที่มีผล', dataKey: 'effective_date' },
  { header: 'ประเภทการพ้นสภาพ', dataKey: 'termination_type' },
  { header: 'สถานะ', dataKey: 'status' },
  { header: 'เหตุผล', dataKey: 'reason' },
];

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('th-TH'); } catch { return String(d); }
}

export async function fetchRows(filters = {}) {
  const { groupFrom, positionFrom, positionTo, employeeFrom, employeeTo, effectiveFrom, effectiveTo } = filters;

  try {
    const q = supabase
      .from('employee_terminations')
      .select(
        'doc_no, doc_date, effective_date, last_work_date, termination_type, reason, detail, employee_code, employee_first_name, employee_last_name, employee_full_name, unit, position, status, approval_status, approver_name, approved_at'
      )
      .order('effective_date', { ascending: false });

    let query = q;
    if (employeeFrom) query = query.gte('employee_code', employeeFrom);
    if (employeeTo) query = query.lte('employee_code', employeeTo);
    if (effectiveFrom) query = query.gte('effective_date', effectiveFrom);
    if (effectiveTo) query = query.lte('effective_date', effectiveTo);

    const { data, error } = await query.limit(5000);
    if (error) throw error;

    const rows = (data || []).map((t) => ({
      doc_no: t.doc_no || '',
      employee_code: t.employee_code || '',
      employee_name: t.employee_full_name || `${t.employee_first_name || ''} ${t.employee_last_name || ''}`.trim(),
      position: t.position || '',
      department_name: t.unit || '',
      effective_date: formatDate(t.effective_date),
      termination_type: t.termination_type || '',
      status: t.status || '',
      reason: t.reason || t.detail || '',
      approved_at: formatDate(t.approved_at),
    }));

    // apply simple textual filters
    let out = rows;
    if (positionFrom) out = out.filter((r) => (r.position || '').toLowerCase() >= (positionFrom || '').toLowerCase());
    if (positionTo) out = out.filter((r) => (r.position || '').toLowerCase() <= (positionTo || '').toLowerCase());
    if (groupFrom) {
      const needle = (groupFrom || '').toLowerCase();
      out = out.filter((r) => (r.department_name || '').toLowerCase().includes(needle));
    }

    return out;
  } catch (err) {
    console.error('terminationReport error:', err);
    throw err;
  }
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
