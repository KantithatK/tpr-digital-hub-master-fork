import * as React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

/**
 * ฟอร์มกำหนดการส่ง CC E-mail สำหรับเอกสาร
 * ตาราง: option_email_cc_documents
 */
export default function EmailCcDocumentsForm({ value, onChange, onSave, onReset, loading }) {
  const noApproval = !!value.enable_cc_when_no_approval;
  const hasApproval = !!value.enable_cc_when_has_approval;
  const disabledEmails = !noApproval && !hasApproval;

  const toggleNoApproval = (checked) => {
    onChange({ enable_cc_when_no_approval: checked });
  };
  const toggleHasApproval = (checked) => {
    onChange({ enable_cc_when_has_approval: checked });
  };

  const rows = [
    {
      label: "แจ้งเตือนการส่ง CC E-mail กรณีขอเอกสารหรืออนุมัติเอกสาร",
      control: (
        <Box>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={noApproval} onChange={(e) => toggleNoApproval(e.target.checked)} />}
              label="เปิดใช้งานกรณีเอกสารไม่ได้เข้าสู่ลำดับขั้นการอนุมัติ"
            />
            <FormControlLabel
              control={<Checkbox checked={hasApproval} onChange={(e) => toggleHasApproval(e.target.checked)} />}
              label="เปิดใช้งานกรณีเอกสารมีลำดับขั้นการอนุมัติ"
            />
          </FormGroup>
        </Box>
      ),
    },
    {
      label: "E-mail (CC)",
      control: (
        <TextField
          fullWidth
          size="small"
          placeholder="hr@example.com;account@example.com"
          value={value.cc_emails || ""}
          onChange={(e) => onChange({ cc_emails: e.target.value })}
          disabled={disabledEmails}
          helperText="คั่นด้วยเครื่องหมาย , กรณีมีมากกว่า 1 Email"
        />
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
            columnGap: 2,
            rowGap: 2,
            alignItems: "start",
          }}
        >
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
          ระบบจะทำการ CC ไปยัง E-mail ที่กำหนดเมื่อเงื่อนไขที่เปิดใช้งานเป็นจริง
        </Typography>
      </CardContent>
    </Card>
  );
}
