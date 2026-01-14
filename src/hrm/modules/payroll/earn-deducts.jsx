import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// MUI
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import Radio from '@mui/material/Radio';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Schema assumption (create separately in DB):
// payroll_earn_deduct: { id uuid pk, code text unique, name_th text, name_en text, group_code text, tax_section text, calc_method text, amount numeric, taxable bool, sso bool, provident bool, created_at timestamptz, updated_at timestamptz }

const initialForm = {
  id: '',
  code: '',
  name_th: '',
  name_en: '',
  group_code: '', // รายได้ประจำ / รายได้ไม่ประจำ / รายหัก ฯลฯ
  tax_section: '', // 40(1) / 40(2) ...
  calc_method: '',
  amount: '',
  unit: '',
  taxable: false,
  sso: false,
  provident: false,
  // Added extended fields per new dialog requirements
  tax_rate_method: 'PROGRESSIVE', // PROGRESSIVE | FIXED | WITHHOLDING
  fixed_rate_percent: '',
  withholding_rate_percent: '',
  include_ot_base: false,
  include_ot_calc: false,
  include_work_base: false,
  include_work_early_leave: false,
  include_work_late: false,
};

// Updated to match required options exactly as provided
const GROUP_OPTIONS = [
  'รายได้ประจำ',
  'รายหักประจำ',
  'รายได้ไม่ประจำ',
  'รายหักไม่ประจำ',
  'รายได้ค่าล่วงเวลา',
];
const TAX_SECTION_OPTIONS = ['40(1)', '40(2)'];
const CALC_METHOD_OPTIONS = [
  'กำหนดเอง',
  'จำนวนคงที่',
  'อัตราส่วนต่อวัน',
  'อัตราส่วนต่อชั่วโมง',
];
// Unit options now come from DB (table: unit_code) with a single text column: unit
// Example values: 'วัน', 'ชั่วโมง', 'ชิ้น' or 'DAY', 'HOUR', 'PCS'
// We'll store the selected value in form.unit as plain text, and keep legacy values visible if not found.

export default function EarnDeductsPage() {
  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // unit options (list of text units)
  const [unitOptions, setUnitOptions] = React.useState([]); // ['วัน','ชั่วโมง','ชิ้น']

  // search
  const [searchField, setSearchField] = React.useState('code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'code', text: '' });

  // modal
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  // delete
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  // If group is a deduction (รายหักประจำ / รายหักไม่ประจำ), labels should start with 'หักก่อน'
  const isDeduction = React.useMemo(() => {
    return typeof form.group_code === 'string' && form.group_code.startsWith('รายหัก');
  }, [form.group_code]);

  // OT group helper
  const isOTGroup = form.group_code === 'รายได้ค่าล่วงเวลา';

  // Limit calc methods by group: for รายได้ประจำ/รายหักประจำ allow only กำหนดเอง, จำนวนคงที่
  const calcMethodOptions = React.useMemo(() => {
    const regularGroups = ['รายได้ประจำ', 'รายหักประจำ'];
    if (regularGroups.includes(form.group_code)) {
      return ['กำหนดเอง', 'จำนวนคงที่'];
    }
    if (form.group_code === 'รายได้ค่าล่วงเวลา') {
      return ['กำหนดเอง', 'อัตราส่วนต่อชั่วโมง'];
    }
    // If group is 'รายได้ไม่ประจำ' show additional methods for daily/hourly wages
    if (form.group_code === 'รายได้ไม่ประจำ') {
      return [...CALC_METHOD_OPTIONS, 'ค่าแรงรายวัน', 'ค่าแรงรายชั่วโมง'];
    }
    return CALC_METHOD_OPTIONS;
  }, [form.group_code]);

  // If current calc_method becomes invalid due to group change, reset to กำหนดเอง and clear unit
  React.useEffect(() => {
    if (form.calc_method && !calcMethodOptions.includes(form.calc_method)) {
      setForm((p) => ({ ...p, calc_method: 'กำหนดเอง', unit: '' }));
      setErrors((e) => ({ ...e, calc_method: '' }));
    }
  }, [calcMethodOptions, form.calc_method]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('payroll_earn_deduct').select('*', { count: 'exact' });
      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        query = query.ilike(appliedSearch.field, `%${t}%`);
      }
      const from = page * rowsPerPage; const to = from + rowsPerPage - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []); setTotal(count || 0);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'โหลดข้อมูลล้มเหลว', severity: 'error' });
    } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // Load unit options from `unit_code` (supports both single-column 'unit' and legacy columns)
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Attempt 1: single-column 'unit'
        let units = [];
        try {
          const { data, error } = await supabase
            .from('unit_code')
            .select('unit')
            .order('unit', { ascending: true });
          if (error) throw error;
          units = (data || []).map((r) => r.unit).filter((v) => typeof v === 'string' && v.trim() !== '');
        } catch (err1) {
          // Column 'unit' may not exist; fallback to legacy schema
          console.warn('unit_code: single-column fetch failed, trying legacy columns...', err1?.message || err1);
        }

        if ((!units || units.length === 0)) {
          // Attempt 2: legacy columns 'unit_id, unit_name_th, unit_name_en'
          try {
            const { data: data2, error: error2 } = await supabase
              .from('unit_code')
              .select('unit_id, unit_name_th, unit_name_en')
              .order('unit_id', { ascending: true });
            if (error2) throw error2;
            const mapped = (data2 || []).map((u) => u.unit_name_th || u.unit_name_en || u.unit_id).filter((v) => typeof v === 'string' && v.trim() !== '');
            // de-duplicate while preserving order
            const seen = new Set();
            units = mapped.filter((v) => { if (seen.has(v)) return false; seen.add(v); return true; });
          } catch (err2) {
            console.error('Load unit_code (legacy) failed:', err2?.message || err2);
          }
        }

        if (isMounted) setUnitOptions(units || []);
      } catch (err) {
        // Keep unitOptions empty; legacy values will still appear as-is
        console.error('Load unit_code failed:', err?.message || err);
      } finally {
        // no-op
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleOpenAdd = () => { setEditMode(false); setForm(initialForm); setErrors({}); setOpenModal(true); };
  const handleOpenEdit = (row) => { setEditMode(true); setForm({
    id: row.id,
    code: row.code || '',
    name_th: row.name_th || '',
    name_en: row.name_en || '',
    group_code: row.group_code || '',
    tax_section: row.tax_section || '',
    calc_method: row.calc_method || '',
    amount: row.amount ?? '',
  unit: row.unit || '',
    taxable: Boolean(row.taxable),
    sso: Boolean(row.sso),
    provident: Boolean(row.provident),
    tax_rate_method: row.tax_rate_method || 'PROGRESSIVE',
    fixed_rate_percent: row.fixed_rate_percent != null ? String(row.fixed_rate_percent) : '',
    withholding_rate_percent: row.withholding_rate_percent != null ? String(row.withholding_rate_percent) : '',
    include_ot_base: Boolean(row.include_ot_base),
    include_ot_calc: Boolean(row.include_ot_calc),
    include_work_base: Boolean(row.include_work_base),
    include_work_early_leave: Boolean(row.include_work_early_leave),
    include_work_late: Boolean(row.include_work_late),
  }); setErrors({}); setOpenModal(true); };
  const handleCloseModal = () => setOpenModal(false);

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { setTargetRow(null); setOpenDelete(false); };
  const handleConfirmDelete = async () => {
    if (!targetRow || deleting) return; setDeleting(true);
    try { const { error } = await supabase.from('payroll_earn_deduct').delete().eq('id', targetRow.id); if (error) throw error; setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' }); handleCloseDelete(); fetchData(); } catch (err) { setSnackbar({ open: true, message: err.message || 'ลบข้อมูลล้มเหลว', severity: 'error' }); } finally { setDeleting(false); }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = 'กรุณากรอกรหัส';
    if (!form.name_th.trim()) newErrors.name_th = 'กรุณากรอกชื่อ (ไทย)';
    if (!form.group_code) newErrors.group_code = 'เลือกกลุ่ม';
    if (!form.tax_section) newErrors.tax_section = 'เลือกตามมาตรา';
    if (!form.calc_method) newErrors.calc_method = 'เลือกวิธี';
    if (form.code && form.code.length > 30) newErrors.code = 'ไม่เกิน 30 ตัวอักษร';
    if (form.name_th && form.name_th.length > 150) newErrors.name_th = 'ไม่เกิน 150';
    if (form.name_en && form.name_en.length > 150) newErrors.name_en = 'ไม่เกิน 150';
    if (form.amount !== '' && isNaN(Number(form.amount))) newErrors.amount = 'ตัวเลข';
    // tax rate method validation
    if (form.tax_rate_method === 'FIXED') {
      if (form.fixed_rate_percent === '') newErrors.fixed_rate_percent = 'ระบุ %';
      else if (isNaN(Number(form.fixed_rate_percent))) newErrors.fixed_rate_percent = 'ตัวเลข';
    }
    if (form.tax_rate_method === 'WITHHOLDING') {
      if (form.withholding_rate_percent === '') newErrors.withholding_rate_percent = 'ระบุ %';
      else if (isNaN(Number(form.withholding_rate_percent))) newErrors.withholding_rate_percent = 'ตัวเลข';
    }
    setErrors(newErrors); return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (saving) return; if (!validate()) { setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูล', severity: 'error' }); return; }
    setSaving(true);
    const shouldUseUnit = form.calc_method !== 'กำหนดเอง' && form.calc_method !== 'จำนวนคงที่';
    const payload = {
      code: form.code.trim(),
      name_th: form.name_th.trim(),
      name_en: form.name_en?.trim() || null,
      group_code: form.group_code,
      tax_section: form.tax_section,
      calc_method: form.calc_method,
      amount: form.amount === '' ? null : Number(form.amount),
      unit: shouldUseUnit ? (form.unit || null) : null,
      taxable: form.taxable,
      sso: form.sso,
      provident: form.provident,
      tax_rate_method: form.tax_rate_method,
      fixed_rate_percent: form.fixed_rate_percent === '' ? null : Number(form.fixed_rate_percent),
      withholding_rate_percent: form.withholding_rate_percent === '' ? null : Number(form.withholding_rate_percent),
      updated_at: new Date().toISOString(),
    };
    try {
      if (editMode) {
        const { error } = await supabase.from('payroll_earn_deduct').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payroll_earn_deduct').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      setSnackbar({ open: true, message: editMode ? 'บันทึกการแก้ไขสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      setOpenModal(false); fetchData();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setErrors((p) => ({ ...p, code: 'รหัสนี้ถูกใช้แล้ว' }));
      }
      // Log full error to console for developer visibility
      // and show message to user to help diagnose quickly (e.g., RLS policy, FK, constraint)
      console.error('Save payroll_earn_deduct failed:', err);
      setSnackbar({ open: true, message: msg ? `ไม่สามารถบันทึกข้อมูลได้: ${msg}` : 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรายได้-รายหัก</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      {/* Filter */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="search-field-label">ค้นหาตาม</InputLabel>
          <Select labelId="search-field-label" label="ค้นหาตาม" value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <MenuItem value="code">รหัส</MenuItem>
            <MenuItem value="name_th">ชื่อ (ไทย)</MenuItem>
            <MenuItem value="name_en">ชื่อ (อังกฤษ)</MenuItem>
            <MenuItem value="group_code">กลุ่ม</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" fullWidth label="คำค้น" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput }); }} />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'code', text: '' }); setSearchField('code'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รหัส</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อ (ไทย)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อ (อังกฤษ)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>กลุ่ม</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>มาตรา</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>วิธีคำนวณ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="right">จำนวน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>หน่วย</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ภาษี</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ประกันฯ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>กองทุน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={12} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={12} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name_th}</TableCell>
                  <TableCell>{r.name_en || ''}</TableCell>
                  <TableCell>{r.group_code || ''}</TableCell>
                  <TableCell>{r.tax_section || ''}</TableCell>
                  <TableCell>{r.calc_method || ''}</TableCell>
                  <TableCell align="right">{r.amount == null ? '' : Number(r.amount).toLocaleString()}</TableCell>
                  <TableCell>{r.unit || ''}</TableCell>
                  <TableCell align="center">{r.taxable ? '✓' : ''}</TableCell>
                  <TableCell align="center">{r.sso ? '✓' : ''}</TableCell>
                  <TableCell align="center">{r.provident ? '✓' : ''}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => handleOpenEdit(r)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => handleAskDelete(r)} disabled={deleting}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5,10,25,50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

      {/* Add/Edit Dialog */}
      <Dialog open={openModal} onClose={() => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขรายได้/รายหัก' : 'เพิ่มรายได้/รายหัก'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="รหัสรายได้ - รายหัก" value={form.code} onChange={(e) => setField('code', e.target.value)} inputProps={{ maxLength: 30 }} required size="small" disabled={editMode} error={Boolean(errors.code)} helperText={errors.code} />
            <TextField label="ชื่อรายได้ - รายหัก" value={form.name_th} onChange={(e) => setField('name_th', e.target.value)} inputProps={{ maxLength: 150 }} required size="small" error={Boolean(errors.name_th)} helperText={errors.name_th} />
            <TextField label="ชื่อรายได้ - รายหัก (Eng)" value={form.name_en} onChange={(e) => setField('name_en', e.target.value)} inputProps={{ maxLength: 150 }} size="small" error={Boolean(errors.name_en)} helperText={errors.name_en} />
            {/* Row: 2 dropdowns (group_code, tax_section) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }} error={Boolean(errors.group_code)} required>
                <InputLabel id="group-label" required>ประเภทรายได้ - รายหัก</InputLabel>
                <Select
                  labelId="group-label"
                  label="ประเภทรายได้ - รายหัก"
                  value={form.group_code}
                  onChange={(e) => {
                    const val = e.target.value;
                    // update group and auto-check flags for income groups
                    setForm((p) => {
                      const isIncome = typeof val === 'string' && val.startsWith('รายได้');
                      const isDeduct = typeof val === 'string' && val.startsWith('รายหัก');
                      return {
                        ...p,
                        group_code: val,
                        taxable: isIncome ? true : isDeduct ? false : p.taxable,
                        sso: isIncome ? true : isDeduct ? false : p.sso,
                        provident: isIncome ? true : isDeduct ? false : p.provident,
                      };
                    });
                    setErrors((e2) => ({ ...e2, group_code: '' }));
                  }}
                >
                  {GROUP_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  {form.group_code && !GROUP_OPTIONS.includes(form.group_code) && (
                    <MenuItem key={`legacy-${form.group_code}`} value={form.group_code}>{form.group_code}</MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }} error={Boolean(errors.tax_section)} required>
                <InputLabel id="tax-label" required>ประเภทเงินได้ตามมาตรา</InputLabel>
                <Select labelId="tax-label" label="ประเภทเงินได้ตามมาตรา" value={form.tax_section} onChange={(e) => setField('tax_section', e.target.value)}>
                  {TAX_SECTION_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            {/* Row: calc_method + amount (+ optional unit) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }} error={Boolean(errors.calc_method)} required>
                <InputLabel id="calc-label" required>วิธีคำนวณ</InputLabel>
                <Select
                  labelId="calc-label"
                  label="วิธีคำนวณ"
                  value={form.calc_method}
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('calc_method', val);
                    // Clear unit when calc method doesn't use unit or not selected yet
                    if (!val || val === 'กำหนดเอง' || val === 'จำนวนคงที่') {
                      setField('unit', '');
                    }
                  }}
                >
                  {calcMethodOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  {form.calc_method && !calcMethodOptions.includes(form.calc_method) && (
                    <MenuItem key={`legacy-${form.calc_method}`} value={form.calc_method}>{form.calc_method}</MenuItem>
                  )}
                </Select>
              </FormControl>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
                <TextField
                  label="จำนวน"
                  value={form.amount}
                  disabled={!(form.calc_method === 'จำนวนคงที่' || (isOTGroup && form.calc_method === 'อัตราส่วนต่อชั่วโมง'))}
                  onChange={(e) => setField('amount', e.target.value.replace(/[^0-9.]/g, ''))}
                  size="small"
                  error={Boolean(errors.amount)}
                  helperText={errors.amount}
                  sx={{ flex: 1 }}
                  inputProps={{ style: { textAlign: 'right' } }}
                />
                {form.calc_method && form.calc_method !== 'กำหนดเอง' && form.calc_method !== 'จำนวนคงที่' && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="unit-label">หน่วย</InputLabel>
                    <Select labelId="unit-label" label="หน่วย" value={form.unit} onChange={(e) => setField('unit', e.target.value)}>
                      {unitOptions.map((u) => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                      {/* keep legacy unit visible if not in predefined list */}
                      {form.unit && !unitOptions.includes(form.unit) && (
                        <MenuItem key={`legacy-unit-${form.unit}`} value={form.unit}>{form.unit}</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Stack>
            {/* Tax calculation & benefits section - redesigned */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, bgcolor: 'background.paper' }}>
              {/* Taxable toggle on top */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <FormControlLabel control={<Checkbox checked={form.taxable} onChange={(e) => setField('taxable', e.target.checked)} />} label={isDeduction ? 'หักก่อนคำนวณภาษี' : 'คำนวณภาษี'} />
              </Stack>

              {/* Tax methods - show only if taxable */}
              {form.taxable && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
                  <FormControlLabel
                    control={<Radio checked={form.tax_rate_method === 'PROGRESSIVE'} onChange={() => setField('tax_rate_method', 'PROGRESSIVE')} />}
                    label="แบบอัตราก้าวหน้า"
                  />
                  <FormControlLabel
                    control={<Radio checked={form.tax_rate_method === 'FIXED'} onChange={() => setField('tax_rate_method', 'FIXED')} />}
                    label="แบบ Fixed Rate"
                  />
                  <TextField
                    label="อัตราหัก"
                    value={form.fixed_rate_percent}
                    disabled={form.tax_rate_method !== 'FIXED'}
                    onChange={(e) => setField('fixed_rate_percent', e.target.value.replace(/[^0-9.]/g, ''))}
                    size="small"
                    error={Boolean(errors.fixed_rate_percent)}
                    helperText={errors.fixed_rate_percent}
                    sx={{ width: 140 }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                  <FormControlLabel
                    control={<Radio checked={form.tax_rate_method === 'WITHHOLDING'} onChange={() => setField('tax_rate_method', 'WITHHOLDING')} />}
                    label="หัก ณ ที่จ่าย"
                  />
                  <TextField
                    label="อัตราหัก"
                    value={form.withholding_rate_percent}
                    disabled={form.tax_rate_method !== 'WITHHOLDING'}
                    onChange={(e) => setField('withholding_rate_percent', e.target.value.replace(/[^0-9.]/g, ''))}
                    size="small"
                    error={Boolean(errors.withholding_rate_percent)}
                    helperText={errors.withholding_rate_percent}
                    sx={{ width: 140 }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Stack>
              )}

              {/* SSO on first row, Provident on bottom row */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                <FormControlLabel control={<Checkbox checked={form.sso} onChange={(e) => setField('sso', e.target.checked)} />} label={isDeduction ? 'หักก่อนคำนวณประกันสังคม' : 'คำนวณประกันสังคม'} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <FormControlLabel control={<Checkbox checked={form.provident} onChange={(e) => setField('provident', e.target.checked)} />} label={isDeduction ? 'หักก่อนคำนวณกองทุนสำรอง' : 'คำนวณกองทุนสำรอง'} />
              </Stack>
            </Box>
            {/* Additional include flags removed per request */}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete */}
      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรายการ "{targetRow?.code}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>ยกเลิก</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>{deleting ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังลบ...</>) : (<><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>)}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
