import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import SecurityIcon from '@mui/icons-material/Security';
import { createTheme } from '@mui/material/styles';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
} from '@toolpad/core/Account';

import { DemoProvider } from '@toolpad/core/internal';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import logo from '@/assets/logo.png';

// ใช้ไฟล์นำทางแยกเพื่อความเป็นระเบียบและยืดหยุ่นต่อโมดูล
import { NAVIGATION } from './navigation';
import { useNavigate } from "react-router-dom";

// ========== (ตัวอย่างหน้า) ==========
import Info from './modules/company/info';
import DepartmentTypes from './modules/company/department-types';
import Positions from './modules/company/positions';
import Policies from './modules/company/policies';
import Departments from './modules/company/departments';
import Reports from './modules/company/reports';
import SettingsReportsPage from './modules/settings/reports';

import Employee from './modules/employees/employee';
import TerminationPage from './modules/employees/termination';
import PositionSalaryAdjustmentPage from './modules/employees/position-salary-adjustment';
import EmployeesReportsPage from './modules/employees/reports';
import UnitCodesPage from './modules/settings/unit-codes';
import BankCodesPage from './modules/settings/bank-codes';
import EmailTemplatesPage from './modules/settings/email-templates';
import ProvidentFundCodesPage from './modules/settings/provident-fund-codes';
import RoundingFormatsPage from './modules/settings/rounding-formats';
import UserGroupsPage from './modules/settings/user-groups';
import EmployeeGroupsPage from './modules/settings/employee-groups';
import EmployeeLevelsPage from './modules/settings/employee-levels';
import LeaveTypesPage from './modules/settings/leave-types';
import ShiftSchedulesPage from './modules/settings/shift-schedules';
import CompanyCalendarPage from './modules/settings/company-calendar';
import PayrollProcessingPatternsPage from './modules/settings/payroll-processing-patterns';
import TimeDeviceFormatsPage from './modules/settings/time-device-formats';
import EarnDeductsPage from './modules/payroll/earn-deducts';
import PaymentSchedulesPage from './modules/settings/payment-schedules';
import PermissionsPage from './modules/permissions';

// ================= THEME =================
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-toolpad-color-scheme' },
  colorSchemes: { light: true, dark: true },
});

// ================= TOOLBAR =================
/**
 * ปุ่มบนแถบเครื่องมือด้านบนของแดชบอร์ด
 * why: คงที่ไม่ขึ้นกับหน้าใดหน้า—ให้สวิตช์ธีมเข้าถึงได้ตลอด
 */
function CustomToolbarActions() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data: { session: currentSession } = {},
        } = await supabase.auth.getSession();
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
      try { window.location.assign('/login'); } catch { /* ignore */ }
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Tooltip title={user?.email ?? 'Account'}>
        <IconButton onClick={handleOpen} size="small" sx={{ ml: 1 }} aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
          <Avatar sx={{ width: 32, height: 32 }} src={user?.user_metadata?.avatar_url ?? user?.avatar_url ?? ''}>
            {user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? ''}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} id="account-menu" open={open} onClose={handleClose} onClick={handleClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem disabled>
          <Stack>
            <Typography variant="body2">{user?.user_metadata?.full_name ?? user?.email ?? 'Guest'}</Typography>
            {user?.email && <Typography variant="caption" color="text.secondary">{user.email}</Typography>}
          </Stack>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>ออกจากระบบ</MenuItem>
      </Menu>
    </Stack>
  );
}


// ================= SIDEBAR FOOTER (ACCOUNT PREVIEW + POPOVER) =================
/**
 * แสดงโปรไฟล์สรุปที่ส่วนท้ายของ Sidebar
 * why: ผู้ใช้เข้าถึงบัญชี/สลับบัญชี/ออกจากระบบได้รวดเร็ว โดยไม่ต้องขึ้นไปที่ AppBar
 */
function AccountSidebarPreview(props) {
  const { handleClick, open, mini } = props;
  return (
    <Stack direction="column" p={0}>
      <Divider />
      <AccountPreview
        variant={mini ? 'condensed' : 'expanded'}
        handleClick={handleClick}
        open={open}
      />
    </Stack>
  );
}

AccountSidebarPreview.propTypes = {
  handleClick: PropTypes.func,
  mini: PropTypes.bool.isRequired,
  open: PropTypes.bool,
};

// ข้อมูลบัญชี (เดโม่) เพื่อให้ป๊อปโอเวอร์มีรายการให้ดู
const accounts = [

  {
    id: 2,
    name: 'Bharat MUI',
    email: 'bharat@mui.com',

    image: '',
    projects: [{ id: 4, title: 'Project A' }],
  },
];

/**
 * เนื้อหาข้างในป๊อปโอเวอร์บัญชีที่ท้าย Sidebar
 * why: รวม quick actions เช่นสลับบัญชี/ออกจากระบบ ในบริบทของ Sidebar
 */
function SidebarFooterAccountPopover() {
  return (
    <Stack direction="column">
      <MenuList>
        {accounts.map((account) => (
          <MenuItem
            key={account.id}
            component="button"
            sx={{ justifyContent: 'flex-start', width: '100%', columnGap: 2 }}
          >
            <ListItemIcon>
              <Avatar
                sx={{ width: 32, height: 32, fontSize: '0.95rem', bgcolor: account.color }}
                src={account.image ?? ''}
                alt={account.name ?? ''}
              >
                {account.name[0]}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}
              primary={account.name}
              secondary={account.email}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}
      </MenuList>
      <Divider />
      <AccountPopoverFooter>
        <SignOutButton />
      </AccountPopoverFooter>
    </Stack>
  );
}

const createPreviewComponent = (mini) => {
  function PreviewComponent(props) { return <AccountSidebarPreview {...props} mini={mini} />; }
  return PreviewComponent;
};

/**
 * ครอบคอมโพเนนต์ Account เพื่อเสียบ preview + popover
 * why: ปรับตำแหน่ง/เงา/ลูกศรของป๊อปโอเวอร์ให้กลมกลืนกับ Sidebar และไม่แย่งโฟกัส
 */
function SidebarFooterAccount({ mini }) {
  const PreviewComponent = React.useMemo(() => createPreviewComponent(mini), [mini]);
  return (
    <Account
      slots={{ preview: PreviewComponent, popoverContent: SidebarFooterAccountPopover }}
      slotProps={{
        popover: {
          transformOrigin: { horizontal: 'left', vertical: 'bottom' },
          anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
          disableAutoFocus: true, // why: ไม่ดึงโฟกัสอัตโนมัติ ลดการรบกวนการใช้งานคีย์บอร์ด
          slotProps: {
            paper: {
              elevation: 0,
              sx: {
                overflow: 'visible',
                // why: เพิ่มเงาเพื่อแยกเลเยอร์ชัดเจน ทั้งโหมดสว่าง/มืด
                filter: (theme) =>
                  `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'
                  })`,
                mt: 1,
                // why: ทำหัวลูกศรของป๊อปโอเวอร์ให้ชี้จาก Sidebar
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            },
          },
        },
      }}
    />
  );
}

SidebarFooterAccount.propTypes = { mini: PropTypes.bool.isRequired };

// ================= SESSION (SUPABASE) =================
// We'll read the authenticated user from Supabase and keep it in state.

// ================= PAGE RENDERER =================
/**
 * เลือกหน้าให้พื้นที่คอนเทนต์จาก pathname ภายในแดชบอร์ด
 * why: คุมเส้นทางภายในโมดูลได้ง่าย และซ่อนคอนเทนต์เมื่ออยู่ที่ root ของโมดูล
 */
function PageRenderer({ pathname }) {
  switch (pathname) {
    case '/company':
      return null; // why: หน้าเริ่มต้นว่าง รอผู้ใช้เลือกเมนูย่อย
    case '/company/positions':
      return <Positions />;
    case '/company/info':
      return <Info />;
    case '/company/department-types':
      return <DepartmentTypes />;
    case '/company/policies':
      return <Policies />;
    case '/company/departments':
      return <Departments />;
    case '/company/reports':
      return <Reports />;

    case '/employees/employee':
      return <Employee />;
    case '/employees/termination':
      return <TerminationPage />;
    case '/employees/position-salary-adjustment':
      return <PositionSalaryAdjustmentPage />;
    case '/employees/reports':
      return <EmployeesReportsPage />;

    case '/settings':
      return null;
    case '/settings/unit-codes':
      return <UnitCodesPage />;
    case '/settings/email-templates':
      return <EmailTemplatesPage />;
    case '/settings/reports':
      return <SettingsReportsPage />;
    case '/settings/bank-codes':
      return <BankCodesPage />;
    // case '/settings/provident-fund-codes':
    //   return <ProvidentFundCodesPage />;
    case '/settings/rounding-formats':
      return <RoundingFormatsPage />;
    case '/settings/user-groups':
      return <UserGroupsPage />;
    case '/settings/employee-groups':
      return <EmployeeGroupsPage />;
    case '/settings/employee-levels':
      return <EmployeeLevelsPage />;
    case '/settings/leave-types':
      return <LeaveTypesPage />;
    case '/settings/shift-schedules':
      return <ShiftSchedulesPage />;
    case '/settings/company-calendar':
      return <CompanyCalendarPage />;
    case '/settings/payroll-processing-patterns':
      return <PayrollProcessingPatternsPage />;
    case '/settings/time-device-formats':
      return <TimeDeviceFormatsPage />;
    case '/settings/payment-schedules':
      return <PaymentSchedulesPage />;
    case '/settings/earn-deducts':
      return <EarnDeductsPage />;
    case '/permissions':
      return <PermissionsPage />;
    // backward compatibility for old payroll path
    case '/payroll/payment-schedules':
      return <PaymentSchedulesPage />;
    // backward compatibility if someone still navigates using old payroll path
    case '/payroll/earn-deducts':
      return <EarnDeductsPage />;

    default:
      return (
        <Box sx={{ textAlign: 'center', color: 'red', mt: 2 }}>
          ไม่พบหน้า: {pathname}
        </Box>
      );
  }
}

PageRenderer.propTypes = { pathname: PropTypes.string.isRequired };

// ================= MAIN LAYOUT =================
/**
 * เปลือกหลักของแดชบอร์ดโมดูล "บริษัท"
 * why: รวม theme/router/session/menu ไว้ที่เดียว แล้วส่งต่อให้ DashboardLayout จัดการโครงหน้าจอ
 */
function DashboardLayoutAccountSidebar(props) {
  const { window } = props;

  // เริ่มต้นที่เส้นทางของโมดูล (ซ่อนคอนเทนต์จนกว่าจะเลือกเมนูย่อย)
  const [pathname, setPathname] = React.useState('/company');

  // Router ภายใน: ให้ DashboardLayout ใช้ทั้ง current path & navigate
  const router = React.useMemo(
    () => ({
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path) => setPathname(String(path)),
    }),
    [pathname],
  );

  // Remove this const when copying and pasting into your project.
  const demoWindow = window !== undefined ? window() : undefined;

  const { user, isLoading } = useAuth();

  const navigate = useNavigate();

  // If auth is still loading, don't redirect yet. ProtectedRoute will handle loading.
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Listen for global event to open a company submenu (dispatched from module pages)
  React.useEffect(() => {
    function handleOpenCompany(e) {
      // expect detail to be the submenu segment, e.g. 'info' -> '/company/info'
      const seg = e?.detail || 'info';
      setPathname(`/company/${seg}`);
    }
    // use globalThis to avoid shadowing by the `window` prop passed in via props
    if (typeof globalThis !== 'undefined' && globalThis.addEventListener) {
      globalThis.addEventListener('openCompanySubmenu', handleOpenCompany);
      return () => globalThis.removeEventListener('openCompanySubmenu', handleOpenCompany);
    }
    return undefined;
  }, []);

  // Small component rendered in the sidebar footer to pin the permissions link at the bottom
  function SidebarBottomLink() {
    return (
      <Box sx={{ width: '100%', px: 0.5, pb: 1 }}>
        <MenuItem
          onClick={() => setPathname('/permissions')}
          sx={{
            justifyContent: 'flex-start',
            width: '100%',
            columnGap: 1,
            py: 1.25,
            pl: 2,
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <SecurityIcon />
          </ListItemIcon>
          <ListItemText
            primary="สิทธิ์การใช้งานระบบ"
            primaryTypographyProps={{ variant: 'body1', sx: { fontSize: '0.95rem', color: 'text.primary' } }}
          />
        </MenuItem>
      </Box>
    );
  }

  const authentication = React.useMemo(
    () => ({
      signIn: async () => {
        // You can implement a redirect to your sign-in page here.
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
        } catch (err) {
          console.error('Sign out error', err);
        }
      },
    }),
    [navigate],
  );


  return (
    // Remove this provider when copying and pasting into your project.
    <DemoProvider window={demoWindow}>
      <AppProvider
        branding={{
          logo: <img src={logo} alt="TPR" style={{ width: 35, height: 35, objectFit: 'contain' }} />, // ใช้โลโก้จาก src/assets
          title: 'HRM', // 👈 ตรงนี้เปลี่ยนได้
        }}
        navigation={NAVIGATION} // why: แยกเมนูเป็นไฟล์ ทำให้สลับเมนูต่อโมดูลได้ง่าย
        router={router}
        theme={theme}
        window={demoWindow}
        authentication={authentication}
        session={user ? { user } : null}
      >
        <DashboardLayout
          defaultSidebarCollapsed={false} // start expanded by default
          // sidebarFooter: pin a permissions link to the bottom of the sidebar
          // pass the component (not a JSX element) — DashboardLayout expects a component reference
          slots={{ toolbarActions: CustomToolbarActions, sidebarFooter: SidebarBottomLink }}
        >
          <PageRenderer pathname={pathname} />
        </DashboardLayout>
      </AppProvider>
    </DemoProvider>
  );
}

DashboardLayoutAccountSidebar.propTypes = {
  /** Injected by the documentation to work in an iframe. */
  window: PropTypes.func,
};

export default DashboardLayoutAccountSidebar;
