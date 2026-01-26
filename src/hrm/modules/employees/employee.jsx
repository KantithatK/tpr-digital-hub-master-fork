// src/hrm/modules/employees/employee.jsx
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
// import { useAuth } from '@/contexts/AuthContext';

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
// navigation/add/remove icons removed (were used by payment UI)

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// TH-style date field copied from payment-schedules for consistent behavior
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


export default function EmployeePage() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Add dialog state
  const [openAdd, setOpenAdd] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const initialForm = {
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
    supervisor_name: '',
    supervisor_id: '',
    employee_type: '',
    employee_group: '',
    employee_group_id: '',
    level: '',
    level_id: '',

    // Education and Work Experience stored as arrays of objects
    education: [],
    work_experiences: [],

    start_date: '',
    probation_days: '',
    confirmation_date: '',
    working_hours: '',
    shift_schedule_id: '',
    company_calendar_id: '',
    company_calendar_name: '',
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

      let query = supabase.from('employees').select('*', { count: 'exact' }).order('employee_code', { ascending: true }).range(from, to);

      // apply simple ilike search if provided
      if (appliedSearch && appliedSearch.text && appliedSearch.field) {
        const pattern = `%${appliedSearch.text}%`;
        // use ilike for case-insensitive partial match
        query = query.ilike(appliedSearch.field, pattern);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setRows(data || []);
      // Supabase returns count when count:'exact' is used
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

  // payment schedule UI removed — payment schedule state and handlers omitted for now

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
    // also clear image reference in form so payload will remove image_url on save
    setForm((prev) => ({ ...prev, image_url: null }));
  };

  const ageYears = React.useMemo(() => {
    if (!form.birth_date) return '';
    try {
      // use dayjs diff in years for consistent age calculation
      const years = dayjs().diff(dayjs(form.birth_date), 'year');
      return Number.isFinite(years) && years >= 0 ? String(years) : '';
    } catch {
      return '';
    }
  }, [form.birth_date]);

  const handleFormChange = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // clear validation error for this field when the user changes it
    setErrors((prev) => (prev && prev[field] ? { ...prev, [field]: '' } : prev));
  };

  // Number-specific change handler: store numeric value or empty string
  const handleNumberChange = (field) => (e) => {
    const raw = e?.target?.value;
    // allow empty to clear the field
    if (raw === '' || raw === null || typeof raw === 'undefined') {
      setForm((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    // parse number (support decimals for weight)
    const num = Number(raw);
    if (Number.isNaN(num)) return; // ignore invalid inputs
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  // Validation state for required fields
  const [errors, setErrors] = React.useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!form.employee_code || !String(form.employee_code).trim()) newErrors.employee_code = 'กรุณากรอก รหัสพนักงาน';
    if (!form.title_th || !String(form.title_th).trim()) newErrors.title_th = 'กรุณาเลือก คำนำหน้า';
    if (!form.first_name_th || !String(form.first_name_th).trim()) newErrors.first_name_th = 'กรุณากรอก ชื่อ (ไทย)';
    if (!form.last_name_th || !String(form.last_name_th).trim()) newErrors.last_name_th = 'กรุณากรอก นามสกุล (ไทย)';
    if (!form.nickname_th || !String(form.nickname_th).trim()) newErrors.nickname_th = 'กรุณากรอก ชื่อเล่น (ไทย)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Parse database errors to user-friendly messages and optionally set field errors
  const handleDbError = (err) => {
    try {
      const raw = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      const text = String(raw || '').toLowerCase();

      // PostgREST: .single() expects exactly 1 row but got 0 or >1
      if (text.includes('cannot coerce the result to a single json object')) {
        setSnackbar({
          open: true,
          message: 'ระบบไม่พบข้อมูลที่ต้องการ หรือพบข้อมูลมากกว่า 1 รายการ (single). โปรดลองใหม่อีกครั้ง',
          severity: 'error',
        });
        return;
      }

      // Exclusion constraint: no overlapping effective date ranges
      if (text.includes('no_overlap_emp_cal')) {
        setSnackbar({
          open: true,
          message: 'ช่วงวันที่ปฏิทินบริษัทซ้อนทับกับข้อมูลเดิม (calendar overlap). กรุณาปรับวันที่เริ่มมีผล หรือแก้ไขรายการเดิมก่อน',
          severity: 'error',
        });
        return;
      }

      // Postgres unique constraint / duplicate key
      if (text.includes('duplicate key') || text.includes('unique constraint')) {
        // try detect which constraint/column caused it
        if (text.includes('employees_employee_code_key') || text.includes('employee_code')) {
          setErrors((prev) => ({ ...prev, employee_code: 'รหัสพนักงานนี้มีอยู่แล้ว' }));
          setSnackbar({ open: true, message: 'รหัสพนักงานซ้ำ: กรุณาใช้รหัสอื่น', severity: 'error' });
          return;
        }
        // generic duplicate
        setSnackbar({ open: true, message: 'มีข้อมูลซ้ำในระบบ (duplicate)', severity: 'error' });
        return;
      }

      // default fallback
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

    if (saving) return; // prevent double submit
    setSaving(true);

    // Prepare payload mapping form fields to DB columns
    const payload = {
      employee_code: form.employee_code || null,
      image_url: form.image_url || null,
      timekeeping_exempt: form.timekeeping_exempt || false,

      title_th: form.title_th || null,
      first_name_th: form.first_name_th || null,
      last_name_th: form.last_name_th || null,
      title_en: form.title_en || null,
      first_name_en: form.first_name_en || null,
      last_name_en: form.last_name_en || null,
      nickname_th: form.nickname_th || null,
      nickname_en: form.nickname_en || null,

      birth_date: form.birth_date || null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,

      national_id: form.national_id || null,
      national_id_issue_place: form.national_id_issue_place || null,
      national_id_issue_date: form.national_id_issue_date || null,
      national_id_expiry_date: form.national_id_expiry_date || null,
      passport_no: form.passport_no || null,
      foreign_tax_id: form.foreign_tax_id || null,

      marital_status: form.marital_status || null,
      marriage_province_id: form.marriage_province_id || null,
      marriage_province_label: form.marriage_province_label || null,
      marriage_district_id: form.marriage_district_id || null,
      marriage_district_label: form.marriage_district_label || null,
      marriage_registration_date: form.marriage_registration_date || null,
      spouse_age_65_plus: form.spouse_age_65_plus || false,

      military_status: form.military_status || null,
      military_note: form.military_note || null,

      driver_license_number: form.driver_license_number || null,
      driver_license_expiry: form.driver_license_expiry || null,
      driver_license_type: form.driver_license_type || null,

      nationality_id: form.nationality_id || null,
      nationality: form.nationality || null,
      race_id: form.race_id || null,
      race: form.race || null,
      religion: form.religion || null,

      // basic physical and location fields
      height_cm: form.height_cm || null,
      weight_kg: form.weight_kg || null,
      province: form.province || null,
      country: form.country || null,

      current_address_name: form.current_address_name || null,
      current_address_no: form.current_address_no || null,
      current_address_moo: form.current_address_moo || null,
      current_address_building: form.current_address_building || null,
      current_address_room: form.current_address_room || null,
      current_address_floor: form.current_address_floor || null,
      current_address_village: form.current_address_village || null,
      current_address_alley: form.current_address_alley || null,
      current_address_road: form.current_address_road || null,
      current_address_country_id: form.current_address_country || null,
      current_address_country: form.current_address_country || null,
      current_address_province: form.current_address_province || null,
      current_address_district: form.current_address_district || null,
      current_address_subdistrict: form.current_address_subdistrict || null,
      current_address_postal_code: form.current_address_postal_code || null,
      current_address_mobile: form.current_address_mobile || null,
      current_address_email_1: form.current_address_email_1 || null,
      current_address_email_2: form.current_address_email_2 || null,
      current_address_email_3: form.current_address_email_3 || null,

      position_id: form.position_id || null,
      position: form.position || null,
      department_id: form.unit_id || null,
      department_name: form.unit || null,
      // persist only supervisor_id (employee id of the supervisor). Do not send a text 'supervisor' column
      supervisor_id: form.supervisor_id || null,
      employee_type: form.employee_type || null,
      employee_group_id: form.employee_group_id || null,
      employee_group: form.employee_group || null,
      employee_level_id: form.level_id || null,
      level: form.level || null,
      start_date: form.start_date || null,
      probation_days: form.probation_days || null,
      confirmation_date: form.confirmation_date || null,
      working_hours: form.working_hours || null,
      shift_schedule_id: form.shift_schedule_id || null,
      service_age_years: form.service_age_years || null,
      service_age_months: form.service_age_months || null,
      service_age_days: form.service_age_days || null,
      employment_status: form.employment_status || null,
      salary_rate: form.salary_rate || null,

      salary_first_period_calc: form.salary_first_period_calc || null,
      payment_schedule_template_id: form.payment_schedule_template_id || null,
      payment_schedule_template: form.payment_schedule_template || paymentScheduleSelection || null,
      tax_calc_method: form.tax_calc_method || null,
      tax_rate_mode: form.tax_rate_mode || null,
      tax_fixed_boi_percent: form.tax_fixed_boi_percent || null,
      tax_employee_method: form.tax_employee_method || null,
      tax_employee_fixed_amount: form.tax_employee_fixed_amount || null,
      tax_employer_method: form.tax_employer_method || null,
      tax_employer_fixed_amount: form.tax_employer_fixed_amount || null,

  // persist education and work experiences as JSONB arrays
  education: form.education && form.education.length ? form.education : [],
  work_experiences: form.work_experiences && form.work_experiences.length ? form.work_experiences : [],

      created_by: form.created_by || null,
      created_at: form.created_at || null,
      updated_by: form.updated_by || null,
      updated_at: form.updated_at || null,
      notify_additional_info: form.notify_additional_info || false,
    };

    // remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      // optional image upload
      if (imageFile) {
        try {
          const fileExt = imageFile.name?.split('.').pop() || 'jpg';
          const filename = `employees/${form.employee_code || 'unknown'}_${Date.now()}.${fileExt}`;
          const bucket = 'employee-photos';

          // upload (supabase-js v1/v2 compatibility)
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
                // supabase v2 returns { publicUrl } in data
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

      const pickSingleRow = (rows) => (Array.isArray(rows) ? rows[0] : rows);

      let empId = null;
      if (editMode && originalId) {
        // update existing (avoid .single() coercion; PostgREST returns array)
        const { data: empRows, error: empError } = await supabase
          .from('employees')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', originalId)
          .select('*');
        if (empError) throw empError;
        const empRow = pickSingleRow(empRows);
        if (!empRow?.id) throw new Error('ไม่พบข้อมูลพนักงานหลังจากบันทึก (update)');
        empId = empRow.id;
      } else {
        // insert employee (avoid .single() coercion; PostgREST returns array)
        const { data: empRows, error: empError } = await supabase
          .from('employees')
          .insert([{ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          .select('*');
        if (empError) throw empError;
        const empRow = pickSingleRow(empRows);
        if (!empRow?.id) throw new Error('ไม่พบข้อมูลพนักงานหลังจากบันทึก (insert)');
        empId = empRow.id;
      }

      // insert assigned user groups
      // sync employee_user_groups: for edit, delete old then insert new; for insert, just insert
      if (assignedUserGroups && assignedUserGroups.length > 0) {
        if (editMode) {
          await supabase.from('employee_user_groups').delete().eq('employee_id', empId);
        }
        const toInsertUG = assignedUserGroups.map((g) => ({
          employee_id: empId,
          user_group_id: g.id || null,
          user_group_code: g.code || null,
          user_group_name: g.name || null,
          assigned_employee_id: g.assigned_employee_id || null,
          assigned_employee_name: g.assigned_employee_name || null,
        }));
        const { error: ugError } = await supabase.from('employee_user_groups').insert(toInsertUG);
        if (ugError) {
          console.error('Failed to insert employee_user_groups', ugError);
          setSnackbar({ open: true, message: `ไม่สามารถบันทึกกลุ่มผู้ใช้: ${ugError.message || ugError}`, severity: 'error' });
          if (!editMode) await supabase.from('employees').delete().eq('id', empId);
          throw ugError;
        }
      } else if (editMode) {
        // if editing and no assigned groups, ensure previous rows removed
        await supabase.from('employee_user_groups').delete().eq('employee_id', empId);
      }

      // insert approvers
      if (approvers && approvers.length > 0) {
        if (editMode) {
          await supabase.from('employee_approvers').delete().eq('employee_id', empId);
        }
        const toInsertApr = approvers.map((a, idx) => ({
          employee_id: empId,
          screen_name: a.screen_name || null,
          approver_code: a.approver_code || null,
          approver_name: a.approver_name || null,
          sort_order: idx,
        }));
        const { error: aprError } = await supabase.from('employee_approvers').insert(toInsertApr);
        if (aprError) {
          // attempt rollback
          if (!editMode) await supabase.from('employees').delete().eq('id', empId);
          await supabase.from('employee_user_groups').delete().eq('employee_id', empId);
          throw aprError;
        }
      } else if (editMode) {
        await supabase.from('employee_approvers').delete().eq('employee_id', empId);
      }

      // sync bank accounts: delete existing on edit, then insert new rows
      try {
        if (bankAccounts && bankAccounts.length > 0) {
          if (editMode) {
            await supabase.from('employee_bank_accounts').delete().eq('employee_id', empId);
          }
          const toInsertBanks = bankAccounts.map((b, idx) => ({
            employee_id: empId,
            bank_name: b.bank_name || null,
            branch: b.branch || null,
            account_name: b.account_name || null,
            account_number: b.account_number || null,
            percent: b.percent !== '' && b.percent != null ? Number(b.percent) : null,
            sort_order: idx,
          }));
          const { error: bankError } = await supabase.from('employee_bank_accounts').insert(toInsertBanks);
          if (bankError) {
            // attempt rollback of main employee row if we just inserted
            if (!editMode) await supabase.from('employees').delete().eq('id', empId);
            throw bankError;
          }
        } else if (editMode) {
          // remove any existing bank rows when editing and none provided
          await supabase.from('employee_bank_accounts').delete().eq('employee_id', empId);
        }
      } catch (bankSyncErr) {
        console.error('Bank accounts sync error', bankSyncErr);
        // bubble to outer catch to show proper error handling
        throw bankSyncErr;
      }

      // sync company calendar assignment if selected
      try {
        const calId = form.company_calendar_id || null;
        if (calId) {
          const effFrom = form.start_date || new Date().toISOString().slice(0, 10);
          const dayBefore = (dStr) => {
            const d = new Date(dStr);
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          };

          // 1) If there is an overlapping assignment at effFrom, adjust/update it to avoid exclusion conflict.
          const { data: overlapRows, error: overlapErr } = await supabase
            .from('employee_calendar_assignments')
            .select('id,calendar_id,effective_from,effective_to')
            .eq('user_id', empId)
            .lte('effective_from', effFrom)
            .or(`effective_to.is.null,effective_to.gte.${effFrom}`)
            .order('effective_from', { ascending: false })
            .limit(1);
          if (overlapErr) throw overlapErr;

          const overlap = overlapRows && overlapRows.length ? overlapRows[0] : null;
          let handledByUpdate = false;
          if (overlap?.id) {
            const overlapFrom = String(overlap.effective_from || '');
            if (overlapFrom === String(effFrom)) {
              // same start date: update the calendar on that row instead of inserting a new overlapping row
              if (String(overlap.calendar_id || '') !== String(calId)) {
                const { error: updErr } = await supabase
                  .from('employee_calendar_assignments')
                  .update({ calendar_id: calId, updated_at: new Date().toISOString() })
                  .eq('id', overlap.id);
                if (updErr) throw updErr;
              }
              handledByUpdate = true;
            } else {
              // overlaps but starts before effFrom: close it to the day before effFrom
              const newTo = dayBefore(effFrom);
              // only close if newTo >= overlapFrom (safety)
              if (new Date(newTo) >= new Date(overlapFrom)) {
                const { error: closeErr } = await supabase
                  .from('employee_calendar_assignments')
                  .update({ effective_to: newTo, updated_at: new Date().toISOString() })
                  .eq('id', overlap.id);
                if (closeErr) throw closeErr;
              }
            }
          }

          // 2) If there is a future assignment, bound this new one to avoid overlapping the future row.
          const { data: nextRows, error: nextErr } = await supabase
            .from('employee_calendar_assignments')
            .select('id,effective_from')
            .eq('user_id', empId)
            .gt('effective_from', effFrom)
            .order('effective_from', { ascending: true })
            .limit(1);
          if (nextErr) throw nextErr;
          const next = nextRows && nextRows.length ? nextRows[0] : null;
          const effectiveTo = next?.effective_from ? dayBefore(next.effective_from) : null;

          // 3) Insert new assignment if we didn't update an existing row at the same start date.
          if (!handledByUpdate) {
            const insertPayload = {
              user_id: empId,
              calendar_id: calId,
              effective_from: effFrom,
              created_by: form.created_by || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (effectiveTo) insertPayload.effective_to = effectiveTo;

            const { error: calErr } = await supabase.from('employee_calendar_assignments').insert([insertPayload]);
            if (calErr) {
              console.error('Failed to insert employee_calendar_assignments', calErr);
              throw calErr;
            }
          }
        } else if (editMode) {
          // if editing and user removed selection, clear any active assignment
          await supabase.from('employee_calendar_assignments').delete().eq('user_id', empId).is('effective_to', null);
        }
      } catch (calSyncErr) {
        console.error('Calendar assignment sync error', calSyncErr);
        if (!editMode) await supabase.from('employees').delete().eq('id', empId);
        throw calSyncErr;
      }

      setSnackbar({ open: true, message: editMode ? 'บันทึกการแก้ไขสำเร็จ' : 'บันทึกข้อมูลพนักงานเรียบร้อย', severity: 'success' });
      setOpenAdd(false);
      fetchData();
    } catch (err) {
      console.error('Save employee error', err);
      // parse DB / supabase errors to show friendlier messages (e.g. duplicate key)
      handleDbError(err);
    } finally {
      setSaving(false);
    }
  };

  // Country picker dialog state & helpers
  const [openCountryDialog, setOpenCountryDialog] = React.useState(false);
  const [countryList, setCountryList] = React.useState([]);
  const [countryLoading, setCountryLoading] = React.useState(false);
  const [countryError, setCountryError] = React.useState('');

  // Nationality-specific list/state (separate from generic countryList to avoid mixing)
  const [nationalityList, setNationalityList] = React.useState([]);
  const [nationalityLoading, setNationalityLoading] = React.useState(false);
  const [nationalityError, setNationalityError] = React.useState('');

  // Provinces & districts for marriage detail dropdowns
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
      // select all columns to avoid issues with column naming/case
      const { data, error } = await supabase.from('country').select('*').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      setCountryList(data || []);
      if (!(data && data.length)) {
        // no rows
        setCountryError('ไม่พบข้อมูลประเทศในฐานข้อมูล');
      }
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่อประเทศได้';
      setCountryError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setCountryLoading(false);
    }
  }, []);

  // ensure countries are loaded when opening the Add dialog so the country dropdown is populated
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

  // Load nationalities from the country table explicitly (separated from countryList)
  const loadNationalitiesFromDb = React.useCallback(async () => {
    setNationalityLoading(true);
    setNationalityError('');
    try {
      const { data, error } = await supabase.from('country').select('id,name,enName,alpha2').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      setNationalityList(data || []);
      if (!(data && data.length)) {
        setNationalityError('ไม่พบข้อมูลสัญชาติในฐานข้อมูล');
      }
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
      // provinces table in this project has name_th / name_en columns (see Supabase screenshot).
      // Select both and map to a consistent { id, name_th, name_en, label } shape for UI.
      const { data, error } = await supabase
        .from('provinces')
        .select('id,name_th,name_en')
        .order('name_th', { ascending: true })
        .limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((p) => ({
        id: p.id,
        name_th: p.name_th,
        name_en: p.name_en,
        label: p.name_th || p.name_en || ''
      }));
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
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    // try to resolve provinceId when stored value is a label/text (some rows store names)
    let resolvedProvinceId = provinceId;
    try {
      if (provinces && provinces.length) {
        const prov = provinces.find((p) => String(p.id) === String(provinceId)
          || String(p.label) === String(provinceId)
          || String(p.name_th) === String(provinceId)
          || String(p.name_en) === String(provinceId));
        if (prov) {
          resolvedProvinceId = prov.id;
          // If we resolved from a label -> update the form so the select shows the id value
          if (String(prov.id) !== String(provinceId)) {
            const provinceField = targetField === 'current_address_district' ? 'current_address_province' : (targetField === 'marriage_district_id' ? 'marriage_province_id' : null);
            if (provinceField) setForm((prev) => ({ ...prev, [provinceField]: prov.id }));
          }
        }
      }
    } catch  {
      // non-fatal; fall back to provided provinceId
      // province resolve error suppressed
      resolvedProvinceId = provinceId;
    }
    setDistrictsLoading(true);
    setDistrictsError('');
    try {
      // select * so we can inspect alternate id/code columns (district_id, code, etc.)
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .eq('province_id', resolvedProvinceId)
        .order('name_th', { ascending: true })
        .limit(2000);
      if (error) throw error;
      const mapped = (data || []).map((d) => ({
        id: d.id,
        province_id: d.province_id,
        name_th: d.name_th,
        name_en: d.name_en,
        label: d.name_th || d.name_en || '',
        // common alternate id/code fields to help tolerant matching
        alt_ids: [d.district_id, d.district_code, d.code, d.amphoe_code, d.code_id].filter(Boolean),
      }));
      setDistricts(mapped);
      if (!mapped.length) setDistrictsError('ไม่พบข้อมูลอำเภอ/เขตสำหรับจังหวัดนี้');

      // if a selectedDistrictId was provided (e.g. when opening edit), try to normalize it to the district's id
      if (selectedDistrictId) {
        const sel = String(selectedDistrictId);
        // try to find by id first
        let found = mapped.find((m) => String(m.id) === sel);
        if (!found) {
          // try alt_ids
          found = mapped.find((m) => m.alt_ids.some((a) => String(a) === sel));
        }
        if (found && targetField) {
          // update the correct form field (marriage vs current)
          setForm((prev) => ({ ...prev, [targetField]: found.id }));
        }
      }
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่ออำเภอ/เขตได้';
      setDistrictsError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setDistrictsLoading(false);
    }
  }, [provinces]);

  // load provinces when Add dialog is opened so address dropdowns are available
  React.useEffect(() => {
    if (openAdd && provinces.length === 0 && !provincesLoading && !provincesError) {
      loadProvincesFromDb();
    }
  }, [openAdd, provinces.length, provincesLoading, provincesError, loadProvincesFromDb]);

  // load subdistricts when district changes (for current address)
  const loadSubdistrictsFromDb = React.useCallback(async (districtId, selectedSubdistrictId) => {
    if (!districtId) {
      setSubdistricts([]);
      return;
    }
    setSubdistrictsLoading(true);
    setSubdistrictsError('');
    try {
      // table name is `sub_districts` in DB (see Supabase schema); select name_th/name_en and district_id
      // select * so we can pick up any postal code column if present (postal_code / zipcode / postcode)
      const { data, error } = await supabase
        .from('sub_districts')
        .select('*')
        .eq('district_id', districtId)
        .order('name_th', { ascending: true })
        .limit(2000);
      if (error) throw error;
      const mapped = (data || []).map((s) => {
        // attempt to detect postal code in various common column names
        const postal = s.postal_code || s.zip_code || s.zipcode || s.postcode || s.postal || s.zip || null;
        return ({
          id: s.id,
          district_id: s.district_id,
          name_th: s.name_th,
          name_en: s.name_en,
          label: s.name_th || s.name_en || '',
          postal_code: postal,
        });
      });
      setSubdistricts(mapped);
      if (!mapped.length) setSubdistrictsError('ไม่พบข้อมูลตำบล/แขวงสำหรับอำเภอนี้');

      // if a subdistrict id is already selected (e.g. when opening edit), try to set its postal code
      const selId = selectedSubdistrictId || null;
      if (selId) {
        const found = mapped.find((m) => String(m.id) === String(selId));
        if (found && found.postal_code) {
          setForm((prev) => ({ ...prev, current_address_postal_code: found.postal_code }));
        }
      }
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายชื่อตำบล/แขวงได้';
      setSubdistrictsError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubdistrictsLoading(false);
    }
  }, []);

  // load districts when province changes
  React.useEffect(() => {
    if (form.marriage_province_id) {
      // pass the currently-stored marriage_district_id so loader can normalize
      loadDistrictsFromDb(form.marriage_province_id, form.marriage_district_id, 'marriage_district_id');
    } else {
      setDistricts([]);
    }
  }, [form.marriage_province_id, form.marriage_district_id, loadDistrictsFromDb]);

  // load districts/subdistricts when current address province/district change
  React.useEffect(() => {
    if (form.current_address_province) {
      // pass the currently-stored district so loader can map code->id when editing
      loadDistrictsFromDb(form.current_address_province, form.current_address_district, 'current_address_district');
    } else {
      setDistricts([]);
    }
  }, [form.current_address_province, form.current_address_district, loadDistrictsFromDb]);

  React.useEffect(() => {
    if (form.current_address_district) {
      loadSubdistrictsFromDb(form.current_address_district, form.current_address_subdistrict);
    } else {
      setSubdistricts([]);
    }
  }, [form.current_address_district, form.current_address_subdistrict, loadSubdistrictsFromDb]);

  // disable/clear marriage-related fields when not married
  const isMarried = form.marital_status === 'สมรส';
  React.useEffect(() => {
    if (!isMarried) {
      // clear marriage-specific fields to avoid retaining stale data
      setForm((prev) => ({
        ...prev,
        marriage_province_id: '',
        marriage_province_label: '',
        marriage_district_id: '',
        marriage_district_label: '',
        marriage_registration_date: '',
        spouse_age_65_plus: false
      }));
      setDistricts([]);
    } else {
      // if user just selected 'สมรส' and provinces not loaded, try loading
      if (provinces.length === 0 && !provincesLoading && !provincesError) {
        loadProvincesFromDb();
      }
    }
  }, [isMarried, loadProvincesFromDb, provinces.length, provincesLoading, provincesError]);

  // clear military note when status is not deferred or exempt
  React.useEffect(() => {
    if (form.military_note && form.military_status !== 'ผ่อนผัน' && form.military_status !== 'ได้รับการยกเว้น') {
      setForm((prev) => ({ ...prev, military_note: '' }));
    }
  }, [form.military_status, form.military_note]);

  // Compute service age (years, months, days) from confirmation_date (วันที่บรรจุ)
  React.useEffect(() => {
    const conf = form.confirmation_date ? dayjs(form.confirmation_date) : null;
    if (!conf || !conf.isValid()) {
      // clear if no confirmation date
      setForm((prev) => ({
        ...prev,
        service_age_years: '',
        service_age_months: '',
        service_age_days: '',
      }));
      return;
    }

    const now = dayjs();
    let years = now.diff(conf, 'year');
    const afterYears = conf.add(years, 'year');
    let months = now.diff(afterYears, 'month');
    const afterMonths = afterYears.add(months, 'month');
    let days = now.diff(afterMonths, 'day');

    // only update if values changed to avoid re-renders
    setForm((prev) => {
      const ys = String(years);
      const ms = String(months);
      const ds = String(days);
      if (prev.service_age_years === ys && prev.service_age_months === ms && prev.service_age_days === ds) {
        return prev;
      }
      return {
        ...prev,
        service_age_years: ys,
        service_age_months: ms,
        service_age_days: ds,
      };
    });
  }, [form.confirmation_date]);

  // Nationality & Race picker state (nationality reuses the country list)
  const [openNationalityDialog, setOpenNationalityDialog] = React.useState(false);
  const [openRaceDialog, setOpenRaceDialog] = React.useState(false);

  const handleOpenNationalityDialog = async () => {
    // Open nationality dialog and load nationalities from the country table
    setOpenNationalityDialog(true);
    // load fresh nationality list (explicit loader)
    await loadNationalitiesFromDb();
  };

  const handleCloseNationalityDialog = () => setOpenNationalityDialog(false);

  const handleSelectNationality = (c) => {
    const label = c?.name || c?.enName || '';
    setForm((prev) => ({ ...prev, nationality: label, nationality_id: c?.id || '' }));
    setOpenNationalityDialog(false);
  };

  // NOTE: race-specific DB loader removed — race picker now re-uses the nationality/country loader

  const handleOpenRaceDialog = async () => {
    // Use the same nationality/country loader so race list shows country entries
    setOpenRaceDialog(true);
    await loadNationalitiesFromDb();
  };

  const handleCloseRaceDialog = () => setOpenRaceDialog(false);

  const handleSelectRace = (r) => {
    // When the race picker is re-used from country list, store display and id
    const label = r?.name || r?.enName || '';
    setForm((prev) => ({ ...prev, race: label, race_id: r?.id || '' }));
    setOpenRaceDialog(false);
  };

  // Position picker (ตำแหน่ง) dialog state & loader
  const [openPositionDialog, setOpenPositionDialog] = React.useState(false);
  const [positionList, setPositionList] = React.useState([]);
  const [positionLoading, setPositionLoading] = React.useState(false);
  const [positionError, setPositionError] = React.useState('');

  const loadPositionsFromDb = React.useCallback(async () => {
    setPositionLoading(true);
    setPositionError('');
    try {
      // positions table in this project uses columns: position_code, position_name, position_name_eng
      const { data, error } = await supabase.from('positions').select('id,position_code,position_name,position_name_eng').order('position_name', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((p) => ({ id: p.id, position_code: p.position_code, position_name: p.position_name, position_name_eng: p.position_name_eng, label: p.position_name || p.position_name_eng || p.position_code || '' }));
      setPositionList(mapped);
      if (!mapped.length) setPositionError('ไม่พบข้อมูลตำแหน่งในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายการตำแหน่งได้';
      setPositionError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setPositionLoading(false);
    }
  }, []);

  const handleOpenPositionDialog = async () => {
    setOpenPositionDialog(true);
    if (positionList.length === 0) await loadPositionsFromDb();
  };

  const handleClosePositionDialog = () => setOpenPositionDialog(false);

  const handleSelectPosition = (p) => {
    const label = p?.label || p?.position_name || p?.position_name_eng || p?.position_code || '';
    setForm((prev) => ({ ...prev, position: label, position_id: p?.id || '' }));
    setOpenPositionDialog(false);
  };

  // Unit (หน่วยงาน) picker dialog state & loader
  const [openUnitDialog, setOpenUnitDialog] = React.useState(false);
  const [unitList, setUnitList] = React.useState([]);
  const [unitLoading, setUnitLoading] = React.useState(false);
  const [unitError, setUnitError] = React.useState('');

  const loadUnitsFromDb = React.useCallback(async () => {
    setUnitLoading(true);
    setUnitError('');
    try {
      // use view v_department_form to get dept id and name
      const { data, error } = await supabase.from('v_department_form').select('id,dept_id,dept_name').order('dept_id', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((u) => ({ id: u.id, dept_id: u.dept_id, dept_name: u.dept_name, label: u.dept_name || u.dept_id || '' }));
      setUnitList(mapped);
      if (!mapped.length) setUnitError('ไม่พบข้อมูลหน่วยงานในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายการหน่วยงานได้';
      setUnitError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setUnitLoading(false);
    }
  }, []);

  // Ensure unit/department list is available so we can display department names in the employees table
  React.useEffect(() => {
    if (unitList.length === 0 && !unitLoading) {
      loadUnitsFromDb();
    }
  }, [unitList.length, unitLoading, loadUnitsFromDb]);

  const handleOpenUnitDialog = async () => {
    setOpenUnitDialog(true);
    if (unitList.length === 0) await loadUnitsFromDb();
  };

  const handleCloseUnitDialog = () => setOpenUnitDialog(false);

  const handleSelectUnit = (u) => {
    const label = u?.label || u?.dept_name || u?.dept_id || '';
    setForm((prev) => ({ ...prev, unit: label, unit_id: u?.id || '' }));
    setOpenUnitDialog(false);
  };

  // Shift (กะ) picker state & loader
  const [openShiftDialog, setOpenShiftDialog] = React.useState(false);
  const [shiftList, setShiftList] = React.useState([]);
  const [shiftLoading, setShiftLoading] = React.useState(false);
  const [shiftError, setShiftError] = React.useState('');

  const loadShiftsFromDb = React.useCallback(async () => {
    setShiftLoading(true);
    setShiftError('');
    try {
      const { data, error } = await supabase
        .from('shift_schedule')
        .select('id, shift_code, shift_name, shift_type, start_time, end_time')
        .order('shift_code', { ascending: true });
      if (error) throw error;
      setShiftList(data || []);
    } catch (err) {
      setShiftError(err.message || 'ไม่สามารถโหลดข้อมูลกะได้');
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const handleOpenShiftDialog = async () => {
    setOpenShiftDialog(true);
    if (shiftList.length === 0) await loadShiftsFromDb();
  };

  const handleCloseShiftDialog = () => setOpenShiftDialog(false);

  const handleSelectShift = (s) => {
    const label = s?.shift_name ? `${s.shift_code ? s.shift_code + ' ' : ''}${s.shift_name}` : (s?.shift_name || '');
    setForm((prev) => ({ ...prev, working_hours: label, shift_schedule_id: s?.id || null }));
    setOpenShiftDialog(false);
  };

  // Company calendar picker state & loader
  const [openCompanyCalendarDialog, setOpenCompanyCalendarDialog] = React.useState(false);
  const [companyCalendarList, setCompanyCalendarList] = React.useState([]);
  const [companyCalendarLoading, setCompanyCalendarLoading] = React.useState(false);
  const [companyCalendarError, setCompanyCalendarError] = React.useState('');

  const loadCompanyCalendarsFromDb = React.useCallback(async () => {
    setCompanyCalendarLoading(true);
    setCompanyCalendarError('');
    try {
      const { data, error } = await supabase
        .from('company_calendars')
        .select('id, code, name, name_en')
        .order('code', { ascending: true });
      if (error) throw error;
      setCompanyCalendarList(data || []);
    } catch (err) {
      setCompanyCalendarError(err?.message || 'ไม่สามารถโหลดปฏิทินการทำงานได้');
    } finally {
      setCompanyCalendarLoading(false);
    }
  }, []);

  const handleOpenCompanyCalendarDialog = async () => {
    setOpenCompanyCalendarDialog(true);
    if (companyCalendarList.length === 0) await loadCompanyCalendarsFromDb();
  };

  const handleCloseCompanyCalendarDialog = () => setOpenCompanyCalendarDialog(false);

  const handleSelectCompanyCalendar = (c) => {
    const label = c?.name || c?.code || '';
    setForm((prev) => ({ ...prev, company_calendar_id: c?.id || null, company_calendar_name: label }));
    setOpenCompanyCalendarDialog(false);
  };

  // Bank codes picker & payment schedule templates (for การจ่ายเงิน tab)
  const [bankCodes, setBankCodes] = React.useState([]);
  const [bankLoading, setBankLoading] = React.useState(false);
  const [bankError, setBankError] = React.useState('');
  const [openBankPicker, setOpenBankPicker] = React.useState(false);

  const [bankAccounts, setBankAccounts] = React.useState([]);
  const totalBankPercent = React.useMemo(() => {
    return bankAccounts.reduce((s, b) => s + (Number(b.percent) || 0), 0);
  }, [bankAccounts]);

  const loadBankCodesFromDb = React.useCallback(async () => {
    setBankLoading(true);
    setBankError('');
    try {
      const { data, error } = await supabase.from('bank_code').select('id,bank_id,bank_name_th,bank_name_en,bank_short_name').order('bank_name_th', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((b) => ({ id: b.id, bank_id: b.bank_id, bank_name_th: b.bank_name_th, bank_name_en: b.bank_name_en, bank_short_name: b.bank_short_name, label: b.bank_name_th || b.bank_short_name || b.bank_id || '' }));
      setBankCodes(mapped);
      if (!mapped.length) setBankError('ไม่พบข้อมูลรหัสธนาคาร');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรหัสธนาคารได้';
      setBankError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setBankLoading(false);
    }
  }, []);

  const handleOpenBankPicker = async () => {
    setOpenBankPicker(true);
    if (bankCodes.length === 0) await loadBankCodesFromDb();
  };

  const handleCloseBankPicker = () => setOpenBankPicker(false);

  const handleSelectBankCode = (b) => {
    // add a new bank account row with bank name prefilled
    const name = b?.bank_name_th || b?.bank_short_name || b?.bank_id || '';
    setBankAccounts((prev) => [...prev, { id: Date.now().toString(), bank_name: name, branch: '', account_name: '', account_number: '', percent: '' }]);
    setOpenBankPicker(false);
  };

  const handleBankChange = (index, field) => (e) => {
    const val = e?.target?.value;
    setBankAccounts((prev) => {
      const copy = prev.slice();
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveBank = (index) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  // payment schedule templates
  const [templateList, setTemplateList] = React.useState([]);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState('');
  const [openTemplateDialog, setOpenTemplateDialog] = React.useState(false);
  const [paymentScheduleSelection, setPaymentScheduleSelection] = React.useState('');

  const loadTemplatesFromDb = React.useCallback(async () => {
    setTemplateLoading(true);
    setTemplateError('');
    try {
      const { data, error } = await supabase.from('payroll_payment_schedule_templates').select('id,name,description,year').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      setTemplateList(data || []);
      if (!(data && data.length)) setTemplateError('ไม่พบรูปแบบงวดการจ่าย');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรูปแบบงวดการจ่ายได้';
      setTemplateError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const handleOpenTemplateDialog = async () => {
    setOpenTemplateDialog(true);
    if (templateList.length === 0) await loadTemplatesFromDb();
  };

  const handleCloseTemplateDialog = () => setOpenTemplateDialog(false);

  const handleSelectTemplate = (t) => {
    const name = t?.name || '';
    setPaymentScheduleSelection(name);
    setForm((prev) => ({ ...prev, payment_schedule_template_id: t?.id || '', payment_schedule_template: name }));
    setOpenTemplateDialog(false);
  };



  // Employee Level (ระดับ) picker state & loader
  const [openEmployeeLevelDialog, setOpenEmployeeLevelDialog] = React.useState(false);
  const [employeeLevelList, setEmployeeLevelList] = React.useState([]);
  const [employeeLevelLoading, setEmployeeLevelLoading] = React.useState(false);
  const [employeeLevelError, setEmployeeLevelError] = React.useState('');

  const loadEmployeeLevelsFromDb = React.useCallback(async () => {
    setEmployeeLevelLoading(true);
    setEmployeeLevelError('');
    try {
      // table `employee_level` columns per screenshot: level_id, level_name_th, level_name_en
      const { data, error } = await supabase
        .from('employee_level')
        .select('id,level_id,level_name_th,level_name_en')
        .order('level_id', { ascending: true })
        .limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((l) => ({ id: l.id, level_code: l.level_id, level_name_th: l.level_name_th, level_name_en: l.level_name_en, label: l.level_name_th || l.level_name_en || l.level_id || '' }));
      setEmployeeLevelList(mapped);
      if (!mapped.length) setEmployeeLevelError('ไม่พบข้อมูลระดับพนักงานในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายการระดับพนักงานได้';
      setEmployeeLevelError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setEmployeeLevelLoading(false);
    }
  }, []);

  const handleOpenEmployeeLevelDialog = async () => {
    setOpenEmployeeLevelDialog(true);
    if (employeeLevelList.length === 0) await loadEmployeeLevelsFromDb();
  };

  const handleCloseEmployeeLevelDialog = () => setOpenEmployeeLevelDialog(false);

  const handleSelectEmployeeLevel = (l) => {
    const label = l?.label || l?.level_name_th || '';
    setForm((prev) => ({ ...prev, level: label, level_id: l?.id || '' }));
    setOpenEmployeeLevelDialog(false);
  };

  // Employee Group (กลุ่มพนักงาน) picker state & loader
  const [openEmployeeGroupDialog, setOpenEmployeeGroupDialog] = React.useState(false);
  const [employeeGroupList, setEmployeeGroupList] = React.useState([]);
  const [employeeGroupLoading, setEmployeeGroupLoading] = React.useState(false);
  const [employeeGroupError, setEmployeeGroupError] = React.useState('');

  const loadEmployeeGroupsFromDb = React.useCallback(async () => {
    setEmployeeGroupLoading(true);
    setEmployeeGroupError('');
    try {
      // actual table is `employee_group` with columns: emp_group_id, emp_group_name_th, emp_group_name_en
      const { data, error } = await supabase
        .from('employee_group')
        .select('id,emp_group_id,emp_group_name_th,emp_group_name_en')
        .order('emp_group_id', { ascending: true })
        .limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((g) => ({
        id: g.id,
        group_code: g.emp_group_id,
        group_name: g.emp_group_name_th,
        group_name_en: g.emp_group_name_en,
        label: g.emp_group_name_th || g.emp_group_name_en || g.emp_group_id || ''
      }));
      setEmployeeGroupList(mapped);
      if (!mapped.length) setEmployeeGroupError('ไม่พบข้อมูลกลุ่มพนักงานในฐานข้อมูล');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดรายการกลุ่มพนักงานได้';
      setEmployeeGroupError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setEmployeeGroupLoading(false);
    }
  }, []);

  const handleOpenEmployeeGroupDialog = async () => {
    setOpenEmployeeGroupDialog(true);
    if (employeeGroupList.length === 0) await loadEmployeeGroupsFromDb();
  };

  const handleCloseEmployeeGroupDialog = () => setOpenEmployeeGroupDialog(false);

  const handleSelectEmployeeGroup = (g) => {
    const label = g?.label || g?.group_name || '';
    setForm((prev) => ({ ...prev, employee_group: label, employee_group_id: g?.id || '' }));
    setOpenEmployeeGroupDialog(false);
  };

  // User groups & approval rights (ใหม่: แท็บ กลุ่มผู้ใช้ / สิทธิ์อนุมัติ)
  const [userGroupList, setUserGroupList] = React.useState([]);
  const [userGroupLoading, setUserGroupLoading] = React.useState(false);
  const [userGroupError, setUserGroupError] = React.useState('');
  const [openUserGroupDialog, setOpenUserGroupDialog] = React.useState(false);

  const [assignedUserGroups, setAssignedUserGroups] = React.useState([]); // { id, code, name }

  const loadUserGroupsFromDb = React.useCallback(async () => {
    setUserGroupLoading(true);
    setUserGroupError('');
    try {
      // table columns: group_id (code), group_name_th
      const { data, error } = await supabase.from('user_group').select('id,group_id,group_name_th').order('group_id', { ascending: true }).limit(1000);
      if (error) throw error;
      const mapped = (data || []).map((g) => ({ id: g.id, code: g.group_id, name: g.group_name_th, label: g.group_name_th || g.group_id || '' }));
      setUserGroupList(mapped);
      if (!mapped.length) setUserGroupError('ไม่พบกลุ่มผู้ใช้');
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดกลุ่มผู้ใช้ได้';
      setUserGroupError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setUserGroupLoading(false);
    }
  }, []);

  const handleOpenUserGroupDialog = async () => {
    setOpenUserGroupDialog(true);
    if (userGroupList.length === 0) await loadUserGroupsFromDb();
  };

  const handleCloseUserGroupDialog = () => setOpenUserGroupDialog(false);

  const handleSelectUserGroup = (g) => {
    // add to assigned list if not duplicate
    setAssignedUserGroups((prev) => {
      if (prev.some((x) => x.id === g.id)) return prev;
      return [
        ...prev,
        {
          id: g.id,
          code: g.code,
          name: g.name,
          // fields for assigned employee (empty until chosen)
          assigned_employee_id: '',
          assigned_employee_name: '',
        },
      ];
    });
    setOpenUserGroupDialog(false);
  };

  // Employee picker dialog & loader (to assign an employee to a user-group row)
  const [employeeList, setEmployeeList] = React.useState([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);
  const [employeeError, setEmployeeError] = React.useState('');
  const [openEmployeePicker, setOpenEmployeePicker] = React.useState(false);
  const [employeePickerTargetIndex, setEmployeePickerTargetIndex] = React.useState(null);
  const [employeePickerMode, setEmployeePickerMode] = React.useState(null); // 'group' | 'supervisor' | null

  const loadEmployeesFromDb = React.useCallback(async () => {
    try {
      setEmployeeLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th')
        .order('first_name_th', { ascending: true })
        .limit(1000);
      if (error) {
        setEmployeeError(error.message);
        setEmployeeList([]);
      } else {
        setEmployeeList(data || []);
        setEmployeeError('');
      }
    } catch (err) {
      setEmployeeError(err?.message || 'ไม่สามารถโหลดพนักงานได้');
      setEmployeeList([]);
    } finally {
      setEmployeeLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (openAdd && employeeList.length === 0 && !employeeLoading) {
      loadEmployeesFromDb();
    }
  }, [openAdd, employeeList.length, employeeLoading, loadEmployeesFromDb]);

  const handleCloseEmployeePicker = () => {
    setOpenEmployeePicker(false);
    setEmployeePickerTargetIndex(null);
    setEmployeePickerMode(null);
  };

  const handleOpenEmployeePicker = async (mode = 'group') => {
    try {
      if (employeeList.length === 0 && !employeeLoading) await loadEmployeesFromDb();
    } catch {
      // ignore load error here; dialog will show error
    }
    setEmployeePickerMode(mode);
    setOpenEmployeePicker(true);
  };

  const handleSelectSupervisor = (emp) => {
    const name = `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
    setForm((prev) => ({ ...prev, supervisor_name: name, supervisor_id: emp.id }));
    handleCloseEmployeePicker();
  };

  const handleSelectEmployeeForGroup = (emp) => {
    setAssignedUserGroups((prev) =>
      prev.map((g, idx) =>
        idx === employeePickerTargetIndex
          ? {
            ...g,
            assigned_employee_id: emp.id,
            assigned_employee_name: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
          }
          : g
      )
    );
    handleCloseEmployeePicker();
  };

  const handleSelectApprover = (emp) => {
    setApprovers((prev) => {
      const copy = prev.slice();
      const idx = employeePickerTargetIndex;
      if (idx != null && copy[idx]) {
        copy[idx] = {
          ...copy[idx],
          approver_code: emp.employee_code || emp.id || '',
          approver_name: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
        };
      }
      return copy;
    });
    handleCloseEmployeePicker();
  };

  const handleRemoveAssignedUserGroup = (index) => {
    setAssignedUserGroups((prev) => prev.filter((_, i) => i !== index));
  };

  // Approvers table state (seed default rows per requirements)
  const [approvers, setApprovers] = React.useState(() => ([
    { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
    { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
  ]));
  const handleApproverChange = (index, field) => (e) => {
    const val = e?.target?.value;
    setApprovers((prev) => {
      const copy = prev.slice();
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };
  // addApproverRow removed — creation of approver rows is disabled in UI
  const removeApproverRow = (i) => setApprovers((prev) => prev.filter((_, idx) => idx !== i));

  const handleApproverActions = (index) => {
    // Open employee picker to select an approver for the given approver row
    setEmployeePickerTargetIndex(index);
    handleOpenEmployeePicker('approver');
  };

  // When clicking เพิ่ม, open the dialog (also dispatch a global event if needed by shell)
  const handleOpenAdd = () => {
    // open the dialog in-place. Do NOT dispatch the global event here because
    // it triggers the dashboard to navigate away (unmounting this page) which
    // prevents the dialog from being visible.
    setActiveTab(0);
    setEditMode(false);
    setOriginalId(null);
    // clear image preview/file and reset form for a fresh add
    setImagePreview(null);
    setImageFile(null);
    setForm(initialForm);
    // clear related UI state
    setAssignedUserGroups([]);
    setBankAccounts([]);
    setPaymentScheduleSelection('');
    // reset approvers to default seed rows
    setApprovers([
      { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
      { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
    ]);
    setOpenAdd(true);
  };

  const handleCloseAdd = () => setOpenAdd(false);

  // open edit dialog and populate form
  const handleOpenEdit = (row) => {
    if (!row) return;
    setEditMode(true);
    setOriginalId(row.id);
    // Reset form to initial shape then overlay row values so unspecified fields are cleared
    // merge row onto initialForm but ensure a sensible default for employment_status
    setForm(() => ({
      ...initialForm,
      ...row,
      // normalize supervisor fields: prefer row.supervisor (DB) then row.supervisor_name
      supervisor_name: row.supervisor || row.supervisor_name || '',
      supervisor_id: row.supervisor_id || '',
      // normalize/display department/unit: prefer explicit department_name, then resolve from department_id via unitList, then fallback to row.unit
      unit: row.department_name || (row.department_id && unitList.find((u) => String(u.id) === String(row.department_id))?.dept_name) || row.unit || '',
      employment_status: row.employment_status || 'ทำงาน'
    }));
    // clear any selected file (we'll show stored image via preview)
    setImageFile(null);
    // set image preview to the stored image_url or clear if none
    setImagePreview(row.image_url || null);
    // set payment schedule selection display from row if present
    setPaymentScheduleSelection(row.payment_schedule_template || row.payment_schedule_template_name || '');
    setActiveTab(0);
    setOpenAdd(true);
    // ensure districts/subdistricts are loaded for the edited row so selects show correctly
    try {
      if (row.marriage_province_id) {
        loadDistrictsFromDb(row.marriage_province_id, row.marriage_district_id, 'marriage_district_id');
      }
      if (row.current_address_province) {
        loadDistrictsFromDb(row.current_address_province, row.current_address_district, 'current_address_district');
        if (row.current_address_district) {
          loadSubdistrictsFromDb(row.current_address_district, row.current_address_subdistrict);
        }
      }
      // ensure provinces are loaded so selects have options
      if (provinces.length === 0 && !provincesLoading && !provincesError) {
        loadProvincesFromDb();
      }
    } catch  {
      // open edit load districts error suppressed
    }
    // load bank accounts for this employee so the UI shows existing rows
    (async () => {
      try {
        const { data: bankData, error: bankErr } = await supabase
          .from('employee_bank_accounts')
          .select('*')
          .eq('employee_id', row.id)
          .order('sort_order', { ascending: true });
        if (bankErr) throw bankErr;
        if (bankData && bankData.length) {
          // map numeric percent to string to match UI state shape
          setBankAccounts(bankData.map((b) => ({
            id: b.id,
            bank_name: b.bank_name || '',
            branch: b.branch || '',
            account_name: b.account_name || '',
            account_number: b.account_number || '',
            percent: b.percent != null ? String(b.percent) : '',
          })));
        } else {
          setBankAccounts([]);
        }
      } catch  {
        // load employee bank accounts error suppressed
      }
    })();
    // load approvers for this employee so the UI shows stored approvers
    (async () => {
      try {
        const { data: aprData, error: aprErr } = await supabase
          .from('employee_approvers')
          .select('*')
          .eq('employee_id', row.id)
          .order('sort_order', { ascending: true });
        if (aprErr) throw aprErr;
        // default seed rows (same as initial state) to preserve screen_name when DB has fewer rows
        const seed = [
          { screen_name: 'บันทึกขออนุมัติ', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกขออนุมัติทำงานล่วงเวลา', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกปรับตำแหน่งและเงินเดือน', approver_code: '', approver_name: '' },
          { screen_name: 'บันทึกพ้นสภาพความเป็นพนักงาน', approver_code: '', approver_name: '' },
        ];
        if (aprData && aprData.length) {
          const merged = seed.map((s, idx) => {
            const dbRow = aprData[idx];
            if (dbRow) {
              return {
                screen_name: dbRow.screen_name || s.screen_name,
                approver_code: dbRow.approver_code || '',
                approver_name: dbRow.approver_name || '',
              };
            }
            return s;
          });
          setApprovers(merged);
        } else {
          // keep default seed
        }
      } catch  {
        // load employee approvers error suppressed
      }
    })();
    // load assigned user groups for this employee so UI shows existing assignments
    (async () => {
      try {
        const { data: ugData, error: ugErr } = await supabase
          .from('employee_user_groups')
          .select('*')
          .eq('employee_id', row.id)
          .order('created_at', { ascending: true });
        if (ugErr) throw ugErr;
        if (ugData && ugData.length) {
          setAssignedUserGroups(ugData.map((u) => ({
            id: u.user_group_id || u.id,
            code: u.user_group_code || '',
            name: u.user_group_name || '',
            assigned_employee_id: u.assigned_employee_id || '',
            assigned_employee_name: u.assigned_employee_name || '',
          })));
        } else {
          setAssignedUserGroups([]);
        }
      } catch {
        // load employee user groups error suppressed
      }
    })();

    // load active company calendar assignment for this employee (if any)
    (async () => {
      try {
        const { data: calAssign, error: calAssignErr } = await supabase
          .from('employee_calendar_assignments')
          .select('*')
          .eq('user_id', row.id)
          .is('effective_to', null)
          .order('effective_from', { ascending: false })
          .limit(1);
        if (calAssignErr) throw calAssignErr;
        if (calAssign && calAssign.length) {
          const active = calAssign[0];
          if (active && active.calendar_id) {
            const { data: cc, error: ccErr } = await supabase
              .from('company_calendars')
              .select('id,code,name')
              .eq('id', active.calendar_id)
              .maybeSingle();
            if (!ccErr && cc) {
              setForm((prev) => ({ ...prev, company_calendar_id: cc.id || '', company_calendar_name: cc.name || cc.code || '' }));
            } else {
              // fallback to id only
              setForm((prev) => ({ ...prev, company_calendar_id: active.calendar_id || '', company_calendar_name: '' }));
            }
          }
        }
      } catch {
        // ignore calendar loading errors during edit open
      }
    })();
  };

  // delete flow
  const handleAskDelete = (row) => {
    setTargetRow(row);
    setOpenDelete(true);
  };
  const handleCloseDelete = () => {
    setTargetRow(null);
    setOpenDelete(false);
  };
  const handleConfirmDelete = async () => {
    if (!targetRow || deleting) return;
    setDeleting(true);
    try {
      // delete related rows first
      await supabase.from('employee_user_groups').delete().eq('employee_id', targetRow.id);
      await supabase.from('employee_approvers').delete().eq('employee_id', targetRow.id);
      const { error } = await supabase.from('employees').delete().eq('id', targetRow.id);
      if (error) throw error;
      setSnackbar({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' });
      handleCloseDelete();
      fetchData();
    } catch (err) {
      console.error('Delete employee error', err);
      setSnackbar({ open: true, message: err.message || 'ไม่สามารถลบข้อมูลได้', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Education & Work Experience helpers (kept but not exposed as UI buttons)
  const _addEducationRow = () => {
    setForm((prev) => ({
      ...prev,
      education: [...(prev.education || []), { level: '', institution: '', province: '', degree: '', major: '', year_graduated: '', gpa: '', activities: '', note: '' }]
    }));
  };
  // kept for programmatic edits; not used when tabs show only tables
  const _updateEducationField = (idx, field) => (e) => {
    const val = e && e.target ? e.target.value : e;
    setForm((prev) => {
      const arr = (prev.education || []).slice();
      arr[idx] = { ...(arr[idx] || {}), [field]: val };
      return { ...prev, education: arr };
    });
  };
  const _removeEducationRow = (idx) => {
    setForm((prev) => {
      const arr = (prev.education || []).slice();
      arr.splice(idx, 1);
      return { ...prev, education: arr };
    });
  };

  const _addWorkRow = () => {
    setForm((prev) => ({
      ...prev,
      work_experiences: [...(prev.work_experiences || []), { employer: '', business_type: '', position: '', responsibilities: '', start_date: '', end_date: '', start_salary: '', last_salary: '', reason_for_leaving: '', details: '' }]
    }));
  };
  const _updateWorkField = (idx, field) => (e) => {
    const val = e && e.target ? e.target.value : e;
    setForm((prev) => {
      const arr = (prev.work_experiences || []).slice();
      arr[idx] = { ...(arr[idx] || {}), [field]: val };
      return { ...prev, work_experiences: arr };
    });
  };
  const _removeWorkRow = (idx) => {
    setForm((prev) => {
      const arr = (prev.work_experiences || []).slice();
      arr.splice(idx, 1);
      return { ...prev, work_experiences: arr };
    });
  };

  // Dialog state for separate full-list views
  const [openEducationDialog, setOpenEducationDialog] = React.useState(false);
  const [openWorkDialog, setOpenWorkDialog] = React.useState(false);

  // Quick Add dialogs for Education and Work Experience (small forms)
  const [addEducationOpen, setAddEducationOpen] = React.useState(false);
  const [addEducationForm, setAddEducationForm] = React.useState({ level: '', institution: '', province: '', degree: '', major: '', year_graduated: '', gpa: '', activities: '', note: '' });

  const [addWorkOpen, setAddWorkOpen] = React.useState(false);
  const [addWorkForm, setAddWorkForm] = React.useState({ employer: '', business_type: '', position: '', responsibilities: '', start_date: '', end_date: '', start_salary: '', last_salary: '', reason_for_leaving: '', details: '' });

  const handleOpenAddEducation = () => {
    setAddEducationForm({ level: '', institution: '', province: '', degree: '', major: '', year_graduated: '', gpa: '', activities: '', note: '' });
    setAddEducationOpen(true);
  };
  const handleCloseAddEducation = () => setAddEducationOpen(false);
  const handleSaveAddEducation = () => {
    setForm((prev) => ({ ...prev, education: [...(prev.education || []), addEducationForm] }));
    setAddEducationOpen(false);
  };

  const handleOpenAddWork = () => {
    setAddWorkForm({ employer: '', business_type: '', position: '', responsibilities: '', start_date: '', end_date: '', start_salary: '', last_salary: '', reason_for_leaving: '', details: '' });
    setAddWorkOpen(true);
  };
  const handleCloseAddWork = () => setAddWorkOpen(false);
  const handleSaveAddWork = () => {
    setForm((prev) => ({ ...prev, work_experiences: [...(prev.work_experiences || []), addWorkForm] }));
    setAddWorkOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">ข้อมูลพนักงาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="จัดการ" size="small" />
          <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
        </Stack>
      </Stack>

      {/* Search (copied style from Positions page) */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="employee-search-field-label">ค้นหาโดย</InputLabel>
          <Select
            labelId="employee-search-field-label"
            value={searchField}
            label="ค้นหาโดย"
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="employee_code">รหัสพนักงาน</MenuItem>
            <MenuItem value="first_name_th">ชื่อ (ไทย)</MenuItem>
            <MenuItem value="last_name_th">นามสกุล (ไทย)</MenuItem>
            <MenuItem value="position_name">ตำแหน่ง</MenuItem>
            <MenuItem value="department_name">หน่วยงาน</MenuItem>
            <MenuItem value="national_id">เลขบัตรประชาชน</MenuItem>
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

        <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, md: 0 } }}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => { setAppliedSearch({ field: searchField, text: searchInput }); setPage(0); }}>
            ค้นหา
          </Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'employee_code', text: '' }); setSearchField('employee_code'); setPage(0); }}>
            ล้าง
          </Button>
        </Stack>
      </Stack>

      {/* Table (format copied from positions.jsx) */}
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{
          '& th, & td': { borderRight: '1px solid', borderColor: 'divider' },
          '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>รหัสพนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ชื่อพนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>เลขประจำตัวประชาชน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ประเภทพนักงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>วันที่เริ่มงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>ตำแหน่ง</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>หน่วยงาน</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>สถานะการทำงาน</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', bgcolor: 'grey.200' }}>การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">กำลังโหลดข้อมูล...</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employee_code || ''}</TableCell>
                  <TableCell>{`${row.first_name_th || row.first_name_en || ''} ${row.last_name_th || row.last_name_en || ''}`.trim() || '-'}</TableCell>
                  <TableCell>{row.national_id || '-'}</TableCell>
                  <TableCell>{row.employee_type || '-'}</TableCell>
                  <TableCell>{(row.start_date || row.hire_date) ? dayjs(row.start_date || row.hire_date).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell>{row.position || row.position_name || row.position_label || '-'}</TableCell>
                  <TableCell>{
                    // prefer explicit department_name saved on row, then lookup by department_id from unitList, then fall back to legacy fields
                    row.department_name
                    || (row.department_id && unitList.find((u) => String(u.id) === String(row.department_id))?.dept_name)
                    || row.unit
                    || row.dept_name
                    || '-'
                  }</TableCell>
                  <TableCell>{row.employment_status || row.status || '-'}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)} disabled={saving}>
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

      {/* Delete Confirm Modal */}
      <Dialog open={openDelete} onClose={() => { if (deleting) return; handleCloseDelete(); }} disableEscapeKeyDown={deleting} fullWidth maxWidth="xs">
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            ต้องการลบข้อมูลพนักงาน "{targetRow?.employee_code || targetRow?.first_name_th || targetRow?.first_name_en}" หรือไม่?
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

      {/* Quick Add Education dialog */}
      <Dialog open={addEducationOpen} onClose={handleCloseAddEducation} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มข้อมูลการศึกษา</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={2}>
            <TextField label="ระดับ" size="small" value={addEducationForm.level} onChange={(e) => setAddEducationForm((p) => ({ ...p, level: e.target.value }))} fullWidth />
            <TextField label="สถานศึกษา" size="small" value={addEducationForm.institution} onChange={(e) => setAddEducationForm((p) => ({ ...p, institution: e.target.value }))} fullWidth />
            <TextField select label="จังหวัด" size="small" value={addEducationForm.province} onChange={(e) => setAddEducationForm((p) => ({ ...p, province: e.target.value }))} fullWidth>
              <MenuItem value="">-</MenuItem>
              {provinces.map((p) => (<MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>))}
            </TextField>
            <TextField label="วุฒิ" size="small" value={addEducationForm.degree} onChange={(e) => setAddEducationForm((p) => ({ ...p, degree: e.target.value }))} fullWidth />
            <TextField label="สาขา" size="small" value={addEducationForm.major} onChange={(e) => setAddEducationForm((p) => ({ ...p, major: e.target.value }))} fullWidth />
            <TextField label="ปีที่จบ" size="small" value={addEducationForm.year_graduated} onChange={(e) => setAddEducationForm((p) => ({ ...p, year_graduated: e.target.value }))} fullWidth />
            <TextField label="เกรดเฉลี่ย" size="small" value={addEducationForm.gpa} onChange={(e) => setAddEducationForm((p) => ({ ...p, gpa: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddEducation}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSaveAddEducation}>เพิ่ม</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Add Work Experience dialog */}
      <Dialog open={addWorkOpen} onClose={handleCloseAddWork} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มประสบการณ์ทำงาน</DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
          <Stack spacing={2}>
            <TextField label="สถานที่/บริษัท" size="small" value={addWorkForm.employer} onChange={(e) => setAddWorkForm((p) => ({ ...p, employer: e.target.value }))} fullWidth />
            <TextField label="ประเภทธุรกิจ" size="small" value={addWorkForm.business_type} onChange={(e) => setAddWorkForm((p) => ({ ...p, business_type: e.target.value }))} fullWidth />
            <TextField label="ตำแหน่ง" size="small" value={addWorkForm.position} onChange={(e) => setAddWorkForm((p) => ({ ...p, position: e.target.value }))} fullWidth />
            <TextField label="ลักษณะงาน" size="small" value={addWorkForm.responsibilities} onChange={(e) => setAddWorkForm((p) => ({ ...p, responsibilities: e.target.value }))} fullWidth multiline rows={3} />
            <THDateField sx={{width:"100%"}} label="วันที่เริ่ม" value={addWorkForm.start_date} onChange={(v) => setAddWorkForm((p) => ({ ...p, start_date: v }))} />
            <THDateField sx={{width:"100%"}} label="วันที่สิ้นสุด" value={addWorkForm.end_date} onChange={(v) => setAddWorkForm((p) => ({ ...p, end_date: v }))} />
            <TextField label="เงินเดือนล่าสุด" size="small" value={addWorkForm.last_salary} onChange={(e) => setAddWorkForm((p) => ({ ...p, last_salary: e.target.value }))} fullWidth />
            <TextField label="สาเหตุที่ออก" size="small" value={addWorkForm.reason_for_leaving} onChange={(e) => setAddWorkForm((p) => ({ ...p, reason_for_leaving: e.target.value }))} fullWidth />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddWork}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSaveAddWork}>เพิ่ม</Button>
        </DialogActions>
      </Dialog>

      {/* Education full-list dialog */}
      <Dialog open={openEducationDialog} onClose={() => setOpenEducationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>รายละเอียดการศึกษา</DialogTitle>
        <DialogContent dividers>
          {form.education && form.education.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>ระดับ</TableCell>
                  <TableCell>สถานศึกษา</TableCell>
                  <TableCell>จังหวัด</TableCell>
                  <TableCell>วุฒิ</TableCell>
                  <TableCell>สาขา</TableCell>
                  <TableCell>ปีที่จบ</TableCell>
                  <TableCell>เกรดเฉลี่ย</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.education.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{e.level || ''}</TableCell>
                    <TableCell>{e.institution || ''}</TableCell>
                    <TableCell>{(provinces.find((p) => String(p.id) === String(e.province)) || {}).label || ''}</TableCell>
                    <TableCell>{e.degree || ''}</TableCell>
                    <TableCell>{e.major || ''}</TableCell>
                    <TableCell>{e.year_graduated || ''}</TableCell>
                    <TableCell>{e.gpa || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลการศึกษา</Typography></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEducationDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Work experience full-list dialog */}
      <Dialog open={openWorkDialog} onClose={() => setOpenWorkDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>รายละเอียดประสบการณ์ทำงาน</DialogTitle>
        <DialogContent dividers>
          {form.work_experiences && form.work_experiences.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>สถานที่/บริษัท</TableCell>
                  <TableCell>ประเภทธุรกิจ</TableCell>
                  <TableCell>ตำแหน่ง</TableCell>
                  <TableCell>วันที่เริ่ม</TableCell>
                  <TableCell>วันที่สิ้นสุด</TableCell>
                  <TableCell>เงินเดือนล่าสุด</TableCell>
                  <TableCell>สาเหตุที่ออก</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.work_experiences.map((w, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{w.employer || ''}</TableCell>
                    <TableCell>{w.business_type || ''}</TableCell>
                    <TableCell>{w.position || ''}</TableCell>
                    <TableCell>{w.start_date ? dayjs(w.start_date).format('DD/MM/YYYY') : ''}</TableCell>
                    <TableCell>{w.end_date ? dayjs(w.end_date).format('DD/MM/YYYY') : ''}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>{w.last_salary || ''}</TableCell>
                    <TableCell>{w.reason_for_leaving || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลประสบการณ์ทำงาน</Typography></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWorkDialog(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog - full screen (width + height) */}
      <Dialog
        open={openAdd}
        onClose={handleCloseAdd}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { mx: 'auto', width: '86%', maxWidth: 1100, maxHeight: '90vh', height: '80vh' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>{editMode ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มข้อมูลพนักงาน'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 0, overflowY: 'auto' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab label="ข้อมูลทั่วไป" />
              <Tab label="สถานภาพส่วนตัว" />
              <Tab label="ที่อยู่ปัจจุบัน" />
              <Tab label="การศึกษา" />
              <Tab label="ประสบการณ์ทำงาน" />
              <Tab label="การว่าจ้าง" />
              <Tab label="การจ่ายเงิน" />
              <Tab label="กลุ่มผู้ใช้ / สิทธิ์อนุมัติ" />
              <Tab label="Administrator" />
            </Tabs>

            {activeTab === 0 && (
              <Box>

                <Grid container spacing={2} justifyContent="center">
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', overflow: 'hidden', width: '90%' }}>
                        {imagePreview ? (
                          <img src={imagePreview} alt={imageFile?.name || 'preview'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">No image data</Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} justifyContent="center">
                        <label htmlFor="upload-photo">
                          <input accept="image/*" id="upload-photo" type="file" style={{ display: 'none' }} onChange={handleImageChange} />
                          <Button component="span" variant="outlined">อัปโหลดรูป</Button>
                        </label>
                        <Button variant="outlined" color="inherit" onClick={clearImage} disabled={!imagePreview}>ล้างรูป</Button>
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1, mt: 2 }}>
                  <TextField
                    label="รหัสพนักงาน *"
                    value={form.employee_code}
                    onChange={handleFormChange('employee_code')}
                    fullWidth
                    size="small"
                    error={Boolean(errors.employee_code)}
                    helperText={errors.employee_code || ''}
                  />



                  {/* Thai: title + first / last / nickname in a responsive flex row */}
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        variant="outlined"
                        label="คำนำหน้า *"
                        value={form.title_th}
                        onChange={handleFormChange('title_th')}
                        InputLabelProps={{ shrink: Boolean(form.title_th) }}
                        error={Boolean(errors.title_th)}
                        helperText={errors.title_th || ''}
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="นาย">นาย</MenuItem>
                        <MenuItem value="นาง">นาง</MenuItem>
                        <MenuItem value="นางสาว">นางสาว</MenuItem>
                      </TextField>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="ชื่อ (ไทย) *"
                        value={form.first_name_th}
                        onChange={handleFormChange('first_name_th')}
                        fullWidth
                        size="small"
                        error={Boolean(errors.first_name_th)}
                        helperText={errors.first_name_th || ''}
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="นามสกุล (ไทย) *"
                        value={form.last_name_th}
                        onChange={handleFormChange('last_name_th')}
                        fullWidth
                        size="small"
                        error={Boolean(errors.last_name_th)}
                        helperText={errors.last_name_th || ''}
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="ชื่อเล่น (ไทย) *"
                        value={form.nickname_th}
                        onChange={handleFormChange('nickname_th')}
                        fullWidth
                        size="small"
                        error={Boolean(errors.nickname_th)}
                        helperText={errors.nickname_th || ''}
                      />
                    </Box>
                  </Box>

                  {/* Thai: title + first / last / nickname in a responsive flex row */}
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        variant="outlined"
                        label="คำนำหน้า (Eng)"
                        value={form.title_en}
                        onChange={handleFormChange('title_en')}
                        InputLabelProps={{ shrink: Boolean(form.title_en) }}
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="Mr.">Mr.</MenuItem>
                        <MenuItem value="Mrs.">Mrs.</MenuItem>
                        <MenuItem value="Ms.">Ms.</MenuItem>
                      </TextField>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField label="ชื่อ (Eng)" value={form.first_name_en} onChange={handleFormChange('first_name_en')} fullWidth size="small" />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField label="นามสกุล (Eng)" value={form.last_name_en} onChange={handleFormChange('last_name_en')} fullWidth size="small" />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField label="ชื่อเล่น (Eng)" value={form.nickname_en} onChange={handleFormChange('nickname_en')} fullWidth size="small" />
                    </Box>
                  </Box>

                  {/* Birth date and Age as a responsive flex row */}
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <THDateField label="วันเกิด" value={form.birth_date} onChange={(v) => setForm((prev) => ({ ...prev, birth_date: v }))} sx={{ width: '100%' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="อายุ"
                        value={ageYears}
                        fullWidth
                        size="small"
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">ปี</InputAdornment>
                          ),
                          inputProps: { style: { textAlign: 'right' } }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Gender / Height / Weight / Blood group in one responsive row (4 columns) */}
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="เพศ"
                        value={form.gender}
                        onChange={handleFormChange('gender')}
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="ชาย">ชาย</MenuItem>
                        <MenuItem value="หญิง">หญิง</MenuItem>
                        <MenuItem value="อื่นๆ">อื่นๆ</MenuItem>
                      </TextField>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="ส่วนสูง (ซม.)"
                        type="number"
                        value={form.height_cm}
                        onChange={handleNumberChange('height_cm')}
                        fullWidth
                        size="small"
                        inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="น้ำหนัก (กก.)"
                        type="number"
                        value={form.weight_kg}
                        onChange={handleNumberChange('weight_kg')}
                        fullWidth
                        size="small"
                        inputProps={{ min: 0, step: 0.1, inputMode: 'decimal' }}
                      />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="หมู่เลือด"
                        value={form.blood_group}
                        onChange={handleFormChange('blood_group')}
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="A">A</MenuItem>
                        <MenuItem value="B">B</MenuItem>
                        <MenuItem value="AB">AB</MenuItem>
                        <MenuItem value="O">O</MenuItem>
                      </TextField>
                    </Box>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    label="สัญชาติ"
                    value={form.nationality}
                    onChange={handleFormChange('nationality')}
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleOpenNationalityDialog} aria-label="open nationality picker">
                            <MoreHorizIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="เชื้อชาติ"
                    value={form.race}
                    onChange={handleFormChange('race')}
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleOpenRaceDialog} aria-label="open race picker">
                            <MoreHorizIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="ศาสนา"
                    value={form.religion}
                    onChange={handleFormChange('religion')}
                  >
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="พุทธ">พุทธ</MenuItem>
                    <MenuItem value="อิสลาม">อิสลาม</MenuItem>
                    <MenuItem value="คริสต์">คริสต์</MenuItem>
                    <MenuItem value="ฮินดู">ฮินดู</MenuItem>
                  </TextField>

                  <TextField label="จังหวัด" value={form.province} onChange={handleFormChange('province')} fullWidth size="small" />

                  <TextField
                    fullWidth
                    size="small"
                    label="ประเทศ"
                    value={form.country}
                    onChange={handleFormChange('country')}
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleOpenCountryDialog} aria-label="open country picker">
                            <MoreHorizIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <FormControlLabel control={<Checkbox checked={form.timekeeping_exempt} onChange={handleFormChange('timekeeping_exempt')} />} label="ยกเว้นการลงเวลา" />
                </Box>


              </Box>
            )}

            {activeTab === 5 && (
              <Box>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="ตำแหน่ง"
                      value={form.position}
                      onChange={handleFormChange('position')}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={handleOpenPositionDialog} aria-label="เลือกตำแหน่ง">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      InputLabelProps={{ shrink: Boolean(form.position) }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="หน่วยงาน"
                      value={form.unit}
                      onChange={handleFormChange('unit')}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={handleOpenUnitDialog} aria-label="เลือกหน่วยงาน">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      InputLabelProps={{ shrink: Boolean(form.unit) }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', mt: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="หัวหน้างาน"
                      value={form.supervisor_name || ''}
                      onChange={handleFormChange('supervisor_name')}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={() => handleOpenEmployeePicker('supervisor')} aria-label="เลือกหัวหน้างาน">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: Boolean(form.supervisor_name) }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      select
                      label="ประเภทพนักงาน"
                      value={form.employee_type}
                      onChange={handleFormChange('employee_type')}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">-</MenuItem>
                      <MenuItem value="พนักงานรายชั่วโมง">พนักงานรายชั่วโมง</MenuItem>
                      <MenuItem value="พนักงานรายเหมา">พนักงานรายเหมา</MenuItem>
                      <MenuItem value="พนักงานรายวัน">พนักงานรายวัน</MenuItem>
                      <MenuItem value="พนักงานรายเดือน">พนักงานรายเดือน</MenuItem>
                    </TextField>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', mt: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="กลุ่มพนักงาน"
                      value={form.employee_group}
                      onChange={handleFormChange('employee_group')}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={handleOpenEmployeeGroupDialog} aria-label="เลือกกลุ่มพนักงาน">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      InputLabelProps={{ shrink: Boolean(form.employee_group) }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="ระดับ"
                      value={form.level}
                      onChange={handleFormChange('level')}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={handleOpenEmployeeLevelDialog} aria-label="เลือกระดับ">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      InputLabelProps={{ shrink: Boolean(form.level) }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', mt: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <THDateField label="วันที่เริ่มงาน" value={form.start_date} onChange={(v) => setForm((prev) => ({ ...prev, start_date: v }))} sx={{ width: '100%' }} />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField label="จำนวนวันทดลองงาน" type="number" value={form.probation_days} onChange={handleNumberChange('probation_days')} size="small" fullWidth inputProps={{ min: 0 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1, mt: 1 }}>

                  <THDateField label="วันที่บรรจุ" value={form.confirmation_date} onChange={(v) => setForm((prev) => ({ ...prev, confirmation_date: v }))} sx={{ width: '100%' }} />

                  <TextField
                    label="ชม.การทำงานตามกะ"
                    value={form.working_hours}
                    onChange={handleFormChange('working_hours')}
                    fullWidth
                    size="small"
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton edge="end" size="small" onClick={handleOpenShiftDialog} aria-label="เลือกกะ">
                            <MoreHorizIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ shrink: Boolean(form.working_hours) }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      label="อายุงาน (ปี)"
                      value={form.service_age_years}
                      onChange={handleNumberChange('service_age_years')}
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      inputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: Boolean(form.service_age_years) }}
                    />
                    <TextField
                      label="(เดือน)"
                      value={form.service_age_months}
                      onChange={handleNumberChange('service_age_months')}
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      inputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: Boolean(form.service_age_months) }}
                    />
                    <TextField
                      label="(วัน)"
                      value={form.service_age_days}
                      onChange={handleNumberChange('service_age_days')}
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      inputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: Boolean(form.service_age_days) }}
                    />
                  </Box>

                  <TextField
                    label="สถานะการทำงาน"
                    value={form.employment_status}
                    fullWidth
                    size="small"
                    inputProps={{ readOnly: true }}
                    InputLabelProps={{ shrink: Boolean(form.employment_status) }}
                  />

                  <TextField
                    label="อัตราค่าจ้าง"
                    value={form.salary_rate}
                    onChange={handleNumberChange('salary_rate')}
                    fullWidth
                    size="small"
                    type="number"
                    inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                    InputProps={{
                      endAdornment: (<InputAdornment position="end">บาท</InputAdornment>)
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TextField
                      label="ปฏิทินการทำงาน"
                      value={form.company_calendar_name}
                      fullWidth
                      size="small"
                      inputProps={{ readOnly: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" size="small" onClick={handleOpenCompanyCalendarDialog} aria-label="เลือกปฏิทิน">
                              <MoreHorizIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: Boolean(form.company_calendar_name) }}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>ข้อมูลหมายเลขบัตรประชาชน / ผู้เสียภาษี</Typography>

                  <TextField
                    label="หมายเลขบัตร/เลขผู้เสียภาษี"
                    value={form.national_id}
                    onChange={handleFormChange('national_id')}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    label="ออกโดย (เขต/อำเภอ)"
                    value={form.national_id_issue_place}
                    onChange={handleFormChange('national_id_issue_place')}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <THDateField label="วันที่ออกบัตร" value={form.national_id_issue_date} onChange={(v) => setForm((prev) => ({ ...prev, national_id_issue_date: v }))} sx={{ width: '100%' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <THDateField label="วันบัตรหมดอายุ" value={form.national_id_expiry_date} onChange={(v) => setForm((prev) => ({ ...prev, national_id_expiry_date: v }))} sx={{ width: '100%' }} />
                    </Box>
                  </Box>

                  <TextField
                    label="หมายเลขผู้เสียภาษี (ชาวต่างชาติ)"
                    value={form.foreign_tax_id}
                    onChange={handleFormChange('foreign_tax_id')}
                    fullWidth
                    size="small"
                    sx={{ mb: 1, mt: 1 }}
                  />

                  {/* helper note moved inside the group box */}
                  <Box sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: '#fff5f5', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>หมายเหตุ</Typography>
                    <Typography variant="caption" sx={{ color: 'error.main' }}>
                      กรณีชาวไทย : กรุณาใส่หมายเลขบัตร/หมายเลขผู้เสียภาษีที่ "หมายเลขบัตร/เลขผู้เสียภาษี" (ใช้หมายเลขเดียวกัน) กรณีชาวต่างชาติ : กรุณาใส่หมายเลขผู้เสียภาษีที่ "หมายเลขผู้เสียภาษี (ชาวต่างชาติ)"
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>สถานภาพการสมรส</Typography>

                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 1 }}></FormLabel>
                    <RadioGroup row value={form.marital_status} onChange={handleFormChange('marital_status')}>
                      <FormControlLabel value="โสด" control={<Radio size="small" />} label="โสด" />
                      <FormControlLabel value="สมรส" control={<Radio size="small" />} label="สมรส" />
                      <FormControlLabel value="หย่า" control={<Radio size="small" />} label="หย่า" />
                      <FormControlLabel value="หม้าย" control={<Radio size="small" />} label="หม้าย" />
                      <FormControlLabel value="แยกกันอยู่" control={<Radio size="small" />} label="แยกกันอยู่" />
                    </RadioGroup>
                  </FormControl>

                  <Box sx={{ mt: 2, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                      <Box sx={{ width: '100%' }}>
                        <Autocomplete
                          freeSolo
                          options={provinces}
                          getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt.label || opt.name_th || opt.name_en || ''))}
                          value={
                            // prefer label text when typed; otherwise use selected province object
                            form.marriage_province_label || (provinces.find((p) => p.id === form.marriage_province_id) || '')
                          }
                          onChange={(_, newValue) => {
                            if (!newValue) {
                              setForm((prev) => ({ ...prev, marriage_province_id: '', marriage_province_label: '' }));
                              setDistricts([]);
                              return;
                            }
                            if (typeof newValue === 'string') {
                              // free text selected/entered
                              setForm((prev) => ({ ...prev, marriage_province_id: '', marriage_province_label: newValue, marriage_district_id: '', marriage_district_label: '' }));
                              setDistricts([]);
                            } else {
                              // object selected from options
                              setForm((prev) => ({ ...prev, marriage_province_id: newValue.id, marriage_province_label: newValue.label || newValue.name_th || newValue.name_en || '', marriage_district_id: '', marriage_district_label: '' }));
                              loadDistrictsFromDb(newValue.id);
                            }
                          }}
                          onInputChange={(_, input) => {
                            // keep typed input in sync
                            setForm((prev) => ({ ...prev, marriage_province_label: input }));
                          }}
                          disabled={!isMarried}
                          renderInput={(params) => (
                            <TextField {...params} label="จังหวัด" size="small" />
                          )}
                        />
                        {provincesLoading && <Typography variant="caption">กำลังโหลด...</Typography>}
                        {provincesError && <Typography color="error" variant="caption">{provincesError}</Typography>}
                      </Box>

                      <Box sx={{ width: '100%' }}>
                        <Autocomplete
                          freeSolo
                          options={districts}
                          getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt.label || opt.name_th || opt.name_en || ''))}
                          value={
                            form.marriage_district_label || (districts.find((d) => d.id === form.marriage_district_id) || '')
                          }
                          onChange={(_, newValue) => {
                            if (!newValue) {
                              setForm((prev) => ({ ...prev, marriage_district_id: '', marriage_district_label: '' }));
                              return;
                            }
                            if (typeof newValue === 'string') {
                              setForm((prev) => ({ ...prev, marriage_district_id: '', marriage_district_label: newValue }));
                            } else {
                              setForm((prev) => ({ ...prev, marriage_district_id: newValue.id, marriage_district_label: newValue.label || newValue.name_th || newValue.name_en || '' }));
                            }
                          }}
                          onInputChange={(_, input) => setForm((prev) => ({ ...prev, marriage_district_label: input }))}
                          disabled={!isMarried || districtsLoading || (!form.marriage_province_id && districts.length === 0)}
                          renderInput={(params) => (
                            <TextField {...params} label="สมรส ณ อำเภอ/เขต" size="small" />
                          )}
                        />
                        {districtsLoading && <Typography variant="caption">กำลังโหลด...</Typography>}
                        {districtsError && <Typography color="error" variant="caption">{districtsError}</Typography>}
                      </Box>

                      <Box sx={{ width: '100%' }}>
                        <THDateField disabled={!isMarried} label="จดทะเบียนสมรสเมื่อ" value={form.marriage_registration_date} onChange={(v) => setForm((prev) => ({ ...prev, marriage_registration_date: v }))} sx={{ width: '100%' }} />
                      </Box>
                    </Box>
                    <FormControlLabel control={<Checkbox disabled={!isMarried} checked={Boolean(form.spouse_age_65_plus)} onChange={handleFormChange('spouse_age_65_plus')} />} label="คู่สมรสอายุตั้งแต่ 65 ปีขึ้นไป" sx={{ mt: 1 }} />
                  </Box>
                </Box>

                {/* Group: สถานภาพทางการทหาร (ตามภาพ) */}
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>สถานภาพทางการทหาร</Typography>

                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup value={form.military_status} onChange={handleFormChange('military_status')}>
                      <FormControlLabel value="ผ่านการเกณฑ์ทหาร" control={<Radio size="small" />} label="ผ่านการเกณฑ์ทหาร" sx={{ display: 'block', mb: 0.5 }} />
                      <FormControlLabel value="ผ่อนผัน" control={<Radio size="small" />} label="ผ่อนผัน" sx={{ display: 'block', mb: 0.5 }} />
                      <FormControlLabel value="ได้รับการยกเว้น" control={<Radio size="small" />} label="ได้รับการยกเว้น" sx={{ display: 'block', mb: 0.5 }} />
                      <FormControlLabel value="N/A" control={<Radio size="small" />} label="N/A" sx={{ display: 'block' }} />
                    </RadioGroup>
                  </FormControl>

                  {(form.military_status === 'ผ่อนผัน' || form.military_status === 'ได้รับการยกเว้น') && (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        placeholder=""
                        value={form.military_note}
                        onChange={handleFormChange('military_note')}
                        fullWidth
                        size="small"
                        multiline
                        rows={6}
                        InputProps={{ sx: { height: 140, alignItems: 'flex-start', overflow: 'auto' } }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Group: ใบอนุญาตขับขี่ */}
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>ใบอนุญาตขับขี่</Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField label="เลขที่ใบขับขี่" value={form.driver_license_number} onChange={handleFormChange('driver_license_number')} fullWidth size="small" />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <THDateField label="วันที่บัตรหมดอายุ" value={form.driver_license_expiry} onChange={(v) => setForm((prev) => ({ ...prev, driver_license_expiry: v }))} sx={{ width: '100%' }} />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <TextField
                        select
                        label="ประเภทใบขับขี่"
                        value={form.driver_license_type}
                        onChange={handleFormChange('driver_license_type')}
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="รถยนต์ส่วนบุคคล">รถยนต์ส่วนบุคคล</MenuItem>
                        <MenuItem value="รถจักรยานยนต์ส่วนบุคคล">รถจักรยานยนต์ส่วนบุคคล</MenuItem>
                        <MenuItem value="รถยนต์สามล้อส่วนบุคคล">รถยนต์สามล้อส่วนบุคคล</MenuItem>
                        <MenuItem value="รถยนต์สาธารณะ">รถยนต์สาธารณะ</MenuItem>
                        <MenuItem value="รถจักรยานยนต์สาธารณะ">รถจักรยานยนต์สาธารณะ</MenuItem>
                        <MenuItem value="รถยนต์สามล้อสาธารณะ">รถยนต์สามล้อสาธารณะ</MenuItem>
                        <MenuItem value="รถยนต์ส่วนบุคคลชั่วคราว">รถยนต์ส่วนบุคคลชั่วคราว</MenuItem>
                        <MenuItem value="รถจักรยานยนต์ส่วนบุคคลชั่วคราว">รถจักรยานยนต์ส่วนบุคคลชั่วคราว</MenuItem>
                        <MenuItem value="รถยนต์สามล้อส่วนบุคคลชั่วคราว">รถยนต์สามล้อส่วนบุคคลชั่วคราว</MenuItem>
                      </TextField>
                    </Box>
                  </Box>
                </Box>

              </Box>
            )}

            {activeTab === 6 && (


              <Box>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>การจ่ายเงิน</Typography>

                  <Button variant="outlined" size="small" onClick={handleOpenBankPicker} sx={{ mb: 1 }}>เลือกธนาคาร</Button>

                  <TableContainer sx={{ maxHeight: 220, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ชื่อธนาคาร</TableCell>
                          <TableCell>สาขา</TableCell>
                          <TableCell>ชื่อบัญชี</TableCell>
                          <TableCell>เลขที่บัญชี</TableCell>
                          <TableCell align="right">% การนำส่ง</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bankAccounts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">ยังไม่มีบัญชี</TableCell>
                          </TableRow>
                        ) : (
                          bankAccounts.map((b, idx) => (
                            <TableRow key={b.id || idx} hover>
                              <TableCell sx={{ minWidth: 180 }}>{b.bank_name}</TableCell>
                              <TableCell>
                                <TextField size="small" value={b.branch} onChange={handleBankChange(idx, 'branch')} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" value={b.account_name} onChange={handleBankChange(idx, 'account_name')} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" value={b.account_number} onChange={handleBankChange(idx, 'account_number')} fullWidth />
                              </TableCell>
                              <TableCell align="right">
                                <TextField size="small" value={String(b.percent || '')} onChange={handleBankChange(idx, 'percent')} sx={{ width: 100 }} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                              </TableCell>
                              <TableCell>
                                <Button size="small" color="inherit" onClick={() => handleRemoveBank(idx)}>ลบ</Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={4} />
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalBankPercent.toFixed(2)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <TextField fullWidth label="รูปแบบงวดการจ่าย" size="small" value={paymentScheduleSelection} onChange={(e) => setPaymentScheduleSelection(e.target.value)} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton size="small" onClick={handleOpenTemplateDialog}><MoreHorizIcon /></IconButton></InputAdornment>) }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>การคำนวณรายได้</Typography>
                    <TextField select size="small" fullWidth label="การคำนวณเงินเดือนงวดแรก" value={form.salary_first_period_calc} onChange={handleFormChange('salary_first_period_calc')}>
                      <MenuItem value="standard">ตามมาตรฐานเงินเดือน</MenuItem>
                      <MenuItem value="pro_rata">ตามเศษวันที่เหลือ</MenuItem>
                      <MenuItem value="deduct_absence">หักค่าจ้างตามวันที่ไม่ได้ทำงาน</MenuItem>
                    </TextField>
                  </Box>

                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>การคำนวณภาษี</Typography>
                    <TextField select size="small" fullWidth label="วิธีการคำนวณ" value={form.tax_calc_method} onChange={handleFormChange('tax_calc_method')}>
                      <MenuItem value="none">ไม่คิดภาษี</MenuItem>
                      <MenuItem value="withhold">หัก ณ ที่จ่าย</MenuItem>
                      <MenuItem value="employer_pay">นายจ้างออกให้</MenuItem>
                      <MenuItem value="employer_all">นายจ้างออกให้ทั้งหมด</MenuItem>
                    </TextField>

                    <Box sx={{ mt: 1 }}>
                      <FormControl component="fieldset">
                        <FormLabel component="legend">รูปแบบอัตราภาษี</FormLabel>
                        <RadioGroup row value={form.tax_rate_mode} onChange={handleFormChange('tax_rate_mode')}>
                          <FormControlLabel value="progressive" control={<Radio size="small" />} label="แบบอัตราก้าวหน้า" />
                          <FormControlLabel value="fixed" control={<Radio size="small" />} label="แบบคงที่ (เงื่อนไข BOI)" />
                        </RadioGroup>
                      </FormControl>
                      {form.tax_rate_mode === 'fixed' && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField size="small" label="%" value={form.tax_fixed_boi_percent} onChange={handleNumberChange('tax_fixed_boi_percent')} sx={{ width: 120 }} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>การจ่ายภาษี</Typography>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2">การจ่ายภาษี ของลูกจ้าง 40(1)</Typography>
                      <FormControl>
                        <RadioGroup row value={form.tax_employee_method} onChange={handleFormChange('tax_employee_method')}>
                          <FormControlLabel value="avg" control={<Radio size="small" />} label="แบบเฉลี่ยต่องวด" />
                          <FormControlLabel value="fixed" control={<Radio size="small" />} label="แบบคงที่" />
                        </RadioGroup>
                      </FormControl>
                      {form.tax_employee_method === 'fixed' && (
                        <TextField size="small" label="จำนวนเงิน (บาท)" value={form.tax_employee_fixed_amount} onChange={handleNumberChange('tax_employee_fixed_amount')} sx={{ width: 180, mt: 1 }} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                      )}
                    </Box>

                    <Box>
                      <Typography variant="body2">การจ่ายภาษี ของนายจ้าง</Typography>
                      <FormControl>
                        <RadioGroup row value={form.tax_employer_method} onChange={handleFormChange('tax_employer_method')}>
                          <FormControlLabel value="avg" control={<Radio size="small" />} label="แบบเฉลี่ยต่องวด" />
                          <FormControlLabel value="fixed" control={<Radio size="small" />} label="แบบคงที่" />
                        </RadioGroup>
                      </FormControl>
                      {form.tax_employer_method === 'fixed' && (
                        <TextField size="small" label="จำนวนเงิน (บาท)" value={form.tax_employer_fixed_amount} onChange={handleNumberChange('tax_employer_fixed_amount')} sx={{ width: 180, mt: 1 }} inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === 7 && (
              <Box>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>กำหนดพนักงานสำหรับกลุ่มผู้ใช้</Typography>
                  <Button variant="outlined" size="small" onClick={handleOpenUserGroupDialog} sx={{ mb: 1 }}>เลือกกลุ่มผู้ใช้</Button>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>รหัสกลุ่มผู้ใช้</TableCell>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ชื่อกลุ่มผู้ใช้</TableCell>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }} align="right">จัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assignedUserGroups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">ยังไม่ได้ระบุกลุ่มผู้ใช้</TableCell>
                          </TableRow>
                        ) : (
                          assignedUserGroups.map((g, idx) => (
                            <TableRow key={g.id || idx} hover>
                              <TableCell>{g.code}</TableCell>
                              <TableCell>{g.name}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="ลบ">
                                  <IconButton size="small" color="error" onClick={() => handleRemoveAssignedUserGroup(idx)}>
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
                </Box>

                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>กำหนดสิทธิ์การอนุมัติ</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold', width: '30%' }}>ชื่อหน้าจอ</TableCell>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>รหัสผู้อนุมัติ</TableCell>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ชื่อผู้อนุมัติ</TableCell>
                          <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }} align="right">จัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {approvers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center">ยังไม่มีการกำหนดผู้อนุมัติ</TableCell>
                          </TableRow>
                        ) : (
                          approvers.map((a, idx) => (
                            <TableRow key={`apr-${idx}`} hover>
                              <TableCell sx={{ width: '30%' }}><TextField fullWidth size="small" value={a.screen_name} onChange={handleApproverChange(idx, 'screen_name')} /></TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={a.approver_code}
                                  onChange={handleApproverChange(idx, 'approver_code')}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => handleApproverActions(idx)}>
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                              </TableCell>
                              <TableCell><TextField size="small" value={a.approver_name} onChange={handleApproverChange(idx, 'approver_name')} /></TableCell>
                              <TableCell align="right">
                                <Tooltip title="ลบ">
                                  <IconButton size="small" color="error" onClick={() => removeApproverRow(idx)}>
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

                  {/* add approver button intentionally removed per UX request */}
                </Box>
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="ชื่อที่อยู่" size="small" value={form.current_address_name} onChange={handleFormChange('current_address_name')} fullWidth />

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField label="เลขที่" size="small" value={form.current_address_no} onChange={handleFormChange('current_address_no')} fullWidth />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField label="หมู่ที่" size="small" value={form.current_address_moo} onChange={handleFormChange('current_address_moo')} fullWidth />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField label="อาคาร" size="small" value={form.current_address_building} onChange={handleFormChange('current_address_building')} fullWidth />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField label="เลขที่ห้อง" size="small" value={form.current_address_room} onChange={handleFormChange('current_address_room')} fullWidth />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField label="ชั้นที่" size="small" value={form.current_address_floor} onChange={handleFormChange('current_address_floor')} fullWidth />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <TextField label="หมู่บ้าน" size="small" value={form.current_address_village} onChange={handleFormChange('current_address_village')} fullWidth />
                  </Box>
                </Box>

                <TextField label="ตรอก/ซอย" size="small" value={form.current_address_alley} onChange={handleFormChange('current_address_alley')} fullWidth />
                <TextField label="ถนน" size="small" value={form.current_address_road} onChange={handleFormChange('current_address_road')} fullWidth />
                <TextField
                  select
                  label="ประเทศ"
                  size="small"
                  value={form.current_address_country}
                  onChange={handleFormChange('current_address_country')}
                  fullWidth
                >
                  <MenuItem value="">-</MenuItem>
                  {countryList.map((c) => (
                    <MenuItem key={c.id ?? c.country_id ?? c.code ?? c.name} value={c.id ?? c.country_id ?? c.code ?? c.name}>
                      {c.name || c.name_th || c.enName || c.name_en || c.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="จังหวัด"
                  size="small"
                  value={form.current_address_province || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // when user changes province, clear dependent district/subdistrict
                    setForm((prev) => ({ ...prev, current_address_province: val, current_address_district: '', current_address_subdistrict: '' }));
                  }}
                  fullWidth
                >
                  <MenuItem value="">-</MenuItem>
                  {provinces.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="อำเภอ/เขต"
                  size="small"
                  value={form.current_address_district || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // when user changes district, clear dependent subdistrict
                    setForm((prev) => ({ ...prev, current_address_district: val, current_address_subdistrict: '' }));
                  }}
                  fullWidth
                >
                  <MenuItem value="">-</MenuItem>
                  {districts.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="ตำบล/แขวง"
                  size="small"
                  value={form.current_address_subdistrict || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // find selected subdistrict object to extract postal code if available
                    const found = subdistricts.find((s) => String(s.id) === String(val));
                    setForm((prev) => ({ ...prev, current_address_subdistrict: val, current_address_postal_code: (found && found.postal_code) ? found.postal_code : prev.current_address_postal_code || '' }));
                  }}
                  fullWidth
                  disabled={subdistrictsLoading}
                  error={!!subdistrictsError}
                  helperText={subdistrictsError || ''}
                >
                  <MenuItem value="">-</MenuItem>
                  {subdistrictsLoading && <MenuItem disabled>กำลังโหลด...</MenuItem>}
                  {!subdistrictsLoading && subdistricts.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="รหัสไปรษณีย์"
                  size="small"
                  value={form.current_address_postal_code || ''}
                  onChange={handleFormChange('current_address_postal_code')}
                  sx={{ flex: 1 }}
                  InputProps={{ readOnly: true }}
                />
                <TextField label="โทรศัพท์" size="small" value={form.current_address_mobile || ''} onChange={handleFormChange('current_address_mobile')} sx={{ flex: 1 }} />
                <TextField label="อีเมล 1" size="small" value={form.current_address_email_1} onChange={handleFormChange('current_address_email_1')} fullWidth />
                <TextField label="อีเมล 2" size="small" value={form.current_address_email_2} onChange={handleFormChange('current_address_email_2')} fullWidth />
                <TextField label="อีเมล 3" size="small" value={form.current_address_email_3} onChange={handleFormChange('current_address_email_3')} fullWidth />
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">การศึกษา</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={handleOpenAddEducation}>เพิ่ม</Button>
                  </Stack>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ลำดับ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ระดับ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>สถานศึกษา</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>จังหวัด</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>วุฒิ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>สาขา</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ปีที่จบ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>เกรดเฉลี่ย</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }} align="right">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {form.education && form.education.length > 0 ? form.education.map((e, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{e.level || ''}</TableCell>
                          <TableCell>{e.institution || ''}</TableCell>
                          <TableCell>{(provinces.find((p) => String(p.id) === String(e.province)) || {}).label || ''}</TableCell>
                          <TableCell>{e.degree || ''}</TableCell>
                          <TableCell>{e.major || ''}</TableCell>
                          <TableCell>{e.year_graduated || ''}</TableCell>
                          <TableCell>{e.gpa || ''}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="ลบ">
                              <IconButton size="small" color="error" onClick={() => _removeEducationRow(i)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">ยังไม่ได้เพิ่มข้อมูลการศึกษา</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">ประสบการณ์ทำงาน</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={handleOpenAddWork}>เพิ่ม</Button>
                  </Stack>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ลำดับ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>สถานที่/บริษัท</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ประเภทธุรกิจ</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>วันที่เริ่ม</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>วันที่สิ้นสุด</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>เงินเดือนล่าสุด</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }}>สาเหตุที่ออก</TableCell>
                        <TableCell sx={{ backgroundColor: 'grey.100', fontWeight: 'bold' }} align="right">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {form.work_experiences && form.work_experiences.length > 0 ? form.work_experiences.map((w, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{w.employer || ''}</TableCell>
                          <TableCell>{w.business_type || ''}</TableCell>
                          <TableCell>{w.position || ''}</TableCell>
                          <TableCell>{w.start_date ? dayjs(w.start_date).format('DD/MM/YYYY') : ''}</TableCell>
                          <TableCell>{w.end_date ? dayjs(w.end_date).format('DD/MM/YYYY') : ''}</TableCell>
                          <TableCell style={{ textAlign: 'right' }}>{w.last_salary || ''}</TableCell>
                          <TableCell>{w.reason_for_leaving || ''}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="ลบ">
                              <IconButton size="small" color="error" onClick={() => _removeWorkRow(i)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">ยังไม่ได้เพิ่มข้อมูลประสบการณ์ทำงาน</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 8 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Administrator</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="สร้างโดย" size="small" value={form.created_by || ''} fullWidth disabled />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="สร้างเมื่อ" size="small" value={form.created_at ? dayjs(form.created_at).format('DD/MM/YYYY HH:mm') : ''} fullWidth disabled />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="แก้ไขล่าสุดโดย" size="small" value={form.updated_by || ''} fullWidth disabled />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="แก้ไขล่าสุดเมื่อ" size="small" value={form.updated_at ? dayjs(form.updated_at).format('DD/MM/YYYY HH:mm') : ''} fullWidth disabled />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          size="small"
                          checked={Boolean(form.notify_additional_info)}
                          onChange={(e) => setForm((prev) => ({ ...prev, notify_additional_info: e.target.checked }))}
                        />
                      )}
                      label="แจ้งเตือนการกำหนดข้อมูลพนักงานเพิ่มเติม"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </LocalizationProvider>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={handleCloseAdd} disabled={saving}>ปิด</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
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

      {/* Employee picker dialog (assign employee to a user-group row) */}
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
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัสพนักงาน</TableCell>
                  <TableCell>ชื่อ-สกุล</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {employeeList.map((emp) => (
                  <TableRow
                    key={emp.id}
                    hover
                    onClick={() => {
                      if (employeePickerMode === 'supervisor') return handleSelectSupervisor(emp);
                      if (employeePickerMode === 'approver') return handleSelectApprover(emp);
                      return handleSelectEmployeeForGroup(emp);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{emp.employee_code || ''} - {`${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmployeePicker}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Bank code picker dialog (เลือกธนาคาร) */}
      <Dialog open={openBankPicker} onClose={handleCloseBankPicker} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกรหัสธนาคาร</DialogTitle>
        <DialogContent dividers>
          {bankLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : bankError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{bankError}</Typography></Box>
          ) : bankCodes.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลรหัสธนาคาร</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อธนาคาร</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {bankCodes.map((b) => (
                  <TableRow key={b.id} hover onClick={() => handleSelectBankCode(b)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{b.bank_id || ''} - {b.label || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBankPicker}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Payment schedule template picker dialog */}
      <Dialog open={openTemplateDialog} onClose={handleCloseTemplateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกรูปแบบงวดการจ่าย</DialogTitle>
        <DialogContent dividers>
          {templateLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : templateError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{templateError}</Typography></Box>
          ) : templateList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูล</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>ชื่อ</TableCell>
                  <TableCell>ปี</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {templateList.map((t) => (
                  <TableRow key={t.id} hover onClick={() => handleSelectTemplate(t)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{t.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTemplateDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Employee Level (ระดับ) picker dialog */}
      <Dialog open={openEmployeeLevelDialog} onClose={handleCloseEmployeeLevelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกระดับ</DialogTitle>
        <DialogContent dividers>
          {employeeLevelLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : employeeLevelError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{employeeLevelError}</Typography></Box>
          ) : employeeLevelList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลระดับ</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อ (ไทย)</TableCell>
                  <TableCell>ชื่อ (Eng)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {employeeLevelList.map((l) => (
                  <TableRow key={l.id} hover onClick={() => handleSelectEmployeeLevel(l)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{l.level_code || ''} - {l.level_name_th || l.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmployeeLevelDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* User Group picker dialog */}
      <Dialog open={openUserGroupDialog} onClose={handleCloseUserGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกกลุ่มผู้ใช้</DialogTitle>
        <DialogContent dividers>
          {userGroupLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : userGroupError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{userGroupError}</Typography></Box>
          ) : userGroupList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลกลุ่มผู้ใช้</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัสกลุ่ม</TableCell>
                  <TableCell>ชื่อกลุ่ม</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {userGroupList.map((g) => (
                  <TableRow key={g.id} hover onClick={() => handleSelectUserGroup(g)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{g.code} - {g.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserGroupDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Employee Group (กลุ่มพนักงาน) picker dialog */}
      <Dialog open={openEmployeeGroupDialog} onClose={handleCloseEmployeeGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกกลุ่มพนักงาน</DialogTitle>
        <DialogContent dividers>
          {employeeGroupLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : employeeGroupError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{employeeGroupError}</Typography></Box>
          ) : employeeGroupList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลกลุ่มพนักงาน</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อกลุ่ม (ไทย)</TableCell>
                  <TableCell>ชื่อกลุ่ม (Eng)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {employeeGroupList.map((g) => (
                  <TableRow key={g.id} hover onClick={() => handleSelectEmployeeGroup(g)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{g.group_code || ''} - {g.group_name || g.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmployeeGroupDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Country picker dialog (loads from DB) */}
      <Dialog open={openCountryDialog} onClose={handleCloseCountryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกประเทศ</DialogTitle>
        <DialogContent dividers>
          {countryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : countryError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{countryError}</Typography></Box>
          ) : countryList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูล</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>ชื่อ (ไทย)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {countryList.map((c) => (
                  <TableRow key={c.id} hover onClick={() => handleSelectCountry(c)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{c.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCountryDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Nationality picker dialog - reuses country data */}
      <Dialog open={openNationalityDialog} onClose={handleCloseNationalityDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกสัญชาติ</DialogTitle>
        <DialogContent dividers>
          {nationalityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : nationalityError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{nationalityError}</Typography></Box>
          ) : nationalityList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูล</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>ชื่อ (ไทย)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {nationalityList.map((c) => (
                  <TableRow key={`nat-${c.id}`} hover onClick={() => handleSelectNationality(c)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{c.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNationalityDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Position picker dialog */}
      <Dialog open={openPositionDialog} onClose={handleClosePositionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกตำแหน่ง</DialogTitle>
        <DialogContent dividers>
          {positionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : positionError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{positionError}</Typography></Box>
          ) : positionList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลตำแหน่ง</Typography></Box>
          ) : (
            <Table size='small' sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ตำแหน่ง (ไทย)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {positionList.map((p) => (
                  <TableRow key={p.id} hover onClick={() => handleSelectPosition(p)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{p.position_code || ''} - {p.position_name || p.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePositionDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Unit (หน่วยงาน) picker dialog */}
      {/* Company calendar picker dialog */}
      <Dialog open={openCompanyCalendarDialog} onClose={handleCloseCompanyCalendarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกปฏิทินการทำงาน</DialogTitle>
        <DialogContent dividers>
          {companyCalendarLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : companyCalendarError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{companyCalendarError}</Typography></Box>
          ) : companyCalendarList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลปฏิทินการทำงาน</Typography></Box>
          ) : (
            <Table size='small' sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              <TableBody>
                {companyCalendarList.map((c) => (
                  <TableRow key={c.id} hover onClick={() => handleSelectCompanyCalendar(c)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{c.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompanyCalendarDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openUnitDialog} onClose={handleCloseUnitDialog} maxWidth="md" fullWidth>
        <DialogTitle>เลือกหน่วยงาน</DialogTitle>
        <DialogContent dividers>
          {unitLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : unitError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{unitError}</Typography></Box>
          ) : unitList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลหน่วยงาน</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อหน่วยงาน</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {unitList.map((u) => (
                  <TableRow key={u.id} hover onClick={() => handleSelectUnit(u)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{u.dept_id || ''} - {u.dept_name || u.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnitDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>


      {/* Shift picker dialog */}
      <Dialog open={openShiftDialog} onClose={handleCloseShiftDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกกะ</DialogTitle>
        <DialogContent dividers>
          {shiftLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
          ) : shiftError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{shiftError}</Typography></Box>
          ) : shiftList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูลกะ</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {shiftList.map((s) => (
                  <TableRow key={s.id} hover onClick={() => handleSelectShift(s)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{s.shift_code || ''} - {s.shift_name || s.label} ({s.shift_type || ''})</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShiftDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>


      {/* Race picker dialog (loads from 'race' table) */}
      <Dialog open={openRaceDialog} onClose={handleCloseRaceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกเชื้อชาติ</DialogTitle>
        <DialogContent dividers>
          {nationalityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}></Box>
          ) : nationalityError ? (
            <Box sx={{ p: 2 }}><Typography color="error">{nationalityError}</Typography></Box>
          ) : nationalityList.length === 0 ? (
            <Box sx={{ p: 2 }}><Typography>ไม่พบข้อมูล</Typography></Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none !important' } }}>
              {/* <TableHead>
                <TableRow>
                  <TableCell>ชื่อ (ไทย)</TableCell>
                </TableRow>
              </TableHead> */}
              <TableBody>
                {nationalityList.map((r) => (
                  <TableRow key={`race-${r.id}`} hover onClick={() => handleSelectRace(r)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{r.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRaceDialog}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
