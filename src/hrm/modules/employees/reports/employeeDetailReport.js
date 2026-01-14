import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานรายละเอียดทั่วไปของพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อ - สกุล', dataKey: 'full_name' },
  { header: 'หน่วยงาน', dataKey: 'department_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'วันที่เริ่มงาน', dataKey: 'start_date' },
  { header: 'เบอร์โทร', dataKey: 'phone' },
  { header: 'E-Mail', dataKey: 'email' },
  { header: 'เลขบัตรประชาชน', dataKey: 'national_id' },
  { header: 'วันเกิด', dataKey: 'birth_date' },
  { header: 'ประเภทพนักงาน', dataKey: 'employee_type' },
  { header: 'เงินเดือน/อัตรา', dataKey: 'salary' },
  { header: 'ที่อยู่ปัจจุบัน', dataKey: 'address' },
];

function looksLikeUuid(v) {
  return typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v);
}

function formatDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('th-TH');
  } catch {
    return String(d);
  }
}

export async function fetchRows(filters = {}) {
  const { groupFrom, positionFrom, positionTo, employeeFrom, employeeTo } = filters;

  let q = supabase
    .from('employees')
    .select(`id, employee_code, title_th, first_name_th, last_name_th, position, department_name, start_date, current_address_mobile, current_address_email_1, national_id, birth_date, employee_type, salary_rate, current_address_no, current_address_moo, current_address_village, current_address_alley, current_address_road, current_address_subdistrict, current_address_district, current_address_province, current_address_postal_code`)
    .order('employee_code', { ascending: true });

  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);

  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);

  if (groupFrom) {
    if (looksLikeUuid(groupFrom)) {
      q = q.eq('department_id', groupFrom);
    } else {
      q = q.or(`department_name.ilike.%${groupFrom}%,unit.ilike.%${groupFrom}%`);
    }
  }

  const { data, error } = await q.limit(2000);
  if (error) throw error;
  // Resolve province/district/subdistrict labels like addressReport does
  const provinceIds = new Set();
  const districtIds = new Set();
  const subdistrictIds = new Set();
  (data || []).forEach((r) => {
    if (r.current_address_province) provinceIds.add(r.current_address_province);
    if (r.current_address_district) districtIds.add(r.current_address_district);
    if (r.current_address_subdistrict) subdistrictIds.add(r.current_address_subdistrict);
  });

  async function buildLabelMap(tableName, ids) {
    const arr = Array.from(ids).filter(Boolean);
    if (!arr.length) return {};
    const { data: rows, error: err } = await supabase.from(tableName).select().in('id', arr);
    if (err) {
      console.error(`Failed to load ${tableName}`, err);
      return {};
    }
    const map = {};
    (rows || []).forEach((row) => {
      if (!row) return;
      const id = row.id;
      let label = null;
      for (const k of Object.keys(row)) {
        if (k === 'id') continue;
        const v = row[k];
        if (typeof v === 'string' && v.trim()) {
          label = v;
          break;
        }
      }
      map[id] = label || null;
    });
    return map;
  }

  const [provinceMap, districtMap, subdistrictMap] = await Promise.all([
    buildLabelMap('provinces', provinceIds),
    buildLabelMap('districts', districtIds),
    buildLabelMap('sub_districts', subdistrictIds),
  ]);

  // attach label fields onto each row for convenience
  const enriched = (data || []).map((r) => ({
    ...r,
    current_address_province_label: provinceMap[r.current_address_province] || null,
    current_address_district_label: districtMap[r.current_address_district] || null,
    current_address_subdistrict_label: subdistrictMap[r.current_address_subdistrict] || null,
  }));

  return (enriched || []).map((r) => {
    const full_name = `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim();
    const phone = r.current_address_mobile || '';
    const email = r.current_address_email_1 || '';
    const salary = r.salary_rate != null ? Number(r.salary_rate).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '';
    const addressParts = [];
    if (r.current_address_no) addressParts.push(r.current_address_no);
    if (r.current_address_moo) addressParts.push('หมู่ ' + r.current_address_moo);
    if (r.current_address_village) addressParts.push(r.current_address_village);
    if (r.current_address_alley) addressParts.push('ซ.' + r.current_address_alley);
    if (r.current_address_road) addressParts.push('ถ.' + r.current_address_road);
    if (r.current_address_subdistrict_label) addressParts.push(r.current_address_subdistrict_label);
    if (r.current_address_district_label) addressParts.push(r.current_address_district_label);
    if (r.current_address_province_label) addressParts.push(r.current_address_province_label);
    if (r.current_address_postal_code) addressParts.push(r.current_address_postal_code);
    const address = addressParts.join(' ');

    return {
      employee_code: r.employee_code || '',
      full_name,
      department_name: r.department_name || '',
      position: r.position || '',
      start_date: formatDate(r.start_date),
      phone,
      email,
      national_id: r.national_id || '',
      birth_date: formatDate(r.birth_date),
      employee_type: r.employee_type || '',
      salary,
      address,
    };
  });
}

// Output PDF as A4 landscape per request
export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };
