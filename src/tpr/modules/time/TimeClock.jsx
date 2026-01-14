import * as React from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { supabase } from '../../../lib/supabaseClient';
import * as supabaseData from '../../../api/supabaseData';

import { useNotify } from '../../contexts/notifyContext';
import img1 from '../../../assets/img-3.png';

const MOTIVATIONS = [
  { title: '✨ เริ่มต้นวันใหม่ ✨', desc: 'ค่อย ๆ ทำทีละอย่าง เดี๋ยวก็เสร็จ', icon: <BoltIcon /> },
  { title: 'วันนี้เราจะเก่งขึ้นอีกนิด 🏆', desc: 'ความสม่ำเสมอชนะความสมบูรณ์แบบ', icon: <EmojiEventsIcon /> },
  { title: 'ทำงานแบบมีความสุข ☕', desc: 'พักได้ หายใจลึก ๆ แล้วไปต่อ', icon: <LocalCafeIcon /> },
];

function pickDailyMotivation(seed) {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return MOTIVATIONS[hash % MOTIVATIONS.length];
}

/**
 * ✅ Skeleton แบบ "ระดับกล่อง" (ไม่แตกย่อยเกินไป)
 * - ใช้ Paper/Box ครอบ แล้วใส่ Skeleton ไม่กี่ก้อน
 * - ให้หน้าตาดู modern และไม่รก
 */
function BlockSkeleton({ height = 120, radius = 1 }) {
  return (
    <Skeleton
      variant="rounded"
      height={height}
      sx={{
        borderRadius: radius,
        bgcolor: 'rgba(15,23,42,0.06)',
        width: '100%',
      }}
    />
  );
}

export default function TimeClock({ session }) {
  // =========================================================
  // Clock window constants (Asia/Bangkok)
  const CLOCKIN_START = '05:00';
  const CLOCKIN_END = '12:00';
  const CLOCKOUT_START = '12:00';
  const CLOCKOUT_END = '23:59';

  const windows = React.useMemo(() => ({ CLOCKIN_START, CLOCKIN_END, CLOCKOUT_START, CLOCKOUT_END }), []);

  // =========================================================
  // [A] UI State (NO loading)
  const [now, setNow] = React.useState(new Date());

  // =========================================================
  // ✅ Notify (Dialog popup)
  const notify = useNotify();
  const toast = React.useCallback(
    (msg, sev = 'info') => {
      notify.open({ severity: sev, message: msg });
    },
    [notify],
  );

  // =========================================================
  // [B] Auth/Profile State
  const email = session?.user?.email ?? null;
  const avatarUrl = session?.user?.user_metadata?.avatar_url ?? null;
  const displayName = session?.user?.user_metadata?.full_name ?? session?.user?.email ?? '';

  const [employeeName, setEmployeeName] = React.useState('');
  const [positionLabel, setPositionLabel] = React.useState('');
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = React.useState(null);

  // =========================================================
  // [C] Attendance State
  const [employeeId, setEmployeeId] = React.useState(null);
  const [timekeepingExempt, setTimekeepingExempt] = React.useState(null);

  const [todayISO, setTodayISO] = React.useState(() => supabaseData.getBangkokDateISO(new Date()));
  const [todayRow, setTodayRow] = React.useState(null);

  const [historyRows, setHistoryRows] = React.useState([]);

  const [isWeekend, setIsWeekend] = React.useState(false);
  const [isCalendarHoliday, setIsCalendarHoliday] = React.useState(false);

  // =========================================================
  // ✅ Loading states (Skeleton)
  // เราจะใช้ 3 ตัวนี้ เพื่อควบคุม skeleton แบบ "ระดับกล่อง"
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [loadingToday, setLoadingToday] = React.useState(true);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  // “กำลังโหลดหน้า” = ช่วงแรกที่ profile/today/history ยังไม่พร้อม
  const isPageLoading = loadingProfile || loadingToday || loadingHistory;

  // =========================================================
  // [D] Location / Geofence UI State
  const [locPerm, setLocPerm] = React.useState('unknown'); // unknown | granted | denied
  const [gpsSupported, setGpsSupported] = React.useState(() => supabaseData.isGeolocationSupported());

  const [lastCoords, setLastCoords] = React.useState(null);
  const [geoResult, setGeoResult] = React.useState(null);
  const [geoError, setGeoError] = React.useState('');

  const isExempt = timekeepingExempt === true;
  const avatarChildren = !(avatarUrl || resolvedAvatarUrl) ? (displayName ? displayName[0] : '?') : null;

  const [randomQuote, setRandomQuote] = React.useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // xs+sm = มือถือ

  React.useEffect(() => {
    let mounted = true;

    async function loadRandomQuote() {
      try {
        const { data, error } = await supabaseData.fetchRandomQuote();
        if (!error && data?.name && mounted) setRandomQuote(data.name);
      } catch {
        // ignore
      }
    }

    loadRandomQuote();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // Timer
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const next = supabaseData.getBangkokDateISO(now);
    if (next !== todayISO) setTodayISO(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // Weekend / Holiday
  React.useEffect(() => {
    setIsWeekend(supabaseData.isWeekendBangkok(now));
  }, [todayISO, now]);

  React.useEffect(() => {
    let mounted = true;
    async function run() {
      const { data } = await supabaseData.fetchIsCalendarHoliday(todayISO);
      if (mounted) setIsCalendarHoliday(!!data);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [todayISO]);

  // =========================================================
  // Permissions
  React.useEffect(() => {
    let mounted = true;
    async function initPerm() {
      const supported = supabaseData.isGeolocationSupported();
      if (!mounted) return;
      setGpsSupported(supported);
      if (!supported) {
        setLocPerm('denied');
        return;
      }
      const { data: st } = await supabaseData.queryGeolocationPermission();
      if (!mounted) return;
      if (st === 'granted') setLocPerm('granted');
      else if (st === 'denied') setLocPerm('denied');
      else setLocPerm('unknown');
    }
    initPerm();
    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // Load employee profile (Skeleton)
  React.useEffect(() => {
    let mounted = true;

    async function loadEmployeeProfile() {
      setLoadingProfile(true);

      if (!email) {
        if (mounted) {
          setEmployeeId(null);
          setTimekeepingExempt(false);
          setEmployeeName('');
          setPositionLabel('');
          setResolvedAvatarUrl(null);
          setLoadingProfile(false);
        }
        return;
      }

      try {
        if (typeof supabaseData.fetchEmployeeDisplayName === 'function') {
          const { data, error } = await supabaseData.fetchEmployeeDisplayName(email);
          if (!error && data) {
            const row = data.row || {};

            if (mounted && row.id) setEmployeeId(row.id);
            if (mounted && typeof row.timekeeping_exempt !== 'undefined') setTimekeepingExempt(!!row.timekeeping_exempt);

            const first = row.first_name_th || row.first_name || row.first_name_en || '';
            const last = row.last_name_th || row.last_name || row.last_name_en || '';
            let name = '';
            if (first || last) name = `${first}${first && last ? ' ' : ''}${last}`.trim();
            else if (row.nickname_th || row.nickname) name = row.nickname_th || row.nickname;
            else if (data.displayName) name = data.displayName;
            if (mounted) setEmployeeName(name);

            try {
              const posIdOrToken = row.position_id || row.position || null;
              if (posIdOrToken && typeof supabaseData.fetchPositionName === 'function') {
                const { data: posData, error: posErr } = await supabaseData.fetchPositionName(posIdOrToken);
                if (!posErr && posData?.label && mounted) setPositionLabel(posData.label);
              }
            } catch {
              // ignore
            }

            try {
              if (!avatarUrl && typeof supabaseData.fetchEmployeeImageUrl === 'function') {
                const key = email || row.id || data.id;
                const { data: imgData, error: imgErr } = await supabaseData.fetchEmployeeImageUrl(key);
                if (!imgErr && imgData?.image_url && mounted) setResolvedAvatarUrl(imgData.image_url);
              }
            } catch {
              // ignore
            }
          }
        }

        if (mounted && typeof supabaseData.fetchEmployee === 'function') {
          const { data: fetched, error: fetchedErr } = await supabaseData.fetchEmployee(email);
          if (!fetchedErr && fetched?.id && mounted) {
            const row = fetched.row || {};
            setEmployeeId((prev) => prev || fetched.id);
            setTimekeepingExempt((prev) => (prev === null ? !!row.timekeeping_exempt : prev));

            setEmployeeName((prev) => {
              if (prev) return prev;
              return fetched.displayName || row.nickname_th || `${row.first_name_th || ''} ${row.last_name_th || ''}`.trim() || '';
            });

            if (!avatarUrl && !resolvedAvatarUrl && row.image_url) setResolvedAvatarUrl(row.image_url);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) {
          setTimekeepingExempt((prev) => (prev === null ? false : prev));
          setLoadingProfile(false);
        }
      }
    }

    loadEmployeeProfile();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, avatarUrl, resolvedAvatarUrl]);

  // =========================================================
  // Load today + history (Skeleton)
  const loadTodayRow = React.useCallback(async () => {
    if (!employeeId || !todayISO) {
      setTodayRow(null);
      setLoadingToday(false);
      return;
    }
    setLoadingToday(true);
    const { data } = await supabaseData.fetchAttendanceToday({ employeeId, workDateISO: todayISO });
    setTodayRow(data || null);
    setLoadingToday(false);
  }, [employeeId, todayISO]);

  React.useEffect(() => {
    loadTodayRow();
  }, [loadTodayRow]);

  const loadHistoryRows = React.useCallback(async () => {
    if (!employeeId || !todayISO) {
      setHistoryRows([]);
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    const { data } = await supabaseData.fetchAttendanceHistory({ employeeId, endISO: todayISO, days: 7 });
    setHistoryRows(data || []);
    setLoadingHistory(false);
  }, [employeeId, todayISO]);

  React.useEffect(() => {
    loadHistoryRows();
  }, [loadHistoryRows]);

  // =========================================================
  // Location: refresh
  const refreshLocationAndGeofence = React.useCallback(async () => {
    if (isExempt) return;

    setGpsSupported(supabaseData.isGeolocationSupported());
    setGeoError('');

    const gp = await supabaseData.getFreshCurrentPosition({ maximumAge: 0 });

    if (!gp.ok) {
      setLocPerm('denied');
      setLastCoords(null);
      setGeoResult(null);
      setGeoError(gp.message);
      toast(gp.message, 'warning');
      return;
    }

    setLocPerm('granted');
    setLastCoords(gp.coords);

    const ge = await supabaseData.checkMobileGeofence(gp.coords);

    if (!ge.ok) {
      setGeoResult(ge.row || null);
      setGeoError(ge.message);
      toast(ge.message, ge.code === 'OUTSIDE' ? 'warning' : 'error');
      return;
    }

    setGeoResult(ge.row);
    setGeoError('');
    toast('อยู่ในพื้นที่ที่อนุญาต', 'success');
  }, [isExempt, toast]);

  // =========================================================
  // Rules
  const isClosed = todayRow?.daily_status === 'CLOSED';
  const hasIn = !!todayRow?.clock_in_at;
  const hasOut = !!todayRow?.clock_out_at;

  const inClockInWindow = supabaseData.isTimeInWindowBangkok(CLOCKIN_START, CLOCKIN_END);
  const inClockOutWindow = supabaseData.isTimeInWindowBangkok(CLOCKOUT_START, CLOCKOUT_END);

  const isHolidayToday = isWeekend || isCalendarHoliday;

  const canClockInBase = !!employeeId && !isClosed && !hasIn && inClockInWindow && !isHolidayToday && !isExempt;
  const canClockOutBase = !!employeeId && !isClosed && hasIn && !hasOut && inClockOutWindow && !isHolidayToday && !isExempt;

  // =========================================================
  // Actions
  const ensureFreshGeoOk = React.useCallback(async () => {
    setGpsSupported(supabaseData.isGeolocationSupported());
    setGeoError('');

    const g = await supabaseData.ensureFreshGeoOk({ exempt: isExempt });

    if (!g.ok) {
      setLocPerm('denied');
      setGeoResult(g.geofence || null);
      setGeoError(g.message || 'ไม่สามารถตรวจสอบพื้นที่ได้');
      return { ok: false, message: g.message || 'ไม่สามารถตรวจสอบพื้นที่ได้' };
    }

    setLocPerm('granted');
    if (g.coords) setLastCoords(g.coords);
    if (g.geofence) setGeoResult(g.geofence);
    setGeoError('');
    return { ok: true, coords: g.coords, geofence: g.geofence };
  }, [isExempt]);

  const clockIn = async () => {
    if (isExempt) return toast('พนักงานกลุ่มนี้ได้รับการยกเว้นการลงเวลา', 'warning');
    if (!email) return toast('กรุณาเข้าสู่ระบบก่อนลงเวลา', 'warning');
    if (!employeeId) return toast('ไม่พบข้อมูลพนักงาน (employeeId) กรุณาตรวจสอบการผูก employees', 'error');
    if (isHolidayToday) return toast('วันนี้เป็นวันหยุด/วันไม่ทำงาน ไม่อนุญาตให้ลงเวลา', 'info');
    if (!canClockInBase) return toast('ไม่สามารถลงเวลาเข้าได้ (อาจลงแล้ว/ถูกปิดวันแล้ว/ไม่อยู่ในช่วงเวลา)', 'info');

    const g = await ensureFreshGeoOk();
    if (!g.ok) return toast(g.message, 'warning');

    try {
      const audit = supabaseData.buildAttendanceAuditParams({ action: 'in', coords: g.coords, geofenceRow: g.geofence });

      const { data, error } = await supabase.rpc('tpr_clock_in', {
        p_user_id: employeeId,
        p_source: 'web',
        ...audit,
      });

      if (error) {
        const mapped = supabaseData.mapAttendanceRpcErrorToThai(error.message, windows);
        toast(mapped.message || error.message || 'เกิดข้อผิดพลาดขณะลงเวลาเข้า', mapped.severity || 'error');
      } else {
        toast('ลงเวลาเข้างานเรียบร้อย', 'success');
        setTodayRow(data || null);
      }
    } catch (e) {
      const mapped = supabaseData.mapAttendanceRpcErrorToThai(e?.message, windows);
      toast(mapped.message || 'เกิดข้อผิดพลาดขณะลงเวลาเข้า', mapped.severity || 'error');
    } finally {
      await loadTodayRow();
      await loadHistoryRows();
    }
  };

  const clockOut = async () => {
    if (isExempt) return toast('พนักงานกลุ่มนี้ได้รับการยกเว้นการลงเวลา', 'warning');
    if (!email) return toast('กรุณาเข้าสู่ระบบก่อนลงเวลา', 'warning');
    if (!employeeId) return toast('ไม่พบข้อมูลพนักงาน (employeeId) กรุณาตรวจสอบการผูก employees', 'error');
    if (isHolidayToday) return toast('วันนี้เป็นวันหยุด/วันไม่ทำงาน ไม่อนุญาตให้ลงเวลา', 'info');
    if (!canClockOutBase) return toast('ไม่สามารถลงเวลาออกได้ (ต้องลงเวลาเข้าก่อน/ไม่อยู่ในช่วงเวลา/อาจปิดวันแล้ว)', 'info');

    const g = await ensureFreshGeoOk();
    if (!g.ok) return toast(g.message, 'warning');

    try {
      const audit = supabaseData.buildAttendanceAuditParams({ action: 'out', coords: g.coords, geofenceRow: g.geofence });

      const { data, error } = await supabase.rpc('tpr_clock_out', {
        p_user_id: employeeId,
        p_source: 'web',
        ...audit,
      });

      if (error) {
        const mapped = supabaseData.mapAttendanceRpcErrorToThai(error.message, windows);
        toast(mapped.message || error.message || 'เกิดข้อผิดพลาดขณะลงเวลาออก', mapped.severity || 'error');
      } else {
        toast('ลงเวลาออกเรียบร้อย', 'success');
        setTodayRow(data || null);
      }
    } catch (e) {
      const mapped = supabaseData.mapAttendanceRpcErrorToThai(e?.message, windows);
      toast(mapped.message || 'เกิดข้อผิดพลาดขณะลงเวลาออก', mapped.severity || 'error');
    } finally {
      await loadTodayRow();
      await loadHistoryRows();
    }
  };

  // =========================================================
  // Thai date/time
  const thaiDate = new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(now);

  const thaiTime = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Bangkok',
  });

  // =========================================================
  // Location Gate
  const showOnlyLocationGate = !isExempt && (locPerm === 'denied' || !gpsSupported);

  // =========================================================
  // UI helpers
  const fmtNum = (n, digits = 0) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return x.toFixed(digits);
  };

  const geoChip = (() => {
    if (isExempt) {
      return <Chip size="small" color="default" label="ยกเว้นการลงเวลา" variant="outlined" sx={{ borderStyle: 'dashed' }} />;
    }
    if (!gpsSupported) {
      return <Chip size="small" color="warning" icon={<LocationOffIcon />} label="อุปกรณ์ไม่รองรับ Location" variant="outlined" />;
    }
    if (geoError) {
      return <Chip size="small" color="warning" label={geoError} variant="outlined" />;
    }
    if (!geoResult || typeof geoResult.ok !== 'boolean') {
      return <Chip size="small" color="default" label="ยังไม่ได้ตรวจสอบพื้นที่" variant="outlined" />;
    }
    return geoResult.ok ? (
      <Chip size="small" color="success" label={`อยู่ในพื้นที่อนุญาต${geoResult?.geofence_name ? `: ${geoResult.geofence_name}` : ''}`} />
    ) : (
      <Chip size="small" color="warning" label="อยู่นอกพื้นที่อนุญาต" variant="outlined" />
    );
  })();

  // =========================================================
  // Motivation (stable per day)
  const motivation = React.useMemo(() => pickDailyMotivation(todayISO), [todayISO]);

  // Accent color
  const accent = React.useMemo(() => {
    const palette = ['#3B82F6', '#8B5CF6', '#08d84c', '#fdca01', '#ff4059'];
    const idx = Math.abs(
      (String(todayISO || '')
        .split('')
        .reduce((a, c) => a + c.charCodeAt(0), 0) +
        17) %
      palette.length,
    );
    return palette[idx];
  }, [todayISO]);

  // =========================================================
  // UI (Flat + Responsive + Skeleton “ระดับกล่อง”)
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: '#FFFFFF',
        overflowX: 'hidden',
        px: { xs: 0, sm: 2, md: 0 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: 1180 },
          bgcolor: '#FFFFFF',
          overflow: 'hidden',
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* keyframes */}
        <Box
          sx={{
            '@keyframes tpr-float': {
              '0%,100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-10px)' },
            },
            '@keyframes tpr-pop': {
              '0%': { transform: 'scale(0.98)', opacity: 0 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
            '@keyframes tpr-pulseRing': {
              '0%': { transform: 'scale(0.88)', opacity: 0.35 },
              '60%': { transform: 'scale(1.08)', opacity: 0.0 },
              '100%': { transform: 'scale(1.08)', opacity: 0.0 },
            },
          }}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
            minHeight: { xs: 'auto', md: 540 },
            gap: { xs: 2, md: 0 },
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {/* LEFT */}
          <Box
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <Stack spacing={{ xs: 2, md: 2.2 }} sx={{ height: '100%', justifyContent: 'center', minWidth: 0 }}>
              {/* ✅ Image Skeleton: ทำเป็น “กล่องใหญ่” ระดับ component */}
              {isPageLoading ? (
                <BlockSkeleton height={isMobile ? 220 : 320} />
              ) : (
                <Box
                  component="img"
                  src={img1}
                  alt="illustration"
                  sx={{
                    borderRadius: 1,
                    width: '100%',
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    filter: 'none',
                    animation: { xs: 'none', md: 'tpr-float 4.5s ease-in-out infinite' },
                  }}
                />
              )}

              {/* ✅ Box “เริ่มต้นวันใหม่”: Skeleton ระดับ Paper ทั้งกล่อง (ไม่แตก text ย่อย) */}
              {isPageLoading ? (
                <BlockSkeleton height={120} />
              ) : (
                <Paper
                  sx={{
                    p: { xs: 2, md: 2.2 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    boxShadow: 'none',
                  }}
                >
                  <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                    <Typography variant="h5" sx={{ fontWeight: 1000, lineHeight: 1.2 }}>
                      {motivation.title}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 1.2,
                        fontSize: { xs: 16, md: 20 },
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                      }}
                    >
                      {randomQuote}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.2 }}>
                      เวอร์ชัน 1.0.0 Beta
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Stack>
          </Box>

          {/* RIGHT */}
          <Box
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              display: 'flex',
              justifyContent: { xs: 'center', md: 'flex-start' },
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: 'unset' },
                mx: 'auto',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              <Stack
                spacing={{ xs: 1.75, md: 2 }}
                sx={{
                  animation: 'tpr-pop 420ms ease both',
                  alignItems: { xs: 'center', md: 'flex-start' },
                  textAlign: { xs: 'center', md: 'left' },
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                }}
              >
                {/* ✅ Profile + Time block: Skeleton ระดับ “กล่อง” */}
                {isPageLoading ? (
                  <Stack spacing={1.25} sx={{ width: '100%' }}>
                    <BlockSkeleton height={110} />
                    <BlockSkeleton height={90} />
                    <BlockSkeleton height={54} />
                  </Stack>
                ) : (
                  <>
                    {/* profile row */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1.25, sm: 2 }}
                      alignItems="center"
                      justifyContent={{ xs: 'center', md: 'flex-start' }}
                      sx={{ mt: 1, width: '100%', maxWidth: '100%', minWidth: 0 }}
                    >
                      <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
                        <Avatar
                          src={avatarUrl || resolvedAvatarUrl}
                          sx={{
                            width: { xs: 76, md: 84 },
                            height: { xs: 76, md: 84 },
                            border: '4px solid rgba(15,23,42,0.06)',
                            boxShadow: 'none',
                          }}
                        >
                          {avatarChildren}
                        </Avatar>

                        <Box
                          sx={{
                            position: 'absolute',
                            inset: -10,
                            borderRadius: '999px',
                            border: `2px solid ${accent}55`,
                            animation: 'tpr-pulseRing 1.9s ease-out infinite',
                            pointerEvents: 'none',
                          }}
                        />
                      </Box>

                      <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                        <Typography sx={{ fontWeight: 1000, fontSize: 18, lineHeight: 1.2 }} noWrap>
                          {employeeName || displayName || '—'}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
                          {positionLabel ? `(${positionLabel})` : 'ยินดีต้อนรับสู่วันทำงานใหม่'}
                        </Typography>

                        <Box
                          sx={{
                            mt: 1,
                            display: 'flex',
                            justifyContent: { xs: 'center', md: 'flex-start' },
                            maxWidth: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '100%',
                              '& .MuiChip-root': { maxWidth: '100%' },
                              '& .MuiChip-label': { overflowWrap: 'anywhere' },
                            }}
                          >
                            {geoChip}
                          </Box>
                        </Box>

                        {isExempt ? (
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block', mt: 0.5 }}>
                            พนักงานกลุ่มนี้ได้รับการยกเว้นการลงเวลา
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>

                    {/* big time */}
                    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 1000,
                          fontSize: { xs: 54, sm: 60, md: 64 },
                          letterSpacing: -1.2,
                          lineHeight: 1,
                          textAlign: { xs: 'center', md: 'left' },
                        }}
                      >
                        {thaiTime}
                      </Typography>

                      <Typography
                        variant="h6"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 800,
                          mt: 0.5,
                          textAlign: { xs: 'center', md: 'left' },
                          fontSize: { xs: 20, md: 24 },
                        }}
                      >
                        {thaiDate}
                      </Typography>
                    </Box>

                    {/* location gate */}
                    {showOnlyLocationGate ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2.2,
                          width: '100%',
                          maxWidth: '100%',
                          boxShadow: 'none',
                        }}
                      >
                        <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 800 }}>
                            ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง (กรุณาอนุญาต Location)
                          </Typography>

                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            flexWrap="wrap"
                            alignItems="center"
                            justifyContent={{ xs: 'center', md: 'flex-start' }}
                            sx={{ width: '100%', maxWidth: '100%' }}
                          >
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<MyLocationIcon />}
                              onClick={refreshLocationAndGeofence}
                              fullWidth
                              sx={{
                                bgcolor: accent,
                                '&:hover': { bgcolor: accent },
                                boxShadow: 'none',
                                borderRadius: 999,
                                width: { xs: '100%', sm: 'auto' },
                                minWidth: { sm: 190 },
                              }}
                            >
                              ขอสิทธิ์ Location
                            </Button>

                            <Button
                              size="small"
                              variant="text"
                              startIcon={<RestartAltIcon />}
                              onClick={() => {
                                setLastCoords(null);
                                setGeoResult(null);
                                setGeoError('');
                                refreshLocationAndGeofence();
                              }}
                              sx={{ fontWeight: 900 }}
                            >
                              รีเฟรช
                            </Button>
                          </Stack>

                          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                            *ถ้าเคยกด “ปฏิเสธ” แล้ว ต้องไปเปิดใน Site settings ของเว็บ
                          </Typography>
                        </Stack>
                      </Paper>
                    ) : (
                      <>
                        {/* action buttons */}
                        <Box sx={{ width: '100%' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: { xs: 'column', md: 'row' },
                              gap: 1.5,
                              width: '100%',
                              alignItems: { xs: 'stretch', md: 'center' },
                            }}
                          >
                            {/* ✅ Group: Clock buttons */}
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: 1.5,
                                width: '100%',
                                flex: { md: 1 }, // ✅ ให้กลุ่มซ้ายกินพื้นที่เท่ากับกลุ่มขวา
                              }}
                            >
                              <Button
                                onClick={clockIn}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircleIcon />}
                                fullWidth
                                sx={{
                                  flex: { sm: 1, md: 1 }, // ✅ ให้ปุ่มในกลุ่มซ้ายเท่ากัน (เมื่ออยู่แนวนอน)
                                  bgcolor: "#ff4059",
                                  fontWeight: 1000,
                                  letterSpacing: 0.2,
                                  boxShadow: 'none',
                                  '&:hover': { bgcolor: "#ff4059", boxShadow: 'none' },
                                  '&:active': { boxShadow: 'none' },
                                  transition: 'transform 200ms ease',
                                  '&:hover:not(:disabled)': { transform: 'translateY(-1px)' },
                                  '&:active:not(:disabled)': { transform: 'translateY(0px) scale(0.98)' },
                                  display: canClockInBase ? 'inline-flex' : 'none',
                                  borderRadius: 999,
                                  minHeight: 44,
                                }}
                              >
                                ลงเวลาเข้างาน
                              </Button>

                              <Button
                                onClick={clockOut}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircleIcon />}
                                fullWidth
                                sx={{
                                  flex: { sm: 1, md: 1 }, // ✅ ให้ปุ่มในกลุ่มซ้ายเท่ากัน
                                  bgcolor: "#ff4059",
                                  fontWeight: 1000,
                                  letterSpacing: 0.2,
                                  boxShadow: 'none',
                                  '&:hover': { bgcolor: "#ff4059", boxShadow: 'none' },
                                  '&:active': { boxShadow: 'none' },
                                  transition: 'transform 200ms ease',
                                  '&:hover:not(:disabled)': { transform: 'translateY(-1px)' },
                                  '&:active:not(:disabled)': { transform: 'translateY(0px) scale(0.98)' },
                                  display: canClockOutBase ? 'inline-flex' : 'none',
                                  borderRadius: 999,
                                  minHeight: 44,
                                }}
                              >
                                ลงเวลาออกงาน
                              </Button>
                            </Box>

                            {/* ✅ Location button */}
                            {!isExempt && (canClockInBase || canClockOutBase) ? (
                              <Button
                                size="large"
                                variant="outlined"
                                startIcon={<MyLocationIcon />}
                                onClick={refreshLocationAndGeofence}
                                fullWidth
                                sx={{
                                  flex: { md: 1 }, // ✅ Desktop ให้เท่ากับกลุ่มซ้าย
                                  borderRadius: 999,
                                  fontWeight: 1000,
                                  borderColor: 'rgba(15,23,42,0.14)',
                                  color: 'text.primary',
                                  '&:hover': {
                                    borderColor: 'rgba(15,23,42,0.22)',
                                    bgcolor: 'rgba(15,23,42,0.03)',
                                    boxShadow: 'none',
                                  },
                                  boxShadow: 'none',
                                  minHeight: 44,
                                }}
                              >
                                ตรวจสอบพื้นที่
                              </Button>
                            ) : null}
                          </Box>
                        </Box>


                        {!isExempt && geoResult && typeof geoResult.ok === 'boolean' && lastCoords ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              mt: 0.75,
                              textAlign: { xs: 'center', md: 'left' },
                              width: '100%',
                              maxWidth: '100%',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                            }}
                          >
                            {geoResult?.geofence_name ? (
                              <>
                                พื้นที่: <b>{geoResult.geofence_name}</b> • ระยะห่าง {fmtNum(geoResult?.distance_m, 0)} เมตร
                              </>
                            ) : (
                              <>ตรวจสอบพื้นที่แล้ว</>
                            )}
                            {' • '}
                            พิกัด {fmtNum(lastCoords.lat, 5)}, {fmtNum(lastCoords.lng, 5)} (±{fmtNum(lastCoords.accuracy, 0)} เมตร)
                          </Typography>
                        ) : null}
                      </>
                    )}
                  </>
                )}

                {/* ✅ History box: Skeleton “ระดับ Paper ทั้งกล่อง” */}
                {!isExempt && (
                  <>
                    {loadingHistory ? (
                      <BlockSkeleton height={150} />
                    ) : (
                      <Paper
                        // variant="outlined"
                        sx={{
                          p: 2.2,
                          mt: 1.5,
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          minWidth: 0,
                          boxShadow: 'none',
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography sx={{ fontWeight: 1000 }}>ประวัติการลงเวลา</Typography>
                          <Typography variant="caption" color="text.secondary">
                            อัปเดตอัตโนมัติ
                          </Typography>
                        </Stack>

                        <Divider sx={{ mb: 1.25, borderColor: 'rgba(15,23,42,0.08)' }} />

                        {historyRows.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" align="center">
                            ไม่มีข้อมูลย้อนหลัง
                          </Typography>
                        ) : (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr',
                              gap: 1,
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                              วันที่
                            </Typography>

                            {!isMobile && (
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                เข้า
                              </Typography>
                            )}

                            {!isMobile && (
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                ออก
                              </Typography>
                            )}

                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }} align="center">
                              สถานะ
                            </Typography>

                            {historyRows.map((r) => {
                              const statusLabel = supabaseData.getAttendanceStatusLabel(r, todayISO);
                              const statusSeverity = supabaseData.getAttendanceStatusSeverity(r, todayISO);
                              const statusSx =
                                statusSeverity === 'text.secondary' ? { color: 'text.secondary' } : { color: `${statusSeverity}.main` };

                              return (
                                <React.Fragment key={r.work_date}>
                                  <Typography variant="body2">{supabaseData.formatDateTHFromISO(r.work_date)}</Typography>

                                  {!isMobile && <Typography variant="body2">{supabaseData.formatTimeTH(r.clock_in_at)}</Typography>}
                                  {!isMobile && <Typography variant="body2">{supabaseData.formatTimeTH(r.clock_out_at)}</Typography>}

                                  <Typography variant="body2" align="center" sx={{ ...statusSx, fontWeight: 800 }}>
                                    {statusLabel}
                                  </Typography>
                                </React.Fragment>
                              );
                            })}
                          </Box>
                        )}
                      </Paper>
                    )}
                  </>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
