// src/hrm/modules/company/forms/CompanyRulesForm.jsx
import * as React from "react";
import { Card, CardContent, Divider, TextField, MenuItem, InputAdornment, Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ActionsRow from "./ActionsRow";

// local date utils (แยกเฉพาะที่ฟอร์มนี้ใช้)
const pad = (n) => String(n).padStart(2, "0");
const fmt = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addYears = (date, years) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
};

export default function CompanyRulesForm({
  value,
  onChange,
  onSave,
  onReset,
  taxMethodOptions,
  fiscalMethodOptions,
  loading,
}) {
  const RE_DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  const toDDMMYYYY = React.useCallback((iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  }, []);

  const toISO = React.useCallback((s) => {
    if (!s) return "";
    const m = RE_DDMMYYYY.exec(s);
    if (!m) return "";
    const dd = m[1], mm = m[2], yyyy = m[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    return iso;
  }, []);

  const [dProgram, setDProgram] = React.useState(toDDMMYYYY(value.program_start_date));
  const [dStart, setDStart] = React.useState(toDDMMYYYY(value.fiscal_year_start_date));
  const [dEnd, setDEnd] = React.useState(toDDMMYYYY(value.fiscal_year_end_date));

  React.useEffect(() => { setDProgram(toDDMMYYYY(value.program_start_date)); }, [value.program_start_date, toDDMMYYYY]);
  React.useEffect(() => { setDStart(toDDMMYYYY(value.fiscal_year_start_date)); }, [value.fiscal_year_start_date, toDDMMYYYY]);
  React.useEffect(() => { setDEnd(toDDMMYYYY(value.fiscal_year_end_date)); }, [value.fiscal_year_end_date, toDDMMYYYY]);

  const handleProgramChange = (s) => {
    setDProgram(s);
    onChange({ program_start_date: toISO(s) });
  };

  const handleFiscalStartChange = (s) => {
    setDStart(s);
    const isoStart = toISO(s);
    if (!isoStart) return onChange({ fiscal_year_start_date: "", fiscal_year_end_date: "" });
    const isoEnd = fmt(addDays(addYears(isoStart, 1), -1));
    onChange({ fiscal_year_start_date: isoStart, fiscal_year_end_date: isoEnd });
    setDEnd(toDDMMYYYY(isoEnd));
  };

  const handleFiscalEndChange = (s) => {
    setDEnd(s);
    const isoEnd = toISO(s);
    if (!isoEnd) return onChange({ fiscal_year_start_date: "", fiscal_year_end_date: "" });
    const isoStart = fmt(addDays(addYears(isoEnd, -1), 1));
    onChange({ fiscal_year_start_date: isoStart, fiscal_year_end_date: isoEnd });
    setDStart(toDDMMYYYY(isoStart));
  };

  const rows = [
    {
      label: "วิธีการคำนวณภาษี",
      control: (
        <TextField select fullWidth size="small" value={value.tax_calc}
          onChange={(e) => onChange({ tax_calc: e.target.value })}>
          {taxMethodOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      label: "วันเริ่มใช้โปรแกรม",
      control: (
        <TextField fullWidth size="small" placeholder="DD/MM/YYYY" value={dProgram}
          onChange={(e) => handleProgramChange(e.target.value)}
          inputProps={{ inputMode: "numeric", pattern: "\\d{2}/\\d{2}/\\d{4}" }} />
      ),
    },
    {
      label: "มาตรฐานจำนวนวันทดลองงาน",
      control: (
        <TextField type="number" fullWidth size="small" inputProps={{ min: 0, max: 366 }}
          value={value.probation_days}
          onChange={(e) => onChange({ probation_days: Number(e.target.value || 0) })}
          InputProps={{ endAdornment: <InputAdornment position="end">วัน</InputAdornment> }} />
      ),
    },
    {
      label: "มาตรฐานการเกษียณอายุ",
      control: (
        <TextField type="number" fullWidth size="small" inputProps={{ min: 0, max: 100 }}
          value={value.retirement_age_years}
          onChange={(e) => onChange({ retirement_age_years: Number(e.target.value || 0) })}
          InputProps={{ endAdornment: <InputAdornment position="end">ปี</InputAdornment> }} />
      ),
    },
    {
      label: "วิธีนับปีงบประมาณ",
      control: (
        <TextField select fullWidth size="small" value={value.fiscal_year_count}
          onChange={(e) => onChange({ fiscal_year_count: e.target.value })}>
          {fiscalMethodOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      label: "วันที่เริ่มต้นปีงบประมาณ",
      control: (
        <TextField fullWidth size="small" placeholder="DD/MM/YYYY" value={dStart}
          onChange={(e) => handleFiscalStartChange(e.target.value)}
          inputProps={{ inputMode: "numeric", pattern: "\\d{2}/\\d{2}/\\d{4}" }} />
      ),
    },
    {
      label: "วันที่สิ้นสุดปีงบประมาณ",
      control: (
        <TextField fullWidth size="small" placeholder="DD/MM/YYYY" value={dEnd}
          onChange={(e) => handleFiscalEndChange(e.target.value)}
          inputProps={{ inputMode: "numeric", pattern: "\\d{2}/\\d{2}/\\d{4}" }} />
      ),
    },
    {
      label: "ปีงบประมาณ",
      control: (
        <TextField type="number" fullWidth size="small" value={value.fiscal_year}
          InputProps={{ readOnly: true }} helperText="คำนวณอัตโนมัติตามวิธีนับปีงบประมาณ" />
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
          กำหนดรายละเอียดต่างๆ ของบริษัท เช่น วิธีการคำนวณภาษี, จำนวนวันทดลองงาน, การเกษียณอายุ เป็นต้น
        </Typography>
      </CardContent>
    </Card>
  );
}
