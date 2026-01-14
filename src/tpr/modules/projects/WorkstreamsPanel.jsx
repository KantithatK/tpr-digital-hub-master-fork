import ProjectWbs from './ProjectWbs.jsx';
import * as React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { listWorkstreams, createWorkstream } from '@/api/workstreams';
import { computeRatesForPositions } from '@/api/supabaseData';
import { supabase } from '@/lib/supabaseClient';

export default function WorkstreamsPanel({ projectId }) {
  const [wbsDialogOpen, setWbsDialogOpen] = React.useState(false);
  const [selectedWorkstream, setSelectedWorkstream] = React.useState(null);
  const [wbsSummary, setWbsSummary] = React.useState({ phasesCount: 0, tasksCount: 0, totalPlannedHours: 0, totalFees: 0 });
  // set Day.js locale to Thai for pickers
  dayjs.locale('th');
  const [rows, setRows] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [employeeDialogOpen, setEmployeeDialogOpen] = React.useState(false);
  const [employeeSearch, setEmployeeSearch] = React.useState('');
  const [selectedEmployeeKey, setSelectedEmployeeKey] = React.useState(null);
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false);
  const [teamsList, setTeamsList] = React.useState([]);
  // no loading UI yet; omit state to satisfy linter
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState('error');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [toDeleteWorkstream, setToDeleteWorkstream] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [form, setForm] = React.useState({ code: '', name: '', description: '', team_department: '', team_id: null, budget_amount: '', planned_hours: '', start_date: '', end_date: '', status: 'ยังไม่เริ่ม', owner: '' });

  const load = React.useCallback(async () => {
    if (!projectId) { setRows([]); return; }
    const { data, error } = await listWorkstreams(projectId);
    if (error) { setRows([]); return; }
    setRows(data || []);
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  // load employees for leader picker
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('employees').select('id, first_name_th, last_name_th, title_en, first_name_en, last_name_en, nickname_th, nickname_en, employee_code, image_url').order('employee_code', { ascending: true }).limit(1000);
        if (!mounted) return;
        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        console.error('Failed to load employees for workstream panel', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const formatEmployee = (emp) => {
    if (!emp) return '';
    const thParts = [(emp.first_name_th || ''), (emp.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
    if (thParts.length) return thParts.join(' ');
    const enParts = [(emp.title_en || ''), (emp.first_name_en || ''), (emp.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
    if (enParts.length) return enParts.join(' ');
    const nick = (emp.nickname_th || emp.nickname_en || '').toString().trim();
    if (nick) return nick;
    return (emp.employee_code || emp.id || '').toString();
  };

  const openNew = () => { setSnackbarOpen(false); setForm({ code: '', name: '', description: '', team_department: '', team_id: null, budget_amount: '', planned_hours: '', start_date: '', end_date: '', status: 'ยังไม่เริ่ม' }); setEditingId(null); setDialogOpen(true); };
  const closeNew = () => { setDialogOpen(false); setEditingId(null); };

  const validate = () => {
    const missing = [];
    if (!String(form.code || '').trim()) missing.push('รหัส แผนงานโครงการ');
    if (!String(form.name || '').trim()) missing.push('ชื่อ แผนงานโครงการ');
    if (!String(form.team_department || '').trim()) missing.push('ทีม');
    if (String(form.budget_amount || '').trim() === '' || Number.isNaN(Number(form.budget_amount))) missing.push('งบประมาณ');
    return missing;
  };

  const save = async () => {
    const missing = validate();
    if (missing.length) { setSnackbarMessage(`กรุณากรอก/เลือก: ${missing.join(', ')}`); setSnackbarOpen(true); return; }
    setSaving(true);
    const payload = {
      project_id: projectId,
      code: form.code,
      name: form.name,
      description: form.description || null,
      team_department: form.team_department || null,
      budget_amount: Number(form.budget_amount || 0),
      planned_hours: Number(form.planned_hours || 0),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status || 'ยังไม่เริ่ม',
      owner: form.owner || null,
      team_id: form.team_id || null,
    };
    // Validate against project fees_budget (tpr_project_finances.fees_budget)
    try {
      const { data: finRow, error: finErr } = await supabase
        .from('tpr_project_finances')
        .select('fees_budget')
        .eq('project_id', projectId)
        .limit(1) 
        .single();
      if (!finErr && finRow && finRow.fees_budget !== null && finRow.fees_budget !== undefined) {
        const feesBudget = Number(finRow.fees_budget) || 0;
        if (feesBudget > 0) {
          // sum existing workstream budgets (use local `rows` state)
          const existingSum = (rows || []).reduce((s, r) => s + (Number(r.budget_amount) || 0), 0);
          let baseline = existingSum;
          if (editingId) {
            const existing = (rows || []).find(r => String(r.id) === String(editingId));
            if (existing) baseline = existingSum - (Number(existing.budget_amount) || 0);
          }
          const projectedTotal = baseline + (Number(payload.budget_amount) || 0);
          if (projectedTotal > feesBudget) {
            setSaving(false);
            setSnackbarSeverity('error');
            setSnackbarMessage(`ไม่สามารถบันทึกได้: งบรวมของแผนงาน ${projectedTotal.toLocaleString('th-TH')} บาท เกินงบค่าบริการของโครงการ (${feesBudget.toLocaleString('th-TH')} บาท)`);
            setSnackbarOpen(true);
            return;
          }
        }
      }
    } catch (err) {
      // non-blocking: log and proceed if finance check fails
      console.error('WorkstreamsPanel.save:feesBudgetCheck:error', err);
    }
    
    try {
      if (editingId) {
        // update existing workstream
        const { data: updatedRows, error: updateErr } = await supabase.from('tpr_workstreams').update(payload).eq('id', editingId).select().limit(1).single();
        setSaving(false);
        if (updateErr) throw updateErr;
        
        setRows(prev => (prev || []).map(r => (String(r.id) === String(editingId) ? updatedRows : r)));
        setDialogOpen(false);
        setEditingId(null);
      } else {
        const { data, error } = await createWorkstream(payload);
        if (error) { throw error; }
        
        // After creating a new workstream, insert team positions into tpr_project_role_rates
        try {
          if (payload.team_id && projectId) {
            
            // 1) fetch positions mapped to the selected team
            const { data: teamPosRows, error: teamPosErr } = await supabase
              .from('tpr_project_team_positions')
              .select('position_id')
              .eq('team_id', payload.team_id)
              .limit(2000);
            if (teamPosErr) throw teamPosErr;
            
            let posIds = Array.from(new Set((teamPosRows || []).map(r => r && r.position_id).filter(Boolean).map(String)));
            

            // Fallback: if team has no mapped positions, use team leader's position
            if (posIds.length === 0) {
              try {
                const { data: teamRow, error: teamErr } = await supabase
                  .from('tpr_project_teams')
                  .select('team_lead_id') 
                  .eq('id', payload.team_id)
                  .limit(1)
                  .single();
                if (teamErr) throw teamErr;
                const leadId = teamRow?.team_lead_id || null;
                
                if (leadId) {
                  const { data: leadEmp, error: empErr } = await supabase
                    .from('employees')
                    .select('id, position_id')
                    .eq('id', leadId)
                    .limit(1)
                    .single();
                  if (empErr) throw empErr;
                  const leadPositionId = leadEmp?.position_id ? String(leadEmp.position_id) : null;
                  
                  if (leadPositionId) posIds = [leadPositionId];
                }
              } catch (fbErr) {
                console.error('WorkstreamsPanel.save:fallback:error', fbErr);
              }
            }

            if (posIds.length) {
              // 2) get existing project role rates for this project to avoid unique conflicts
              const { data: existingRateRows, error: existingErr } = await supabase
                .from('tpr_project_role_rates')
                .select('position_id')
                .eq('project_id', projectId)
                .limit(5000);
              if (existingErr) throw existingErr;
              const existingIds = Array.from(new Set((existingRateRows || []).map(r => String(r.position_id))));
              const toInsert = posIds.filter(pid => !existingIds.includes(String(pid)));
              
              

              if (toInsert.length) {
                // Compute rates via shared helper
                const { data: ratesMap, error: compErr } = await computeRatesForPositions(toInsert);
                if (compErr) throw compErr;
                const payloadRates = toInsert.map(pid => {
                  const r = ratesMap[String(pid)] || { bill_rate: 0, cost_rate: 0 };
                  return { project_id: projectId, position_id: pid, bill_rate: r.bill_rate || 0, cost_rate: r.cost_rate || 0 };
                });
                // Use upsert to avoid unique conflicts if rows already exist
                const { error: upsertErr } = await supabase
                  .from('tpr_project_role_rates')
                  .upsert(payloadRates, { onConflict: 'project_id,position_id' })
                  .select('id,project_id,position_id');
                if (upsertErr) throw upsertErr;
              }
            }
          }
        } catch (syncErr) {
          // Non-blocking: log and continue; creating a workstream should not fail because of role-rate sync
          console.error('WorkstreamsPanel.save:syncRoles:error', syncErr);
        }
        setSaving(false);
        setRows(prev => [data, ...(prev || [])]);
        
        setDialogOpen(false);
      }
    } catch (err) {
      console.error('WorkstreamsPanel.save:error', err);
      setSaving(false);
      setSnackbarMessage('บันทึก แผนงานโครงการ ล้มเหลว'); setSnackbarOpen(true);
      return;
    }
  };

  const deleteWorkstream = async (ws) => {
    
    try {
      // Check if there are any linked phases or tasks before deleting
      try {
        const { data: phaseRows, error: phaseErr } = await supabase
          .from('tpr_project_wbs_phases')
          .select('id')
          .eq('workstream_id', ws.id)
          .limit(1);
        if (phaseErr) throw phaseErr;
        if ((phaseRows || []).length > 0) {
          
          setSnackbarSeverity('error');
          setSnackbarMessage('ลบไม่ได้: มีเฟสงานผูกอยู่ในแผนงาน');
          setSnackbarOpen(true);
          return;
        }
        const { data: taskRows, error: taskErr } = await supabase
          .from('tpr_project_wbs_tasks')
          .select('id')
          .eq('workstream_id', ws.id)
          .limit(1);
        if (taskErr) throw taskErr;
        if ((taskRows || []).length > 0) {
          
          setSnackbarSeverity('error');
          setSnackbarMessage('ลบไม่ได้: มีงานย่อยผูกอยู่ในแผนงาน');
          setSnackbarOpen(true);
          return;
        }
      } catch (checkErr) {
        console.error('deleteWorkstream:checkLinkedWbs:error', checkErr);
        // If the check itself fails, we don't block the user silently — show an error
        setSnackbarSeverity('error');
        setSnackbarMessage('ไม่สามารถตรวจสอบความเกี่ยวข้องของเฟส/งาน ได้');
        setSnackbarOpen(true);
        return;
      }

      const { error } = await supabase.from('tpr_workstreams').delete().eq('id', ws.id);
      if (error) throw error;
      setRows(prev => (prev || []).filter(r => String(r.id) !== String(ws.id)));
      
      setSnackbarSeverity('success');
      setSnackbarMessage('ลบ แผนงานโครงการ สำเร็จ');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to delete workstream', err);
      setSnackbarSeverity('error');
      setSnackbarMessage('ลบ แผนงานโครงการ ล้มเหลว'); setSnackbarOpen(true);
    }
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    if (!toDeleteWorkstream) return;
    // call existing delete logic
    await deleteWorkstream(toDeleteWorkstream);
    setToDeleteWorkstream(null);
  };

  async function loadTeams() {
    try {
      const { data, error } = await supabase.from('tpr_project_teams').select('id,team_code,team_name,team_lead_id,is_active').order('team_code', { ascending: true }).limit(1000);
      if (error) throw error;
      setTeamsList((data || []).filter(t => t.is_active !== false));
    } catch (err) {
      console.error('Failed to load teams', err);
      setTeamsList([]);
    }
  }

  return (
    <>
      <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>แผนงานโครงการ</Typography>
          
        </Box>
        <IconButton aria-label="เพิ่มแผนงาน" onClick={openNew} size="small" sx={{ bgcolor: '#d32f2f', color: '#fff', '&:hover': { bgcolor: '#b71c1c' }, width: 36, height: 36 }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
            size="small"
            placeholder="ค้นหา รหัส / ชื่อ / ทีม"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{
              minWidth: 320,
              mb: 1,
              mt: 1,
              // make outline black when the field is focused
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#000',
              },
              // make label black when focused (if label added later)
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#000',
              },
            }}
            fullWidth
          />

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900, '& th, & td': { borderBottom: 'none' } }}>
        <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>รหัส</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ชื่อ</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ทีมงาน</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>หัวหน้าทีม</TableCell>
              {/* <TableCell sx={{ fontWeight: 700 }}>วันที่เริ่ม</TableCell> */}
              {/* <TableCell sx={{ fontWeight: 700 }}>วันที่สิ้นสุด</TableCell> */}
              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>งบประมาณ</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>งบคงเหลือ</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'right', display: 'none' }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>โครงสร้างงาน</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
          {(() => {
            const q = (searchQuery || '').toString().toLowerCase().trim();
            const filtered = (rows || []).filter(ws => {
              if (!q) return true;
              const hay = [ws.code, ws.name, ws.team_department, ws.owner_name].map(s => (s || '').toString().toLowerCase()).join(' ');
              return hay.indexOf(q) !== -1;
            });
            if ((filtered || []).length === 0) {
              return (
                <TableRow><TableCell colSpan={10}><Typography sx={{ textAlign: 'center' }} color="text.secondary">ยังไม่มี แผนงานโครงการ</Typography></TableCell></TableRow>
              );
            }
            return filtered.map(ws => {
              const remaining = Number(ws.budget_amount || 0) - Number(ws.spent_amount || 0);
              const leaderRec = (employees || []).find(e => String(e.id) === String(ws.owner));
              const leaderName = leaderRec ? formatEmployee(leaderRec) : (ws.owner_name || '-');
              return (
                <TableRow key={ws.id}>
                  <TableCell>{ws.code}</TableCell>
                  <TableCell>{ws.name}</TableCell>
                  <TableCell>{ws.team_department || '-'}</TableCell>
                  <TableCell>{leaderName}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{Number(ws.budget_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{remaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell sx={{ textAlign: 'right', display: 'none' }}>{ws.status || 'Planning'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button size="small" variant="outlined" onClick={() => { setSelectedWorkstream(ws); setWbsDialogOpen(true); }} sx={{ color: '#000', borderColor: '#000', '&:hover': { borderColor: '#000' } }}>ดูรายละเอียด</Button>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => {
                        setSnackbarOpen(false);
                        setForm({ code: ws.code || '', name: ws.name || '', description: ws.description || '', team_department: ws.team_department || '', team_id: ws.team_id || null, budget_amount: ws.budget_amount || '', planned_hours: ws.planned_hours || '', start_date: ws.start_date || '', end_date: ws.end_date || '', status: ws.status || 'ยังไม่เริ่ม', owner: ws.owner || '' });
                        setEditingId(ws.id);
                        setDialogOpen(true);
                      }} aria-label="แก้ไข">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setToDeleteWorkstream(ws); setDeleteDialogOpen(true); }} aria-label="ลบ">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            });
          })()}
        </TableBody>
        </Table>
      </Box>

      <Dialog open={dialogOpen} onClose={closeNew} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'แก้ไขแผนงาน' : 'เพิ่มแผนงาน'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="รหัส แผนงานโครงการ" size="small" value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} required />
            <TextField label="ชื่อ แผนงานโครงการ" size="small" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
            <TextField
              label="ทีมงาน"
              size="small"
              value={form.team_department}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton size="small" onClick={() => { loadTeams(); setTeamDialogOpen(true); }} aria-label="เลือกทีม">
                    <MoreHorizIcon />
                  </IconButton>
                ),
              }}
              required
            />
            <TextField label="งบประมาณ" size="small" type="number" value={form.budget_amount} onChange={e => setForm(prev => ({ ...prev, budget_amount: e.target.value }))} required inputProps={{ style: { textAlign: 'right' } }} />
            {/* <TextField label="ชั่วโมงที่วางแผน" size="small" type="number" value={form.planned_hours} onChange={e => setForm(prev => ({ ...prev, planned_hours: e.target.value }))} inputProps={{ style: { textAlign: 'right' } }} /> */}
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker
                label="วันที่เริ่ม"
                value={form.start_date ? dayjs(form.start_date) : null}
                onChange={(v) => setForm(prev => ({ ...prev, start_date: v ? dayjs(v).format('YYYY-MM-DD') : null }))}
                slotProps={{ textField: { size: 'small' } }} sx={{ flex: 1, minWidth: 160 }}
              />
              <DatePicker
                label="วันที่สิ้นสุด"
                value={form.end_date ? dayjs(form.end_date) : null}
                onChange={(v) => setForm(prev => ({ ...prev, end_date: v ? dayjs(v).format('YYYY-MM-DD') : null }))}
                slotProps={{ textField: { size: 'small' } }} sx={{ flex: 1, minWidth: 160 }}
              />
            </LocalizationProvider>
            <TextField
              label="หัวหน้าทีม"
              size="small"
              value={(employees || []).find(e => String(e.id) === String(form.owner)) ? formatEmployee((employees || []).find(e => String(e.id) === String(form.owner))) : ''}
              InputProps={{ readOnly: true }}
            />
            <TextField label="รายละเอียด" size="small" multiline minRows={2} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            <TextField label="สถานะ" size="small" select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} disabled sx={{ display: 'none' }}>
              {['ยังไม่เริ่ม', 'ทำอยู่', 'เสี่ยง', 'ล่าช้า', 'เสร็จแล้ว'].map(s => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNew} sx={{ color: 'common.black' }}>ยกเลิก</Button>
          <Button variant="contained" onClick={save} disabled={saving} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#111' } }}>บันทึก</Button>
        </DialogActions>

      
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setToDeleteWorkstream(null); }}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent dividers>
          <Box>
            {toDeleteWorkstream ? `ต้องการลบ แผนงาน ${toDeleteWorkstream.code || ''} ${toDeleteWorkstream.name || ''} หรือไม่?` : 'ต้องการลบ แผนงานหรือไม่?'}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setToDeleteWorkstream(null); }} sx={{ color: 'common.black' }}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={async () => { await confirmDelete(); }} sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>เลือกหัวหน้าทีม</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField size="small" placeholder="ค้นหาชื่อ หรือ รหัส" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} />
            <List dense>
              {(employees || []).filter(emp => {
                const q = (employeeSearch || '').toString().toLowerCase().trim();
                if (!q) return true;
                const hay = [emp.employee_code, emp.first_name_th, emp.last_name_th, emp.nickname_th, emp.first_name_en, emp.last_name_en, emp.nickname_en].map(s => (s || '').toString().toLowerCase()).join(' ');
                return hay.indexOf(q) !== -1;
              }).map(emp => (
                <ListItem key={emp.id} disablePadding>
                  <ListItemButton selected={String(selectedEmployeeKey) === String(emp.id)} onClick={() => { setForm(prev => ({ ...prev, owner: emp.id })); setSelectedEmployeeKey(emp.id); setEmployeeDialogOpen(false); }}>
                    <ListItemAvatar>
                      <Avatar src={emp.image_url}>{(emp.first_name_th || emp.first_name_en || '').toString().trim().charAt(0) || (emp.nickname_th || emp.nickname_en || '').toString().trim().charAt(0) || '?'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={formatEmployee(emp)} secondary={emp.employee_code || ''} />
                  </ListItemButton>
                </ListItem>
              ))}
              {(employees || []).filter(emp => {
                const q = (employeeSearch || '').toString().toLowerCase().trim();
                if (!q) return false;
                const hay = [emp.employee_code, emp.first_name_th, emp.last_name_th, emp.nickname_th, emp.first_name_en, emp.last_name_en, emp.nickname_en].map(s => (s || '').toString().toLowerCase()).join(' ');
                return hay.indexOf(q) !== -1;
              }).length === 0 && (
                  <ListItem><ListItemText primary="ไม่พบพนักงาน" /></ListItem>
                )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)} sx={{ color: 'common.black' }}>ปิด</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>เลือกทีมงาน</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <List dense>
              {(teamsList || []).map(team => {
                const leadRec = (employees || []).find(e => String(e.id) === String(team.team_lead_id));
                const leadName = leadRec ? formatEmployee(leadRec) : '';
                return (
                  <ListItem key={team.id} disablePadding>
                    <ListItemButton onClick={() => { setForm(prev => ({ ...prev, team_department: team.team_name || team.team_code || '', team_id: team.id, owner: team.team_lead_id || prev.owner })); setTeamDialogOpen(false); }}>
                      <ListItemAvatar>
                        <Avatar>{(team.team_name || team.team_code || '').toString().trim().charAt(0) || '?'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={`${team.team_code ? team.team_code + ' - ' : ''}${team.team_name || ''}`} secondary={leadName} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              {(teamsList || []).length === 0 && (
                <ListItem><ListItemText primary="ไม่พบงาน" /></ListItem>
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)} sx={{ color: 'common.black' }}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={wbsDialogOpen} onClose={() => { setWbsDialogOpen(false); setSelectedWorkstream(null); }} fullWidth maxWidth="xl">
        <DialogTitle sx={{ px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ fontWeight: 600 }}>{selectedWorkstream ? `${selectedWorkstream.code || ''} ${selectedWorkstream.name || ''}` : 'WBS'}</Box>
          </Box>
        </DialogTitle>
            <DialogContent dividers sx={{ height: '70vh', p: 2 }}>
          <Box sx={{ height: '100%', boxSizing: 'border-box' }}>
                <ProjectWbs projectId={projectId} contractValue={0} workstreamId={selectedWorkstream?.id} workstreamCode={selectedWorkstream?.code} showTeams={false} onChange={({ phases, tasks }) => {
                  try {
                    const ph = phases || [];
                    const ts = tasks || [];
                    const phasesCount = ph.length;
                    const tasksCount = ts.length;
                    const totalPlannedHours = ph.reduce((s, p) => s + (Number(p.planned_hours) || 0), 0);
                    const totalFees = ph.reduce((s, p) => s + (Number(p.fee) || 0), 0);
                    setWbsSummary({ phasesCount, tasksCount, totalPlannedHours, totalFees });
                  } catch (e) { console.error('ProjectWbs:onChange', e); }
                }} />
          </Box>
        </DialogContent>
            <DialogActions sx={{ px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
                {/* <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}><Box>เฟส:</Box><Box component="span" sx={{ fontWeight: 700 }}>{wbsSummary.phasesCount}</Box></Box> */}
                {/* <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}><Box>งานย่อย:</Box><Box component="span" sx={{ fontWeight: 700 }}>{wbsSummary.tasksCount}</Box></Box> */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}><Box>ชั่วโมงรวม:</Box><Box component="span" sx={{ fontWeight: 700 }}>{Number(wbsSummary.totalPlannedHours || 0).toLocaleString('th-TH')}</Box><Box> ชม.</Box></Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}><Box>ค่าบริการรวม:</Box><Box component="span" sx={{ fontWeight: 700 }}>{Number(wbsSummary.totalFees || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Box><Box> บาท</Box></Box>
              </Box>
              <Box>
                <Button onClick={() => { setWbsDialogOpen(false); setSelectedWorkstream(null); }} sx={{ color: 'common.black' }}>ปิด</Button>
              </Box>
            </DialogActions>
      </Dialog>

    </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>{snackbarMessage}</Alert>
      </Snackbar>
    </>
  );
}
