// ===== SalesOpportunities.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  Stepper,
  Step,
  StepButton,
  TextField,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

import ReactApexChart from 'react-apexcharts';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

import {
  getSalesDashboardAll,
  daysBetweenDates,
  updateOpportunity,
  createCustomerActivity, // ✅ บันทึกกิจกรรมจริง
  uploadOpportunityAttachments,
} from '../../functions/Sales';
import { useNotify } from '../../contexts/notifyContext';
import SalesOpportunityFormDialog from './SalesOpportunityFormDialog';

// ลำดับสถานะให้ตรง Funnel จริง (ห้ามเรียงตามตัวอักษร)
const STAGE_ORDER = ['Lead', 'Prospecting', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

// ✅ Probability แบบ Fix ตามสถานะ (ตามที่คุณสั่ง)
const STATUS_FIXED_PROB = {
  Lead: 20,
  Prospecting: 40,
  'Proposal Sent': 60,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
  Inactive: 0,
};

// ชื่อสถานะเป็นภาษาไทย (แสดงผลเท่านั้น — ค่าใน DB ยังเป็น EN)
const STAGE_LABEL_TH = {
  Lead: 'โอกาสใหม่',
  Prospecting: 'กำลังติดต่อ',
  'Proposal Sent': 'ยื่นข้อเสนอ',
  Negotiation: 'อยู่ระหว่างเจรจา',
  Won: 'ปิดการขายสำเร็จ',
  Lost: 'ไม่สำเร็จ',
  Inactive: 'ปิดดีล–ไม่ใช้งาน',
};

// สีสถานะ (Flat + อ่านง่าย)
const statusChipSx = (status) => {
  switch (status) {
    case 'Won':
      return { bgcolor: '#08d84c', color: '#ffffff' };
    case 'Lost':
      return { bgcolor: '#ff4059', color: '#ffffff' };
    case 'Proposal Sent':
      return { bgcolor: '#8B5CF6', color: '#ffffff' };
    case 'Negotiation':
      return { bgcolor: '#fdca01', color: '#111827' };
    case 'Prospecting':
      return { bgcolor: '#3B82F6', color: '#ffffff' };
    case 'Inactive':
      return { bgcolor: '#111827', color: '#ffffff' };
    case 'Lead':
    default:
      return { bgcolor: '#94a3b8', color: '#ffffff' };
  }
};

function formatMoneyTHB(n) {
  const num = Number(n || 0);
  return `${num.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

function formatDateTH(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return String(d);
  }
}

function formatDateTimeTH(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(dt.getDate());
    const month = pad(dt.getMonth() + 1);
    const year = dt.getFullYear();
    const hours = pad(dt.getHours());
    const minutes = pad(dt.getMinutes());
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(d);
  }
}

function stageLabelTH(status) {
  return STAGE_LABEL_TH[status] || status || '-';
}

function stageColorHex(status) {
  switch (status) {
    case 'Won':
      return '#08d84c';
    case 'Lost':
      return '#ff4059';
    case 'Negotiation':
      return '#fdca01';
    case 'Proposal Sent':
      return '#8B5CF6';
    case 'Prospecting':
      return '#3B82F6';
    case 'Inactive':
      return '#111827';
    case 'Lead':
    default:
      return '#94a3b8';
  }
}

// ✅ สถานะที่อนุญาตให้ "ปิดดีล–ไม่ใช้งาน"
const CAN_INACTIVATE = new Set(['Lead', 'Prospecting']);

// ✅ สถานะที่ให้ผู้ใช้เลือกใน “อัปเดตสถานะ”
const UPDATE_STATUS_OPTIONS = ['Lead', 'Prospecting', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

// ✅ กำหนด “ไฟล์ที่ควรแนบ” แบบเข้มงวด
const REQUIRED_FILES_BY_STATUS = {
  'Proposal Sent': 'แนบเอกสารใบเสนอราคา Quotation/Proposal',
  Negotiation: 'แนบหลักฐานการเจรจา/เอกสารประกอบ',
  Won: 'แนบ PO/สัญญา/เอกสารยืนยันการสั่งซื้อ',
  Lost: 'แนบเหตุผล/หลักฐาน',
};

export default function SalesOpportunities() {
  const [loading, setLoading] = React.useState(true);
  const notify = useNotify();

  const [header, setHeader] = React.useState(null);
  const [funnel, setFunnel] = React.useState([]);
  const [winLoss, setWinLoss] = React.useState([]);
  const [opps, setOpps] = React.useState([]);
  const [followups, setFollowups] = React.useState([]);
  const [activities, setActivities] = React.useState([]);

  const isSmDown = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const chartHeight = isSmDown ? 280 : 320;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editId, setEditId] = React.useState(null);

  const [actionOpen, setActionOpen] = React.useState(false);
  const [selectedOpp, setSelectedOpp] = React.useState(null);

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [nextStatus, setNextStatus] = React.useState('Lead');

  const [inactiveOpen, setInactiveOpen] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState(false);

  // ✅ เพิ่ม: โหมดเข้มงวด + บันทึกกิจกรรม + แนบไฟล์ + วันติดตาม(activity_at)
  const strictMode = true;
  const [submitTried, setSubmitTried] = React.useState(false);
  const [activityNote, setActivityNote] = React.useState('');
  const [followUpAt, setFollowUpAt] = React.useState(dayjs()); // ใช้เป็น activity_at (วันติดตาม/แจ้งเตือน)
  const [attachFiles, setAttachFiles] = React.useState([]);

  const resetStatusExtras = React.useCallback(() => {
    setSubmitTried(false);
    setActivityNote('');
    setFollowUpAt(dayjs());
    setAttachFiles([]);
  }, []);

  const openCreate = React.useCallback(() => {
    setEditId(null);
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((oppId) => {
    setEditId(oppId);
    setFormOpen(true);
  }, []);

  const closeForm = React.useCallback(() => {
    setFormOpen(false);
  }, []);

  const openAction = React.useCallback((oppRow) => {
    setSelectedOpp(oppRow || null);
    setActionOpen(true);
  }, []);

  const closeAction = React.useCallback(() => {
    setActionOpen(false);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);

    const { data, error } = await getSalesDashboardAll({ oppLimit: 50, activityLimit: 20 });

    if (error) {
      notify.error(error?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLoading(false);
      return;
    }

    setHeader(data?.header_cards || null);
    setFunnel(Array.isArray(data?.funnel) ? data.funnel : []);
    setWinLoss(Array.isArray(data?.win_loss) ? data.win_loss : []);
    setOpps(Array.isArray(data?.opportunity_list) ? data.opportunity_list : []);
    setFollowups(Array.isArray(data?.proposals_followup_7d) ? data.proposals_followup_7d : []);
    setActivities(Array.isArray(data?.key_client_activity) ? data.key_client_activity : []);

    setLoading(false);
  }, [notify]);

  React.useEffect(() => {
    load();
  }, [load]);

  const funnelSorted = React.useMemo(() => {
    const map = new Map((funnel || []).map((x) => [x.status, x]));
    return STAGE_ORDER.map((s) => map.get(s) || { status: s, opportunity_count: 0, total_estimated_value: 0 });
  }, [funnel]);

  const maxFunnelValue = React.useMemo(() => {
    return funnelSorted.reduce((mx, x) => Math.max(mx, Number(x.total_estimated_value || 0)), 0);
  }, [funnelSorted]);

  const barCategories = React.useMemo(() => funnelSorted.map((x) => stageLabelTH(x.status)), [funnelSorted]);
  const barValues = React.useMemo(() => funnelSorted.map((x) => Number(x.total_estimated_value || 0)), [funnelSorted]);
  const barCounts = React.useMemo(() => funnelSorted.map((x) => Number(x.opportunity_count || 0)), [funnelSorted]);
  const barColors = React.useMemo(() => funnelSorted.map((x) => stageColorHex(x.status)), [funnelSorted]);

  const barSeries = React.useMemo(() => [{ name: 'มูลค่า', data: barValues }], [barValues]);

  const barOptions = React.useMemo(() => {
    return {
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 3 } },
      colors: barColors,
      dataLabels: {
        enabled: true,
        style: { fontSize: isSmDown ? '11px' : '12px' },
        formatter: (val, opts) => {
          const i = opts.dataPointIndex;
          const count = barCounts[i] ?? 0;
          return `${formatMoneyTHB(val)} • ${count} รายการ`;
        },
      },
      xaxis: {
        categories: barCategories,
        labels: {
          formatter: (val) => {
            const n = Number(val);
            return Number.isFinite(n) ? n.toLocaleString('th-TH') : val;
          },
        },
      },
      yaxis: { labels: { style: { fontWeight: 800 } } },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3, padding: { top: 0, right: 8, bottom: 0, left: 8 } },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const i = opts.dataPointIndex;
            const count = barCounts[i] ?? 0;
            return `${formatMoneyTHB(val)} • ${count} รายการ`;
          },
        },
      },
      legend: { show: false },
    };
  }, [barCategories, barCounts, barColors, isSmDown]);

  const wl = React.useMemo(() => {
    const won = winLoss.find((x) => x.status === 'Won') || { count: 0, percentage: 0 };
    const lost = winLoss.find((x) => x.status === 'Lost') || { count: 0, percentage: 0 };
    const total = Number(won.count || 0) + Number(lost.count || 0);
    return { won, lost, total };
  }, [winLoss]);

  const donutSeries = React.useMemo(() => [Number(wl.won.count || 0), Number(wl.lost.count || 0)], [wl]);
  const donutHeight = isSmDown ? 220 : 270;

  const donutOptions = React.useMemo(() => {
    return {
      labels: ['ชนะงาน', 'แพ้งาน'],
      colors: ['#08d84c', '#ff4059'],
      chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'inherit' },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (val) => `${val}` } },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              name: { show: true, fontSize: '13px', fontFamily: 'inherit', fontWeight: 700 },
              value: { show: true, fontSize: '20px', fontFamily: 'inherit', fontWeight: 900 },
              total: { show: true, label: 'รวม', formatter: () => `${wl.total || 0}`, fontSize: '14px', fontFamily: 'inherit', fontWeight: 800 },
            },
          },
        },
      },
    };
  }, [wl]);

  const newThisMonth = React.useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return (opps || []).filter((x) => (x.created_at ? String(x.created_at).slice(0, 7) === ym : false)).length;
  }, [opps]);

  const handleExportCSV = React.useCallback(() => {
    const rows = (opps || []).map((r) => ({
      project_name: r.project_name,
      customer: r.customer_display_name,
      deadline_date: r.deadline_date,
      estimated_value: r.estimated_value,
      probability: r.probability,
      status: stageLabelTH(r.status),
    }));

    const headerRow = ['project_name', 'customer', 'deadline_date', 'estimated_value', 'probability', 'status'];
    const csv = [
      headerRow.join(','),
      ...rows.map((x) =>
        headerRow
          .map((k) => {
            const v = x[k] ?? '';
            const s = String(v).replaceAll('"', '""');
            return `"${s}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_opportunities_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }, [opps]);

  const FlatCard = ({ title, children, right, sx }) => (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        ...(sx || {}),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 0.75, sm: 0 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        {typeof title === 'string' ? <Typography sx={{ fontWeight: 900 }}>{title}</Typography> : title}
        {right}
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );

  // =========================
  // ✅ Actions
  // =========================
  const beginUpdateStatus = React.useCallback(() => {
    if (!selectedOpp) return;
    setNextStatus(selectedOpp.status || 'Lead');
    resetStatusExtras();
    setStatusOpen(true);
  }, [selectedOpp, resetStatusExtras]);

  const beginInactive = React.useCallback(() => {
    if (!selectedOpp) return;
    setInactiveOpen(true);
  }, [selectedOpp]);

  // ✅ helper สำหรับ Stepper
  const activeStep = React.useMemo(() => {
    const i = UPDATE_STATUS_OPTIONS.indexOf(nextStatus);
    return i >= 0 ? i : 0;
  }, [nextStatus]);

  // ✅ กติกาไฟล์ตามสถานะ (เข้มงวด)
  const requiredFileHint = React.useMemo(() => REQUIRED_FILES_BY_STATUS[nextStatus] || '', [nextStatus]);
  const requiresFiles = React.useMemo(() => Boolean(REQUIRED_FILES_BY_STATUS[nextStatus]), [nextStatus]);

  const onPickFiles = React.useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachFiles((prev) => {
      const merged = [...prev, ...files];
      const seen = new Set();
      return merged.filter((f) => {
        const k = `${f.name}__${f.size}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    });
    e.target.value = '';
  }, []);

  const removeFileAt = React.useCallback((idx) => {
    setAttachFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ✅ Semi-circle gauge (Apex radialBar)
  const gaugeValue = React.useMemo(() => Number(STATUS_FIXED_PROB[nextStatus] ?? 0), [nextStatus]);
  const gaugeColor = React.useMemo(() => stageColorHex(nextStatus), [nextStatus]);

  const gaugeSeries = React.useMemo(() => [gaugeValue], [gaugeValue]);
  const gaugeOptions = React.useMemo(() => {
    return {
      chart: { type: 'radialBar', sparkline: { enabled: true }, fontFamily: 'inherit' },
      colors: [gaugeColor],
      plotOptions: {
        radialBar: {
          startAngle: -90,
          endAngle: 90,
          hollow: { size: '68%' },
          track: { background: '#e5e7eb', strokeWidth: '100%' },
          dataLabels: {
            name: { show: false },
            value: {
              show: true,
              fontSize: isSmDown ? '18px' : '20px',
              fontWeight: 900,
              offsetY: 6,
              formatter: (val) => `${Math.round(Number(val || 0))}%`,
            },
          },
        },
      },
      stroke: { lineCap: 'round' },
      grid: { padding: { top: -10, bottom: -10, left: -10, right: -10 } },
    };
  }, [gaugeColor, isSmDown]);

  const showFileBox = React.useMemo(() => {
    const idx = UPDATE_STATUS_OPTIONS.indexOf(nextStatus);
    const threshold = UPDATE_STATUS_OPTIONS.indexOf('Proposal Sent');
    return idx >= threshold;
  }, [nextStatus]);

  const isActivityInvalid = React.useMemo(() => strictMode && submitTried && !activityNote.trim(), [strictMode, submitTried, activityNote]);
  const isFollowUpInvalid = React.useMemo(
    () => strictMode && submitTried && (!followUpAt || !dayjs(followUpAt).isValid()),
    [strictMode, submitTried, followUpAt]
  );

  // ✅ helper: create activity แบบปลอดภัย (รองรับ schema ที่มี/ไม่มี opportunity_id)
  const createActivitySafe = React.useCallback(
    async ({ customerUuid, activityType, activityDescription, activityAt, opportunityId }) => {
      const basePayload = {
        customer_id: customerUuid,
        activity_type: activityType,
        activity_description: String(activityDescription || '').trim(),
        activity_at: dayjs(activityAt).toDate(),
      };

      // 1) ลองส่งแบบมี opportunity_id ก่อน (ถ้ารู้ id)
      if (opportunityId) {
        const tryWithOpp = { ...basePayload, opportunity_id: opportunityId };
        const res1 = await createCustomerActivity(tryWithOpp);
        if (!res1?.error) return res1;

        // ถ้าตารางไม่มีคอลัมน์ opportunity_id จะ error — ให้ fallback
        const msg = String(res1?.error?.message || '');
        if (!msg.toLowerCase().includes('opportunity_id')) return res1;
      }

      // 2) fallback: ส่งแบบไม่มี opportunity_id
      const res2 = await createCustomerActivity(basePayload);
      return res2;
    },
    []
  );

  const saveStatus = React.useCallback(async () => {
    if (!selectedOpp?.opportunity_id) return;

    setSubmitTried(true);

    if (strictMode) {
      if (!activityNote.trim()) {
        notify.warning('กรุณาบันทึกกิจกรรมลูกค้า');
        return;
      }
      if (!followUpAt || !dayjs(followUpAt).isValid()) {
        notify.warning('กรุณาระบุวันติดตาม');
        return;
      }
      if (requiresFiles && attachFiles.length === 0) {
        notify.warning('สถานะนี้ต้องแนบไฟล์ก่อนบันทึก');
        return;
      }
    }

    // ✅ สำคัญ: v_sales_opportunity_list ใช้ชื่อฟิลด์ customer_uuid
    const customerUuid = selectedOpp?.customer_uuid || null;
    if (!customerUuid) {
      notify.error('ไม่พบ customer_uuid ในรายการนี้ (v_sales_opportunity_list)');
      return;
    }

    const prob = STATUS_FIXED_PROB[nextStatus] ?? 0;

    setBusyAction(true);
    try {
      // 1) บันทึกกิจกรรมลูกค้าจริง (ให้ Key Client Activity อัปเดตได้)
      const actRes = await createActivitySafe({
        customerUuid,
        activityType: nextStatus,
        activityDescription: activityNote,
        activityAt: followUpAt,
        opportunityId: selectedOpp.opportunity_id, // มีให้ก็ส่งไป (ถ้าตารางรองรับ)
      });
      if (actRes?.error) throw actRes.error;

      // 2) อัปเดตโอกาส (สถานะ + probability)
      const oppPayload = {
        status: nextStatus,
        probability: prob,
      };
      // ถ้าเป็น Proposal Sent ต้องใส่ follow_up_date ตาม constraint ของ DB
      if (nextStatus === 'Proposal Sent' && followUpAt && dayjs(followUpAt).isValid()) {
        oppPayload.follow_up_date = dayjs(followUpAt).toISOString();
      }
      const { error: oppErr } = await updateOpportunity(selectedOpp.opportunity_id, oppPayload);
      if (oppErr) throw oppErr;

      // 3) TODO: อัปโหลดไฟล์แนบ -> bucket opportunity-files + table attachments
      // 3) อัปโหลดไฟล์แนบ -> bucket opportunity-files + table attachments
      if (Array.isArray(attachFiles) && attachFiles.length) {
        // attachFiles are File objects from input
        const { error: upErr } = await uploadOpportunityAttachments(selectedOpp.opportunity_id, attachFiles, {
          customerId: customerUuid,
          createdBy: null,
          metadata: {},
        });
        if (upErr) throw upErr;
      }
      notify.success('อัปเดตสถานะแล้ว');
      setStatusOpen(false);
      setActionOpen(false);
      await load();
    } catch (e) {
      notify.error(e?.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setBusyAction(false);
    }
  }, [
    selectedOpp,
    strictMode,
    activityNote,
    followUpAt,
    requiresFiles,
    attachFiles,
    nextStatus,
    notify,
    load,
    createActivitySafe,
  ]);

  const confirmInactive = React.useCallback(async () => {
    if (!selectedOpp?.opportunity_id) return;

    setBusyAction(true);
    try {
      const { error } = await updateOpportunity(selectedOpp.opportunity_id, {
        status: 'Inactive',
        probability: STATUS_FIXED_PROB.Inactive,
      });
      if (error) throw error;

      notify.success('ปิดดีล–ไม่ใช้งานแล้ว');
      setInactiveOpen(false);
      setActionOpen(false);
      await load();
    } catch (e) {
      notify.error(e?.message || 'ทำรายการไม่สำเร็จ');
    } finally {
      setBusyAction(false);
    }
  }, [selectedOpp, notify, load]);

  return (
    <Box>
      {/* ===== header ===== */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        {loading ? <Skeleton variant="text" width={260} height={44} /> : <Typography variant="h4" sx={{ fontWeight: 900 }}>การขาย</Typography>}

        {loading ? (
          <Skeleton variant="rectangular" width={170} height={38} sx={{ borderRadius: 2, alignSelf: { xs: 'flex-start', sm: 'auto' } }} />
        ) : (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            sx={{ borderRadius: 2, boxShadow: 'none', bgcolor: '#ff4059', color: '#ffffff', '&:hover': { bgcolor: '#e63a52' }, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
            onClick={openCreate}
            disabled={loading}
          >
            สร้างโอกาสใหม่
          </Button>
        )}
      </Stack>

      {/* ********** เริ่ม: ส่วนเดิมทั้งหมดของคุณ ********** */}
      {/* 0) Header cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' }}>
          {loading ? <Skeleton variant="text" width="70%" height={20} /> : <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>มูลค่ารวมของโอกาสทางการขาย</Typography>}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1, width: '80%' }} />
              <Skeleton variant="text" width="50%" height={14} />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 30, fontWeight: 900, mt: 0.5, color: '#ff4059' }}>{formatMoneyTHB(header?.pipeline_value)}</Typography>
          )}
          {loading ? <Skeleton variant="text" width="55%" height={14} /> : <Typography variant="caption" color="text.secondary">*รวมเฉพาะสถานะที่ยังไม่ปิดดีล</Typography>}
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' }}>
          {loading ? <Skeleton variant="text" width="60%" height={20} /> : <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>อัตราความสำเร็จ</Typography>}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1, width: '80%' }} />
              <Skeleton variant="text" width="50%" height={14} />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 30, fontWeight: 900, mt: 0.5, color: '#08d84c' }}>{Number(header?.win_rate_percent || 0).toFixed(0)}%</Typography>
          )}
          {loading ? <Skeleton variant="text" width="65%" height={14} /> : <Typography variant="caption" color="text.secondary">*คำนวณจาก ชนะงาน / (ชนะงาน+แพ้งาน)</Typography>}
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' }}>
          {loading ? <Skeleton variant="text" width="75%" height={20} /> : <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>ข้อเสนอที่ต้องติดตาม</Typography>}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1, width: '80%' }} />
              <Skeleton variant="text" width="50%" height={14} />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 30, fontWeight: 900, mt: 0.5, color: '#fdca01' }}>{header?.proposals_followup_7d_count ?? 0}</Typography>
          )}
          {loading ? <Skeleton variant="text" width="45%" height={14} /> : <Typography variant="caption" color="text.secondary">*อิงวันที่ติดตาม</Typography>}
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' }}>
          {loading ? <Skeleton variant="text" width="60%" height={20} /> : <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>โอกาสใหม่เดือนนี้</Typography>}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1, width: '80%' }} />
              <Skeleton variant="text" width="50%" height={14} />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 30, fontWeight: 900, mt: 0.5, color: '#8B5CF6' }}>{newThisMonth}</Typography>
          )}
          {loading ? <Skeleton variant="text" width="80%" height={14} /> : <Typography variant="caption" color="text.secondary">*นับจากวันที่สร้างในรายการที่โหลดมา</Typography>}
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mb: 2, alignItems: 'stretch' }}>
        <FlatCard title={loading ? <Skeleton variant="text" width={220} height={22} /> : 'แผนภาพโอกาสการขาย'}>
          {loading ? (
            <Box sx={{ p: 1 }}><Skeleton variant="rounded" height={chartHeight} /></Box>
          ) : maxFunnelValue <= 0 ? (
            <Typography color="text.secondary">ยังไม่มีข้อมูลแผนภาพโอกาสการขาย</Typography>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'hidden' }}>
              <ReactApexChart options={barOptions} series={barSeries} type="bar" height={chartHeight} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                *กราฟแท่งแนวนอนแสดง “มูลค่า” และ “จำนวนรายการ” ในแต่ละสถานะ
              </Typography>
            </Box>
          )}
        </FlatCard>

        <FlatCard title={loading ? <Skeleton variant="text" width={160} height={22} /> : 'สัดส่วนการปิดงาน'}>
          {loading ? (
            <Box sx={{ p: 1 }}><Skeleton variant="rounded" height={220} /></Box>
          ) : (
            <Box>
              {wl.total ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={donutHeight} />
                </Box>
              ) : (
                <Typography color="text.secondary">ยังไม่มีรายการที่ปิดดีล</Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                *คำนวณจากรายการที่ปิดดีลแล้วเท่านั้น (ชนะงาน/แพ้งาน)
              </Typography>
            </Box>
          )}
        </FlatCard>
      </Box>

      <FlatCard
        title={loading ? <Skeleton variant="text" width={320} height={22} /> : 'รายการโอกาสทางการขาย'}
        right={
          loading ? (
            <Skeleton variant="rectangular" width={140} height={34} sx={{ borderRadius: 2 }} />
          ) : (
            <Tooltip title="ส่งออก CSV">
              <span>
                <IconButton onClick={handleExportCSV} aria-label="ส่งออก CSV" sx={{ borderRadius: 2, border: '1px solid', borderColor: 'grey.200', p: 1 }} disabled={loading || !opps.length}>
                  <CloudDownloadIcon />
                </IconButton>
              </span>
            </Tooltip>
          )
        }
      >
        {loading ? (
          <TableContainer sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2 }}>
              <Skeleton variant="text" width="50%" height={20} />
              <Stack spacing={1} sx={{ mt: 1 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            </Box>
          </TableContainer>
        ) : (
          <TableContainer sx={{ borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 760, '& td, & th': { borderBottom: 'none' } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 800 }}>โครงการ / ลูกค้า</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 200, textAlign: 'right' }}>มูลค่า (ประมาณการ)</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 160, display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>วันหมดอายุ</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120, display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>โอกาส</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 160, textAlign: 'center' }}>สถานะ</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {(opps || []).map((r) => (
                  <TableRow
                    key={r.opportunity_id}
                    hover
                    onClick={() => openAction(r)}
                    sx={{ cursor: 'pointer', '&:hover td': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell>
                      <Typography variant="body2">{r.project_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{r.customer_display_name}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{formatMoneyTHB(r.estimated_value)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center' }}>{formatDateTH(r.deadline_date)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center' }}>{Number(r.probability || 0)}%</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="medium"
                        label={stageLabelTH(r.status)}
                        sx={{
                          width: '100%',
                          borderRadius: 1,
                          fontWeight: 500,
                          textTransform: 'none',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          py: 0.5,
                          ...statusChipSx(r.status),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {!opps?.length ? (
                  <TableRow>
                    <TableCell colSpan={5}><Typography color="text.secondary">ยังไม่มีข้อมูลโอกาสทางการขาย</Typography></TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </FlatCard>

      <Box sx={{ height: 16 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2, alignItems: 'stretch' }}>
        <FlatCard title={loading ? <Skeleton variant="text" width={260} height={22} /> : 'ข้อเสนอที่ต้องติดตาม'}>
          {loading ? (
            <Box sx={{ p: 1 }}><Skeleton variant="rounded" height={220} /></Box>
          ) : (
            <Stack spacing={1.25}>
              {(followups || []).map((x) => {
                const days = daysBetweenDates(x.follow_up_date, x.deadline_date);
                return (
                  <Paper
                    key={x.opportunity_id}
                    elevation={0}
                    sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{x.project_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {x.customer_display_name} •{' '}
                        {days == null ? (
                          <>
                            ติดตาม: {formatDateTH(x.follow_up_date)} • หมดอายุ: {formatDateTH(x.deadline_date)}
                          </>
                        ) : (
                          `เหลือ ${days} วัน`
                        )}{' '}
                        • {formatMoneyTHB(x.estimated_value)}
                      </Typography>
                    </Box>

                    <Tooltip title="ติดตาม">
                      <IconButton
                        aria-label="ติดตาม"
                        onClick={() => openAction(x)}
                        sx={{ bgcolor: '#ff4059', color: '#ffffff', '&:hover': { bgcolor: '#e63a52' }, borderRadius: 2, boxShadow: 'none', alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                        size="medium"
                      >
                        <EventNoteIcon />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                );
              })}

              {!followups?.length ? (
                <Typography color="text.secondary">ไม่มีรายการที่ต้องติดตาม</Typography>
              ) : null}
            </Stack>
          )}
        </FlatCard>

        <FlatCard title={loading ? <Skeleton variant="text" width={220} height={22} /> : 'กิจกรรมลูกค้าสำคัญ'}>
          {loading ? (
            <Box sx={{ p: 1 }}><Skeleton variant="rounded" height={220} /></Box>
          ) : (
            <Stack spacing={1.25}>
              {(activities || []).map((a) => (
                <Paper
                  key={a.activity_id}
                  elevation={0}
                  sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{a.customer_display_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{a.activity_description}</Typography>
                  </Box>

                  <Box sx={{ mt: { xs: 1, sm: 0 }, textAlign: 'right', minWidth: 140 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: stageColorHex(a.activity_type), fontWeight: 700 }}>
                      {stageLabelTH(a.activity_type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {formatDateTimeTH(a.activity_at)}
                    </Typography>
                  </Box>
                </Paper>
              ))}

              {!activities?.length ? (
                <Typography color="text.secondary">ยังไม่มีกิจกรรมลูกค้าสำคัญ</Typography>
              ) : null}
            </Stack>
          )}
        </FlatCard>
      </Box>
      {/* ********** จบ: ส่วนเดิมทั้งหมดของคุณ ********** */}

      {/* =========================
          ✅ Action Dialog
         ========================= */}
      <Dialog
        open={actionOpen}
        onClose={closeAction}
        fullWidth
        maxWidth="xs"
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>จัดการ</Typography>
            </Box>
            <IconButton onClick={closeAction} aria-label="close"><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, mt: 2 }}>
          <Stack spacing={1.25}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SyncAltRoundedIcon />}
              onClick={beginUpdateStatus}
              disabled={!selectedOpp?.opportunity_id || busyAction}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, boxShadow: 'none', borderRadius: 2 }}
            >
              อัปเดตสถานะ
            </Button>

            <Tooltip
              title={selectedOpp?.status && !CAN_INACTIVATE.has(selectedOpp.status) ? 'แก้ไขได้เฉพาะ “โอกาสใหม่” และ “กำลังติดต่อ”' : ''}
              disableHoverListener={!(selectedOpp?.status && !CAN_INACTIVATE.has(selectedOpp.status))}
            >
              <span>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => {
                    if (!selectedOpp?.opportunity_id) return;
                    setActionOpen(false);
                    openEdit(selectedOpp.opportunity_id);
                  }}
                  disabled={!selectedOpp?.opportunity_id || busyAction || !CAN_INACTIVATE.has(selectedOpp?.status)}
                  sx={{ boxShadow: 'none', borderRadius: 2 }}
                >
                  แก้ไขรายละเอียด
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={selectedOpp?.status && !CAN_INACTIVATE.has(selectedOpp.status) ? 'ปิดดีล–ไม่ใช้งานได้เฉพาะ “โอกาสใหม่” และ “กำลังติดต่อ”' : ''}
              disableHoverListener={!(selectedOpp?.status && !CAN_INACTIVATE.has(selectedOpp.status))}
            >
              <span>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  startIcon={<BlockRoundedIcon />}
                  onClick={beginInactive}
                  disabled={!selectedOpp?.opportunity_id || busyAction || !CAN_INACTIVATE.has(selectedOpp?.status)}
                  sx={{ boxShadow: 'none', borderRadius: 2 }}
                >
                  ปิดดีล–ไม่ใช้งาน
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* =========================
          ✅ Update Status Dialog (Gauge + Stepper + DatePicker TH + Activity + Attachments)
         ========================= */}
      <Dialog
        open={statusOpen}
        onClose={() => (busyAction ? null : setStatusOpen(false))}
        fullWidth
        maxWidth="sm"
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>อัปเดตสถานะ</Typography>
            <IconButton onClick={() => (busyAction ? null : setStatusOpen(false))} aria-label="close"><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {/* Gauge */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', maxWidth: 320 }}>
              <ReactApexChart options={gaugeOptions} series={gaugeSeries} type="radialBar" height={300} />
            </Box>
          </Box>

          {/* Stepper (ข้อความอย่างเดียว + ตัวเล็ก + สีตามสถานะ) */}
          <Box sx={{ px: { xs: 0, sm: 0.5 }, pb: 1.25 }}>
            <Stepper
              nonLinear
              activeStep={activeStep}
              alternativeLabel
              sx={{
                '& .MuiStepLabel-label': { fontSize: { xs: 10, sm: 11 } },
                '& .MuiStepConnector-line': { borderColor: 'grey.300' },
              }}
            >
              {UPDATE_STATUS_OPTIONS.map((s) => {
                const c = stageColorHex(s);
                const isActive = s === nextStatus;
                return (
                  <Step key={s}>
                    <StepButton
                      onClick={() => setNextStatus(s)}
                      sx={{
                        px: 0.5,
                        '& .MuiStepIcon-root': { color: c },
                        '& .MuiStepIcon-text': { fill: '#fff', fontWeight: 900, fontSize: '10px' },
                        '& .MuiStepLabel-label': { color: isActive ? c : 'text.secondary', fontWeight: isActive ? 800 : 400 },
                        '&:hover .MuiStepLabel-label': { color: c },
                      }}
                    >
                      {stageLabelTH(s)}
                    </StepButton>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <DatePicker
              sx={{ mt: 1.5 }}
              label="วันติดตาม (ใช้แจ้งเตือน)"
              value={followUpAt}
              onChange={(v) => setFollowUpAt(v)}
              disabled={busyAction}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  error: isFollowUpInvalid,
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            sx={{ mt: 1.5 }}
            label="บันทึกกิจกรรมลูกค้า"
            value={activityNote}
            onChange={(e) => setActivityNote(e.target.value)}
            placeholder="เช่น โทรคุยกับลูกค้า, ส่งใบเสนอราคา, นัดประชุม, สรุปเงื่อนไข ฯลฯ"
            fullWidth
            multiline
            minRows={3}
            disabled={busyAction}
            error={isActivityInvalid}
            size="small"
          />

          {showFileBox ? (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileRoundedIcon />}
                  component="label"
                  disabled={busyAction}
                  color="primary"
                  sx={{ borderRadius: 2, boxShadow: 'none' }}
                >
                  เลือกไฟล์
                  <input hidden multiple type="file" onChange={onPickFiles} />
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {attachFiles.length ? `${attachFiles.length} ไฟล์` : 'ยังไม่ได้เลือกไฟล์'}
                </Typography>
              </Stack>

              {strictMode && requiresFiles && attachFiles.length === 0 ? (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontSize: 12, color: 'error.main' }}>
                  หมายเหตุ: สถานะนี้ต้องแนบไฟล์ ({requiredFileHint})
                </Typography>
              ) : null}

              {attachFiles.length ? (
                <Paper elevation={0} sx={{ mt: 1.25, border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' }}>
                  <List dense disablePadding>
                    {attachFiles.map((f, idx) => (
                      <ListItem
                        key={`${f.name}-${f.size}-${idx}`}
                        secondaryAction={
                          <IconButton size="small" color="grey" onClick={() => removeFileAt(idx)} disabled={busyAction} aria-label="ลบ">
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{f.name}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">{Math.round((f.size / 1024) * 10) / 10} KB</Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              ) : null}
            </>
          ) : null}


          <Stack direction="row" spacing={1.25} justifyContent="center" sx={{mt:3}}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CancelRoundedIcon />}
              onClick={() => setStatusOpen(false)}
              disabled={busyAction}
              sx={{ borderRadius: 2, boxShadow: 'none', minWidth: 140 }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={!busyAction ? <SaveRoundedIcon /> : null}
              onClick={saveStatus}
              disabled={busyAction}
              sx={{ borderRadius: 2, boxShadow: 'none', minWidth: 140 }}
            >
              {busyAction ? (
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <CircularProgress size={18} color="inherit" />
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>กำลังบันทึก...</Typography>
                </Stack>
              ) : (
                'บันทึก'
              )}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* =========================
          ✅ Confirm Inactive Dialog
         ========================= */}
      <Dialog
        open={inactiveOpen}
        onClose={() => (busyAction ? null : setInactiveOpen(false))}
        fullWidth
        maxWidth="xs"
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>ยืนยันการปิดดีล–ไม่ใช้งาน</Typography>
            <IconButton onClick={() => (busyAction ? null : setInactiveOpen(false))} aria-label="close"><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            รายการนี้จะถูกตั้งเป็น <b>“ปิดดีล–ไม่ใช้งาน”</b> และจะไม่ถูกนับใน pipeline (แต่ยังเก็บข้อมูลไว้ดูย้อนหลัง)
          </Typography>

          <Stack direction="row" spacing={1.25} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => setInactiveOpen(false)} disabled={busyAction} sx={{ borderRadius: 2, boxShadow: 'none' }}>
              ยกเลิก
            </Button>
            <Button variant="contained" color="error" onClick={confirmInactive} disabled={busyAction} sx={{ borderRadius: 2, boxShadow: 'none' }}>
              ยืนยัน
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create/Edit Opportunity (ฟอร์มเต็ม) */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        fullWidth
        maxWidth="sm"
        PaperProps={{ elevation: 0, sx: { border: '1px solid', borderColor: 'grey.200', boxShadow: 'none' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{editId ? 'แก้ไขโอกาสทางการขาย' : 'สร้างโอกาสทางการขาย'}</Typography>
            <IconButton onClick={closeForm} aria-label="close"><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <SalesOpportunityFormDialog
            opportunityId={editId}
            onClose={closeForm}
            onSaved={async () => {
              await load();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
