import * as React from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import ReactApexChart from 'react-apexcharts';

// ✅ ใช้ฟังก์ชันทั้ง 4 จาก Projects.js + supabase
import Projects from '../../functions/Projects';
import { supabase } from '../../../lib/supabaseClient';

function formatMoneyTHB(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return `${num.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

function statusTh(status) {
  if (status === 'Active') return 'กำลังดำเนินการ';
  if (status === 'Planning') return 'อยู่ระหว่างวางแผน';
  if (status === 'Completed') return 'เสร็จสิ้น';
  return status || '-';
}

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

// กราฟเล็กแบบ mini bars (ไม่พึ่ง lib)
function MiniBars({ color = '#64748b', values = [0.3, 0.55, 0.75], height = 34 }) {
  const v = Array.isArray(values) && values.length ? values : [0.3, 0.55, 0.75];
  const vv = v.slice(0, 3).map((x) => clamp(Number(x || 0), 0, 1));
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
    try {
      onGoWork?.();
    } catch {
      // ignore
    }
  }, [onGoWork]);

  const projectId = project?.id || null;
  const projectCode = project?.project_code || project?.code || '';
  const projectName = project?.name_th || project?.name || project?.name_en || '';
  const updatedAt = project?.updated_at || project?.created_at || project?.start_date || project?.start || '-';
  const budgetTotalNum = Number(project?.budget || 0);

  // ===== computed KPI state (from 4 functions) =====
  const [kpi, setKpi] = React.useState(() => ({
    loading: false,
    error: null,

    // 1) status: use project.status directly (per requirement)
    status: project?.status || 'Planning',

    // 2) progress: computed from tasks
    progressPct: 0,
    progressDone: 0,
    progressTotal: 0,

    // 3) WIP: computed from time entries * bill_rate
    wip: 0,
    wipHoursTotal: 0,

    // 4) AR: computed from invoices - received
    ar: 0,
    invoiceTotal: 0,
    receivedTotal: 0,

    // ✅ Budget ใช้ไป vs กรอบ (Progress vs Used)
    pv_progressPct: 0,
    pv_usedPct: 0,
    pv_usedAmount: 0,
    pv_budgetTotal: 0,
    pv_deltaPct: 0,
    pv_health: null,
  }));

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!projectId) return;

      if (alive) {
        setKpi((prev) => ({
          ...prev,
          loading: true,
          error: null,
          status: project?.status || prev.status,
        }));
      }

      try {
        // 2) Progress
        const progressRes = await Projects.getProgressFromTasks(supabase, projectId);

        // 3) WIP
        const wipRes = await Projects.getWipFromTimesheets(supabase, projectId);

        // 4) AR
        let arRes = null;
        try {
          arRes = await Projects.getArFromInvoices(supabase, projectId);
        } catch (e) {
          // ถ้ายังไม่ได้สร้างตาราง payments จริงใน DB ให้ fallback แบบ "ยังไม่รับชำระ"
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

        // ✅ Progress vs Budget Used (ใช้ฟังก์ชันใน Projects.js)
        let pvRes = null;
        try {
          pvRes = await Projects.getProgressVsBudget(supabase, projectId, { allowArFallback: true });
        } catch {
          pvRes = null;
        }

        if (!alive) return;

        setKpi((prev) => ({
          ...prev,
          loading: false,
          error: null,
          status: project?.status || prev.status,

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
        }));
      } catch (e) {
        if (!alive) return;
        setKpi((prev) => ({
          ...prev,
          loading: false,
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

  // display values
  const progressPct = clamp(kpi.progressPct, 0, 100);
  const wip = Number(kpi.wip || 0);
  const ar = Number(kpi.ar || 0);

  const wipPct = budgetTotalNum > 0 ? clamp(Math.round((wip / budgetTotalNum) * 100), 0, 100) : 0;
  const arPct = budgetTotalNum > 0 ? clamp(Math.round((ar / budgetTotalNum) * 100), 0, 100) : 0;

  const pvProgressPct = clamp(kpi.pv_progressPct, 0, 100);
  const pvUsedPct = clamp(kpi.pv_usedPct, 0, 100);

  const pvSeries = React.useMemo(() => {
    return [{ name: 'สัดส่วน', data: [pvProgressPct, pvUsedPct] }];
  }, [pvProgressPct, pvUsedPct]);

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
        categories: ['ความคืบหน้า (Progress)', 'งบที่ใช้ไป (WIP + AR)'],
        min: 0,
        max: 100,
        labels: {
          formatter: (val) => `${Math.round(Number(val || 0))}%`,
        },
      },
      yaxis: {
        labels: {
          style: { fontWeight: 800 },
        },
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3, padding: { top: 0, right: 8, bottom: 0, left: 8 } },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (val) => `${Math.round(Number(val || 0))}%`,
        },
      },
    };
  }, []);

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
          <Typography variant="body2" color="text.secondary">
            {projectCode || '-'}
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
            >
              แก้ไข
            </Button>

            <Button
              variant="contained"
              startIcon={<CheckCircleRoundedIcon />}
              onClick={handleGoWorkClick}
              sx={{
                ...actionBtnSx,
                bgcolor: '#ff4059',
                color: '#ffffff',
                '&:hover': { bgcolor: '#e63a52', boxShadow: 'none' },
              }}
            >
              เข้า WORK
            </Button>
          </Stack>
        )}
      </Stack>

      {/* ===== KPI ===== */}
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
                {statusTh(project.status)}
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
                    {kpi.loading ? '—' : `${progressPct}%`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.loading ? '*กำลังคำนวณ...' : `*${kpi.progressDone}/${kpi.progressTotal} งาน (billable)`}
                  </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
              <MiniBars color="#08d84c" values={[progressPct / 140, progressPct / 115, progressPct / 100]} height={34} />
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
                    {kpi.loading ? '—' : formatMoneyTHB(wip)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.loading ? '*กำลังคำนวณ...' : budgetTotalNum > 0 ? `*${wipPct}% ของงบ` : '*—'}
                  </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
              <MiniBars color="#fdca01" values={[wipPct / 140, wipPct / 115, wipPct / 100]} height={34} />
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
                    AR
                  </Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, mt: 0.5, color: '#8B5CF6', lineHeight: 1.15 }}>
                    {kpi.loading ? '—' : formatMoneyTHB(ar)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.loading
                      ? '*กำลังคำนวณ...'
                      : budgetTotalNum > 0
                      ? `*${arPct}% ของงบ`
                      : ar > 0
                      ? '*ต้องติดตาม'
                      : '*ปกติ'}
                  </Typography>
                </>
              )}
            </Box>

            {kpi.loading ? (
              <Skeleton variant="rectangular" width={44} height={34} />
            ) : (
              <MiniBars color="#8B5CF6" values={[arPct / 140, arPct / 115, arPct / 100]} height={34} />
            )}
          </Box>
        </Paper>
      </Box>

      {/* ✅ Box ใหม่: เทียบ ความคืบหน้า vs งบที่ใช้ไป (ขึ้นแถวใหม่) */}
      <Paper elevation={0} sx={{ ...kpiPaperSx, mb: 2 }}>
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
                เทียบ ความคืบหน้า vs งบที่ใช้ไป
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {kpi.pv_budgetTotal ? `${formatMoneyTHB(kpi.pv_usedAmount)} / ${formatMoneyTHB(kpi.pv_budgetTotal)}` : '—'}
              </Typography>
            </Stack>

            <Box sx={{ width: '100%', overflowX: 'hidden' }}>
              <ReactApexChart options={pvOptions} series={pvSeries} type="bar" height={150} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                *แถบสีเขียว = งานคืบหน้า, สีแดง = ใช้งบไปแล้ว
              </Typography>
            </Box>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {`ส่วนต่าง (Progress - Used) ${Number.isFinite(Number(kpi.pv_deltaPct)) ? `${kpi.pv_deltaPct >= 0 ? '+' : ''}${kpi.pv_deltaPct}%` : '—'}`}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: kpi.pv_health === 'RISK' ? '#ff4059' : kpi.pv_health === 'WARN' ? '#fdca01' : '#08d84c',
                }}
              >
                {kpi.pv_health === 'RISK' ? 'เสี่ยง' : kpi.pv_health === 'WARN' ? 'ต้องติดตาม' : 'คุมงบดี'}
              </Typography>
            </Stack>
          </>
        )}
      </Paper>

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
