import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Material UI
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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
import Checkbox from '@mui/material/Checkbox';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Initial form matching screenshot fields
const initialForm = {
  id: '',
  template_code: '',
  template_name_th: '',
  template_name_en: '',
  category: 'System Group', // readonly/display only in UI per screenshot
  subject_th: '',
  subject_en: '',
  include_data_label: false,
  description: '',
};

export default function EmailTemplatesPage() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [searchField, setSearchField] = React.useState('template_code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'template_code', text: '' });

  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('email_templates').select('*', { count: 'exact' });
      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        query = query.ilike(appliedSearch.field, `%${t}%`);
      }
  const from = page * rowsPerPage;
  const to = from + rowsPerPage - 1;
  // Default sorting: by template_code ascending
  query = query.order('template_code', { ascending: true }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []);
      setTotal(count || 0);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenAdd = () => { setEditMode(false); setForm(initialForm); setErrors({}); setOriginalId(null); setOpenModal(true); };

  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      id: row.id,
      template_code: row.template_code || '',
      template_name_th: row.template_name_th || '',
      template_name_en: row.template_name_en || '',
      category: row.category || 'System Group',
      subject_th: row.subject_th || '',
      subject_en: row.subject_en || '',
      include_data_label: Boolean(row.include_data_label),
      description: row.description || '',
    });
    setOriginalId(row.id);
    setErrors({});
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { setTargetRow(null); setOpenDelete(false); };

  const handleConfirmDelete = async () => {
    if (!targetRow) return;
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally { setDeleting(false); }
  };

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const handleSave = async () => {
    if (saving) return;
    const newErrors = {};
    if (!form.template_code.trim()) newErrors.template_code = 'กรุณากรอกรหัสรูปแบบอีเมล';
    if (!form.template_name_th.trim()) newErrors.template_name_th = 'กรุณากรอกชื่อรูปแบบอีเมล (ไทย)';
    if (form.template_code && form.template_code.length > 50) newErrors.template_code = 'ไม่เกิน 50 ตัวอักษร';
    if (form.template_name_th && form.template_name_th.length > 200) newErrors.template_name_th = 'ไม่เกิน 200 ตัวอักษร';
    if (form.template_name_en && form.template_name_en.length > 200) newErrors.template_name_en = 'ไม่เกิน 200 ตัวอักษร';
    if (form.description && form.description.length > 1000) newErrors.description = 'ไม่เกิน 1000 ตัวอักษร';

    if (Object.keys(newErrors).length) { setErrors(newErrors); setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้อง', severity: 'error' }); return; }

    setSaving(true);
    const payload = {
      template_code: form.template_code.trim(),
      template_name_th: form.template_name_th.trim(),
      template_name_en: form.template_name_en?.trim() || null,
      category: form.category || 'System Group',
      subject_th: form.subject_th?.trim() || null,
      subject_en: form.subject_en?.trim() || null,
      include_data_label: Boolean(form.include_data_label),
      description: form.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editMode) {
        const { error } = await supabase.from('email_templates').update(payload).eq('id', originalId);
        if (error) throw error;
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        // pre-check duplicate code to provide friendly message
        const { data: existing, error: chkErr } = await supabase.from('email_templates').select('id').eq('template_code', payload.template_code).maybeSingle();
        if (chkErr) throw chkErr;
        if (existing && existing.id) {
          setErrors((e) => ({ ...e, template_code: 'รหัสรูปแบบอีเมลนี้ถูกใช้แล้ว' }));
          setSnackbar({ open: true, message: 'รหัสรูปแบบอีเมลนี้ถูกใช้งานแล้ว', severity: 'error' });
          setSaving(false);
          return;
        }
        const { error } = await supabase.from('email_templates').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }
      setOpenModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.message || JSON.stringify(err);
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setErrors((p) => ({ ...p, template_code: 'รหัสรูปแบบอีเมลนี้ถูกใช้แล้ว' }));
      }
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรูปแบบอีเมล</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="email-template-search-field-label">ค้นหาตาม</InputLabel>
          <Select labelId="email-template-search-field-label" label="ค้นหาตาม" value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <MenuItem value="template_code">รหัสรูปแบบอีเมล</MenuItem>
            <MenuItem value="template_name_th">ชื่อรูปแบบอีเมล (ไทย)</MenuItem>
            <MenuItem value="template_name_en">ชื่อรูปแบบอีเมล (อังกฤษ)</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" fullWidth label="คำค้น" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput }); }} />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'template_code', text: '' }); setSearchField('template_code'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสรูปแบบอีเมล</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบอีเมล</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบอีเมล (Eng)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.template_code}</TableCell>
                  <TableCell>{row.template_name_th || ''}</TableCell>
                  <TableCell>{row.template_name_en || ''}</TableCell>
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

      <Dialog open={openModal} onClose={() => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขรูปแบบอีเมล' : 'เพิ่มรูปแบบอีเมล'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Make each field appear on its own row (one-line-per-field) */}
            <Stack direction="column" spacing={2}>
              <TextField fullWidth label="รหัสรูปแบบอีเมล" value={form.template_code} onChange={(e) => setField('template_code', e.target.value)} inputProps={{ maxLength: 50 }} required size="small" disabled={editMode} error={Boolean(errors.template_code)} helperText={errors.template_code} />
              <TextField fullWidth label="ชื่อรูปแบบอีเมล (ไทย)" value={form.template_name_th} onChange={(e) => setField('template_name_th', e.target.value)} inputProps={{ maxLength: 200 }} required size="small" error={Boolean(errors.template_name_th)} helperText={errors.template_name_th} />
              <TextField fullWidth label="ชื่อรูปแบบอีเมล (Eng)" value={form.template_name_en} onChange={(e) => setField('template_name_en', e.target.value)} inputProps={{ maxLength: 200 }} size="small" error={Boolean(errors.template_name_en)} helperText={errors.template_name_en} />
              {/* category hidden for now */}
              <TextField fullWidth label="ระบุหัวข้ออีเมล (ไทย)" value={form.subject_th} onChange={(e) => setField('subject_th', e.target.value)} size="small" />
              <TextField fullWidth label="ระบุหัวข้ออีเมล (Eng)" value={form.subject_en} onChange={(e) => setField('subject_en', e.target.value)} size="small" />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Checkbox checked={Boolean(form.include_data_label)} onChange={(e) => setField('include_data_label', e.target.checked)} />
              <Typography>เพิ่มชื่อเรียกของข้อมูลต่อท้ายหัวข้อของอีเมล</Typography>
            </Stack>

            <TextField label="รายละเอียด" value={form.description} onChange={(e) => setField('description', e.target.value)} inputProps={{ maxLength: 1000 }} size="small" multiline minRows={6} error={Boolean(errors.description)} helperText={errors.description} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรหัส "{targetRow?.template_code}" หรือไม่?</Typography>
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
