import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import colors from '../../../theme/colors';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TextField from '@mui/material/TextField';
import MuiButton from '@mui/material/Button';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableFooter from '@mui/material/TableFooter';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import { supabase } from '../../../lib/supabaseClient';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ReactApexChart from 'react-apexcharts';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// (use theme colors for tab indicator / spinners)
import * as supabaseData from '../../../api/supabaseData';

// Local wrapper to enforce consistent border radius for all Buttons in this file
const Button = (props) => {
  const { sx, ...rest } = props;
  return <MuiButton {...rest} sx={{ borderRadius: 2, ...(sx || {}) }} />;
};

// TimeLogging with tabbed layout similar to SystemSettings

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && (
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

const STATUS_TH = {
  Draft: 'ร่าง',
  Submitted: 'ส่งขออนุมัติ',
  Approved: 'อนุมัติ',
  Rejected: 'ปฏิเสธ',
  Canceled: 'ยกเลิก',
  Cancelled: 'ยกเลิก',
};

const mapStatusThai = (s) => {
  if (!s && s !== 0) return '-';
  return STATUS_TH[s] || STATUS_TH[String(s).trim()] || String(s) || '-';
};

function TimeLogging({ onReady }) {
  const [tab, setTab] = React.useState(0);
  const tabSx = {
    '&.Mui-focusVisible': { outline: 'none', boxShadow: 'none' },
    '&:focus': { outline: 'none', boxShadow: 'none' },
    '&.Mui-selected': { outline: 'none', boxShadow: 'none', color: '#000', fontWeight: 700 },
    // preserve original casing and emoji
    textTransform: 'none',
  };

  const [myTabLoading, setMyTabLoading] = React.useState(false);
  const [myTabError, setMyTabError] = React.useState('');
  const [myTabTasks, setMyTabTasks] = React.useState([]);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleChange = (_e, v) => setTab(v);

  const loadMyTasks = React.useCallback(async () => {
    setMyTabLoading(true);
    try {
      let tasks = [];
      const employeeId = await resolveEmployeeId();
      if (!employeeId) throw new Error('ไม่พบพนักงานที่ล็อกอิน');

      try {
        const res1 = await supabase
          .from('tpr_project_wbs_tasks')
          .select('*')
          .eq('owner', employeeId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (!res1.error && Array.isArray(res1.data)) tasks = res1.data;
      } catch { /* try other forms below */ }

      if (!tasks.length) {
        try {
          const res2 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .contains('owner', [employeeId])
            .order('created_at', { ascending: false })
            .limit(500);
          if (!res2.error && Array.isArray(res2.data)) tasks = res2.data;
        } catch { /* ignore */ }
      }
      if (!tasks.length) {
        try {
          const res3 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .ilike('owner', `"${employeeId}"`)
            .order('created_at', { ascending: false })
            .limit(500);
          if (!res3.error && Array.isArray(res3.data)) tasks = res3.data;
        } catch { /* ignore */ }
      }
      if (!tasks.length) {
        try {
          const res4 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .ilike('owner', `%${employeeId}%`)
            .order('created_at', { ascending: false })
            .limit(500);
          if (!res4.error && Array.isArray(res4.data)) tasks = res4.data;
        } catch { /* ignore */ }
      }

      // hydrate related project/phase names
      if (tasks && tasks.length) {
        const projectIds = Array.from(new Set(tasks.map((t) => t.project_id).filter(Boolean)));
        const phaseIds = Array.from(new Set(tasks.map((t) => t.phase_id).filter(Boolean)));
        const projectsMap = {};
        const phasesMap = {};
        if (projectIds.length) {
          try {
            const { data: projects } = await supabase
              .from('tpr_projects')
              .select('id,name_th')
              .in('id', projectIds);
            if (Array.isArray(projects)) projects.forEach((p) => { projectsMap[p.id] = p.name_th; });
          } catch { /* ignore */ }
        }
        if (phaseIds.length) {
          try {
            const { data: phases } = await supabase
              .from('tpr_project_wbs_phases')
              .select('id,name')
              .in('id', phaseIds);
            if (Array.isArray(phases)) phases.forEach((ph) => { phasesMap[ph.id] = ph.name; });
          } catch { /* ignore */ }
        }
        tasks = tasks.map((t) => ({
          ...t,
          project_name: t.project_name || projectsMap[t.project_id] || '',
          phase_name: t.phase_name || phasesMap[t.phase_id] || '',
        }));
      }

      setMyTabTasks(tasks || []);
    } catch (e) {
      setMyTabError(e?.message || 'โหลดรายการงานไม่สำเร็จ');
      setMyTabTasks([]);
    } finally {
      setMyTabLoading(false);
    }
  }, []);

  // trigger load when switching to tab index 1
  React.useEffect(() => {
    if (tab === 1) loadMyTasks();
  }, [tab, loadMyTasks]);

  // notify parent when component is ready (optional)
  React.useEffect(() => {
    try { if (typeof onReady === 'function') onReady(); } catch { /* ignore */ }
  }, [onReady]);

  return (
    <Box
      sx={{
        p: 0,
        bgcolor: colors.gray100 || '#f5f5f5',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper sx={{ p: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 320, boxShadow: 'none' }} elevation={0}>
        <Tabs
          value={tab}
          onChange={handleChange}
          aria-label="แท็บบันทึกเวลา"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root:focus': { outline: 'none', boxShadow: 'none' },
            '& .MuiTab-root.Mui-focusVisible': { outline: 'none', boxShadow: 'none' },
          }}
        >
          <Tab sx={tabSx} label="📝 บันทึกเวลา" />
          <Tab sx={tabSx} label="📋 งานทั้งหมด" />
          <Tab sx={tabSx} label="📊 สรุปชั่วโมงงาน" />
          <Tab sx={tabSx} label="💸 ค่าใช้จ่าย" />
          <Tab sx={tabSx} label="🕒 คำร้องขอ OT" />
          <Tab sx={tabSx} label="🛌 ขอลางาน" />
          <Tab sx={tabSx} label="🛠 ขอแก้ไขเวลา" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <WeeklyTimesheet
            weekStartDate={dayjs().locale('th').startOf('week').add(1, 'day').toDate()}
            refreshKey={refreshKey}
          />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <MyTasksTable loading={myTabLoading} error={myTabError} tasks={myTabTasks} refreshKey={refreshKey} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <MyHoursSummary refreshKey={refreshKey} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <ExpensesTab refreshKey={refreshKey} />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <OTRequestTab onCreated={async () => {
            try { await loadMyTasks(); } catch { /* ignore */ }
            setRefreshKey(k => k + 1);
          }} />
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <LeaveRequestTab onCreated={async () => { setRefreshKey((k) => k + 1); await loadMyTasks(); }} />
        </TabPanel>

        <TabPanel value={tab} index={6}>
          <AttendanceCorrectionsTab onCreated={async () => { setRefreshKey((k) => k + 1); await loadMyTasks(); }} />
        </TabPanel>
      </Paper>
    </Box>
  );
}
// sanitize leave HOURLY time input: allow only digits and ':'; normalize common patterns like '0900' -> '09:00'
const sanitizeLeaveTimeInput = (v) => {
  if (v == null) return '';
  let s = String(v);
  s = s.replace(/\uFF1A/g, ':'); // full-width colon
  // remove all characters except digits and colon
  s = s.replace(/[^0-9:]/g, '');
  // collapse multiple colons
  s = s.replace(/:+/g, ':');
  const onlyDigits = s.replace(/:/g, '');
  if (!s.includes(':') && (onlyDigits.length === 3 || onlyDigits.length === 4)) {
    const hh = onlyDigits.slice(0, onlyDigits.length - 2).padStart(2, '0');
    const mm = onlyDigits.slice(-2);
    s = `${hh}:${mm}`;
  }
  if (s.includes(':')) {
    const parts = s.split(':');
    let hh = (parts[0] || '').slice(0, 2).padStart(2, '0');
    let mm = (parts[1] || '').slice(0, 2).padStart(2, '0');
    if (Number(mm) > 59) mm = '59';
    s = `${hh}:${mm}`;
  }
  if (s.length > 5) s = s.slice(0, 5);
  return s;
};

TimeLogging.propTypes = {
  onReady: PropTypes.func,
};

export default TimeLogging;

function ExpensesTab({ refreshKey }) {
  const [loading, setLoading] = React.useState(false);
  const [expenses, setExpenses] = React.useState([]);
  const [approverNames, setApproverNames] = React.useState({});
  const [open, setOpen] = React.useState(false);
  const [projects, setProjects] = React.useState([]);
  const [expenseQuery, setExpenseQuery] = React.useState('');
  const [form, setForm] = React.useState({ entry_date: dayjs().format('YYYY-MM-DD'), project_id: null, category: '', amount: '', note: '', file: null });
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });
  const [uploadInfo, setUploadInfo] = React.useState({ status: 'idle', message: '', path: null });
  const [editingExpenseId, setEditingExpenseId] = React.useState(null);
  const [expenseDeleteDialogOpen, setExpenseDeleteDialogOpen] = React.useState(false);
  const [expenseDeleteTarget, setExpenseDeleteTarget] = React.useState(null);

  // predefined expense categories (user-friendly, project-focused)
  const EXPENSE_CATEGORIES = [
    { key: 'travel', label: 'ค่าเดินทาง', example: 'ค่าน้ำมัน, ทางด่วน, รถสาธารณะ, Taxi/Grab' },
    { key: 'printing', label: 'ค่าพิมพ์/เอกสาร', example: 'Plot แบบ, พิมพ์, ถ่ายเอกสาร, สแกน' },
    { key: 'materials', label: 'ค่าวัสดุ/โมเดล', example: 'โฟม, ไม้, วัสดุทำโมเดล, อุปกรณ์ทดลอง' },
    { key: 'site', label: 'ค่าใช้จ่ายหน้างาน', example: 'อุปกรณ์หน้างานเล็ก, ค่าเช่าอุปกรณ์รายวัน' },
    { key: 'delivery', label: 'ค่าจัดส่ง/เอกสาร', example: 'ไปรษณีย์, Messenger, ส่งเอกสาร/แบบ' },
    { key: 'other', label: 'อื่น ๆ', example: 'รายการที่ไม่เข้าพวกอื่น กรอกหมายเหตุที่ชัดเจน' },
  ];
  const STATUS_LABELS = {
    Draft: 'ร่าง',
    Submitted: 'ส่งขออนุมัติ',
    Approved: 'อนุมัติ',
    Rejected: 'ปฏิเสธ',
    Cancelled: 'ยกเลิก',
  };
  const renderStatusLabel = (s) => {
    if (!s && s !== 0) return '-';
    return STATUS_LABELS[s] || STATUS_LABELS[String(s).trim()] || String(s) || '-';
  };

  const loadProjects = React.useCallback(async () => {
    try {
      const { data } = await supabase.from('tpr_projects').select('id,project_code,name_th').limit(200);
      setProjects(data || []);
    } catch {
      setProjects([]);
    }
  }, []);

  const loadExpenses = React.useCallback(async () => {
    setLoading(true);
    try {
      const empId = await resolveEmployeeId();
      if (!empId) throw new Error('ไม่พบพนักงานที่ล็อกอิน');
      const { data, error } = await supabase
        .from('tpr_expenses')
        .select('id,expense_date,project_id,phase_id,task_id,category,description,amount,attachments,status,created_at,approved_by')
        .eq('user_id', empId)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = data || [];
      const pids = Array.from(new Set(rows.map(r => r.project_id).filter(Boolean)));
      const map = {};
      if (pids.length) {
        const { data: ps } = await supabase.from('tpr_projects').select('id,project_code,name_th').in('id', pids);
        (ps || []).forEach(p => { map[p.id] = p.name_th || p.project_code || p.id; });
      }
      // normalize attachments and preview first file path
      const normalized = (rows || []).map(r => {
        const atts = Array.isArray(r.attachments) ? r.attachments : (r.attachments ? JSON.parse(r.attachments) : []);
        return ({ ...r, project_name: map[r.project_id] || '', attachments: atts, attachment_preview: atts.length ? atts[0].path : null });
      });
      // load approver names (approved_by -> employees)
      try {
        const approverIds = Array.from(new Set((normalized || []).map(x => x.approved_by).filter(Boolean)));
        if (approverIds.length) {
          const { data: emps } = await supabase
            .from('employees')
            .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
            .in('id', approverIds);
          const amap = {};
          if (emps) {
            for (const e of emps) {
              const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
              let name = '';
              if (thParts.length) name = thParts.join(' ');
              else {
                const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                if (enParts.length) name = enParts.join(' ');
                else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
              }
              amap[String(e.id)] = name;
            }
          }
          setApproverNames(amap);
        }
      } catch { /* ignore approver name fetch errors */ }
      setExpenses(normalized);
    } catch (e) {
      setSnack({ open: true, message: e?.message || 'โหลดข้อมูลไม่สำเร็จ', severity: 'error' });
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadProjects(); loadExpenses(); }, [loadProjects, loadExpenses]);
  React.useEffect(() => {
    if (refreshKey !== undefined) {
      loadExpenses().catch(() => { });
    }
  }, [refreshKey, loadExpenses]);

  const handleClose = () => setOpen(false);
  // Open dialog for creating a new expense (clear editing state)
  const openNewExpense = () => {
    setEditingExpenseId(null);
    setForm({ entry_date: dayjs().format('YYYY-MM-DD'), project_id: null, category: '', amount: '', note: '', file: null, attachments: [] });
    setOpen(true);
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setUploadInfo({ status: 'idle', message: '', path: null });
    if (!f) return setForm((s) => ({ ...s, file: null }));
    // require project selected to determine upload path
    if (!form.project_id) {
      setSnack({ open: true, message: 'กรุณาเลือกโครงการก่อนอัปโหลดใบเสร็จ', severity: 'error' });
      return setForm((s) => ({ ...s, file: null }));
    }
    setUploadInfo({ status: 'uploading', message: 'กำลังอัปโหลด...', path: null });
    try {
      const { data: udata } = await supabase.auth.getUser();
      const userId = udata?.user?.id || 'anon';
      const fname = `${userId}_${Date.now()}_${(f.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `${form.project_id}/expenses_slip/${fname}`;
      const { error: upErr } = await supabase.storage.from('project-files').upload(filePath, f, { upsert: true });
      if (upErr) throw upErr;
      // try signed url
      let publicUrl = null;
      try {
        const { data: signedData } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60 * 60 * 24 * 7);
        publicUrl = signedData?.signedURL || signedData?.signedUrl || signedData?.signedurl || null;
      } catch {
        const pu = await supabase.storage.from('project-files').getPublicUrl(filePath);
        publicUrl = pu?.data?.publicUrl || pu?.publicUrl || null;
      }
      const attachmentsPayload = [{ path: filePath, name: f.name, size: f.size || 0, public_url: publicUrl }];
      setForm((s) => ({ ...s, file: f, attachments: attachmentsPayload }));
      setUploadInfo({ status: 'success', message: 'อัปโหลดใบเสร็จสำเร็จ', path: filePath });
    } catch (err) {
      console.error('upload err', err);
      setForm((s) => ({ ...s, file: null }));
      setUploadInfo({ status: 'error', message: 'อัปโหลดล้มเหลว', path: null });
      setSnack({ open: true, message: err?.message || 'อัปโหลดล้มเหลว', severity: 'error' });
    }
  };

  const saveExpense = async () => {
    setLoading(true);
    try {
      // validations: required fields
      if (!form.entry_date) { setSnack({ open: true, message: 'กรุณาเลือกวันที่', severity: 'error' }); setLoading(false); return; }
      if (!form.project_id) { setSnack({ open: true, message: 'กรุณาเลือกโครงการ', severity: 'error' }); setLoading(false); return; }
      if (!form.category) { setSnack({ open: true, message: 'กรุณาเลือกประเภทค่าใช้จ่าย', severity: 'error' }); setLoading(false); return; }
      const amt = Number(form.amount || 0);
      if (!Number.isFinite(amt) || amt <= 0) { setSnack({ open: true, message: 'กรุณากรอกจำนวนเงินที่มากกว่า 0', severity: 'error' }); setLoading(false); return; }
      if (form.category === 'other' && (!form.note || String(form.note).trim().length === 0)) {
        setSnack({ open: true, message: 'กรุณากรอกหมายเหตุเมื่อเลือก "อื่น ๆ"', severity: 'error' }); setLoading(false); return;
      }

      const empId = await resolveEmployeeId();
      if (!empId) throw new Error('ไม่พบพนักงานที่ล็อกอิน');
      const { data: udata } = await supabase.auth.getUser();
      const userId = udata?.user?.id || null;

      let attachmentsPayload = [];
      // If already uploaded during file select, use that
      if (form.attachments && Array.isArray(form.attachments) && form.attachments.length) {
        attachmentsPayload = form.attachments;
      } else if (form.file) {
        // upload to bucket 'project-files' under path '{project_id}/expenses_slip/{filename}'
        const fname = `${userId || 'anon'}_${Date.now()}_${(form.file.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `${form.project_id}/expenses_slip/${fname}`;
        const { error: upErr } = await supabase.storage.from('project-files').upload(filePath, form.file, { upsert: true });
        if (upErr) throw upErr;
        // try to create signed URL (preferred)
        let signedUrl = null;
        try {
          const { data: signedData } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60 * 60 * 24 * 7);
          if (signedData) signedUrl = signedData.signedURL || signedData.signedUrl || signedData.signedurl || null;
        } catch {
          signedUrl = null;
        }
        // fallback to public URL
        let publicUrl = null;
        if (!signedUrl) {
          const pu = await supabase.storage.from('project-files').getPublicUrl(filePath);
          publicUrl = pu?.data?.publicUrl || pu?.publicUrl || null;
        }
        attachmentsPayload = [{ path: filePath, name: form.file.name, size: form.file.size || 0, public_url: signedUrl || publicUrl }];
      }

      const selectedCat = EXPENSE_CATEGORIES.find(c => c.key === form.category);
      const categoryLabel = selectedCat ? selectedCat.label : (form.category || null);

      const commonPayload = {
        user_id: empId || userId,
        project_id: form.project_id,
        phase_id: null,
        task_id: null,
        expense_date: form.entry_date,
        category: categoryLabel,
        description: form.note,
        amount: amt,
        attachments: attachmentsPayload,
      };
      if (editingExpenseId) {
        // update existing expense (do not overwrite status)
        const updatePayload = { ...commonPayload, updated_at: new Date().toISOString(), updated_by: userId || null };
        const { error: upErr } = await supabase.from('tpr_expenses').update(updatePayload).eq('id', editingExpenseId);
        if (upErr) throw upErr;
        setSnack({ open: true, message: 'แก้ไขรายการเรียบร้อย', severity: 'success' });
        setEditingExpenseId(null);
      } else {
        const insertPayload = { ...commonPayload, status: 'Draft', created_by: userId || null };
        const { error: insErr } = await supabase.from('tpr_expenses').insert(insertPayload);
        if (insErr) throw insErr;
        setSnack({ open: true, message: 'บันทึกเรียบร้อย', severity: 'success' });
      }
      setOpen(false);
      setForm({ entry_date: dayjs().format('YYYY-MM-DD'), project_id: null, category: '', amount: '', note: '', file: null, attachments: [] });
      await loadExpenses();
    } catch (e) {
      setSnack({ open: true, message: e?.message || 'บันทึกไม่สำเร็จ', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Submit existing expense by id (update)
  const submitExistingExpense = async (expenseId) => {
    setLoading(true);
    try {

      const empId = await resolveEmployeeId();
      const submittedBy = empId || null;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tpr_expenses')
        .update({ status: 'Submitted', submitted_at: now, submitted_by: submittedBy })
        .eq('id', expenseId);
      if (error) throw error;
      setSnack({ open: true, message: 'ส่งคำขออนุมัติเรียบร้อย', severity: 'success' });
      loadExpenses();
    } catch (e) {
      setSnack({ open: true, message: e?.message || 'ส่งคำขอไม่สำเร็จ', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Open attachment safely (handle missing bucket)
  const openAttachment = async (path) => {
    if (!path) { setSnack({ open: true, message: 'ไม่พบไฟล์แนบ', severity: 'error' }); return; }
    try {
      // prefer creating a signed URL at time of open
      try {
        const { data: signedData } = await supabase.storage.from('project-files').createSignedUrl(path, 60 * 60 * 24 * 7);
        const sUrl = signedData?.signedURL || signedData?.signedUrl || signedData?.signedurl || null;
        if (sUrl) { window.open(sUrl, '_blank'); return; }
      } catch {
        // continue to fallback
      }
      const res = await supabase.storage.from('project-files').getPublicUrl(path);
      const url = res?.data?.publicUrl || res?.publicUrl || null;
      if (!url) throw new Error('ไม่สามารถรับ URL ไฟล์ได้');
      window.open(url, '_blank');
    } catch {
      setSnack({ open: true, message: 'ไม่พบ bucket "project-files" หรือไม่สามารถเข้าถึงไฟล์ได้', severity: 'error' });
    }
  };

  // Cancel a submitted expense (set back to Draft and clear submitted_by)
  const cancelSubmission = async (expenseId) => {
    if (!expenseId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tpr_expenses')
        .update({ status: 'Draft', submitted_at: null, submitted_by: null })
        .eq('id', expenseId);
      if (error) throw error;
      setSnack({ open: true, message: 'ยกเลิกการส่งเรียบร้อย', severity: 'success' });
      await loadExpenses();
    } catch (e) {
      setSnack({ open: true, message: e?.message || 'ยกเลิกการส่งไม่สำเร็จ', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openEditExpense = (row) => {
    if (!row) return;
    // map category label back to key if possible
    const matched = EXPENSE_CATEGORIES.find(c => c.label === (row.category || ''));
    const categoryKey = matched ? matched.key : '';
    setEditingExpenseId(row.id);
    setForm({
      entry_date: row.expense_date || dayjs(row.created_at).format('YYYY-MM-DD'),
      project_id: row.project_id || null,
      category: categoryKey,
      amount: row.amount || '',
      note: row.description || '',
      file: null,
      attachments: Array.isArray(row.attachments) ? row.attachments : (row.attachments ? JSON.parse(row.attachments) : []),
    });
    setOpen(true);
  };

  const openExpenseDeleteDialog = (id) => {
    setExpenseDeleteTarget(id);
    setExpenseDeleteDialogOpen(true);
  };

  const confirmExpenseDelete = async () => {
    try {
      setExpenseDeleteDialogOpen(false);
      if (!expenseDeleteTarget) return;
      setLoading(true);
      const { error } = await supabase.from('tpr_expenses').delete().eq('id', expenseDeleteTarget);
      if (error) throw error;
      setSnack({ open: true, message: 'ลบรายการค่าใช้จ่ายเรียบร้อย', severity: 'success' });
      await loadExpenses();
    } catch (e) {
      setSnack({ open: true, message: e?.message || 'การลบไม่สำเร็จ', severity: 'error' });
    } finally {
      setExpenseDeleteTarget(null);
      setExpenseDeleteDialogOpen(false);
      setLoading(false);
    }
  };
  // reuse module-level helpers for status translation and OT deletion

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>รายการค่าใช้จ่าย</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="ค้นหา โครงการ / ประเภท / หมายเหตุ"
            value={expenseQuery}
            onChange={(e) => setExpenseQuery(e.target.value)}
            sx={{ minWidth: 360 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={openNewExpense} startIcon={<AddIcon />} sx={{ backgroundColor: '#000', color: '#fff' }}>เพิ่มค่าใช้จ่าย</Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, boxShadow: 'none' }} elevation={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table sx={{ '& td, & th': { borderBottom: 'none' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>วันที่</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>โครงการ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>รายละเอียด</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>จำนวนเงิน</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>ใบเสร็จรับเงิน</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ผู้พิจารณา</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {((expenses || [])
                  .filter((it) => {
                    const q = String(expenseQuery || '').trim().toLowerCase();
                    if (!q) return true;
                    const projectName = String(it.project_name || '').toLowerCase();
                    const categoryKey = String(it.category || '').toLowerCase();
                    const categoryLabel = String((EXPENSE_CATEGORIES.find(c => c.key === categoryKey)?.label) || '').toLowerCase();
                    const desc = String(it.description || '').toLowerCase();
                    return projectName.includes(q) || categoryKey.includes(q) || categoryLabel.includes(q) || desc.includes(q);
                  })
                ).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{dayjs(r.expense_date || r.created_at).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{r.project_name || '-'}</TableCell>
                    <TableCell>{r.category || '-'}</TableCell>
                    <TableCell>{(r.description || '').slice(0, 80) || '-'}</TableCell>
                    <TableCell align="right">{Number(r.amount || 0).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      {r.attachments && r.attachments.length ? (
                        <IconButton size="small" onClick={() => openAttachment(r.attachments[0].path)} aria-label="เปิดใบเสร็จ">
                          <ReceiptLongIcon />
                        </IconButton>
                      ) : (
                        <Typography sx={{ color: 'text.secondary' }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography>{renderStatusLabel(r.status)}</Typography>
                        {r.submitted_at && (
                          <Typography variant="caption" color="text.secondary">{dayjs(r.submitted_at).format('DD/MM/YYYY HH:mm')}</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{approverNames[String(r.approved_by)] || (r.approved_by ? String(r.approved_by) : '-')}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {(() => {
                        const s = String(r.status || '').trim().toLowerCase();
                        const canManage = (s === 'draft' || s === 'rejected');
                        return (
                          <>
                            <Tooltip title="แก้ไข">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => openEditExpense(r)}
                                  disabled={!canManage}
                                  sx={{ color: canManage ? '#666' : '#bbb', mr: 1 }}
                                  aria-label="แก้ไข"
                                >
                                  <EditIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="ลบ">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => openExpenseDeleteDialog(r.id)}
                                  disabled={!canManage}
                                  sx={{ color: canManage ? '#666' : '#bbb' }}
                                  aria-label="ลบ"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {(String(r.status || '').trim().toLowerCase() === 'draft') ? (
                        <Button variant="outlined" onClick={() => submitExistingExpense(r.id)} sx={{ minWidth: 120, borderColor: '#666', color: '#000' }}>ส่งขออนุมัติ</Button>
                      ) : (String(r.status || '').trim().toLowerCase() === 'submitted') ? (
                        <Button variant="outlined" onClick={() => cancelSubmission(r.id)} sx={{ minWidth: 120, borderColor: '#d32f2f', color: '#d32f2f' }}>ยกเลิกการส่ง</Button>
                      ) : ('-')}
                    </TableCell>
                  </TableRow>
                ))}
                {(expenses || []).filter((it) => {
                  const q = String(expenseQuery || '').trim().toLowerCase();
                  if (!q) return true;
                  const projectName = String(it.project_name || '').toLowerCase();
                  const categoryKey = String(it.category || '').toLowerCase();
                  const categoryLabel = String((EXPENSE_CATEGORIES.find(c => c.key === categoryKey)?.label) || '').toLowerCase();
                  const desc = String(it.description || '').toLowerCase();
                  return projectName.includes(q) || categoryKey.includes(q) || categoryLabel.includes(q) || desc.includes(q);
                }).length === 0 && (
                    <TableRow><TableCell colSpan={10}><Typography color="text.secondary" sx={{ textAlign: 'center' }}>ไม่มีรายการ</Typography></TableCell></TableRow>
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>เพิ่มค่าใช้จ่าย</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker label="วันที่" value={dayjs(form.entry_date)} onChange={(d) => setForm(s => ({ ...s, entry_date: d?.format('YYYY-MM-DD') }))} slotProps={{ textField: { size: 'small' } }} />
            </LocalizationProvider>
            <FormControl>
              <InputLabel>โครงการ</InputLabel>
              <Select size='small' value={form.project_id || ''} label="โครงการ" onChange={(e) => setForm(s => ({ ...s, project_id: e.target.value || null }))}>
                <MenuItem value="">--เลือก--</MenuItem>
                {(projects || []).map(p => (<MenuItem key={p.id} value={p.id}>{p.name_th || p.project_code || p.id}</MenuItem>))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>ประเภท</InputLabel>
              <Select size='small' value={form.category || ''} label="ประเภท" onChange={(e) => setForm(s => ({ ...s, category: e.target.value }))}>
                <MenuItem value="">--เลือก--</MenuItem>
                {EXPENSE_CATEGORIES.map(c => (
                  <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {/* {(EXPENSE_CATEGORIES.find(c => c.key === form.category)?.example) || 'เลือกประเภทเพื่อดูตัวอย่าง'} */}
              </Typography>
            </FormControl>
            <TextField size='small' label="จำนวนเงิน" type="number" value={form.amount} onChange={(e) => setForm(s => ({ ...s, amount: e.target.value }))} inputProps={{ inputMode: 'numeric' }} sx={{ '& input': { textAlign: 'right' } }} />
            <TextField label="หมายเหตุ" multiline rows={3} value={form.note} onChange={(e) => setForm(s => ({ ...s, note: e.target.value }))} />
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>อัปโหลดใบเสร็จ
              <input hidden type="file" onChange={handleFileChange} />
            </Button>
            {uploadInfo.status === 'uploading' && (
              <Alert severity="info">{uploadInfo.message}</Alert>
            )}
            {uploadInfo.status === 'success' && (
              <Alert severity="success">{uploadInfo.message}</Alert>
            )}
            {uploadInfo.status === 'error' && (
              <Alert severity="error">{uploadInfo.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} startIcon={<CloseIcon />} sx={{ minWidth: 120, color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveExpense} startIcon={<CheckCircleIcon />} disabled={loading} sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#222' }, minWidth: 120, mr: 1 }}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Expense delete confirmation dialog */}
      <Dialog open={expenseDeleteDialogOpen} onClose={() => { setExpenseDeleteDialogOpen(false); setExpenseDeleteTarget(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>ยืนยันการลบรายการ</DialogTitle>
        <DialogContent>
          <Typography>คุณแน่ใจหรือไม่ว่าต้องการลบรายการค่าใช้จ่ายนี้? การลบจะไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setExpenseDeleteDialogOpen(false); setExpenseDeleteTarget(null); }} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={confirmExpenseDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity || 'info'} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

function OTRequestTab({ onCreated }) {
  // OT request UI with validations, attendance checks and workflow
  // Uses Asia/Bangkok timezone (dayjs default in this file is set to Thai locale)
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState(null);
  const [isExempt, setIsExempt] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    date: dayjs().format('YYYY-MM-DD'),
    ot_start_time: '18:00',
    ot_end_time: '19:00',
    hours: '1.00',
    type: 'AFTER_WORK',
    project_id: null,
    note: '',
    special_reason: '',
    attachment: null,
    doc_no: null,
  });
  // Helper: format time values (accepts 'HH:mm', 'HH:mm:ss', Date, ISO strings)
  const formatTimeShort = (t) => {
    if (t === null || t === undefined || t === '') return '-';
    if (typeof t === 'string') {
      const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (m) return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
    }
    const d = dayjs(t);
    return d && d.isValid() ? d.format('HH:mm') : '-';
  };
  const resetFormToDefaults = React.useCallback(() => {
    setForm({
      date: dayjs().format('YYYY-MM-DD'),
      ot_start_time: '',
      ot_end_time: '',
      hours: '',
      type: '',
      project_id: null,
      note: '',
      special_reason: '',
      attachment: null,
      doc_no: null,
    });
  }, []);
  const [projects, setProjects] = React.useState([]);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });
  const [loadingFetch, setLoadingFetch] = React.useState(false);
  const [allowedOtTypes, setAllowedOtTypes] = React.useState([]);
  const [shiftWindow, setShiftWindow] = React.useState({}); // { [otType]: { minStart: 'HH:mm', maxEnd: 'HH:mm' } }
  const MAX_OT_HOURS = 6;
  // doc_no is produced by backend after save; form.doc_no holds it when available

  // --- helpers: timeout wrapper ---
  const withTimeout = (p, ms = 10000) => {
    return Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
    ]);
  };

  // --- DB helpers (RLS-friendly: operate by employee_id) ---
  async function getAttendanceDaily(eid, dateISO) {
    try {
      const q = supabase.from('tpr_attendance_daily').select('clock_in_at,clock_out_at,actual_minutes,regular_minutes,ot_minutes,work_date,daily_status').eq('employee_id', eid).eq('work_date', dateISO).maybeSingle();
      const res = await withTimeout(q, 10000);
      return res;
    } catch (e) {
      console.error('getAttendanceDaily error', e);
      throw e;
    }
  }

  async function listMyOtRequests(eid) {
    try {
      const q = supabase.from('tpr_ot_requests').select('*').eq('employee_id', eid).order('request_date', { ascending: false }).limit(100);
      const res = await withTimeout(q, 10000);
      return res;
    } catch (e) {
      console.error('listMyOtRequests error', e);
      throw e;
    }
  }

  async function createOtDraft(payload) {
    return supabase.from('tpr_ot_requests').insert(payload).select();
  }

  async function updateOtRequest(id, payload) {
    return supabase.from('tpr_ot_requests').update(payload).eq('id', id).select();
  }

  async function submitOtRequest(id, submittedBy) {
    return updateOtRequest(id, { status: 'Submitted', submitted_at: dayjs().toISOString(), submitted_by: submittedBy });
  }

  async function cancelOtRequest(id) {
    return updateOtRequest(id, { status: 'Canceled', canceled_at: dayjs().toISOString() });
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('tpr_ot_requests').delete().eq('id', id);
      if (error) throw error;
      setRows(r => (r || []).filter(x => x.id !== id));
      setSnack({ open: true, message: 'ลบรายการเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('delete OT failed', e);
      setSnack({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' });
    }
  };

  // OT delete confirmation dialog state & helpers
  const [otDeleteDialogOpen, setOtDeleteDialogOpen] = React.useState(false);
  const [otDeleteTarget, setOtDeleteTarget] = React.useState(null);
  const openOtDeleteDialog = (id) => { setOtDeleteTarget(id); setOtDeleteDialogOpen(true); };
  const confirmOtDelete = async () => {
    try {
      setOtDeleteDialogOpen(false);
      if (!otDeleteTarget) return;
      await handleDelete(otDeleteTarget);
      setOtDeleteTarget(null);
    } catch (e) {
      console.error('confirmOtDelete', e);
      setSnack({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' });
    } finally {
      setOtDeleteDialogOpen(false);
    }
  };

  // --- Initialization: resolve employee and load projects + OT list ---
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const eid = await resolveEmployeeId();
        if (!mounted) return;
        setEmployeeId(eid);
        if (!eid) {
          setError('ไม่พบข้อมูลพนักงานสำหรับผู้ใช้ปัจจุบัน');
          setRows([]);
          setLoading(false);
          return;
        }
        // get employee exemption flag
        try {
          const { data: emp, error: empErr } = await withTimeout(supabase.from('employees').select('timekeeping_exempt').eq('id', eid).maybeSingle(), 10000);
          if (!empErr && emp) setIsExempt(Boolean(emp.timekeeping_exempt));
        } catch (e) {
          console.debug('employees fetch for OT tab failed', e);
        }

        // load projects (optional) via centralized helper
        try {
          const { data: ps, error: psErr } = await withTimeout(supabaseData.fetchAllProjects({ includeArchived: false, orderBy: { column: 'project_code', ascending: true }, limit: 200 }), 10000);
          if (psErr) {
            console.debug('fetchAllProjects returned error (optional)', psErr);
          } else if (mounted) {
            setProjects(ps || []);
          }
        } catch (e) {
          console.debug('projects load failed (optional)', e);
        }

        // load OT requests with fallback handling (use helper to avoid unused function warning)
        try {
          const res = await listMyOtRequests(eid);
          const data = res?.data;
          const rErr = res?.error;
          if (rErr) {
            const msg = String(rErr.message || '').toLowerCase();
            if (msg.includes('relation') && msg.includes('tpr_ot_requests')) {
              setError('ตาราง `tpr_ot_requests` ยังไม่มีในฐานข้อมูล');
              setRows([]);
            } else if (msg.includes('column') || msg.includes('does not exist')) {
              // try fallback schema
              try {
                const { data: fb, error: fbErr } = await withTimeout(supabase.from('tpr_ot_requests').select('id,user_id,work_date,requested_minutes,reason,note,created_at').eq('user_id', eid).order('work_date', { ascending: false }).limit(100), 10000);
                if (fbErr) {
                  setError(fbErr.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล OT');
                } else {
                  const mapped = (fb || []).map(r => ({ id: r.id, request_date: r.work_date, hours: typeof r.requested_minutes === 'number' ? (r.requested_minutes / 60) : null, note: r.note || r.reason || null, status: '-', created_at: r.created_at }));
                  setRows(mapped);
                }
              } catch (e2) {
                console.error('fallback load OT requests failed', e2);
                setError('เกิดข้อผิดพลาดในการโหลด OT');
                setRows([]);
              }
            } else {
              setError(rErr.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล OT');
            }
          } else {
            setRows((data || []).map(r => ({ ...r })));
          }
        } catch (e) {
          console.error('load OT requests failed', e);
          setError('เกิดข้อผิดพลาดในการโหลด OT');
          setRows([]);
        }
      } catch (e) {
        console.error(e);
        setError('เกิดข้อผิดพลาด');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Utility: compute hours decimal from time strings HH:mm ---
  const computeHoursFromTimes = (start, end) => {
    if (!start || !end) return 0;
    const s = dayjs(`${form.date}T${start}`);
    const e = dayjs(`${form.date}T${end}`);
    let diffMin = e.diff(s, 'minute');
    if (diffMin < 0) diffMin = 0;
    const hours = Number((diffMin / 60).toFixed(2));
    return hours;
  };

  // sanitize time input to allow only digits and ':' and normalize simple patterns
  const sanitizeTimeInput = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v).replace(/[^0-9:]/g, '');
    // if user typed 4 digits like 1800 -> convert to 18:00
    if (!s.includes(':') && s.length === 4) s = `${s.slice(0, 2)}:${s.slice(2)}`;
    // trim to HH:mm length
    if (s.length > 5) s = s.slice(0, 5);
    return s;
  };

  // keep hours in form synced
  React.useEffect(() => {
    const h = computeHoursFromTimes(form.ot_start_time, form.ot_end_time);
    setForm(f => ({ ...f, hours: h > 0 ? String(h.toFixed(2)) : '0.00' }));
  }, [form.ot_start_time, form.ot_end_time, form.date]);

  // No preview effect: doc_no will be created by backend on save; do not call preview RPC

  // --- Validation before submit ---
  const validateBeforeSubmit = async (isSubmitting, ctxForm = form, currentId = null) => {
    if (!ctxForm.note || String(ctxForm.note || '').trim() === '') return { ok: false, msg: 'กรุณาระบุเหตุผล/งานที่ทำ' };
    const hrs = Number(ctxForm.hours);
    if (!Number.isFinite(hrs) || hrs <= 0) return { ok: false, msg: 'จำนวนชั่วโมงต้องมากกว่า 0' };
    if (hrs > MAX_OT_HOURS) return { ok: false, msg: `จำนวนชั่วโมงต้องไม่เกิน ${MAX_OT_HOURS} ชม.` };

    // duplicate check
    try {
      let q = supabase.from('tpr_ot_requests').select('id,status').eq('employee_id', employeeId).eq('request_date', ctxForm.date).in('status', ['Draft', 'Submitted', 'Approved']);
      if (currentId) q = q.neq('id', currentId);
      q = q.limit(1);
      const { data: existing } = await withTimeout(q, 10000);
      if (existing && existing.length) return { ok: false, msg: 'มีคำขอของวันนี้แล้ว' };
    } catch (e) {
      console.debug('duplicate check failed', e);
    }

    // attendance checks
    try {
      const att = await getAttendanceDaily(employeeId, ctxForm.date);
      if (!att || !att.data) {
        if (isSubmitting) return { ok: false, msg: 'ไม่พบการลงเวลาของวันที่เลือก (ไม่สามารถส่งอนุมัติได้)' };
      } else {
        const row = att.data;
        if (isSubmitting && typeof row.daily_status === 'string' && row.daily_status !== 'CLOSED') return { ok: false, msg: 'ยังไม่ปิดรอบวันที่เลือก ไม่สามารถส่งอนุมัติได้' };
        if (ctxForm.type === 'AFTER_WORK') {
          if (!row.clock_out_at) return { ok: false, msg: 'ไม่พบเวลาเลิกงาน (clock_out_at) ในการลงเวลา ไม่สามารถส่งอนุมัติได้' };
          const clockOut = dayjs(row.clock_out_at);
          const otStart = dayjs(`${ctxForm.date}T${ctxForm.ot_start_time}`);
          if (otStart.isBefore(clockOut)) {
            if (!ctxForm.special_reason || String(ctxForm.special_reason || '').trim() === '') return { ok: false, msg: 'OT เริ่มก่อนเวลาเลิกงาน ต้องระบุเหตุผลพิเศษ' };
          }
        }
      }
    } catch (e) {
      console.error('attendance check failed', e);
      return { ok: false, msg: 'การตรวจสอบการลงเวลาเกิดข้อผิดพลาด' };
    }

    // enforce shift-linked OT window if available (per OT type)
    try {
      if (shiftWindow && ctxForm.type && shiftWindow[ctxForm.type] && ctxForm.ot_start_time && ctxForm.ot_end_time) {
        const w = shiftWindow[ctxForm.type];
        if (w && w.minStart && w.maxEnd) {
          const otStart = dayjs(`${ctxForm.date}T${ctxForm.ot_start_time}`);
          const otEnd = dayjs(`${ctxForm.date}T${ctxForm.ot_end_time}`);
          const minStart = dayjs(`${ctxForm.date}T${w.minStart}`);
          const maxEnd = dayjs(`${ctxForm.date}T${w.maxEnd}`);
          if (otStart.isBefore(minStart) || otEnd.isAfter(maxEnd)) {
            return { ok: false, msg: `เวลา OT ต้องอยู่ในช่วง ${w.minStart} – ${w.maxEnd}` };
          }
        }
      }
    } catch (e) {
      console.debug('shift window check failed', e);
    }

    return { ok: true };
  };

  // --- Handlers: save draft and submit ---
  const handleSaveDraft = async () => {
    setLoadingFetch(true);
    try {
      // require reason / work done
      if (!form.note || !String(form.note).trim()) {
        setSnack({ open: true, message: 'กรุณาระบุเหตุผล / งานที่ทำ', severity: 'error' });
        setLoadingFetch(false);
        return;
      }
      // validate shift window for selected OT type before saving draft
      try {
        if (shiftWindow && form.type && shiftWindow[form.type] && form.ot_start_time && form.ot_end_time) {
          const w = shiftWindow[form.type];
          if (w && w.minStart && w.maxEnd) {
            const otStart = dayjs(`${form.date}T${form.ot_start_time}`);
            const otEnd = dayjs(`${form.date}T${form.ot_end_time}`);
            const minStart = dayjs(`${form.date}T${w.minStart}`);
            const maxEnd = dayjs(`${form.date}T${w.maxEnd}`);
            if (otStart.isBefore(minStart) || otEnd.isAfter(maxEnd)) {
              setSnack({ open: true, message: `เวลา OT ต้องอยู่ในช่วง ${w.minStart} – ${w.maxEnd}`, severity: 'error' });
              setLoadingFetch(false);
              return;
            }
          }
        }
      } catch (e) {
        console.debug('shift window check before save failed', e);
      }
      const payload = {
        employee_id: employeeId,
        request_date: form.date,
        ot_start_time: form.ot_start_time,
        ot_end_time: form.ot_end_time,
        hours: Number(form.hours),
        type: form.type,
        project_id: form.project_id || null,
        note: form.note,
        special_reason: form.special_reason || null,
        status: 'Draft',
      };
      // attachments (optional) - upload single file and store URL in `attachment_url` (signed URL preferred)
      if (form.attachment) {
        try {
          const { data: udata } = await supabase.auth.getUser();
          const userId = udata?.user?.id || 'anon';
          const file = form.attachment;
          const fname = `${userId}_${Date.now()}_${(file.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = form.project_id ? `${userId}/${fname}` : `ot/${userId}/${fname}`;
          const { error: upErr } = await supabase.storage.from('ot-files').upload(filePath, file, { upsert: true });
          if (upErr) throw upErr;
          // try signed url first
          let signedUrl = null;
          try {
            const { data: signedData } = await supabase.storage.from('ot-files').createSignedUrl(filePath, 60 * 60 * 24 * 7);
            if (signedData) signedUrl = signedData.signedURL || signedData.signedUrl || signedData.signedurl || null;
          } catch {
            signedUrl = null;
          }
          let publicUrl = null;
          if (!signedUrl) {
            const pu = await supabase.storage.from('ot-files').getPublicUrl(filePath);
            publicUrl = pu?.data?.publicUrl || pu?.publicUrl || null;
          }
          const finalUrl = signedUrl || publicUrl || null;
          if (finalUrl) payload.attachment_url = finalUrl;
        } catch (e) {
          console.debug('attachment upload exception', e);
        }
      }

      const { data, error: insErr } = await withTimeout(createOtDraft(payload), 10000).catch(e => ({ error: e }));
      if (insErr) {
        setSnack({ open: true, message: insErr.message || 'บันทึกร่างไม่สำเร็จ', severity: 'error' });
      } else {
        const item = Array.isArray(data) ? data[0] : data;
        setRows(r => [item, ...(r || [])]);
        // update form state with returned doc_no so the modal shows it immediately
        if (item && item.doc_no) {
          setForm(f => ({ ...f, doc_no: item.doc_no }));
        }
        setSnack({ open: true, message: `บันทึกร่างเรียบร้อย`, severity: 'success' });
        // close dialog after successful draft save
        setDialogOpen(false);
        if (typeof onCreated === 'function') onCreated();
      }
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' });
    } finally {
      setLoadingFetch(false);
    }
  };

  // When user clicks "สร้างคำขอ OT": check whether employee's shift links to OT shifts
  const handleCreateClick = async () => {
    setLoadingFetch(true);
    // clear the form completely when opening create dialog
    const clearedForm = {
      date: dayjs().format('YYYY-MM-DD'),
      ot_start_time: '',
      ot_end_time: '',
      hours: '',
      type: '',
      project_id: null,
      note: '',
      special_reason: '',
      attachment: null,
      doc_no: null,
    };
    setForm(clearedForm);
    try {
      const res = await supabaseData.fetchEmployeeOtShifts({ identifier: employeeId });
      const linked = res && res.data && Array.isArray(res.data.linked_ot_shifts) ? res.data.linked_ot_shifts : [];
      if (!linked || linked.length === 0) {
        setAllowedOtTypes([]);
        setShiftWindow({});
        setSnack({ open: true, message: 'ไม่พบกะ OT ที่ผูกกับพนักงาน', severity: 'warning' });
        setDialogOpen(true);
        return;
      }
      // derive allowed OT types and shift windows per type
      const types = Array.from(new Set((linked || []).map(s => s.ot_type).filter(Boolean)));
      setAllowedOtTypes(types);
      if (types.length && (!form.type || !types.includes(form.type))) {
        // prefer first allowed type but don't override if user already set
        setForm(f => ({ ...f, type: types[0] }));
      }
      // compute per-type min start and max end across linked shifts
      if (linked && linked.length) {
        try {
          const windows = {};
          types.forEach((t) => {
            const subset = linked.filter(s => s.ot_type === t);
            const starts = subset.map(s => s.first_in_time).filter(Boolean);
            const ends = subset.map(s => s.first_out_time).filter(Boolean);
            const minStart = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
            const maxEnd = ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : null;
            const minStartShort = minStart && typeof minStart === 'string' ? minStart.slice(0, 5) : minStart;
            const maxEndShort = maxEnd && typeof maxEnd === 'string' ? maxEnd.slice(0, 5) : maxEnd;
            if (minStartShort || maxEndShort) windows[t] = { minStart: minStartShort, maxEnd: maxEndShort };
          });
          setShiftWindow(windows);
          // set default project if not set
          if ((!form.project_id || form.project_id === '') && Array.isArray(projects) && projects.length) {
            setForm(f => ({ ...f, project_id: projects[0].id }));
          }
          // set default OT start/end to the selected type's bounds (if available)
          // Preserve any values the user already selected; only apply defaults when empty
          const selectedType = (form.type && types.includes(form.type)) ? form.type : types[0];
          if (selectedType && windows[selectedType]) {
            const w = windows[selectedType];
            setForm(f => {
              const newStart = (!f.ot_start_time || String(f.ot_start_time).trim() === '') && w.minStart ? w.minStart : f.ot_start_time;
              const newEnd = (!f.ot_end_time || String(f.ot_end_time).trim() === '') && w.maxEnd ? w.maxEnd : f.ot_end_time;
              return { ...f, ot_start_time: newStart, ot_end_time: newEnd };
            });
          }
          // found linked OT shifts; do not show snackbar per request
        } catch (e) {
          console.debug('derive linked shift window failed', e);
        }
      }
      // keep allowed types and shift windows available, but do not populate form values
      setDialogOpen(true);
    } catch (e) {
      console.error('fetchEmployeeOtShifts failed', e);
      setSnack({ open: true, message: 'เกิดข้อผิดพลาดในการตรวจสอบกะ OT', severity: 'error' });
      setDialogOpen(true);
    } finally {
      setLoadingFetch(false);
    }
  };



  const handleCancel = async (id) => {
    try {
      await withTimeout(cancelOtRequest(id), 10000);
      setRows(r => (r || []).map(x => x.id === id ? ({ ...x, status: 'Canceled' }) : x));
      setSnack({ open: true, message: 'ยกเลิกคำขอเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: 'ยกเลิกไม่สำเร็จ', severity: 'error' });
    }
  };

  // --- Filter/search state ---
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [searchQ, setSearchQ] = React.useState('');
  const displayed = React.useMemo(() => {
    let list = rows || [];
    if (filterStatus !== 'all') list = list.filter(r => String(r.status || '').toLowerCase() === filterStatus);
    if (searchQ) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(r => (r.note || '').toLowerCase().includes(q) || (r.type || '').toLowerCase().includes(q) || (r.request_date || '').includes(q));
    }
    return list;
  }, [rows, filterStatus, searchQ]);

  // --- Render ---
  if (loading) return (<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>);
  if (error) return (<Alert severity="error" variant="filled">{error}</Alert>);

  return (
    <Box>
      {isExempt && (
        <Alert severity="info" sx={{ mb: 2 }}>พนักงานกลุ่มนี้ได้รับการยกเว้นการลงเวลา/OT</Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>คำร้องขอ OT</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="ค้นหา" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
          <Select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
          <Button variant="contained" onClick={handleCreateClick} disabled={isExempt || loadingFetch} startIcon={<AddIcon />} sx={{ backgroundColor: '#000', color: '#fff' }}>
            สร้าง
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 1, boxShadow: 'none' }}>
        {(!displayed || displayed.length === 0) ? (
          <Typography color="text.secondary" textAlign={"center"}>ยังไม่มีคำร้องขอ OT</Typography>
        ) : (
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>เลขที่เอกสาร</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>วันที่</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>เวลา OT</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, border: 'none' }}>ชั่วโมง</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>ประเภท</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>ไฟล์แนบ</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>ผู้พิจารณา</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>อัปเดตล่าสุด</TableCell>
                <TableCell sx={{ fontWeight: 700, border: 'none' }}>จัดการ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, border: 'none' }}>การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ border: 'none' }}>{r.doc_no || '-'}</TableCell>
                  <TableCell sx={{ border: 'none' }}>{dayjs(r.request_date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell sx={{ border: 'none' }}>
                    {(() => {
                      const s = formatTimeShort(r.ot_start_time);
                      const e = formatTimeShort(r.ot_end_time);
                      return (s !== ' - ' && e !== ' - ') ? `${s} – ${e}` : ' - ';
                    })()}
                  </TableCell>
                  <TableCell align="right" sx={{ border: 'none' }}>{Number(r.hours || 0).toFixed(2)}</TableCell>
                  <TableCell sx={{ border: 'none' }}>{r.type || '-'}</TableCell>
                  <TableCell sx={{ border: 'none' }} align="center">
                    {((r.attachment_url || r.attachment_preview)) ? (
                      <IconButton size="small" onClick={() => { const url = r.attachment_url || r.attachment_preview; if (url) window.open(url, '_blank'); }} aria-label="เปิดไฟล์แนบ">
                        <UploadFileIcon />
                      </IconButton>
                    ) : (
                      <Typography sx={{ color: 'text.secondary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ border: 'none' }}>
                    <Typography variant="body2">{mapStatusThai(r.status)}</Typography>
                  </TableCell>
                  <TableCell sx={{ border: 'none' }}>{r.approved_by || r.submitted_by || '-'}</TableCell>
                  <TableCell sx={{ border: 'none' }}>{r.updated_at ? dayjs(r.updated_at).format('DD/MM/YYYY HH:mm') : (r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY HH:mm') : '-')}</TableCell>
                  <TableCell sx={{ border: 'none' }}>
                    <Tooltip title="แก้ไข">
                      <span>
                        <IconButton size="small" onClick={() => { setForm({ date: r.request_date, ot_start_time: r.ot_start_time || '18:00', ot_end_time: r.ot_end_time || '19:00', hours: String(Number(r.hours || 0).toFixed(2)), type: r.type || 'AFTER_WORK', project_id: r.project_id || null, note: r.note || '', special_reason: r.special_reason || '', attachment: null, doc_no: r.doc_no || null }); setDialogOpen(true); }}>
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <span>
                        <IconButton size="small" onClick={() => openOtDeleteDialog(r.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center" sx={{ border: 'none' }}>
                    {String((r.status || '')).toLowerCase() === 'draft' ? (
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          try {
                            const ctxForm = {
                              date: r.request_date,
                              ot_start_time: r.ot_start_time || '',
                              ot_end_time: r.ot_end_time || '',
                              hours: String(Number(r.hours || 0).toFixed(2)),
                              type: r.type || 'AFTER_WORK',
                              note: r.note || '',
                              special_reason: r.special_reason || '',
                            };
                            const v = await validateBeforeSubmit(true, ctxForm, r.id);
                            if (!v || !v.ok) {
                              setSnack({ open: true, message: v?.msg || 'ไม่สามารถส่งได้', severity: 'error' });
                              return;
                            }
                            await submitOtRequest(r.id, employeeId);
                            setRows(rr => rr.map(x => x.id === r.id ? ({ ...x, status: 'Submitted' }) : x));
                            setSnack({ open: true, message: 'ส่งคำขอเรียบร้อย', severity: 'success' });
                            if (typeof onCreated === 'function') onCreated();
                          } catch (e) {
                            console.error('submit ot', e);
                            setSnack({ open: true, message: 'ส่งไม่สำเร็จ', severity: 'error' });
                          }
                        }}
                        sx={{ borderColor: '#666', color: '#000' }}
                      >ส่งขออนุมัติ</Button>
                    ) : (String((r.status || '')).toLowerCase() === 'submitted' ? (
                      <Button variant="outlined" onClick={() => handleCancel(r.id)} sx={{ borderColor: '#666', color: '#000' }}>ยกเลิก</Button>
                    ) : (
                      '-'
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog: Create/Edit OT */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); resetFormToDefaults(); }} fullWidth maxWidth="sm">
        <DialogTitle>สร้างคำขอ OT</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>

            <TextField
              size="small"
              label="เลขเอกสาร (สร้างอัตโนมัติ)"
              value={form.doc_no || ''}
              InputProps={{ readOnly: true }}
              disabled
            />

            <FormControl size="small">
              <InputLabel>โครงการ</InputLabel>
              <Select value={form.project_id || ''} label="โครงการ" onChange={(e) => setForm(s => ({ ...s, project_id: e.target.value || null }))}>
                {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.name_th || p.project_code || p.id}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>ประเภท OT</InputLabel>
              <Select value={form.type} label="ประเภท OT" onChange={(e) => {
                const newType = e.target.value;
                setForm(s => ({
                  ...s,
                  type: newType,
                  ot_start_time: (shiftWindow && shiftWindow[newType] && shiftWindow[newType].minStart) ? shiftWindow[newType].minStart : s.ot_start_time,
                  ot_end_time: (shiftWindow && shiftWindow[newType] && shiftWindow[newType].maxEnd) ? shiftWindow[newType].maxEnd : s.ot_end_time,
                }));
              }}>
                {Array.isArray(allowedOtTypes) && allowedOtTypes.length > 0 ? (
                  allowedOtTypes.map(t => (<MenuItem key={String(t)} value={t}>{String(t)}</MenuItem>))
                ) : (
                  <MenuItem value="" disabled>-- ไม่มีประเภท OT --</MenuItem>
                )}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker label="วันที่" value={dayjs(form.date)} onChange={(d) => setForm(s => ({ ...s, date: d?.format('YYYY-MM-DD') }))} slotProps={{ textField: { size: 'small' } }} />
            </LocalizationProvider>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <TextField
                size="small"
                label="OT เริ่ม"
                value={form.ot_start_time}
                onChange={(e) => setForm(s => ({ ...s, ot_start_time: sanitizeTimeInput(e.target.value) }))}
                InputLabelProps={{ shrink: true }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9:]*' }}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                size="small"
                label="OT สิ้นสุด"
                value={form.ot_end_time}
                onChange={(e) => setForm(s => ({ ...s, ot_end_time: sanitizeTimeInput(e.target.value) }))}
                InputLabelProps={{ shrink: true }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9:]*' }}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                size="small"
                label="ชั่วโมง (ชม.)"
                value={form.hours}
                InputProps={{ readOnly: true }}
                sx={{ flex: 0.7, minWidth: 100 }}
              />
            </Stack>





            <TextField label="เหตุผล / งานที่ทำ" multiline rows={2} size="small" required value={form.note} onChange={(e) => setForm(s => ({ ...s, note: e.target.value }))} />

            <TextField label="เหตุผลพิเศษ (ถ้ามี)" multiline rows={2} size="small" value={form.special_reason} onChange={(e) => setForm(s => ({ ...s, special_reason: e.target.value }))} />

            <Box>
              <Button fullWidth variant="outlined" component="label">อัปโหลดเอกสาร
                <input hidden type="file" onChange={(e) => setForm(s => ({ ...s, attachment: e.target.files?.[0] || null }))} />
              </Button>
              {form.attachment && (
                <Typography variant="caption" sx={{ mt: 0.5 }}>{form.attachment.name}</Typography>
              )}
            </Box>


          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); resetFormToDefaults(); }} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSaveDraft} disabled={loadingFetch} sx={{ backgroundColor: '#000', color: '#fff' }}>บันทึกร่าง</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>

      <Dialog open={otDeleteDialogOpen} onClose={() => setOtDeleteDialogOpen(false)} >
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>คุณแน่ใจที่จะลบคำขอนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOtDeleteDialogOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={confirmOtDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

function LeaveRequestTab({ onCreated }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [leaveTypes, setLeaveTypes] = React.useState([]);
  const [leaveTypesMap, setLeaveTypesMap] = React.useState({});
  const [form, setForm] = React.useState({
    leave_type_id: null,
    leave_mode: 'FULL_DAY',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
    half_day_slot: 'AM',
    start_time: '09:00',
    end_time: '12:00',
    reason: '',
    attachment: null,
  });
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [searchQ, setSearchQ] = React.useState('');
  const [leaveDeleteDialogOpen, setLeaveDeleteDialogOpen] = React.useState(false);
  const [leaveDeleteTarget, setLeaveDeleteTarget] = React.useState(null);
  const [leaveEditingId, setLeaveEditingId] = React.useState(null);
  const [leaveApproverNames, setLeaveApproverNames] = React.useState({});

  // list
  const listMyLeaves = React.useCallback(async () => {
    try {
      setLoading(true);
      const eid = await resolveEmployeeId();
      if (!eid) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase.from('tpr_leave_requests').select('*').eq('user_id', eid).order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data || []);
      try {
        const ids = Array.from(new Set((data || []).flatMap(r => [r.approved_by, r.rejected_by]).filter(Boolean)));
        if (ids.length) {
          const { data: emps, error: empErr } = await supabase
            .from('v_employees_display_name')
            .select('id,display_name')
            .in('id', ids);

          console.debug('load leave approver names', { ids, emps, empErr });
          if (!empErr && Array.isArray(emps)) {
            const map = {};
            for (const e of emps) {
              map[String(e.id)] = e.display_name || String(e.id);
            }
            setLeaveApproverNames(map);
            console.debug('leaveApproverNames', map);
          }
        } else {
          setLeaveApproverNames({});
          console.debug('leaveApproverNames', {});
        }
      } catch (err) {
        console.error('load leave approver names', err);
        setLeaveApproverNames({});
        console.debug('leaveApproverNames', {});
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { listMyLeaves(); }, [listMyLeaves]);

  // load leave type master data
  const loadLeaveTypes = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.from('leave_type').select('id,leave_id,leave_name_th,leave_name_en').eq('is_active', true).order('leave_name_th', { ascending: true }).limit(500);
      if (error) throw error;
      const types = data || [];
      setLeaveTypes(types);
      const map = {};
      types.forEach(t => { map[String(t.id)] = t.leave_name_th || t.leave_id || String(t.id); });
      setLeaveTypesMap(map);
      setForm(f => ({ ...f, leave_type_id: f.leave_type_id || (types[0] ? types[0].id : null) }));
    } catch (e) {
      console.error('loadLeaveTypes failed', e);
      setLeaveTypes([]);
      setLeaveTypesMap({});
    }
  }, []);

  React.useEffect(() => { loadLeaveTypes(); }, [loadLeaveTypes]);

  const openCreate = async () => {
    setLeaveEditingId(null);
    setForm({ leave_type_id: (leaveTypes[0] ? leaveTypes[0].id : null), leave_mode: 'FULL_DAY', start_date: dayjs().format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'), half_day_slot: 'AM', start_time: '09:00', end_time: '12:00', reason: '', attachment: null });
    setDialogOpen(true);

  };

  const validateAndCompute = () => {
    // basic frontend validation per spec (workdays, lead time, sick attachment, hourly rounding)
    const start = dayjs(form.start_date, 'YYYY-MM-DD');
    const end = dayjs(form.end_date, 'YYYY-MM-DD');
    if (!start.isValid() || !end.isValid()) return { ok: false, msg: 'วันที่ไม่ถูกต้อง' };
    if (form.leave_mode === 'HOURLY') {
      if (start.format('YYYY-MM-DD') !== end.format('YYYY-MM-DD')) return { ok: false, msg: 'สำหรับแบบชั่วโมง ต้องเลือกวันเดียวกัน' };
      const s = dayjs(`${form.start_date}T${form.start_time}`);
      const e = dayjs(`${form.end_date}T${form.end_time}`);
      if (!s.isValid() || !e.isValid() || !e.isAfter(s)) return { ok: false, msg: 'ช่วงเวลาไม่ถูกต้อง' };
      const hours = Math.round(((e.diff(s, 'minute') / 60)) * 4) / 4; // quarter-hour
      return { ok: true, hours, days: +(hours / 8).toFixed(2) };
    }
    // FULL/HALF day
    const days = Math.max(1, end.diff(start, 'day') + 1);
    let totalDays = days;
    if (form.leave_mode === 'HALF_DAY') totalDays = 0.5;
    return { ok: true, hours: +(totalDays * 8).toFixed(2), days: +totalDays.toFixed(2) };
  };

  const handleSaveDraft = async () => {
    try {
      const eid = await resolveEmployeeId();
      if (!eid) { setSnack({ open: true, message: 'ไม่พบข้อมูลพนักงาน', severity: 'error' }); return; }
      const calc = validateAndCompute();
      if (!calc.ok) { setSnack({ open: true, message: calc.msg, severity: 'error' }); return; }
      // (selectedType not needed here)

      // If HALF_DAY, try to fetch shift segments and use morning/afternoon hours
      let durationHours = calc.hours;
      if (form.leave_mode === 'HALF_DAY') {
        try {
          const res = await supabaseData.fetchEmployeeShiftSegmentsHours({ identifier: eid || undefined });
          if (res && res.data) {
            const d = res.data;
            if (form.half_day_slot === 'AM' && typeof d.morning_hours === 'number') durationHours = d.morning_hours;
            else if (form.half_day_slot === 'PM' && typeof d.afternoon_hours === 'number') durationHours = d.afternoon_hours;
          }
        } catch (e) {
          console.error('fetchEmployeeShiftSegmentsHours error (save draft)', e);
        }
      }

      const payload = {
        user_id: eid,
        leave_type_id: form.leave_type_id || null,
        leave_mode: form.leave_mode,
        start_at: dayjs(form.start_date).startOf('day').toISOString(),
        end_at: dayjs(form.end_date).endOf('day').toISOString(),
        duration_hours: durationHours,
        duration_days: calc.days,
        half_day_slot: form.leave_mode === 'HALF_DAY' ? form.half_day_slot : null,
        reason: form.reason,
        attachment_url: null,
        status: 'Draft'
      };
      // attachments (optional) - upload file (deferred) to project-files/leave/... and store URL in payload
      if (form.attachment) {
        try {
          const { data: udata } = await supabase.auth.getUser();
          const userId = udata?.user?.id || 'anon';
          const file = form.attachment;
          const fname = `${userId}_${Date.now()}_${(file.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = form.leave_type_id ? `${userId}/${fname}` : `leave/${userId}/${fname}`;
          const { error: upErr } = await supabase.storage.from('leave-files').upload(filePath, file, { upsert: true });
          if (upErr) throw upErr;
          // try signed url first
          let signedUrl = null;
          try {
            const { data: signedData } = await supabase.storage.from('leave-files').createSignedUrl(filePath, 60 * 60 * 24 * 7);
            if (signedData) signedUrl = signedData.signedURL || signedData.signedUrl || signedData.signedurl || null;
          } catch {
            signedUrl = null;
          }
          let publicUrl = null;
          if (!signedUrl) {
            const pu = await supabase.storage.from('leave-files').getPublicUrl(filePath);
            publicUrl = pu?.data?.publicUrl || pu?.publicUrl || null;
          }
          const finalUrl = signedUrl || publicUrl || null;
          if (finalUrl) payload.attachment_url = finalUrl;
        } catch (e) {
          console.debug('leave attachment upload exception', e);
        }
      }

      // If editing an existing leave, update; otherwise insert new row
      let data = null;
      if (leaveEditingId) {
        const { data: updData, error: updErr } = await supabase
          .from('tpr_leave_requests')
          .update({ ...payload })
          .eq('id', leaveEditingId)
          .select('id, doc_no, doc_period, doc_seq, status, start_at, end_at')
          .maybeSingle();
        if (updErr) throw updErr;
        data = updData;
        setSnack({ open: true, message: `บันทึกการแก้ไขเรียบร้อย`, severity: 'success' });
      } else {
        // Insert and return full row (trigger will populate doc_no)
        const { data: insData, error: insErr } = await supabase
          .from('tpr_leave_requests')
          .insert([{ ...payload, user_id: eid }])
          .select('id, doc_no, doc_period, doc_seq, status, start_at, end_at')
          .single();
        if (insErr) throw insErr;
        data = insData;
        setSnack({ open: true, message: 'บันทึกร่างเรียบร้อย', severity: 'success' });
      }

      // update form with generated doc_no so modal shows it
      if (data && data.doc_no) {
        setForm(f => ({ ...f, doc_no: data.doc_no, doc_period: data.doc_period || f.doc_period, doc_seq: data.doc_seq || f.doc_seq }));
      }

      setDialogOpen(false);
      setLeaveEditingId(null);
      await listMyLeaves();
      if (onCreated) onCreated();
    } catch (err) { console.error(err); setSnack({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' }); }
  };



  const handleConfirmDelete = async () => {
    try {
      if (!leaveDeleteTarget) return;
      const { error } = await supabase.from('tpr_leave_requests').delete().eq('id', leaveDeleteTarget);
      if (error) throw error;
      setSnack({ open: true, message: 'ลบรายการเรียบร้อย', severity: 'success' });
      setLeaveDeleteDialogOpen(false);
      setLeaveDeleteTarget(null);
      await listMyLeaves();
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: 'ไม่สามารถลบรายการได้', severity: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>ขอลางาน</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="ค้นหา" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
          <Select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
          <Button variant="contained" onClick={openCreate} startIcon={<AddIcon />} sx={{ backgroundColor: '#000', color: '#fff' }}>ขอลา</Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 1, boxShadow: 'none' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>เลขที่เอกสาร</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>วันที่</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ช่วงวันที่ลา</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>จำนวน</TableCell>

                <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>ไฟล์แนบ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ผู้พิจารณา</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>อัปเดตล่าสุด</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.doc_no || '-'}</TableCell>
                  <TableCell>{dayjs(r.created_at).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{dayjs(r.start_at).format('DD/MM/YYYY')} – {dayjs(r.end_at).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>{leaveTypesMap[String(r.leave_type_id)] || r.leave_type || '-'}</TableCell>
                  <TableCell>{(r.duration_days ? Number(r.duration_days).toFixed(2) + ' วัน' : '') + (r.duration_hours ? ` (${Number(r.duration_hours).toFixed(2)} ชม.)` : '')}</TableCell>

                  <TableCell align="center">{r.attachment_url ? (<IconButton size="small" onClick={() => window.open(r.attachment_url, '_blank')}><UploadFileIcon /></IconButton>) : (<Typography sx={{ color: 'text.secondary' }}>-</Typography>)}</TableCell>
                  <TableCell>{mapStatusThai(r.status)}</TableCell>

                  <TableCell>
                    {(() => {
                      const s = String(r.status || '').toLowerCase();

                      const reviewerId =
                        s === 'approved' ? r.approved_by :
                          s === 'rejected' ? r.rejected_by :
                              null;

                      if (!reviewerId) return '-';

                      return leaveApproverNames[String(reviewerId)] || String(reviewerId);
                    })()}
                  </TableCell>


                  <TableCell>{r.updated_at ? dayjs(r.updated_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const s = String((r.status || '')).toLowerCase();
                      const canManage = s === 'draft';
                      return (
                        <>
                          <Tooltip title="แก้ไข">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => { setLeaveEditingId(r.id); setForm({ ...form, leave_type_id: r.leave_type_id || null, leave_mode: r.leave_mode, start_date: dayjs(r.start_at).format('YYYY-MM-DD'), end_date: dayjs(r.end_at).format('YYYY-MM-DD'), start_time: (r.start_at ? dayjs(r.start_at).format('HH:mm') : '09:00'), end_time: (r.end_at ? dayjs(r.end_at).format('HH:mm') : '12:00'), reason: r.reason, doc_no: r.doc_no || null, doc_period: r.doc_period || null, doc_seq: r.doc_seq || null }); setDialogOpen(true); }}
                                disabled={!canManage}
                                sx={{ color: canManage ? '#666' : '#bbb', mr: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="ลบ">
                            <span>
                              <IconButton size="small" onClick={() => { setLeaveDeleteTarget(r.id); setLeaveDeleteDialogOpen(true); }} disabled={!canManage} sx={{ color: canManage ? '#666' : '#bbb' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {/* approved items should not show inline cancel button here */}
                        </>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const s = String((r.status || '')).toLowerCase();
                      if (s === 'draft') {
                        return (
                          <Button variant="outlined" onClick={async () => {
                            try {
                              const eid = await resolveEmployeeId();
                              if (!eid) { setSnack({ open: true, message: 'ไม่พบข้อมูลพนักงาน', severity: 'error' }); return; }
                              const { error } = await supabase.from('tpr_leave_requests').update({ status: 'Submitted', submitted_at: new Date().toISOString(), submitted_by: eid }).eq('id', r.id);
                              if (error) throw error;
                              setSnack({ open: true, message: 'ส่งคำขอเรียบร้อย', severity: 'success' });
                              await listMyLeaves();
                            } catch (e) {
                              console.error(e);
                              setSnack({ open: true, message: `ส่งคำขอไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
                            }
                          }} sx={{ borderColor: '#000', color: '#000', '&:hover': { backgroundColor: '#fafafa' } }}>ส่งขออนุมัติ</Button>
                        );
                      }
                      if (s === 'submitted') {
                        return (
                          <Button variant="outlined" onClick={async () => {
                            try {
                              const eid = await resolveEmployeeId();
                              if (!eid) { setSnack({ open: true, message: 'ไม่พบข้อมูลพนักงาน', severity: 'error' }); return; }
                              const { error } = await supabase.from('tpr_leave_requests').update({ status: 'Draft', submitted_at: null, submitted_by: null }).eq('id', r.id);
                              if (error) throw error;
                              setSnack({ open: true, message: 'ยกเลิกการส่งเรียบร้อย', severity: 'success' });
                              await listMyLeaves();
                            } catch (e) {
                              console.error(e);
                              setSnack({ open: true, message: `ยกเลิกการส่งไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
                            }
                          }} sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}>ยกเลิกการส่ง</Button>
                        );
                      }
                      return (<Typography sx={{ color: 'text.secondary' }}>-</Typography>);
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm(f => ({ ...f, attachment: null })); setLeaveEditingId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>ขออนุมัติลางาน</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="เลขที่เอกสาร (สร้างอัตโนมัติ)"
              value={form.doc_no || ''}
              placeholder="ระบบจะสร้างเลขให้อัตโนมัติ"
              InputProps={{ readOnly: true }}
              disabled
            />
            <FormControl size="small">
              <InputLabel>ประเภทลา</InputLabel>
              <Select value={form.leave_type_id || ''} label="ประเภทลา" onChange={(e) => setForm(s => ({ ...s, leave_type_id: e.target.value }))}>
                {leaveTypes.length ? (
                  leaveTypes.map(t => (<MenuItem key={t.id} value={t.id}>{t.leave_name_th || t.leave_id}</MenuItem>))
                ) : (
                  <MenuItem value="" disabled>-- ไม่มีประเภทลา --</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>รูปแบบ</InputLabel>
              <Select value={form.leave_mode} label="รูปแบบ" onChange={(e) => setForm(s => ({ ...s, leave_mode: e.target.value }))}>
                <MenuItem value="FULL_DAY">เต็มวัน</MenuItem>
                <MenuItem value="HALF_DAY">ครึ่งวัน</MenuItem>
                <MenuItem value="HOURLY">เป็นชั่วโมง</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Box sx={{ flex: 1 }}>
                  <DatePicker
                    label="วันที่เริ่ม"
                    value={dayjs(form.start_date)}
                    onChange={(d) => setForm(s => ({ ...s, start_date: d?.format('YYYY-MM-DD') }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <DatePicker
                    label="วันที่สิ้นสุด"
                    value={dayjs(form.end_date)}
                    onChange={(d) => setForm(s => ({ ...s, end_date: d?.format('YYYY-MM-DD') }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
              </Stack>
            </LocalizationProvider>
            {form.leave_mode === 'HALF_DAY' && (
              <FormControl size="small">
                <InputLabel>ครึ่งวัน</InputLabel>
                <Select value={form.half_day_slot} label="ครึ่งวัน" onChange={(e) => setForm(s => ({ ...s, half_day_slot: e.target.value }))}>
                  <MenuItem value="AM">เช้า (AM)</MenuItem>
                  <MenuItem value="PM">บ่าย (PM)</MenuItem>
                </Select>
              </FormControl>
            )}
            {form.leave_mode === 'HOURLY' && (
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Box sx={{ flex: 1 }}>
                  <TextField fullWidth size="small" label="เวลาเริ่ม" value={form.start_time} onChange={(e) => setForm(s => ({ ...s, start_time: sanitizeLeaveTimeInput(e.target.value) }))} inputProps={{ inputMode: 'numeric', pattern: '[0-9:]*' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField fullWidth size="small" label="เวลาสิ้นสุด" value={form.end_time} onChange={(e) => setForm(s => ({ ...s, end_time: sanitizeLeaveTimeInput(e.target.value) }))} inputProps={{ inputMode: 'numeric', pattern: '[0-9:]*' }} />
                </Box>
              </Stack>
            )}
            <TextField label="เหตุผล" multiline rows={3} required value={form.reason} onChange={(e) => setForm(s => ({ ...s, reason: e.target.value }))} />
            <Box>
              <Button fullWidth variant="outlined" component="label">อัปโหลดเอกสาร
                <input hidden type="file" onChange={(e) => setForm(s => ({ ...s, attachment: e.target.files?.[0] || null }))} />
              </Button>
              {form.attachment && (
                <Typography variant="caption" sx={{ mt: 0.5 }}>{form.attachment.name}</Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSaveDraft} sx={{ backgroundColor: '#000', color: '#fff' }}>บันทึกร่าง</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={leaveDeleteDialogOpen} onClose={() => { setLeaveDeleteDialogOpen(false); setLeaveDeleteTarget(null); }}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>คุณแน่ใจที่จะลบคำขอนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLeaveDeleteDialogOpen(false); setLeaveDeleteTarget(null); }} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

function AttendanceCorrectionsTab({ onCreated }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ work_date: dayjs().format('YYYY-MM-DD'), requested_clock_in_at: '', requested_clock_out_at: '', reason: '', note: '', attachment: null, doc_no: null });
  const [originalTimes, setOriginalTimes] = React.useState({ clock_in_at: null, clock_out_at: null });
  const [editingId, setEditingId] = React.useState(null);
  const [isDirtyRequestedIn, setIsDirtyRequestedIn] = React.useState(false);
  const [isDirtyRequestedOut, setIsDirtyRequestedOut] = React.useState(false);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [searchQ, setSearchQ] = React.useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [uploadInfo, setUploadInfo] = React.useState({ status: 'idle', path: null });
  const [approverNames, setApproverNames] = React.useState({});

  const listMyCorrections = React.useCallback(async () => {
    setLoading(true);
    try {
      const eid = await resolveEmployeeId();
      if (!eid) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase.from('tpr_attendance_corrections').select('*').eq('user_id', eid).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      setRows(data || []);

      // collect approver IDs (approved_by / submitted_by) and resolve display names
      try {
        const idSet = new Set();
        (data || []).forEach((r) => {
          if (r.approved_by) idSet.add(String(r.approved_by));
          if (r.submitted_by) idSet.add(String(r.submitted_by));
        });
        const ids = Array.from(idSet);
        if (ids.length > 0) {
          const { data: empRows, error: empErr } = await supabase.from('v_employees_display_name').select('id, display_name').in('id', ids);
          if (!empErr && empRows) {
            const map = {};
            empRows.forEach((e) => { map[String(e.id)] = e.display_name || String(e.id); });
            setApproverNames(map);
          }
        } else {
          setApproverNames({});
        }
      } catch (e) {
        console.error('failed to load approver names', e);
        setApproverNames({});
      }
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { listMyCorrections(); }, [listMyCorrections]);

  const openCreate = () => {
    setEditingId(null);
    setIsDirtyRequestedIn(false);
    setIsDirtyRequestedOut(false);
    setForm({ work_date: dayjs().format('YYYY-MM-DD'), requested_clock_in_at: '', requested_clock_out_at: '', reason: '', note: '', attachment: null, doc_no: null });
    setOriginalTimes({ clock_in_at: null, clock_out_at: null });
    setUploadInfo({ status: 'idle', path: null });
    setDialogOpen(true);
  };

  const handleFetchOriginal = async (workDate) => {
    try {
      const eid = await resolveEmployeeId(); if (!eid) return;
      const { data, error } = await supabase.from('tpr_attendance_daily').select('clock_in_at,clock_out_at').eq('user_id', eid).eq('work_date', workDate).maybeSingle();
      if (!error && data) setOriginalTimes({ clock_in_at: data.clock_in_at, clock_out_at: data.clock_out_at });
      else setOriginalTimes({ clock_in_at: null, clock_out_at: null });
    } catch { setOriginalTimes({ clock_in_at: null, clock_out_at: null }); }
  };

  React.useEffect(() => { if (dialogOpen) handleFetchOriginal(form.work_date); }, [dialogOpen, form.work_date]);

  // Prefill requested_* fields from originalTimes when creating a new record
  React.useEffect(() => {
    if (!dialogOpen) return;
    // do not override when editing an existing record
    if (editingId) return;
    // respect user-typed values (dirty flags)
    const origIn = originalTimes.clock_in_at || null;
    const origOut = originalTimes.clock_out_at || null;
    const inStr = origIn ? dayjs(origIn).format('HH:mm') : '';
    const outStr = origOut ? dayjs(origOut).format('HH:mm') : '';
    // Apply logic only when user hasn't typed in the requested fields
    setForm((prev) => {
      // if user already changed requested fields, keep them
      const keepIn = isDirtyRequestedIn || (prev.requested_clock_in_at && String(prev.requested_clock_in_at).trim());
      const keepOut = isDirtyRequestedOut || (prev.requested_clock_out_at && String(prev.requested_clock_out_at).trim());
      // If daily has no record, leave both blank
      if (!origIn && !origOut) {
        return {
          ...prev,
          requested_clock_in_at: keepIn ? prev.requested_clock_in_at : '',
          requested_clock_out_at: keepOut ? prev.requested_clock_out_at : '',
        };
      }
      // MISS_IN: origIn null, origOut exists
      if (!origIn && origOut) {
        return {
          ...prev,
          requested_clock_in_at: keepIn ? prev.requested_clock_in_at : '',
          requested_clock_out_at: keepOut ? prev.requested_clock_out_at : outStr,
        };
      }
      // MISS_OUT: origIn exists, origOut null
      if (origIn && !origOut) {
        return {
          ...prev,
          requested_clock_in_at: keepIn ? prev.requested_clock_in_at : inStr,
          requested_clock_out_at: keepOut ? prev.requested_clock_out_at : '',
        };
      }
      // ADJUST: both exist
      return {
        ...prev,
        requested_clock_in_at: keepIn ? prev.requested_clock_in_at : inStr,
        requested_clock_out_at: keepOut ? prev.requested_clock_out_at : outStr,
      };
    });
  }, [originalTimes, dialogOpen, editingId, isDirtyRequestedIn, isDirtyRequestedOut]);

  const handleFileChange = async (e) => {
    // mirror OT tab behavior: do not upload immediately. store selected File object and show name.
    const f = e.target.files?.[0] || null;
    setUploadInfo({ status: 'idle', path: null });
    if (!f) return setForm(s => ({ ...s, attachment: null }));
    setForm(s => ({ ...s, attachment: f }));
    setUploadInfo({ status: 'selected', path: f.name });
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const eid = await resolveEmployeeId(); if (!eid) throw new Error('ไม่พบพนักงาน');
      if (!form.work_date) { setSnack({ open: true, message: 'กรุณาเลือกวันที่', severity: 'error' }); setLoading(false); return; }
      if (!form.reason || String(form.reason).trim() === '') { setSnack({ open: true, message: 'กรุณาระบุเหตุผล', severity: 'error' }); setLoading(false); return; }
      // require both requested times: start and end
      if ((!form.requested_clock_in_at || !String(form.requested_clock_in_at).trim()) || (!form.requested_clock_out_at || !String(form.requested_clock_out_at).trim())) {
        setSnack({ open: true, message: 'กรุณาระบุทั้งเวลาเริ่มและเวลาสิ้นสุดที่ต้องการแก้ไข', severity: 'error' });
        setLoading(false);
        return;
      }
      const p_requested_clock_in_at = form.requested_clock_in_at ? dayjs(`${form.work_date}T${form.requested_clock_in_at}`).toISOString() : null;
      const p_requested_clock_out_at = form.requested_clock_out_at ? dayjs(`${form.work_date}T${form.requested_clock_out_at}`).toISOString() : null;
      // attachments: if a File was selected, upload now (use same approach as OT tab) and obtain signed/public URL
      let attachmentUrl = null;
      try {
        if (form.attachment && form.attachment.name) {
          const { data: udata } = await supabase.auth.getUser();
          const userId = udata?.user?.id || 'anon';
          const file = form.attachment;
          const fname = `${userId}_${Date.now()}_${(file.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = `${userId}/${fname}`;
          const { error: upErr } = await supabase.storage.from('attendance-corrections-files').upload(filePath, file, { upsert: true });
          if (upErr) throw upErr;
          let signedUrl = null;
          try {
            const { data: signedData } = await supabase.storage.from('attendance-corrections-files').createSignedUrl(filePath, 60 * 60 * 24 * 7);
            if (signedData) signedUrl = signedData.signedURL || signedData.signedUrl || signedData.signedurl || null;
          } catch {
            signedUrl = null;
          }
          if (!signedUrl) {
            const pu = await supabase.storage.from('attendance-corrections-files').getPublicUrl(filePath);
            attachmentUrl = pu?.data?.publicUrl || pu?.publicUrl || null;
          } else {
            attachmentUrl = signedUrl;
          }
        } else if (form.attachment && typeof form.attachment === 'string') {
          attachmentUrl = form.attachment;
        }
      } catch (uploadErr) {
        console.error('attachment upload failed', uploadErr);
        setSnack({ open: true, message: uploadErr?.message || 'อัปโหลดไฟล์ล้มเหลว', severity: 'error' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('tpr_create_attendance_correction_draft', { p_user_id: eid, p_work_date: form.work_date, p_requested_clock_in_at, p_requested_clock_out_at, p_reason: form.reason, p_note: form.note || null, p_attachment_url: attachmentUrl || null });
      if (error) throw error;
      const item = Array.isArray(data) ? data[0] : data;
      if (item) {
        setForm(f => ({ ...f, doc_no: item.doc_no || null, attachment: null }));
        setUploadInfo({ status: 'idle', path: null });
        setSnack({ open: true, message: `บันทึกสำเร็จ`, severity: 'success' });
        await listMyCorrections();
        setDialogOpen(false);
        if (typeof onCreated === 'function') onCreated();
      }
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: e?.message || 'บันทึกร่างไม่สำเร็จ', severity: 'error' });
    } finally { setLoading(false); }
  };

  const submitRequest = async (id) => {
    setLoading(true);
    try {
      const eid = await resolveEmployeeId(); if (!eid) throw new Error('ไม่พบพนักงาน');
      const { error } = await supabase.from('tpr_attendance_corrections').update({ status: 'Submitted', submitted_at: new Date().toISOString(), submitted_by: eid }).eq('id', id);
      if (error) throw error;
      setSnack({ open: true, message: 'ส่งคำขอเรียบร้อย', severity: 'success' });
      await listMyCorrections();
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: e?.message || 'ส่งคำขอไม่สำเร็จ', severity: 'error' });
    } finally { setLoading(false); }
  };

  const cancelSubmission = async (id) => {
    setLoading(true);
    try {
      const eid = await resolveEmployeeId(); if (!eid) throw new Error('ไม่พบพนักงาน');
      const { error } = await supabase.from('tpr_attendance_corrections').update({ status: 'Draft', submitted_at: null, submitted_by: null }).eq('id', id);
      if (error) throw error;
      setSnack({ open: true, message: 'ยกเลิกการส่งเรียบร้อย', severity: 'success' });
      await listMyCorrections();
    } catch (e) {
      console.error(e);
      setSnack({ open: true, message: e?.message || 'ยกเลิกการส่งไม่สำเร็จ', severity: 'error' });
    } finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    try {
      if (!deleteTarget) return;
      const { error } = await supabase.from('tpr_attendance_corrections').delete().eq('id', deleteTarget);
      if (error) throw error;
      setSnack({ open: true, message: 'ลบเรียบร้อย', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await listMyCorrections();
    } catch (e) { console.error(e); setSnack({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' }); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>ขอแก้ไขเวลา</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="ค้นหา" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
          <Select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
          <Button variant="contained" onClick={openCreate} startIcon={<AddIcon />} sx={{ backgroundColor: '#000', color: '#fff' }}>ขอแก้ไขเวลา</Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 1, boxShadow: 'none' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>เลขที่เอกสาร</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>วันที่</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>เวลาเดิม</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>เวลาที่ขอแก้</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ไฟล์แนบ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ผู้พิจารณา</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>อัปเดตล่าสุด</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.doc_no || '-'}</TableCell>
                  <TableCell>{r.work_date ? dayjs(r.work_date).format('DD/MM/YYYY') : '-'}</TableCell>
                  <TableCell>{(r.original_clock_in_at ? supabaseData.formatTimeTH(r.original_clock_in_at) : '-') + (r.original_clock_out_at ? (' - ' + supabaseData.formatTimeTH(r.original_clock_out_at)) : '')}</TableCell>
                  <TableCell>{(r.requested_clock_in_at ? supabaseData.formatTimeTH(r.requested_clock_in_at) : '-') + (r.requested_clock_out_at ? (' - ' + supabaseData.formatTimeTH(r.requested_clock_out_at)) : '')}</TableCell>
                  <TableCell textAlign="center">
                    {r.attachment_url ? (
                      <IconButton size="small" onClick={() => window.open(r.attachment_url, '_blank')} aria-label="เปิดไฟล์แนบ">
                        <UploadFileIcon />
                      </IconButton>
                    ) : (
                      <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>{(() => {
                    const MAP = {
                      MISS_IN: 'ลืมลงเวลาเข้า',
                      MISS_OUT: 'ลืมลงเวลาออก',
                      ADJUST: 'ปรับเวลา',
                      OTHER: 'อื่น ๆ',
                    };
                    return MAP[String(r.correction_type)] || (r.correction_type ? String(r.correction_type) : '-');
                  })()}</TableCell>
                  <TableCell>{mapStatusThai(r.status)}</TableCell>
                  <TableCell>{approverNames[String(r.approved_by)] || approverNames[String(r.submitted_by)] || (r.approved_by ? String(r.approved_by) : (r.submitted_by ? String(r.submitted_by) : '-'))}</TableCell>
                  <TableCell>{r.updated_at ? dayjs(r.updated_at).format('DD/MM/YYYY HH:mm') : '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const isDraft = String((r.status || '')).toLowerCase() === 'draft';
                      return (
                        <>
                          <Tooltip title="แก้ไข">
                            <span>
                              <IconButton size="small" disabled={!isDraft} onClick={() => {
                                setEditingId(r.id);
                                // preserve requested values from record (edit mode)
                                setIsDirtyRequestedIn(!!r.requested_clock_in_at);
                                setIsDirtyRequestedOut(!!r.requested_clock_out_at);
                                setForm({ work_date: dayjs(r.work_date).format('YYYY-MM-DD'), requested_clock_in_at: r.requested_clock_in_at ? dayjs(r.requested_clock_in_at).format('HH:mm') : '', requested_clock_out_at: r.requested_clock_out_at ? dayjs(r.requested_clock_out_at).format('HH:mm') : '', reason: r.reason || '', note: r.note || '', attachment: r.attachment_url || null, doc_no: r.doc_no || null });
                                setDialogOpen(true);
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="ลบ">
                            <span>
                              <IconButton size="small" disabled={!isDraft} onClick={() => { setDeleteTarget(r.id); setDeleteDialogOpen(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const st = String((r.status || '')).toLowerCase();
                      if (st === 'draft') return (<Button variant="outlined" onClick={() => submitRequest(r.id)} sx={{ borderColor: '#000', color: '#000' }}>ส่งขออนุมัติ</Button>);
                      if (st === 'submitted') return (<Button variant="outlined" onClick={() => cancelSubmission(r.id)} sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}>ยกเลิกการส่ง</Button>);
                      return (<Typography sx={{ color: 'text.secondary' }}>-</Typography>);
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ขอแก้ไขเวลา</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="เลขที่เอกสาร (สร้างอัตโนมัติ)" value={form.doc_no || ''} InputProps={{ readOnly: true }} disabled />
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker label="วันที่ทำงาน" value={dayjs(form.work_date)} onChange={(d) => setForm(s => ({ ...s, work_date: d?.format('YYYY-MM-DD') }))} slotProps={{ textField: { size: 'small' } }} />

              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                  <TextField
                    size="small"
                    label="เวลาเริ่ม (ระบบ)"
                    value={originalTimes.clock_in_at ? supabaseData.formatTimeTH(originalTimes.clock_in_at) : ''}
                    InputProps={{ readOnly: true }}
                    disabled
                    fullWidth
                    sx={{ flex: 1, bgcolor: '#fafafa' }}
                  />
                  <TextField
                    size="small"
                    label="เวลาสิ้นสุด (ระบบ)"
                    value={originalTimes.clock_out_at ? supabaseData.formatTimeTH(originalTimes.clock_out_at) : ''}
                    InputProps={{ readOnly: true }}
                    disabled
                    fullWidth
                    sx={{ flex: 1, bgcolor: '#fafafa' }}
                  />
                </Stack>
              </Box>

              <Stack direction="row" spacing={2} sx={{ width: '100%', mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <TimePicker
                    label="เวลาเริ่มที่ขอ"
                    value={form.requested_clock_in_at ? dayjs(`${form.work_date}T${form.requested_clock_in_at}`) : null}
                    onChange={(d) => { setIsDirtyRequestedIn(true); setForm(s => ({ ...s, requested_clock_in_at: d ? dayjs(d).format('HH:mm') : '' })); }}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TimePicker
                    label="เวลาสิ้นสุดที่ขอ"
                    value={form.requested_clock_out_at ? dayjs(`${form.work_date}T${form.requested_clock_out_at}`) : null}
                    onChange={(d) => { setIsDirtyRequestedOut(true); setForm(s => ({ ...s, requested_clock_out_at: d ? dayjs(d).format('HH:mm') : '' })); }}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
              </Stack>
            </LocalizationProvider>
            {/* Requested times are represented by the TimePicker pair above. Removed duplicate system/requested textfields. */}
            <TextField label="เหตุผล" multiline rows={3} required value={form.reason} onChange={(e) => setForm(s => ({ ...s, reason: e.target.value }))} />
            {/* <TextField label="หมายเหตุ" multiline rows={2} value={form.note} onChange={(e) => setForm(s => ({ ...s, note: e.target.value }))} /> */}
            <Button variant="outlined" component="label">อัปโหลดเอกสาร<input hidden type="file" onChange={handleFileChange} /></Button>
            {uploadInfo.status === 'selected' && (
              <Typography variant="caption" color="text.secondary">{uploadInfo.path}</Typography>
            )}
            {uploadInfo.status === 'uploading' && <Alert severity="info">กำลังอัปโหลด...</Alert>}
            {uploadInfo.status === 'error' && <Alert severity="error">อัปโหลดล้มเหลว</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveDraft} sx={{ backgroundColor: '#000', color: '#fff' }}>บันทึกร่าง</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>คุณแน่ใจที่จะลบคำขอนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// ================= Weekly Timesheet =================
// Resolve the employee.id for the current logged-in user by email
// Module-level helper so multiple components in this file can reuse it.
async function resolveEmployeeId() {
  try {
    let email = null;
    try {
      const { data: udata } = await supabase.auth.getUser();
      email = udata?.user?.email ?? null;
    } catch {
      email = null;
    }
    if (!email) {
      try {
        const { data: sdata } = await supabase.auth.getSession();
        email = sdata?.session?.user?.email ?? null;
      } catch {
        email = null;
      }
    }
    if (!email) return null;
    const emailLower = String(email).trim().toLowerCase();
    // try exact match on current_address_email_1/2/3
    try {
      const orFilter = `current_address_email_1.eq.${emailLower},current_address_email_2.eq.${emailLower},current_address_email_3.eq.${emailLower}`;
      const { data: empRows, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .or(orFilter)
        .limit(1);
      if (!empErr && empRows && empRows[0]) return empRows[0].id;
    } catch {
      // ignore
    }
    // fallback: ilike search
    try {
      const pattern = `*${emailLower}*`;
      const orFilterIlike = `current_address_email_1.ilike.${pattern},current_address_email_2.ilike.${pattern},current_address_email_3.ilike.${pattern}`;
      const { data: empRows2, error: empErr2 } = await supabase
        .from('employees')
        .select('id')
        .or(orFilterIlike)
        .limit(1);
      if (!empErr2 && empRows2 && empRows2[0]) return empRows2[0].id;
    } catch {
      // ignore
    }
    return null;
  } catch {
    return null;
  }
}
function MyHoursSummary({ refreshKey }) {
  const [myHours, setMyHours] = React.useState([]);
  const [hoursLoading, setHoursLoading] = React.useState(false);
  const [hoursError, setHoursError] = React.useState('');
  const [selectedMonth, setSelectedMonth] = React.useState(dayjs().format('YYYY-MM')); // Month selection state

  // kept for reference if decimals are needed in future
  const formatHMM = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '0:00';
    const totalMin = Math.round(x * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const buildDateHoursMap = (entries) => {
    const map = {};
    (entries || []).forEach((e) => {
      const key = dayjs(e.entry_date).format('YYYY-MM-DD');
      const h = Number(e.hours);
      if (!Number.isFinite(h)) return;
      map[key] = (map[key] || 0) + h;
    });
    return map;
  };

  // removed project summary map for this view

  const fetchMonthHours = React.useCallback(async () => {
    setHoursError('');
    setHoursLoading(true);
    try {
      const employeeId = await resolveEmployeeId();
      if (!employeeId) throw new Error('ไม่พบพนักงานของผู้ใช้ที่ล็อกอิน');

      const monthBase = dayjs(`${selectedMonth}-01`);
      const start = monthBase.startOf('month').format('YYYY-MM-DD');
      const end = monthBase.endOf('month').format('YYYY-MM-DD');
      const { data: rows, error } = await supabase
        .from('tpr_time_entries')
        .select('entry_date,hours,project_id,task_id,status')
        .eq('user_id', employeeId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('entry_date', { ascending: true })
        .limit(2000);
      if (error) throw error;
      setMyHours(rows || []);
    } catch (e) {
      setHoursError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
      setMyHours([]);
    } finally {
      setHoursLoading(false);
    }
  }, [selectedMonth]);

  React.useEffect(() => {
    fetchMonthHours();
  }, [fetchMonthHours]);

  React.useEffect(() => {
    if (refreshKey !== undefined) fetchMonthHours().catch(() => { });
  }, [refreshKey, fetchMonthHours]);

  // removed project names fetch since project summary is not shown

  // Aggregation: hours by project (labels, values)
  // Fetch project names for labels
  const [projectNames, setProjectNames] = React.useState({}); // { project_id: displayName }
  React.useEffect(() => {
    const ids = Array.from(new Set((myHours || []).map(e => e.project_id).filter(Boolean)));
    const loadProjects = async () => {
      try {
        if (!ids.length) { setProjectNames({}); return; }
        const { data, error } = await supabase
          .from('tpr_projects')
          .select('id, project_code, name_th, name_en')
          .in('id', ids);
        if (error) throw error;
        const map = {};
        (data || []).forEach(p => {
          const name = p.name_th || p.name_en || p.project_code || p.id;
          map[p.id] = name;
        });
        setProjectNames(map);
      } catch {
        setProjectNames({});
      }
    };
    loadProjects();
  }, [myHours]);

  const projectAgg = React.useMemo(() => {
    const totals = {};
    (myHours || []).forEach(e => {
      const key = e.project_id || 'อื่นๆ';
      const h = Number(e.hours);
      if (!Number.isFinite(h)) return;
      totals[key] = (totals[key] || 0) + h;
    });
    const ids = Object.keys(totals);
    const labels = ids.map(id => (projectNames[id] || (id === 'อื่นๆ' ? 'อื่นๆ' : id)));
    const values = ids.map(id => Number(totals[id] || 0));
    return { labels, values };
  }, [myHours, projectNames]);

  // Aggregation: hours by phase_id -> join to tpr_project_wbs_phases for names
  const [phaseData, setPhaseData] = React.useState({ labels: [], values: [] });
  React.useEffect(() => {
    const taskIds = Array.from(new Set((myHours || []).map(e => e.task_id).filter(Boolean)));
    const loadPhases = async () => {
      try {
        if (!taskIds.length) { setPhaseData({ labels: [], values: [] }); return; }
        // Step 1: get task -> phase_id
        const { data: tasks, error: taskErr } = await supabase
          .from('tpr_project_wbs_tasks')
          .select('id, phase_id')
          .in('id', taskIds);
        if (taskErr) throw taskErr;

        const phaseIdByTask = {};
        const phaseIdsSet = new Set();
        (tasks || []).forEach(t => {
          if (t && t.id != null && t.phase_id != null) {
            phaseIdByTask[t.id] = t.phase_id;
            phaseIdsSet.add(t.phase_id);
          }
        });
        const phaseIds = Array.from(phaseIdsSet);


        // Step 2: get phase names by phase_id
        let phaseNameById = {};
        if (phaseIds.length) {
          const { data: phases, error: phaseErr } = await supabase
            .from('tpr_project_wbs_phases')
            .select('id, name, metadata')
            .in('id', phaseIds);
          if (phaseErr) throw phaseErr;
          (phases || []).forEach(ph => {
            const raw = ph?.name || ph?.metadata?.phase_name;
            const name = (typeof raw === 'string' && raw.trim().length > 0) ? raw.trim() : 'อื่นๆ';
            phaseNameById[ph.id] = name;
          });

        }

        // Step 3: aggregate hours by phase_id
        const aggById = {};
        (myHours || []).forEach(e => {
          const phaseId = phaseIdByTask[e.task_id];
          const h = Number(e.hours);
          if (!Number.isFinite(h)) return;
          const key = phaseId != null ? phaseId : 'อื่นๆ';
          aggById[key] = (aggById[key] || 0) + h;
        });


        // Step 4: build labels from phaseNameById, keep unknown as 'อื่นๆ'
        const entries = Object.entries(aggById).map(([idOrOther, val]) => {
          const isOther = idOrOther === 'อื่นๆ';
          const label = isOther ? 'อื่นๆ' : (phaseNameById[idOrOther] || String(idOrOther));
          return [label, Number(val || 0)];
        }).sort((a, b) => Number(b[1]) - Number(a[1]));

        const labels = entries.map(([label]) => label);
        const values = entries.map(([, val]) => val);

        setPhaseData({ labels, values });
      } catch {
        setPhaseData({ labels: [], values: [] });
      }
    };
    loadPhases();
  }, [myHours]);

  if (hoursLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (hoursError) {
    return (
      <Alert severity="error" variant="filled">{hoursError}</Alert>
    );
  }

  const dateMap = buildDateHoursMap(myHours);
  const totalMonth = (myHours || []).reduce((s, e) => {
    const h = Number(e.hours);
    return s + (Number.isFinite(h) ? h : 0);
  }, 0);
  const workingDays = Object.values(dateMap).filter((v) => Number(v) > 0).length;
  const avgPerWorkingDay = workingDays > 0 ? totalMonth / workingDays : 0;
  const weekStart = dayjs().startOf('week').add(1, 'day');
  const weekEnd = weekStart.add(6, 'day');
  const totalWeek = (myHours || []).reduce((s, e) => {
    const d = dayjs(e.entry_date);
    const h = Number(e.hours);
    if (d.isBefore(weekStart, 'day') || d.isAfter(weekEnd, 'day')) return s;
    return s + (Number.isFinite(h) ? h : 0);
  }, 0);

  // Prepare daily rows from start to end of month
  const monthStart = dayjs(`${selectedMonth}-01`).startOf('month');
  const daysInMonth = monthStart.daysInMonth();
  const dailyRows = Array.from({ length: daysInMonth }, (_, i) => {
    const d = monthStart.add(i, 'day');
    const key = d.format('YYYY-MM-DD');
    const tot = Number(dateMap[key] || 0);
    return {
      dateStr: d.format('DD'),
      total: tot,
    };
  });

  // Compute OT and submission metrics
  const totalOT = dailyRows.reduce((s, r) => s + (r.total > 8 ? (r.total - 8) : 0), 0);
  // Submission-related helpers removed since not displayed
  // Removed submitted/missing day metrics from display


  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
          <DatePicker
            label="เดือน"
            views={["year", "month"]}
            value={dayjs(`${selectedMonth}-01`)}
            format="MMM YYYY"
            onChange={(d) => { if (d && d.isValid()) setSelectedMonth(d.format('YYYY-MM')); }}
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
      </Stack>
      {/* Monthly / Weekly Overview */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">ชั่วโมงรวมเดือนนี้</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatHMM(totalMonth)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">ชั่วโมงรวมสัปดาห์นี้</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatHMM(totalWeek)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">เฉลี่ยชั่วโมงต่อวันทำงาน</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatHMM(avgPerWorkingDay)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">ชั่วโมง OT รวม</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatHMM(totalOT)}</Typography>
        </Paper>
      </Stack>

      {/* Daily ApexCharts Line Chart */}
      <Paper sx={{ p: 2 }}>
        <Typography sx={{ mb: 1, fontWeight: 600 }}>แนวโน้มชั่วโมงรายวัน</Typography>
        <ReactApexChart
          type="line"
          height={300}
          options={{
            chart: { id: 'daily-hours', toolbar: { show: false } },
            xaxis: { categories: dailyRows.map(r => r.dateStr) },
            stroke: { curve: 'smooth' },
            tooltip: { y: { formatter: (val) => `${formatHMM(Number(val))} ชม.` } },
            colors: ['#1976d2'],
            yaxis: { min: 0 }
          }}
          series={[{ name: 'ชม./วัน', data: dailyRows.map(r => Number(r.total || 0)) }]}
        />
      </Paper>

      {/* Project and Phase summaries side-by-side */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography sx={{ mb: 1, fontWeight: 600 }}>สรุปชั่วโมงแยกตามโครงการ</Typography>
          <ReactApexChart
            type="donut"
            height={320}
            options={{
              chart: { id: 'hours-by-project', toolbar: { show: false } },
              labels: projectAgg.labels,
              legend: { position: 'bottom' },
              tooltip: { y: { formatter: (val) => `${formatHMM(Number(val))} ชม.` } },
              dataLabels: {
                enabled: true,
                // For pie/donut charts, val is percentage of the slice
                formatter: function (val) {
                  const pct = Number(val);
                  if (!Number.isFinite(pct)) return '';
                  return `${Math.round(pct)}%`;
                }
              },
            }}
            series={projectAgg.values}
          />
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography sx={{ mb: 1, fontWeight: 600 }}>สรุปชั่วโมงแยกตามประเภทงาน / เฟส</Typography>
          {phaseData.labels.length > 0 ? (
            <ReactApexChart
              type="bar"
              height={360}
              options={{
                chart: { id: 'hours-by-phase', stacked: false, toolbar: { show: false } },
                plotOptions: {
                  bar: {
                    horizontal: true,
                    barHeight: '100%',
                    distributed: true,
                    dataLabels: { position: 'bottom' },
                    borderRadius: 4,
                    borderRadiusApplication: 'end',
                  }
                },
                colors: ['#33b2df', '#546E7A', '#d4526e', '#13d8aa', '#A5978B', '#2b908f', '#f9a3a4', '#90ee7e', '#f48024', '#69d2e7'],
                dataLabels: {
                  enabled: true,
                  textAnchor: 'start',
                  style: { colors: ['#fff'] },
                  formatter: function (val, opt) {
                    const label = opt?.w?.globals?.labels?.[opt?.dataPointIndex] || '';
                    const num = Number(val);
                    const v = Number.isFinite(num) ? formatHMM(num) : val;
                    return `${label}: ${v}`;
                  },
                  offsetX: 0,
                  dropShadow: { enabled: true }
                },
                stroke: { width: 1, colors: ['#fff'] },
                xaxis: { categories: phaseData.labels },
                yaxis: { labels: { show: false } },
                grid: { strokeDashArray: 3 },
                tooltip: {
                  theme: 'dark',
                  x: { show: false },
                  y: { title: { formatter: () => '' }, formatter: (val) => `${formatHMM(Number(val))} ชม.` }
                },
              }}
              series={[{ name: 'ชม.', data: phaseData.values }]}
            />
          ) : (
            <Typography color="text.secondary">ไม่มีข้อมูลเฟสในเดือนนี้</Typography>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}

function MyTasksTable({ loading, error, tasks, refreshKey }) {
  const [searchField, setSearchField] = React.useState('task'); // 'task' | 'phase' | 'project'
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all'); // 'all' or one of en statuses
  const [baseTasks, setBaseTasks] = React.useState(tasks || []);
  const [filteredTasks, setFilteredTasks] = React.useState(tasks || []);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const [statusMenuAnchor, setStatusMenuAnchor] = React.useState(null);
  const [statusMenuTask, setStatusMenuTask] = React.useState(null);
  const [attachmentsDialog, setAttachmentsDialog] = React.useState({ open: false, project_id: null, task: null, files: [], loading: false });
  const [attachmentCounts, setAttachmentCounts] = React.useState({});

  // --- Urgency and sorting helpers ---
  // Default sorting: ยังไม่เริ่ม (near end) → กำลังทำ → รอตรวจ → เสร็จสิ้น
  const statusOrder = React.useMemo(() => ({ 'ยังไม่เริ่ม': 1, 'กำลังทำ': 2, 'รอตรวจ': 3, 'เสร็จสิ้น': 4 }), []);
  const priorityOrder = React.useMemo(() => ({ 'สูง': 1, 'กลาง': 2, 'ต่ำ': 3 }), []);

  const isUrgent = React.useCallback((task, windowDays = 3) => {
    try {
      const statusTh = thStatus(task.status || task.metadata?.status || '');
      if (statusTh === 'เสร็จสิ้น') return false;
      const endRaw = task.end_date || task.metadata?.end_date || task.endDate || '';
      if (!endRaw) return false;
      const end = dayjs(endRaw, ['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD'], true).startOf('day');
      if (!end.isValid()) return false;
      const today = dayjs().startOf('day');
      // endDate must not be overdue
      if (end.isBefore(today, 'day')) return false;
      const diff = end.diff(today, 'day');
      return diff >= 0 && diff <= windowDays;
    } catch {
      return false;
    }
  }, []);

  const sortTasks = React.useCallback((list) => {
    const copy = [...(list || [])];
    copy.sort((a, b) => {
      const aStatus = statusOrder[thStatus(a.status || a.metadata?.status || '')] || 99;
      const bStatus = statusOrder[thStatus(b.status || b.metadata?.status || '')] || 99;
      if (aStatus !== bStatus) return aStatus - bStatus;

      const aEndRaw = a.end_date || a.metadata?.end_date || a.endDate || '';
      const bEndRaw = b.end_date || b.metadata?.end_date || b.endDate || '';
      const aEnd = dayjs(aEndRaw, ['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD'], true);
      const bEnd = dayjs(bEndRaw, ['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD'], true);
      const aTime = aEnd.isValid() ? aEnd.valueOf() : Number.POSITIVE_INFINITY;
      const bTime = bEnd.isValid() ? bEnd.valueOf() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime; // nearer first

      const aPr = priorityOrder[thPriority(a.priority || a.metadata?.priority || '')] || 99;
      const bPr = priorityOrder[thPriority(b.priority || b.metadata?.priority || '')] || 99;
      return aPr - bPr;
    });
    return copy;
  }, [statusOrder, priorityOrder]);

  React.useEffect(() => {
    setBaseTasks(tasks || []);
    setFilteredTasks(sortTasks(tasks || []));
    setPage(0);
    // load attachment counts for current tasks
    (async () => {
      try {
        const ids = Array.from(new Set((tasks || []).map(t => t.id).filter(Boolean)));
        if (!ids.length) { setAttachmentCounts({}); return; }
        const { data, error } = await supabase
          .from('tpr_task_attachments')
          .select('task_id,id')
          .in('task_id', ids);
        if (error) throw error;
        const counts = {};
        (data || []).forEach(r => { const k = String(r.task_id); counts[k] = (counts[k] || 0) + 1; });
        setAttachmentCounts(counts);
      } catch {
        setAttachmentCounts({});
      }
    })();
  }, [tasks, sortTasks, refreshKey]);

  const thPriority = (val) => {
    const v = String(val || '').toLowerCase();
    switch (v) {
      case 'low': return 'ต่ำ';
      case 'medium': return 'กลาง';
      case 'high': return 'สูง';
      case 'urgent': return 'เร่งด่วน';
      default: return val || '';
    }
  };
  const thStatus = (val) => {
    const v = String(val || '').toLowerCase();
    switch (v) {
      case 'todo':
      case 'to do':
        return 'ยังไม่เริ่ม';
      case 'in_progress':
      case 'in-progress':
      case 'doing':
        return 'กำลังทำ';
      case 'review':
        return 'ตรวจสอบ';
      case 'done':
      case 'completed':
        return 'เสร็จสิ้น';
      case 'blocked':
        return 'ติดปัญหา';
      default:
        return val || '';
    }
  };
  const enStatus = (thai) => {
    const v = String(thai || '').toLowerCase();
    switch (v) {
      case 'ยังไม่เริ่ม': return 'todo';
      case 'กำลังทำ': return 'doing';
      case 'ตรวจสอบ': return 'review';
      case 'เสร็จสิ้น': return 'done';
      case 'ติดปัญหา': return 'blocked';
      default: return thai || '';
    }
  };
  // removed legacy MUI color helpers in favor of custom hex colors

  // Custom color mapping using hex values
  const getStatusColor = (s) => {
    const key = String(s || '').toLowerCase();
    switch (key) {
      case 'doing':
        return '#7c4dff'; // stronger purple
      case 'review':
        return '#ff9800'; // stronger orange
      case 'blocked':
        return '#d32f2f';
      case 'done':
        return '#43a047'; // stronger green
      case 'todo':
      default:
        return '#9ca3af'; // neutral gray
    }
  };

  const getPriorityColor = (p) => {
    const key = String(p || '').toLowerCase();
    switch (key) {
      case 'high':
        return '#c62828'; // dark red
      case 'medium':
        return '#f57c00'; // dark amber
      case 'low':
      default:
        return '#00796b'; // dark teal
    }
  };

  const applySearch = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = (baseTasks || []).filter((t) => {
      const name = (t.task_name || t.name || t.title || '').toLowerCase();
      const phase = (t.phase_name || '').toLowerCase();
      const project = (t.project_name || '').toLowerCase();
      const matchesText = !q
        ? true
        : (searchField === 'task' ? name.includes(q)
          : searchField === 'phase' ? phase.includes(q)
            : searchField === 'project' ? project.includes(q)
              : false);
      const statusRaw = String(t.status || t.metadata?.status || 'todo').toLowerCase();
      const statusNorm = statusRaw === 'in_progress' ? 'doing' : statusRaw;
      const matchesStatus = statusFilter === 'all' ? true : statusNorm === statusFilter;
      return matchesText && matchesStatus;
    });
    setFilteredTasks(sortTasks(filtered));
    setPage(0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchField('task');
    setStatusFilter('all');
    setFilteredTasks(sortTasks(baseTasks || []));
    setPage(0);
  };

  const openStatusMenu = (event, task) => {
    setStatusMenuAnchor(event.currentTarget);
    setStatusMenuTask(task);
  };
  const closeStatusMenu = () => {
    setStatusMenuAnchor(null);
    setStatusMenuTask(null);
  };
  const updateTaskStatus = async (thaiStatus) => {
    if (!statusMenuTask) return;
    // Validate date window: only allow updates when today is within [start, end]
    try {
      const today = dayjs().startOf('day');
      const rawStart = statusMenuTask.start_date || statusMenuTask.metadata?.start_date || '';
      const rawEnd = statusMenuTask.end_date || statusMenuTask.metadata?.end_date || '';
      const hasStart = !!rawStart && dayjs(rawStart).isValid();
      const hasEnd = !!rawEnd && dayjs(rawEnd).isValid();
      if (hasStart && today.isBefore(dayjs(rawStart), 'day')) {
        setSnackbar({ open: true, message: 'ยังไม่ถึงวันเริ่มต้น ไม่สามารถอัพเดทสถานะได้', severity: 'warning' });
        closeStatusMenu();
        return;
      }
      if (hasEnd && today.isAfter(dayjs(rawEnd), 'day')) {
        setSnackbar({ open: true, message: 'เกินวันสิ้นสุด ไม่สามารถอัพเดทสถานะได้', severity: 'warning' });
        closeStatusMenu();
        return;
      }
    } catch {
      // ignore validation errors; proceed to update
    }
    const newStatus = enStatus(thaiStatus);
    try {
      const newMetadata = { ...(statusMenuTask.metadata || {}), status: newStatus };
      const { error } = await supabase
        .from('tpr_project_wbs_tasks')
        .update({ metadata: newMetadata, updated_at: new Date().toISOString() })
        .eq('id', statusMenuTask.id);
      if (error) throw error;
      // update local state in tasks and filteredTasks
      const updateFn = (arr) => (arr || []).map((t) => (
        t.id === statusMenuTask.id ? { ...t, metadata: { ...(t.metadata || {}), status: newStatus } } : t
      ));
      setBaseTasks((prev) => updateFn(prev));
      setFilteredTasks((prev) => sortTasks(updateFn(prev)));
      setSnackbar({ open: true, message: 'อัพเดทสถานะสำเร็จ', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: `อัพเดทสถานะไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    } finally {
      closeStatusMenu();
    }
  };

  const openAttachments = async (task) => {
    const projectId = task?.project_id || null;
    const taskId = task?.id || null;
    if (!projectId || !taskId) {
      setSnackbar({ open: true, message: 'งานนี้ไม่มีรหัสโครงการหรือรหัสงาน', severity: 'warning' });
      return;
    }
    setAttachmentsDialog({ open: true, project_id: projectId, task, files: [], loading: true });
    try {
      const { data, error } = await supabase
        .from('tpr_task_attachments')
        .select('id, file_name, file_size, file_path, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAttachmentsDialog((prev) => ({ ...prev, files: (data || []).map(r => ({ name: r.file_name, size: r.file_size, path: r.file_path })), loading: false }));
      // update count for this task
      setAttachmentCounts((prev) => ({ ...prev, [String(taskId)]: (data || []).length }));
    } catch (e) {
      setAttachmentsDialog((prev) => ({ ...prev, files: [], loading: false }));
      setSnackbar({ open: true, message: `โหลดไฟล์แนบไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    }
  };

  const handleUploadFiles = async (e) => {
    try {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const projectId = attachmentsDialog.project_id;
      const phaseId = attachmentsDialog.task?.phase_id || attachmentsDialog.task?.phase_id || null;
      const taskId = attachmentsDialog.task?.id || null;
      if (!projectId || !taskId) return;
      setAttachmentsDialog((prev) => ({ ...prev, loading: true }));
      for (const file of files) {
        const dir = phaseId && taskId ? `${projectId}/${phaseId}/${taskId}` : phaseId ? `${projectId}/${phaseId}` : String(projectId);
        const path = `${dir}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file, { upsert: false });
        console.log('uploadError', uploadError);
        if (uploadError) throw uploadError;
        // insert DB record
        let uploader = null;
        try {
          const u = await supabase.auth.getUser();
          uploader = u?.data?.user?.id || null;
        } catch { /* ignore uploaded_by if auth not available */ }
        const { error: insertError } = await supabase
          .from('tpr_task_attachments')
          .insert([{ task_id: taskId, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type, uploaded_by: uploader }]);
        if (insertError) throw insertError;
      }
      // refresh from DB
      const { data, error: listErr } = await supabase
        .from('tpr_task_attachments')
        .select('id, file_name, file_size, file_path, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (listErr) throw listErr;
      setAttachmentsDialog((prev) => ({ ...prev, files: (data || []).map(r => ({ name: r.file_name, size: r.file_size, path: r.file_path })), loading: false }));
      setAttachmentCounts((prev) => ({ ...prev, [String(taskId)]: (data || []).length }));
      setSnackbar({ open: true, message: 'อัปโหลดไฟล์สำเร็จ', severity: 'success' });
    } catch (err) {
      setAttachmentsDialog((prev) => ({ ...prev, loading: false }));
      setSnackbar({ open: true, message: `อัปโหลดไฟล์ไม่สำเร็จ: ${err.message || err}`, severity: 'error' });
    } finally {
      try { e.target.value = null; } catch { /* ignore */ }
    }
  };

  const downloadFile = async (f) => {
    try {
      if (!f?.path || !f?.name) return;
      const { data, error } = await supabase.storage.from('project-files').download(f.path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setSnackbar({ open: true, message: `ดาวน์โหลดไฟล์ไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    }
  };

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const displayed = React.useMemo(() => {
    const start = page * rowsPerPage;
    return (filteredTasks || []).slice(start, start + rowsPerPage);
  }, [filteredTasks, page, rowsPerPage]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!baseTasks || baseTasks.length === 0) {
    return <Typography color="text.secondary">ไม่พบงานที่คุณเป็นเจ้าของ</Typography>;
  }
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="mytasks-search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="mytasks-search-field-label"
            value={searchField}
            label="ค้นหาตาม"
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="task">งาน</MenuItem>
            <MenuItem value="phase">เฟส</MenuItem>
            <MenuItem value="project">โครงการ</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="mytasks-status-filter-label">สถานะ</InputLabel>
          <Select
            labelId="mytasks-status-filter-label"
            value={statusFilter}
            label="สถานะ"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="todo">ยังไม่เริ่ม</MenuItem>
            <MenuItem value="doing">กำลังทำ</MenuItem>
            <MenuItem value="review">ตรวจสอบ</MenuItem>
            <MenuItem value="done">เสร็จสิ้น</MenuItem>
            <MenuItem value="blocked">ติดปัญหา</MenuItem>
          </Select>
        </FormControl>
        <TextField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          placeholder="คำค้นหา"
          sx={{ flexGrow: 1, minWidth: 240, maxWidth: '100%' }}
        />
        <Button  variant="contained" sx={{ backgroundColor: '#000', color: '#fff', boxShadow: 'none' }} onClick={applySearch} startIcon={<SearchIcon />}>ค้นหา</Button>
        <Button   variant="contained"  sx={{ backgroundColor: '#d8d8d8ff', color: '#000', '&:hover': { backgroundColor: '#b9b6b6ff' }, boxShadow: 'none' }} onClick={clearSearch} startIcon={<CancelIcon />}>ล้าง</Button>
      </Stack>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 'none' }}>
        <Table size="small" aria-label="my tasks table" sx={{ borderCollapse: 'separate', '& td, & th': { borderBottom: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>งาน</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>เฟส</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>โครงการ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, textAlign: 'center' }}>ความสำคัญ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>วันที่เริ่ม</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>วันที่สิ้นสุด</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ไฟล์แนบ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, textAlign: 'center' }}>สถานะ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayed.map((t) => {
              const name = t.task_name || t.name || t.title || `Task ${t.id}`;
              const priority = thPriority(t.priority || t.metadata?.priority || '');
              const statusThai = thStatus(t.status || t.metadata?.status || '');
              const startRaw = t.start_date || t.metadata?.start_date || '';
              const endRaw = t.end_date || t.metadata?.end_date || '';
              const startDate = startRaw && dayjs(startRaw).isValid() ? dayjs(startRaw).format('DD-MM-YYYY') : (startRaw || '');
              const endDate = endRaw && dayjs(endRaw).isValid() ? dayjs(endRaw).format('DD-MM-YYYY') : (endRaw || '');
              const projectId = t.project_id || null;
              return (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isUrgent(t) && (
                        <Chip
                          label="ด่วน"
                          size="small"
                          color="error"
                          sx={{
                            height: 20,
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(244,67,54,0.6)' },
                              '50%': { transform: 'scale(1.08)', boxShadow: '0 0 0 6px rgba(244,67,54,0)' },
                              '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(244,67,54,0)' },
                            },
                            animation: 'pulse 1.6s ease-in-out infinite',
                            willChange: 'transform',
                          }}
                        />
                      )}
                      <Typography component="span">{name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{t.phase_name || ''}</TableCell>
                  <TableCell>{t.project_name || ''}</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>
                    <Chip
                      
                      label={priority || '-'}
                      // use custom hex color mapping
                      sx={{ width: '50%', justifyContent: 'center', bgcolor: getPriorityColor(String(t.priority || t.metadata?.priority || '').toLowerCase() === 'urgent' ? 'high' : (t.priority || t.metadata?.priority || '')), color: '#fff' }}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>{startDate}</TableCell>
                  <TableCell>{endDate}</TableCell>
                  <TableCell>
                    <Tooltip title="เปิดดู / อัปโหลดไฟล์">
                      <span>
                        <IconButton
                          aria-label="open-attachments"
                          disabled={!projectId}
                          onClick={() => openAttachments(t)}
                        >
                          <UploadFileIcon />
                        </IconButton>
                        <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
                          {attachmentCounts[String(t.id)] || 0}
                        </Typography>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>
                    <Chip
                      
                      label={statusThai || '-'}
                      // use custom hex color mapping; normalize in_progress -> doing
                      sx={{ width: '50%', justifyContent: 'center', bgcolor: getStatusColor(((t.status || t.metadata?.status || 'todo').toLowerCase() === 'in_progress') ? 'doing' : (t.status || t.metadata?.status || 'todo')), color: '#fff', cursor: 'pointer' }}
                      variant="filled"
                      onClick={(e) => openStatusMenu(e, t)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={(filteredTasks || []).length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[25, 50, 75, 100]}
        labelRowsPerPage="แสดงต่อหน้า:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
        getItemAriaLabel={(type) => (type === 'previous' ? 'ก่อนหน้า' : 'ถัดไป')}
      />

      <Menu anchorEl={statusMenuAnchor} open={Boolean(statusMenuAnchor)} onClose={closeStatusMenu}>
        {['ยังไม่เริ่ม', 'กำลังทำ', 'ตรวจสอบ', 'เสร็จสิ้น', 'ติดปัญหา'].map((opt) => (
          <MenuItem key={opt} onClick={() => updateTaskStatus(opt)}>{opt}</MenuItem>
        ))}
      </Menu>

      <Dialog open={attachmentsDialog.open} onClose={() => setAttachmentsDialog({ open: false, project_id: null, task: null, files: [], loading: false })} fullWidth maxWidth="sm">
        <DialogTitle sx={{color:'white',backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography  fontWeight={700}>ไฟล์แนบ ( ไม่รองรับชื่อไฟล์ภาษาไทย )</Typography>
          <IconButton  size='small' aria-label="close" onClick={() => setAttachmentsDialog({ open: false, project_id: null, task: null, files: [], loading: false })}>
            <CloseIcon sx={{color:'white'}} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {attachmentsDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {attachmentsDialog.files && attachmentsDialog.files.length > 0 ? (
                <Stack spacing={1}>
                  {attachmentsDialog.files.map((f) => (
                    <Stack key={f.name} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography>{f.name}</Typography>
                      <Button sx={{  color: '#000' }} onClick={() => downloadFile(f)}>ดาวน์โหลด</Button>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">ยังไม่มีไฟล์ในโฟลเดอร์นี้</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Box sx={{ flex: 1 }} />
          <Button component="label" variant="contained" sx={{ backgroundColor: '#000', color: '#fff', boxShadow: 'none' }}  startIcon={<UploadFileIcon />}>
            อัปโหลด
            <input hidden type="file" multiple onChange={handleUploadFiles} />
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

MyTasksTable.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  tasks: PropTypes.arrayOf(PropTypes.object),
  refreshKey: PropTypes.number,
};
function WeeklyTimesheet({ weekStartDate, refreshKey }) {
  const [weekStart, setWeekStart] = React.useState(dayjs(weekStartDate).locale('th'));
  const [rows, setRows] = React.useState([]);
  const [timesheetStatus, setTimesheetStatus] = React.useState('draft');

  // Dialog: งานของฉัน
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [taskLoading, setTaskLoading] = React.useState(false);
  const [taskError, setTaskError] = React.useState('');
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [taskSearch, setTaskSearch] = React.useState('');
  const [myTasks, setMyTasks] = React.useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const closeSnackbar = (_event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  };
  const [loadingEntries, setLoadingEntries] = React.useState(false);

  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);
  const todayIndex = React.useMemo(() => days.findIndex((d) => d.isSame(dayjs(), 'day')), [days]);
  const isFutureWeek = React.useMemo(() => days[0].isAfter(dayjs(), 'day'), [days]);
  const isPastWeek = React.useMemo(() => days[6].isBefore(dayjs(), 'day'), [days]);

  const prevWeek = () => setWeekStart((ws) => ws.add(-7, 'day'));
  const nextWeek = () => setWeekStart((ws) => ws.add(7, 'day'));

  const setEntry = (rowId, dayIndex, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const entries = [...r.entries];
      entries[dayIndex] = value;
      return { ...r, entries };
    }));
  };

  const computeRowTotal = (row) => {
    if (!row || !Array.isArray(row.entries)) return 0;
    return row.entries.reduce((sum, v) => {
      const n = parseHoursInput(v);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  };

  const computeDayTotals = () => {
    const totals = Array(7).fill(0);
    rows.forEach((r) => {
      if (!Array.isArray(r.entries)) return;
      for (let i = 0; i < 7; i += 1) {
        const v = r.entries[i];
        const n = parseHoursInput(v);
        if (Number.isFinite(n)) totals[i] += n;
      }
    });
    return totals;
  };

  const formatTotalHMM = (n) => {
    if (!Number.isFinite(n)) return '-';
    return decimalToHMM(n);
  };

  const deleteRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const openDeleteDialog = (rowId) => {
    setDeleteTarget(rowId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleteDialogOpen(false);
      if (!deleteTarget) return;
      const row = rows.find((r) => r.id === deleteTarget);

      // attempt to delete DB entries for this user/task within the displayed week
      const employeeId = await resolveEmployeeId();
      let deletedFromDb = false;
      if (employeeId && row) {
        try {
          const from = days[0].format('YYYY-MM-DD');
          const to = days[6].format('YYYY-MM-DD');
          let q = supabase.from('tpr_time_entries').delete().eq('user_id', employeeId).gte('entry_date', from).lte('entry_date', to);
          if (row.task_id) {
            q = q.eq('task_id', row.task_id);
          } else {
            if (row.project_id) q = q.eq('project_id', row.project_id);
            if (row.phase_id) q = q.eq('phase_id', row.phase_id);
          }
          const { error } = await q;
          if (!error) deletedFromDb = true;
          else console.warn('[Timesheet] delete entries failed', error);
        } catch (e) {
          console.warn('[Timesheet] delete entries exception', e);
        }
      }

      // remove the row from UI state
      deleteRow(deleteTarget);
      setDeleteTarget(null);
      setSnackbar({ open: true, message: deletedFromDb ? 'ลบข้อมูลเรียบร้อย' : 'ลบแถวเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('[Timesheet] confirmDelete failed', e);
      setSnackbar({ open: true, message: `การลบไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    } finally {
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteDialogOpen(false);
  };

  // Helper to build a stable key for a row (stable across reloads)
  const buildRowKey = (project_id, phase_id, task_id) => `${project_id || ''}::${phase_id || ''}::${task_id || ''}`;

  // Single persistent timer state (one task at a time)
  // Persisted via localStorage to survive refresh/navigation
  const TIMER_LS_KEY = 'timesheet_active_timer';
  const [timer, setTimer] = React.useState({ rowKey: null, startAt: null, accumulated: 0, running: false, elapsed: 0 });
  const timerIntervalRef = React.useRef(null);

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const saveTimerToLocalStorage = (t) => {
    try {
      const payload = {
        rowKey: t.rowKey || null,
        startAt: t.startAt || null,
        accumulated: Number(t.accumulated || 0),
        running: !!t.running,
      };
      window.localStorage.setItem(TIMER_LS_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  };

  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    try { window.localStorage.removeItem(TIMER_LS_KEY); } catch { /* ignore */ }
    setTimer({ rowKey: null, startAt: null, accumulated: 0, running: false, elapsed: 0 });
  };

  const startTick = (startAtMs, accumulatedSec) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startAtMs || 0)) / 1000) + Math.floor(accumulatedSec || 0);
      // If elapsed reaches 24 hours, stop immediately without persisting
      if (elapsed >= 24 * 3600) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        clearTimer();
        return;
      }
      setTimer((prev) => ({ ...prev, elapsed }));
    }, 1000);
  };

  const restoreTimerFromLocalStorage = () => {
    try {
      const raw = window.localStorage.getItem(TIMER_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.running || !saved.rowKey || !saved.startAt) return;
      const elapsed = Math.floor((Date.now() - Number(saved.startAt)) / 1000) + Math.floor(Number(saved.accumulated || 0));
      setTimer({ rowKey: saved.rowKey, startAt: Number(saved.startAt), accumulated: Number(saved.accumulated || 0), running: true, elapsed });
      startTick(Number(saved.startAt), Number(saved.accumulated || 0));
    } catch {
      // ignore parse errors
    }
  };

  const startTimer = (rowKey) => {
    if (todayIndex < 0) return; // disable if today not in current week
    // If a different timer is running, stop it and persist its time first
    if (timer.running && timer.rowKey && timer.rowKey !== rowKey) {
      try { stopTimer(timer.rowKey); } catch { /* ignore */ }
    }
    // If the same timer is already running, do nothing
    if (timer.running && timer.rowKey === rowKey) return;

    const startAt = Date.now();
    const newTimer = { rowKey, startAt, accumulated: 0, running: true, elapsed: 0 };
    setTimer(newTimer);
    saveTimerToLocalStorage(newTimer);
    startTick(startAt, 0);
  };

  // --- Helpers for time input and formatting ---
  const sanitizeInput = (val) => {
    if (val == null) return '';
    let s = String(val).trim();
    // normalize full-width colon and remove spaces
    s = s.replace(/\uFF1A/g, ':').replace(/\s+/g, '');
    // Allow only digits and ':'; prevent decimals
    if (!/^\d*:?(\d*)?$/.test(s)) return '';
    // prevent more than one ':'
    const colonCount = (s.match(/:/g) || []).length;
    if (colonCount > 1) return '';
    // disallow using '.' or ',' entirely
    if (s.includes('.') || s.includes(',')) return '';
    return s;
  };

  const parseHoursInput = (val) => {
    // Accept HH:MM or just H; return decimal hours
    if (val == null) return NaN;
    const s = String(val).trim();
    if (!s) return NaN;
    if (s.includes(':')) {
      const [hRaw, mRaw] = s.split(':');
      const h = Number(hRaw);
      const m = Number(mRaw);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
      const mm = Math.max(0, Math.min(59, Math.floor(m)));
      return Math.round((h + mm / 60) * 100) / 100;
    }
    // if digits only, treat as hours
    if (/^\d+$/.test(s)) {
      const h = Number(s);
      return Number.isFinite(h) ? Math.round(h * 100) / 100 : NaN;
    }
    return NaN;
  };

  const normalizeToHMM = (val) => {
    // Convert input to standard HH:MM (pad hour to 2 digits)
    const s = sanitizeInput(val);
    if (!s) return '00:00';
    if (s.includes(':')) {
      const [hRaw, mRaw] = s.split(':');
      const hNum = Math.max(0, Number(hRaw) || 0);
      const h = String(hNum).padStart(2, '0');
      const mNum = Math.max(0, Math.min(59, Number(mRaw) || 0));
      const m = String(mNum).padStart(2, '0');
      return `${h}:${m}`;
    }
    // digits only → HH:00
    const hNum = Math.max(0, Number(s) || 0);
    const h = String(hNum).padStart(2, '0');
    return `${h}:00`;
  };

  const decimalToHMM = (hoursDec) => {
    // Convert decimal hours (e.g., 1.5) to H:MM (e.g., 1:30)
    if (!Number.isFinite(hoursDec)) return '';
    const totalMinutes = Math.round(hoursDec * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const addHMM = (a, b) => {
    // Sum two H:MM strings, return H:MM
    const pa = parseHoursInput(a);
    const pb = parseHoursInput(b);
    if (!Number.isFinite(pa) && !Number.isFinite(pb)) return '';
    const sum = (Number.isFinite(pa) ? pa : 0) + (Number.isFinite(pb) ? pb : 0);
    return decimalToHMM(sum);
  };

  // Deprecated: previously used to display HH:MM. No longer needed.

  const stopTimer = (rowKey) => {
    if (!timer.running || !timer.rowKey) return;
    // finalize current timer; if a different rowId is passed, still stop current
    const targetRowKey = timer.rowKey;
    if (rowKey && rowKey !== targetRowKey) { /* noop: API compatibility */ }
    const seconds = Math.floor((Date.now() - (timer.startAt || 0)) / 1000) + Math.floor(timer.accumulated || 0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // find today's index in the current week
    const todayIdx = days.findIndex((d) => d.isSame(dayjs(), 'day'));
    if (todayIdx >= 0) {
      // convert seconds to HH:MM
      const hoursDec = seconds / 3600;
      const hmmAdd = decimalToHMM(hoursDec);
      // add to existing entry (HH:MM) and write back as HH:MM
      const row = rows.find((r) => r.id === targetRowKey);
      const existingRaw = row?.entries?.[todayIdx] ?? '';
      const newHMM = addHMM(existingRaw, hmmAdd);
      setEntry(targetRowKey, todayIdx, newHMM);
    }

    clearTimer();
  };

  // --- Submit timesheet ---
  const validateAllEntries = () => {
    // Ensure all non-empty cells are valid HH:MM
    for (const row of rows) {
      for (let i = 0; i < 7; i += 1) {
        const raw = row.entries?.[i] ?? '';
        const v = String(raw).trim();
        if (!v) continue;
        // must be HH:MM strictly after normalization
        const norm = normalizeToHMM(v);
        if (!/^\d{2}:\d{2}$/.test(norm)) return { ok: false, reason: 'รูปแบบเวลาไม่ถูกต้อง' };
        const n = parseHoursInput(norm);
        if (!Number.isFinite(n)) return { ok: false, reason: 'เวลาไม่สามารถคำนวณได้' };
      }
    }
    return { ok: true };
  };

  const updateStatus = (newStatus) => {
    setTimesheetStatus(newStatus);
  };

  const handleSubmit = async () => {
    try {
      if (submitting) return;
      setSubmitting(true);
      if (!rows || rows.length === 0) {
        setSnackbar({ open: true, message: 'ไม่มีรายการให้ส่งอนุมัติ', severity: 'warning' });
        return;
      }
      const val = validateAllEntries();
      if (!val.ok) {
        setSnackbar({ open: true, message: `ข้อมูลไม่ถูกต้อง: ${val.reason}`, severity: 'error' });
        return;
      }

      // resolve employee id (use employees.id, not auth.user.id)
      const employeeId = await resolveEmployeeId();
      if (!employeeId) {
        setSnackbar({ open: true, message: 'ไม่พบพนักงานของผู้ใช้ที่ล็อกอิน', severity: 'error' });
        return;
      }


      // Upsert all entries of this week for this user as Submitted
      let hadError = false;
      for (const row of rows) {
        for (let i = 0; i < 7; i += 1) {
          const raw = row.entries?.[i] ?? '';
          const v = String(raw).trim();
          // even if empty, we skip; submission doesn't require filling blanks
          if (!v) continue;
          const norm = normalizeToHMM(v);
          const hrs = parseHoursInput(norm);
          if (!Number.isFinite(hrs)) { hadError = true; continue; }
          const entryDate = days[i].format('YYYY-MM-DD');

          // find existing
          let existingId = null;
          try {
            const { data: existingRows, error: selErr } = await supabase
              .from('tpr_time_entries')
              .select('id')
              .eq('user_id', employeeId)
              .eq('entry_date', entryDate)
              .eq('task_id', row.task_id)
              .limit(1);
            if (selErr) throw selErr;
            if (existingRows && existingRows.length) existingId = existingRows[0].id;
          } catch {
            hadError = true;
          }

          const payload = {
            user_id: employeeId,
            project_id: row.project_id || null,
            phase_id: row.phase_id || null,
            task_id: row.task_id || null,
            entry_date: entryDate,
            hours: hrs,
            status: 'Submitted',
            updated_by: employeeId,
            submitted_by: employeeId,
            // rely on DB defaults for updated_at/submitted_at if present; else send now
            updated_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          };

          if (existingId) {
            const { error: upErr } = await supabase
              .from('tpr_time_entries')
              .update(payload)
              .eq('id', existingId);
            if (upErr) hadError = true;
          } else {
            const { error: insErr } = await supabase
              .from('tpr_time_entries')
              .insert(payload);
            if (insErr) hadError = true;
          }
        }
      }

      if (hadError) {
        setSnackbar({ open: true, message: 'บางรายการส่งอนุมัติไม่สำเร็จ กรุณาตรวจสอบ', severity: 'error' });
        return;
      }

      updateStatus('submitted');
      setSnackbar({ open: true, message: 'ส่งอนุมัติเรียบร้อย รอผู้อนุมัติตรวจสอบ', severity: 'success' });

      // refresh to ensure UI entries align with DB
      try { await fetchWeekEntries(); } catch { void 0; }
    } catch {
      setSnackbar({ open: true, message: 'ไม่สามารถส่งอนุมัติได้ กรุณาลองใหม่', severity: 'error' });
      // keep UI unlocked
      updateStatus('draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubmit = async () => {
    try {
      // allow revert to draft; lock removal in UI
      const employeeId = await resolveEmployeeId();
      if (!employeeId) throw new Error('ไม่พบพนักงานของผู้ใช้ที่ล็อกอิน');
      const from = days[0].format('YYYY-MM-DD');
      const to = days[6].format('YYYY-MM-DD');
      const { error } = await supabase
        .from('tpr_time_entries')
        .update({ status: 'Draft', updated_by: employeeId, updated_at: new Date().toISOString() })
        .eq('user_id', employeeId)
        .gte('entry_date', from)
        .lte('entry_date', to);
      if (error) throw error;
      updateStatus('draft');
      setSnackbar({ open: true, message: 'ยกเลิกการส่งสำเร็จ', severity: 'success' });
      try { await fetchWeekEntries(); } catch { void 0; }
    } catch {
      setSnackbar({ open: true, message: 'ไม่สามารถยกเลิกการส่งได้', severity: 'error' });
    }
  };

  React.useEffect(() => {
    // On mount, restore any persisted timer and resume ticking
    restoreTimerFromLocalStorage();
    return () => {
      // cleanup interval on unmount (do not clear localStorage to persist across navigation)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch tpr_time_entries for the current week and populate rows
  const fetchWeekEntries = async () => {
    setLoadingEntries(true);
    try {
      // resolve employee id (use employees.id)
      const employeeId = await resolveEmployeeId();
      if (!employeeId) {
        setSnackbar({ open: true, message: 'ไม่พบพนักงานของผู้ใช้ที่ล็อกอิน', severity: 'error' });
        return;
      }

      const from = days[0].format('YYYY-MM-DD');
      const to = days[6].format('YYYY-MM-DD');
      const { data: entries, error: entriesErr } = await supabase
        .from('tpr_time_entries')
        .select('*')
        .eq('user_id', employeeId)
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: true })
        .limit(1000);
      if (entriesErr) throw entriesErr;
      const rowsMap = {};
      let hasSubmitted = false;
      let hasApproved = false;
      let hasRejected = false;
      const taskIds = Array.from(new Set((entries || []).map((e) => e.task_id).filter(Boolean)));
      const projectIds = Array.from(new Set((entries || []).map((e) => e.project_id).filter(Boolean)));
      const phaseIds = Array.from(new Set((entries || []).map((e) => e.phase_id).filter(Boolean)));

      const projectsMap = {};
      const phasesMap = {};
      const tasksMap = {};

      if (projectIds.length) {
        try {
          const { data: projects, error: projErr } = await supabase.from('tpr_projects').select('id,name_th').in('id', projectIds);
          if (!projErr && Array.isArray(projects)) projects.forEach((p) => { projectsMap[p.id] = p.name_th; });
        } catch { /* ignore */ }
      }
      if (phaseIds.length) {
        try {
          const { data: phases, error: phaseErr } = await supabase.from('tpr_project_wbs_phases').select('id,name').in('id', phaseIds);
          if (!phaseErr && Array.isArray(phases)) phases.forEach((ph) => { phasesMap[ph.id] = ph.name; });
        } catch { /* ignore */ }
      }
      if (taskIds.length) {
        try {
          const { data: tasks, error: taskErr } = await supabase.from('tpr_project_wbs_tasks').select('*').in('id', taskIds);
          if (!taskErr && Array.isArray(tasks)) tasks.forEach((t) => { tasksMap[t.id] = t; });
        } catch { /* ignore */ }
      }

      (entries || []).forEach((ent) => {
        const st = String(ent.status || '').toLowerCase();
        if (st === 'submitted') hasSubmitted = true;
        if (st === 'approved') hasApproved = true;
        // support both 'rejected' and legacy 'reject' statuses
        if (st === 'rejected' || st === 'reject') hasRejected = true;
        const key = buildRowKey(ent.project_id, ent.phase_id, ent.task_id);
        if (!rowsMap[key]) {
          const task = tasksMap[ent.task_id] || {};
          const displayName = task.task_name || task.name || task.title || `Task ${ent.task_id || ''}`;
          rowsMap[key] = {
            id: key,
            taskName: displayName,
            entries: Array(7).fill('00:00'),
            project_id: ent.project_id || null,
            phase_id: ent.phase_id || null,
            task_id: ent.task_id || null,
            project_name: projectsMap[ent.project_id] || '',
            phase_name: phasesMap[ent.phase_id] || '',
            rejectedReasons: [],
          };
        }
        const idx = days.findIndex((d) => d.format('YYYY-MM-DD') === dayjs(ent.entry_date).format('YYYY-MM-DD'));
        if (idx >= 0) {
          // convert stored decimal hours to HH:MM for UI
          const hrs = Number(ent.hours);
          rowsMap[key].entries[idx] = Number.isFinite(hrs) ? decimalToHMM(hrs) : '00:00';
        }
        // if this entry was rejected, capture its reason (if any) for the row
        if (st === 'rejected' || st === 'reject') {
          try {
            const reason = ent.rejected_reason || ent.rejectedReason || ent.rejected || null;
            if (reason) rowsMap[key].rejectedReasons.push(String(reason));
          } catch { /* ignore */ }
        }
      });

      setRows(Object.values(rowsMap));
      // precedence: approved > rejected > submitted > draft
      setTimesheetStatus(hasApproved ? 'approved' : (hasRejected ? 'rejected' : (hasSubmitted ? 'submitted' : 'draft')));
    } catch (e) {
      console.error('[Timesheet] fetchWeekEntries failed', e);
      setSnackbar({ open: true, message: `โหลดข้อมูลไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    } finally {
      setLoadingEntries(false);
    }
  };

  React.useEffect(() => {
    // load entries when weekStart or refreshKey changes
    fetchWeekEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, refreshKey]);



  const openTaskPicker = async () => {
    setSelectedTaskIds([]);
    setTaskError('');
    setTaskDialogOpen(true);
    if (myTasks && myTasks.length > 0) return; // already loaded
    setTaskLoading(true);
    try {
      // 1) get current user email
      let email = null;
      try {
        const { data } = await supabase.auth.getUser();
        email = data?.user?.email ?? null;
      } catch {
        email = null;
      }
      if (!email) {
        // fallback to session
        try {
          const { data } = await supabase.auth.getSession();
          email = data?.session?.user?.email ?? null;
        } catch {
          // ignore
        }
      }

      if (!email) throw new Error('ไม่พบอีเมลผู้ใช้ที่กำลังเข้าสู่ระบบ');

      // 2) map to employee id via employees current email fields (only _1/_2/_3)
      const emailLower = String(email).trim().toLowerCase();
      let employeeId = null;
      try {
        const orFilter = `current_address_email_1.eq.${emailLower},current_address_email_2.eq.${emailLower},current_address_email_3.eq.${emailLower}`;
        const { data: empRows, error: empErr } = await supabase
          .from('employees')
          .select('id')
          .or(orFilter)
          .limit(1);
        if (empErr) throw empErr;
        employeeId = empRows && empRows[0] ? empRows[0].id : null;
      } catch (eqErr) {
        console.warn('[Timesheet] Employee eq lookup failed, will try ilike fallback', eqErr);
      }

      if (!employeeId) {
        // fallback: ilike on possible columns, useful if case differs
        try {
          const pattern = `*${emailLower}*`;
          const orFilterIlike = `current_address_email_1.ilike.${pattern},current_address_email_2.ilike.${pattern},current_address_email_3.ilike.${pattern}`;
          const { data: empRows2, error: empErr2 } = await supabase
            .from('employees')
            .select('id')
            .or(orFilterIlike)
            .limit(1);
          if (empErr2) throw empErr2;
          employeeId = empRows2 && empRows2[0] ? empRows2[0].id : null;
        } catch (ilikeErr) {
          console.warn('[Timesheet] Employee ilike fallback failed', ilikeErr);
        }
      }

      if (!employeeId) throw new Error('ไม่พบพนักงานจากอีเมลที่กำลังใช้งาน');


      // 3) fetch tasks owned by employee
      let tasks = [];
      // try eq first (owner as uuid)
      try {
        const res1 = await supabase
          .from('tpr_project_wbs_tasks')
          .select('*')
          .eq('owner', employeeId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (res1.error) throw res1.error;
        tasks = res1.data || [];
      } catch (e1) {
        console.warn('[Timesheet] eq(owner) failed', e1);
      }

      // try contains (if owner is array/JSONB)
      if (!tasks.length) {
        try {
          const res2 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .contains('owner', [employeeId])
            .order('created_at', { ascending: false })
            .limit(500);
          if (!res2.error && Array.isArray(res2.data)) {
            tasks = res2.data;
          } else if (res2?.error) {
            console.warn('[Timesheet] contains(owner, [id]) not applicable', res2.error);
          }
        } catch (e2) {
          console.warn('[Timesheet] contains(owner) attempt failed', e2);
        }
      }

      // try ilike for JSON-string column (e.g. "[\"id\"]")
      if (!tasks.length) {
        try {
          const pattern = `%"${employeeId}"%`;
          const res3 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .ilike('owner', pattern)
            .order('created_at', { ascending: false })
            .limit(500);
          if (res3.error) throw res3.error;
          tasks = res3.data || [];
        } catch (e3) {
          console.warn('[Timesheet] ilike(owner, "id" pattern) failed', e3);
        }
      }

      // very last resort: loose ilike
      if (!tasks.length) {
        try {
          const pattern2 = `%${employeeId}%`;
          const res4 = await supabase
            .from('tpr_project_wbs_tasks')
            .select('*')
            .ilike('owner', pattern2)
            .order('created_at', { ascending: false })
            .limit(500);
          if (!res4.error && Array.isArray(res4.data)) {
            tasks = res4.data;
          }
        } catch (e4) {
          console.warn('[Timesheet] ilike(owner, id) failed', e4);
        }
      }


      // If tasks present, fetch related project (name_th) and phase (name) records
      if (tasks && tasks.length) {
        try {
          /* optional table logging removed in production */
        } catch { /* optional console.table not supported */ }

        // collect distinct project_id and phase_id values
        const projectIds = Array.from(new Set(tasks.map((t) => t.project_id).filter(Boolean)));
        const phaseIds = Array.from(new Set(tasks.map((t) => t.phase_id).filter(Boolean)));

        const projectsMap = {};
        const phasesMap = {};

        if (projectIds.length) {
          try {
            const { data: projects, error: projErr } = await supabase
              .from('tpr_projects')
              .select('id,name_th')
              .in('id', projectIds);
            if (!projErr && Array.isArray(projects)) {
              projects.forEach((p) => { projectsMap[p.id] = p.name_th; });
            } else if (projErr) {
              console.warn('[Timesheet] Failed to load projects', projErr);
            }
          } catch (pe) {
            console.warn('[Timesheet] Exception loading projects', pe);
          }
        }

        if (phaseIds.length) {
          try {
            const { data: phases, error: phaseErr } = await supabase
              .from('tpr_project_wbs_phases')
              .select('id,name')
              .in('id', phaseIds);
            if (!phaseErr && Array.isArray(phases)) {
              phases.forEach((ph) => { phasesMap[ph.id] = ph.name; });
            } else if (phaseErr) {
              console.warn('[Timesheet] Failed to load phases', phaseErr);
            }
          } catch (phe) {
            console.warn('[Timesheet] Exception loading phases', phe);
          }
        }

        // attach readable names to tasks
        tasks = (tasks || []).map((t) => ({
          ...t,
          project_name: t.project_name || projectsMap[t.project_id] || '',
          phase_name: t.phase_name || phasesMap[t.phase_id] || '',
        }));
      }

      setMyTasks(tasks || []);
    } catch (e) {
      console.error('[Timesheet] Load my tasks failed:', e);
      setTaskError(e?.message || 'โหลดรายการงานไม่สำเร็จ');
    } finally {
      setTaskLoading(false);
    }
  };

  const confirmAddTask = () => {
    if (!selectedTaskIds || selectedTaskIds.length === 0) return;
    const idSet = new Set(selectedTaskIds);
    const picked = (myTasks || []).filter((t) => idSet.has(t.id));
    // Prevent adding duplicate tasks already present in the current timesheet week
    const existingTaskIds = new Set((rows || []).map((r) => String(r.task_id)).filter(Boolean));
    const duplicates = [];
    const toAdd = [];
    picked.forEach((t) => {
      if (existingTaskIds.has(String(t.id))) duplicates.push(t);
      else toAdd.push(t);
    });

    if (duplicates.length) {
      // const names = duplicates.map((d) => d.task_name || d.name || d.title || `Task ${d.id}`).slice(0, 5);
      setSnackbar({ open: true, message: `ไม่สามารถเพิ่มได้ พบงานซ้ำในสัปดาห์`, severity: 'warning' });
    }

    if (!toAdd.length) {
      setTaskDialogOpen(false);
      return;
    }

    const newRows = toAdd.map((t) => {
      const displayName = t.task_name || t.name || t.title || t.wbs_name || `Task ${t.id}`;
      const key = buildRowKey(t.project_id, t.phase_id, t.id);
      return {
        id: key,
        taskName: displayName,
        entries: Array(7).fill('00:00'),
        project_id: t.project_id || null,
        phase_id: t.phase_id || null,
        task_id: t.id || null,
        project_name: t.project_name || t.project || t.project_title || '',
        phase_name: t.phase_name || t.phase || '',
      };
    });

    setRows((prev) => [...prev, ...newRows]);
    setTaskDialogOpen(false);
  };

  const thShortDay = (idx) => {
    // Return full Thai weekday names for Mon-Fri, full names for weekend as well
    const names = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
    return names[idx] || '';
  };
  const thMonthShort = (d) => d.format('MMM'); // uses Thai locale

  const statusConfig = {
    draft: { label: 'แบบร่าง', color: '#757575', Icon: EditIcon },
    submitted: { label: 'ส่งแล้ว', color: '#ff9800', Icon: SendIcon },
    approved: { label: 'อนุมัติแล้ว', color: '#4caf50', Icon: CheckCircleIcon },
    rejected: { label: 'ถูกปฏิเสธ', color: '#d32f2f', Icon: CloseIcon },
  };

  // Save draft: insert/update time_entries for each non-empty cell
  const saveDraft = async () => {
    try {
      setSavingDraft(true);
      let hadError = false;
      // resolve employee id (use employees.id, not auth.user.id)
      const employeeId = await resolveEmployeeId();
      if (!employeeId) throw new Error('ไม่พบพนักงานของผู้ใช้ที่ล็อกอิน');

      // iterate rows and days
      for (const row of rows) {
        for (let i = 0; i < 7; i += 1) {
          const raw = row.entries?.[i] ?? '';
          const v = String(raw).trim();
          if (!v) continue; // skip empty
          const hrs = parseHoursInput(v);
          if (!Number.isFinite(hrs)) continue; // skip invalid
          const entryDate = days[i].format('YYYY-MM-DD');

          // try find existing entry for user/date/task
          let existingId = null;
          try {
            const { data: existingRows, error: selErr } = await supabase
              .from('tpr_time_entries')
              .select('id')
              .eq('user_id', employeeId)
              .eq('entry_date', entryDate)
              .eq('task_id', row.task_id)
              .limit(1);
            if (selErr) throw selErr;
            if (existingRows && existingRows.length) existingId = existingRows[0].id;
          } catch (e) {
            console.warn('[Timesheet] lookup existing entry failed', e);
          }

          if (existingId) {
            const { error: upErr } = await supabase
              .from('tpr_time_entries')
              .update({ hours: hrs, status: 'Draft', updated_by: employeeId, project_id: row.project_id || null, phase_id: row.phase_id || null, task_id: row.task_id || null })
              .eq('id', existingId);
            if (upErr) {
              hadError = true;
              console.warn('[Timesheet] update entry failed', upErr);
            }
          } else {
            const payload = {
              user_id: employeeId,
              project_id: row.project_id || null,
              phase_id: row.phase_id || null,
              task_id: row.task_id || null,
              entry_date: entryDate,
              hours: hrs,
              status: 'Draft',
              created_by: employeeId,
              updated_by: employeeId,
            };
            const { error: insErr } = await supabase.from('tpr_time_entries').insert(payload);
            if (insErr) {
              hadError = true;
              console.warn('[Timesheet] insert entry failed', insErr);
            }
          }
        }
      }

      setTimesheetStatus('draft');
      // refresh data from DB and show snackbar success
      try {
        await fetchWeekEntries();
      } catch {
        // ignore fetch error here; fetchWeekEntries handles snackbar
      }
      if (!hadError) {
        setSnackbar({ open: true, message: 'บันทึกร่างเรียบร้อย', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'บันทึกร่างบางรายการไม่สำเร็จ', severity: 'error' });
      }
    } catch (e) {
      console.error('[Timesheet] saveDraft failed', e);
      setSnackbar({ open: true, message: `บันทึกร่างไม่สำเร็จ: ${e.message || e}`, severity: 'error' });
    } finally {
      setSavingDraft(false);
    }
  };

  // Map priority/status to Thai labels
  const priorityToTh = (val) => {
    const v = String(val || '').toLowerCase();
    switch (v) {
      case 'low':
      case 'ต่ำ':
        return 'ต่ำ';
      case 'medium':
      case 'กลาง':
        return 'กลาง';
      case 'high':
      case 'สูง':
        return 'สูง';
      case 'urgent':
      case 'เร่งด่วน':
        return 'เร่งด่วน';
      default:
        return val || '';
    }
  };

  const statusToTh = (val) => {
    const v = String(val || '').toLowerCase();
    switch (v) {
      case 'todo':
      case 'to do':
      case 'ยังไม่เริ่ม':
        return 'ยังไม่เริ่ม';
      case 'in_progress':
      case 'in-progress':
      case 'doing':
      case 'กำลังทำ':
        return 'กำลังทำ';
      case 'review':
      case 'ตรวจสอบ':
        return 'ตรวจสอบ';
      case 'done':
      case 'completed':
      case 'เสร็จสิ้น':
        return 'เสร็จสิ้น';
      case 'blocked':
      case 'ติดปัญหา':
        return 'ติดปัญหา';
      default:
        return val || '';
    }
  };

  // Check if a task is active on today's date (within start/end inclusive)
  const isTaskActiveToday = (t) => {
    const today = dayjs();
    const rawStart = t.start_date || t.metadata?.start_date || null;
    const rawEnd = t.end_date || t.metadata?.end_date || null;
    const hasStart = rawStart && dayjs(rawStart).isValid();
    const hasEnd = rawEnd && dayjs(rawEnd).isValid();
    if (hasStart && today.isBefore(dayjs(rawStart), 'day')) return false;
    if (hasEnd && today.isAfter(dayjs(rawEnd), 'day')) return false;
    return true;
  };

  return (
    <Box>
      {/* Header with Thai format */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="สัปดาห์ก่อนหน้า" onClick={prevWeek} size="small"><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ mx: 1 }}>
          {`สัปดาหน์: ${days[0].format('DD')} ${thMonthShort(days[0])} – ${days[6].format('DD')} ${thMonthShort(days[6])}`}
        </Typography>
        <IconButton aria-label="สัปดาห์ถัดไป" onClick={nextWeek} size="small"><ChevronRightIcon /></IconButton>

        {/* Timesheet status */}
        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
          {(() => {
            const cfg = statusConfig[timesheetStatus] || statusConfig.draft;
            const IconComp = cfg.Icon || EditIcon;
            return (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconComp fontSize="small" sx={{ color: cfg.color }} />
                <Typography variant="body2" sx={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</Typography>
              </Stack>
            );
          })()}
        </Box>
      </Stack>

      {/* Timesheet table */}
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 'none' }}>
        <Table
          size="small"
          aria-label="weekly timesheet"
          sx={{ borderCollapse: 'separate', '& td, & th': { borderBottom: 'none' } }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '28%', fontWeight: 600 }}>งาน (Task)</TableCell>
              {days.map((d, idx) => (
                <TableCell key={idx} align="center" sx={{ width: `${(72 / 7).toFixed(2)}%` }}>
                  <Stack spacing={0} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{thShortDay(idx)}</Typography>
                    <Typography variant="caption" color="text.secondary">{d.format('DD')} {thMonthShort(d)}</Typography>
                  </Stack>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: '8%', fontWeight: 600 }} />
              <TableCell align="center" sx={{ width: '8%', fontWeight: 600 }} />
              <TableCell align="center" sx={{ width: '4%' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{row.taskName || '—'}</Typography>
                    {(row.project_name || row.phase_name) && (
                      <Typography variant="caption" color="text.secondary">
                        {row.project_name}{row.project_name && row.phase_name ? ' • ' : ''}{row.phase_name}
                      </Typography>
                    )}
                    {row.rejectedReasons && row.rejectedReasons.length > 0 && (
                      <Typography variant="caption" sx={{ color: '#d32f2f', display: 'block' }}>
                        {`ถูกปฏิเสธ${row.rejectedReasons[0] ? ` (${row.rejectedReasons[0]})` : ''}`}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                {days.map((d, idx) => (
                  <TableCell key={idx} align="center">
                    <TextField
                      value={row.entries[idx]}
                      onChange={(e) => setEntry(row.id, idx, sanitizeInput(e.target.value))}
                      onBlur={(e) => setEntry(row.id, idx, normalizeToHMM(e.target.value))}
                      placeholder="ชั่วโมง"
                      size="small"
                      sx={{ width: 72 }}
                      inputProps={{ style: { textAlign: 'center' } }}
                      disabled={d.isAfter(dayjs(), 'day') || timesheetStatus === 'submitted' || timesheetStatus === 'approved' || isFutureWeek}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatTotalHMM(computeRowTotal(row))}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    {timer.running && timer.rowKey === row.id ? (
                      <Tooltip title="หยุดจับเวลา">
                        <IconButton size="small" onClick={() => stopTimer(row.id)}>
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title={todayIndex >= 0 ? 'เริ่มจับเวลา (บันทึกไปยังวันนี้)' : 'จับเวลาใช้ได้เฉพาะวันในสัปดาห์นี้'}>
                        <span>
                          <IconButton size="small" onClick={() => startTimer(row.id)} disabled={todayIndex < 0 || timesheetStatus === 'submitted' || timesheetStatus === 'approved' || isFutureWeek}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatElapsed(timer.rowKey === row.id && timer.running ? (timer.elapsed || 0) : 0)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" aria-label="ลบแถว" onClick={() => openDeleteDialog(row.id)} disabled={timesheetStatus === 'submitted' || timesheetStatus === 'approved' || isFutureWeek}>
                    <DeleteIcon fontSize="small" sx={{ color: colors.gray600 || '#9e9e9e' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loadingEntries && (
              <TableRow>
                <TableCell colSpan={11} sx={{ py: 6 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {rows && rows.length > 0 && (
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}></TableCell>
                {computeDayTotals().map((tot, i) => (
                  <TableCell key={i} align="center" sx={{ fontWeight: 600 }}>{formatTotalHMM(tot)}</TableCell>
                ))}
                {/* weekly total (sum of day totals) shown before timer/delete columns */}
                <TableCell align="center" sx={{ fontWeight: 700 }}>{formatTotalHMM(computeDayTotals().reduce((a, b) => a + b, 0))}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            )}
            {/* New row controls below table */}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      {/* Action controls visibility */}
      {timesheetStatus === 'approved' ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          คุณกำลังดูสัปดาห์ที่ถูกปิดรอบแล้ว ไม่สามารถเพิ่มหรือแก้ไขชั่วโมงได้
        </Alert>
      ) : (isFutureWeek || (isPastWeek && (!rows || rows.length === 0))) ? null : (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, width: '100%' }}>
          <Box>
            <Button
              variant="contained"
              onClick={openTaskPicker}
              disabled={timesheetStatus === 'submitted' || submitting}
              startIcon={<AddCircleIcon />}
              sx={{ backgroundColor: '#d8d8d8ff', color: '#000', '&:hover': { backgroundColor: '#b9b6b6ff' }, boxShadow: 'none' }}
            >เพิ่มงาน</Button>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={saveDraft}
              disabled={savingDraft || timesheetStatus === 'submitted' || submitting}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#d8d8d8ff', color: '#000', '&:hover': { backgroundColor: '#b9b6b6ff' }, boxShadow: 'none'}}
            >บันทึกร่าง</Button>
            {timesheetStatus !== 'submitted' ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={<SendIcon />}
                sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' }, boxShadow: 'none' }}
              >{submitting ? 'กำลังส่ง...' : 'ส่งอนุมัติ'}</Button>
            ) : (
              <Button variant="outlined" onClick={handleUnsubmit} sx={{ borderColor: '#000', color: '#000' }}>ยกเลิกการส่ง</Button>
            )}
          </Stack>
        </Stack>
      )}

      {/* Dialog: งานของฉัน */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ bgcolor: '#000', color: '#fff' }}>งานของฉัน</DialogTitle>
        <DialogContent dividers>
          <TextField
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="ค้นหา"
            size="small"
            fullWidth
            sx={{ mb: 2 }}

          />
          {taskLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : taskError ? (
            <Typography color="error">{taskError}</Typography>
          ) : (
            <List sx={{ maxHeight: 480, overflowY: 'auto' }}>
              {(myTasks || [])
                .filter((t) => {
                  const q = taskSearch.trim().toLowerCase();
                  if (!q) return true;
                  const label = `${t.task_name || t.name || t.title || ''} ${t.project_name || ''} ${t.wbs_code || ''} ${t.status || t.metadata?.status || ''}`.toLowerCase();
                  return label.includes(q);
                })
                .map((t) => {
                  const primary = t.task_name || t.name || t.title || `Task ${t.id}`;
                  const projectName = t.project_name || t.project || t.project_title || '';
                  const phaseName = t.phase_name || t.phase || '';
                  const priority = priorityToTh(t.priority || t.metadata?.priority || '');
                  const rawStart = t.start_date || t.metadata?.start_date || '';
                  const rawEnd = t.end_date || t.metadata?.end_date || '';
                  const startDate = rawStart ? (dayjs(rawStart).isValid() ? dayjs(rawStart).format('DD-MM-YYYY') : rawStart) : '';
                  const endDate = rawEnd ? (dayjs(rawEnd).isValid() ? dayjs(rawEnd).format('DD-MM-YYYY') : rawEnd) : '';
                  const status = statusToTh(t.status || t.metadata?.status || '');
                  const secondary = [
                    projectName ? `โครงการ: ${projectName}` : null,
                    phaseName ? `เฟส: ${phaseName}` : null,
                    (startDate || endDate) ? `วันที่เริ่มต้น-สิ้นสุด: ${startDate || '-'} – ${endDate || '-'}` : null,
                    priority ? `ความสำคัญ: ${priority}` : null,
                    status ? `สถานะ: ${status}` : null,
                    t.wbs_code ? `WBS: ${t.wbs_code}` : null,
                  ].filter(Boolean).join(' • ');
                  const checked = selectedTaskIds.includes(t.id);
                  return (
                    <ListItemButton key={t.id} onClick={() => {
                      // Warn if task not active today; do not toggle selection
                      if (!isTaskActiveToday(t)) {
                        const startTxt = rawStart ? (dayjs(rawStart).isValid() ? dayjs(rawStart).format('DD-MM-YYYY') : rawStart) : '-';
                        const endTxt = rawEnd ? (dayjs(rawEnd).isValid() ? dayjs(rawEnd).format('DD-MM-YYYY') : rawEnd) : '-';
                        setSnackbar({ open: true, message: `งานนี้ไม่อยู่ในช่วงวันที่กำหนด (เริ่ม: ${startTxt} สิ้นสุด: ${endTxt})`, severity: 'warning' });
                        return;
                      }
                      setSelectedTaskIds((prev) => {
                        const exists = prev.includes(t.id);
                        if (exists) return prev.filter((id) => id !== t.id);
                        return [...prev, t.id];
                      });
                    }}>
                      <FormControlLabel
                        control={<Checkbox checked={checked} color="error" />}
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{primary}</Typography>
                            {secondary && (
                              <Typography variant="caption" color="text.secondary">{secondary}</Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  );
                })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setTaskDialogOpen(false)}
            startIcon={<CancelIcon />}
            sx={{ backgroundColor: '#d8d8d8ff', color: '#000', '&:hover': { backgroundColor: '#b9b6b6ff' }, boxShadow: 'none' }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={confirmAddTask}
            disabled={!selectedTaskIds.length}
            startIcon={<AddCircleIcon />}
            sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}
          >
            เพิ่มงาน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>ยืนยันการลบแถว</DialogTitle>
        <DialogContent>
          <Typography>คุณแน่ใจหรือไม่ว่าต้องการลบแถวนี้? การลบจะไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button color='#000' onClick={cancelDelete}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      {/* Submit confirmation dialog removed per request */}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
}

WeeklyTimesheet.propTypes = {
  weekStartDate: PropTypes.instanceOf(Date).isRequired,
};
