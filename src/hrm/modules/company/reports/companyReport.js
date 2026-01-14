import { supabase } from "@/lib/supabaseClient";

export const title = "รายงานข้อมูลบริษัท";

export const columns = [
  { header: "รหัส", dataKey: "company_code" },
  { header: "ชื่อบริษัท", dataKey: "name_th" },
  { header: "ชื่ออังกฤษ", dataKey: "name_en" },
  { header: "เลขประจำตัวผู้เสียภาษี", dataKey: "tax_id" },
  { header: "วันที่ก่อตั้ง", dataKey: "established_date" },
];

function formatDateTH(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export async function fetchRows() {
  const { data: companyRow } = await supabase
    .from("company")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const company = companyRow
    ? {
        company_code: companyRow.company_code || "-",
        name_th: companyRow.name_th || "-",
        name_en: companyRow.name_en || "-",
        tax_id: companyRow.tax_id || "-",
        branch_tax_no: companyRow.branch_tax_no || "-",
        established_date: companyRow.established_date
          ? formatDateTH(companyRow.established_date)
          : "-",
      }
    : {
        company_code: "-",
        name_th: "-",
        name_en: "-",
        tax_id: "-",
        branch_tax_no: "-",
        established_date: "-",
      };

  return [company];
}
