import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Assumed Supabase table: leave_type
// Columns assumed: id (uuid pk), leave_id (text unique), leave_name_th (text), leave_name_en (text), leave_group (text), allowed_days (int), description (text), is_active (bool), created_at, updated_at
// Adjust names to match your actual schema if different.

// MUI Components
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
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

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Reasonable default groups (ปรับได้ตามระบบจริง)
// Updated to match the options shown in the provided screenshot
const LEAVE_GROUPS = [
  'ลากิจ',
  'ลาป่วย',
  'ลาพักร้อน',
  'ลาคลอด',
  'ลาบวช',
  'ลาชดเชย',
  'ลาศึกษาต่อ',
  'ลาเพื่อราชการทหาร',
  'ลาเพื่อฝึกอบรม',
  'ลาอื่น ๆ',
];

const initialForm = {
  id: '',
  leave_id: '',
  leave_name_th: '',
  leave_name_en: '',
  leave_group: 'ลาอื่น ๆ',
  allowed_days: 0,
  description: '',
  is_active: true,
  // basic leave-rule fields (UI only — extend/save as needed)
  deduction_enabled: false,
  deduction_type: 'none', // 'none' | 'hold_pay' | 'hold_pay_over' | 'over_days'
  deduction_days: 0,
  deduction_pay_code: '',
  deduction_combine: false,
  // split rules for monthly vs daily employees
  monthly: {
    enabled: false,
    type: 'hold_pay',
    days: 0,
    pay_code: '',
    pay_name: '',
  },
  daily: {
    enabled: false,
    type: 'hold_pay',
    days: 0,
    pay_code: '',
    pay_name: '',
  },
};

export default function LeaveTypesPage() {
  // Data & table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');
  // search filter: choose which column to search (no 'all' option)
  const [filterField, setFilterField] = React.useState('leave_id');

  // Modal / form state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  // earn/deduct options for pay code dropdown (from payroll_earn_deduct)
  // only load deduction groups: 'รายหักประจำ' and 'รายหักไม่ประจำ'
  const [earnDeductOptions, setEarnDeductOptions] = React.useState([]); // [{ code, name }]

  // Delete dialog
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // dialog tabs
  const [tabIndex, setTabIndex] = React.useState(0);
  // (removed inner monthly/daily tab) previously used rulePanel state

  // Snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('leave_type').select('*', { count: 'exact' });
      if (appliedSearch.trim()) {
        const t = appliedSearch.trim();
        // search only the selected column (no 'all' option)
        if (filterField === 'leave_id') {
          query = query.ilike('leave_id', `%${t}%`);
        } else if (filterField === 'leave_name') {
          query = query.or(`leave_name_th.ilike.%${t}%,leave_name_en.ilike.%${t}%`);
        } else if (filterField === 'leave_group') {
          query = query.ilike('leave_group', `%${t}%`);
        } else {
          // fallback to multi-field search
          query = query.or(`leave_id.ilike.%${t}%,leave_name_th.ilike.%${t}%,leave_name_en.ilike.%${t}%,leave_group.ilike.%${t}%,description.ilike.%${t}%`);
        }
      }
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []);
      setTotal(count || 0);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', severity: 'error' });
    } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage, filterField]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // Load earn/deduct options once
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // load only deduction groups (group_code starting with 'รายหัก') to avoid incomes
        const { data, error } = await supabase.from('payroll_earn_deduct')
          .select('code,name_th')
          .or(`group_code.ilike.%รายหัก%`)
          .order('code');
        if (error) throw error;
        if (!mounted) return;
        setEarnDeductOptions((data || []).map((r) => ({ code: r.code, name: r.name_th || '' })));
      } catch (err) {
        console.warn('Load earn/deduct options failed', err?.message || err);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // When earn/deduct options load, if current form has pay_code values, populate pay_name from options
  React.useEffect(() => {
    if (!earnDeductOptions || earnDeductOptions.length === 0) return;
    setForm((prev) => {
      let changed = false;
      const next = { ...prev };
      if (next.monthly && next.monthly.pay_code) {
        const found = (earnDeductOptions || []).find((o) => o.code === next.monthly.pay_code);
        if (found && next.monthly.pay_name !== found.name) {
          next.monthly = { ...next.monthly, pay_name: found.name };
          changed = true;
        }
      }
      if (next.daily && next.daily.pay_code) {
        const found = (earnDeductOptions || []).find((o) => o.code === next.daily.pay_code);
        if (found && next.daily.pay_name !== found.name) {
          next.daily = { ...next.daily, pay_name: found.name };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [earnDeductOptions]);

  // CRUD handlers
  const handleOpenAdd = () => { setEditMode(false); setForm(initialForm); setErrors({}); setOriginalId(null); setOpenModal(true); };
  const handleOpenEdit = (row) => {
    setEditMode(true);
    // Ensure nested rule objects exist to avoid runtime errors when opening Rules tab
    const rules = row.leave_rules || {};
    const monthly = { ...initialForm.monthly, ...(rules.monthly || {}) };
    const daily = { ...initialForm.daily, ...(rules.daily || {}) };
    // fallbacks for legacy fields: check top-level deduction fields if pay_code not present
    if (!monthly.pay_code) {
      monthly.pay_code = row.deduction_pay_code || row.monthly_pay_code || monthly.pay_code || '';
      monthly.pay_name = row.deduction_pay_name || row.monthly_pay_name || monthly.pay_name || '';
    }
    if (!daily.pay_code) {
      daily.pay_code = row.daily_pay_code || '';
      daily.pay_name = row.daily_pay_name || '';
    }
    setForm({
      id: row.id,
      leave_id: row.leave_id || '',
      leave_name_th: row.leave_name_th || '',
      leave_name_en: row.leave_name_en || '',
      leave_group: row.leave_group || 'ลาอื่น ๆ',
      allowed_days: typeof row.allowed_days === 'number' ? row.allowed_days : (parseInt(row.allowed_days, 10) || 0),
      description: row.description || '',
      is_active: Boolean(row.is_active),
      // include nested rule objects so UI doesn't try to read undefined
      monthly,
      daily,
    });
    setOriginalId(row.id);
    setErrors({});
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { if (deleting) return; setTargetRow(null); setOpenDelete(false); };
  const handleConfirmDelete = async () => {
    if (!targetRow || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('leave_type').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally { setDeleting(false); }
  };

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const setNestedField = (group, k, v) => { setForm((p) => ({ ...p, [group]: { ...p[group], [k]: v } })); };

  const handleSave = async () => {
    if (saving) return;
    const newErrors = {};
    if (!form.leave_id.trim()) newErrors.leave_id = 'กรุณากรอกรหัสประเภทการลา';
    if (!form.leave_name_th.trim()) newErrors.leave_name_th = 'กรุณากรอกชื่อ (ไทย)';
    if (!form.leave_group) newErrors.leave_group = 'เลือกกลุ่ม';
    if (form.leave_id.length > 20) newErrors.leave_id = 'ไม่เกิน 20 ตัวอักษร';
    if (form.leave_name_th.length > 150) newErrors.leave_name_th = 'ไม่เกิน 150 ตัวอักษร';
    if (form.leave_name_en && form.leave_name_en.length > 150) newErrors.leave_name_en = 'ไม่เกิน 150 ตัวอักษร';
    if (form.description && form.description.length > 255) newErrors.description = 'ไม่เกิน 255 ตัวอักษร';
    const allowed = parseInt(form.allowed_days, 10);
    if (isNaN(allowed) || allowed < 0) newErrors.allowed_days = 'ระบุจำนวนวัน >= 0';
    if (allowed > 365) newErrors.allowed_days = 'ไม่เกิน 365 วัน';
    if (Object.keys(newErrors).length) { setErrors(newErrors); setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้อง', severity: 'error' }); return; }

    setSaving(true);
    const leaveRulesPayload = {
      monthly: {
        enabled: Boolean(form.monthly?.enabled),
        type: form.monthly?.type || initialForm.monthly.type,
        days: parseInt(form.monthly?.days || 0, 10) || 0,
        pay_code: form.monthly?.pay_code || null,
        pay_name: form.monthly?.pay_name || null,
      },
      daily: {
        enabled: Boolean(form.daily?.enabled),
        type: form.daily?.type || initialForm.daily.type,
        days: parseInt(form.daily?.days || 0, 10) || 0,
        pay_code: form.daily?.pay_code || null,
        pay_name: form.daily?.pay_name || null,
      },
    };

    const payload = {
      leave_id: form.leave_id.trim(),
      leave_name_th: form.leave_name_th.trim(),
      leave_name_en: form.leave_name_en?.trim() || null,
      leave_group: form.leave_group || null,
      allowed_days: allowed,
      description: form.description?.trim() || null,
      is_active: Boolean(form.is_active),
      leave_rules: leaveRulesPayload,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editMode) {
        const { error } = await supabase.from('leave_type').update(payload).eq('id', originalId);
        if (error) throw error;
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        const { error } = await supabase.from('leave_type').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }
      setOpenModal(false); fetchData();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setErrors((p) => ({ ...p, leave_id: 'รหัสนี้ถูกใช้แล้ว' }));
      }
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดประเภทการลา</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      {/* Search */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="ค้นหาตาม"
          select
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
          sx={{ minWidth: { xs: '100%', md: 200 } }}
        >
          <MenuItem value="leave_id">รหัส</MenuItem>
          <MenuItem value="leave_name">ชื่อ</MenuItem>
          <MenuItem value="leave_group">กลุ่ม</MenuItem>
        </TextField>
        <TextField size="small" label="ค้นหา" fullWidth value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(searchInput); }} />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch(searchInput)}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch(''); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัส</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อประเภทการลา (ไทย)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อประเภทการลา (อังกฤษ)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>กลุ่ม</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>วันอนุญาต (วัน)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.leave_id}</TableCell>
                  <TableCell>{row.leave_name_th || ''}</TableCell>
                  <TableCell>{row.leave_name_en || ''}</TableCell>
                  <TableCell>{row.leave_group || ''}</TableCell>
                  <TableCell>{row.allowed_days ?? ''}</TableCell>
                  <TableCell>{row.description || ''}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => handleOpenEdit(row)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => handleAskDelete(row)} disabled={deleting}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

      {/* Add / Edit Dialog */}
      <Dialog
        open={openModal}
        onClose={() => { if (saving) return; handleCloseModal(); }}
        disableEscapeKeyDown={saving}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            // remove the black focus outline inside this dialog when navigating with Tab
            // scoped to the dialog so it doesn't affect other parts of the app
            '& *:focus': {
              outline: 'none !important',
              boxShadow: 'none !important',
            },
            // MUI focus-visible class
            '& .Mui-focusVisible': {
              outline: 'none !important',
              boxShadow: 'none !important',
            },
          },
        }}
      >
        <DialogTitle>{editMode ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'}</DialogTitle>
        <DialogContent dividers>
          {/* Tabs to split fields into General and Leave Rules */}
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 1 }}>
            <Tab label="ทั่วไป" />
            <Tab label="ข้อกำหนดการลา" />
          </Tabs>
          {tabIndex === 0 && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField label="รหัส" value={form.leave_id} onChange={(e) => setField('leave_id', e.target.value)} inputProps={{ maxLength: 20 }} required size="small" disabled={editMode} error={Boolean(errors.leave_id)} helperText={errors.leave_id} />
              <TextField label="ชื่อ (ไทย)" value={form.leave_name_th} onChange={(e) => setField('leave_name_th', e.target.value)} inputProps={{ maxLength: 150 }} required size="small" error={Boolean(errors.leave_name_th)} helperText={errors.leave_name_th} />
              <TextField label="ชื่อ (อังกฤษ)" value={form.leave_name_en} onChange={(e) => setField('leave_name_en', e.target.value)} inputProps={{ maxLength: 150 }} size="small" error={Boolean(errors.leave_name_en)} helperText={errors.leave_name_en} />
              <TextField label="กลุ่ม" select size="small" value={form.leave_group} onChange={(e) => setField('leave_group', e.target.value)} error={Boolean(errors.leave_group)} helperText={errors.leave_group}>
                {LEAVE_GROUPS.map((g) => (<MenuItem key={g} value={g}>{g}</MenuItem>))}
              </TextField>
              <TextField label="วันอนุญาต (วัน)" value={form.allowed_days} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setField('allowed_days', val); }} inputProps={{ maxLength: 3, inputMode: 'numeric', style: { textAlign: 'right' } }} size="small" error={Boolean(errors.allowed_days)} helperText={errors.allowed_days} />
              <TextField label="รายละเอียด" value={form.description} onChange={(e) => setField('description', e.target.value)} inputProps={{ maxLength: 255 }} size="small" multiline minRows={3} error={Boolean(errors.description)} helperText={errors.description} />
            </Stack>
          )}
          {tabIndex === 1 && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {/* Render side-by-side panels resembling the provided screenshot */}
              <Stack direction="row" spacing={2}>
                <Stack flex={1} sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <FormControlLabel control={<Checkbox checked={Boolean(form.monthly.enabled)} onChange={(e) => setNestedField('monthly', 'enabled', e.target.checked)} />} label="พนักงานรายเดือน" />
                  <FormControl component="fieldset" sx={{ mt: 1 }}>
                    <RadioGroup disabled={!form.monthly.enabled} value={form.monthly.type} onChange={(e) => setNestedField('monthly', 'type', e.target.value)}>
                      <FormControlLabel value="hold_pay" control={<Radio disabled={!form.monthly.enabled} />} label="หักเงินเมื่อลา" />
                      <FormControlLabel value="hold_pay_over" control={<Radio disabled={!form.monthly.enabled} />} label="หักเงินเมื่อลาเกินจำนวนวันที่อนุญาต" />
                      <FormControlLabel value="over_days" control={<Radio disabled={!form.monthly.enabled} />} label="เมื่อมาเกินจำนวนวันที่กำหนด" />
                    </RadioGroup>
                  </FormControl>
                  <TextField disabled={!form.monthly.enabled || form.monthly.type !== 'over_days'} label="จำนวนวัน" value={form.monthly.days} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setNestedField('monthly', 'days', val); }} size="small" inputProps={{ maxLength: 3, inputMode: 'numeric', style: { textAlign: 'right' } }} sx={{ mt: 1 }} />
                  <TextField
                    select
                    disabled={!form.monthly.enabled}
                    label="รหัสรายหัก"
                    value={form.monthly.pay_code || ''}
                    onChange={(e) => {
                      const code = e.target.value || '';
                      setNestedField('monthly', 'pay_code', code);
                      const found = (earnDeductOptions || []).find((o) => o.code === code);
                      setNestedField('monthly', 'pay_name', found ? found.name : '');
                    }}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="">- ไม่เลือก -</MenuItem>
                    {(earnDeductOptions || []).map((opt) => (
                      <MenuItem key={opt.code} value={opt.code}>{opt.code} — {opt.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField disabled={!form.monthly.enabled} label="ชื่อรายหัก" value={form.monthly.pay_name} onChange={(e) => setNestedField('monthly', 'pay_name', e.target.value)} size="small" sx={{ mt: 1 }} />
                  {/* 'รวมกับการคำนวณอื่น ๆ' removed as requested */}
                </Stack>

                <Stack flex={1} sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <FormControlLabel control={<Checkbox checked={Boolean(form.daily.enabled)} onChange={(e) => setNestedField('daily', 'enabled', e.target.checked)} />} label="พนักงานรายวัน" />
                  <FormControl component="fieldset" sx={{ mt: 1 }}>
                    <RadioGroup disabled={!form.daily.enabled} value={form.daily.type} onChange={(e) => setNestedField('daily', 'type', e.target.value)}>
                      <FormControlLabel value="hold_pay" control={<Radio disabled={!form.daily.enabled} />} label="หักเงินเมื่อลา" />
                      <FormControlLabel value="hold_pay_over" control={<Radio disabled={!form.daily.enabled} />} label="หักเงินเมื่าลาเกินจำนวนวันที่อนุญาต" />
                      <FormControlLabel value="over_days" control={<Radio disabled={!form.daily.enabled} />} label="เมื่อมาเกินจำนวนวันที่กำหนด" />
                    </RadioGroup>
                  </FormControl>
                  <TextField disabled={!form.daily.enabled || form.daily.type !== 'over_days'} label="จำนวนวัน" value={form.daily.days} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setNestedField('daily', 'days', val); }} size="small" inputProps={{ maxLength: 3, inputMode: 'numeric', style: { textAlign: 'right' } }} sx={{ mt: 1 }} />
                  <TextField
                    select
                    disabled={!form.daily.enabled}
                    label="รหัสรายหัก"
                    value={form.daily.pay_code || ''}
                    onChange={(e) => {
                      const code = e.target.value || '';
                      setNestedField('daily', 'pay_code', code);
                      const found = (earnDeductOptions || []).find((o) => o.code === code);
                      setNestedField('daily', 'pay_name', found ? found.name : '');
                    }}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="">- ไม่เลือก -</MenuItem>
                    {(earnDeductOptions || []).map((opt) => (
                      <MenuItem key={opt.code} value={opt.code}>{opt.code} — {opt.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField disabled={!form.daily.enabled} label="ชื่อรายหัก" value={form.daily.pay_name} onChange={(e) => setNestedField('daily', 'pay_name', e.target.value)} size="small" sx={{ mt: 1 }} />
                  {/* 'รวมกับการคำนวณอื่น ๆ' removed as requested */}
                </Stack>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรหัส "{targetRow?.leave_id}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>ยกเลิก</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>{deleting ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังลบ...</>) : (<><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>)}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
