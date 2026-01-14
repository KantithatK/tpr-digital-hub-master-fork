import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../../../lib/supabaseClient';

export default function ProjectGeneralPanel({ project, onUpdated }) {
  const [form, setForm] = React.useState({
    project_code: '',
    name_th: '',
    customer_id: null,
    customer_name: '',
    manager_id: null,
    manager: '',
    principal_id: null,
    principal: '',
    parent_project_id: 'MAIN',
    start_date: '',
    end_date: '',
    status: 'Planning',
  });
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState('');
  const [customers, setCustomers] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [employeeSearch, setEmployeeSearch] = React.useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = React.useState(false);
  const [employeePickerTarget, setEmployeePickerTarget] = React.useState(null); // 'manager' | 'principal'
  dayjs.locale('th');

  React.useEffect(() => {
    if (!project) return;

    const normalizeEmployeeField = (fieldVal) => {
      if (!fieldVal) return { id: null, name: '' };
      if (typeof fieldVal === 'object') {
        return { id: fieldVal.id || fieldVal.employee_id || fieldVal.employee_code || null, name: formatEmployee(fieldVal) };
      }
      const s = String(fieldVal || '').trim();
      // If all digits, treat as id; otherwise treat as name
      if (/^\d+$/.test(s)) return { id: fieldVal, name: '' };
      return { id: null, name: s };
    };

    const mgrNorm = normalizeEmployeeField(project.manager);
    const prNorm = normalizeEmployeeField(project.principal);

    const custName = project.customer_name || (project.customer && (project.customer.name_th || project.customer.name_en)) || '';
    const custId = project.customer_id || (project.customer && (project.customer.id || project.customer.customer_id)) || null;

    const normParentId = (() => {
      if (!project) return 'MAIN';
      // handle different shapes: uuid string, numeric id, or object with id
      const raw = project.parent_project_id ?? project.parent_id ?? null;
      if (!raw) return 'MAIN';
      if (typeof raw === 'object') return String(raw.id || raw.project_id || raw.parent_project_id || 'MAIN');
      return String(raw);
    })();

    setForm({
      project_code: project.project_code || project.code || '',
      name_th: project.name_th || project.name || project.name_en || '',
      customer_id: custId,
      customer_name: custName,
      manager_id: project.manager_id || mgrNorm.id || null,
      manager: (typeof project.manager === 'string' ? project.manager : (mgrNorm.name || '')),
      principal_id: project.principal_id || prNorm.id || null,
      principal: (typeof project.principal === 'string' ? project.principal : (prNorm.name || '')),
      parent_project_id: normParentId,
      start_date: project.start_date || project.start || '',
      end_date: project.end_date || project.end || '',
      status: project.status || 'Planning',
    });
    setDirty(false);
    setError('');
  }, [project]);

  // When employees are loaded, if manager/principal IDs exist but display names are empty,
  // populate the display names (but do not overwrite when user has made edits — respect `dirty`).
  React.useEffect(() => {
    if (!project) return;
    if (dirty) return; // don't override user's in-progress edits
    setForm(prev => {
      let changed = false;
      const next = { ...prev };

      const findEmpName = (id) => {
        if (!id) return null;
        const emp = employees.find(e => (e?.id == id || e?.employee_id == id || e?.employee_code == id));
        return emp ? formatEmployee(emp) : null;
      };

      if ((!next.manager || next.manager === '') && next.manager_id) {
        const name = findEmpName(next.manager_id);
        if (name) { next.manager = name; changed = true; }
      }
      if ((!next.principal || next.principal === '') && next.principal_id) {
        const name = findEmpName(next.principal_id);
        if (name) { next.principal = name; changed = true; }
      }

      return changed ? next : prev;
    });
  }, [employees, project, dirty]);

  // load customers + employees + projects (simple, no pagination)
  const [otherProjects, setOtherProjects] = React.useState([]);
  const [fallbackParentLabel, setFallbackParentLabel] = React.useState(null);
  const [parentCode, setParentCode] = React.useState(null);
  const [parentLoading, setParentLoading] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [custRes, empRes, projRes] = await Promise.all([
          supabase.from('tpr_customers').select('*').order('created_at', { ascending: false }).limit(1000),
          supabase.from('employees').select('*').order('employee_code', { ascending: true }).limit(1000),
          supabase.from('tpr_projects').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        if (!mounted) return;
        if (!custRes.error) setCustomers(custRes.data || []);
        if (!empRes.error) setEmployees(empRes.data || []);
        if (!projRes.error) setOtherProjects(projRes.data || []);
      } catch (e) {
        console.error('Failed to load customers/employees/projects', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If the selected parent isn't in otherProjects, fetch it so we can show a proper label
  React.useEffect(() => {
    const selectedParentId = (form.parent_project_id ?? 'MAIN');
    if (!selectedParentId || selectedParentId === 'MAIN') { setFallbackParentLabel(null); setParentCode(null); return; }
    const exists = (otherProjects || []).some(pp => String(pp.id) === String(selectedParentId));
    if (exists) { setFallbackParentLabel(null); return; }
    let mounted = true;
    (async () => {
      try {
        // debug logging removed
        const { data, error } = await supabase.from('tpr_projects').select('*').eq('id', selectedParentId).limit(1).single();
        if (!mounted) return;
        if (!error && data) {
          const labelCode = data.project_code || data.code || data.name_th || data.name || String(data.id);
          // debug logging removed
          // store only the code/name (per requirement: show 'โครงการย่อยของ + รหัสโครงการหลัก')
          setFallbackParentLabel(String(labelCode));
        }
      } catch (e) {
        console.error('Failed to fetch parent project fallback', e);
      }
    })();
    return () => { mounted = false; };
  }, [form.parent_project_id, otherProjects]);

  // Always try to fetch the parent project's code (project_code) by UUID so we display it instead of raw id.
  React.useEffect(() => {
    const pid = (form.parent_project_id ?? 'MAIN');
    if (!pid || pid === 'MAIN') { setParentCode(null); return; }
    let mounted = true;
    (async () => {
      try {
        setParentLoading(true);
        // debug logging removed
        const { data, error } = await supabase.from('tpr_projects').select('*').eq('id', pid).limit(1).single();
        if (!mounted) return;
        if (!error && data) {
          // prefer project_code, then code; fall back to other fields if available
          const resolved = data.project_code || data.code || (data.name_th) || (data.name) || null;
          // debug logging removed
          setParentCode(resolved || null);
        } else {
          // debug logging removed
          setParentCode(null);
        }
      } catch (e) {
        console.error('Failed to fetch parent project code', e);
        setParentCode(null);
      } finally {
        setParentLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [form.parent_project_id]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const formatEmployee = (emp) => {
    if (!emp) return '';
    const thParts = [(emp.first_name_th || ''), (emp.last_name_th || '')].map(s => (s || '').trim()).filter(Boolean);
    if (thParts.length) return thParts.join(' ');
    const enParts = [(emp.title_en || ''), (emp.first_name_en || ''), (emp.last_name_en || '')].map(s => (s || '').trim()).filter(Boolean);
    if (enParts.length) return enParts.join(' ');
    const nick = (emp.nickname_th || emp.nickname_en || '').trim();
    if (nick) return nick;
    return (emp.employee_code || emp.employee_id || emp.id || '').toString();
  };

  const displayedCustomers = React.useMemo(() => {
    const q = (customerSearch || '').trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => {
      const nameTh = (c?.name_th || '').toLowerCase();
      const nameEn = (c?.name_en || '').toLowerCase();
      const cid = (c?.customer_id || '').toLowerCase();
      return nameTh.includes(q) || nameEn.includes(q) || cid.includes(q);
    });
  }, [customers, customerSearch]);

  const displayedEmployees = React.useMemo(() => {
    const q = (employeeSearch || '').trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e => {
      const nameStr = (formatEmployee(e) || '').toLowerCase();
      const code = ((e?.employee_code || e?.employee_id || e?.id) || '').toString().toLowerCase();
      return nameStr.includes(q) || code.includes(q);
    });
  }, [employees, employeeSearch]);

  // Ensure we can show the currently selected parent even if it's not yet in `otherProjects`.
  const selectedParentId = (form.parent_project_id ?? 'MAIN');
  const selectedParentExists = (otherProjects || []).some(pp => String(pp.id) === String(selectedParentId));
  const selectedParentLabel = (() => {
    if (!selectedParentId || selectedParentId === 'MAIN') return 'โครงการหลัก';
    // Prefer looking up in otherProjects
    const found = (otherProjects || []).find(pp => String(pp.id) === String(selectedParentId));
    if (found) {
      // prefer project_code/code; show only the code per requirement
      return (found.project_code || found.code || String(found.id));
    }
    // If we fetched a fallback label from the server, use it
    if (parentCode) return parentCode;
    if (fallbackParentLabel) return fallbackParentLabel;
    // fallback: try several places on `project` that might contain parent details
    const rawObj = project?.parent_project ?? project?.parent ?? project?.parent_project_id ?? project?.parent_id ?? null;
    if (rawObj && typeof rawObj === 'object') return (rawObj.project_code || rawObj.code || String(rawObj.id));
    // also check for explicit parent code fields
    if (project?.parent_project_code) return String(project.parent_project_code);
    if (project?.parent_code) return String(project.parent_code);
    // last resort: show the id (may be UUID) but we prefer showing code when available
    return String(selectedParentId);
  })();

  const handleSave = async () => {
    if (!project?.id) return;
    if (!form.project_code || !form.name_th || !form.customer_name) {
      setError('กรุณากรอก รหัสโครงการ / ชื่อโครงการ / ลูกค้า');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        project_code: form.project_code,
        name_th: form.name_th,
        customer_id: form.customer_id || null,
        customer_name: form.customer_name || '',
        parent_project_id: (form.parent_project_id === 'MAIN') ? null : (form.parent_project_id || null),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        manager_id: form.manager_id || null,
        principal_id: form.principal_id || null,
        status: form.status,
      };
      const { data, error: dbError } = await supabase
        .from('tpr_projects')
        .update(payload)
        .eq('id', project.id)
        .select()
        .single();
      if (dbError) throw dbError;
      setDirty(false);
      if (typeof onUpdated === 'function') onUpdated(data);
    } catch (e) {
      console.error('Failed to update project', e);
      setError(e?.message || 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  if (!project) {
    return <Typography color="text.secondary">ยังไม่ได้เลือกโครงการ</Typography>;
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      // Make focused inputs/showers use a black outline and label
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
      '& .MuiInputLabel-root.Mui-focused': { color: '#000' },
      // smoother transition when border color changes
      '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { transition: 'border-color 150ms' },
    }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>ข้อมูลพื้นฐาน</Typography>
      <TextField
        size="small"
        label="รหัสโครงการ"
        value={form.project_code}
        onChange={(e) => setField('project_code', e.target.value)}
        fullWidth
      />
      <TextField
        size="small"
        label="ชื่อโครงการ"
        value={form.name_th}
        onChange={(e) => setField('name_th', e.target.value)}
        fullWidth
      />
      <TextField
        size="small"
        label="ลูกค้า"
        value={form.customer_name}
        onChange={(e) => setField('customer_name', e.target.value)}
        fullWidth
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => { setCustomerSearch(''); setCustomerDialogOpen(true); }} aria-label="เลือกลูกค้า"><MoreHorizIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        size="small"
        label="ผู้จัดการโครงการ"
        value={form.manager}
        onChange={(e) => setField('manager', e.target.value)}
        fullWidth
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => { setEmployeePickerTarget('manager'); setEmployeeSearch(''); setEmployeeDialogOpen(true); }} aria-label="เลือกผู้จัดการ"><MoreHorizIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        size="small"
        label="ผู้รับผิดชอบหลัก"
        value={form.principal}
        onChange={(e) => setField('principal', e.target.value)}
        fullWidth
        InputProps={{ 
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => { setEmployeePickerTarget('principal'); setEmployeeSearch(''); setEmployeeDialogOpen(true); }} aria-label="เลือกผู้รับผิดชอบหลัก"><MoreHorizIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ),
        }}
      />
      <FormControl size="small" fullWidth>
        <InputLabel id="proj-parent-inline-label">ความสัมพันธ์โครงการ</InputLabel>
        <Select
          labelId="proj-parent-inline-label"
          label="ความสัมพันธ์โครงการ"
          value={form.parent_project_id ?? 'MAIN'}
          onChange={(e) => setField('parent_project_id', e.target.value)}
          renderValue={(val) => {
            const v = val ?? 'MAIN';
              if (v === 'MAIN') return 'โครงการหลัก';
              if (parentLoading) return 'กำลังโหลด...';
              const codeToShow = parentCode || selectedParentLabel || v;
              return `โครงการย่อยของ ${codeToShow}`;
          }}
        >
          <MenuItem value="MAIN">โครงการหลัก</MenuItem>
          {/* If the selected parent isn't in the loaded list, show a fallback option so the Select displays a label */}
          {(selectedParentId && selectedParentId !== 'MAIN' && !selectedParentExists) && (
            <MenuItem value={selectedParentId}>{`โครงการย่อยของ ${selectedParentLabel}`}</MenuItem>
          )}
          {(otherProjects || []).map(pp => {
            if (!pp) return null;
            if (String(pp.id) === String(project?.id)) return null; // don't allow self
            const code = pp.project_code || pp.code || '';
            // show only project code when possible (fallback to id)
            let label = code ? String(code) : String(pp.id || pp.name_th || pp.name || '');
            // If this project is the selected parent, show it as a subproject relation
            if (String(pp.id) === String(selectedParentId)) label = `โครงการย่อยของ ${label}`;
            return (<MenuItem key={pp.id} value={String(pp.id)}>{label}</MenuItem>);
          })}
        </Select>
      </FormControl>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
        <DatePicker
          label="วันที่เริ่ม"
          value={form.start_date ? dayjs(form.start_date) : null}
          onChange={(v) => setField('start_date', v ? v.format('YYYY-MM-DD') : '')}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <DatePicker
          label="วันที่สิ้นสุด"
          value={form.end_date ? dayjs(form.end_date) : null}
          onChange={(v) => setField('end_date', v ? v.format('YYYY-MM-DD') : '')}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </LocalizationProvider>
      <FormControl size="small" fullWidth>
        <InputLabel id="proj-status-inline-label">สถานะโครงการ</InputLabel>
        <Select
          labelId="proj-status-inline-label"
          label="สถานะโครงการ"
          value={form.status}
          onChange={(e) => setField('status', e.target.value)}
        >
          <MenuItem value="Planning">🌱 อยู่ระหว่างวางแผน</MenuItem>
          <MenuItem value="Active">🌳 กำลังดำเนินการ</MenuItem>
          <MenuItem value="Completed">🌴 โครงการเสร็จสิ้น</MenuItem>
        </Select>
      </FormControl>
      {error && <Typography variant="body2" color="error">{error}</Typography>}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button
          onClick={() => {
            if (!project) return;
            const rawParent = project.parent_project_id ?? project.parent_id ?? null;
            const resetParent = (!rawParent) ? 'MAIN' : (typeof rawParent === 'object' ? String(rawParent.id || rawParent.project_id || rawParent.parent_project_id || 'MAIN') : String(rawParent));
            setForm({
              project_code: project.project_code || project.code || '',
              name_th: project.name_th || project.name || project.name_en || '',
              customer_id: project.customer_id || null,
              customer_name: project.customer_name || '',
              manager_id: project.manager_id || project.manager || null,
              manager: project.manager || '',
              principal_id: project.principal_id || project.principal || null,
              principal: project.principal || '',
              parent_project_id: resetParent,
              start_date: project.start_date || project.start || '',
              end_date: project.end_date || project.end || '',
              status: project.status || 'Planning'
            });
            setDirty(false); setError('');
          }}
          disabled={!dirty || saving}
          sx={{ color: '#000' }}
        >ยกเลิก</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!dirty || saving}
          sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' }, '&.Mui-disabled': { bgcolor: '#000', opacity: 0.5, color: '#fff' } }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: '#d32f2f' }} /> : 'บันทึกการเปลี่ยนแปลง'}
        </Button>
      </Box>

      {/* Customer Picker Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Box component="span" sx={{ fontWeight: 600 }}>เลือกลูกค้า</Box>
          <IconButton size="small" onClick={() => setCustomerDialogOpen(false)} aria-label="ปิด"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 1 }}>
            <TextField size="small" placeholder="ค้นหา ลูกค้า" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} fullWidth autoFocus />
          </Box>
          <List>
            {(displayedCustomers || []).length === 0 && <ListItem><ListItemText primary={(customers && customers.length > 0) ? 'ไม่พบลูกค้า' : 'ยังไม่มีลูกค้า'} /></ListItem>}
            {(displayedCustomers || []).map(cust => {
              const display = (cust?.name_th || cust?.name_en || cust?.customer_id || '').toString().trim();
              const key = cust?.id || cust?.customer_id || display;
              return (
                <ListItem key={key} disablePadding>
                  <ListItemButton onClick={() => {
                    setForm(prev => ({ ...prev, customer_id: cust?.id || cust?.customer_id, customer_name: display }));
                    setDirty(true);
                    setCustomerDialogOpen(false);
                  }}>
                    <ListItemText primary={display} secondary={cust?.customer_id || ''} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>

      {/* Employee Picker Dialog */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Box component="span" sx={{ fontWeight: 600 }}>เลือกพนักงาน</Box>
          <IconButton size="small" onClick={() => setEmployeeDialogOpen(false)} aria-label="ปิด"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 1 }}>
            <TextField size="small" placeholder="ค้นหา พนักงาน" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} fullWidth autoFocus />
          </Box>
          <List>
            {(displayedEmployees || []).length === 0 && <ListItem><ListItemText primary={(employees && employees.length > 0) ? 'ไม่พบพนักงาน' : 'ยังไม่มีพนักงาน'} /></ListItem>}
            {(displayedEmployees || []).map(emp => {
              const display = formatEmployee(emp);
              const key = emp?.id || emp?.employee_code || emp?.employee_id || display;
              return (
                <ListItem key={key} disablePadding>
                  <ListItemButton onClick={() => {
                    if (employeePickerTarget === 'manager') {
                      setForm(prev => ({ ...prev, manager_id: emp?.id || emp?.employee_id || emp?.employee_code, manager: display }));
                    } else if (employeePickerTarget === 'principal') {
                      setForm(prev => ({ ...prev, principal_id: emp?.id || emp?.employee_id || emp?.employee_code, principal: display }));
                    }
                    setDirty(true);
                    setEmployeeDialogOpen(false);
                  }}>
                    <ListItemAvatar><Avatar src={emp?.image_url || emp?.image || ''} sx={{ width: 36, height: 36 }} /></ListItemAvatar>
                    <ListItemText primary={display} secondary={emp?.employee_code || ''} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}