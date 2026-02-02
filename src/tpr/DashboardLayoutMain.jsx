import * as React from 'react';
import PropTypes from 'prop-types';

import {
  AppBar,
  Toolbar,
  Box,
  Stack,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  CssBaseline,
  Button,
  Container,
  Paper,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from '@mui/material';

import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// ✅ Icons (MUI)
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/Window';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';

// Supabase / Providers
import { supabase } from '../lib/supabaseClient';
import PresenceProvider from '../lib/PresenceProvider';

// Loading / Notify Providers
import LoadingProvider from './contexts/LoadingProvider';
import { setLoadingApi } from './contexts/LoadingStore';

import NotifyProvider from './contexts/NotifyProvider';
import { setNotifyApi } from './contexts/NotifyStore';

// Modules
import SystemSettings from './modules/settings/SystemSettings';
import ProjectsList from './modules/projects/ProjectsList';
import PlanningResourcing from './modules/planning/PlanningResourcing.jsx';
import TimeLogging from './modules/time/TimeLogging.jsx';
import TimeClock from './modules/time/TimeClock.jsx';
import OTSummary from './modules/time/OTSummary.jsx';
import TaskTracking from './modules/tasks/TaskTracking.jsx';
import ManagerOverview from './modules/manager/ManagerOverview.jsx';
import FinanceSummary from './modules/finance/FinanceSummary.jsx';
import SalesOpportunities from './modules/sales/SalesOpportunities.jsx';

/* ================= THEME: Modern Soft Dashboard ================= */
const appTheme = createTheme({
  typography: {
    fontFamily: ['Kanit', 'Sarabun', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h3: { fontWeight: 800, letterSpacing: -0.5 },
    h4: { fontWeight: 800, letterSpacing: -0.4 },
    h5: { fontWeight: 800, letterSpacing: -0.3 },
    h6: { fontWeight: 700, letterSpacing: -0.2 },
  },
  shape: { borderRadius: 18 },
  palette: {
    mode: 'light',
    primary: { main: '#3B82F6' },
    secondary: { main: '#8B5CF6' },
    success: { main: '#08d84c' },
    warning: { main: '#fdca01' },
    error: { main: '#ff4059' },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    divider: 'rgba(15, 23, 42, 0.08)',
  },
});

/* ================= FUN: Random Active Colors ================= */
const ACTIVE_COLORS = ['#3B82F6', '#8B5CF6', '#08d84c', '#fdca01', '#ff4059'];

function useStableRandomColorMap(keys) {
  const mapRef = React.useRef({});
  React.useEffect(() => {
    keys.forEach((k) => {
      if (!mapRef.current[k]) {
        const idx = Math.floor(Math.random() * ACTIVE_COLORS.length);
        mapRef.current[k] = ACTIVE_COLORS[idx];
      }
    });
  }, [keys]);
  return mapRef.current;
}

/* ================= HELPER UI ================= */
function NoAccess() {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography sx={{ fontWeight: 900 }}>ไม่มีสิทธิ์เข้าถึงหน้านี้</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์
      </Typography>
    </Paper>
  );
}

/* ================= PAGE SKELETON ================= */
function PageSkeleton() {
  return (
    <>
      <AppBar position="sticky" elevation={0} color="default" sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>
        <Toolbar sx={{ minHeight: 72, px: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 90 }}>
            <Skeleton variant="circular" width={38} height={38} />
          </Stack>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Skeleton variant="rectangular" width={90} height={36} sx={{ borderRadius: 8 }} />
              <Skeleton variant="rectangular" width={90} height={36} sx={{ borderRadius: 8 }} />
              <Skeleton variant="rectangular" width={90} height={36} sx={{ borderRadius: 8 }} />
              <Skeleton variant="rectangular" width={90} height={36} sx={{ borderRadius: 8 }} />
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 72 }}>
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Skeleton variant="rectangular" width={{ md: '65%' }} height={160} sx={{ borderRadius: 2 }} />
            <Stack spacing={2} sx={{ width: { md: '35%' } }}>
              <Skeleton variant="rectangular" height={76} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" height={76} sx={{ borderRadius: 2 }} />
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Skeleton variant="rectangular" width={{ md: '33%' }} height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={{ md: '33%' }} height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={{ md: '33%' }} height={120} sx={{ borderRadius: 2 }} />
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

/* ================= PATH NORMALIZER ================= */
function normalizePath(p) {
  const s = String(p || '');
  if (s.startsWith('/company/')) return `/${s.replace('/company/', '')}`;
  if (s === '/company') return '/attendance';
  return s;
}

/* ================= PAGE RENDERER ================= */
function PageRenderer({ pathname, session, allowedPathSet }) {
  const normalized = normalizePath(pathname);

  // ✅ ตรวจสิทธิ์ก่อน render (ถ้าไม่ได้ ALL)
  if (allowedPathSet && !allowedPathSet.has(normalized)) {
    return <NoAccess />;
  }

  switch (normalized) {
    case '/company':
    case '/attendance':
    case '/company/attendance':
      return <TimeClock session={session} />;

    case '/projects':
    case '/company/projects':
      return <ProjectsList />;

    case '/planning':
    case '/company/planning':
      return <PlanningResourcing />;

    case '/time-logging':
    case '/company/time-logging':
      return <TimeLogging />;

    case '/leave-ot-summary':
    case '/company/leave-ot-summary':
      return <OTSummary />;

    case '/task-tracking':
    case '/company/task-tracking':
      return <TaskTracking />;

    case '/manager-overview':
    case '/company/manager-overview':
      return <ManagerOverview />;

    case '/sales-opportunities':
      return <SalesOpportunities />;

    case '/settings':
    case '/company/settings':
      return <SystemSettings />;

    case '/finance-summary':
      return <FinanceSummary />;

    default:
      return (
        <Box sx={{ textAlign: 'center', color: 'error.main', mt: 2 }}>
          ไม่พบหน้า: {pathname}
        </Box>
      );
  }
}

PageRenderer.propTypes = {
  pathname: PropTypes.string.isRequired,
  allowedPathSet: PropTypes.instanceOf(Set),
  session: PropTypes.object,
};

/* ================= TOP NAV (DESKTOP) ================= */
function TopNav({ items, activePath, onNavigate, disabled = false, activeColorMap }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        justifyContent: 'center',
        overflowX: 'auto',
        px: 1,
        maxWidth: '100%',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {items.map((it) => {
        const isActive = activePath === it.path;
        const itemDisabled = disabled || !!it.disabled;
        const activeColor = activeColorMap?.[it.path] || '#3B82F6';

        return (
          <Button
            key={it.path}
            disabled={itemDisabled}
            onClick={() => onNavigate(it.path)}
            variant={isActive ? 'contained' : 'text'}
            color={isActive ? 'primary' : 'inherit'}
            startIcon={it.icon ? it.icon : null}
            sx={{
              px: 2.1,
              py: 1.0,
              borderRadius: 999,
              fontWeight: 900,
              fontSize: 15,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              '& .MuiButton-startIcon': { mr: 0.9 },
              '& .MuiSvgIcon-root': { fontSize: 18 },

              color: isActive ? '#fff' : 'text.primary',
              bgcolor: isActive ? activeColor : 'transparent',
              opacity: itemDisabled ? 0.45 : 1,

              transition:
                'transform 220ms cubic-bezier(.2,.8,.2,1), background-color 260ms ease, box-shadow 260ms ease, color 260ms ease',
              boxShadow: isActive ? `0px 12px 26px ${activeColor}33` : 'none',

              '&:hover': {
                bgcolor: isActive ? activeColor : 'rgba(15, 23, 42, 0.06)',
                transform: itemDisabled ? 'none' : 'translateY(-1px)',
              },
              '&:active': {
                transform: itemDisabled ? 'none' : 'translateY(0px) scale(0.98)',
              },
            }}
          >
            {it.title}
          </Button>
        );
      })}
    </Stack>
  );
}

TopNav.propTypes = {
  items: PropTypes.array.isRequired,
  activePath: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  activeColorMap: PropTypes.object,
};

/* ================= MOBILE NAV (DIALOG) ================= */
function MobileNavDialog({ open, onClose, items, activePath, onNavigate, activeColorMap }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 1.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 1000,
        }}
      >
        เมนู
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <List sx={{ p: 0 }}>
          {items.map((it) => {
            const isActive = activePath === it.path;
            const activeColor = activeColorMap?.[it.path] || '#3B82F6';
            const itemDisabled = !!it.disabled;

            return (
              <ListItemButton
                key={it.path}
                disabled={itemDisabled}
                onClick={() => {
                  if (itemDisabled) return;
                  onNavigate(it.path);
                  onClose();
                }}
                sx={{
                  py: 1.2,
                  px: 1.75,
                  opacity: itemDisabled ? 0.45 : 1,
                  bgcolor: isActive ? `${activeColor}14` : 'transparent',
                  '&:hover': { bgcolor: isActive ? `${activeColor}1f` : 'rgba(15, 23, 42, 0.04)' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? activeColor : 'text.secondary',
                  }}
                >
                  {it.icon}
                </ListItemIcon>

                <ListItemText
                  primaryTypographyProps={{
                    sx: {
                      fontWeight: isActive ? 1000 : 900,
                      color: 'text.primary',
                    },
                  }}
                  primary={it.title}
                />

                {isActive ? (
                  <Box
                    sx={{
                      ml: 1,
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      bgcolor: activeColor,
                      boxShadow: `0px 10px 20px ${activeColor}33`,
                    }}
                  />
                ) : null}
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}

MobileNavDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  activePath: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  activeColorMap: PropTypes.object,
};

/* ================= ACCOUNT MENU ================= */
function AccountMenuButton() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: { session: currentSession } = {} } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error('Failed to load user for toolbar', err);
      }
    }

    load();

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      setUser(sessionData?.user ?? null);
    });

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out failed', err);
    } finally {
      handleClose();
      try {
        window.location.assign('/login');
      } catch {
        // ignore
      }
    }
  };

  const avatarSrc = user?.user_metadata?.avatar_url ?? user?.avatar_url;

  const borderColor = React.useMemo(() => {
    const idx = Math.floor(Math.random() * ACTIVE_COLORS.length);
    return ACTIVE_COLORS[idx];
  }, []);

  return (
    <>
      <IconButton onClick={handleOpen} size="small" sx={{ ml: 1 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            boxSizing: 'border-box',
            border: `3px solid ${borderColor}`,
          }}
          src={avatarSrc}
        >
          {!avatarSrc ? user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? '' : ''}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled>
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {user?.user_metadata?.full_name ?? user?.email ?? 'Guest'}
            </Typography>
            {user?.email && (
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            )}
          </Stack>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>ออกจากระบบ</MenuItem>
      </Menu>
    </>
  );
}

/* ================= BRAND: TPR. ================= */
function BrandMark() {
  return (
    <Typography sx={{ fontWeight: 1000, fontSize: 28, letterSpacing: 2, lineHeight: 1 }}>
      <Box component="span" sx={{ color: '#111827', fontWeight: 1000 }}>
        •
      </Box>
      <Box component="span" sx={{ color: '#ff4059', fontWeight: 1000 }}>
        T
      </Box>
      <Box component="span" sx={{ color: '#fdca01', fontWeight: 1000 }}>
        P
      </Box>
      <Box component="span" sx={{ color: '#08d84c', fontWeight: 1000 }}>
        R
      </Box>
    </Typography>
  );
}

/* ================= MAIN APP ================= */
function DashboardLayoutAccountSidebar(props) {
  const { window } = props; // eslint-disable-line no-unused-vars

  const [pathname, setPathname] = React.useState('/attendance');

  const [session, setSession] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: currentSession } = {} } = await supabase.auth.getSession();
        if (mounted) setSession(currentSession);
        if (mounted) setAuthChecked(true);
      } catch (err) {
        console.error('Error getting supabase session', err);
        if (mounted) setAuthChecked(true);
      }
    }

    init();

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      setSession(sessionData);
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []);

  const navigate = useNavigate();

  React.useEffect(() => {
    if (authChecked && !session) {
      navigate('/login', { replace: true });
    }
  }, [authChecked, session, navigate]);

  // ✅ menu & access by role
  // category: 'ALL' (CEO/Admin) | 'HR' | 'EMP' | 'NONE'
  const [roleCategory, setRoleCategory] = React.useState('NONE');
  const [rolesResolved, setRolesResolved] = React.useState(false);
  const [rolesLoading, setRolesLoading] = React.useState(false);

  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';

  // ✅ Resolve roles เฉพาะตอน user เปลี่ยนจริง ๆ (อิง userId)
  const prevUserIdRef = React.useRef(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ถ้า user เปลี่ยน (login ใหม่/สลับ user) ค่อย reset rolesResolved
        if (prevUserIdRef.current !== userId) {
          prevUserIdRef.current = userId;
          if (mounted) {
            setRolesResolved(false);
            setRolesLoading(true);
          }
        } else {
          if (mounted) setRolesLoading(true);
        }

        if (!userId || !userEmail) {
          if (!mounted) return;
          setRoleCategory('NONE');
          setRolesResolved(true);
          setRolesLoading(false);
          return;
        }

        const { data: bindings, error: bindErr } = await supabase
          .from('tpr_user_role_bindings')
          .select('role_id, email')
          .eq('email', userEmail);

        if (bindErr) {
          if (!mounted) return;
          setRoleCategory('NONE');
          setRolesResolved(true);
          setRolesLoading(false);
          return;
        }

        const roleIds = (bindings || []).map((b) => b.role_id).filter(Boolean);
        if (roleIds.length === 0) {
          if (!mounted) return;
          setRoleCategory('NONE');
          setRolesResolved(true);
          setRolesLoading(false);
          return;
        }

        const { data: roles, error: rolesErr } = await supabase
          .from('tpr_roles')
          .select('id, name_th, name_en')
          .in('id', roleIds);

        if (rolesErr) {
          if (!mounted) return;
          setRoleCategory('NONE');
          setRolesResolved(true);
          setRolesLoading(false);
          return;
        }

        const namesTh = (roles || []).map((r) => String(r?.name_th || '').trim()).filter(Boolean);
        const namesEn = (roles || []).map((r) => String(r?.name_en || '').trim()).filter(Boolean);

        const isCEO =
          namesTh.includes('ประธานเจ้าหน้าที่บริหาร') ||
          namesEn.includes('Chief Executive Officer');

        const isAdmin =
          namesTh.includes('ผู้ดูแลระบบ') ||
          namesEn.includes('Administrator');

        const isHR =
          namesTh.includes('ฝ่ายทรัพยากรบุคคล') ||
          namesEn.includes('Human Resources');

        const isEmployee =
          namesTh.includes('พนักงานทั่วไป') ||
          namesEn.includes('Employee');

        // ✅ Priority: CEO/Admin > HR > Employee > None
        let category = 'NONE';
        if (isCEO || isAdmin) category = 'ALL';
        else if (isHR) category = 'HR';
        else if (isEmployee) category = 'EMP';
        else category = 'NONE';

        if (!mounted) return;
        setRoleCategory(category);
        setRolesResolved(true);
        setRolesLoading(false);
      } catch (err) {
        console.error('Role access error', err);
        if (!mounted) return;
        setRoleCategory('NONE');
        setRolesResolved(true);
        setRolesLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId, userEmail]);

  // ✅ Allowed paths by roleCategory
  const allowedPathSetForRenderer = React.useMemo(() => {
    if (!rolesResolved) return new Set(['/attendance']);
    if (roleCategory === 'ALL') return null;
    if (roleCategory === 'HR') return new Set(['/attendance', '/leave-ot-summary', '/settings']);
    if (roleCategory === 'EMP') return new Set(['/attendance', '/time-logging']);
    return new Set(['/attendance']);
  }, [roleCategory, rolesResolved]);

  // ✅ ถ้าหน้าปัจจุบันไม่อยู่ในสิทธิ์ → เด้งกลับ /attendance (ไม่ต้อง reload role)
  React.useEffect(() => {
    if (!rolesResolved) return;
    const current = normalizePath(pathname);
    const allowed = allowedPathSetForRenderer;
    if (allowed && !allowed.has(current)) {
      setPathname('/attendance');
    }
  }, [pathname, rolesResolved, allowedPathSetForRenderer]);

  const baseTopNavItems = React.useMemo(
    () => [
      { title: 'หน้าแรก', path: '/attendance', disabled: false, icon: <HomeRoundedIcon /> },
      { title: 'โครงการ', path: '/projects', disabled: false, icon: <WorkspacesRoundedIcon /> },
      // Hidden for now: planning and manager menu
      // { title: 'งานโครงการ', path: '/planning', disabled: false, icon: <AccountTreeRoundedIcon /> },
      // { title: 'ติดตามงาน', path: '/task-tracking', disabled: false, icon: <TrackChangesRoundedIcon /> },
      { title: 'บันทึกเวลา', path: '/time-logging', disabled: false, icon: <AccessTimeRoundedIcon /> },
      // { title: 'ผู้จัดการ', path: '/manager-overview', disabled: false, icon: <SupervisorAccountRoundedIcon /> },
      { title: 'การขาย', path: '/sales-opportunities', disabled: false, icon: <LocalOfferRoundedIcon /> },
      { title: 'ลา & โอที', path: '/leave-ot-summary', disabled: false, icon: <EventNoteRoundedIcon /> },
      { title: 'การเงิน', path: '/finance-summary', disabled: false, icon: <PaymentsRoundedIcon /> },
      { title: 'ตั้งค่า', path: '/settings', disabled: false, icon: <SettingsRoundedIcon /> },
    ],
    [],
  );

  // ✅ filter menu by roleCategory
  const topNavItems = React.useMemo(() => {
    if (!rolesResolved) {
      // ระหว่างโหลดสิทธิ์ ให้เห็นแค่หน้าแรกก่อน
      return baseTopNavItems.filter((i) => i.path === '/attendance');
    }

    if (roleCategory === 'ALL') return baseTopNavItems;

    if (roleCategory === 'HR') {
      const allowed = new Set(['/attendance', '/leave-ot-summary', '/settings']);
      return baseTopNavItems.filter((i) => allowed.has(i.path));
    }

    if (roleCategory === 'EMP') {
      const allowed = new Set(['/attendance', '/time-logging']);
      return baseTopNavItems.filter((i) => allowed.has(i.path));
    }

    return baseTopNavItems.filter((i) => i.path === '/attendance');
  }, [baseTopNavItems, roleCategory, rolesResolved]);

  const activeColorMap = useStableRandomColorMap(topNavItems.map((i) => i.path));

  const handleNavigate = (path) => {
    const p = String(path);
    setPathname(p);
  };

  // ✅ Responsive: Mobile hamburger
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  /**
   * ✅ Fix หลัก: Skeleton แสดง “ครั้งแรกเท่านั้น”
   * - ป้องกัน unmount/mount หน้า (เช่น ProjectsList) ตอน token refresh / onAuthStateChange
   */
  const firstLoadDoneRef = React.useRef(false);

  React.useEffect(() => {
    if (authChecked && rolesResolved) {
      firstLoadDoneRef.current = true;
    }
  }, [authChecked, rolesResolved]);

  const showInitialSkeleton = !firstLoadDoneRef.current && (!authChecked || !rolesResolved);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />

      <Box
        sx={{
          '@keyframes tpr-shine': {
            '0%': { transform: 'translateX(-120%)' },
            '100%': { transform: 'translateX(120%)' },
          },
        }}
      />

      <PresenceProvider>
        <NotifyProvider onApi={(api) => setNotifyApi(api)}>
          <LoadingProvider onApi={(api) => setLoadingApi(api)}>
            <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
              {showInitialSkeleton ? (
                <PageSkeleton />
              ) : (
                <>
                  <AppBar
                    position="sticky"
                    elevation={0}
                    color="default"
                    sx={{
                      bgcolor: '#FFFFFF',
                      borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                    }}
                  >
                    <Toolbar sx={{ minHeight: 72, px: { xs: 1.5, md: 2 } }}>
                      {/* Brand (ซ้าย) */}
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 90 }}>
                        <BrandMark />
                      </Stack>

                      {/* Center: Desktop = TopNav | Mobile = Hamburger */}
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {!isMobile ? (
                          <TopNav
                            items={topNavItems}
                            activePath={pathname}
                            onNavigate={handleNavigate}
                            activeColorMap={activeColorMap}
                            disabled={rolesLoading}
                          />
                        ) : (
                          <IconButton
                            onClick={() => setMobileNavOpen(true)}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 999,
                              bgcolor: 'rgba(15, 23, 42, 0.04)',
                              '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.07)' },
                            }}
                          >
                            <MenuRoundedIcon sx={{ color: '#000' }} />
                          </IconButton>
                        )}
                      </Box>

                      {/* Account (ขวา) */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 72 }}>
                        <AccountMenuButton />
                      </Box>
                    </Toolbar>
                  </AppBar>

                  {/* Mobile menu dialog */}
                  <MobileNavDialog
                    open={mobileNavOpen}
                    onClose={() => setMobileNavOpen(false)}
                    items={topNavItems}
                    activePath={pathname}
                    onNavigate={handleNavigate}
                    activeColorMap={activeColorMap}
                  />

                  <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
                    <PageRenderer
                      pathname={pathname}
                      allowedPathSet={allowedPathSetForRenderer}
                      session={session}
                    />
                  </Container>
                </>
              )}
            </Box>
          </LoadingProvider>
        </NotifyProvider>
      </PresenceProvider>
    </ThemeProvider>
  );
}

DashboardLayoutAccountSidebar.propTypes = {
  window: PropTypes.func,
};

export default DashboardLayoutAccountSidebar;
