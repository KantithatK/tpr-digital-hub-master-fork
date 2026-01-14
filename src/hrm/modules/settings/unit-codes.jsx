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

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// NOTE: This page mimics the layout/UX style from departments.jsx but simplified
// Table schema assumption (adjust if different):
// table: unit_code { id (uuid), unit_id (text unique), unit_name_th (text), unit_name_en (text), description (text), is_active (bool), created_at, updated_at }
// If actual schema differs, adjust column names accordingly.

const initialForm = {
  id: '',
  unit_id: '',
  unit_name_th: '',
  unit_name_en: '',
  description: '',
  is_active: true,
};

export default function UnitCodesPage() {
  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // search state
  const [searchField, setSearchField] = React.useState('unit_id');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'unit_id', text: '' });

  // form/modal state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null); // uuid pk
  const [saving, setSaving] = React.useState(false);

  // delete state
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('unit_code').select('*', { count: 'exact' });
      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        query = query.ilike(appliedSearch.field, `%${t}%`);
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
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // handlers
  const handleOpenAdd = () => {
    setEditMode(false);
    setForm(initialForm);
    setErrors({});
    setOriginalId(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      id: row.id,
      unit_id: row.unit_id || '',
      unit_name_th: row.unit_name_th || '',
      unit_name_en: row.unit_name_en || '',
      description: row.description || '',
      is_active: Boolean(row.is_active),
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
      const { error } = await supabase.from('unit_code').delete().eq('id', targetRow.id);
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
    if (!form.unit_id.trim()) newErrors.unit_id = 'กรุณากรอกรหัสหน่วยนับ';
    if (!form.unit_name_th.trim()) newErrors.unit_name_th = 'กรุณากรอกชื่อหน่วยนับ (ไทย)';
    if (form.unit_id && form.unit_id.length > 20) newErrors.unit_id = 'ไม่เกิน 20 ตัวอักษร';
    if (form.unit_name_th && form.unit_name_th.length > 150) newErrors.unit_name_th = 'ไม่เกิน 150 ตัวอักษร';
    if (form.unit_name_en && form.unit_name_en.length > 150) newErrors.unit_name_en = 'ไม่เกิน 150 ตัวอักษร';
    if (form.description && form.description.length > 255) newErrors.description = 'ไม่เกิน 255 ตัวอักษร';

    if (Object.keys(newErrors).length) { setErrors(newErrors); setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้อง', severity: 'error' }); return; }

    setSaving(true);
    const payload = {
      unit_id: form.unit_id.trim(),
      unit_name_th: form.unit_name_th.trim(),
      unit_name_en: form.unit_name_en?.trim() || null,
      description: form.description?.trim() || null,
      is_active: Boolean(form.is_active),
      updated_at: new Date().toISOString(),
    };
    try {
      if (editMode) {
        const { error } = await supabase.from('unit_code').update(payload).eq('id', originalId);
        if (error) throw error;
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        const { error } = await supabase.from('unit_code').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }
      setOpenModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setErrors((p) => ({ ...p, unit_id: 'รหัสหน่วยนับนี้ถูกใช้แล้ว' }));
      }
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรหัสหน่วยนับ</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      {/* Filter Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="unit-code-search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="unit-code-search-field-label"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => {
              const val = e.target.value;
              setSearchField(val);
            }}
          >
            <MenuItem value="unit_id">รหัสหน่วยนับ</MenuItem>
            <MenuItem value="unit_name_th">ชื่อหน่วยนับ (ไทย)</MenuItem>
            <MenuItem value="unit_name_en">ชื่อหน่วยนับ (อังกฤษ)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          fullWidth
          label="คำค้น"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput }); }}
        />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'unit_id', text: '' }); setSearchField('unit_id'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสหน่วยนับ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อหน่วยนับ (ไทย)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อหน่วยนับ (อังกฤษ)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.unit_id}</TableCell>
                  <TableCell>{row.unit_name_th || ''}</TableCell>
                  <TableCell>{row.unit_name_en || ''}</TableCell>
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

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="จำนวนแถวต่อหน้า"
      />

      {/* Add/Edit Modal */}
  <Dialog open={openModal} onClose={() => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="sm">
        <DialogTitle>{editMode ? 'แก้ไขรหัสหน่วยนับ' : 'เพิ่มรหัสหน่วยนับ'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="รหัสหน่วยนับ" value={form.unit_id} onChange={(e) => setField('unit_id', e.target.value)} inputProps={{ maxLength: 20 }} required size="small" disabled={editMode} error={Boolean(errors.unit_id)} helperText={errors.unit_id} />
            <TextField label="ชื่อหน่วยนับ (ไทย)" value={form.unit_name_th} onChange={(e) => setField('unit_name_th', e.target.value)} inputProps={{ maxLength: 150 }} required size="small" error={Boolean(errors.unit_name_th)} helperText={errors.unit_name_th} />
            <TextField label="ชื่อหน่วยนับ (อังกฤษ)" value={form.unit_name_en} onChange={(e) => setField('unit_name_en', e.target.value)} inputProps={{ maxLength: 150 }} size="small" error={Boolean(errors.unit_name_en)} helperText={errors.unit_name_en} />
            <TextField label="รายละเอียด" value={form.description} onChange={(e) => setField('description', e.target.value)} inputProps={{ maxLength: 255 }} size="small" multiline minRows={3} error={Boolean(errors.description)} helperText={errors.description} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Modal */}
  <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรหัส "{targetRow?.unit_id}" หรือไม่?</Typography>
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
