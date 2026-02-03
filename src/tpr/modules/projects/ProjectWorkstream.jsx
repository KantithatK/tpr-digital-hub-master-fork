// ===== src/tpr/modules/projects/ProjectWorkstream.jsx (แทนทั้งไฟล์) =====
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';

import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';

import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import ReactApexChart from 'react-apexcharts';

import * as Workstream from '../../functions/workstream';

const BRAND = '#ff4059';

// use Thai locale for datepickers
try {
  dayjs.locale && dayjs.locale('th');
} catch {
  /* ignore */
}

// status -> color map (module-level so it's stable for hooks)
const STATUS_COLORS = {
  'ยังไม่เริ่ม': '#64748B',
  'ทำอยู่': '#fdca01',
  'เสี่ยง': '#ff4059',
  'ล่าช้า': '#8B5CF6',
  'เสร็จแล้ว': '#08d84c',
};

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function fmtThaiRange(startISO, endISO) {
  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  const a = fmt(startISO);
  const b = fmt(endISO);
  if (a && b) return `${a}–${b}`;
  return a || b || '';
}

function compactPhaseStatus(status) {
  const s = String(status || '').trim();
  if (!s) return 'ยังไม่เริ่ม';
  if (s === 'Planning') return 'ยังไม่เริ่ม';
  return s;
}

function parseISODateOnlyToMs(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function validatePlannedHoursText(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  if (!Number.isFinite(n)) return 'กรุณากรอกชั่วโมงเป็นตัวเลข';
  if (n <= 0) return 'ชั่วโมงต้องมากกว่า 0';
  return '';
}

function toDayjsDate(iso) {
  try {
    const s = String(iso || '').trim();
    if (!s) return null;
    const d = dayjs(s);
    if (!d || !d.isValid || !d.isValid()) return null;
    return d.startOf('day');
  } catch {
    return null;
  }
}

function validatePhaseDates({ startISO, endISO, workStartISO, workEndISO }) {
  const errors = { start_date: '', end_date: '' };

  const start = String(startISO || '').trim();
  const end = String(endISO || '').trim();
  const workStart = String(workStartISO || '').trim();
  const workEnd = String(workEndISO || '').trim();

  // Required (Phase always needs start/end)
  if (!start) errors.start_date = 'กรุณาเลือกวันที่เริ่ม';
  if (!end) errors.end_date = 'กรุณาเลือกวันที่สิ้นสุด';

  // Enforce within workstream range (must have workstream bounds)
  if (!errors.start_date && !errors.end_date) {
    if (start && end) {
      if (!workStart || !workEnd) {
        // Workstream has no dates -> cannot validate or allow creating phases
        if (!workStart) errors.start_date = errors.start_date || 'Work ยังไม่มีวันที่เริ่ม';
        if (!workEnd) errors.end_date = errors.end_date || 'Work ยังไม่มีวันที่สิ้นสุด';
      } else {
        const res = Workstream.validatePhaseRangeWithinWorkstream({
          start_date: start,
          end_date: end,
          work_start: workStart,
          work_end: workEnd,
        });
        if (!res?.ok) {
          if (res?.errorKey === 'START_BEFORE_BOUNDARY') errors.start_date = res.messageTh;
          else errors.end_date = res.messageTh;
        }
      }
    }
  }

  return errors;
}

function formatNumber(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

function KpiTile({ label, value, sub, color }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1,
        px: 1.75,
        py: 1.4,
        minWidth: 0,
        bgcolor: '#fff',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.15,
          fontSize: 28,
          fontWeight: 950,
          lineHeight: 1.05,
          color: color || 'text.primary',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

// ===== Phase UI helpers =====
function StatusPill({ status }) {
  const sRaw = String(status || '');
  const s = sRaw.toLowerCase();

  const map = {
    เสร็จแล้ว: { label: 'เสร็จแล้ว', dot: '#08d84c', bg: '#ffffff', border: '#08d84c', text: '#166534' },
    ล่าช้า: { label: 'ล่าช้า', dot: '#8B5CF6', bg: '#ffffff', border: '#8B5CF6', text: '#9f1239' },
    เสี่ยง: { label: 'เสี่ยง', dot: '#ff4059', bg: '#ffffff', border: '#ff4059', text: '#92400e' },
    ยังไม่เริ่ม: { label: 'ยังไม่เริ่ม', dot: '#64748B', bg: '#ffffff', border: '#64748B', text: '#475569' },
    ทำอยู่: { label: 'ทำอยู่', dot: '#fdca01', bg: '#ffffff', border: '#fdca01', text: '#5b21b6' },
    planning: { label: 'ยังไม่เริ่ม', dot: '#64748B', bg: '#ffffff', border: '#64748B', text: '#475569' },

    done: { label: 'เสร็จแล้ว', dot: '#08d84c', bg: '#ffffff', border: '#08d84c', text: '#166534' },
    delayed: { label: 'ล่าช้า', dot: '#8B5CF6', bg: '#ffffff', border: '#8B5CF6', text: '#9f1239' },
    risk: { label: 'เสี่ยง', dot: '#ff4059', bg: '#ffffff', border: '#ff4059', text: '#92400e' },
    pending: { label: 'ยังไม่เริ่ม', dot: '#64748B', bg: '#ffffff', border: '#64748B', text: '#475569' },
    doing: { label: 'ทำอยู่', dot: '#fdca01', bg: '#ffffff', border: '#fdca01', text: '#5b21b6' },
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
      <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: cfg.dot, lineHeight: 1 }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function PhasesTable({ loading, rows, onRowClick, onEditRow, onDeleteRow }) {
  const list = Array.isArray(rows) ? rows : [];

  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [menuRow, setMenuRow] = React.useState(null);

  const handleOpenMenu = React.useCallback((e, r) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuRow(r || null);
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setMenuAnchor(null);
    setMenuRow(null);
  }, []);

  // ความคืบหน้า phase: ไม่มี field progress ใน phases -> ใช้ heuristic จาก status
  const statusToProgress = (status) => {
    if (status === 'เสร็จแล้ว') return 100;
    if (status === 'ทำอยู่') return 55;
    if (status === 'เสี่ยง') return 45;
    if (status === 'ล่าช้า') return 35;
    return 0;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer sx={{ width: '100%' }}>
        <Table size="small" sx={{ '& th, & td': { py: 1, px: 1.5, borderBottom: 'none' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'transparent' }}>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 86 }}>ลำดับ</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ชื่อเฟส</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 130 }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 170 }}>ความคืบหน้า</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>ช่วงเวลา</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', width: 90 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton variant="text" width={46} />
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
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                    <Skeleton variant="text" width={90} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                </TableRow>
              ))
              : list.map((r, idx) => {
                const key = r.id || r.code || idx;
                const pct = clamp(statusToProgress(r.status), 0, 100);
                const seq = r?.seq || `P-${idx + 1}`;

                return (
                  <TableRow
                    key={key}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      try {
                        onRowClick?.(r);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 14 }}>
                        {seq}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 14 }}>
                        {r.name || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusPill status={r.status || 'ยังไม่เริ่ม'} />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 8,
                              borderRadius: 99,
                              bgcolor: '#e2e8f0',
                              '& .MuiLinearProgress-bar': { bgcolor: '#08d84c' },
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500, minWidth: 40, textAlign: 'right' }}>
                          {`${Math.round(pct)}%`}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>{r.dateRange || '-'}</TableCell>

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

            {!loading && list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 900 }}></Typography>
                    <Typography variant="caption" color="text.secondary">

                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

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
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> แก้ไข
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
    </Box>
  );
}

export default function ProjectWorkstream({ project, workstream, onBack, onGoWork, onNavProjects, onNavProject }) {
  const CHART_COLORS = ['#64748B', '#fdca01', '#ff4059', '#8B5CF6', '#08d84c'];
  // navigation pattern ให้เหมือนของเดิม
  const handleBackClick = React.useCallback(() => {
    try {
      onBack?.();
    } catch {
      /* ignore */
    }
  }, [onBack]);

  const projectId = project?.id || null;
  const projectName = project?.name_th || project?.name || project?.name_en || '';

  const wsId = workstream?.id || null;
  const wsCode = workstream?.code || '';
  const wsName = workstream?.name || '';

  const wsStartISO = workstream?.start_date || '';
  const wsEndISO = workstream?.end_date || '';
  const wsStartDay = React.useMemo(() => toDayjsDate(wsStartISO), [wsStartISO]);
  const wsEndDay = React.useMemo(() => toDayjsDate(wsEndISO), [wsEndISO]);

  // ===== phases list state =====
  const [phasesState, setPhasesState] = React.useState(() => ({
    loading: true,
    total: 0,
    rows: [],
  }));

  const [phaseDialog, setPhaseDialog] = React.useState(() => ({
    open: false,
    mode: 'create', // create | edit
    saving: false,
    autoCalcDirty: false,
    plannedHoursAuto: false,
    form: {
      id: null,
      code: '',
      name: '',
      status: 'ยังไม่เริ่ม',
      start_date: '',
      end_date: '',
      planned_hours: '',
      fee: '',
      note: '',
    },
    errors: {
      start_date: '',
      end_date: '',
      planned_hours: '',
    },
  }));

  const phaseAutoCalcSeqRef = React.useRef(0);
  const phaseInverseCalcSeqRef = React.useRef(0);

  const [deleteDialog, setDeleteDialog] = React.useState(() => ({
    open: false,
    row: null,
    deleting: false,
  }));

  const [alertAnchor, setAlertAnchor] = React.useState(null);

  const openAlerts = React.useCallback((e) => {
    setAlertAnchor(e.currentTarget);
  }, []);
  const closeAlerts = React.useCallback(() => {
    setAlertAnchor(null);
  }, []);

  // small wrapper to match project-wide pattern
  const handleNotifOpen = React.useCallback((e) => {
    try {
      openAlerts(e);
    } catch {
      /* ignore */
    }
  }, [openAlerts]);

  const reloadPhases = React.useCallback(async () => {
    if (!projectId) return;

    try {
      setPhasesState({ loading: true, total: 0, rows: [] });

      // หน่วงนิดนึงให้ skeleton สวย (pattern เดิม)
      await new Promise((r) => setTimeout(r, 200));

      const phaseRows = await Workstream.listPhases({ projectId, workstreamId: wsId });

      const mapped = (Array.isArray(phaseRows) ? phaseRows : []).map((r, idx) => ({
        ...r,
        seq: `P-${idx + 1}`,
        status: compactPhaseStatus(r?.status),
        planned_hours: r?.planned_hours != null ? Number(r.planned_hours || 0) : 0,
        fee: r?.fee != null ? Number(r.fee || 0) : 0,
        dateRange: fmtThaiRange(r?.start_date, r?.end_date),
      }));

      setPhasesState({ loading: false, total: mapped.length, rows: mapped });
    } catch (e) {
      console.error('reloadPhases error:', e);
      setPhasesState({ loading: false, total: 0, rows: [] });
    }
  }, [projectId, wsId]);

  React.useEffect(() => {
    reloadPhases();
  }, [reloadPhases]);

  // ensure page is scrolled to top when this view loads or when project/workstream changes
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch {
      /* ignore */
    }
  }, [projectId, wsId]);

  const openCreatePhaseDialog = React.useCallback(() => {
    setPhaseDialog({
      open: true,
      mode: 'create',
      saving: false,
      autoCalcDirty: false,
      plannedHoursAuto: false,
      form: {
        id: null,
        code: Workstream.genPhaseCode(),
        name: '',
        status: 'ยังไม่เริ่ม',
        start_date: '',
        end_date: '',
        planned_hours: '',
        fee: '',
        note: '',
      },
      errors: { start_date: '', end_date: '', planned_hours: '' },
    });
  }, []);

  const openEditPhaseDialog = React.useCallback((row) => {
    setPhaseDialog({
      open: true,
      mode: 'edit',
      saving: false,
      autoCalcDirty: false,
      // In edit mode, treat existing planned_hours as derived unless user edits it.
      // This lets start/end changes re-calc planned_hours automatically.
      plannedHoursAuto: true,
      form: {
        id: row?.id || null,
        code: row?.code || '',
        name: row?.name || '',
        status: row?.status || 'ยังไม่เริ่ม',
        start_date: row?.start_date || '',
        end_date: row?.end_date || '',
        planned_hours: row?.planned_hours != null ? String(Number(row.planned_hours || 0)) : '',
        fee: row?.fee != null ? String(Number(row.fee || 0)) : '',
        note: row?.note || '',
      },
      errors: { start_date: '', end_date: '', planned_hours: '' },
    });
  }, []);

  const closePhaseDialog = React.useCallback(() => {
    setPhaseDialog((prev) => ({ ...prev, open: false, saving: false }));
  }, []);

  // Auto-calc end_date when start_date or planned_hours changes (workdays-aware)
  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!phaseDialog.open) return;
      if (!phaseDialog.autoCalcDirty) return;

      const start_date = String(phaseDialog?.form?.start_date || '').trim();
      const planned_hours = String(phaseDialog?.form?.planned_hours ?? '').trim();

      const plannedErr = validatePlannedHoursText(planned_hours);
      if (plannedErr) {
        setPhaseDialog((prev) => ({
          ...prev,
          errors: { ...(prev.errors || {}), planned_hours: plannedErr },
        }));
        return;
      }

      const hoursNum = Number(planned_hours || 0);
      if (!start_date || !Number.isFinite(hoursNum) || hoursNum <= 0) return;

      const boundary_start = wsStartISO || '';
      const boundary_end = wsEndISO || '';
      if (!boundary_start || !boundary_end) return;

      const seq = (phaseAutoCalcSeqRef.current += 1);

      let res;
      try {
        res = await Workstream.calcPhaseEndDateFromPlannedHours({
          supabaseClient: null,
          start_date,
          planned_hours: hoursNum,
          boundary_start,
          boundary_end,
        });
      } catch {
        return;
      }

      if (!alive) return;
      if (seq !== phaseAutoCalcSeqRef.current) return;

      const nextStart = res?.startISO || start_date;
      const nextEnd = res?.endISO || '';

      setPhaseDialog((prev) => {
        const nextForm = { ...prev.form, start_date: nextStart, end_date: nextEnd };
        const nextErrors = validatePhaseDates({
          startISO: nextForm.start_date,
          endISO: nextForm.end_date,
          workStartISO: wsStartISO,
          workEndISO: wsEndISO,
        });

        return {
          ...prev,
          form: nextForm,
          errors: { ...(prev.errors || {}), ...nextErrors, planned_hours: '' },
        };
      });
    }

    run();
    return () => {
      alive = false;
    };
  }, [phaseDialog.autoCalcDirty, phaseDialog.form.planned_hours, phaseDialog.form.start_date, phaseDialog.open, wsEndISO, wsStartISO]);

  // If user sets both start_date and end_date (and planned_hours is empty),
  // compute planned_hours = workdays_between * 8 using calendar overrides.
  React.useEffect(() => {
    let alive = true;

    async function runInv() {
      if (!phaseDialog.open) return;

      const start = String(phaseDialog?.form?.start_date || '').trim();
      const end = String(phaseDialog?.form?.end_date || '').trim();
      const planned = String(phaseDialog?.form?.planned_hours ?? '').trim();
      const plannedAuto = Boolean(phaseDialog?.plannedHoursAuto);

      if (!start || !end) return;
      if (planned && !plannedAuto) return;

      const seq = (phaseInverseCalcSeqRef.current += 1);

      let res;
      try {
        res = await Workstream.calcPhasePlannedHoursFromDates({
          supabaseClient: null,
          start_date: start,
          end_date: end,
        });
      } catch {
        return;
      }

      if (!alive) return;
      if (seq !== phaseInverseCalcSeqRef.current) return;

      const nextPlanned = res?.planned_hours ? String(res.planned_hours) : '';

      setPhaseDialog((prev) => {
        const prevPlanned = String(prev?.form?.planned_hours ?? '').trim();
        if (prevPlanned === nextPlanned && prev?.plannedHoursAuto) return prev;
        return {
          ...prev,
          plannedHoursAuto: true,
          form: { ...prev.form, planned_hours: nextPlanned },
          errors: { ...(prev.errors || {}), planned_hours: '' },
        };
      });
    }

    runInv();
    return () => {
      alive = false;
    };
  }, [phaseDialog.form.end_date, phaseDialog.form.planned_hours, phaseDialog.form.start_date, phaseDialog.open, phaseDialog.plannedHoursAuto]);

  const savePhaseDialog = React.useCallback(async () => {
    if (!projectId) return;

    const form = phaseDialog.form || {};
    const code = String(form.code || '').trim();
    const name = String(form.name || '').trim();
    const status = String(form.status || 'ยังไม่เริ่ม');

    if (!code || !name) {
      window.alert('กรุณากรอก รหัส และ ชื่อเฟส');
      return;
    }

    // Phase requires start/end (and requires workstream bounds)
    if (!wsStartISO || !wsEndISO) {
      window.alert('Work ยังไม่มีช่วงวันที่เริ่ม/สิ้นสุด จึงไม่สามารถสร้าง/แก้ไข Phase ได้');
      return;
    }

    if (!form.start_date) {
      setPhaseDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), start_date: 'กรุณาเลือกวันที่เริ่ม' } }));
      return;
    }
    if (!form.end_date) {
      setPhaseDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), end_date: 'กรุณาเลือกวันที่สิ้นสุด' } }));
      return;
    }

    const plannedErr = validatePlannedHoursText(form.planned_hours);
    if (plannedErr) {
      setPhaseDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), planned_hours: plannedErr } }));
      return;
    }

    // validate dates against workstream range (only when workstream start/end exist)
    const dateErrors = validatePhaseDates({
      startISO: form.start_date,
      endISO: form.end_date,
      workStartISO: wsStartISO,
      workEndISO: wsEndISO,
    });

    if (dateErrors.start_date || dateErrors.end_date) {
      setPhaseDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), ...dateErrors } }));
      return;
    }

    const rangeRes = Workstream.validatePhaseRangeWithinWorkstream({
      start_date: form.start_date,
      end_date: form.end_date,
      work_start: wsStartISO,
      work_end: wsEndISO,
    });

    if (!rangeRes?.ok) {
      window.alert(rangeRes?.messageTh || 'ช่วงวันที่ไม่ถูกต้อง');
      return;
    }

    setPhaseDialog((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        project_id: projectId,
        workstream_id: wsId || null,
        workstream_code: wsCode || null,
        code,
        name,
        status,
        start_date: form.start_date,
        end_date: form.end_date,
        planned_hours: Number(form.planned_hours || 0),
        fee: Number(form.fee || 0),
        note: form.note || null,
      };

      if (phaseDialog.mode === 'edit' && form.id) {
        await Workstream.updatePhase(form.id, payload);
      } else {
        await Workstream.createPhase(payload);
      }

      closePhaseDialog();
      await reloadPhases();
    } catch (e) {
      console.error('savePhaseDialog error:', e);
      window.alert(`บันทึกล้มเหลว: ${String(e?.message || e)}`);
      setPhaseDialog((prev) => ({ ...prev, saving: false }));
    }
  }, [closePhaseDialog, phaseDialog.form, phaseDialog.mode, projectId, reloadPhases, wsCode, wsEndISO, wsId, wsStartISO]);

  const openDeleteDialog = React.useCallback((row) => {
    setDeleteDialog({ open: true, row: row || null, deleting: false });
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setDeleteDialog((prev) => ({ ...prev, open: false, deleting: false, row: null }));
  }, []);

  const confirmDeletePhase = React.useCallback(async () => {
    const row = deleteDialog.row || null;
    const id = row?.id || null;
    if (!id) return;

    setDeleteDialog((prev) => ({ ...prev, deleting: true }));

    try {
      await Workstream.deletePhase(id);
      closeDeleteDialog();
      await reloadPhases();
    } catch (e) {
      console.error('deletePhase error:', e);
      window.alert(`ลบไม่สำเร็จ: ${String(e?.message || e)}`);
      setDeleteDialog((prev) => ({ ...prev, deleting: false }));
    }
  }, [closeDeleteDialog, deleteDialog.row, reloadPhases]);

  const phaseAnalytics = React.useMemo(() => {
    const rows = Array.isArray(phasesState.rows) ? phasesState.rows : [];
    const statuses = ['ยังไม่เริ่ม', 'ทำอยู่', 'เสี่ยง', 'ล่าช้า', 'เสร็จแล้ว'];

    const base = {
      total: rows.length,
      done: 0,
      hoursTotal: 0,
      feeTotal: 0,
      byStatus: statuses.reduce((acc, s) => {
        acc[s] = 0;
        return acc;
      }, {}),
      hoursByStatus: statuses.reduce((acc, s) => {
        acc[s] = 0;
        return acc;
      }, {}),
    };

    for (const r of rows) {
      const s = compactPhaseStatus(r?.status);
      const st = statuses.includes(s) ? s : 'ยังไม่เริ่ม';

      base.byStatus[st] += 1;
      if (st === 'เสร็จแล้ว') base.done += 1;

      const h = Number(r?.planned_hours || 0);
      const f = Number(r?.fee || 0);
      base.hoursTotal += Number.isFinite(h) ? h : 0;
      base.feeTotal += Number.isFinite(f) ? f : 0;
      base.hoursByStatus[st] += Number.isFinite(h) ? h : 0;
    }

    const progressPct = base.total > 0 ? Math.round((base.done / base.total) * 100) : 0;
    const riskCount = (base.byStatus['เสี่ยง'] || 0) + (base.byStatus['ล่าช้า'] || 0);

    // deadlines (exclude done)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const active = rows.filter((r) => compactPhaseStatus(r?.status) !== 'เสร็จแล้ว');
    const dueSoon = [];
    let overdueCount = 0;

    for (const r of active) {
      const endMs = parseISODateOnlyToMs(r?.end_date);
      if (!Number.isFinite(endMs)) continue;

      const diffDays = Math.floor((endMs - todayMs) / MS_PER_DAY);
      if (diffDays < 0) overdueCount += 1;
      else if (diffDays <= 7) {
        dueSoon.push({
          id: r?.id,
          name: r?.name || r?.code || '—',
          endMs,
          end_date: r?.end_date,
          status: compactPhaseStatus(r?.status),
        });
      }
    }

    dueSoon.sort((a, b) => (a.endMs || 0) - (b.endMs || 0));

    const donutSeries = statuses.map((s) => base.byStatus[s] || 0);
    const barSeries = [{ name: 'ชั่วโมง (planned)', data: statuses.map((s) => Math.round(base.hoursByStatus[s] || 0)) }];

    const timelineData = rows
      .filter((r) => r?.start_date && r?.end_date)
      .map((r) => {
        const start = parseISODateOnlyToMs(r.start_date);
        const end = parseISODateOnlyToMs(r.end_date);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

        const seqLabel = r?.seq || r?.code || 'P-?'; // sequence label (e.g., P-1)
        const st = compactPhaseStatus(r?.status);
        const fillColor = STATUS_COLORS[st] || STATUS_COLORS['ยังไม่เริ่ม'];

        return {
          x: seqLabel,
          y: [start, end],
          fillColor,
          meta: {
            seq: seqLabel,
            name: r?.name || null,
            code: r?.code || null,
            status: st,
            start_date: r?.start_date,
            end_date: r?.end_date,
          },
        };
      })
      .filter(Boolean);

    return {
      statuses,
      kpi: {
        total: base.total,
        progressPct,
        hoursTotal: base.hoursTotal,
        feeTotal: base.feeTotal,
        riskCount,
        byStatus: base.byStatus,
        dueSoonTop: dueSoon.slice(0, 3),
        dueSoonCount: dueSoon.length,
        overdueCount,
      },
      charts: {
        donutSeries,
        barSeries,
        timelineSeries: [{ name: 'เฟสงาน', data: timelineData }],
        timelineCount: timelineData.length,
      },
    };
  }, [phasesState.rows]);

  const handleRowClick = React.useCallback(
    (row) => {
      // เผื่ออนาคตจะพาไปหน้ารายละเอียดงาน (tasks) — ตอนนี้ยังไม่ทำ
      const payload = {
        toTab: 'main_task',
        projectId: project?.id ?? null,
        project: project || null,
        workstreamId: wsId ?? null,
        workstream: workstream || null,
        phaseId: row?.id ?? null,
        phase: row || null,
      };

      try {
        onGoWork?.(payload);
      } catch {
        /* ignore */
      }
    },
    [onGoWork, project, workstream, wsId]
  );

  const actionBtnSx = {
    borderRadius: 1,
    boxShadow: 'none',
    textTransform: 'none',
    fontWeight: 500,
  };

  if (!project) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          แผนงานย่อย
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>กรุณาเลือกโครงการก่อน</Typography>
      </Box>
    );
  }

  const alertCount =
    (phaseAnalytics?.kpi?.riskCount || 0) +
    (phaseAnalytics?.kpi?.dueSoonCount || 0) +
    (phaseAnalytics?.kpi?.overdueCount || 0);

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>
      {/* ===== breadcrumbs ===== */}
      {phasesState.loading ? (
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
            onClick={() => {
              try {
                (onNavProjects || handleBackClick)?.();
              } catch {
                /* ignore */
              }
            }}
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
          <Button
            onClick={() => {
              try {
                onNavProject?.();
              } catch {
                /* ignore */
              }
            }}
            variant="text"
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              maxWidth: 360,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
            title={projectName}
          >
            {projectName || '-'}
          </Button>
          {wsCode || wsName ? (
            <>
              <Box sx={{ opacity: 0.55, color: 'text.secondary' }}>·</Box>
              <Button
                

                 variant="text"
                sx={{
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  color: "text.secondary",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={wsName || ''}
              >
                {wsName || '-'}
              </Button>
            </>
          ) : null}
        </Stack>
      )}

      {/* ===== Title + Right Top (Bell) ===== */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}
      >
        {phasesState.loading ? (
          <Skeleton variant="text" width={360} height={40} />
        ) : (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                lineHeight: 1.15,
                mt: 0.25,
                minWidth: 0,
                wordBreak: 'break-word',
              }}
            >
              {wsName || '-'}
            </Typography>
          </Box>
        )}

        {phasesState.loading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title="สัญญาณแจ้งเตือน">
              <IconButton
                size="small"
                onClick={handleNotifOpen}
                aria-label="แจ้งเตือน"
                sx={{ ml: 0.5 }}
              >
                <Badge badgeContent={alertCount} color="error">
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      <Menu
        anchorEl={alertAnchor}
        open={Boolean(alertAnchor)}
        onClose={closeAlerts}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, borderRadius: 1 } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 950, fontSize: 14 }}>แจ้งเตือนเฟส</Typography>
          <Typography variant="caption" color="text.secondary">
            สรุปความเสี่ยง/กำหนดเวลา
          </Typography>
        </Box>
        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            สรุปความเสี่ยง
          </Typography>
          {/* <Typography sx={{ mt: 0.25, fontSize: 13.5, fontWeight: 950 }}>
            {`เสี่ยง + ล่าช้า = ${formatNumber(phaseAnalytics.kpi.riskCount)} เฟส`}
          </Typography> */}
          <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
            <StatusPill status="เสี่ยง" />
            <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
              {formatNumber(phaseAnalytics.kpi.byStatus['เสี่ยง'] || 0)} เฟส
            </Typography>
            <StatusPill status="ล่าช้า" />
            <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
              {formatNumber(phaseAnalytics.kpi.byStatus['ล่าช้า'] || 0)} เฟส
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            ใกล้ถึงกำหนด (≤ 7 วัน)
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: 13.5, fontWeight: 950 }}>
            {formatNumber(phaseAnalytics.kpi.dueSoonCount)} เฟส
          </Typography>
          <Box sx={{ mt: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {(phaseAnalytics.kpi.dueSoonTop.length ? phaseAnalytics.kpi.dueSoonTop : [{ name: '—' }]).map((p, i) => (
              <Box
                key={`${p.id || p.name}-${i}`}
                sx={{
                  px: 1,
                  py: 0.35,
                  borderRadius: 999,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12.5,
                  fontWeight: 800,
                  maxWidth: 300,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={p.name}
              >
                {p.name}
              </Box>
            ))}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            เลยกำหนด
          </Typography>
          <Typography
            sx={{
              mt: 0.25,
              fontSize: 20,
              fontWeight: 950,
              color: phaseAnalytics.kpi.overdueCount > 0 ? '#ff4059' : 'text.primary',
            }}
          >
            {formatNumber(phaseAnalytics.kpi.overdueCount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            เฟส (ไม่นับที่เสร็จแล้ว)
          </Typography>
        </Box>
      </Menu>

      {/* ===== ✅ Summary: KPI + Charts (ย้าย Risk ไปกะดิ่งแล้ว) ===== */}
      <Paper
        elevation={0}
        sx={{
          boxShadow: 'none',
          overflow: 'hidden',
          mb: 2,
        }}
      >
        {phasesState.loading ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Skeleton variant="text" width={220} height={22} />
            <Skeleton variant="text" width={320} height={14} />
            <Box
              sx={{
                mt: 1.5,
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
              }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`kpi-sk-${i}`} variant="rounded" height={86} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2, display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 1, mt: 1.25 }} />
          </Box>
        ) : (
          <>
            <Box>
              {/* KPI strip */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
                  alignItems: 'stretch',
                }}
              >
                <KpiTile label="จำนวนเฟสทั้งหมด" value={formatNumber(phaseAnalytics.kpi.total)} sub="Total phases" color={'#ff4059'} />
                <KpiTile
                  label="ความคืบหน้ารวม"
                  value={`${clamp(phaseAnalytics.kpi.progressPct, 0, 100)}%`}
                  sub="เสร็จแล้ว / ทั้งหมด"
                  color={'#08d84c'}
                />
                <KpiTile
                  label="ชั่วโมงวางแผน"
                  value={formatNumber(Math.round(phaseAnalytics.kpi.hoursTotal))}
                  sub="Planned Hours"
                  color={'#fdca01'}
                />
                <KpiTile
                  label="ชั่วโมงที่ใช้ไป"
                  value={formatNumber(0)}
                  sub="Actual Hours"
                  color={'#64748B'}
                />
                <KpiTile
                  label="เสี่ยง/ล่าช้า"
                  value={formatNumber(phaseAnalytics.kpi.riskCount)}
                  sub="Early warning"
                  color={'#3B82F6'}
                />
              </Box>

              {/* Charts */}
              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                }}
              >
                <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 1.25, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, mb: 0.5 }}>
                    สัดส่วนเฟสตามสถานะ
                  </Typography>
                  <ReactApexChart
                    options={{
                      chart: { type: 'pie', toolbar: { show: false } },
                      labels: phaseAnalytics.statuses,
                      legend: { position: 'bottom' },
                      stroke: { width: 2 },
                      dataLabels: { enabled: true },
                      colors: CHART_COLORS,
                    }}
                    series={phaseAnalytics.charts.donutSeries}
                    type="pie"
                    height={240}
                  />
                </Box>

                <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 1.25, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, mb: 0.5 }}>
                    ชั่วโมงรวมตามสถานะ
                  </Typography>
                  <ReactApexChart
                    options={{
                      chart: { type: 'bar', toolbar: { show: false } },
                      xaxis: { categories: phaseAnalytics.statuses },
                      dataLabels: { enabled: false },
                      grid: { strokeDashArray: 4 },
                      plotOptions: { bar: { borderRadius: 8, columnWidth: '55%', distributed: true } },
                      colors: CHART_COLORS,
                      yaxis: { labels: { formatter: (v) => formatNumber(v) } },
                      tooltip: { y: { formatter: (v) => `${formatNumber(v)} ชม.` } },
                    }}
                    series={phaseAnalytics.charts.barSeries}
                    type="bar"
                    height={240}
                  />
                </Box>
              </Box>


            </Box>
          </>
        )}
      </Paper>

      {/* ===== ✅ Phases Box ===== */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          boxShadow: 'none',
          overflow: 'hidden',
        }}
      >
        {phasesState.loading ? (
          <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="text" width={160} height={22} />
              <Skeleton variant="text" width={220} height={12} sx={{ mt: 0.5 }} />
            </Box>
            <Box>
              <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>รายการเฟส</Typography>
              <Typography variant="caption" color="text.secondary">
                กดแถวเพื่อเข้าดูรายละเอียดเฟส
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>

              <Tooltip title="เพิ่ม Work">
                <IconButton
                  onClick={openCreatePhaseDialog}
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

        {phasesState.loading ? (
          <TableContainer sx={{ width: '100%', px: 2, py: 1 }}>
            <Table size="small" sx={{ '& th, & td': { py: 1, px: 1.5, borderBottom: 'none' } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'transparent' }}>
                  <TableCell>
                    <Skeleton variant="text" width={46} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={120} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={80} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={120} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
                    <Skeleton variant="text" width={90} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`hdr-sk-${i}`}>
                    <TableCell>
                      <Skeleton variant="text" width={46} />
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
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>
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
          <PhasesTable
            loading={phasesState.loading}
            rows={phasesState.rows}
            onRowClick={handleRowClick}
            onEditRow={openEditPhaseDialog}
            onDeleteRow={openDeleteDialog}
          />
        )}
      </Paper>

      <Box sx={{ mt: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 1.25, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, mb: 0.5 }}>
          ไทม์ไลน์เฟส (วันที่เริ่ม–สิ้นสุด)
        </Typography>

        {phaseAnalytics.charts.timelineCount === 0 ? (
          <Typography variant="caption" color="text.secondary">
            ไม่มีข้อมูล start/end date เพียงพอสำหรับสร้าง Timeline
          </Typography>
        ) : (
          <ReactApexChart
            options={{
              chart: { type: 'rangeBar', toolbar: { show: false } },
              plotOptions: { bar: { horizontal: true, barHeight: '78%', borderRadius: 8 } },
              fill: { opacity: 1 },
              xaxis: {
                type: 'datetime',
                labels: {
                  formatter: (val) => {
                    try {
                      return dayjs(val).locale && dayjs(val).format ? dayjs(val).format('MMM YYYY') : String(val);
                    } catch {
                      return String(val);
                    }
                  },
                },
              },
              dataLabels: {
                enabled: true,
                formatter: (val, opts) => {
                  try {
                    const d = opts?.w?.config?.series?.[opts.seriesIndex]?.data?.[opts.dataPointIndex];
                    const seq = (d && d.meta && d.meta.seq) || d?.x || 'P-?';
                    return String(seq);
                  } catch {
                    return '';
                  }
                },
                style: { colors: ['#fff'], fontSize: '12px', fontWeight: '700' },
              },
              grid: { strokeDashArray: 4 },
              tooltip: {
                custom: ({ seriesIndex, dataPointIndex, w }) => {
                  const d = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
                  const m = d?.meta || {};
                  const seq = m?.seq || d?.x || 'P-?';
                  const name = m?.name ? `<div style="opacity:.9;font-weight:800;margin-top:2px;">${m.name}</div>` : '';
                  const st = m?.status || '—';
                  const range = fmtThaiRange(m?.start_date, m?.end_date) || '—';
                  const code = m?.code ? `<div style="opacity:.75;font-size:12px;">${m.code}</div>` : '';
                  return `
                            <div style="padding:10px 12px;">
                              <div style="font-weight:900;">${seq}</div>
                              ${name}
                              ${code}
                              <div style="margin-top:4px;font-size:12px;">สถานะ: <b>${st}</b></div>
                              <div style="font-size:12px;">ช่วง: <b>${range}</b></div>
                            </div>
                          `;
                },
              },
            }}
            series={phaseAnalytics.charts.timelineSeries}
            type="rangeBar"
            height={Math.min(520, Math.max(260, phaseAnalytics.charts.timelineCount * 34))}
          />
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>ลบเฟส "{deleteDialog.row?.name || deleteDialog.row?.code || '—'}" หรือไม่? (ผู้ติดต่อทั้งหมดจะถูกลบตามด้วย)</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteDialog.deleting}
            sx={{ color: 'common.black', ...actionBtnSx }}
            disableElevation
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDeletePhase}
            disabled={deleteDialog.deleting}
            sx={actionBtnSx}
            disableElevation
          >
            {deleteDialog.deleting ? 'กำลังลบ...' : 'ลบ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Dialog: Create/Edit Phase ===== */}
      <Dialog open={phaseDialog.open} onClose={closePhaseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{phaseDialog.mode === 'edit' ? 'แก้ไขเฟส' : 'เพิ่มเฟส'}</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
                size="small"
                label="รหัสเฟส"
                value={phaseDialog.form.code}
                onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, code: e.target.value } }))}
                placeholder="PH-YYYYMMDD-HHMMSS"
                fullWidth
                required
                sx={{display:'none'}}
              />

            <TextField
              size="small"
              label="ชื่อเฟส"
              value={phaseDialog.form.name}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
              fullWidth
              required
            />

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Stack direction="column" spacing={1.25}>
                <DatePicker
                  label="วันที่เริ่ม"
                  value={phaseDialog.form.start_date ? dayjs(phaseDialog.form.start_date) : null}
                  minDate={wsStartDay || undefined}
                  maxDate={wsEndDay || undefined}
                  onChange={(v) =>
                    setPhaseDialog((prev) => {
                      const start_date = v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '';
                      const nextForm = { ...prev.form, start_date };
                      const nextErrors = validatePhaseDates({
                        startISO: nextForm.start_date,
                        endISO: nextForm.end_date,
                        workStartISO: wsStartISO,
                        workEndISO: wsEndISO,
                      });
                      const hadManualHours = Boolean(String(prev?.form?.planned_hours ?? '').trim()) && !prev?.plannedHoursAuto;
                      return {
                        ...prev,
                        autoCalcDirty: true,
                        plannedHoursAuto: hadManualHours ? false : true,
                        form: nextForm,
                        errors: { ...(prev.errors || {}), ...nextErrors },
                      };
                    })
                  }
                  slotProps={{
                    textField: {
                      size: 'small',
                      error: Boolean(phaseDialog?.errors?.start_date),
                      helperText: phaseDialog?.errors?.start_date || '',
                    },
                  }}
                  sx={{ width: '100%' }}
                />
                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={phaseDialog.form.end_date ? dayjs(phaseDialog.form.end_date) : null}
                  minDate={toDayjsDate(phaseDialog.form.start_date) || wsStartDay || undefined}
                  maxDate={wsEndDay || undefined}
                  onChange={(v) =>
                    setPhaseDialog((prev) => {
                      const end_date = v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '';
                      const nextForm = { ...prev.form, end_date };
                      const nextErrors = validatePhaseDates({
                        startISO: nextForm.start_date,
                        endISO: nextForm.end_date,
                        workStartISO: wsStartISO,
                        workEndISO: wsEndISO,
                      });
                      const hadManualHours = Boolean(String(prev?.form?.planned_hours ?? '').trim()) && !prev?.plannedHoursAuto;
                      return {
                        ...prev,
                        plannedHoursAuto: hadManualHours ? false : true,
                        form: nextForm,
                        errors: { ...(prev.errors || {}), ...nextErrors },
                      };
                    })
                  }
                  slotProps={{
                    textField: {
                      size: 'small',
                      error: Boolean(phaseDialog?.errors?.end_date),
                      helperText: phaseDialog?.errors?.end_date || '',
                    },
                  }}
                  sx={{ width: '100%' }}
                />
              </Stack>
            </LocalizationProvider>

            <TextField
             sx={{display:'none'}}
              size="small"
              label="ชั่วโมงวางแผน"
              type="number"
              value={phaseDialog.form.planned_hours}
              onChange={(e) =>
                setPhaseDialog((prev) => {
                  const planned_hours = e.target.value;
                  const plannedErr = validatePlannedHoursText(planned_hours);
                  return {
                    ...prev,
                    autoCalcDirty: true,
                    plannedHoursAuto: false,
                    form: { ...prev.form, planned_hours },
                    errors: { ...(prev.errors || {}), planned_hours: plannedErr },
                  };
                })
              }
              error={Boolean(phaseDialog?.errors?.planned_hours)}
              helperText={phaseDialog?.errors?.planned_hours || ''}
              fullWidth
            />

          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            onClick={closePhaseDialog}
            disabled={phaseDialog.saving}
            sx={{ color: '#000', textTransform: 'none' }}
            size="medium"
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={savePhaseDialog}
            disabled={
              phaseDialog.saving ||
              !phaseDialog.form.start_date ||
              !phaseDialog.form.end_date ||
              Boolean(phaseDialog?.errors?.start_date || phaseDialog?.errors?.end_date || phaseDialog?.errors?.planned_hours)
            }
            sx={{ ...actionBtnSx }} 
            startIcon={<SaveIcon />}
            size="medium"
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
