// FILE: src/hrm/modules/company/forms/EmailDocPasswordForm.jsx
import * as React from "react";
import {
    Card,
    CardContent,
    Box,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

/**
 * ฟอร์มกำหนดรหัสผ่านของอีเมลเอกสารระบบเงินเดือน
 * ตาราง: option_email_doc_password
 */
export default function EmailDocPasswordForm({
    value,
    onChange,
    onSave,
    onReset,
    loading,
    methodOptions,
}) {
    const opts =
        methodOptions || [
            { value: "ID_OR_TAXID", label: "หมายเลขบัตรประชาชน หรือ หมายเลขผู้เสียภาษี" },
            { value: "BIRTHDATE", label: "วันเกิด" },
        ];

    const selected = value?.doc_password_method || "ID_OR_TAXID";

    const rows = [
        {
            label: "กำหนดรหัสผ่านสำหรับเปิดเอกสารใน Email",
            control: (
                <Box>
                    <RadioGroup
                        value={selected}
                        onChange={(e) => onChange({ doc_password_method: e.target.value })}
                    >
                        {opts.map((o) => (
                            <FormControlLabel
                                key={o.value}
                                value={o.value}
                                control={<Radio />}
                                label={o.label}
                            />
                        ))}
                    </RadioGroup>

                    <Box sx={{ mt: 1.5 }}>
                        <Typography
                            variant="body2"
                            color="error"
                            sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}
                        >
                            {/* why: สร้างความชัดเจนว่ากฎนี้ถูก override ด้วย E-Pay Slip ที่ตั้งใน ESS Pro */}
                            <InfoOutlinedIcon fontSize="small" /> เอกสารที่มีผลตามรายละเอียดด้านล่างดังต่อไปนี้
                        </Typography>
                        <List dense sx={{ pl: 3 }}>
                            {[
                                "รายงาน ใบรับเงินเดือน",
                                "หนังสือรับรองเงินเดือน",
                                "หนังสือรับรองเงินเดือน",
                                "รายงาน ในบิลการปรับเงินเดือนหรือค่าว่าง",
                                "รายงาน 50 ทวิหนังสือรับรองการหักภาษี ณ ที่จ่าย",
                                "รายงาน ภงด.91 แบบแสดงรายการภาษีเงินได้บุคคลธรรมดา",
                            ].map((t, idx) => (
                                <ListItem key={t} sx={{ py: 0 }}>
                                    <ListItemText
                                        primaryTypographyProps={{ variant: "caption", color: "error" }}
                                        primary={`${idx + 1}. ${t}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
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
                        gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, // ซ้ายข้อความ, ขวาคอนเทนต์
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
            </CardContent>
        </Card>
    );
}
