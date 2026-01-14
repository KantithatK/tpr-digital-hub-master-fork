// src/pages/DepartmentPage.jsx

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
import Autocomplete from '@mui/material/Autocomplete';

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
  id: '', // uuid (edit only)
  dept_id: '',
  dept_name: '',
  dept_name_eng: '',
  dept_type_id: '',
  parent_id: '',
  description: '',
  is_active: true,
};

export default function DepartmentPage() {
  // table state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // search state
  const [searchField, setSearchField] = React.useState('dept_id');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'dept_name', text: '' });

  // form/modal state
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null); // uuid key for update
  const [saving, setSaving] = React.useState(false);

  // delete state
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // dropdown options
  const [deptTypes, setDeptTypes] = React.useState([]); // {dept_type_id, dept_type_name, dept_type_level}
  const [parentOptions, setParentOptions] = React.useState([]); // {id, dept_id, dept_name, dept_type_level}
  const [parentLoading, setParentLoading] = React.useState(false);
  const [parentInput, setParentInput] = React.useState('');
  const [debouncedParentInput, setDebouncedParentInput] = React.useState(''); // why: กันยิงค้นหาถี่

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.useCallback(
    React.forwardRef(function Alert(props, ref) {
      return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
    }),
    []
  );

  // debounce parentInput
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedParentInput(parentInput), 300);
    return () => clearTimeout(t);
  }, [parentInput]);

  // fetch dropdown data
  const fetchDeptTypes = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('department_type')
      .select('dept_type_id, dept_type_name, dept_type_level')
      .order('dept_type_level', { ascending: true })
      .order('dept_type_id', { ascending: true });
    if (error) throw error;
    setDeptTypes(data || []);
  }, []);

  // server-side search for parent options (กรองตามระดับได้)
  const fetchParentOptionsSearch = React.useCallback(async (q = '', allowedLevel = null) => {
    setParentLoading(true);
    try {
      let query = supabase
        .from('v_department_form')
        .select('id, dept_id, dept_name, dept_type_level')
        .order('dept_id', { ascending: true })
        .limit(20);

      if (allowedLevel != null) {
        // why: ให้เห็นเฉพาะหน่วยงานหลักที่ระดับสูงกว่าเพียง 1 ระดับ
        query = query.eq('dept_type_level', allowedLevel);
      }

      const trimmed = (q || '').trim();
      if (trimmed) {
        query = query.or(`dept_id.ilike.%${trimmed}%,dept_name.ilike.%${trimmed}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setParentOptions(data || []);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'ไม่สามารถค้นหารายการหน่วยงานหลักได้', severity: 'error' });
    } finally {
      setParentLoading(false);
    }
  }, []);

  // ensure selected parent exists in option list when editing
  const ensureSelectedParent = React.useCallback(
    async (parentId) => {
      if (!parentId) return;
      const exists = parentOptions.some((p) => p.id === parentId);
      if (exists) return;
      const { data, error } = await supabase
        .from('v_department_form')
        .select('id, dept_id, dept_name, dept_type_level')
        .eq('id', parentId)
        .maybeSingle();
      if (!error && data) setParentOptions((prev) => [data, ...prev]);
    },
    [parentOptions]
  );

  // fetch table data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('v_department_form').select('*', { count: 'exact' });

      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        if (appliedSearch.field === 'dept_type_level') {
          const num = Number(t.replace(/[^0-9]/g, ''));
          if (!Number.isNaN(num)) query = query.eq('dept_type_level', num);
        } else {
          query = query.ilike(appliedSearch.field, `%${t}%`);
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
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    fetchDeptTypes().catch((e) => {
      setSnackbar({ open: true, message: e.message || 'ไม่สามารถโหลดประเภทหน่วยงานได้', severity: 'error' });
    });
  }, [fetchDeptTypes]);

  // computed: level ที่เลือก และกฎ disable/allowed level
  const selectedTypeLevel = React.useMemo(() => {
    const t = deptTypes.find((x) => x.dept_type_id === form.dept_type_id);
    return t?.dept_type_level ?? null;
  }, [deptTypes, form.dept_type_id]);

  // เปลี่ยนให้ "กรองระดับ n-1" ใช้ได้ทั้งโหมดเพิ่มและแก้ไข
  const allowedParentLevel = selectedTypeLevel && selectedTypeLevel > 1 ? selectedTypeLevel - 1 : null;
  const disableParent = selectedTypeLevel === 1 || (!editMode && selectedTypeLevel == null); // why: แก้ไข: ระดับ 1 ปิดเสมอ; โหมดเพิ่มยังปิดเมื่อยังไม่เลือกประเภท

  // เมื่อเปิดโมดอล/เปลี่ยนระดับ ให้โหลดตัวเลือกตามระดับที่กำหนด (ไม่ผูกกับ form.parent_id)
  React.useEffect(() => {
    if (!openModal) return;
    fetchParentOptionsSearch('', allowedParentLevel);
  }, [openModal, allowedParentLevel, fetchParentOptionsSearch]);

  // ensure selected parent exists เฉพาะตอนแก้ไขเท่านั้น
  React.useEffect(() => {
    if (!openModal) return;
    if (editMode && form.parent_id) ensureSelectedParent(form.parent_id);
  }, [openModal, editMode, form.parent_id, ensureSelectedParent]);

  // live search (debounced)
  React.useEffect(() => {
    if (!openModal) return;
    fetchParentOptionsSearch(debouncedParentInput, allowedParentLevel);
  }, [debouncedParentInput, openModal, allowedParentLevel, fetchParentOptionsSearch]);

  // open/close modals
  const handleOpenAdd = async () => {
    setEditMode(false);
    setForm(initialForm);
    setErrors({});
    setOriginalId(null);
    setParentInput('');
    setOpenModal(true);
  };

  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      id: row.id,
      dept_id: row.dept_id || '',
      dept_name: row.dept_name || '',
      dept_name_eng: row.dept_name_eng || '',
      dept_type_id: row.dept_type_id || '',
      parent_id: row.parent_id || '',
      description: row.description || '',
      is_active: Boolean(row.is_active),
    });
    setOriginalId(row.id);
    setErrors({});
    // why: ให้ Autocomplete แสดงค่าหน่วยงานหลักเดิมทันทีเมื่อเข้าโหมดแก้ไข
    setParentInput(row.parent_id ? `${row.parent_dept_id} - ${row.parent_dept_name || ''}` : '');
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
      const { error } = await supabase.from('department').delete().eq('id', targetRow.id);
      if (error) throw error;
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
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // validation & save
  const handleSave = async () => {
    const newErrors = {};
    if (saving) return; // prevent double trigger
    setSaving(true);

    // required
    if (!form.dept_id.trim()) newErrors.dept_id = 'กรุณากรอกรหัสหน่วยงาน';
    if (!form.dept_name.trim()) newErrors.dept_name = 'กรุณากรอกชื่อหน่วยงาน (ไทย)';
    if (!form.dept_type_id) newErrors.dept_type_id = 'กรุณาเลือกประเภทหน่วยงาน';

    // lengths
    if (form.dept_id && form.dept_id.length > 20) newErrors.dept_id = 'ความยาวไม่เกิน 20 ตัวอักษร';
    if (form.dept_name && form.dept_name.length > 150) newErrors.dept_name = 'ความยาวไม่เกิน 150 ตัวอักษร';
    if (form.dept_name_eng && form.dept_name_eng.length > 150) newErrors.dept_name_eng = 'ความยาวไม่เกิน 150 ตัวอักษร';
    if (form.description && form.description.length > 255) newErrors.description = 'ความยาวไม่เกิน 255 ตัวอักษร';

    // parent self-check
    if (editMode && form.parent_id && form.parent_id === originalId) {
      newErrors.parent_id = 'ไม่สามารถเลือกหน่วยงานตัวเองเป็นหน่วยงานหลักได้';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน', severity: 'error' });
      return;
    }

    const payload = {
      dept_id: form.dept_id.trim(),
      dept_name: form.dept_name.trim(),
      dept_name_eng: form.dept_name_eng?.trim() || null,
      dept_type_id: form.dept_type_id,
      parent_id: form.parent_id || null,
      description: form.description?.trim() || null,
      is_active: Boolean(form.is_active),
      updated_at: new Date().toISOString(),
    };

  try {
      if (editMode) {
        const { error } = await supabase.from('department').update(payload).eq('id', originalId);
        if (error) throw error;
        setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('department')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
      }

      setOpenModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.message || '';
      if (err?.code === '23505' || msg.toLowerCase().includes('duplicate key') || msg.includes('unique')) {
        setErrors((prev) => ({ ...prev, dept_id: 'รหัสหน่วยงานนี้ถูกใช้แล้ว' }));
      }
      if (msg.includes('หน่วยงานหลักต้องอยู่ระดับสูงกว่า')) {
        setErrors((prev) => ({ ...prev, parent_id: 'กรุณาเลือกหน่วยงานหลักที่มีระดับสูงกว่า' }));
      }
      if (msg.includes('chk_department_not_self_parent')) {
        setErrors((prev) => ({ ...prev, parent_id: 'ไม่สามารถเลือกหน่วยงานตัวเองเป็นหน่วยงานหลักได้' }));
      }
      setSnackbar({ open: true, message: 'ไม่สามารถบันทึกข้อมูลได้', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // helpers for Autocomplete binding
  const selectedParent = React.useMemo(() => {
    if (!form.parent_id) return null;
    return parentOptions.find((p) => p.id === form.parent_id) || null;
  }, [form.parent_id, parentOptions]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">ข้อมูลหน่วยงาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>
            เพิ่ม
          </Button>
        </Stack>
      </Stack>

      {/* Filter Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 240 }} size="small">
          <InputLabel id="search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="search-field-label"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="dept_id">รหัสหน่วยงาน</MenuItem>
            <MenuItem value="dept_name">ชื่อหน่วยงาน (ไทย)</MenuItem>
            <MenuItem value="dept_name_eng">ชื่อหน่วยงาน (อังกฤษ)</MenuItem>
            {/* <MenuItem value="dept_type_id">รหัสประเภทหน่วยงาน</MenuItem>
              <MenuItem value="dept_type_name">ชื่อประเภทหน่วยงาน</MenuItem>
              <MenuItem value="parent_dept_name">หน่วยงานหลัก</MenuItem>
              <MenuItem value="dept_type_level">ระดับประเภท (ตัวเลข)</MenuItem> */}
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
              setSearchInput(v.replace(/[^0-9]/g, ''));
            } else {
              setSearchInput(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput });
          }}
        />

        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>
            ค้นหา
          </Button>
          <Button
            startIcon={<ClearIcon />}
            color="inherit"
            onClick={() => {
              setSearchInput('');
              setAppliedSearch({ field: 'dept_id', text: '' });
              setSearchField('dept_id');
              setPage(0);
            }}
          >
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
              <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>รหัสหน่วยงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อหน่วยงาน (ไทย)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อหน่วยงาน (อังกฤษ)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>ระดับประเภทหน่วยงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>ประเภทหน่วยงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>ระดับประเภทหน่วยงานหลัก</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>หน่วยงานหลัก</TableCell>
              <TableCell align="center" sx={{ bgcolor: 'grey.200', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                การทำงาน
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">กำลังโหลดข้อมูล...</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" sx={{ py: 2 }}>
                    ไม่พบข้อมูล
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.dept_id}</TableCell>
                  <TableCell>{row.dept_name || ''}</TableCell>
                  <TableCell>{row.dept_name_eng || ''}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.dept_type_level ?? ''}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.dept_type_name}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.parent_dept_type_level ?? ''}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.parent_dept_id ? `${row.parent_dept_name || ''}` : ''}</TableCell>
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
        <DialogTitle>{editMode ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มข้อมูลหน่วยงาน'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="รหัสหน่วยงาน"
              value={form.dept_id}
              onChange={(e) => setField('dept_id', e.target.value)}
              inputProps={{ maxLength: 20 }}
              required
              size="small"
              disabled={editMode} // why: ลดความเสี่ยงชน Unique ตอนแก้ไข
              error={Boolean(errors.dept_id)}
              helperText={errors.dept_id}
            />
            <TextField
              label="ชื่อหน่วยงาน (ไทย)"
              value={form.dept_name}
              onChange={(e) => setField('dept_name', e.target.value)}
              inputProps={{ maxLength: 150 }}
              required
              size="small"
              error={Boolean(errors.dept_name)}
              helperText={errors.dept_name}
            />
            <TextField
              label="ชื่อหน่วยงาน (อังกฤษ)"
              value={form.dept_name_eng}
              onChange={(e) => setField('dept_name_eng', e.target.value)}
              inputProps={{ maxLength: 150 }}
              size="small"
              error={Boolean(errors.dept_name_eng)}
              helperText={errors.dept_name_eng}
            />

            <FormControl size="small" required error={Boolean(errors.dept_type_id)}>
              <InputLabel id="dept-type-label">ประเภทหน่วยงาน</InputLabel>
              <Select
                labelId="dept-type-label"
                label="ประเภทหน่วยงาน"
                value={form.dept_type_id}
                onChange={(e) => {
                  const val = e.target.value;
                  setField('dept_type_id', val);
                  const found = deptTypes.find((t) => t.dept_type_id === val);
                  if (!editMode && found && found.dept_type_level === 1) {
                    // why: ระดับ 1 ต้องไม่มีหน่วยงานหลัก
                    setField('parent_id', '');
                    setParentInput('');
                  }
                }}
              >
                {deptTypes.map((t) => (
                  <MenuItem key={t.dept_type_id} value={t.dept_type_id}>
                    ระดับ {t.dept_type_level} - {t.dept_type_name}
                  </MenuItem>
                ))}
              </Select>
              {errors.dept_type_id && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.dept_type_id}
                </Typography>
              )}
            </FormControl>

            {/* Parent lookup with Autocomplete (disabled: ระดับ 1; filter: เห็นเฉพาะระดับ n-1 ในทั้งสองโหมด) */}
            <Autocomplete
              options={parentOptions}
              loading={parentLoading}
              value={selectedParent}
              onChange={(_, newVal) => {
                setField('parent_id', newVal ? newVal.id : '');
                // why: sync input label กับ option ที่เลือก เพื่อกัน onInputChange(reason='reset') กระตุ้นโหลดซ้ำ
                if (newVal) setParentInput(`${newVal.dept_id} - ${newVal.dept_name}`);
                else setParentInput('');
              }}
              inputValue={parentInput}
              onInputChange={(_, v, reason) => {
                if (reason === 'reset') return; // กัน loop โหลดซ้ำตอนเลือกค่า
                setParentInput(v);
              }}
              getOptionLabel={(o) => (o ? `${o.dept_id} - ${o.dept_name}` : '')}
              isOptionEqualToValue={(o, v) => (!!o && !!v ? o.id === v.id : false)}
              noOptionsText={parentLoading ? 'กำลังค้นหา...' : 'ไม่พบรายการ'}
              filterOptions={(x) => x}
              clearOnEscape
              disabled={disableParent}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    disableParent
                      ? 'หน่วยงานหลัก (ไม่ต้องเลือกสำหรับระดับ 1)'
                      : allowedParentLevel
                        ? `หน่วยงานหลัก (แสดงเฉพาะระดับ ${allowedParentLevel})`
                        : 'หน่วยงานหลัก (พิมพ์เพื่อค้นหา)'
                  }
                  size="small"
                  placeholder={disableParent ? '' : 'เช่น FIN001 หรือ การเงิน'}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {parentLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                  error={Boolean(errors.parent_id)}
                  helperText={errors.parent_id}
                />
              )}
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
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>
            ยกเลิก
          </Button>
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
          <Typography variant="body2">ต้องการลบข้อมูลหน่วยงาน "{targetRow?.dept_name || targetRow?.dept_id}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>
            ยกเลิก
          </Button>
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
