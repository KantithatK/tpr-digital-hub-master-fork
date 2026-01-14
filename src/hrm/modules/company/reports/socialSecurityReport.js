export const title = "รายงานข้อมูลประกันสังคมของบริษัท";

export const columns = [
  { header: "เลขประกันสังคม", dataKey: "social_no" },
  { header: "สาขา", dataKey: "branch_no" },
  { header: "บริษัท (%)", dataKey: "company_rate" },
  { header: "พนักงาน (%)", dataKey: "employee_rate" },
];

export async function fetchRows() {
  // Currently mock data - replace with supabase fetch if available
  return [
    {
      social_no: "10-0267793-9",
      branch_no: "00000",
      company_rate: "5.00",
      employee_rate: "5.00",
    },
  ];
}
