// ===== src/tpr/modules/projects/CreateProjectTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';

import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';

import CloseIcon from '@mui/icons-material/Close';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { styled } from '@mui/material/styles';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import dayjs from 'dayjs';
import 'dayjs/locale/th';

import Projects from '../../functions/Projects';
import { useNotify } from '../../contexts/notifyContext';

const BRAND = '#ff4059';

// ===== random colors set (ตามที่ให้มา) =====
const RANDOM_COLORS = ['#3B82F6', '#8B5CF6', '#08d84c', '#fdca01', '#ff4059'];

/* ========= Custom Radio (Blueprint-like) ========= */
function createBpRadio(color) {
  const BpIcon = styled('span')(({ theme }) => ({
    borderRadius: '50%',
    width: 16,
    height: 16,
    boxShadow: 'inset 0 0 0 1px rgba(16,22,26,.20), inset 0 -1px 0 rgba(16,22,26,.10)',
    backgroundColor: '#f5f8fa',
    backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',

    '.Mui-focusVisible &': {
      outline: `2px auto ${color}99`,
      outlineOffset: 2,
    },

    'input:hover ~ &': {
      backgroundColor: '#ebf1f5',
    },

    'input:disabled ~ &': {
      boxShadow: 'none',
      background: 'rgba(206,217,224,.5)',
    },

    ...(theme.palette.mode === 'dark'
      ? {
          boxShadow: '0 0 0 1px rgb(16 22 26 / 40%)',
          backgroundColor: '#394b59',
          backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))',
          'input:hover ~ &': { backgroundColor: '#30404d' },
          'input:disabled ~ &': { background: 'rgba(57,75,89,.5)' },
        }
      : null),
  }));

  const BpCheckedIcon = styled(BpIcon)({
    backgroundColor: color,
    backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.12),hsla(0,0%,100%,0))',
    '&::before': {
      display: 'block',
      width: 16,
      height: 16,
      backgroundImage: 'radial-gradient(#fff,#fff 28%,transparent 32%)',
      content: '""',
    },
    'input:hover ~ &': {
      backgroundColor: color,
      filter: 'brightness(0.92)',
    },
  });

  function BpRadio(props) {
    return (
      <Radio
        disableRipple
        color="default"
        checkedIcon={<BpCheckedIcon />}
        icon={<BpIcon />}
        {...props}
      />
    );
  }

  return BpRadio;
}

// ===== helpers =====
const asArray = (v) => (Array.isArray(v) ? v : []);

function pickTeamIdsFromForm(form) {
  // รองรับหลาย key เผื่อของเดิม/ตอน edit ส่งมาไม่เหมือนกัน
  const keys = [
    'initial_team_ids',
    'team_member_ids',
    'member_ids',
    'project_member_ids',
    'project_team_ids',
    'team_ids',
    'members',
  ];
  for (const k of keys) {
    const v = form?.[k];
    if (Array.isArray(v) && v.length) return v;
  }
  // ถ้ามี array แต่เป็น [] ให้คืน [] แทน
  for (const k of keys) {
    const v = form?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export default function CreateProjectTab(props) {
  const notify = useNotify();

  const {
    dialogForm,
    handleDialogChange,

    employees,
    customers,

    supabase,
    onSavingChange,
    onCreated,

    dialogSaving,
    onCancel,
  } = props;

  dayjs.locale('th');

  const isEdit = !!dialogForm?.id;

  // ===== dialogs state =====
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState('');

  const [employeeDialogOpen, setEmployeeDialogOpen] = React.useState(false);
  const [employeePickerTarget, setEmployeePickerTarget] = React.useState('project_admin');
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  const [pmDialogOpen, setPmDialogOpen] = React.useState(false);
  const [pmSelection, setPmSelection] = React.useState(asArray(dialogForm?.project_manager_ids));

  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false);
  const [teamSelection, setTeamSelection] = React.useState(pickTeamIdsFromForm(dialogForm));
  const [teamSearch, setTeamSearch] = React.useState('');

  // ✅ sync ตอนเปิดแก้ไข / form เปลี่ยน
  React.useEffect(() => {
    setPmSelection(asArray(dialogForm?.project_manager_ids));
  }, [dialogForm?.project_manager_ids]);

  React.useEffect(() => {
    setTeamSelection(pickTeamIdsFromForm(dialogForm));
  }, [
    dialogForm?.initial_team_ids,
    dialogForm?.team_member_ids,
    dialogForm?.member_ids,
    dialogForm?.project_member_ids,
    dialogForm?.project_team_ids,
    dialogForm?.team_ids,
    dialogForm?.members,
  ]);

  React.useEffect(() => {
    try {
      if (Projects && typeof Projects.init === 'function') Projects.init();
    } catch {
      // ignore
    }
  }, []);

  // ===== focus border ต้องเป็นสีดำ =====
  const pageSx = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider', transition: 'border-color 120ms ease' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'common.black' },
  };

  // ✅ dialog input border ให้เหมือน TeamsTab (divider ตลอด)
  const inputSx = React.useMemo(
    () => ({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
    }),
    []
  );

  const flatBtnSx = { boxShadow: 'none', '&:hover': { boxShadow: 'none' } };
  const flatIconBtnSx = { boxShadow: 'none' };

  // ===== random color mapping สำหรับ radio (สุ่มครั้งเดียวต่อ mount) =====
  const contractOptions = React.useMemo(() => ['Fixed Fee', 'T&M', 'Retainer', 'Internal'], []);
  const contractColorMap = React.useMemo(() => {
    const shuffled = [...RANDOM_COLORS].sort(() => Math.random() - 0.5);
    const map = {};
    contractOptions.forEach((opt, idx) => {
      map[opt] = shuffled[idx % shuffled.length];
    });
    return map;
  }, [contractOptions]);

  const RadioFixedFee = React.useMemo(() => createBpRadio(contractColorMap['Fixed Fee'] || BRAND), [contractColorMap]);
  const RadioTM = React.useMemo(() => createBpRadio(contractColorMap['T&M'] || BRAND), [contractColorMap]);
  const RadioRetainer = React.useMemo(() => createBpRadio(contractColorMap['Retainer'] || BRAND), [contractColorMap]);
  const RadioInternal = React.useMemo(() => createBpRadio(contractColorMap['Internal'] || BRAND), [contractColorMap]);

  const radioSx = {
    '& .MuiFormControlLabel-root': { mr: 2, mb: 0.5 },
    '& .MuiFormControlLabel-label': { fontSize: 14, fontWeight: 700 },
  };

  const formatEmployee = (emp) => {
    if (!emp) return '';
    const th = `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
    if (th) return th;
    return `${emp.title_th || ''} ${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim();
  };

  const generateProjectCode = () => `PRJ-${dayjs().format('YYMMDD-HHmmss')}`;

  const notifyFirstError = (errorsObj, fallback = 'กรุณาตรวจสอบข้อมูล') => {
    const errs = errorsObj && typeof errorsObj === 'object' ? Object.values(errorsObj).filter(Boolean) : [];
    if (!errs.length) return notify.warning(fallback);
    const first = String(errs[0]);
    if (errs.length === 1) notify.warning(first);
    else notify.warning(`${first} (และอีก ${errs.length - 1} รายการ)`);
  };

  const setSaving = (v) => {
    if (typeof onSavingChange === 'function') onSavingChange(!!v);
  };

  // ===== Display helpers =====

  // ✅ Project Admin display (แก้ปัญหา edit แล้วไม่โชว์)
  const projectAdminId = dialogForm?.project_admin_id || dialogForm?.principal_id || null;
  const projectAdminDisplay = React.useMemo(() => {
    const fromText = String(dialogForm?.projectAdmin || '').trim();
    if (fromText) return fromText;
    if (!projectAdminId) return '';
    const e = (employees || []).find((x) => String(x.id) === String(projectAdminId));
    return e ? formatEmployee(e) : '';
  }, [dialogForm?.projectAdmin, projectAdminId, employees]);

  const pmCount = (pmSelection || []).length;
  const pmDisplay =
    pmCount === 0
      ? ''
      : pmCount === 1
        ? (() => {
            const e = (employees || []).find((x) => String(x.id) === String(pmSelection[0]));
            return e ? formatEmployee(e) : '';
          })()
        : `เลือกแล้ว ${pmCount} คน`;

  // ✅ team display (แก้ปัญหา edit แล้วไม่โชว์)
  const effectiveTeamIds = teamSelection || [];
  const teamCount = (effectiveTeamIds || []).length;
  const teamDisplay =
    teamCount === 0
      ? ''
      : teamCount === 1
        ? (() => {
            const id0 = (effectiveTeamIds || [])[0];
            const e = (employees || []).find((x) => String(x.id) === String(id0));
            return e ? formatEmployee(e) : '';
          })()
        : `เลือกแล้ว ${teamCount} คน`;

  const normalize = (s) => String(s || '').toLowerCase();
  const filterEmployees = (list, q) => {
    const qq = normalize(q).trim();
    const arr = Array.isArray(list) ? list : [];
    if (!qq) return arr;
    return arr.filter((emp) => {
      const th = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
      const en = `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim();
      const code = String(emp.employee_code || '');
      const email = String(emp.email || '');
      const blob = [th, en, code, email, emp.id].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(qq);
    });
  };

  const filteredTeamEmployees = React.useMemo(() => filterEmployees(employees, teamSearch), [employees, teamSearch]);
  const filteredPmEmployees = React.useMemo(() => filterEmployees(employees, employeeSearch), [employees, employeeSearch]);

  const filteredCustomers = React.useMemo(() => {
    const q = normalize(customerSearch).trim();
    const list = Array.isArray(customers) ? customers : [];
    if (!q) return list;
    return list.filter((c) => {
      const blob = [c.name_th, c.name_en, c.customer_id, c.id].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [customers, customerSearch]);

  const handleSaveClick = async () => {
    // ✅ edit: ใช้ code เดิมเป็นหลัก / create: gen code
    const safeCode = (dialogForm.code || dialogForm.project_code || '').trim() || generateProjectCode();
    if (!dialogForm.code) handleDialogChange('code', safeCode);

    const syncedPm =
      Array.isArray(dialogForm.project_manager_ids) && dialogForm.project_manager_ids.length
        ? dialogForm.project_manager_ids
        : (pmSelection || []);
    handleDialogChange('project_manager_ids', Array.isArray(syncedPm) ? syncedPm : []);

    // ✅ ใช้ teamSelection เป็น source of truth ของหน้าจอนี้ (แก้ปัญหา edit แล้วค่าไม่ขึ้น)
    const syncedTeam = Array.isArray(teamSelection) ? teamSelection : [];
    handleDialogChange('initial_team_ids', syncedTeam);

    // ✅ validate
    const localErrors = {};
    if (!String(dialogForm.name || '').trim()) localErrors.name = 'กรุณากรอกชื่อโครงการ';
    if (!dialogForm.customer_id) localErrors.customer_id = 'กรุณาเลือกลูกค้า';
    if (!dialogForm.project_admin_id && !dialogForm.principal_id) localErrors.project_admin_id = 'กรุณาเลือก Project Admin';
    if (!Array.isArray(syncedPm) || syncedPm.length < 1) localErrors.project_manager_ids = 'กรุณาเลือก Project Manager อย่างน้อย 1 คน';

    const budgetNum = Number(String(dialogForm.budget ?? '').replace(/,/g, ''));
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) localErrors.budget = 'กรุณากรอกงบประมาณให้ถูกต้อง';

    if (!String(dialogForm.start || '').trim()) localErrors.start = 'กรุณาเลือกวันที่เริ่มโครงการ';

    // ✅ create เท่านั้นที่บังคับทีมเริ่มต้น
    if (!isEdit) {
      if (!Array.isArray(syncedTeam) || syncedTeam.length < 1) localErrors.initial_team_ids = 'กรุณาเลือกสมาชิกในโครงการอย่างน้อย 1 คน';
    }

    if (Object.keys(localErrors).length) {
      notifyFirstError(localErrors, 'กรุณาตรวจสอบข้อมูลก่อนบันทึก');
      return;
    }

    const toValidate = {
      ...dialogForm,
      id: dialogForm.id || null,
      code: safeCode,
      project_manager_ids: syncedPm,
      initial_team_ids: syncedTeam,
      project_admin_id: dialogForm.project_admin_id || dialogForm.principal_id || null,
      __mode: isEdit ? 'update' : 'create',
    };

    const v = Projects?.validateCreateForm ? Projects.validateCreateForm(toValidate) : { ok: true, errors: {} };
    if (v && v.ok === false) {
      notifyFirstError(v.errors || {}, 'กรุณาตรวจสอบข้อมูลก่อนบันทึก');
      return;
    }

    if (!supabase) return notify.error('ไม่พบ supabase client (props.supabase)');

    setSaving(true);
    try {
      const contractType = dialogForm.contract_type || 'Fixed Fee';
      const projectAdminId2 = dialogForm.project_admin_id || dialogForm.principal_id || null;

      const payload = {
        project_code: safeCode,
        name_th: dialogForm.name || '',
        name_en: dialogForm.name_en || '',
        description: dialogForm.description || null,

        customer_id: dialogForm.customer_id || null,
        customer_code: dialogForm.customer_code || '',
        customer_name: dialogForm.customer_name || dialogForm.client || '',

        start_date: dialogForm.start || null,
        end_date: dialogForm.end || null,

        project_admin_id: projectAdminId2,
        principal_id: projectAdminId2,

        project_manager_ids: Array.isArray(syncedPm) ? syncedPm : [],
        manager_ids: Array.isArray(syncedPm) ? syncedPm : [],

        parent_project_id: dialogForm.parent_project_id === 'MAIN' ? null : (dialogForm.parent_project_id || null),

        contract_type: contractType,
        project_type: dialogForm.project_type || contractType,

        budget: Number(String(dialogForm.budget ?? '').replace(/,/g, '')) || 0,
        status: dialogForm.status || 'Planning',

        tags: dialogForm.tags || null,
        archived: !!dialogForm.archived,
      };

      // ===== ✅ create / update =====
      let saved = null;
      if (isEdit) {
        const id = dialogForm.id;
        const { data, error } = await supabase
          .from('tpr_projects')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        saved = data;

        // ถ้ามี flow update ทีมในตารางอื่น ให้ไปทำใน helper นี้ได้
        try {
          if (Projects && typeof Projects.afterUpdateProject === 'function') {
            await Projects.afterUpdateProject({
              supabase,
              project: saved,
              initial_team_ids: syncedTeam,
              project_manager_ids: syncedPm,
              project_admin_id: payload.project_admin_id,
            });
          }
        } catch (postErr) {
          console.warn('afterUpdateProject failed (ignored):', postErr);
        }
      } else {
        const { data, error } = await supabase.from('tpr_projects').insert([payload]).select().single();
        if (error) throw error;
        saved = data;

        // ✅ create เท่านั้น: สร้างทีมเริ่มต้น / งานหลังสร้าง
        try {
          if (Projects && typeof Projects.afterCreateProject === 'function') {
            await Projects.afterCreateProject({
              supabase,
              project: saved,
              initial_team_ids: syncedTeam,
              project_manager_ids: syncedPm,
              project_admin_id: payload.project_admin_id,
            });
          } else if (Projects && typeof Projects.createInitialTeam === 'function') {
            await Projects.createInitialTeam({ supabase, projectId: saved?.id, teamIds: syncedTeam });
          }
        } catch (postErr) {
          console.warn('afterCreateProject/createInitialTeam failed (ignored):', postErr);
        }
      }

      notify.success(isEdit ? 'บันทึกการเปลี่ยนแปลงเรียบร้อย' : 'บันทึกข้อมูลเรียบร้อย');
      if (typeof onCreated === 'function') onCreated(saved);
    } catch (err) {
      console.error('Failed to save project', err);
      notify.error(err?.message || 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  const contractValue = dialogForm.contract_type || 'Fixed Fee';

  return (
    <Box sx={{ maxWidth: 980, width: '100%', mx: 'auto', ...pageSx }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {isEdit ? 'แก้ไขโครงการ' : 'สร้างโครงการ'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'แก้ไขข้อมูลพื้นฐานของโครงการ' : 'กำหนดข้อมูลพื้นฐานของโครงการ (ใช้เวลาไม่เกิน 3–5 นาที)'}
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>ข้อมูลโครงการ</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="ชื่อโครงการ *"
              size="small"
              fullWidth
              value={dialogForm.name || ''}
              onChange={(e) => handleDialogChange('name', e.target.value)}
              error={false}
              helperText=""
            />

            <TextField
              label="ลูกค้า *"
              size="small"
              fullWidth
              value={dialogForm.client || ''}
              error={false}
              helperText=""
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCustomerDialogOpen(true);
                        setCustomerSearch('');
                      }}
                      sx={flatIconBtnSx}
                    >
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* radio แบบ custom + สีสุ่ม */}
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>ประเภทโครงการ</Typography>
            <FormControl sx={radioSx} component="fieldset">
              <RadioGroup
                row
                value={contractValue}
                onChange={(e) => {
                  const v = e.target.value;
                  handleDialogChange('contract_type', v);
                  handleDialogChange('project_type', v);
                }}
                sx={{ mt: 0.5, gap: 2, flexWrap: 'wrap' }}
              >
                <FormControlLabel
                  value="Fixed Fee"
                  control={<RadioFixedFee />}
                  label="Fixed Fee"
                  sx={contractValue === 'Fixed Fee' ? { color: contractColorMap['Fixed Fee'] } : null}
                />
                <FormControlLabel
                  value="T&M"
                  control={<RadioTM />}
                  label="T&M"
                  sx={contractValue === 'T&M' ? { color: contractColorMap['T&M'] } : null}
                />
                <FormControlLabel
                  value="Retainer"
                  control={<RadioRetainer />}
                  label="Retainer"
                  sx={contractValue === 'Retainer' ? { color: contractColorMap['Retainer'] } : null}
                />
                <FormControlLabel
                  value="Internal"
                  control={<RadioInternal />}
                  label="Internal"
                  sx={contractValue === 'Internal' ? { color: contractColorMap['Internal'] } : null}
                />
              </RadioGroup>
            </FormControl>
          </Box>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>ความรับผิดชอบ</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Project Admin *"
              size="small"
              fullWidth
              value={projectAdminDisplay}
              error={false}
              helperText=""
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEmployeePickerTarget('project_admin');
                        setEmployeeDialogOpen(true);
                        setEmployeeSearch('');
                      }}
                      sx={flatIconBtnSx}
                    >
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Project Manager *"
              size="small"
              fullWidth
              value={pmDisplay}
              error={false}
              helperText=""
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPmDialogOpen(true);
                        setEmployeeSearch('');
                      }}
                      sx={flatIconBtnSx}
                    >
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>งบประมาณ</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="งบประมาณ *"
              size="small"
              fullWidth
              type="number"
              value={dialogForm.budget || ''}
              onChange={(e) => handleDialogChange('budget', e.target.value)}
              inputProps={{ step: '0.01', min: 0 }}
              error={false}
              helperText=""
            />

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker
                value={dialogForm.start ? dayjs(dialogForm.start) : null}
                onChange={(v) => handleDialogChange('start', v ? v.format('YYYY-MM-DD') : '')}
                slotProps={{
                  textField: {
                    label: 'วันที่เริ่มโครงการ *',
                    size: 'small',
                    fullWidth: true,
                    error: false,
                    helperText: '',
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>สมาชิกในโครงการ</Typography>

          <TextField
            size="small"
            fullWidth
            value={teamDisplay}
            label="สมาชิกในโครงการ *"
            error={false}
            helperText=""
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setTeamDialogOpen(true);
                      setTeamSearch('');
                    }}
                    sx={flatIconBtnSx}
                  >
                    <SearchRoundedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, bgcolor: 'background.default' }}>
          <Button disableElevation onClick={onCancel} sx={{ color: 'common.black', ...flatBtnSx }}>
            ยกเลิก
          </Button>

          <Button
            disableElevation
            variant="contained"
            onClick={handleSaveClick}
            disabled={!!dialogSaving}
            startIcon={isEdit ? <CheckCircleIcon /> : <AddCircleIcon />}
            sx={{
              borderRadius: 1,
              bgcolor: BRAND,
              ...flatBtnSx,
              '&:hover': { bgcolor: '#ff2f4f', ...flatBtnSx['&:hover'] },
              '&.Mui-disabled': { bgcolor: 'rgba(255,64,89,0.35)', color: 'rgba(255,255,255,0.9)' },
            }}
          >
            {dialogSaving ? 'บันทึก...' : (isEdit ? 'บันทึก' : 'สร้างโครงการ')}
          </Button>
        </Box>
      </Paper>

      {/* ===== Customer Dialog ===== */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          เลือกลูกค้า
          <IconButton onClick={() => setCustomerDialogOpen(false)} sx={flatIconBtnSx}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ mt: 0.5, maxHeight: 420, overflow: 'auto' }}>
            {filteredCustomers.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => {
                  handleDialogChange('customer_id', c.id || null);
                  handleDialogChange('client', c.name_th || c.name_en || '');
                  handleDialogChange('clientTitle', c.customer_id || '');
                  handleDialogChange('customer_code', c.customer_id || '');
                  handleDialogChange('customer_name', c.name_th || c.name_en || '');
                  setCustomerDialogOpen(false);
                }}
              >
                <ListItemText primary={c.name_th || c.name_en || ''} secondary={c.customer_id || ''} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button onClick={() => setCustomerDialogOpen(false)} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Project Admin Dialog ===== */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          เลือก Project Admin
          <IconButton onClick={() => setEmployeeDialogOpen(false)} sx={flatIconBtnSx}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ mt: 0.5, maxHeight: 420, overflow: 'auto' }}>
            {filterEmployees(employees, employeeSearch).map((emp) => (
              <ListItemButton
                key={emp.id}
                onClick={() => {
                  if (employeePickerTarget === 'project_admin') {
                    handleDialogChange('project_admin_id', emp.id);
                    handleDialogChange('projectAdmin', formatEmployee(emp));
                    handleDialogChange('projectAdminTitle', emp.title_th || '');

                    // compat
                    handleDialogChange('principal_id', emp.id);
                    handleDialogChange('principal', formatEmployee(emp));
                    handleDialogChange('principalTitle', emp.title_th || '');
                  }
                  setEmployeeDialogOpen(false);
                }}
              >
                <ListItemText primary={formatEmployee(emp)} secondary={emp.employee_code || ''} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button onClick={() => setEmployeeDialogOpen(false)} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== PM Dialog ===== */}
      <Dialog open={pmDialogOpen} onClose={() => setPmDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          เลือก Project Manager
          <IconButton onClick={() => setPmDialogOpen(false)} sx={flatIconBtnSx}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ mt: 0.5, maxHeight: 420, overflow: 'auto' }}>
            {filteredPmEmployees.map((emp) => {
              const idKey = emp.id;
              const checked = (pmSelection || []).some((x) => String(x) === String(idKey));
              return (
                <ListItemButton
                  key={idKey}
                  onClick={() => {
                    let next = [];
                    if (checked) next = (pmSelection || []).filter((x) => String(x) !== String(idKey));
                    else next = [...(pmSelection || []), idKey];
                    setPmSelection(next);
                  }}
                >
                  <ListItemIcon>
                    <Checkbox size="small" color="error" checked={checked} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemText primary={formatEmployee(emp)} secondary={emp.employee_code || ''} />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button onClick={() => setPmDialogOpen(false)} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              const list = pmSelection || [];
              handleDialogChange('project_manager_ids', list);
              handleDialogChange('manager_ids', list);
              const firstEmp = (employees || []).find((e) => String(e.id) === String(list[0]));
              handleDialogChange('manager', firstEmp ? formatEmployee(firstEmp) : '');
              setPmDialogOpen(false);
            }}
            disableElevation
          >
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Team Dialog ===== */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          เลือกสมาชิกในโครงการ
          <IconButton onClick={() => setTeamDialogOpen(false)} sx={flatIconBtnSx}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ mt: 0.5, maxHeight: 420, overflow: 'auto' }}>
            {filteredTeamEmployees.map((emp) => {
              const idKey = emp.id;
              const checked = (teamSelection || []).some((x) => String(x) === String(idKey));
              return (
                <ListItemButton
                  key={idKey}
                  onClick={() => {
                    let next = [];
                    if (checked) next = (teamSelection || []).filter((x) => String(x) !== String(idKey));
                    else next = [...(teamSelection || []), idKey];
                    setTeamSelection(next);
                  }}
                >
                  <ListItemIcon>
                    <Checkbox size="small" color="error" checked={checked} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemText primary={formatEmployee(emp)} secondary={emp.employee_code || ''} />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button onClick={() => setTeamDialogOpen(false)} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              // ✅ เขียนกลับ form เพื่อให้จุดอื่นอ่านได้ และให้ save ใช้ทันที
              handleDialogChange('initial_team_ids', teamSelection || []);
              setTeamDialogOpen(false);
            }}
            disableElevation
          >
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
