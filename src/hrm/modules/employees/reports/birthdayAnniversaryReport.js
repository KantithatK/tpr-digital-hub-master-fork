import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานวันครบรอบวันเกิดของพนักงาน';

export const columns = [
  { header: 'วันเกิด', dataKey: 'birth_date' },
  { header: 'อายุ(ปี)', dataKey: 'age' },
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ประเภทพนักงาน', dataKey: 'employee_type' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'unit_name' },
];

function fmtDate(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(d);
  }
}

function calcAgeYears(d) {
  if (!d) return '-';
  try {
    const birth = new Date(d);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
    return age;
  } catch {
    return '-';
  }
}

export async function fetchRows(filters = {}) {
  try {
    const { dayFrom = 1, dayTo = 31, monthFrom = 1, monthTo = 12, employmentStatus = 'all', sortBy = 'by_birthdate' } = filters || {};

    // Build base employees query and apply universal filters if provided
    let q = supabase
      .from('employees')
      .select('employee_code, title_th, first_name_th, last_name_th, position, position_id, employee_type, department_id, department_name, birth_date, employment_status')
      .not('birth_date', 'is', null)
      .order('employee_code', { ascending: true });

    // Employee code range
    const startCode = filters.employeeFrom;
    const endCode = filters.employeeTo;
    if (startCode) q = q.gte('employee_code', startCode);
    if (endCode) q = q.lte('employee_code', endCode);

    // Department (groupFrom/groupTo) - support dept_id (code) or id (uuid)
    const deptFrom = filters.groupFrom;
    const deptTo = filters.groupTo;
    if (deptFrom || deptTo) {
      try {
        // build department id list by querying department table for matching dept_id range or specific id
        let deptQuery = supabase.from('department').select('id,dept_id');
        if (deptFrom && deptTo) {
          // assume code range
          deptQuery = deptQuery.gte('dept_id', deptFrom).lte('dept_id', deptTo).order('dept_id', { ascending: true }).limit(1000);
        } else if (deptFrom) {
          // match single code or id
          deptQuery = deptQuery.or(`dept_id.eq.${deptFrom},id.eq.${deptFrom}`);
        } else if (deptTo) {
          deptQuery = deptQuery.or(`dept_id.eq.${deptTo},id.eq.${deptTo}`);
        }
        const { data: deptRows, error: deptErr } = await deptQuery;
        if (!deptErr && deptRows && deptRows.length) {
          const ids = deptRows.map((d) => d.id).filter(Boolean);
          if (ids.length) q = q.in('department_id', ids);
        }
      } catch (e) {
        // department lookup failed
      }
    }

    // Position (positionFrom/positionTo) - resolve position ids by position_code range
    const posFrom = filters.positionFrom;
    const posTo = filters.positionTo;
    if (posFrom || posTo) {
      try {
        let posQuery = supabase.from('positions').select('id,position_code');
        if (posFrom && posTo) {
          posQuery = posQuery.gte('position_code', posFrom).lte('position_code', posTo).order('position_code', { ascending: true }).limit(1000);
        } else if (posFrom) {
          posQuery = posQuery.or(`position_code.eq.${posFrom},id.eq.${posFrom}`);
        } else if (posTo) {
          posQuery = posQuery.or(`position_code.eq.${posTo},id.eq.${posTo}`);
        }
        const { data: posRows, error: posErr } = await posQuery;
        if (!posErr && posRows && posRows.length) {
          const pids = posRows.map((p) => p.id).filter(Boolean);
          if (pids.length) q = q.in('position_id', pids);
        }
      } catch (e) {
        // position lookup failed
      }
    }

    const { data, error } = await q;

    if (error) throw error;

    const today = new Date();
    const rowsRaw = (data || []).map((r) => {
      const birth = r.birth_date ? new Date(r.birth_date) : null;
      const day = birth ? birth.getDate() : null;
      const month = birth ? birth.getMonth() + 1 : null;
      // next occurrence used for sorting upcoming
      let nextOccurrence = null;
      if (birth) {
        nextOccurrence = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
        if (nextOccurrence < today) nextOccurrence.setFullYear(today.getFullYear() + 1);
      }
      return {
        birth_date_raw: r.birth_date,
        birth_date: fmtDate(r.birth_date),
        birth_day: day,
        birth_month: month,
        nextOccurrence,
        age: calcAgeYears(r.birth_date),
        employee_code: r.employee_code || '-',
        full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
        position: r.position || '-',
        employee_type: r.employee_type || '-',
        unit_name: r.department_name || '-',
        employment_status: r.employment_status || '',
      };
    });

    // Apply filters: day range and month range
    const filtered = rowsRaw.filter((r) => {
      if (!r.birth_day || !r.birth_month) return false;
      const inDayRange = r.birth_day >= dayFrom && r.birth_day <= dayTo;
      const inMonthRange = r.birth_month >= monthFrom && r.birth_month <= monthTo;
      if (!inDayRange || !inMonthRange) return false;
      if (employmentStatus === 'working') {
        const s = (r.employment_status || '').toString();
        // match common 'working' words (Thai/EN) conservatively
        if (!/ทำงาน|active|working/i.test(s)) return false;
      }
      return true;
    });

    // Sorting
    if (sortBy === 'by_upcoming') {
      filtered.sort((a, b) => {
        if (!a.nextOccurrence || !b.nextOccurrence) return 0;
        return a.nextOccurrence - b.nextOccurrence;
      });
    } else if (sortBy === 'by_month') {
      filtered.sort((a, b) => {
        if (a.birth_month !== b.birth_month) return a.birth_month - b.birth_month;
        return a.birth_day - b.birth_day;
      });
    } else {
      // default: by absolute birth date (year included)
      filtered.sort((a, b) => {
        if (!a.birth_date_raw || !b.birth_date_raw) return 0;
        return new Date(a.birth_date_raw) - new Date(b.birth_date_raw);
      });
    }

    return filtered.map((r) => ({
      birth_date: r.birth_date,
      age: r.age,
      employee_code: r.employee_code,
      full_name: r.full_name,
      position: r.position,
      employee_type: r.employee_type,
      unit_name: r.unit_name,
    }));
  } catch (err) {
    console.error('Failed to fetch birthday anniversary report rows', err);
    return [];
  }
}
