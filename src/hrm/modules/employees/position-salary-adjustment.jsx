/* eslint-disable no-unused-vars */
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// MUI
import {
  Box, Stack, Typography, Chip, TextField, Button, IconButton, InputAdornment,
  Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableFooter, TablePagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, FormControlLabel, Checkbox, MenuItem, Select, InputLabel, FormControl,
  Radio, RadioGroup, Divider, Tooltip, Paper
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function THDateField({ value, onChange, label, error, helperText, sx, disabled }) {
  return (
    <DatePicker
      format="DD/MM/YYYY"
      value={value ? dayjs(value) : null}
      onChange={(v) => onChange(v ? v.format('YYYY-MM-DD') : '')}
      slotProps={{
        textField: {
          size: 'small',
          label,
          error,
          helperText,
          disabled,
          sx: { width: 170, ...sx },
        },
      }}
    />
  );
}

export default function PositionSalaryAdjustmentPage() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Add dialog state
  const [openAdd, setOpenAdd] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);

  const initialForm = {
    // General
    doc_no: '',
    doc_date: '',
    propose_date: '',
    effective_date: '',
    note: '',

    // Employee snapshot / display
    employee_code: '',
    employee_first_name: '',
    employee_last_name: '',
    employee_full_name: '',
  supervisor_name: '',
    supervisor_id: '',
    employee_type: '',
    unit: '',
    unit_id: '',
    position: '',
    position_id: '',
    level: '',
    level_id: '',

    // approval/cancel (display only for now)
    approval_status: '',
    approved_at: '',
    approver_name: '',
    approver_unit: '',
    approver_position: '',
    approval_note: '',

    cancelled_at: '',
    cancelled_by: '',
    cancel_unit: '',
    cancel_position: '',
    cancel_note: '',

    // status
    status: 'รออนุมัติ',
  };

  const [form, setForm] = React.useState(initialForm);

  // Details tab state
  const [details, setDetails] = React.useState({
    // Box 1: employee type
    adjustEmployeeType: false,
    employeeTypeNew: '', // 'hourly' | 'contract' | 'daily' | 'monthly'

    // Box 2: salary
    adjustSalary: false,
    salaryBefore: '',
    adjustAmount: '',
    adjustPercent: '',
    salaryAfter: '',

    // Box 3: position/unit
    adjustPosition: false,
    positionOld: '',
    positionOldId: '',
    unitOld: '',
    unitOldId: '',
    positionNew: '',
    positionNewId: '',
    unitNew: '',
    unitNewId: '',

    // Box 4: level
    adjustLevel: false,
    levelOld: '',
    levelOldId: '',
    levelNew: '',
    levelNewId: '',
  });

  const [editMode, setEditMode] = React.useState(false);
  const [originalId, setOriginalId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState(null);

  // search
  const [searchField, setSearchField] = React.useState('employee_code');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'employee_code', text: '' });

  // snackbar
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  // Fetch rows
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;

      let query = supabase.from('employee_position_salary_adjustments').select('*', { count: 'exact' });

      if (appliedSearch && appliedSearch.text && appliedSearch.field) {
        const pattern = `%${appliedSearch.text}%`;
        if (appliedSearch.field === 'employee_name') {
          const orExpr = [
            `employee_full_name.ilike.${pattern}`,
            `employee_first_name.ilike.${pattern}`,
            `employee_last_name.ilike.${pattern}`,
          ].join(',');
          query = query.or(orExpr);
        } else {
          query = query.ilike(appliedSearch.field, pattern);
        }
      }

      query = query.order('doc_no', { ascending: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []);
      setTotal(typeof count === 'number' ? count : (data ? data.length : 0));
    } catch (err) {
      console.error('fetch adjustments error', err);
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถโหลดข้อมูล', severity: 'error' });
      setRows([]);
      setTotal(0);
    } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const [employeeList, setEmployeeList] = React.useState([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);
  const [employeeError, setEmployeeError] = React.useState('');
  const [openEmployeePicker, setOpenEmployeePicker] = React.useState(false);

  const loadEmployeesFromDb = React.useCallback(async () => {
    try {
      setEmployeeLoading(true);
      // select only columns that exist in the project's employees table (avoid missing column errors)
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, position_id, position, department_id, supervisor_id, employee_type, employee_level_id, level')
        .order('employee_code', { ascending: true })
        .limit(1000);
      if (error) throw error;
      setEmployeeList(data || []);
      setEmployeeError('');
    } catch (err) {
      setEmployeeError(err?.message || 'ไม่สามารถโหลดพนักงานได้');
      setEmployeeList([]);
    } finally { setEmployeeLoading(false); }
  }, []);

  React.useEffect(() => { if (openAdd && employeeList.length === 0 && !employeeLoading) { loadEmployeesFromDb(); } }, [openAdd, employeeList.length, employeeLoading, loadEmployeesFromDb]);

  const handleOpenEmployeePicker = async () => {
    if (employeeList.length === 0 && !employeeLoading) await loadEmployeesFromDb();
    setOpenEmployeePicker(true);
  };
  const handleCloseEmployeePicker = () => setOpenEmployeePicker(false);

  // Position picker helpers
  const handleOpenPositionPicker = async (target = 'new') => {
    if (positionList.length === 0 && !positionLoading) await loadPositionsFromDb();
    setPositionPickingTarget(target);
    setOpenPositionPicker(true);
  };
  const handleClosePositionPicker = () => setOpenPositionPicker(false);
  const handleSelectPosition = (pos) => {
    if (!pos) return handleClosePositionPicker();
    if (positionPickingTarget === 'old') {
      setDetails((p) => ({ ...p, positionOld: pos.label, positionOldId: pos.id }));
    } else {
      setDetails((p) => ({ ...p, positionNew: pos.label, positionNewId: pos.id }));
    }
    handleClosePositionPicker();
  };

  // Unit picker helpers
  const handleOpenUnitPicker = async (target = 'new') => {
    if (unitList.length === 0 && !unitLoading) await loadUnitsFromDb();
    setUnitPickingTarget(target);
    setOpenUnitPicker(true);
  };
  const handleCloseUnitPicker = () => setOpenUnitPicker(false);
  const handleSelectUnit = (u) => {
    if (!u) return handleCloseUnitPicker();
    if (unitPickingTarget === 'old') {
      setDetails((p) => ({ ...p, unitOld: u.label || u.department_name, unitOldId: u.id }));
    } else {
      setDetails((p) => ({ ...p, unitNew: u.label || u.department_name, unitNewId: u.id }));
    }
    handleCloseUnitPicker();
  };

  const applyEmployeeToForm = async (emp) => {
    const name = `${emp.first_name_th || emp.first_name_en || ''}${(emp.last_name_th || emp.last_name_en) ? ' ' + (emp.last_name_th || emp.last_name_en) : ''}`.trim();

    // Resolve supervisor display name from supervisor_id using employeeList (fallback to text fields)
    const resolveSupervisorName = () => {
      if (emp.supervisor_id) {
        const sup = employeeList.find((e) => String(e.id) === String(emp.supervisor_id));
        if (sup) return `${sup.first_name_th || sup.first_name_en || ''}${(sup.last_name_th || sup.last_name_en) ? ' ' + (sup.last_name_th || sup.last_name_en) : ''}`.trim();
      }
      return emp.supervisor || emp.supervisor_name || '';
    };

    // Resolve unit/department display name from department_id using unitList (fallbacks)
    const resolveUnitName = () => {
      if (emp.department_name) return emp.department_name;
      if (emp.department_id) {
        // department_id in employees may store either the department.uuid (id) or the dept_id code (dept_id)
        const u = unitList.find((x) => String(x.id) === String(emp.department_id) || String(x.dept_id) === String(emp.department_id));
        if (u) return u.department_name || u.label || u.dept_id || '';
      }
      return emp.unit || '';
    };

    let resolvedSupervisorName = resolveSupervisorName();
    const resolvedUnitName = resolveUnitName();

    // If we have a supervisor_id but couldn't resolve from cached employeeList, fetch from DB
    if (!resolvedSupervisorName && emp && emp.supervisor_id) {
      try {
        const { data: supData, error: supErr } = await supabase
          .from('employees')
          .select('first_name_th,last_name_th,first_name_en,last_name_en')
          .eq('id', emp.supervisor_id)
          .limit(1)
          .maybeSingle();
        if (!supErr && supData) {
          resolvedSupervisorName = `${supData.first_name_th || supData.first_name_en || ''}${(supData.last_name_th || supData.last_name_en) ? ' ' + (supData.last_name_th || supData.last_name_en) : ''}`.trim();
        }
      } catch (e) {
        // ignore DB lookup errors
      }
    }

    // Resolve level display name from employee_level_id or level_id using levelList (fallbacks)
    const resolveLevelName = () => {
      // prefer explicit level text on employee if present
      if (emp.level_name) return emp.level_name;

      // check employee_level_id (uuid FK) or legacy level_id code
      const ref = emp.employee_level_id || emp.level_id;
      if (ref) {
        const l = levelList.find((x) => String(x.id) === String(ref) || String(x.level_id) === String(ref));
        if (l) return l.level_name || l.label || l.level_id || '';
      }

      // fallback to any free-text level column on employee
      return emp.level || '';
    };

    const resolvedLevelName = resolveLevelName();

    setForm((prev) => ({
      ...prev,
      employee_code: emp.employee_code || '',
      employee_first_name: emp.first_name_th || emp.first_name_en || '',
      employee_last_name: emp.last_name_th || emp.last_name_en || '',
      employee_full_name: name,
      supervisor_name: resolvedSupervisorName,
      supervisor_id: emp.supervisor_id || emp.supervisor_id === 0 ? emp.supervisor_id : (emp.supervisor_id || ''),
      employee_type: emp.employee_type || '',
      unit: resolvedUnitName || prev.unit || '',
      unit_id: emp.department_id || '',
      position: emp.position || prev.position || '',
      position_id: emp.position_id || '',
      level: resolvedLevelName || emp.level || prev.level || '',
      level_id: emp.employee_level_id || emp.level_id || '',
    }));

    // initialize details old values
    setDetails((d) => ({
      ...d,
      positionOld: emp.position || '',
      positionOldId: emp.position_id || '',
      unitOld: resolvedUnitName || emp.unit || '',
      unitOldId: emp.department_id || '',
      levelOld: resolvedLevelName || emp.level || '',
      levelOldId: emp.employee_level_id || emp.level_id || '',
    }));
    return { resolvedSupervisorName, resolvedUnitName, resolvedLevelName };
  };

  const translateEmployeeType = (type) => {
    if (!type) return '';
    const map = {
      hourly: 'พนักงานรายชั่วโมง',
      contract: 'พนักงานรายเหมา',
      daily: 'พนักงานรายวัน',
      monthly: 'พนักงานรายเดือน',
    };
    return map[type] || type;
  };

  const handleSelectEmployee = async (emp) => {
    const resolved = await applyEmployeeToForm(emp);
    
    setOpenEmployeePicker(false);
  };

  const [positionList, setPositionList] = React.useState([]);
  const [positionLoading, setPositionLoading] = React.useState(false);
  const loadPositionsFromDb = React.useCallback(async () => {
    setPositionLoading(true);
    try {
      const { data, error } = await supabase.from('positions').select('id,position_code,position_name,position_name_eng').order('position_name', { ascending: true }).limit(1000);
      if (error) throw error;
      setPositionList((data || []).map((p) => ({ id: p.id, label: p.position_name || p.position_name_eng || p.position_code || '' })));
    } catch (err) { /* ignore */ } finally { setPositionLoading(false); }
  }, []);

  // Position picker dialog state
  const [openPositionPicker, setOpenPositionPicker] = React.useState(false);
  const [positionPickingTarget, setPositionPickingTarget] = React.useState('new'); // 'old' | 'new'

  const [unitList, setUnitList] = React.useState([]);
  const [unitLoading, setUnitLoading] = React.useState(false);
  const loadUnitsFromDb = React.useCallback(async () => {
    setUnitLoading(true);
    try {
      // Query the canonical department table. Some environments may not have the view v_department_form.
      const { data, error } = await supabase
        .from('department')
        .select('id,dept_id,dept_name,dept_name_eng')
        .order('dept_id', { ascending: true })
        .limit(1000);
      if (error) throw error;
      setUnitList((data || []).map((u) => ({ id: u.id, dept_id: u.dept_id, department_name: u.dept_name || u.dept_name_eng || u.dept_id || '', label: u.dept_name || u.dept_name_eng || u.dept_id || '' })));
    } catch (err) {
      // ignore here; callers will handle empty lists
    } finally {
      setUnitLoading(false);
    }
  }, []);

  // Unit picker dialog state
  const [openUnitPicker, setOpenUnitPicker] = React.useState(false);
  const [unitPickingTarget, setUnitPickingTarget] = React.useState('new'); // 'old' | 'new'

  const [levelList, setLevelList] = React.useState([]);
  const [levelLoading, setLevelLoading] = React.useState(false);
  const loadLevelsFromDb = React.useCallback(async () => {
    setLevelLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_level')
        .select('id,level_id,level_name_th,level_name_en')
        .order('level_id', { ascending: true })
        .limit(1000);
      if (error) throw error;
      setLevelList((data || []).map((l) => ({ id: l.id, level_id: l.level_id, level_name: l.level_name_th || l.level_name_en || l.level_id || '', label: l.level_name_th || l.level_name_en || l.level_id || '' })));
    } catch (err) {
      // ignore
    } finally {
      setLevelLoading(false);
    }
  }, []);

  const [errors, setErrors] = React.useState({});
  const validateForm = () => {
    const newErrors = {};
    if (!form.doc_no) newErrors.doc_no = 'กรุณากรอกเลขที่เอกสาร';
    if (!form.doc_date) newErrors.doc_date = 'กรุณาเลือกวันที่เอกสาร';
    if (!form.propose_date) newErrors.propose_date = 'กรุณาเลือกวันที่เสนอปรับ';
    if (!form.effective_date) newErrors.effective_date = 'กรุณาเลือกวันที่มีผล';
    if (!form.employee_code) newErrors.employee_code = 'กรุณาเลือกพนักงาน';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const adjustmentTypeLabel = React.useMemo(() => {
    const parts = [];
    if (details.adjustEmployeeType) parts.push('ประเภทพนักงาน');
    if (details.adjustSalary) parts.push('เงินเดือน/อัตราค่าจ้าง');
    if (details.adjustPosition) parts.push('ตำแหน่ง/หน่วยงาน');
    if (details.adjustLevel) parts.push('ระดับพนักงาน');
    return parts.join(', ');
  }, [details]);

  const computeDisplayPosition = () => {
    if (details.adjustPosition && details.positionNew) return details.positionNew;
    return form.position || '';
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูลให้ถูกต้องและครบถ้วน', severity: 'error' });
      return;
    }
    if (saving) return;
    setSaving(true);

    const payload = {
      doc_no: form.doc_no || null,
      doc_date: form.doc_date || null,
      propose_date: form.propose_date || null,
      effective_date: form.effective_date || null,
      note: form.note || null,
      employee_code: form.employee_code || null,
      employee_first_name: form.employee_first_name || null,
      employee_last_name: form.employee_last_name || null,
      employee_full_name: form.employee_full_name || null,
  // persist only supervisor_id (employee id of the supervisor). Avoid sending a text 'supervisor' DB column
  supervisor_id: form.supervisor_id || null,
      employee_type: details.adjustEmployeeType ? (details.employeeTypeNew || form.employee_type || null) : (form.employee_type || null),
  department_name: details.adjustPosition ? (details.unitNew || form.unit || null) : (form.unit || null),
      position: computeDisplayPosition() || null,
      level: details.adjustLevel ? (details.levelNew || form.level || null) : (form.level || null),
      adjustment_type: adjustmentTypeLabel || null,
      approval_status: form.approval_status || null,
      approved_at: form.approved_at || null,
      approver_name: form.approver_name || null,
      approver_unit: form.approver_unit || null,
      approver_position: form.approver_position || null,
      approval_note: form.approval_note || null,
      cancelled_at: form.cancelled_at || null,
      cancelled_by: form.cancelled_by || null,
      cancel_unit: form.cancel_unit || null,
      cancel_position: form.cancel_position || null,
      cancel_note: form.cancel_note || null,
      status: form.status || 'รออนุมัติ',
      adjust_details: details || null,
    };

    try {
      if (editMode && originalId) {
        const { error } = await supabase.from('employee_position_salary_adjustments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', originalId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employee_position_salary_adjustments').insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      setSnackbar({ open: true, message: editMode ? 'บันทึกการแก้ไขสำเร็จ' : 'บันทึกข้อมูลเรียบร้อย', severity: 'success' });
      setOpenAdd(false);
      fetchData();
    } catch (err) {
      console.error('save adjustment error', err);
      setSnackbar({ open: true, message: err.message || 'บันทึกข้อมูลไม่สำเร็จ', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { setTargetRow(null); setOpenDelete(false); };
  const handleConfirmDelete = async () => {
    if (!targetRow || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('employee_position_salary_adjustments').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally { setDeleting(false); }
  };

  const generateDocNo = React.useCallback(async () => {
    const now = dayjs();
    const prefix = `PRO${now.format('YYYYMM')}`;
    let seq = '0001';
    try {
      const { data, error } = await supabase
        .from('employee_position_salary_adjustments')
        .select('doc_no')
        .ilike('doc_no', `${prefix}-%`)
        .order('doc_no', { ascending: false })
        .limit(1);
      if (!error && data && data.length && data[0].doc_no) {
        const m = String(data[0].doc_no).match(/-(\d{4,})$/);
        if (m && m[1]) seq = String(parseInt(m[1], 10) + 1).padStart(4, '0');
      }
    } catch {/* ignore */}
    const docNo = `${prefix}-${seq}`;
    setForm((prev) => ({ ...prev, doc_no: docNo, doc_date: now.format('YYYY-MM-DD') }));
  }, []);

  const handleOpenAdd = async () => {
    // Ensure lookup lists are loaded so applyEmployeeToForm can resolve names
    try {
      if (unitList.length === 0 && !unitLoading) await loadUnitsFromDb();
      if (employeeList.length === 0 && !employeeLoading) await loadEmployeesFromDb();
      if (positionList.length === 0 && !positionLoading) await loadPositionsFromDb();
      if (levelList.length === 0 && !levelLoading) await loadLevelsFromDb();
    } catch (err) {
      // loaders will set error states; ignore here to still open dialog
    }

    setActiveTab(0);
    setEditMode(false);
    setOriginalId(null);
    setForm(initialForm);
    setDetails({
      adjustEmployeeType: false,
      employeeTypeNew: '',
      adjustSalary: false,
      salaryBefore: '',
      adjustAmount: '',
      adjustPercent: '',
      salaryAfter: '',
      adjustPosition: false,
      positionOld: '', positionOldId: '', unitOld: '', unitOldId: '',
      positionNew: '', positionNewId: '', unitNew: '', unitNewId: '',
      adjustLevel: false,
      levelOld: '', levelOldId: '', levelNew: '', levelNewId: '',
    });
    setOpenAdd(true);
    generateDocNo();
  };

  const handleCloseAdd = () => { setOpenAdd(false); setEditMode(false); setOriginalId(null); setForm(initialForm); };

  const handleOpenEdit = (row) => {
    (async () => {
      setEditMode(true);
      setOriginalId(row.id);

      // ensure lookup lists are present so we can resolve supervisor/unit/level names
      try {
        if (employeeList.length === 0 && !employeeLoading) await loadEmployeesFromDb();
        if (unitList.length === 0 && !unitLoading) await loadUnitsFromDb();
        if (levelList.length === 0 && !levelLoading) await loadLevelsFromDb();
      } catch (err) {
        // loaders set their own error states; continue and attempt best-effort resolution
      }

      // populate form with row values
      setForm((prev) => ({
        ...initialForm,
        ...row,
      }));

      // resolve display names (supervisor, unit, level) from lookup lists and merge into form
      try {
        const resolved = {};
        // supervisor
        if (row.supervisor_id) {
          const sup = employeeList.find((e) => String(e.id) === String(row.supervisor_id));
          if (sup) resolved.supervisor_name = `${sup.first_name_th || sup.first_name_en || ''}${(sup.last_name_th || sup.last_name_en) ? ' ' + (sup.last_name_th || sup.last_name_en) : ''}`.trim();
          else {
            // try DB fallback for supervisor
            try {
              const { data: srow, error: sErr } = await supabase.from('employees').select('first_name_th,last_name_th,first_name_en,last_name_en').eq('id', row.supervisor_id).limit(1).maybeSingle();
              if (!sErr && srow) {
                resolved.supervisor_name = `${srow.first_name_th || srow.first_name_en || ''}${(srow.last_name_th || srow.last_name_en) ? ' ' + (srow.last_name_th || srow.last_name_en) : ''}`.trim();
              }
            } catch (e) {
              // ignore
            }
          }
        }
        // unit/department
        if (!resolved.supervisor_name && row.supervisor_name) resolved.supervisor_name = row.supervisor_name;

        if (row.department_name) {
          resolved.unit = row.department_name;
        } else if (row.department_id) {
          const u = unitList.find((x) => String(x.id) === String(row.department_id) || String(x.dept_id) === String(row.department_id));
          if (u) resolved.unit = u.department_name || u.label || '';
        } else if (row.unit) {
          resolved.unit = typeof row.unit === 'string' ? row.unit : (row.unit.dept_name || row.unit.label || '');
        }

        // level
        if (row.employee_level_id || row.level_id) {
          const ref = row.employee_level_id || row.level_id;
          const l = levelList.find((x) => String(x.id) === String(ref) || String(x.level_id) === String(ref));
          if (l) resolved.level = l.level_name || l.label || '';
        } else if (row.level) {
          resolved.level = row.level;
        }

        // merge resolved into form
        if (Object.keys(resolved).length) setForm((prev) => ({ ...prev, ...resolved }));
      } catch (err) {
        // ignore resolution errors
      }

      setDetails((d) => ({ ...d, ...(row.adjust_details || {}) }));
      setActiveTab(0);
      setOpenAdd(true);
    })();
  };

  const handleDetailChange = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  // Compute derived salary adjustment fields (percent and salary after)
  const computeDerived = (d) => {
    const sb = Number(d.salaryBefore) || 0;
    const adj = Number(d.adjustAmount) || 0;
    const percent = sb > 0 ? (adj / sb) * 100 : 0;
    const salaryAfter = sb + adj;
    // round percent to 2 decimals, salaryAfter to 2 decimals if needed
    const fmtPercent = Number.isFinite(percent) ? Math.round(percent * 100) / 100 : 0;
    const fmtSalaryAfter = Math.round(salaryAfter * 100) / 100;
    return { adjustPercent: fmtPercent, salaryAfter: fmtSalaryAfter };
  };

  const handleDetailNumberChange = (field) => (e) => {
    const raw = e?.target?.value;
    setDetails((prev) => {
      const next = { ...prev, [field]: raw };
      const derived = computeDerived(next);
      return { ...next, ...derived };
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">บันทึกปรับตำแหน่งและเงินเดือน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="adj-search-field-label">ค้นหาโดย</InputLabel>
          <Select labelId="adj-search-field-label" value={searchField} label="ค้นหาโดย" onChange={(e) => setSearchField(e.target.value)}>
            <MenuItem value="doc_no">เลขที่เอกสาร</MenuItem>
            <MenuItem value="employee_code">รหัสพนักงาน</MenuItem>
            <MenuItem value="employee_name">ชื่อพนักงาน</MenuItem>
            <MenuItem value="position">ตำแหน่ง</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" fullWidth label="คำค้น" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedSearch({ field: searchField, text: searchInput }); setPage(0); } }} />
        <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, md: 0 } }}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => { setAppliedSearch({ field: searchField, text: searchInput }); setPage(0); }}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'employee_code', text: '' }); setSearchField('employee_code'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>

      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' }, }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>เลขที่เอกสาร</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>รหัสพนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ชื่อพนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ตำแหน่ง</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ประเภทการปรับ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>วันที่เสนอปรับ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>วันที่อนุมัติ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>วันที่มีผลใช้</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.doc_no || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employee_code || '-'}</TableCell>
                  <TableCell>{row.employee_full_name || `${row.employee_first_name || ''}${row.employee_last_name ? ' ' + row.employee_last_name : ''}`.trim() || '-'}</TableCell>
                  <TableCell>{row.position || '-'}</TableCell>
                  <TableCell>{row.adjustment_type || '-'}</TableCell>
                  <TableCell>{row.propose_date ? dayjs(row.propose_date).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell>{row.approved_at ? dayjs(row.approved_at).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell>{row.effective_date ? dayjs(row.effective_date).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell align="center">{row.status || row.approval_status || 'รออนุมัติ'}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => handleOpenEdit(row)} disabled={saving}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => handleAskDelete(row)} disabled={deleting}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

      <Dialog open={openDelete} onClose={() => { if (!deleting) handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบข้อมูล "{targetRow?.doc_no || ''}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>ยกเลิก</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>{deleting ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังลบ...</>) : (<><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>)}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAdd} onClose={handleCloseAdd} maxWidth="lg" fullWidth PaperProps={{ sx: { mx: 'auto', width: '86%', maxWidth: 1100, maxHeight: '90vh', height: '80vh' } }}>
        <DialogTitle sx={{ pb: 0 }}>{editMode ? 'แก้ไขบันทึกปรับตำแหน่งและเงินเดือน' : 'เพิ่มบันทึกปรับตำแหน่งและเงินเดือน'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 0, overflowY: 'auto' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tab label="ข้อมูลทั่วไป" />
              <Tab label="รายละเอียดการปรับฯ" />
              <Tab label="การอนุมัติ" />
              <Tab label="การยกเลิก" />
            </Tabs>

            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField label="เลขที่เอกสาร" size="small" fullWidth value={form.doc_no || ''} InputProps={{ readOnly: true }} error={Boolean(errors.doc_no)} helperText={errors.doc_no || ''} />
                  </Box>
                  <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <FormControlLabel sx={{ ml: 1 }} control={<Checkbox checked={Boolean(form.is_urgent)} onChange={(e) => setForm((p) => ({ ...p, is_urgent: e.target.checked }))} />} label="เอกสารด่วน" />
                  </Box>
                </Box>
                <THDateField label="วันที่เอกสาร" value={form.doc_date || ''} onChange={(v) => setForm((p) => ({ ...p, doc_date: v }))} sx={{ width: '100%' }} error={Boolean(errors.doc_date)} helperText={errors.doc_date || ''} />
                <THDateField label="วันที่เสนอปรับ" value={form.propose_date || ''} onChange={(v) => setForm((p) => ({ ...p, propose_date: v }))} sx={{ width: '100%' }} error={Boolean(errors.propose_date)} helperText={errors.propose_date || ''} />
                <THDateField label="วันที่มีผล" value={form.effective_date || ''} onChange={(v) => setForm((p) => ({ ...p, effective_date: v }))} sx={{ width: '100%' }} error={Boolean(errors.effective_date)} helperText={errors.effective_date || ''} />

                <TextField label="หมายเหตุ" size="small" fullWidth value={form.note || ''} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} multiline minRows={3} />

                <TextField label="พนักงาน" size="small" fullWidth value={form.employee_code || ''} InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton edge="end" size="small" onClick={handleOpenEmployeePicker} aria-label="เลือกพนักงาน"><MoreHorizIcon /></IconButton></InputAdornment>) }} error={Boolean(errors.employee_code)} helperText={errors.employee_code || ''} />
                <TextField label="ชื่อพนักงาน" size="small" fullWidth value={form.employee_full_name || ''} InputProps={{ readOnly: true }} />
                <TextField label="หัวหน้างาน" size="small" fullWidth value={form.supervisor_name || ''} InputProps={{ readOnly: true }} />
                <TextField label="ประเภทพนักงาน" size="small" fullWidth value={translateEmployeeType(form.employee_type) || ''} InputProps={{ readOnly: true }} />
                <TextField label="หน่วยงาน" size="small" fullWidth value={form.unit || ''} InputProps={{ readOnly: true }} />
                <TextField label="ตำแหน่ง" size="small" fullWidth value={form.position || ''} InputProps={{ readOnly: true }} />
                <TextField label="ระดับพนักงาน" size="small" fullWidth value={form.level || ''} InputProps={{ readOnly: true }} />
                <TextField label="อ้างอิงเลขที่เอกสาร" size="small" fullWidth value={form.ref_doc_no || ''} InputProps={{ readOnly: true }} />
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Box 1: employee type */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={details.adjustEmployeeType} onChange={handleDetailChange('adjustEmployeeType')} />} label="ปรับประเภทพนักงาน" />
                  <Box sx={{ pl: 3, opacity: details.adjustEmployeeType ? 1 : 0.6 }}>
                    <RadioGroup row value={details.employeeTypeNew} onChange={(_, v) => setDetails((p) => ({ ...p, employeeTypeNew: v }))}>
                      <FormControlLabel value="hourly" control={<Radio disabled={!details.adjustEmployeeType} />} label="พนักงานรายชั่วโมง" />
                      <FormControlLabel value="contract" control={<Radio disabled={!details.adjustEmployeeType} />} label="พนักงานรายเหมา" />
                      <FormControlLabel value="daily" control={<Radio disabled={!details.adjustEmployeeType} />} label="พนักงานรายวัน" />
                      <FormControlLabel value="monthly" control={<Radio disabled={!details.adjustEmployeeType} />} label="พนักงานรายเดือน" />
                    </RadioGroup>
                  </Box>
                </Box>

                {/* Box 2: salary */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={details.adjustSalary} onChange={handleDetailChange('adjustSalary')} />} label="ปรับเงินเดือน/อัตราค่าจ้าง" />
                  <Box sx={{ pl: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, opacity: details.adjustSalary ? 1 : 0.6 }}>
                    <TextField size="small" label="เงินค่าจ้างก่อนปรับ" type="number" value={details.salaryBefore} onChange={handleDetailNumberChange('salaryBefore')} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                    <TextField size="small" label="เงินปรับ" type="number" value={details.adjustAmount} onChange={handleDetailNumberChange('adjustAmount')} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                    <TextField size="small" label="คิดเป็นร้อยละ" type="number" value={details.adjustPercent} InputProps={{ readOnly: true, inputMode: 'numeric', style: { textAlign: 'right' } }} />
                    <TextField size="small" label="เงินค่าจ้างหลังปรับ" type="number" value={details.salaryAfter} InputProps={{ readOnly: true, inputMode: 'numeric', style: { textAlign: 'right' } }} />
                  </Box>
                </Box>

                {/* Box 3: position/unit */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={details.adjustPosition} onChange={handleDetailChange('adjustPosition')} />} label="ปรับตำแหน่ง/โยกย้ายหน่วยงาน" />

                  {/* 3.1 Before */}
                  <Box sx={{ pl: 3, mt: 1, borderLeft: '3px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>ตำแหน่งงานก่อนปรับ</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField label="ตำแหน่ง" size="small" fullWidth value={details.positionOld || ''} InputProps={{ readOnly: true }} />
                      <TextField label="หน่วยงาน" size="small" fullWidth value={details.unitOld || ''} InputProps={{ readOnly: true}} />
                    </Stack>
                  </Box>

                  {/* 3.2 After */}
                  <Box sx={{ pl: 3, mt: 2, borderLeft: '3px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>ตำแหน่งงานหลังปรับ</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="ตำแหน่ง"
                        size="small"
                        fullWidth
                        value={details.positionNew || ''}
                        InputProps={{
                          readOnly: true,
                          endAdornment: details.adjustPosition ? (
                            <InputAdornment position="end">
                              <IconButton size="small" edge="end" onClick={() => handleOpenPositionPicker('new')}>
                                <MoreHorizIcon />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                      <TextField
                        label="หน่วยงาน"
                        size="small"
                        fullWidth
                        value={details.unitNew || ''}
                        InputProps={{
                          readOnly: true,
                          endAdornment: details.adjustPosition ? (
                            <InputAdornment position="end">
                              <IconButton size="small" edge="end" onClick={() => handleOpenUnitPicker('new')}>
                                <MoreHorizIcon />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                    </Stack>
                  </Box>
                </Box>

                {/* Box 4: level */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={details.adjustLevel} onChange={handleDetailChange('adjustLevel')} />} label="ปรับระดับพนักงาน" />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ pl: 3, opacity: details.adjustLevel ? 1 : 0.6 }}>
                    <TextField label="ระดับพนักงานเดิม" size="small" fullWidth value={details.levelOld || ''} InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton size="small" edge="end" onClick={async () => { if (levelList.length === 0 && !levelLoading) await loadLevelsFromDb(); }}><MoreHorizIcon /></IconButton></InputAdornment>) }} />
                    <TextField label="ระดับพนักงานใหม่" size="small" fullWidth value={details.levelNew || ''} InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton size="small" edge="end" onClick={async () => { if (levelList.length === 0 && !levelLoading) await loadLevelsFromDb(); const pick = levelList[0]; if (pick) setDetails((p) => ({ ...p, levelNew: pick.label, levelNewId: pick.id })); }}><MoreHorizIcon /></IconButton></InputAdornment>) }} />
                  </Stack>
                </Box>
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="สถานะการอนุมัติ" size="small" fullWidth value={form.approval_status || ''} InputProps={{ readOnly: true }} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="อนุมัติเมื่อ" size="small" fullWidth value={form.approved_at || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ผู้อนุมัติ" size="small" fullWidth value={form.approver_name || ''} InputProps={{ readOnly: true }} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="หน่วยงาน" size="small" fullWidth value={form.approver_unit || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ตำแหน่ง" size="small" fullWidth value={form.approver_position || ''} InputProps={{ readOnly: true }} />
                </Stack>
                <TextField label="หมายเหตุ" size="small" fullWidth value={form.approval_note || ''} InputProps={{ readOnly: true }} multiline minRows={3} />
              </Box>
            )}

            {activeTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="ยกเลิกเมื่อ" size="small" fullWidth value={form.cancelled_at || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ผู้ยกเลิก" size="small" fullWidth value={form.cancelled_by || ''} InputProps={{ readOnly: true }} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="หน่วยงาน" size="small" fullWidth value={form.cancel_unit || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ตำแหน่ง" size="small" fullWidth value={form.cancel_position || ''} InputProps={{ readOnly: true }} />
                </Stack>
                <TextField label="หมายเหตุ" size="small" fullWidth value={form.cancel_note || ''} InputProps={{ readOnly: true }} multiline minRows={3} />
              </Box>
            )}
          </LocalizationProvider>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={handleCloseAdd} disabled={saving}>ปิด</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังบันทึก...</>) : 'บันทึก'}</Button>
        </DialogActions>
      </Dialog>

      {/* Position Picker Dialog */}
      <Dialog open={openPositionPicker} onClose={handleClosePositionPicker} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกตำแหน่ง</DialogTitle>
        <DialogContent dividers>
          {positionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : positionList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบตำแหน่งงาน</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              <TableBody>
                {positionList.map((pos) => (
                  <TableRow key={pos.id} hover onClick={() => handleSelectPosition(pos)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{pos.label || pos.position || pos.name || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleClosePositionPicker}>ปิด</Button></DialogActions>
      </Dialog>

      {/* Unit Picker Dialog */}
      <Dialog open={openUnitPicker} onClose={handleCloseUnitPicker} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกหน่วยงาน</DialogTitle>
        <DialogContent dividers>
          {unitLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : unitList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบหน่วยงาน</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              <TableBody>
                {unitList.map((u) => (
                  <TableRow key={u.id} hover onClick={() => handleSelectUnit(u)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{u.label || u.department_name || u.dept_id || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseUnitPicker}>ปิด</Button></DialogActions>
      </Dialog>

      {/* Employee Picker Dialog */}
      <Dialog open={openEmployeePicker} onClose={handleCloseEmployeePicker} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกพนักงาน</DialogTitle>
        <DialogContent dividers>
          {employeeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : employeeError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{employeeError}</Typography></Box>
          ) : employeeList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลพนักงาน</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              <TableBody>
                {employeeList.map((emp) => (
                  <TableRow key={emp.id} hover onClick={() => handleSelectEmployee(emp)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{emp.employee_code || ''} - {`${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseEmployeePicker}>ปิด</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
