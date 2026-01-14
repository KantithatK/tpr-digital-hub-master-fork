import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
// Assumed schema:
// time_device_format: { id uuid pk, device_format_id text unique, device_format_name_th text (optional now), device_format_name_en text (optional), device_format_desc text, device_format_code text, device_format_no text, created_at, updated_at }
// time_device_format_detail: { id uuid pk, format_id uuid fk -> time_device_format.id, seq int, field_typ text, start_pos int, end_pos int }
// Adjust field/table names to actual DB later.

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
// Removed Checkbox (is_active) per request

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';

// ----- Helpers -----
const initialForm = {
  id: '',
  device_format_id: '',
  // Removed name TH / EN per user request
  device_format_code: '', // ชื่อเครื่องลงเวลา (จากภาพ: ชื่อเครื่องลงเวลา)
  device_format_no: '',   // หมายเลขเครื่องลงเวลา
  device_format_desc: '', // รายละเอียดเพิ่มเติม (ชื่อยี่ห้อเครื่องลงเวลา)
  details: [
    // { tempId, id, seq, field_typ, start_pos, end_pos }
  ],
};

function createEmptyDetail(nextSeq) {
  return { tempId: crypto.randomUUID(), id: null, seq: nextSeq, field_typ: '', start_pos: '', end_pos: '' };
}

// Data type options (Thai labels kept as values for simplicity)
const DATA_TYPE_OPTIONS = [
  'ปี', // Year
  'เดือน', // Month
  'วัน', // Day
  'ชั่วโมง', // Hour
  'นาที', // Minute
  'วินาที', // Second
  'รหัสพนักงาน', // Employee Code
];

// Search field options mapping (value -> label)
const SEARCH_FIELD_OPTIONS = [
  { value: 'device_format_id', label: 'รหัสรูปแบบ' },
  { value: 'device_format_code', label: 'ชื่อเครื่องลงเวลา' },
  { value: 'device_format_desc', label: 'ชื่อยี่ห้อเครื่อง' },
  { value: 'device_format_no', label: 'หมายเลขเครื่อง' },
];

export default function TimeDeviceFormatsPage() {
  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // search state
  const [searchField, setSearchField] = React.useState('device_format_id'); // still only search by id
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'device_format_id', text: '' });

  // modal state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  // originalId not required (we keep id inside form)

  // delete state
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('time_device_format').select('*', { count: 'exact' });
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
    } catch (err) { setSnackbar({ open: true, message: err.message || 'โหลดข้อมูลล้มเหลว', severity: 'error' }); } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const loadDetails = React.useCallback(async (formatId) => {
    const { data, error } = await supabase
      .from('time_device_format_detail')
      .select('id, seq, field_typ, start_pos, end_pos')
      .eq('format_id', formatId)
      .order('seq', { ascending: true });
    if (error) throw error;
    return (data || []).map((d) => ({ ...d, tempId: crypto.randomUUID() }));
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setForm({ ...initialForm, details: [createEmptyDetail(1)] });
    setErrors({});
    setOpenModal(true);
  };

  const handleOpenEdit = async (row) => {
    setEditMode(true);
    setSaving(false);
    setErrors({});
    try {
      const details = await loadDetails(row.id);
      setForm({
        id: row.id,
        device_format_id: row.device_format_id || '',
    device_format_code: row.device_format_code || '',
        device_format_no: row.device_format_no || '',
  device_format_desc: row.device_format_desc || '',
        details: details.length ? details : [createEmptyDetail(1)],
      });
      setOpenModal(true);
    } catch {
      setSnackbar({ open: true, message: 'ไม่สามารถโหลดรายละเอียดได้', severity: 'error' });
    }
  };

  const handleCloseModal = () => setOpenModal(false);

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { setTargetRow(null); setOpenDelete(false); };

  const handleConfirmDelete = async () => {
    if (!targetRow) return;
    if (deleting) return;
    setDeleting(true);
    try {
      // delete details first (FK cascade could simplify if set up)
      const { error: dErr } = await supabase.from('time_device_format_detail').delete().eq('format_id', targetRow.id);
      if (dErr) throw dErr;
      const { error } = await supabase.from('time_device_format').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) { setSnackbar({ open: true, message: err.message || 'ลบข้อมูลล้มเหลว', severity: 'error' }); } finally { setDeleting(false); }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.device_format_id.trim()) newErrors.device_format_id = 'กรุณากรอกรหัส';
    if (form.device_format_id && form.device_format_id.length > 30) newErrors.device_format_id = 'ไม่เกิน 30 ตัวอักษร';
    if (form.device_format_code && form.device_format_code.length > 150) newErrors.device_format_code = 'ไม่เกิน 150 ตัวอักษร';
    if (form.device_format_no && form.device_format_no.length > 50) newErrors.device_format_no = 'ไม่เกิน 50 ตัวอักษร';
    if (form.device_format_desc && form.device_format_desc.length > 255) newErrors.device_format_desc = 'ไม่เกิน 255 ตัวอักษร';

    // detail validation
    const detailErrors = [];
    form.details.forEach((d, idx) => {
      const dErr = {};
      if (!d.field_typ.trim()) dErr.field_typ = 'เลือก';
      const s = Number(d.start_pos);
      const e = Number(d.end_pos);
      if (Number.isNaN(s)) dErr.start_pos = 'ตัวเลข';
      if (Number.isNaN(e)) dErr.end_pos = 'ตัวเลข';
      if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) dErr.end_pos = 'ต้องมากกว่าหรือเท่ากับต้นทาง';
      detailErrors[idx] = dErr;
    });
    if (detailErrors.some((de) => Object.keys(de).length)) newErrors.details = detailErrors;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) { setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้อง', severity: 'error' }); return; }
    setSaving(true);
    const headerPayload = {
      device_format_id: form.device_format_id.trim(),
  // Removed name fields from form. If backend still expects Thai name not null, we fallback to id.
  device_format_name_th: form.device_format_id.trim(),
  device_format_name_en: null,
      device_format_code: form.device_format_code?.trim() || null,
      device_format_no: form.device_format_no?.trim() || null,
  device_format_desc: form.device_format_desc?.trim() || null,
  is_active: true,
      updated_at: new Date().toISOString(),
    };
    try {
      let currentId = form.id;
      if (editMode) {
        const { error } = await supabase.from('time_device_format').update(headerPayload).eq('id', currentId);
        if (error) throw error;
        // delete removed details: simplest approach = delete all then reinsert (idempotent for small sets)
        const { error: delErr } = await supabase.from('time_device_format_detail').delete().eq('format_id', currentId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase.from('time_device_format').insert([{ ...headerPayload, created_at: new Date().toISOString() }]).select('id').single();
        if (error) throw error;
        currentId = data.id;
      }
      // insert details
      const detailPayloads = form.details.map((d, i) => ({
        format_id: currentId,
        seq: i + 1,
        field_typ: d.field_typ.trim(),
        start_pos: Number(d.start_pos),
        end_pos: Number(d.end_pos),
      }));
      if (detailPayloads.length) {
        const { error: detErr } = await supabase.from('time_device_format_detail').insert(detailPayloads);
        if (detErr) throw detErr;
      }
      setSnackbar({ open: true, message: editMode ? 'บันทึกการแก้ไขสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      setOpenModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setErrors((p) => ({ ...p, device_format_id: 'รหัสนี้ถูกใช้แล้ว' }));
      }
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally { setSaving(false); }
  };

  // detail row handlers
  const updateDetailField = (tempId, key, value) => {
    setForm((prevForm) => {
      const newDetails = prevForm.details.map((d) => (d.tempId === tempId ? { ...d, [key]: value } : d));
      if (errors.details) {
        setErrors((prevErr) => ({
          ...prevErr,
          details: prevErr.details.map((de, idx) => (newDetails[idx].tempId === tempId ? { ...de, [key]: '' } : de)),
        }));
      }
      return { ...prevForm, details: newDetails };
    });
  };
  const addDetailRow = () => {
    setForm((p) => ({ ...p, details: [...p.details, createEmptyDetail(p.details.length + 1)] }));
  };
  const removeDetailRow = (tempId) => {
    setForm((p) => {
      const filtered = p.details.filter((d) => d.tempId !== tempId).map((d, i) => ({ ...d, seq: i + 1 }));
      return { ...p, details: filtered.length ? filtered : [createEmptyDetail(1)] };
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรูปแบบเครื่องลงเวลา</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      {/* Filter */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'flex-start' }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flex: 1, width: '100%' }}>
          <TextField
            select
            size="small"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {SEARCH_FIELD_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="คำค้น"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput }); }}
            sx={{ flex: 1, minWidth: 0 }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'device_format_id', text: '' }); setSearchField('device_format_id'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสรูปแบบ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อเครื่องลงเวลา</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อยี่ห้อเครื่องลงเวลา</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>หมายเลขเครื่อง</TableCell>
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
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.device_format_id}</TableCell>
                  <TableCell>{row.device_format_code || ''}</TableCell>
                  <TableCell>{row.device_format_desc || ''}</TableCell>
                  <TableCell>{row.device_format_no || ''}</TableCell>
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

      {/* Add/Edit Dialog */}
      <Dialog open={openModal} onClose={() => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขรูปแบบเครื่องลงเวลา' : 'เพิ่มรูปแบบเครื่องลงเวลา'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="รหัสรูปแบบ" value={form.device_format_id} onChange={(e) => setField('device_format_id', e.target.value)} inputProps={{ maxLength: 30 }} required size="small" disabled={editMode} error={Boolean(errors.device_format_id)} helperText={errors.device_format_id} fullWidth />
            <TextField label="ชื่อเครื่องลงเวลา" value={form.device_format_code} onChange={(e) => setField('device_format_code', e.target.value)} inputProps={{ maxLength: 150 }} size="small" error={Boolean(errors.device_format_code)} helperText={errors.device_format_code} fullWidth />
            <TextField label="ชื่อยี่ห้อเครื่องลงเวลา" value={form.device_format_desc} onChange={(e) => setField('device_format_desc', e.target.value)} inputProps={{ maxLength: 255 }} size="small" error={Boolean(errors.device_format_desc)} helperText={errors.device_format_desc} fullWidth multiline minRows={1} />
            <TextField label="หมายเลขเครื่องลงเวลา" value={form.device_format_no} onChange={(e) => setField('device_format_no', e.target.value)} inputProps={{ maxLength: 50 }} size="small" error={Boolean(errors.device_format_no)} helperText={errors.device_format_no} fullWidth />
            {/* Checkbox 'ใช้งานอยู่' removed as per user request; default is_active=true when saving */}

            {/* Detail grid */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>รูปแบบเครื่องลงเวลา</Typography>
              <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>ชนิดข้อมูล</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold', width: 140 }}>ตั้งแต่</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold', width: 140 }}>ถึง</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold', width: 80 }} align="center">ลบ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.details.map((d, idx) => {
                    const detailErr = errors.details?.[idx] || {};
                    return (
                      <TableRow key={d.tempId}>
                        <TableCell>
                          <TextField
                            select
                            value={d.field_typ}
                            onChange={(e) => updateDetailField(d.tempId, 'field_typ', e.target.value)}
                            size="small"
                            fullWidth
                            error={Boolean(detailErr.field_typ)}
                            helperText={detailErr.field_typ}
                          >
                            <MenuItem value="">-- เลือก --</MenuItem>
                            {DATA_TYPE_OPTIONS.map((opt) => (
                              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField value={d.start_pos} onChange={(e) => updateDetailField(d.tempId, 'start_pos', e.target.value.replace(/[^0-9]/g, ''))} size="small" fullWidth error={Boolean(detailErr.start_pos)} helperText={detailErr.start_pos} />
                        </TableCell>
                        <TableCell>
                          <TextField value={d.end_pos} onChange={(e) => updateDetailField(d.tempId, 'end_pos', e.target.value.replace(/[^0-9]/g, ''))} size="small" fullWidth error={Boolean(detailErr.end_pos)} helperText={detailErr.end_pos} />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => removeDetailRow(d.tempId)} disabled={form.details.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Button startIcon={<AddIcon />} size="small" onClick={addDetailRow}>เพิ่มแถว</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {errors.details && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>กรุณาตรวจสอบข้อมูลแถวด้านบน</Typography>
              )}
            </Box>
            <Typography variant="caption" color="error">
              หมายเหตุ : ค่าที่อยู่ในคอลัมน์ "ตั้งแต่" จะต้องน้อยกว่าหรือเท่ากับค่าในคอลัมน์ "ถึง" ไม่อนุญาตให้ซ้อนกัน และ ค่าที่คอลัมน์ "ถึง" จะต้องไม่ต่ำกว่าค่าคอลัมน์ "ตั้งแต่" ของแถวถัดไป
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรูปแบบ "{targetRow?.device_format_id}" หรือไม่?</Typography>
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
