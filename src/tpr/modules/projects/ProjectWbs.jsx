import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { fetchMasterPositions, fetchProjectPositions } from '../../../api/supabaseData';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
// use horizontal ellipsis for inline owner controls; `MoreHorizIcon` is already imported above
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import TableContainer from '@mui/material/TableContainer';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MenuList from '@mui/material/MenuList';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import 'dayjs/locale/th';
import { supabase } from '@/lib/supabaseClient';
import { Divider } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

dayjs.locale('th');

// Format date values for display as DD/MM/YYYY (ว-ด-ปี).
// Accepts strings or Dayjs-compatible values; returns '-' when invalid/missing.
const formatDate = (val) => {
  if (!val) return '-';
  try {
    const d = dayjs(val);
    return d && d.isValid() ? d.format('DD/MM/YYYY') : '-';
  } catch {
    return '-';
  }
};

// Validate subtask dates against parent phase dates
// start_date, end_date, phase_start, phase_end are strings in 'YYYY-MM-DD' format
// Returns: { valid: boolean, start_date: string, end_date: string, error?: string }
function validateSubtaskDate(start_date, end_date, phase_start, phase_end, autoAdjust = false) {
  try {
    // normalize inputs
    const s = start_date ? dayjs(start_date) : null;
    const e = end_date ? dayjs(end_date) : null;
    const ps = phase_start ? dayjs(phase_start) : null;
    const pe = phase_end ? dayjs(phase_end) : null;

    // If either phase boundary missing, only check that s <= e when both provided
    if ((!ps || !ps.isValid()) || (!pe || !pe.isValid())) {
      if (s && e && s.isAfter(e)) return { valid: false, start_date, end_date, error: 'วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด' };
      return { valid: true, start_date, end_date };
    }

    let adjS = s && s.isValid() ? s : null;
    let adjE = e && e.isValid() ? e : null;

    // Auto-adjust if requested
    if (autoAdjust) {
      if (!adjS || adjS.isBefore(ps)) adjS = ps;
      if (!adjE || adjE.isAfter(pe)) adjE = pe;
      if (adjS && adjE && adjS.isAfter(adjE)) adjE = adjS;
      return { valid: true, start_date: adjS ? adjS.format('YYYY-MM-DD') : null, end_date: adjE ? adjE.format('YYYY-MM-DD') : null };
    }

    if (!adjS) return { valid: false, start_date, end_date, error: 'กรุณาระบุวันที่เริ่มงานย่อย' };
    if (!adjE) return { valid: false, start_date, end_date, error: 'กรุณาระบุวันที่สิ้นสุดงานย่อย' };

    if (adjS.isBefore(ps)) return { valid: false, start_date, end_date, error: 'วันที่เริ่มงานย่อยต้องไม่ก่อนวันที่เริ่มของเฟส' };
    if (adjE.isAfter(pe)) return { valid: false, start_date, end_date, error: 'วันที่สิ้นสุดงานย่อยต้องไม่เกินวันที่สิ้นสุดของเฟส' };
    if (adjS.isAfter(adjE)) return { valid: false, start_date, end_date, error: 'วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด' };

    return { valid: true, start_date: adjS.format('YYYY-MM-DD'), end_date: adjE.format('YYYY-MM-DD') };
  } catch {
    return { valid: false, start_date, end_date, error: 'เกิดข้อผิดพลาดในการตรวจสอบวันที่' };
  }
}
// Top-level, memoized dialog components to avoid remounts when parent updates
function PhaseDialogComponent({ open, onClose, editingPhase, phaseForm, onChangeField, onSave, saving, phaseStatuses, phaseStatusLabels, codeRef, positions, error, workstreamBudgetAmount = null, phasesForBudget = [] }) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');

  const validate = (form) => {
    const missing = [];
    if (!form || !String(form.code || '').trim()) missing.push('รหัสเฟส');
    if (!form || !String(form.name || '').trim()) missing.push('ชื่อเฟสงาน');
    const ph = form && form.planned_hours;
    if (ph === undefined || ph === null || String(ph).trim() === '' || Number.isNaN(Number(ph))) missing.push('ชั่วโมงที่วางแผน');
    const fee = form && form.fee;
    if (fee === undefined || fee === null || String(fee).trim() === '' || Number.isNaN(Number(fee))) missing.push('ค่าบริการเฟส');
    if (!form || !form.start) missing.push('วันที่เริ่ม');
    if (!form || !form.end) missing.push('วันที่สิ้นสุด');
    if (!Array.isArray(form.owner) || form.owner.length === 0) missing.push('ผู้รับผิดชอบ');
    return missing;
  };

  const handleSave = () => {
    const missing = validate(phaseForm);
    if (missing.length) {
      setSnackbarMessage(`กรุณากรอก/เลือก: ${missing.join(', ')}`);
      setSnackbarOpen(true);
      return;
    }
    // optional: ensure start <= end
    try {
      const s = phaseForm.start;
      const e = phaseForm.end;
      if (s && e) {
        const sd = dayjs(s);
        const ed = dayjs(e);
        if (sd.isValid() && ed.isValid() && sd.isAfter(ed)) {
          setSnackbarMessage('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด');
          setSnackbarOpen(true);
          return;
        }
      }
    } catch {
      // ignore parsing errors here
    }
    // validate phase fee against workstream budget (if provided)
    try {
      const budget = Number(workstreamBudgetAmount || 0);
      if (budget > 0) {
        const list = Array.isArray(phasesForBudget) ? phasesForBudget : [];
        const currentTotal = list.reduce((s, p) => s + (Number(p.fee) || 0), 0);
        const newFee = Number(phaseForm.fee) || 0;
        const oldFee = editingPhase ? (Number(editingPhase.fee) || 0) : 0;
        const projected = (currentTotal - oldFee) + newFee;
        if (projected > budget) {
          const fmt = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setSnackbarMessage(`ค่าบริการเฟสรวม (${fmt(projected)}) เกินงบประมาณแผนงาน (${fmt(budget)})`);
          setSnackbarOpen(true);
          return;
        }
      }
    } catch { /* ignore */ }
    if (typeof onSave === 'function') onSave();
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" keepMounted disableEnforceFocus disableAutoFocus>
      <DialogTitle>{editingPhase ? 'แก้ไขเฟส' : 'เพิ่มเฟสใหม่'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField inputRef={codeRef} label="รหัสเฟส" size="small" value={phaseForm.code} onChange={e => onChangeField('code', e.target.value)} required />
          <TextField label="ชื่อเฟสงาน" size="small" value={phaseForm.name} onChange={e => onChangeField('name', e.target.value)} required />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="ชั่วโมงที่วางแผน" size="small" type="number" value={phaseForm.planned_hours} onChange={e => onChangeField('planned_hours', e.target.value)} sx={{ flex: 1, minWidth: 160 }} inputProps={{ style: { textAlign: 'right' } }} />
            <TextField label="ค่าบริการเฟส (บาท)" size="small" type="number" value={phaseForm.fee} onChange={e => onChangeField('fee', e.target.value)} sx={{ flex: 1, minWidth: 160 }} inputProps={{ style: { textAlign: 'right' } }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker label="วันที่เริ่ม" value={phaseForm.start} format="DD/MM/YYYY" onChange={v => onChangeField('start', v)} slotProps={{ textField: { size: 'small' } }} sx={{ flex: 1, minWidth: 160 }} />
              <DatePicker label="วันที่สิ้นสุด" value={phaseForm.end} format="DD/MM/YYYY" onChange={v => onChangeField('end', v)} slotProps={{ textField: { size: 'small' } }} sx={{ flex: 1, minWidth: 160 }} />
            </LocalizationProvider>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center' }}>ผู้รับผิดชอบ</Typography>
          <List sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {(positions || []).map(pos => {
              const checked = Array.isArray(phaseForm.owner) ? phaseForm.owner.findIndex(o => String(o) === String(pos.id)) > -1 : false;
              return (
                <ListItem key={pos.id} dense disablePadding>
                  <ListItemButton onClick={() => {
                    const cur = Array.isArray(phaseForm.owner) ? phaseForm.owner.slice() : [];
                    const idx = cur.findIndex(o => String(o) === String(pos.id));
                    if (idx > -1) cur.splice(idx, 1); else cur.push(pos.id);
                    onChangeField('owner', cur);
                  }}>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple sx={{ '&.Mui-checked': { color: 'error.main' } }} />
                    </ListItemIcon>
                    <ListItemText primary={pos.label} secondary={(pos.code ? pos.code : '')} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <TextField label="สถานะ" size="small" select value={phaseForm.status} onChange={e => onChangeField('status', e.target.value)} sx={{ mt: 2, display: 'none' }} disabled={!editingPhase}>
            {phaseStatuses.map(st => <MenuItem key={st} value={st}>{(phaseStatusLabels && phaseStatusLabels[st]) || st}</MenuItem>)}
          </TextField>
          <TextField label="หมายเหตุ" size="small" value={phaseForm.note} onChange={e => onChangeField('note', e.target.value)} multiline minRows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#000' }}>ยกเลิก</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || (Number(phaseForm.fee) || 0) < 0 || Boolean(error)} sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}>บันทึก</Button>
      </DialogActions>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          variant="filled"
          sx={{ width: '100%', bgcolor: 'error.main', color: 'common.white' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

const MemoizedPhaseDialog = React.memo(PhaseDialogComponent);

function TaskListDialog({ open, onClose, phase, tasksForPhase, onEditTask, onDeleteTask, employeesMap, deletingTaskId }) {
  const [confirmTaskOpen, setConfirmTaskOpen] = React.useState(false);
  const [taskToConfirm, setTaskToConfirm] = React.useState(null);

  const openConfirmTaskDelete = (task) => {
    setTaskToConfirm(task);
    setConfirmTaskOpen(true);
  };

  const closeConfirmTaskDelete = () => {
    setTaskToConfirm(null);
    setConfirmTaskOpen(false);
  };

  const handleConfirmTaskDelete = async () => {
    if (taskToConfirm && onDeleteTask) {
      await onDeleteTask(taskToConfirm);
    }
    closeConfirmTaskDelete();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" keepMounted>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>งานย่อยของเฟส {phase ? `${phase.code} - ${phase.name}` : ''}</span>

      </DialogTitle>
      <DialogContent dividers>
        <TableContainer>
          <Table size="small" sx={{ '& th, & td': { borderBottom: 'none' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>รหัสงานย่อย</TableCell>
                <TableCell sx={{ width: 250, fontWeight: 700 }}>ชื่องานย่อย</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>ชั่วโมงตามแผน</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ผู้รับผิดชอบ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>วันที่เริ่ม</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>วันที่สิ้นสุด</TableCell>
                {/* <TableCell>สถานะ</TableCell> */}
                <TableCell align="center" sx={{ fontWeight: 700 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tasksForPhase || []).map(t => (
                <TableRow key={t.id || t.code}>
                  <TableCell>{t.code}</TableCell>
                  <TableCell sx={{ width: 250 }}>{t.name}</TableCell>
                  <TableCell align="right">{Number(t.planned_hours) || 0}</TableCell>
                  <TableCell>{(Array.isArray(t.owner) ? t.owner.map(o => {
                    const e = employeesMap ? employeesMap[String(o)] : null;
                    return e ? e.label : o;
                  }).join(', ') : (t.owner || '-'))}</TableCell>
                  <TableCell>{formatDate(t.start_date || t.start)}</TableCell>
                  <TableCell>{formatDate(t.end_date || t.end)}</TableCell>
                  {/* <TableCell>-</TableCell> */}
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="แก้ไข" disableInteractive enterDelay={200} leaveDelay={100}>
                        <IconButton
                          size="small"
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); onEditTask && onEditTask(t); }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" disableInteractive enterDelay={200} leaveDelay={100}>
                        <IconButton
                          size="small"
                          disabled={Boolean(deletingTaskId && String(deletingTaskId) === String(t.id))}
                          onMouseDown={(e) => { e.stopPropagation(); /* open confirm dialog instead of immediate delete */ openConfirmTaskDelete(t); }}
                          onClick={(e) => { e.stopPropagation(); /* onClick kept for accessibility/click handlers */ }}
                        >
                          {deletingTaskId && String(deletingTaskId) === String(t.id) ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(tasksForPhase || []).length === 0 && (
                <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>ยังไม่มีงานย่อย</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      {/* Confirm delete dialog for tasks */}
      <Dialog open={confirmTaskOpen} onClose={closeConfirmTaskDelete} keepMounted>
        <DialogTitle>ยืนยันการลบงานย่อย</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบงานย่อย {taskToConfirm ? `${taskToConfirm.code || ''} ${taskToConfirm.name ? `- ${taskToConfirm.name}` : ''}` : ''} หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmTaskDelete} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={handleConfirmTaskDelete} disabled={Boolean(deletingTaskId && String(deletingTaskId) === String(taskToConfirm?.id))}>ลบ</Button>
        </DialogActions>
      </Dialog>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {(() => {
          const phaseHours = Number(phase?.planned_hours) || 0;
          const taskHours = (tasksForPhase || []).reduce((s, t) => s + (Number(t.planned_hours) || 0), 0);
          const diff = taskHours - phaseHours;
          const statusText = diff === 0
            ? 'ครบตามแผน'
            : (diff > 0 ? `เกิน ${diff} ชม.` : `ขาด ${Math.abs(diff)} ชม.`);
          const color = diff === 0 ? 'success.main' : (diff > 0 ? 'error.main' : 'warning.main');
          return (
            <Typography variant="body2" sx={{ ml: 2, fontWeight: 700, color }}>
              ชั่วโมงงานย่อยรวม: {taskHours} ({statusText})
            </Typography>
          );
        })()}
        <Button onClick={onClose} sx={{ color: '#000' }}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
}

const MemoizedTaskListDialog = React.memo(TaskListDialog);

function TaskDialogComponent({ open, onClose, taskForm, onChangeField, onSave, saving, phases, codeRef, employees, tasks = [] }) {
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [dateError, setDateError] = React.useState('');

  // When the selected phase changes, preload dates from the phase if the task has none,
  // and validate existing task dates against the new phase range.
  React.useEffect(() => {
    try {
      const phaseId = taskForm?.phase_id;
      if (!phaseId) return;
      const phase = (phases || []).find(p => String(p.id) === String(phaseId));
      if (!phase) return;
      const phaseStart = phase ? (phase.start_date || (phase.start ? (phase.start.format ? phase.start.format('YYYY-MM-DD') : phase.start) : null)) : null;
      const phaseEnd = phase ? (phase.end_date || (phase.end ? (phase.end.format ? phase.end.format('YYYY-MM-DD') : phase.end) : null)) : null;

      const preStart = phaseStart ? dayjs(phaseStart) : null;
      const preEnd = phaseEnd ? dayjs(phaseEnd) : null;

      // Always set the task's dates to the phase bounds when a phase is selected
      onChangeField('start_date', preStart);
      onChangeField('end_date', preEnd);

      // Validate the (new) dates against the phase range
      const tfStart = preStart ? (preStart.format ? preStart.format('YYYY-MM-DD') : preStart) : null;
      const tfEnd = preEnd ? (preEnd.format ? preEnd.format('YYYY-MM-DD') : preEnd) : null;
      const res = validateSubtaskDate(tfStart, tfEnd, phaseStart, phaseEnd, false);
      if (!res.valid) {
        setDateError(res.error || 'วันที่ไม่ถูกต้อง');
      } else {
        setDateError('');
      }
    } catch {
      // ignore
    }
  }, [taskForm?.phase_id, phases, onChangeField]);

  const validate = (form) => {
    const missing = [];
    if (!form || !String(form.code || '').trim()) missing.push('รหัสงานย่อย');
    if (!form || !String(form.name || '').trim()) missing.push('ชื่องานย่อย');
    if (!form || !form.phase_id) missing.push('เฟส');
    const ph = form && form.planned_hours;
    if (ph === undefined || ph === null || String(ph).trim() === '' || Number.isNaN(Number(ph))) missing.push('ชั่วโมงที่วางแผน');
    const ownerArr = Array.isArray(form.owner) ? form.owner : (form.owner ? [form.owner] : []);
    if (!ownerArr || ownerArr.length === 0) missing.push('ผู้รับผิดชอบ');
    return missing;
  };

  const handleSave = () => {
    const missing = validate(taskForm);
    if (missing.length) {
      setSnackbarMessage(`กรุณากรอก/เลือก: ${missing.join(', ')}`);
      setSnackbarOpen(true);
      return;
    }
    // validate dates per phase
    try {
      const phaseId = taskForm.phase_id;
      const phase = (phases || []).find(p => String(p.id) === String(phaseId));
      const phaseStart = phase ? (phase.start_date || (phase.start ? (phase.start.format ? phase.start.format('YYYY-MM-DD') : phase.start) : null)) : null;
      const phaseEnd = phase ? (phase.end_date || (phase.end ? (phase.end.format ? phase.end.format('YYYY-MM-DD') : phase.end) : null)) : null;

      const tfStart = taskForm.start_date ? (taskForm.start_date.format ? taskForm.start_date.format('YYYY-MM-DD') : taskForm.start_date) : null;
      const tfEnd = taskForm.end_date ? (taskForm.end_date.format ? taskForm.end_date.format('YYYY-MM-DD') : taskForm.end_date) : null;

      const res = validateSubtaskDate(tfStart, tfEnd, phaseStart, phaseEnd, false);
      if (!res.valid) {
        setDateError(res.error || 'วันที่ไม่ถูกต้อง');
        setSnackbarMessage(res.error || 'วันที่ไม่ถูกต้อง');
        setSnackbarOpen(true);
        return;
      }
      // clear any date error
      setDateError('');
    } catch { /* ignore */ }
    // Validate that sum of planned_hours for tasks in the phase does not exceed phase planned_hours
    try {
      const phaseId = taskForm.phase_id;
      const phase = (phases || []).find(p => String(p.id) === String(phaseId));
      const phasePlanned = phase ? Number(phase.planned_hours) || 0 : 0;
      if (phasePlanned > 0) {
        const sumOther = (tasks || []).filter(t => String(t.phase_id) === String(phaseId) && String(t.id) !== String(taskForm.id)).reduce((s, t) => s + (Number(t.planned_hours) || 0), 0);
        const projectedTotal = sumOther + (Number(taskForm.planned_hours) || 0);
        if (projectedTotal > phasePlanned) {
          const proj = projectedTotal.toLocaleString('th-TH');
          const limit = phasePlanned.toLocaleString('th-TH');
          setSnackbarMessage(`ไม่สามารถบันทึกได้: ชั่วโมงรวมงานย่อย ${proj} ชม. เกินชั่วโมงตามแผนของเฟส (${limit} ชม.)`);
          setSnackbarOpen(true);
          return;
        }
      }
    } catch { /* ignore validation errors */ }
    if (typeof onSave === 'function') onSave();
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" keepMounted disableEnforceFocus disableAutoFocus>
      <DialogTitle>{taskForm && taskForm.id ? 'แก้ไขงานย่อย' : 'เพิ่มงานย่อย'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField inputRef={codeRef} label="รหัสงานย่อย" size="small" value={taskForm.code} onChange={e => onChangeField('code', e.target.value)} required />
          <TextField label="ชื่องานย่อย" size="small" value={taskForm.name} onChange={e => onChangeField('name', e.target.value)} required />
          <TextField label="เฟส" size="small" select value={taskForm.phase_id} onChange={e => onChangeField('phase_id', e.target.value)} required>
            {phases.map(p => <MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>)}
          </TextField>
          <TextField label="ชั่วโมงที่วางแผน" size="small" type="number" value={taskForm.planned_hours} onChange={e => onChangeField('planned_hours', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} required />
          <TextField
            select
            size="small"
            label="ความสำคัญ (Priority)"
            value={taskForm.priority || 'medium'}
            onChange={e => onChangeField('priority', e.target.value)}
          >
            <MenuItem value="critical">สูงมาก (Critical)</MenuItem>
            <MenuItem value="high">สูง (High)</MenuItem>
            <MenuItem value="medium">กลาง (Medium)</MenuItem>
            <MenuItem value="low">ต่ำ (Low)</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="โหมดบิล"
            value={taskForm.billable_mode || 'billable'}
            onChange={e => onChangeField('billable_mode', e.target.value)}
          >
            <MenuItem value="billable">คิดเงิน (Billable)</MenuItem>
            <MenuItem value="non_billable">ไม่คิดเงิน (Non-billable)</MenuItem>
            <MenuItem value="manual">กำหนดเอง (Manual)</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker
                label="วันที่เริ่ม"
                value={taskForm.start_date || null}
                format="DD/MM/YYYY"
                onChange={v => { onChangeField('start_date', v); setDateError(''); }}
                slotProps={{ textField: { size: 'small', error: Boolean(dateError), helperText: dateError } }}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <DatePicker
                label="วันที่สิ้นสุด"
                value={taskForm.end_date || null}
                format="DD/MM/YYYY"
                onChange={v => { onChangeField('end_date', v); setDateError(''); }}
                slotProps={{ textField: { size: 'small', error: Boolean(dateError), helperText: dateError } }}
                sx={{ flex: 1, minWidth: 160 }}
              />
            </LocalizationProvider>
          </Box>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>ผู้รับผิดชอบ</Typography>
          <List sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {(employees || []).map(emp => {
              const checked = Array.isArray(taskForm.owner) ? taskForm.owner.findIndex(o => String(o) === String(emp.id)) > -1 : false;
              const hasSelection = Array.isArray(taskForm.owner) && taskForm.owner.length > 0;
              // disable other checkboxes when one is selected to enforce single selection
              const disabled = !checked && hasSelection;
              return (
                <ListItem key={emp.id} dense disablePadding>
                  <ListItemButton onClick={() => {
                    // toggle single selection: if already checked, clear selection; otherwise set only this id
                    if (checked) {
                      onChangeField('owner', []);
                    } else {
                      onChangeField('owner', [emp.id]);
                    }
                  }}>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple disabled={disabled} sx={{ '&.Mui-checked': { color: 'error.main' } }} />
                    </ListItemIcon>
                    <ListItemText primary={emp.label} secondary={(emp.code ? emp.code : '')} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#000' }}>ยกเลิก</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}>บันทึก</Button>
      </DialogActions>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          variant="filled"
          sx={{ width: '100%', bgcolor: 'error.main', color: 'common.white' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

const MemoizedTaskDialog = React.memo(TaskDialogComponent);

function RolesDialog({ open, onClose, positions, selectedPositions, onToggle, onSave, saving }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" keepMounted>
      <DialogTitle>ตำแหน่งในโครงการ</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1 }}>เลือกตำแหน่งที่จะลงในโครงการ (สามารถเลือกหลายตำแหน่ง)</Typography>
        <List sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {(positions || []).map(pos => {
            const checked = Array.isArray(selectedPositions) ? selectedPositions.findIndex(id => String(id) === String(pos.id)) > -1 : false;
            return (
              <ListItem key={pos.id} dense disablePadding>
                <ListItemButton onClick={() => onToggle && onToggle(pos.id)}>
                  <ListItemIcon>
                    <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple sx={{ '&.Mui-checked': { color: 'error.main' } }} />
                  </ListItemIcon>
                  <ListItemText primary={pos.label} secondary={pos.code || ''} />
                </ListItemButton>
              </ListItem>
            );
          })}
          {(positions || []).length === 0 && <ListItem><ListItemText primary="ยังไม่มีตำแหน่ง" /></ListItem>}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#000' }}>ปิด</Button>
        <Button variant="contained" onClick={onSave} disabled={saving} sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}>บันทึก</Button>
      </DialogActions>
    </Dialog>
  );
}

const MemoizedRolesDialog = React.memo(RolesDialog);

/**
 * ProjectWbs component
 * Props:
 * - projectId
 * - contractValue (number)
 * - onChange (optional callback when phases change)
 */
function ProjectWbs({ projectId = null, contractValue = 0, onChange, onReady, workstreamId = null, workstreamCode = null, showTeams = true }) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  // (debug logs removed)

  // PHASES state
  const [phases, setPhases] = React.useState([]); // {id, code, name, planned_hours, fee, owner, start, end, status, note}
  const [loading, setLoading] = React.useState(false);
  const [savingPhase, setSavingPhase] = React.useState(false);
  const [savingTask, setSavingTask] = React.useState(false);

  // TASKS (sub-work items) state
  const [tasks, setTasks] = React.useState([]); // {id, code, name, phase_id, planned_hours, owner}
  const [deletingTaskId, setDeletingTaskId] = React.useState(null);

  // derive visible phases filtered by workstream when a workstreamId prop is provided
  const visiblePhases = React.useMemo(() => {
    try {
      if (!workstreamId) return phases;
      return (phases || []).filter(p => String(p.workstream_id || '') === String(workstreamId));
    } catch {
      return phases;
    }
  }, [phases, workstreamId]);

  const hasAnyPhases = React.useMemo(() => (visiblePhases || []).length > 0, [visiblePhases]);

  // Search term for filtering phases (by code or name)
  const [phaseSearch, setPhaseSearch] = React.useState('');

  const filteredPhases = React.useMemo(() => {
    try {
      const q = String(phaseSearch || '').trim().toLowerCase();
      if (!q) return visiblePhases || [];
      return (visiblePhases || []).filter(p => {
        const text = `${p.code || ''} ${p.name || ''}`.toLowerCase();
        return text.indexOf(q) !== -1;
      });
    } catch {
      return visiblePhases || [];
    }
  }, [visiblePhases, phaseSearch]);

  // Modals
  const [phaseDialogOpen, setPhaseDialogOpen] = React.useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [phaseToDelete, setPhaseToDelete] = React.useState(null);
  const [taskAddWarningOpen, setTaskAddWarningOpen] = React.useState(false);
  const [taskAddWarningMessage, setTaskAddWarningMessage] = React.useState('');
  const [editingPhase, setEditingPhase] = React.useState(null); // phase object or null
  const [phaseForm, setPhaseForm] = React.useState({ code: '', name: '', planned_hours: '', fee: '', owner: [], start: null, end: null, status: 'Planning', note: '' });
  const [phaseSaveError, setPhaseSaveError] = React.useState(null);
  const [taskForm, setTaskForm] = React.useState({ code: '', name: '', phase_id: '', planned_hours: '', owner: '', priority: 'medium', billable_mode: 'billable' });

  // Refs to manage focus for dialogs
  const phaseCodeRef = React.useRef(null);
  const taskCodeRef = React.useRef(null);

  // Inline edit/delete controls are used instead of a floating menu

  // Employees for selection (owners). Load employee directory and show checklist.
  const [employees, setEmployees] = React.useState([]);
  // map of employee id -> employee object for quick lookup
  const employeesByIdRef = React.useRef({});

  // Positions for phase-level owners (select positions rather than individual employees)
  const [positions, setPositions] = React.useState([]);
  const positionsByIdRef = React.useRef({});
  // Teams list
  const [teamsList, setTeamsList] = React.useState([]);
  // mapping: team_id -> array of position_id
  const [teamPositionsMap, setTeamPositionsMap] = React.useState({});
  // Project-specific positions stored in tpr_project_role_rates
  // store full rows: { id, position_id, cost_rate, bill_rate }
  const [projectRolePositions, setProjectRolePositions] = React.useState([]);
  const [rolesDialogOpen, setRolesDialogOpen] = React.useState(false);
  const [rolesSelected, setRolesSelected] = React.useState([]);
  const [rolesSaving, setRolesSaving] = React.useState(false);
  const [rolesDeleteError, setRolesDeleteError] = React.useState(null);
  const [rolesSnackbarOpen, setRolesSnackbarOpen] = React.useState(false);

  // floating menu helpers removed; actions are invoked directly from inline buttons

  // Load employees for selection (used as owners). We fetch useful name fields and code.
  const loadEmployees = React.useCallback(async () => {
    try {
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id,employee_code,title_th,first_name_th,last_name_th,first_name_en,last_name_en,position_id,salary_rate')
        .order('employee_code', { ascending: true })
        .limit(2000);
      if (empErr) throw empErr;
      const emps = empData || [];
      const opts = (emps || []).map(e => {
        const nameTh = `${e.title_th ? e.title_th + ' ' : ''}${e.first_name_th || ''}`.trim() + (e.last_name_th ? ` ${e.last_name_th}` : '');
        const nameEn = `${e.first_name_en || ''}`.trim() + (e.last_name_en ? ` ${e.last_name_en}` : '');
        const label = (nameTh && nameTh.trim()) ? nameTh.trim() : (nameEn && nameEn.trim() ? nameEn.trim() : (e.employee_code || String(e.id)));
        return { id: e.id, code: e.employee_code || '', label, position_id: e.position_id, salary_rate: e.salary_rate ?? null };
      });
      // debug logging removed
      setEmployees(opts);
      employeesByIdRef.current = opts.reduce((acc, p) => { acc[String(p.id)] = p; return acc; }, {});
    } catch (err) {
      console.error('loadEmployees', err);
      setEmployees([]);
    }
  }, []);

  // Markup settings (to compute derived cost/hour and bill rates when DB values are missing)
  const [standardHours, setStandardHours] = React.useState(160);
  const [overheadPercent, setOverheadPercent] = React.useState(0);
  const [profitPercent] = React.useState(0);
  const markupTotal = Number(overheadPercent || 0) + Number(profitPercent || 0);

  // Load markup settings (best-effort) so ProjectWbs can compute bill rates similar to SystemSettings
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tpr_markup_settings')
          .select('standard_hours, overhead_percent, profit_percent')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) return;
        if (!mounted) return;
        if (data && data.length > 0) {
          const row = data[0];
          if (row?.standard_hours) setStandardHours(Number(row.standard_hours || 160));
          if (row?.overhead_percent !== undefined && row?.overhead_percent !== null) setOverheadPercent(Number(row.overhead_percent || 0));
          
        }
      } catch (e) { void e; }
    })();
    return () => { mounted = false; };
  }, []);

  const loadPositions = React.useCallback(async () => {
    try {
      const { data: posData, error: posErr } = await fetchMasterPositions();
      if (posErr) throw posErr;
      const pos = posData || [];
      const opts = (pos || []).map(p => ({ id: p.id, code: p.code || '', label: p.label }));
      setPositions(opts);
      positionsByIdRef.current = opts.reduce((acc, p) => { acc[String(p.id)] = p; return acc; }, {});
      // debug logging removed
    } catch (err) {
      console.error('loadPositions', err);
      setPositions([]);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    if (!mounted) return undefined;
    // fire-and-forget load employees
    loadEmployees();
    loadPositions();
    // load teams for display — prefer teams referenced by workstreams of this project
    // but fall back to loading all active teams when none are found (preserve prior behavior)
    (async () => {
      try {
        let fetchedTeams = null;

        if (projectId) {
          // 1) load workstreams for this project to collect team ids
          const { data: wsData, error: wsErr } = await supabase
            .from('tpr_workstreams')
            .select('team_id')
            .eq('project_id', projectId)
            .limit(5000);
          if (wsErr) throw wsErr;
          const teamIds = Array.from(new Set((wsData || []).map(w => w.team_id).filter(Boolean)));
          if (teamIds.length) {
            // 2) fetch only these teams
            const { data, error } = await supabase
              .from('tpr_project_teams')
              .select('id,team_code,team_name,team_lead_id,is_active')
              .in('id', teamIds)
              .order('team_code', { ascending: true })
              .limit(2000);
            if (error) throw error;
            fetchedTeams = (data || []).filter(t => t.is_active !== false);
          }
        }

        // fallback: if no project teams found (or no projectId), load all active teams
        if (!Array.isArray(fetchedTeams) || fetchedTeams.length === 0) {
          const { data, error } = await supabase
            .from('tpr_project_teams')
            .select('id,team_code,team_name,team_lead_id,is_active')
            .order('team_code', { ascending: true })
            .limit(2000);
          if (error) throw error;
          fetchedTeams = (data || []).filter(t => t.is_active !== false);
        }

        if (!mounted) return;
        setTeamsList(fetchedTeams || []);
      } catch (err) {
        console.error('loadTeams', err);
        setTeamsList([]);
      }
    })();
    // don't load project roles here (needs projectId) — separate effect below
    return () => { mounted = false; };
  }, [loadEmployees, loadPositions, projectId]);

  // (workstream-specific team id was previously loaded here; removed as it's unused)

  // load team -> positions mapping from `tpr_project_team_positions` when teams or positions change
  React.useEffect(() => {
    let mounted = true;
    const loadTeamPositions = async () => {
      try {
        const teamIds = (teamsList || []).map(t => t.id).filter(Boolean);
        if (!teamIds.length) {
          if (mounted) setTeamPositionsMap({});
          return;
        }
        const { data, error } = await supabase
          .from('tpr_project_team_positions')
          .select('team_id, position_id')
          .in('team_id', teamIds)
          .limit(5000);
        if (error) throw error;
        const rows = data || [];
        const map = {};
        (rows || []).forEach(r => {
          const tid = String(r.team_id);
          const pid = r.position_id ? String(r.position_id) : null;
          if (!pid) return;
          if (!map[tid]) map[tid] = [];
          if (!map[tid].includes(pid)) map[tid].push(pid);
        });
        if (mounted) setTeamPositionsMap(map);
      } catch (err) {
        console.error('loadTeamPositions', err);
        if (mounted) setTeamPositionsMap({});
      }
    };
    void loadTeamPositions();
    return () => { mounted = false; };
  }, [teamsList, positions]);

  const loadProjectRoleRates = React.useCallback(async () => {
    if (!projectId) { setProjectRolePositions([]); return; }
    try {
      const { data, error } = await fetchProjectPositions(projectId);
      if (error) throw error;
      const rows = (data || []).map(r => ({ id: r.project_role_id ?? r.id ?? null, position_id: String(r.position_id), cost_rate: r.cost_rate ?? null, bill_rate: r.bill_rate ?? null }));
      setProjectRolePositions(rows);
    } catch (err) {
      console.error('loadProjectRoleRates', err);
      setProjectRolePositions([]);
    }
  }, [projectId]);

  React.useEffect(() => {
    // load project role rates when projectId changes
    loadProjectRoleRates();
  }, [projectId, loadProjectRoleRates]);

  // Workstream budget amount for validation when adding/editing phases
  const [workstreamBudgetAmount, setWorkstreamBudgetAmount] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!workstreamId) {
          if (mounted) setWorkstreamBudgetAmount(null);
          return;
        }
        const { data, error } = await supabase
          .from('tpr_workstreams')
          .select('id, budget_amount')
          .eq('id', workstreamId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;
        const v = data ? (data.budget_amount ?? null) : null;
        setWorkstreamBudgetAmount(v !== null && v !== undefined ? Number(v) : null);
      } catch {
        if (mounted) setWorkstreamBudgetAmount(null);
      }
    })();
    return () => { mounted = false; };
  }, [workstreamId]);



  // aggregated position stats derived from loaded employees (avg cost per hour and bill rate)
  // parse salary_rate the same way SystemSettings does so results are identical
  function getSalaryNumber(emp) {
    if (!emp) return 0;
    const v = emp.salary_rate;
    if (v === null || v === undefined || v === '') return 0;
    const parsed = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const aggregatedPositionStats = React.useMemo(() => {
    const m = {};
    (employees || []).forEach(emp => {
      const posId = emp.position_id ? String(emp.position_id) : '__no_pos__';
      const s = getSalaryNumber(emp);
      if (!m[posId]) m[posId] = { total: 0, count: 0 };
      m[posId].total += s;
      m[posId].count += 1;
    });
    const out = {};
    Object.keys(m).forEach(pid => {
      const it = m[pid];
      // cost per hour is calculated from the total salary of the position group
      // divided by the standard hours (do NOT divide by headcount again)
      const avgCostPerHour = it.count > 0 ? (it.total / (Number(standardHours) || 160)) : 0;
      const avgBill = avgCostPerHour * (1 + (Number(markupTotal || 0) / 100));
      out[pid] = { avgCostPerHour, avgBill };
    });
    return out;
  }, [employees, standardHours, markupTotal]);

  // Feature flag: enable/disable automatic syncing of teams into project role rates
  // Set to `false` to prevent automatic inserts when opening the WBS dialog.
  const AUTO_SYNC_TEAMS = false;

  // Auto-sync teams into project role rates: when a project is opened, derive a
  // representative position_id for each active team (prefer team_lead.position_id)
  // and insert any missing entries into `tpr_project_role_rates` so teams appear
  // in the project roles list automatically. This operation is idempotent.
  React.useEffect(() => {
    let mounted = true;
    if (!projectId) return undefined;

    const syncTeams = async () => {
      try {
        // 1) load active teams
        const { data: teams, error: teamsErr } = await supabase
          .from('tpr_project_teams')
          .select('id,team_code,team_name,team_lead_id,is_active')
          .order('team_code', { ascending: true })
          .limit(2000);
        if (teamsErr) throw teamsErr;
        const activeTeams = (teams || []).filter(t => t.is_active !== false);
        if (!activeTeams.length) return;

        // 2) gather candidate position_ids from team leads
        const leadIds = Array.from(new Set(activeTeams.map(t => t.team_lead_id).filter(Boolean)));
        let leadRows = [];
        if (leadIds.length) {
          const { data: empRows, error: empErr } = await supabase
            .from('employees')
            .select('id,position_id')
            .in('id', leadIds)
            .limit(2000);
          if (empErr) throw empErr;
          leadRows = empRows || [];
        }

        const candidatePosIds = Array.from(new Set((leadRows || []).map(r => r.position_id).filter(Boolean)));
        if (!candidatePosIds.length) return;

        // 3) fetch existing project role rates to avoid duplicates
        const { data: existingRows, error: existingErr } = await supabase
          .from('tpr_project_role_rates')
          .select('position_id')
          .eq('project_id', projectId)
          .limit(2000);
        if (existingErr) throw existingErr;
        const existingIds = (existingRows || []).map(r => String(r.position_id));

        const toInsert = candidatePosIds.filter(id => !existingIds.includes(String(id)));
        if (!toInsert.length) return;

        // 4) prepare payload using aggregatedPositionStats when available
        const payload = toInsert.map(id => {
          const derived = aggregatedPositionStats[String(id)] || aggregatedPositionStats['__no_pos__'] || null;
          const cost = derived && derived.avgCostPerHour ? Number(derived.avgCostPerHour) : 0;
          const bill = derived && derived.avgBill ? Number(derived.avgBill) : 0;
          return { project_id: projectId, position_id: id, bill_rate: bill, cost_rate: cost };
        });

        // 5) (Disabled) insert missing rows automatically.
        // Automatic insertion of team-derived role rates is disabled for now to avoid
        // unexpected writes when simply opening the WBS dialog.
        // If you want to enable automatic insertion, set AUTO_SYNC_TEAMS = true

        if (AUTO_SYNC_TEAMS) {
          const { error: insErr } = await supabase.from('tpr_project_role_rates').insert(payload);
          if (insErr) throw insErr;
        }

        // 6) refresh local list so UI reflects current DB state (no-op if nothing changed)
        if (mounted) await loadProjectRoleRates();
      } catch (err) {
        console.error('autoSyncTeamsToRoleRates', err);
      }
    };

    // run in background
    void syncTeams();
    return () => { mounted = false; };
  }, [projectId, aggregatedPositionStats, loadProjectRoleRates, AUTO_SYNC_TEAMS]);

  const closeRolesDialog = () => setRolesDialogOpen(false);

  React.useEffect(() => {
    if (rolesDialogOpen) {
      setRolesSelected((projectRolePositions || []).map(r => String(r.position_id)));
    }
  }, [rolesDialogOpen, projectRolePositions]);

  const toggleRoleSelection = (posId) => {
    setRolesSelected(prev => {
      const key = String(posId);
      if (prev.map(String).includes(key)) return prev.filter(id => String(id) !== key);
      return [...prev, posId];
    });
  };

  const saveProjectRoles = async (selected) => {
    if (!projectId) return;
    setRolesSaving(true);
    try {
      
      const { data: existingData, error: existingErr } = await supabase
        .from('tpr_project_role_rates')
        .select('id, position_id, cost_rate, bill_rate')
        .eq('project_id', projectId);
      if (existingErr) throw existingErr;
      const existing = (existingData || []).map(r => String(r.position_id));
      const desired = (selected || []).map(String);
      const toInsert = desired.filter(id => !existing.includes(id));
      const toDelete = existing.filter(id => !desired.includes(id));

      if (toInsert.length) {
        // compute sensible defaults from aggregatedPositionStats (avoid inserting 0 when we can derive a value)
        const payload = toInsert.map(id => {
          const derived = aggregatedPositionStats[String(id)] || aggregatedPositionStats['__no_pos__'] || null;
          const cost = derived && derived.avgCostPerHour ? Number(derived.avgCostPerHour) : 0;
          const bill = derived && derived.avgBill ? Number(derived.avgBill) : 0;
          return { project_id: projectId, position_id: id, bill_rate: bill, cost_rate: cost };
        });
        
        const { error: insErr } = await supabase.from('tpr_project_role_rates').insert(payload);
        if (insErr) throw insErr;
      }
      if (toDelete.length) {
        
        const { error: delErr } = await supabase
          .from('tpr_project_role_rates')
          .delete()
          .eq('project_id', projectId)
          .in('position_id', toDelete);
        if (delErr) throw delErr;
      }
      // optimistic local update
      try {
        const existingRows = existingData || [];
        const kept = existingRows.filter(r => !toDelete.includes(String(r.position_id))).map(r => ({ id: r.id ?? null, position_id: String(r.position_id), cost_rate: r.cost_rate ?? 0, bill_rate: r.bill_rate ?? 0 }));
        const added = toInsert.map(id => {
          const derived = aggregatedPositionStats[String(id)] || aggregatedPositionStats['__no_pos__'] || null;
          const cost = derived && derived.avgCostPerHour ? Number(derived.avgCostPerHour) : 0;
          const bill = derived && derived.avgBill ? Number(derived.avgBill) : 0;
          return ({ id: null, position_id: String(id), cost_rate: cost, bill_rate: bill });
        });
        setProjectRolePositions([...kept, ...added]);
      } catch (e) { void e; }
      await loadProjectRoleRates();
    } catch (err) {
      console.error('saveProjectRoles', err);
    } finally {
      setRolesSaving(false);
      setRolesDialogOpen(false);
    }
  };



  // (phase->position mappings removed — owners are stored on phases.owner as employee ids)

  // Project-specific positions derived from `tpr_project_role_rates` and the
  // loaded `positions` list. This is passed into the Phase dialog so the
  // owner checklist shows only positions registered for the current project.
  const projectPositionsList = React.useMemo(() => {
    try {
      if (!projectRolePositions || projectRolePositions.length === 0) return [];
      return projectRolePositions.map(r => {
        const pid = String(r.position_id);
        const p = positionsByIdRef.current[pid];
        return {
          id: p ? p.id : pid,
          code: p ? p.code : '',
          label: p ? p.label : pid
        };
      });
    } catch {
      return [];
    }
  }, [projectRolePositions]);

  // Positions derived from teams (tpr_project_team_positions). Prefer these
  // when showing the Phase owner checklist so users pick positions available
  // in the project's teams. Fall back to `projectPositionsList` when empty.
  const teamDerivedPositions = React.useMemo(() => {
    try {
      const setIds = new Set();
      (teamsList || []).forEach(t => {
        const arr = teamPositionsMap[String(t.id)] || [];
        (arr || []).forEach(pid => { if (pid !== undefined && pid !== null) setIds.add(String(pid)); });
      });
      const out = Array.from(setIds).map(pid => {
        const p = positionsByIdRef.current[String(pid)] || (positions || []).find(x => String(x.id) === String(pid));
        return { id: p ? p.id : pid, code: p ? p.code : '', label: p ? p.label : pid };
      });
      return out;
    } catch {
      return [];
    }
  }, [teamsList, teamPositionsMap, positions]);

  const positionsForPhaseDialog = (teamDerivedPositions && teamDerivedPositions.length) ? teamDerivedPositions : projectPositionsList;

  const handleRolesSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setRolesSnackbarOpen(false);
    setRolesDeleteError(null);
  };

  // Status mapping: stored values remain English, displayed labels are Thai
  const STATUS_MAP = {
    Planning: 'วางแผน',
    InProgress: 'กำลังดำเนินการ',
    Completed: 'เสร็จสิ้น',
  };
  const phaseStatuses = Object.keys(STATUS_MAP);

  // Task badge thresholds
  const HIGH_HOURS_THRESHOLD = 40; // hours threshold to consider "high" when no subtasks exist

  const badgeColorForCount = (count) => (count === 0 ? 'error' : (count <= 3 ? 'warning' : 'success'));

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = React.useState(false);
  const [taskModalPhase, setTaskModalPhase] = React.useState(null);

  const openTaskModal = (phase) => {
    setTaskModalPhase(phase);
    setTaskModalOpen(true);
  };
  const closeTaskModal = () => setTaskModalOpen(false);

  const openEditTaskFromModal = (task) => {
    // populate task form and open the Task dialog
    // parse metadata to extract priority if present
    let meta = {};
    try {
      if (task.metadata) {
        meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata || {};
      }
    } catch {
      meta = {};
    }
    setTaskForm({
      code: task.code || '',
      name: task.name || '',
      phase_id: task.phase_id || '',
      planned_hours: String(task.planned_hours || ''),
      owner: Array.isArray(task.owner) ? task.owner : (task.owner ? [task.owner] : []),
      start_date: task.start_date ? dayjs(task.start_date) : (task.start ? (dayjs(task.start)) : null),
      end_date: task.end_date ? dayjs(task.end_date) : (task.end ? (dayjs(task.end)) : null),
      id: task.id,
      metadata: meta,
      priority: meta.priority || 'medium',
      billable_mode: task.billable_mode || 'billable'
    });
    setTaskModalOpen(false);
    setTaskDialogOpen(true);
  };

  const deleteTaskFromModal = async (task) => {
    if (!task?.id || !projectId) return;
    // optimistic disable so subsequent clicks won't retrigger
    setDeletingTaskId(task.id);
    try {
      // include project_id to satisfy RLS/policy and avoid ambiguous failures
      const { error } = await supabase.from('tpr_project_wbs_tasks').delete().match({ id: task.id, project_id: projectId });
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error('Delete task error', err);
      // show a snackbar-like quick feedback: use existing taskAddWarning snackbar
      setTaskAddWarningMessage('ลบงานย่อยไม่สำเร็จ');
      setTaskAddWarningOpen(true);
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Load existing phases & tasks
  React.useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        // PHASES TABLE: tpr_project_wbs_phases
        const { data: phaseRows, error: phaseErr } = await supabase
          .from('tpr_project_wbs_phases')
          .select('id, code, name, planned_hours, fee, owner, start_date, end_date, status, note, workstream_id, workstream_code')
          .eq('project_id', projectId)
          .order('code', { ascending: true });
        if (phaseErr) throw phaseErr;
        const loadedPhases = (phaseRows || []).map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          workstream_id: r.workstream_id ?? null,
          workstream_code: r.workstream_code ?? null,
          planned_hours: Number(r.planned_hours) || 0,
          fee: Number(r.fee) || 0,
          // owner may be stored as JSON array (string) or as plain string; normalize to array
          owner: (() => {
            const o = r.owner;
            if (!o) return [];
            try {
              if (typeof o === 'string' && o.trim().startsWith('[')) {
                const parsed = JSON.parse(o);
                return Array.isArray(parsed) ? parsed : [String(parsed)];
              }
              if (typeof o === 'string' && o.includes(',')) return o.split(',').map(s => s.trim()).filter(Boolean);
              if (Array.isArray(o)) return o;
              return [String(o)];
            } catch {
              return typeof o === 'string' ? [o] : (Array.isArray(o) ? o : []);
            }
          })(),
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          status: r.status || 'Planning',
          note: r.note || ''
        }));

        // TASKS TABLE: tpr_project_wbs_tasks
        const { data: taskRows, error: taskErr } = await supabase
          .from('tpr_project_wbs_tasks')
          .select('id, code, name, phase_id, planned_hours, owner, workstream_id, workstream_code, start_date, end_date, metadata')
          .eq('project_id', projectId)
          .order('code', { ascending: true });


        if (taskErr) throw taskErr;
        const loadedTasks = (taskRows || []).map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
          workstream_id: t.workstream_id ?? null,
          workstream_code: t.workstream_code ?? null,
          phase_id: t.phase_id,
          planned_hours: Number(t.planned_hours) || 0,
          // include date and metadata fields so UI can show start/end and priority/status
          start_date: t.start_date || null,
          end_date: t.end_date || null,
          metadata: t.metadata || null,
          owner: (() => {
            if (!t.owner) return [];
            try {
              if (typeof t.owner === 'string' && t.owner.trim().startsWith('[')) {
                const parsed = JSON.parse(t.owner);
                return Array.isArray(parsed) ? parsed : [String(parsed)];
              }
              if (Array.isArray(t.owner)) return t.owner;
              return [String(t.owner)];
            } catch {
              return typeof t.owner === 'string' ? [t.owner] : (Array.isArray(t.owner) ? t.owner : []);
            }
          })()
        }));

        if (!mounted) return;
        // use owner values from phases.owner (may be array of employee ids or labels)
        setPhases(loadedPhases);
        setTasks(loadedTasks);
        if (onChange) onChange({ phases: loadedPhases, tasks: loadedTasks });
      } catch (err) {
        console.error('Load WBS data error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [projectId]);

  // notify parent when initial load finishes (used to hide an external loader)
  const initialReadyCalledRef = React.useRef(false);
  React.useEffect(() => {
    if (!loading && projectId && !initialReadyCalledRef.current) {
      initialReadyCalledRef.current = true;
      try {
        if (typeof onReady === 'function') onReady();
      } catch (e) { void e; }
    }
  }, [loading, projectId, onReady]);

  // Derived totals
  // Totals for phases (kept minimal; WBS summary UI temporarily removed)
  // Load project fee budget from `tpr_project_finances.fees_budget` and use it
  // in the WBS Summary. This is done safely: failures (missing table/column)
  // will be logged but will not crash the UI.
  const [feesBudgetLocal, setFeesBudgetLocal] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    if (!projectId) return undefined;
    const loadFeesBudget = async () => {
      try {
        const { data, error } = await supabase
          .from('tpr_project_finances')
          .select('fees_budget')
          .eq('project_id', projectId)
          .single();
        if (error) return;
        if (!mounted) return;
        setFeesBudgetLocal(data?.fees_budget ?? null);
      } catch (err) {
        console.error('Load fees_budget error', err);
      }
    };
    loadFeesBudget();
    return () => { mounted = false; };
  }, [projectId]);

  const resolvedFeesBudgetNumber = feesBudgetLocal !== null
    ? Number(feesBudgetLocal)
    : (contractValue !== undefined && contractValue !== null && Number(contractValue) !== 0 ? Number(contractValue) : 0);
  // Summary-derived values removed while the WBS summary is disabled

  // Handlers
  const openNewPhaseDialog = () => {
    setEditingPhase(null);
    setPhaseForm({ code: '', name: '', planned_hours: '', fee: '', owner: [], start: null, end: null, status: 'Planning', note: '' });
    // clear any previous validation error when opening a fresh dialog
    setPhaseSaveError(null);
    setPhaseDialogOpen(true);
  };
  const openEditPhaseDialog = (phase) => {
    setEditingPhase(phase);
    setPhaseForm({
      code: phase.code || '',
      name: phase.name || '',
      planned_hours: String(phase.planned_hours || ''),
      fee: String(phase.fee || ''),
      owner: Array.isArray(phase.owner) ? phase.owner : (phase.owner ? [phase.owner] : []),
      // phase may have `start` (normalized) or `start_date` (raw DB field). Accept both.
      start: phase.start ? dayjs(phase.start) : (phase.start_date ? dayjs(phase.start_date) : null),
      end: phase.end ? dayjs(phase.end) : (phase.end_date ? dayjs(phase.end_date) : null),
      status: phase.status || 'Planning',
      note: phase.note || ''
    });
    setPhaseDialogOpen(true);
  };
  const closePhaseDialog = () => {
    // clear validation error when closing the dialog
    setPhaseSaveError(null);
    setPhaseDialogOpen(false);
  };

  const openNewTaskDialog = () => {
    // If there are no phases, show a warning and do not open the dialog
    const hasPhases = Array.isArray(visiblePhases) ? visiblePhases.length > 0 : (Array.isArray(phases) && phases.length > 0);
    if (!hasPhases) {
      setTaskAddWarningMessage('กรุณาเพิ่มเฟสก่อนจึงจะสามารถเพิ่มงานย่อยได้');
      setTaskAddWarningOpen(true);
      return;
    }
    // preload dates from selected/default phase
    const defaultPhase = visiblePhases[0] || phases[0];
    const preStart = defaultPhase ? (defaultPhase.start ? (defaultPhase.start.format ? defaultPhase.start : defaultPhase.start_date) : defaultPhase.start_date) : null;
    const preEnd = defaultPhase ? (defaultPhase.end ? (defaultPhase.end.format ? defaultPhase.end : defaultPhase.end_date) : defaultPhase.end_date) : null;
    setTaskForm({ code: '', name: '', phase_id: defaultPhase?.id || '', planned_hours: '', owner: [], priority: 'medium', billable_mode: 'billable', start_date: preStart ? dayjs(preStart) : null, end_date: preEnd ? dayjs(preEnd) : null });
    setTaskDialogOpen(true);
  };
  const closeTaskDialog = () => setTaskDialogOpen(false);

  // Focus management: focus the first input when dialog opens to avoid losing focus on rerenders
  React.useEffect(() => {
    if (phaseDialogOpen) {
      // use requestAnimationFrame to focus after paint (more reliable than timeout)
      let raf = 0;
      raf = requestAnimationFrame(() => {
        if (phaseCodeRef.current && typeof phaseCodeRef.current.focus === 'function') phaseCodeRef.current.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [phaseDialogOpen]);

  React.useEffect(() => {
    if (taskDialogOpen) {
      let raf = 0;
      raf = requestAnimationFrame(() => {
        if (taskCodeRef.current && typeof taskCodeRef.current.focus === 'function') taskCodeRef.current.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [taskDialogOpen]);

  const handlePhaseFormChange = React.useCallback((field, value) => {
    setPhaseForm(prev => ({ ...prev, [field]: value }));
    // clear previous validation error when user edits the form
    setPhaseSaveError(null);
  }, []);

  const handleTaskFormChange = React.useCallback((field, value) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const persistPhase = async () => {
    if (!projectId) return;
    // Basic validation
    if (!phaseForm.code || !phaseForm.name) return;
    // Budget validation: if a resolved budget is available (>0), ensure new total won't exceed it
    try {
      const newFee = Number(phaseForm.fee) || 0;
      // compute current total WBS fee on demand (summary UI is disabled)
      const sumFees = phases.reduce((s, p) => s + (Number(p.fee) || 0), 0);
      const budgetAvailable = (feesBudgetLocal !== null) || (contractValue !== undefined && contractValue !== null && Number(contractValue) !== 0);
      const budget = budgetAvailable ? Number(resolvedFeesBudgetNumber) : null;
      let projectedTotal = 0;
      if (editingPhase) {
        const existingFee = Number(editingPhase.fee) || 0;
        projectedTotal = sumFees - existingFee + newFee;
      } else {
        projectedTotal = sumFees + newFee;
      }
      if (budget && projectedTotal > budget) {
        const formattedProjected = projectedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        const formattedBudget = budget.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        setPhaseSaveError(`ไม่สามารถบันทึกได้: ผลรวมค่าบริการของเฟสรวมเฟสนี้ ${formattedProjected} บาท เกินงบค่าบริการ (ตามสัญญา) ${formattedBudget} บาท`);
        return;
      }
    } catch {
      // ignore validation calculation errors and continue
    }
    // We'll persist phase data into tpr_project_wbs_phases and persist owner mappings
    // into tpr_project_wbs_phase_positions (normalized). Any owner labels that
    // cannot be resolved to a position id will be kept in the phases.owner column
    // as JSON strings to avoid data loss.
    const payloadBase = {
      project_id: projectId,
      workstream_id: workstreamId || null,
      workstream_code: workstreamCode || null,
      code: phaseForm.code,
      name: phaseForm.name,
      planned_hours: Number(phaseForm.planned_hours) || 0,
      fee: Number(phaseForm.fee) || 0,
      start_date: phaseForm.start ? phaseForm.start.format('YYYY-MM-DD') : null,
      end_date: phaseForm.end ? phaseForm.end.format('YYYY-MM-DD') : null,
      status: phaseForm.status,
      note: phaseForm.note || null
    };
    try {
      setSavingPhase(true);
      // resolve owner entries into position ids if possible (phase owners are positions)
      const ownerEntries = Array.isArray(phaseForm.owner) ? phaseForm.owner.slice() : (phaseForm.owner ? [phaseForm.owner] : []);
      const resolved = ownerEntries.map(o => {
        if (o === null || o === undefined) return null;
        const key = String(o);
        if (positionsByIdRef.current[key]) return positionsByIdRef.current[key].id;
        const found = positions.find(p => p.label === o || p.code === o || String(p.id) === key);
        return found ? found.id : null;
      });
      const ownerIds = resolved.filter(Boolean);
      const leftoverLabels = ownerEntries.filter((v, i) => !resolved[i]);

      if (editingPhase) {
        // include matched position ids + leftover labels in the owner column to preserve unmatched values
        const combinedOwner = [...ownerIds, ...leftoverLabels];
        const payload = { ...payloadBase, owner: combinedOwner.length ? JSON.stringify(combinedOwner) : null };
        const { error } = await supabase
          .from('tpr_project_wbs_phases')
          .update(payload)
          .eq('id', editingPhase.id);
        if (error) throw error;
        // update local phases: owner as combined ids + leftover labels
        setPhases(prev => prev.map(p => p.id === editingPhase.id ? { ...p, ...payload, owner: combinedOwner, start: payload.start_date || null, end: payload.end_date || null } : p));
        // (Previously: upsert role rates for resolved owner positions) -- removed per request
      } else {
        // insert phase
        const combinedOwner = [...ownerIds, ...leftoverLabels];
        const insertPayload = { ...payloadBase, owner: combinedOwner.length ? JSON.stringify(combinedOwner) : null };
        const { data, error } = await supabase
          .from('tpr_project_wbs_phases')
          .insert(insertPayload)
          .select('id');
        if (error) throw error;
        let newId = null;
        if (data && data.length === 1) newId = data[0].id;
        const newPhase = { id: newId, ...insertPayload, owner: combinedOwner, start: insertPayload.start_date || null, end: insertPayload.end_date || null };
        setPhases(prev => [...prev, newPhase]);
        // (Previously: upsert role rates for resolved owner positions) -- removed per request
      }
      if (onChange) onChange({ phases: phases, tasks });
      // clear any previous validation error on success
      setPhaseSaveError(null);
      closePhaseDialog();
    } catch (err) {
      console.error('Persist phase error', err);
    } finally {
      setSavingPhase(false);
    }
  };

  const removePhase = async (phase) => {
    if (!projectId || !phase?.id) return;
    try {
      const { error } = await supabase
        .from('tpr_project_wbs_phases')
        .delete()
        .eq('id', phase.id);
      if (error) throw error;
      setPhases(prev => prev.filter(p => p.id !== phase.id));
      setTasks(prev => prev.filter(t => t.phase_id !== phase.id));
    } catch (err) {
      console.error('Delete phase error', err);
    }
  };

  const openConfirmDelete = (phase) => {
    setPhaseToDelete(phase);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (phaseToDelete) await removePhase(phaseToDelete);
    } finally {
      setPhaseToDelete(null);
      setConfirmDeleteOpen(false);
    }
  };

  const persistTask = async () => {
    if (!projectId) return;
    if (!taskForm.code || !taskForm.name || !taskForm.phase_id) return;
    // Prepare payload for insert/update. Do not include `id` in update payload.
    const preparedOwner = Array.isArray(taskForm.owner) ? (taskForm.owner.length ? JSON.stringify(taskForm.owner) : null) : (taskForm.owner || null);
    const basePayload = {
      project_id: projectId,
      workstream_id: workstreamId || null,
      workstream_code: workstreamCode || null,
      code: taskForm.code,
      name: taskForm.name,
      phase_id: taskForm.phase_id,
      planned_hours: Number(taskForm.planned_hours) || 0,
      owner: preparedOwner,
      billable_mode: taskForm.billable_mode || null,
      start_date: taskForm.start_date ? (taskForm.start_date.format ? taskForm.start_date.format('YYYY-MM-DD') : taskForm.start_date) : null,
      end_date: taskForm.end_date ? (taskForm.end_date.format ? taskForm.end_date.format('YYYY-MM-DD') : taskForm.end_date) : null
    };

    try {
      setSavingTask(true);
      // prepare metadata: merge existing metadata with priority/status
      let existingMetadata = {};
      try {
        if (taskForm.metadata) {
          existingMetadata = typeof taskForm.metadata === 'string' ? JSON.parse(taskForm.metadata) : taskForm.metadata || {};
        } else if (taskForm.id) {
          const ex = (tasks || []).find(t => String(t.id) === String(taskForm.id));
          if (ex && ex.metadata) existingMetadata = typeof ex.metadata === 'string' ? JSON.parse(ex.metadata) : ex.metadata || {};
        }
      } catch {
        existingMetadata = {};
      }

      let finalMetadata = {};
      if (taskForm.id) {
        finalMetadata = { ...(existingMetadata || {}) };
        finalMetadata.priority = taskForm.priority || existingMetadata.priority || 'medium';
        // preserve existing status if present; otherwise default to 'doing'
        finalMetadata.status = existingMetadata.status || 'doing';
      } else {
        finalMetadata = { ...(existingMetadata || {}), priority: taskForm.priority || 'medium', status: 'todo' };
      }

      // determine owner array for local state (taskForm.owner should be array from UI)
      const ownerArray = Array.isArray(taskForm.owner) ? taskForm.owner : (preparedOwner && typeof preparedOwner === 'string' && preparedOwner.trim().startsWith('[') ? JSON.parse(preparedOwner) : (preparedOwner ? [String(preparedOwner)] : []));

      if (taskForm.id) {
        // Update existing task
        const updatePayload = { ...basePayload, metadata: finalMetadata };
        // remove project_id from update if you prefer, but it's harmless to include
        const { error } = await supabase
          .from('tpr_project_wbs_tasks')
          .update(updatePayload)
          .eq('id', taskForm.id);
        if (error) throw error;
        // reflect change in local state (ensure owner is an array)
        const updatedTasks = tasks.map(t => (String(t.id) === String(taskForm.id) ? { ...t, ...basePayload, metadata: finalMetadata, id: taskForm.id, owner: ownerArray } : t));
        setTasks(updatedTasks);
        if (onChange) onChange({ phases, tasks: updatedTasks });
      } else {
        // Insert new task
        const insertPayload = { ...basePayload, metadata: finalMetadata };
        const { data, error } = await supabase
          .from('tpr_project_wbs_tasks')
          .insert(insertPayload)
          .select('id');
        if (error) throw error;
        const newPayload = { ...basePayload };
        if (data && data.length === 1) newPayload.id = data[0].id;
        // ensure owner is stored as array locally for UI
        newPayload.owner = ownerArray;
        newPayload.metadata = finalMetadata;
        setTasks(prev => [...prev, newPayload]);
        if (onChange) onChange({ phases, tasks: [...tasks, newPayload] });
      }
      closeTaskDialog();
    } catch (err) {
      console.error('Persist task error', err);
    } finally {
      setSavingTask(false);
    }
  };

  // TASKS summary under each phase (optional future expansion)
  const tasksByPhase = React.useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!map[t.phase_id]) map[t.phase_id] = [];
      map[t.phase_id].push(t);
    }
    return map;
  }, [tasks]);

  // Responsive card view for phases
  const PhaseCards = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {filteredPhases.map(phase => (
        <Box key={phase.id || phase.code} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">{phase.code} - {phase.name}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="แก้ไข">
                <IconButton size="small" onClick={() => openEditPhaseDialog(phase)} sx={{ color: 'text.secondary' }} aria-label="แก้ไขเฟส">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="ลบ">
                <IconButton size="small" onClick={() => openConfirmDelete(phase)} sx={{ color: 'text.secondary' }} aria-label="ลบเฟส">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">ชั่วโมงตามแผน: {phase.planned_hours} | ค่าบริการ: {phase.fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Typography>
          <Typography variant="caption" color="text.secondary">ช่วง: {formatDate(phase.start || phase.start_date)} ถึง {formatDate(phase.end || phase.end_date)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">ผู้รับผิดชอบ: {Array.isArray(phase.owner) ? (phase.owner.map(o => {
              const p = positionsByIdRef.current[String(o)];
              return p ? p.label : o;
            }).join(', ') || '-') : (phase.owner || '-')}</Typography>
          </Box>
          {(() => {
            const count = (tasksByPhase[phase.id] || []).length || 0;
            const taskHours = (tasksByPhase[phase.id] || []).reduce((s, t) => s + (Number(t.planned_hours) || 0), 0);
            const phaseHours = Number(phase.planned_hours) || 0;
            const diff = taskHours - phaseHours;
            const diffText = diff === 0 ? '' : (diff > 0 ? `(เกิน ${diff} ชม.)` : `(ยังขาด ${Math.abs(diff)} ชม.)`);
            const title = `ชั่วโมงเฟส: ${phaseHours} / ชั่วโมงงานย่อยรวม: ${taskHours} ${diffText}`;
            const badgeColor = (count > 0 && Number(taskHours) === Number(phaseHours)) ? 'success' : badgeColorForCount(count);
            const showWarning = count === 0 && phaseHours >= HIGH_HOURS_THRESHOLD;
            // Stabilize tooltip to avoid flicker when hovering child elements
            const stableTitle = title;
            return (
              <Tooltip title={stableTitle} enterDelay={400} leaveDelay={200} disableInteractive>
                <span>
                  <Button onClick={() => openTaskModal(phase)} sx={{ textTransform: 'none', p: 0 }} disableRipple>
                    <Chip label={count} color={badgeColor} size="small" sx={{ cursor: 'pointer', mr: 1 }} />
                    {showWarning ? <span style={{ color: 'orange', marginLeft: 4 }}>❗</span> : null}
                  </Button>
                </span>
              </Tooltip>
            );
          })()}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'none' }}>สถานะ: {STATUS_MAP[phase.status] || phase.status}</Typography>
        </Box>
      ))}
      {filteredPhases.length === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {hasAnyPhases ? 'ไม่พบผลลัพธ์สำหรับการค้นหา' : 'ยังไม่มีเฟสงาน'}
          </Typography>
        </Box>
      )}
    </Box>
  );
  const PhaseTable = () => (
    <Table size="small" sx={{ minWidth: 900, '& th, & td': { borderBottom: 'none' } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700 }}>รหัสเฟส</TableCell>
          <TableCell sx={{ width: 220, maxWidth: 220, fontWeight: 700 }}>ชื่อเฟสงาน</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>ชั่วโมงที่วางแผน</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>ค่าบริการ (บาท)</TableCell>
          <TableCell sx={{ maxWidth: 150, fontWeight: 700 }}>ผู้รับผิดชอบ</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>วันที่เริ่ม - สิ้นสุด</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>งานย่อย</TableCell>
          <TableCell sx={{ fontWeight: 700, display: 'none' }}>สถานะ</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>จัดการ</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredPhases.map(phase => (
          <TableRow key={phase.id || phase.code}>
            <TableCell>{phase.code}</TableCell>
            <TableCell sx={{ maxWidth: 220 }}>{phase.name}</TableCell>
            <TableCell align="right">{phase.planned_hours}</TableCell>
            <TableCell align="right">{phase.fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
            <TableCell sx={{ maxWidth: 150 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Array.isArray(phase.owner) ? (phase.owner.map(o => {
                  const p = positionsByIdRef.current[String(o)];
                  return p ? p.label : o;
                }).join(', ') || '-') : (phase.owner || '-')}</Typography>
              </Box>
            </TableCell>
            <TableCell>{formatDate(phase.start || phase.start_date)} - {formatDate(phase.end || phase.end_date)}</TableCell>
            <TableCell align="center">{(() => {
              const count = (tasksByPhase[phase.id] || []).length || 0;
              const taskHours = (tasksByPhase[phase.id] || []).reduce((s, t) => s + (Number(t.planned_hours) || 0), 0);
              const phaseHours = Number(phase.planned_hours) || 0;
              const diff = taskHours - phaseHours;
              const diffText = diff === 0 ? '' : (diff > 0 ? `(เกิน ${diff} ชม.)` : `(ยังขาด ${Math.abs(diff)} ชม.)`);
              const title = `ชั่วโมงเฟส: ${phaseHours} / ชั่วโมงงานย่อยรวม: ${taskHours} ${diffText}`;
              const badgeColor = (count > 0 && Number(taskHours) === Number(phaseHours)) ? 'success' : badgeColorForCount(count);
              //   const showWarning = count === 0 && phaseHours >= HIGH_HOURS_THRESHOLD;
              // Stabilize tooltip to avoid hover flicker as mouse moves over chip/button
              const stableTitle = title;
              return (
                <Tooltip title={stableTitle} enterDelay={400} leaveDelay={200} disableInteractive>
                  <span>
                    <Button onClick={() => openTaskModal(phase)} sx={{ textTransform: 'none', p: 0 }} disableRipple>
                      <Chip label={count} color={badgeColor} size="small" sx={{ cursor: 'pointer', mr: 1 }} />

                    </Button>
                  </span>
                </Tooltip>
              );
            })()}</TableCell>
            <TableCell sx={{ display: 'none' }}>{STATUS_MAP[phase.status] || phase.status}</TableCell>
            <TableCell align="center">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={() => openEditPhaseDialog(phase)} sx={{ color: 'text.secondary' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => openConfirmDelete(phase)} sx={{ color: 'text.secondary' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </TableCell>
          </TableRow>
        ))}
        {filteredPhases.length === 0 && (
          <TableRow><TableCell colSpan={10}><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{hasAnyPhases ? 'ไม่พบผลลัพธ์สำหรับการค้นหา' : 'ยังไม่มีเฟสงาน'}</Typography></TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  // Summary Section removed per request (WBS summary temporarily disabled)

  // Phase and Task dialogs are rendered as memoized top-level components below

  return (
    <Box>
      {/* Header */}
      {/* Project roles summary (positions in this project) - renders above the WBS box */}
      {showTeams !== false && (
        <>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>ทีมงาน</Typography>
            </Box>
            {/* deletion-block notifications are shown as a Snackbar */}
            {/* Teams preview removed: UI now shows only project role positions (รหัส-ตำแหน่ง-อัตรา) */}

            {/* Positions derived from team->position mapping: show only code, label, bill rate */}
            <Table size="small" sx={{ '& th, & td': { borderBottom: 'none' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อตำแหน่ง</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>อัตราค่าบริการ / ชั่วโมง</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // collect unique position ids from all teams (and include project-registered positions as fallback)
                  const posSet = new Set();
                  (teamsList || []).forEach(t => {
                    const arr = teamPositionsMap[String(t.id)] || [];
                    (arr || []).forEach(pid => { if (pid) posSet.add(String(pid)); });
                  });
                  // also include positions explicitly registered for this project
                  (projectRolePositions || []).forEach(r => { if (r && r.position_id) posSet.add(String(r.position_id)); });
                  const posIds = Array.from(posSet);
                  if (!posIds.length) {
                    return (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 2 }}>
                            <Typography variant="body2" color="text.secondary">ยังไม่มีตำแหน่งในทีมงาน</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  // map to display rows
                  const rows = posIds.map(pid => {
                    const p = positionsByIdRef.current[String(pid)];
                    const code = p ? p.code : '';
                    const label = p ? p.label : pid;
                    // find project-specific rate if exists
                    const projRow = (projectRolePositions || []).find(r => String(r.position_id) === String(pid));
                    const derived = aggregatedPositionStats[String(pid)] || aggregatedPositionStats['__no_pos__'] || null;
                    const billValue = projRow && projRow.bill_rate !== null && projRow.bill_rate !== undefined
                      ? Number(projRow.bill_rate)
                      : (derived && derived.avgBill ? Number(derived.avgBill) : null);
                    return { id: pid, code, label, billValue };
                  });
                  return rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.code || r.id}</TableCell>
                      <TableCell>{r.label}</TableCell>
                      <TableCell align="right">{(r.billValue === null || r.billValue === undefined) ? '-' : Number(r.billValue).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        {/* <Typography  sx={{ flex: 1, minWidth: 200 }}>โครงสร้างงาน (WBS)</Typography> */}
        <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 200, fontWeight: 600 }}>
          โครงสร้างงาน
        </Typography>
       
        <Button startIcon={<AddIcon />} variant="outlined" onClick={openNewPhaseDialog} sx={{ color: '#000', borderColor: '#000', '&:hover': { borderColor: '#111', bgcolor: 'transparent' } }}>เพิ่มเฟส</Button>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={openNewTaskDialog} sx={{ color: '#000', borderColor: '#000', '&:hover': { borderColor: '#111', bgcolor: 'transparent' } }}>เพิ่มงาน</Button>
      </Box>

       <TextField
          size="small"
          variant="outlined"
          placeholder="ค้นหาเฟส (รหัส/ชื่อ)"
          value={phaseSearch}
          onChange={e => setPhaseSearch(e.target.value)}
          sx={{ p: 1, mb: 1, minWidth: 220 }}
          fullWidth
        />

      {/* Phases Table / Cards */}
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.7)',
              zIndex: 1,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        

        <Box
          sx={{
            width: '100%',
            overflowX: 'auto',
            opacity: loading ? 0.4 : 1,
            pointerEvents: loading ? 'none' : 'auto',
          }}
        >
          {isXs ? <PhaseCards /> : <PhaseTable />}
        </Box>
      </Box>



      <MemoizedPhaseDialog
        open={phaseDialogOpen}
        onClose={closePhaseDialog}
        editingPhase={editingPhase}
        phaseForm={phaseForm}
        onChangeField={handlePhaseFormChange}
        onSave={persistPhase}
        saving={savingPhase}
        phaseStatuses={phaseStatuses}
        phaseStatusLabels={STATUS_MAP}
        codeRef={phaseCodeRef}
        positions={positionsForPhaseDialog}
        error={phaseSaveError}
        workstreamBudgetAmount={workstreamBudgetAmount}
        phasesForBudget={visiblePhases}
      />
      <MemoizedTaskDialog
        open={taskDialogOpen}
        onClose={closeTaskDialog}
        taskForm={taskForm}
        onChangeField={handleTaskFormChange}
        onSave={persistTask}
        saving={savingTask}
        phases={visiblePhases}
        tasks={tasks}
        codeRef={taskCodeRef}
        employees={React.useMemo(() => {
          try {
            // derive allowed position ids from project role rates (tpr_project_role_rates)
            const rolePosIds = (projectRolePositions || []).map(r => String(r.position_id)).filter(Boolean);
            if (!rolePosIds.length) return employees;
            const posSet = new Set(rolePosIds);
            return (employees || []).filter(emp => emp && emp.position_id && posSet.has(String(emp.position_id)));
          } catch { return employees; }
        }, [employees, projectRolePositions])}
      />
      <MemoizedRolesDialog
        open={rolesDialogOpen}
        onClose={closeRolesDialog}
        positions={positions}
        selectedPositions={rolesSelected}
        onToggle={toggleRoleSelection}
        onSave={() => saveProjectRoles(rolesSelected)}
        saving={rolesSaving}
      />
      <MemoizedTaskListDialog
        open={taskModalOpen}
        onClose={closeTaskModal}
        phase={taskModalPhase}
        tasksForPhase={taskModalPhase ? (tasksByPhase[taskModalPhase.id] || []) : []}
        onEditTask={(t) => openEditTaskFromModal(t)}
        onDeleteTask={(t) => deleteTaskFromModal(t)}
        deletingTaskId={deletingTaskId}
        onAddTask={(phase) => {
          setTaskForm({ code: '', name: '', phase_id: phase?.id || '', planned_hours: '', owner: [] });
          setTaskDialogOpen(true);
          setTaskModalOpen(false);
        }}
        employeesMap={employeesByIdRef.current}
      />

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} keepMounted>
        <DialogTitle>ยืนยันการลบเฟส</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบเฟส {phaseToDelete ? `${phaseToDelete.code} - ${phaseToDelete.name}` : ''} หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} sx={{ color: '#000' }}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={rolesSnackbarOpen} autoHideDuration={6000} onClose={handleRolesSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={handleRolesSnackbarClose}
          severity="error"
          variant="filled"
          sx={{ width: '100%', bgcolor: 'error.main', color: 'common.white' }}
        >
          {rolesDeleteError}
        </Alert>
      </Snackbar>

      <Snackbar open={taskAddWarningOpen} autoHideDuration={6000} onClose={() => setTaskAddWarningOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={() => setTaskAddWarningOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: '100%', bgcolor: 'error.main', color: 'common.white' }}
        >
          {taskAddWarningMessage}
        </Alert>
      </Snackbar>


      {/* floating phase menu removed - inline edit/delete icons are used */}
    </Box>
  );
}

export default React.memo(ProjectWbs);
