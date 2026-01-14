import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// ================= Assumptions =================
// Supabase table: shift_schedule
// Columns (adjust to real schema):
// id (uuid pk), shift_code (text unique), shift_name (text), shift_type (text),
// start_time (text 'HH:MM'), end_time (text 'HH:MM'), break_minutes (int), total_hours (numeric),
// ot_before_start_minutes (int), ot_after_end_minutes (int), max_ot_hours (numeric), description (text), is_active (bool), created_at, updated_at
// ===============================================

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
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
// Removed RadioGroup related imports; using a select dropdown instead for break calc method
// Removed Grid (no longer needed for layout of break method row)

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const SHIFT_TYPES = ['กะงานปกติ', 'กะงานล่วงเวลา'];
const OT_TYPES = ['OT วันหยุด', 'OT ก่อนเวลางาน', 'OT หลังเวลางาน', 'OT ช่วงเวลางาน'];

const initialForm = {
  id: '',
  shift_code: '',
  shift_name: '',
  shift_type: 'กะงานปกติ',
  start_time: '',
  start_day: 'same', // same | next
  end_time: '',
  end_day: 'same',
  break_minutes: '', // not shown now but keep for future
  break_calc_method: 'actual', // fixed (disabled)
  manual_break_minutes: '',
  total_hours: 0,
  punch_rounds: '', // default 2
  tolerance_minutes: '', // default 1
  // OT tab (still optional unless you request otherwise)
  ot_before_start_minutes: '',
  ot_after_end_minutes: '',
  max_ot_hours: '',
  // Detailed mock fields (now required by request ทุกช่องใน tab)
  first_in_time: '',
  first_out_time: '',
  first_break_start: '',
  first_break_end: '',
  // Day selectors for detailed time & break (same | next)
  first_in_day: 'same',
  first_out_day: 'same',
  first_break_start_day: 'same',
  first_break_end_day: 'same',
  segment_hours: 0,
  ot_type: 'OT หลังเวลางาน', // สำหรับกะงานล่วงเวลา
  // ===== OT Calculation (UI only for now) =====
  ot_calc_method: 'actual', // fixed=ตามค่าคงที่ | threshold=ตามค่ากำหนด OT | actual=ตามชั่วโมงที่ทำจริง | actual_conditional=ตามชั่วโมงที่ทำจริง (แบบมีเงื่อนไข)
  ot_min_hours: '00:00',    // ขั้นต่ำนับ OT (HH:MM)
  ot_income_code: '',
  ot_income_desc: '',
  ot_multiplier: '',
  ot_unit: '',
  // set to empty by default so UI shows placeholder
  // Employee types (UI only for now)
  emp_monthly: true,
  emp_daily: false,
  emp_hourly: false,
  emp_exclude_probation: false,
  // Link one OT shift (for normal shift)
  linked_ot_shift_id: '',
  // Multiple OT links (new)
  linked_ot_shift_ids: [],
};

// Helpers for time & minutes conversion to match DB (time, int minutes)
function minutesToHHMM(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return '00:00';
  const m = Math.max(0, parseInt(mins, 10));
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${h}:${mm}`;
}
function hhmmToMinutes(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + m;
}
function trimSeconds(t) {
  if (!t) return '';
  if (typeof t === 'string' && t.length >= 5) return t.slice(0,5);
  return t;
}
// Normalize a HH:MM string to DB time or return null
function toDbTime(t) {
  if (!t) return null;
  return /^\d{2}:\d{2}$/.test(t) ? t : null;
}

// Helper to compute total hours (simple difference ignoring date wrap)
function computeTotalHours(start, startDay, end, endDay, breakMin) {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startAbs = sh * 60 + sm;
  let endAbs = eh * 60 + em + (endDay === 'next' ? 24 * 60 : 0) - (startDay === 'next' ? 24 * 60 : 0);
  let mins = endAbs - startAbs;
  if (mins < 0) mins = 0;
  mins -= breakMin || 0;
  if (mins < 0) mins = 0;
  return parseFloat((mins / 60).toFixed(2));
}

export default function ShiftSchedulesPage() {
  // Data state
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState('');
  // which field to search/filter by for shift schedules
  const [filterField, setFilterField] = React.useState('shift_code');

  // Form / dialog
  const [openModal, setOpenModal] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [originalId, setOriginalId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  // OT selection state (normal shift)
  const [otOptions, setOtOptions] = React.useState([]); // available OT shifts
  const [otLoading, setOtLoading] = React.useState(false);
  const [selectedOTs, setSelectedOTs] = React.useState([]); // selected OT objects
  const [otSelectValue, setOtSelectValue] = React.useState(''); // current dropdown value to add
  // OT income code options (from payroll_earn_deduct)
  const [otIncomeOptions, setOtIncomeOptions] = React.useState([]); // [{code,name_th,amount}]

  // Delete
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });
  const hideOvertimeBase = form.shift_type === 'กะงานล่วงเวลา' && form.ot_type !== 'OT วันหยุด';

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('shift_schedule').select('*', { count: 'exact' });
      if (appliedSearch.trim()) {
        const t = appliedSearch.trim();
        if (filterField === 'shift_code') {
          query = query.ilike('shift_code', `%${t}%`);
        } else if (filterField === 'shift_name') {
          query = query.ilike('shift_name', `%${t}%`);
        } else if (filterField === 'shift_type') {
          // shift_type is stored as an enum in the DB; ILIKE on enum fails.
          // Match against known SHIFT_TYPES and use the `in` operator.
          const matches = SHIFT_TYPES.filter((s) => s.toLowerCase().includes(t.toLowerCase()));
          if (matches.length) {
            query = query.in('shift_type', matches);
          } else {
            // no matches -> return empty result quickly by using impossible condition
            query = query.eq('id', '-1');
          }
        } else {
          // fallback multi-field
          query = query.or(`shift_code.ilike.%${t}%,shift_name.ilike.%${t}%,shift_type.ilike.%${t}%`);
        }
      }
      const from = page * rowsPerPage; const to = from + rowsPerPage - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []); setTotal(count || 0);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'โหลดข้อมูลล้มเหลว', severity: 'error' });
    } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage, filterField]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // เคลียร์ OT ที่เลือกไว้เมื่อเปลี่ยนประเภทกะเป็นอย่างอื่นที่ไม่ใช่ 'กะงานปกติ'
  React.useEffect(() => {
    if (form.shift_type !== 'กะงานปกติ' && selectedOTs.length) {
      setSelectedOTs([]);
      setField('linked_ot_shift_ids', []);
      setField('linked_ot_shift_id', '');
      setOtSelectValue('');
    }
  }, [form.shift_type, selectedOTs.length]);

  const handleOpenAdd = () => {
    setEditMode(false);
    setForm(initialForm);
    setErrors({});
    setOriginalId(null);
    setActiveTab(0);
    setSelectedOTs([]); // reset OT list
    setOtSelectValue('');
    setOpenModal(true);
  };
  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      id: row.id,
      shift_code: row.shift_code || '',
      shift_name: row.shift_name || '',
      shift_type: row.shift_type || 'กะงานปกติ',
      start_time: trimSeconds(row.start_time) || '',
      start_day: row.start_day || 'same',
      end_time: trimSeconds(row.end_time) || '',
      end_day: row.end_day || 'same',
      break_minutes: row.break_minutes === null || row.break_minutes === undefined ? '' : String(row.break_minutes),
      break_calc_method: row.break_calc_method || 'actual',
      manual_break_minutes: row.manual_break_minutes === null || row.manual_break_minutes === undefined ? '' : String(row.manual_break_minutes),
      total_hours: row.total_hours ?? 0,
      punch_rounds: row.punch_rounds === null || row.punch_rounds === undefined ? '' : String(row.punch_rounds),
      tolerance_minutes: row.tolerance_minutes === null || row.tolerance_minutes === undefined ? '' : String(row.tolerance_minutes),
      ot_before_start_minutes: row.ot_before_start_minutes === null || row.ot_before_start_minutes === undefined ? '' : String(row.ot_before_start_minutes),
      ot_after_end_minutes: row.ot_after_end_minutes === null || row.ot_after_end_minutes === undefined ? '' : String(row.ot_after_end_minutes),
      max_ot_hours: row.max_ot_hours === null || row.max_ot_hours === undefined ? '' : String(row.max_ot_hours),
      first_in_time: trimSeconds(row.first_in_time) || '',
      first_out_time: trimSeconds(row.first_out_time) || '',
      first_break_start: trimSeconds(row.first_break_start) || '',
      first_break_end: trimSeconds(row.first_break_end) || '',
      first_in_day: row.first_in_day || 'same',
      first_out_day: row.first_out_day || 'same',
      first_break_start_day: row.first_break_start_day || 'same',
      first_break_end_day: row.first_break_end_day || 'same',
      segment_hours: row.segment_hours || 0,
      ot_type: row.ot_type || 'OT วันหยุด',
  ot_calc_method: ['fixed','threshold','actual','actual_conditional'].includes(row.ot_calc_method) ? row.ot_calc_method : 'actual',
      ot_min_hours: minutesToHHMM(row.ot_min_minutes),
  ot_income_code: row.ot_income_code || '',
  ot_income_desc: row.ot_income_desc || '',
  ot_multiplier: row.ot_multiplier != null ? String(row.ot_multiplier) : '',
  ot_unit: row.ot_unit || '',
      emp_monthly: row.emp_monthly ?? true,
      emp_daily: row.emp_daily ?? false,
      emp_hourly: row.emp_hourly ?? false,
      emp_exclude_probation: row.emp_exclude_probation ?? false,
      linked_ot_shift_id: row.linked_ot_shift_id || '',
      linked_ot_shift_ids: (function(){
        // Try read multi column if exists
        const multi = row.linked_ot_shift_ids;
        if (Array.isArray(multi)) return multi.filter(Boolean);
        // If stored as JSON string
        if (typeof multi === 'string') {
          try { const parsed = JSON.parse(multi); if (Array.isArray(parsed)) return parsed.filter(Boolean); } catch {/* ignore */}
        }
        // Fallback to single
        return row.linked_ot_shift_id ? [row.linked_ot_shift_id] : [];
      })(),
    });
    setOriginalId(row.id); setErrors({}); setActiveTab(0); setOpenModal(true);
    // preload linked OT detail for normal shift
    if (row.shift_type === 'กะงานปกติ') {
      const ids = [];
      if (row.linked_ot_shift_id) ids.push(row.linked_ot_shift_id);
      if (Array.isArray(row.linked_ot_shift_ids)) ids.push(...row.linked_ot_shift_ids);
      const uniqueIds = [...new Set(ids.filter(Boolean))];
      if (uniqueIds.length) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('shift_schedule')
              .select('id, shift_code, shift_name, ot_type, first_in_time, first_out_time, segment_hours, ot_min_minutes, ot_income_code, ot_income_desc, ot_multiplier')
              .in('id', uniqueIds);
            if (!error && Array.isArray(data)) {
              // Keep order of uniqueIds
              const map = new Map(data.map(d => [d.id, d]));
              setSelectedOTs(uniqueIds.map(i => map.get(i)).filter(Boolean));
            } else setSelectedOTs([]);
          } catch { setSelectedOTs([]); }
        })();
      } else {
        setSelectedOTs([]);
      }
    } else {
      setSelectedOTs([]);
    }
  };
  const handleCloseModal = () => setOpenModal(false);

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { if (deleting) return; setTargetRow(null); setOpenDelete(false); };
  const handleConfirmDelete = async () => { if (!targetRow || deleting) return; setDeleting(true); try { const { error } = await supabase.from('shift_schedule').delete().eq('id', targetRow.id); if (error) throw error; setSnackbar({ open: true, message: 'ลบสำเร็จ', severity: 'success' }); handleCloseDelete(); fetchData(); } catch (err) { setSnackbar({ open: true, message: err.message || 'ลบไม่สำเร็จ', severity: 'error' }); } finally { setDeleting(false); } };

  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  React.useEffect(() => {
    // auto update total hours when base fields change
    setForm((p) => ({
      ...p,
      total_hours: computeTotalHours(
        p.start_time,
        p.start_day,
        p.end_time,
        p.end_day,
        p.break_calc_method === 'manual' ? (parseInt(p.manual_break_minutes, 10) || 0) : (parseInt(p.break_minutes, 10) || 0),
      ),
    }));
  }, [form.start_time, form.start_day, form.end_time, form.end_day, form.break_minutes, form.manual_break_minutes, form.break_calc_method]);

  // Compute segment_hours for detailed mock section
  React.useEffect(() => {
    const fmt = /^\d{2}:\d{2}$/;
    if (!fmt.test(form.first_in_time) || !fmt.test(form.first_out_time)) {
      setForm(p => (p.segment_hours === 0 ? p : { ...p, segment_hours: 0 }));
      return;
    }
    const [ih, im] = form.first_in_time.split(':').map(Number);
    const [oh, om] = form.first_out_time.split(':').map(Number);
    let inAbs = ih * 60 + im + (form.first_in_day === 'next' ? 24 * 60 : 0);
    let outAbs = oh * 60 + om + (form.first_out_day === 'next' ? 24 * 60 : 0);

    // กรณี OT (non-holiday) ซ่อน day selector และเวลาสิ้นสุดน้อยกว่าหรือเท่ากับเวลาเข้า -> แปลว่าข้ามเที่ยงคืน ให้บวก 24 ชั่วโมงให้ทันที
    if (outAbs <= inAbs && hideOvertimeBase) {
      outAbs += 24 * 60;
    }
    if (outAbs <= inAbs) { // ยังผิดอยู่ให้เป็น 0
      setForm(p => (p.segment_hours === 0 ? p : { ...p, segment_hours: 0 }));
      return;
    }
    let mins = outAbs - inAbs;
    let breakMins = 0;
    const breakFmtValid = fmt.test(form.first_break_start) && fmt.test(form.first_break_end);
    if (breakFmtValid) {
      const [bsH, bsM] = form.first_break_start.split(':').map(Number);
      const [beH, beM] = form.first_break_end.split(':').map(Number);
      let bsAbs = bsH * 60 + bsM + (form.first_break_start_day === 'next' ? 24 * 60 : 0);
      let beAbs = beH * 60 + beM + (form.first_break_end_day === 'next' ? 24 * 60 : 0);
      // หากซ่อน day selector และเวลาจบพัก <= เวลาเริ่มพัก ให้ถือว่าข้ามเที่ยงคืน
      if (beAbs <= bsAbs && hideOvertimeBase) beAbs += 24 * 60;
      if (beAbs > bsAbs && bsAbs >= inAbs && beAbs <= outAbs) {
        breakMins = beAbs - bsAbs;
      }
    }
    if (breakMins > mins) breakMins = 0;
    const segHours = parseFloat(((mins - breakMins) / 60).toFixed(2));
    setForm(p => (p.segment_hours === segHours ? p : { ...p, segment_hours: segHours }));
  }, [form.first_in_time, form.first_out_time, form.first_break_start, form.first_break_end, form.first_in_day, form.first_out_day, form.first_break_start_day, form.first_break_end_day, hideOvertimeBase]);

  const handleSave = async () => {
    if (saving) return;
    const newErrors = {};
    if (!form.shift_code.trim()) newErrors.shift_code = 'กรุณากรอกรหัสกะ';
    if (!form.shift_name.trim()) newErrors.shift_name = 'กรุณากรอกชื่อกะ';
    if (!hideOvertimeBase) {
      if (!/^\d{2}:\d{2}$/.test(form.start_time)) newErrors.start_time = 'รูปแบบ HH:MM';
      if (!/^\d{2}:\d{2}$/.test(form.end_time)) newErrors.end_time = 'รูปแบบ HH:MM';
    }
    if (form.shift_code.length > 20) newErrors.shift_code = 'ไม่เกิน 20 ตัวอักษร';
    if (form.shift_name.length > 150) newErrors.shift_name = 'ไม่เกิน 150 ตัวอักษร';
    // Required fields in both tabs (normal & overtime shift main tab)
    const requiredNumeric = ['punch_rounds', 'tolerance_minutes'];
    requiredNumeric.forEach(f => { if (form[f] === '') newErrors[f] = 'จำเป็น'; });
    // Detailed required time fields
    if (!/^\d{2}:\d{2}$/.test(form.first_in_time)) newErrors.first_in_time = 'HH:MM';
    if (!/^\d{2}:\d{2}$/.test(form.first_out_time)) newErrors.first_out_time = 'HH:MM';
    const isOvertimeShift = form.shift_type === 'กะงานล่วงเวลา';
    if (isOvertimeShift) {
      // Not required; only validate if user entered something OR one filled without the other
      const hasAny = form.first_break_start.trim() !== '' || form.first_break_end.trim() !== '';
      if (hasAny) {
        if (!/^\d{2}:\d{2}$/.test(form.first_break_start)) newErrors.first_break_start = 'HH:MM';
        if (!/^\d{2}:\d{2}$/.test(form.first_break_end)) newErrors.first_break_end = 'HH:MM';
      }
    } else {
      // Normal shift: required
      if (!/^\d{2}:\d{2}$/.test(form.first_break_start)) newErrors.first_break_start = 'HH:MM';
      if (!/^\d{2}:\d{2}$/.test(form.first_break_end)) newErrors.first_break_end = 'HH:MM';
    }
  if (form.shift_type === 'กะงานล่วงเวลา' && !form.ot_type) newErrors.ot_type = 'เลือกประเภท OT';
    // Validate OT minimum hours (require HH:MM and minutes < 60)
    if (form.shift_type === 'กะงานล่วงเวลา') {
      if (!/^\d{2}:\d{2}$/.test(form.ot_min_hours)) newErrors.ot_min_hours = 'HH:MM';
      else {
        const [hh, mm] = form.ot_min_hours.split(':').map(Number);
        if (mm > 59) newErrors.ot_min_hours = 'นาที 00-59';
        if (hh > 99) newErrors.ot_min_hours = 'ชั่วโมงไม่เกิน 99';
      }
    }
    // Numeric validations (>=0) for ones user typed
    const numericToCheck = ['punch_rounds', 'tolerance_minutes', 'break_minutes'];
    numericToCheck.forEach(f => { if (form[f] !== '') { const v = parseInt(form[f], 10); if (isNaN(v) || v < 0) newErrors[f] = '>= 0'; } });
    // Removed OT numeric fields requirement for normal shift (replaced by dropdown ค้นหา OT)
    if (Object.keys(newErrors).length) { setErrors(newErrors); setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูล', severity: 'error' }); return; }
    setSaving(true);
    const payload = {
      shift_code: form.shift_code.trim(),
      shift_name: form.shift_name.trim(),
      shift_type: form.shift_type,
      // If user didn't input (e.g. hidden for some OT types) send null instead of '' to avoid invalid time
      start_time: toDbTime(form.start_time),
      end_time: toDbTime(form.end_time),
      start_day: form.start_day,
      end_day: form.end_day,
      break_minutes: parseInt(form.break_minutes, 10) || 0,
      break_calc_method: form.break_calc_method,
      manual_break_minutes: parseInt(form.manual_break_minutes, 10) || 0,
      punch_rounds: parseInt(form.punch_rounds, 10) || 0,
      tolerance_minutes: parseInt(form.tolerance_minutes, 10) || 0,
      total_hours: form.total_hours,
      ot_before_start_minutes: parseInt(form.ot_before_start_minutes, 10) || 0,
      ot_after_end_minutes: parseInt(form.ot_after_end_minutes, 10) || 0,
      max_ot_hours: parseFloat(form.max_ot_hours) || 0,
      ot_type: form.shift_type === 'กะงานล่วงเวลา' ? form.ot_type : null,
      ot_calc_method: form.ot_calc_method,
      ot_min_minutes: hhmmToMinutes(form.ot_min_hours),
      ot_income_code: form.ot_income_code || null,
      ot_income_desc: form.ot_income_desc || null,
      ot_multiplier: parseFloat(form.ot_multiplier) || 0,
      first_in_time: toDbTime(form.first_in_time),
      first_out_time: toDbTime(form.first_out_time),
      first_break_start: toDbTime(form.first_break_start),
      first_break_end: toDbTime(form.first_break_end),
      first_in_day: form.first_in_day,
      first_out_day: form.first_out_day,
      first_break_start_day: form.first_break_start_day,
      first_break_end_day: form.first_break_end_day,
      segment_hours: form.segment_hours,
      emp_monthly: !!form.emp_monthly,
      emp_daily: !!form.emp_daily,
      emp_hourly: !!form.emp_hourly,
      emp_exclude_probation: !!form.emp_exclude_probation,
      // Backward compatibility single column keeps first id
      linked_ot_shift_id: form.shift_type === 'กะงานปกติ' ? (selectedOTs[0]?.id || null) : null,
      // New multi column (if exists). Prefer array of ids.
      linked_ot_shift_ids: form.shift_type === 'กะงานปกติ' ? selectedOTs.map(o => o.id) : [],
      updated_at: new Date().toISOString(),
    };
    try {
      const attempt = async (pl) => {
        if (editMode) {
          const { error } = await supabase.from('shift_schedule').update(pl).eq('id', originalId);
          if (error) throw error;
          setSnackbar({ open: true, message: 'บันทึกการแก้ไขสำเร็จ', severity: 'success' });
        } else {
          const { error } = await supabase.from('shift_schedule').insert([{ ...pl, created_at: new Date().toISOString() }]);
          if (error) throw error;
          setSnackbar({ open: true, message: 'เพิ่มข้อมูลสำเร็จ', severity: 'success' });
        }
      };
      try {
        await attempt(payload);
      } catch (inner) {
        const m = inner?.message || '';
        // If multi column missing, retry without linked_ot_shift_ids
        if (/linked_ot_shift_ids/i.test(m) && /column/i.test(m)) {
          const { linked_ot_shift_ids: _ignoreMulti, ...rest } = payload;
          try {
            await attempt(rest);
            setSnackbar({ open: true, message: 'บันทึกสำเร็จ (ยังไม่ได้เพิ่มคอลัมน์ linked_ot_shift_ids ใน DB)', severity: 'warning' });
          } catch (inner2) {
            const m2 = inner2?.message || '';
            if (/linked_ot_shift_id/i.test(m2) && /column/i.test(m2)) {
              const { linked_ot_shift_id: _ignoreSingle, ...rest2 } = rest;
              await attempt(rest2);
              setSnackbar({ open: true, message: 'บันทึกสำเร็จ (ยังไม่มีคอลัมน์ linked_ot_shift_id/linked_ot_shift_ids ใน DB)', severity: 'warning' });
            } else throw inner2;
          }
        } else if (/linked_ot_shift_id/i.test(m) && /column/i.test(m)) {
          const { linked_ot_shift_id: _ignoreSingle, ...rest } = payload;
          await attempt(rest);
          setSnackbar({ open: true, message: 'บันทึกสำเร็จ (ยังไม่ได้เพิ่มคอลัมน์ linked_ot_shift_id ใน DB)', severity: 'warning' });
        } else throw inner;
      }
      setOpenModal(false); fetchData();
    } catch (err) {
      const msg = err?.message || '';
      const isDuplicate = /duplicate|unique constraint|unique key|already exists/i.test(msg) || err?.code === '23505';
      if (isDuplicate) {
        setErrors((p) => ({ ...p, shift_code: 'รหัสนี้ถูกใช้แล้ว' }));
        setSnackbar({ open: true, message: 'รหัสกะงานนี้ถูกใช้แล้ว กรุณาเปลี่ยนรหัสใหม่', severity: 'error' });
        // ลองหา code ใหม่ให้อัตโนมัติ (เพิ่ม -1, -2, ... ต่อท้าย)
        (async () => {
          try {
            const base = form.shift_code.trim();
            if (!base) return;
            const { data, error } = await supabase
              .from('shift_schedule')
              .select('shift_code')
              .ilike('shift_code', `${base}%`);
            if (error || !Array.isArray(data)) return;
            let max = 0;
            const regex = new RegExp(`^${base}(?:-(\\d+))?$`);
            data.forEach(r => {
              const m = regex.exec(r.shift_code);
              if (m) {
                const num = m[1] ? parseInt(m[1], 10) : 0;
                if (num > max) max = num;
              }
            });
            const suggestion = max === 0 ? `${base}-1` : `${base}-${max + 1}`;
            // ตั้งค่าเฉพาะถ้า field ยังไม่ถูกแก้เป็นค่าอื่น
            setForm(p => (p.shift_code === base ? { ...p, shift_code: suggestion } : p));
          } catch {/* ignore suggestion errors */}
        })();
      } else {
        setSnackbar({ open: true, message: msg || 'บันทึกไม่สำเร็จ', severity: 'error' });
      }
    } finally { setSaving(false); }
  };

  // ---------- Time input helpers (enforce HH:MM) ----------
  const handleTimeInput = (field) => (e) => {
    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); // HHMM
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
    }
    setField(field, formatted);
  };

  const handleTimeBlur = (field, value) => {
    // Auto-complete to HH:MM if possible (e.g. '8' -> '08:00', '083' -> '08:30')
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return;
    let hh = '00'; let mm = '00';
    if (digits.length <= 2) {
      hh = digits.padStart(2, '0');
    } else if (digits.length === 3) {
      hh = digits.slice(0, 2); mm = digits.slice(2).padEnd(2, '0');
    } else if (digits.length === 4) {
      hh = digits.slice(0, 2); mm = digits.slice(2, 4);
    }
    const hNum = parseInt(hh, 10); const mNum = parseInt(mm, 10);
    const safeH = isNaN(hNum) ? '00' : (hNum > 99 ? '99' : hh);
    const safeM = isNaN(mNum) ? '00' : (mNum > 59 ? '59' : mm);
    const finalVal = `${safeH}:${safeM}`;
    setField(field, finalVal);
  };

  // Fetch OT options for dropdown when modal open for normal shift
  React.useEffect(() => {
    if (!openModal || form.shift_type !== 'กะงานปกติ') return;
    let isMounted = true;
    (async () => {
      setOtLoading(true);
      try {
        const { data, error } = await supabase
          .from('shift_schedule')
          .select('id, shift_code, shift_name, ot_type, first_in_time, first_out_time, segment_hours, ot_min_minutes, ot_income_code, ot_income_desc, ot_multiplier')
          .eq('shift_type', 'กะงานล่วงเวลา')
          .order('created_at', { ascending: false })
          .limit(200);
        if (!error && isMounted) {
          const list = data || [];
            setOtOptions(list);
            // Align selectedOTs objects with fresh list (preserve order)
            if (selectedOTs.length) {
              const map = new Map(list.map(o => [o.id, o]));
              setSelectedOTs(prev => prev.map(p => map.get(p.id) || p));
            }
        }
      } catch { /* ignore */ }
      finally { if (isMounted) setOtLoading(false); }
    })();
    return () => { isMounted = false; };
  }, [openModal, form.shift_type, selectedOTs.length]);

  // Load OT income codes from payroll_earn_deduct (group: 'รายได้ค่าล่วงเวลา') when modal opens
  React.useEffect(() => {
    if (!openModal) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('payroll_earn_deduct')
          .select('code, name_th, amount')
          .eq('group_code', 'รายได้ค่าล่วงเวลา')
          .order('code', { ascending: true })
          .limit(500);
        if (!error && isMounted) {
          setOtIncomeOptions((data || []).map((r) => ({
            code: r.code,
            name: r.name_th || r.name_en || r.name || '',
            amount: r.amount,
            // try common unit field names if present
            unit: r.unit || r.unit_name || r.unit_th || r.unit_en || null,
          })));
        }
      } catch (err) {
        console.warn('Load OT income options failed', err?.message || err);
      } finally {
        // done
      }
    })();
    return () => { isMounted = false; };
  }, [openModal]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">บันทึกข้อมูลกะงาน</Typography>
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
          sx={{ minWidth: { xs: '100%', md: 220 } }}
        >
          <MenuItem value="shift_code">รหัสกะงาน</MenuItem>
          <MenuItem value="shift_name">ชื่อกะงาน</MenuItem>
          <MenuItem value="shift_type">ประเภทกะงาน</MenuItem>
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
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสกะงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อกะงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ประเภทกะงาน</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>เวลาเข้า</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>เวลาออก</TableCell>
              {/* ชั่วโมงรวม column hidden */}
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.shift_code}</TableCell>
                  <TableCell>{row.shift_name}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.shift_type}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.first_in_time ? String(row.first_in_time).slice(0,5) : ''}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.first_out_time ? String(row.first_out_time).slice(0,5) : ''}</TableCell>
                  {/* total_hours cell hidden */}
                  {/* is_active column removed */}
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

      {/* Add/Edit Dialog with Tabs */}
      <Dialog open={openModal} onClose={() => { if (saving) return; handleCloseModal(); }} disableEscapeKeyDown={saving} fullWidth maxWidth="md">
        <DialogTitle>{editMode ? 'แก้ไขกะงาน' : 'เพิ่มกะงาน'}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {/* Tabs header hidden as requested; activeTab logic retained (always 0) */}
          <Box sx={{ p: 2 }}>
            {/* Content rendering based on shift_type + activeTab */}
            {form.shift_type === 'กะงานปกติ' && activeTab === 0 && (
              <Stack spacing={2}>
                {/* Row 1: ประเภทกะงาน + รหัสกะงาน */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="ประเภทกะงาน" select size="small" value={form.shift_type} onChange={(e) => setField('shift_type', e.target.value)} sx={{ flex: 1 }} disabled={editMode}>
                    {SHIFT_TYPES.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
                  </TextField>
                  <TextField label="รหัสกะงาน" value={form.shift_code} onChange={(e) => setField('shift_code', e.target.value)} inputProps={{ maxLength: 20 }} required size="small" disabled={editMode} error={Boolean(errors.shift_code)} helperText={errors.shift_code} sx={{ flex: 1 }} />
                </Stack>
                {/* Row 1.5: ชื่อกะงาน */}
                <TextField label="ชื่อกะงาน" value={form.shift_name} onChange={(e) => setField('shift_name', e.target.value)} inputProps={{ maxLength: 150 }} required size="small" error={Boolean(errors.shift_name)} helperText={errors.shift_name} fullWidth />
                {/* Row 2: รอบเวลาเริ่มต้น-สิ้นสุด (4 equal columns) */}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="รอบเวลาเริ่มต้น" placeholder="HH:MM" required value={form.start_time} onChange={handleTimeInput('start_time')} onBlur={() => handleTimeBlur('start_time', form.start_time)} size="small" error={Boolean(errors.start_time)} helperText={errors.start_time || 'HH:MM'} sx={{ flex: 1 }} />
                  <TextField label="วันเริ่ม" select size="small" value={form.start_day} onChange={(e) => setField('start_day', e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="same">วันเดียวกัน</MenuItem>
                    {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                  </TextField>
                  <TextField label="รอบเวลาสิ้นสุด" placeholder="HH:MM" required value={form.end_time} onChange={handleTimeInput('end_time')} onBlur={() => handleTimeBlur('end_time', form.end_time)} size="small" error={Boolean(errors.end_time)} helperText={errors.end_time || 'HH:MM'} sx={{ flex: 1 }} />
                  <TextField label="วันสิ้นสุด" select size="small" value={form.end_day} onChange={(e) => setField('end_day', e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="same">วันเดียวกัน</MenuItem>
                    <MenuItem value="next">วันถัดไป</MenuItem>
                  </TextField>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="ลงเวลาทั้งหมด"
                    value={form.punch_rounds}
                    onChange={(e) => setField('punch_rounds', e.target.value.replace(/[^0-9]/g, ''))}
                    size="small"
                    required
                    error={Boolean(errors.punch_rounds)}
                    helperText={errors.punch_rounds}
                    InputProps={{ endAdornment: <InputAdornment position="end">ครั้ง</InputAdornment> }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ flex: 1 }}
                    fullWidth
                  />
                  <TextField
                    label="ลงเวลาห่างกันได้"
                    value={form.tolerance_minutes}
                    onChange={(e) => setField('tolerance_minutes', e.target.value.replace(/[^0-9]/g, ''))}
                    size="small"
                    required
                    error={Boolean(errors.tolerance_minutes)}
                    helperText={errors.tolerance_minutes}
                    InputProps={{ endAdornment: <InputAdornment position="end">นาที</InputAdornment> }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ flex: 1 }}
                    fullWidth
                  />
                  <TextField
                    select
                    size="small"
                    label="วิธีคำนวณชั่วโมงพักเบรก"
                    value={form.break_calc_method}
                    onChange={() => { /* read-only */ }}
                    sx={{ flex: 2 }}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  >
                    <MenuItem value="actual">คำนวณตามจริง</MenuItem>
                    <MenuItem value="manual">กำหนดเอง</MenuItem>
                  </TextField>
                </Stack>
                <Divider sx={{ mt: 1, fontWeight: 'bold' }}>เวลาทำงาน</Divider>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {/* Work interval row: 4 columns */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField label="เวลาเข้า" placeholder="HH:MM" required value={form.first_in_time} onChange={handleTimeInput('first_in_time')} onBlur={() => handleTimeBlur('first_in_time', form.first_in_time)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_in_time)} helperText={errors.first_in_time || 'HH:MM'} />
                    <TextField label="วันเริ่ม" select size="small" value={form.first_in_day} onChange={(e) => setField('first_in_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                    </TextField>
                    <TextField label="เวลาออก" placeholder="HH:MM" required value={form.first_out_time} onChange={handleTimeInput('first_out_time')} onBlur={() => handleTimeBlur('first_out_time', form.first_out_time)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_out_time)} helperText={errors.first_out_time || 'HH:MM'} />
                    <TextField label="วันสิ้นสุด" select size="small" value={form.first_out_day} onChange={(e) => setField('first_out_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      <MenuItem value="next">วันถัดไป</MenuItem>
                    </TextField>
                  </Stack>
                  {/* Break interval row: 4 columns */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField label="เริ่มพัก" placeholder="HH:MM" required value={form.first_break_start} onChange={handleTimeInput('first_break_start')} onBlur={() => handleTimeBlur('first_break_start', form.first_break_start)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_break_start)} helperText={errors.first_break_start || 'HH:MM'} />
                    <TextField label="วันเริ่ม" select size="small" value={form.first_break_start_day} onChange={(e) => setField('first_break_start_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                    </TextField>
                    <TextField label="สิ้นสุดพัก" placeholder="HH:MM" required value={form.first_break_end} onChange={handleTimeInput('first_break_end')} onBlur={() => handleTimeBlur('first_break_end', form.first_break_end)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_break_end)} helperText={errors.first_break_end || 'HH:MM'} />
                    <TextField label="วันสิ้นสุด" select size="small" value={form.first_break_end_day} onChange={(e) => setField('first_break_end_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      <MenuItem value="next">วันถัดไป</MenuItem>
                    </TextField>
                  </Stack>
                  {/* Total hours row */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                      label="รวมเวลาทำงาน"
                      value={form.segment_hours}
                      size="small"
                      InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">ชั่วโมง</InputAdornment> }}
                      inputProps={{ style: { textAlign: 'right' } }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Stack>
                <Divider sx={{ mt: 2, fontWeight: 'bold' }}>ข้อกำหนด OT</Divider>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <TextField
                      select
                      size="small"
                      label={otLoading ? 'กำลังโหลด OT...' : 'เลือก OT'}
                      value={otSelectValue}
                      onChange={(e) => setOtSelectValue(e.target.value)}
                      disabled={otLoading}
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="">- เลือก -</MenuItem>
                      {otOptions.map(o => (
                        <MenuItem key={o.id} value={o.id} disabled={selectedOTs.some(s => s.id === o.id)}>
                          {o.shift_code} - {o.shift_name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (!otSelectValue) return;
                        const found = otOptions.find(o => o.id === otSelectValue);
                        if (!found) return;
                        if (selectedOTs.some(s => s.id === found.id)) return; // prevent duplicates
                        const updated = [...selectedOTs, found];
                        setSelectedOTs(updated);
                        setField('linked_ot_shift_ids', updated.map(o => o.id));
                        setOtSelectValue('');
                      }}
                      disabled={!otSelectValue || selectedOTs.some(s => s.id === otSelectValue)}
                    >เพิ่ม</Button>
                    {selectedOTs.length > 0 && (
                      <Button
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedOTs([]);
                          setField('linked_ot_shift_ids', []);
                        }}
                      >ล้างทั้งหมด</Button>
                    )}
                  </Stack>
                  
                  {selectedOTs.length > 0 && (
                    <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50', maxHeight: 240 }}>
                      <Table size="small" stickyHeader sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>รหัส</TableCell>
                            <TableCell>ชื่อ OT</TableCell>
                            <TableCell>ประเภท</TableCell>
                            <TableCell>เข้า</TableCell>
                            <TableCell>ออก</TableCell>
                            <TableCell sx={{ width: 60 }} align="center">ลบ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedOTs.map(ot => (
                            <TableRow key={ot.id} hover>
                              <TableCell>{ot.shift_code}</TableCell>
                              <TableCell>{ot.shift_name}</TableCell>
                              <TableCell>{ot.ot_type || '-'}</TableCell>
                              <TableCell>{(ot.first_in_time||'').slice(0,5)}</TableCell>
                              <TableCell>{(ot.first_out_time||'').slice(0,5)}</TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => {
                                  const updated = selectedOTs.filter(s => s.id !== ot.id);
                                  setSelectedOTs(updated);
                                  setField('linked_ot_shift_ids', updated.map(o => o.id));
                                }}>
                                  <ClearIcon fontSize="inherit" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </Stack>
            )}
            {/* Separate OT tab removed; OT fields embedded below */}
            {form.shift_type === 'กะงานล่วงเวลา' && activeTab === 0 && (
              <Stack spacing={2}>
                {/* Row 1: ประเภทกะงาน + รหัสกะงาน */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="ประเภทกะงาน" select size="small" value={form.shift_type} onChange={(e) => setField('shift_type', e.target.value)} sx={{ flex: 1 }} disabled={editMode}>
                    {SHIFT_TYPES.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
                  </TextField>
                  <TextField
                    label="ประเภท OT"
                    select
                    required
                    size="small"
                    value={form.ot_type}
                    onChange={(e) => setField('ot_type', e.target.value)}
                    error={Boolean(errors.ot_type)}
                    helperText={errors.ot_type}
                    sx={{ flex: 1 }}
                    disabled={editMode}
                  >
                    {OT_TYPES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <TextField label="รหัสกะงาน" value={form.shift_code} onChange={(e) => setField('shift_code', e.target.value)} inputProps={{ maxLength: 20 }} required size="small" disabled={editMode} error={Boolean(errors.shift_code)} helperText={errors.shift_code} sx={{ flex: 1 }} />
                </Stack>
                {/* Row 1.5: ชื่อกะงาน */}
                <TextField label="ชื่อกะงาน" value={form.shift_name} onChange={(e) => setField('shift_name', e.target.value)} inputProps={{ maxLength: 150 }} required size="small" error={Boolean(errors.shift_name)} helperText={errors.shift_name} fullWidth />
                {!hideOvertimeBase && (
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField label="รอบเวลาเริ่มต้น" placeholder="HH:MM" required value={form.start_time} onChange={handleTimeInput('start_time')} onBlur={() => handleTimeBlur('start_time', form.start_time)} size="small" error={Boolean(errors.start_time)} helperText={errors.start_time || 'HH:MM'} sx={{ flex: 1 }} />
                    <TextField label="วันเริ่ม" select size="small" value={form.start_day} onChange={(e) => setField('start_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                    </TextField>
                    <TextField label="รอบเวลาสิ้นสุด" placeholder="HH:MM" required value={form.end_time} onChange={handleTimeInput('end_time')} onBlur={() => handleTimeBlur('end_time', form.end_time)} size="small" error={Boolean(errors.end_time)} helperText={errors.end_time || 'HH:MM'} sx={{ flex: 1 }} />
                    <TextField label="วันสิ้นสุด" select size="small" value={form.end_day} onChange={(e) => setField('end_day', e.target.value)} sx={{ flex: 1 }}>
                      <MenuItem value="same">วันเดียวกัน</MenuItem>
                      <MenuItem value="next">วันถัดไป</MenuItem>
                    </TextField>
                  </Stack>
                )}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                  <TextField
                    label="ลงเวลาทั้งหมด"
                    value={form.punch_rounds}
                    onChange={(e) => setField('punch_rounds', e.target.value.replace(/[^0-9]/g, ''))}
                    size="small"
                    required
                    error={Boolean(errors.punch_rounds)}
                    helperText={errors.punch_rounds}
                    InputProps={{ endAdornment: <InputAdornment position="end">ครั้ง</InputAdornment> }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ flex: 1 }}
                    fullWidth
                  />
                  <TextField
                    label="ลงเวลาห่างกันได้"
                    value={form.tolerance_minutes}
                    onChange={(e) => setField('tolerance_minutes', e.target.value.replace(/[^0-9]/g, ''))}
                    size="small"
                    required
                    error={Boolean(errors.tolerance_minutes)}
                    helperText={errors.tolerance_minutes}
                    InputProps={{ endAdornment: <InputAdornment position="end">นาที</InputAdornment> }}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ flex: 1 }}
                    fullWidth
                  />
                  <TextField
                    select
                    size="small"
                    label="วิธีคำนวณชั่วโมงพักเบรก"
                    value={form.break_calc_method}
                    onChange={() => { /* read-only */ }}
                    sx={{ flex: 2 }}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  >
                    <MenuItem value="actual">คำนวณตามจริง</MenuItem>
                    <MenuItem value="manual">กำหนดเอง</MenuItem>
                  </TextField>
                </Stack>
                <Divider sx={{ mt: 1, fontWeight: 'bold' }}>เวลาทำงาน</Divider>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  {/* Work interval row (hide day selectors when not OT วันหยุด) */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField label="เวลาเข้า" placeholder="HH:MM" required value={form.first_in_time} onChange={handleTimeInput('first_in_time')} onBlur={() => handleTimeBlur('first_in_time', form.first_in_time)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_in_time)} helperText={errors.first_in_time || 'HH:MM'} />
                    {!hideOvertimeBase && (
                      <TextField label="วันเริ่ม" select size="small" value={form.first_in_day} onChange={(e) => setField('first_in_day', e.target.value)} sx={{ flex: 1 }}>
                        <MenuItem value="same">วันเดียวกัน</MenuItem>
                        {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                      </TextField>
                    )}
                    <TextField label="เวลาออก" placeholder="HH:MM" required value={form.first_out_time} onChange={handleTimeInput('first_out_time')} onBlur={() => handleTimeBlur('first_out_time', form.first_out_time)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_out_time)} helperText={errors.first_out_time || 'HH:MM'} />
                    {!hideOvertimeBase && (
                      <TextField label="วันสิ้นสุด" select size="small" value={form.first_out_day} onChange={(e) => setField('first_out_day', e.target.value)} sx={{ flex: 1 }}>
                        <MenuItem value="same">วันเดียวกัน</MenuItem>
                        <MenuItem value="next">วันถัดไป</MenuItem>
                      </TextField>
                    )}
                  </Stack>
                  {/* Break interval row (hide day selectors when not OT วันหยุด) */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField label="เริ่มพัก" placeholder="HH:MM" value={form.first_break_start} onChange={handleTimeInput('first_break_start')} onBlur={() => handleTimeBlur('first_break_start', form.first_break_start)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_break_start)} helperText={errors.first_break_start || 'ไม่บังคับ'} />
                    {!hideOvertimeBase && (
                      <TextField label="วันเริ่ม" select size="small" value={form.first_break_start_day} onChange={(e) => setField('first_break_start_day', e.target.value)} sx={{ flex: 1 }}>
                        <MenuItem value="same">วันเดียวกัน</MenuItem>
                        {/* <MenuItem value="next">วันถัดไป</MenuItem> */}
                      </TextField>
                    )}
                    <TextField label="สิ้นสุดพัก" placeholder="HH:MM" value={form.first_break_end} onChange={handleTimeInput('first_break_end')} onBlur={() => handleTimeBlur('first_break_end', form.first_break_end)} size="small" sx={{ flex: 1 }} error={Boolean(errors.first_break_end)} helperText={errors.first_break_end || 'ไม่บังคับ'} />
                    {!hideOvertimeBase && (
                      <TextField label="วันสิ้นสุด" select size="small" value={form.first_break_end_day} onChange={(e) => setField('first_break_end_day', e.target.value)} sx={{ flex: 1 }}>
                        <MenuItem value="same">วันเดียวกัน</MenuItem>
                        <MenuItem value="next">วันถัดไป</MenuItem>
                      </TextField>
                    )}
                  </Stack>
                  {/* Total hours row (match normal shift) */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                      label="รวมเวลาทำงาน"
                      value={form.segment_hours}
                      size="small"
                      InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">ชั่วโมง</InputAdornment> }}
                      inputProps={{ style: { textAlign: 'right' } }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                  {/* OT calculation divider at bottom as requested */}
                  <Divider sx={{ mt: 2, fontWeight: 'bold' }}>การคำนวณชั่วโมง OT</Divider>
                  {/* OT Calculation Fields */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      select
                      size="small"
                      label="วิธีคำนวณ"
                      value={form.ot_calc_method}
                      onChange={() => { /* read-only */ }}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1, cursor: 'default', minWidth: 0 }}
                    >
                      <MenuItem value="fixed">ตามค่าคงที่</MenuItem>
                      <MenuItem value="threshold">ตามค่ากำหนด OT</MenuItem>
                      <MenuItem value="actual">ตามชั่วโมงที่ทำจริง</MenuItem>
                      <MenuItem value="actual_conditional">ตามชั่วโมงที่ทำจริง (แบบมีเงื่อนไข)</MenuItem>
                    </TextField>
                    <TextField
                      label="จำนวน ชม. OT ขั้นต่ำ"
                      placeholder="00:30"
                      size="small"
                      value={form.ot_min_hours}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); // HHMM max
                        let formatted = digits;
                        if (digits.length >= 3) {
                          formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
                        }
                        // If less than 3 digits no colon yet
                        setField('ot_min_hours', formatted);
                      }}
                      error={Boolean(errors.ot_min_hours)}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                      <InputLabel id="ot-income-code-label">รหัสรายได้ OT</InputLabel>
                      <Select
                        labelId="ot-income-code-label"
                        label="รหัสรายได้ OT"
                        value={form.ot_income_code || ''}
                        onChange={(e) => {
                          const code = e.target.value;
                          setField('ot_income_code', code);
                          // find selected income and populate description and multiplier if available
                          const found = (otIncomeOptions || []).find((o) => o.code === code);
                          if (found) {
                            setField('ot_income_desc', found.name || '');
                            if (found.amount != null) setField('ot_multiplier', String(found.amount));
                            // If the earn/deduct row provides a unit field, populate it; otherwise fallback to 'เท่า' when amount exists
                            setField('ot_unit', found.unit || (found.amount != null ? 'เท่า' : ''));
                          } else {
                            // clear unit if selection removed
                            setField('ot_unit', '');
                          }
                        }}
                        sx={{ minWidth: 0 }}
                      >
                        <MenuItem value="">กรุณาเลือก</MenuItem>
                        {(otIncomeOptions || []).map((opt) => (
                          <MenuItem key={opt.code} value={opt.code}>{opt.code} — {opt.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      label="คำอธิบาย"
                      size="small"
                      value={form.ot_income_desc}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <TextField
                      label="จำนวน"
                      size="small"
                      value={form.ot_multiplier}
                      sx={{ flex: 1, minWidth: 0 }}
                      InputProps={{ readOnly: true, inputProps: { style: { textAlign: 'right' } } }}
                    />
                    <TextField
                      label="หน่วย"
                      size="small"
                      value={form.ot_unit}
                      InputProps={{ readOnly: true }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                  </Stack>
                  {/* ซ่อนส่วน ประเภทพนักงาน สำหรับกะงานล่วงเวลา ตามคำขอ */}
                </Stack>
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบรหัสกะ "{targetRow?.shift_code}" หรือไม่?</Typography>
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
