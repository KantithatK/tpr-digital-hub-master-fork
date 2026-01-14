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
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  // colors,
} from '@mui/material';

import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// ✅ Icons (MUI)
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/Window';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';

// Default avatar asset
import defaultAvatar from '../assets/avatar.png';

// Load bundled avatar images (1.webp..10.webp) via Vite import.meta.glob
const _avatarModules = import.meta.glob('../assets/avatars/*.webp', { eager: true, as: 'url' });
const AVATAR_URLS = Object.keys(_avatarModules)
  .map((p) => ({ path: p, url: _avatarModules[p] }))
  .map(({ path, url }) => {
    const m = path.match(/(\d+)\.webp$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return { n, url };
  })
  .sort((a, b) => a.n - b.n)
  .map((o) => o.url);

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

/* ================= PAGE RENDERER ================= */
function PageRenderer({
  pathname,
  canAccessTaskTracking,
  canAccessTimeLogging,
  canAccessPlanning,
  canAccessProjects,
  canAccessManager,
  canAccessOTSummary,
  canAccessSales,
  session,
}) {
  switch (pathname) {
    case '/company':
      return <TimeClock session={session} />;

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
  canAccessTaskTracking: PropTypes.bool,
  canAccessTimeLogging: PropTypes.bool,
  canAccessPlanning: PropTypes.bool,
  canAccessProjects: PropTypes.bool,
  canAccessManager: PropTypes.bool,
  canAccessSales: PropTypes.bool,
  canAccessOTSummary: PropTypes.bool,
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
  const [storedAvatarUrl, setStoredAvatarUrl] = React.useState(null);


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

  // Manage cached/random fallback avatar when user has no remote avatar
  React.useEffect(() => {
    let mounted = true;
    const hasAvatar = user?.user_metadata?.avatar_url || user?.avatar_url;
    if (hasAvatar) {
      if (mounted) setStoredAvatarUrl(null);
      return () => {
        mounted = false;
      };
    }

    try {
      const key = `tpr:avatar:${user?.id || user?.email || 'guest'}`;
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (saved && AVATAR_URLS.includes(saved)) {
        if (mounted) setStoredAvatarUrl(saved);
        if (saved) console.log('[tpr] using cached avatar:', saved);
        return () => {
          mounted = false;
        };
      }

      if (AVATAR_URLS.length > 0) {
        const idx = Math.floor(Math.random() * AVATAR_URLS.length);
        const url = AVATAR_URLS[idx];
        try {
          if (typeof window !== 'undefined') window.localStorage.setItem(key, url);
        } catch{
          // ignore storage errors
        }
        if (mounted) setStoredAvatarUrl(url);
        console.log('[tpr] selected random avatar:', url);
      }
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
    };
  }, [user]);

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

  return (
    <>
      <IconButton onClick={handleOpen} size="small" sx={{ ml: 1 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            boxSizing: 'border-box',
            bgcolor: '#',
          }}
          src={user?.user_metadata?.avatar_url ?? user?.avatar_url ?? storedAvatarUrl ?? defaultAvatar}
        >
          {!(user?.user_metadata?.avatar_url || user?.avatar_url || storedAvatarUrl)
            ? user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? ''
            : ''}
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

/* ================= MAIN APP (NO TOOLPAD) ================= */
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

  // Role-based access
  const [canAccessSettings, setCanAccessSettings] = React.useState(false);
  const [canAccessTaskTracking, setCanAccessTaskTracking] = React.useState(false);
  const [canAccessTimeLogging, setCanAccessTimeLogging] = React.useState(false);
  const [canAccessPlanning, setCanAccessPlanning] = React.useState(false);
  const [canAccessProjects, setCanAccessProjects] = React.useState(false);
  const [canAccessOTSummary, setCanAccessOTSummary] = React.useState(false);
  const [canAccessManager, setCanAccessManager] = React.useState(false);
  const [canAccessSales, setCanAccessSales] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) {
          if (mounted) {
            setCanAccessSettings(false);
            setCanAccessTaskTracking(false);
            setCanAccessTimeLogging(false);
            setCanAccessPlanning(false);
            setCanAccessProjects(false);
            setCanAccessManager(false);
            setCanAccessOTSummary(false);
          }
          return;
        }

        const { data: bindings, error: bindErr } = await supabase
          .from('tpr_user_role_bindings')
          .select('role_id, email')
          .eq('email', email);

        if (bindErr) {
          if (mounted) {
            setCanAccessSettings(false);
            setCanAccessTaskTracking(false);
            setCanAccessTimeLogging(false);
            setCanAccessPlanning(false);
            setCanAccessProjects(false);
            setCanAccessManager(false);
            setCanAccessOTSummary(false);
          }
          return;
        }

        const roleIds = (bindings || []).map((b) => b.role_id);
        if (roleIds.length === 0) {
          if (mounted) {
            setCanAccessSettings(false);
            setCanAccessTaskTracking(false);
            setCanAccessTimeLogging(false);
            setCanAccessPlanning(false);
            setCanAccessProjects(false);
            setCanAccessManager(false);
            setCanAccessOTSummary(false);
          }
          return;
        }

        const { data: roles, error: rolesErr } = await supabase
          .from('tpr_roles')
          .select('id, name_th, name_en')
          .in('id', roleIds);

        if (rolesErr) {
          if (mounted) {
            setCanAccessSettings(false);
            setCanAccessTaskTracking(false);
            setCanAccessTimeLogging(false);
            setCanAccessPlanning(false);
            setCanAccessProjects(false);
            setCanAccessManager(false);
            setCanAccessOTSummary(false);
          }
          return;
        }

        const allowedTh = ['ประธานเจ้าหน้าที่บริหาร', 'ผู้จัดการโครงการ', 'ฝ่ายทรัพยากรบุคคล'];
        const allowedEn = ['Chief Executive Officer', 'Project Manager', 'Human Resources'];
        const hasAllowed = (roles || []).some(
          (r) => allowedTh.includes(String(r.name_th || '').trim()) || allowedEn.includes(String(r.name_en || '').trim()),
        );

        const taskLeadTh = ['หัวหน้าทีม'];
        const taskLeadEn = ['Team Lead'];
        const hasTaskLead = (roles || []).some(
          (r) => taskLeadTh.includes(String(r.name_th || '').trim()) || taskLeadEn.includes(String(r.name_en || '').trim()),
        );

        const planningAllowedTh = ['ผู้จัดการโครงการ', 'หัวหน้าทีม'];
        const planningAllowedEn = ['Project Manager', 'Team Lead'];
        const hasPlanningAllowed = (roles || []).some(
          (r) =>
            planningAllowedTh.includes(String(r.name_th || '').trim()) ||
            planningAllowedEn.includes(String(r.name_en || '').trim()),
        );

        const hasProjectsAllowed = hasPlanningAllowed;

        const timeAllowedTh = ['ผู้จัดการโครงการ', 'หัวหน้าทีม', 'พนักงานทั่วไป'];
        const timeAllowedEn = ['Project Manager', 'Team Lead', 'Employee'];
        const hasTimeAllowed = (roles || []).some(
          (r) => timeAllowedTh.includes(String(r.name_th || '').trim()) || timeAllowedEn.includes(String(r.name_en || '').trim()),
        );

        const managerTh = ['หัวหน้าทีม', 'ผู้จัดการ', 'ผู้จัดการโครงการ'];
        const managerEn = ['Team Lead', 'Manager', 'Project Manager'];
        const hasManagerRole = (roles || []).some(
          (r) => managerTh.includes(String(r.name_th || '').trim()) || managerEn.includes(String(r.name_en || '').trim()),
        );

        const otTh = ['ฝ่ายทรัพยากรบุคคล', 'หัวหน้าทีม', 'ผู้จัดการโครงการ', 'ผู้จัดการ'];
        const otEn = ['Human Resources', 'Team Lead', 'Project Manager', 'Manager'];
        const hasOTAllowed = (roles || []).some(
          (r) => otTh.includes(String(r.name_th || '').trim()) || otEn.includes(String(r.name_en || '').trim()),
        );

        const salesTh = ['ผู้จัดการฝ่ายขาย', 'ผู้จัดการฝ่ายพัฒนาธุรกิจ'];
        const salesEn = ['Sales Manager', 'Business Development Manager', 'Business Development'];
        const hasSalesAllowed = (roles || []).some(
          (r) => salesTh.includes(String(r.name_th || '').trim()) || salesEn.includes(String(r.name_en || '').trim()),
        );

        if (mounted) {
          setCanAccessSettings(!!hasAllowed);
          setCanAccessTaskTracking(!!hasTaskLead);
          setCanAccessTimeLogging(!!hasTimeAllowed);
          setCanAccessPlanning(!!hasPlanningAllowed);
          setCanAccessProjects(!!hasProjectsAllowed);
          setCanAccessManager(!!hasManagerRole);
          setCanAccessOTSummary(!!hasOTAllowed);
          setCanAccessSales(!!hasSalesAllowed);
        }
      } catch (err) {
        console.error('Role access error', err);
        if (mounted) {
          setCanAccessSettings(false);
          setCanAccessTaskTracking(false);
          setCanAccessTimeLogging(false);
          setCanAccessPlanning(false);
          setCanAccessProjects(false);
          setCanAccessManager(false);
          setCanAccessOTSummary(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session]);

  const topNavItems = React.useMemo(
    () => [
      { title: 'หน้าแรก', path: '/attendance', disabled: false, icon: <HomeRoundedIcon /> },
      { title: 'โครงการ', path: '/projects', disabled: false, icon: <WorkspacesRoundedIcon /> },
      { title: 'งานโครงการ', path: '/planning', disabled: false, icon: <AccountTreeRoundedIcon /> },
      { title: 'ติดตามงาน', path: '/task-tracking', disabled: false, icon: <TrackChangesRoundedIcon /> },
      { title: 'บันทึกเวลา', path: '/time-logging', disabled: false, icon: <AccessTimeRoundedIcon /> },
      { title: 'ผู้จัดการ', path: '/manager-overview', disabled: false, icon: <SupervisorAccountRoundedIcon /> },
      { title: 'โอกาสทางการขาย', path: '/sales-opportunities', disabled: false, icon: <LocalOfferRoundedIcon /> },
      { title: 'ลา & โอที', path: '/leave-ot-summary', disabled: false, icon: <EventNoteRoundedIcon /> },
      { title: 'สรุปการเงิน', path: '/finance-summary', disabled: false, icon: <PaymentsRoundedIcon /> },
      { title: 'ตั้งค่า', path: '/settings', disabled: false, icon: <SettingsRoundedIcon /> },
    ],
    [canAccessProjects, canAccessPlanning, canAccessTaskTracking, canAccessTimeLogging, canAccessManager, canAccessOTSummary, canAccessSettings, canAccessSales],
  );

  const activeColorMap = useStableRandomColorMap(topNavItems.map((i) => i.path));

  const handleNavigate = (path) => {
    const p = String(path);
    setPathname(p);
  };

  // ✅ Responsive: Mobile hamburger
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // md ลงไปถือว่า mobile/tablet
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

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
                      />
                    ) : (
                      <IconButton
                        onClick={() => setMobileNavOpen(true)}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          bgcolor: 'rgba(15, 23, 42, 0.04)',
                          '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.07)'},
                        }}
                        
                      >
                        <MenuRoundedIcon sx={{ color: "#000" }} />
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
                  canAccessTaskTracking={canAccessTaskTracking}
                  canAccessTimeLogging={canAccessTimeLogging}
                  canAccessPlanning={canAccessPlanning}
                  canAccessProjects={canAccessProjects}
                  canAccessManager={canAccessManager}
                  canAccessOTSummary={canAccessOTSummary}
                  canAccessSales={canAccessSales}
                  session={session}
                />
              </Container>
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
