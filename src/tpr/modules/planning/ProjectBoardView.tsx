import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
// Drawer replaced by Dialog for summary UI
import SummarizeIcon from '@mui/icons-material/Summarize';
import ChartsView from './ChartsView';
import TaskAttachmentsDialog from './TaskAttachmentsDialog';
import TaskCommentsDialog from './TaskCommentsDialog';
import TaskQuickFilterBar, { TaskFilters } from './TaskQuickFilterBar';
import Tooltip from '@mui/material/Tooltip';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
// Thai locale for dayjs (Buddhist Era formatting for table is handled separately)
import 'dayjs/locale/th';
// set global locale to Thai so MUI calendar displays Thai month/day names
dayjs.locale('th');
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
// progress indicators removed — board view will not show a loading spinner here
import Divider from '@mui/material/Divider';
import { supabase } from '../../../lib/supabaseClient';
import { fetchProjectTeam, fetchProjectPositions } from '../../../api/supabaseData';

// Types
export type StatusKey = 'todo' | 'doing' | 'review' | 'done' | 'canceled';
export type PriorityKey = 'low' | 'medium' | 'high' | 'critical';

export type ProjectBoardTask = {
  id: number;
  project_id: string;
  phase_id: number;
  phase_name?: string | null;
  code: string;
  name: string;
  planned_hours: number | null;
  owner_id?: string | null;
  owner_name?: string | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // due date
  status: StatusKey;
  priority: PriorityKey;
  attachments_count: number;
  comments_count: number;
};

type EmployeeRow = { id: string; first_name_th?: string | null; last_name_th?: string | null };

// Helper: map status to pastel background color
function getStatusColor(s: StatusKey) {
  switch (s) {
    case 'doing':
      return '#7c4dff'; // stronger purple
    case 'review':
      return '#ff9800'; // stronger orange
    case 'done':
      return '#43a047'; // stronger green
    case 'canceled':
      return '#9e9e9e'; // gray for canceled
    case 'todo':
    default:
      return '#9ca3af'; // neutral gray
  }
}

function getPriorityColor(p: PriorityKey) {
  switch (p) {
    case 'high':
      return '#c62828'; // dark red
    case 'medium':
      return '#f57c00'; // dark amber
    case 'low':
    default:
      return '#00796b'; // dark teal
  }
}

function getPriorityTextColor(p: PriorityKey) {
  // these background colors are dark — use white text for contrast
  return '#fff';
}

function formatDateThai(d?: string | null) {
  if (!d) return '-';
  try {
    // prefer ISO YYYY-MM-DD parsing when possible to avoid timezone shifts
    let year: number;
    let month: string;
    let day: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, dd] = d.split('-');
      year = Number(y) + 543; // Buddhist Era
      month = m.padStart(2, '0');
      day = dd.padStart(2, '0');
    } else {
      const dt = new Date(d);
      year = dt.getFullYear() + 543;
      month = String(dt.getMonth() + 1).padStart(2, '0');
      day = String(dt.getDate()).padStart(2, '0');
    }
    return `${day}-${month}-${year}`;
  } catch (e) {
    return d as any;
  }
}

function formatDateEn(d?: string | null) {
  if (!d) return '-';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, dd] = d.split('-');
      return `${dd.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    const dt = new Date(d);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  } catch (e) {
    return d as any;
  }
}

function statusLabelThai(s: StatusKey) {
  switch (s) {
    case 'doing':
      return 'กำลังทำ';
    case 'review':
      return 'รอตรวจ';
    case 'done':
      return 'เสร็จสิ้น';
    case 'canceled':
      return 'ยกเลิก';
    case 'todo':
    default:
      return 'ยังไม่เริ่ม';
  }
}

function priorityLabelThai(p: PriorityKey) {
  switch (p) {
    case 'high':
      return 'สูง';
    case 'low':
      return 'ต่ำ';
    case 'medium':
    default:
      return 'ปานกลาง';
  }
}

// Fetch helper: tasks + owner names
export async function fetchProjectTasksWithOwners(projectId: string): Promise<ProjectBoardTask[]> {
  // Prefer a DB view that already includes attachments/comments counts
  const { data: tasksRaw, error: tasksError } = await supabase
    .from('v_project_board_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_id', { ascending: true })
    .order('code', { ascending: true });

  if (tasksError) {
    throw tasksError;
  }

  const tasks = (tasksRaw || []) as any[];

  // collect unique owner ids
  const ownerIdsSet = new Set<string>();
  for (const t of tasks) {
    const o = t.owner;
    if (!o) continue;
    // owner might be stored as an array, a JSON-stringified array, or a single uuid string
    if (Array.isArray(o)) {
      for (const id of o) if (id) ownerIdsSet.add(String(id));
    } else if (typeof o === 'string') {
      const s = o.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) parsed.forEach(id => id && ownerIdsSet.add(String(id)));
          else if (parsed) ownerIdsSet.add(String(parsed));
        } catch (e) {
          // not valid JSON, treat as plain string
          ownerIdsSet.add(s);
        }
      } else {
        ownerIdsSet.add(s);
      }
    } else {
      ownerIdsSet.add(String(o));
    }
  }

  const ownerIds = Array.from(ownerIdsSet);

  let employees: EmployeeRow[] = [];
  if (ownerIds.length > 0) {
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('id, first_name_th, last_name_th')
      .in('id', ownerIds);
    if (empError) {
      // don't fail entire fetch if employee lookup fails — log and continue
      console.error('fetch employees error', empError);
    } else {
      employees = (empData || []) as EmployeeRow[];
    }
  }

  const empMap = new Map<string, string>();
  employees.forEach(e => empMap.set(e.id, `${e.first_name_th || ''} ${e.last_name_th || ''}`.trim()));

  const mapped: ProjectBoardTask[] = tasks.map((r: any) => {
    const md = r.metadata || {};
    const status = (md.status as StatusKey) || 'todo';
    const priority = (md.priority as PriorityKey) || 'medium';
    // pick first owner if owner is an array or a JSON string array; else use string
    let ownerId: string | null = null;
    const o = r.owner;
    if (Array.isArray(o)) {
      ownerId = o[0] ? String(o[0]) : null;
    } else if (typeof o === 'string') {
      const s = o.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed) && parsed.length > 0) ownerId = String(parsed[0]);
        } catch (e) {
          ownerId = s || null;
        }
      } else {
        ownerId = s || null;
      }
    } else if (o) {
      ownerId = String(o);
    }
    const ownerName = ownerId ? (empMap.get(ownerId) || '-') : '-';

    return {
      id: Number(r.id),
      project_id: String(r.project_id),
      phase_id: Number(r.phase_id),
      phase_name: r.phase_name || r.phase_label || r.phase_code || null,
      code: r.code || '',
      name: r.name || '',
      planned_hours: r.planned_hours ?? 0,
      owner_id: ownerId,
      owner_name: ownerName,
      start_date: r.start_date || null,
      end_date: r.end_date || null,
      status,
      priority,
      attachments_count: Number(r.attachments_count ?? 0),
      comments_count: Number(r.comments_count ?? 0),
    };
  });

  return mapped;
}

// Component
type Props = {
  projectId: string;
};

export default function ProjectBoardView({ projectId }: Props) {
  const [tasks, setTasks] = React.useState<ProjectBoardTask[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<TaskFilters>({
    status: [],
    ownerMode: 'all',
    selectedOwners: [],
    datePreset: 'all',
    dateField: 'start',
    startDate: null,
    endDate: null,
    priority: [],
    search: '',
  });
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = React.useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = React.useState(false);
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [dialogFilters, setDialogFilters] = React.useState<TaskFilters>({
    status: [], ownerMode: 'all', selectedOwners: [], datePreset: 'all', dateField: 'start', startDate: null, endDate: null, priority: [], search: ''
  });
  const [taskForm, setTaskForm] = React.useState<any>({ code: '', name: '', phase_id: '', planned_hours: '', priority: 'medium', start_date: null, end_date: null, owner: [], billable_mode: 'billable' });
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchTimer = React.useRef<number | null>(null);
  const [taskSnackbarOpen, setTaskSnackbarOpen] = React.useState(false);
  const [taskSnackbarMessage, setTaskSnackbarMessage] = React.useState('');
  const [taskDateError, setTaskDateError] = React.useState('');
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuTask, setMenuTask] = React.useState<ProjectBoardTask | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectBoardTask | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchProjectTasksWithOwners(projectId);
        if (!mounted) return;
        setTasks(rows);
      } catch (err: any) {
        console.error('fetchProjectTasksWithOwners', err);
        if (!mounted) return;
        setError('โหลดข้อมูลงานไม่สำเร็จ');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    // try to get current user id (best-effort)
    (async () => {
      try {
        const maybeGetUser = (supabase.auth as any)?.getUser;
        if (typeof maybeGetUser === 'function') {
          const res = await maybeGetUser();
          if (res?.data?.user?.id) setCurrentUserId(res.data.user.id);
        } else if ((supabase.auth as any)?.user) {
          const u = (supabase.auth as any).user();
          if (u?.id) setCurrentUserId(u.id);
        }
      } catch (e) {
        // ignore
      }
    })();
    // expose reload helper for dialog callbacks
    (window as any).__reloadProjectBoardTasks = async () => {
      try {
        const rows = await fetchProjectTasksWithOwners(projectId);
        if (mounted) setTasks(rows);
      } catch (e) {
        console.error('reloadProjectBoardTasks', e);
      }
    };
    if (projectId) load();
    return () => { mounted = false; };
  }, [projectId]);

  // keep localSearch in sync when parent filters change
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // debounce localSearch -> update parent filters.search
  React.useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current as any);
    searchTimer.current = window.setTimeout(() => {
      setFilters(prev => ({ ...prev, search: localSearch }));
      searchTimer.current = null;
    }, 300) as unknown as number;
    return () => { if (searchTimer.current) window.clearTimeout(searchTimer.current as any); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  // when opening advanced dialog, initialize dialogFilters from current filters
  React.useEffect(() => {
    if (advancedOpen) setDialogFilters(filters);
  }, [advancedOpen]);

  const openMenu = (anchor: HTMLElement, task: ProjectBoardTask) => {
    setMenuAnchorEl(anchor);
    setMenuTask(task);
  };
  const closeMenu = () => {
    setMenuAnchorEl(null);
    setMenuTask(null);
  };

  const handleMenuEdit = (task: ProjectBoardTask) => {
    closeMenu();
    // populate form and open edit dialog
    setTaskForm({
      id: task.id,
      code: task.code || '',
      name: task.name || '',
      phase_id: task.phase_id || '',
      planned_hours: task.planned_hours ?? '',
      priority: task.priority || 'medium',
      start_date: task.start_date ? dayjs(task.start_date) : null,
      end_date: task.end_date ? dayjs(task.end_date) : null,
      owner: task.owner_id ? [task.owner_id] : [],
      status: task.status || 'todo',
      billable_mode: (task as any).billable_mode || 'billable',
    });
    setAddDialogOpen(true);
  };

  const handleMenuDelete = (task: ProjectBoardTask) => {
    closeMenu();
    setDeleteTarget(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      const { data: te, error: teErr } = await supabase.from('tpr_time_entries').select('id').eq('task_id', deleteTarget.id).limit(1);
      if (teErr) throw teErr;
      if (te && te.length > 0) {
        // task has time entries: do NOT allow delete; show warning message
        setTaskSnackbarMessage('ไม่สามารถลบงานที่มีการบันทึกเวลาแล้ว');
        setTaskSnackbarOpen(true);
      } else {
        const { error: delErr } = await supabase.from('tpr_project_wbs_tasks').delete().eq('id', deleteTarget.id);
        if (delErr) throw delErr;
        setTaskSnackbarMessage('ลบงานเรียบร้อยแล้ว');
        setTaskSnackbarOpen(true);
      }
      const rows = await fetchProjectTasksWithOwners(projectId);
      setTasks(rows);
    } catch (e: any) {
      console.error('delete task', e);
      setTaskSnackbarMessage(e?.message || 'ไม่สามารถลบ/อัปเดตงานได้');
      setTaskSnackbarOpen(true);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // derive availableOwners from loaded tasks
  const availableOwners = React.useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => {
      if (t.owner_id) map.set(t.owner_id, t.owner_name || t.owner_id);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

 

  // derive phases from tasks (simple labels when phase metadata not available)
  // load authoritative phases for this project from tpr_project_wbs_phases
  // include start_date/end_date so we can default new tasks to phase dates
  const [phases, setPhases] = React.useState<Array<{ id: number; name: string; start_date?: string | null; end_date?: string | null }>>([]);
  React.useEffect(() => {
    let mounted = true;
    const loadPhases = async () => {
      if (!projectId) return;
      try {
        const { data, error } = await supabase
          .from('tpr_project_wbs_phases')
          .select('id, name, start_date, end_date')
          .eq('project_id', projectId)
          .order('code', { ascending: true });
        if (error) {
          console.error('load phases error', error);
          return;
        }
        if (!mounted) return;
        setPhases((data || []) as any);
      } catch (e) {
        console.error('load phases exception', e);
      }
    };
    loadPhases();
    return () => { mounted = false; };
  }, [projectId]);

  const derivedPhases = React.useMemo(() => {
    // Prefer authoritative `phases` list when available (shows `name` field)
    if (phases && phases.length > 0) {
      return phases.map(p => ({ id: p.id, label: p.name }));
    }
    const map = new Map<number, { id: number; label: string }>();
    tasks.forEach(t => {
      const pid = t.phase_id ?? null;
      if (!pid) return;
      if (!map.has(pid)) {
        const label = (t as any).phase_name || (t as any).phase_label || `เฟส ${pid}`;
        map.set(pid, { id: pid, label });
      }
    });
    return Array.from(map.values());
  }, [tasks, phases]);

  // Project team members (authoritative list of employees assigned to this project)
  const [projectTeamMembers, setProjectTeamMembers] = React.useState<Array<{ id: string; label: string }>>([]);

  React.useEffect(() => {
    let mounted = true;
    const loadTeam = async () => {
      if (!projectId) {
        if (mounted) setProjectTeamMembers([]);
        return;
      }
      try {
        // Prefer to resolve employees by project positions -> map to employees.position_id
        const { data: posData, error: posErr } = await fetchProjectPositions(projectId);
        if (!posErr && posData && posData.length > 0) {
          const positionIds = Array.from(new Set((posData || []).map((p: any) => p.position_id).filter(Boolean).map(String)));
          if (positionIds.length > 0) {
            try {
              const { data: empRows, error: empErr } = await supabase
                .from('employees')
                .select('id,first_name_th,last_name_th,employee_code,position_id')
                .in('position_id', positionIds)
                .order('first_name_th', { ascending: true });
              if (!empErr && empRows && empRows.length > 0) {
                const members = (empRows || []).map((e: any) => ({ id: String(e.id), label: `${(e.first_name_th || '')} ${(e.last_name_th || '')}`.trim() || e.employee_code || String(e.id) }));
                if (mounted) {
                  setProjectTeamMembers(members);
                  // update tasks owner_name mapping to prefer project team labels
                  setTasks(prev => (prev || []).map(t => {
                    if (!t.owner_id) return t;
                    const mem = members.find(mm => String(mm.id) === String(t.owner_id));
                    if (mem) return { ...t, owner_name: mem.label };
                    return t;
                  }));
                }
                return;
              }
            } catch (e) {
              console.error('lookup employees by position error', e);
            }
          }
        }

        // Fallback: use fetchProjectTeam (aggregates from tasks)
        const { data, error } = await fetchProjectTeam(projectId);
        if (error) {
          console.error('fetchProjectTeam error', error);
          return;
        }
        const members = (data || []).map((m: any) => ({ id: String(m.id), label: m.label || String(m.id) }));
        if (!mounted) return;
        setProjectTeamMembers(members);

        // update tasks owner_name mapping to prefer project team labels
        setTasks(prev => (prev || []).map(t => {
          if (!t.owner_id) return t;
          const mem = members.find(mm => String(mm.id) === String(t.owner_id));
          if (mem) return { ...t, owner_name: mem.label };
          return t;
        }));
      } catch (e) {
        console.error('loadProjectTeam exception', e);
      }
    };
    loadTeam();
    return () => { mounted = false; };
  }, [projectId]);

  const employeesForDialog = React.useMemo(() => {
    // use project team members as the authoritative list for dialog selection
    return projectTeamMembers.map(m => ({ id: m.id, label: m.label }));
  }, [projectTeamMembers]);


  // Filtering logic based on `filters`
  const filtered = React.useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const parseDate = (s?: string | null) => (s ? new Date(s + 'T00:00:00') : null);

    return tasks.filter(t => {
      // status filter: empty => all
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(t.status)) return false;
      }

      // owner filter
      if (filters.ownerMode === 'mine') {
        if (!currentUserId) {
          // if we don't know current user, don't filter
        } else if (t.owner_id !== currentUserId) return false;
      } else if (filters.ownerMode === 'custom') {
        if (filters.selectedOwners && filters.selectedOwners.length > 0) {
          if (!t.owner_id || !filters.selectedOwners.includes(t.owner_id)) return false;
        }
      }

      // priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(t.priority as any)) return false;
      }

      // date preset / range filter (use dateField to choose field)
      if (filters.datePreset && filters.datePreset !== 'all') {
        const fieldVal = filters.dateField === 'start' ? t.start_date : t.end_date;
        const d = parseDate(fieldVal);
        if (!d) return false;

        const today = startOfDay(now);
        if (filters.datePreset === 'today') {
          if (startOfDay(d).getTime() !== today.getTime()) return false;
        } else if (filters.datePreset === '7days') {
          const future = new Date(today);
          future.setDate(future.getDate() + 6);
          if (startOfDay(d).getTime() < today.getTime() || startOfDay(d).getTime() > future.getTime()) return false;
        } else if (filters.datePreset === 'month') {
          if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth()) return false;
        } else if (filters.datePreset === 'range') {
          const s = parseDate(filters.startDate);
          const e = parseDate(filters.endDate);
          if (s && startOfDay(d).getTime() < startOfDay(s).getTime()) return false;
          if (e && startOfDay(d).getTime() > startOfDay(e).getTime()) return false;
        }
      }

      // search
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.trim().toLowerCase();
        const hay = `${t.code} ${t.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [tasks, filters, currentUserId]);

  // summary aggregates for the currently visible tasks
  const summary = React.useMemo(() => {
    const totals = {
      total: 0,
      attachments: 0,
      comments: 0,
      plannedHours: 0,
      status: { todo: 0, doing: 0, review: 0, done: 0, canceled: 0 } as Record<StatusKey, number>,
      priority: { low: 0, medium: 0, high: 0, critical: 0 } as Record<PriorityKey, number>,
    };
    for (const t of filtered) {
      totals.total += 1;
      totals.attachments += Number(t.attachments_count ?? 0);
      totals.comments += Number(t.comments_count ?? 0);
      totals.plannedHours += Number(t.planned_hours ?? 0);
      totals.status[t.status] = (totals.status[t.status] || 0) + 1;
      totals.priority[t.priority] = (totals.priority[t.priority] || 0) + 1;
    }
    return totals;
  }, [filtered]);

  return (
    <Box>
      <Paper sx={{ mb: 2, p: 1, display: 'flex', alignItems: 'center', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} elevation={0}>
        <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ fontWeight: 700 }}>ตารางงาน</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', pr: 1 }}>
          {/* View icon removed per request */}

          <Tooltip title="ค้นหา">
            <IconButton size="small" onClick={() => {
              setSearchOpen(s => {
                const next = !s;
                // focus input after open
                if (!s) setTimeout(() => searchInputRef.current && searchInputRef.current.focus(), 50);
                return next;
              });
            }}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Collapse in={searchOpen} orientation="horizontal" sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ ml: 0.5, width: 240 }}>
              <TextField
                size="small"
                placeholder="ค้นหา"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                inputRef={(el: any) => { searchInputRef.current = el; }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
                fullWidth
              />
            </Box>
          </Collapse>

          <Tooltip title="ตัวกรองขั้นสูง">
            <IconButton size="small" onClick={() => setAdvancedOpen(true)}>
              <TuneIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="เพิ่มงาน">
            <Box
              role="button"
              tabIndex={0}
              onClick={() => {
                const firstPhase = (phases && phases.length > 0)
                  ? phases[0]
                  : (derivedPhases && derivedPhases.length > 0 ? { id: derivedPhases[0].id, name: derivedPhases[0].label, start_date: null, end_date: null } as any : null);
                setTaskForm({
                  code: '',
                  name: '',
                  phase_id: firstPhase ? firstPhase.id : '',
                  planned_hours: '',
                  priority: 'medium',
                  start_date: firstPhase && firstPhase.start_date ? dayjs(firstPhase.start_date) : null,
                  end_date: firstPhase && firstPhase.end_date ? dayjs(firstPhase.end_date) : null,
                  billable_mode: 'billable',
                  owner: [],
                });
                setAddDialogOpen(true);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.target as HTMLElement).click(); } }}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'text.secondary', p: 0.5 }}
            >
              <AddCircleOutlineIcon fontSize="medium" sx={{ fontSize: 22 }} />
            </Box>
          </Tooltip>

          {/* <Tooltip title="สรุปงาน">
            <IconButton size="small" onClick={() => setSummaryOpen(true)}>
              <SummarizeIcon />
            </IconButton>
          </Tooltip> */}
        </Box>
      </Paper>

      {/* Advanced Filters Dialog: edits local copy then apply once */}
      <Dialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>ตัวกรองขั้นสูง</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <TaskQuickFilterBar
              filters={dialogFilters}
              onChange={(next) => setDialogFilters(next)}
              availableOwners={availableOwners}
              currentUserId={currentUserId}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvancedOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => { setFilters(dialogFilters); setAdvancedOpen(false); }}>แสดงผลลัพธ์</Button>
        </DialogActions>
      </Dialog>

      {/* Loading indicator intentionally removed for board view */}

      {error && (
        <Typography color="error">{error}</Typography>
      )}

      {!loading && !error && (
        <TableContainer sx={{ width: '100%', overflow: 'auto', maxHeight: '60vh' }}>
          <Table size="small" sx={{ minWidth: 900, '& td, & th': { borderBottom: 'none' } }} stickyHeader>
              <TableHead>
                <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>รหัสงาน</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '20%', whiteSpace: 'nowrap' }}>ชื่องาน</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>ไฟล์/คอมเมนต์</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>ผู้รับผิดชอบ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: '9%', whiteSpace: 'nowrap', textAlign: 'center' }}>ความสำคัญ</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>วันที่เริ่มต้น</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>วันที่สิ้นสุด</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: '9%', whiteSpace: 'nowrap', textAlign: 'center' }}>สถานะ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: '8%', whiteSpace: 'nowrap', textAlign: 'center' }}>จัดการ</TableCell>
                  </TableRow>
              </TableHead>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); setAttachmentsDialogOpen(true); }} aria-label="attachments">
                            <AttachFileOutlined fontSize="small" style={{ color: '#6b7280' }} />
                          </IconButton>
                          <Typography variant="body2">{t.attachments_count}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); setCommentsDialogOpen(true); }} aria-label="comments">
                            <ChatBubbleOutlineOutlined fontSize="small" style={{ color: '#6b7280' }} />
                          </IconButton>
                          <Typography variant="body2">{t.comments_count}</Typography>
                        </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>{t.owner_name || '-'}</TableCell>
                   <TableCell align="center">
                    <Chip
                      label={priorityLabelThai(t.priority)}
                      size="medium"
                      sx={{
                        bgcolor: getPriorityColor(t.priority),
                        color: getPriorityTextColor(t.priority),
                        width: '100%',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 1,
                        '& .MuiChip-label': { width: '100%', textAlign: 'center', fontSize: 14 },
                      }}
                    />
                  </TableCell>

                 
                  <TableCell>
                    {t.start_date ? (
                      <Typography variant="body2">{formatDateEn(t.start_date)}</Typography>
                    ) : ('-')}
                  </TableCell>
                  <TableCell>
                    {t.end_date ? (
                      <Typography variant="body2">{formatDateEn(t.end_date)}</Typography>
                    ) : ('-')}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={statusLabelThai(t.status)}
                      size="medium"
                      sx={{
                        bgcolor: getStatusColor(t.status),
                        color: '#fff',
                        width: '100%',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 1,
                        '& .MuiChip-label': { width: '100%', textAlign: 'center', fontSize: 15 },
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openMenu(e.currentTarget as HTMLElement, t); }} aria-label="จัดการ">
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Divider separating table from controls; summary moved to drawer */}

      {/* Summary Dialog (replaces previous Drawer) */}
      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>สรุปงาน</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ width: '100%', p: 0 }}>
            <Stack spacing={1} sx={{ mb: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">รวม <strong>{summary.total}</strong> งาน</Typography>
                <Typography variant="body2">ชั่วโมงที่วางแผน: <strong>{summary.plannedHours}</strong></Typography>
                <Typography variant="body2">ไฟล์: <strong>{summary.attachments}</strong></Typography>
                <Typography variant="body2">คอมเมนต์: <strong>{summary.comments}</strong></Typography>
              </Stack>
            </Stack>

            {/* Embedded chart summary (reuses ChartsView component) */}
            <ChartsView
              tasks={filtered.map(t => ({ id: t.id, name: t.name, status: t.status }))}
              title="แผนภูมิสรุปสถานะงาน"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>
      {/* Add-task dialog (copied/adapted from ProjectWbs TaskDialog) */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm" keepMounted disableEnforceFocus disableAutoFocus>
        <DialogTitle>{taskForm && taskForm.id ? 'แก้ไขงานย่อย' : 'เพิ่มงานย่อย'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="รหัสงานย่อย" size="small" value={taskForm.code} onChange={e => setTaskForm((s: any) => ({ ...s, code: e.target.value }))} required />
            <TextField label="ชื่องานย่อย" size="small" value={taskForm.name} onChange={e => setTaskForm((s: any) => ({ ...s, name: e.target.value }))} required />
            <TextField
              label="เฟส"
              size="small"
              select
              value={taskForm.phase_id}
              onChange={e => {
                const val = e.target.value;
                // find authoritative phase first
                const sel = phases && phases.length > 0 ? phases.find(p => String(p.id) === String(val)) : null;
                if (sel) {
                  setTaskForm((s: any) => ({ ...s, phase_id: val, start_date: sel.start_date ? dayjs(sel.start_date) : null, end_date: sel.end_date ? dayjs(sel.end_date) : null }));
                } else {
                  // fallback: keep phase id, clear dates
                  setTaskForm((s: any) => ({ ...s, phase_id: val }));
                }
              }}
              required
            >
              {derivedPhases.map(p => <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>)}
            </TextField>
            <TextField label="ชั่วโมงที่วางแผน" size="small" type="number" value={taskForm.planned_hours} onChange={e => setTaskForm((s: any) => ({ ...s, planned_hours: e.target.value }))} inputProps={{ style: { textAlign: 'right' } }} required />
            <TextField select size="small" label="ความสำคัญ (Priority)" value={taskForm.priority || 'medium'} onChange={e => setTaskForm((s: any) => ({ ...s, priority: e.target.value }))}>
              <MenuItem value="critical">สูงมาก (Critical)</MenuItem>
              <MenuItem value="high">สูง (High)</MenuItem>
              <MenuItem value="medium">กลาง (Medium)</MenuItem>
              <MenuItem value="low">ต่ำ (Low)</MenuItem>
            </TextField>
            <TextField select size="small" label="โหมดบิล" value={taskForm.billable_mode || 'billable'} onChange={e => setTaskForm((s: any) => ({ ...s, billable_mode: e.target.value }))}>
              <MenuItem value="billable">คิดเงิน</MenuItem>
              <MenuItem value="non_billable">ไม่คิดเงิน</MenuItem>
              <MenuItem value="manual">กำหนดเอง</MenuItem>
            </TextField>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                <DatePicker
                  label="วันที่เริ่ม"
                  value={taskForm.start_date || null}
                  format="DD/MM/YYYY"
                  onChange={v => { setTaskForm((s: any) => ({ ...s, start_date: v })); setTaskDateError(''); }}
                  slotProps={{ textField: { size: 'small', error: Boolean(taskDateError), helperText: taskDateError } }}
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={taskForm.end_date || null}
                  format="DD/MM/YYYY"
                  onChange={v => { setTaskForm((s: any) => ({ ...s, end_date: v })); setTaskDateError(''); }}
                  slotProps={{ textField: { size: 'small', error: Boolean(taskDateError), helperText: taskDateError } }}
                  sx={{ flex: 1, minWidth: 160 }}
                />
              </LocalizationProvider>
            </Box>
            <Typography variant="body2" sx={{ textAlign: 'center' }}>ผู้รับผิดชอบ</Typography>
            <List sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {(employeesForDialog || []).map(emp => {
                const checked = Array.isArray(taskForm.owner) ? taskForm.owner.findIndex((o: any) => String(o) === String(emp.id)) > -1 : false;
                const hasSelection = Array.isArray(taskForm.owner) && taskForm.owner.length > 0;
                const disabled = !checked && hasSelection;
                return (
                  <ListItem key={emp.id} disablePadding>
                    <ListItemButton onClick={() => {
                      if (checked) {
                        setTaskForm((s: any) => ({ ...s, owner: [] }));
                      } else {
                        setTaskForm((s: any) => ({ ...s, owner: [emp.id] }));
                      }
                    }}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple disabled={disabled} sx={{ '&.Mui-checked': { color: 'error.main' } }} />
                      </ListItemIcon>
                      <ListItemText primary={emp.label} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={async () => {
            // save
            try {
              setAdding(true);
              // basic validation
              if (!String(taskForm.code || '').trim() || !String(taskForm.name || '').trim() || !taskForm.phase_id || !String(taskForm.planned_hours || '').trim()) {
                setTaskSnackbarMessage('กรุณากรอกฟิลด์ที่จำเป็น');
                setTaskSnackbarOpen(true);
                setAdding(false);
                return;
              }
              // validate dates against selected phase bounds
              try {
                const phase = phases && phases.length ? phases.find(p => String(p.id) === String(taskForm.phase_id)) : null;
                const phaseStart = phase ? (phase.start_date || null) : null;
                const phaseEnd = phase ? (phase.end_date || null) : null;
                const tfStartObj = taskForm.start_date ? (taskForm.start_date && taskForm.start_date.format ? taskForm.start_date : dayjs(taskForm.start_date)) : null;
                const tfEndObj = taskForm.end_date ? (taskForm.end_date && taskForm.end_date.format ? taskForm.end_date : dayjs(taskForm.end_date)) : null;

                if (phaseStart && phaseEnd) {
                  const ps = dayjs(phaseStart);
                  const pe = dayjs(phaseEnd);
                  if (!tfStartObj || !tfEndObj) {
                    setTaskSnackbarMessage('กรุณาระบุวันที่เริ่มและวันที่สิ้นสุดของงานย่อย');
                    setTaskSnackbarOpen(true);
                    setTaskDateError('กรุณาระบุวันที่');
                    setAdding(false);
                    return;
                  }
                  if (tfStartObj.isBefore(ps, 'day')) {
                    setTaskSnackbarMessage('วันที่เริ่มงานย่อยต้องไม่ก่อนวันที่เริ่มของเฟส');
                    setTaskSnackbarOpen(true);
                    setTaskDateError('วันที่เริ่มต้องไม่ก่อนวันที่เริ่มของเฟส');
                    setAdding(false);
                    return;
                  }
                  if (tfEndObj.isAfter(pe, 'day')) {
                    setTaskSnackbarMessage('วันที่สิ้นสุดงานย่อยต้องไม่เกินวันที่สิ้นสุดของเฟส');
                    setTaskSnackbarOpen(true);
                    setTaskDateError('วันที่สิ้นสุดต้องไม่เกินวันที่สิ้นสุดของเฟส');
                    setAdding(false);
                    return;
                  }
                  if (tfStartObj.isAfter(tfEndObj, 'day')) {
                    setTaskSnackbarMessage('วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด');
                    setTaskSnackbarOpen(true);
                    setTaskDateError('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด');
                    setAdding(false);
                    return;
                  }
                } else {
                  // when phase bounds missing, still ensure start <= end if both provided
                  if (tfStartObj && tfEndObj && tfStartObj.isAfter(tfEndObj, 'day')) {
                    setTaskSnackbarMessage('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด');
                    setTaskSnackbarOpen(true);
                    setTaskDateError('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด');
                    setAdding(false);
                    return;
                  }
                }
              } catch (e) {
                console.error('date validation error', e);
              }
              // Build payload: store status & priority inside `metadata` JSONB (schema uses metadata.jsonb)
              const payload: any = {
                project_id: projectId,
                code: taskForm.code,
                name: taskForm.name,
                phase_id: taskForm.phase_id,
                planned_hours: Number(taskForm.planned_hours) || 0,
                owner: Array.isArray(taskForm.owner) && taskForm.owner.length > 0 ? taskForm.owner : null,
                metadata: { status: (taskForm.status || 'todo'), priority: taskForm.priority || 'medium' },
                billable_mode: taskForm.billable_mode || 'billable',
              };
              if (taskForm.start_date) payload.start_date = (taskForm.start_date && taskForm.start_date.format) ? taskForm.start_date.format('YYYY-MM-DD') : taskForm.start_date;
              if (taskForm.end_date) payload.end_date = (taskForm.end_date && taskForm.end_date.format) ? taskForm.end_date.format('YYYY-MM-DD') : taskForm.end_date;

              // If editing an existing task, run UPDATE; otherwise INSERT.
              let resultRow: any = null;
              try {
                if (taskForm && taskForm.id) {
                  // Update existing task
                  const r = await supabase.from('tpr_project_wbs_tasks').update(payload).eq('id', taskForm.id).select('id').single();
                  if (r.error) {
                    const raw = String(r.error.message || r.error || '').toLowerCase();
                    const isDuplicateKey = raw.includes('duplicate key') || raw.includes('idx_wbs_tasks_project_phase_code') || raw.includes('unique');
                    if (isDuplicateKey) {
                      setTaskSnackbarMessage('รหัสงานนี้มีอยู่แล้วในเฟสเดียวกัน - โปรดระบุรหัสงานใหม่');
                    } else {
                      setTaskSnackbarMessage(r.error.message || 'อัปเดตไม่สำเร็จ');
                    }
                    setTaskSnackbarOpen(true);
                    setAdding(false);
                    return;
                  }
                  resultRow = r.data;
                } else {
                  // Insert new task
                  const r = await supabase.from('tpr_project_wbs_tasks').insert(payload).select('id').single();
                  if (r.error) {
                    const raw = String(r.error.message || r.error || '').toLowerCase();
                    const isDuplicateKey = raw.includes('duplicate key') || raw.includes('idx_wbs_tasks_project_phase_code') || raw.includes('unique');
                    if (isDuplicateKey) {
                      setTaskSnackbarMessage('รหัสงานนี้มีอยู่แล้วในเฟสเดียวกัน - โปรดระบุรหัสงานใหม่');
                    } else {
                      setTaskSnackbarMessage(r.error.message || 'บันทึกไม่สำเร็จ');
                    }
                    setTaskSnackbarOpen(true);
                    setAdding(false);
                    return;
                  }
                  resultRow = r.data;
                }
              } catch (ie: any) {
                const raw = String(ie?.message || ie || '').toLowerCase();
                if (raw.includes('duplicate key') || raw.includes('idx_wbs_tasks_project_phase_code') || raw.includes('unique')) {
                  setTaskSnackbarMessage('รหัสงานนี้มีอยู่แล้วในเฟสเดียวกัน - โปรดระบุรหัสงานใหม่');
                } else {
                  setTaskSnackbarMessage(ie?.message || 'บันทึกไม่สำเร็จ');
                }
                setTaskSnackbarOpen(true);
                setAdding(false);
                return;
              }
              // reload tasks
              try {
                setLoading(true);
                const rows = await fetchProjectTasksWithOwners(projectId);
                setTasks(rows);
              } catch (e) {
                console.error('refresh after add task', e);
              } finally {
                setLoading(false);
              }
              setAddDialogOpen(false);
              setAdding(false);
            } catch (e: any) {
              setTaskSnackbarMessage(e?.message || 'เกิดข้อผิดพลาด');
              setTaskSnackbarOpen(true);
              setAdding(false);
            }
          }} disabled={adding} sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}>บันทึก</Button>
        </DialogActions>
        <Snackbar open={taskSnackbarOpen} autoHideDuration={6000} onClose={() => setTaskSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setTaskSnackbarOpen(false)} severity="error" variant="filled" sx={{ width: '100%', bgcolor: 'error.main', color: 'common.white' }}>{taskSnackbarMessage}</Alert>
        </Snackbar>
      </Dialog>

      {attachmentsDialogOpen && selectedTaskId !== null && (
        <TaskAttachmentsDialog
          open={attachmentsDialogOpen}
          taskId={selectedTaskId}
          projectId={projectId}
          onClose={() => { setAttachmentsDialogOpen(false); setSelectedTaskId(null); }}
          onUpdated={async () => {
            try {
              setLoading(true);
              const rows = await fetchProjectTasksWithOwners(projectId);
              setTasks(rows);
            } catch (e) {
              console.error('refresh after attachments update', e);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {commentsDialogOpen && selectedTaskId !== null && (
        <TaskCommentsDialog
          open={commentsDialogOpen}
          taskId={selectedTaskId}
          onClose={() => { setCommentsDialogOpen(false); setSelectedTaskId(null); }}
          onUpdated={async () => {
            try {
              setLoading(true);
              const rows = await fetchProjectTasksWithOwners(projectId);
              setTasks(rows);
            } catch (e) {
              console.error('refresh after comments update', e);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {/* per-row menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => menuTask && handleMenuEdit(menuTask)}>แก้ไข</MenuItem>
        <MenuItem onClick={() => menuTask && handleMenuDelete(menuTask)}>ลบ</MenuItem>
      </Menu>

      {/* delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ลบงาน</DialogTitle>
        <DialogContent dividers>
          <Typography>คุณไม่สามารถลบงานที่มีการลงบันทึกเวลาได้</Typography>
          
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setDeleteDialogOpen(false)}>ปิด</Button>
          {/* <Button variant="contained" color="error" onClick={confirmDelete}>ยืนยัน</Button> */}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
