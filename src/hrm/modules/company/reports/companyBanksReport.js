export const title = "รายงานรายชื่อธนาคารของบริษัท";

export const columns = [
  { header: "รหัส", dataKey: "bank_code" },
  { header: "ชื่อธนาคาร", dataKey: "bank_name" },
  { header: "รหัสบัญชีบริษัท", dataKey: "company_bank_code" },
];

export async function fetchRows() {
  // Currently mock data - replace with supabase fetch if available
  return [
    {
      bank_code: "0773",
      bank_name: "ธนาคารกสิกรไทย จำกัด (มหาชน)",
      company_bank_code: "-",
    },
  ];
}
