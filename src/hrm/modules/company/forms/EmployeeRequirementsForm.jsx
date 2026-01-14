// src/hrm/modules/company/forms/EmployeeRequirementsForm.jsx
import * as React from "react";
import { Card, CardContent, Box, Typography, FormControlLabel, Checkbox, Stack } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

export default function EmployeeRequirementsForm({ value, onChange, onSave, onReset, loading }) {
  const rows = [
    {
      label: 'อนุญาตกำหนดหัวหน้างาน "ข้ามสายงาน"',
      control: (
        <FormControlLabel
          control={<Checkbox checked={!!value.allow_cross_line_supervisor} onChange={(e) => onChange({ allow_cross_line_supervisor: e.target.checked })} disabled />}
          label="เปิดใช้งาน"
        />
      ),
    },
    {
      label: "แจ้งเตือนกำหนดข้อมูลพนักงานเพิ่มเติม (ค่าเริ่มต้น)",
      control: (
        <Box>
          <FormControlLabel
            control={<Checkbox checked={!!value.notify_more_employee_data} onChange={(e) => onChange({ notify_more_employee_data: e.target.checked })} />}
            label="เปิดใช้งานการแจ้งเตือน"
          />
          <Box sx={{ pl: 3, mt: 0.5 }}>
            <Stack direction="column" spacing={0.5}>
              <FormControlLabel
                control={<Checkbox checked={!!value.auto_post_probation_result} onChange={(e) => onChange({ auto_post_probation_result: e.target.checked })} disabled={!value.notify_more_employee_data} />}
                label="แจ้งเตือนผลทดลองงาน"
              />
              <FormControlLabel
                control={<Checkbox checked={!!value.auto_post_employment_contract} onChange={(e) => onChange({ auto_post_employment_contract: e.target.checked })} disabled={!value.notify_more_employee_data} />}
                label="แจ้งเตือนข้อมูลสัญญาจ้างงาน"
              />
              <FormControlLabel
                control={<Checkbox checked={!!value.auto_provision_user_login} onChange={(e) => onChange({ auto_provision_user_login: e.target.checked })} disabled={!value.notify_more_employee_data} />}
                label="แจ้งเตือนการสร้าง User Login"
              />
            </Stack>
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, columnGap: 2, rowGap: 2, alignItems: "start" }}>
          {rows.map((row) => (
            <React.Fragment key={row.label}>
              <Typography variant="body2">{row.label}</Typography>
              <Box>{row.control}</Box>
            </React.Fragment>
          ))}
        </Box>

        <ActionsRow onSave={onSave} onReset={onReset} loading={loading} />

        <Typography variant="caption" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <InfoOutlinedIcon fontSize="small" color="action" />
          กำหนดรายละเอียดการแจ้งเตือนเกี่ยวกับพนักงานตามนโยบายบริษัท
        </Typography>
      </CardContent>
    </Card>
  );
}
