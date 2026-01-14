import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Icon from '@mui/material/Icon';
import { supabase } from '@/lib/supabaseClient';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
    Divider,
} from '@mui/material';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const initialForm = {
  id: '',
  code: '',
  name: '',
  daily_wage_code: '',
  daily_wage_desc: '',
  hourly_wage_code: '',
  hourly_wage_desc: '',
  calculate_one_day: false,
  // holiday-specific wage selections
  holiday_emp_daily_enabled: false,
  holiday_daily_wage_code: '',
  holiday_daily_wage_desc: '',
  holiday_emp_hourly_enabled: false,
  holiday_hourly_wage_code: '',
  holiday_hourly_wage_desc: '',
  holiday_pay_enabled: false,
  holiday_max_days: '',
  holiday_pay_daily: false,
  holiday_pay_hourly: false,
  // additional holiday payment rules
  holiday_pay_birth_same_day: false,
  holiday_pay_overtime_same_day: false,
};

function formatRunning(n) {
  return String(n).padStart(5, '0');
}

function generateCode(existingRows = []) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  // find max running for current year+month prefix
  const prefix = `PTS${yyyy}${mm}-`;
  let max = 0;
  existingRows.forEach((r) => {
    if (r.code && r.code.startsWith(prefix)) {
      const ran = parseInt(r.code.slice(prefix.length), 10);
      if (!Number.isNaN(ran) && ran > max) max = ran;
    }
  });
  return `${prefix}${formatRunning(max + 1)}`;
}

// Simple picker dialog for earn/deduct items (mocked list)
function EarnDeductPicker({ open, onClose, onSelect }) {
  const [items, setItems] = React.useState([]);
  const [loadingItems, setLoadingItems] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open) return;
      setLoadingItems(true);
      try {
        // fetch code + name_th from payroll_earn_deduct
        const { data, error } = await supabase.from('payroll_earn_deduct').select('code, name_th').order('code', { ascending: true }).limit(100);
        if (error) throw error;
        if (!mounted) return;
        const mapped = (data || []).map((r) => ({ code: r.code, desc: r.name_th || '' }));
        setItems(mapped);
      } catch (err) {
        console.error('Failed to load earn/deduct items:', err?.message || err);
        setItems([]);
      } finally {
        if (mounted) setLoadingItems(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [open]);

  return (
    <Dialog open={open} onClose={() => onClose()} fullWidth maxWidth="sm">
      <DialogTitle>รายได้-รายหัก</DialogTitle>
      <Divider />
      <DialogContent>
        {loadingItems ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}><CircularProgress size={20} /><Typography variant="body2" sx={{ ml: 1 }}>กำลังโหลด...</Typography></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>รหัสรายได้-รายหัก</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อรายได้-รายหัก</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบรายการ</Typography></TableCell></TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.code} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>{it.code}</TableCell>
                    <TableCell>{it.desc}</TableCell>
                    <TableCell align="right"><Button size="small" variant="outlined" onClick={() => { onSelect(it); onClose(); }}>เลือก</Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={() => onClose()}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PayrollProcessingPatternsPage() {
  const [rows, setRows] = React.useState([]);
  const [searchField, setSearchField] = React.useState('code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [openModal, setOpenModal] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [editMode, setEditMode] = React.useState(false);
  const [pickerOpenFor, setPickerOpenFor] = React.useState(null); // 'daily'|'hourly'
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.useMemo(() => React.forwardRef(function AlertComponent(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; }), []);

  React.useEffect(() => {
    // load rows from database
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('payroll_processing_patterns').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        if (!mounted) return;
        setRows(data || []);
      } catch (err) {
        console.error('Failed to load payroll processing patterns:', err?.message || err);
        setSnackbar({ open: true, message: 'ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้', severity: 'error' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleOpenAdd = () => {
    const code = generateCode(rows);
    setForm({ ...initialForm, code });
    setEditMode(false);
    setOpenModal(true);
  };

  const handleOpenEdit = (row) => {
    setForm({ ...row });
    setEditMode(true);
    setOpenModal(true);
  };

  const handleDelete = (id) => {
    // optimistic local delete followed by DB delete
    setRows((prev) => prev.filter((r) => r.id !== id));
    (async () => {
      try {
        const { error } = await supabase.from('payroll_processing_patterns').delete().eq('id', id);
        if (error) throw error;
        setSnackbar({ open: true, message: 'ลบเรียบร้อย', severity: 'success' });
      } catch (err) {
        console.error('Failed to delete:', err?.message || err);
        setSnackbar({ open: true, message: 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
        // reload rows to restore state
        try {
          const { data } = await supabase.from('payroll_processing_patterns').select('*').order('created_at', { ascending: false }).limit(500);
          setRows(data || []);
        } catch {
          // ignore
        }
      }
    })();
  };

  const handleSave = () => {
    if (!form.name || !form.name.trim()) {
      setSnackbar({ open: true, message: 'กรุณากรอกชื่อรูปแบบการประมวลผล', severity: 'error' });
      return;
    }

    // prepare payload with correct types
    const payload = {
      code: form.code,
      name: form.name,
      daily_wage_code: form.daily_wage_code || null,
      daily_wage_desc: form.daily_wage_desc || null,
      hourly_wage_code: form.hourly_wage_code || null,
      hourly_wage_desc: form.hourly_wage_desc || null,
      calculate_one_day: !!form.calculate_one_day,
      holiday_pay_enabled: !!form.holiday_pay_enabled,
      holiday_max_days: form.holiday_max_days ? parseInt(form.holiday_max_days, 10) : null,
      holiday_emp_daily_enabled: !!form.holiday_emp_daily_enabled,
      holiday_daily_wage_code: form.holiday_daily_wage_code || null,
      holiday_daily_wage_desc: form.holiday_daily_wage_desc || null,
      holiday_emp_hourly_enabled: !!form.holiday_emp_hourly_enabled,
      holiday_hourly_wage_code: form.holiday_hourly_wage_code || null,
      holiday_hourly_wage_desc: form.holiday_hourly_wage_desc || null,
      holiday_pay_daily: !!form.holiday_pay_daily,
      holiday_pay_hourly: !!form.holiday_pay_hourly,
      holiday_pay_birth_same_day: !!form.holiday_pay_birth_same_day,
      holiday_pay_overtime_same_day: !!form.holiday_pay_overtime_same_day,
    };

    setLoading(true);
    (async () => {
      try {
        if (editMode && form.id) {
          const { data, error } = await supabase.from('payroll_processing_patterns').update(payload).eq('id', form.id).select().single();
          if (error) throw error;
          setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
          setSnackbar({ open: true, message: 'แก้ไขเรียบร้อย', severity: 'success' });
        } else {
          // insert
          const { data, error } = await supabase.from('payroll_processing_patterns').insert([payload]).select().single();
          if (error) throw error;
          // prepend new row
          setRows((prev) => [data, ...prev]);
          setSnackbar({ open: true, message: 'บันทึกเรียบร้อย', severity: 'success' });
        }
        setOpenModal(false);
      } catch (err) {
        console.error('Failed to save payroll processing pattern:', err?.message || err);
        setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  };

  const handlePickerSelect = (item) => {
    if (pickerOpenFor === 'daily') setForm((p) => ({ ...p, daily_wage_code: item.code, daily_wage_desc: item.desc }));
    if (pickerOpenFor === 'hourly') setForm((p) => ({ ...p, hourly_wage_code: item.code, hourly_wage_desc: item.desc }));
    if (pickerOpenFor === 'holiday_daily') setForm((p) => ({ ...p, holiday_daily_wage_code: item.code, holiday_daily_wage_desc: item.desc }));
    if (pickerOpenFor === 'holiday_hourly') setForm((p) => ({ ...p, holiday_hourly_wage_code: item.code, holiday_hourly_wage_desc: item.desc }));
    setPickerOpenFor(null);
  };

  const filtered = rows.filter((r) => {
    if (!appliedSearch) return true;
    const t = appliedSearch.toLowerCase();
    if (searchField === 'code') return (r.code || '').toLowerCase().includes(t);
    return (r.name || '').toLowerCase().includes(t);
  });

  const from = page * rowsPerPage;
  const to = from + rowsPerPage;
  const pagedRows = filtered.slice(from, to);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">กำหนดรูปแบบการประมวลผลเข้าระบบเงินเดือน</Typography>
        <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="ค้นหาตาม"
          select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          sx={{ minWidth: { xs: '100%', md: 220 } }}
        >
          <MenuItem value="code">รหัส</MenuItem>
          <MenuItem value="name">ชื่อรูปแบบ</MenuItem>
        </TextField>
        <TextField size="small" label="ค้นหา" fullWidth value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(searchInput); }} />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => { setAppliedSearch(searchInput); setPage(0); }}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch(''); setPage(0); setSearchField('code'); }}>ล้าง</Button>
        </Stack>
      </Stack>

      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รหัส</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="right">การกระทำ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : pagedRows.length === 0 ? (
              <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              pagedRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => handleOpenEdit(r)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

      {/* Add / Edit Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขรูปแบบการประมวลผล' : 'เพิ่มรูปแบบการประมวลผล'}</DialogTitle>
        <Divider />
        <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Code and Name on one responsive row: left = code (fixed/narrow), right = name (flex) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 1 }}>
              <TextField label="รหัสรูปแบบการประมวลผล" size="small" value={form.code} InputProps={{ readOnly: true }} fullWidth />
              <TextField label="ชื่อรูปแบบการประมวลผล" size="small" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} fullWidth />
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography variant="subtitle2">ค่าแรงพนักงาน</Typography>
              {/* Daily on first row, Hourly moved to a separate row below (per request) */}
              <Stack spacing={1} sx={{ mt: 1 }}>
                {/* Daily wage: full row */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                    <TextField
                      label="ค่าแรงพนักงานรายวัน"
                      size="small"
                      value={form.daily_wage_code || ''}
                      sx={{ flex: 1 }}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPickerOpenFor('daily')}>
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField label="" size="small" value={form.daily_wage_desc || ''} sx={{ flex: 1 }} InputProps={{ readOnly: true }} />
                  </Stack>
                </Stack>

                {/* Hourly wage: moved to its own row */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                    <TextField
                      label="ค่าแรงพนักงานรายชั่วโมง"
                      size="small"
                      value={form.hourly_wage_code || ''}
                      sx={{ flex: 1 }}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPickerOpenFor('hourly')}>
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField label="" size="small" value={form.hourly_wage_desc || ''} sx={{ flex: 1 }} InputProps={{ readOnly: true }} />
                  </Stack>
                </Stack>
                {/* Calculation method for days with missing time entries */}
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="body2">วิธีการคำนวณสำหรับวันที่มีการกรอกเวลาผิดพลาด (ไม่มีจำนวนเวลาทำงาน)</Typography>
                  <FormControlLabel
                    control={(
                      <Checkbox checked={form.calculate_one_day} onChange={(e) => setForm((p) => ({ ...p, calculate_one_day: e.target.checked }))} />
                    )}
                    label="คำนวณเป็นเงิน 1 วันทำงาน"
                  />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2">วันหยุดนักขัตฤกษ์</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                  <FormControlLabel sx={{ alignItems: 'center', ml: 0 }} control={<Checkbox checked={form.holiday_pay_enabled} onChange={(e) => setForm((p) => ({ ...p, holiday_pay_enabled: e.target.checked }))} />} label="ต้องการจ่ายค่าแรงสำหรับวันหยุดนักขัตฤกษ์" />
                  <TextField
                    label="ไม่เกิน (วัน)"
                    size="small"
                    value={form.holiday_max_days}
                    onChange={(e) => setForm((p) => ({ ...p, holiday_max_days: e.target.value.replace(/\D/g, '') }))}
                    sx={{ width: 160 }}
                    disabled={!form.holiday_pay_enabled}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', style: { textAlign: 'center' } }}
                  />
                </Stack>

                {/* Employee types with pickers (daily / hourly) */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>ประเภทพนักงาน</Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '140px 1fr 1fr' }, gap: 1, alignItems: 'center' }}>
                      <FormControlLabel sx={{ alignItems: 'center', ml: 0 }} control={<Checkbox checked={form.holiday_emp_daily_enabled} disabled={!form.holiday_pay_enabled} onChange={(e) => setForm((p) => ({ ...p, holiday_emp_daily_enabled: e.target.checked }))} />} label="รายวัน" />
                      <TextField
                        size="small"
                        value={form.holiday_daily_wage_code || ''}
                        sx={{ width: '100%' }}
                        disabled={!(form.holiday_pay_enabled && form.holiday_emp_daily_enabled)}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" disabled={!(form.holiday_pay_enabled && form.holiday_emp_daily_enabled)} onClick={() => setPickerOpenFor('holiday_daily')}>
                                <MoreHorizIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField size="small" value={form.holiday_daily_wage_desc || ''} sx={{ width: '100%' }} InputProps={{ readOnly: true }} disabled={!(form.holiday_pay_enabled && form.holiday_emp_daily_enabled)} />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '140px 1fr 1fr' }, gap: 1, alignItems: 'center' }}>
                      <FormControlLabel sx={{ alignItems: 'center', ml: 0 }} control={<Checkbox checked={form.holiday_emp_hourly_enabled} disabled={!form.holiday_pay_enabled} onChange={(e) => setForm((p) => ({ ...p, holiday_emp_hourly_enabled: e.target.checked }))} />} label="รายชั่วโมง" />
                      <TextField
                        size="small"
                        value={form.holiday_hourly_wage_code || ''}
                        sx={{ width: '100%' }}
                        disabled={!(form.holiday_pay_enabled && form.holiday_emp_hourly_enabled)}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" disabled={!(form.holiday_pay_enabled && form.holiday_emp_hourly_enabled)} onClick={() => setPickerOpenFor('holiday_hourly')}>
                                <MoreHorizIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField size="small" value={form.holiday_hourly_wage_desc || ''} sx={{ width: '100%' }} InputProps={{ readOnly: true }} disabled={!(form.holiday_pay_enabled && form.holiday_emp_hourly_enabled)} />
                    </Box>
                  </Stack>
                </Box>

                {/* Additional holiday payment rules */}
                <Stack spacing={1} sx={{ mt: 1 }}>

                  <Box sx={{ pt: 1 }}>
                    <Typography variant="body2">รูปแบบการจ่ายค่าจ้างสำหรับวันหยุดนักขัตฤกษ์ที่มีการคลอดในวันเดียวกัน</Typography>
                    <FormControlLabel sx={{ alignItems: 'center', ml: 0 }}
                      control={(
                        <Checkbox checked={form.holiday_pay_birth_same_day} disabled={!form.holiday_pay_enabled} onChange={(e) => setForm((p) => ({ ...p, holiday_pay_birth_same_day: e.target.checked }))} />
                      )}
                      label="จ่ายค่าจ้างวันหยุดนักขัตฤกษ์"
                    />
                  </Box>

                  <Box sx={{ pt: 1 }}>
                    <Typography variant="body2">รูปแบบการจ่ายค่าจ้างสำหรับวันหยุดนักขัตฤกษ์ที่มีการทำงานล่วงเวลาในวันหยุดในวันเดียวกัน</Typography>
                    <FormControlLabel sx={{ alignItems: 'center', ml: 0 }}
                      control={(
                        <Checkbox checked={form.holiday_pay_overtime_same_day} disabled={!form.holiday_pay_enabled} onChange={(e) => setForm((p) => ({ ...p, holiday_pay_overtime_same_day: e.target.checked }))} />
                      )}
                      label="จ่ายค่าจ้างวันหยุดนักขัตฤกษ์"
                    />
                  </Box>

                  <Typography variant="caption" color="error" component="div">
                    <div>หมายเหตุ: กรณีกำหนดเงื่อนไข ชั่วโมงการทำงาน สำหรับประมวลผลค่าแรงเป็น "ชั่วโมงการทำงานตามตารางการทำงาน" ระบบจะคำนวณค่าแรงของ พนักงานรายชั่วโมง ในวันหยุดนักขัตฤกษ์ ตามชั่วโมงกะงานติดตัวพนักงาน</div>
                  </Typography>
                </Stack>
              </Stack>
            </Box>

          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <EarnDeductPicker open={Boolean(pickerOpenFor)} onClose={() => setPickerOpenFor(null)} onSelect={handlePickerSelect} />
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
