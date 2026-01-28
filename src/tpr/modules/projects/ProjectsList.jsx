// ===== ProjectsList.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import WorkstreamsPanel from './WorkstreamsPanel.jsx';
import WorkstreamDetail from './WorkstreamDetail.jsx';
import CreateProjectTab from './CreateProjectTab';
import ProjectsDashboard from './ProjectsDashboard';
import ProjectSub from './ProjectSub';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { supabase } from '../../../lib/supabaseClient';

import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import colors from '../../../theme/colors';

// ✅ ใช้ดึงสมาชิกจาก tpr_project_members
import Projects from '../../functions/Projects';

function formatDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`projects-tabpanel-${index}`}
      aria-labelledby={`projects-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box
          sx={{
            p: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            bgcolor: 'transparent',
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );


}

function a11yProps(index) {
  return {
    id: `projects-tab-${index}`,
    'aria-controls': `projects-tabpanel-${index}`,
  };
}

export default function ProjectsList(props) {
  const { onReady } = props || {};
  dayjs.locale('th');

  // ===== tab constants =====
  const TAB = React.useMemo(
    () => ({
      LIST: 0,
      WORK: 1,
      CREATE: 2,
      DASHBOARD: 3,
      SUBWORKS: 4,
    }),
    []
  );

  const [tab, setTab] = React.useState(TAB.LIST);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [tabReady, setTabReady] = React.useState(true);

  const gotoTab = React.useCallback((newValue) => {
    setTab(newValue);
    setTabLoading(true);
    setTabReady(false);
    window.setTimeout(() => {
      setTabLoading(false);
      setTabReady(true);
    }, 350);
  }, []);

  const handleTabChange = (_event, newValue) => {
    gotoTab(newValue);
  };

  const [search, setSearch] = React.useState('');
  const [deletingMap, setDeletingMap] = React.useState({});
  const [projects, setProjects] = React.useState([]);

  const [progressMap, setProgressMap] = React.useState({});
  const [loadingProgressMap, setLoadingProgressMap] = React.useState(false);

  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [actionMenu, setActionMenu] = React.useState({ anchorEl: null, project: null });
  const actionMenuOpen = Boolean(actionMenu?.anchorEl);
  const [filterAnchorEl, setFilterAnchorEl] = React.useState(null);
  const [filterStatus, setFilterStatus] = React.useState('');

  // ✅ สิทธิ์แสดงปุ่ม "สร้างโครงการ" (เฉพาะ: CEO, Admin, Accounting)
  const [canCreateProject, setCanCreateProject] = React.useState(false);
  const [loadingInitial, setLoadingInitial] = React.useState(true);

  // ✅ saving state (CreateProjectTab จะเป็นคน set ผ่าน callback)
  const [dialogSaving, setDialogSaving] = React.useState(false);

  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState('warning');

  // ✅ form state: พ่อถือไว้เพื่อให้เปลี่ยน tab แล้วข้อมูลยังอยู่
  const [dialogForm, setDialogForm] = React.useState({
    id: null,
    code: '',
    name: '',
    name_en: '',
    description: '',

    customer_id: null,
    customer_code: '',
    customer_name: '',
    client: '',
    clientTitle: '',

    start: '',
    end: '',

    // legacy display fields (CreateProjectTab ใช้โชว์)
    manager: '',
    managerTitle: '',
    manager_id: null,

    principal: '',
    principalTitle: '',
    principal_id: null,

    // ✅ ตัวจริงที่ UI ใช้แล้ว
    project_admin_id: null,
    projectAdmin: '',
    projectAdminTitle: '',

    project_manager_ids: [],

    parent_project_id: 'MAIN',
    contract_type: 'Fixed Fee',
    budget: '',
    status: 'Planning',

    image_path: '',
    initial_team_ids: [],
  });

  const [selectedFile, setSelectedFile] = React.useState(null);
  const [previewSrc, setPreviewSrc] = React.useState('');
  const [customers, setCustomers] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [selectedProject, setSelectedProject] = React.useState(null);
  const [selectedWorkstream, setSelectedWorkstream] = React.useState(null);

  const handleNotify = (msg, severity = 'warning') => {
    setSnackbarMessage(msg || '');
    setSnackbarSeverity(severity || 'warning');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const formatEmployee = React.useCallback((emp) => {
    if (!emp) return '';
    const thParts = [(emp.first_name_th || ''), (emp.last_name_th || '')]
      .map((s) => (s || '').toString().trim())
      .filter(Boolean);
    if (thParts.length) return thParts.join(' ');
    const enParts = [(emp.title_en || ''), (emp.first_name_en || ''), (emp.last_name_en || '')]
      .map((s) => (s || '').toString().trim())
      .filter(Boolean);
    if (enParts.length) return enParts.join(' ');
    const nick = (emp.nickname_th || emp.nickname_en || '').toString().trim();
    if (nick) return nick;
    return (emp.employee_code || emp.employee_id || emp.id || '').toString();
  }, []);

  const resetCreateForm = () => {
    setDialogForm({
      id: null,
      code: '',
      name: '',
      name_en: '',
      description: '',

      customer_id: null,
      customer_code: '',
      customer_name: '',
      client: '',
      clientTitle: '',

      start: '',
      end: '',

      manager: '',
      managerTitle: '',
      manager_id: null,

      principal: '',
      principalTitle: '',
      principal_id: null,

      project_admin_id: null,
      projectAdmin: '',
      projectAdminTitle: '',

      project_manager_ids: [],

      parent_project_id: 'MAIN',
      contract_type: 'Fixed Fee',
      budget: '',
      status: 'Planning',

      image_path: '',
      initial_team_ids: [],
    });
    setSelectedFile(null);
    setPreviewSrc('');
  };

  // ✅ เอาไว้สำหรับ “แก้ไข/ดูรายละเอียด” (ไม่ใช่ flow สร้าง)
  // ✅ รองรับเติม initial_team_ids ตอนแก้ไข
  const setFormFromProject = React.useCallback((p, initialTeamIds = []) => {
    if (!p) return;

    const custRec = (customers || []).find(
      (x) => String(x.id) === String(p.customer_id) || String(x.customer_id) === String(p.customer_id)
    );

    const projectAdminRec = (employees || []).find((x) => String(x.id) === String(p.project_admin_id)) || null;

    // schema มี project_manager_ids เป็น uuid[]
    const pmIds = Array.isArray(p.project_manager_ids) ? p.project_manager_ids : [];
    const firstPm = pmIds[0] || null;
    const firstPmRec = firstPm ? (employees || []).find((x) => String(x.id) === String(firstPm)) : null;

    const contractType = p.contract_type || p.project_type || 'Fixed Fee';

    setDialogForm((prev) => ({
      ...prev,
      id: p.id ?? null,
      code: p.project_code || p.code || '',
      name: p.name_th || p.name || p.name_en || '',
      name_en: p.name_en || '',
      description: p.description || '',

      customer_id: p.customer_id || null,
      customer_code: p.customer_code || '',
      customer_name: p.customer_name || '',
      client: p.customer_name || (custRec ? (custRec.name_th || custRec.name_en || '') : ''),
      clientTitle: p.customer_code || (custRec ? custRec.customer_id : ''),

      start: p.start_date || '',
      end: p.end_date || '',

      // legacy
      principal_id: p.principal_id || null,
      principal: '',
      principalTitle: '',

      manager_id: firstPm || null,
      manager: firstPmRec ? formatEmployee(firstPmRec) : '',
      managerTitle: firstPmRec ? (firstPmRec.title_th || '') : '',

      project_admin_id: p.project_admin_id || null,
      projectAdmin: projectAdminRec ? formatEmployee(projectAdminRec) : '',
      projectAdminTitle: projectAdminRec ? (projectAdminRec.title_th || '') : '',

      project_manager_ids: pmIds,

      parent_project_id: p.parent_project_id ? String(p.parent_project_id) : 'MAIN',
      contract_type: contractType,
      budget: p.budget != null ? String(Number(p.budget)) : '',
      status: p.status || 'Planning',

      image_path: p.image_path || '',

      // ✅ เติมทีมจาก tpr_project_members ตอนแก้ไข
      initial_team_ids: Array.isArray(initialTeamIds) ? initialTeamIds : [],
    }));

    // preview image
    try {
      const ip = p.image_path || '';
      if (ip) {
        const isFullUrl = /^https?:\/\//i.test(ip);
        if (isFullUrl) setPreviewSrc(ip);
        else {
          const { data } = supabase.storage.from('project-images').getPublicUrl(ip);
          setPreviewSrc(data?.publicUrl || '');
        }
      } else setPreviewSrc('');
    } catch {
      setPreviewSrc('');
    }
  }, [customers, employees, formatEmployee]);

  const handleDialogChange = (field, value) => setDialogForm((prev) => ({ ...prev, [field]: value }));

  const handleFileChange = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    setSelectedFile(f);
    try {
      const url = URL.createObjectURL(f);
      setPreviewSrc(url);
    } catch {
      setPreviewSrc('');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewSrc('');
    setDialogForm((prev) => ({ ...prev, image_path: '' }));
  };

  const requestDelete = async (p) => {
    if (!p) return;
    const name = p?.project_code || p?.code || p?.name_th || p?.name || '';
    const ok = window.confirm(`คุณต้องการลบโครงการ "${name}" หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้`);
    if (!ok) return;
    await performDelete(p.id || p.projectId || p.project_id);
  };

  const performDelete = async (id) => {
    if (!id) return;
    setDeletingMap((s) => ({ ...s, [String(id)]: true }));
    try {
      try {
        await supabase.from('tpr_project_role_rates').delete().eq('project_id', id);
      } catch (depErr) {
        console.warn('Cleanup tpr_project_role_rates failed (ignored):', depErr);
      }

      const { error } = await supabase.from('tpr_projects').delete().eq('id', id);
      if (error) throw error;
      setProjects((prev) => (prev || []).filter((x) => String(x.id) !== String(id)));
    } catch (err) {
      console.error('Failed to delete project', err);
      handleNotify('ลบข้อมูลล้มเหลว', 'error');
    } finally {
      setDeletingMap((s) => {
        const ns = { ...s };
        delete ns[String(id)];
        return ns;
      });
    }
  };

  const filtered = (projects || []).filter((p) => {
    const q = (search || '').trim().toLowerCase();
    if (filterStatus) {
      if (String(p.status || '') !== String(filterStatus)) return false;
    }
    if (!q) return true;
    const code = String(p.project_code || p.code || '').toLowerCase();
    const name = String(p.name_th || p.name || p.name_en || '').toLowerCase();
    return code.includes(q) || name.includes(q);
  });

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil((filtered || []).length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = (filtered || []).slice((safePage - 1) * pageSize, safePage * pageSize);

  const closeActionMenu = React.useCallback(() => {
    setActionMenu({ anchorEl: null, project: null });
  }, []);

  const openActionMenu = React.useCallback((event, project) => {
    event.stopPropagation();
    setActionMenu({ anchorEl: event.currentTarget, project });
  }, []);

  const exportProjectsCsv = () => {
    const rows = Array.isArray(filtered) ? filtered : [];

    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = [
      'รหัสโครงการ',
      'ชื่อโครงการ',
      'ลูกค้า',
      'วันที่เริ่ม',
      'วันที่สิ้นสุด',
      'สถานะ',
      'ความคืบหน้า(%)',
      'งบประมาณ',
      'ใช้ไป',
    ];

    const body = rows.map((p) => {
      const projectCode = p.project_code ?? p.code ?? '';
      const projectName = p.name_th ?? p.name ?? p.name_en ?? '';
      const projectClient = (p.customer_name ?? p.customer) || findCustomerDisplay(p.customer_id) || p.client || '';
      const projectStart = (p.start_date ?? p.start) || '';
      const projectEnd = (p.end_date ?? p.end) || '';

      const progress = typeof p.progress === 'number' ? String(p.progress) : '';
      const budget = Projects.formatMoneyTHB(p.budget);
      const spent = Projects.formatMoneyTHB(p.spent_amount || 0);

      return [
        projectCode,
        projectName,
        projectClient,
        formatDate(projectStart),
        formatDate(projectEnd),
        Projects.statusTh(p.status) || p.status || '',
        progress,
        budget,
        spent,
      ];
    });

    const csv = '\uFEFF' + [header, ...body].map((r) => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ✅ check current user role for create permission
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let userEmail = '';
        if (supabase.auth && supabase.auth.getUser) {
          const { data } = await supabase.auth.getUser();
          userEmail = data?.user?.email ?? '';
        } else if (supabase.auth && supabase.auth.user) {
          const u = supabase.auth.user ? supabase.auth.user() : null;
          userEmail = u?.email ?? '';
        }

        userEmail = (userEmail || '').toString().trim().toLowerCase();
        if (!userEmail) {
          if (mounted) setCanCreateProject(false);
          return;
        }

        const { data, error } = await supabase
          .from('v_employee_users_with_roles')
          .select('role_label, role_name_th, role_name_en')
          .eq('email', userEmail)
          .maybeSingle();

        if (error) throw error;

        const roleLabel = (data?.role_label || data?.role_name_th || data?.role_name_en || '').toString().trim();
        const allowed = new Set(['ประธานเจ้าหน้าที่บริหาร', 'ผู้ดูแลระบบ', 'ฝ่ายบัญชี']);
        if (mounted) setCanCreateProject(allowed.has(roleLabel));
      } catch (e) {
        console.error('Failed to load current user role (create project permission)', e);
        if (mounted) setCanCreateProject(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // initial load: customers + employees + projects
  React.useEffect(() => {
    let mounted = true;
    setLoadingInitial(true);
    (async () => {
      try {
        const [custRes, empRes] = await Promise.all([
          supabase.from('tpr_customers').select('*').order('created_at', { ascending: false }).limit(1000),
          supabase.from('employees').select('*').order('employee_code', { ascending: true }).limit(1000),
        ]);

        // fetch projects via helper that returns summary fields only
        const projData = await Projects.getProjectsList(supabase);

        if (!mounted) return;
        if (custRes.error) throw custRes.error;
        if (empRes.error) throw empRes.error;

        setCustomers(custRes.data || []);
        setEmployees(empRes.data || []);
        const projList = (projData || []).map((r) => ({ ...r }));
        setProjects(projList);

        // derive progress per project from workstreams (single query)
        (async () => {
          try {
            const pids = Array.isArray(projList) ? projList.map((x) => x.id).filter(Boolean) : [];
            if (!pids.length) {
              setProgressMap({});
              return;
            }

            setLoadingProgressMap(true);

            const { data: wsRows, error: wsErr } = await supabase
              .from('tpr_workstreams')
              .select('project_id, status')
              .in('project_id', pids)
              .eq('deleted', false)
              .eq('archived', false);

            if (wsErr) throw wsErr;

            const grouped = Object.create(null);
            for (const w of Array.isArray(wsRows) ? wsRows : []) {
              const pid = String(w.project_id || '');
              if (!grouped[pid]) grouped[pid] = { total: 0, done: 0 };
              grouped[pid].total += 1;
              if (String(w.status || '') === 'เสร็จแล้ว') grouped[pid].done += 1;
            }

            const map = Object.create(null);
            for (const id of pids) {
              const key = String(id);
              const g = grouped[key];
              const pct = g && g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
              map[key] = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
            }

            setProgressMap(map);
          } catch (err) {
            console.warn('Failed to load workstreams for progress map', err);
            setProgressMap({});
          } finally {
            setLoadingProgressMap(false);
          }
        })();
      } catch (err) {
        console.error('Failed to load initial project data', err);
        handleNotify('โหลดข้อมูลโครงการล้มเหลว', 'error');
      } finally {
        if (mounted) setLoadingInitial(false);
        try {
          if (mounted && typeof onReady === 'function') onReady();
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [onReady]);

  const findCustomerDisplay = (id) => {
    if (!id) return '';
    const c = (customers || []).find((x) => String(x.id) === String(id) || String(x.customer_id) === String(id));
    return c ? (c.name_th || c.name_en || c.customer_id || '') : '';
  };

  // ✅ หลังจาก CreateProjectTab สร้างสำเร็จ -> update list + เลือกโปรเจค + ไปหน้าแดชบอร์ดโครงการ
  const handleCreated = (created) => {
    if (!created) return;
    setProjects((prev) => [created, ...(prev || [])]);
    setSelectedProject(created);
    gotoTab(TAB.DASHBOARD);
  };

  const tabSx = {
    '&.Mui-focusVisible': { outline: 'none' },
    '&:focus': { outline: 'none' },
    '&.Mui-selected': { color: colors.primary, fontWeight: 600 },
  };

  // ✅ helper: ไปหน้า “สร้าง/แก้ไขโปรเจค” ในโหมดแก้ไข
  // ✅ ดึงสมาชิกจาก tpr_project_members แล้วเติม initial_team_ids
  const openEditInCreateTab = React.useCallback(
    async (p) => {
      if (!p) return;

      setSelectedProject(p);

      const projectId = p?.id ?? p?.projectId ?? p?.project_id ?? null;
      let teamIds = [];

      try {
        if (projectId && Projects?.getProjectMembers) {
          const rows = await Projects.getProjectMembers(supabase, projectId);
          teamIds = (rows || []).map((r) => r.employee_id).filter(Boolean);
        }
      } catch (err) {
        console.warn('Load project members failed (ignored):', err);
      }
      // Ensure we have the full project row (some list helpers omit fields like project_admin_id)
      try {
        if (projectId) {
          const { data: fullProject, error: fullErr } = await supabase.from('tpr_projects').select('*').eq('id', projectId).maybeSingle();
          if (!fullErr && fullProject) {
            setFormFromProject({ ...p, ...fullProject }, teamIds);
          } else {
            setFormFromProject(p, teamIds);
          }
        } else {
          setFormFromProject(p, teamIds);
        }
      } catch (fetchErr) {
        console.warn('Failed to fetch full project row (ignored):', fetchErr);
        setFormFromProject(p, teamIds);
      }
      gotoTab(TAB.CREATE);
    },
    [TAB.CREATE, gotoTab, setFormFromProject]
  );

  if (loadingInitial) {
    return (
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, bgcolor: '#ffffff', boxShadow: 'none' }} elevation={0}>
          <Skeleton variant="text" width={260} height={44} />

          <Box sx={{ mt: 2, display: 'flex', gap: 1.2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Skeleton width={320} height={40} />
            <Skeleton width={120} height={40} />
            <Skeleton width={120} height={40} />
            <Skeleton width={160} height={40} />
          </Box>

          <Box sx={{ mt: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton width="40%" height={40} />
                <Skeleton width="20%" height={40} />
                <Skeleton width="15%" height={40} />
                <Skeleton width="15%" height={40} />
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 0,
        bgcolor: 'transparent',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        sx={{
          p: 0,
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 320,
          boxShadow: 'none',
          bgcolor: 'transparent',
          overflow: 'hidden',
        }}
        elevation={0}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          aria-label="แท็บโครงการ"
          variant="fullWidth"
          sx={{
            display: 'none',
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': { bgcolor: colors.primary },
          }}
        >
          <Tab sx={tabSx} label="ข้อมูลโครงการ" value={TAB.LIST} {...a11yProps(TAB.LIST)} />
          <Tab sx={tabSx} label="แผนงานโครงการ" value={TAB.WORK} {...a11yProps(TAB.WORK)} />
          <Tab sx={tabSx} label="สร้าง/แก้ไขโครงการ" value={TAB.CREATE} {...a11yProps(TAB.CREATE)} />
          <Tab sx={tabSx} label="แดชบอร์ดโครงการ" value={TAB.DASHBOARD} {...a11yProps(TAB.DASHBOARD)} />
          <Tab sx={tabSx} label="แผนงานย่อย" value={TAB.SUBWORKS} {...a11yProps(TAB.SUBWORKS)} />
        </Tabs>

        <TabPanel value={tab} index={TAB.LIST}>
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: 0,
              boxShadow: 'none',
              border: 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Bar (Product-list style) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'stretch', md: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', md: 'row' },
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>รายการโครงการ</Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                }}
              >
                <TextField
                  size="small"
                  placeholder="ค้นหาโครงการ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="outlined"
                  sx={{
                    width: { xs: '100%', sm: 320 },
                    bgcolor: '#f8fafc',
                    borderRadius: 999,
                    '& .MuiOutlinedInput-root': { borderRadius: 999 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(2,6,23,0.08)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(2,6,23,0.12)' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(2,6,23,0.25)' },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    borderColor: 'rgba(2,6,23,0.12)',
                    color: '#0f172a',
                    bgcolor: '#fff',
                  }}
                >
                  {filterStatus ? Projects.statusTh(filterStatus) : 'ตัวกรอง'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={exportProjectsCsv}
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    borderColor: 'rgba(2,6,23,0.12)',
                    color: '#0f172a',
                    bgcolor: '#fff',
                  }}
                >
                  ส่งออก CSV
                </Button>

                <Menu
                  anchorEl={filterAnchorEl}
                  open={Boolean(filterAnchorEl)}
                  onClose={() => setFilterAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem
                    onClick={() => {
                      setFilterStatus('');
                      setFilterAnchorEl(null);
                    }}
                  >
                    ทั้งหมด
                  </MenuItem>
                  {['Planning', 'Active', 'Completed'].map((st) => (
                    <MenuItem
                      key={st}
                      onClick={() => {
                        setFilterStatus(st);
                        setFilterAnchorEl(null);
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: st === 'Active' ? '#08d84c' : st === 'Completed' ? '#8B5CF6' : '#fdca01',
                          }}
                        />
                        {Projects.statusTh(st)}
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>

                {canCreateProject ? (
                  <Button
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    onClick={() => {
                      resetCreateForm();
                      gotoTab(TAB.CREATE);
                    }}
                    sx={{
                      borderRadius: 999,
                      textTransform: 'none',
                      bgcolor: '#ff4059',
                      '&:hover': { bgcolor: '#e63a51' },
                      boxShadow: 'none',
                    }}
                  >
                    สร้างโครงการ
                  </Button>
                ) : null}
              </Box>
            </Box>

            {/* Table */}
            <TableContainer
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'auto', // ✅ แก้: ให้เลื่อนแนวนอนได้ แทนการตัดทิ้ง
                px: 1.5,
                pb: 2,
              }}
            >
              {(filtered || []).length === 0 ? (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                  <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
                </Box>
              ) : (
                <Table
                  size="small"
                  sx={{
                    minWidth: 980, // ✅ แก้: กันตารางยุบจนดูเหมือนหาย
                    '& th, & td': { py: 1, px: 1.5, borderBottom: 'none' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {['โครงการ', 'ลูกค้า', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ', 'ความคืบหน้า', 'จัดการ'].map((h, idx) => (
                        <TableCell
                          key={h}
                          sx={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: '#64748b',
                            borderBottom: 'none',
                            py: 1.2,
                            ...(idx === 6 ? { textAlign: 'right' } : null),
                            ...(idx === 4 ? { textAlign: 'center', width: 180 } : null),
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(paginated || []).map((p) => {
                      const pid = p.id ?? p.projectId ?? p.project_id ?? '';

                      const projectCode = p.project_code ?? p.code ?? '';
                      const projectName = p.name_th ?? p.name ?? p.name_en ?? '';
                      const projectClient = (p.customer_name ?? p.customer) || findCustomerDisplay(p.customer_id) || p.client || '';
                      const projectStart = (p.start_date ?? p.start) || '';
                      const projectEnd = (p.end_date ?? p.end) || '';

                      const s = String(p.status || '');
                      const statusStyles =
                        s === 'Active'
                          ? { color: '#08d84c', bgcolor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.25)' }
                          : s === 'Completed'
                            ? { color: '#8B5CF6', bgcolor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }
                            : { color: '#fdca01', bgcolor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)' };

                      return (
                        <TableRow
                          key={pid || `${projectCode}-${projectName}`}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '& td': { borderBottom: 'none', py: 1.4 },
                            '&:hover td': { bgcolor: '#f8fafc' },
                          }}
                          onClick={() => {
                            setSelectedProject(p);
                            gotoTab(TAB.DASHBOARD);
                          }}
                        >
                          <TableCell sx={{ width: 200 }}>
                            {/* ✅ แก้: ตัดชื่อยาว ๆ แบบ ellipsis และไม่ดันคอลัมน์อื่น */}
                            <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Typography sx={{ fontSize: 14, color: '#0f172a', lineHeight: 1.2 }} component="span">
                                {projectName || '-'}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ width: 200 }}>
                            <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Typography sx={{ fontSize: 14, color: '#0f172a', lineHeight: 1.2 }} component="span">
                                {projectClient || '-'}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ width: 250, maxWidth: 250 }}>
                            <Typography sx={{ fontSize: 14, color: '#334155' }} noWrap>
                              {formatDate(projectStart)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ width: 250, maxWidth: 250 }}>
                            <Typography sx={{ fontSize: 14, color: '#334155' }} noWrap>
                              {formatDate(projectEnd)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ textAlign: 'center', width: 180 }}>
                            <Chip
                              label={
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusStyles.color }} />
                                  <Box sx={{ fontWeight: 500, fontSize: 13 }}>{Projects.statusTh(p.status) || p.status || '-'}</Box>
                                </Box>
                              }
                              variant="outlined"
                              size="small"
                              sx={{
                                borderRadius: 999,
                                borderColor: statusStyles.borderColor,
                                bgcolor: statusStyles.bgcolor,
                                px: 1.2,
                                py: 0.5,
                                '& .MuiChip-label': { padding: 0 },
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ width: 240, textAlign: 'center' }}>
                            {loadingProgressMap ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{ flex: 1, maxWidth: 180 }}>
                                  <LinearProgress
                                    variant="indeterminate"
                                    sx={{
                                      height: 8,
                                      borderRadius: 6,
                                      bgcolor: 'rgba(2,6,23,0.06)',
                                      '& .MuiLinearProgress-bar': { backgroundColor: '#08d84c' },
                                    }}
                                  />
                                </Box>
                                <Box sx={{ minWidth: 44, textAlign: 'right', fontSize: 14, color: '#334155' }}>—</Box>
                              </Box>
                            ) : (
                              (() => {
                                const pct = progressMap[String(pid)] ?? 0;
                                const safePct = Math.max(0, Math.min(100, Number.isFinite(Number(pct)) ? Number(pct) : 0));
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Box sx={{ flex: 1, maxWidth: 180 }}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={safePct}
                                        sx={{
                                          height: 8,
                                          borderRadius: 6,
                                          bgcolor: 'rgba(2,6,23,0.06)',
                                          '& .MuiLinearProgress-bar': { backgroundColor: '#08d84c' },
                                        }}
                                      />
                                    </Box>
                                    <Box sx={{ minWidth: 44, textAlign: 'right', fontSize: 14, color: '#334155' }}>{`${safePct}%`}</Box>
                                  </Box>
                                );
                              })()
                            )}
                          </TableCell>

                          <TableCell sx={{ textAlign: 'right', width: 80 }}>
                            <IconButton aria-label="เมนูการทำงาน" onClick={(e) => openActionMenu(e, p)}>
                              <MoreHorizIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            <Box
              sx={{
                mt: 3,
                px: 2.5,
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Button
                variant="text"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                sx={{ textTransform: 'none', fontWeight: 700, color: '#0f172a' }}
              >
                ย้อนกลับ
              </Button>

              <Pagination
                count={totalPages}
                page={safePage}
                onChange={(_e, v) => setPage(v)}
                color="standard"
                shape="rounded"
                sx={{ '& .MuiPaginationItem-root': { fontWeight: 700 } }}
              />

              <Button
                variant="text"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                sx={{ textTransform: 'none', fontWeight: 700, color: '#0f172a' }}
              >
                ถัดไป
              </Button>
            </Box>

            <Menu
              anchorEl={actionMenu.anchorEl}
              open={actionMenuOpen}
              onClose={closeActionMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  const p = actionMenu.project;
                  closeActionMenu();
                  if (p) openEditInCreateTab(p);
                }}
              >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <EditIcon fontSize="small" />
                  แก้ไข
                </Box>
              </MenuItem>

              <MenuItem
                disabled={
                  !!deletingMap[
                  String(actionMenu?.project?.id ?? actionMenu?.project?.project_id ?? actionMenu?.project?.projectId ?? '')
                  ]
                }
                onClick={(e) => {
                  e.stopPropagation();
                  const p = actionMenu.project;
                  closeActionMenu();
                  if (p) requestDelete(p);
                }}
              >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: '#d32f2f' }}>
                  <DeleteIcon color="error" fontSize="small" />
                  ลบข้อมูล
                </Box>
              </MenuItem>
            </Menu>
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={TAB.WORK}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#d32f2f' }} />
            </Box>
          ) : !selectedProject ? (
            <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อจัดการแผนงานโครงการ</Typography>
          ) : (
            tabReady &&
            (!selectedWorkstream ? (
              <WorkstreamsPanel projectId={selectedProject?.id} onOpenDetail={(ws) => setSelectedWorkstream(ws)} />
            ) : (
              <WorkstreamDetail workstream={selectedWorkstream} onBack={() => setSelectedWorkstream(null)} />
            ))
          )}
        </TabPanel>

        <TabPanel value={tab} index={TAB.CREATE}>
          <CreateProjectTab
            dialogForm={dialogForm}
            handleDialogChange={handleDialogChange}
            handleFileChange={handleFileChange}
            handleRemoveFile={handleRemoveFile}
            selectedFile={selectedFile}
            previewSrc={previewSrc}
            employees={employees}
            customers={customers}
            dialogSaving={dialogSaving}
            supabase={supabase}
            onSavingChange={setDialogSaving}
            onNotify={handleNotify}
            onCreated={handleCreated}
            onCancel={() => {
              gotoTab(TAB.LIST);
            }}
          />
        </TabPanel>

        <TabPanel value={tab} index={TAB.DASHBOARD}>
          <ProjectsDashboard
            project={selectedProject}
            employees={employees}
            customers={customers}
            onBack={() => {
              setSelectedProject(null);
              gotoTab(TAB.LIST);
            }}
            onEdit={() => {
              if (!selectedProject) return;
              openEditInCreateTab(selectedProject);
            }}
            onGoWork={(payload) => {
              if (!selectedProject) return;

              const toTab = String(payload?.toTab || '').toLowerCase();
              if (toTab === 'subwork' || toTab === 'subworks') {
                setSelectedWorkstream(payload?.workstream || null);
                gotoTab(TAB.SUBWORKS);
                return;
              }

              setSelectedWorkstream(null);
              gotoTab(TAB.WORK);
            }}
          />
        </TabPanel>

        <TabPanel value={tab} index={TAB.SUBWORKS}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#d32f2f' }} />
            </Box>
          ) : !selectedProject ? (
            <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อจัดการแผนงานย่อย</Typography>
          ) : (
            tabReady && <ProjectSub project={selectedProject} workstream={selectedWorkstream} />
          )}
        </TabPanel>
      </Paper>

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );

}
