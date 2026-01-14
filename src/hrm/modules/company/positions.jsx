// src/pages/PositionsPage.jsx
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Material UI
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
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
import Autocomplete from '@mui/material/Autocomplete'; // why: ให้ค้นหาได้ในช่องหัวหน้างาน

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Utils
function formatDateTH(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
}

const initialForm = {
  position_code: '',
  position_name: '',
  position_name_eng: '',
  supervisor_position_id: '',
  description: '',
};

export default function PositionsPage() {
  const menuTitle = 'ข้อมูลตำแหน่งงาน';

  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // search state
  const [searchField, setSearchField] = React.useState('position_code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'position_code', text: '' });

  // form/modal state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null); // holds row.id when editing
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // supervisor options
  const [options, setOptions] = React.useState([]); // list of {id, position_name, position_code}
  const [optionsMap, setOptionsMap] = React.useState({}); // id -> name/code

  // delete state
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  // load supervisor options
  const fetchOptions = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('id, position_code, position_name')
        .order('position_name', { ascending: true });
      if (error) throw error;
      const list = data || [];
      setOptions(list);
      const map = {};
      for (const it of list) map[it.id] = it;
      setOptionsMap(map);
    } catch (e) {
      // why: surface background loading issues without blocking main UX
      setSnackbar({ open: true, message: e.message || 'โหลดรายการหัวหน้างานไม่สำเร็จ', severity: 'error' });
    }
  }, []);

  // fetch table data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('positions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        if (['position_code', 'position_name', 'position_name_eng'].includes(appliedSearch.field)) {
          query = query.ilike(appliedSearch.field, `%${t}%`);
        }
      }

      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      setRows(data || []);
      setTotal(count || 0);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // modal controls
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
      position_code: row.position_code || '',
      position_name: row.position_name || '',
      position_name_eng: row.position_name_eng || '',
      supervisor_position_id: row.supervisor_position_id || '',
      description: row.description || '',
    });
    setErrors({});
    setOriginalId(row.id);
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  // delete
  const handleAskDelete = (row) => {
    setTargetRow(row);
    setOpenDelete(true);
  };
  const handleCloseDelete = () => {
    setTargetRow(null);
    setOpenDelete(false);
  };
  const handleConfirmDelete = async () => {
    if (!targetRow) return;
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('positions').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
      fetchOptions(); // why: อัปเดตรายการหัวหน้างานหลังลบ
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // helpers
  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // validation & save
  const handleSave = async () => {
    const newErrors = {};
    if (saving) return; // prevent double trigger
    setSaving(true);

    // required
    if (!form.position_code.trim()) newErrors.position_code = 'กรุณากรอกรหัสตำแหน่ง';
    if (!form.position_name.trim()) newErrors.position_name = 'กรุณากรอกชื่อตำแหน่ง (ไทย)';

    // lengths / formats (DB: position_code VARCHAR(20))
    if (form.position_code && form.position_code.length > 20) newErrors.position_code = 'ความยาวไม่เกิน 20 ตัวอักษร';
    if (form.position_name_eng && form.position_name_eng.length > 255) newErrors.position_name_eng = 'ความยาวไม่เกิน 255 ตัวอักษร';
    if (form.position_name && form.position_name.length > 255) newErrors.position_name = 'ความยาวไม่เกิน 255 ตัวอักษร';
    if (form.description && form.description.length > 1000) newErrors.description = 'ความยาวไม่เกิน 1000 ตัวอักษร';

    // business rules
    if (editMode && form.supervisor_position_id && originalId && form.supervisor_position_id === originalId) {
      newErrors.supervisor_position_id = 'ห้ามเลือกชื่อตำแหน่งนี้เป็นหัวหน้าของตนเอง';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // why: แสดง error ผ่าน helperText แทน alert
    }

    const payload = {
      position_code: form.position_code.trim(),
      position_name: form.position_name.trim(),
      position_name_eng: form.position_name_eng?.trim() || null,
      supervisor_position_id: form.supervisor_position_id || null,
      description: form.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

  try {
      if (editMode) {
        const { error } = await supabase
          .from('positions')
          .update(payload)
          .eq('id', originalId);
        if (error) throw error;
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('positions')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) {
          // map unique violations to fields
          if (error.code === '23505') {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('position_code')) {
              setErrors((prev) => ({ ...prev, position_code: 'รหัสตำแหน่งนี้ถูกใช้แล้ว' }));
            }
            if (msg.includes('position_name')) {
              setErrors((prev) => ({ ...prev, position_name: 'ชื่อตำแหน่งนี้ถูกใช้แล้ว' }));
            }
          }
          throw error;
        }
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }

      setOpenModal(false);
      fetchData();
      fetchOptions();
    } catch (err) {
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">ข้อมูลตำแหน่งงาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>
            {/* เปลี่ยนปุ่มให้เหลือคำว่า "เพิ่ม" เท่านั้น */}
            เพิ่ม
          </Button>
        </Stack>
      </Stack>

      {/* Filter Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="search-field-label"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="position_code">รหัสตำแหน่ง</MenuItem>
            <MenuItem value="position_name">ชื่อตำแหน่ง (ไทย)</MenuItem>
            <MenuItem value="position_name_eng">ชื่อตำแหน่ง (อังกฤษ)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          fullWidth
          label="คำค้น"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value.slice(0, 100))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput });
          }}
          inputProps={{ maxLength: 100 }}
        />

        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>
            ค้นหา
          </Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'position_code', text: '' }); setSearchField('position_code'); setPage(0); }}>
            ล้าง
          </Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{
          '& th, & td': { borderRight: '1px solid', borderColor: 'divider' },
          '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>รหัสตำแหน่ง</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ชื่อตำแหน่ง (ไทย)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ชื่อตำแหน่ง (อังกฤษ)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ตำแหน่งหัวหน้างาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>รายละเอียด</TableCell>
              {/* ลบคอลัมน์ "สร้างเมื่อ" และ "แก้ไขล่าสุด" ตามคำขอ */}
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                {/* 6 คอลัมน์หลังลบ 2 คอลัมน์ */}
                <TableCell colSpan={6} align="center">
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">กำลังโหลดข้อมูล...</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.position_code}</TableCell>
                  <TableCell>{row.position_name || ''}</TableCell>
                  <TableCell>{row.position_name_eng || ''}</TableCell>
                  <TableCell>{optionsMap[row.supervisor_position_id]?.position_name || ''}</TableCell>
                  <TableCell>{row.description || ''}</TableCell>
                  {/* ลบคอลัมน์วันที่ออก */}
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton size="small" color="error" onClick={() => handleAskDelete(row)} disabled={deleting}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="จำนวนแถวต่อหน้า"
      />

      {/* Add/Edit Modal */}
  <Dialog open={openModal} onClose={(e, reason) => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขข้อมูลตำแหน่งงาน' : 'เพิ่มข้อมูลตำแหน่งงาน'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="รหัสตำแหน่ง"
              value={form.position_code}
              onChange={(e) => setField('position_code', e.target.value)}
              inputProps={{ maxLength: 20 }}
              required
              size="small"
              disabled={editMode} // why: ป้องกันแก้ไขรหัสเมื่อแก้ไขข้อมูล
              error={Boolean(errors.position_code)}
              helperText={errors.position_code}
            />
            <TextField
              label="ชื่อตำแหน่ง (ไทย)"
              value={form.position_name}
              onChange={(e) => setField('position_name', e.target.value)}
              inputProps={{ maxLength: 255 }}
              required
              size="small"
              error={Boolean(errors.position_name)}
              helperText={errors.position_name}
            />
            <TextField
              label="ชื่อตำแหน่ง (อังกฤษ)"
              value={form.position_name_eng}
              onChange={(e) => setField('position_name_eng', e.target.value)}
              inputProps={{ maxLength: 255 }}
              size="small"
              error={Boolean(errors.position_name_eng)}
              helperText={errors.position_name_eng}
            />

            {/* เปลี่ยนเป็น Autocomplete เพื่อให้ค้นหาได้ */}
            <Autocomplete
              options={options}
              value={options.find((o) => o.id === form.supervisor_position_id) || null}
              onChange={(_, newValue) => setField('supervisor_position_id', newValue ? newValue.id : '')}
              getOptionLabel={(opt) => (opt ? `${opt.position_code} - ${opt.position_name}` : '')}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ตำแหน่งหัวหน้างาน"
                  size="small"
                  error={Boolean(errors.supervisor_position_id)}
                  helperText={errors.supervisor_position_id}
                />
              )}
              clearOnEscape
            />

            <TextField
              label="รายละเอียด"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              inputProps={{ maxLength: 1000 }}
              size="small"
              multiline
              minRows={3}
              error={Boolean(errors.description)}
              helperText={errors.description}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? (
              <>
                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                กำลังบันทึก...
              </>
            ) : (
              'บันทึก'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={openDelete} onClose={(e, reason) => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            ต้องการลบ{menuTitle} "{targetRow?.position_name || targetRow?.position_code}" หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>ยกเลิก</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? (
              <>
                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                กำลังลบ...
              </>
            ) : (
              <><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
