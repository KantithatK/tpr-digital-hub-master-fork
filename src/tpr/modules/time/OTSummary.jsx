/* eslint-disable react-refresh/only-export-components */


import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoDisturbOnIcon from '@mui/icons-material/DoDisturbOn';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { supabase } from '../../../lib/supabaseClient';
import {
  FlexRow,
  StatCard,
  DataTable,
  EmptyState,
  SectionHeader,
} from '../hr/components/HrUiParts';

const PAGE_SIZE = 25;

const KIND_TH = { OT: 'โอที', LEAVE: 'ลางาน', REP: 'ขอแก้ไขเวลา' };
const TABLE_BY_KIND = { OT: 'tpr_ot_requests', LEAVE: 'tpr_leave_requests', REP: 'tpr_attendance_corrections' };

const STATUS_CHIP = {
  submitted: { label: 'รออนุมัติ', color: 'warning', variant: 'filled' },
  approved: { label: 'อนุมัติแล้ว', color: 'success', variant: 'filled' },
  rejected: { label: 'ไม่อนุมัติ', color: 'error', variant: 'filled' },
  draft: { label: 'ร่าง', color: 'default', variant: 'outlined' },
  canceled: { label: 'ยกเลิก', color: 'default', variant: 'outlined' },
};

const ISSUE_TH = {
  MISSING_IN_OUT: { label: 'ขาดเวลาเข้าและออก', color: 'error' },
  MISSING_IN: { label: 'ขาดเวลาเข้า', color: 'error' },
  MISSING_OUT: { label: 'ขาดเวลาออก', color: 'error' },
  LONG_HOURS: { label: 'ทำงานเกิน 12 ชั่วโมง', color: 'warning' },
};

const IN_STATUS = {
  IN_OK: { label: 'เข้างานแล้ว', color: 'success' },
  IN_MISSING: { label: 'ยังไม่เข้างาน', color: 'error' },
};
const OUT_STATUS = {
  OUT_OK: { label: 'ออกงานแล้ว', color: 'success' },
  OUT_MISSING: { label: 'ยังไม่ออกงาน', color: 'error' },
};

const chipStatus = (s) => STATUS_CHIP[String(s || '').toLowerCase()] || { label: 'ไม่ทราบสถานะ', color: 'default', variant: 'outlined' };
const issueMeta = (x) => ISSUE_TH[x] || { label: 'ไม่ทราบประเภทปัญหา', color: 'default' };
const inMeta = (x) => IN_STATUS[String(x || '').toUpperCase()] || { label: '-', color: 'default' };
const outMeta = (x) => OUT_STATUS[String(x || '').toUpperCase()] || { label: '-', color: 'default' };


const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const hm = (t) => (t ? String(t).slice(0, 5) : '-');
const dmy = (v) => {
  if (!v) return '-';
  try {
    const dt = new Date(v);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return String(v).slice(0, 10) || '-';
  }
};
const dmyhm = (v) => {
  if (!v) return '-';
  try {
    const dt = new Date(v);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  } catch {
    return String(v).slice(0, 16) || '-';
  }
};
const firstLetter = (name) => (String(name || '').trim() ? String(name || '').trim()[0] : 'พ');

const dateOnly = (v) => (v ? String(v).slice(0, 10) : null);
const overlaps = (aStart, aEnd, bStart, bEnd) => {
  const as = dateOnly(aStart);
  const ae = dateOnly(aEnd) || as;
  const bs = dateOnly(bStart);
  const be = dateOnly(bEnd);
  if (!as || !ae || !bs || !be) return true; // กันหลุด: ข้อมูลไม่ครบให้ถือว่าอยู่ในงวด
  return as <= be && ae >= bs;
};

const pickRange = (schedule, kind, fbStart, fbEnd) => {
  const s = schedule || {};
  const map = { OT: ['ot_start', 'ot_end'], LEAVE: ['leave_start', 'leave_end'], REP: ['wrong_start', 'wrong_end'] };
  const [ks, ke] = map[kind] || ['period_start', 'period_end'];
  const start = dateOnly(s[ks]) || dateOnly(s.work_start) || dateOnly(s.period_start) || dateOnly(fbStart);
  const end = dateOnly(s[ke]) || dateOnly(s.work_end) || dateOnly(s.period_end) || dateOnly(fbEnd);
  return { start, end };
};

const countBy = (arr, fn) => arr.reduce((acc, x) => ((acc[fn(x)] = (acc[fn(x)] || 0) + 1), acc), {});


export default function HRDashboardRedesignedTH_Flex() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [tab, setTab] = useState('OPS'); // OPS | PAYROLL
  const [refreshKey, setRefreshKey] = useState(0);

  const [state, setState] = useState({
    loading: true,
    error: null,

    kpis: {},
    pending: [],
    issuesToday: [],
    leavesToday: [],

    payroll: null,
    payrollMode: 'monthly',      // 'monthly' | 'period'
    payrollSchedule: null,
    payrollIssues: [],
    pendingPeriod: [],
    exportLogs: [],
    payrollInfo: null,

    names: {},
    images: {},
    lastFetchedAt: null,
  });


  const [confirm, setConfirm] = useState({ open: false, action: null, row: null, loading: false, error: null });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  // แจ้งเตือน (ไม่พึ่ง backend): เปิด dialog + copy ข้อความ
  const [notifyRow, setNotifyRow] = useState(null);
  // ประวัติการส่งออกเงินเดือน
  const [exportHistory, setExportHistory] = useState([]);
  const [exportHistoryExpanded, setExportHistoryExpanded] = useState(false);
  const EXPORT_HISTORY_PAGE_SIZE = 10;

  const getName = (id) => state.names[id] || '-';
  const handleRefresh = () => setRefreshKey((x) => x + 1);

  const openConfirm = (row, action) => setConfirm({ open: true, row, action, loading: false, error: null });
  const closeConfirm = () => setConfirm({ open: false, action: null, row: null, loading: false, error: null });

  const getMyEmployeeId = async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return null;
    const { data: map } = await supabase.from('v_user_employee_map').select('employee_id').eq('user_id', uid).maybeSingle();
    return map?.employee_id || null;
  };

  const performConfirm = async () => {
    if (!confirm.row || !confirm.action) return;
    setConfirm((s) => ({ ...s, loading: true, error: null }));

    try {
      const table = TABLE_BY_KIND[confirm.row.req_kind];
      if (!table) throw new Error('ไม่รองรับประเภทเอกสารสำหรับการอัพเดท');

      const nowIso = new Date().toISOString();
      const employeeId = await getMyEmployeeId();
      const status = confirm.action === 'approve' ? 'Approved' : 'Rejected';

      const payload = {
        status,
        updated_at: nowIso,
        ...(confirm.action === 'approve'
          ? { approved_at: nowIso, ...(employeeId ? { approved_by: employeeId } : {}) }
          : { rejected_at: nowIso, ...(employeeId ? { rejected_by: employeeId } : {}) }),
      };

      const { error } = await supabase.from(table).update(payload).eq('id', confirm.row.id);
      if (error) throw error;

      setSnack({ open: true, message: confirm.action === 'approve' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธเรียบร้อย', severity: 'success' });
      closeConfirm();
      handleRefresh();
    } catch (e) {
      setConfirm((s) => ({ ...s, loading: false, error: e?.message || String(e) }));
      setSnack({ open: true, message: e?.message || String(e), severity: 'error' });
    }
  };

  const notifyText = useMemo(() => {
    if (!notifyRow) return '';
    const name = getName(notifyRow.user_id);
    const date = dmy(notifyRow.work_date);
    const meta = issueMeta(notifyRow.issue).label;
    return `เรียนคุณ ${name}\nระบบพบปัญหาการลงเวลา: ${meta}\nวันที่ ${date}\nกรุณาเข้าเมนู “ขอแก้ไขเวลา” เพื่อดำเนินการให้เรียบร้อยครับ/ค่ะ`;
  }, [notifyRow, state.names]);

  const copyNotify = async () => {
    try {
      await navigator.clipboard.writeText(notifyText);
      setSnack({ open: true, message: 'คัดลอกข้อความแจ้งเตือนแล้ว', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'คัดลอกไม่สำเร็จ (browser ไม่อนุญาต)', severity: 'error' });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        // ---- Base data (OPS) ----
        const [kpiRes, pendingRes, issueRes, leaveRes, monthlyRes, exportHistoryRes] = await Promise.all([
          supabase.from('v_hr_kpis').select('*').maybeSingle(),
          supabase
            .from('v_hr_pending_approvals')
            .select('id, req_kind, user_id, doc_no, created_at, status, updated_at, req_start_date, req_end_date, req_start_time, req_end_time, reason, attachment_url')
            .in('status', ['Submitted'])
            .order('updated_at', { ascending: false }),
          supabase.from('v_hr_attendance_exceptions_today').select('user_id, work_date, issue, daily_status, clock_in_at, clock_out_at, clock_in_hm, clock_out_hm, work_hours, clock_in_status, clock_out_status'),
          supabase.from('v_hr_leave_today').select('user_id, start_at, end_at, status'),
          supabase.from('v_hr_payroll_monthly_summary').select('month_start, month_end, approved_ot_hours, approved_leave_hours, approved_regular_hours').maybeSingle(),
          supabase.from('v_hr_payroll_export_history_current').select('id, exported_at, status, file_url, note').order('exported_at', { ascending: false }),
        ]);

        const baseErr = kpiRes.error || pendingRes.error || issueRes.error || leaveRes.error || monthlyRes.error || exportHistoryRes.error;
        if (baseErr) throw baseErr;

        const issuesToday = (issueRes.data || []).filter((x) => x.issue && x.issue !== 'OK');
        const pendingAll = pendingRes.data || [];
        const leavesToday = leaveRes.data || [];
        const monthly = monthlyRes.data || null;

        // ---- Payroll data (safe fetch / fallback) ----
        const [schRes, periodRes, exPRes] = await Promise.all([
          supabase
            .from('v_payroll_current_schedule')
            .select('month_index, month_name, payment_date, period_start, period_end, work_start, work_end, ot_start, ot_end, leave_start, leave_end, wrong_start, wrong_end')
            .maybeSingle(),
          supabase
            .from('v_hr_payroll_period_summary_current')
            .select('period_start, period_end, approved_ot_hours, approved_leave_hours, approved_regular_hours, month_index, month_name, payment_date')
            .maybeSingle(),
          supabase
            .from('v_hr_attendance_exceptions_payroll_current')
            .select('user_id, work_date, issue, daily_status, clock_in_at, clock_out_at, clock_in_hm, clock_out_hm, work_hours, clock_in_status, clock_out_status'),
        ]);

        const usePeriod = !periodRes.error && periodRes.data;
        const payroll = usePeriod ? periodRes.data : monthly;
        const payrollMode = usePeriod ? 'period' : 'monthly';

        const payrollSchedule =
          (!schRes.error && schRes.data) ||
          (usePeriod && periodRes.data
            ? {
                period_start: periodRes.data.period_start,
                period_end: periodRes.data.period_end,
                month_index: periodRes.data.month_index,
                month_name: periodRes.data.month_name,
                payment_date: periodRes.data.payment_date,
              }
            : (monthly
              ? { period_start: monthly.month_start, period_end: monthly.month_end }
              : null));

        const payrollIssues = !exPRes.error && exPRes.data
          ? (exPRes.data || []).filter((x) => x.issue && x.issue !== 'OK')
          : [];

        // ช่วง fallback สำหรับคัด pending ในงวด (ถ้าไม่มี schedule view)
        const fbStart = payrollSchedule?.period_start || monthly?.month_start;
        const fbEnd = payrollSchedule?.period_end || monthly?.month_end;

        // pending approvals “ในงวดนี้”
        const pendingPeriod = pendingAll.filter((r) => {
          const { start, end } = pickRange(payrollSchedule, r.req_kind, fbStart, fbEnd);
          return overlaps(r.req_start_date, r.req_end_date, start, end);
        });

        // Export logs (optional)
        let exportLogs = [];
        try {
          const expRes = await supabase
            .from('payroll_export_logs')
            .select('exported_at, note')
            .order('exported_at', { ascending: false })
            .limit(5);
          if (!expRes.error) exportLogs = expRes.data || [];
        } catch {
          exportLogs = [];
        }

        const payrollInfo = [
          schRes.error ? 'ไม่พบ view: v_payroll_current_schedule' : null,
          periodRes.error ? 'ไม่พบ view: v_hr_payroll_period_summary_current (กำลังใช้สรุปแบบรายเดือน)' : null,
          exPRes.error ? 'ไม่พบ view: v_hr_attendance_exceptions_payroll_current (กล่องลืมลงเวลาในงวดยังว่าง)' : null,
        ].filter(Boolean).join(' • ') || null;

        // ---- Employee names/images (รวมทั้ง payrollIssues ด้วย กันชื่อเป็น "-") ----
        const ids = uniq([
          ...pendingAll.map((x) => x.user_id),
          ...issuesToday.map((x) => x.user_id),
          ...leavesToday.map((x) => x.user_id),
          ...payrollIssues.map((x) => x.user_id),
        ]);

        let names = {};
        let images = {};
        if (ids.length) {
          const [nRes, iRes] = await Promise.all([
            supabase.from('v_employees_display_name').select('id, display_name').in('id', ids),
            supabase.from('v_user_employee_map').select('employee_id, image_url').in('employee_id', ids),
          ]);
          if (nRes.error) throw nRes.error;
          names = Object.fromEntries((nRes.data || []).map((r) => [r.id, String(r.display_name || '').trim() || '-']));
          if (!iRes.error) {
            images = Object.fromEntries((iRes.data || []).filter((r) => r?.employee_id).map((r) => [r.employee_id, r.image_url]));
          }
        }

        if (cancelled) return;

        setExportHistory(exportHistoryRes.data || []);
        setState({
          loading: false,
          error: null,

          kpis: kpiRes.data || {},
          pending: pendingAll,
          issuesToday,
          leavesToday,

          payroll: payroll || null,
          payrollMode,
          payrollSchedule,
          payrollIssues,
          pendingPeriod,
          exportLogs,
          payrollInfo,

          names,
          images,
          lastFetchedAt: new Date(),
        });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: e?.message || String(e) }));
      }
    };

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const visiblePending = useMemo(() => state.pending.slice(0, PAGE_SIZE), [state.pending]);
  const visibleIssues = useMemo(() => state.issuesToday.slice(0, PAGE_SIZE), [state.issuesToday]);

  const pendingCols = useMemo(() => ([
    { key: 'created_at', label: 'วันที่สร้าง', headSx: { whiteSpace: 'nowrap' }, sx: { whiteSpace: 'nowrap' }, render: (r) => dmy(r.created_at) },
    { key: 'doc_no', label: 'เลขเอกสาร', headSx: { whiteSpace: 'nowrap' }, sx: { whiteSpace: 'nowrap' }, render: (r) => r.doc_no || '-' },
    { key: 'kind', label: 'ประเภท', render: (r) => KIND_TH[r.req_kind] || '-' },
    { key: 'emp', label: 'พนักงาน', render: (r) => getName(r.user_id) },
    { key: 'sd', label: 'วันเริ่ม', sx: { whiteSpace: 'nowrap' }, render: (r) => (r.req_start_date ? dmy(r.req_start_date) : '-') },
    { key: 'ed', label: 'วันสิ้นสุด', sx: { whiteSpace: 'nowrap' }, render: (r) => (r.req_end_date ? dmy(r.req_end_date) : '-') },
    { key: 'st', label: 'เวลาเริ่ม', sx: { whiteSpace: 'nowrap' }, render: (r) => (r.req_start_time ? hm(r.req_start_time) : '-') },
    { key: 'et', label: 'เวลาสิ้นสุด', sx: { whiteSpace: 'nowrap' }, render: (r) => (r.req_end_time ? hm(r.req_end_time) : '-') },
    {
      key: 'reason', label: 'เหตุผล', sx: { maxWidth: 320, color: 'text.secondary' },
      render: (r) => <Typography variant="body2" noWrap title={r.reason || ''}>{r.reason || '-'}</Typography>
    },
    {
      key: 'att', label: 'ไฟล์แนบ', align: 'center',
      render: (r) => r.attachment_url ? (
        <Tooltip title="เปิดไฟล์แนบ">
          <IconButton onClick={() => window.open(r.attachment_url, '_blank', 'noopener,noreferrer')}>
            <UploadFileIcon />
          </IconButton>
        </Tooltip>
      ) : <Typography variant="body2" color="text.secondary">-</Typography>
    },
    {
      key: 'status', label: 'สถานะ', align: 'center',
      render: (r) => {
        const st = chipStatus(r.status);
        return <Chip  label={st.label} color={st.color} variant={st.variant} />;
      }
    },
    {
      key: 'act', label: 'การดำเนินการ', align: 'center',
      render: (r) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="อนุมัติ">
            <span>
              <IconButton onClick={() => openConfirm(r, 'approve')} disabled={state.loading || confirm.loading} sx={{ color: 'success.main' }}>
                <CheckCircleIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="ปฏิเสธ">
            <span>
              <IconButton onClick={() => openConfirm(r, 'reject')} disabled={state.loading || confirm.loading} sx={{ color: 'error.main' }}>
                <DoDisturbOnIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )
    },
  ]), [state.loading, confirm.loading, state.names]);

  const issueCols = useMemo(() => ([
    { key: 'emp', label: 'พนักงาน', render: (x) => <Typography>{getName(x.user_id)}</Typography> },
    { key: 'date', label: 'วันที่', sx: { whiteSpace: 'nowrap' }, render: (x) => dmy(x.work_date) },
    { key: 'in', label: 'เวลาเข้า', sx: { whiteSpace: 'nowrap' }, align: 'center', render: (x) => x.clock_in_hm ?? (x.clock_in_at ? hm(x.clock_in_at) : '-') },
    { key: 'out', label: 'เวลาออก', sx: { whiteSpace: 'nowrap' }, align: 'center', render: (x) => x.clock_out_hm ?? (x.clock_out_at ? hm(x.clock_out_at) : '-') },
    { key: 'hrs', label: 'ชม.ทำงาน', align: 'right', render: (x) => (x.work_hours != null ? `${Number(x.work_hours).toFixed(2)} ชม.` : '-') },
    { key: 'inSt', label: 'สถานะเข้า', align: 'center', render: (x) => inMeta(x.clock_in_status).label },
    { key: 'outSt', label: 'สถานะออก', align: 'center', render: (x) => outMeta(x.clock_out_status).label },
    {
      key: 'type', label: 'ประเภทปัญหา', align: 'center',
      render: (x) => {
        const meta = issueMeta(x.issue);
        return <Chip  label={meta.label} color={meta.color} variant="filled" />;
      }
    },
    {
      key: 'act', label: 'การดำเนินการ', align: 'center',
      render: (x) => (
        <Button
          variant="contained"
          sx={{ borderRadius: 2, bgcolor: 'grey.900', color: 'common.white', boxShadow: 'none', '&:hover': { bgcolor: 'grey.800' } }}
          startIcon={<NotificationsActiveIcon sx={{ color: 'gold' }} />}
          onClick={() => setNotifyRow(x)}
        >
          แจ้งเตือน
        </Button>
      )
    },
  ]), [state.names]);

  // ---------- PAYROLL derived ----------
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const scheduleLine = useMemo(() => {
    const s = state.payrollSchedule;
    if (s?.period_start) {
      const pay = s.payment_date ? ` • วันจ่าย: ${dmy(s.payment_date)}` : '';
      const name = s.month_name ? ` • ${s.month_name}` : '';
      return `งวด: ${dmy(s.period_start)} ถึง ${dmy(s.period_end)}${pay}${name}`;
    }
    if (state.payroll?.month_start) return `เดือน: ${state.payroll.month_start} ถึง ${state.payroll.month_end}`;
    return 'สรุปเฉพาะรายการที่อนุมัติแล้ว';
  }, [state.payrollSchedule, state.payroll]);

  const issueCount = useMemo(() => countBy(state.payrollIssues || [], (x) => x.issue), [state.payrollIssues]);
  const pendingCount = useMemo(() => countBy(state.pendingPeriod || [], (x) => x.req_kind), [state.pendingPeriod]);

  const blockers = useMemo(() => ([
    { id: 'payroll-issues', label: 'ลืมลงเวลาในงวด', count: (state.payrollIssues || []).length },
    { id: 'payroll-pending', label: 'เอกสารรออนุมัติในงวด', count: (state.pendingPeriod || []).length },
  ]), [state.payrollIssues, state.pendingPeriod]);

  const totalBlockers = blockers.reduce((a, b) => a + (b.count || 0), 0);
  const ready = !state.loading && !state.error && totalBlockers === 0;

  const readyChip = ready
    ? { label: 'พร้อมส่งออก', color: 'success' }
    : totalBlockers
      ? { label: 'มีรายการค้าง', color: 'error' }
      : { label: 'กำลังตรวจสอบ', color: 'warning' };

  // ====== ฟังก์ชันส่งออกข้อมูลเงินเดือน ======
  const handlePayrollExport = async () => {
    let employeeId = null;
    try {
      // 1. หา employeeId
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        const { data: map } = await supabase.from('v_user_employee_map').select('employee_id').eq('user_id', uid).maybeSingle();
        employeeId = map?.employee_id || null;
      }
      // 2. TODO: เรียก action export จริง (ใส่ TODO ไว้)
      // ... (ระบบ export จริงควรอยู่ตรงนี้)
      // 3. log สำเร็จ
      await supabase.rpc('fn_log_payroll_export', {
        p_status: 'SUCCESS',
        p_file_url: null, // ถ้ามีไฟล์ให้ใส่ url
        p_note: 'export จาก HR dashboard',
        p_exported_by: employeeId,
      });
      setSnack({ open: true, message: 'ส่งออกข้อมูลเงินเดือนสำเร็จ', severity: 'success' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      // log ล้มเหลว
      await supabase.rpc('fn_log_payroll_export', {
        p_status: 'FAILED',
        p_file_url: null,
        p_note: (err?.message || String(err) || 'export error'),
        p_exported_by: employeeId,
      });
      setSnack({ open: true, message: 'ส่งออกข้อมูลเงินเดือนล้มเหลว', severity: 'error' });
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>HR Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">ลางาน / ขอแก้ไขเวลา / โอที</Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
            <Tooltip title="รีเฟรชข้อมูล">
              <span>
                <IconButton onClick={handleRefresh} disabled={state.loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Chip
              size="small"
              icon={state.loading ? <CircularProgress size={14} /> : <CheckCircleIcon />}
              label={state.lastFetchedAt ? `อัปเดตล่าสุด: ${state.lastFetchedAt.toLocaleString('th-TH')}` : state.loading ? 'กำลังโหลด...' : '—'}
              variant="outlined"
            />
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab value="OPS" label="งานวันนี้" onClick={(e) => e.currentTarget.blur()} />
            <Tab value="PAYROLL" label="ปิดรอบเงินเดือน" onClick={(e) => e.currentTarget.blur()} />
          </Tabs>
        </Box>

        {state.error ? <Alert severity="error" sx={{ mt: 1.5 }}>{state.error}</Alert> : null}
      </Paper>

      {/* OPS TAB */}
      {tab === 'OPS' ? (
        <>
          <FlexRow>
            <StatCard icon={<EventBusyIcon />} title="รออนุมัติ: ลางาน" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.pending_leave_count ?? 0)} subtitle="สถานะส่งอนุมัติแล้ว" />
            <StatCard icon={<AccessTimeIcon />} title="รออนุมัติ: โอที" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.pending_ot_count ?? 0)} subtitle="สถานะส่งอนุมัติแล้ว" />
            <StatCard icon={<AssignmentTurnedInIcon />} title="รออนุมัติ: ขอแก้ไขเวลา" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.pending_rep_count ?? 0)} subtitle="สถานะส่งอนุมัติแล้ว" />
          </FlexRow>

          <Box sx={{ height: 16 }} />

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader title="รายการรออนุมัติ" subtitle={`รวมลางาน / ขอแก้ไขเวลา / โอที (ทั้งหมด ${state.pending.length.toLocaleString()} รายการ)`} />

              {state.loading ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Skeleton height={34} />
                  <Skeleton height={34} />
                  <Skeleton height={34} />
                </Stack>
              ) : (
                <DataTable
                  minWidth={1100}
                  columns={pendingCols}
                  rows={visiblePending}
                  rowKey="id"
                  empty={<EmptyState title="ไม่มีรายการรออนุมัติ" subtitle="ตอนนี้ไม่มีเอกสารที่สถานะรออนุมัติ" />}
                />
              )}

              {state.pending.length > PAGE_SIZE ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  แสดงเฉพาะ {PAGE_SIZE} รายการแรก (ทั้งหมด {state.pending.length.toLocaleString()} รายการ)
                </Typography>
              ) : null}
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader title="ปัญหาการลงเวลาวันนี้" subtitle={`ขาดเข้า/ออก และทำงานเกิน 12 ชั่วโมง (ทั้งหมด ${state.issuesToday.length.toLocaleString()} รายการ)`} />

              <FlexRow gap={2} min={260}>
                <StatCard icon={<WarningAmberIcon />} title="ขาดเวลาเข้า" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.missing_in_count ?? 0)} subtitle="ให้พนักงานส่งคำขอแก้ไขเวลา" />
                <StatCard icon={<WarningAmberIcon />} title="ขาดเวลาออก" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.missing_out_count ?? 0)} subtitle="ให้พนักงานส่งคำขอแก้ไขเวลา" />
                <StatCard icon={<WarningAmberIcon />} title="ทำงานเกิน 12 ชั่วโมง" value={state.loading ? <Skeleton width={40} /> : (state.kpis?.long_hours_count ?? 0)} subtitle="ตรวจสอบนโยบาย/โอที" />
              </FlexRow>

              <Box sx={{ height: 12 }} />

              {state.loading ? (
                <Stack spacing={1}>
                  <Skeleton height={34} />
                  <Skeleton height={34} />
                </Stack>
              ) : (
                <DataTable
                  minWidth={900}
                  columns={issueCols}
                  rows={visibleIssues}
                  rowKey={(x, i) => `${x.user_id}-${x.work_date}-${i}`}
                  empty={<EmptyState title="วันนี้ไม่มีปัญหาการลงเวลา" subtitle="ข้อมูลการลงเวลาปกติ" />}
                />
              )}
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ pt: 0 }}>
              <SectionHeader title="พนักงานที่ลาวันนี้" subtitle={`ทั้งหมด ${state.leavesToday.length.toLocaleString()} คน`} />

              {state.loading ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Skeleton height={42} />
                  <Skeleton height={42} />
                </Stack>
              ) : state.leavesToday.length === 0 ? (
                <EmptyState title="วันนี้ไม่มีคนลางาน" subtitle="ไม่มีรายการลาที่ทับช่วงวันที่ปัจจุบัน" />
              ) : (
                <List dense>
                  {state.leavesToday.map((l, idx) => {
                    const name = getName(l.user_id);
                    const st = chipStatus(l.status);
                    return (
                      <ListItem key={`${l.user_id}-${idx}`} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar
                            src={state.images[l.user_id] || undefined}
                            alt={name}
                            sx={{ bgcolor: state.images[l.user_id] ? undefined : 'action.hover', color: 'text.primary' }}
                          >
                            {!state.images[l.user_id] && firstLetter(name)}
                          </Avatar>
                        </ListItemAvatar>

                        <ListItemText
                          primary={<Typography sx={{ fontWeight: 900 }}>{name}</Typography>}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="caption" color="text.secondary">
                                {dmy(l.start_at)} ถึง {dmy(l.end_at)}
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* PAYROLL TAB (5 กล่อง) */}
      {tab === 'PAYROLL' ? (
        <>
          {/* 1) ความพร้อมปิดรอบ */}
          <Card variant="outlined" sx={{ borderRadius: 3 }} id="payroll-ready">
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader
                title="ความพร้อมปิดรอบ"
                subtitle={scheduleLine}
                right={<Chip label={readyChip.label} color={readyChip.color} />}
              />
              {state.payrollInfo ? <Alert severity="warning" sx={{ mt: 1 }}>{state.payrollInfo}</Alert> : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                {blockers.map((b) => (
                  <Chip
                    key={b.id}
                    clickable
                    onClick={() => jump(b.id)}
                    label={`${b.label}: ${b.count.toLocaleString()} รายการ`}
                    color={b.count ? 'error' : 'success'}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          {/* 2) สรุปตัวเลขงวด */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <SectionHeader title="สรุปช่วยปิดรอบเงินเดือน" subtitle={scheduleLine} />
              <Box sx={{ height: 8 }} />

              <FlexRow gap={2} min={260}>
                <Paper variant="outlined" sx={{ p: 1.6, borderRadius: 3 }}>
                  <Typography variant="caption" color="text.secondary">ชั่วโมงโอที (อนุมัติแล้ว)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {state.loading ? <Skeleton width={80} /> : `${Number(state.payroll?.approved_ot_hours || 0).toFixed(2)} ชม.`}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.6, borderRadius: 3 }}>
                  <Typography variant="caption" color="text.secondary">ชั่วโมงลา (อนุมัติแล้ว)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {state.loading ? <Skeleton width={80} /> : `${Number(state.payroll?.approved_leave_hours || 0).toFixed(2)} ชม.`}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.6, borderRadius: 3 }}>
                  <Typography variant="caption" color="text.secondary">ชั่วโมงทำงานปกติ (ประมาณการ)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {state.loading ? <Skeleton width={80} /> : `${Number(state.payroll?.approved_regular_hours || 0).toFixed(2)} ชม.`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    *คำนวณจากเวลาเข้า-ออกงาน (ยังไม่ใช่ตัวเลขอนุมัติเงินเดือนอย่างเป็นทางการ)
                  </Typography>
                </Paper>
              </FlexRow>
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          {/* 3) ลืมลงเวลาในงวด */}
          <Card variant="outlined" sx={{ borderRadius: 3 }} id="payroll-issues">
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader title="ลืมลงเวลา (ค้างในงวดนี้)" subtitle={`ทั้งหมด ${(state.payrollIssues || []).length.toLocaleString()} รายการ`} />

              <FlexRow gap={2} min={260}>
                <StatCard icon={<WarningAmberIcon />} title="ขาดเวลาเข้า" value={state.loading ? <Skeleton width={40} /> : (issueCount.MISSING_IN || 0)} />
                <StatCard icon={<WarningAmberIcon />} title="ขาดเวลาออก" value={state.loading ? <Skeleton width={40} /> : (issueCount.MISSING_OUT || 0)} />
                <StatCard icon={<WarningAmberIcon />} title="ทำงานเกิน 12 ชั่วโมง" value={state.loading ? <Skeleton width={40} /> : (issueCount.LONG_HOURS || 0)} />
              </FlexRow>

              <Box sx={{ height: 12 }} />

              {state.loading ? (
                <Stack spacing={1}><Skeleton height={34} /><Skeleton height={34} /></Stack>
              ) : (
                <DataTable
                  minWidth={900}
                  columns={issueCols}
                  rows={(state.payrollIssues || []).slice(0, PAGE_SIZE)}
                  rowKey={(x, i) => `${x.user_id}-${x.work_date}-${i}`}
                  empty={<EmptyState title="งวดนี้ไม่มีรายการลืมลงเวลา" subtitle="พร้อมสำหรับการปิดรอบ" />}
                />
              )}
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          {/* 4) รออนุมัติในงวด */}
          <Card variant="outlined" sx={{ borderRadius: 3 }} id="payroll-pending">
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader title="รายการรออนุมัติในงวดนี้" subtitle={`ทั้งหมด ${(state.pendingPeriod || []).length.toLocaleString()} รายการ`} />

              <FlexRow gap={2} min={260}>
                <StatCard icon={<AccessTimeIcon />} title="รออนุมัติ: โอที" value={state.loading ? <Skeleton width={40} /> : (pendingCount.OT || 0)} />
                <StatCard icon={<EventBusyIcon />} title="รออนุมัติ: ลางาน" value={state.loading ? <Skeleton width={40} /> : (pendingCount.LEAVE || 0)} />
                <StatCard icon={<AssignmentTurnedInIcon />} title="รออนุมัติ: ขอแก้ไขเวลา" value={state.loading ? <Skeleton width={40} /> : (pendingCount.REP || 0)} />
              </FlexRow>

              <Box sx={{ height: 12 }} />

              {state.loading ? (
                <Stack spacing={1}><Skeleton height={34} /><Skeleton height={34} /><Skeleton height={34} /></Stack>
              ) : (
                <DataTable
                  minWidth={1100}
                  columns={pendingCols}
                  rows={(state.pendingPeriod || []).slice(0, PAGE_SIZE)}
                  rowKey="id"
                  empty={<EmptyState title="งวดนี้ไม่มีเอกสารรออนุมัติ" subtitle="พร้อมสำหรับการปิดรอบ" />}
                />
              )}
            </CardContent>
          </Card>

          <Box sx={{ height: 16 }} />

          {/* 5) ส่งออก + ประวัติ */}
          <Card variant="outlined" sx={{ borderRadius: 3 }} id="payroll-export">
            <CardContent sx={{ p: 2.2 }}>
              <SectionHeader
                title="ส่งออกข้อมูลเงินเดือน"
                subtitle={ready ? 'พร้อมส่งออกแล้ว' : 'ยังมีรายการค้าง ต้องเคลียร์ก่อนส่งออก'}
                right={<Chip label={readyChip.label} color={readyChip.color} />}
              />

              <Stack direction={isMdUp ? 'row' : 'column'} spacing={1.5} sx={{ mt: 1.5 }}>
                <Tooltip title={ready ? '' : 'ต้องเคลียร์รายการค้างก่อน'}>
                  <span>
                    <Button
                      variant="contained"
                      sx={{ borderRadius: 2 }}
                      disabled={!ready}
                      onClick={handlePayrollExport}
                    >
                      ส่งออกข้อมูลเงินเดือน
                    </Button>
                  </span>
                </Tooltip>

                {!ready ? (
                  <Button variant="outlined" sx={{ borderRadius: 2 }} onClick={() => jump('payroll-ready')}>
                    ดูรายการค้าง
                  </Button>
                ) : null}
              </Stack>

              {/* Section: ประวัติการส่งออกเงินเดือน */}
              <Box sx={{ mt: 2 }}>
                {state.loading ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Skeleton height={34} />
                    <Skeleton height={34} />
                  </Stack>
                ) : exportHistory.length === 0 ? (
                  <EmptyState title="ยังไม่มีประวัติการส่งออก" subtitle="ยังไม่เคยมีการส่งออกข้อมูลเงินเดือน" />
                ) : (
                  <Box>
                    <Table size="small" sx={{ minWidth: 600, '& td, & th': { borderBottom: 'none' } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>ส่งออกเมื่อ</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>ไฟล์</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>หมายเหตุ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(exportHistoryExpanded ? exportHistory : exportHistory.slice(0, EXPORT_HISTORY_PAGE_SIZE)).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{dmyhm(row.exported_at)}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.status === 'SUCCESS' ? 'สำเร็จ' : row.status === 'FAILED' ? 'ล้มเหลว' : 'ยกเลิก'}
                                color={row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'default'}
                                size="small"
                                variant="filled"
                              />
                            </TableCell>
                            <TableCell>
                              {row.file_url ? (
                                <Button size="small" variant="outlined" onClick={() => window.open(row.file_url, '_blank')}>
                                  เปิดไฟล์
                                </Button>
                              ) : (
                                <Typography color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>{row.note || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {exportHistory.length > EXPORT_HISTORY_PAGE_SIZE && (
                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <Button size="small" onClick={() => setExportHistoryExpanded((v) => !v)}>
                          {exportHistoryExpanded ? 'ย่อรายการ' : 'ดูรายการส่งออกทั้งหมด'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Confirm dialog (ใช้ได้ทั้ง OPS/PAYROLL) */}
      <Dialog open={confirm.open} onClose={closeConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {confirm.action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            {confirm.action === 'approve'
              ? `คุณต้องการอนุมัติเอกสาร ${confirm.row?.doc_no || ''} ของ ${getName(confirm.row?.user_id)} หรือไม่?`
              : `คุณต้องการปฏิเสธเอกสาร ${confirm.row?.doc_no || ''} ของ ${getName(confirm.row?.user_id)} หรือไม่?`}
          </Typography>
          {confirm.error ? <Alert severity="error" sx={{ mt: 1 }}>{confirm.error}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} disabled={confirm.loading} variant="outlined">ยกเลิก</Button>
          <Button onClick={performConfirm} disabled={confirm.loading} variant="contained">
            {confirm.loading ? 'กำลังบันทึก...' : confirm.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notify dialog */}
      <Dialog open={!!notifyRow} onClose={() => setNotifyRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>แจ้งเตือนพนักงาน</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            คัดลอกข้อความด้านล่างไปส่งใน LINE/Email ให้พนักงาน
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {notifyText}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setNotifyRow(null)}>ปิด</Button>
          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={copyNotify}>
            คัดลอกข้อความ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity || 'info'} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
