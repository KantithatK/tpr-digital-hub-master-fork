// ===== TeamsTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import {
  Box,
  Stack,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Skeleton,
  Alert,
  InputAdornment,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import { supabase } from '../../../../lib/supabaseClient';

// ✅ iOS style Switch (ตาม MUI docs)
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';

const IOSSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '200ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        opacity: 1,
        border: 0,
        backgroundColor: theme.palette.mode === 'dark' ? '#08d84c' : '#09db4f',
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    opacity: 1,
    backgroundColor: theme.palette.mode === 'dark' ? '#39393D' : '#E9E9EA',
    transition: theme.transitions.create(['background-color'], {
      duration: 200,
    }),
  },
}));

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

function TeamListSkeleton() {
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
                <Skeleton variant="text" width={180} height={22} />
                <Skeleton variant="rounded" width={96} height={22} sx={{ borderRadius: 999 }} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 2 }}>
                <Skeleton variant="text" width={220} />
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

export default function TeamsTab({ notify, employees, positionMap }) {
  const [teams, setTeams] = React.useState([]);
  const [loadingTeams, setLoadingTeams] = React.useState(false);
  const [teamsError, setTeamsError] = React.useState('');
  const [teamSearch, setTeamSearch] = React.useState('');

  const defaultTeam = React.useMemo(
    () => ({
      id: null,
      team_code: '',
      team_name: '',
      positions: [],
      team_lead_id: null,
      description: '',
      is_active: true,
    }),
    []
  );

  const [editingTeam, setEditingTeam] = React.useState({ ...defaultTeam });
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false);
  const [savingTeam, setSavingTeam] = React.useState(false);

  const [deletingMap, setDeletingMap] = React.useState({});
  const [teamDeleteDialogOpen, setTeamDeleteDialogOpen] = React.useState(false);
  const [teamDeleteTarget, setTeamDeleteTarget] = React.useState(null);

  // position picker dialog
  const [posDialogOpen, setPosDialogOpen] = React.useState(false);
  const [tempPositions, setTempPositions] = React.useState([]);
  const [posSearch, setPosSearch] = React.useState('');

  // team lead picker dialog
  const [leadDialogOpen, setLeadDialogOpen] = React.useState(false);
  const [tempLeadId, setTempLeadId] = React.useState(null);
  const [leadSearch, setLeadSearch] = React.useState('');

  // ✅ unify outlined input border to divider for dialogs (default/hover/focus)
  const inputSx = React.useMemo(
    () => ({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
    }),
    []
  );

  const positionsList = React.useMemo(() => {
    const map = positionMap || {};
    return Object.keys(map).map((id) => ({ id, name: map[id] }));
  }, [positionMap]);

  const filteredPositionsList = React.useMemo(() => {
    const q = (posSearch || '').trim().toLowerCase();
    if (!q) return positionsList;
    return (positionsList || []).filter((p) => String(p.name || '').toLowerCase().includes(q));
  }, [positionsList, posSearch]);

  const filteredEmployees = React.useMemo(() => {
    const q = String(leadSearch || '').trim().toLowerCase();
    const list = Array.isArray(employees) ? employees : [];
    if (!q) return list;

    return list.filter((emp) => {
      const name =
        `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''}`.trim() +
        (emp.last_name_th ? ` ${emp.last_name_th}` : '');
      const blob = [name, emp.email, emp.id].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [employees, leadSearch]);

  const getLeadName = React.useCallback(
    (team_lead_id) => {
      const lead = (employees || []).find((e) => e.id === team_lead_id) || null;
      if (!lead) return '-';
      const name =
        `${lead.title_th ? lead.title_th + ' ' : ''}${lead.first_name_th || ''}`.trim() +
        (lead.last_name_th ? ` ${lead.last_name_th}` : '');
      return name || lead.email || lead.id || '-';
    },
    [employees]
  );

  const loadTeams = React.useCallback(async () => {
    setLoadingTeams(true);
    setTeamsError('');
    try {
      const { data, error } = await supabase
        .from('tpr_project_teams')
        .select('*, tpr_project_team_positions(position_id)')
        .order('team_code', { ascending: true })
        .limit(2000);

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      const normalized = list.map((t) => {
        const pos = Array.isArray(t.tpr_project_team_positions)
          ? t.tpr_project_team_positions.map((x) => x.position_id).filter(Boolean)
          : [];
        return { ...t, positions: pos };
      });

      setTeams(normalized);
    } catch (err) {
      console.error('Failed to load teams', err);
      setTeamsError(err?.message || 'ไม่สามารถโหลดรายการทีมได้');
      setTeams([]);
      notify?.error?.(err?.message || 'ไม่สามารถโหลดรายการทีมได้');
    } finally {
      setLoadingTeams(false);
    }
  }, [notify]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadTeams();
    })();
    return () => {
      mounted = false;
    };
  }, [loadTeams]);

  function openTeamDialog(existing = null) {
    if (existing) {
      setEditingTeam({
        id: existing.id ?? null,
        team_code: existing.team_code ?? '',
        team_name: existing.team_name ?? '',
        positions: Array.isArray(existing.positions) ? existing.positions : [],
        team_lead_id: existing.team_lead_id ?? null,
        description: existing.description ?? '',
        is_active: existing.is_active === false ? false : true,
      });
    } else {
      setEditingTeam({ ...defaultTeam });
    }
    setTeamDialogOpen(true);
  }

  function closeTeamDialog() {
    setTeamDialogOpen(false);
  }

  async function getCurrentUserLabel() {
    try {
      if (supabase.auth?.getUser) {
        const { data } = await supabase.auth.getUser();
        const u = data?.user ?? null;
        return u?.email ?? u?.id ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  async function saveTeam() {
    if (!String(editingTeam.team_code || '').trim()) {
      notify?.warning?.('โปรดระบุรหัสทีม');
      return;
    }
    if (!String(editingTeam.team_name || '').trim()) {
      notify?.warning?.('โปรดระบุชื่อทีม');
      return;
    }

    setSavingTeam(true);
    try {
      const userLabel = await getCurrentUserLabel();

      const payload = {
        team_code: String(editingTeam.team_code || '').trim(),
        team_name: String(editingTeam.team_name || '').trim(),
        team_lead_id: editingTeam.team_lead_id || null,
        description: editingTeam.description || null,
        is_active: editingTeam.is_active === false ? false : true,
      };

      let teamId = editingTeam.id;

      if (editingTeam.id) {
        const updatePayload = { ...payload };
        if (userLabel) updatePayload.updated_by = userLabel;

        const { data, error } = await supabase
          .from('tpr_project_teams')
          .update(updatePayload)
          .eq('id', editingTeam.id)
          .select()
          .maybeSingle();

        if (error) throw error;
        teamId = data?.id ?? teamId;
      } else {
        const insertPayload = { ...payload };
        if (userLabel) insertPayload.created_by = userLabel;

        const { data, error } = await supabase
          .from('tpr_project_teams')
          .insert([insertPayload])
          .select()
          .maybeSingle();

        if (error) throw error;
        teamId = data?.id ?? null;
      }

      if (teamId) {
        const { error: delErr } = await supabase.from('tpr_project_team_positions').delete().eq('team_id', teamId);
        if (delErr) throw delErr;

        const positionsToInsert = (editingTeam.positions || [])
          .filter(Boolean)
          .map((pid) => ({ team_id: teamId, position_id: pid }));

        if (positionsToInsert.length > 0) {
          const { error: insErr } = await supabase.from('tpr_project_team_positions').insert(positionsToInsert);
          if (insErr) throw insErr;
        }
      }

      notify?.success?.('บันทึกทีมเรียบร้อย');
      setTeamDialogOpen(false);
      await loadTeams();
    } catch (err) {
      console.error('Failed to save team', err);
      notify?.error?.(err?.message || 'ไม่สามารถบันทึกทีมได้');
    } finally {
      setSavingTeam(false);
    }
  }

  function askDeleteTeam(team) {
    setTeamDeleteTarget(team ?? null);
    setTeamDeleteDialogOpen(true);
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
    setDeletingMap((prev) => ({ ...prev, [id]: true }));

    try {
      const { error: delPosErr } = await supabase.from('tpr_project_team_positions').delete().eq('team_id', id);
      if (delPosErr) throw delPosErr;

      const { error } = await supabase.from('tpr_project_teams').delete().eq('id', id);
      if (error) throw error;

      setTeams((prev) => (prev || []).filter((x) => x.id !== id));
      notify?.success?.('ลบทีมเรียบร้อย');
    } catch (err) {
      console.error('Failed to delete team', err);
      notify?.error?.(err?.message || 'ไม่สามารถลบทีมได้');
    } finally {
      setDeletingMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setTeamDeleteTarget(null);
    }
  }

  const filteredTeams = React.useMemo(() => {
    const q = (teamSearch || '').trim().toLowerCase();
    if (!q) return teams || [];
    return (teams || []).filter(
      (t) => String(t.team_code || '').toLowerCase().includes(q) || String(t.team_name || '').toLowerCase().includes(q)
    );
  }, [teams, teamSearch]);

  const StatusChip = ({ active }) => (
    <Chip
      size="small"
      label={active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
      variant={active ? 'filled' : 'outlined'}
      sx={{
        borderRadius: 999,
        fontWeight: 600,
        ...(active ? { bgcolor: 'rgba(16,185,129,0.14)', color: 'rgb(5,150,105)' } : { bgcolor: 'transparent' }),
      }}
    />
  );

  const flatBtnSx = { boxShadow: 'none', '&:hover': { boxShadow: 'none' } };
  const flatIconBtnSx = { boxShadow: 'none' };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
      {/* ===== Header ===== */}
      {loadingTeams ? (
        <Box>
          <HeaderSkeleton />
        </Box>
      ) : (
        <Box>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ทีมงาน (Teams)
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <TextField
                size="small"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
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
                  <IconButton onClick={loadTeams} disabled={loadingTeams} size="small" sx={flatIconBtnSx}>
                    <RefreshRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Button
                onClick={() => openTeamDialog(null)}
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
                เพิ่มทีม
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ===== Body ===== */}
      <Box>
        {teamsError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {teamsError}
          </Alert>
        ) : null}

        <Paper variant="outlined" sx={{ border: 'none' }}>
          {loadingTeams ? (
            <Box sx={{ p: 1 }}>
              <TeamListSkeleton />
            </Box>
          ) : filteredTeams.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">ไม่พบทีมงาน</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {filteredTeams.map((t) => {
                const posNames = (t.positions || []).map((id) => positionMap?.[id] || id).join(', ');
                const active = t.is_active === false ? false : true;
                const deleting = deletingMap[t.id];

                return (
                  <Box
                    key={t.id}
                    onClick={() => openTeamDialog(t)}
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
                            title={`${t.team_code || ''} - ${t.team_name || ''}`}
                          >
                            {(t.team_code ? `${t.team_code} - ` : '') + (t.team_name || '')}
                          </Typography>

                          <StatusChip active={active} />
                        </Stack>

                        <Stack  direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.25, md: 2 }} sx={{ mt: 0.5 }}>
                          <MetaRow label="ทีม:" value={posNames || ''} />
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="ลบ">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                askDeleteTeam(t);
                              }}
                              disabled={deleting}
                              sx={flatIconBtnSx}
                            >
                              {deleting ? <CircularProgress size={18} /> : <DeleteOutlineRoundedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Box>

      {/* ===== Team Dialog ===== */}
      <Dialog open={teamDialogOpen} onClose={closeTeamDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{editingTeam.id ? 'แก้ไข' : 'เพิ่ม'}</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="รหัสทีม *"
                fullWidth
                size="small"
                value={editingTeam.team_code}
                onChange={(e) => setEditingTeam((prev) => ({ ...prev, team_code: e.target.value }))}
                sx={inputSx}
              />
              <TextField
                label="ชื่อทีม *"
                fullWidth
                size="small"
                value={editingTeam.team_name}
                onChange={(e) => setEditingTeam((prev) => ({ ...prev, team_name: e.target.value }))}
                sx={inputSx}
              />
            </Stack>

            {/* positions picker */}
            <TextField
              label="ตำแหน่ง"
              fullWidth
              size="small"
              value={(editingTeam.positions || []).map((id) => positionMap?.[id] || id).join(', ')}
              sx={inputSx}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setTempPositions(Array.isArray(editingTeam.positions) ? [...editingTeam.positions] : []);
                        setPosDialogOpen(true);
                      }}
                      aria-label="เลือกตำแหน่ง"
                      sx={flatIconBtnSx}
                    >
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* team lead (picker dialog) */}
            <TextField
              label="หัวหน้าทีม"
              fullWidth
              size="small"
              value={editingTeam.team_lead_id ? getLeadName(editingTeam.team_lead_id) : ''}
              placeholder="-- ไม่ระบุ --"
              sx={{ ...inputSx, display: 'none' }}
              
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setTempLeadId(editingTeam.team_lead_id ?? null);
                        setLeadSearch('');
                        setLeadDialogOpen(true);
                      }}
                      aria-label="ค้นหาหัวหน้าทีม"
                      sx={flatIconBtnSx}
                    >
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="รายละเอียดทีม"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={editingTeam.description}
              onChange={(e) => setEditingTeam((prev) => ({ ...prev, description: e.target.value }))}
              sx={inputSx}
            />

            {/* ✅ สถานะ (ย้ายลงล่างสุด + ใช้ iOS Switch) */}
            <Box
              sx={{
                mt: 0.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: 1.25,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>สถานะทีม</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {editingTeam.is_active === false ? 'ปิดการใช้งานทีมนี้' : 'เปิดใช้งานทีมนี้'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusChip active={editingTeam.is_active === false ? false : true} />
                <IOSSwitch
                  checked={editingTeam.is_active === false ? false : true}
                  onChange={(e) => setEditingTeam((prev) => ({ ...prev, is_active: e.target.checked }))}
                  inputProps={{ 'aria-label': 'สถานะทีม' }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={closeTeamDialog} sx={{ color: 'common.black', boxShadow: 'none', '&:hover': { boxShadow: 'none' } }} disabled={savingTeam} disableElevation>
            ยกเลิก
          </Button>

          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveTeam} disabled={savingTeam} disableElevation>
            {savingTeam ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Positions Dialog ===== */}
      <Dialog open={posDialogOpen} onClose={() => setPosDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>เลือกตำแหน่ง</DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={posSearch}
            onChange={(e) => setPosSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {(filteredPositionsList || []).map((p) => (
              <FormControlLabel
                key={p.id}
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    size="small"
                    color="error"
                    checked={(tempPositions || []).includes(p.id)}
                    onChange={() => {
                      setTempPositions((prev) => {
                        const cur = Array.isArray(prev) ? [...prev] : [];
                        const idx = cur.indexOf(p.id);
                        if (idx === -1) cur.push(p.id);
                        else cur.splice(idx, 1);
                        return cur;
                      });
                    }}
                  />
                }
                label={p.name}
              />
            ))}
          </Box>

          {(filteredPositionsList || []).length === 0 ? (
            <Typography color="text.secondary" sx={{ pt: 2 }}>
              ไม่พบตำแหน่ง
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button onClick={() => setPosDialogOpen(false)} sx={{ color: 'common.black', ...flatBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              setEditingTeam((prev) => ({
                ...prev,
                positions: Array.isArray(tempPositions) ? [...tempPositions] : [],
              }));
              setPosDialogOpen(false);
              setPosSearch('');
            }}
            disableElevation
          >
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Team Lead Dialog ===== */}
      <Dialog
        open={leadDialogOpen}
        onClose={() => {
          setLeadDialogOpen(false);
          setLeadSearch('');
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>เลือกหัวหน้าทีม</DialogTitle>

        <DialogContent>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            sx={{ mb: 1, ...inputSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List dense sx={{ p: 0 }}>
            <ListItemButton selected={!tempLeadId} onClick={() => setTempLeadId(null)} />
            {(filteredEmployees || []).map((emp) => {
              const name =
                `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''}`.trim() +
                (emp.last_name_th ? ` ${emp.last_name_th}` : '');
              const primary = name || emp.email || emp.id;
              const secondary = name && emp.email ? emp.email : undefined;
              const selected = String(tempLeadId || '') === String(emp.id);

              return (
                <ListItemButton key={emp.id} selected={selected} onClick={() => setTempLeadId(emp.id)}>
                  <ListItemText primary={primary} secondary={secondary} />
                </ListItemButton>
              );
            })}
          </List>

          {(filteredEmployees || []).length === 0 ? (
            <Typography color="text.secondary" sx={{ pt: 2 }}>
              ไม่พบพนักงาน
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', gap: 1.25 }}>
          <Button
            onClick={() => {
              setLeadDialogOpen(false);
              setLeadSearch('');
            }}
            sx={{ color: 'common.black', ...flatBtnSx }}
            disableElevation
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              setEditingTeam((prev) => ({ ...prev, team_lead_id: tempLeadId || null }));
              setLeadDialogOpen(false);
              setLeadSearch('');
            }}
            disableElevation
          >
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Delete Confirm ===== */}
      <Dialog
        open={teamDeleteDialogOpen}
        onClose={() => {
          setTeamDeleteDialogOpen(false);
          setTeamDeleteTarget(null);
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>
            ยืนยันการลบทีม &quot;{teamDeleteTarget?.team_name ?? teamDeleteTarget?.team_code ?? ''}&quot; หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', gap: 1.25 }}>
          <Button
            onClick={() => {
              setTeamDeleteDialogOpen(false);
              setTeamDeleteTarget(null);
            }}
            sx={{ color: 'common.black', ...flatBtnSx }}
            disableElevation
          >
            ยกเลิก
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteTeam}
            disabled={deletingMap[String(teamDeleteTarget?.id ?? '')]}
            disableElevation
          >
            {deletingMap[String(teamDeleteTarget?.id ?? '')] ? (
              <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
            ) : null}
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
