// ===== src/tpr/modules/projects/ProjectSub.jsx (แทนทั้งไฟล์) =====
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';

import SaveIcon from '@mui/icons-material/Save';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import ReactApexChart from 'react-apexcharts';

import * as Workstream from '../../functions/workstream';

const BRAND = '#ff4059';

// use Thai locale for datepickers
try { dayjs.locale && dayjs.locale('th'); } catch  { /* ignore */ }

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

function fmtThaiRange(startISO, endISO) {
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
        borderRadius: 2,
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
    'เสร็จแล้ว': { label: 'เสร็จแล้ว', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    'ล่าช้า': { label: 'ล่าช้า', dot: '#fb7185', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
    'เสี่ยง': { label: 'เสี่ยง', dot: '#fbbf24', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    'ยังไม่เริ่ม': { label: 'ยังไม่เริ่ม', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
    'ทำอยู่': { label: 'ทำอยู่', dot: '#a78bfa', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' },
    planning: { label: 'ยังไม่เริ่ม', dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },

    done: { label: 'เสร็จแล้ว', dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
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
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: cfg.text, lineHeight: 1 }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function PhasesTable({ loading, rows, onRowClick, onEditRow, onDeleteRow }) {
  const list = Array.isArray(rows) ? rows : [];

  // ความคืบหน้า phase: ไม่มี field progress ใน phases -> ใช้ heuristic จาก status
  const statusToProgress = (status) => {
    if (status === 'เสร็จแล้ว') return 100;
    if (status === 'ทำอยู่') return 55;
    if (status === 'เสี่ยง') return 45;
    if (status === 'ล่าช้า') return 35;
    return 0;
  };

  return (
    <TableContainer sx={{ width: '100%' }}>
      <Table size="small" sx={{ '& th, & td': { py: 1, px: 1.5 } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'transparent' }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ชื่อเฟส</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 130 }}>สถานะ</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 170 }}>ความคืบหน้า</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>ค่าเฟส</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>ช่วงเวลา</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', width: 90 }}>จัดการ</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
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
              ))
            : list.map((r, idx) => {
                const key = r.id || r.code || idx;
                const pct = clamp(statusToProgress(r.status), 0, 100);
                const fee = Number(r.fee || 0);

                return (
                  <TableRow
                    key={key}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      try { onRowClick?.(r); } catch { /* ignore */ }
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>
                        {r.name || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.code || '-'}
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
                        <Typography sx={{ fontSize: 12.5, fontWeight: 900, minWidth: 40, textAlign: 'right' }}>
                          {`${Math.round(pct)}%`}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {`฿ ${formatMoneyTHB(fee)}`}
                    </TableCell>

                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {r.dateRange || '-'}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="แก้ไข" placement="top">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRow?.(r);
                          }}
                          aria-label="แก้ไข"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" placement="top">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRow?.(r);
                          }}
                          aria-label="ลบ"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}

          {!loading && list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Box sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>ยังไม่มีเฟส</Typography>
                  <Typography variant="caption" color="text.secondary">*กดปุ่ม + เพื่อเพิ่มเฟส</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function ProjectSub({ project, workstream, onBack, onGoWork }) {
  // navigation pattern ให้เหมือนของเดิม
  const handleBackClick = React.useCallback(() => {
    try { onBack?.(); } catch { /* ignore */ }
  }, [onBack]);

  const projectId = project?.id || null;
  const projectCode = project?.project_code || project?.code || '';
  const projectName = project?.name_th || project?.name || project?.name_en || '';

  const wsId = workstream?.id || null;
  const wsCode = workstream?.code || '';
  const wsName = workstream?.name || '';

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
  }));

  const reloadPhases = React.useCallback(async () => {
    if (!projectId) return;

    try {
      setPhasesState({ loading: true, total: 0, rows: [] });

      // หน่วงนิดนึงให้ skeleton สวย (pattern เดิม)
      await new Promise((r) => setTimeout(r, 200));

      const phaseRows = await Workstream.listPhases({ projectId, workstreamId: wsId });

      const mapped = (Array.isArray(phaseRows) ? phaseRows : []).map((r) => ({
        ...r,
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

  const openCreatePhaseDialog = React.useCallback(() => {
    setPhaseDialog({
      open: true,
      mode: 'create',
      saving: false,
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
    });
  }, []);

  const openEditPhaseDialog = React.useCallback((row) => {
    setPhaseDialog({
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
        planned_hours: row?.planned_hours != null ? String(Number(row.planned_hours || 0)) : '',
        fee: row?.fee != null ? String(Number(row.fee || 0)) : '',
        note: row?.note || '',
      },
    });
  }, []);

  const closePhaseDialog = React.useCallback(() => {
    setPhaseDialog((prev) => ({ ...prev, open: false, saving: false }));
  }, []);

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

    setPhaseDialog((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        project_id: projectId,
        workstream_id: wsId || null,
        workstream_code: wsCode || null,
        code,
        name,
        status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
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
  }, [closePhaseDialog, phaseDialog.form, phaseDialog.mode, projectId, reloadPhases, wsCode, wsId]);

  const handleDeletePhase = React.useCallback(
    async (row) => {
      const id = row?.id || null;
      const label = row?.name || row?.code || '';
      if (!id) return;

      const ok = window.confirm(`ต้องการลบเฟส "${label}" ใช่หรือไม่?`);
      if (!ok) return;

      try {
        await Workstream.deletePhase(id);
        await reloadPhases();
      } catch (e) {
        console.error('deletePhase error:', e);
        window.alert(`ลบไม่สำเร็จ: ${String(e?.message || e)}`);
      }
    },
    [reloadPhases]
  );

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
        const label = r?.name || r?.code || 'Phase';
        return {
          x: label,
          y: [start, end],
          meta: {
            code: r?.code || null,
            status: compactPhaseStatus(r?.status),
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
        toTab: 'subwork_phase',
        projectId: project?.id ?? null,
        project: project || null,
        workstreamId: wsId ?? null,
        workstream: workstream || null,
        phaseId: row?.id ?? null,
        phase: row || null,
      };

      try { onGoWork?.(payload); } catch { /* ignore */ }
    },
    [onGoWork, project, workstream, wsId]
  );

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
          แผนงานย่อย
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          กรุณาเลือกโครงการก่อน
        </Typography>
      </Box>
    );
  }

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
          <Typography variant="body2" color="text.secondary">
            {projectCode || '-'}
          </Typography>
          <Box sx={{ opacity: 0.55, color: 'text.secondary' }}>·</Box>
          <Typography variant="body2" color="text.secondary">
            แผนงานย่อย
          </Typography>
          {wsCode || wsName ? (
            <>
              <Box sx={{ opacity: 0.55, color: 'text.secondary' }}>·</Box>
              <Typography variant="body2" color="text.secondary">
                {(wsCode ? `${wsCode} ` : '') + (wsName || '')}
              </Typography>
            </>
          ) : null}
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
              {projectName || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {wsCode || wsName ? `Work: ${(wsCode ? `${wsCode} ` : '') + wsName}` : 'เลือก Work เพื่อสร้างเฟสงาน'}
            </Typography>
          </Box>
        )}

        {phasesState.loading ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Skeleton variant="rectangular" width={96} height={36} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title="เพิ่มเฟส">
              <IconButton
                onClick={openCreatePhaseDialog}
                sx={{
                  borderRadius: 2,
                  bgcolor: BRAND,
                  color: '#fff',
                  '&:hover': { bgcolor: '#e63a52' },
                }}
                aria-label="เพิ่มเฟส"
              >
                <AddRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {/* ===== ✅ Summary: KPI + Charts + Risk (no duplicate table) ===== */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
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
                <Skeleton key={`kpi-sk-${i}`} variant="rounded" height={86} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2, display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            </Box>
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2, mt: 1.25 }} />
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 950, fontSize: 15 }}>ภาพรวมเฟส</Typography>
                <Typography variant="caption" color="text.secondary">
                  KPI + กราฟ + สัญญาณเตือน (ไม่ซ้ำตารางด้านล่าง)
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {wsCode || wsName ? `Work: ${(wsCode ? `${wsCode} ` : '') + wsName}` : 'All workstreams'}
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ px: 2, py: 2 }}>
              {/* KPI strip */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
                  alignItems: 'stretch',
                }}
              >
                <KpiTile label="จำนวนเฟสทั้งหมด" value={formatNumber(phaseAnalytics.kpi.total)} sub="Total phases" />
                <KpiTile
                  label="ความคืบหน้ารวม"
                  value={`${clamp(phaseAnalytics.kpi.progressPct, 0, 100)}%`}
                  sub="เสร็จแล้ว / ทั้งหมด"
                  color={phaseAnalytics.kpi.progressPct >= 80 ? '#08d84c' : phaseAnalytics.kpi.progressPct >= 50 ? '#8B5CF6' : '#ff4059'}
                />
                <KpiTile label="ชั่วโมงวางแผนรวม" value={formatNumber(Math.round(phaseAnalytics.kpi.hoursTotal))} sub="Planned Hours" />
                <KpiTile label="ค่าเฟสรวม" value={`฿ ${formatMoneyTHB(phaseAnalytics.kpi.feeTotal)}`} sub="Fee Total" />
                <KpiTile
                  label="เสี่ยง/ล่าช้า"
                  value={formatNumber(phaseAnalytics.kpi.riskCount)}
                  sub="Early warning"
                  color={phaseAnalytics.kpi.riskCount > 0 ? '#ff4059' : 'text.primary'}
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
                <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 1.25, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, mb: 0.5 }}>
                    สัดส่วนเฟสตามสถานะ
                  </Typography>
                  <ReactApexChart
                    options={{
                      chart: { type: 'donut', toolbar: { show: false } },
                      labels: phaseAnalytics.statuses,
                      legend: { position: 'bottom' },
                      stroke: { width: 2 },
                      dataLabels: { enabled: true },
                      colors: ['#94a3b8', '#a78bfa', '#fbbf24', '#fb7185', '#22c55e'],
                      plotOptions: { pie: { donut: { size: '68%' } } },
                    }}
                    series={phaseAnalytics.charts.donutSeries}
                    type="donut"
                    height={240}
                  />
                </Box>

                <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 1.25, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800, mb: 0.5 }}>
                    ชั่วโมงรวมตามสถานะ (Planned)
                  </Typography>
                  <ReactApexChart
                    options={{
                      chart: { type: 'bar', toolbar: { show: false } },
                      xaxis: { categories: phaseAnalytics.statuses },
                      dataLabels: { enabled: false },
                      grid: { strokeDashArray: 4 },
                      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
                      colors: ['#94a3b8', '#a78bfa', '#fbbf24', '#fb7185', '#22c55e'],
                      yaxis: { labels: { formatter: (v) => formatNumber(v) } },
                      tooltip: { y: { formatter: (v) => `${formatNumber(v)} ชม.` } },
                    }}
                    series={phaseAnalytics.charts.barSeries}
                    type="bar"
                    height={240}
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 1.25, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 1.25, minWidth: 0 }}>
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
                      plotOptions: { bar: { horizontal: true, barHeight: '62%' } },
                      xaxis: { type: 'datetime' },
                      dataLabels: { enabled: false },
                      grid: { strokeDashArray: 4 },
                      tooltip: {
                        custom: ({ seriesIndex, dataPointIndex, w }) => {
                          const d = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
                          const m = d?.meta || {};
                          const title = d?.x || 'Phase';
                          const st = m?.status || '—';
                          const range = fmtThaiRange(m?.start_date, m?.end_date) || '—';
                          const code = m?.code ? `<div style="opacity:.75;font-size:12px;">${m.code}</div>` : '';
                          return `
                            <div style="padding:10px 12px;">
                              <div style="font-weight:800;">${title}</div>
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

              {/* Risk row */}
              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 260, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    สรุปความเสี่ยง
                  </Typography>
                  <Typography sx={{ mt: 0.4, fontSize: 13.5, fontWeight: 950 }}>
                    {`เสี่ยง + ล่าช้า = ${formatNumber(phaseAnalytics.kpi.riskCount)} เฟส`}
                  </Typography>
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

                <Box sx={{ minWidth: 260, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    ใกล้ถึงกำหนด (≤ 7 วัน)
                  </Typography>
                  <Typography sx={{ mt: 0.4, fontSize: 13.5, fontWeight: 950 }}>
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
                          maxWidth: 260,
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

                <Box sx={{ minWidth: 220, flex: 0.8 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    เลยกำหนด
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: 22,
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
              <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 2 }} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>
                รายการเฟส
              </Typography>
              <Typography variant="caption" color="text.secondary">
                กดแถวเพื่อเข้าดูรายละเอียดเฟส
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {`${phasesState.total} เฟส`}
            </Typography>
          </Box>
        )}

        <Divider />

        {phasesState.loading ? (
          <TableContainer sx={{ width: '100%', px: 2, py: 1 }}>
            <Table size="small" sx={{ '& th, & td': { py: 1, px: 1.5 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'transparent' }}>
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
                    <TableCell><Skeleton variant="text" width={240} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={92} height={24} /></TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={140} height={10} />
                      <Skeleton variant="text" width={40} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton variant="text" width={90} /></TableCell>
                    <TableCell sx={{ textAlign: 'center' }}><Skeleton variant="text" width={40} /></TableCell>
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
            onDeleteRow={handleDeletePhase}
          />
        )}
      </Paper>

      {/* ===== Dialog: Create/Edit Phase ===== */}
      <Dialog open={phaseDialog.open} onClose={closePhaseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {phaseDialog.mode === 'edit' ? 'แก้ไขเฟส' : 'เพิ่มเฟส'}
        </DialogTitle>

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
            />

            <TextField
              size="small"
              label="ชื่อเฟส"
              value={phaseDialog.form.name}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
              fullWidth
              required
            />

            <TextField
              size="small"
              select
              label="สถานะ"
              value={phaseDialog.form.status}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
              fullWidth
            >
              {Workstream.WORKSTREAM_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Stack direction="column" spacing={1.25}>
                <DatePicker
                  label="วันที่เริ่ม"
                  value={phaseDialog.form.start_date ? dayjs(phaseDialog.form.start_date) : null}
                  onChange={(v) =>
                    setPhaseDialog((prev) => ({
                      ...prev,
                      form: {
                        ...prev.form,
                        start_date: v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '',
                      },
                    }))
                  }
                  slotProps={{ textField: { size: 'small' } }}
                  sx={{ width: '100%' }}
                />
                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={phaseDialog.form.end_date ? dayjs(phaseDialog.form.end_date) : null}
                  onChange={(v) =>
                    setPhaseDialog((prev) => ({
                      ...prev,
                      form: {
                        ...prev.form,
                        end_date: v ? (v.format ? v.format('YYYY-MM-DD') : String(v)) : '',
                      },
                    }))
                  }
                  slotProps={{ textField: { size: 'small' } }}
                  sx={{ width: '100%' }}
                />
              </Stack>
            </LocalizationProvider>

            <TextField
              size="small"
              label="ชั่วโมงวางแผน"
              type="number"
              value={phaseDialog.form.planned_hours}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, planned_hours: e.target.value } }))}
              fullWidth
            />

            <TextField
              size="small"
              label="ค่าเฟส"
              type="number"
              value={phaseDialog.form.fee}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, fee: e.target.value } }))}
              fullWidth
            />

            <TextField
              size="small"
              label="หมายเหตุ"
              value={phaseDialog.form.note}
              onChange={(e) => setPhaseDialog((prev) => ({ ...prev, form: { ...prev.form, note: e.target.value } }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={closePhaseDialog} disabled={phaseDialog.saving} sx={{ color: '#000', textTransform: 'none' }} size="medium">
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={savePhaseDialog}
            disabled={phaseDialog.saving}
            sx={{ ...actionBtnSx, bgcolor: BRAND, '&:hover': { bgcolor: '#e63a52' } }}
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
