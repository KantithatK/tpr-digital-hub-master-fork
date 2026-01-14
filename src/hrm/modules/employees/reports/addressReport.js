import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลที่อยู่ของพนักงาน';

export const columns = [
  { header: 'รหัสพนักงาน', dataKey: 'employee_code' },
  { header: 'ชื่อพนักงาน', dataKey: 'full_name' },
  { header: 'ตำแหน่ง', dataKey: 'position' },
  { header: 'ที่อยู่', dataKey: 'address' },
  { header: 'เบอร์โทรศัพท์', dataKey: 'phone' },
  { header: 'E-Mail', dataKey: 'email' },
  { header: 'E-Mail ระบบเงินเดือน', dataKey: 'payroll_email' },
];

// Generate PDF as A4 landscape by default for this report
export const pdfProps = { orientation: 'l', unit: 'mm', format: 'a4' };

function joinParts(parts) {
  return parts.filter(Boolean).map((p) => String(p).trim()).filter(Boolean).join(' ');
}

function fmtAddress(r) {
  // Build address from available current_address_* fields
  const parts = [];
  if (r.current_address_name) parts.push(r.current_address_name);
  // house/number
  const houseno = joinParts([r.current_address_no, r.current_address_moo ? 'ม.' + r.current_address_moo : null]);
  if (houseno) parts.push(houseno);
  if (r.current_address_building) parts.push(r.current_address_building);
  if (r.current_address_room) parts.push('ห้อง ' + r.current_address_room);
  if (r.current_address_floor) parts.push('ชั้น ' + r.current_address_floor);
  if (r.current_address_village) parts.push(r.current_address_village);
  if (r.current_address_alley) parts.push('ซ.' + r.current_address_alley);
  if (r.current_address_road) parts.push('ถ.' + r.current_address_road);
  // postal code / country / province/district/subdistrict labels (we attach *_label during fetchRows)
  const tail = [];
  // prefer subdistrict -> district -> province label if available
  if (r.current_address_subdistrict_label) tail.push(r.current_address_subdistrict_label);
  if (r.current_address_district_label) tail.push(r.current_address_district_label);
  if (r.current_address_province_label) tail.push(r.current_address_province_label);
  if (r.current_address_postal_code) tail.push('รหัสไปรษณีย์ ' + r.current_address_postal_code);

  const main = parts.join(', ');
  const t = tail.filter(Boolean).join(' ');
  return [main, t].filter(Boolean).join('\n');
}

export async function fetchRows(filters = {}) {
  try {
    // select address fields; do NOT request *_label columns since schema stores ids (we can join/look up later if needed)
    let query = supabase
      .from('employees')
      .select(
        'employee_code, title_th, first_name_th, last_name_th, position, position_id, department_id, current_address_name, current_address_no, current_address_moo, current_address_building, current_address_room, current_address_floor, current_address_village, current_address_alley, current_address_road, current_address_postal_code, current_address_mobile, current_address_email_1, current_address_email_2, current_address_email_3, current_address_province, current_address_district, current_address_subdistrict'
      )
      .order('employee_code', { ascending: true });

    // apply optional code range filters (allow either startCode/endCode or employeeFrom/employeeTo)
    const start = filters.startCode || filters.employeeFrom;
    const end = filters.endCode || filters.employeeTo;
    if (start) query = query.gte('employee_code', start);
    if (end) query = query.lte('employee_code', end);

    // Department (groupFrom/groupTo)
    const deptFrom = filters.groupFrom;
    const deptTo = filters.groupTo;
    if (deptFrom || deptTo) {
      try {
        let dq = supabase.from('department').select('id,dept_id');
        if (deptFrom && deptTo) dq = dq.gte('dept_id', deptFrom).lte('dept_id', deptTo).order('dept_id', { ascending: true }).limit(1000);
        else if (deptFrom) dq = dq.or(`dept_id.eq.${deptFrom},id.eq.${deptFrom}`);
        else if (deptTo) dq = dq.or(`dept_id.eq.${deptTo},id.eq.${deptTo}`);
        const { data: drows, error: derr } = await dq;
        if (!derr && drows && drows.length) {
          const ids = drows.map((d) => d.id).filter(Boolean);
          if (ids.length) query = query.in('department_id', ids);
        }
      } catch (e) {
        // department lookup failed
      }
    }

    // Position (positionFrom/positionTo)
    const posFrom = filters.positionFrom;
    const posTo = filters.positionTo;
    if (posFrom || posTo) {
      try {
        let pq = supabase.from('positions').select('id,position_code');
        if (posFrom && posTo) pq = pq.gte('position_code', posFrom).lte('position_code', posTo).order('position_code', { ascending: true }).limit(1000);
        else if (posFrom) pq = pq.or(`position_code.eq.${posFrom},id.eq.${posFrom}`);
        else if (posTo) pq = pq.or(`position_code.eq.${posTo},id.eq.${posTo}`);
        const { data: prows, error: perr } = await pq;
        if (!perr && prows && prows.length) {
          const pids = prows.map((p) => p.id).filter(Boolean);
          if (pids.length) query = query.in('position_id', pids);
        }
      } catch (e) {
        // position lookup failed
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // collect unique location ids
    const provinceIds = new Set();
    const districtIds = new Set();
    const subdistrictIds = new Set();
    (data || []).forEach((r) => {
      if (r.current_address_province) provinceIds.add(r.current_address_province);
      if (r.current_address_district) districtIds.add(r.current_address_district);
      if (r.current_address_subdistrict) subdistrictIds.add(r.current_address_subdistrict);
    });

    // helper to build id->label map by fetching the table rows and picking the first string column (besides id)
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
        // find a suitable label field: first string property that's not 'id'
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

    // attach label fields to each row for fmtAddress to use
    const enriched = (data || []).map((r) => ({
      ...r,
      current_address_province_label: provinceMap[r.current_address_province] || null,
      current_address_district_label: districtMap[r.current_address_district] || null,
      current_address_subdistrict_label: subdistrictMap[r.current_address_subdistrict] || null,
    }));

    return enriched.map((r) => ({
      employee_code: r.employee_code || '-',
      full_name: `${r.title_th ? r.title_th + ' ' : ''}${r.first_name_th || ''} ${r.last_name_th || ''}`.trim(),
      position: r.position || '-',
      address: fmtAddress(r) || '-',
      phone: r.current_address_mobile || '-',
      email: r.current_address_email_1 || '-',
      payroll_email: r.current_address_email_2 || r.current_address_email_3 || '-',
    }));
  } catch (err) {
    console.error('Failed to fetch employee address report rows', err);
    return [];
  }
}
