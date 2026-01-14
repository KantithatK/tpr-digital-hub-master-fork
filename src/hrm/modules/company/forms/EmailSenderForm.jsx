// File: src/hrm/modules/company/forms/EmailSenderForm.jsx
import * as React from "react";
import { Card, CardContent, Divider, Box, Typography, TextField } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

/**
 * ฟอร์มกำหนดผู้ส่ง E-mail (option_email_sender)
 * - แยกไฟล์เพื่อให้ import ใช้งานในหน้า OrganizationRulesPage
 */
export default function EmailSenderForm({ value, onChange, onSave, onReset, loading }) {
    const rows = [
        {
            label: "ชื่อผู้ส่ง",
            control: (
                <TextField
                    fullWidth
                    size="small"
                    label="ชื่อผู้ส่ง"
                    value={value.sender_name || ""}
                    onChange={(e) => onChange({ sender_name: e.target.value })}
                    inputProps={{ maxLength: 110 }}
                />
            ),
        },
        {
            label: "ที่อยู่ E-Mail",
            control: (
                <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="ที่อยู่ E-Mail"
                    value={value.sender_email || ""}
                    onChange={(e) => onChange({ sender_email: e.target.value })}
                    inputProps={{ maxLength: 110 }}
                />
            ),
        },
    ];

    return (
        <Card>
            <CardContent>

                {/* grid-label layout ให้เหมือน CompanyRulesForm */}
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
                    ข้อมูล ชื่อผู้ส่ง และ ที่อยู่ E-Mail จะถูกนำไปใช้ในระบบ Approve Center เพื่อใช้สำหรับส่งอีเมล
                </Typography>
            </CardContent>
        </Card>
    );
}
