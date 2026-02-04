// ===== CustomersTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import {
  Box,
  Stack,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Skeleton,
  Alert,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import { supabase } from '../../../../lib/supabaseClient';

// ✅ ไทย (value เก็บอังกฤษ/เดิม เพื่อไม่กระทบ DB)
const CUSTOMER_TYPES = [
  { value: '', label: '-' },
  { value: 'Corporate', label: 'บริษัทเอกชน' },
  { value: 'SME', label: 'SME' },
  { value: 'Government', label: 'หน่วยงานรัฐ' },
  { value: 'StateEnterprise', label: 'รัฐวิสาหกิจ' },
  { value: 'Individual', label: 'บุคคล' },
  { value: 'Other', label: 'อื่นๆ' },
];

const STATUSES = [
  { value: 'Active', label: 'ใช้งาน' },
  { value: 'Inactive', label: 'ไม่ใช้งาน' },
];

const CUSTOMER_SIZES = [
  { value: '', label: '-' },
  { value: 'Small', label: 'เล็ก' },
  { value: 'Medium', label: 'กลาง' },
  { value: 'Large', label: 'ใหญ่' },
];

function normalizeText(v) {
  return (v ?? '').toString().trim();
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function emptyCustomer() {
  return {
    id: null,
    customer_id: '',
    name_th: '',
    name_en: '',
    type: '',
    sector: '',
    size: '',
    status: 'Active',
    address: '',
    website: '',
    phone: '',
    email: '',

    // billing/tax
    tax_id: '',
    billing_name: '',
    billing_email: '',
    billing_address: '',

    // sales/relationship
    relationship_status: '',
    lead_source: '',
    payment_behavior: '',

    // finance
    lifetime_value: 0,
    credit_term_days: 0,
    retention_percent: 0,
    past_project_count: 0,
    total_project_value: 0,

    metadata: {},
  };
}

function emptyContact(customer_id) {
  return {
    id: null,
    customer_id,
    contact_name: '',
    contact_title: '',
    department: '',
    phone: '',
    email: '',
    status: 'Active',
    note: '',
  };
}

function hasAnyContactData(c) {
  const keys = ['contact_name', 'contact_title', 'department', 'phone', 'email', 'note'];
  return keys.some((k) => normalizeText(c?.[k]));
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      <Box component="span" sx={{ color: 'text.disabled', mr: 0.75 }}>
        {label}
      </Box>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {value}
      </Box>
    </Typography>
  );
}

function ListSkeleton() {
  return (
    <Stack spacing={1}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <Box
          key={`sk-${idx}`}
          sx={{
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                <Skeleton variant="text" width={220} height={22} />
                <Skeleton variant="rounded" width={84} height={22} sx={{ borderRadius: 999 }} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 2 }}>
                <Skeleton variant="text" width={140} />
                <Skeleton variant="text" width={200} />
              </Stack>
            </Box>
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function HeaderSkeleton() {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent="space-between"
    >
      <Box>
        <Skeleton variant="text" width={220} height={28} />
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
        <Skeleton variant="rectangular" width={240} height={36} />
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="rounded" width={120} height={36} sx={{ borderRadius: 2 }} />
      </Stack>
    </Stack>
  );
}

export default function CustomersTab({ notify }) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyCustomer());

  // contacts in same dialog
  const [contactsLoading, setContactsLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState([]);
  const [deletedContactIds, setDeletedContactIds] = React.useState([]);

  // delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const TYPE_LABEL = React.useMemo(() => {
    const m = {};
    CUSTOMER_TYPES.forEach((x) => {
      m[x.value] = x.label;
    });
    return m;
  }, []);

  const STATUS_LABEL = React.useMemo(() => {
    const m = {};
    STATUSES.forEach((x) => {
      m[x.value] = x.label;
    });
    return m;
  }, []);

  // ✅ Divider border style สำหรับทุก TextField (default/hover/focus)
  const inputSx = React.useMemo(
    () => ({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
    }),
    []
  );

  // ✅ Flat: ปุ่มไม่มีเงา
  const flatBtnSx = { boxShadow: 'none', '&:hover': { boxShadow: 'none' } };
  const flatIconBtnSx = { boxShadow: 'none' };

  const loadCustomers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('tpr_customers')
        .select(
          [
            'id',
            'customer_id',
            'name_th',
            'name_en',
            'type',
            'sector',
            'size',
            'status',
            'phone',
            'email',
            'website',
            'address',
            'tax_id',
            'billing_name',
            'billing_email',
            'billing_address',
            'relationship_status',
            'lead_source',
            'lifetime_value',
            'credit_term_days',
            'retention_percent',
            'past_project_count',
            'total_project_value',
            'payment_behavior',
            'metadata',
            'created_at',
            'updated_at',
          ].join(', ')
        )
        .order('name_th', { ascending: true });

      if (e) throw e;
      setRows(data || []);
    } catch (err) {
      console.error('loadCustomers error', err);
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredRows = React.useMemo(() => {
    const q = normalizeText(search).toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((r) => {
      const blob = [
        r.customer_id,
        r.name_th,
        r.name_en,
        r.type,
        r.sector,
        r.size,
        r.status,
        r.phone,
        r.email,
        r.website,
        r.tax_id,
        r.billing_name,
        r.billing_email,
        r.address,
        r.billing_address,
      ]
        .map((x) => (x ?? '').toString().toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [rows, search]);

  async function loadContactsForCustomer(customerPkId) {
    if (!customerPkId) {
      setContacts([]);
      return;
    }
    setContactsLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('tpr_customer_contacts')
        .select('id, customer_id, contact_name, contact_title, department, phone, email, status, note, created_at, updated_at')
        .eq('customer_id', customerPkId)
        .order('created_at', { ascending: true });

      if (e) throw e;
      setContacts(data || []);
    } catch (err) {
      console.error('loadContactsForCustomer error', err);
      notify?.error?.(err?.message || 'ไม่สามารถโหลดผู้ติดต่อได้');
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }

  const openCreate = () => {
    setForm(emptyCustomer());
    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (row) => {
    setForm({
      id: row.id,
      customer_id: row.customer_id ?? '',
      name_th: row.name_th ?? '',
      name_en: row.name_en ?? '',
      type: row.type ?? '',
      sector: row.sector ?? '',
      size: row.size ?? '',
      status: row.status ?? 'Active',
      address: row.address ?? '',
      website: row.website ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',

      tax_id: row.tax_id ?? '',
      billing_name: row.billing_name ?? '',
      billing_email: row.billing_email ?? '',
      billing_address: row.billing_address ?? '',

      relationship_status: row.relationship_status ?? '',
      lead_source: row.lead_source ?? '',
      payment_behavior: row.payment_behavior ?? '',

      lifetime_value: row.lifetime_value ?? 0,
      credit_term_days: row.credit_term_days ?? 0,
      retention_percent: row.retention_percent ?? 0,
      past_project_count: row.past_project_count ?? 0,
      total_project_value: row.total_project_value ?? 0,

      metadata: row.metadata ?? {},
    });

    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
    await loadContactsForCustomer(row.id);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyCustomer());
    setContacts([]);
    setDeletedContactIds([]);
  };

  const addContactRow = () => {
    const customerPkId = form?.id || null;
    setContacts((prev) => [...prev, emptyContact(customerPkId)]);
  };

  const updateContactField = (idx, key, val) => {
    setContacts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  };

  const removeContactRow = (idx) => {
    const row = contacts[idx];
    if (!row) return;
    if (row.id) setDeletedContactIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCustomerAndContacts = async () => {
    const customer_id = normalizeText(form.customer_id);
    const name_th = normalizeText(form.name_th);

    if (!customer_id) {
      notify?.warning?.('กรุณากรอก Customer ID');
      return;
    }
    if (!name_th) {
      notify?.warning?.('กรุณากรอกชื่อลูกค้า (ไทย)');
      return;
    }

    const contactsToConsider = (contacts || []).filter((c) => hasAnyContactData(c));
    const invalidContact = contactsToConsider.some((c) => !normalizeText(c.contact_name));
    if (invalidContact) {
      notify?.warning?.('กรุณากรอก “ชื่อผู้ติดต่อ” ให้ครบ สำหรับแถวที่มีข้อมูล');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id,
        name_th,
        name_en: normalizeText(form.name_en) || null,

        type: normalizeText(form.type) || null,
        sector: normalizeText(form.sector) || null,
        size: normalizeText(form.size) || null,
        status: normalizeText(form.status) || null,

        address: normalizeText(form.address) || null,
        website: normalizeText(form.website) || null,
        phone: normalizeText(form.phone) || null,
        email: normalizeText(form.email) || null,

        tax_id: normalizeText(form.tax_id) || null,
        billing_name: normalizeText(form.billing_name) || null,
        billing_email: normalizeText(form.billing_email) || null,
        billing_address: normalizeText(form.billing_address) || null,

        relationship_status: normalizeText(form.relationship_status) || null,
        lead_source: normalizeText(form.lead_source) || null,
        payment_behavior: normalizeText(form.payment_behavior) || null,

        lifetime_value: toNumber(form.lifetime_value, 0),
        credit_term_days: Math.max(0, parseInt(form.credit_term_days || 0, 10) || 0),
        retention_percent: toNumber(form.retention_percent, 0),
        past_project_count: Math.max(0, parseInt(form.past_project_count || 0, 10) || 0),
        total_project_value: toNumber(form.total_project_value, 0),

        metadata: form.metadata && typeof form.metadata === 'object' ? form.metadata : {},
      };

      let savedCustomer = null;
      if (form.id) {
        const res = await supabase.from('tpr_customers').update(payload).eq('id', form.id).select().maybeSingle();
        if (res.error) throw res.error;
        savedCustomer = res.data;
      } else {
        const res = await supabase.from('tpr_customers').insert([payload]).select().maybeSingle();
        if (res.error) throw res.error;
        savedCustomer = res.data;
      }

      const customerPkId = savedCustomer?.id;
      if (!customerPkId) throw new Error('บันทึกลูกค้าไม่สำเร็จ (ไม่ได้รับ customer pk id)');

      // delete removed contacts
      if (deletedContactIds.length) {
        const { error: delErr } = await supabase.from('tpr_customer_contacts').delete().in('id', deletedContactIds);
        if (delErr) throw delErr;
      }

      const inserts = [];
      const updates = [];

      contactsToConsider.forEach((c) => {
        const cPayload = {
          customer_id: customerPkId,
          contact_name: normalizeText(c.contact_name),
          contact_title: normalizeText(c.contact_title) || null,
          department: normalizeText(c.department) || null,
          phone: normalizeText(c.phone) || null,
          email: normalizeText(c.email) || null,
          status: normalizeText(c.status) || 'Active',
          note: normalizeText(c.note) || null,
        };
        if (c.id) updates.push({ id: c.id, ...cPayload });
        else inserts.push(cPayload);
      });

      if (inserts.length) {
        const { error: insErr } = await supabase.from('tpr_customer_contacts').insert(inserts);
        if (insErr) throw insErr;
      }

      for (const u of updates) {
        const { id, ...cPayload } = u;
        const { error: upErr } = await supabase.from('tpr_customer_contacts').update(cPayload).eq('id', id);
        if (upErr) throw upErr;
      }

      notify?.success?.('บันทึกข้อมูลเรียบร้อย');
      await loadCustomers();
      await loadContactsForCustomer(customerPkId);
      setDeletedContactIds([]);
      closeDialog();
    } catch (err) {
      console.error('saveCustomerAndContacts error', err);
      notify?.error?.(err?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = (row) => {
    setDeleteTarget(row || null);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const row = deleteTarget;
    if (!row) {
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setDeleting(true);
      setLoading(true);
      const { error: e } = await supabase.from('tpr_customers').delete().eq('id', row.id);
      if (e) throw e;
      notify?.success?.('ลบข้อมูลเรียบร้อย');
      await loadCustomers();
    } catch (err) {
      console.error('confirmDelete error', err);
      notify?.error?.(err?.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleting(false);
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const StatusChip = ({ status }) => (
    <Chip
      size="small"
      label={STATUS_LABEL[status] || status || '-'}
      variant={status === 'Active' ? 'filled' : 'outlined'}
      sx={{
        borderRadius: 999,
        fontWeight: 600,
        ...(status === 'Active'
          ? { bgcolor: 'rgba(16,185,129,0.14)', color: 'rgb(5,150,105)' }
          : { bgcolor: 'transparent' }),
      }}
    />
  );

  return (
    <Box>
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              ลูกค้า (Customers)
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา"
              sx={{ width: { xs: '100%', md: 420 }, ...inputSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="รีเฟรช">
              <span>
                <IconButton onClick={loadCustomers} disabled={loading} size="small" sx={flatIconBtnSx}>
                  <RefreshRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              onClick={openCreate}
              variant="contained"
              startIcon={<AddCircleIcon />}
              sx={{
                whiteSpace: 'nowrap',
                backgroundColor: '#ff4059',
                color: '#ffffff',
                '&:hover': { backgroundColor: '#ff2f4f' },
                ...flatBtnSx,
              }}
              disableElevation
            >
              เพิ่มลูกค้า
            </Button>
          </Stack>
        </Stack>
      )}

      <Box sx={{ mt: 2 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {/* ===== Flat list container (ไม่ใช้ตาราง) ===== */}
        <Paper variant="outlined" sx={{ border: 'none' }}>
          {loading ? (
            <Box sx={{ p: 1 }}>
              <ListSkeleton />
            </Box>
          ) : filteredRows.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">ยังไม่มีข้อมูลลูกค้า</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {filteredRows.map((r) => (
                <Box
                  key={r.id}
                  onClick={() => openEdit(r)}
                  sx={{
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    px: 2,
                    py: 1.5,
                    transition: 'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      borderColor: '#c7c7c7',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25, flexWrap: 'wrap' }}>
                        <Typography
                          sx={{
                            fontWeight: 500,
                            lineHeight: 1.3,
                            mr: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: 220, md: 420 },
                          }}
                          title={r.name_th}
                        >
                          {r.name_th}
                        </Typography>

                        <StatusChip status={r.status || 'Active'} />
                      </Stack>

                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.25, md: 2 }} sx={{ mt: 0.5 }}>
                        <MetaRow label="โทร:" value={r.phone || ''} />
                        <MetaRow label="อีเมล:" value={r.email || ''} />
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomer(r);
                          }}
                          sx={flatIconBtnSx}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      {/* ===== Customer + Contacts Dialog ===== */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{form.id ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="รหัสลูกค้า"
                value={form.customer_id}
                onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))}
                fullWidth
                required
                sx={inputSx}
              />
              <TextField
                size="small"
                label="ชื่อลูกค้า"
                value={form.name_th}
                onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
                fullWidth
                required
                sx={inputSx}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="ประเภทลูกค้า"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                select
                fullWidth
                sx={inputSx}
              >
                {CUSTOMER_TYPES.map((x) => (
                  <MenuItem key={x.value} value={x.value}>
                    {x.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="กลุ่มธุรกิจ (Sector)"
                value={form.sector}
                onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="ขนาด"
                value={form.size}
                onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
                select
                fullWidth
                sx={inputSx}
              >
                {CUSTOMER_SIZES.map((x) => (
                  <MenuItem key={x.value} value={x.value}>
                    {x.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="สถานะ"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                select
                fullWidth
                sx={inputSx}
              >
                {STATUSES.map((x) => (
                  <MenuItem key={x.value} value={x.value}>
                    {x.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Divider />

            <Typography sx={{ fontWeight: 700 }}>ข้อมูลติดต่อกลาง</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="โทรศัพท์"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
              <TextField
                size="small"
                label="อีเมล"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
            </Stack>

            <TextField
              size="small"
              label="ที่อยู่"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={inputSx}
            />

            <Divider />

            <Typography sx={{ fontWeight: 700 }}>ข้อมูลภาษี</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="เลขประจำตัวผู้เสียภาษี"
                value={form.tax_id}
                onChange={(e) => setForm((p) => ({ ...p, tax_id: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
              <TextField
                size="small"
                label="ชื่อ"
                value={form.billing_name}
                onChange={(e) => setForm((p) => ({ ...p, billing_name: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="อีเมล"
                value={form.billing_email}
                onChange={(e) => setForm((p) => ({ ...p, billing_email: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
              <TextField
                size="small"
                label="เว็บไซต์"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
            </Stack>

            <TextField
              size="small"
              label="ที่อยู่"
              value={form.billing_address}
              onChange={(e) => setForm((p) => ({ ...p, billing_address: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={inputSx}
            />

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>ผู้ติดต่อ</Typography>
              </Box>

              <Button
                onClick={addContactRow}
                startIcon={<AddIcon />}
                variant="outlined"
                disabled={saving || contactsLoading}
                sx={{ whiteSpace: 'nowrap', ...flatBtnSx }}
                disableElevation
              >
                เพิ่มผู้ติดต่อ
              </Button>
            </Stack>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {contactsLoading ? (
                <Box sx={{ p: 1.25 }}>
                  <Skeleton variant="rounded" height={180} />
                </Box>
              ) : contacts.length === 0 ? (
                <Box sx={{ py: 2.5, textAlign: 'center' }}>
                  <Typography color="text.secondary">ยังไม่มีผู้ติดต่อ</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>ชื่อ *</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>อีเมล</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>เบอร์โทร</TableCell>
                        <TableCell sx={{ fontWeight: 700, }} align="center">
                          ลบ
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {contacts.map((c, idx) => (
                        <TableRow key={c.id || `new-${idx}`} hover>
                          <TableCell>
                            <TextField
                              size="small"
                              value={c.contact_name}
                              onChange={(e) => updateContactField(idx, 'contact_name', e.target.value)}
                              fullWidth
                              required={hasAnyContactData(c)}
                              sx={inputSx}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={c.contact_title}
                              onChange={(e) => updateContactField(idx, 'contact_title', e.target.value)}
                              fullWidth
                              sx={inputSx}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={c.email}
                              onChange={(e) => updateContactField(idx, 'email', e.target.value)}
                              fullWidth
                              sx={inputSx}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={c.phone}
                              onChange={(e) => updateContactField(idx, 'phone', e.target.value)}
                              fullWidth
                              sx={inputSx}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="ลบผู้ติดต่อ">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => removeContactRow(idx)}
                                  disabled={saving}
                                  sx={flatIconBtnSx}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Stack>
        </DialogContent>

        {/* ✅ ปุ่มอยู่ตรงกลาง */}
        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button onClick={closeDialog} disabled={saving} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={saveCustomerAndContacts}
            disabled={saving}
            sx={flatBtnSx}
            disableElevation
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>
            ลบลูกค้า "{deleteTarget?.name_th || ''}" หรือไม่? (ผู้ติดต่อทั้งหมดจะถูกลบตามด้วย)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleting} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting} sx={flatBtnSx} disableElevation>
            {deleting ? 'กำลังลบ...' : 'ลบ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
