// ===== PermissionsTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import {
    Box,
    Stack,
    Paper,
    Typography,
    Avatar,
    TextField,
    Skeleton,
    InputAdornment,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton,
    Radio,
    RadioGroup,
    FormControlLabel,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

import { supabase } from '../../../../lib/supabaseClient';

dayjs.locale('th');

function normalizeText(v) {
    return (v ?? '').toString().trim();
}

function ListSkeletonCards() {
    const items = Array.from({ length: 10 }, (_, i) => i);
    return (
        <Box
            sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                },
            }}
        >
            {items.map((i) => (
                <Paper
                    key={i}
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        p: 1.5,
                    }}
                >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Skeleton variant="circular" width={34} height={34} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                        </Box>
                    </Stack>
                    <Box sx={{ mt: 1.25 }}>
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="75%" />
                        <Skeleton variant="text" width="65%" />
                    </Box>
                    <Box sx={{ mt: 1.25 }}>
                        <Skeleton variant="rounded" height={34} />
                    </Box>
                </Paper>
            ))}
        </Box>
    );
}

export default function PermissionsTab({ notify, employees, loadingEmployees, employeesError, positionMap, unitMap }) {
    const [search, setSearch] = React.useState('');

    const [rolesLoading, setRolesLoading] = React.useState(false);
    const [rolesList, setRolesList] = React.useState([]); // [{id,label}]
    const [rolesById, setRolesById] = React.useState({}); // { [id]: {id,label} }

    const [accessLoading, setAccessLoading] = React.useState(false);
    const [accessMap, setAccessMap] = React.useState({}); // { [emailLower]: roleIdOrEmpty }
    const [updatingMap, setUpdatingMap] = React.useState({}); // { [empId]: true }

    // dialog state
    const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
    const [activeEmp, setActiveEmp] = React.useState(null);
    const [tempRoleId, setTempRoleId] = React.useState('');

    const flatBtnSx = { boxShadow: 'none', '&:hover': { boxShadow: 'none' } };

    const getInitials = React.useCallback((emp) => {
        const fnTh = normalizeText(emp?.first_name_th);
        if (fnTh) return fnTh.charAt(0).toUpperCase();
        const fnEn = normalizeText(emp?.first_name_en);
        if (fnEn) return fnEn.charAt(0).toUpperCase();
        const fallback = normalizeText(emp?.employee_code || emp?.id);
        return fallback ? fallback.charAt(0).toUpperCase() : '';
    }, []);

    const resolvePosition = React.useCallback(
        (emp) => emp?.position || (emp?.position_id ? positionMap?.[String(emp.position_id)] || '' : '') || '-',
        [positionMap]
    );

    const resolveDepartment = React.useCallback(
        (emp) =>
            emp?.department_name ||
            (emp?.department_id ? unitMap?.[String(emp.department_id)] || String(emp.department_id) : '') ||
            emp?.unit ||
            emp?.dept_name ||
            '-',
        [unitMap]
    );

    const filteredEmployees = React.useMemo(() => {
        const q = normalizeText(search).toLowerCase();
        const list = Array.isArray(employees) ? employees : [];
        if (!q) return list;

        return list.filter((emp) => {
            const code = String(emp.employee_code || emp.id || '').toLowerCase();
            const nameTh = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`
                .trim()
                .toLowerCase();
            const nameEn = `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim().toLowerCase();
            const nid = String(emp.national_id || emp.id_card || emp.id_number || '').toLowerCase();
            const pos = String(resolvePosition(emp) || '').toLowerCase();
            const dept = String(resolveDepartment(emp) || '').toLowerCase();
            const email = String(emp.current_address_email_1 || emp.email || '').toLowerCase();

            return [code, nameTh, nameEn, nid, pos, dept, email].filter(Boolean).join(' ').includes(q);
        });
    }, [employees, search, resolveDepartment, resolvePosition]);

    async function getCurrentUserId() {
        try {
            if (supabase.auth?.getUser) {
                const { data } = await supabase.auth.getUser();
                return data?.user?.id ?? null;
            }
        } catch {
            // ignore
        }
        return null;
    }

    // ===== load roles (tpr_roles) =====
    const loadRoles = React.useCallback(async () => {
        setRolesLoading(true);
        try {
            const { data, error } = await supabase
                .from('tpr_roles')
                .select('id, name_th, name_en')
                .order('name_th', { ascending: true })
                .limit(2000);

            if (error) throw error;

            const list = (data || []).map((r) => ({
                id: r.id,
                label: normalizeText(r.name_th) || normalizeText(r.name_en) || String(r.id),
            }));

            const byId = {};
            list.forEach((r) => {
                byId[String(r.id)] = r;
            });

            setRolesList(list);
            setRolesById(byId);
        } catch (e) {
            console.error('loadRoles error', e);
            setRolesList([]);
            setRolesById({});
            notify?.error?.(e?.message || 'ไม่สามารถโหลดรายการสิทธิ์ได้');
        } finally {
            setRolesLoading(false);
        }
    }, [notify]);

    // ===== load bindings (tpr_user_role_bindings) =====
    const loadBindings = React.useCallback(async () => {
        setAccessLoading(true);
        try {
            const { data, error } = await supabase
                .from('tpr_user_role_bindings')
                .select('email, role_id, updated_at')
                .order('updated_at', { ascending: false })
                .limit(5000);

            if (error) throw error;

            // ✅ 1 email เอา role ล่าสุด (เพราะ UI เลือกได้ 1)
            const map = {};
            (data || []).forEach((x) => {
                const email = normalizeText(x.email).toLowerCase();
                if (!email) return;
                if (map[email]) return;
                map[email] = x.role_id ?? '';
            });

            setAccessMap(map);
        } catch (e) {
            console.error('loadBindings error', e);
            setAccessMap({});
            notify?.error?.(e?.message || 'ไม่สามารถโหลดสิทธิ์ผู้ใช้งานได้');
        } finally {
            setAccessLoading(false);
        }
    }, [notify]);

    React.useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    React.useEffect(() => {
        loadBindings();
    }, [loadBindings]);

    // ===== save change: 1 role per email (delete old -> insert new) =====
    const handleAccessChange = React.useCallback(
        async (emp, newRoleId) => {
            const empId = emp?.id;
            const emailKey = normalizeText(emp?.current_address_email_1 || emp?.email).toLowerCase();

            if (!empId) return;
            if (!emailKey) {
                notify?.warning?.('พนักงานยังไม่มีอีเมล จึงไม่สามารถบันทึกสิทธิ์ได้');
                return;
            }

            setUpdatingMap((prev) => ({ ...(prev || {}), [empId]: true }));

            try {
                // 1) ลบ role เดิมทั้งหมดของ email (ให้เหลือแค่ 1 ตาม UI)
                const delRes = await supabase.from('tpr_user_role_bindings').delete().eq('email', emailKey);
                if (delRes.error) throw delRes.error;

                // 2) ถ้าเลือก “ยังไม่กำหนดสิทธิ์” -> จบ
                if (!newRoleId) {
                    setAccessMap((prev) => ({ ...(prev || {}), [emailKey]: '' }));
                    notify?.success?.('ล้างสิทธิ์เรียบร้อย');
                    return;
                }

                // 3) insert ใหม่
                const userId = await getCurrentUserId();
                const payload = {
                    email: emailKey,
                    role_id: newRoleId,
                    ...(userId ? { created_by: userId, updated_by: userId } : {}),
                };

                const insRes = await supabase.from('tpr_user_role_bindings').insert([payload]);
                if (insRes.error) throw insRes.error;

                setAccessMap((prev) => ({ ...(prev || {}), [emailKey]: newRoleId }));
                notify?.success?.('อัปเดตสิทธิ์เรียบร้อย');
            } catch (e) {
                console.error('handleAccessChange error', e);
                notify?.error?.(e?.message || 'ไม่สามารถอัปเดตสิทธิ์ได้');
            } finally {
                setUpdatingMap((prev) => {
                    const next = { ...(prev || {}) };
                    delete next[empId];
                    return next;
                });
            }
        },
        [notify]
    );

    const openRoleDialog = (emp) => {
        const emailKey = normalizeText(emp?.current_address_email_1 || emp?.email).toLowerCase();
        const current = emailKey ? accessMap?.[emailKey] ?? '' : '';
        setActiveEmp(emp);
        setTempRoleId(current ? String(current) : '');
        setRoleDialogOpen(true);
    };

    const closeRoleDialog = () => {
        setRoleDialogOpen(false);
        setActiveEmp(null);
        setTempRoleId('');
    };

    const confirmRole = async () => {
        if (!activeEmp) return;
        await handleAccessChange(activeEmp, tempRoleId || '');
        closeRoleDialog();
    };

    const showSkeleton = !!loadingEmployees || rolesLoading || accessLoading;

    if (showSkeleton) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
                <Skeleton variant="rounded" height={40} width="100%" />
                <ListSkeletonCards />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
            {employeesError ? <Typography color="error">{employeesError}</Typography> : null}



            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        สิทธิ์ (Permissions)
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">

                    <TextField
                        size="small"
                        placeholder="ค้นหา"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}

                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: '100%', md: 420 },
                            background: 'white',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
                        }}
                    />
                </Stack>
            </Stack>

            {filteredEmployees.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">ไม่พบพนักงาน</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(3, minmax(0, 1fr))',
                            lg: 'repeat(3, minmax(0, 1fr))', // ✅ แถวละ 3 card
                        },

                        alignItems: 'stretch',
                    }}
                >
                    {filteredEmployees.map((emp) => {
                        const code = emp?.employee_code ?? emp?.id;

                        const nameTh =
                            `${emp?.first_name_th || ''}`.trim() +
                            (emp?.last_name_th ? ` ${emp.last_name_th}` : '');
                        const nameEn =
                            `${emp?.first_name_en || ''}`.trim() + (emp?.last_name_en ? ` ${emp.last_name_en}` : '');
                        const displayName = (nameTh.trim() || nameEn.trim()) || String(code || '');


                        const position = resolvePosition(emp);
                        const initials = getInitials(emp);

                        const emailKey = normalizeText(emp?.current_address_email_1 || emp?.email).toLowerCase();
                        const roleId = emailKey ? accessMap?.[emailKey] ?? '' : '';
                        const roleLabel = roleId ? rolesById?.[String(roleId)]?.label : '';

                        return (
                            <Paper
                                key={String(code)}
                                elevation={0}
                                onClick={() => openRoleDialog(emp)}
                                sx={{

                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    p: 1.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.25,
                                    transition: 'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                                    cursor: 'pointer', // ✅ hover pointer
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        borderColor: '#c7c7c7',
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                                    },
                                }}
                            >
                                <Stack direction="row" spacing={1.25} alignItems="center">
                                    <Avatar src={emp?.image_url || ''} alt={displayName} sx={{ width: 34, height: 34, fontSize: 14 }}>
                                        {!emp?.image_url ? initials : null}
                                    </Avatar>

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 500,
                                                lineHeight: 1.2,
                                                color: 'common.black',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                            title={displayName}
                                        >
                                            {displayName}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary">
                                            รหัส:{' '}
                                            <Box component="span" sx={{ color: 'text.primary' }}>
                                                {code}
                                            </Box>
                                            {''} ({position})
                                        </Typography>



                                    </Box>

                                </Stack>

                                <Divider sx={{ my: 0.25 }} />

                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">

                                    <Typography variant="caption" color="text.secondary" >
                                        {roleLabel || 'ยังไม่กำหนดสิทธิ์'}
                                    </Typography>

                                </Stack>



                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* Dialog เลือกสิทธิ์ (Radio) */}
            <Dialog open={roleDialogOpen} onClose={closeRoleDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box component="span">กำหนดสิทธิ์ผู้ใช้งาน</Box>
                    <IconButton onClick={closeRoleDialog} aria-label="ปิด">
                        <CloseRoundedIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    
                    <RadioGroup
                        value={tempRoleId}
                        onChange={(e) => setTempRoleId(e.target.value)}
                        sx={{
                            '& .MuiFormControlLabel-root': {
                                mx: 0,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                px: 1.25,
                                py: 0.75,
                                mb: 1,
                                alignItems: 'flex-start',
                                transition: 'border-color 120ms ease, background 120ms ease',
                                '&:hover': { borderColor: '#c7c7c7', bgcolor: 'rgba(0,0,0,0.02)' },
                            },
                        }}
                    >
                        <FormControlLabel
                            value=""
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography sx={{  lineHeight: 1.2 }}>ยังไม่กำหนดสิทธิ์</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ใช้กรณีต้องการล้างสิทธิ์ออก
                                    </Typography>
                                </Box>
                            }
                        />

                        {(rolesList || []).map((r) => (
                            <FormControlLabel
                                key={String(r.id)}
                                value={String(r.id)}
                                control={<Radio />}
                                label={<Typography sx={{ fontWeight: 500, lineHeight: 1.2 }}>{r.label || '—'}</Typography>}
                            />
                        ))}
                    </RadioGroup>

                    {activeEmp && !normalizeText(activeEmp?.current_address_email_1 || activeEmp?.email) ? (
                        <Typography variant="caption" color="text.secondary">
                            * พนักงานไม่มีอีเมล จึงบันทึกสิทธิ์ไม่ได้
                        </Typography>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
                    <Button onClick={closeRoleDialog} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveRoundedIcon />}
                        onClick={confirmRole}
                        sx={flatBtnSx} // ✅ flat ไม่มีเงา
                        disableElevation
                        disabled={
                            !activeEmp ||
                            !!updatingMap?.[activeEmp?.id] ||
                            !normalizeText(activeEmp?.current_address_email_1 || activeEmp?.email)
                        }
                    >
                        บันทึก
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
