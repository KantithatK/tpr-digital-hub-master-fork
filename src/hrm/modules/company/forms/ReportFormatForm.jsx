// src/hrm/modules/company/forms/ReportFormatForm.jsx
import * as React from "react";
import { Card, CardContent, Divider, FormControlLabel, Checkbox, Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

export default function ReportFormatForm({ value, onChange, onSave, onReset, loading }) {
  const rows = [
    {
      label: "แสดง Logo บริษัท",
      control: (
        <FormControlLabel
          control={<Checkbox checked={!!value.show_company_logo} onChange={(e) => onChange({ show_company_logo: e.target.checked })} />}
          label="แสดง Logo บริษัท"
        />
      ),
    },
    {
      label: "แสดงชื่อผู้จัดทำ/ผู้ออกรายงาน",
      control: (
        <FormControlLabel
          control={<Checkbox checked={!!value.show_report_creator_name} onChange={(e) => onChange({ show_report_creator_name: e.target.checked })} />}
          label="แสดงชื่อผู้จัดทำ/ผู้ออกรายงาน"
        />
      ),
    },
    {
      label: "แสดงหน่วยงาน/กลุ่มบนส่วนหัวรายงาน",
      control: (
        <FormControlLabel
          control={<Checkbox checked={!!value.show_com_unit_on_header} onChange={(e) => onChange({ show_com_unit_on_header: e.target.checked })} />}
          label="แสดงหน่วยงาน/กลุ่มบนส่วนหัวรายงาน"
        />
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>กำหนดรูปแบบรายงาน</Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr" }, rowGap: 1 }}>
          {rows.map((row) => <Box key={row.label}>{row.control}</Box>)}
        </Box>

        <ActionsRow onSave={onSave} onReset={onReset} loading={loading} />

        <Typography variant="caption" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <InfoOutlinedIcon fontSize="small" color="action" />
          กำหนดเพื่อให้ระบบแสดงค่ารูปแบบรายงานตามที่กำหนดไว้
        </Typography>
      </CardContent>
    </Card>
  );
}
