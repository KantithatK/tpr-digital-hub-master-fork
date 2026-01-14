import * as React from 'react';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { supabase } from '@/lib/supabaseClient';

// Simple in-memory demo component for company calendars
const DAY_TYPES = [
  { value: 'work', label: 'วันทำงาน', color: '#ffffff' },
  { value: 'holiday', label: 'วันหยุด', color: '#ffb3b3' },
  { value: 'annual', label: 'วันหยุดประจำปี', color: '#9cc5ff' },
];

function buildMonthGrid(year, month) {
  // month: 0-11
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sunday
  const days = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let week = new Array(7).fill(null);
  // fill leading blanks
  let day = 1;
  for (let i = 0; i < startDay; i++) week[i] = null;
  for (let i = startDay; i < 7 && day <= days; i++) {
    week[i] = { d: day, date: new Date(year, month, day) };
    day++;
  }
  grid.push(week);
  while (day <= days) {
    const w = new Array(7).fill(null);
    for (let i = 0; i < 7 && day <= days; i++) {
      w[i] = { d: day, date: new Date(year, month, day) };
      day++;
    }
    grid.push(w);
  }
  return grid;
}

export default function CompanyCalendarPage() {
  const today = new Date();
  // start with empty rows — real data will be loaded from DB
  const [rows, setRows] = React.useState([]);

  const [filterField, setFilterField] = React.useState('code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');

  const [openDialog, setOpenDialog] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  // include id so we can track DB records
  const [form, setForm] = React.useState({ id: null, code: '', name: '', name_en: '', detail: '' });
  const [errors, setErrors] = React.useState({});

  // confirmation dialog for delete (replace native confirm)
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState(null);

  // table pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Calendar dialog state
  const loading = false;
  const [calMonth, setCalMonth] = React.useState(today.getMonth());
  const [calYear, setCalYear] = React.useState(today.getFullYear());
  const [dayType, setDayType] = React.useState('work');
  const [dayTitle, setDayTitle] = React.useState('');
  const [dayDesc, setDayDesc] = React.useState('');
  // store assignments as map 'YYYY-MM-DD' -> { type, title }
  const [assignments, setAssignments] = React.useState({});
  // selected date in the dialog (for the "กำหนดวัน" button)
  const [selectedDate, setSelectedDate] = React.useState(today);

  // snackbar (match other pages)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const grid = React.useMemo(() => buildMonthGrid(calYear, calMonth), [calMonth, calYear]);

  // load calendars from DB on mount
  React.useEffect(() => {
    let mounted = true;
    async function fetchCalendars() {
      const { data, error } = await supabase.from('company_calendars').select('id, code, name, name_en, detail').order('code', { ascending: true });
      if (error) {
        setSnackbar({ open: true, message: 'ไม่สามารถโหลดปฏิทินจากเซิร์ฟเวอร์', severity: 'error' });
        return;
      }
      if (mounted) setRows(data || []);
    }
    fetchCalendars();
    return () => { mounted = false; };
  }, []);

  // normalized key for the currently selected date (YYYY-MM-DD) or null
  const selKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  function openAdd() {
    setEditMode(false);
    setForm({ id: null, code: '', name: '', name_en: '', detail: '' });
    setErrors({});
    // reset calendar-specific temporary fields so "เพิ่ม" always starts blank
    setDayType('work');
    setDayTitle('');
    setDayDesc('');
    setAssignments({});
    setSelectedDate(today);
    setCalMonth(today.getMonth());
    setCalYear(today.getFullYear());
    setOpenDialog(true);
  }

  async function openEdit(row) {
    setEditMode(true);
    setForm({ id: row.id || null, code: row.code, name: row.name, name_en: row.name_en, detail: row.detail });
    setErrors({});
    // load assignments for this calendar
    if (row.id) {
  const { data, error } = await supabase.from('calendar_assignments').select('assigned_date, day_type, title, description').eq('calendar_id', row.id);
      if (error) {
        setSnackbar({ open: true, message: 'ไม่สามารถโหลดข้อมูลวันที่จากเซิร์ฟเวอร์', severity: 'error' });
      } else {
        const map = {};
        if (data && data.length) {
          data.forEach((r) => {
            const key = (typeof r.assigned_date === 'string') ? r.assigned_date : (new Date(r.assigned_date)).toISOString().slice(0,10);
            map[key] = { type: r.day_type || 'work', title: r.title || '', description: r.description || '' };
          });
        }
        setAssignments(map);
        // set calendar view to first assignment or today
        if (data && data.length) {
          const firstKey = (typeof data[0].assigned_date === 'string') ? data[0].assigned_date : (new Date(data[0].assigned_date)).toISOString().slice(0,10);
          const d = new Date(firstKey);
          setSelectedDate(d);
          setCalMonth(d.getMonth());
          setCalYear(d.getFullYear());
        } else {
          setSelectedDate(today);
          setCalMonth(today.getMonth());
          setCalYear(today.getFullYear());
        }
      }
    }
    setOpenDialog(true);
  }

  function saveRow() {
    // validate
    const newErrors = {};
    if (!form.code || !form.code.trim()) newErrors.code = 'กรุณากรอกรหัสปฏิทิน';
    if (!form.name || !form.name.trim()) newErrors.name = 'กรุณากรอกชื่อปฏิทิน';
    if (Object.keys(newErrors).length) { setErrors(newErrors); setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูล', severity: 'error' }); return; }

    // persist calendar and assignments to DB
    (async () => {
      try {
        let calendarId = form.id || null;

        // Prevent creating/updating a calendar with a duplicate `code` (unique constraint in DB).
        // Check before touching DB so we can show a friendly validation message.
        if (editMode && calendarId) {
          // If editing, ensure no other calendar already uses this code
          const { data: existing, error: chkErr } = await supabase.from('company_calendars').select('id').eq('code', form.code).maybeSingle();
          if (chkErr) throw chkErr;
          if (existing && existing.id && existing.id !== calendarId) {
            setErrors((e) => ({ ...e, code: 'รหัสปฏิทินซ้ำ กรุณาเปลี่ยนรหัส' }));
            setSnackbar({ open: true, message: 'รหัสปฏิทินนี้ถูกใช้งานแล้ว โดยปฏิทินอื่น', severity: 'error' });
            return;
          }

          const { error } = await supabase.from('company_calendars').update({ code: form.code, name: form.name, name_en: form.name_en, detail: form.detail }).eq('id', calendarId);
          if (error) { throw error; }
          setRows((r) => r.map(x => x.id === calendarId ? { ...x, code: form.code, name: form.name, name_en: form.name_en, detail: form.detail } : x));
        } else {
          // If creating, make sure code is not already used.
          const { data: existing, error: chkErr } = await supabase.from('company_calendars').select('id').eq('code', form.code).maybeSingle();
          if (chkErr) throw chkErr;
          if (existing && existing.id) {
            setErrors((e) => ({ ...e, code: 'รหัสปฏิทินซ้ำ กรุณาเปลี่ยนรหัส' }));
            setSnackbar({ open: true, message: 'รหัสปฏิทินนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น', severity: 'error' });
            return;
          }

          // insert new calendar
          const { data, error } = await supabase.from('company_calendars').insert([{ code: form.code, name: form.name, name_en: form.name_en, detail: form.detail }]).select('id, code, name, name_en, detail').single();
          if (error) throw error;
          calendarId = data.id;
          setRows((r) => [{ ...data }, ...r]);
          setForm((p) => ({ ...p, id: calendarId }));
        }

        // persist assignments: remove old ones and insert current map
        if (calendarId) {
          const { error: delErr } = await supabase.from('calendar_assignments').delete().eq('calendar_id', calendarId);
          if (delErr) {
            // not fatal, inform user
            console.warn('failed to delete old assignments', delErr);
          }

          // Make a local copy of assignments and ensure the currently-selected
          // inputs are applied so users who forgot to click "กำหนดวัน" still save
          const effectiveAssignments = { ...assignments };
          if (selectedDate) {
            const sk = selectedDate.toISOString().slice(0, 10);
            effectiveAssignments[sk] = { type: dayType, title: dayTitle || '', description: dayDesc || '' };
          }

          const inserts = Object.entries(effectiveAssignments).map(([k, v]) => ({ calendar_id: calendarId, assigned_date: k, day_type: v.type, title: v.title, description: v.description }));
          // Debug: log effective assignments and payload we will send
          
          

          if (inserts.length) {
            // Ask Supabase to return inserted rows so we can verify description was stored
            const { data: insData, error: insErr } = await supabase.from('calendar_assignments').insert(inserts).select();
            
            if (insErr) throw insErr;

            // Re-fetch assignments for this calendar to verify persisted values
            try {
              const { data: refetch, error: refErr } = await supabase.from('calendar_assignments').select('id,assigned_date,day_type,title,description').eq('calendar_id', calendarId).order('assigned_date', { ascending: true });
              
            } catch (reErr) {
              console.warn('failed to refetch assignments after insert', reErr);
            }
          }
        }

        setSnackbar({ open: true, message: 'บันทึกเรียบร้อย', severity: 'success' });
        setOpenDialog(false);
      } catch (err) {
        console.error(err);
        const msg = err?.message || (err?.error && err.error.message) || JSON.stringify(err);
        setSnackbar({ open: true, message: msg || 'เกิดข้อผิดพลาดขณะบันทึกข้อมูล', severity: 'error' });
      }
    })();
  }

  function removeRow(code) {
    // actual remove action (called after confirmation)
    (async () => {
      try {
        // find the row to delete (to get id)
        const row = rows.find(x => x.code === code);
        if (row && row.id) {
          // delete assignments first
          await supabase.from('calendar_assignments').delete().eq('calendar_id', row.id);
          // delete calendar
          await supabase.from('company_calendars').delete().eq('id', row.id);
        }
        setRows((r) => r.filter(x => x.code !== code));
      } catch (err) {
        console.error(err);
        const msg = err?.message || (err?.error && err.error.message) || JSON.stringify(err);
        setSnackbar({ open: true, message: msg || 'ไม่สามารถลบข้อมูลจากเซิร์ฟเวอร์', severity: 'error' });
      } finally {
        setConfirmOpen(false);
        setConfirmTarget(null);
      }
    })();
  }

  function showConfirmDelete(code) {
    setConfirmTarget(code);
    setConfirmOpen(true);
  }

  function handleCancelDelete() {
    setConfirmOpen(false);
    setConfirmTarget(null);
  }

  function handleConfirmDelete() {
    if (confirmTarget) removeRow(confirmTarget);
  }


  const handleChangePage = (event, newPage) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  function prevMonth() {
    let m = calMonth - 1; let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    setCalMonth(m); setCalYear(y);
  }
  function nextMonth() {
    let m = calMonth + 1; let y = calYear;
    if (m > 11) { m = 0; y += 1; }
    setCalMonth(m); setCalYear(y);
  }

  // (Previously there was a toggleDateAssign function that applied assignment when clicking a cell.
  //  New flow: user selects a date (click cell) then presses the "กำหนดวัน" button to apply.)

  function computeSummaryForMonth(year, month) {
    // Per UX: "จำนวนวันทำงาน" should show the total days in the month (not just weekdays).
    // We still compute weekend/holiday/annual counts for reporting, but `work` here is the
    // total number of days in the month. We subtract assigned holidays/annual days
    // so that "จำนวนวันทำงาน" reflects (days - holiday - annual).
    const days = new Date(year, month + 1, 0).getDate();
    let baseWeekend = 0;
    let holiday = 0, annual = 0;
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) baseWeekend++;
      const key = date.toISOString().slice(0, 10);
      const a = assignments[key];
      if (a) {
        if (a.type === 'holiday') holiday++;
        else if (a.type === 'annual') annual++;
      }
    }
    const work = Math.max(0, days - holiday - annual);
    return { work, weekend: baseWeekend, holiday, annual };
  }

  function computeSummaryForYear(year) {
    let work = 0, weekend = 0, holiday = 0, annual = 0;
    for (let m = 0; m < 12; m++) {
      const s = computeSummaryForMonth(year, m);
      work += s.work; weekend += s.weekend; holiday += s.holiday; annual += s.annual;
    }
    return { work, weekend, holiday, annual };
  }

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // prepare filtered + paginated rows for table
  const filteredRows = React.useMemo(() => rows.filter(r => {
    if (!appliedSearch.trim()) return true;
    const t = appliedSearch.trim().toLowerCase();
    if (filterField === 'code') return r.code.toLowerCase().includes(t);
    if (filterField === 'name') return r.name.toLowerCase().includes(t) || (r.name_en || '').toLowerCase().includes(t);
    return r.code.toLowerCase().includes(t) || r.name.toLowerCase().includes(t) || (r.name_en || '').toLowerCase().includes(t);
  }), [rows, appliedSearch, filterField]);

  const total = filteredRows.length;
  const pagedRows = React.useMemo(() => filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredRows, page, rowsPerPage]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดปฏิทินบริษัท</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={openAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <TextField
              size="small"
              label="ค้นหาตาม"
              select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            >
              <MenuItem value="code">รหัสปฏิทิน</MenuItem>
              <MenuItem value="name">ชื่อปฏิทิน</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="ค้นหา"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(searchInput); }}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, md: 2 } }}>
            <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch(searchInput)}>ค้นหา</Button>
            <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch(''); setFilterField('code'); setPage(0); }}>ล้าง</Button>
          </Stack>
        </Stack>
      </Box>

      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสปฏิทิน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อปฏิทิน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อปฏิทิน (Eng)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><Typography sx={{ py: 2 }}>กำลังโหลดข้อมูล...</Typography></TableCell></TableRow>
            ) : total === 0 ? (
              <TableRow><TableCell colSpan={5} align="center"><Typography sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              pagedRows.map((r) => (
                <TableRow key={r.code} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.name_en}</TableCell>
                  <TableCell>{r.detail}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => openEdit(r)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => showConfirmDelete(r.code)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />
      </TableContainer>

      {/* Dialog for add/edit/calendar */}
      <Dialog open={openDialog} maxWidth="lg" fullWidth onClose={() => setOpenDialog(false)}>
        <DialogTitle>กำหนดปฏิทินบริษัท {editMode ? form.code : 'ใหม่'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* row1: three inputs */}
            <Stack direction="row" spacing={2}>
              <TextField label="รหัสปฏิทิน" size="small" value={form.code} onChange={(e) => setField('code', e.target.value)} sx={{ width: 200 }} required error={Boolean(errors.code)} helperText={errors.code} />
              <TextField label="ชื่อปฏิทิน" size="small" value={form.name} onChange={(e) => setField('name', e.target.value)} sx={{ flex: 1 }} required error={Boolean(errors.name)} helperText={errors.name} />
              <TextField label="ชื่อปฏิทิน (Eng)" size="small" value={form.name_en} onChange={(e) => setField('name_en', e.target.value)} sx={{ flex: 1 }} error={Boolean(errors.name_en)} helperText={errors.name_en} />
            </Stack>
            {/* row2: details */}
            <TextField label="รายละเอียด" size="small" multiline minRows={3} value={form.detail} onChange={(e) => setField('detail', e.target.value)} />

            {/* row3: divider above date (match footer/dialog divider) + selected date center */}
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: 16 }}>{selectedDate.toLocaleDateString('th-TH')}</Typography>
            </Box>

            {/* row4: dropdown type + title */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>ประเภทวัน</InputLabel>
                <Select label="ประเภทวัน" value={dayType} onChange={(e) => setDayType(e.target.value)}>
                  {DAY_TYPES.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="หัวข้อ" size="small" value={dayTitle} onChange={(e) => setDayTitle(e.target.value)} sx={{ flex: 1 }} />
            </Stack>

            {/* row5: description */}
            <TextField label="คำอธิบาย" size="small" multiline minRows={2} value={dayDesc} onChange={(e) => setDayDesc(e.target.value)} />

            {/* row6: action buttons moved to the right; add cancel-assignment button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={() => {
                // assign current inputs to the selected date
                if (!selectedDate) { setSnackbar({ open: true, message: 'กรุณาเลือกวันที่', severity: 'error' }); return; }
                const key = selectedDate.toISOString().slice(0, 10);
                setAssignments((prev) => {
                  const cur = prev[key];
                  const next = { type: dayType, title: dayTitle || '', description: dayDesc || '' };
                  // if same type, title & description -> clear (toggle behavior)
                  if (cur && cur.type === next.type && (cur.title || '') === next.title && (cur.description || '') === next.description) {
                    const n = { ...prev }; delete n[key]; return n;
                  }
                  // otherwise set/update the assignment (preserve description changes)
                  return { ...prev, [key]: next };
                });
              }}>กำหนดวัน</Button>
              {selKey && assignments[selKey] ? (
                <Button variant="outlined" color="error" onClick={() => {
                  // cancel assignment for selected date
                  if (!selectedDate) { setSnackbar({ open: true, message: 'กรุณาเลือกวันที่', severity: 'error' }); return; }
                  const key = selectedDate.toISOString().slice(0, 10);
                  setAssignments((prev) => {
                    if (!prev[key]) {
                      setSnackbar({ open: true, message: 'ไม่มีการกำหนดวันสำหรับวันที่เลือก', severity: 'error' });
                      return prev;
                    }
                    const n = { ...prev }; delete n[key];
                    setSnackbar({ open: true, message: 'ยกเลิกการกำหนดวันเรียบร้อย', severity: 'success' });
                    return n;
                  });
                }}>ยกเลิกกำหนดวัน</Button>
              ) : null}
            </Box>

            {/* row7: month/year controls - back button left, selects centered, next button right */}
            <Stack direction="row" alignItems="center" sx={{ width: '100%' }}>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <IconButton size="small" onClick={prevMonth} sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="previous month">
                  <ArrowBackIosIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))}>
                    {monthNames.map((m, i) => <MenuItem key={i} value={i}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={calYear} onChange={(e) => setCalYear(Number(e.target.value))}>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const y = today.getFullYear() - 4 + i; return <MenuItem key={y} value={y}>{y}</MenuItem>;
                    })}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton size="small" onClick={nextMonth} sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="next month">
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            </Stack>

            {/* row8: calendar UI - render without Paper/extra Box so grid lines are clear */}
            <Box sx={{ border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
              <Stack>
                <Stack direction="row" spacing={0} sx={{ borderBottom: '1px solid #ccc', bgcolor: 'background.paper' }}>
                  {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(d => (
                    <Box key={d} sx={{ flex: 1, textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', py: 1 }}>{d}</Box>
                  ))}
                </Stack>
                {grid.map((week, wi) => (
                  <Stack key={wi} direction="row" spacing={0}>
                    {week.map((c, ci) => {
                      const cellBorder = '1px solid #ccc';
                      if (!c) return (
                        <Box
                          key={ci}
                          sx={{
                            flex: 1,
                            minHeight: 80,
                            borderRight: cellBorder,
                            borderBottom: cellBorder,
                            p: 1,
                            boxSizing: 'border-box',
                            bgcolor: '#fff',
                          }}
                        />
                      );
                      const key = c.date.toISOString().slice(0, 10);
                      const assigned = assignments[key];
                      let bg = '#ffffff';
                      if (assigned) {
                        if (assigned.type === 'holiday') bg = '#ffb3b3';
                        else if (assigned.type === 'annual') bg = '#9cc5ff';
                        else bg = '#ffffff';
                      }
                      const selKey = selectedDate ? selectedDate.toISOString().slice(0,10) : null;
                      const isSelected = selKey === key;
                      return (
                        <Box
                          key={ci}
                          onClick={() => {
                            const k = c.date.toISOString().slice(0,10);
                            const a = assignments[k];
                            if (a) {
                              setDayType(a.type || 'work');
                              setDayTitle(a.title || '');
                              setDayDesc(a.description || '');
                            } else {
                              setDayType('work');
                              setDayTitle('');
                              setDayDesc('');
                            }
                            setSelectedDate(c.date);
                          }}
                          sx={{
                            flex: 1,
                            minHeight: 80,
                            borderRight: cellBorder,
                            borderBottom: cellBorder,
                            p: 1,
                            boxSizing: 'border-box',
                            bgcolor: bg,
                            cursor: 'pointer',
                            boxShadow: isSelected ? 'inset 0 0 0 2px #1976d2' : 'none',
                          }}
                        >
                          <Typography variant="caption">{c.d}</Typography>
                          <Box sx={{ mt: 1, fontSize: 12, color: '#333' }}>{assigned?.title}</Box>
                        </Box>
                      );
                    })}
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* row9: summary */}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Paper elevation={0} sx={{ p: 1, flex: 1, border: '1px solid #ccc', boxShadow: 'none' }}>
                <Typography variant="subtitle2">เดือน : {monthNames[calMonth]}</Typography>
                {(() => {
                  const s = computeSummaryForMonth(calYear, calMonth);
                  return (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันทำงาน</Box><Box>{s.work} วัน</Box></Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันหยุด</Box><Box>{s.holiday} วัน</Box></Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันหยุดประจำปี</Box><Box>{s.annual} วัน</Box></Box>
                    </Box>
                  );
                })()}
              </Paper>
              <Paper elevation={0} sx={{ p: 1, flex: 1, border: '1px solid #ccc', boxShadow: 'none' }}>
                <Typography variant="subtitle2">ปี : {calYear}</Typography>
                {(() => {
                  const s = computeSummaryForYear(calYear);
                  return (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันทำงานทั้งปี</Box><Box>{s.work} วัน</Box></Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันหยุดทั้งปี</Box><Box>{s.holiday} วัน</Box></Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box>จำนวนวันหยุดประจำปีทั้งปี</Box><Box>{s.annual} วัน</Box></Box>
                    </Box>
                  );
                })()}
              </Paper>
            </Stack>

            {/* row10: legend */}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }} alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#ffb3b3', border: '1px solid #ccc' }} /> วันหยุด</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#9cc5ff', border: '1px solid #ccc' }} /> วันหยุดประจำปี</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#ffffff', border: '1px solid #ccc' }} /> วันทำงาน</Box>
            </Stack>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>ปิด</Button>
          <Button variant="contained" onClick={saveRow}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog for delete to match other pages' style */}
      <Dialog open={confirmOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรหัส "{confirmTarget || ''}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="inherit">ยกเลิก</Button>
          <Button variant="contained" color="error" startIcon={<DeleteOutlineIcon />} onClick={handleConfirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

    </Box>
  );
}
