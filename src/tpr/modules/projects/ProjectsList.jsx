import * as React from 'react';
import TeamPanel from './TeamPanel';
import WorkstreamsPanel from './WorkstreamsPanel.jsx';
import WorkstreamDetail from './WorkstreamDetail.jsx';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
// Breadcrumbs/Link removed; tabs handle navigation like SystemSettings
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { supabase } from '../../../lib/supabaseClient';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TablePagination from '@mui/material/TablePagination';
import colors from '../../../theme/colors';
import DeleteIcon from '@mui/icons-material/Delete';
import ContractsPanel from './ContractsPanel';
import ProjectGeneralPanel from './ProjectGeneralPanel';

// removed unused confetti import

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
            {value === index && <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</Box>}
        </div>
    );
}

function a11yProps(index) {
    return {
        id: `projects-tab-${index}`,
        'aria-controls': `projects-tabpanel-${index}`,
    };
}

// Removed unused RunningProgress placeholder


export default function ProjectsList(props) {
    const { onReady } = props || {};
    dayjs.locale('th');

    const [search, setSearch] = React.useState('');
    const [deletingMap, setDeletingMap] = React.useState({});
    const [projects, setProjects] = React.useState([]);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogSaving, setDialogSaving] = React.useState(false);
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState('warning');
    const [dialogForm, setDialogForm] = React.useState({ id: null, code: '', name: '', client: '', clientTitle: '', customer_id: null, customer_code: '', start: '', end: '', manager: '', managerTitle: '', manager_id: null, principal: '', principalTitle: '', principal_id: null, parent_project_id: 'MAIN', contract_type: 'เหมารวม', budget: '', status: 'Planning', image_path: '' });
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [previewSrc, setPreviewSrc] = React.useState('');

    const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
    const [customerPickerTargetId, setCustomerPickerTargetId] = React.useState(null);
    const [customerPrefix, setCustomerPrefix] = React.useState('');
    const [customerSearch, setCustomerSearch] = React.useState('');

    const [customers, setCustomers] = React.useState([]);
    const [selectedCustomerKey, setSelectedCustomerKey] = React.useState(null);

    const [employees, setEmployees] = React.useState([]);
    const [selectedEmployeeKey, setSelectedEmployeeKey] = React.useState(null);
    const [employeeDialogOpen, setEmployeeDialogOpen] = React.useState(false);
    const [employeePickerTargetId, setEmployeePickerTargetId] = React.useState(null);
    const [employeePrefix, setEmployeePrefix] = React.useState('');
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
    const [confirmDeleteTarget, setConfirmDeleteTarget] = React.useState(null);
    const [selectedProject, setSelectedProject] = React.useState(null);

    const openProjectDialog = (p) => {
        if (p) {
            setFormFromProject(p);
            setDialogOpen(true);
            return;
        }
        setDialogForm({ id: null, code: '', name: '', client: '', clientTitle: '', start: '', end: '', manager: '', managerTitle: '', principal: '', principalTitle: '', parent_project_id: 'MAIN', contract_type: 'เหมารวม', budget: '', status: 'Planning', image_path: '' });
        setSelectedFile(null);
        setPreviewSrc('');
        setDialogOpen(true);
    };

    const setFormFromProject = (p) => {
        if (!p) return;
        const managerRec = (employees || []).find(x => String(x.id) === String(p.manager_id) || String(x.employee_code) === String(p.manager_id));
        const principalRec = (employees || []).find(x => String(x.id) === String(p.principal_id) || String(x.employee_code) === String(p.principal_id));
        const custRec = (customers || []).find(x => String(x.id) === String(p.customer_id) || String(x.customer_id) === String(p.customer_id));
        const contractReverseMap = {
            'Fixed Fee': 'เหมารวม',
            'Hourly (NTE)': 'คิดตามชั่วโมงจริง',
            'Cost Plus': 'ต้นทุนบวก',
        };
        setDialogForm({
            id: p.id,
            code: p.project_code || p.code || '',
            name: p.name_th || p.name || p.name_en || '',
            name_en: p.name_en || '',
            client: p.customer_name || p.client || (custRec ? (custRec.name_th || custRec.name_en || '') : ''),
            clientTitle: p.customer_code || (custRec ? custRec.customer_id : ''),
            customer_id: p.customer_id || null,
            customer_code: p.customer_code || '',
            customer_name: p.customer_name || '',
            start: p.start_date || p.start || '',
            end: p.end_date || p.end || '',
            manager: managerRec ? formatEmployee(managerRec) : (p.manager || ''),
            managerTitle: managerRec ? (managerRec.title_th || '') : '',
            manager_id: p.manager_id || p.manager || null,
            principal: principalRec ? formatEmployee(principalRec) : (p.principal || ''),
            principalTitle: principalRec ? (principalRec.title_th || '') : '',
            principal_id: p.principal_id || p.principal || null,
            parent_project_id: p.parent_project_id ? String(p.parent_project_id) : (p.parent_id ? String(p.parent_id) : 'MAIN'),
            contract_type: contractReverseMap[p.contract_type] || p.contract_type || 'เหมารวม',
            budget: p.budget ? String(Number(p.budget)) : '',
            status: p.status || 'Planning',
            image_path: p.image_path || '',
        });
        // set preview if image_path present
        try {
            const ip = p.image_path || '';
            if (ip) {
                const isFullUrl = /^https?:\/\//i.test(ip);
                if (isFullUrl) {
                    setPreviewSrc(ip);
                } else {
                    const { data } = supabase.storage.from('project-images').getPublicUrl(ip);
                    const publicUrl = data?.publicUrl || '';
                    setPreviewSrc(publicUrl);
                }
            } else {
                setPreviewSrc('');
            }
        } catch {
            setPreviewSrc('');
        }
    };

    // file handlers for project image
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
        // clear preview and any selected/existing image path from the form
        setPreviewSrc('');
        setDialogForm(prev => ({ ...prev, image_path: '' }));
    };

    const requestDelete = (p) => {
        setConfirmDeleteTarget(p || null);
        setConfirmDeleteOpen(true);
    };

    const performDelete = async (id) => {
        if (!id) return;
        setDeletingMap((s) => ({ ...s, [String(id)]: true }));
        try {
            // Best-effort cleanup for FK dependencies before deleting the project
            // Fixes: "Key is still referenced from table tpr_project_role_rates"
            try {
                await supabase
                    .from('tpr_project_role_rates')
                    .delete()
                    .eq('project_id', id);
            } catch (depErr) {
                // Ignore dependency cleanup errors but log for visibility
                console.warn('Cleanup tpr_project_role_rates failed (ignored):', depErr);
            }

            const { error } = await supabase.from('tpr_projects').delete().eq('id', id);
            if (error) throw error;
            setProjects(prev => (prev || []).filter(x => String(x.id) !== String(id)));
        } catch (err) {
            console.error('Failed to delete project', err);
            setSnackbarMessage('ลบข้อมูลล้มเหลว');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setDeletingMap((s) => {
                const ns = { ...s };
                delete ns[String(id)];
                return ns;
            });
        }
    };

    const handleConfirmDeleteCancel = () => {
        setConfirmDeleteOpen(false);
        setConfirmDeleteTarget(null);
    };

    const handleConfirmDeleteConfirm = async () => {
        const id = confirmDeleteTarget?.id;
        setConfirmDeleteOpen(false);
        setConfirmDeleteTarget(null);
        await performDelete(id);
    };

    const filtered = (projects || []).filter((p) => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return true;
        const code = String(p.project_code || p.code || '').toLowerCase();
        const name = String(p.name_th || p.name || p.name_en || '').toLowerCase();
        return code.includes(q) || name.includes(q);
    });

    // pagination removed: show all filtered results

    // pagination handlers removed

    const paginated = filtered || [];

    const statusMap = {
        Active: 'กำลังดำเนินการ',
        Planning: 'อยู่ระหว่างวางแผน',
        Completed: 'เสร็จสิ้น',
    };

    const displayedCustomers = React.useMemo(() => {
        const q = (customerSearch || '').trim().toLowerCase();
        if (!q) return (customers || []);
        return (customers || []).filter(c => {
            const nameTh = (c?.name_th || '').toString().toLowerCase();
            const nameEn = (c?.name_en || '').toString().toLowerCase();
            const cid = (c?.customer_id || '').toString().toLowerCase();
            return nameTh.includes(q) || nameEn.includes(q) || cid.includes(q);
        });
    }, [customers, customerSearch]);

    const formatEmployee = (emp) => {
        if (!emp) return '';
        const thParts = [(emp.first_name_th || ''), (emp.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
        if (thParts.length) return thParts.join(' ');
        const enParts = [(emp.title_en || ''), (emp.first_name_en || ''), (emp.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
        if (enParts.length) return enParts.join(' ');
        const nick = (emp.nickname_th || emp.nickname_en || '').toString().trim();
        if (nick) return nick;
        return (emp.employee_code || emp.employee_id || emp.id || '').toString();
    };

    const displayedEmployees = React.useMemo(() => {
        const q = (employeeSearch || '').trim().toLowerCase();
        if (!q) return (employees || []);
        return (employees || []).filter(e => {
            const nameStr = (formatEmployee(e) || '').toLowerCase();
            const code = ((e?.employee_code || e?.employee_id || e?.id) || '').toString().toLowerCase();
            return nameStr.includes(q) || code.includes(q);
        }).sort((a, b) => {
            const ac = (a?.employee_code || a?.employee_id || a?.id || '').toString();
            const bc = (b?.employee_code || b?.employee_id || b?.id || '').toString();
            return ac.localeCompare(bc, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [employees, employeeSearch]);

    // initial load: customers + employees then signal ready
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // load customers, employees and projects in parallel
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
                // normalize project rows: prefer db column names but keep compat
                const projRows = (projRes.data || []).map((r) => ({
                    ...r,
                }));
                setProjects(projRows);
            } catch (err) {
                console.error('Failed to load initial project data', err);
                setSnackbarMessage('โหลดข้อมูลโครงการล้มเหลว');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            }
            try {
                if (mounted && typeof onReady === 'function') onReady();
            } catch {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [onReady]);


    // refresh customers when customer dialog opens
    React.useEffect(() => {
        if (!customerDialogOpen) return undefined;
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('tpr_customers').select('*').order('created_at', { ascending: false }).limit(1000);
                if (!mounted) return;
                if (error) throw error;
                setCustomers(data || []);
            } catch (err) {
                console.error('Failed to load tpr_customers', err);
            }
        })();
        return () => { mounted = false; };
    }, [customerDialogOpen]);

    // refresh employees when employee dialog opens
    React.useEffect(() => {
        if (!employeeDialogOpen) return undefined;
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('employees').select('*').order('employee_code', { ascending: true }).limit(1000);
                if (!mounted) return;
                if (error) throw error;
                setEmployees(data || []);
            } catch (err) {
                console.error('Failed to load employees', err);
            }
        })();
        return () => { mounted = false; };
    }, [employeeDialogOpen]);

    const handleDialogChange = (field, value) => setDialogForm(prev => ({ ...prev, [field]: value }));

    const findCustomerDisplay = (id) => {
        if (!id) return '';
        const c = (customers || []).find(x => String(x.id) === String(id) || String(x.customer_id) === String(id));
        return c ? (c.name_th || c.name_en || c.customer_id || '') : '';
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const handleDialogSave = async () => {
        // validate required fields
        const required = [
            { key: 'code', label: 'รหัสโครงการ' },
            { key: 'name', label: 'ชื่อโครงการ' },
            { key: 'client', label: 'ลูกค้า' },
            { key: 'manager', label: 'ผู้จัดการโครงการ' },
            { key: 'principal', label: 'ผู้รับผิดชอบหลัก' },
            { key: 'parent_project_id', label: 'ความสัมพันธ์โครงการ' },
            { key: 'start', label: 'วันที่เริ่ม' },
            { key: 'end', label: 'วันที่สิ้นสุด' },
            { key: 'status', label: 'สถานะโครงการ' },
        ];
        const missing = required.filter(f => {
            const v = dialogForm?.[f.key];
            return v === undefined || v === null || (typeof v === 'string' && v.toString().trim() === '');
        }).map(f => f.label);
        if (missing.length > 0) {
            setSnackbarMessage(`กรุณากรอก ${missing.join(', ')}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }

        setDialogSaving(true);
        try {
            const contractMap = {
                'เหมารวม': 'Fixed Fee',
                'คิดตามชั่วโมงจริง': 'Hourly (NTE)',
                'ต้นทุนบวก': 'Cost Plus',
                'Fixed Fee': 'Fixed Fee',
                'Hourly (NTE)': 'Hourly (NTE)',
                'Cost Plus': 'Cost Plus',
            };
            const payloadBase = {
                project_code: dialogForm.code || '',
                name_th: dialogForm.name || '',
                name_en: dialogForm.name_en || '',
                customer_id: dialogForm.customer_id || null,
                customer_code: dialogForm.customer_code || '',
                customer_name: dialogForm.customer_name || dialogForm.client || '',
                start_date: dialogForm.start || null,
                end_date: dialogForm.end || null,
                manager_id: dialogForm.manager_id || null,
                principal_id: dialogForm.principal_id || null,
                parent_project_id: (dialogForm.parent_project_id === 'MAIN') ? null : (dialogForm.parent_project_id || null),
                contract_type: contractMap[dialogForm.contract_type] ?? dialogForm.contract_type,
                budget: Number(dialogForm.budget || 0),
                status: dialogForm.status || 'Planning',
                // image_path will be set below if a file was uploaded
            };

            // If a new file was selected, upload it to Supabase Storage first
            if (selectedFile) {
                try {
                    const ext = (selectedFile.name || '').split('.').pop();
                    const safeCode = (dialogForm.code || 'project').toString().replace(/[^a-z0-9-_]/gi, '_');
                    const filename = `${Date.now()}_${safeCode}.${ext}`;
                    const filePath = filename; // store at root of 'project-images' bucket
                    const { error: uploadErr } = await supabase.storage.from('project-images').upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });
                    if (uploadErr) throw uploadErr;
                    const { data } = supabase.storage.from('project-images').getPublicUrl(filePath);
                    const publicUrl = data?.publicUrl || '';
                    // store full public URL in image_path
                    payloadBase.image_path = publicUrl;
                } catch (upErr) {
                    console.error('upload error', upErr);
                    setDialogSaving(false);
                    setSnackbarMessage('อัปโหลดรูปไม่สำเร็จ');
                    setSnackbarSeverity('error');
                    setSnackbarOpen(true);
                    return;
                }
            } else if (dialogForm.image_path === '') {
                // explicit removal
                payloadBase.image_path = null;
            } else if (dialogForm.image_path) {
                // keep existing full URL
                payloadBase.image_path = dialogForm.image_path;
            }

            if (dialogForm.id) {
                // update (do not include id in payload)
                const id = dialogForm.id;
                const { data, error } = await supabase.from('tpr_projects').update(payloadBase).eq('id', id).select().single();
                if (error) throw error;
                setProjects(prev => (prev || []).map(p => (String(p.id) === String(data.id) ? data : p)));
                setSelectedProject(data);
            } else {
                // insert
                // show payload in console for debugging when creating a new project
                
                const { data, error } = await supabase.from('tpr_projects').insert([payloadBase]).select().single();
                if (error) throw error;
                setProjects(prev => [data, ...(prev || [])]);
                setSelectedProject(data);
            }

            setDialogSaving(false);
            setDialogOpen(false);
            setSnackbarMessage('บันทึกข้อมูลเรียบร้อย');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Failed to save project', err);
            setDialogSaving(false);
            setSnackbarMessage('บันทึกข้อมูลล้มเหลว');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDialogClose = () => { setDialogOpen(false); };

    const [tab, setTab] = React.useState(0);
    const [tabLoading, setTabLoading] = React.useState(false);
    const [tabReady, setTabReady] = React.useState(true);
    const handleTabChange = (event, newValue) => {
        setTab(newValue);
        // show a red spinner while preparing tab content
        setTabLoading(true);
        setTabReady(false);
        // gate rendering briefly to allow child components/data to prepare
        // If needed we can replace this with child onReady callbacks later
        setTimeout(() => {
            setTabLoading(false);
            setTabReady(true);
        }, 400);
    };
    const tabSx = {
        '&.Mui-focusVisible': { outline: 'none' },
        '&:focus': { outline: 'none' },
        '&.Mui-selected': { color: colors.primary, fontWeight: 600 },
    };

    // workstream detail state for the Workstreams tab
    const [selectedWorkstream, setSelectedWorkstream] = React.useState(null);

    

    return (
        <Box sx={{ p: 0, bgcolor: colors.gray100 || '#f5f5f5', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 320, boxShadow: 'none' }} elevation={0}>
                {tab !== 0 && (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
                            <Breadcrumbs aria-label="breadcrumb">
                                <Link underline="hover" color="inherit" component="button" onClick={() => { setSelectedProject(null); setTab(0); }} sx={{ fontSize: 14 }}>
                                    รายการโครงการ
                                </Link>
                                <Typography color="text.primary" sx={{ fontWeight: 600, fontSize: 14 }}>
                                    {`${selectedProject?.project_code || selectedProject?.code || ''} ${selectedProject?.name_th || selectedProject?.name || ''}`.trim()}
                                </Typography>
                            </Breadcrumbs>
                        </Box>
                        <Tabs value={tab} onChange={handleTabChange} aria-label="แท็บรายละเอียดโครงการ" variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTabs-indicator': { bgcolor: colors.primary } }}>
                            <Tab sx={tabSx} label="ทั่วไป" value={1} {...a11yProps(1)} />
                            <Tab sx={tabSx} label="สัญญาและการเงิน" value={2} {...a11yProps(2)} />
                            <Tab sx={tabSx} label="แผนงานโครงการ" value={3} {...a11yProps(3)} />
                            <Tab sx={tabSx} label="ทีมงาน" value={4} {...a11yProps(4)} />
                        </Tabs>
                    </>
                )}

                <TabPanel value={tab} index={0}>
                    <Typography fontWeight={600}>ข้อมูลโครงการ</Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, mt: 2 }}>
                        <TextField size="small" placeholder="ค้นหา โครงการ (รหัส หรือ ชื่อ)" value={search} onChange={(e) => setSearch(e.target.value)} variant="outlined" fullWidth sx={{ background: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' }, }} />
                        <IconButton onClick={() => openProjectDialog()} sx={{ borderRadius: '50%', bgcolor: colors.primary, color: '#fff', '&:hover': { bgcolor: colors.primaryDark } }} aria-label="เพิ่มโครงการใหม่"><AddIcon /></IconButton>
                    </Box>

                    {(filtered || []).length > 0 && (
                        <>
                            <TableContainer sx={{ borderRadius: 2, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', bgcolor: 'background.paper', boxShadow: 'none', border: 'none' }}>
                                <Table size="small" sx={{ minWidth: 800, borderCollapse: 'separate', '& th, & td': { padding: '10px 12px', borderBottom: 'none' } }}>
                                    <TableHead sx={{ '& th': { position: 'sticky', top: 0, background: 'background.paper', zIndex: 2, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' } }}>
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
                                            // derive display values from DB-backed record
                                            const projectCode = p.project_code ?? p.code ?? '';
                                            const projectName = p.name_th ?? p.name ?? p.name_en ?? '';
                                            const projectClient = (p.customer_name ?? p.customer) || findCustomerDisplay(p.customer_id) || p.client || '';
                                            const projectStart = (p.start_date ?? p.start) || '';
                                            const projectEnd = (p.end_date ?? p.end) || '';
                                            return (
                                                <TableRow key={pid || Math.random()}>
                                                    <TableCell>{projectCode}</TableCell>
                                                    <TableCell>{projectName}</TableCell>
                                                    <TableCell>
                                                        {
                                                            (() => {
                                                                const parentId = p.parent_project_id ?? p.parent_id ?? null;
                                                                if (!parentId) return 'โครงการหลัก';
                                                                const parent = (projects || []).find(pp => String(pp.id) === String(parentId));
                                                                const parentCode = parent ? (parent.project_code || parent.code || parent.name_th || parent.name) : null;
                                                                return parentCode ? `โครงการย่อยของ ${parentCode}` : `โครงการย่อยของ ${parentId}`;
                                                            })()
                                                        }
                                                    </TableCell>
                                                    <TableCell>{projectClient}</TableCell>
                                                    <TableCell>{formatDate(projectStart)}</TableCell>
                                                    <TableCell>{formatDate(projectEnd)}</TableCell>
                                                    <TableCell><Typography variant="body2">{`${(p.status === 'Active') ? '🌳' : (p.status === 'Planning') ? '🌱' : (p.status === 'Completed') ? '🌴' : '•'} ${statusMap[p.status] ?? p.status}`}</Typography></TableCell>
                                                    <TableCell sx={{ width: 180 }}>{typeof p.progress === 'number' ? (<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={Math.max(0, Math.min(100, p.progress))} sx={{ height: 8, borderRadius: 6, bgcolor: '#ccecd9ff', '& .MuiLinearProgress-bar': { backgroundColor: '#06c655' }, }} /></Box><Box sx={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>{`${p.progress}%`}</Box></Box>) : ('-')}</TableCell>
                                                    <TableCell sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <IconButton size="small" onClick={() => { setSelectedProject(p); setFormFromProject(p); setTab(1); }} aria-label="แก้ไขโครงการ"><EditIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" onClick={() => requestDelete(p)} aria-label="ลบโครงการ" disabled={deleting}>{deleting ? <CircularProgress size={18} sx={{ color: '#d32f2f' }} /> : <DeleteIcon fontSize="small" />}</IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {/* pagination removed: showing all filtered rows */}
                        </>
                    )}

                    {(filtered || []).length === 0 && (
                        <Box sx={{ py: 2, alignItems: 'center', display: 'flex', justifyContent: 'center' }}><Typography color="text.secondary">ยังไม่มีข้อมูลโครงการ</Typography></Box>
                    )}
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    {tabLoading ? ( 
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#d32f2f' }} />
                        </Box>
                    ) : (!selectedProject ? (
                        <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูรายละเอียดทั่วไป</Typography>
                    ) : (
                        tabReady && (
                            <ProjectGeneralPanel project={selectedProject} onUpdated={(updated) => {
                                if (!updated) return;
                                setProjects(prev => (prev || []).map(p => String(p.id) === String(updated.id) ? { ...p, ...updated } : p));
                                setSelectedProject(prev => prev && String(prev.id) === String(updated.id) ? { ...prev, ...updated } : prev);
                            }} />
                        )
                    ))}
                </TabPanel>

                <TabPanel value={tab} index={2}>
                    {tabLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#d32f2f' }} />
                        </Box>
                    ) : (!selectedProject ? (
                        <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูสัญญาและการเงิน</Typography>
                    ) : (
                        tabReady && (
                            <ContractsPanel projectId={selectedProject?.id} />
                        )
                    ))}
                </TabPanel>

                <TabPanel value={tab} index={3}>
                    {tabLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#d32f2f' }} />
                        </Box>
                    ) : (!selectedProject ? (
                        <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อจัดการแผนงานโครงการ</Typography>
                    ) : (
                        tabReady && (!selectedWorkstream ? (
                            <WorkstreamsPanel projectId={selectedProject?.id} onOpenDetail={(ws) => setSelectedWorkstream(ws)} />
                        ) : (
                            <WorkstreamDetail workstream={selectedWorkstream} onBack={() => setSelectedWorkstream(null)} />
                        ))
                    ))}
                </TabPanel>

                <TabPanel value={tab} index={4}>
                    {tabLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#d32f2f' }} />
                        </Box>
                    ) : (!selectedProject ? (
                        <Typography color="text.secondary">เลือกโครงการจากแท็บ "ข้อมูลโครงการ" เพื่อดูทีมงาน</Typography>
                    ) : (
                        tabReady && (
                            <TeamPanel projectId={selectedProject?.id} />
                        )
                    ))}
                </TabPanel>

                {/* Add / Edit Dialog */}
                <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
                    <DialogTitle>{dialogForm?.id ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {/* Project image picker */}
                            <Box>
                                <input id="project-image-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
                                    <Box sx={{ position: 'relative', width: 120, aspectRatio: '1 / 1', '&:hover .imageOverlay': { opacity: 1 } }}>
                                        {previewSrc ? (
                                            <Box component="img" src={previewSrc} alt="preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }} />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', bgcolor: '#f5f5f7', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontWeight: 700 }}>+ เพิ่มรูปภาพ</Box>
                                        )}

                                        <label htmlFor="project-image-input">
                                            <Box className="imageOverlay" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.32)', opacity: 0, transition: 'opacity 150ms' }}>
                                                <Button component="span" variant="contained" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: '#000', '&:hover': { bgcolor: '#fff' } }}>{(selectedFile || dialogForm.image_path) ? 'เปลี่ยนรูป' : 'เลือกรูป'}</Button>
                                            </Box>
                                        </label>

                                        {previewSrc && (
                                            <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                                                <Button variant="text" size="small" onClick={handleRemoveFile} sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: '#000', minWidth: 0, px: 1 }}>ลบ</Button>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                            <TextField required label="รหัสโครงการ" size="small" value={dialogForm.code || ''} onChange={(e) => handleDialogChange('code', e.target.value)} fullWidth />
                            <TextField required label="ชื่อโครงการ" size="small" value={dialogForm.name || ''} onChange={(e) => handleDialogChange('name', e.target.value)} fullWidth />
                            <TextField required label="ลูกค้า" size="small" value={dialogForm.client || ''} onChange={(e) => handleDialogChange('client', e.target.value)} fullWidth InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton size="small" onClick={() => { setCustomerPickerTargetId('__dialog__'); setCustomerPrefix(dialogForm.clientTitle || ''); setCustomerSearch(''); setCustomerDialogOpen(true); }} aria-label="เลือกลูกค้า"><MoreHorizIcon fontSize="small" /></IconButton></InputAdornment>), }} />
                            <TextField required label="ผู้จัดการโครงการ" size="small" value={dialogForm.manager || ''} onChange={(e) => handleDialogChange('manager', e.target.value)} fullWidth InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton size="small" onClick={() => { setEmployeePickerTargetId('__dialog__'); setEmployeePrefix(dialogForm.managerTitle || ''); setEmployeeSearch(''); setEmployeeDialogOpen(true); }} aria-label="เลือกผู้จัดการ"><MoreHorizIcon fontSize="small" /></IconButton></InputAdornment>), }} />
                            <TextField required label="ผู้รับผิดชอบหลัก" size="small" value={dialogForm.principal || ''} onChange={(e) => handleDialogChange('principal', e.target.value)} fullWidth InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton size="small" onClick={() => { setEmployeePickerTargetId('__dialog_principal__'); setEmployeePrefix(dialogForm.principalTitle || ''); setEmployeeSearch(''); setEmployeeDialogOpen(true); }} aria-label="เลือกผู้รับผิดชอบหลัก"><MoreHorizIcon fontSize="small" /></IconButton></InputAdornment>), }} />
                            <FormControl size="small" fullWidth>
                                <InputLabel id="project-parent-label">ความสัมพันธ์โครงการ</InputLabel>
                                <Select
                                    labelId="project-parent-label"
                                    label="ความสัมพันธ์โครงการ"
                                    value={dialogForm.parent_project_id ?? 'MAIN'}
                                    onChange={(e) => handleDialogChange('parent_project_id', e.target.value)}
                                >
                                    <MenuItem value="MAIN">โครงการหลัก</MenuItem>
                                    {(projects || []).map((pp) => {
                                        // don't allow selecting itself as parent
                                        if (String(pp.id) === String(dialogForm.id)) return null;
                                        const code = pp.project_code || pp.code || pp.projectId || '';
                                        const label = code ? `โครงการย่อยของ ${code}` : `โครงการย่อยของ ${pp.name_th || pp.name || ''}`;
                                        return (<MenuItem key={pp.id} value={String(pp.id)}>{label}</MenuItem>);
                                    })}
                                </Select>
                            </FormControl>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                                <DatePicker label="วันที่เริ่ม" value={dialogForm.start ? dayjs(dialogForm.start) : null} onChange={(v) => handleDialogChange('start', v ? v.format('YYYY-MM-DD') : '')} slotProps={{ textField: { size: 'small', fullWidth: true, required: true }, }} />
                                <DatePicker label="วันที่สิ้นสุด" value={dialogForm.end ? dayjs(dialogForm.end) : null} onChange={(v) => handleDialogChange('end', v ? v.format('YYYY-MM-DD') : '')} slotProps={{ textField: { size: 'small', fullWidth: true, required: true }, }} />
                            </LocalizationProvider>
                            {/* contract_type and budget removed from Add/Edit dialog per UX change */}
                            <FormControl size="small" fullWidth>
                                <InputLabel id="project-status-label">สถานะโครงการ</InputLabel>
                                <Select
                                    labelId="project-status-label"
                                    label="สถานะโครงการ"
                                    required
                                    value={dialogForm.status || 'Planning'}
                                    onChange={(e) => handleDialogChange('status', e.target.value)}
                                >
                                    <MenuItem value="Planning">🌱 อยู่ระหว่างวางแผน</MenuItem>
                                    <MenuItem value="Active">🌳 กำลังดำเนินการ</MenuItem>
                                    <MenuItem value="Completed">🌴 โครงการเสร็จสิ้น</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 2, pb: 2 }}>
                        <Button onClick={handleDialogClose} sx={{ color: '#000' }}>ยกเลิก</Button>
                        <Button variant="contained" onClick={handleDialogSave} disabled={dialogSaving} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' }, '&.Mui-disabled': { bgcolor: '#000', opacity: 0.6, color: '#fff' }, }}>
                            {dialogSaving ? <CircularProgress size={18} sx={{ color: '#d32f2f' }} /> : 'บันทึก'}
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={confirmDeleteOpen} onClose={handleConfirmDeleteCancel} maxWidth="xs" fullWidth>
                    <DialogTitle>ยืนยันการลบ</DialogTitle>
                    <DialogContent>
                        <Typography>คุณต้องการลบโครงการ "{confirmDeleteTarget?.project_code || confirmDeleteTarget?.code || confirmDeleteTarget?.name_th || confirmDeleteTarget?.name || ''}" หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้</Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 2, pb: 2 }}>
                        <Button onClick={handleConfirmDeleteCancel} sx={{ color: '#000' }}>ยกเลิก</Button>
                        <Button variant="contained" color="error" onClick={handleConfirmDeleteConfirm}>ลบ</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>เลือกพนักงาน</Box>
                        <IconButton size="small" onClick={() => setEmployeeDialogOpen(false)} aria-label="ปิด"><CloseIcon fontSize="small" /></IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 1, mb: 1, display: 'flex', flexDirection: 'column' }}>
                            <TextField size="small" placeholder="ค้นหา พนักงาน (ชื่อ หรือ รหัส)" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} fullWidth autoFocus variant="outlined" sx={{ background: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' }, }} />
                        </Box>
                        <List>
                            {(displayedEmployees || []).length === 0 && (<ListItem><ListItemText primary={(employees && employees.length > 0) ? 'ไม่พบพนักงานที่ค้นหา' : 'ยังไม่มีพนักงาน'} /></ListItem>)}
                            {(displayedEmployees || []).map((emp) => {
                                const display = formatEmployee(emp);
                                const key = emp?.id || emp?.employee_code || emp?.employee_id || display;
                                const isSelected = selectedEmployeeKey === key;
                                return (
                                    <ListItem key={key} disablePadding>
                                        <ListItemButton onClick={() => {
                                            setSelectedEmployeeKey(key);
                                            setTimeout(() => {
                                                if (employeePickerTargetId === '__dialog__' || employeePickerTargetId === '__details__') {
                                                    setDialogForm(prev => ({ ...prev, manager: display, managerTitle: employeePrefix, manager_id: emp?.id || emp?.employee_id || emp?.employee_code }));
                                                } else if (employeePickerTargetId === '__dialog_principal__' || employeePickerTargetId === '__details_principal__') {
                                                    setDialogForm(prev => ({ ...prev, principal: display, principalTitle: employeePrefix, principal_id: emp?.id || emp?.employee_id || emp?.employee_code }));
                                                } else {
                                                    setProjects(prev => (prev || []).map(p => (String(p.id) === String(employeePickerTargetId) ? { ...p, manager: display } : p)));
                                                    if (dialogForm?.id && String(dialogForm.id) === String(employeePickerTargetId)) setDialogForm(prev => ({ ...prev, manager: display }));
                                                }
                                                setEmployeeDialogOpen(false);
                                                setSelectedEmployeeKey(null);
                                                setEmployeePrefix('');
                                            }, 140);
                                        }} sx={{ width: '100%', '&:hover': { bgcolor: 'grey.100' }, bgcolor: isSelected ? 'grey.100' : 'inherit', }}>
                                            <ListItemAvatar><Avatar src={emp?.image_url || emp?.image || ''} sx={{ width: 36, height: 36 }} /></ListItemAvatar>
                                            <ListItemText primary={display} secondary={emp?.employee_code || ''} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </DialogContent>
                </Dialog>

                <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>เลือกลูกค้า</Box>
                        <IconButton size="small" onClick={() => setCustomerDialogOpen(false)} aria-label="ปิด"><CloseIcon fontSize="small" /></IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 1, mb: 1, display: 'flex', flexDirection: 'column' }}>
                            <TextField size="small" placeholder="ค้นหา ลูกค้า (ชื่อ หรือ รหัส)" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} fullWidth autoFocus variant="outlined" sx={{ background: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' }, }} />
                        </Box>
                        <List>
                            {(displayedCustomers || []).length === 0 && (<ListItem><ListItemText primary={(customers && customers.length > 0) ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้า'} /></ListItem>)}
                            {(displayedCustomers || []).map((cust) => {
                                const display = (cust?.name_th || cust?.name_en || cust?.customer_id || '').toString().trim();
                                const key = cust?.id || cust?.customer_id || display;
                                const isSelected = selectedCustomerKey === key;
                                return (
                                    <ListItem key={key} disablePadding>
                                        <ListItemButton onClick={() => {
                                            setSelectedCustomerKey(key);
                                            setTimeout(() => {
                                                if (customerPickerTargetId === '__dialog__' || customerPickerTargetId === '__details__') {
                                                    setDialogForm(prev => ({ ...prev, client: display, clientTitle: customerPrefix, customer_id: cust?.id || cust?.customer_id, customer_code: cust?.customer_id || '', customer_name: display }));
                                                } else {
                                                    setProjects(prev => (prev || []).map(p => (String(p.id) === String(customerPickerTargetId) ? { ...p, client: display } : p)));
                                                    if (dialogForm?.id && String(dialogForm.id) === String(customerPickerTargetId)) setDialogForm(prev => ({ ...prev, client: display }));
                                                }
                                                setCustomerDialogOpen(false);
                                                setSelectedCustomerKey(null);
                                                setCustomerPrefix('');
                                            }, 140);
                                        }} sx={{ width: '100%', '&:hover': { bgcolor: 'grey.100' }, bgcolor: isSelected ? 'grey.100' : 'inherit', }}>
                                            <ListItemText primary={display} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </DialogContent>
                </Dialog>
            </Paper>
            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

