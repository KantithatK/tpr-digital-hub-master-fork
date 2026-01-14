// File: src/hrm/modules/company/forms/EmailCancelDocumentForm.jsx
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
    RadioGroup,
    Radio,
    TextField,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

import { supabase } from "@/lib/supabaseClient";

/**
 * ฟอร์มกำหนดการส่ง E-mail ยกเลิกเอกสาร (option_email_cancel_document)
 */
export default function EmailCancelDocumentForm({ value, onChange, onSave, onReset, loading }) {
    const approvedScope = value.notify_with_user_approved_all
        ? "ALL"
        : value.notify_with_user_approver_last
            ? "LAST"
            : "";

    // ปิดการแก้ไขส่วนอื่นเมื่อปิดใช้งาน
    const disabled = !value.is_enabled;

    const rows = [
        {
            label: "การส่ง Email แจ้งเตือนเมื่อยกเลิกเอกสาร",
            control: (
                <FormControlLabel
                    control={<Checkbox checked={!!value.is_enabled} onChange={(e) => onChange({ is_enabled: e.target.checked })} />}
                    label="เปิดใช้งาน"
                />
            ),
        },
        {
            label: "",
            control: (
                <FormGroup sx={{ ml: 2 }}>
                    {/* เยื้องขวาเล็กน้อย */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!value.notify_with_user_request}
                                onChange={(e) => onChange({ notify_with_user_request: e.target.checked })}
                                disabled={disabled}
                            />
                        }
                        label="แจ้งเตือนผู้ขอเอกสาร"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!value.notify_with_user_approved}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    onChange({
                                        notify_with_user_approved: checked,
                                        // reset radio เมื่อปิดตัวเลือกนี้
                                        ...(checked ? {} : { notify_with_user_approved_all: false, notify_with_user_approver_last: false }),
                                    });
                                }}
                                disabled={disabled}
                            />
                        }
                        label="แจ้งเตือนผู้อนุมัติ"
                    />
                </FormGroup>
            ),
        },
        {
            label: "",
            control: (
                <RadioGroup
                    row={false}
                    value={approvedScope}
                    onChange={(e) => {
                        const v = e.target.value;
                        onChange({
                            notify_with_user_approved_all: v === "ALL",
                            notify_with_user_approver_last: v === "LAST",
                        });
                    }}
                    sx={{ ml: 4 }}
                >
                    <FormControlLabel
                        value="ALL"
                        control={<Radio />}
                        label="ผู้อนุมัติทุกลำดับขั้น"
                        disabled={disabled || !value.notify_with_user_approved}
                    />
                    <FormControlLabel
                        value="LAST"
                        control={<Radio />}
                        label="เฉพาะผู้อนุมัติลำดับขั้นสุดท้าย"
                        disabled={disabled || !value.notify_with_user_approved}
                    />
                </RadioGroup>
            ),
        },
        {
            label: "CC: E-mail ผู้ส่ง",
            control: (
                <TextField
                    fullWidth
                    size="small"
                    placeholder="hr@example.com;account@example.com"
                    value={value.description || ""}
                    onChange={(e) => onChange({ description: e.target.value })}
                    multiline
                    minRows={2}
                    disabled={disabled}
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
                    กำหนดข้อมูลเพื่อให้ระบบส่งแจ้งเตือนไปยัง Email เมื่อมีการยกเลิกเอกสารของแต่ละหน้า
                </Typography>
            </CardContent>
        </Card>
    );
}
