import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
// removed unused list/switch imports
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import { supabase } from '../../../lib/supabaseClient';
import colors from '../../../theme/colors';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function SystemSettings() {
  const [tab, setTab] = React.useState(0);
  const [employees, setEmployees] = React.useState([]);
  const [unitMap, setUnitMap] = React.useState({});
  const [positionMap, setPositionMap] = React.useState({});
  // roles and per-row access map
  const [rolesList, setRolesList] = React.useState([]);
  const [rolesById, setRolesById] = React.useState({});
  const [showRestrictedTabs, setShowRestrictedTabs] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [accessMap, setAccessMap] = React.useState({});
  const [updatingMap, setUpdatingMap] = React.useState({});
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);
  const [employeesError, setEmployeesError] = React.useState('');
  // simple initial-loading coordination: wait for employees, units/positions, and roles
  const [pendingInitialFetches, setPendingInitialFetches] = React.useState(3);
  const initialLoading = pendingInitialFetches > 0;
  // Markup settings (global, in-UI for now)
  const [standardHours, setStandardHours] = React.useState(160);
  const [overheadPercent, setOverheadPercent] = React.useState(0);
  const [profitPercent, setProfitPercent] = React.useState(0);
  const markupTotal = Number(overheadPercent || 0) + Number(profitPercent || 0);
  const [billRateMethod, setBillRateMethod] = React.useState('by_position');

  // optional: profiles by contract/customer/project
  const [markupProfiles, setMarkupProfiles] = React.useState([]);
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const defaultProfile = { id: null, contractType: '', customerGroup: '', projectType: '', markupPercent: 0, note: '', active: true };
  const [editingProfile, setEditingProfile] = React.useState({ ...defaultProfile });
  const [markupSettingsId, setMarkupSettingsId] = React.useState(null);
  const [loadingMarkup, setLoadingMarkup] = React.useState(false);
  // Feature-flag: keep markup profiles code in place but hide the UI
  const HIDE_MARKUP_PROFILES = true;

  // preview
  const [previewPosition, setPreviewPosition] = React.useState('');

  // helper: get current user label (email or id)
  async function getCurrentUserLabel() {
    try {
      if (supabase.auth && supabase.auth.getUser) {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;
        return u?.email ?? u?.id ?? null;
      }
      if (supabase.auth && supabase.auth.user) {
        try { const u = supabase.auth.user(); return u?.email ?? u?.id ?? null; } catch { return null; }
      }
    } catch (e) { void e; }
    return null;
  }

  // load markup settings & profiles when Markup tab is opened
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (tab !== 4) return;
      setLoadingMarkup(true);
      try {
        const [{ data: sdata, error: sErr }, { data: pData, error: pErr }] = await Promise.all([
          supabase.from('tpr_markup_settings').select('*').limit(1).maybeSingle(),
          supabase.from('tpr_markup_profiles').select('*').order('created_at', { ascending: true }).limit(1000)
        ]);
        if (sErr) throw sErr;
        if (pErr) throw pErr;
        if (!mounted) return;
        if (sdata) {
          setMarkupSettingsId(sdata.id ?? null);
          setStandardHours(sdata.standard_hours ?? 160);
          setOverheadPercent(Number(sdata.overhead_percent ?? 0));
          setProfitPercent(Number(sdata.profit_percent ?? 0));
          setBillRateMethod(sdata.billrate_method ?? 'by_position');
        }
        setMarkupProfiles(pData || []);
      } catch (e) {
        console.error('Failed to load markup settings/profiles', e);
        setSnackbar({ open: true, message: e?.message || 'ไม่สามารถโหลดการตั้งค่า Markup ได้', severity: 'error' });
      } finally {
        if (mounted) setLoadingMarkup(false);
      }
    })();
    return () => { mounted = false; };
  }, [tab]);

  // Load standard_hours from DB (tpr_markup_settings) so cost/hour uses the DB value instead of hardcoded 160
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tpr_markup_settings')
          .select('id, standard_hours, overhead_percent, profit_percent')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) {
          // not fatal: keep defaults
          void error;
          return;
        }
        if (!mounted) return;
        if (data && data.length > 0) {
          const row = data[0];
          const sh = row?.standard_hours;
          if (typeof sh === 'number' && !Number.isNaN(sh) && sh > 0) {
            setStandardHours(sh);
          }
          if (row?.overhead_percent !== undefined && row?.overhead_percent !== null) {
            setOverheadPercent(Number(row.overhead_percent || 0));
          }
          if (row?.profit_percent !== undefined && row?.profit_percent !== null) {
            setProfitPercent(Number(row.profit_percent || 0));
          }
          if (row?.id) setMarkupSettingsId(row.id);
        }
      } catch (e) { void e; }
    })();
    return () => { mounted = false; };
  }, []);

  // save global settings to DB
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
      if (saved && saved.id) setMarkupSettingsId(saved.id);
      setSnackbar({ open: true, message: 'บันทึกการตั้งค่ามาตรฐานเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('Failed to save markup settings', e);
      setSnackbar({ open: true, message: e?.message || 'ไม่สามารถบันทึกการตั้งค่าได้', severity: 'error' });
    } finally {
      setLoadingMarkup(false);
    }
  }

  // save a profile (insert or update)
  async function saveProfileToDb(profile) {
    try {
      const userLabel = await getCurrentUserLabel();
      const payload = {
        contract_type: profile.contractType || null,
        customer_group: profile.customerGroup || null,
        project_type: profile.projectType || null,
        markup_percent: Number(profile.markupPercent || 0),
        note: profile.note || null,
        active: !!profile.active,
      };
      if (profile.id) {
        const { data, error } = await supabase.from('tpr_markup_profiles').update(payload).eq('id', profile.id).select();
        if (error) throw error;
        return data && data[0] ? data[0] : null;
      }
      if (userLabel) payload.created_by = userLabel;
      const { data, error } = await supabase.from('tpr_markup_profiles').insert([payload]).select();
      if (error) throw error;
      return data && data[0] ? data[0] : null;
    } catch (e) {
      console.error('Failed to save profile', e);
      setSnackbar({ open: true, message: e?.message || 'ไม่สามารถบันทึกโปรไฟล์ได้', severity: 'error' });
      return null;
    }
  }

  async function deleteProfileFromDb(profileId) {
    try {
      const { error } = await supabase.from('tpr_markup_profiles').delete().eq('id', profileId);
      if (error) throw error;
      setMarkupProfiles(prev => (prev || []).filter(p => p.id !== profileId));
      setSnackbar({ open: true, message: 'ลบโปรไฟล์เรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('Failed to delete profile', e);
      setSnackbar({ open: true, message: e?.message || 'ไม่สามารถลบโปรไฟล์ได้', severity: 'error' });
    }
  }
  // customers state for Tab 1 (local UI storage)
  const [customers, setCustomers] = React.useState([]);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
  const defaultCustomerForm = {
    customerId: '', nameTh: '', nameEn: '', type: '', sector: '', size: '', status: 'Active',
    address: '', website: '', phone: '', email: '',
    contactName: '', contactTitle: '', contactPhone: '', contactEmail: '',
    relationshipStatus: 'New', leadSource: 'Other', lifetimeValue: 0,
    creditTermDays: 0, taxId: '', billingName: '', billingEmail: '', billingAddress: '', retentionPercent: 0,
    pastProjectCount: 0, totalProjectValue: 0, paymentBehavior: ''
  };
  const [customerForm, setCustomerForm] = React.useState({ ...defaultCustomerForm });
  const [customerSaving, setCustomerSaving] = React.useState(false);
  const [editingCustomerId, setEditingCustomerId] = React.useState(null);
  const [customerDeletingMap, setCustomerDeletingMap] = React.useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const openCustomerDialog = (existing = null) => {
    if (existing) {
      // map DB or local shape into the form
      const mapped = {
        customerId: existing.customerId ?? existing.customer_id ?? '',
        nameTh: existing.nameTh ?? existing.name_th ?? '',
        nameEn: existing.nameEn ?? existing.name_en ?? '',
        type: existing.type ?? existing.type ?? '',
        sector: existing.sector ?? existing.sector ?? '',
        size: existing.size ?? existing.size ?? '',
        status: existing.status ?? existing.status ?? 'Active',
        address: existing.address ?? existing.address ?? '',
        website: existing.website ?? existing.website ?? '',
        phone: existing.phone ?? existing.phone ?? '',
        email: existing.email ?? existing.email ?? '',
        contactName: existing.contactName ?? existing.contact_name ?? '',
        contactTitle: existing.contactTitle ?? existing.contact_title ?? '',
        contactPhone: existing.contactPhone ?? existing.contact_phone ?? '',
        contactEmail: existing.contactEmail ?? existing.contact_email ?? '',
        relationshipStatus: existing.relationshipStatus ?? existing.relationship_status ?? 'New',
        leadSource: existing.leadSource ?? existing.lead_source ?? 'Other',
        lifetimeValue: existing.lifetimeValue ?? existing.lifetime_value ?? 0,
        creditTermDays: existing.creditTermDays ?? existing.credit_term_days ?? 0,
        taxId: existing.taxId ?? existing.tax_id ?? '',
        billingName: existing.billingName ?? existing.billing_name ?? '',
        billingEmail: existing.billingEmail ?? existing.billing_email ?? '',
        billingAddress: existing.billingAddress ?? existing.billing_address ?? '',
        retentionPercent: existing.retentionPercent ?? existing.retention_percent ?? 0,
        pastProjectCount: existing.pastProjectCount ?? existing.past_project_count ?? 0,
        totalProjectValue: existing.totalProjectValue ?? existing.total_project_value ?? 0,
        paymentBehavior: existing.paymentBehavior ?? existing.payment_behavior ?? '',
      };
      setCustomerForm(mapped);
      setEditingCustomerId(existing.customerId ?? existing.customer_id ?? null);
      setCustomerDialogOpen(true);
    } else {
      setCustomerForm({ ...defaultCustomerForm });
      setEditingCustomerId(null);
      setCustomerDialogOpen(true);
    }
  };
  const closeCustomerDialog = () => { setCustomerDialogOpen(false); };

  function handleCustomerFormChange(field, value) {
    setCustomerForm(prev => ({ ...prev, [field]: value }));
  }

  async function saveCustomerLocal() {
    // basic validation
    if (!customerForm.customerId || !customerForm.nameTh) {
      setSnackbar({ open: true, message: 'กรุณากรอก รหัสลูกค้า และ ชื่อลูกค้า (ภาษาไทย)', severity: 'error' });
      return;
    }

    // check local duplicates first (only for new creates or when changing id)
    const newId = String(customerForm.customerId || '').toLowerCase();
    const existsLocal = customers.some(c => {
      const cid = String(c.customerId ?? c.customer_id ?? '').toLowerCase();
      if (!cid) return false;
      if (editingCustomerId) {
        const editingId = String(editingCustomerId || '').toLowerCase();
        if (cid === editingId) return false; // same record
      }
      return cid === newId;
    });
    if (existsLocal) {
      setSnackbar({ open: true, message: 'รหัสลูกค้าซ้ำ โปรดใช้รหัสที่ไม่ซ้ำ', severity: 'error' });
      return;
    }

    const payload = {
      customer_id: customerForm.customerId,
      name_th: customerForm.nameTh,
      name_en: customerForm.nameEn || null,
      type: customerForm.type || null,
      sector: customerForm.sector || null,
      size: customerForm.size || null,
      status: customerForm.status || null,
      address: customerForm.address || null,
      website: customerForm.website || null,
      phone: customerForm.phone || null,
      email: customerForm.email || null,
      contact_name: customerForm.contactName || null,
      contact_title: customerForm.contactTitle || null,
      contact_phone: customerForm.contactPhone || null,
      contact_email: customerForm.contactEmail || null,
      relationship_status: customerForm.relationshipStatus || null,
      lead_source: customerForm.leadSource || null,
      lifetime_value: Number(customerForm.lifetimeValue || 0),
      credit_term_days: Number(customerForm.creditTermDays || 0),
      tax_id: customerForm.taxId || null,
      billing_name: customerForm.billingName || null,
      billing_email: customerForm.billingEmail || null,
      billing_address: customerForm.billingAddress || null,
      retention_percent: Number(customerForm.retentionPercent || 0),
      past_project_count: Number(customerForm.pastProjectCount || 0),
      total_project_value: Number(customerForm.totalProjectValue || 0),
      payment_behavior: customerForm.paymentBehavior || null,
    };

    setCustomerSaving(true);
    // get current logged-in user (best-effort) to attach audit info
    let currentUser = null;
    if (supabase.auth && supabase.auth.getUser) {
      try {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user ?? null;
      } catch {
        currentUser = null;
      }
    } else if (supabase.auth && supabase.auth.user) {
      try {
        currentUser = supabase.auth.user ? supabase.auth.user() : null;
      } catch {
        currentUser = null;
      }
    }

    try {
      // upsert by customer_id to avoid duplicates; request returned representation
      // attach audit fields to payload when possible
      const userLabel = currentUser?.email ?? currentUser?.id ?? null;
      const payloadWithAudit = { ...payload };
      if (userLabel) {
        // for new records, created_by; for edits, updated_by
        if (editingCustomerId) payloadWithAudit.updated_by = userLabel;
        else payloadWithAudit.created_by = userLabel;
        // always set updated_by
        payloadWithAudit.updated_by = userLabel;
      }

      let data, error;
      const res = await supabase.from('tpr_customers').upsert([payloadWithAudit], { onConflict: 'customer_id' }).select();
      data = res.data; error = res.error;
      // If the DB returned an error (possible missing audit columns), try again without audit fields
      if (error) {
        const errMsg = String(error?.message || error || '').toLowerCase();
        if (errMsg.includes('column') || errMsg.includes('unknown') || errMsg.includes('does not exist')) {
          const res2 = await supabase.from('tpr_customers').upsert([payload], { onConflict: 'customer_id' }).select();
          data = res2.data; error = res2.error;
        }
      }

      if (error) throw error;

      const saved = (data && data[0]) ? data[0] : null;

      // add or replace in local UI list using saved DB row when available
      setCustomers(prev => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idKey = saved ? (saved.customer_id ?? saved.customerId) : customerForm.customerId;
        const idx = next.findIndex(x => (String(((x.customerId ?? x.customer_id) || '')) === String(idKey || '')));
        if (idx >= 0) {
          // replace
          next[idx] = saved ? saved : { ...customerForm, updated_by: userLabel };
        } else {
          next.push(saved ? saved : { ...customerForm, created_by: userLabel, updated_by: userLabel });
        }
        return next;
      });
      // clear editing flag after save
      setEditingCustomerId(null);
      setSnackbar({ open: true, message: 'บันทึกลูกค้าเรียบร้อย', severity: 'success' });
      setCustomerDialogOpen(false);
    } catch (err) {
      console.error('Failed to save tpr_customers', err);
      const message = err?.message || JSON.stringify(err) || 'ไม่สามารถบันทึกลูกค้าได้';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setCustomerSaving(false);
    }
  }

  // open a confirmation dialog for deletion
  function handleDeleteCustomer(cust) {
    const cid = cust.customerId ?? cust.customer_id;
    if (!cid) return;
    setDeleteTarget(cust);
    setDeleteDialogOpen(true);
  }

  // perform deletion after user confirms in dialog
  async function confirmDeleteCustomer() {
    const cust = deleteTarget;
    const cid = cust?.customerId ?? cust?.customer_id;
    if (!cid) {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      return;
    }
    setCustomerDeletingMap(prev => ({ ...prev, [cid]: true }));
    try {
      const { error } = await supabase.from('tpr_customers').delete().eq('customer_id', cid);
      if (error) throw error;
      setCustomers(prev => (prev || []).filter(x => String(((x.customerId ?? x.customer_id) || '')) !== String(cid)));
      setSnackbar({ open: true, message: 'ลบลูกค้าเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('Failed to delete customer', e);
      setSnackbar({ open: true, message: e?.message || 'ไม่สามารถลบลูกค้าได้', severity: 'error' });
    } finally {
      setCustomerDeletingMap(prev => {
        const next = { ...prev };
        delete next[cid];
        return next;
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  // load employees when the component mounts
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingEmployees(true);
      try {
        const { data, error } = await supabase
          .from('employees')
          // fetch all columns so we can show salary when available; keep order by code
          .select('*')
          .order('employee_code', { ascending: true })
          .limit(1000);
        if (error) throw error;
        if (!ignore) {
          setEmployees(data || []);
          setEmployeesError('');
        }
      } catch (err) {
        if (!ignore) setEmployeesError(err?.message || 'ไม่สามารถโหลดพนักงานได้');
      } finally {
        if (!ignore) {
          setLoadingEmployees(false);
          setPendingInitialFetches(prev => Math.max(0, prev - 1));
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // determine whether the currently authenticated user should see the restricted tabs
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let userEmail = '';
        if (supabase.auth && supabase.auth.getUser) {
          try {
            const { data } = await supabase.auth.getUser();
            userEmail = data?.user?.email ?? '';
          } catch {
            userEmail = '';
          }
        } else if (supabase.auth && supabase.auth.user) {
          try {
            const u = supabase.auth.user ? supabase.auth.user() : null;
            userEmail = u?.email ?? '';
          } catch {
            userEmail = '';
          }
        }

        userEmail = (userEmail || '').toString().trim().toLowerCase();
        if (!userEmail) {
          if (mounted) setShowRestrictedTabs(false);
          return;
        }

        const { data, error } = await supabase.from('v_employee_users_with_roles').select('role_label, role_name_th, role_name_en').eq('email', userEmail).maybeSingle();
        if (error) throw error;
        const roleLabel = (data?.role_label || data?.role_name_th || data?.role_name_en || '').toString().trim();
        const allowed = new Set(['ประธานเจ้าหน้าที่บริหาร', 'ฝ่ายทรัพยากรบุคคล', 'ผู้ดูแลระบบ']);
        const ok = allowed.has(roleLabel);
        if (mounted) setShowRestrictedTabs(!!ok);
      } catch (e) {
        console.error('Failed to load current user role', e);
        if (mounted) setShowRestrictedTabs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // if user loses permission, reset to the customers tab (index 1) to avoid showing hidden content
  React.useEffect(() => {
    if (!showRestrictedTabs && (tab === 0 || tab === 2 || tab === 3)) {
      setTab(1);
    }
  }, [showRestrictedTabs, tab]);

  // load departments and positions used to resolve ids to names
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [unitsRes, posRes] = await Promise.all([
          supabase.from('v_department_form').select('id,dept_id,dept_name').limit(2000),
          supabase.from('positions').select('id,position_code,position_name,position_name_eng').limit(2000),
        ]);

        if (!ignore) {
          // unitsRes may be { data, error }
          const udata = unitsRes.data || [];
          const pdata = posRes.data || [];

          const uMap = {};
          udata.forEach((u) => { uMap[String(u.id)] = u.dept_name || u.dept_id || ''; });
          setUnitMap(uMap);

          const pMap = {};
          pdata.forEach((p) => { pMap[String(p.id)] = p.position_name || p.position_name_eng || p.position_code || ''; });
          setPositionMap(pMap);
          setPendingInitialFetches(prev => Math.max(0, prev - 1));
        }
      } catch {
        // silently ignore department/position lookup failures for now
        setPendingInitialFetches(prev => Math.max(0, prev - 1));
      }
    })();

    return () => { ignore = true; };
  }, []);

  // load roles from tpr_roles (name_th / name_en) for the dropdown
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: rdata, error } = await supabase.from('tpr_roles').select('id, name_th, name_en');
        if (error) throw error;
        if (!mounted) return;
        // keep raw name_th/name_en so we can filter by role display names
        const list = (rdata || []).map(r => ({ id: r.id, label: (r.name_th || r.name_en || String(r.id)), name_th: r.name_th, name_en: r.name_en }));
        const byId = {};
        list.forEach(x => { byId[x.id] = x; });
        setRolesList(list);
        setRolesById(byId);
        setPendingInitialFetches(prev => Math.max(0, prev - 1));
      } catch (e) { void e; }
    })();
    return () => { mounted = false; };
  }, []);

  // rolesList is loaded from `tpr_roles` table and used directly in the dropdown

  // when employees load, fetch existing bindings from tpr_user_role_bindings by email
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const emails = (employees || [])
          .map(e => (e.current_address_email_1 || e.email || '').toString().trim().toLowerCase())
          .filter(Boolean);
        if (!emails.length) {
          // still initialize accessMap entries per-employee (fallback to id-key) so UI is consistent
          const nextEmpty = {};
          (employees || []).forEach(e => { nextEmpty[`__id_${e.id}`] = ''; });
          setAccessMap(nextEmpty);
          return;
        }

        const { data: bindData, error: bindErr } = await supabase.from('tpr_user_role_bindings').select('email, role_id').in('email', emails);
        if (bindErr) throw bindErr;
        if (!mounted) return;
        const next = {};
        // map returned bindings by lowercase email
        (bindData || []).forEach(b => {
          if (b && b.email) next[String(b.email).toLowerCase()] = b.role_id ?? '';
        });
        // ensure every employee has a map entry (use email or fallback id-key)
        (employees || []).forEach(e => {
          const em = (e.current_address_email_1 || e.email || '').toString().trim().toLowerCase();
          const key = em || `__id_${e.id}`;
          if (next[key] === undefined) next[key] = '';
        });
        setAccessMap(next);
      } catch (err) { console.error('Failed to load tpr_user_role_bindings', err); }
    })();
    return () => { mounted = false; };
  }, [employees]);

  // load customers from tpr_customers when the Customers tab is opened (or on mount)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // only fetch when this tab is active to avoid extra requests
        if (tab !== 1) return;
        const { data, error } = await supabase.from('tpr_customers').select('*').order('created_at', { ascending: false }).limit(1000);
        if (error) throw error;
        if (!mounted) return;
        setCustomers(data || []);
      } catch (e) {
        console.error('Failed to load tpr_customers', e);
        setSnackbar(prev => ({ ...prev, open: true, message: e?.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้', severity: 'error' }));
      }
    })();
    return () => { mounted = false; };
  }, [tab]);

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
  // format a numeric value with two decimals and thousand separators, without currency symbol
  function formatCurrencyNumber(n) {
    if (n === null || n === undefined) return '-';
    const num = Number(n);
    if (Number.isNaN(num)) return '-';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // return numeric salary_rate (number) or 0 when missing
  function getSalaryNumber(emp) {
    if (!emp) return 0;
    const v = emp.salary_rate;
    if (v === null || v === undefined || v === '') return 0;
    const parsed = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // aggregated view grouped by position (used in Tab 2)
  const aggregatedByPosition = React.useMemo(() => {
    const map = {};
    (filteredEmployees || []).forEach((emp) => {
      const posLabel = emp.position || (emp.position_id ? positionMap[String(emp.position_id)] : '') || 'ไม่ระบุ';
      const deptLabel = emp.department_name || (emp.department_id ? unitMap[String(emp.department_id)] : '') || emp.unit || '-';
      // parse salary_rate as number; fall back to 0
      let s = 0;
      if (emp && (emp.salary_rate !== undefined && emp.salary_rate !== null && emp.salary_rate !== '')) {
        const parsed = Number(String(emp.salary_rate).replace(/,/g, ''));
        s = Number.isFinite(parsed) ? parsed : 0;
      }

      if (!map[posLabel]) map[posLabel] = { position: posLabel, departments: new Set(), total: 0 };
      if (deptLabel) map[posLabel].departments.add(deptLabel);
      map[posLabel].total += s;
    });

    return Object.values(map).map((it) => ({
      position: it.position,
      department: Array.from(it.departments).join(', '),
      total: it.total,
    })).sort((a, b) => a.position.localeCompare(b.position, 'th'));
  }, [filteredEmployees, positionMap, unitMap]);

  // aggregated stats including count and average cost/hour for preview
  const aggregatedPositionStats = React.useMemo(() => {
    const m = {};
    (filteredEmployees || []).forEach((emp) => {
      const posLabel = emp.position || (emp.position_id ? positionMap[String(emp.position_id)] : '') || 'ไม่ระบุ';
      let s = 0;
      if (emp && (emp.salary_rate !== undefined && emp.salary_rate !== null && emp.salary_rate !== '')) {
        const parsed = Number(String(emp.salary_rate).replace(/,/g, ''));
        s = Number.isFinite(parsed) ? parsed : 0;
      }
      if (!m[posLabel]) m[posLabel] = { position: posLabel, total: 0, count: 0 };
      m[posLabel].total += s;
      m[posLabel].count += 1;
    });
    return Object.values(m).map(it => ({
      position: it.position,
      total: it.total,
      count: it.count,
      // cost per hour is based on the total salary for the position group
      // divided by the standard hours (do NOT divide by headcount again)
      avgCostPerHour: it.count > 0 ? (it.total / (standardHours || 160)) : 0,
    })).sort((a, b) => a.position.localeCompare(b.position, 'th'));
  }, [filteredEmployees, positionMap, standardHours]);

  const handleAccessChange = React.useCallback(async (employeeId, newRoleId) => {
    // Use email as the persistent key; if missing, use a fallback per-employee key
    const emp = (employees || []).find(e => e.id === employeeId);
    const emailRaw = emp?.current_address_email_1 ?? emp?.email ?? '';
    const email = String(emailRaw || '').trim().toLowerCase();
    const mapKey = email || `__id_${employeeId}`;
    const previous = accessMap[mapKey] ?? '';

    // optimistic update
    setAccessMap(prev => ({ ...prev, [mapKey]: newRoleId || '' }));
    setUpdatingMap(prev => ({ ...prev, [employeeId]: true }));
    try {
      const role_id = newRoleId ?? null;

      if (!email) {
        // cannot persist without email — keep local UI change and inform the user
        setSnackbar({ open: true, message: 'พนักงานยังไม่มีอีเมล ระบบจะไม่บันทึกการผูกสิทธิ์ลงฐานข้อมูล', severity: 'warning' });
        return;
      }

      // Remove any existing bindings for this email
      const { error: delErr } = await supabase.from('tpr_user_role_bindings').delete().eq('email', email);
      if (delErr) throw delErr;

      // Insert new binding when role selected (skip if unassigned)
      let insData = null;
      if (role_id) {
        const insertPayload = { email, role_id };
        const { data: _insData, error: insErr } = await supabase.from('tpr_user_role_bindings').insert([insertPayload]);
        if (insErr) throw insErr;
        insData = _insData;
      }

      // verify persisted
      const { data: verify, error: verifyErr } = await supabase.from('tpr_user_role_bindings').select('role_id').eq('email', email).maybeSingle();
      if (verifyErr) throw verifyErr;
      const persistedRoleId = verify?.role_id ?? '';
      setAccessMap(prev => ({ ...prev, [mapKey]: persistedRoleId || '' }));
      setSnackbar({ open: true, message: 'บันทึกการผูกสิทธิ์เรียบร้อย', severity: 'success' });
      
    } catch (err) {
      setAccessMap(prev => ({ ...prev, [mapKey]: previous }));
      console.error('Failed to save binding to tpr_user_role_bindings', err);
      const message = err?.message || JSON.stringify(err) || 'ไม่สามารถบันทึกการผูกสิทธิ์ได้';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setUpdatingMap(prev => ({ ...prev, [employeeId]: false }));
    }
  }, [accessMap, employees]);

  // remove default focus outline on tabs (keeps accessibility but hides the browser focus ring visually)
  const tabSx = {
    '&.Mui-focusVisible': { outline: 'none' },
    '&:focus': { outline: 'none' },
    '&.Mui-selected': { color: '#d32f2f', fontWeight: 600 },
  };

  /**
   * Team type used in this component
   * @typedef {Object} Team
   * @property {string|null} id
   * @property {string} team_code
   * @property {string} team_name
    * @property {Array<string>} positions
   * @property {string|null} team_lead_id
   * @property {string|null} description
   * @property {boolean} is_active
   */

  function TeamsSettingsPanel() {
    const [teams, setTeams] = React.useState([]);
    const [loadingTeams, setLoadingTeams] = React.useState(false);
    const [teamsError, setTeamsError] = React.useState('');
    const [teamSearch, setTeamSearch] = React.useState('');

    const defaultTeam = { id: null, team_code: '', team_name: '', positions: [], team_lead_id: null, description: '', is_active: true };
    const [editingTeam, setEditingTeam] = React.useState({ ...defaultTeam });
    const [teamDialogOpen, setTeamDialogOpen] = React.useState(false);
    const [savingTeam, setSavingTeam] = React.useState(false);
    const [deletingMap, setDeletingMap] = React.useState({});
    const [teamDeleteDialogOpen, setTeamDeleteDialogOpen] = React.useState(false);
    const [teamDeleteTarget, setTeamDeleteTarget] = React.useState(null);
    const [posDialogOpen, setPosDialogOpen] = React.useState(false);
    const [tempPositions, setTempPositions] = React.useState([]);

    const positionsList = Object.keys(positionMap || {}).map(k => ({ id: k, name: positionMap[k] }));

    async function loadTeams() {
      setLoadingTeams(true);
      setTeamsError('');
      try {
        const { data, error } = await supabase.from('tpr_project_teams').select('*, tpr_project_team_positions(position_id)').order('team_code', { ascending: true }).limit(2000);
        if (error) throw error;
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load teams', err);
        setTeamsError(err?.message || 'ไม่สามารถโหลดรายการทีมได้');
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    }

    React.useEffect(() => {
      let mounted = true;
      (async () => {
        if (!mounted) return;
        await loadTeams();
      })();
      return () => { mounted = false; };
    }, []);

    function openTeamDialog(existing = null) {
      if (existing) {
        // extract positions from joined relation if present
        const positions = (existing.tpr_project_team_positions || []).map(p => p.position_id).filter(Boolean);
        setEditingTeam({
          id: existing.id ?? null,
          team_code: existing.team_code ?? '',
          team_name: existing.team_name ?? '',
          positions: positions,
          team_lead_id: existing.team_lead_id ?? null,
          description: existing.description ?? '',
          is_active: existing.is_active === false ? false : true,
        });
      } else {
        setEditingTeam({ ...defaultTeam });
      }
      setTeamDialogOpen(true);
    }

    async function saveTeam() {
      // validation
      if (!String(editingTeam.team_code || '').trim()) { setSnackbar({ open: true, message: 'โปรดระบุรหัสทีม', severity: 'warning' }); return; }
      if (!String(editingTeam.team_name || '').trim()) { setSnackbar({ open: true, message: 'โปรดระบุชื่อทีม', severity: 'warning' }); return; }
      setSavingTeam(true);
      try {
        const payload = {
          team_code: String(editingTeam.team_code || '').trim(),
          team_name: String(editingTeam.team_name || '').trim(),
          team_lead_id: editingTeam.team_lead_id || null,
          description: editingTeam.description || null,
          is_active: editingTeam.is_active === false ? false : true,
        };

        const userLabel = await getCurrentUserLabel();
        let teamId = editingTeam.id;
        if (editingTeam.id) {
          // update
          const updatePayload = { ...payload, updated_by: userLabel ?? null };
          const { data, error } = await supabase.from('tpr_project_teams').update(updatePayload).eq('id', editingTeam.id).select().maybeSingle();
          if (error) throw error;
          setTeams(prev => prev.map(t => (t.id === data.id ? data : t)));
          teamId = data.id;
          setSnackbar({ open: true, message: 'บันทึกข้อมูลทีมเรียบร้อย', severity: 'success' });
        } else {
          // insert
          const insertPayload = { ...payload, created_by: userLabel ?? null };
          const { data, error } = await supabase.from('tpr_project_teams').insert([insertPayload]).select().maybeSingle();
          if (error) throw error;
          setTeams(prev => [data, ...prev]);
          teamId = data.id;
          setSnackbar({ open: true, message: 'เพิ่มทีมเรียบร้อย', severity: 'success' });
        }
        // persist positions in join table: delete existing -> insert new
        try {
          if (teamId) {
            const { error: delErr } = await supabase.from('tpr_project_team_positions').delete().eq('team_id', teamId);
            if (delErr) throw delErr;
            const positionsToInsert = (editingTeam.positions || []).filter(Boolean).map(pid => ({ team_id: teamId, position_id: pid }));
            if (positionsToInsert.length > 0) {
              const { error: insErr } = await supabase.from('tpr_project_team_positions').insert(positionsToInsert);
              if (insErr) throw insErr;
            }
            // reload teams to get joined relation for UI consistency
            await loadTeams();
          }
        } catch (posErr) {
          console.error('Failed to save team positions', posErr);
          setSnackbar({ open: true, message: posErr?.message || 'ไม่สามารถบันทึกตำแหน่งทีมได้', severity: 'warning' });
        }
        setTeamDialogOpen(false);
      } catch (err) {
        console.error('Failed to save team', err);
        setSnackbar({ open: true, message: err?.message || 'ไม่สามารถบันทึกทีมได้', severity: 'error' });
      } finally {
        setSavingTeam(false);
      }
    }

    function softDeleteTeam(t) {
      // open confirmation dialog instead of window.confirm
      // use next tick to avoid event ordering / focus issues that sometimes
      // require two clicks when opening a Dialog from a click handler
      setTeamDeleteTarget(t ?? null);
      setTimeout(() => setTeamDeleteDialogOpen(true), 0);
    }

    async function confirmDeleteTeam() {
      const t = teamDeleteTarget;
      const id = t?.id;
      if (!id) {
        setTeamDeleteDialogOpen(false);
        setTeamDeleteTarget(null);
        return;
      }
      setTeamDeleteDialogOpen(false);
      setDeletingMap(prev => ({ ...prev, [id]: true }));
      try {
        // remove join-table entries first
        const { error: delPosErr } = await supabase.from('tpr_project_team_positions').delete().eq('team_id', id);
        if (delPosErr) throw delPosErr;

        // then delete the team row
        const { error } = await supabase.from('tpr_project_teams').delete().eq('id', id).select().maybeSingle();
        if (error) throw error;

        // remove from local UI list
        setTeams(prev => (prev || []).filter(p => p.id !== id));
        setSnackbar({ open: true, message: 'ลบทีมเรียบร้อย', severity: 'success' });
      } catch (err) {
        console.error('Failed to delete team', err);
        setSnackbar({ open: true, message: err?.message || 'ไม่สามารถลบทีมได้', severity: 'error' });
      } finally {
        setDeletingMap(prev => ({ ...prev, [id]: false }));
        setTeamDeleteTarget(null);
      }
    }

    const filteredTeams = React.useMemo(() => {
      const q = (teamSearch || '').trim().toLowerCase();
      if (!q) return teams || [];
      return (teams || []).filter(t => (String(t.team_code || '').toLowerCase().includes(q) || String(t.team_name || '').toLowerCase().includes(q)));
    }, [teams, teamSearch]);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
          <TextField
            size="small"
            placeholder="ค้นหา รหัสทีม หรือ ชื่อทีม"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{ background: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
          />
          <IconButton
            color="primary"
            onClick={() => openTeamDialog(null)}
            sx={{ borderRadius: '50%', bgcolor: colors.primary, color: '#fff', '&:hover': { bgcolor: colors.primary } }}
            aria-label="เพิ่มทีมใหม่"
          >
            <AddIcon />
          </IconButton>
        </Box>

        {loadingTeams ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : teamsError ? (
          <Typography color="error">{teamsError}</Typography>
        ) : (
          <TableContainer sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสทีม</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อทีม</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>หัวหน้าทีม</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(filteredTeams || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">ไม่พบทีมงาน</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (filteredTeams || []).map((t) => {
                    const posNames = (t.positions || []).map(id => positionMap[id] || id).join(', ');
                    const lead = (employees || []).find(e => e.id === t.team_lead_id) || null;
                    const leadName = lead ? `${lead.title_th ? lead.title_th + ' ' : ''}${lead.first_name_th || ''}`.trim() + (lead.last_name_th ? ` ${lead.last_name_th}` : '') : '-';
                    const status = t.is_active === false ? 'ไม่ใช้งาน' : 'ใช้งาน';
                    return (
                      <TableRow key={t.id || Math.random()}>
                        <TableCell>{t.team_code}</TableCell>
                        <TableCell>{t.team_name}</TableCell>
                        <TableCell>{posNames}</TableCell>
                        <TableCell>{leadName}</TableCell>
                        <TableCell>{status}</TableCell>
                        <TableCell sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" onClick={() => openTeamDialog(t)} aria-label="แก้ไขทีม"><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => softDeleteTeam(t)} aria-label="ลบทีม" disabled={!!deletingMap[String(t.id)]}>
                              {deletingMap[String(t.id)] ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>{editingTeam.id ? 'แก้ไขทีม' : 'เพิ่มทีม'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
              <TextField label="รหัสทีม" fullWidth size="small" value={editingTeam.team_code} onChange={(e) => setEditingTeam(prev => ({ ...prev, team_code: e.target.value }))} />
              <TextField label="ชื่อทีม" fullWidth size="small" value={editingTeam.team_name} onChange={(e) => setEditingTeam(prev => ({ ...prev, team_name: e.target.value }))} />

              {positionsList.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="ตำแหน่ง"
                    fullWidth
                    size="small"
                    value={(editingTeam.positions || []).map(id => positionMap[id] || id).join(', ')}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => { setTempPositions(Array.isArray(editingTeam.positions) ? [...editingTeam.positions] : []); setPosDialogOpen(true); }} aria-label="เลือกตำแหน่ง">
                            <MoreHorizIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Dialog open={posDialogOpen} onClose={() => setPosDialogOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle>เลือกตำแหน่ง</DialogTitle>
                    <DialogContent dividers>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 320 }}>
                        {(positionsList || []).map(p => (
                          <FormControlLabel
                            key={p.id}
                            control={(
                              <Checkbox
                                size="small"
                                color="error"
                                checked={(tempPositions || []).includes(p.id)}
                                onChange={() => {
                                  setTempPositions(prev => {
                                    const cur = Array.isArray(prev) ? [...prev] : [];
                                    const idx = cur.indexOf(p.id);
                                    if (idx === -1) cur.push(p.id); else cur.splice(idx, 1);
                                    return cur;
                                  });
                                }}
                              />
                            )}
                            label={p.name}
                          />
                        ))}
                      </Box>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setPosDialogOpen(false)} sx={{ color: 'common.black' }}>ยกเลิก</Button>
                      <Button variant="contained" onClick={() => { setEditingTeam(prev => ({ ...prev, positions: Array.isArray(tempPositions) ? [...tempPositions] : [] })); setPosDialogOpen(false); }} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}>ตกลง</Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              ) : (
                <TextField label="ตำแหน่ง (ไม่ได้เชื่อมฐานข้อมูล)" fullWidth size="small" value={(editingTeam.positions || []).join(', ')} InputProps={{ readOnly: true }} />
              )}

              <TextField select label="หัวหน้าทีม" fullWidth size="small" value={editingTeam.team_lead_id ?? ''} onChange={(e) => setEditingTeam(prev => ({ ...prev, team_lead_id: e.target.value || null }))}>
                <MenuItem value="">-- ไม่ระบุ --</MenuItem>
                {(employees || []).map(emp => {
                  const name = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''}`.trim() + (emp.last_name_th ? ` ${emp.last_name_th}` : '');
                  return <MenuItem key={emp.id} value={emp.id}>{name || emp.email || emp.id}</MenuItem>;
                })}
              </TextField>

              <TextField label="รายละเอียดทีม" fullWidth size="small" multiline rows={3} value={editingTeam.description} onChange={(e) => setEditingTeam(prev => ({ ...prev, description: e.target.value }))} />

              <TextField select label="สถานะ" fullWidth size="small" value={editingTeam.is_active ? 'active' : 'inactive'} onChange={(e) => setEditingTeam(prev => ({ ...prev, is_active: e.target.value === 'active' }))}>
                <MenuItem value="active">ใช้งาน</MenuItem>
                <MenuItem value="inactive">ไม่ใช้งาน</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTeamDialogOpen(false)} sx={{ color: 'common.black' }} disabled={savingTeam}>ยกเลิก</Button>
            <Button variant="contained" onClick={saveTeam} disabled={savingTeam} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}>
              {savingTeam ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              บันทึก
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={teamDeleteDialogOpen} onClose={() => { setTeamDeleteDialogOpen(false); setTeamDeleteTarget(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              ยืนยันการลบทีม "{teamDeleteTarget?.team_name ?? teamDeleteTarget?.team_code ?? ''}" หรือไม่? การลบจะนำข้อมูลทีมและความเชื่อมโยงตำแหน่งออกจากระบบ
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setTeamDeleteDialogOpen(false); setTeamDeleteTarget(null); }} sx={{ color: 'common.black' }}>ยกเลิก</Button>
            <Button
              variant="contained"
              color="error"
              onClick={confirmDeleteTeam}
              disabled={!!deletingMap[String(teamDeleteTarget?.id ?? '')]}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
            >
              {deletingMap[String(teamDeleteTarget?.id ?? '')] ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              ลบ
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#ffffff' }}>
        <CircularProgress sx={{ color: '#d32f2f' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 0,
        bgcolor: colors.gray100 || '#f5f5f5',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        // remove separators between rows (preserve header visuals)
        '& .MuiTableCell-root:not(.MuiTableCell-head)': { borderBottom: 'none' },
        // default outline color for outlined inputs/selects: slightly darker for better visibility
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd', transition: 'border-color 120ms ease' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd' },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
        // focused label color for outlined inputs/selects
        '& .MuiInputLabel-root.Mui-focused': { color: 'common.black' },
        // ensure selects using OutlinedInput follow the same focus styling
        '& .MuiSelect-root .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd' },
        '& .MuiSelect-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
        // ensure Dialog inputs/selects follow the same focus styling (Dialog can scope classes differently)
        '& .MuiDialog-root .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd' },
        '& .MuiDialog-root .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd' },
        '& .MuiDialog-root .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
        '& .MuiDialog-root .MuiSelect-root .MuiOutlinedInput-notchedOutline': { borderColor: '#bdbdbd' },
        '& .MuiDialog-root .MuiSelect-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
      }}
    >

      <Paper
        sx={{ p: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 320, boxShadow: 'none' }}
        elevation={0}
      >
        <Tabs
          value={tab}
          onChange={handleChange}
          aria-label="แท็บการตั้งค่าระบบ"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            // hide the active indicator underline
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }} label="🔐 กำหนดสิทธิ์ผู้ใช้งานระบบ" {...a11yProps(0)} />
          <Tab sx={tabSx} label="🧾 กำหนดข้อมูลลูกค้า" {...a11yProps(1)} />
          <Tab sx={{ ...tabSx }} label="👥 กำหนดทีมงานโครงการ" {...a11yProps(2)} />
          <Tab sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }} label="💼 อัตราต้นทุนต่อตำแหน่ง" {...a11yProps(3)} />
          <Tab sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }} label="👤 อัตราต้นทุนรายบุคคล" {...a11yProps(4)} />
          <Tab sx={{ ...tabSx, display: showRestrictedTabs ? 'inline-flex' : 'none' }} label="➕ อัตราบวกเพิ่มจากต้นทุน" {...a11yProps(5)} />
        </Tabs>

        <TabPanel value={tab} index={0}>

          {loadingEmployees ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : employeesError ? (
            <Typography color="error">{employeesError}</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="ค้นหา ชื่อ, รหัส, เลขบัตร, ตำแหน่ง, หน่วยงาน"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={{
                    background: 'white',
                    // default: subtle light-gray border; show black only on focus
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                  }}
                />
              </Box>
              <TableContainer
                sx={{
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 800,
                    borderCollapse: 'separate',
                    '& th, & td': { padding: '10px 12px', borderBottom: 'none' },
                  }}
                >
                  <TableHead sx={{ '& th': { position: 'sticky', top: 0, background: 'background.paper', zIndex: 2, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' } }}>
                    <TableRow>
                      <TableCell sx={{ width: 56, px: 1, fontWeight: 700, color: 'common.black', textAlign: 'center' }}>รูปภาพ</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'common.black' }}>รหัสพนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ชื่อพนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ตำแหน่ง</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>หน่วยงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>วันที่เริ่มงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>สิทธิ์ผู้ใช้งานระบบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary">ไม่พบพนักงาน</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const code = emp.employee_code ?? emp.id;
                        const nameTh = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''}`.trim() + (emp.last_name_th ? ` ${emp.last_name_th}` : '');
                        const nameEn = `${emp.first_name_en || ''}`.trim() + (emp.last_name_en ? ` ${emp.last_name_en}` : '');
                        const displayName = (nameTh.trim() || nameEn.trim()) || code || '';
                        const start = emp.start_date || null;
                        const startLabel = start ? dayjs(start).format('DD/MM/YYYY') : '-';
                        const position = emp.position || (emp.position_id ? (positionMap[String(emp.position_id)] || '') : '') || '-';
                        const department = emp.department_name || (emp.department_id ? (unitMap[String(emp.department_id)] || String(emp.department_id)) : '') || emp.unit || emp.dept_name || '-';

                        // compute avatar fallback: single first character of first_name_th (or first_name_en fallback)
                        const initials = (() => {
                          const fnTh = (emp.first_name_th || '').toString().trim();
                          if (fnTh) return fnTh.charAt(0).toUpperCase();
                          const fnEn = (emp.first_name_en || '').toString().trim();
                          if (fnEn) return fnEn.charAt(0).toUpperCase();
                          const fallback = String(emp.employee_code || emp.id || '').trim();
                          return fallback ? fallback.charAt(0).toUpperCase() : '';
                        })();


                        return (
                          <TableRow key={code}>
                            <TableCell sx={{ width: 56, px: 1 }}>
                              <Avatar src={emp.image_url || ''} alt={displayName} sx={{ width: 32, height: 32, fontSize: 14 }}>{!emp.image_url ? initials : null}</Avatar>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{code}</TableCell>
                            <TableCell>{displayName}</TableCell>
                            <TableCell>{position}</TableCell>
                            <TableCell>{department}</TableCell>
                            <TableCell>{startLabel}</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>
                            {rolesList.length === 0 ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <CircularProgress size={20} />
                              </Box>
                            ) : (
                              <FormControl
                                size="small"
                                fullWidth
                                variant="outlined"
                                sx={{
                                  // light-gray border for the dropdown by default; black on focus
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                                }}
                              >
                                {(() => {
                                  const emailKey = (emp.current_address_email_1 || emp.email || '').toString().trim().toLowerCase();
                                  const mapKey = emailKey || `__id_${emp.id}`;
                                  return (
                                    <Select
                                      variant="outlined"
                                      value={accessMap[mapKey] ?? ''}
                                      onChange={(e) => handleAccessChange(emp.id, e.target.value)}
                                      disabled={!!updatingMap[emp.id] || !emailKey}
                                      displayEmpty
                                      renderValue={(v) => {
                                        if (!v) return 'ยังไม่กำหนดสิทธิ์';
                                        const r = rolesById[String(v)];
                                        return r?.label || v || '-';
                                      }}
                                    >
                                      <MenuItem value="">ยังไม่กำหนดสิทธิ์</MenuItem>
                                      {(rolesList || []).map((r) => (
                                        <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
                                      ))}
                                    </Select>
                                  );
                                })()}
                              </FormControl>
                            )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <TextField
              size="small"
              placeholder="ค้นหา ลูกค้า (รหัส หรือ ชื่อ)"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              variant="outlined"
              fullWidth
              sx={{ background: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' } }}
            />
            <IconButton
              color="primary"
              onClick={openCustomerDialog}
              sx={{ borderRadius: '50%', bgcolor: colors.primary, color: '#fff', '&:hover': { bgcolor: colors.primary } }}
              aria-label="เพิ่มลูกค้าใหม่"
            >
              <AddIcon />
            </IconButton>
          </Box>

          {(customers || []).length > 0 ? (
            <TableContainer sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>รหัสลูกค้า</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ชื่อลูกค้า</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ประเภท</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>กลุ่มธุรกิจ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ความสัมพันธ์</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>เครดิตเทอม</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Retention</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>โครงการที่ผ่านมา</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(customers || []).filter(c => {
                    const q = (customerSearch || '').trim().toLowerCase();
                    if (!q) return true;
                    const cid = String(c.customerId ?? c.customer_id ?? '').toLowerCase();
                    const name = String(c.nameTh ?? c.name_th ?? '').toLowerCase();
                    return cid.includes(q) || name.includes(q);
                  }).map((c) => {
                    const cid = c.customerId ?? c.customer_id ?? '';
                    const name = c.nameTh ?? c.name_th ?? '';
                    const type = c.type ?? '';
                    const sector = c.sector ?? '';
                    const relation = c.relationshipStatus ?? c.relationship_status ?? '';
                    const credit = c.creditTermDays ?? c.credit_term_days ?? 0;
                    const retention = c.retentionPercent ?? c.retention_percent ?? 0;
                    const past = c.pastProjectCount ?? c.past_project_count ?? 0;
                    const status = c.status ?? '';
                    const deleting = !!customerDeletingMap[String(cid)];

                    const retentionDisplay = (retention === null || retention === undefined) ? '-' : Number(retention).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

                    return (
                      <TableRow key={cid || Math.random()}>
                        <TableCell>{cid}</TableCell>
                        <TableCell>{name}</TableCell>
                        <TableCell>{type}</TableCell>
                        <TableCell>{sector}</TableCell>
                        <TableCell>{relation}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{credit ?? '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{retentionDisplay}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{past ?? 0}</TableCell>
                        <TableCell>{status}</TableCell>
                        <TableCell sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" onClick={() => openCustomerDialog(c)} aria-label="แก้ไขลูกค้า">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteCustomer(c)} aria-label="ลบลูกค้า" disabled={deleting}>
                              {deleting ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ py: 2 }}>
              <Typography color="text.secondary">ยังไม่มีข้อมูลลูกค้า</Typography>
            </Box>
          )}

          <Dialog
            open={customerDialogOpen}
            onClose={closeCustomerDialog}
            fullWidth
            maxWidth="md"
            PaperProps={{
              sx: {
                // Ensure outlined inputs and selects inside the Dialog use black border on focus
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider', transition: 'border-color 120ms ease' },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                // focused label color inside dialog
                '& .MuiInputLabel-root.Mui-focused': { color: 'common.black' },
                '& .MuiSelect-root .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '& .MuiSelect-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
              }
            }}
          >
            <DialogTitle>{editingCustomerId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
                <TextField label="รหัสลูกค้า" fullWidth size="small" value={customerForm.customerId} onChange={(e) => handleCustomerFormChange('customerId', e.target.value)} />
                <TextField label="ชื่อ (ไทย)" fullWidth size="small" value={customerForm.nameTh} onChange={(e) => handleCustomerFormChange('nameTh', e.target.value)} />
                <TextField label="ชื่อ (อังกฤษ)" fullWidth size="small" value={customerForm.nameEn} onChange={(e) => handleCustomerFormChange('nameEn', e.target.value)} />

                <TextField select label="ประเภท" fullWidth size="small" value={customerForm.type} onChange={(e) => handleCustomerFormChange('type', e.target.value)}>
                  {['หน่วยงานราชการ', 'เอกชน', 'บุคคลธรรมดา', 'ผู้พัฒนา', 'ผู้รับเหมา'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
                <TextField label="กลุ่มธุรกิจ/อุตสาหกรรม" fullWidth size="small" value={customerForm.sector} onChange={(e) => handleCustomerFormChange('sector', e.target.value)} />
                <TextField select label="ขนาด" fullWidth size="small" value={customerForm.size} onChange={(e) => handleCustomerFormChange('size', e.target.value)}>
                  {['ขนาดเล็ก', 'ขนาดกลาง', 'ขนาดใหญ่'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>

                <TextField label="สถานะ" fullWidth size="small" value={customerForm.status} onChange={(e) => handleCustomerFormChange('status', e.target.value)} />
                <TextField label="ที่อยู่สำนักงานใหญ่" fullWidth size="small" value={customerForm.address} onChange={(e) => handleCustomerFormChange('address', e.target.value)} />

                <TextField label="เว็บไซต์" fullWidth size="small" value={customerForm.website} onChange={(e) => handleCustomerFormChange('website', e.target.value)} />
                <TextField label="โทรศัพท์" fullWidth size="small" value={customerForm.phone} onChange={(e) => handleCustomerFormChange('phone', e.target.value)} />
                <TextField label="อีเมลกลาง (สำหรับลงทะเบียนเข้าใช้งานระบบ)" fullWidth size="small" value={customerForm.email} onChange={(e) => handleCustomerFormChange('email', e.target.value)} />

                <TextField label="ชื่อผู้ติดต่อหลัก" fullWidth size="small" value={customerForm.contactName} onChange={(e) => handleCustomerFormChange('contactName', e.target.value)} />
                <TextField label="ตำแหน่งผู้ติดต่อ" fullWidth size="small" value={customerForm.contactTitle} onChange={(e) => handleCustomerFormChange('contactTitle', e.target.value)} />
                <TextField label="เบอร์ผู้ติดต่อ" fullWidth size="small" value={customerForm.contactPhone} onChange={(e) => handleCustomerFormChange('contactPhone', e.target.value)} />
                <TextField label="อีเมลผู้ติดต่อ" fullWidth size="small" value={customerForm.contactEmail} onChange={(e) => handleCustomerFormChange('contactEmail', e.target.value)} />

                <TextField select label="ระดับความสัมพันธ์" fullWidth size="small" value={customerForm.relationshipStatus} onChange={(e) => handleCustomerFormChange('relationshipStatus', e.target.value)}>
                  {['🌱 ใหม่', '🌤️ อบอุ่น', '🌳 ระยะยาว', '⭐ VIP'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
                <TextField select label="แหล่งที่มา" fullWidth size="small" value={customerForm.leadSource} onChange={(e) => handleCustomerFormChange('leadSource', e.target.value)}>
                  {['เว็บไซต์', 'แนะนำจากลูกค้า', 'เครือข่าย', 'อื่นๆ'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </TextField>
                <TextField
                  label="มูลค่าตลอดชีพ"
                  type="number"
                  fullWidth
                  size="small"
                  value={customerForm.lifetimeValue}
                  onChange={(e) => handleCustomerFormChange('lifetimeValue', Number(e.target.value || 0))}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                />

                <TextField
                  label="เครดิตเทอม (วัน)"
                  type="number"
                  fullWidth
                  size="small"
                  value={customerForm.creditTermDays}
                  onChange={(e) => handleCustomerFormChange('creditTermDays', Number(e.target.value || 0))}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                />
                <TextField label="เลขประจำตัวผู้เสียภาษี" fullWidth size="small" value={customerForm.taxId} onChange={(e) => handleCustomerFormChange('taxId', e.target.value)} />
                <TextField label="ชื่อผู้รับบิล" fullWidth size="small" value={customerForm.billingName} onChange={(e) => handleCustomerFormChange('billingName', e.target.value)} />

                <TextField label="อีเมลฝ่ายบัญชี" fullWidth size="small" value={customerForm.billingEmail} onChange={(e) => handleCustomerFormChange('billingEmail', e.target.value)} />
                <TextField label="ที่อยู่สำหรับออกใบกำกับภาษี" fullWidth size="small" value={customerForm.billingAddress} onChange={(e) => handleCustomerFormChange('billingAddress', e.target.value)} />

                <TextField
                  label="เปอร์เซ็นต์การเก็บรักษา (%)"
                  type="number"
                  fullWidth
                  size="small"
                  value={customerForm.retentionPercent}
                  onChange={(e) => handleCustomerFormChange('retentionPercent', Number(e.target.value || 0))}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                />
                <TextField
                  label="จำนวนโครงการที่ผ่านมา"
                  type="number"
                  fullWidth
                  size="small"
                  value={customerForm.pastProjectCount}
                  onChange={(e) => handleCustomerFormChange('pastProjectCount', Number(e.target.value || 0))}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                />
                <TextField
                  label="มูลค่าโครงการรวม"
                  type="number"
                  fullWidth
                  size="small"
                  value={customerForm.totalProjectValue}
                  onChange={(e) => handleCustomerFormChange('totalProjectValue', Number(e.target.value || 0))}
                  sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                />

                <TextField label="พฤติกรรมการชำระเงิน" fullWidth size="small" value={customerForm.paymentBehavior} onChange={(e) => handleCustomerFormChange('paymentBehavior', e.target.value)} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeCustomerDialog} sx={{ color: 'common.black' }} disabled={customerSaving}>ยกเลิก</Button>
              <Button
                variant="contained"
                onClick={saveCustomerLocal}
                disabled={customerSaving}
                sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}
              >
                {customerSaving ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                บันทึก
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={deleteDialogOpen}
            onClose={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogContent>
              <Typography>
                ยืนยันการลบลูกค้า "{deleteTarget?.nameTh ?? deleteTarget?.name_th ?? deleteTarget?.customerId ?? deleteTarget?.customer_id ?? ''}" หรือไม่?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }} sx={{ color: 'common.black' }}>
                ยกเลิก
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={confirmDeleteCustomer}
                disabled={customerDeletingMap[String(deleteTarget?.customerId ?? deleteTarget?.customer_id ?? '')] ? true : false}
                sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
              >
                {customerDeletingMap[String(deleteTarget?.customerId ?? deleteTarget?.customer_id ?? '')] ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                ลบ
              </Button>
            </DialogActions>
          </Dialog>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <TeamsSettingsPanel />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          {loadingEmployees ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : employeesError ? (
            <Typography color="error">{employeesError}</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="ค้นหา ตำแหน่ง"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={{
                    background: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                  }}
                />
              </Box>
              <TableContainer
                sx={{
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 600,
                    borderCollapse: 'separate',
                    '& th, & td': { padding: '10px 12px', borderBottom: 'none' },
                  }}
                >
                  <TableHead sx={{ '& th': { position: 'sticky', top: 0, background: 'background.paper', zIndex: 2, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' } }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ตำแหน่ง</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>หน่วยงาน</TableCell>
                      {/* <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>เงินเดือนรวม</TableCell> */}
                      <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Box component="span">ต้นทุนต่อชั่วโมง</Box>
                          <Tooltip
                            title={
                              'คำนวณจาก: เงินเดือนรวม ÷ 160 (จำนวนชั่วโมงมาตรฐานต่อเดือน). เงินเดือนรวม = ผลรวมของค่า salary_rate สำหรับตำแหน่งนี้'
                            }
                          >
                            <IconButton size="small" sx={{ p: 0.5 }} aria-label="ข้อมูลต้นทุนต่อชั่วโมง">
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Box component="span">อัตราค่าบริการ</Box>
                          <Tooltip title={'Bill Rate = ต้นทุนต่อชั่วโมง × (1 + Markup %)'}>
                            <IconButton size="small" sx={{ p: 0.5 }} aria-label="ข้อมูลอัตราค่าบริการ"><InfoOutlinedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aggregatedByPosition.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      aggregatedByPosition.map((row) => (
                        <TableRow key={row.position}>
                          <TableCell>{row.position}</TableCell>
                          <TableCell>{row.department || '-'}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{formatCurrencyNumber(row.total / (standardHours || 160))}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{formatCurrencyNumber((row.total / (standardHours || 160)) * (1 + (markupTotal || 0) / 100))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={4}>
          {loadingEmployees ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : employeesError ? (
            <Typography color="error">{employeesError}</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="ค้นหา ชื่อ, รหัส, เลขบัตร, ตำแหน่ง, หน่วยงาน"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={{
                    background: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                  }}
                />
              </Box>
              <TableContainer
                sx={{
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflow: 'auto',
                  bgcolor: 'background.paper',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 800,
                    borderCollapse: 'separate',
                    '& th, & td': { padding: '10px 12px', borderBottom: 'none' },
                  }}
                >
                  <TableHead sx={{ '& th': { position: 'sticky', top: 0, background: 'background.paper', zIndex: 2, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' } }}>
                    <TableRow>
                      <TableCell sx={{ width: 56, px: 1, fontWeight: 700, color: 'common.black', textAlign: 'center' }}>รูปภาพ</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'common.black' }}>รหัสพนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ชื่อพนักงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ตำแหน่ง</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>หน่วยงาน</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>วันที่เริ่มงาน</TableCell>
                      {/* <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>เงินเดือน</TableCell> */}
                      <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Box component="span">ต้นทุนต่อชั่วโมง</Box>
                          <Tooltip
                            title={
                              'คำนวณจาก: เงินเดือน ÷ 160 (จำนวนชั่วโมงมาตรฐานต่อเดือน). ค่าเงินแสดงเป็นตัวเลข (ไม่มีสัญลักษณ์สกุล)'
                            }
                          >
                            <IconButton size="small" sx={{ p: 0.5 }} aria-label="ข้อมูลต้นทุนต่อชั่วโมง">
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'common.black', textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Box component="span">อัตราค่าบริการ</Box>
                          <Tooltip title={'Bill Rate = ต้นทุนต่อชั่วโมง × (1 + Markup %)'}>
                            <IconButton size="small" sx={{ p: 0.5 }} aria-label="ข้อมูลอัตราค่าบริการ"><InfoOutlinedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary">ไม่พบพนักงาน</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const code = emp.employee_code ?? emp.id;
                        const nameTh = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''}`.trim() + (emp.last_name_th ? ` ${emp.last_name_th}` : '');
                        const nameEn = `${emp.first_name_en || ''}`.trim() + (emp.last_name_en ? ` ${emp.last_name_en}` : '');
                        const displayName = (nameTh.trim() || nameEn.trim()) || code || '';
                        const start = emp.start_date || null;
                        const startLabel = start ? dayjs(start).format('DD/MM/YYYY') : '-';
                        const position = emp.position || (emp.position_id ? (positionMap[String(emp.position_id)] || '') : '') || '-';
                        const department = emp.department_name || (emp.department_id ? (unitMap[String(emp.department_id)] || String(emp.department_id)) : '') || emp.unit || emp.dept_name || '-';

                        // compute avatar fallback
                        const initials = (() => {
                          const fnTh = (emp.first_name_th || '').toString().trim();
                          if (fnTh) return fnTh.charAt(0).toUpperCase();
                          const fnEn = (emp.first_name_en || '').toString().trim();
                          if (fnEn) return fnEn.charAt(0).toUpperCase();
                          const fallback = String(emp.employee_code || emp.id || '').trim();
                          return fallback ? fallback.charAt(0).toUpperCase() : '';
                        })();

                        const salaryNum = getSalaryNumber(emp);
                        // const salary = formatCurrencyNumber(salaryNum);
                        const costPerHour = formatCurrencyNumber(salaryNum / (standardHours || 160));

                        const billRateNum = (salaryNum / (standardHours || 160)) * (1 + (markupTotal || 0) / 100);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell sx={{ width: 56, px: 1 }}>
                              <Avatar src={emp.image_url || ''} alt={displayName} sx={{ width: 32, height: 32, fontSize: 14 }}>{!emp.image_url ? initials : null}</Avatar>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{code}</TableCell>
                            <TableCell>{displayName}</TableCell>
                            <TableCell>{position}</TableCell>
                            <TableCell>{department}</TableCell>
                            <TableCell>{startLabel}</TableCell>
                            {/* <TableCell sx={{ textAlign: 'right' }}>{salary}</TableCell> */}
                            <TableCell sx={{ textAlign: 'right' }}>{costPerHour}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatCurrencyNumber(billRateNum)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header */}
            <Box>
              <Typography variant="h6">อัตราบวกเพิ่มจากต้นทุน (Markup %)</Typography>
              <Typography variant="body2" color="text.secondary">กำหนด Overhead % และกำไรเป้าหมาย เพื่อใช้คำนวณ Bill Rate อัตโนมัติของแต่ละตำแหน่งและแต่ละโครงการ</Typography>
            </Box>

            {/* Global settings card */}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="ชั่วโมงมาตรฐานต่อเดือน"
                type="number"
                size="small"
                value={standardHours}
                onChange={(e) => setStandardHours(Number(e.target.value || 0))}
                helperText="ใช้ในการคำนวณต้นทุนต่อชั่วโมงจากเงินเดือน"
                inputProps={{ style: { textAlign: 'right' } }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="ค่าใช้จ่ายโสหุ้ย (Overhead %)"
                type="number"
                size="small"
                value={overheadPercent}
                onChange={(e) => setOverheadPercent(Number(e.target.value || 0))}
                inputProps={{ min: 0, max: 500, style: { textAlign: 'right' } }}
                helperText="เช่น ค่าออฟฟิศ, Software, พนักงาน Support"
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="กำไรเป้าหมาย (Profit %)"
                type="number"
                size="small"
                fullWidth
                value={profitPercent}
                onChange={(e) => setProfitPercent(Number(e.target.value || 0))}
                inputProps={{ min: 0, max: 100, style: { textAlign: 'right' } }}
                // InputProps={{ endAdornment: (<Box component="span" sx={{ ml: 1 }}><Tooltip title="เปอร์เซ็นต์กำไรที่ต้องการบวกเข้าใน Markup และใช้คำนวณ Bill Rate"><InfoOutlinedIcon fontSize="small" /></Tooltip></Box>) }}
                // helperText="เปอร์เซ็นต์กำไรเป้าหมายที่จะถูกบวกเข้าไปใน Markup"
                sx={{ flex: 1 }}
              />
              <TextField
                label="อัตราบวกเพิ่มจากต้นทุน (Markup % รวม)"
                size="small"
                fullWidth
                value={`${markupTotal}`}
                disabled
                inputProps={{ style: { textAlign: 'right' } }}
                InputProps={{ endAdornment: (<Box component="span" sx={{ ml: 1 }}><Tooltip title="สูตร: Markup % รวม = Overhead % + Profit %"><InfoOutlinedIcon fontSize="small" /></Tooltip></Box>) }}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel id="billrate-method-label">วิธีนำไปใช้คำนวณ Bill Rate</InputLabel>
                <Select labelId="billrate-method-label" label="วิธีนำไปใช้คำนวณ Bill Rate" value={billRateMethod} onChange={(e) => setBillRateMethod(e.target.value)}>
                  <MenuItem value="by_position">คูณ Cost Rate ตามตำแหน่ง</MenuItem>
                  <MenuItem value="default_but_pm_edit">ใช้เป็นค่าเริ่มต้น แต่ให้ PM แก้ได้ในโครงการ</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => { setStandardHours(160); setOverheadPercent(100); setProfitPercent(20); setBillRateMethod('by_position'); setSnackbar({ open: true, message: 'คืนค่าเริ่มต้นแล้ว', severity: 'success' }); }} sx={{ color: 'common.black' }}>
                คืนค่าเริ่มต้น
              </Button>
              <Button variant="contained" onClick={saveMarkupSettings} disabled={loadingMarkup} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}>
                {loadingMarkup ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                บันทึกการตั้งค่า
              </Button>
            </Box>

            {/* Profiles table (optional) - hidden by feature flag but kept in code */}
            {!HIDE_MARKUP_PROFILES && (
              <>
                <Card>
                  <CardHeader
                    title="โปรไฟล์ Markup แยกตามประเภทงาน/ลูกค้า/สัญญา"
                    subheader="เมื่อกำหนดระบบจะเลือกอัตโนมัติเมื่อเปิดโปรเจกต์ใหม่"
                    action={(
                      <IconButton onClick={() => { setEditingProfile({ ...defaultProfile }); setProfileDialogOpen(true); }} aria-label="เพิ่มโปรไฟล์"> <AddIcon /> </IconButton>
                    )}
                    titleTypographyProps={{ variant: 'subtitle2', sx: { fontSize: '0.95rem', fontWeight: 600 } }}
                    subheaderTypographyProps={{ variant: 'caption', sx: { fontSize: '0.8rem' } }}
                  />
                  <Divider />
                  <CardContent>
                    {(markupProfiles || []).length === 0 ? (
                      <Typography color="text.secondary">ยังไม่มีโปรไฟล์ Markup</Typography>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>ประเภทสัญญา</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>กลุ่มลูกค้า</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>ประเภทโครงการ</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Markup %</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>หมายเหตุ</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>สถานะ</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(markupProfiles || []).map(p => (
                            <TableRow key={p.id}>
                              <TableCell>{p.contractType}</TableCell>
                              <TableCell>{p.customerGroup}</TableCell>
                              <TableCell>{p.projectType}</TableCell>
                              <TableCell sx={{ textAlign: 'right' }}>{p.markupPercent}%</TableCell>
                              <TableCell>{p.note}</TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>{p.active ? 'Active' : 'Inactive'}</TableCell>
                              <TableCell sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton size="small" onClick={() => { setEditingProfile(p); setProfileDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                                  <IconButton size="small" onClick={() => deleteProfileFromDb(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Profile Dialog */}
                <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} fullWidth maxWidth="sm">
                  <DialogTitle>{editingProfile?.id ? 'แก้ไขโปรไฟล์ Markup' : 'เพิ่มโปรไฟล์ Markup'}</DialogTitle>
                  <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                      <TextField label="ประเภทสัญญา" size="small" value={editingProfile.contractType} onChange={(e) => setEditingProfile(prev => ({ ...prev, contractType: e.target.value }))} fullWidth />
                      <TextField label="กลุ่มลูกค้า" size="small" value={editingProfile.customerGroup} onChange={(e) => setEditingProfile(prev => ({ ...prev, customerGroup: e.target.value }))} fullWidth />
                      <TextField label="ประเภทโครงการ" size="small" value={editingProfile.projectType} onChange={(e) => setEditingProfile(prev => ({ ...prev, projectType: e.target.value }))} fullWidth />
                      <TextField label="Markup %" size="small" type="number" value={editingProfile.markupPercent} onChange={(e) => setEditingProfile(prev => ({ ...prev, markupPercent: Number(e.target.value || 0) }))} fullWidth />
                      <TextField label="หมายเหตุ" size="small" value={editingProfile.note} onChange={(e) => setEditingProfile(prev => ({ ...prev, note: e.target.value }))} fullWidth multiline rows={3} />
                      <FormControlLabel control={<Switch checked={!!editingProfile.active} onChange={(e) => setEditingProfile(prev => ({ ...prev, active: e.target.checked }))} />} label="Active" />
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setProfileDialogOpen(false)} sx={{ color: 'common.black' }}>ยกเลิก</Button>
                    <Button variant="contained" onClick={async () => {
                      const saved = await saveProfileToDb(editingProfile);
                      if (saved) {/* saved handler preserved in code */ }
                    }} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}>บันทึก</Button>
                  </DialogActions>
                </Dialog>
              </>
            )}

            <Divider />

            <Box>
              <Typography variant="h6">ตัวอย่างคำนวณอัตราค่าบริการ</Typography>
              <Typography variant="body2" color="text.secondary">ลองเล่นตัวเลขเพื่อเช็คความสมเหตุสมผล</Typography>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel id="preview-pos-label">เลือกตำแหน่ง</InputLabel>
              <Select labelId="preview-pos-label" label="เลือกตำแหน่ง" value={previewPosition} onChange={(e) => setPreviewPosition(e.target.value)}>
                <MenuItem value="">-- เลือกตำแหน่ง --</MenuItem>
                {(aggregatedPositionStats || []).map(p => (
                  <MenuItem key={p.position} value={p.position}>{p.position}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2">ต้นทุนเฉลี่ยต่อชั่วโมง: {(() => {
                const s = aggregatedPositionStats.find(x => x.position === previewPosition);
                return s ? formatCurrencyNumber(s.avgCostPerHour) : '-';
              })()}</Typography>
              <Typography variant="body2">Markup ที่ใช้: {markupTotal}%</Typography>
              <Typography variant="body2">อัตราค่าบริการ: {(() => {
                const s = aggregatedPositionStats.find(x => x.position === previewPosition);
                if (!s) return '-';
                const bill = s.avgCostPerHour * (1 + (markupTotal / 100));
                return formatCurrencyNumber(bill);
              })()} บาท/ชม.</Typography>
            </Box>

          </Box>
        </TabPanel>



        {/* Save button removed per request */}
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            // success = green, error = red
            bgcolor: snackbar.severity === 'success' ? '#2e7d32' : '#d32f2f',
            color: '#fff',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
