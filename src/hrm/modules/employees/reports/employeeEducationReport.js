import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานประวัติการศึกษาของพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่งงาน', dataKey: 'position' },
  { header: 'ประเภทพนักงาน', dataKey: 'employee_type' },
  { header: 'ชื่อหน่วยงาน', dataKey: 'department_name' },

  { header: 'ระดับการศึกษา', dataKey: 'level' },
  { header: 'สถาบันการศึกษา', dataKey: 'institution' },
  { header: 'จังหวัด', dataKey: 'province_label' },
  { header: 'วุฒิที่ได้รับ', dataKey: 'degree' },
  { header: 'สาขาวิชา', dataKey: 'major' },
  { header: 'ปีที่จบ', dataKey: 'year_graduated' },
  { header: 'เกรดเฉลี่ย', dataKey: 'gpa' },
];

export async function fetchRows(filters = {}) {
  // filters not used extensively here; keep standard filters for employee code/position/group
  const { groupFrom, positionFrom, positionTo, employeeFrom, employeeTo } = filters;

  // Fetch provinces to resolve province ids to labels
  const { data: provincesData } = await supabase.from('provinces').select('id,name_th,name_en');
  const provMap = (provincesData || []).reduce((acc, p) => {
    acc[String(p.id)] = p.name_th || p.name_en || '';
    return acc;
  }, {});

  // Build base employee query
  let q = supabase
    .from('employees')
    .select('employee_code, title_th, first_name_th, last_name_th, position, employee_type, department_name, education')
    .order('employee_code', { ascending: true })
    .limit(5000);

  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  if (groupFrom) {
    // tolerant matching: allow UUID or label
    if (typeof groupFrom === 'string' && /^[0-9a-fA-F-]{36}$/.test(groupFrom)) {
      q = q.eq('department_id', groupFrom);
    } else {
      q = q.or(`department_name.ilike.%${groupFrom}%,unit.ilike.%${groupFrom}%`);
    }
  }

  const { data: employees, error } = await q;
  if (error) throw error;

  const rows = [];

  (employees || []).forEach((emp) => {
    const base = {
      employee_code: emp.employee_code || '',
      full_name: `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
      position: emp.position || '',
      employee_type: emp.employee_type || '',
      department_name: emp.department_name || '',
    };

    const edu = emp.education && Array.isArray(emp.education) ? emp.education : [];
    if (edu.length === 0) {
      // still include a blank education row? skip — we want to list only actual education entries
      return;
    }

    edu.forEach((e) => {
      rows.push({
        ...base,
        level: e.level || '',
        institution: e.institution || '',
        province_label: provMap[String(e.province)] || (e.province || ''),
        degree: e.degree || '',
        major: e.major || '',
        year_graduated: e.year_graduated || '',
        gpa: e.gpa || '',
      });
    });
  });

  return rows;
}

export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
