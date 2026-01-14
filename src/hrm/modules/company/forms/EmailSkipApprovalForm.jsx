// File: src/hrm/modules/company/forms/EmailSkipApprovalForm.jsx
import * as React from "react";
import {
  Card,
  CardContent,
  Divider,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

/**
 * ฟอร์มกำหนดการส่ง E-mail เมื่อ "ไม่ได้เข้าสู่ลำดับขั้นการอนุมัติ"
 * ตาราง: option_email_skip_approval (มีฟิลด์ is_enabled)
 */
export default function EmailSkipApprovalForm({ value, onChange, onSave, onReset, loading }) {
  // ใช้ฟิลด์ is_enabled จากฐานข้อมูลโดยตรง
  const enabled = !!value.is_enabled;
  const disabled = !enabled;

  const toggleEnabled = (checked) => {
    if (!checked) {
      // ปิดใช้งาน: ปิดทุกออปชันย่อยด้วย
      onChange({
        is_enabled: false,
        send_on_request: false,
        send_on_approve: false,
        send_on_reject: false,
      });
      return;
    }
    // เปิดใช้งาน: เปิด is_enabled และถ้าไม่มีตัวเลือกย่อยใด ๆ ให้เปิดตัวแรกเป็นค่าเริ่มต้น
    const noneChecked = !value.send_on_request && !value.send_on_approve && !value.send_on_reject;
    onChange({ is_enabled: true, ...(noneChecked ? { send_on_request: true } : {}) });
  };

  const rows = [
    {
      label: "ระบบ E-mail แจ้งเตือนกรณีไม่ได้เข้าสู่ลำดับขั้นการอนุมัติ",
      control: (
        <FormControlLabel
          control={<Checkbox checked={enabled} onChange={(e) => toggleEnabled(e.target.checked)} />}
          label="เปิดใช้งาน"
        />
      ),
    },
    {
      label: "",
      control: (
        <Box>
          <FormGroup sx={{ ml: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!value.send_on_request}
                  onChange={(e) => onChange({ send_on_request: e.target.checked })}
                  disabled={disabled}
                />
              }
              label="ส่ง E-mail แจ้งเตือนมีเอกสารรออนุมัติ"
            />
          </FormGroup>
          <Box sx={{ ml: 5 }}>
            <Typography variant="caption">1. ส่ง E-mail แจ้งเตือนมีเอกสารรออนุมัติให้ ผู้อนุมัติ/ผู้อนุมัติแทนทราบ</Typography>
          </Box>
        </Box>
      ),
    },
    {
      label: "",
      control: (
        <Box>
          <FormGroup sx={{ ml: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!value.send_on_approve}
                  onChange={(e) => onChange({ send_on_approve: e.target.checked })}
                  disabled={disabled}
                />
              }
              label="ส่ง E-mail แจ้งเตือนเอกสารผ่านการอนุมัติ"
            />
          </FormGroup>
          <Box sx={{ ml: 5 }}>
            <Typography variant="caption">1. ส่งผลการอนุมัติเอกสารให้ ผู้ขออนุมัติทราบ</Typography>
            <Typography variant="caption" display="block">2. ส่งผลการอนุมัติเอกสารให้ ผู้อนุมัติ/ผู้อนุมัติแทนทราบ</Typography>
          </Box>
        </Box>
      ),
    },
    {
      label: "",
      control: (
        <Box>
          <FormGroup sx={{ ml: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!value.send_on_reject}
                  onChange={(e) => onChange({ send_on_reject: e.target.checked })}
                  disabled={disabled}
                />
              }
              label="ส่ง E-mail แจ้งเตือนเอกสารไม่ผ่านการอนุมัติ"
            />
          </FormGroup>
          <Box sx={{ ml: 5 }}>
            <Typography variant="caption">1. ส่งผลการไม่อนุมัติเอกสารให้ ผู้ขออนุมัติทราบ</Typography>
            <Typography variant="caption" display="block">2. ส่งผลการไม่อนุมัติเอกสารให้ ผู้อนุมัติ/ผู้อนุมัติแทนทราบ</Typography>
          </Box>
        </Box>
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
          กำหนดข้อมูลเพื่อให้ระบบส่งแจ้งเตือนไปยัง E-mail เมื่อเอกสารไม่ได้เข้าสู่ลำดับขั้นการอนุมัติ
        </Typography>
      </CardContent>
    </Card>
  );
}
