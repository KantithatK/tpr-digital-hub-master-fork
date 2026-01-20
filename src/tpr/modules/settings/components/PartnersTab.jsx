// ===== PartnersTab.jsx (แทนทั้งไฟล์) =====
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

// ✅ ปรับเป็นภาษาไทย (value เก็บอังกฤษเหมือนเดิมเพื่อไม่กระทบ DB)
const PARTNER_TYPES = [
  { value: 'Strategic', label: 'เชิงกลยุทธ์' },
  { value: 'Project', label: 'โครงการ' },
  { value: 'Technology', label: 'เทคโนโลยี' },
  { value: 'Referral', label: 'แนะนำ/Referral' },
];

const STATUSES = [
  { value: 'Active', label: 'ใช้งาน' },
  { value: 'Inactive', label: 'ไม่ใช้งาน' },
];

const TAXPAYER_TYPES = [
  { value: '', label: '-' },
  { value: 'บุคคลธรรมดา', label: 'บุคคลธรรมดา' },
  { value: 'นิติบุคคล', label: 'นิติบุคคล' },
  { value: 'ต่างประเทศ', label: 'ต่างประเทศ' },
];

function normalizeText(v) {
  return (v ?? '').toString().trim();
}

function emptyPartner() {
  return {
    id: null,
    partner_code: '',
    partner_name: '',
    partner_type: 'Strategic',
    status: 'Active',
    phone_main: '',
    email_main: '',
    address: '',
    tax_id: '',
    registered_name: '',
    taxpayer_type: '',
    description: '',
    internal_owner_id: null,
  };
}

function emptyContact(partner_id) {
  return {
    id: null,
    partner_id,
    contact_name: '',
    contact_position: '',
    department: '',
    phone: '',
    email: '',
    status: 'Active',
    note: '',
  };
}

function hasAnyContactData(c) {
  const keys = ['contact_name', 'contact_position', 'department', 'phone', 'email', 'note'];
  return keys.some((k) => normalizeText(c?.[k]));
}

// small helper for "label : value"
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

function PartnerListSkeleton() {
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
                <Skeleton variant="rounded" width={72} height={22} sx={{ borderRadius: 999 }} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 2 }}>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={140} />
                <Skeleton variant="text" width={180} />
                <Skeleton variant="text" width={120} />
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
        <Skeleton variant="text" width={260} height={28} />
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
        <Skeleton variant="rectangular" width={240} height={36} />
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="rounded" width={104} height={36} sx={{ borderRadius: 2 }} />
      </Stack>
    </Stack>
  );
}

export default function PartnersTab({ notify }) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyPartner());

  // dialog เดียว: ผู้ติดต่อ
  const [contactsLoading, setContactsLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState([]);
  const [deletedContactIds, setDeletedContactIds] = React.useState([]);

  // delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const TYPE_LABEL = React.useMemo(() => {
    const m = {};
    PARTNER_TYPES.forEach((x) => {
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

  // ✅ ขอบ input ทั้งหมดใช้ divider (default/hover/focus) + label focus ไม่เปลี่ยนสีฉูดฉาด
  const inputSx = React.useMemo(
    () => ({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
    }),
    []
  );

  const loadPartners = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('tpr_partners')
        .select(
          'id, partner_code, partner_name, partner_type, status, phone_main, email_main, address, tax_id, registered_name, taxpayer_type, description, internal_owner_id, created_at, updated_at'
        )
        .order('partner_name', { ascending: true });

      if (e) throw e;
      setRows(data || []);
    } catch (err) {
      console.error('loadPartners error', err);
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลคู่ค้าได้');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const filteredRows = React.useMemo(() => {
    const q = normalizeText(search).toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((r) => {
      const blob = [
        r.partner_code,
        r.partner_name,
        r.partner_type,
        r.status,
        r.phone_main,
        r.email_main,
        r.tax_id,
        r.registered_name,
        r.taxpayer_type,
        r.address,
      ]
        .map((x) => (x ?? '').toString().toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [rows, search]);

  async function loadContactsForPartner(partnerId) {
    if (!partnerId) {
      setContacts([]);
      return;
    }
    setContactsLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('tpr_partner_contacts')
        .select(
          'id, partner_id, contact_name, contact_position, department, phone, email, status, note, created_at, updated_at'
        )
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: true });

      if (e) throw e;
      setContacts(data || []);
    } catch (err) {
      console.error('loadContactsForPartner error', err);
      notify?.error?.(err?.message || 'ไม่สามารถโหลดผู้ติดต่อได้');
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }

  const openCreate = () => {
    setForm(emptyPartner());
    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (row) => {
    setForm({
      id: row.id,
      partner_code: row.partner_code ?? '',
      partner_name: row.partner_name ?? '',
      partner_type: row.partner_type ?? 'Strategic',
      status: row.status ?? 'Active',
      phone_main: row.phone_main ?? '',
      email_main: row.email_main ?? '',
      address: row.address ?? '',
      tax_id: row.tax_id ?? '',
      registered_name: row.registered_name ?? '',
      taxpayer_type: row.taxpayer_type ?? '',
      description: row.description ?? '',
      internal_owner_id: row.internal_owner_id ?? null,
    });
    setContacts([]);
    setDeletedContactIds([]);
    setDialogOpen(true);
    await loadContactsForPartner(row.id);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyPartner());
    setContacts([]);
    setDeletedContactIds([]);
  };

  const addContactRow = () => {
    const partnerId = form?.id || null;
    setContacts((prev) => [...prev, emptyContact(partnerId)]);
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

  const savePartnerAndContacts = async () => {
    const partner_code = normalizeText(form.partner_code);
    const partner_name = normalizeText(form.partner_name);
    const partner_type = normalizeText(form.partner_type) || 'Strategic';
    const status = normalizeText(form.status) || 'Active';

    if (!partner_code) {
      notify?.warning?.('กรุณากรอกรหัสคู่ค้า');
      return;
    }

    if (!partner_name) {
      notify?.warning?.('กรุณากรอกชื่อคู่ค้า');
      return;
    }
    if (!partner_type) {
      notify?.warning?.('กรุณาเลือกประเภทคู่ค้า');
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
        partner_code: partner_code || null,
        partner_name,
        partner_type,
        status,
        phone_main: normalizeText(form.phone_main) || null,
        email_main: normalizeText(form.email_main) || null,
        address: normalizeText(form.address) || null,
        tax_id: normalizeText(form.tax_id) || null,
        registered_name: normalizeText(form.registered_name) || null,
        taxpayer_type: normalizeText(form.taxpayer_type) || null,
        description: normalizeText(form.description) || null,
        internal_owner_id: form.internal_owner_id || null,
      };

      let savedPartner = null;
      if (form.id) {
        const res = await supabase.from('tpr_partners').update(payload).eq('id', form.id).select().maybeSingle();
        if (res.error) throw res.error;
        savedPartner = res.data;
      } else {
        const res = await supabase.from('tpr_partners').insert([payload]).select().maybeSingle();
        if (res.error) throw res.error;
        savedPartner = res.data;
      }

      const partnerId = savedPartner?.id;
      if (!partnerId) throw new Error('บันทึกคู่ค้าไม่สำเร็จ (ไม่ได้รับ partner id)');

      if (deletedContactIds.length) {
        const { error: delErr } = await supabase.from('tpr_partner_contacts').delete().in('id', deletedContactIds);
        if (delErr) throw delErr;
      }

      const inserts = [];
      const updates = [];

      contactsToConsider.forEach((c) => {
        const cPayload = {
          partner_id: partnerId,
          contact_name: normalizeText(c.contact_name),
          contact_position: normalizeText(c.contact_position) || null,
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
        const { error: insErr } = await supabase.from('tpr_partner_contacts').insert(inserts);
        if (insErr) throw insErr;
      }

      for (const u of updates) {
        const { id, ...cPayload } = u;
        const { error: upErr } = await supabase.from('tpr_partner_contacts').update(cPayload).eq('id', id);
        if (upErr) throw upErr;
      }

      notify?.success?.('บันทึกข้อมูลเรียบร้อย');
      await loadPartners();
      await loadContactsForPartner(partnerId);
      setDeletedContactIds([]);
      closeDialog();
    } catch (err) {
      console.error('savePartnerAndContacts error', err);
      notify?.error?.(err?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const deletePartner = (row) => {
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
      const { error: e } = await supabase.from('tpr_partners').delete().eq('id', row.id);
      if (e) throw e;
      notify?.success?.('ลบข้อมูลเรียบร้อย');
      await loadPartners();
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

  // ✅ Flat: ปุ่มไม่มีเงา
  const flatBtnSx = { boxShadow: 'none', '&:hover': { boxShadow: 'none' } };
  const flatIconBtnSx = { boxShadow: 'none' };

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
              คู่ค้า (Partners)
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
                <IconButton onClick={loadPartners} disabled={loading} size="small" sx={flatIconBtnSx}>
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
              เพิ่มคู่ค้า
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
              <PartnerListSkeleton />
            </Box>
          ) : filteredRows.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">ยังไม่มีข้อมูลคู่ค้า</Typography>
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
                          title={r.partner_name}
                        >
                          {r.partner_name}
                        </Typography>

                        <StatusChip status={r.status} />
                      </Stack>

                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.25, md: 2 }} sx={{ mt: 0.5 }}>
                        <MetaRow label="โทร:" value={r.phone_main || ''} />
                        <MetaRow label="อีเมล:" value={r.email_main || ''} />
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePartner(r);
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

      {/* ===== Partner + Contacts Dialog ===== */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{form.id ? 'แก้ไข' : 'เพิ่ม'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="รหัสคู่ค้า"
                value={form.partner_code}
                onChange={(e) => setForm((p) => ({ ...p, partner_code: e.target.value }))}
                fullWidth
                required
                sx={inputSx}
              />
              <TextField
                size="small"
                label="ชื่อคู่ค้า"
                value={form.partner_name}
                onChange={(e) => setForm((p) => ({ ...p, partner_name: e.target.value }))}
                fullWidth
                required
                sx={inputSx}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="ประเภทคู่ค้า"
                value={form.partner_type}
                onChange={(e) => setForm((p) => ({ ...p, partner_type: e.target.value }))}
                select
                fullWidth
                required
                sx={inputSx}
              >
                {PARTNER_TYPES.map((x) => (
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

            <Typography sx={{ fontWeight: 700 }}>ช่องทางติดต่อกลาง</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="โทรศัพท์กลาง"
                value={form.phone_main}
                onChange={(e) => setForm((p) => ({ ...p, phone_main: e.target.value }))}
                fullWidth
                sx={inputSx}
              />
              <TextField
                size="small"
                label="อีเมลกลาง"
                value={form.email_main}
                onChange={(e) => setForm((p) => ({ ...p, email_main: e.target.value }))}
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
                label="ประเภทผู้เสียภาษี"
                value={form.taxpayer_type}
                onChange={(e) => setForm((p) => ({ ...p, taxpayer_type: e.target.value }))}
                select
                fullWidth
                sx={inputSx}
              >
                {TAXPAYER_TYPES.map((x) => (
                  <MenuItem key={x.value} value={x.value}>
                    {x.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              size="small"
              label="ชื่อจดทะเบียน"
              value={form.registered_name}
              onChange={(e) => setForm((p) => ({ ...p, registered_name: e.target.value }))}
              fullWidth
              sx={inputSx}
            />

            <TextField
              size="small"
              label="รายละเอียดเพิ่มเติม"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              sx={inputSx}
            />

            {/* ===== Contacts (ตาราง) ===== */}
            <Divider sx={{ mt: 1 }} />
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
                  <Table size="small" sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, minWidth: { xs: 120, sm: 200 } }}>ชื่อ</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: { xs: 100, sm: 180 } }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: { xs: 100, sm: 150 } }}>โทร</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: { xs: 140, sm: 240 } }}>อีเมล</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 64 }} align="right">
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
                              value={c.contact_position}
                              onChange={(e) => updateContactField(idx, 'contact_position', e.target.value)}
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
                          <TableCell>
                            <TextField
                              size="small"
                              value={c.email}
                              onChange={(e) => updateContactField(idx, 'email', e.target.value)}
                              fullWidth
                              sx={inputSx}
                            />
                          </TableCell>
                          <TableCell align="right">
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
            onClick={savePartnerAndContacts}
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
          <Typography>ลบคู่ค้า "{deleteTarget?.partner_name || ''}" หรือไม่? (ผู้ติดต่อทั้งหมดจะถูกลบตามด้วย)</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={cancelDelete}
            disabled={deleting}
            sx={{ color: 'common.black', ...flatBtnSx }}
            disableElevation
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
            sx={flatBtnSx}
            disableElevation
          >
            {deleting ? 'กำลังลบ...' : 'ลบ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
