import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานอายุการทำงานของพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'อายุงาน (ปี-เดือน-วัน)', dataKey: 'service_age' },
];

export async function fetchRows(filters = {}) {
  try {
    let q = supabase
      .from('employees')
      .select(
        'employee_code, title_th, first_name_th, last_name_th, position, position_id, department_id, service_age_years, service_age_months, service_age_days'
      )
      .order('employee_code', { ascending: true });

    // apply employee code range filters
    if (filters.employeeFrom) q = q.gte('employee_code', filters.employeeFrom);
    if (filters.employeeTo) q = q.lte('employee_code', filters.employeeTo);

    // department filter
    if (filters.groupFrom || filters.groupTo) {
      try {
        let dq = supabase.from('department').select('id,dept_id');
        if (filters.groupFrom && filters.groupTo) dq = dq.gte('dept_id', filters.groupFrom).lte('dept_id', filters.groupTo).limit(1000);
        else if (filters.groupFrom) dq = dq.or(`dept_id.eq.${filters.groupFrom},id.eq.${filters.groupFrom}`);
        else if (filters.groupTo) dq = dq.or(`dept_id.eq.${filters.groupTo},id.eq.${filters.groupTo}`);
        const { data: drows, error: derr } = await dq;
        if (!derr && drows && drows.length) q = q.in('department_id', drows.map((d) => d.id));
      } catch (e) {
        // department lookup failed
      }
    }

    // position filter
    if (filters.positionFrom || filters.positionTo) {
      try {
        let pq = supabase.from('positions').select('id,position_code');
        if (filters.positionFrom && filters.positionTo) pq = pq.gte('position_code', filters.positionFrom).lte('position_code', filters.positionTo).limit(1000);
        else if (filters.positionFrom) pq = pq.or(`position_code.eq.${filters.positionFrom},id.eq.${filters.positionFrom}`);
        else if (filters.positionTo) pq = pq.or(`position_code.eq.${filters.positionTo},id.eq.${filters.positionTo}`);
        const { data: prows, error: perr } = await pq;
        if (!perr && prows && prows.length) q = q.in('position_id', prows.map((p) => p.id));
      } catch (e) {
        // position lookup failed
      }
    }

    const { data, error } = await q;

    if (error) throw error;

    return (data || []).map((r) => {
      const ys = Number.isFinite(Number(r.service_age_years)) ? Number(r.service_age_years) : 0;
      const ms = Number.isFinite(Number(r.service_age_months)) ? Number(r.service_age_months) : 0;
      const ds = Number.isFinite(Number(r.service_age_days)) ? Number(r.service_age_days) : 0;
      const serviceAge = `${ys} ปี ${ms} เดือน ${ds} วัน`;
      return {
        employee_code: r.employee_code || '-',
        full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
        position: r.position || '-',
        service_age: serviceAge,
      };
    });
  } catch (err) {
    console.error('Failed to fetch service age report rows', err);
    return [];
  }
}
