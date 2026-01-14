/* eslint-disable no-unused-vars */
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// MUI
import {
  Box, Stack, Typography, Chip, TextField, Button, IconButton, InputAdornment,
  Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableFooter, TablePagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Grid, FormControlLabel, Checkbox, MenuItem, Select, InputLabel, FormControl,
  Autocomplete,
  Radio, RadioGroup, FormLabel, Divider, Tooltip, Paper
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// TH-style date field copied from employee for consistent behavior
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


export default function TerminationPage() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Add dialog state
  const [openAdd, setOpenAdd] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const initialForm = {
    // Termination document fields
    doc_no: '',
    doc_date: '',
    effective_date: '',
    last_work_date: '',
    reason: '',
    // keep a readable employee name snapshot
    selected_employee_name: '',
    employee_code: '',
    timekeeping_exempt: false,
    gender: '',
    title_th: '', first_name_th: '', last_name_th: '',
    title_en: '', first_name_en: '', last_name_en: '',
    nickname_th: '', nickname_en: '',
    birth_date: '',
    marital_status: '',

    marriage_district_id: '',
    marriage_province_id: '',
    marriage_province_label: '',
    marriage_district_label: '',
    marriage_registration_date: '',
    spouse_age_65_plus: false,
    height_cm: '', weight_kg: '',
    blood_group: '',

    military_status: '',
    military_note: '',

    driver_license_number: '',
    driver_license_expiry: '',
    driver_license_type: '',
    nationality: '', nationality_id: '', race: '', race_id: '', religion: '',
    province: '', country: '',

    current_address_name: '',
    current_address_no: '',
    current_address_moo: '',
    current_address_building: '',
    current_address_room: '',
    current_address_floor: '',
    current_address_village: '',
    current_address_alley: '',
    current_address_road: '',
    current_address_country: '',
    current_address_province: '',
    current_address_district: '',
    current_address_subdistrict: '',
    current_address_postal_code: '',
    current_address_mobile: '',
    current_address_email_1: '',
    current_address_email_2: '',
    current_address_email_3: '',

    national_id: '',
    national_id_issue_place: '',
    national_id_issue_date: '',
    national_id_expiry_date: '',
    passport_no: '',
    foreign_tax_id: '',

    position: '',
    position_id: '',

    unit: '',
    unit_id: '',
    supervisor: '',
    supervisor_id: '',
    employee_type: '',
    employee_group: '',
    employee_group_id: '',
    level: '',
    level_id: '',

    start_date: '',
    probation_days: '',
    confirmation_date: '',
    working_hours: '',
    service_age_years: '',
    service_age_months: '',
    service_age_days: '',
    employment_status: 'ทำงาน',
    salary_rate: '',

    salary_first_period_calc: '',
    payment_schedule_template_id: '',
    payment_schedule_template: '',
    tax_calc_method: '',
    tax_rate_mode: 'progressive',
    tax_fixed_boi_percent: '',
    tax_employee_method: 'avg',
    tax_employee_fixed_amount: '',
    tax_employer_method: 'avg',
    tax_employer_fixed_amount: '',

    created_by: '',
    created_at: '',
    updated_by: '',
    updated_at: '',
    notify_additional_info: false
  };

  const [form, setForm] = React.useState(initialForm);

  // edit / save / delete state
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


  // fetch data from Supabase and populate table (with pagination + optional ilike search)
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;

      // build base query and apply search filters specially for name
      const base = supabase.from('employee_terminations').select('*', { count: 'exact' });
      let query = base;
      if (appliedSearch && appliedSearch.text && appliedSearch.field) {
        const pattern = `%${appliedSearch.text}%`;
        // when searching by employee name, search across multiple name columns
        if (appliedSearch.field === 'employee_name') {
          // or() expects comma-separated conditions
          const orExpr = [`employee_name.ilike.${pattern}`, `first_name_th.ilike.${pattern}`, `first_name_en.ilike.${pattern}`, `last_name_th.ilike.${pattern}`, `last_name_en.ilike.${pattern}`].join(',');
          query = query.or(orExpr);
        } else {
          // simple ilike for single column searches like doc_no or employee_code
          query = query.ilike(appliedSearch.field, pattern);
        }
      }

      // apply ordering and pagination
      query = query.order('employee_code', { ascending: true }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setRows(data || []);
      setTotal(typeof count === 'number' ? count : (data ? data.length : 0));
    } catch (err) {
      console.error('fetchData error', err);
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถโหลดข้อมูลพนักงาน', severity: 'error' });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, rowsPerPage]);

  // load data on mount / when paging or search changes
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // image upload preview
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(null);

  const handleImageChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setImageFile(f);
      setImagePreview(URL.createObjectURL(f));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setForm((prev) => ({ ...prev, image_url: null }));
  };

  const ageYears = React.useMemo(() => {
    if (!form.birth_date) return '';
    try {
      const years = dayjs().diff(dayjs(form.birth_date), 'year');
      return Number.isFinite(years) && years >= 0 ? String(years) : '';
    } catch {
      return '';
    }
  }, [form.birth_date]);

  const handleFormChange = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev && prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const handleNumberChange = (field) => (e) => {
    const raw = e?.target?.value;
    if (raw === '' || raw === null || typeof raw === 'undefined') {
      setForm((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  const [errors, setErrors] = React.useState({});

  const validateForm = () => {
    // For termination dialog we require these fields
    const newErrors = {};
    if (!form.doc_no || !String(form.doc_no).trim()) newErrors.doc_no = 'กรุณากรอกเลขที่เอกสาร';
    if (!form.doc_date || !String(form.doc_date).trim()) newErrors.doc_date = 'กรุณาเลือกวันที่เอกสาร';
    if (!form.effective_date || !String(form.effective_date).trim()) newErrors.effective_date = 'กรุณาเลือกวันที่มีผลบังคับใช้';
    if (!form.last_work_date || !String(form.last_work_date).trim()) newErrors.last_work_date = 'กรุณาเลือกวันที่ทำงานวันสุดท้าย';
    if (!form.reason || !String(form.reason).trim()) newErrors.reason = 'กรุณากรอกเหตุผล';
    if (!form.employee_code || !String(form.employee_code).trim()) newErrors.employee_code = 'กรุณาเลือกพนักงาน';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDbError = (err) => {
    try {
      const raw = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      const text = String(raw || '').toLowerCase();
      if (text.includes('duplicate key') || text.includes('unique constraint')) {
        if (text.includes('employee_code')) {
          setErrors((prev) => ({ ...prev, employee_code: 'รหัสพนักงานนี้มีอยู่แล้ว' }));
          setSnackbar({ open: true, message: 'รหัสพนักงานซ้ำ: กรุณาใช้รหัสอื่น', severity: 'error' });
          return;
        }
        setSnackbar({ open: true, message: 'มีข้อมูลซ้ำในระบบ (duplicate)', severity: 'error' });
        return;
      }
      setSnackbar({ open: true, message: err?.message || 'บันทึกข้อมูลไม่สำเร็จ', severity: 'error' });
    } catch (ex) {
      console.error('Error parsing DB error', ex);
      setSnackbar({ open: true, message: 'บันทึกข้อมูลไม่สำเร็จ', severity: 'error' });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูลให้ถูกต้องและครบถ้วน', severity: 'error' });
      return;
    }

    if (saving) return;
    setSaving(true);

    // Only send termination-specific fields to avoid sending employee columns
    // that may not exist in the `employee_terminations` table.
    const payload = {
      doc_no: form.doc_no || null,
      doc_date: form.doc_date || null,
      effective_date: form.effective_date || null,
      last_work_date: form.last_work_date || null,
      reason: form.reason || null,
      detail: form.detail || null,
      employee_code: form.employee_code || null,
      // employee snapshot fields to store name/unit/position at time of termination
      employee_first_name: form.first_name_th || form.first_name_en || null,
      employee_last_name: form.last_name_th || form.last_name_en || null,
      employee_full_name: form.selected_employee_name || `${form.first_name_th || form.first_name_en || ''}${form.last_name_th ? ' ' + form.last_name_th : (form.last_name_en ? ' ' + form.last_name_en : '')}`.trim() || null,
  department_name: form.unit || null,
      position: form.position || null,
      image_url: form.image_url || null,
      termination_type: form.termination_type || null,
      retire_and_continue: form.retire_and_continue || false,
      ref_doc_no: form.ref_doc_no || null,
      payment_schedule_template_id: form.payment_schedule_template_id || null,
      payment_schedule_template: form.payment_schedule_template || null,
      calc_options: calcOptions || null,
      created_by: form.created_by || null,
      created_at: form.created_at || null,
      updated_by: form.updated_by || null,
      updated_at: form.updated_at || null,
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      if (imageFile) {
        try {
          const fileExt = imageFile.name?.split('.').pop() || 'jpg';
          const filename = `employee_terminations/${form.employee_code || 'unknown'}_${Date.now()}.${fileExt}`;
          const bucket = 'employee-photos';

          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filename, imageFile, { cacheControl: '3600', upsert: true });
          if (uploadError) {
            console.warn('Image upload failed', uploadError);
            setSnackbar({ open: true, message: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message || uploadError}`, severity: 'warning' });
          } else if (uploadData && (uploadData.path || uploadData.Key || uploadData.name)) {
            const path = uploadData.path || uploadData.Key || uploadData.name;
            try {
              const { data: urlData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(path);
              if (urlError) {
                console.warn('Get public url failed', urlError);
                setSnackbar({ open: true, message: 'สร้าง public URL ไม่สำเร็จ — จะบันทึกโดยไม่ใส่รูป', severity: 'warning' });
              } else if (urlData) {
                payload.image_url = urlData.publicUrl || urlData.publicURL || null;
              }
            } catch (urlEx) {
              console.warn('Get public url exception', urlEx);
            }
          } else {
            console.warn('Upload returned unexpected data', uploadData);
            setSnackbar({ open: true, message: 'อัปโหลดรูปไม่สำเร็จ (ผลลัพธ์ไม่คาดคิด)', severity: 'warning' });
          }
        } catch (imgErr) {
          console.warn('Image upload exception', imgErr);
          setSnackbar({ open: true, message: `อัปโหลดรูปเกิดข้อผิดพลาด: ${imgErr.message || imgErr}`, severity: 'warning' });
        }
      }

      let termId = null;
      if (editMode && originalId) {
        const { data: termData, error: termError } = await supabase.from('employee_terminations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', originalId).select('*').single();
        if (termError) throw termError;
        termId = termData.id;
      } else {
        const { data: termData, error: termError } = await supabase.from('employee_terminations').insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select('*').single();
        if (termError) throw termError;
        termId = termData.id;
      }

      // sync child tables to match the migration: termination_user_groups, termination_approvers,
      // termination_bank_accounts, termination_final_recurring_items
      // 1) user groups
      if (assignedUserGroups && assignedUserGroups.length > 0) {
        if (editMode) {
          await supabase.from('termination_user_groups').delete().eq('termination_id', termId);
        }
        const toInsertUG = assignedUserGroups.map((g) => ({
          termination_id: termId,
          group_name: g.name || g.group_name || g.user_group_name || null,
          assigned_employee_id: g.assigned_employee_id || null,
          assigned_employee_name: g.assigned_employee_name || null,
        }));
        const { error: ugError } = await supabase.from('termination_user_groups').insert(toInsertUG);
        if (ugError) {
          console.error('Failed to insert termination user groups', ugError);
          setSnackbar({ open: true, message: `ไม่สามารถบันทึกกลุ่มผู้ใช้: ${ugError.message || ugError}`, severity: 'error' });
          if (!editMode) await supabase.from('employee_terminations').delete().eq('id', termId);
          throw ugError;
        }
      } else if (editMode) {
        await supabase.from('termination_user_groups').delete().eq('termination_id', termId);
      }

      // 2) approvers
      if (approvers && approvers.length > 0) {
        if (editMode) {
          await supabase.from('termination_approvers').delete().eq('termination_id', termId);
        }
        const toInsertApr = approvers.map((a, idx) => ({
          termination_id: termId,
          screen_name: a.screen_name || null,
          approver_code: a.approver_code || null,
          approver_name: a.approver_name || null,
          approver_order: idx,
        }));
        const { error: aprError } = await supabase.from('termination_approvers').insert(toInsertApr);
        if (aprError) {
          if (!editMode) await supabase.from('employee_terminations').delete().eq('id', termId);
          await supabase.from('termination_user_groups').delete().eq('termination_id', termId);
          throw aprError;
        }
      } else if (editMode) {
        await supabase.from('termination_approvers').delete().eq('termination_id', termId);
      }

      // 3) bank accounts
      try {
        if (bankAccounts && bankAccounts.length > 0) {
          if (editMode) {
            await supabase.from('termination_bank_accounts').delete().eq('termination_id', termId);
          }
          const toInsertBanks = bankAccounts.map((b) => ({
            termination_id: termId,
            bank_name: b.bank_name || b.bank_name_th || null,
            branch: b.branch || null,
            account_name: b.account_name || null,
            account_number: b.account_number || null,
            percent: b.percent !== '' && b.percent != null ? Number(b.percent) : null,
          }));
          const { error: bankError } = await supabase.from('termination_bank_accounts').insert(toInsertBanks);
          if (bankError) {
            if (!editMode) await supabase.from('employee_terminations').delete().eq('id', termId);
            throw bankError;
          }
        } else if (editMode) {
          await supabase.from('termination_bank_accounts').delete().eq('termination_id', termId);
        }
      } catch (bankSyncErr) {
        console.error('Bank accounts sync error', bankSyncErr);
        throw bankSyncErr;
      }

      // 4) final recurring items
      try {
        const finalItems = (calcOptions && Array.isArray(calcOptions.finalRecurringItems)) ? calcOptions.finalRecurringItems : [];
        if (finalItems.length > 0) {
          if (editMode) {
            await supabase.from('termination_final_recurring_items').delete().eq('termination_id', termId);
          }
          const toInsertFinal = finalItems.map((it) => ({
            termination_id: termId,
            name: it.name || null,
            amount: it.amount !== '' && it.amount != null ? Number(it.amount) : 0,
            final_method: it.finalMethod || it.final_method || null,
            calculate: it.calculate === undefined ? true : Boolean(it.calculate),
          }));
          const { error: finError } = await supabase.from('termination_final_recurring_items').insert(toInsertFinal);
          if (finError) {
            if (!editMode) await supabase.from('employee_terminations').delete().eq('id', termId);
            throw finError;
          }
        } else if (editMode) {
          await supabase.from('termination_final_recurring_items').delete().eq('termination_id', termId);
        }
      } catch (finErr) {
        console.error('Final recurring items sync error', finErr);
        throw finErr;
      }

      setSnackbar({ open: true, message: editMode ? 'บันทึกการแก้ไขสำเร็จ' : 'บันทึกข้อมูลเรียบร้อย', severity: 'success' });
      setOpenAdd(false);
      fetchData();
    } catch (err) {
      console.error('Save termination error', err);
      handleDbError(err);
    } finally {
      setSaving(false);
    }
  };

  // Country / nationality / provinces / districts / subdistricts loaders (reused from employee)
  const [openCountryDialog, setOpenCountryDialog] = React.useState(false);
  const [countryList, setCountryList] = React.useState([]);
  const [countryLoading, setCountryLoading] = React.useState(false);
  const [countryError, setCountryError] = React.useState('');

  const [nationalityList, setNationalityList] = React.useState([]);
  const [nationalityLoading, setNationalityLoading] = React.useState(false);
  const [nationalityError, setNationalityError] = React.useState('');

  const [provinces, setProvinces] = React.useState([]);
  const [provincesLoading, setProvincesLoading] = React.useState(false);
  const [provincesError, setProvincesError] = React.useState('');

  const [districts, setDistricts] = React.useState([]);
  const [districtsLoading, setDistrictsLoading] = React.useState(false);
  const [districtsError, setDistrictsError] = React.useState('');
  const [subdistricts, setSubdistricts] = React.useState([]);
  const [subdistrictsLoading, setSubdistrictsLoading] = React.useState(false);
  const [subdistrictsError, setSubdistrictsError] = React.useState('');

  const loadCountriesFromDb = React.useCallback(async () => {
    setCountryLoading(true);
    setCountryError('');
    try {
      const { data, error } = await supabase.from('country').select('*').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      setCountryList(data || []);
      if (!(data && data.length)) setCountryError('ไม่พบข้อมูลประเทศในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่อประเทศได้';
      setCountryError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setCountryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (openAdd && countryList.length === 0 && !countryLoading) {
      loadCountriesFromDb();
    }
  }, [openAdd, countryList.length, countryLoading, loadCountriesFromDb]);

  const handleOpenCountryDialog = async () => {
    setOpenCountryDialog(true);
    if (countryList.length === 0) await loadCountriesFromDb();
  };

  const handleCloseCountryDialog = () => setOpenCountryDialog(false);

  const handleSelectCountry = (c) => {
    const label = c?.name || c?.enName || '';
    setForm((prev) => ({ ...prev, country: label }));
    setOpenCountryDialog(false);
  };

  const loadNationalitiesFromDb = React.useCallback(async () => {
    setNationalityLoading(true);
    setNationalityError('');
    try {
      const { data, error } = await supabase.from('country').select('id,name,enName,alpha2').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      setNationalityList(data || []);
      if (!(data && data.length)) setNationalityError('ไม่พบข้อมูลสัญชาติในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่อสัญชาติได้';
      setNationalityError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setNationalityLoading(false);
    }
  }, []);

  const loadProvincesFromDb = React.useCallback(async () => {
    setProvincesLoading(true);
    setProvincesError('');
    try {
      const { data, error } = await supabase.from('provinces').select('id,name_th,name_en').order('name_th', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((p) => ({ id: p.id, name_th: p.name_th, name_en: p.name_en, label: p.name_th || p.name_en || '' }));
      setProvinces(mapped);
      if (!mapped.length) setProvincesError('ไม่พบข้อมูลจังหวัดในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่อจังหวัดได้';
      setProvincesError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setProvincesLoading(false);
    }
  }, []);

  const loadDistrictsFromDb = React.useCallback(async (provinceId, selectedDistrictId, targetField) => {
    if (!provinceId) { setDistricts([]); return; }
    let resolvedProvinceId = provinceId;
    try {
      if (provinces && provinces.length) {
        const prov = provinces.find((p) => String(p.id) === String(provinceId) || String(p.label) === String(provinceId) || String(p.name_th) === String(provinceId) || String(p.name_en) === String(provinceId));
        if (prov) {
          resolvedProvinceId = prov.id;
          if (String(prov.id) !== String(provinceId)) {
            const provinceField = targetField === 'current_address_district' ? 'current_address_province' : (targetField === 'marriage_district_id' ? 'marriage_province_id' : null);
            if (provinceField) setForm((prev) => ({ ...prev, [provinceField]: prov.id }));
          }
        }
      }
    } catch (err) { resolvedProvinceId = provinceId; }
    setDistrictsLoading(true);
    setDistrictsError('');
    try {
      const { data, error } = await supabase.from('districts').select('*').eq('province_id', resolvedProvinceId).order('name_th', { ascending: true }).limit(2000);
      if (error) throw error;
      const mapped = (data || []).map((d) => ({ id: d.id, province_id: d.province_id, name_th: d.name_th, name_en: d.name_en, label: d.name_th || d.name_en || '', alt_ids: [d.district_id, d.district_code, d.code, d.amphoe_code, d.code_id].filter(Boolean) }));
      setDistricts(mapped);
      if (!mapped.length) setDistrictsError('ไม่พบข้อมูลอำเภอ/เขตสำหรับจังหวัดนี้');
      if (selectedDistrictId) {
        const sel = String(selectedDistrictId);
        let found = mapped.find((m) => String(m.id) === sel);
        if (!found) found = mapped.find((m) => m.alt_ids.some((a) => String(a) === sel));
        if (found && targetField) setForm((prev) => ({ ...prev, [targetField]: found.id }));
      }
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่ออำเภอ/เขตได้';
      setDistrictsError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally { setDistrictsLoading(false); }
  }, [provinces]);

  React.useEffect(() => { if (openAdd && provinces.length === 0 && !provincesLoading && !provincesError) { loadProvincesFromDb(); } }, [openAdd, provinces.length, provincesLoading, provincesError, loadProvincesFromDb]);

  const loadSubdistrictsFromDb = React.useCallback(async (districtId, selectedSubdistrictId) => {
    if (!districtId) { setSubdistricts([]); return; }
    setSubdistrictsLoading(true); setSubdistrictsError('');
    try {
      const { data, error } = await supabase.from('sub_districts').select('*').eq('district_id', districtId).order('name_th', { ascending: true }).limit(2000);
      if (error) throw error;
      const mapped = (data || []).map((s) => { const postal = s.postal_code || s.zip_code || s.zipcode || s.postcode || s.postal || s.zip || null; return ({ id: s.id, district_id: s.district_id, name_th: s.name_th, name_en: s.name_en, label: s.name_th || s.name_en || '', postal_code: postal }); });
      setSubdistricts(mapped);
      if (!mapped.length) setSubdistrictsError('ไม่พบข้อมูลตำบล/แขวงสำหรับอำเภอนี้');
      const selId = selectedSubdistrictId || null;
      if (selId) { const found = mapped.find((m) => String(m.id) === String(selId)); if (found && found.postal_code) setForm((prev) => ({ ...prev, current_address_postal_code: found.postal_code })); }
    } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรายชื่อตำบล/แขวงได้'; setSubdistrictsError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setSubdistrictsLoading(false); }
  }, []);

  React.useEffect(() => { if (form.marriage_province_id) { loadDistrictsFromDb(form.marriage_province_id, form.marriage_district_id, 'marriage_district_id'); } else { setDistricts([]); } }, [form.marriage_province_id, form.marriage_district_id, loadDistrictsFromDb]);
  React.useEffect(() => { if (form.current_address_province) { loadDistrictsFromDb(form.current_address_province, form.current_address_district, 'current_address_district'); } else { setDistricts([]); } }, [form.current_address_province, form.current_address_district, loadDistrictsFromDb]);
  React.useEffect(() => { if (form.current_address_district) { loadSubdistrictsFromDb(form.current_address_district, form.current_address_subdistrict); } else { setSubdistricts([]); } }, [form.current_address_district, form.current_address_subdistrict, loadSubdistrictsFromDb]);

  const isMarried = form.marital_status === 'สมรส';
  React.useEffect(() => {
    if (!isMarried) {
      setForm((prev) => ({ ...prev, marriage_province_id: '', marriage_province_label: '', marriage_district_id: '', marriage_district_label: '', marriage_registration_date: '', spouse_age_65_plus: false }));
      setDistricts([]);
    } else {
      if (provinces.length === 0 && !provincesLoading && !provincesError) loadProvincesFromDb();
    }
  }, [isMarried, loadProvincesFromDb, provinces.length, provincesLoading, provincesError]);

  React.useEffect(() => { if (form.military_note && form.military_status !== 'ผ่อนผัน' && form.military_status !== 'ได้รับการยกเว้น') setForm((prev) => ({ ...prev, military_note: '' })); }, [form.military_status, form.military_note]);

  React.useEffect(() => {
    const conf = form.confirmation_date ? dayjs(form.confirmation_date) : null;
    if (!conf || !conf.isValid()) {
      setForm((prev) => ({ ...prev, service_age_years: '', service_age_months: '', service_age_days: '' }));
      return;
    }
    const now = dayjs();
    let years = now.diff(conf, 'year');
    const afterYears = conf.add(years, 'year');
    let months = now.diff(afterYears, 'month');
    const afterMonths = afterYears.add(months, 'month');
    let days = now.diff(afterMonths, 'day');
    setForm((prev) => {
      const ys = String(years); const ms = String(months); const ds = String(days);
      if (prev.service_age_years === ys && prev.service_age_months === ms && prev.service_age_days === ds) return prev;
      return { ...prev, service_age_years: ys, service_age_months: ms, service_age_days: ds };
    });
  }, [form.confirmation_date]);

  const [openNationalityDialog, setOpenNationalityDialog] = React.useState(false);
  const [openRaceDialog, setOpenRaceDialog] = React.useState(false);

  const handleOpenNationalityDialog = async () => { setOpenNationalityDialog(true); await loadNationalitiesFromDb(); };
  const handleCloseNationalityDialog = () => setOpenNationalityDialog(false);
  const handleSelectNationality = (c) => { const label = c?.name || c?.enName || ''; setForm((prev) => ({ ...prev, nationality: label, nationality_id: c?.id || '' })); setOpenNationalityDialog(false); };

  const handleOpenRaceDialog = async () => { setOpenRaceDialog(true); await loadNationalitiesFromDb(); };
  const handleCloseRaceDialog = () => setOpenRaceDialog(false);
  const handleSelectRace = (r) => { const label = r?.name || r?.enName || ''; setForm((prev) => ({ ...prev, race: label, race_id: r?.id || '' })); setOpenRaceDialog(false); };

  // Position / Unit / Shift / Bank pickers and many helpers reused from employee page
  const [openPositionDialog, setOpenPositionDialog] = React.useState(false);
  const [positionList, setPositionList] = React.useState([]);
  const [positionLoading, setPositionLoading] = React.useState(false);
  const [positionError, setPositionError] = React.useState('');

  const loadPositionsFromDb = React.useCallback(async () => {
    setPositionLoading(true); setPositionError('');
    try {
      const { data, error } = await supabase.from('positions').select('id,position_code,position_name,position_name_eng').order('position_name', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((p) => ({ id: p.id, position_code: p.position_code, position_name: p.position_name, position_name_eng: p.position_name_eng, label: p.position_name || p.position_name_eng || p.position_code || '' }));
      setPositionList(mapped); if (!mapped.length) setPositionError('ไม่พบข้อมูลตำแหน่งในฐานข้อมูล');
    } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรายการตำแหน่งได้'; setPositionError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setPositionLoading(false); }
  }, []);
  const handleOpenPositionDialog = async () => { setOpenPositionDialog(true); if (positionList.length === 0) await loadPositionsFromDb(); };
  const handleClosePositionDialog = () => setOpenPositionDialog(false);
  const handleSelectPosition = (p) => { const label = p?.label || p?.position_name || p?.position_name_eng || p?.position_code || ''; setForm((prev) => ({ ...prev, position: label, position_id: p?.id || '' })); setOpenPositionDialog(false); };

  const [openUnitDialog, setOpenUnitDialog] = React.useState(false);
  const [unitList, setUnitList] = React.useState([]);
  const [unitLoading, setUnitLoading] = React.useState(false);
  const [unitError, setUnitError] = React.useState('');
  const loadUnitsFromDb = React.useCallback(async () => { setUnitLoading(true); setUnitError(''); try { const { data, error } = await supabase.from('v_department_form').select('id,dept_id,dept_name').order('dept_id', { ascending: true }).limit(1000); if (error) throw error; const mapped = (data || []).map((u) => ({ id: u.id, dept_id: u.dept_id, dept_name: u.dept_name, label: u.dept_name || u.dept_id || '' })); setUnitList(mapped); if (!mapped.length) setUnitError('ไม่พบข้อมูลหน่วยงานในฐานข้อมูล'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรายการหน่วยงานได้'; setUnitError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setUnitLoading(false); } }, []);
  const handleOpenUnitDialog = async () => { setOpenUnitDialog(true); if (unitList.length === 0) await loadUnitsFromDb(); };
  const handleCloseUnitDialog = () => setOpenUnitDialog(false);
  const handleSelectUnit = (u) => { const label = u?.label || u?.dept_name || u?.dept_id || ''; setForm((prev) => ({ ...prev, unit: label, unit_id: u?.id || '' })); setOpenUnitDialog(false); };

  const [openShiftDialog, setOpenShiftDialog] = React.useState(false);
  const [shiftList, setShiftList] = React.useState([]);
  const [shiftLoading, setShiftLoading] = React.useState(false);
  const [shiftError, setShiftError] = React.useState('');
  const loadShiftsFromDb = React.useCallback(async () => { setShiftLoading(true); setShiftError(''); try { const { data, error } = await supabase.from('shift_schedule').select('id, shift_code, shift_name, shift_type, start_time, end_time').order('shift_code', { ascending: true }); if (error) throw error; setShiftList(data || []); } catch (err) { setShiftError(err.message || 'ไม่สามารถโหลดข้อมูลกะได้'); } finally { setShiftLoading(false); } }, []);
  const handleOpenShiftDialog = async () => { setOpenShiftDialog(true); if (shiftList.length === 0) await loadShiftsFromDb(); };
  const handleCloseShiftDialog = () => setOpenShiftDialog(false);
  const handleSelectShift = (s) => { const label = s?.shift_name ? `${s.shift_code ? s.shift_code + ' ' : ''}${s.shift_name}` : (s?.shift_name || ''); setForm((prev) => ({ ...prev, working_hours: label })); setOpenShiftDialog(false); };

  const [bankCodes, setBankCodes] = React.useState([]);
  const [bankLoading, setBankLoading] = React.useState(false);
  const [bankError, setBankError] = React.useState('');
  const [openBankPicker, setOpenBankPicker] = React.useState(false);

  const [bankAccounts, setBankAccounts] = React.useState([]);
  const totalBankPercent = React.useMemo(() => bankAccounts.reduce((s, b) => s + (Number(b.percent) || 0), 0), [bankAccounts]);

  const loadBankCodesFromDb = React.useCallback(async () => { setBankLoading(true); setBankError(''); try { const { data, error } = await supabase.from('bank_code').select('id,bank_id,bank_name_th,bank_name_en,bank_short_name').order('bank_name_th', { ascending: true }).limit(1000); if (error) throw error; const mapped = (data || []).map((b) => ({ id: b.id, bank_id: b.bank_id, bank_name_th: b.bank_name_th, bank_name_en: b.bank_name_en, bank_short_name: b.bank_short_name, label: b.bank_name_th || b.bank_short_name || b.bank_id || '' })); setBankCodes(mapped); if (!mapped.length) setBankError('ไม่พบข้อมูลรหัสธนาคาร'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรหัสธนาคารได้'; setBankError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setBankLoading(false); } }, []);
  const handleOpenBankPicker = async () => { setOpenBankPicker(true); if (bankCodes.length === 0) await loadBankCodesFromDb(); };
  const handleCloseBankPicker = () => setOpenBankPicker(false);
  const handleSelectBankCode = (b) => { const name = b?.bank_name_th || b?.bank_short_name || b?.bank_id || ''; setBankAccounts((prev) => [...prev, { id: Date.now().toString(), bank_name: name, branch: '', account_name: '', account_number: '', percent: '' }]); setOpenBankPicker(false); };

  const handleBankChange = (index, field) => (e) => { const val = e?.target?.value; setBankAccounts((prev) => { const copy = prev.slice(); copy[index] = { ...copy[index], [field]: val }; return copy; }); };
  const handleRemoveBank = (index) => setBankAccounts((prev) => prev.filter((_, i) => i !== index));

  const [templateList, setTemplateList] = React.useState([]);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState('');
  const [openTemplateDialog, setOpenTemplateDialog] = React.useState(false);
  const [paymentScheduleSelection, setPaymentScheduleSelection] = React.useState('');

  const loadTemplatesFromDb = React.useCallback(async () => { setTemplateLoading(true); setTemplateError(''); try { const { data, error } = await supabase.from('payroll_payment_schedule_templates').select('id,name,description,year').order('name', { ascending: true }).limit(1000); if (error) throw error; setTemplateList(data || []); if (!(data && data.length)) setTemplateError('ไม่พบรูปแบบงวดการจ่าย'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรูปแบบงวดการจ่ายได้'; setTemplateError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setTemplateLoading(false); } }, []);
  const handleOpenTemplateDialog = async () => { setOpenTemplateDialog(true); if (templateList.length === 0) await loadTemplatesFromDb(); };
  const handleCloseTemplateDialog = () => setOpenTemplateDialog(false);
  const handleSelectTemplate = (t) => { const name = t?.name || ''; setPaymentScheduleSelection(name); setForm((prev) => ({ ...prev, payment_schedule_template_id: t?.id || '', payment_schedule_template: name })); setOpenTemplateDialog(false); };

  const [openEmployeeLevelDialog, setOpenEmployeeLevelDialog] = React.useState(false);
  const [employeeLevelList, setEmployeeLevelList] = React.useState([]);
  const [employeeLevelLoading, setEmployeeLevelLoading] = React.useState(false);
  const [employeeLevelError, setEmployeeLevelError] = React.useState('');
  const loadEmployeeLevelsFromDb = React.useCallback(async () => { setEmployeeLevelLoading(true); setEmployeeLevelError(''); try { const { data, error } = await supabase.from('employee_level').select('id,level_id,level_name_th,level_name_en').order('level_id', { ascending: true }).limit(1000); if (error) throw error; const mapped = (data || []).map((l) => ({ id: l.id, level_code: l.level_id, level_name_th: l.level_name_th, level_name_en: l.level_name_en, label: l.level_name_th || l.level_name_en || l.level_id || '' })); setEmployeeLevelList(mapped); if (!mapped.length) setEmployeeLevelError('ไม่พบข้อมูลระดับพนักงานในฐานข้อมูล'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรายการระดับพนักงานได้'; setEmployeeLevelError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setEmployeeLevelLoading(false); } }, []);
  const handleOpenEmployeeLevelDialog = async () => { setOpenEmployeeLevelDialog(true); if (employeeLevelList.length === 0) await loadEmployeeLevelsFromDb(); };
  const handleCloseEmployeeLevelDialog = () => setOpenEmployeeLevelDialog(false);
  const handleSelectEmployeeLevel = (l) => { const label = l?.label || l?.level_name_th || ''; setForm((prev) => ({ ...prev, level: label, level_id: l?.id || '' })); setOpenEmployeeLevelDialog(false); };

  const [openEmployeeGroupDialog, setOpenEmployeeGroupDialog] = React.useState(false);
  const [employeeGroupList, setEmployeeGroupList] = React.useState([]);
  const [employeeGroupLoading, setEmployeeGroupLoading] = React.useState(false);
  const [employeeGroupError, setEmployeeGroupError] = React.useState('');
  const loadEmployeeGroupsFromDb = React.useCallback(async () => { setEmployeeGroupLoading(true); setEmployeeGroupError(''); try { const { data, error } = await supabase.from('employee_group').select('id,emp_group_id,emp_group_name_th,emp_group_name_en').order('emp_group_id', { ascending: true }).limit(1000); if (error) throw error; const mapped = (data || []).map((g) => ({ id: g.id, group_code: g.emp_group_id, group_name: g.emp_group_name_th, group_name_en: g.emp_group_name_en, label: g.emp_group_name_th || g.emp_group_name_en || g.emp_group_id || '' })); setEmployeeGroupList(mapped); if (!mapped.length) setEmployeeGroupError('ไม่พบข้อมูลกลุ่มพนักงานในฐานข้อมูล'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดรายการกลุ่มพนักงานได้'; setEmployeeGroupError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setEmployeeGroupLoading(false); } }, []);
  const handleOpenEmployeeGroupDialog = async () => { setOpenEmployeeGroupDialog(true); if (employeeGroupList.length === 0) await loadEmployeeGroupsFromDb(); };
  const handleCloseEmployeeGroupDialog = () => setOpenEmployeeGroupDialog(false);
  const handleSelectEmployeeGroup = (g) => { const label = g?.label || g?.group_name || ''; setForm((prev) => ({ ...prev, employee_group: label, employee_group_id: g?.id || '' })); setOpenEmployeeGroupDialog(false); };

  const [userGroupList, setUserGroupList] = React.useState([]);
  const [userGroupLoading, setUserGroupLoading] = React.useState(false);
  const [userGroupError, setUserGroupError] = React.useState('');
  const [openUserGroupDialog, setOpenUserGroupDialog] = React.useState(false);

  const [assignedUserGroups, setAssignedUserGroups] = React.useState([]);
  const loadUserGroupsFromDb = React.useCallback(async () => { setUserGroupLoading(true); setUserGroupError(''); try { const { data, error } = await supabase.from('user_group').select('id,group_id,group_name_th').order('group_id', { ascending: true }).limit(1000); if (error) throw error; const mapped = (data || []).map((g) => ({ id: g.id, code: g.group_id, name: g.group_name_th, label: g.group_name_th || g.group_id || '' })); setUserGroupList(mapped); if (!mapped.length) setUserGroupError('ไม่พบกลุ่มผู้ใช้'); } catch (err) { const msg = err?.message || 'ไม่สามารถโหลดกลุ่มผู้ใช้ได้'; setUserGroupError(msg); setSnackbar({ open: true, message: msg, severity: 'error' }); } finally { setUserGroupLoading(false); } }, []);
  const handleOpenUserGroupDialog = async () => { setOpenUserGroupDialog(true); if (userGroupList.length === 0) await loadUserGroupsFromDb(); };
  const handleCloseUserGroupDialog = () => setOpenUserGroupDialog(false);
  const handleSelectUserGroup = (g) => { setAssignedUserGroups((prev) => { if (prev.some((x) => x.id === g.id)) return prev; return [...prev, { id: g.id, code: g.code, name: g.name, assigned_employee_id: '', assigned_employee_name: '' }]; }); setOpenUserGroupDialog(false); };

  const [employeeList, setEmployeeList] = React.useState([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);
  const [employeeError, setEmployeeError] = React.useState('');
  const [openEmployeePicker, setOpenEmployeePicker] = React.useState(false);
  const [employeePickerTargetIndex, setEmployeePickerTargetIndex] = React.useState(null);
  const [employeePickerMode, setEmployeePickerMode] = React.useState(null);

  // Note: employees table uses department_id (not unit_id) for the department foreign key.
  const loadEmployeesFromDb = React.useCallback(async () => { try { setEmployeeLoading(true); const { data, error } = await supabase.from('employees').select('id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, department_id, position, position_id').order('first_name_th', { ascending: true }).limit(1000); if (error) { setEmployeeError(error.message); setEmployeeList([]); } else { setEmployeeList(data || []); setEmployeeError(''); } } catch (err) { setEmployeeError(err?.message || 'ไม่สามารถโหลดพนักงานได้'); setEmployeeList([]); } finally { setEmployeeLoading(false); } }, []);
  React.useEffect(() => { if (openAdd && employeeList.length === 0 && !employeeLoading) { loadEmployeesFromDb(); } }, [openAdd, employeeList.length, employeeLoading, loadEmployeesFromDb]);

  const handleCloseEmployeePicker = () => { setOpenEmployeePicker(false); setEmployeePickerTargetIndex(null); setEmployeePickerMode(null); };
  const handleOpenEmployeePicker = async (mode = 'group') => { try { if (employeeList.length === 0 && !employeeLoading) await loadEmployeesFromDb(); } catch (err) { /* ignore */ } setEmployeePickerMode(mode); setOpenEmployeePicker(true); };
  const handleSelectSupervisor = (emp) => { const name = `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(); setForm((prev) => ({ ...prev, supervisor: name, supervisor_id: emp.id })); handleCloseEmployeePicker(); };
  const handleSelectEmployeeForGroup = (emp) => { setAssignedUserGroups((prev) => prev.map((g, idx) => idx === employeePickerTargetIndex ? { ...g, assigned_employee_id: emp.id, assigned_employee_name: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim() } : g)); handleCloseEmployeePicker(); };
  const handleSelectApprover = (emp) => { setApprovers((prev) => { const copy = prev.slice(); const idx = employeePickerTargetIndex; if (idx != null && copy[idx]) { copy[idx] = { ...copy[idx], approver_code: emp.employee_code || emp.id || '', approver_name: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim() }; } return copy; }); handleCloseEmployeePicker(); };
  const handleSelectMainEmployee = async (emp) => {
    // Build name from available fields
    const name = `${emp.first_name_th || emp.first_name_en || ''}${(emp.last_name_th || emp.last_name_en) ? ' ' + (emp.last_name_th || emp.last_name_en) : ''}`.trim();

    // Helper to apply a resolved employee object into form (names only)
    const applyBasicEmpToForm = (e) => {
      const resolvedName = `${e.first_name_th || e.first_name_en || ''}${(e.last_name_th || e.last_name_en) ? ' ' + (e.last_name_th || e.last_name_en) : ''}`.trim();
      setForm((prev) => ({
        ...prev,
        employee_code: e.employee_code || e.employee_id || prev.employee_code || '',
        first_name_th: e.first_name_th || e.first_name_en || prev.first_name_th || '',
        last_name_th: e.last_name_th || e.last_name_en || prev.last_name_th || '',
        selected_employee_name: e.employee_full_name || e.employee_name || resolvedName || prev.selected_employee_name || '',
      }));
    };

    // After we have the employee row, resolve position and department names/ids from their tables
    const resolveAndApplyOrgInfo = async (e) => {
      try {
        // normalize possible id fields
        const deptId = e.department_id || e.departmentId || e.dept_id || e.unit_id || e.unitId || e.deptId || null;
        const posId = e.position_id || e.positionId || e.job_position_id || e.pos_id || null;

        let resolvedUnit = null;
        let resolvedUnitId = null;
        let resolvedPosition = null;
        let resolvedPositionId = null;

        // fetch position if we have an id
        if (posId) {
          try {
            const { data: posRow, error: posErr } = await supabase.from('positions').select('id,position_code,position_name,position_name_eng').eq('id', posId).single();
            if (!posErr && posRow) {
              resolvedPosition = posRow.position_name || posRow.position_name_eng || posRow.position_code || null;
              resolvedPositionId = posRow.id || posId;
            }
          } catch (pe) { /* position lookup failed */ }
        }

        // fetch department/unit - try 'departments' first, fallback to view 'v_department_form'
        if (deptId) {
          try {
            const { data: deptRow, error: deptErr } = await supabase.from('departments').select('id,dept_id,dept_name,department_name,name_th,name_en').eq('id', deptId).single();
            if (!deptErr && deptRow) {
              resolvedUnit = deptRow.dept_name || deptRow.department_name || deptRow.name_th || deptRow.name_en || deptRow.dept_id || null;
              resolvedUnitId = deptRow.id || deptId;
            }
          } catch (de) { /* departments lookup failed */ }

          // fallback to v_department_form if departments did not return
          if (!resolvedUnit) {
            try {
              const { data: vdeptRow, error: vdeptErr } = await supabase.from('v_department_form').select('id,dept_id,dept_name').eq('id', deptId).single();
              if (!vdeptErr && vdeptRow) {
                resolvedUnit = vdeptRow.dept_name || vdeptRow.dept_id || null;
                resolvedUnitId = vdeptRow.id || deptId;
              }
            } catch (ve) { /* v_department_form lookup failed */ }
          }
        }

        // If we resolved anything, apply to form (preserve any existing values otherwise)
        setForm((prev) => ({
          ...prev,
          unit: resolvedUnit || prev.unit || e.unit || e.department || '',
          unit_id: resolvedUnitId || prev.unit_id || e.unit_id || e.dept_id || '',
          position: resolvedPosition || prev.position || e.position || '',
          position_id: resolvedPositionId || prev.position_id || e.position_id || '',
        }));
      } catch (err) {
        // resolveAndApplyOrgInfo error suppressed
      }
    };

    // If picker row already contains unit/position info, apply basic values and then still attempt to resolve ids/names
    const hasUnit = emp.unit || emp.unit_name || emp.dept_name || emp.department || emp.department_name || emp.dept_id || emp.unit_id || emp.department_id;
    const hasPosition = emp.position || emp.position_name || emp.position_label || emp.job_title || emp.position_id;

    // Apply name fields immediately for snappy UI
    applyBasicEmpToForm(emp);

    try {
      setEmployeeLoading(true);
      // If the picker row doesn't have ids/names we need, fetch full employee row
      let full = emp;
      if (!hasUnit || !hasPosition) {
        try {
          const { data: fullRow, error } = await supabase.from('employees').select('*').eq('id', emp.id).single();
          if (!error && fullRow) full = fullRow;
        } catch (fe) { /* Failed to fetch full employee row */ }
      }

      // Resolve organization info based on the final employee row
      await resolveAndApplyOrgInfo(full);
    } finally {
      setEmployeeLoading(false);
      handleCloseEmployeePicker();
    }
  };

  const handleRemoveAssignedUserGroup = (index) => setAssignedUserGroups((prev) => prev.filter((_, i) => i !== index));

  const [approvers, setApprovers] = React.useState(() => ([
    { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
  ]));
  const handleApproverChange = (index, field) => (e) => { const val = e?.target?.value; setApprovers((prev) => { const copy = prev.slice(); copy[index] = { ...copy[index], [field]: val }; return copy; }); };
  const removeApproverRow = (i) => setApprovers((prev) => prev.filter((_, idx) => idx !== i));
  const handleApproverActions = (index) => { setEmployeePickerTargetIndex(index); handleOpenEmployeePicker('approver'); };

  const handleOpenAdd = () => {
    setActiveTab(0);
    setEditMode(false);
    setOriginalId(null);
    setImagePreview(null);
    setImageFile(null);
    setForm(initialForm);
    setAssignedUserGroups([]);
    setBankAccounts([]);
    setPaymentScheduleSelection('');
    setApprovers([
      { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
    ]);
    // initialize calculation options to defaults when opening Add dialog
    setCalcOptions({
      lastPeriod: true,
      salary: true,
      salaryBasis: 'base',
      finalOneTime: true,
      finalRecurring: true,
      carryOverNonRecurring: true,
      carryOverEndDate: '',
      ssoNextPeriod: true,
      finalRecurringItems: [],
    });
    setOpenAdd(true);
    generateDocNo();
  };


  const handleCloseAdd = () => {
    // Close dialog and reset add-dialog state so next open starts fresh
    setOpenAdd(false);
    setEditMode(false);
    setOriginalId(null);
    setForm(initialForm);
    // clear image preview/file
    if (imagePreview) {
      try { URL.revokeObjectURL(imagePreview); } catch (e) { /* ignore */ }
    }
    setImagePreview(null);
    setImageFile(null);
    // reset related collections and selections
    setAssignedUserGroups([]);
    setBankAccounts([]);
    setPaymentScheduleSelection('');
    setApprovers([
      { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
    ]);
    // reset calculation options to defaults
    setCalcOptions({
      lastPeriod: true,
      salary: true,
      salaryBasis: 'base',
      finalOneTime: true,
      finalRecurring: true,
      carryOverNonRecurring: true,
      carryOverEndDate: '',
      ssoNextPeriod: true,
      finalRecurringItems: [],
    });
  };

  const handleOpenEdit = (row) => {
    if (!row) return;
    setEditMode(true);
    setOriginalId(row.id);
    // map DB snapshot fields into form-friendly fields (so UI shows saved snapshot)
    setForm(() => ({
      ...initialForm,
      ...row,
      employment_status: row.employment_status || 'ทำงาน',
      first_name_th: row.employee_first_name || row.first_name_th || '',
      last_name_th: row.employee_last_name || row.last_name_th || '',
      selected_employee_name: row.employee_full_name || `${row.employee_first_name || row.first_name_th || ''}${row.employee_last_name ? ' ' + row.employee_last_name : (row.last_name_th ? ' ' + row.last_name_th : '')}`.trim() || '',
      unit: row.unit || row.unit || '',
      position: row.position || row.position || '',
    }));
    setImageFile(null);
    setImagePreview(row.image_url || null);
    setPaymentScheduleSelection(row.payment_schedule_template || row.payment_schedule_template_name || '');
    setActiveTab(0);
    setOpenAdd(true);
    try {
      if (row.marriage_province_id) loadDistrictsFromDb(row.marriage_province_id, row.marriage_district_id, 'marriage_district_id');
      if (row.current_address_province) { loadDistrictsFromDb(row.current_address_province, row.current_address_district, 'current_address_district'); if (row.current_address_district) loadSubdistrictsFromDb(row.current_address_district, row.current_address_subdistrict); }
      if (provinces.length === 0 && !provincesLoading && !provincesError) loadProvincesFromDb();
    } catch (err) { /* open edit load districts error */ }

    (async () => {
      try {
        const { data: bankData, error: bankErr } = await supabase.from('termination_bank_accounts').select('*').eq('termination_id', row.id).order('created_at', { ascending: true });
        if (bankErr) throw bankErr;
        if (bankData && bankData.length) setBankAccounts(bankData.map((b) => ({ id: b.id, bank_name: b.bank_name || '', branch: b.branch || '', account_name: b.account_name || '', account_number: b.account_number || '', percent: b.percent != null ? String(b.percent) : '' }))); else setBankAccounts([]);
      } catch (e) { /* load termination bank accounts error */ }
    })();

    (async () => {
      try {
        const { data: aprData, error: aprErr } = await supabase.from('termination_approvers').select('*').eq('termination_id', row.id).order('approver_order', { ascending: true });
        if (aprErr) throw aprErr;
        const seed = [
          { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
        ];
        if (aprData && aprData.length) {
          const merged = seed.map((s, idx) => {
            const dbRow = aprData[idx];
            if (dbRow) return { screen_name: dbRow.screen_name || s.screen_name, approver_code: dbRow.approver_code || '', approver_name: dbRow.approver_name || '' };
            return s;
          });
          setApprovers(merged);
        }
      } catch (e) { /* load termination approvers error */ }
    })();

    (async () => {
      try {
        const { data: ugData, error: ugErr } = await supabase.from('termination_user_groups').select('*').eq('termination_id', row.id).order('created_at', { ascending: true });
        if (ugErr) throw ugErr;
        if (ugData && ugData.length) setAssignedUserGroups(ugData.map((u) => ({ id: u.id, name: u.group_name || '', assigned_employee_id: u.assigned_employee_id || '', assigned_employee_name: u.assigned_employee_name || '' }))); else setAssignedUserGroups([]);
      } catch (e) { /* load termination user groups error */ }
    })();

    // load calculation options and final recurring items (show saved calculation-tab state)
    (async () => {
      try {
        // If calc_options exists on the row, apply it first (preserves flags)
        if (row && row.calc_options) {
          try {
            setCalcOptions((prev) => ({ ...prev, ...row.calc_options }));
          } catch (applyErr) { /* apply row.calc_options failed */ }
        }

        // Load child final recurring items so the UI table reflects persisted entries
        const { data: finalData, error: finalErr } = await supabase.from('termination_final_recurring_items').select('*').eq('termination_id', row.id).order('id', { ascending: true });
        if (!finalErr && finalData && finalData.length) {
          const mapped = finalData.map((f) => ({ id: f.id || Date.now().toString(), name: f.name || '', amount: f.amount != null ? String(f.amount) : '', finalMethod: f.final_method || f.finalMethod || 'base', calculate: f.calculate === undefined ? true : Boolean(f.calculate) }));
          setCalcOptions((prev) => ({ ...prev, finalRecurringItems: mapped }));
        } else if (!finalErr && (!finalData || finalData.length === 0)) {
          // ensure there's at least an empty array
          setCalcOptions((prev) => ({ ...prev, finalRecurringItems: [] }));
        }
      } catch (e) {
        /* load termination final recurring items error */
      }
    })();
  };

  const handleAskDelete = (row) => { setTargetRow(row); setOpenDelete(true); };
  const handleCloseDelete = () => { setTargetRow(null); setOpenDelete(false); };
  const handleConfirmDelete = async () => {
    if (!targetRow || deleting) return;
    setDeleting(true);
    try {
      // delete child rows first to keep referential integrity
      await supabase.from('termination_user_groups').delete().eq('termination_id', targetRow.id);
      await supabase.from('termination_approvers').delete().eq('termination_id', targetRow.id);
      await supabase.from('termination_bank_accounts').delete().eq('termination_id', targetRow.id);
      await supabase.from('termination_final_recurring_items').delete().eq('termination_id', targetRow.id);
      const { error } = await supabase.from('employee_terminations').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      console.error('Delete termination error', err);
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Termination-specific state and helpers
  const [calcOptions, setCalcOptions] = React.useState({
    // default checkboxes: lastPeriod, carryOverNonRecurring and ssoNextPeriod should be checked
    lastPeriod: true,
    salary: true,
    salaryBasis: 'base',
    finalOneTime: true,
    finalRecurring: true,
    carryOverNonRecurring: true,
    carryOverEndDate: '',
    ssoNextPeriod: true,
    finalRecurringItems: [],
  });

  const handleCalcChange = (field) => (e) => {
    const val = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setCalcOptions((prev) => ({ ...prev, [field]: val }));
  };

  const addFinalRecurringItem = () => {
    setCalcOptions((prev) => ({ ...prev, finalRecurringItems: [...prev.finalRecurringItems, { id: Date.now().toString(), name: '', amount: '', finalMethod: 'base', calculate: true }] }));
  };
  const updateFinalRecurringItem = (index, field) => (e) => {
    const val = field === 'calculate' ? e.target.checked : e.target.value;
    setCalcOptions((prev) => { const copy = prev.finalRecurringItems.slice(); copy[index] = { ...copy[index], [field]: val }; return { ...prev, finalRecurringItems: copy }; });
  };
  const removeFinalRecurringItem = (index) => { setCalcOptions((prev) => ({ ...prev, finalRecurringItems: prev.finalRecurringItems.filter((_, i) => i !== index) })); };

  const generateDocNo = React.useCallback(async () => {
    const now = dayjs();
    const prefix = `RES${now.format('YYYYMM')}`;
    let seq = '0001';
    try {
      const { data, error } = await supabase.from('employee_terminations').select('doc_no').ilike('doc_no', `${prefix}-%`).order('doc_no', { ascending: false }).limit(1);
      if (!error && data && data.length && data[0].doc_no) {
        const m = String(data[0].doc_no).match(/-(\d{4,})$/);
        if (m && m[1]) seq = String(parseInt(m[1], 10) + 1).padStart(4, '0');
      }
    } catch (e) { /* generateDocNo fallback */ }
    const docNo = `${prefix}-${seq}`;
    setForm((prev) => ({ ...prev, doc_no: docNo, doc_date: now.format('YYYY-MM-DD') }));
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">บันทึกพ้นสภาพความเป็นพนักงาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="termination-search-field-label">ค้นหาโดย</InputLabel>
          <Select labelId="termination-search-field-label" value={searchField} label="ค้นหาโดย" onChange={(e) => setSearchField(e.target.value)}>
            <MenuItem value="doc_no">เลขที่เอกสาร</MenuItem>
            <MenuItem value="employee_code">รหัสพนักงาน</MenuItem>
            <MenuItem value="employee_name">ชื่อพนักงาน</MenuItem>
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
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>วันที่มีผลบังคับใช้</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ประเภทการพ้นสภาพ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>เหตุผล</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>การทำงาน</TableCell>
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
                  <Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.doc_no || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employee_code || '-'}</TableCell>
                  <TableCell>{(row.employee_full_name) || (row.employee_name) || `${row.employee_first_name || row.first_name_th || row.first_name_en || ''}${(row.employee_last_name || row.last_name_th || row.last_name_en) ? ' ' + (row.employee_last_name || row.last_name_th || row.last_name_en) : ''}`.trim() || '-'}</TableCell>
                  <TableCell>{row.effective_date ? dayjs(row.effective_date).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell>{row.termination_type || '-'}</TableCell>
                  <TableCell>{row.reason || '-'}</TableCell>
                  <TableCell>{row.status || row.approval_status || row.employment_status || 'รออนุมัติ'}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)} disabled={saving}><EditOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton size="small" color="error" onClick={() => handleAskDelete(row)} disabled={deleting}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">ต้องการลบข้อมูลพนักงาน "{targetRow?.employee_code || targetRow?.first_name_th || targetRow?.first_name_en}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="inherit" disabled={deleting}>ยกเลิก</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>{deleting ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังลบ...</>) : (<><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>)}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAdd} onClose={handleCloseAdd} maxWidth="lg" fullWidth PaperProps={{ sx: { mx: 'auto', width: '86%', maxWidth: 1100, maxHeight: '90vh', height: '80vh' } }}>
        <DialogTitle sx={{ pb: 0 }}>{editMode ? 'แก้ไขบันทึกพ้นสภาพ' : 'เพิ่มบันทึกพ้นสภาพ'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 0, overflowY: 'auto' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tab label="ข้อมูลทั่วไป" />
              <Tab label="การคำนวณค่าจ้าง" />
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
                <THDateField label="วันที่มีผลบังคับใช้" value={form.effective_date || ''} onChange={(v) => setForm((p) => ({ ...p, effective_date: v }))} sx={{ width: '100%' }} error={Boolean(errors.effective_date)} helperText={errors.effective_date || ''} />
                <THDateField label="วันที่ทำงานวันสุดท้าย" value={form.last_work_date || ''} onChange={(v) => setForm((p) => ({ ...p, last_work_date: v }))} sx={{ width: '100%' }} error={Boolean(errors.last_work_date)} helperText={errors.last_work_date || ''} />

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="termination-type-label">ประเภทการพ้นสภาพ</InputLabel>
                      <Select labelId="termination-type-label" value={form.termination_type || ''} label="ประเภทการพ้นสภาพ" onChange={(e) => setForm((p) => ({ ...p, termination_type: e.target.value }))}>
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="ลาออก">ลาออก</MenuItem>
                        <MenuItem value="เกษียณ">เกษียณ</MenuItem>
                        <MenuItem value="เลิกจ้าง">เลิกจ้าง</MenuItem>
                        <MenuItem value="ไล่ออกหรือถูกให้ออก">ไล่ออกหรือถูกให้ออก</MenuItem>
                        <MenuItem value="ถึงแก่กรรม">ถึงแก่กรรม</MenuItem>
                        <MenuItem value="สิ้นสุดระยะเวลาการจ้างงาน">สิ้นสุดระยะเวลาการจ้างงาน</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <FormControlLabel sx={{ ml: 1 }} control={<Checkbox checked={Boolean(form.retire_and_continue)} onChange={(e) => setForm((p) => ({ ...p, retire_and_continue: e.target.checked }))} />} label="เกษียณแต่ยังทำงาน" />
                  </Box>
                </Box>

                <TextField label="อ้างอิงเลขที่เอกสาร" size="small" fullWidth value={form.ref_doc_no || ''} InputProps={{ readOnly: true }} />
                <TextField label="เหตุผล" size="small" fullWidth value={form.reason || ''} onChange={handleFormChange('reason')} error={Boolean(errors.reason)} helperText={errors.reason || ''} />
                <TextField label="รายละเอียด" size="small" fullWidth value={form.detail || ''} onChange={handleFormChange('detail')} multiline minRows={3} />
                <TextField
                  label="พนักงาน"
                  size="small"
                  fullWidth
                  value={form.employee_code || ''}
                  InputProps={{
                    readOnly: true, endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" size="small" onClick={() => handleOpenEmployeePicker('employee')} aria-label="เลือกพนักงาน">
                          <MoreHorizIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  error={Boolean(errors.employee_code)}
                  helperText={errors.employee_code || ''}
                />
                <TextField label="ชื่อพนักงาน" size="small" fullWidth value={(form.first_name_th || '') + (form.last_name_th ? ` ${form.last_name_th}` : '')} InputProps={{ readOnly: true }} />
                <TextField label="หน่วยงานพนักงาน" size="small" fullWidth value={form.unit || ''} InputProps={{ readOnly: true }} />
                <TextField label="ตำแหน่งพนักงาน" size="small" fullWidth value={form.position || ''} InputProps={{ readOnly: true }} />
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={calcOptions.lastPeriod} onChange={handleCalcChange('lastPeriod')} />} label="คำนวณค่าจ้างงวดสุดท้าย" />
                  {/* Always render the inner controls; disable them when lastPeriod is false so they are visible but inactive */}
                  <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 1, opacity: calcOptions.lastPeriod ? 1 : 0.6 }}>
                    <FormControlLabel control={<Checkbox checked={calcOptions.salary} onChange={handleCalcChange('salary')} disabled={!calcOptions.lastPeriod} />} label="คำนวณเงินเดือน" />
                    {calcOptions.salary && (
                      <Box sx={{ pl: 3 }}>
                        <FormControl component="fieldset">
                          {/* <FormLabel component="legend" sx={{ typography: 'body2', color: 'text.primary' }}>วิธีคำนวณเงินเดือน</FormLabel> */}
                          <RadioGroup row value={calcOptions.salaryBasis} onChange={(_, v) => setCalcOptions((p) => ({ ...p, salaryBasis: v }))}>
                            <FormControlLabel value="base" control={<Radio disabled={!calcOptions.lastPeriod} />} label="ตามฐานเงินเดือน" />
                            <FormControlLabel value="attendance" control={<Radio disabled={!calcOptions.lastPeriod} />} label="ตามจำนวนวันที่มาทำงาน" />
                            <FormControlLabel value="deduct_absence" control={<Radio disabled={!calcOptions.lastPeriod} />} label="หักค่าจ้างตามวันที่ไม่ได้ทำงาน" />
                          </RadioGroup>
                        </FormControl>
                      </Box>
                    )}

                    <FormControlLabel control={<Checkbox checked={calcOptions.finalOneTime} onChange={handleCalcChange('finalOneTime')} disabled={!calcOptions.lastPeriod} />} label="คำนวณรายได้-รายหักไม่ประจำงวดสุดท้าย" />
                    <FormControlLabel control={<Checkbox checked={calcOptions.finalRecurring} onChange={handleCalcChange('finalRecurring')} disabled={!calcOptions.lastPeriod} />} label="คำนวณรายได้-รายหักประจำงวดสุดท้าย" />
                  </Box>
                </Box>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <FormControlLabel control={<Checkbox checked={calcOptions.carryOverNonRecurring} onChange={handleCalcChange('carryOverNonRecurring')} />} label="คำนวณรายได้ไม่ประจำคงเหลือ" />
                  {calcOptions.carryOverNonRecurring && (
                    <Box sx={{ pl: 3 }}>
                      <THDateField sx={{ mt: 1 }} label="สิ้นสุด ณ วันที่" value={calcOptions.carryOverEndDate} onChange={(v) => setCalcOptions((p) => ({ ...p, carryOverEndDate: v }))} />
                    </Box>
                  )}
                  <FormControlLabel sx={{ mt: 2 }} control={<Checkbox checked={calcOptions.ssoNextPeriod} onChange={handleCalcChange('ssoNextPeriod')} />} label="นำส่งเงินสมทบประกันสังคมในงวดถัดไป" />
                </Box>

                <Paper variant="outlined" >
                 
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ชื่อรายได้-รายหัก</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 160 }}>จำนวนเงิน</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 260 }}>การคำนวณงวดสุดท้าย</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 120 }}>คำนวณ</TableCell>
                        <TableCell sx={{ width: 80 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calcOptions.finalRecurringItems.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" color="text.secondary">ไม่มีรายการ</Typography></TableCell></TableRow>
                      ) : (
                        calcOptions.finalRecurringItems.map((it, idx) => (
                          <TableRow key={it.id}>
                            <TableCell>
                              <TextField size="small" fullWidth value={it.name} onChange={updateFinalRecurringItem(idx, 'name')} />
                            </TableCell>
                            <TableCell>
                              <TextField size="small" fullWidth type="number" value={it.amount} onChange={updateFinalRecurringItem(idx, 'amount')} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                            </TableCell>
                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select value={it.finalMethod} onChange={(e) => updateFinalRecurringItem(idx, 'finalMethod')({ target: { value: e.target.value } })}>
                                  <MenuItem value="base">ตามฐานเงินเดือน</MenuItem>
                                  <MenuItem value="attendance">ตามจำนวนวันที่มาทำงาน</MenuItem>
                                  <MenuItem value="deduct_absence">หักค่าจ้างตามวันที่ไม่ได้ทำงาน</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControlLabel control={<Checkbox checked={Boolean(it.calculate)} onChange={updateFinalRecurringItem(idx, 'calculate')} />} label="" />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => removeFinalRecurringItem(idx)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="สถานะการอนุมัติ" size="small" fullWidth value={form.approval_status || ''} InputProps={{ readOnly: true }} />
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField label="อนุมัติเมื่อ" size="small" fullWidth value={form.approved_at || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ผู้อนุมัติ" size="small" fullWidth value={form.approver_name || ''} InputProps={{ readOnly: true }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField label="หน่วยงาน" size="small" fullWidth value={form.approver_unit || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ตำแหน่ง" size="small" fullWidth value={form.approver_position || ''} InputProps={{ readOnly: true }} />
                </Box>
                <TextField label="หมายเหตุ" size="small" fullWidth value={form.approval_note || ''} InputProps={{ readOnly: true }} multiline minRows={3} />
              </Box>
            )}

            {activeTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField label="ยกเลิกเมื่อ" size="small" fullWidth value={form.cancelled_at || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ผู้ยกเลิก" size="small" fullWidth value={form.cancelled_by || ''} InputProps={{ readOnly: true }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField label="หน่วยงาน" size="small" fullWidth value={form.cancel_unit || ''} InputProps={{ readOnly: true }} />
                  <TextField label="ตำแหน่ง" size="small" fullWidth value={form.cancel_position || ''} InputProps={{ readOnly: true }} />
                </Box>
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

      <Dialog open={openEmployeePicker} onClose={handleCloseEmployeePicker} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกพนักงาน</DialogTitle>
        <DialogContent dividers>
          {employeeLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>) : employeeError ? (<Box sx={{ p: 2 }}><Typography color="error">{employeeError}</Typography></Box>) : employeeList.length === 0 ? (<Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลพนักงาน</Typography></Box>) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              <TableBody>
                {employeeList.map((emp) => (
                  <TableRow key={emp.id} hover onClick={() => { if (employeePickerMode === 'supervisor') return handleSelectSupervisor(emp); if (employeePickerMode === 'approver') return handleSelectApprover(emp); if (employeePickerMode === 'employee') return handleSelectMainEmployee(emp); return handleSelectEmployeeForGroup(emp); }} sx={{ cursor: 'pointer' }}>
                    <TableCell>{emp.employee_code || ''} - {`${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseEmployeePicker}>ปิด</Button></DialogActions>
      </Dialog>

      {/* Many picker dialogs reused from employee page (position/unit/shift/bank/template/etc) */}
      {/* For brevity in this copy we keep the dialogs but omitted repeating identical markup here */}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
