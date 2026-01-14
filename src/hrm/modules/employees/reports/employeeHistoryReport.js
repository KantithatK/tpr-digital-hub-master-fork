import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานประวัติพนักงาน';

// This report uses a custom render() (one A4 portrait page per employee)
// Use portrait A4 (default) so output matches the original single-page vertical layout
export const pdfProps = { orientation: 'p', unit: 'mm', format: 'a4' };

// Fetch rows: we pull broad employee fields; adjust later when schema clarified.
export async function fetchRows(filters = {}) {
  const { employeeFrom, employeeTo, positionFrom, positionTo, groupFrom, groupTo } = filters;
  let q = supabase
    .from('employees')
    .select('*')
    .order('employee_code', { ascending: true })
    .limit(500);

  if (employeeFrom) q = q.gte('employee_code', employeeFrom);
  if (employeeTo) q = q.lte('employee_code', employeeTo);
  if (positionFrom) q = q.gte('position', positionFrom);
  if (positionTo) q = q.lte('position', positionTo);
  if (groupFrom) q = q.or(`department_name.ilike.%${groupFrom}%,unit.ilike.%${groupFrom}%`);
  if (groupTo) q = q.or(`department_name.ilike.%${groupTo}%,unit.ilike.%${groupTo}%`);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data || [];

  // Collect province/district/subdistrict ids so we can resolve names (these fields are FK ids)
  const provIds = Array.from(new Set(rows.map((r) => r.current_address_province).filter(Boolean)));
  const distIds = Array.from(new Set(rows.map((r) => r.current_address_district).filter(Boolean)));
  const subIds = Array.from(new Set(rows.map((r) => r.current_address_subdistrict).filter(Boolean)));
  // collect employee ids so we can load bank accounts
  const empIds = Array.from(new Set(rows.map((r) => r.id).filter(Boolean)));

  // fetch label maps in parallel (if any ids present)
  // select all columns and pick a label field dynamically because different deployments
  // use `name`, `name_th`/`name_en`, or `label` for the human-readable value
  const [provRes, distRes, subRes, bankRes] = await Promise.all([
    provIds.length ? supabase.from('provinces').select('*').in('id', provIds) : Promise.resolve({ data: [], error: null }),
    distIds.length ? supabase.from('districts').select('*').in('id', distIds) : Promise.resolve({ data: [], error: null }),
    subIds.length ? supabase.from('sub_districts').select('*').in('id', subIds) : Promise.resolve({ data: [], error: null }),
    empIds.length ? supabase.from('employee_bank_accounts').select('*').in('employee_id', empIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (provRes && provRes.error) throw provRes.error;
  if (distRes && distRes.error) throw distRes.error;
  if (subRes && subRes.error) throw subRes.error;

  const pickLabel = (obj) => obj && (obj.name || obj.name_th || obj.name_en || obj.label || obj.title || obj.title_th || obj.title_en || '');
  const provMap = new Map((provRes.data || []).map((p) => [p.id, pickLabel(p)]));
  const distMap = new Map((distRes.data || []).map((d) => [d.id, pickLabel(d)]));
  const subMap = new Map((subRes.data || []).map((s2) => [s2.id, pickLabel(s2)]));
  // map employee_id -> preferred bank account (pick by lowest sort_order if multiple)
  const bankMap = new Map();
  (bankRes && bankRes.data || []).forEach((b) => {
    try {
      const eid = b.employee_id;
      if (!eid) return;
      if (!bankMap.has(eid)) {
        bankMap.set(eid, b);
      } else {
        const cur = bankMap.get(eid);
        const curOrder = cur.sort_order == null ? Number.MAX_SAFE_INTEGER : cur.sort_order;
        const newOrder = b.sort_order == null ? Number.MAX_SAFE_INTEGER : b.sort_order;
        if (newOrder < curOrder) bankMap.set(eid, b);
      }
    } catch {
      // ignore per-row mapping errors
    }
  });

  return rows.map((e) => {
    // resolve human-readable names for current address parts when possible
    const provLabel = provMap.get(e.current_address_province) || e.current_address_province || '';
    const distLabel = distMap.get(e.current_address_district) || e.current_address_district || '';
    const subLabel = subMap.get(e.current_address_subdistrict) || e.current_address_subdistrict || '';
    const fullName = `${e.title_th ? e.title_th + ' ' : ''}${e.first_name_th || ''} ${e.last_name_th || ''}`.trim();
    const fullNameEng = `${e.title_en ? e.title_en + ' ' : ''}${e.first_name_en || e.first_name_th || ''} ${e.last_name_en || e.last_name_th || ''}`.trim();
    return {
      employee_code: e.employee_code || '',
      full_name: fullName || '',
      full_name_eng: fullNameEng || '',
      position: e.position || '',
      department_name: e.department_name || e.unit || '',
      hire_date: e.hire_date || e.start_date || '',
      birth_date: e.birth_date || '',
      gender: e.gender || '',
      nationality: e.nationality || '',
      religion: e.religion || '',
      // identity card fields (DB uses national_id / national_id_...)
      id_card: e.national_id || e.id_card || e.citizen_id || '',
      nickname: e.nickname_th || e.nickname || e.nick_name || e.preferred_name || '',
      nickname_eng: e.nickname_en || e.nick_name_en || '',
      id_card_issue_date: e.national_id_issue_date || e.id_card_issue_date || '',
      id_card_expiry_date: e.national_id_expiry_date || e.id_card_expiry_date || '',
      // place/authority that issued the id card
      id_card_issue_place: e.national_id_issue_place || e.id_card_issue_place || e.id_card_issue_at || e.issue_place || '',
      // citizenship / nationality fields
      citizenship: e.citizenship || e.citizen || '',
      // military / conscription status
      military_status: e.military_status || e.military || e.army_service || '',
      // blood type
      blood_type: e.blood_group,
      // marital status
      marital_status: e.marital_status || e.marital || e.civil_status || '',
      // granular address parts
      subdistrict: subLabel,
      district: distLabel,
      province: provLabel,
      postal_code: e.current_address_postal_code,
      // contacts
      phone: e.current_address_mobile,
      email: e.current_address_email_1,
      tax_id: e.tax_id || e.personal_tax_id || '',
      // photo URL or base64 data (if stored)
      photo_url: e.image_url || e.photo_url || e.photo || e.avatar || '',
      // build address from current_address_* fields present in schema
      address: [
        // e.current_address_name,
        e.current_address_no === null || e.current_address_no === '' ? '' : 'เลขที่ ' + e.current_address_no,
        e.current_address_moo === null || e.current_address_moo === '' ? '' : 'หมู่ที่ ' + e.current_address_moo,
        e.current_address_village === null || e.current_address_village === '' ? '' : 'หมู่บ้าน ' + e.current_address_village,
        e.current_address_building === null || e.current_address_building === '' ? '' : 'อาคาร ' + e.current_address_building,
        e.current_address_room === null || e.current_address_room === '' ? '' : 'ห้อง ' + e.current_address_room,
        e.current_address_floor === null || e.current_address_floor === '' ? '' : 'ชั้น ' + e.current_address_floor,
        e.current_address_alley === null || e.current_address_alley === '' ? '' : 'ซอย ' + e.current_address_alley,
        e.current_address_road === null || e.current_address_road === '' ? '' : 'ถนน ' + e.current_address_road,
        // subLabel,
        // distLabel,
        // provLabel,
        // e.current_address_postal_code
      ].filter(Boolean).join(' '),

      height: e.height_cm || e.height || '',
      weight: e.weight_kg || e.weight || '',
      salary_type: e.salary_type || e.employee_type || '',
      salary: e.salary_rate || e.salary || e.current_salary || '',
      payment_method: e.payment_method || '',
      // try to surface any payment schedule/template related fields so we can tick checkboxes
      pay_frequency: e.payment_schedule_template || e.payment_schedule_template_id || e.pay_frequency || e.payment_frequency || e.pay_cycle || e.pay_schedule || e.payroll_pattern || '',
      pay_periods: e.pay_periods || e.pay_periods_per_month || e.pay_per_month || e.payment_times || e.payment_count || e.pay_runs_per_month || '',
      // prefer joined bank account record when present
      bank_name: (bankMap.get(e.id) && bankMap.get(e.id).bank_name) || e.bank_name || '',
      bank_account: (bankMap.get(e.id) && bankMap.get(e.id).account_number) || e.bank_account || e.bank_account_number || '',
      bank_account_name: (bankMap.get(e.id) && bankMap.get(e.id).account_name) || e.account_name || '',
      propose_date: e.propose_date || '',
      effective_date: e.effective_date || '',
    };
  });
}

// Helper formatters
function fmtDate(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('th-TH');
  } catch { return '-'; }
}

// Calculate age in years from a date string (returns string or '-')
function calcAge(d) {
  if (!d) return '-';
  try {
    const bd = new Date(d);
    if (isNaN(bd.getTime())) return '-';
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
    return age >= 0 ? String(age) : '-';
  } catch {
    return '-';
  }
}

// Render one page per employee
export async function render(doc, rows = []) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 10;
  const right = pageWidth - 10;
  const lineHeight = 4;
  // Photo box: define here so prefetch can prepare images sized/cropped to fill the box.
  // These are mm units because the PDF is generated in mm.
  const photoW = 30; // mm
  const photoH = 38; // mm
  const photoInset = 2; // inner padding inside the drawn rect (mm)

  // Prefetch images (convert remote images to data: URIs) so jsPDF can embed them.
  // We'll also draw them into an offscreen canvas sized to the target box so the
  // final dataURL exactly fills the box (cover behavior) and looks correct in the PDF.
  // Supabase public storage URLs should be fetchable; if the host blocks CORS, fetch will fail.
  const imageMap = new Map();
  try {
    await Promise.all(rows.map(async (r, idx) => {
      try {
        const url = r && r.photo_url;
        if (!url || typeof url !== 'string') return;
        
        if (url.startsWith('data:')) {
          imageMap.set(idx, url);
          
          return;
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
          let resp;
          try {
            resp = await fetch(url);
          } catch (err) {
            console.warn('employeeHistoryReport: fetch failed', idx, url, err && err.message);
            return;
          }
          
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
            if (dataUrl) {
              try {
                // create an Image element to inspect natural size then draw into canvas
                // sized to the target box (in pixels). Convert mm -> px using 96dpi baseline
                // pxPerMm = 96 / 25.4 ≈ 3.779527559; use devicePixelRatio to improve quality
                const pxPerMm = (96 / 25.4) * (window.devicePixelRatio || 1);
                const canvasW = Math.max(1, Math.round((photoW - photoInset * 2) * pxPerMm));
                const canvasH = Math.max(1, Math.round((photoH - photoInset * 2) * pxPerMm));
                const img = new Image();
                img.src = dataUrl;
                await new Promise((res, rej) => {
                  img.onload = res;
                  img.onerror = rej;
                });
                // compute source crop to achieve 'cover' behavior
                const sw = img.width;
                const sh = img.height;
                const scale = Math.max(canvasW / sw, canvasH / sh);
                const sWidth = Math.round(canvasW / scale);
                const sHeight = Math.round(canvasH / scale);
                const sx = Math.max(0, Math.round((sw - sWidth) / 2));
                const sy = Math.max(0, Math.round((sh - sHeight) / 2));
                const canvas = document.createElement('canvas');
                canvas.width = canvasW;
                canvas.height = canvasH;
                const ctx = canvas.getContext('2d');
                // draw the cropped/covered image into the canvas
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasW, canvasH);
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasW, canvasH);
                const croppedDataUrl = canvas.toDataURL('image/png');
                // store an object with the final dataUrl and explicit format for addImage
                imageMap.set(idx, { dataUrl: croppedDataUrl, fmt: 'PNG' });
                
              } catch (err) {
                // fallback: store original dataUrl if canvas processing fails
                imageMap.set(idx, { dataUrl, fmt: (dataUrl.substring(5, dataUrl.indexOf(';')) || '').includes('jpeg') ? 'JPEG' : 'PNG' });
                console.warn('employeeHistoryReport: canvas crop failed for', idx, err && err.message);
              }
            }
        }
      } catch (err) {
        console.warn('employeeHistoryReport: prefetch error', idx, err && err.message);
      }
    }));
  } catch {
    // ignore overall prefetch errors
  }

  rows.forEach((r, idx) => {
    if (idx > 0) doc.addPage();
    // Debug: print the employee row objects (up to first 3) so we can inspect fetched fields
    try {
      
    } catch {
      // ignore logging errors in non-console environments
    }
    doc.setFont('THSarabunNew', 'bold');
    doc.setFontSize(18);
    doc.text('รายงานประวัติพนักงาน', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('THSarabunNew', 'normal');
    let y = 15;

    // Section: Basic info arranged as 3 columns × 3 rows (user-specified order)
    // doc.setFont('THSarabunNew', 'bold');
    // doc.text('ข้อมูลทั่วไป', left, y);
    y += lineHeight;

    const usableWidth = right - left;
    const colGap = 6; // mm gap between columns
    // reduce photo size to fit better on the page
    const photoW = 30; // reserve smaller space for photo at right
    const photoH = 38;
    const photoGap = 6;
    // subtract photo area so columns don't overlap it
    const colWidth = (usableWidth - photoW - photoGap - colGap * 2) / 3;

    const x1 = left;
    const x2 = x1 + colWidth + colGap;
    const x3 = x2 + colWidth + colGap;

    // Photo box on the top-right (reserve area)
    const photoX = right - photoW;
    const photoY = 18;
    doc.setDrawColor(0);
    doc.rect(photoX, photoY, photoW, photoH);
    // if photo_url is a data URL (base64) we can embed it directly
    try {
      // prefer prefetched (and canvas-processed) data URL when available
      const pref = imageMap.get(idx);
      let dataUrl = null;
      let fmt = null;
      if (pref && typeof pref === 'object') {
        dataUrl = pref.dataUrl;
        fmt = pref.fmt;
      } else if (pref && typeof pref === 'string') {
        dataUrl = pref;
      } else if (r.photo_url && typeof r.photo_url === 'string') {
        dataUrl = r.photo_url;
      }

      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        // prefer explicit fmt from preprocessing, otherwise infer
        let addFmt = 'PNG';
        if (fmt) addFmt = fmt;
        else {
          const inf = dataUrl.substring(5, dataUrl.indexOf(';')) || '';
          addFmt = (inf.includes('jpeg') || inf.includes('jpg')) ? 'JPEG' : 'PNG';
        }
        // draw image inset by photoInset mm so the border is visible; use box size minus insets
        const drawX = photoX + photoInset;
        const drawY = photoY + photoInset;
        const drawW = photoW - photoInset * 2;
        const drawH = photoH - photoInset * 2;
        try {
          doc.addImage(dataUrl, addFmt, drawX, drawY, drawW, drawH);
        } catch (err) {
          // log addImage errors and a short prefix of the dataUrl to help debugging
          try {
            console.warn('employeeHistoryReport: addImage failed for', idx, err && err.message);
            
          } catch {
            // ignore console errors
          }
        }
      }
    } catch {
      // ignore image errors and keep placeholder box
    }

    // Row 1: รหัสพนักงาน | ชื่อ-นามสกุล | ชื่อ-นามสกุล (Eng.)
    doc.setFontSize(12);
    doc.setFont('THSarabunNew', 'bold');
    doc.text('รหัสพนักงาน', x1, y + lineHeight);
    doc.text('ชื่อ-นามสกุล', x2, y + lineHeight);
    doc.text('ชื่อ-นามสกุล (Eng.)', x3, y + lineHeight);
    doc.setFont('THSarabunNew', 'normal');
    doc.text(r.employee_code || '-', x1, y + lineHeight * 2);
    doc.text(r.full_name || '-', x2, y + lineHeight * 2);
    doc.text(r.full_name_eng || '-', x3, y + lineHeight * 2);

    // Row 2: ชื่อเล่น | ชื่อเล่น (Eng.) | เพศ
    const row2Y = y + lineHeight * 3 + 2;
    doc.setFont('THSarabunNew', 'bold');
    doc.text('ชื่อเล่น', x1, row2Y + lineHeight);
    doc.text('ชื่อเล่น (Eng.)', x2, row2Y + lineHeight);
    doc.text('เพศ', x3, row2Y + lineHeight);
    doc.setFont('THSarabunNew', 'normal');
    doc.text(r.nickname || '-', x1, row2Y + lineHeight * 2);
    doc.text(r.nickname_eng || '-', x2, row2Y + lineHeight * 2);
    doc.text(r.gender || '-', x3, row2Y + lineHeight * 2);

    // Row 3: วัน/เดือน/ปี เกิด | หมายเลขบัตรประชาชน | หมายเลขผู้เสียภาษี
    const row3Y = row2Y + lineHeight * 3 + 2;
    doc.setFont('THSarabunNew', 'bold');
    doc.text('วัน/เดือน/ปี เกิด', x1, row3Y + lineHeight);
    doc.text('อายุ', x2, row3Y + lineHeight);
    doc.text('หมายเลขผู้เสียภาษี', x3, row3Y + lineHeight);
    doc.setFont('THSarabunNew', 'normal');
    const age = calcAge(r.birth_date);
    doc.text(fmtDate(r.birth_date), x1, row3Y + lineHeight * 2);
    doc.text(age === '-' ? '-' : `${age} ปี`, x2, row3Y + lineHeight * 2);
    doc.text(r.tax_id || '-', x3, row3Y + lineHeight * 2);

    // move y after the grid
    y = row3Y + lineHeight * 4;

    // Dashed separator after basic info (just below row 3)
    const sepY = y + 0;
    doc.setDrawColor(120);
    doc.setLineWidth(0.5);
    // use setLineDash when available (jsPDF v2+), otherwise draw a solid line
    if (typeof doc.setLineDash === 'function') {
      doc.setLineDash([0.3, 0.8], 0);
      doc.line(left, sepY, right, sepY);
      doc.setLineDash([]);
    } else {
      // fallback: draw short segments manually
      const dash = 3; // mm dash length
      const gap = 3; // mm gap
      let x = left;
      while (x < right) {
        const x2 = Math.min(x + dash, right);
        doc.line(x, sepY, x2, sepY);
        x += dash + gap;
      }
    }

    // advance y a bit after the separator (add more vertical gap)
    y = sepY + 8;

    // Address removed per request
    // (previously here was the 'ที่อยู่' block)

    // Detailed biographical/contact list below the dashed separator
    doc.setFontSize(11);
    const labelX = left;
    const valueX = left + 50; // value column start
    const lineGap = 8; // increased line gap for better readability

    const infoList = [
      ['เลขที่บัตรประชาชน', r.id_card || '-'],
      ['วันที่หมดอายุ', fmtDate(r.id_card_expiry_date)],
      ['ออกให้ ณ', r.id_card_issue_place || '-'],
      ['ภูมิลำเนา', r.hometown || r.birth_place || '-'],
      ['เชื้อชาติ', r.nationality || '-'],
      ['สัญชาติ', r.citizenship || r.nationality || '-'],
      ['ศาสนา', r.religion || '-'],
      ['ราษฎรทหาร', r.military_status || '-'],
      ['หมู่เลือด', r.blood_type || '-'],
      ['ส่วนสูง', r.height ? `${r.height} ซม.` : '-'],
      ['น้ำหนัก', r.weight ? `${r.weight} กก.` : '-'],
      ['สถานะภาพสมรส', r.marital_status || '-'],
      ['ที่อยู่', r.address || '-'],
      ['แขวง/ตำบล', r.subdistrict || '-'],
      ['เขต/อำเภอ', r.district || '-'],
      ['จังหวัด', r.province || '-'],
      ['รหัสไปรษณีย์', r.postal_code || '-'],
      ['โทรศัพท์', r.phone || '-'],
      ['อีเมล์', r.email || '-']
    ];

    for (let i = 0; i < infoList.length; i++) {
      const [label, valueRaw] = infoList[i];
      const value = valueRaw || '-';
      // label (bold)
      doc.setFont('THSarabunNew', 'bold');
      doc.text(`${label}:`, labelX, y);
      // value (wrap inside remaining width)
      doc.setFont('THSarabunNew', 'normal');
      const maxW = right - valueX;
      const chunks = doc.splitTextToSize(String(value), maxW);
      doc.text(chunks, valueX, y);
      // advance y by number of lines used
      y += lineGap * Math.max(1, chunks.length);
    }

    // dashed separator after the email (end of the list)
    doc.setDrawColor(120);
    doc.setLineWidth(0.5);
    const sep2Y = y + 0;
    if (typeof doc.setLineDash === 'function') {
      doc.setLineDash([0.3, 0.8], 0);
      doc.line(left, sep2Y, right, sep2Y);
      doc.setLineDash([]);
    } else {
      const dash = 3;
      const gap = 3;
      let xx = left;
      while (xx < right) {
        const x2 = Math.min(xx + dash, right);
        doc.line(xx, sep2Y, x2, sep2Y);
        xx += dash + gap;
      }
    }

    // small gap before next sections
    y = sep2Y + 6;

    // Row spacing and column math (needed by the tax & checkbox sections)
    const gap = 6;
    const cols6 = 6;
    const colW6 = (right - left - gap * (cols6 - 1)) / cols6;
    const xCols6 = Array.from({ length: cols6 }, (_, i) => left + i * (colW6 + gap));

    // small helper to draw an empty checkbox with label (wraps label to given width)
    const drawCheckbox = (xx, yy, label, maxW = 40, checked = false) => {
      const cb = 4;
      const boxY = yy - 3;
      // draw stroked box
      doc.setDrawColor(0);
      doc.rect(xx, boxY, cb, cb);
      if (checked) {
        // draw an X using two lines (avoid font glyph issues)
        const pad = 1.0; // inset so X doesn't touch the box border
        doc.setLineWidth(0.5);
        doc.line(xx + pad, boxY + pad, xx + cb - pad, boxY + cb - pad);
        doc.line(xx + cb - pad, boxY + pad, xx + pad, boxY + cb - pad);
        doc.setLineWidth(0.5);
      }
      const chunks = doc.splitTextToSize(String(label), maxW);
      doc.setTextColor(0);
      doc.text(chunks, xx + cb + 3, yy);
      return Math.max(1, chunks.length);
    };



    // --- Employment & payment rows with checkboxes ---
    // Row 1: แผนก:, ตำแหน่ง:, วันที่เริ่มงาน:, วันที่บรรจุ:
    const cols4 = 4;
    const colW4 = (right - left - gap * (cols4 - 1)) / cols4;
    const x4 = Array.from({ length: cols4 }, (_, i) => left + i * (colW4 + gap));
    doc.setFont('THSarabunNew', 'bold');
    doc.text('แผนก:', x4[0], y);
    doc.text('ตำแหน่ง:', x4[1], y);
    doc.text('วันที่เริ่มงาน:', x4[2], y);
    doc.text('วันที่บรรจุ:', x4[3], y);
    doc.setFont('THSarabunNew', 'normal');
    const vDept = r.department_name || '-';
    const vPos = r.position || '-';
    const vStart = fmtDate(r.hire_date);
    const vConfirm = fmtDate(r.propose_date || r.effective_date);
    doc.text(vDept, x4[0] + 18, y);
    doc.text(vPos, x4[1] + 18, y);
    doc.text(vStart, x4[2] + 28, y);
    doc.text(vConfirm, x4[3] + 28, y);
    y += 8;



    // Row 2: ประเภทพนักงาน, checkbox รายเดือน, checkbox รายวัน, checkbox รายชั่วโมง, checkbox รายเหมา
    doc.setFont('THSarabunNew', 'bold');
    doc.text('ประเภทพนักงาน:', left, y);
    doc.setFont('THSarabunNew', 'normal');
    // helpers to normalize and match text
    const norm = (v) => (v ? String(v).toLowerCase() : '');
    const hasAny = (v, arr) => {
      const s = norm(v);
      return arr.some((p) => s.includes(p));
    };
    const cbStartX = xCols6[1];
    // determine employee type from salary_type (Thai/English keywords supported)
    const typeStr = r.salary_type || r.employee_type || '';
    const isMonthlyType = hasAny(typeStr, ['รายเดือน', 'monthly', 'month', 'เดือน']);
    const isDailyType = hasAny(typeStr, ['รายวัน', 'daily', 'day']);
    const isHourlyType = hasAny(typeStr, ['รายชั่วโมง', 'hour', 'hourly', 'ชั่วโมง']);
    const isPieceType = hasAny(typeStr, ['รายเหมา', 'ชิ้นงาน', 'เหมาจ่าย', 'piece', 'contract']);
    // draw with ticks
    drawCheckbox(cbStartX, y, 'รายเดือน', colW6 - 8, isMonthlyType);
    drawCheckbox(cbStartX + (colW6 + gap), y, 'รายวัน', colW6 - 8, isDailyType);
    drawCheckbox(cbStartX + 2 * (colW6 + gap), y, 'รายชั่วโมง', colW6 - 8, isHourlyType);
    drawCheckbox(cbStartX + 3 * (colW6 + gap), y, 'รายเหมา', colW6 - 8, isPieceType);
    y += 10;

    // Row 3: เงินเดือน:, checkbox เดือน, checkbox วัน , checkbox รายชั่วโมง, checkbox ชิ้นงาน
    doc.setFont('THSarabunNew', 'bold');
    doc.text('เงินเดือน:  ' + r.salary, left, y);
    doc.setFont('THSarabunNew', 'normal');
    // const salaryVal = r.salary ? String(r.salary) : '-';
    doc.text('', left + 28, y);
    // use same aligned checkbox columns as above, tick by type as a sensible default
    drawCheckbox(cbStartX, y, 'เดือน', colW6 - 8, isMonthlyType);
    drawCheckbox(cbStartX + (colW6 + gap), y, 'วัน', colW6 - 8, isDailyType);
    drawCheckbox(cbStartX + 2 * (colW6 + gap), y, 'รายชั่วโมง', colW6 - 8, isHourlyType);
    drawCheckbox(cbStartX + 3 * (colW6 + gap), y, 'ชิ้นงาน', colW6 - 8, isPieceType);
    y += 10;

    // Row 4: งวดที่จ่าย, checkbox เดือนละ 1 ครั้ง, 2 ครั้ง, 3 ครั้ง, สัปดาห์ละ 1 ครั้ง, งวดพิเศษ
    doc.setFont('THSarabunNew', 'bold');
    doc.text('งวดที่จ่าย:', left, y);
    doc.setFont('THSarabunNew', 'normal');
    // infer payment frequency from available fields
    // NOTE: for now we fix the payment frequency to "เดือนละ 1 ครั้ง" per request
    // (keep placeholders for future dynamic logic)
    // fixed behaviour: always mark 1 time per month
    const f1 = true;
    const f2 = false;
    const f3 = false;
    const fweek = false;
    const fspecial = false;
    drawCheckbox(xCols6[1], y, 'เดือนละ 1 ครั้ง', colW6 - 6, f1);
    drawCheckbox(xCols6[2], y, 'เดือนละ 2 ครั้ง', colW6 - 6, f2);
    drawCheckbox(xCols6[3], y, 'เดือนละ 3 ครั้ง', colW6 - 6, f3);
    drawCheckbox(xCols6[4], y, 'สัปดาห์ละ 1 ครั้ง', colW6 - 6, fweek);
    drawCheckbox(xCols6[5], y, 'งวดพิเศษ', colW6 - 6, fspecial);
    y += 10;

    // Row 5: วิธีที่จ่าย, checkbox เงินสด, checkbox เข้าบัญชีธนาคาร, ชื่อธนาคาร:, เลขที่บัญชี:
    doc.setFont('THSarabunNew', 'bold');
    doc.text('วิธีที่จ่าย:', left, y);
    doc.setFont('THSarabunNew', 'normal');
    // align payment method checkboxes to the same xCols6 grid
    const payMethodStr = r.payment_method || '';
    const isCash = hasAny(payMethodStr, ['เงินสด', 'cash']);
    const isBank = hasAny(payMethodStr, ['บัญชี', 'ธนาคาร', 'bank', 'transfer', 'direct', 'deposit']);
    drawCheckbox(xCols6[1], y, 'เงินสด', colW6 - 8, isCash);
    drawCheckbox(xCols6[2], y, 'เข้าบัญชีธนาคาร', colW6 - 8, isBank || (!isCash && (isMonthlyType || isDailyType || isHourlyType || isPieceType)));
    doc.text('ชื่อธนาคาร:', xCols6[3] + 8, y);
    doc.text(r.bank_name + '   เลขบัญชี:  ' + r.bank_account, xCols6[3] + 30, y);
    // doc.text(r.bank_account, xCols6[4] + 8, y);
    // doc.text(r.bank_account || '-', xCols6[4] + 40, y);
    y += 5;


    // --- tax calculation separator + tax info ---
    const sepTaxY = y + 0;
    doc.setDrawColor(120);
    doc.setLineWidth(0.5);
    if (typeof doc.setLineDash === 'function') {
      doc.setLineDash([0.3, 0.8], 0);
      doc.line(left, sepTaxY, right, sepTaxY);
      doc.setLineDash([]);
    } else {
      const dash = 3;
      const gapSeg = 3;
      let tx = left;
      while (tx < right) {
        const tx2 = Math.min(tx + dash, right);
        doc.line(tx, sepTaxY, tx2, sepTaxY);
        tx += dash + gapSeg;
      }
    }

    y = sepTaxY + 8;

    // Row: วิธีคำนวณภาษี, checkbox ไม่คิดภาษี, checkbox หัก ณ จ่าย (ติ๊กถูก)
    doc.setFont('THSarabunNew', 'bold');
    doc.text('วิธีคำนวณภาษี:', left, y);
    doc.setFont('THSarabunNew', 'normal');
    // align tax checkboxes to xCols6 grid
    drawCheckbox(xCols6[1], y, 'ไม่คิดภาษี', colW6 - 8, false);
    drawCheckbox(xCols6[2], y, 'หัก ณ จ่าย', colW6 - 8, true);
    y += 10;
  });



  // Add page numbers after rendering all pages
  const total = doc.getNumberOfPages();
  // Render page numbers at top-right (below header) instead of bottom-right
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('THSarabunNew', 'normal');
    doc.setFontSize(10);
    // place near the top-right, keep a small margin from the top
    const pageNumY = 12; // same vertical line as title baseline
    doc.text(`หน้า ${i} / ${total}`, pageWidth - 10, pageNumY, { align: 'right' });
  }
}
