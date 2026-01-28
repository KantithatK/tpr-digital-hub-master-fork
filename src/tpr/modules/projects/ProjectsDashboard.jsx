import * as React from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SaveIcon from '@mui/icons-material/Save';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';

import ReactApexChart from 'react-apexcharts';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// ✅ ใช้ฟังก์ชันทั้ง 4 จาก Projects.js + supabase
import Projects from '../../functions/Projects';
import { supabase } from '../../../lib/supabaseClient';

const BRAND = '#ff4059';

// use Thai locale for datepickers
try { dayjs.locale && dayjs.locale('th'); } catch  { /* ignore */ }

function genWorkCode() {
  try {
    return `WS-${dayjs().format('YYYYMMDD-HHmmss')}`;
  } catch  {
    return `WS-${Date.now()}`;
  }
}

function formatMoneyTHB(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return `${num.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}


function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function truncateText(str, max = 40) {
  try {
    const s = String(str || '');
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
  } catch {
    return '';
  }
}

// ===== Workstream UI helpers (UI only, logic เดี๋ยวไปทำใน Projects.js) =====
function StatusPill({ status }) {
  const sRaw = String(status || '');
  const s = sRaw.toLowerCase();

  // mapping ตามภาพตัวอย่าง
  const map = {
    // Thai statuses from SQL
    'เสร็จแล้ว': { label: 'เสร็จแล้ว', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    'ล่าช้า': { label: 'ล่าช้า', dot: '#fb7185', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
    'เสี่ยง': { label: 'เสี่ยง', dot: '#fbbf24', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    'ยังไม่เริ่ม': { label: 'ยังไม่เริ่ม', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
    'ทำอยู่': { label: 'ทำอยู่', dot: '#a78bfa', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' },
    planning: { label: 'ยังไม่เริ่ม', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },

    // legacy normalized keys
    done: { label: 'เสร็จแล้ว', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    ontrack: { label: 'เสร็จแล้ว', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    delayed: { label: 'ล่าช้า', dot: '#fb7185', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
    risk: { label: 'เสี่ยง', dot: '#fbbf24', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    pending: { label: 'ยังไม่เริ่ม', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
    doing: { label: 'ทำอยู่', dot: '#a78bfa', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' },
  };

  const cfg = map[sRaw] || map[s] || map.pending;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        borderRadius: 999,
        border: '1px solid',
        borderColor: cfg.border,
        bgcolor: cfg.bg,
        width: 'fit-content',
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: 99, bgcolor: cfg.dot }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: cfg.text, lineHeight: 1 }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function WorkstreamsTable({ loading, rows, onRowClick, onEditRow, onDeleteRow, onGoWorkRow }) {
  const list = Array.isArray(rows) ? rows : [];
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [menuRow, setMenuRow] = React.useState(null);

  const handleOpenMenu = (e, r) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget || e.target);
    setMenuRow(r || null);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  return (
    <TableContainer sx={{ width: '100%' }}>
      <Table size="small" sx={{ '& th, & td': { py: 1, px: 1.5, borderBottom: 'none' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'transparent' }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 70, textAlign: 'center' }}>ลำดับ</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ชื่อ Work</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 130 }}>สถานะ</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 170 }}>ความคืบหน้า</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>งบประมาณ</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>ช่วงเวลา</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', width: 110 }}>เข้า Work</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', width: 90 }}>จัดการ</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Skeleton variant="text" width={48} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={240} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={92} height={24} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={140} height={10} />
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Skeleton variant="text" width={120} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                    <Skeleton variant="text" width={80} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                </TableRow>
              ))
                : list.map((r, idx) => {
                const key = r.id || r.code || idx;
                const progressPct = clamp(Number(r.progressPct || 0), 0, 100);

                const budgetMeta = r.budgetMeta || null;

                  return (
                  <TableRow
                    key={key}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      try {
                        onRowClick?.(r);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <TableCell sx={{ textAlign: 'center' }}>{`W-${idx + 1}`}</TableCell>
                    <TableCell>{r.name || '-'}</TableCell>
                    <TableCell>
                      <StatusPill status={r.status || 'ยังไม่เริ่ม'} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progressPct}
                            sx={{ height: 8, borderRadius: 99, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#08d84c' } }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500, minWidth: 40, textAlign: 'right' }}>{`${Math.round(progressPct)}%`}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Tooltip
                            title={(
                              <Box sx={{ px: 0.5 }}>
                                <Typography sx={{ fontWeight: 500, color: '#fff' }}>{budgetMeta?.tooltip?.title ?? ''}</Typography>
                                {(budgetMeta?.tooltip?.lines || []).map((ln, i) => (
                                  <Typography key={i} variant="caption" sx={{ display: 'block', color: '#fff' }}>{ln}</Typography>
                                ))}
                              </Box>
                            )}
                            arrow
                            placement="top-start"
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="รายละเอียดงบ"
                            >
                              <InfoOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Typography sx={{ fontSize: 13, fontWeight: 500, color: budgetMeta?.usage?.color || 'inherit' }}>{budgetMeta?.usage?.label ?? '—'}</Typography>
                          
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {r.dateRange || '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            onGoWorkRow?.(r);
                          } catch {
                            // ignore
                          }
                        }}
                        sx={{ textTransform: 'none', borderRadius: 2, boxShadow: 'none', fontWeight: 700 }}
                      >
                        เข้า Work
                      </Button>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        onClick={(e) => handleOpenMenu(e, r)}
                        aria-label="เมนูเพิ่มเติม"
                        aria-controls={menuAnchor ? 'ws-row-menu' : undefined}
                        aria-haspopup="true"
                      >
                        <MoreHorizIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}

          <Menu
            id="ws-row-menu"
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                try {
                  onEditRow?.(menuRow);
                } catch {
                  // ignore
                }
                handleCloseMenu();
              }}
            >
              <EditIcon  fontSize="small" sx={{ mr: 1 }} /> แก้ไข
            </MenuItem>

            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                try {
                  onDeleteRow?.(menuRow);
                } catch {
                  // ignore
                }
                handleCloseMenu();
              }}
            >
              <DeleteIcon color="error" fontSize="small" sx={{ mr: 1 }} /> ลบข้อมูล
            </MenuItem>
          </Menu>

          {!loading && list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                <Box sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>ยังไม่มี Work</Typography>
                  <Typography variant="caption" color="text.secondary">*กดปุ่ม + เพื่อเพิ่ม Work</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}


// กราฟเล็กแบบ mini bars (ไม่พึ่ง lib)
function MiniBars({ color = '#64748b', values = [0.3, 0.55, 0.75], height = 34, variant = 'up' }) {
  const base = Array.isArray(values) && values.length ? values : [0.3, 0.55, 0.75];
  const seed = [base[0], base[1], base[2]].map((x) => clamp(Number(x || 0), 0, 1));

  let vv = seed;
  if (variant === 'wave') vv = [seed[0] * 0.85, Math.min(1, seed[2] * 1.05), seed[1] * 0.9];
  else if (variant === 'spike') {
    vv = [Math.max(0.12, seed[0] * 0.35), Math.max(0.18, seed[1] * 0.45), Math.min(1, seed[2] * 1.1)];
  } else vv = [seed[0] * 0.7, seed[1] * 0.9, seed[2]];

  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0.6,
        height,
        minWidth: 44,
        justifyContent: 'flex-end',
      }}
    >
      {vv.map((x, i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: Math.max(6, Math.round(height * x)),
            bgcolor: color,
            opacity: 0.35,
            borderRadius: 1,
          }}
        />
      ))}
      <Box
        sx={{
          width: 8,
          height: Math.max(6, Math.round(height * vv[2] * 1.05)),
          bgcolor: color,
          opacity: 0.85,
          borderRadius: 1,
        }}
      />
    </Box>
  );
}

// Temporary feature flag: ซ่อนสัญญาณแจ้งเตือนไว้ก่อน (ห้ามลบโค้ด)
// NOTE: keep the original signals code in file but do not render the old Paper.
const SHOW_SIGNALS = false;

// Temporary feature flag: ซ่อนแผง 'ความคืบหน้า vs งบที่ใช้ไป' ชั่วคราว
const SHOW_PV = true;
// (No demo/sample data in this file) - loader uses real DB only

export default function ProjectsDashboard({ project, onBack, onEdit, onGoWork }) {
  const handleEditClick = React.useCallback(() => {
    const payload = {
      toTab: 'create',
      mode: 'edit',
      projectId: project?.id ?? null,
      project: project || null,
    };
    try {
      onEdit?.(payload);
    } catch {
      try {
        onEdit?.();
      } catch {
        // ignore
      }
    }
  }, [onEdit, project]);

  const handleBackClick = React.useCallback(() => {
    try {
      onBack?.();
    } catch {
      // ignore
    }
  }, [onBack]);

  const handleGoWorkClick = React.useCallback(() => {
    const payload = {
      toTab: 'work',
      projectId: project?.id ?? null,
      project: project || null,
    };

    try {
      onGoWork?.(payload);
    } catch {
      try {
        onGoWork?.();
      } catch {
        // ignore
      }
    }
  }, [onGoWork, project]);

  const projectId = project?.id || null;
  const projectName = project?.name_th || project?.name || project?.name_en || '';
  const updatedAt = project?.updated_at || project?.created_at || project?.start_date || project?.start || '-';
  const budgetTotalNum = Number(project?.budget || 0);

  // ===== computed KPI state =====
  const [kpi, setKpi] = React.useState(() => ({
    loading: false,
    error: null,

    status: project?.status || 'Planning',

    progressPct: 0,
    progressDone: 0,
    progressTotal: 0,

    wip: 0,
    wipHoursTotal: 0,

    ar: 0,
    invoiceTotal: 0,
    receivedTotal: 0,

    // ✅ Progress vs Used
    pv_progressPct: 0,
    pv_usedPct: 0,
    pv_usedAmount: 0,
    pv_budgetTotal: 0,
    pv_deltaPct: 0,
    pv_health: null,

    // ✅ Signal / Alert
    signalsLoading: false,
    signals: [],
  }));

  // ===== Workstreams UI state (logic จะไปทำใน Projects.js ภายหลัง) =====
  const [workstreamsState, setWorkstreamsState] = React.useState(() => ({
    loading: true,
    total: 0,
    rows: [],
  }));

  const [workDialog, setWorkDialog] = React.useState(() => ({
    open: false,
    mode: 'create',
    saving: false,
    form: {
      id: null,
      code: '',
      name: '',
      status: 'ยังไม่เริ่ม',
      start_date: '',
      end_date: '',
      budget_amount: '',
    },
  }));

  // members bar state
  const [membersState, setMembersState] = React.useState(() => ({ loading: true, rows: [], error: null }));
  // notification popover state (bell beside Edit button)
  const [notifAnchor, setNotifAnchor] = React.useState(null);

  // workstreams summary & line series (from Projects.js)
  const [workSummary, setWorkSummary] = React.useState(null);
  const [workLine, setWorkLine] = React.useState(null);

  const handleNotifOpen = React.useCallback((e) => {
    setNotifAnchor(e.currentTarget || e.target || null);
  }, []);

  const handleNotifClose = React.useCallback(() => {
    setNotifAnchor(null);
  }, []);

  // badge count: only RISK and WARN levels
  const notifCount = React.useMemo(() => {
    try {
      const arr = Array.isArray(kpi.signals) ? kpi.signals : [];
      return arr.filter((s) => {
        const lv = String(s?.level || '').toUpperCase();
        return lv === 'RISK' || lv === 'WARN';
      }).length;
    } catch {
      return 0;
    }
  }, [kpi.signals]);

  const fmtThaiRange = React.useCallback((startISO, endISO) => {
    const fmt = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };

    const a = fmt(startISO);
    const b = fmt(endISO);
    if (a && b) return `${a}–${b}`;
    return a || b || '';
  }, []);

  const reloadWorkstreams = React.useCallback(async () => {
    if (!projectId) return;

    try {
      setWorkstreamsState({ loading: true, total: 0, rows: [] });

      // หน่วงนิดนึงให้ skeleton สวย
      await new Promise((r) => setTimeout(r, 200));

      const wsRows = await Projects.getWorkstreamsForProject(supabase, projectId);

      const mapped = (Array.isArray(wsRows) ? wsRows : []).map((r) => {
        const raw = Number(r?.progress ?? 0);
        const progressPct = raw <= 1 ? raw * 100 : raw;

        // compute budgetMeta from central helper (synchronous)
        let budgetMeta = null;
        try {
          budgetMeta = Projects.getWorkstreamBudgetMeta ? Projects.getWorkstreamBudgetMeta(r) : null;
        } catch  {
          budgetMeta = null;
        }

        return {
          id: r.id,
          code: r.code || '-',
          name: r.name || '-',
          status: r.status || 'ยังไม่เริ่ม',
          progressPct: clamp(progressPct, 0, 100),
          usedBudget: Number(budgetMeta?.usedAmount ?? Number(r.spent_amount || 0)),
          totalBudget: Number(budgetMeta?.budgetAmount ?? Number(r.budget_amount || 0)),
          budgetMeta,
          start_date: r.start_date || '',
          end_date: r.end_date || '',
          dateRange: fmtThaiRange(r.start_date, r.end_date),
        };
      });

      setWorkstreamsState({ loading: false, total: mapped.length, rows: mapped });
    } catch (e) {
      console.error('reloadWorkstreams error:', e);
      setWorkstreamsState({ loading: false, total: 0, rows: [] });
    }
  }, [fmtThaiRange, projectId]);

  React.useEffect(() => {
    reloadWorkstreams();
  }, [reloadWorkstreams]);

  // load simple member avatars (small, safe query) tied to projectId
  React.useEffect(() => {
    let alive = true;

    async function loadMembers() {
      if (!projectId) {
        if (alive) setMembersState({ loading: false, rows: [], error: null });
        return;
      }

      if (alive) setMembersState({ loading: true, rows: [], error: null });

      try {
        const rows = await Projects.getProjectMemberAvatars(supabase, projectId);
        if (!alive) return;
        setMembersState({ loading: false, rows: Array.isArray(rows) ? rows : [], error: null });
      } catch (e) {
        if (!alive) return;
        setMembersState({ loading: false, rows: [], error: String(e?.message || e) });
      }
    }

    loadMembers();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const openCreateWorkDialog = React.useCallback(() => {
    setWorkDialog({
      open: true,
      mode: 'create',
      saving: false,
      form: { id: null, code: genWorkCode(), name: '', status: 'ยังไม่เริ่ม', start_date: '', end_date: '', budget_amount: '' },
    });
  }, []);

  const openEditWorkDialog = React.useCallback((row) => {
    setWorkDialog({
      open: true,
      mode: 'edit',
      saving: false,
      form: {
        id: row?.id || null,
        code: row?.code || '',
        name: row?.name || '',
        status: row?.status || 'ยังไม่เริ่ม',
        start_date: row?.start_date || '',
        end_date: row?.end_date || '',
        budget_amount: row?.totalBudget != null ? String(Number(row.totalBudget || 0)) : '',
      },
    });
  }, []);

  const closeWorkDialog = React.useCallback(() => {
    setWorkDialog((prev) => ({ ...prev, open: false, saving: false }));
  }, []);

  const saveWorkDialog = React.useCallback(async () => {
    if (!projectId) return;

    const form = workDialog.form || {};
    const code = String(form.code || '').trim();
    const name = String(form.name || '').trim();
    const status = String(form.status || 'ยังไม่เริ่ม');

    if (!code || !name) {
      window.alert('กรุณากรอก รหัส และ ชื่อ Work');
      return;
    }

    setWorkDialog((prev) => ({ ...prev, saving: true }));

    try {
      const budget_amount = Number(form.budget_amount || 0);
      const payload = {
        code,
        name,
        status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget_amount: Number.isFinite(budget_amount) ? budget_amount : 0,
      };

      if (workDialog.mode === 'edit' && form.id) {
        const { error } = await supabase.from('tpr_workstreams').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tpr_workstreams').insert({ project_id: projectId, ...payload });
        if (error) throw error;
      }

      closeWorkDialog();
      await reloadWorkstreams();
    } catch (e) {
      console.error('saveWorkDialog error:', e);
      window.alert(`บันทึกล้มเหลว: ${String(e?.message || e)}`);
      setWorkDialog((prev) => ({ ...prev, saving: false }));
    }
  }, [closeWorkDialog, projectId, reloadWorkstreams, workDialog.form, workDialog.mode]);

  const handleDeleteWork = React.useCallback(
    async (row) => {
      const id = row?.id || null;
      const label = row?.name || row?.code || '';
      if (!id) return;

      const ok = window.confirm(`ต้องการลบ Work "${label}" ใช่หรือไม่?`);
      if (!ok) return;

      try {
        const { error } = await supabase
          .from('tpr_workstreams')
          .update({ deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        await reloadWorkstreams();
      } catch (e) {
        console.error('deleteWork error:', e);
        window.alert(`ลบไม่สำเร็จ: ${String(e?.message || e)}`);
      }
    },
    [reloadWorkstreams]
  );

  const handleOpenSubworksTab = React.useCallback(
    (row) => {
      const payload = {
        toTab: 'subwork',
        projectId: project?.id ?? null,
        project: project || null,
        workstreamId: row?.id ?? null,
        workstream: row || null,
      };

      try {
        onGoWork?.(payload);
      } catch {
        try {
          onGoWork?.();
        } catch {
          // ignore
        }
      }
    },
    [onGoWork, project]
  );

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!projectId) return;

      if (alive) {
        setKpi((prev) => ({
          ...prev,
          loading: true,
          signalsLoading: true,
          error: null,
          status: project?.status || prev.status,
        }));
      }

      try {
        // 2) Progress (from workstreams)
        const progressRes = await Projects.getProgressFromWorkstreams(supabase, projectId);

        // derive project status from workstreams progress
        const derivedStatus = Projects.deriveProjectStatusFromWorkstreams({
          progressPct: Number(progressRes?.pct || 0),
          total: Number(progressRes?.total || 0),
        });

        // 3) WIP (from workstreams)
        const wipRes = await Projects.getWipFromWorkstreams(supabase, projectId);

        // 4) AR
        let arRes = null;
        try {
          arRes = await Projects.getArFromInvoices(supabase, projectId);
        } catch (e) {
          const msg = String(e?.message || '');
          if (msg.toLowerCase().includes('tpr_invoice_payments') || msg.toLowerCase().includes('relation')) {
            const { data: invRows, error: invErr } = await supabase
              .from('tpr_invoices')
              .select('total_amount')
              .eq('project_id', projectId)
              .not('status', 'eq', 'DRAFT');

            if (invErr) throw invErr;

            const invoiceTotal = (invRows || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
            arRes = {
              ar: invoiceTotal,
              invoiceTotal,
              receivedTotal: 0,
              invoiceCount: (invRows || []).length,
            };
          } else {
            throw e;
          }
        }

        // ✅ Progress vs Budget Used (from workstreams)
        let pvRes = null;
        try {
          pvRes = await Projects.getProgressVsBudgetFromWorkstreams(supabase, projectId);
        } catch {
          pvRes = null;
        }

        // 新: workstreams summary + line series (centralized helpers)
        let wsSummary = null;
        let wsLine = null;
        try {
          wsSummary = await Projects.getWorkstreamsSummary(supabase, projectId);
        } catch {
          wsSummary = null;
        }

        try {
          wsLine = await Projects.getWorkstreamsLineSeries(supabase, projectId);
        } catch {
          wsLine = null;
        }

        if (!alive) return;
        try {
          setWorkSummary(wsSummary);
          setWorkLine(wsLine);
        } catch {
          // ignore
        }

        // ✅ Signals (reuse wipRes/pvRes เพื่อลด query ซ้ำ)
        let signals = [];
        try {
          signals = await Projects.getSignalsForProject(supabase, projectId, {
            daysNoTimesheetApproved: 7,
            wipRes,
            pvRes,
          });
        } catch (e) {
          signals = [
            {
              level: 'INFO',
              key: 'SIGNAL_LOAD_ERROR',
              title: 'โหลดสัญญาณไม่สำเร็จ',
              detail: String(e?.message || 'SIGNAL_LOAD_ERROR'),
            },
          ];
        }

        if (!alive) return;

        setKpi((prev) => ({
          ...prev,
          loading: false,
          error: null,
          status: derivedStatus || project?.status || prev.status,

          progressPct: clamp(Number(progressRes?.pct || 0), 0, 100),
          progressDone: Number(progressRes?.done || 0),
          progressTotal: Number(progressRes?.total || 0),

          wip: Number(wipRes?.wip || 0),
          wipHoursTotal: Number(wipRes?.hoursTotal || 0),

          ar: Number(arRes?.ar || 0),
          invoiceTotal: Number(arRes?.invoiceTotal || 0),
          receivedTotal: Number(arRes?.receivedTotal || 0),

          pv_progressPct: clamp(Number(pvRes?.progressPct || 0), 0, 100),
          pv_usedPct: clamp(Number(pvRes?.usedPct || 0), 0, 100),
          pv_usedAmount: Number(pvRes?.usedAmount || 0),
          pv_budgetTotal: Number(pvRes?.budgetTotal || 0),
          pv_deltaPct: Number(pvRes?.deltaPct ?? 0),
          pv_health: pvRes?.health || null,

          signalsLoading: false,
          signals: Array.isArray(signals) ? signals : [],
        }));
      } catch (e) {
        if (!alive) return;
        setKpi((prev) => ({
          ...prev,
          loading: false,
          signalsLoading: false,
          error: e?.message || 'LOAD_KPI_ERROR',
          status: project?.status || prev.status,
        }));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [projectId, project?.status]);

  // workLine chart options & series (memoized)
  const workLineSeries = React.useMemo(() => {
    try {
      return Array.isArray(workLine?.series) ? workLine.series : [];
    } catch {
      return [];
    }
  }, [workLine]);

  

  const wsCategories = React.useMemo(() => {
    try {
      const rows = Array.isArray(workstreamsState.rows) ? workstreamsState.rows : [];
      if (rows.length) return rows.map((_, i) => `W-${i + 1}`);
      if (Array.isArray(workLine?.categories) && workLine.categories.length) return workLine.categories.map((_, i) => `W-${i + 1}`);
      return [];
    } catch {
      return [];
    }
  }, [workstreamsState.rows, workLine]);

  const workLineOptions = React.useMemo(() => {
    return {
      chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
      colors: ['#8B5CF6'],
      stroke: { curve: 'smooth' },
      markers: { size: 4 },
      dataLabels: { enabled: false },
      xaxis: { categories: Array.isArray(wsCategories) ? wsCategories : [] },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: { formatter: (v) => `${Math.round(Number(v || 0))}%` },
      },
      tooltip: {
        x: {
          formatter: function (val, opts) {
            try {
              const idx = Number(opts?.dataPointIndex || 0);
              const wlabel = `W-${idx + 1}`;
              const nameFromLine = workLine && workLine.raw && workLine.raw[idx] && workLine.raw[idx].name;
              const nameFromRows = workstreamsState && Array.isArray(workstreamsState.rows) && workstreamsState.rows[idx] && workstreamsState.rows[idx].name;
              const name = nameFromLine || nameFromRows || '';
              return name ? `${wlabel} • ${name}` : wlabel;
            } catch {
              return String(val || '');
            }
          },
        },
        y: { formatter: (v) => `${Math.round(Number(v || 0))}%` },
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3, padding: { top: 6, right: 8, bottom: 6, left: 8 } },
      legend: { show: false },
    };
  }, [workLine, wsCategories, workstreamsState]);

  // display values
  const progressPct = clamp(kpi.progressPct, 0, 100);
  const wip = Number(kpi.wip || 0);
  const ar = Number(kpi.ar || 0);

  const wipPct = budgetTotalNum > 0 ? clamp(Math.round((wip / budgetTotalNum) * 100), 0, 100) : 0;
  const arPct = budgetTotalNum > 0 ? clamp(Math.round((ar / budgetTotalNum) * 100), 0, 100) : 0;

  // If central workSummary present, prefer those display values
  const displayProgressPct = workSummary ? clamp(Number(workSummary.progressPct || 0), 0, 100) : progressPct;
  const displayProgressDone = workSummary ? Number(workSummary.doneCount || 0) : Number(kpi.progressDone || 0);
  const displayProgressTotal = workSummary ? Number(workSummary.totalCount || 0) : Number(kpi.progressTotal || 0);

  const displayWipAmount = workSummary ? Number(workSummary.spentTotal || 0) : wip;
  const displayWipPct = workSummary && Number(workSummary.budgetTotal || 0) > 0
    ? clamp(Math.round((displayWipAmount / Number(workSummary.budgetTotal || 0)) * 100), 0, 100)
    : wipPct;

  const pvProgressPct = clamp(kpi.pv_progressPct, 0, 100);
  const pvUsedPct = clamp(kpi.pv_usedPct, 0, 100);

  const pvSeries = React.useMemo(
    () => [{ name: 'สัดส่วน', data: [pvProgressPct, pvUsedPct] }],
    [pvProgressPct, pvUsedPct]
  );

  const pvOptions = React.useMemo(() => {
    return {
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          barHeight: '55%',
          borderRadius: 4,
        },
      },
      colors: ['#08d84c', '#ff4059'],
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: 900 },
        formatter: (val) => `${Math.round(Number(val || 0))}%`,
      },
      xaxis: {
        categories: ['ความคืบหน้า', 'งบที่ใช้ไป'],
        min: 0,
        max: 100,
        labels: { formatter: (val) => `${Math.round(Number(val || 0))}%` },
      },
      yaxis: { labels: { style: { fontWeight: 800 } } },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3, padding: { top: 0, right: 8, bottom: 0, left: 8 } },
      legend: { show: false },
      tooltip: { y: { formatter: (val) => `${Math.round(Number(val || 0))}%` } },
    };
  }, []);

  // ✅ อย่าไปยุ่ง border ของระบบ: คงเดิม
  const kpiPaperSx = {
    p: { xs: 2, sm: 2.5 },
    border: '1px solid',
    borderColor: 'grey.200',
    boxShadow: 'none',
  };

  const actionBtnSx = {
    borderRadius: 2,
    boxShadow: 'none',
    textTransform: 'none',
    fontWeight: 500,
  };

  if (!project) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          แดชบอร์ดโครงการ
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          กรุณาเลือกโครงการจากแท็บ "ข้อมูลโครงการ" ก่อน
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>
      {/* ===== breadcrumbs ===== */}
      {kpi.loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 1 }}>
          <Skeleton variant="text" width={64} height={18} />
          <Skeleton variant="text" width={10} height={18} />
          <Skeleton variant="text" width={90} height={18} />
          <Skeleton variant="text" width={10} height={18} />
          <Skeleton variant="text" width={72} height={18} />
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 1 }}>
          <Button
            onClick={handleBackClick}
            variant="text"
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            โครงการ
          </Button>
          <Box sx={{ opacity: 0.55, color: 'text.secondary' }}>›</Box>
          <Typography variant="body2" color="text.secondary" title={projectName || ''} sx={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {truncateText(projectName, 40) || '-'}
          </Typography>
          <Box sx={{ opacity: 0.55, color: 'text.secondary' }}>·</Box>
          <Typography variant="body2" color="text.secondary">
            แดชบอร์ด
          </Typography>
        </Stack>
      )}

      {/* ===== Title + Actions ===== */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}
      >
        {kpi.loading ? (
          <Skeleton variant="text" width={340} height={40} />
        ) : (
          <Typography
            variant="h4"
            sx={{
              lineHeight: 1.15,
              mt: 0.25,
              minWidth: 0,
              wordBreak: 'break-word',
            }}
          >
            {projectName || '-'}
          </Typography>
        )}

        {kpi.loading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Skeleton variant="rectangular" width={72} height={36} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={96} height={36} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleEditClick}
              sx={{
                ...actionBtnSx,
                borderColor: 'grey.200',
                color: 'text.primary',
                '&:hover': { borderColor: 'grey.300', bgcolor: 'grey.50', boxShadow: 'none' },
              }}
              startIcon={<OfflineBoltIcon />}
            >
              แก้ไขข้อมูล
            </Button>

            <Tooltip title="สัญญาณแจ้งเตือน">
              <IconButton
                size="small"
                onClick={handleNotifOpen}
                aria-label="แจ้งเตือน"
                sx={{ ml: 0.5 }}
              >
                <Badge badgeContent={notifCount} color="error">
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<CheckCircleRoundedIcon />}
              onClick={handleGoWorkClick}
              sx={{
                ...actionBtnSx,
                bgcolor: '#ff4059',
                color: '#ffffff',
                '&:hover': { bgcolor: '#e63a52', boxShadow: 'none' },
                display: 'none',
              }}
            >
              เข้า WORK
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Notification popover (bell) */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={handleNotifClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 1, minWidth: 320 }}>
          {Array.isArray(kpi.signals) && kpi.signals.length ? (
            <List dense>
              {kpi.signals.map((s, idx) => {
                const level = String(s?.level || 'INFO').toUpperCase();
                const icon =
                  level === 'RISK' ? (
                    <ErrorRoundedIcon sx={{ color: '#ff4059' }} />
                  ) : level === 'WARN' ? (
                    <WarningAmberRoundedIcon sx={{ color: '#fdca01' }} />
                  ) : (
                    <InfoRoundedIcon sx={{ color: 'text.secondary' }} />
                  );

                return (
                  <ListItem key={`${s?.key || idx}-${idx}`} alignItems="flex-start">
                    <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                    <ListItemText
                      primary={s?.title || 'แจ้งเตือน'}
                      secondary={s?.detail || ''}
                      primaryTypographyProps={{ sx: { fontWeight: 800 } }}
                      secondaryTypographyProps={{ sx: { fontSize: 12 } }}
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>ไม่มีสัญญาณผิดปกติ</Typography>
            </Box>
          )}
        </Box>
      </Popover>

      {/* ===== KPI 4 กล่อง ===== */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        {/* สถานะโครงการ */}
        <Paper elevation={0} sx={kpiPaperSx}>
          {kpi.loading ? (
            <>
              <Skeleton variant="text" width={90} height={20} />
              <Skeleton variant="text" width={150} height={36} sx={{ mt: 0.5 }} />
              <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                สถานะโครงการ
              </Typography>
              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 900,
                  mt: 0.5,
                  color: '#ff4059',
                  lineHeight: 1.15,
                }}
              >
                {Projects.statusThFromDerived(kpi.status)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                *อัปเดต: {String(updatedAt).slice(0, 10)}
              </Typography>
            </>
          )}
        </Paper>

        {/* ความคืบหน้า */}
        <Paper elevation={0} sx={kpiPaperSx}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {kpi.loading ? (
                <>
                  <Skeleton variant="text" width={90} height={20} />
                  <Skeleton variant="text" width={90} height={36} sx={{ mt: 0.5 }} />
                  <Skeleton variant="text" width={140} height={16} sx={{ mt: 0.5 }} />
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    ความคืบหน้า
                  </Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, color: '#08d84c', lineHeight: 1.15 }}>
                        {`${displayProgressPct}%`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`*${displayProgressDone}/${displayProgressTotal} Work`}
                      </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
                  <MiniBars variant="up" color="#08d84c" values={[displayProgressPct / 140, displayProgressPct / 115, displayProgressPct / 100]} height={34} />
            )}
          </Box>
        </Paper>

        {/* WIP */}
        <Paper elevation={0} sx={kpiPaperSx}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {kpi.loading ? (
                <>
                  <Skeleton variant="text" width={40} height={20} />
                  <Skeleton variant="text" width={120} height={36} sx={{ mt: 0.5 }} />
                  <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    WIP
                  </Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, color: '#fdca01', lineHeight: 1.15 }}>
                      {formatMoneyTHB(displayWipAmount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Number(workSummary?.budgetTotal || 0) > 0 ? `*${displayWipPct}% ของงบ` : (displayWipAmount > 0 ? '*ต้องติดตาม' : '*—')}
                    </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
                <MiniBars variant="wave" color="#fdca01" values={[displayWipPct / 140, displayWipPct / 115, displayWipPct / 100]} height={34} />
            )}
          </Box>
        </Paper>

        {/* AR */}
        <Paper elevation={0} sx={kpiPaperSx}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {kpi.loading ? (
                <>
                  <Skeleton variant="text" width={34} height={20} />
                  <Skeleton variant="text" width={120} height={36} sx={{ mt: 0.5 }} />
                  <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    AR (ลูกหนี้การค้า)
                  </Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, color: '#8B5CF6', lineHeight: 1.15 }}>
                    {formatMoneyTHB(ar)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {budgetTotalNum > 0 ? `*${arPct}% ของงบ` : ar > 0 ? '*ต้องติดตาม' : '*ปกติ'}
                  </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
              <MiniBars variant="spike" color="#8B5CF6" values={[arPct / 140, arPct / 115, arPct / 100]} height={34} />
            )}
          </Box>
        </Paper>
      </Box>

      {/* ✅ แถวใหม่: ซ้าย=Progress vs Used | ขวา=Signal/Alert (สูงเท่ากัน) */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'stretch',
          flexDirection: { xs: 'column', md: 'row' },
          mb: 2,
        }}
      >
        {/* ซ้าย: เทียบความคืบหน้า vs งบที่ใช้ไป (ซ่อนไว้ชั่วคราว) */}
        {SHOW_PV ? (
          <Paper
              elevation={0}
              sx={{
                ...kpiPaperSx,
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
            {kpi.loading ? (
              <>
                <Skeleton variant="text" width={210} height={20} />
                <Skeleton variant="text" width={320} height={16} sx={{ mt: 0.5 }} />
                <Skeleton variant="rectangular" height={10} sx={{ mt: 1, borderRadius: 999 }} />
                <Skeleton variant="rectangular" height={10} sx={{ mt: 1, borderRadius: 999 }} />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Skeleton variant="text" width={160} height={16} />
                  <Skeleton variant="text" width={120} height={16} />
                </Stack>
              </>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    ความคืบหน้า vs งบที่ใช้ไป
                  </Typography>
                  <Typography
                    component="div"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: kpi.pv_health === 'RISK' ? '#ff4059' : kpi.pv_health === 'WARN' ? '#fdca01' : '#08d84c',
                    }}
                  >
                    {kpi.pv_health === 'RISK' ? (
                      <ErrorRoundedIcon sx={{ fontSize: 18 }} />
                    ) : kpi.pv_health === 'WARN' ? (
                      <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                    )}

                    {kpi.pv_health === 'RISK' ? 'เสี่ยง' : kpi.pv_health === 'WARN' ? 'ต้องติดตาม' : 'คุมงบดี'}
                  </Typography>
                </Stack>

                <Box sx={{ width: '100%', overflowX: 'hidden' }}>
                  <ReactApexChart options={pvOptions} series={pvSeries} type="bar" height={150} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    
                  </Typography>
                </Box>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {`ส่วนต่าง (ความคืบหน้า - งบที่ใช้ไป) ${
                      Number.isFinite(Number(kpi.pv_deltaPct))
                        ? `${kpi.pv_deltaPct >= 0 ? '+' : ''}${kpi.pv_deltaPct}%`
                        : '—'
                    }`}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color:
                        kpi.pv_health === 'RISK' ? '#ff4059' : kpi.pv_health === 'WARN' ? '#fdca01' : '#08d84c',
                    }}
                  >
                  </Typography>
                </Stack>
              </>
            )}
          </Paper>
        ) : null}

        {/* ขวา: แนวโน้มความคืบหน้า Work (แทนที่สัญญาณแจ้งเตือน) */}
        <Paper
          elevation={0}
          sx={{
            ...kpiPaperSx,
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {(!workLine && !workSummary) ? (
            <>
              <Skeleton variant="text" width={180} height={20} />
              <Skeleton variant="text" width={240} height={16} sx={{ mt: 0.5 }} />
              <Skeleton variant="rectangular" height={12} sx={{ mt: 1, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={12} sx={{ mt: 1, borderRadius: 1 }} />
            </>
          ) : (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  แนวโน้มความคืบหน้า Work
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {workSummary ? `แสดง ${workSummary.totalCount} Work` : '—'}
                </Typography>
              </Stack>

              <Box sx={{ mt: 1, width: '100%' }}>
                {workSummary && Number(workSummary.totalCount || 0) > 0 ? (
                  <ReactApexChart options={workLineOptions} series={workLineSeries} type="line" height={240} />
                ) : (
                  <Box sx={{ py: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>ยังไม่มี Work</Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* ===== ✅ Workstreams Box (ตามภาพ) ===== */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        {workstreamsState.loading ? (
          <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="text" width={160} height={22} />
              <Skeleton variant="text" width={200} height={12} sx={{ mt: 0.5 }} />
            </Box>
            <Box>
              <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 2 }} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>
                รายการ Work
              </Typography>
              <Typography variant="caption" color="text.secondary">
                กดแถวเพื่อเข้าดูรายละเอียด Work
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>

              <Tooltip title="เพิ่ม Work">
                <IconButton
                  onClick={openCreateWorkDialog}
                  sx={{
                    ...actionBtnSx,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    color: 'text.primary',
                    bgcolor: 'transparent',
                    '&:hover': { borderColor: 'grey.300', bgcolor: 'grey.50' },
                  }}
                  aria-label="เพิ่ม Work"
                >
                  <AddCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}

        <Divider />

        {workstreamsState.loading ? (
          <TableContainer sx={{ width: '100%', px: 2, py: 1 }}>
            <Table sx={{ '& th, & td': { py: 1, px: 1.5, borderBottom: 'none' } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'transparent' }}>
                  <TableCell><Skeleton variant="text" width={48} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" width={90} /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" width={90} /></TableCell>
                  <TableCell sx={{ textAlign: 'center' }}><Skeleton variant="text" width={40} /></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`hdr-sk-${i}`}>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Skeleton variant="text" width={48} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={240} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={92} height={24} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={140} height={10} />
                      <Skeleton variant="text" width={40} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Skeleton variant="text" width={120} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Skeleton variant="text" width={90} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Skeleton variant="text" width={40} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <WorkstreamsTable
            loading={workstreamsState.loading}
            rows={workstreamsState.rows}
            onRowClick={handleOpenSubworksTab}
            onEditRow={openEditWorkDialog}
            onDeleteRow={handleDeleteWork}
            onGoWorkRow={handleOpenSubworksTab}
          />
        )}
      </Paper>

      {/* สมาชิกในโครงการ (แถวแนวนอน ใต้รายการ Work) */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          boxShadow: 'none',
          overflow: 'hidden',
          mt: 2,
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700 }}>สมาชิก</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {membersState.loading ? '...' : `จำนวน ${Array.isArray(membersState.rows) ? membersState.rows.length : 0} คน`}
            </Typography>
          </Box>

          <Box sx={{ mt: 1 }} />

          {membersState.loading ? (
            <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', whiteSpace: 'nowrap', px: 0.5, py: 0.5 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Box key={`m-sk-${i}`} sx={{ display: 'inline-block', width: 76, textAlign: 'center' }}>
                  <Skeleton variant="circular" width={48} height={48} />
                  <Skeleton variant="text" width={56} height={12} sx={{ mt: 0.5 }} />
                </Box>
              ))}
            </Box>
          ) : Array.isArray(membersState.rows) && membersState.rows.length ? (
            <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap', px: 0.5, py: 0.5 }}>
              <Stack direction="row" spacing={1} sx={{ display: 'inline-flex' }}>
                {membersState.rows.map((m) => (
                  <Box key={m.employee_id} sx={{ display: 'inline-block', width: 76, textAlign: 'center' }}>
                    <Avatar
                      src={m.image_url || ''}
                      alt={m.nickname || ''}
                      sx={{ width: 44, height: 44, mx: 'auto' }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', fontWeight: 700, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {m.nickname}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              <Typography variant="caption" color="text.secondary">ยังไม่มีสมาชิกในโครงการ</Typography>
            </Box>
          )}
        </Box>
      </Paper>

        <Dialog open={workDialog.open} onClose={closeWorkDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {workDialog.mode === 'edit' ? 'แก้ไข Work' : 'เพิ่ม Work'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {workDialog.mode === 'create' ? (
              <TextField
                size="small"
                label="รหัส Work"
                value={workDialog.form.code}
                onChange={(e) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, code: e.target.value } }))}
                placeholder="เช่น WS-01"
                fullWidth
                required
              />
            ) : null}
            <TextField
              size="small"
              label="ชื่อ Work"
              value={workDialog.form.name}
              onChange={(e) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
              fullWidth
              required
            />
            {workDialog.mode === 'create' ? (
              <TextField
                size="small"
                select
                label="สถานะ"
                value={workDialog.form.status}
                onChange={(e) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
                fullWidth
              >
                {['ยังไม่เริ่ม', 'ทำอยู่', 'เสี่ยง', 'ล่าช้า', 'เสร็จแล้ว'].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Stack direction="column" spacing={1.25}>
                <DatePicker
                  label="วันที่เริ่ม"
                  value={workDialog.form.start_date ? dayjs(workDialog.form.start_date) : null}
                  onChange={(v) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, start_date: v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '' } }))}
                  slotProps={{ textField: { size: 'small' } }}
                  sx={{ width: '100%' }}
                />
                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={workDialog.form.end_date ? dayjs(workDialog.form.end_date) : null}
                  onChange={(v) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, end_date: v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '' } }))}
                  slotProps={{ textField: { size: 'small' } }}
                  sx={{ width: '100%' }}
                />
              </Stack>
            </LocalizationProvider>
            <TextField
              size="small"
              label="งบประมาณ"
              type="number"
              value={workDialog.form.budget_amount}
              onChange={(e) => setWorkDialog((prev) => ({ ...prev, form: { ...prev.form, budget_amount: e.target.value } }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={closeWorkDialog} disabled={workDialog.saving} sx={{ color: '#000', textTransform: 'none' }} size="medium">
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveWorkDialog}
            disabled={workDialog.saving}
            sx={{ textTransform: 'none' }}
            startIcon={<SaveIcon />}
            size="medium"
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {kpi.loading ? (
        <Skeleton variant="text" width={260} height={16} />
      ) : kpi.error ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          *คำนวณ KPI ไม่สำเร็จ: {String(kpi.error)}
        </Typography>
      ) : null}
    </Box>
  );
}
