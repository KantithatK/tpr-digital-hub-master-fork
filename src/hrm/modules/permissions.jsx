// ===== PermissionsPage.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { supabase } from '../../lib/supabaseClient';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// This table copies the layout and UX of `unit-codes.jsx` (headers, loading/empty states, pagination)
export default function PermissionsPage() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  const [searchField, setSearchField] = React.useState('email');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'email', text: '' });

  const [accessMap, setAccessMap] = React.useState({});
  const [updatingMap, setUpdatingMap] = React.useState({});
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });

  // ✅ roles list and lookup maps
  // NOTE: ใส่ SYS เป็น fallback เผื่อกรณีโหลด roles จาก DB ไม่ทัน/ล้มเหลว
  const [rolesList, setRolesList] = React.useState([
    { id: 1, scope_level: 'sys', key: 'SYS', label: 'SYS' },
    { id: 2, scope_level: 'hrm', key: 'HRM', label: 'Human Resources' },
    { id: 11, scope_level: 'tpr', key: 'TPR', label: 'Employee' },
  ]);

  // map by scope_level (raw lowercase) and by id
  const [rolesByKey, setRolesByKey] = React.useState({
    sys: { id: 1, scope_level: 'sys', key: 'SYS', label: 'SYS' },
    hrm: { id: 2, scope_level: 'hrm', key: 'HRM', label: 'Human Resources' },
    tpr: { id: 11, scope_level: 'tpr', key: 'TPR', label: 'Employee' },
  });

  const [rolesById, setRolesById] = React.useState({
    1: { id: 1, scope_level: 'sys', key: 'SYS', label: 'SYS' },
    2: { id: 2, scope_level: 'hrm', key: 'HRM', label: 'Human Resources' },
    11: { id: 11, scope_level: 'tpr', key: 'TPR', label: 'Employee' },
  });

  // ✅ load roles from DB (รวม sys ด้วย)
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: rdata, error: rErr } = await supabase.from('roles').select('id, scope_level, name');
        if (rErr) throw rErr;
        if (!mounted) return;

        const list = (rdata || [])
          .filter((r) => r && r.scope_level) // ✅ ไม่ตัด sys แล้ว
          .map((r) => {
            const scopeRaw = String(r.scope_level || '').trim();
            const scopeLower = scopeRaw.toLowerCase();
            return {
              id: r.id,
              scope_level: scopeLower, // ✅ เก็บเป็น lowercase ให้ key ตรงกันทุกจุด
              key: scopeLower.toUpperCase(),
              label: r.name || scopeLower.toUpperCase(),
            };
          });

        if (list.length) {
          // เรียงให้ดูดี: SYS, HRM, TPR (ที่เหลือไว้ท้าย)
          const order = { sys: 0, hrm: 1, tpr: 2 };
          list.sort((a, b) => (order[a.scope_level] ?? 99) - (order[b.scope_level] ?? 99));

          const byKey = {};
          const byId = {};
          list.forEach((x) => {
            byKey[x.scope_level] = x;
            byId[x.id] = x;
          });

          setRolesList(list);
          setRolesByKey(byKey);
          setRolesById(byId);
        }
      } catch (e) {
        // ถ้าโหลดไม่ได้ให้ใช้ fallback ต่อไป (อย่าให้หน้าพัง)
        void e;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchPage = React.useCallback(
    async (p = page, r = rowsPerPage, applied) => {
      setLoading(true);
      setError(null);

      try {
        const from = p * r;
        const to = from + r - 1;

        let query = supabase
          .from('users')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (applied?.text && applied?.field) {
          const t = applied.text.trim();
          if (t.length) {
            if (applied.field === 'name') {
              // search inside user metadata for name-like values
              query = query.ilike('user_metadata', `%${t}%`);
            } else {
              // default to email
              query = query.ilike('email', `%${t}%`);
            }
          }
        }

        const { data, error: err, count } = await query;
        if (err) throw err;

        setUsers(data || []);
        setTotal(count || (data ? data.length : 0));

        // fetch existing user_roles for the page users and seed accessMap
        try {
          const ids = (data || []).map((d) => d.id).filter(Boolean);

          if (ids.length) {
            const { data: urData, error: urErr } = await supabase
              .from('user_roles')
              .select('user_id, role_id')
              .in('user_id', ids);

            if (!urErr && urData) {
              setAccessMap((prev) => {
                const next = { ...prev };
                urData.forEach((row) => {
                  if (!row?.user_id) return;

                  const roleId = row.role_id;
                  const scope = rolesById?.[roleId]?.scope_level;

                  // ✅ ถ้าหา roleId ไม่เจอ ให้ fallback เป็น role แรกใน rolesList
                  next[row.user_id] = scope ?? (rolesList[0]?.scope_level ?? 'tpr');
                });
                return next;
              });
            }
          }
        } catch (e) {
          void e;
        }
      } catch (err) {
        setError(err?.message || String(err));
        setUsers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, rolesById, rolesList]
  );

  const handleAccessChange = React.useCallback(
    async (userId, newKey) => {
      // optimistic UI
      const previous = accessMap[userId];

      setAccessMap((prev) => ({ ...prev, [userId]: newKey }));
      setUpdatingMap((prev) => ({ ...prev, [userId]: true }));

      try {
        const scopeLower = String(newKey || '').toLowerCase();
        const role_id = rolesByKey?.[scopeLower]?.id ?? rolesList[0]?.id;

        if (!role_id) throw new Error('ไม่พบ Role ที่เลือก');

        const payload = { user_id: userId, role_id };

        // safe select -> update or insert flow.
        const { data: existing, error: selErr } = await supabase
          .from('user_roles')
          .select('id, role_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (selErr) throw selErr;

        if (existing && existing.id) {
          const { error: upErr } = await supabase.from('user_roles').update({ role_id }).eq('id', existing.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from('user_roles').insert([payload]);
          if (insErr) throw insErr;
        }

        // verify write
        const { data: verify, error: verifyErr } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (verifyErr) throw verifyErr;
        if (!verify || verify.role_id !== role_id) throw new Error('ไม่พบข้อมูลการตั้งค่าที่บันทึกไว้ (การยืนยันล้มเหลว)');

        const persistedRoleId = verify.role_id;
        const persistedScope = rolesById?.[persistedRoleId]?.scope_level ?? scopeLower;

        setAccessMap((prev) => ({ ...prev, [userId]: persistedScope }));
        setSnackbar({ open: true, message: 'บันทึกเรียบร้อย', severity: 'success' });
      } catch (err) {
        setAccessMap((prev) => ({ ...prev, [userId]: previous }));
        console.error('Failed to save user_roles:', err);

        const msg =
          err?.message ??
          (err && typeof err === 'object' ? JSON.stringify(err) : String(err));

        setSnackbar({ open: true, message: msg || 'ไม่สามารถบันทึกได้', severity: 'error' });
      } finally {
        setUpdatingMap((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [rolesByKey, rolesList, rolesById, accessMap]
  );

  // reset to first page when rowsPerPage changes
  React.useEffect(() => {
    setPage(0);
  }, [rowsPerPage]);

  React.useEffect(() => {
    fetchPage(page, rowsPerPage, appliedSearch);
  }, [page, rowsPerPage, fetchPage, appliedSearch]);

  // Initialize per-row access selection when users change
  React.useEffect(() => {
    setAccessMap((prev) => {
      const next = { ...prev };
      (users || []).forEach((u) => {
        if (!u?.id) return;
        if (next[u.id] === undefined) {
          next[u.id] = rolesList[0]?.scope_level ?? 'tpr';
        }
      });
      return next;
    });
  }, [users, rolesList]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">
          สิทธิ์การใช้งานระบบ
        </Typography>
      </Stack>

      {/* Filter Row - copied UX from unit-codes.jsx */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 2 }}
      >
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="permissions-search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="permissions-search-field-label"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="name">ชื่อ</MenuItem>
            <MenuItem value="email">อีเมล</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          fullWidth
          label="คำค้น"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setAppliedSearch({ field: searchField, text: searchInput });
              setPage(0);
            }
          }}
        />

        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<SearchIcon />}
            variant="outlined"
            onClick={() => {
              setAppliedSearch({ field: searchField, text: searchInput });
              setPage(0);
            }}
          >
            ค้นหา
          </Button>
          <Button
            startIcon={<ClearIcon />}
            color="inherit"
            onClick={() => {
              setSearchInput('');
              setAppliedSearch({ field: 'email', text: '' });
              setSearchField('email');
              setPage(0);
            }}
          >
            ล้าง
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>

          {String(error).includes('public.users') && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                ตาราง `public.users` ไม่พบ
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ข้อมูลผู้ใช้งานของคุณอยู่ใน schema `auth.users` (Supabase Authentication). สร้าง view ใน schema `public`
                หรือให้ API กลางในการอ่าน auth.users
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {!error && (
        <TableContainer sx={{ borderRadius: 2 }}>
          <Table
            size="small"
            sx={{
              '& th, & td': { borderRight: '1px solid', borderColor: 'divider' },
              '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อ</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>อีเมล</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>สร้างเมื่อ</TableCell>
                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">
                  เข้าใช้งานระบบ
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">กำลังโหลดข้อมูล...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" sx={{ py: 2 }}>
                      ไม่พบข้อมูล
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  let name = '';
                  const meta = u.user_metadata ?? u.raw_user_meta_data;

                  if (meta) {
                    try {
                      let parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
                      if (parsed && parsed.user_metadata && typeof parsed.user_metadata === 'object') parsed = parsed.user_metadata;
                      name = parsed?.full_name ?? parsed?.display_name ?? parsed?.name ?? parsed?.user_name ?? '';
                    } catch (e) {
                      void e;
                    }
                  }

                  if (!name && u.email) {
                    try {
                      const local = String(u.email).split('@')[0] || '';
                      name = local
                        .replace(/[_.\-+]+/g, ' ')
                        .split(' ')
                        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
                        .join(' ')
                        .trim();
                    } catch (e) {
                      void e;
                    }
                  }

                  const created = u.created_at
                    ? (() => {
                        try {
                          const d = new Date(u.created_at);
                          return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
                        } catch (e) {
                          void e;
                          return '';
                        }
                      })()
                    : '';

                  const currentScope = accessMap[u.id] ?? (rolesList[0]?.scope_level ?? 'tpr');

                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>{name || ''}</TableCell>
                      <TableCell>{u.email || ''}</TableCell>
                      <TableCell>{created}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <FormControl size="small" sx={{ minWidth: 160, '& .MuiSelect-select': { fontSize: '0.8125rem' } }}>
                          <Select
                            value={currentScope}
                            onChange={(e) => handleAccessChange(u.id, e.target.value)}
                            size="small"
                            sx={{ fontSize: '0.8125rem' }}
                            disabled={!!updatingMap[u.id]}
                            renderValue={(val) => String(val).toUpperCase()}
                          >
                            {(rolesList || []).map((r) => (
                              <MenuItem
                                key={r.scope_level}
                                value={r.scope_level}
                                sx={{ fontSize: '0.8125rem' }}
                              >
                                {r.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="จำนวนแถวต่อหน้า"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
