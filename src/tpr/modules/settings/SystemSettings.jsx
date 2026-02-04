// ===== SystemSettings.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';

import { useNotify } from '../../contexts/notifyContext';
import { supabase } from '../../../lib/supabaseClient';

// ✅ components (อยู่ใน src/tpr/modules/settings/components/)
import TabPanel from './components/TabPanel';
import CustomersTab from './components/CustomersTab';
import PartnersTab from './components/PartnersTab';
import TeamsTab from './components/TeamsTab';
import PermissionsTab from './components/PermissionsTab';
import CostByPositionTab from './components/CostByPositionTab';
import CostByPersonTab from './components/CostByPersonTab';
import MarkupTab from './components/MarkupTab';

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function SystemSettings() {
  const notify = useNotify();

  // ✅ order ใหม่:
  // 0 ลูกค้า, 1 คู่ค้า, 2 ทีมงาน, 3 กำหนดสิทธิ์, 4 ต้นทุน/ตำแหน่ง, 5 ต้นทุน/บุคคล, 6 MARKUP
  const [tab, setTab] = React.useState(0);

  const [employees, setEmployees] = React.useState([]);
  const [unitMap, setUnitMap] = React.useState({});
  const [positionMap, setPositionMap] = React.useState({});

  const [loadingEmployees, setLoadingEmployees] = React.useState(false);
  const [employeesError, setEmployeesError] = React.useState('');

  // ✅ restricted: Bill Rate / Cost Rate / Markup
  const [showRestrictedTabs, setShowRestrictedTabs] = React.useState(false);
  const [loadingRestricted, setLoadingRestricted] = React.useState(true);

  // ใช้ร่วม CostByPosition/CostByPerson
  const [search, setSearch] = React.useState('');

  // ===== Markup Settings =====
  const [standardHours, setStandardHours] = React.useState(160);
  const [overheadPercent, setOverheadPercent] = React.useState(0);
  const [profitPercent, setProfitPercent] = React.useState(0);
  const markupTotal = Number(overheadPercent || 0) + Number(profitPercent || 0);

  const [billRateMethod, setBillRateMethod] = React.useState('by_position');
  const [markupSettingsId, setMarkupSettingsId] = React.useState(null);
  const [loadingMarkup, setLoadingMarkup] = React.useState(false);

  const handleChange = (event, newValue) => setTab(newValue);

  // helper: get current user label (email or id)
  async function getCurrentUserLabel() {
    try {
      if (supabase.auth && supabase.auth.getUser) {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;
        return u?.email ?? u?.id ?? null;
      }
      if (supabase.auth && supabase.auth.user) {
        try {
          const u = supabase.auth.user();
          return u?.email ?? u?.id ?? null;
        } catch {
          return null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Load markup settings from DB (tpr_markup_settings)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tpr_markup_settings')
          .select('id, standard_hours, overhead_percent, profit_percent, billrate_method')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) return;
        if (!mounted) return;

        if (data && data.length > 0) {
          const row = data[0];
          const sh = row?.standard_hours;

          if (typeof sh === 'number' && !Number.isNaN(sh) && sh > 0) setStandardHours(sh);
          if (row?.overhead_percent !== undefined && row?.overhead_percent !== null)
            setOverheadPercent(Number(row.overhead_percent || 0));
          if (row?.profit_percent !== undefined && row?.profit_percent !== null)
            setProfitPercent(Number(row.profit_percent || 0));
          if (row?.billrate_method) setBillRateMethod(row.billrate_method);
          if (row?.id) setMarkupSettingsId(row.id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function saveMarkupSettings() {
    setLoadingMarkup(true);
    try {
      const userLabel = await getCurrentUserLabel();
      const payload = {
        standard_hours: Number(standardHours || 160),
        overhead_percent: Number(overheadPercent || 0),
        profit_percent: Number(profitPercent || 0),
        billrate_method: billRateMethod,
      };
      if (userLabel) payload.updated_by = userLabel;

      let res;
      if (markupSettingsId) {
        res = await supabase.from('tpr_markup_settings').update(payload).eq('id', markupSettingsId).select();
      } else {
        if (userLabel) payload.created_by = userLabel;
        res = await supabase.from('tpr_markup_settings').insert([payload]).select();
      }

      if (res.error) throw res.error;

      const saved = res.data && res.data[0] ? res.data[0] : null;
      if (saved?.id) setMarkupSettingsId(saved.id);

      notify.success('บันทึกข้อมูลร้อยแล้ว');
    } catch (e) {
      console.error('Failed to save markup settings', e);
      notify.error(e?.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setLoadingMarkup(false);
    }
  }

  // Load employees
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingEmployees(true);
      try {
        const { data, error } = await supabase.from('employees').select('*').order('employee_code', { ascending: true });

        if (error) throw error;
        if (!ignore) {
          setEmployees(data || []);
          setEmployeesError('');
        }
      } catch (err) {
        if (!ignore) setEmployeesError(err?.message || 'ไม่สามารถโหลดพนักงานได้');
      } finally {
        if (!ignore) setLoadingEmployees(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Load departments & positions maps
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [unitsRes, posRes] = await Promise.all([
          supabase.from('v_department_form').select('id,dept_id,dept_name').limit(2000),
          supabase.from('positions').select('id,position_code,position_name,position_name_eng').limit(2000),
        ]);

        if (ignore) return;

        const udata = unitsRes.data || [];
        const pdata = posRes.data || [];

        const uMap = {};
        udata.forEach((u) => {
          uMap[String(u.id)] = u.dept_name || u.dept_id || '';
        });
        setUnitMap(uMap);

        const pMap = {};
        pdata.forEach((p) => {
          pMap[String(p.id)] = p.position_name || p.position_name_eng || p.position_code || '';
        });
        setPositionMap(pMap);
      } catch {
        // ignore
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Determine restricted access for Bill/Cost/Markup (ทำ skeleton ให้ระดับ tabs)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingRestricted(true);
      try {
        let userEmail = '';
        if (supabase.auth && supabase.auth.getUser) {
          const { data } = await supabase.auth.getUser();
          userEmail = data?.user?.email ?? '';
        } else if (supabase.auth && supabase.auth.user) {
          const u = supabase.auth.user ? supabase.auth.user() : null;
          userEmail = u?.email ?? '';
        }

        userEmail = (userEmail || '').toString().trim().toLowerCase();
        if (!userEmail) {
          if (mounted) setShowRestrictedTabs(false);
          return;
        }

        const { data, error } = await supabase
          .from('v_employee_users_with_roles')
          .select('role_label, role_name_th, role_name_en')
          .eq('email', userEmail)
          .maybeSingle();

        if (error) throw error;

        const roleLabel = (data?.role_label || data?.role_name_th || data?.role_name_en || '').toString().trim();
        const allowed = new Set(['ประธานเจ้าหน้าที่บริหาร', 'ฝ่ายทรัพยากรบุคคล', 'ผู้ดูแลระบบ']);
        if (mounted) setShowRestrictedTabs(allowed.has(roleLabel));
      } catch (e) {
        console.error('Failed to load current user role', e);
        if (mounted) setShowRestrictedTabs(false);
      } finally {
        if (mounted) setLoadingRestricted(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ ถ้าไม่มีสิทธิ์ ห้ามค้างอยู่ในแท็บที่ถูกซ่อน (4,5,6)
  React.useEffect(() => {
    const restrictedTabs = new Set([4, 5, 6]);
    if (!showRestrictedTabs && restrictedTabs.has(tab)) {
      setTab(0);
    }
  }, [showRestrictedTabs, tab]);

  const filteredEmployees = React.useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return employees;
    return (employees || []).filter((emp) => {
      const code = String(emp.employee_code || emp.id || '').toLowerCase();
      const nameTh = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.toLowerCase();
      const nameEn = `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.toLowerCase();
      const name = (nameTh + ' ' + nameEn).trim();
      const nid = String(emp.national_id || emp.id_card || emp.id_number || '').toLowerCase();
      const pos = String(emp.position || (emp.position_id ? positionMap[String(emp.position_id)] : '') || '').toLowerCase();
      const dept = String(emp.department_name || (emp.department_id ? unitMap[String(emp.department_id)] : '') || '').toLowerCase();
      return code.includes(q) || name.includes(q) || nid.includes(q) || pos.includes(q) || dept.includes(q);
    });
  }, [employees, search, positionMap, unitMap]);

  // ✅ ทำ aggregatedPositionStats สำหรับ MarkupTab
  const aggregatedPositionStats = React.useMemo(() => {
    const hours = Number(standardHours || 160) > 0 ? Number(standardHours || 160) : 160;

    const map = {};
    (employees || []).forEach((emp) => {
      const position =
        emp?.position ||
        (emp?.position_id ? (positionMap?.[String(emp.position_id)] || '') : '') ||
        '';

      if (!position) return;

      let salary = 0;
      if (emp && emp.salary_rate !== undefined && emp.salary_rate !== null && emp.salary_rate !== '') {
        const parsed = Number(String(emp.salary_rate).replace(/,/g, ''));
        salary = Number.isFinite(parsed) ? parsed : 0;
      }

      if (!map[position]) map[position] = { position, total: 0, count: 0 };
      map[position].total += salary;
      map[position].count += 1;
    });

    return Object.values(map)
      .map((it) => {
        const avgSalary = it.count ? it.total / it.count : 0;
        const avgCostPerHour = hours > 0 ? avgSalary / hours : 0;
        return { position: it.position, total: it.total, count: it.count, avgCostPerHour };
      })
      .sort((a, b) => String(a.position || '').localeCompare(String(b.position || ''), 'th'));
  }, [employees, positionMap, standardHours]);

  const tabSx = {
    '&.Mui-focusVisible': { outline: 'none' },
    '&:focus': { outline: 'none' },
    '&.Mui-selected': { fontWeight: 700 },
    textTransform: 'none',
  };

  // ✅ loading รวมสำหรับ skeleton ระดับหน้า
  const pageLoading = loadingRestricted || loadingEmployees;

  return (
    <Box
      sx={{
        p: 0,
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        '& .MuiTableCell-root:not(.MuiTableCell-head)': { borderBottom: 'none' },

        // ✅ เส้นขอบ input ใช้ divider (ธีมเดียวกับที่คุณกำลังไล่ทำ)
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider', transition: 'border-color 120ms ease' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
        '& .MuiInputLabel-root.Mui-focused': { color: 'common.black' },
      }}
    >
      <Paper
        sx={{
          p: 0,
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 320,
          boxShadow: 'none',
        }}
        elevation={0}
      >
        {/* ✅ Tabs skeleton */}
        {loadingRestricted ? (
          <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Skeleton variant="rounded" height={34} width={80} />
            <Skeleton variant="rounded" height={34} width={80} />
            <Skeleton variant="rounded" height={34} width={80} />
            <Skeleton variant="rounded" height={34} width={110} />
            <Skeleton variant="rounded" height={34} width={95} />
            <Skeleton variant="rounded" height={34} width={95} />
            <Skeleton variant="rounded" height={34} width={85} />
          </Box>
        ) : (
          <Tabs
            value={tab}
            onChange={handleChange}
            aria-label="เมนูการตั้งค่า"
            centered
            sx={{ px: 2, '& .MuiTabs-indicator': { height: 2 } }}
          >
            <Tab sx={tabSx} label="ลูกค้า" {...a11yProps(0)} />
            <Tab sx={tabSx} label="คู่ค้า" {...a11yProps(1)} />
            <Tab sx={{ ...tabSx, display: 'none' }} label="ทีมงาน" {...a11yProps(2)} />

            {/* ✅ เพิ่มแท็บกำหนดสิทธิ์ */}
            <Tab sx={tabSx} label="สิทธิ์" {...a11yProps(3)} />

            <Tab
              sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }}
              label="ต้นทุน / ตำแหน่ง"
              {...a11yProps(4)}
            />
            <Tab
              sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }}
              label="ต้นทุน / บุคคล"
              {...a11yProps(5)}
            />
            <Tab
              sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }}
              label="MARKUP"
              {...a11yProps(6)}
            />
          </Tabs>
        )}

        {/* 0: Customers */}
        <TabPanel value={tab} index={0} loading={pageLoading}>
          <CustomersTab notify={notify} />
        </TabPanel>

        {/* 1: Partners */}
        <TabPanel value={tab} index={1} loading={pageLoading}>
          <PartnersTab notify={notify} />
        </TabPanel>

        {/* 2: Teams */}
        <TabPanel value={tab} index={2} loading={pageLoading}>
          <TeamsTab notify={notify} employees={employees} positionMap={positionMap} />
        </TabPanel>

        {/* 3: Permissions */}
        <TabPanel value={tab} index={3} loading={loadingEmployees}>
          <PermissionsTab
            notify={notify}
            employees={employees}
            loadingEmployees={loadingEmployees}
            employeesError={employeesError}
            positionMap={positionMap}
            unitMap={unitMap}
          />
        </TabPanel>

        {/* 4: Bill Rate */}
        <TabPanel value={tab} index={4} loading={pageLoading}>
          <CostByPositionTab
            notify={notify}
            loadingEmployees={loadingEmployees}
            employeesError={employeesError}
            employees={employees}
            filteredEmployees={filteredEmployees}
            search={search}
            setSearch={setSearch}
            positionMap={positionMap}
            unitMap={unitMap}
            standardHours={standardHours}
            markupTotal={markupTotal}
          />
        </TabPanel>

        {/* 5: Cost Rate */}
        <TabPanel value={tab} index={5} loading={pageLoading}>
          <CostByPersonTab
            loadingEmployees={loadingEmployees}
            employeesError={employeesError}
            employees={employees}
            positionMap={positionMap}
            unitMap={unitMap}
            standardHours={standardHours}
            markupTotal={markupTotal}
            search={search}
            setSearch={setSearch}
          />
        </TabPanel>

        {/* 6: Markup */}
        <TabPanel value={tab} index={6} loading={pageLoading || loadingMarkup}>
          <MarkupTab
            standardHours={standardHours}
            setStandardHours={setStandardHours}
            overheadPercent={overheadPercent}
            setOverheadPercent={setOverheadPercent}
            profitPercent={profitPercent}
            setProfitPercent={setProfitPercent}
            markupTotal={markupTotal}
            loadingMarkup={loadingMarkup}
            saveMarkupSettings={saveMarkupSettings}
            aggregatedPositionStats={aggregatedPositionStats}
            notify={notify}
          />
        </TabPanel>

        {/* กันค้าง tab ที่ซ่อน */}
        {!showRestrictedTabs && !loadingRestricted && (tab === 4 || tab === 5 || tab === 6) ? (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">restricted</Typography>
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
}
