// ===== ProjectsList.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';
import TeamPanel from './TeamPanel';
import WorkstreamsPanel from './WorkstreamsPanel.jsx';
import WorkstreamDetail from './WorkstreamDetail.jsx';
import CreateProjectTab from './CreateProjectTab';

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

import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { supabase } from '../../../lib/supabaseClient';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import DeleteIcon from '@mui/icons-material/Delete';

import colors from '../../../theme/colors';
import ContractsPanel from './ContractsPanel';
import ProjectGeneralPanel from './ProjectGeneralPanel';
import ProjectsDashboard from './ProjectsDashboard';

// ✅ เพิ่ม: ใช้ดึงสมาชิกจาก tpr_project_members
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
    >
      {value === index && (
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
      GENERAL: 1,
      CONTRACT: 2,
      WORK: 3,
      TEAM: 4,
      CREATE: 5,
      DASHBOARD: 6,
    }),
    []
  );

  const [tab, setTab] = React.useState(0);
  const [tabLoading, setTabLoading] = React.useState(false);
  const [tabReady, setTabReady] = React.useState(true);

  const gotoTab = React.useCallback((newValue) => {
    setTab(newValue);
    setTabLoading(true);
    setTabReady(false);
    window.setTimeout(() => {
      setTabLoading(false);
      setTabReady(true);
    }, 400);
  }, []);

  const handleTabChange = (event, newValue) => {
    gotoTab(newValue);
  };

  const [search, setSearch] = React.useState('');
  const [deletingMap, setDeletingMap] = React.useState({});
  const [projects, setProjects] = React.useState([]);

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

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const formatEmployee = (emp) => {
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
  };

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
  // ✅ แก้: รองรับเติม initial_team_ids ตอนแก้ไข
  const setFormFromProject = (p, initialTeamIds = []) => {
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

      // ✅ สำคัญ: เติมทีมจาก tpr_project_members ตอนแก้ไข
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
  };

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
    if (!q) return true;
    const code = String(p.project_code || p.code || '').toLowerCase();
    const name = String(p.name_th || p.name || p.name_en || '').toLowerCase();
    return code.includes(q) || name.includes(q);
  });

  const paginated = filtered || [];

  const statusMap = {
    Active: 'กำลังดำเนินการ',
    Planning: 'อยู่ระหว่างวางแผน',
    Completed: 'เสร็จสิ้น',
  };

  // initial load: customers + employees + projects
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
        if (custRes.error) throw custRes.error;
        if (empRes.error) throw empRes.error;
        if (projRes.error) throw projRes.error;

        setCustomers(custRes.data || []);
        setEmployees(empRes.data || []);
        setProjects((projRes.data || []).map((r) => ({ ...r })));
      } catch (err) {
        console.error('Failed to load initial project data', err);
        handleNotify('โหลดข้อมูลโครงการล้มเหลว', 'error');
      }
      try {
        if (mounted && typeof onReady === 'function') onReady();
      } catch {
        // ignore
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

  // ✅ helper: ไปหน้า “สร้างโปรเจค” ในโหมดแก้ไข
  // ✅ แก้: ดึงสมาชิกจาก tpr_project_members แล้วเติม initial_team_ids
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
        // ไม่ต้อง throw เพื่อให้ยังแก้ไขข้อมูลโครงการได้
      }

      setFormFromProject(p, teamIds);
      gotoTab(TAB.CREATE);
    },
    [TAB.CREATE, gotoTab, customers, employees]
  );

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
        }}
        elevation={0}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          aria-label="แท็บโครงการ"
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTabs-indicator': { bgcolor: colors.primary } }}
        >
          <Tab sx={tabSx} label="ข้อมูลโครงการ" value={TAB.LIST} {...a11yProps(TAB.LIST)} />
          <Tab sx={tabSx} label="ทั่วไป" value={TAB.GENERAL} {...a11yProps(TAB.GENERAL)} />
          <Tab sx={tabSx} label="สัญญาและการเงิน" value={TAB.CONTRACT} {...a11yProps(TAB.CONTRACT)} />
          <Tab sx={tabSx} label="แผนงานโครงการ" value={TAB.WORK} {...a11yProps(TAB.WORK)} />
          <Tab sx={tabSx} label="ทีมงาน" value={TAB.TEAM} {...a11yProps(TAB.TEAM)} />
          <Tab sx={tabSx} label="สร้างโปรเจค" value={TAB.CREATE} {...a11yProps(TAB.CREATE)} />
          <Tab sx={tabSx} label="แดชบอร์ดโครงการ" value={TAB.DASHBOARD} {...a11yProps(TAB.DASHBOARD)} />
        </Tabs>

        <TabPanel value={tab} index={TAB.LIST}>
          <Typography fontWeight={600}>ข้อมูลโครงการ</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, mt: 2 }}>
            <TextField
              size="small"
              placeholder="ค้นหา โครงการ (รหัส หรือ ชื่อ)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              fullWidth
              sx={{
                background: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
              }}
            />
            <IconButton
              onClick={() => {
                resetCreateForm();
                gotoTab(TAB.CREATE);
              }}
              sx={{ borderRadius: '50%', bgcolor: colors.primary, color: '#fff', '&:hover': { bgcolor: colors.primaryDark } }}
              aria-label="เพิ่มโครงการใหม่"
            >
              <AddIcon />
            </IconButton>
          </Box>

          {(filtered || []).length > 0 && (
            <TableContainer
              sx={{
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                overflow: 'auto',
                bgcolor: 'background.paper',
                boxShadow: 'none',
                border: 'none',
              }}
            >
              <Table
                size="small"
                sx={{ minWidth: 800, borderCollapse: 'separate', '& th, & td': { padding: '10px 12px', borderBottom: 'none' } }}
              >
                <TableHead
                  sx={{
                    '& th': {
                      position: 'sticky',
                      top: 0,
                      background: 'background.paper',
                      zIndex: 2,
                      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)',
                    },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>รหัสโครงการ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ชื่อโครงการ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ความสัมพันธ์</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ลูกค้า</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>วันที่เริ่ม</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>วันที่สิ้นสุด</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ความคืบหน้า</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(paginated || []).map((p) => {
                    const pid = p.id ?? p.projectId ?? p.project_id ?? '';
                    const deleting = !!deletingMap[String(pid)];

                    const projectCode = p.project_code ?? p.code ?? '';
                    const projectName = p.name_th ?? p.name ?? p.name_en ?? '';
                    const projectClient = (p.customer_name ?? p.customer) || findCustomerDisplay(p.customer_id) || p.client || '';
                    const projectStart = (p.start_date ?? p.start) || '';
                    const projectEnd = (p.end_date ?? p.end) || '';

                    return (
                      <TableRow
                        key={pid || `${projectCode}-${projectName}`}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedProject(p);
                          gotoTab(TAB.DASHBOARD);
                        }}
                      >
                        <TableCell>{projectCode}</TableCell>
                        <TableCell>{projectName}</TableCell>
                        <TableCell>
                          {(() => {
                            const parentId = p.parent_project_id ?? p.parent_id ?? null;
                            if (!parentId) return 'โครงการหลัก';
                            const parent = (projects || []).find((pp) => String(pp.id) === String(parentId));
                            const parentCode = parent ? (parent.project_code || parent.code || parent.name_th || parent.name) : null;
                            return parentCode ? `โครงการย่อยของ ${parentCode}` : `โครงการย่อยของ ${parentId}`;
                          })()}
                        </TableCell>
                        <TableCell>{projectClient}</TableCell>
                        <TableCell>{formatDate(projectStart)}</TableCell>
                        <TableCell>{formatDate(projectEnd)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {`${p.status === 'Active' ? '🌳' : p.status === 'Planning' ? '🌱' : p.status === 'Completed' ? '🌴' : '•'} ${
                              statusMap[p.status] ?? p.status
                            }`}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ width: 180 }}>
                          {typeof p.progress === 'number' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.max(0, Math.min(100, p.progress))}
                                  sx={{
                                    height: 8,
                                    borderRadius: 6,
                                    bgcolor: '#ccecd9ff',
                                    '& .MuiLinearProgress-bar': { backgroundColor: '#06c655' },
                                  }}
                                />
                              </Box>
                              <Box sx={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>{`${p.progress}%`}</Box>
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>

                        <TableCell sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditInCreateTab(p);
                              }}
                              aria-label="แก้ไขโครงการ"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDelete(p);
                              }}
                              aria-label="ลบโครงการ"
                              disabled={deleting}
                            >
                              {deleting ? <CircularProgress size={18} sx={{ color: '#d32f2f' }} /> : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {(filtered || []).length === 0 && (
            <Box sx={{ py: 2, alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
              <Typography color="text.secondary">ยังไม่มีข้อมูลโครงการ</Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tab} index={TAB.GENERAL}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#d32f2f' }} />
            </Box>
          ) : !selectedProject ? (
            <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูรายละเอียดทั่วไป</Typography>
          ) : (
            tabReady && (
              <ProjectGeneralPanel
                project={selectedProject}
                onUpdated={(updated) => {
                  if (!updated) return;
                  setProjects((prev) => (prev || []).map((p) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)));
                  setSelectedProject((prev) => (prev && String(prev.id) === String(updated.id) ? { ...prev, ...updated } : prev));
                }}
              />
            )
          )}
        </TabPanel>

        <TabPanel value={tab} index={TAB.CONTRACT}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#d32f2f' }} />
            </Box>
          ) : !selectedProject ? (
            <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูสัญญาและการเงิน</Typography>
          ) : (
            tabReady && <ContractsPanel projectId={selectedProject?.id} />
          )}
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

        <TabPanel value={tab} index={TAB.TEAM}>
          {tabLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#d32f2f' }} />
            </Box>
          ) : !selectedProject ? (
            <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูทีมงาน</Typography>
          ) : (
            tabReady && <TeamPanel projectId={selectedProject?.id} />
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
            onGoWork={() => {
              if (!selectedProject) return;
              setSelectedWorkstream(null);
              gotoTab(TAB.WORK);
            }}
          />
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
