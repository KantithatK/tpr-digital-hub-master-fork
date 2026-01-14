import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import PeopleIcon from '@mui/icons-material/People';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import CancelIcon from '@mui/icons-material/Cancel';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
// persistent right sidebar instead of Drawer
import { supabase } from '../../../lib/supabaseClient';
import { usePresence } from '../../../lib/PresenceProvider';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// Workload helpers (module scope so hooks deps are simpler)
function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function workloadColor(pct) {
  if (pct <= 25) return '#2e7d32';
  if (pct <= 70) return '#f9a825';
  if (pct <= 100) return '#fb8c00';
  return '#c62828';
}

export default function TaskTracking() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  // removed teams state since left panel no longer lists teams
  const [membersByTeam, setMembersByTeam] = React.useState({});
  const [myEmployeeId, setMyEmployeeId] = React.useState(null);
  const [activeEmailsToday, setActiveEmailsToday] = React.useState(new Set());
  const [_tasksByOwner, setTasksByOwner] = React.useState({});
  const [tab, setTab] = React.useState(0);
  // Team Tasks tab states
  const [_leadTeamIds, setLeadTeamIds] = React.useState([]);
  const [teamTasks, setTeamTasks] = React.useState([]);
  const [teamTasksLoading, setTeamTasksLoading] = React.useState(false);
  const [teamTasksError, setTeamTasksError] = React.useState('');
  const [teamTasksFilter, setTeamTasksFilter] = React.useState('all'); // 'all' | 'in_progress' | 'review' | 'overdue' | 'today' | 'this_week' | 'blocked'
  const [teamSearch, setTeamSearch] = React.useState('');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  // Team Workload (mounted into tab 3)
  const [workloadLoading, setWorkloadLoading] = React.useState(false);
  const [workloadError, setWorkloadError] = React.useState('');
  const [workloadData, setWorkloadData] = React.useState([]);
  const weeklyCapacityHours = 40;
  const { onlineUsersByTeam } = usePresence() || {};
  React.useEffect(() => {
    try {
      console.debug('[Presence Debug] onlineUsersByTeam', onlineUsersByTeam);
      if (onlineUsersByTeam && typeof onlineUsersByTeam === 'object') {
        Object.entries(onlineUsersByTeam).forEach(([tid, arr]) => {
          console.debug('[Presence Debug] team', tid, 'onlineList:', arr);
        });
      }
    } catch  {
      // ignore
    }
  }, [onlineUsersByTeam]);
  // persistent sidebar is always visible



  const countsByFilter = React.useMemo(() => {
    const list = teamTasks || [];
    return {
      all: list.length,
      in_progress: list.filter(t => t.status === 'in_progress').length,
      review: list.filter(t => t.status === 'review').length,
      overdue: list.filter(t => t.status === 'overdue').length,
      today: list.filter(t => t.isToday).length,
      this_week: list.filter(t => t.isThisWeek).length,
    };
  }, [teamTasks]);


  const palette = React.useMemo(() => ['#FF8A80', '#EA80FC', '#8C9EFF', '#80D8FF', '#A7FFEB', '#CCFF90', '#FFFF8D', '#FFD180', '#FF9E80', '#CFD8DC'], []);
  const pickColor = React.useCallback((key) => {
    const s = String(key || 'x');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }, [palette]);

  const getDisplayName = React.useCallback((m) => {
    if (m.first_name_th || m.last_name_th) {
      return `${m.first_name_th || ''} ${m.last_name_th || ''}`.trim();
    }
    if (m.first_name_en || m.last_name_en) {
      return `${m.first_name_en || ''} ${m.last_name_en || ''}`.trim();
    }
    return m.nickname_th || m.nickname_en || m.id;
  }, []);

  // Helpers for owner extraction, date formatting, and Thai labels
  const extractOwnerId = React.useCallback((owner) => {
    if (!owner) return null;
    // Owner is stored as text; may be a UUID string or JSON array string like ["uuid"]
    if (typeof owner === 'string') {
      const s = owner.trim();
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr) && arr[0]) return String(arr[0]);
      } catch { /* not JSON */ }
      const m = s.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (m) return m[0];
      if (s.length >= 36 && s.includes('-')) return s;
      return null;
    }
    if (Array.isArray(owner) && owner[0]) return String(owner[0]);
    return null;
  }, []);

  const formatDateDMY = React.useCallback((ymd) => {
    if (!ymd) return '-';
    const s = String(ymd);
    const base = s.includes('T') ? s.slice(0, 10) : s;
    const parts = base.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}-${m}-${y}`;
    }
    // Fallback
    try {
      const d = new Date(s);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      if (!isNaN(d.getTime())) return `${dd}-${mm}-${yy}`;
    } catch { /* ignore invalid date */ }
    return '-';
  }, []);

  // Compute usage percent and health from planned vs spent
  const computeUsage = React.useCallback((planned, spent) => {
    const p = Number(planned) || 0;
    const s = Number(spent) || 0;
    const percent = p > 0 ? (s / p) * 100 : 0;
    let health = 'ปกติ';
    if (percent <= 90) health = 'ปกติ';
    else if (percent <= 100) health = 'เสี่ยง';
    else health = 'เกินแผน';
    return { percent, health };
  }, []);

  // Project Phase Status tab component + data fetching (kept inside this file as requested)
  function ProjectPhaseStatusTab({ teamId, currentDate = new Date(), showOnlyActiveProp = false }) {
    const [loadingPh, setLoadingPh] = React.useState(false);
    const [errorPh, setErrorPh] = React.useState('');
    const [groups, setGroups] = React.useState([]);
    const [showOnlyActive, setShowOnlyActive] = React.useState(Boolean(showOnlyActiveProp));

    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          setLoadingPh(true);
          setErrorPh('');
          setGroups([]);

          if (!teamId) {
            if (mounted) setLoadingPh(false);
            return;
          }



          // 1) fetch workstreams for this team
          const { data: workstreams, error: wsErr } = await supabase
            .from('tpr_workstreams')
            .select('id, project_id, code, name')
            .eq('team_id', teamId);
          if (wsErr) throw wsErr;
          const wsList = workstreams || [];
          const wsIds = wsList.map(w => w.id).filter(Boolean);
          const projectIds = Array.from(new Set(wsList.map(w => w.project_id).filter(Boolean)));

          if (wsIds.length === 0) {
            if (mounted) setGroups([]);
            return;
          }

          // 2) fetch phases for these workstreams
          const { data: phases, error: phErr } = await supabase
            .from('tpr_project_wbs_phases')
            .select('id, project_id, workstream_id, code, name, planned_hours, owner, start_date, end_date, status')
            .in('workstream_id', wsIds);
          if (phErr) throw phErr;
          const phaseList = phases || [];

          // Resolve phase owner texts -> employee names when owner contains an employee UUID
          const ownerIdsForPhases = Array.from(new Set(phaseList.map(p => extractOwnerId(p.owner)).filter(Boolean)));
          const phaseOwnerMap = new Map();
          if (ownerIdsForPhases.length > 0) {
            try {
              const { data: ownerEmps, error: ownerErr } = await supabase
                .from('employees')
                .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en')
                .in('id', ownerIdsForPhases);
              if (!ownerErr && ownerEmps) ownerEmps.forEach(o => phaseOwnerMap.set(o.id, getDisplayName(o)));
            } catch { /* ignore */ }
          }

          // 3) fetch project info for names / archived
          const projectsMap = new Map();
          if (projectIds.length > 0) {
            const { data: projects, error: pErr } = await supabase
              .from('tpr_projects')
              .select('id, project_code, name_th, name_en, archived')
              .in('id', projectIds);
            if (pErr) throw pErr;
            (projects || []).forEach(p => projectsMap.set(p.id, p));
          }

          // optionally filter phases by active projects
          const filteredPhases = showOnlyActive
            ? phaseList.filter(ph => { const pr = projectsMap.get(ph.project_id); return pr && !pr.archived; })
            : phaseList.slice();

          if (filteredPhases.length === 0) {
            if (mounted) setGroups([]);
            return;
          }

          // 4) fetch tasks for phases to compute progress
          const phaseIds = filteredPhases.map(ph => ph.id).filter(Boolean);
          const tasksMap = new Map();
          if (phaseIds.length > 0) {
            const { data: tasks, error: tErr } = await supabase
              .from('tpr_project_wbs_tasks')
              .select('id, phase_id, metadata')
              .in('phase_id', phaseIds);
            if (tErr) throw tErr;
            for (const t of tasks || []) {
              const pid = t.phase_id;
              if (!tasksMap.has(pid)) tasksMap.set(pid, []);
              tasksMap.get(pid).push(t);
            }
          }

          // compute spent hours per phase by aggregating time entries for tasks in these phases
          const taskIdToPhase = new Map();
          for (const [pid, tlist] of tasksMap.entries()) {
            for (const t of (tlist || [])) {
              if (t && t.id) taskIdToPhase.set(t.id, pid);
            }
          }
          const phaseSpent = new Map();
          const taskIds = Array.from(taskIdToPhase.keys());
          if (taskIds.length > 0) {
            try {
              const { data: entries, error: entErr } = await supabase
                .from('tpr_time_entries')
                .select('task_id, hours')
                .in('task_id', taskIds);
              if (!entErr && entries) {
                for (const e of entries || []) {
                  const pid = taskIdToPhase.get(e.task_id);
                  if (!pid) continue;
                  const h = Number(e.hours) || 0;
                  phaseSpent.set(pid, (phaseSpent.get(pid) || 0) + h);
                }
              }
            } catch {
              // ignore time entry aggregation errors
            }
          }

          // 5) group by project and build PhaseStatusItem entries
          const groupsMap = new Map();
          const now = currentDate instanceof Date ? currentDate : new Date(currentDate);

          for (const ph of filteredPhases) {
            const pr = projectsMap.get(ph.project_id) || null;
            const ws = wsList.find(w => w.id === ph.workstream_id) || null;
            const tasksForPhase = tasksMap.get(ph.id) || [];
            const totalTasks = tasksForPhase.length;
            const doneTasks = tasksForPhase.filter(tt => ((tt.metadata && tt.metadata.status) || '').toString().toLowerCase() === 'done').length;
            const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            // determine overdue / risk
            const endDate = ph.end_date ? new Date(ph.end_date) : null;
            const statusLower = (ph.status || '').toString().toLowerCase();
            const isOverdue = !!(endDate && now > endDate && statusLower !== 'done');
            const daysToEnd = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isRisk = !isOverdue && daysToEnd !== null && daysToEnd <= 7 && daysToEnd >= 0 && statusLower !== 'done' && progressPercent < 50;

            const resolvedOwner = (() => {
              const oid = extractOwnerId(ph.owner);
              if (oid) return phaseOwnerMap.get(oid) || ph.owner;
              return ph.owner;
            })();

            const phaseItem = {
              phaseId: ph.id,
              phaseCode: ph.code || '',
              phaseName: ph.name || '',
              phaseStatus: ph.status || null,
              phaseOwner: resolvedOwner || null,
              _ownerRaw: ph.owner || null,
              plannedHours: ph.planned_hours || 0,
              spentHours: phaseSpent.get(ph.id) || 0,
              usagePercent: computeUsage(ph.planned_hours || 0, phaseSpent.get(ph.id) || 0).percent,
              health: computeUsage(ph.planned_hours || 0, phaseSpent.get(ph.id) || 0).health,
              startDate: ph.start_date || null,
              endDate: ph.end_date || null,
              workstreamId: ws ? ws.id : null,
              workstreamCode: ws ? ws.code : null,
              workstreamName: ws ? ws.name : null,
              progressPercent,
              isOverdue,
              isRisk,
              totalTasks,
              doneTasks,
            };

            const key = pr ? pr.id : `proj-${ph.project_id}`;
            if (!groupsMap.has(key)) {
              groupsMap.set(key, {
                projectId: pr ? pr.id : ph.project_id,
                projectCode: pr ? pr.project_code : '',
                projectName: pr ? (pr.name_th || pr.name_en || '') : '',
                workstreamId: ws ? ws.id : null,
                workstreamCode: ws ? ws.code : null,
                workstreamName: ws ? ws.name : null,
                phases: [],
              });
            }
            groupsMap.get(key).phases.push(phaseItem);
          }

          const out = Array.from(groupsMap.values()).map(g => {
            // sort phases by start date then code
            g.phases.sort((a, b) => {
              if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
              if (a.startDate) return -1;
              if (b.startDate) return 1;
              return (a.phaseCode || '').localeCompare(b.phaseCode || '');
            });
            return g;
          });

          if (mounted) setGroups(out);
          // Final pass: resolve any remaining owner raw UUIDs that were not matched earlier
          try {
            const unresolved = new Set();
            for (const g of out) {
              for (const ph of g.phases) {
                const raw = ph._ownerRaw;
                if (!raw) continue;
                const oid = extractOwnerId(raw);
                if (oid && (!ph.phaseOwner || ph.phaseOwner === raw || ph.phaseOwner === oid)) unresolved.add(oid);
              }
            }
            if (unresolved.size > 0) {
              const { data: moreEmps, error: moreErr } = await supabase
                .from('employees')
                .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en')
                .in('id', Array.from(unresolved));
              if (!moreErr && moreEmps) {
                const map = new Map(); moreEmps.forEach(e => map.set(e.id, getDisplayName(e)));
                for (const g of out) {
                  for (const ph of g.phases) {
                    const raw = ph._ownerRaw;
                    const oid = extractOwnerId(raw);
                    if (oid && map.has(oid)) ph.phaseOwner = map.get(oid);
                  }
                }
                if (mounted) setGroups(out);
              }
            }
          } catch {
            // ignore resolution errors
          }
        } catch (err) {
          if (mounted) setErrorPh(err?.message || 'เกิดข้อผิดพลาดระหว่างดึงสถานะเฟส');
        } finally {
          if (mounted) setLoadingPh(false);
        }
      })();
      return () => { mounted = false; };
    }, [teamId, showOnlyActive, currentDate]);

    // UI rendering for the ProjectPhaseStatusTab
    return (
      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">สถานะเฟสโครงการ</Typography>
          <Box>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={showOnlyActive} onChange={(e) => setShowOnlyActive(e.target.checked)} />
              <Typography variant="body2">โครงการที่ยังดำเนินการอยู่เท่านั้น</Typography>
            </label>
          </Box>
        </Box>

        {loadingPh && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">กำลังโหลดข้อมูลสถานะเฟสโครงการ…</Typography>
          </Box>
        )}

        {!loadingPh && errorPh && (
          <Alert severity="error" sx={{ mt: 1 }}>{errorPh}</Alert>
        )}

        {!loadingPh && !errorPh && groups.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 1 }}>ยังไม่มีข้อมูลสถานะเฟสโครงการ</Typography>
        )}

        {!loadingPh && !errorPh && groups.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {groups.map((g) => {
              const projKey = `proj-${g.projectId || g.projectCode || Math.random()}`;
              const wsMap = new Map();
              (g.phases || []).forEach(ph => {
                const wk = ph.workstreamName || 'ไม่มี WBS';
                if (!wsMap.has(wk)) wsMap.set(wk, []);
                wsMap.get(wk).push({ ...ph, projectCode: g.projectCode, projectName: g.projectName });
              });
              return (
                <React.Fragment key={projKey}>
                    {Array.from(wsMap.entries()).map(([wsName, phases]) => (
                    <TableContainer component={Paper} key={`${projKey}-${wsName}`} sx={{ mb: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                      <Table size="small" sx={{ '& td, & th': { borderBottom: 'none' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell colSpan={8} sx={{ bgcolor: '#f5f5f5' }}>
                              <Box fontWeight={800}>{g.projectCode ? `${g.projectCode} · ${g.projectName || ''} (${wsName})` : `${g.projectName || 'โปรเจค'} (${wsName})`}</Box>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>เฟส</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>วันที่เริ่มต้น</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>วันที่สิ้นสุด</TableCell>
                             <TableCell align="center" sx={{ fontWeight: 700 }}>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                ความคืบหน้า
                                <Tooltip title="เปอร์เซ็นต์ความคืบหน้า และ จำนวนงานเสร็จ/ทั้งหมด" arrow>
                                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>ชั่วโมงที่วางแผน</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>ชั่วโมงที่ใช้แล้ว</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>% ใช้ชั่วโมง</TableCell>
                           
                            <TableCell align="center" sx={{ fontWeight: 700 }}>สถานะชั่วโมง</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {phases.map(ph => (
                            <TableRow key={`phase-${ph.phaseId}`} sx={ph.health === 'เกินแผน' ? { backgroundColor: '#fff0f0' } : {}}>
                              <TableCell>
                                <Box fontWeight={700}>{ph.phaseCode}{ph.phaseName ? ` · ${ph.phaseName}` : ''}</Box>
                                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{ph.projectCode || ''}</Box>
                              </TableCell>
                              
                              <TableCell>{formatDateDMY(ph.startDate)}</TableCell>
                              <TableCell>{formatDateDMY(ph.endDate)}</TableCell>
                              <TableCell align="center" sx={{ width: 160 }}>
                                <Box sx={{ width: 140 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(Math.max(Number(ph.progressPercent) || 0, 0), 100)}
                                    sx={{ height: 8, borderRadius: 2, bgcolor: '#f5f5f5', '& .MuiLinearProgress-bar': { background: '#43a047' } }}
                                  />
                                  <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <Box sx={{ fontWeight: 700 }}>{(Number(ph.progressPercent) || 0).toFixed(0)}%</Box>
                                    <Box sx={{ color: 'text.secondary' }}>{`${ph.doneTasks || 0}/${ph.totalTasks || 0}`}</Box>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="center">{ph.plannedHours || 0}</TableCell>
                              <TableCell align="center">{(Number(ph.spentHours) || 0).toFixed(1)}</TableCell>
                              <TableCell align="center"> 
                                <Typography sx={ph.health === 'เกินแผน' ? { color: '#d32f2f', fontWeight: 700, textAlign: 'center' } : { textAlign: 'center' }}>{(Number(ph.usagePercent) || 0).toFixed(1)}%</Typography>
                              </TableCell>
                              
                              <TableCell align="center">
                                <Chip
                                  size="small"
                                  label={ph.health}
                                  sx={{
                                    width: '100%',
                                    '& .MuiChip-label': { width: '100%', textAlign: 'center' },
                                    bgcolor: ph.health === 'ปกติ' ? '#43a047' : ph.health === 'เสี่ยง' ? '#ff9800' : '#d32f2f',
                                    color: '#fff'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ))}
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

    // --- Timesheet approval service (inlined) ---
    async function fetchWeeklyEntries(userId, weekStart, statusFilter = null) {
      if (!userId || !weekStart) return { entries: [], maps: {} };
      const toYMD = (d) => {
        if (!d) return null;
        // accept dayjs objects or Date/string
        if (d && typeof d.format === 'function') return d.format('YYYY-MM-DD');
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().slice(0, 10);
      };
      const start = toYMD(weekStart);
      const end = toYMD(new Date(new Date(weekStart).getTime() + 6 * 86400000));
      try {
        console.log('[debug] fetchWeeklyEntries params', { userId, weekStart, start, end, statusFilter });
      } catch {
        // ignore logging errors
      }
      let q = supabase
        .from('tpr_time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('entry_date', { ascending: true });
      if (statusFilter && statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data: entries, error } = await q;
      if (error) {
        console.error('[debug] fetchWeeklyEntries supabase error', error);
        throw error;
      }
      try {
        console.log('[debug] fetchWeeklyEntries result', { count: (entries || []).length, sample: (entries || []).slice(0, 5) });
      } catch {
        // ignore
      }
      const list = entries || [];
      const projectIds = Array.from(new Set(list.map(e => e.project_id).filter(Boolean)));
      const phaseIds = Array.from(new Set(list.map(e => e.phase_id).filter(Boolean)));
      const taskIds = Array.from(new Set(list.map(e => e.task_id).filter(Boolean)));
      const maps = { projects: new Map(), phases: new Map(), tasks: new Map() };
      try {
        if (projectIds.length > 0) {
          const { data: projects } = await supabase.from('tpr_projects').select('id, project_code, name_th, name_en').in('id', projectIds);
          (projects || []).forEach(p => maps.projects.set(p.id, p));
        }
        if (phaseIds.length > 0) {
          const { data: phases } = await supabase.from('tpr_project_wbs_phases').select('id, code, name').in('id', phaseIds);
          (phases || []).forEach(p => maps.phases.set(p.id, p));
        }
        if (taskIds.length > 0) {
          const { data: tasks } = await supabase.from('tpr_project_wbs_tasks').select('id, code, name').in('id', taskIds);
          (tasks || []).forEach(t => maps.tasks.set(t.id, t));
        }
      } catch {
        // ignore map resolution errors
      }
      return { entries: list, maps };
    }

    async function approveWeekly(userId, weekStart, approverId) {
      if (!userId || !weekStart || !approverId) throw new Error('Missing parameters');
      const toYMD = (d) => {
        if (!d) return null;
        if (d && typeof d.format === 'function') return d.format('YYYY-MM-DD');
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().slice(0, 10);
      };
      const start = toYMD(weekStart);
      const end = toYMD(new Date(new Date(weekStart).getTime() + 6 * 86400000));
      const payload = {
        status: 'Approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('tpr_time_entries')
        .update(payload)
        .eq('user_id', userId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .eq('status', 'Submitted')
        .select('id');
      if (error) throw error;
      return data || [];
    }

    async function rejectWeekly(userId, weekStart, approverId, reason) {
      if (!userId || !weekStart || !approverId || !reason) throw new Error('Missing parameters');
      const toYMD = (d) => {
        if (!d) return null;
        if (d && typeof d.format === 'function') return d.format('YYYY-MM-DD');
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().slice(0, 10);
      };
      const start = toYMD(weekStart);
      const end = toYMD(new Date(new Date(weekStart).getTime() + 6 * 86400000));
      const payload = {
        status: 'Rejected',
        rejected_by: approverId,
        rejected_at: new Date().toISOString(),
        rejected_reason: reason,
      };
      const { data, error } = await supabase
        .from('tpr_time_entries')
        .update(payload)
        .eq('user_id', userId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .eq('status', 'Submitted')
        .select('id');
      if (error) throw error;
      return data || [];
    }

    // --- TeamTimesheetApprovalTab component (inlined) ---
    function TeamTimesheetApprovalTab() {
      const [weekStartLocal, setWeekStartLocal] = React.useState(() => dayjs().locale('th').startOf('week').add(1, 'day'));
      const [statusFilterLocal, _setStatusFilterLocal] = React.useState('all');
      const [membersLocal, setMembersLocal] = React.useState([]);
      const [searchTerm, setSearchTerm] = React.useState('');
      const [selectedUserId, _setSelectedUserId] = React.useState(null);
      const [loadingMembers, setLoadingMembersLocal] = React.useState(false);
      const [loadingEntries, setLoadingEntriesLocal] = React.useState(false);
      const [entriesLocal, setEntriesLocal] = React.useState([]);
      const [mapsLocal, setMapsLocal] = React.useState({});
      const [entriesByUser, setEntriesByUser] = React.useState({}); // { userId: { entries, maps } }
      const [rejectTargetUser, setRejectTargetUser] = React.useState(null);
      const [errorLocal, setErrorLocal] = React.useState('');
      const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
      const [rejectReason, setRejectReason] = React.useState('');
      const [snack, setSnack] = React.useState(null);

      // Map timesheet statuses to Thai labels
      const toThaiTimesheetStatus = React.useCallback((s) => {
        const map = {
          draft: 'ร่าง',
          submitted: 'รออนุมัติ',
          approved: 'อนุมัติแล้ว',
          rejected: 'ตีกลับ',
        };
        if (!s && s !== 0) return '-';
        try {
          const key = String(s).trim().toLowerCase();
          return map[key] || String(s);
        } catch {
          return String(s);
        }
      }, []);

      // Sorted members for display (Thai alphabetical order ก-ฮ)
      const sortedMembers = React.useMemo(() => {
        try {
          const arr = (membersLocal || []).slice();
          arr.sort((a, b) => {
            const na = String(a.name || '').trim() || String(getDisplayName(a) || '').trim();
            const nb = String(b.name || '').trim() || String(getDisplayName(b) || '').trim();
            return na.localeCompare(nb, 'th');
          });
          return arr;
        } catch {
          return membersLocal || [];
        }
      }, [membersLocal]);

      React.useEffect(() => {
        let mounted = true;
        (async () => {
          try {
            setLoadingMembersLocal(true);
            setErrorLocal('');
            const { data: { session } = {} } = await supabase.auth.getSession();
            const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
            if (!email) throw new Error('ไม่พบผู้ใช้ที่เข้าสู่ระบบ');
            const { data: meRows, error: meErr } = await supabase
              .from('employees')
              .select('id')
              .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
              .limit(1);
            if (meErr) throw meErr;
            const me = (meRows || [])[0];
            if (!me?.id) throw new Error('ไม่พบพนักงานของผู้ใช้');

            const { data: leadTeams } = await supabase.from('tpr_project_teams').select('id').eq('team_lead_id', me.id);
            const teamIds = (leadTeams || []).map(t => t.id).filter(Boolean);
            if (teamIds.length === 0) {
              if (mounted) setMembersLocal([]);
              return;
            }
            const { data: positions } = await supabase.from('tpr_project_team_positions').select('position_id').in('team_id', teamIds);
            const posIds = Array.from(new Set((positions || []).map(p => p.position_id).filter(Boolean)));
            if (posIds.length === 0) { if (mounted) setMembersLocal([]); return; }
            const { data: emps } = await supabase.from('employees').select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en').in('position_id', posIds);
            if (mounted) {
              const mapped = (emps || []).map(e => ({ id: e.id, name: (e.first_name_th || e.last_name_th) ? `${e.first_name_th || ''} ${e.last_name_th || ''}`.trim() : (e.first_name_en || e.last_name_en) ? `${e.first_name_en || ''} ${e.last_name_en || ''}`.trim() : e.nickname_th || e.nickname_en || e.id }));
              setMembersLocal(mapped);
            }
          } catch (e) {
            if (mounted) setErrorLocal(e?.message || 'ไม่สามารถดึงรายชื่อลูกทีมได้');
          } finally { if (mounted) setLoadingMembersLocal(false); }
        })();
        return () => { mounted = false; };
      }, []);

      const loadEntries = React.useCallback(async () => {
        try {
          setLoadingEntriesLocal(true);
          setErrorLocal('');
          // single selected user -> load single table
          if (selectedUserId) {
            const res = await fetchWeeklyEntries(selectedUserId, weekStartLocal, statusFilterLocal);
            try { console.log('[debug] loadEntries single user', { selectedUserId, count: (res.entries || []).length, sample: (res.entries || []).slice(0,5) }); } catch { console.warn('[debug] loadEntries single user logging failed'); }
            setEntriesLocal(res.entries || []);
            setMapsLocal(res.maps || {});
            setEntriesByUser({});
            return;
          }

          // no user selected -> load for all members (apply search filter)
          const qLower = String(searchTerm || '').trim().toLowerCase();
          const members = (sortedMembers || []).filter(m => {
            if (!qLower) return true;
            const name = String(m.name || '').toLowerCase();
            return name.includes(qLower);
          });
          if (!members.length) {
            setEntriesByUser({});
            setEntriesLocal([]);
            setMapsLocal({});
            return;
          }
          const promises = members.map(async (m) => {
            try {
              const res = await fetchWeeklyEntries(m.id, weekStartLocal, statusFilterLocal);
              try { console.log('[debug] loadEntries user', { userId: m.id, count: (res.entries || []).length }); } catch { /* ignore */ }
              return [m.id, res];
            } catch {
              return [m.id, { entries: [], maps: {} }];
            }
          });
          const results = await Promise.all(promises);
          const byUser = {};
          results.forEach(([uid, res]) => { byUser[uid] = res || { entries: [], maps: {} }; });
          try {
            const counts = {};
            results.forEach(([uid, res]) => { counts[uid] = (res && res.entries) ? (res.entries.length) : 0; });
            console.log('[debug] loadEntries byUser counts', counts);
          } catch { console.warn('[debug] loadEntries byUser counts logging failed'); }
          setEntriesByUser(byUser);
          setEntriesLocal([]);
          setMapsLocal({});
        } catch (e) {
          setErrorLocal(e?.message || 'ไม่สามารถโหลดบันทึกเวลาได้');
          setEntriesByUser({});
        } finally { setLoadingEntriesLocal(false); }
      }, [selectedUserId, weekStartLocal, statusFilterLocal, sortedMembers, searchTerm]);

      React.useEffect(() => { loadEntries(); }, [loadEntries]);

      const addDays = (d, n) => { try { return (d && typeof d.add === 'function') ? d.add(n, 'day') : dayjs(d).add(n, 'day'); } catch { return dayjs().add(n, 'day'); } };
      const fmtDMYLocal = (d) => {
        if (!d) return '-';
        if (d && typeof d.format === 'function') return d.format('DD-MM-YYYY');
        return formatDateDMY((d instanceof Date) ? d.toISOString() : d);
      };

      const buildGrid = React.useCallback((entriesArr) => {
        const rows = new Map();
        const start = (weekStartLocal && typeof weekStartLocal.toDate === 'function') ? weekStartLocal.toDate() : new Date(weekStartLocal);
        for (const e of entriesArr || []) {
          const key = `${e.project_id || 'null'}|${e.phase_id || 'null'}|${e.task_id || 'null'}`;
          if (!rows.has(key)) rows.set(key, { project_id: e.project_id, phase_id: e.phase_id, task_id: e.task_id, days: { }, total: 0, otTotal: 0, statusSet: new Set(), entries: [] });
          const r = rows.get(key);
          const d = new Date(e.entry_date);
          const dayIndex = Math.floor((d - start) / 86400000);
          const dayKey = ['mon','tue','wed','thu','fri','sat','sun'][Math.max(0, Math.min(6, dayIndex))];
          const hrs = Number(e.hours) || 0;
          r.days[dayKey] = (r.days[dayKey] || 0) + hrs;
          r.total = (r.total || 0) + hrs;
          if (e.is_ot) r.otTotal = (r.otTotal || 0) + hrs;
          r.statusSet.add(e.status || 'Draft');
          r.entries.push(e);
        }
        const out = Array.from(rows.values()).map(r => {
          let status = 'Draft';
          if (Array.from(r.statusSet).includes('Rejected')) status = 'Rejected';
          else if (Array.from(r.statusSet).includes('Draft')) status = 'Draft';
          else if (Array.from(r.statusSet).every(s => s === 'Approved')) status = 'Approved';
          else if (Array.from(r.statusSet).includes('Submitted')) status = 'Submitted';
          return { ...r, status };
        });
        return out;
      }, [weekStartLocal]);

      const grid = React.useMemo(() => buildGrid(entriesLocal), [entriesLocal, buildGrid]);
      const totalHours = React.useMemo(() => (entriesLocal || []).reduce((s, e) => s + (Number(e.hours) || 0), 0), [entriesLocal]);
      const totalOT = React.useMemo(() => (entriesLocal || []).filter(e => e.is_ot).reduce((s, e) => s + (Number(e.hours) || 0), 0), [entriesLocal]);
      const _hasSubmitted = React.useMemo(() => (entriesLocal || []).some(e => e.status === 'Submitted'), [entriesLocal]);

      

      async function handleApproveFor(userId) {
        if (!userId) return setSnack({ severity: 'warning', text: 'กรุณาเลือกพนักงาน' });
        try {
          setLoadingEntriesLocal(true);
          const { data: { session } = {} } = await supabase.auth.getSession();
          const approverId = session?.user?.id;
          if (!approverId) throw new Error('ไม่พบผู้ใช้งาน');
          await approveWeekly(userId, weekStartLocal, approverId);
          setSnack({ severity: 'success', text: 'อนุมัติสำเร็จ' });
          await loadEntries();
        } catch (e) {
          setSnack({ severity: 'error', text: e?.message || 'ไม่สามารถอนุมัติได้' });
        } finally { setLoadingEntriesLocal(false); }
      }

      async function handleReject() {
        const targetUser = rejectTargetUser || selectedUserId;
        if (!targetUser) return setSnack({ severity: 'warning', text: 'กรุณาเลือกพนักงาน' });
        const targetEntries = targetUser === selectedUserId ? entriesLocal : (entriesByUser[targetUser]?.entries || []);
        const hasSub = (targetEntries || []).some(e => e.status === 'Submitted');
        if (!hasSub) return setSnack({ severity: 'info', text: 'ไม่มีรายการที่รออนุมัติ' });
        if (!rejectReason) return setSnack({ severity: 'warning', text: 'โปรดระบุเหตุผลการตีกลับ' });
        try {
          setRejectDialogOpen(false);
          setLoadingEntriesLocal(true);
          const { data: { session } = {} } = await supabase.auth.getSession();
          const approverId = session?.user?.id;
          if (!approverId) throw new Error('ไม่พบผู้ใช้งาน');
          await rejectWeekly(targetUser, weekStartLocal, approverId, rejectReason);
          setSnack({ severity: 'success', text: 'ตีกลับเรียบร้อย' });
          setRejectReason('');
          setRejectTargetUser(null);
          await loadEntries();
        } catch (e) {
          setSnack({ severity: 'error', text: e?.message || 'ไม่สามารถตีกลับได้' });
        } finally { setLoadingEntriesLocal(false); }
      }

      return (
        <Paper sx={{ p: 1, boxShadow: 'none', border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">อนุมัติการลงเวลา</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton onClick={() => setWeekStartLocal(prev => addDays(prev, -7))} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
              <Box sx={{ px: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{`${fmtDMYLocal(weekStartLocal)} – ${fmtDMYLocal(addDays(weekStartLocal,6))}`}</Typography>
              </Box>
              <IconButton onClick={() => setWeekStartLocal(prev => addDays(prev, 7))} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
            <TextField
              size="small"
              label="ค้นหาพนักงาน"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
            <Box sx={{ flex: 1 }} />
          </Box>

          {loadingMembers && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /> <Typography>กำลังโหลดรายชื่อลูกทีม…</Typography></Box>}
          {errorLocal && <Alert severity="error" sx={{ my: 1 }}>{errorLocal}</Alert>}

          {loadingEntries ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /> <Typography>กำลังโหลดบันทึกเวลา…</Typography></Box>
          ) : (
            <Box>
              {/* If a specific user is selected, show single table (existing behavior) */}
              {selectedUserId ? (
                <Paper sx={{ mt: 1, p: 1, boxShadow: 'none', border: '1px solid #eee' }}>
                  <Table size="small" sx={{ borderCollapse: 'separate', '& td, & th': { borderBottom: 'none' } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>งาน</TableCell>
                        <TableCell>เฟส / โปรเจกต์</TableCell>
                        <TableCell align="center">จันทร์</TableCell>
                        <TableCell align="center">อังคาร</TableCell>
                        <TableCell align="center">พุธ</TableCell>
                        <TableCell align="center">พฤหัสบดี</TableCell>
                        <TableCell align="center">ศุกร์</TableCell>
                        <TableCell align="center">เสาร์</TableCell>
                        <TableCell align="center">อาทิตย์</TableCell>
                        <TableCell align="center">รวม</TableCell>
                        <TableCell align="center">OT</TableCell>
                        <TableCell align="center">สถานะ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grid.length === 0 ? (
                        <TableRow><TableCell colSpan={13} sx={{ textAlign: 'center' }}>ไม่มีรายการสำหรับสัปดาห์นี้</TableCell></TableRow>
                      ) : grid.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{(mapsLocal.tasks && mapsLocal.tasks.get(r.task_id)) ? `${mapsLocal.tasks.get(r.task_id).code || ''} ${mapsLocal.tasks.get(r.task_id).name || ''}` : (r.task_id ? `Task ${r.task_id}` : 'Unassigned')}</TableCell>
                          <TableCell>{(mapsLocal.phases && mapsLocal.phases.get(r.phase_id)) ? (mapsLocal.phases.get(r.phase_id).code || '') : ''} / {(mapsLocal.projects && mapsLocal.projects.get(r.project_id)) ? (mapsLocal.projects.get(r.project_id).project_code || '') : ''}</TableCell>                          
                          <TableCell align="center">{(r.days.mon || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.tue || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.wed || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.thu || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.fri || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.sat || 0) || '-'}</TableCell>
                          <TableCell align="center">{(r.days.sun || 0) || '-'}</TableCell>
                          <TableCell align="center">{r.total.toFixed(2)}</TableCell>
                          <TableCell align="center">{r.otTotal > 0 ? <Badge color="error" badgeContent="OT"/> : '-'}</TableCell>
                          <TableCell align="center">{toThaiTimesheetStatus(r.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Box sx={{ mt: 1 }}>
                    <Typography>รวมชั่วโมงสัปดาห์: <strong>{totalHours.toFixed(2)}</strong> ชม. (OT: <strong>{totalOT.toFixed(2)}</strong>)</Typography>
                    {totalHours > 40 && <Alert severity="warning" sx={{ mt: 1 }}>เตือน: รวมชั่วโมงมากกว่า 40 ชั่วโมง</Alert>}
                  </Box>
                </Paper>
              ) : (
                // No specific user selected: render a table card per member
                (sortedMembers && sortedMembers.length > 0) ? (
                  sortedMembers.map((m) => {
                    const userData = entriesByUser[m.id] || { entries: [], maps: {} };
                    const memberGrid = buildGrid(userData.entries || []);
                    const memberTotal = (userData.entries || []).reduce((s, e) => s + (Number(e.hours) || 0), 0);
                    const memberOT = (userData.entries || []).filter(e => e.is_ot).reduce((s, e) => s + (Number(e.hours) || 0), 0);
                    const memberHasSubmitted = (userData.entries || []).some(e => e.status === 'Submitted');
                    return (
                      <Paper key={`member-${m.id}`} sx={{ mt: 1, p: 1, boxShadow: 'none', border: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography fontWeight={700}>{m.name || m.id}</Typography>
                          <Box>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<DoneIcon />}
                                disabled={!memberHasSubmitted || loadingEntries}
                                onClick={() => handleApproveFor(m.id)}
                              >
                                อนุมัติ
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<CancelIcon />}
                                disabled={!memberHasSubmitted || loadingEntries}
                                onClick={() => { setRejectTargetUser(m.id); setRejectDialogOpen(true); }}
                                sx={{ ml: 1 }}
                              >
                                ตีกลับ
                              </Button>
                          </Box>
                        </Box>
                        {memberGrid.length === 0 ? (
                          <Typography color="text.secondary">ไม่มีรายการสำหรับสัปดาห์นี้</Typography>
                          ) : (
                          <Table size="small" sx={{ '& td, & th': { borderBottom: 'none' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>งาน</TableCell>
                                <TableCell>เฟส / โปรเจกต์</TableCell>
                                <TableCell align="center">จันทร์</TableCell>
                                <TableCell align="center">อังคาร</TableCell>
                                <TableCell align="center">พุธ</TableCell>
                                <TableCell align="center">พฤหัสบดี</TableCell>
                                <TableCell align="center">ศุกร์</TableCell>
                                <TableCell align="center">เสาร์</TableCell>
                                <TableCell align="center">อาทิตย์</TableCell>
                                <TableCell align="center">รวม</TableCell>
                                <TableCell align="center">OT</TableCell>
                                <TableCell align="center">สถานะ</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {memberGrid.map((r, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{(userData.maps.tasks && userData.maps.tasks.get(r.task_id)) ? `${userData.maps.tasks.get(r.task_id).code || ''} ${userData.maps.tasks.get(r.task_id).name || ''}` : (r.task_id ? `Task ${r.task_id}` : 'Unassigned')}</TableCell>
                                  <TableCell>{(userData.maps.projects && userData.maps.projects.get(r.project_id)) ?   `${(userData.maps.phases && userData.maps.phases.get(r.phase_id)) ? (userData.maps.phases.get(r.phase_id).code || '') : ''} / ${(userData.maps.projects.get(r.project_id).project_code || '')}` : ''}</TableCell>
                                  <TableCell align="center">{(r.days.mon || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.tue || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.wed || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.thu || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.fri || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.sat || 0) || '-'}</TableCell>
                                  <TableCell align="center">{(r.days.sun || 0) || '-'}</TableCell>
                                  <TableCell align="center">{r.total.toFixed(2)}</TableCell>
                                  <TableCell align="center">{r.otTotal > 0 ? <Badge color="error" badgeContent="OT"/> : '-'}</TableCell>
                                  <TableCell align="center">{toThaiTimesheetStatus(r.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        <Box sx={{ mt: 1 }}>
                          <Typography>รวมชั่วโมงสัปดาห์: <strong>{memberTotal.toFixed(2)}</strong> ชม. (OT: <strong>{memberOT.toFixed(2)}</strong>)</Typography>
                          {memberTotal > 40 && <Alert severity="warning" sx={{ mt: 1 }}>เตือน: รวมชั่วโมงมากกว่า 40 ชั่วโมง</Alert>}
                        </Box>
                      </Paper>
                    );
                  })
                ) : (
                  <Typography color="text.secondary">ไม่มีรายชื่อลูกทีม</Typography>
                )
              )}
            </Box>
          )}

          <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
            <DialogTitle>เหตุผลการตีกลับ</DialogTitle>
            <DialogContent>
              <TextField value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} label="เหตุผล" fullWidth multiline rows={3} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectDialogOpen(false)}>ยกเลิก</Button>
              <Button color="error" onClick={handleReject}>ยืนยันตีกลับ</Button>
            </DialogActions>
          </Dialog>

          <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
            {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.text}</Alert> : null}
          </Snackbar>
        </Paper>
      );
    }

  const statusLabelTh = React.useMemo(() => ({
    not_started: 'ยังไม่เริ่ม',
    in_progress: 'กำลังทำ',
    review: 'รอตรวจ',
    done: 'เสร็จสิ้น',
    overdue: 'เลยกำหนด',
    blocked: 'ติดปัญหา',
  }), []);



  const priorityTh = React.useCallback((p) => {
    switch (p) {
      case 'low': return 'ต่ำ';
      case 'high': return 'สูง';
      case 'medium':
      default: return 'กลาง';
    }
  }, []);

  // Custom hex color helpers (align with board color spec)
  const getStatusColor = React.useCallback((s) => {
    switch (s) {
      case 'doing':
        return '#7c4dff';
      case 'review':
        return '#ff9800';
      case 'done':
        return '#43a047';
      case 'blocked':
        return '#d32f2f';
      case 'canceled':
        return '#9e9e9e';
      case 'todo':
      default:
        return '#9ca3af';
    }
  }, []);

  const getPriorityColor = React.useCallback((p) => {
    switch (p) {
      case 'high':
        return '#c62828';
      case 'medium':
        return '#f57c00';
      case 'low':
      default:
        return '#00796b';
    }
  }, []);

  // Map UI status to the color spec
  const uiStatusToHex = React.useCallback((ui) => {
    switch (ui) {
      case 'in_progress':
        return getStatusColor('doing');
      case 'blocked':
        return getStatusColor('blocked');
      case 'review':
        return getStatusColor('review');
      case 'done':
        return getStatusColor('done');
      case 'not_started':
        return getStatusColor('todo');
      case 'overdue':
        // Not defined in spec; use strong red for visibility
        return '#c62828';
      default:
        return getStatusColor('todo');
    }
  }, [getStatusColor]);

  const _leadTeamIdsKey = JSON.stringify(_leadTeamIds || []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) {
          throw new Error('ไม่พบผู้ใช้ที่เข้าสู่ระบบ');
        }

        // 1) Map login email -> employee id via employees.current_address_email_1-3
        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id, current_address_email_1, current_address_email_2, current_address_email_3')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;
        const me = (meCandidates || [])[0];
        if (!me?.id) throw new Error('ไม่พบรหัสพนักงานจากอีเมลที่เข้าสู่ระบบ');
        if (mounted) setMyEmployeeId(me.id);

        // 2) Teams where current user is team lead (team_lead_id = employees.id)
        const { data: leadTeams, error: teamsErr } = await supabase
          .from('tpr_project_teams')
          .select('id, team_name, team_code, team_lead_id')
          .eq('team_lead_id', me.id);
        if (teamsErr) throw teamsErr;

        // 3) Positions under those teams from tpr_project_team_positions
        const teamIds = (leadTeams || []).map(t => t.id);
        setLeadTeamIds(teamIds);
        if (teamIds.length === 0) {
          if (mounted) setMembersByTeam({});
        } else {
          const { data: teamPositions, error: posErr } = await supabase
            .from('tpr_project_team_positions')
            .select('team_id, position_id')
            .in('team_id', teamIds);
          if (posErr) throw posErr;

          // 4) Employees where position_id in team positions; group by team
          const positionsByTeam = {};
          for (const tp of teamPositions || []) {
            if (!positionsByTeam[tp.team_id]) positionsByTeam[tp.team_id] = new Set();
            positionsByTeam[tp.team_id].add(tp.position_id);
          }

          const allPositionIds = Array.from(new Set((teamPositions || []).map(tp => tp.position_id))).filter(Boolean);
          let employeesByPosition = [];
          if (allPositionIds.length > 0) {
            const { data: members, error: membersErr } = await supabase
              .from('employees')
              .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en, position_id, position, image_url, current_address_email_1, current_address_email_2, current_address_email_3')
              .in('position_id', allPositionIds);
            if (membersErr) throw membersErr;
            employeesByPosition = members || [];
          }

          const grouped = {};
          for (const teamId of teamIds) {
            const posSet = positionsByTeam[teamId] || new Set();
            const membersForTeam = employeesByPosition
              .filter(e => posSet.has(e.position_id))
              .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'th'));
            grouped[teamId] = membersForTeam;
          }
          if (mounted) setMembersByTeam(grouped);

          // 5) Presence: check user_daily_logins for today's date by member emails
          try {
            const flatMembers = Object.values(grouped).flat();
            const memberEmails = flatMembers
              .map(m => (m.current_address_email_1 || m.current_address_email_2 || m.current_address_email_3 || '').trim().toLowerCase())
              .filter(Boolean);


            if (memberEmails.length > 0) {
              const today = new Date();
              const loginDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
                .toISOString().slice(0, 10);

              const { data: daily, error: dailyErr } = await supabase
                .from('user_daily_logins')
                .select('email, login_date')
                .eq('login_date', loginDate)
                .in('email', Array.from(new Set(memberEmails)));
              if (dailyErr) throw dailyErr;
              const activeSet = new Set((daily || []).map(d => String(d.email).trim().toLowerCase()));
              if (mounted) setActiveEmailsToday(activeSet);
            } else {
              if (mounted) setActiveEmailsToday(new Set());
            }
          } catch {
            // ignore presence errors; do not block UI
          }

          // 6) Fetch tasks for team members by owner (employee uuid) from tpr_project_wbs_tasks
          try {
            const flatMembers = Object.values(grouped).flat();
            const memberIdsForTasks = Array.from(new Set(
              flatMembers.map(m => m.id).filter(Boolean)
            ));
            // Debug: inspect collected member IDs for tasks query
              if (memberIdsForTasks.length > 0) {
              // owner column is text and may store a JSON array string like ["uuid"], so use ilike OR conditions to match containing UUID
              const orFilter = memberIdsForTasks.map(id => `owner.ilike.%${id}%`).join(',');
              const { data: tasks, error: tasksErr } = await supabase
                .from('tpr_project_wbs_tasks')
                .select('id, project_id, phase_id, code, name, planned_hours, owner, start_date, end_date, billable_mode, workstream_code')
                .or(orFilter);
              if (tasksErr) throw tasksErr;
              const byOwner = {};
              for (const t of tasks || []) {
                const k = String(t.owner || '').trim();
                if (!k) continue;
                if (!byOwner[k]) byOwner[k] = [];
                byOwner[k].push(t);
              }
              // sort tasks by start_date then name
              Object.keys(byOwner).forEach(k => {
                byOwner[k].sort((a, b) => {
                  const ad = a.start_date || '';
                  const bd = b.start_date || '';
                  if (ad !== bd) return ad.localeCompare(bd);
                  return (a.name || '').localeCompare(b.name || '');
                });
              });
              if (mounted) setTasksByOwner(byOwner);
            } else {
              if (mounted) setTasksByOwner({});
            }
          } catch {
            // ignore tasks errors
          }

          // Team Tasks: fetch tasks for lead teams via workstreams
          try {
            setTeamTasksLoading(true);
            setTeamTasksError('');
            setTeamTasks([]);
            if (teamIds.length > 0) {
              // fetch workstreams for these teams
              const { data: workstreams, error: wErr } = await supabase
                .from('tpr_workstreams')
                .select('id, code, name, project_id, team_id')
                .in('team_id', teamIds);
              if (wErr) throw wErr;
              const wsIds = (workstreams || []).map(w => w.id).filter(Boolean);
              if (wsIds.length > 0) {
                // date window +-3 months around today
                const today = new Date();
                const start = new Date(today); start.setMonth(start.getMonth() - 3);
                const end = new Date(today); end.setMonth(end.getMonth() + 3);
                const toYmd = (d) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${dd}`;
                };

                const { data: rawTasks, error: tErr } = await supabase
                  .from('tpr_project_wbs_tasks')
                  .select('id, project_id, phase_id, workstream_id, code, name, planned_hours, owner, start_date, end_date, billable_mode, metadata')
                  .in('workstream_id', wsIds)
                  .or(`start_date.gte.${toYmd(start)},end_date.lte.${toYmd(end)}`);
                if (tErr) throw tErr;
                const taskList = rawTasks || [];

                // Resolve owners to employee names
                const ownerIds = Array.from(new Set(taskList
                  .map(t => extractOwnerId(t.owner))
                  .filter(Boolean)));
                const ownerMap = new Map();
                if (ownerIds.length > 0) {
                  const { data: owners, error: oErr } = await supabase
                    .from('employees')
                    .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en')
                    .in('id', ownerIds);
                  if (oErr) throw oErr;
                  (owners || []).forEach(o => ownerMap.set(o.id, getDisplayName(o)));
                }

                // Final resolution: if some ownerIds were not returned above, try one more fetch
                try {
                  const unresolved = ownerIds.filter(id => id && !ownerMap.has(id));
                  if (unresolved.length > 0) {
                    const { data: moreOwners, error: moreErr } = await supabase
                      .from('employees')
                      .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en')
                      .in('id', unresolved);
                    if (!moreErr && moreOwners) moreOwners.forEach(o => ownerMap.set(o.id, getDisplayName(o)));
                  }
                } catch {
                  // ignore
                }

                const projectIds = Array.from(new Set(taskList.map(t => t.project_id).filter(Boolean)));
                const phaseIds = Array.from(new Set(taskList.map(t => t.phase_id).filter(Boolean)));

                // projects
                const projectsMap = new Map();
                if (projectIds.length > 0) {
                  const { data: projects, error: pErr } = await supabase
                    .from('tpr_projects')
                    .select('id, project_code, name_th, name_en, archived')
                    .in('id', projectIds);
                  if (pErr) throw pErr;
                  (projects || []).forEach(pr => projectsMap.set(pr.id, pr));
                }

                // phases
                const phasesMap = new Map();
                if (phaseIds.length > 0) {
                  const { data: phases, error: phErr } = await supabase
                    .from('tpr_project_wbs_phases')
                    .select('id, code, name, status')
                    .in('id', phaseIds);
                  if (phErr) throw phErr;
                  (phases || []).forEach(ph => phasesMap.set(ph.id, ph));
                }

                const workstreamsMap = new Map();
                (workstreams || []).forEach(w => workstreamsMap.set(w.id, { id: w.id, code: w.code, name: w.name }));

                const todayYmd = (() => {
                  const y = today.getFullYear();
                  const m = String(today.getMonth() + 1).padStart(2, '0');
                  const d = String(today.getDate()).padStart(2, '0');
                  return `${y}-${m}-${d}`;
                })();
                const startOfWeek = (d) => {
                  const day = d.getDay();
                  const diff = (day === 0 ? -6 : 1) - day;
                  const res = new Date(d);
                  res.setDate(d.getDate() + diff);
                  res.setHours(0, 0, 0, 0);
                  return res;
                };
                const endOfWeek = (d) => {
                  const s = startOfWeek(d);
                  const e = new Date(s);
                  e.setDate(s.getDate() + 6);
                  e.setHours(23, 59, 59, 999);
                  return e;
                };
                const startWeek = startOfWeek(today);
                const endWeek = endOfWeek(today);

                const mapped = taskList
                  .filter(t => {
                    const pr = t.project_id ? projectsMap.get(t.project_id) : null;
                    if (!pr) return false;
                    if (pr.archived === true) return false;
                    return true;
                  })
                  .map(t => {
                    const pr = t.project_id ? projectsMap.get(t.project_id) : null;
                    const ph = typeof t.phase_id === 'number' ? phasesMap.get(t.phase_id) : null;
                    const ws = t.workstream_id ? workstreamsMap.get(t.workstream_id) : null;
                    const metadata = (t.metadata || {});
                    const raw = metadata?.status || 'todo';
                    const priority = metadata?.priority || 'medium';
                    let statusUi = 'not_started';
                    switch (raw) {
                      case 'todo': statusUi = 'not_started'; break;
                      case 'doing': statusUi = 'in_progress'; break;
                      case 'review': statusUi = 'review'; break;
                      case 'done': statusUi = 'done'; break;
                      case 'blocked': statusUi = 'blocked'; break;
                    }
                    const endDateStr = t.end_date || null;
                    let daysOverdue = 0;
                    if (statusUi !== 'done' && endDateStr) {
                      const endDate = new Date(endDateStr);
                      const diffMs = today.getTime() - endDate.getTime();
                      if (diffMs > 0) {
                        statusUi = 'overdue';
                        daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      }
                    }
                    const startStr = t.start_date || null;
                    const inRangeToday = (() => {
                      if (!startStr || !endDateStr) return false;
                      const s = new Date(startStr);
                      const e = new Date(endDateStr);
                      const ty = new Date(today);
                      return ty >= s && ty <= e && todayYmd === `${ty.getFullYear()}-${String(ty.getMonth() + 1).padStart(2, '0')}-${String(ty.getDate()).padStart(2, '0')}`;
                    })();
                    const inThisWeek = (() => {
                      if (!startStr || !endDateStr) return false;
                      const s = new Date(startStr);
                      const e = new Date(endDateStr);
                      return e >= startWeek && s <= endWeek;
                    })();
                    const ownerId = extractOwnerId(t.owner);
                    const ownerDisplayName = ownerId ? (ownerMap.get(ownerId) || '-') : '-';
                    return {
                      taskId: t.id,
                      taskCode: t.code || '',
                      taskName: t.name || '',
                      plannedHours: t.planned_hours ?? 0,
                      ownerId: ownerId || null,
                      ownerName: ownerDisplayName,
                      startDate: t.start_date || null,
                      endDate: endDateStr,
                      billableMode: t.billable_mode || null,
                      projectId: t.project_id,
                      projectCode: pr ? (pr.project_code || '') : '',
                      projectName: pr ? (pr.name_th || pr.name_en || '') : '',
                      phaseId: typeof t.phase_id === 'number' ? t.phase_id : 0,
                      phaseCode: ph?.code || '',
                      phaseName: ph?.name || '',
                      phaseStatus: ph?.status || null,
                      workstreamId: ws?.id || null,
                      workstreamCode: ws?.code || null,
                      workstreamName: ws?.name || null,
                      rawStatus: raw || null,
                      priority: priority || null,
                      status: statusUi,
                      isToday: inRangeToday,
                      isThisWeek: inThisWeek,
                      daysOverdue,
                    };
                  });

                // ensure owner names updated if we resolved more owners
                try {
                  const unresolvedAfter = ownerIds.filter(id => id && !ownerMap.has(id));
                  if (unresolvedAfter.length === 0) {
                    if (mounted) setTeamTasks(mapped);
                  } else {
                    // try one last fetch and then patch names in mapped
                    const { data: lastOwners, error: lastErr } = await supabase
                      .from('employees')
                      .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en')
                      .in('id', unresolvedAfter);
                    if (!lastErr && lastOwners) {
                      lastOwners.forEach(o => ownerMap.set(o.id, getDisplayName(o)));
                    }
                    const mapped2 = mapped.map(item => ({ ...item, ownerName: item.ownerId && ownerMap.has(item.ownerId) ? ownerMap.get(item.ownerId) : item.ownerName }));
                    if (mounted) setTeamTasks(mapped2);
                  }
                } catch {
                  if (mounted) setTeamTasks(mapped);
                }
              }
            }
          } catch (e) {
            if (mounted) setTeamTasksError(e?.message || 'เกิดข้อผิดพลาดระหว่างดึงงานของทีม');
          } finally {
            if (mounted) setTeamTasksLoading(false);
          }
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'เกิดข้อผิดพลาดขณะดึงข้อมูลทีม');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [getDisplayName, extractOwnerId]);

  

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setWorkloadLoading(true);
        setWorkloadError('');
        setWorkloadData([]);

        const teamIds = JSON.parse(_leadTeamIdsKey || '[]') || [];
        if (!teamIds || teamIds.length === 0) {
          if (mounted) setWorkloadLoading(false);
          return;
        }

        // fetch workstreams for teams
        const { data: workstreams, error: wErr } = await supabase
          .from('tpr_workstreams')
          .select('id, project_id')
          .in('team_id', teamIds);
        if (wErr) throw wErr;
        const wsIds = (workstreams || []).map(w => w.id).filter(Boolean);
        const projectIds = Array.from(new Set((workstreams || []).map(w => w.project_id).filter(Boolean)));

        if (wsIds.length === 0 || projectIds.length === 0) {
          if (mounted) setWorkloadLoading(false);
          return;
        }

        const { data: projects, error: pErr } = await supabase
          .from('tpr_projects')
          .select('id, archived')
          .in('id', projectIds);
        if (pErr) throw pErr;
        const validProjectIds = (projects || []).filter(p => !p.archived).map(p => p.id);
        if (validProjectIds.length === 0) {
          if (mounted) setWorkloadLoading(false);
          return;
        }

        const { data: tasks, error: tErr } = await supabase
          .from('tpr_project_wbs_tasks')
          .select('id, code, name, owner, planned_hours, start_date, end_date, metadata, project_id, workstream_id')
          .in('workstream_id', wsIds)
          .in('project_id', validProjectIds);
        if (tErr) throw tErr;

        const now = new Date();
        const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - 90);
        const windowEnd = new Date(now); windowEnd.setDate(windowEnd.getDate() + 90);

        const filtered = (tasks || []).filter(t => {
          if (!t) return false;
          if (!t.start_date && !t.end_date) return false;
          const s = t.start_date ? new Date(t.start_date) : null;
          const e = t.end_date ? new Date(t.end_date) : null;
          if (e && (e < windowStart || e > windowEnd)) return false;
          if (s && (s < windowStart || s > windowEnd)) return false;
          return true;
        });

                // Resolve owner IDs to display names and images where possible
                const ownerIdSet = new Set();
                for (const t of filtered) {
                  const id = extractOwnerId(t.owner);
                  if (id) ownerIdSet.add(id);
                }
                // map id -> { name, image }
                const ownerMap = new Map();
                if (ownerIdSet.size > 0) {
                  try {
                    const { data: owners, error: oErr } = await supabase
                      .from('employees')
                      .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en, image_url')
                      .in('id', Array.from(ownerIdSet));
                    if (!oErr && owners) owners.forEach(o => ownerMap.set(o.id, { name: getDisplayName(o), image: o.image_url || null }));
                  } catch {
                    // ignore owner name resolution errors
                  }
                }

                // Group tasks by ownerId when possible (fallback to raw owner text)
                const groups = new Map();
                for (const t of filtered) {
                  const ownerRaw = (t.owner || '').trim() || 'Unassigned';
                  const ownerId = extractOwnerId(t.owner);
                  const display = ownerId ? (ownerMap.get(ownerId)?.name || ownerRaw) : ownerRaw;
                  const key = ownerId || display;
                  if (!groups.has(key)) groups.set(key, { ownerId: ownerId || null, display, tasks: [] });
                  groups.get(key).tasks.push(t);
                }

        const ws = startOfWeek(now);
        const we = endOfWeek(now);

        const out = [];
        for (const [, group] of groups.entries()) {
          const ownerName = group.display;
          const ownerId = group.ownerId;
          const tasksForOwner = group.tasks;
          const notDone = tasksForOwner.filter(t => ((t.metadata && t.metadata.status) || 'todo') !== 'done');
          const projectSet = new Set(tasksForOwner.map(t => t.project_id).filter(Boolean));
          const totalTasks = notDone.length;
          const inProgressTasks = notDone.filter(t => { const raw = (t.metadata && t.metadata.status) || 'todo'; return raw === 'doing' || raw === 'review'; }).length;
          const overdueTasks = notDone.filter(t => { const raw = (t.metadata && t.metadata.status) || 'todo'; const end = t.end_date ? new Date(t.end_date) : null; return raw !== 'done' && end && now > end; }).length;
          const plannedHoursTotal = notDone.reduce((acc, t) => acc + (Number(t.planned_hours) || 0), 0);
          const plannedHoursThisWeek = notDone.reduce((acc, t) => { const s = t.start_date ? new Date(t.start_date) : null; const e = t.end_date ? new Date(t.end_date) : null; if (!s || !e) return acc; if (e >= ws && s <= we) return acc + (Number(t.planned_hours) || 0); return acc; }, 0);
          const futureDue = notDone.map(t => ({ t, end: t.end_date ? new Date(t.end_date) : null })).filter(x => x.end && x.end >= now).sort((a, b) => a.end.getTime() - b.end.getTime());
          const nearestDueDate = futureDue.length > 0 ? formatDateDMY(futureDue[0].end) : null;
          const nearestDueTaskName = futureDue.length > 0 ? (futureDue[0].t.name || null) : null;
          const workloadPercent = Math.min(Math.round((plannedHoursThisWeek / weeklyCapacityHours) * 100), 200);
          const memberImage = ownerId ? (ownerMap.get(ownerId)?.image || null) : null;
          out.push({ memberName: ownerName, memberImage, projectCount: projectSet.size, totalTasks, inProgressTasks, overdueTasks, plannedHoursTotal, plannedHoursThisWeek, workloadPercent, nearestDueDate, nearestDueTaskName });
        }

        // Final resolution: if some owner IDs were not resolved to names/images, try fetching them and rebuild output
        try {
          const unresolved = Array.from(ownerIdSet).filter(id => id && !ownerMap.has(id));
          if (unresolved.length > 0) {
            const { data: moreOwners, error: moreErr } = await supabase
              .from('employees')
              .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname_th, nickname_en, image_url')
              .in('id', unresolved);
            if (!moreErr && moreOwners) moreOwners.forEach(o => ownerMap.set(o.id, { name: getDisplayName(o), image: o.image_url || null }));

            // rebuild groups -> out using updated ownerMap
            const out2 = [];
            for (const [, group] of groups.entries()) {
              const ownerId = group.ownerId;
              const tasksForOwner = group.tasks;
              const notDone = tasksForOwner.filter(t => ((t.metadata && t.metadata.status) || 'todo') !== 'done');
              const projectSet = new Set(tasksForOwner.map(t => t.project_id).filter(Boolean));
              const totalTasks = notDone.length;
              const inProgressTasks = notDone.filter(t => { const raw = (t.metadata && t.metadata.status) || 'todo'; return raw === 'doing' || raw === 'review'; }).length;
              const overdueTasks = notDone.filter(t => { const raw = (t.metadata && t.metadata.status) || 'todo'; const end = t.end_date ? new Date(t.end_date) : null; return raw !== 'done' && end && now > end; }).length;
              const plannedHoursTotal = notDone.reduce((acc, t) => acc + (Number(t.planned_hours) || 0), 0);
              const plannedHoursThisWeek = notDone.reduce((acc, t) => { const s = t.start_date ? new Date(t.start_date) : null; const e = t.end_date ? new Date(t.end_date) : null; if (!s || !e) return acc; if (e >= ws && s <= we) return acc + (Number(t.planned_hours) || 0); return acc; }, 0);
              const futureDue = notDone.map(t => ({ t, end: t.end_date ? new Date(t.end_date) : null })).filter(x => x.end && x.end >= now).sort((a, b) => a.end.getTime() - b.end.getTime());
              const nearestDueDate = futureDue.length > 0 ? formatDateDMY(futureDue[0].end) : null;
              const nearestDueTaskName = futureDue.length > 0 ? (futureDue[0].t.name || null) : null;
              const workloadPercent = Math.min(Math.round((plannedHoursThisWeek / weeklyCapacityHours) * 100), 200);
              const memberImage = ownerId ? (ownerMap.get(ownerId)?.image || null) : null;
              const memberDisplay = ownerId ? (ownerMap.get(ownerId)?.name || group.display) : group.display;
              out2.push({ memberName: memberDisplay, memberImage, projectCount: projectSet.size, totalTasks, inProgressTasks, overdueTasks, plannedHoursTotal, plannedHoursThisWeek, workloadPercent, nearestDueDate, nearestDueTaskName });
            }
            out2.sort((a, b) => b.workloadPercent - a.workloadPercent || a.memberName.localeCompare(b.memberName));
            if (mounted) setWorkloadData(out2);
          } else {
            out.sort((a, b) => b.workloadPercent - a.workloadPercent || a.memberName.localeCompare(b.memberName));
            if (mounted) setWorkloadData(out);
          }
        } catch {
          out.sort((a, b) => b.workloadPercent - a.workloadPercent || a.memberName.localeCompare(b.memberName));
          if (mounted) setWorkloadData(out);
        }
      } catch (e) {
        if (mounted) setWorkloadError(e?.message || 'เกิดข้อผิดพลาดขณะดึงภาระงานทีม');
      } finally {
        if (mounted) setWorkloadLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [_leadTeamIdsKey, extractOwnerId, formatDateDMY, getDisplayName]);

  return (
    <Box sx={{ pt: 0, px: 2, display: 'flex', gap: 2, pr: { xs: 2, md: sidebarOpen ? '340px' : 2 } }}>
      <Paper sx={{ p: 0, boxShadow: 'none', flex: 1 }}>
        <Box sx={{ mx: -2, px: 2, borderBottom: '1px solid #eee' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              m: 0,
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab label="🧑‍💻 งานของทีม" disableRipple disableFocusRipple sx={{ fontWeight: 700, outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }} />
            <Tab label="🗂️ สถานะเฟสโครงการ" disableRipple disableFocusRipple sx={{ fontWeight: 700, outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }} />
            <Tab label="✅ อนุมัติการลงเวลา" disableRipple disableFocusRipple sx={{ fontWeight: 700, outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }} />
            <Tab label="📈 ภาระงานทีม" disableRipple disableFocusRipple sx={{ fontWeight: 700, outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }} />
            {/* Hidden: Issues / Blockers tab temporarily removed */}
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={18} sx={{ color: '#d32f2f' }} />
            <Typography variant="body2">กำลังโหลดข้อมูล…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}

        {!loading && !error && (
          <Box sx={{ mt: 2 }}>
            {tab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, mb: 1 }}>
                  <Typography variant="h6" fontWeight={700}>งานของทีม</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>

                    {['all', 'in_progress', 'review', 'overdue', 'today', 'this_week'].map(k => (
                      <Box key={`flt-${k}`}>
                        <Badge
                          badgeContent={countsByFilter[k] || 0}
                          color="error"
                          invisible={(countsByFilter[k] || 0) === 0}
                          sx={{ mr: 0.5 }}
                        >
                          <button
                            type="button"
                            onClick={() => setTeamTasksFilter(k)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              border: '1px solid #eee',
                              backgroundColor: teamTasksFilter === k ? '#e3f2fd' : '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            {k === 'all' ? 'ทั้งหมด' :
                              k === 'in_progress' ? 'กำลังทำ' :
                                k === 'review' ? 'รอตรวจ' :
                                  k === 'overdue' ? 'เลยกำหนด' :
                                    k === 'today' ? 'วันนี้' : 'สัปดาห์นี้'}
                          </button>
                        </Badge>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <TextField
                  size="small"
                  placeholder="ค้นหา งาน / โครงการ / เฟส / ผู้รับผิดชอบ"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  fullWidth
                  sx={{ mt: 1 }}
                />
                {/* {teamTasksLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">กำลังโหลดงานทีม…</Typography>
                  </Box>
                )} */}

                {!teamTasksLoading && teamTasksError && (
                  <Alert severity="error" sx={{ mt: 1 }}>{teamTasksError}</Alert>
                )}

                {!teamTasksLoading && !teamTasksError && (
                  <Box>
                    {(() => {
                      const filtered = (() => {
                        let base = teamTasks || [];
                        switch (teamTasksFilter) {
                          case 'in_progress': base = base.filter(t => t.status === 'in_progress'); break;
                          case 'review': base = base.filter(t => t.status === 'review'); break;
                          case 'overdue': base = base.filter(t => t.status === 'overdue'); break;
                          case 'today': base = base.filter(t => t.isToday); break;
                          case 'this_week': base = base.filter(t => t.isThisWeek); break;
                          case 'all':
                          default: break;
                        }
                        const q = String(teamSearch || '').trim().toLowerCase();
                        if (!q) return base;
                        return base.filter(t => {
                          return [t.taskName, t.projectName, t.projectCode, t.phaseName, t.phaseCode, t.ownerName]
                            .some(f => (String(f || '')).toLowerCase().includes(q));
                        });
                      })();

                      return (
                        <Box sx={{ mt: 1 }}>
                          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: 14, '& th, & td': { fontSize: 14, lineHeight: 2.2, p: 0, border: 'none' } }}>
                            <Box component="thead" sx={{ bgcolor: '#fafafa' }}>
                              <Box component="tr">
                                <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>งาน</Box>
                                  <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>เฟส</Box>
                                  <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>โครงการ</Box>
                                  <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>ผู้รับผิดชอบ</Box>
                                  <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>ความสำคัญ</Box>
                                  <Box component="th" sx={{ textAlign: 'left', py: 2.5, px: 1, fontWeight: 700 }}>ครบกำหนด</Box>
                                  <Box component="th" sx={{ textAlign: 'center', py: 2.5, px: 1, fontWeight: 700 }}>สถานะ</Box>
                              </Box>
                            </Box>
                            <Box component="tbody">
                              {filtered.length === 0 ? (
                                <Box component="tr">
                                  <Box component="td" colSpan={7} sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    ไม่มีงานในตัวกรองนี้
                                  </Box>
                                </Box>
                              ) : (
                                filtered.map(t => (
                                  <Box component="tr" key={`team-row-${t.taskId}`}>
                                    <Box component="td" sx={{ py: 2.5, px: 1 }}>
                                      <Box sx={{ fontWeight: 500 }}>{t.taskName}</Box>
                                    </Box>
                                     <Box component="td" sx={{ py: 2.5, px: 1 }}>
                                      <Tooltip title={t.phaseName || t.phaseCode || '-'} arrow>
                                        <Box component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>{t.phaseCode || t.phaseId || '-'}</Box>
                                      </Tooltip>
                                    </Box>
                                    <Box component="td" sx={{ py: 2.5, px: 1 }}>
                                      <Tooltip title={t.projectName || t.projectCode || '-'} arrow>
                                        <Box component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>{t.projectCode || t.projectId || '-'}</Box>
                                      </Tooltip>
                                    </Box>
                                   
                                    <Box component="td" sx={{ py: 2.5, px: 1 }}>{t.ownerName || '-'}</Box>
                                    <Box component="td" sx={{ py: 2.5, px: 1, textAlign: 'left' }}>
                                      <Chip
                                        size="small"
                                        label={priorityTh(t.priority || 'medium')}
                                        sx={{
                                          width: '75%',
                                          bgcolor: getPriorityColor(t.priority || 'medium'),
                                          color: '#fff',
                                          '& .MuiChip-label': { width: '100%', textAlign: 'center', fontSize: 14, px: 0.5 },
                                        }}
                                      />
                                    </Box>
                                    <Box component="td" sx={{ py: 2.5, px: 1 }}>{formatDateDMY(t.endDate)}</Box>
                                    <Box component="td" sx={{ py: 2.5, px: 1, textAlign: 'center' }}>
                                      <Chip
                                        size="small"
                                        label={statusLabelTh[t.status] || '-'}
                                        sx={{
                                          width: '100%',
                                          bgcolor: uiStatusToHex(t.status),
                                          color: '#fff',
                                          '& .MuiChip-label': { width: '100%', textAlign: 'center', fontSize: 14, px: 0.5 },
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                ))
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            )}
            {tab === 1 && (
              <ProjectPhaseStatusTab teamId={(_leadTeamIds && _leadTeamIds[0]) || null} currentDate={new Date()} showOnlyActiveProp={false} />
            )}
            {tab === 2 && (
              <TeamTimesheetApprovalTab />
            )}
            {tab === 3 && (
              <Box>
                <Typography variant="h6" fontWeight={700}>ภาระงานทีม</Typography>

                {workloadLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">กำลังโหลดข้อมูลภาระงานทีม…</Typography>
                  </Box>
                )}

                {!workloadLoading && workloadError && (
                  <Alert severity="error" sx={{ mt: 1 }}>{workloadError}</Alert>
                )}

                {!workloadLoading && !workloadError && workloadData.length === 0 && (
                  <Typography color="text.secondary" sx={{ mt: 1 }}>ยังไม่มีงานในทีมของคุณ</Typography>
                )}

                {!workloadLoading && !workloadError && workloadData.length > 0 && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    {workloadData.map(m => (
                      <Paper key={`wl-${m.memberName}`} sx={{ p: 2, boxShadow: 'none', border: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar src={m.memberImage || ''} sx={{ bgcolor: m.memberImage ? undefined : '#90caf9', color: m.memberImage ? undefined : '#000' }}>{(m.memberName || 'U').charAt(0).toUpperCase()}</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography fontWeight={700}>{m.memberName}</Typography>
                              <Tooltip title={`คำนวณจาก ${m.plannedHoursThisWeek} ชม. / ${weeklyCapacityHours} ชม. = ${m.workloadPercent}%`} arrow>
                                <Chip label={`${m.workloadPercent}%`} size="small" sx={{ bgcolor: workloadColor(m.workloadPercent), color: '#fff' }} />
                              </Tooltip>
                            </Box>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2">ภาระงาน: <strong>{m.totalTasks}</strong></Typography>
                              <Typography variant="body2">กำลังทำ: <strong>{m.inProgressTasks}</strong></Typography>
                              <Typography variant="body2">ค้าง: <strong>{m.overdueTasks}</strong></Typography>
                            </Box>
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body2">ชั่วโมงแผนรวม: <strong>{m.plannedHoursTotal} ชม.</strong> (สัปดาห์นี้: <strong>{m.plannedHoursThisWeek} ชม.</strong>)</Typography>
                              <Typography variant="body2">โครงการ: <strong>{m.projectCount}</strong></Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <LinearProgress variant="determinate" value={Math.min(m.workloadPercent, 100)} sx={{ height: 10, borderRadius: 2, bgcolor: '#f5f5f5', '& .MuiLinearProgress-bar': { background: workloadColor(m.workloadPercent) } }} />
                            </Box>
                            {m.nearestDueDate && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2">งานใกล้ครบกำหนด: <strong>{m.nearestDueTaskName || '-'}</strong> ({m.nearestDueDate})</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
            {/* Tab 4 (Issues / Blockers) hidden — panel removed temporarily */}
          </Box>
        )}
      </Paper>

      <Box
        sx={{
          width: { xs: '80vw', md: 320 },
          border: '1px solid #eee',
          bgcolor: '#fff',
          position: 'fixed',
          top: { xs: 57, md: 65 },
          right: 0,
          height: { xs: 'calc(100% - 57px)', md: 'calc(100% - 65px)' },

          overflowY: 'auto',
          zIndex: 1400,
          boxShadow: 'none',
          transform: {
            xs: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
            md: sidebarOpen ? 'translateX(0)' : 'translateX(320px)'
          },
          transition: 'transform 220ms ease-in-out',
        }}
      >
        <Box sx={{ p: 1.2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Typography variant="subtitle1" fontWeight={700} align="center">ลูกทีมทั้งหมด</Typography>
          <IconButton
            aria-label="close sidebar"
            onClick={() => setSidebarOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 6, display: { xs: 'block', md: 'block' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <List dense>
          {Object.values(membersByTeam).flat().length === 0 ? (
            <ListItem>
              <ListItemText primary="ไม่มีรายชื่อลูกทีม" />
            </ListItem>
          ) : (() => {
            const rows = Object.entries(membersByTeam).flatMap(([teamId, members]) => (members || []).map(m => ({ m, teamId })));
            return rows.map(({ m, teamId }) => {
              const displayName = (m.first_name_th || m.last_name_th)
                ? `${m.first_name_th || ''} ${m.last_name_th || ''}`.trim()
                : (m.first_name_en || m.last_name_en
                  ? `${m.first_name_en || ''} ${m.last_name_en || ''}`.trim()
                  : m.nickname_th || m.nickname_en || m.id);
              const initial = (displayName || 'U').trim().charAt(0).toUpperCase();
              const bg = pickColor(m.id || displayName);
              const emailForPresence = (m.current_address_email_1 || m.current_address_email_2 || m.current_address_email_3 || '').trim().toLowerCase();
              const isActiveToday = emailForPresence && activeEmailsToday.has(emailForPresence);
              const onlineList = (onlineUsersByTeam && onlineUsersByTeam[String(teamId)]) || [];
              const isOnline = onlineList.includes(String(m.id));
              return (
                <ListItem key={`sidebar-${m.id}`} sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <Avatar src={m.image_url || ''} sx={{ bgcolor: m.image_url ? undefined : bg, color: !m.image_url ? '#000' : undefined }}>
                        {!m.image_url ? initial : null}
                      </Avatar>
                      <Box sx={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', right: -1, top: -1, bgcolor: isOnline ? '#2ecc71' : ((isActiveToday || m.id === myEmployeeId) ? '#2ecc71' : '#bdbdbd'), border: '2px solid #fff' }} />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText primary={displayName} secondary={m.position || null} />
                </ListItem>
              );
            });
          })()}
        </List>
      </Box>
      {/* floating toggle button for small screens */}
      <IconButton
        aria-label="open sidebar"
        onClick={() => setSidebarOpen(true)}
        sx={{
          position: 'fixed',
          right: 12,
          bottom: 20,
          zIndex: 1500,
          bgcolor: '#2ecc71',
          color: '#fff',
          display: { xs: 'flex', md: sidebarOpen ? 'none' : 'flex' },
          overflow: 'visible',
          p: 1,
          '&:hover': { bgcolor: '#27ad5fff' }
        }}
        title="แสดงลูกทีม"
      >
        <PeopleIcon />
      </IconButton>
    </Box>
  );
}
