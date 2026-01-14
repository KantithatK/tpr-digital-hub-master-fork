import { supabase } from '@/lib/supabaseClient';

export const title = 'รายงานข้อมูลรายได้ - รายหัก';

export const columns = [
  { header: 'รหัส', dataKey: 'code' },
  { header: 'ชื่อ (ไทย)', dataKey: 'name_th' },
  { header: 'ประเภทรายได้-รายหัก', dataKey: 'group_code' },
  { header: 'ประเภทเงินได้', dataKey: 'tax_section' },
  { header: 'วิธีคำนวณ', dataKey: 'calc_method' },
  { header: 'จำนวน', dataKey: 'amount' },
  { header: 'หน่วย', dataKey: 'unit' },
  { header: 'ภาษี', dataKey: 'taxable' },
  { header: 'ประกันฯ', dataKey: 'sso' },
  { header: 'กองทุน', dataKey: 'provident' },
];

export async function fetchRows(filters = {}) {
  const { startGroupId, endGroupId } = filters || {};
  try {
    let query = supabase
      .from('payroll_earn_deduct')
      .select('code, name_th, name_en, group_code, tax_section, calc_method, amount, unit, taxable, sso, provident')
      .order('code', { ascending: true });

    if (startGroupId) query = query.gte('code', startGroupId);
    if (endGroupId) query = query.lte('code', endGroupId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r) => ({
      code: r.code || '-',
      name_th: r.name_th || '-',
      name_en: r.name_en || '-',
      group_code: r.group_code || '-',
      tax_section: r.tax_section || '-',
      calc_method: r.calc_method || '-',
      amount: r.amount == null ? '-' : String(r.amount),
      unit: r.unit || '-',
      taxable: r.taxable ? 'Y' : 'N',
      sso: r.sso ? 'Y' : 'N',
      provident: r.provident ? 'Y' : 'N',
    }));
  } catch (err) {
    console.error('Failed to fetch earn/deduct report rows', err);
    throw err;
  }
}
