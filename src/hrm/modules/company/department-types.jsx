// src/pages/DepartmentTypePage.jsx 
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
  dept_type_id: '',
  dept_type_name: '',
  dept_type_name_eng: '',
  dept_type_level: '', // keep as string for input, convert on save
  description: '',
};

export default function DepartmentTypePage() {
  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // search state
  const [searchField, setSearchField] = React.useState('dept_type_id');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'dept_type_name', text: '' });

  // form/modal state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // delete state
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  // helpers: level resequencing
  const resequenceLevels = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('department_type')
        .select('dept_type_id, dept_type_level')
        .order('dept_type_level', { ascending: true })
        .order('dept_type_id', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return;

      const updates = [];
      for (let i = 0; i < data.length; i += 1) {
        const row = data[i];
        const newLevel = i + 1;
        if (row.dept_type_level !== newLevel) {
          updates.push({ id: row.dept_type_id, newLevel });
        }
      }
      // avoid flooding DB
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from('department_type')
          .update({ dept_type_level: u.newLevel, updated_at: new Date().toISOString() })
          .eq('dept_type_id', u.id);
        if (upErr) throw upErr;
      }
    } catch (e) {
      // why: keep user informed if resequence fails
      setSnackbar({ open: true, message: e.message || 'ไม่สามารถจัดเรียงระดับใหม่ได้', severity: 'error' });
    }
  }, []);

  // helpers: next level for insert (simple, then resequence to be safe)
  const getNextLevel = React.useCallback(async () => {
    const { count, error } = await supabase
      .from('department_type')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return (count || 0) + 1;
  }, []);

  // fetch data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('department_type')
        .select('*', { count: 'exact' })
        .order('dept_type_level', { ascending: true });

      // search
      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        if (appliedSearch.field === 'dept_type_level') {
          const num = Number(t);
          if (!Number.isNaN(num)) query = query.eq('dept_type_level', num);
        } else {
          query = query.ilike(appliedSearch.field, `%${t}%`);
        }
      }

      // pagination
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
    fetchData();
  }, [fetchData]);

  // open/close modals
  const handleOpenAdd = async () => {
    setEditMode(false);
    setForm(initialForm);
    setErrors({});
    setOriginalId(null);
    setOpenModal(true);
    try {
      const next = await getNextLevel();
      setForm((prev) => ({ ...prev, dept_type_level: String(next) }));
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'ไม่สามารถคำนวณระดับถัดไปได้', severity: 'error' });
    }
  };

  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      dept_type_id: row.dept_type_id || '',
      dept_type_name: row.dept_type_name || '',
      dept_type_name_eng: row.dept_type_name_eng || '',
      dept_type_level: String(row.dept_type_level ?? ''),
      description: row.description || '',
    });
    setOriginalId(row.dept_type_id);
    setErrors({});
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
    if (deleting) return; // prevent double-trigger
    setDeleting(true);
    try {
      const { error } = await supabase.from('department_type').delete().eq('dept_type_id', targetRow.dept_type_id);
      if (error) throw error;
      await resequenceLevels(); // keep levels contiguous after remove
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // form helpers
  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: '' })); // clear field error when typing
  };

  // validation & save
  const handleSave = async () => {
    const newErrors = {};
    if (saving) return; // prevent double-trigger
    setSaving(true);

    // required
    if (!form.dept_type_id.trim()) newErrors.dept_type_id = 'กรุณากรอกรหัสประเภทหน่วยงาน';
    if (!form.dept_type_name.trim()) newErrors.dept_type_name = 'กรุณากรอกชื่อประเภทหน่วยงาน (ไทย)';

    // formats
    if (form.dept_type_id && form.dept_type_id.length > 10) newErrors.dept_type_id = 'ความยาวไม่เกิน 10 ตัวอักษร';
    if (form.dept_type_name && form.dept_type_name.length > 100) newErrors.dept_type_name = 'ความยาวไม่เกิน 100 ตัวอักษร';
    if (form.dept_type_name_eng && form.dept_type_name_eng.length > 100) newErrors.dept_type_name_eng = 'ความยาวไม่เกิน 100 ตัวอักษร';
    if (form.description && form.description.length > 255) newErrors.description = 'ความยาวไม่เกิน 255 ตัวอักษร';

    // level handling
    let levelNum = null;
    if (editMode) {
      const parsed = Number(String(form.dept_type_level).replace(/[^0-9]/g, ''));
      if (Number.isNaN(parsed)) newErrors.dept_type_level = 'ระดับต้องเป็นตัวเลข';
      else levelNum = parsed;
    } else {
      try {
        levelNum = await getNextLevel(); // system-generated
      } catch (e) {
        newErrors.dept_type_level = e.message || 'ไม่สามารถสร้างระดับอัตโนมัติได้';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน', severity: 'error' });
      return;
    }

    const payload = {
      dept_type_id: form.dept_type_id.trim(),
      dept_type_name: form.dept_type_name.trim(),
      dept_type_name_eng: form.dept_type_name_eng?.trim() || null,
      dept_type_level: levelNum,
      description: form.description?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editMode) {
        const { error } = await supabase
          .from('department_type')
          .update(payload)
          .eq('dept_type_id', originalId);
        if (error) throw error;
        await resequenceLevels(); // normalize after edits
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('department_type')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) {
          if (error.code === '23505') {
            setErrors((prev) => ({ ...prev, dept_type_id: 'รหัสนี้ถูกใช้แล้ว' }));
          }
          throw error;
        }
        await resequenceLevels(); // ensure contiguous after insert
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }

      setOpenModal(false);
      fetchData();
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
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">ประเภทหน่วยงาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>
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
              onChange={(e) => {
                const value = e.target.value;
                setSearchField(value);
                // why: enforce numeric-only and 3-digit limit immediately when switching to level
                if (value === 'dept_type_level') {
                  setSearchInput((prev) => prev.replace(/\D/g, '').slice(0, 3));
                }
              }}
            >
              <MenuItem value="dept_type_id">รหัสประเภทหน่วยงาน</MenuItem>
              <MenuItem value="dept_type_name">ชื่อประเภทหน่วยงาน (ไทย)</MenuItem>
              <MenuItem value="dept_type_name_eng">ชื่อประเภทหน่วยงาน (อังกฤษ)</MenuItem>
              {/* <MenuItem value="dept_type_level">ระดับประเภทหน่วยงาน</MenuItem> */}
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            label="คำค้น"
            value={searchInput}
            onChange={(e) => {
              const v = e.target.value;
              if (searchField === 'dept_type_level') {
                const digits = v.replace(/\D/g, '').slice(0, 3);
                setSearchInput(digits);
              } else {
                setSearchInput(v.slice(0, 100));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput });
            }}
            inputProps={{
              maxLength: searchField === 'dept_type_level' ? 3 : 100,
              inputMode: searchField === 'dept_type_level' ? 'numeric' : undefined,
              pattern: searchField === 'dept_type_level' ? '[0-9]*' : undefined,
            }}
          />

          <Stack direction="row" spacing={1}>
            <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>
              ค้นหา
            </Button>
            <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'dept_type_id', text: '' }); setSearchField('dept_type_id'); setPage(0); }}>
              ล้าง
            </Button>
          </Stack>
        </Stack>

        {/* Table */}
        <TableContainer sx={{ borderRadius: 1, borderColor: 'divider', mb: 2 }}>
          <Table size="small" sx={{
            '& th, & td': { borderRight: '1px solid', borderColor: 'divider' },
            '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>รหัสประเภทหน่วยงาน</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อประเภทหน่วยงาน (ไทย)</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อประเภทหน่วยงาน (อังกฤษ)</TableCell>
                <TableCell align="right" sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ระดับ</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
                <TableCell align="center" sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>การทำงาน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
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
                  <TableRow key={row.dept_type_id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.dept_type_id}</TableCell>
                    <TableCell>{row.dept_type_name || ''}</TableCell>
                    <TableCell>{row.dept_type_name_eng || ''}</TableCell>
                    <TableCell align="right">{row.dept_type_level}</TableCell>
                    <TableCell>{row.description || ''}</TableCell>
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
      <Dialog
        open={openModal}
        onClose={(e, reason) => { if (saving) return; handleCloseModal(); }}
        disableEscapeKeyDown={saving}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editMode ? 'แก้ไขประเภทหน่วยงาน' : 'เพิ่มประเภทหน่วยงาน'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="รหัสประเภทหน่วยงาน"
              value={form.dept_type_id}
              onChange={(e) => setField('dept_type_id', e.target.value)}
              inputProps={{ maxLength: 10 }}
              required
              size="small"
              disabled={editMode} // ป้องกันการแก้ไข PK ขณะ edit
              error={Boolean(errors.dept_type_id)}
              helperText={errors.dept_type_id}
            />
            <TextField
              label="ชื่อประเภทหน่วยงาน (ไทย)"
              value={form.dept_type_name}
              onChange={(e) => setField('dept_type_name', e.target.value)}
              inputProps={{ maxLength: 100 }}
              required
              size="small"
              error={Boolean(errors.dept_type_name)}
              helperText={errors.dept_type_name}
            />
            <TextField
              label="ชื่อประเภทหน่วยงาน (อังกฤษ)"
              value={form.dept_type_name_eng}
              onChange={(e) => setField('dept_type_name_eng', e.target.value)}
              inputProps={{ maxLength: 100 }}
              size="small"
              error={Boolean(errors.dept_type_name_eng)}
              helperText={errors.dept_type_name_eng}
            />
            <TextField
              label="ระดับ"
              value={form.dept_type_level}
              onChange={(e) => {
                const onlyNum = e.target.value.replace(/[^0-9]/g, '');
                setField('dept_type_level', onlyNum);
              }}
              inputProps={{ maxLength: 3 }}
              required
              size="small"
              disabled
              error={Boolean(errors.dept_type_level)}
              helperText={errors.dept_type_level || 'ระบบจะกำหนดให้อัตโนมัติ'}
            />
            <TextField
              label="รายละเอียด"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              inputProps={{ maxLength: 255 }}
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
            ต้องการลบข้อมูลประเภทหน่วยงาน "{targetRow?.dept_type_name || targetRow?.dept_type_id}" หรือไม่?
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
