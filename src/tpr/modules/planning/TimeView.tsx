import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export type StatusKey = 'todo' | 'doing' | 'review' | 'done';
export type PriorityKey = 'low' | 'medium' | 'high' | 'critical';

export type ProjectTask = {
  id: string | number;
  code?: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  status?: StatusKey;
  priority?: PriorityKey;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

export type TimeEntry = {
  id: string | number;
  taskId: string | number;
  ownerId?: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO; if missing, still running (should be handled by parent)
  minutes?: number; // optional cached minutes; if absent, compute from startedAt/endedAt
};

export type RunningTimer = {
  taskId: string | number;
  ownerId?: string;
  startedAt: string; // ISO
};

export type TimeFilters = {
  query?: string;
  ownerId?: string | null;
  status?: StatusKey | '' | null;
  priority?: PriorityKey | '' | null;
  dateStart?: string | null; // YYYY-MM-DD
  dateEnd?: string | null;   // YYYY-MM-DD
};

export type TimeViewProps = {
  tasks: ProjectTask[];
  entries: TimeEntry[];
  running?: RunningTimer | null; // current active timer if any
  filters?: TimeFilters;
  onFiltersChange?: (f: TimeFilters) => void;
  onStartTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
};

function statusLabelThai(k?: StatusKey) {
  switch (k) {
    case 'doing': return 'กำลังทำ';
    case 'review': return 'รอตรวจ';
    case 'done': return 'เสร็จสิ้น';
    case 'todo':
    default: return 'ยังไม่เริ่ม';
  }
}
function statusColor(k?: StatusKey) {
  switch (k) {
    case 'doing': return 'secondary';
    case 'review': return 'warning';
    case 'done': return 'success';
    case 'todo':
    default: return 'default';
  }
}
function priorityColor(p?: PriorityKey) {
  switch (p) {
    case 'critical': return '#8e0000';
    case 'high': return '#c62828';
    case 'medium': return '#f57c00';
    case 'low':
    default: return '#2e7d32';
  }
}

function minutesBetween(startIso: string, endIso?: string) {
  const s = new Date(startIso).getTime();
  const e = endIso ? new Date(endIso).getTime() : Date.now();
  if (!isFinite(s) || !isFinite(e)) return 0;
  return Math.max(0, Math.round((e - s) / (1000 * 60)));
}
function formatHM(totalMinutes: number) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} ชม. ${mm} นาที`;
}

export default function TimeView({ tasks, entries, running, filters: filtersProp, onFiltersChange, onStartTimer, onStopTimer }: TimeViewProps) {
  const [filters, setFilters] = React.useState<TimeFilters>({ query: '', ownerId: null, status: null, priority: null, dateStart: null, dateEnd: null });
  React.useEffect(() => { if (filtersProp) setFilters({ ...filters, ...filtersProp }); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [filtersProp]);
  const setF = (patch: Partial<TimeFilters>) => { const next = { ...filters, ...patch }; setFilters(next); onFiltersChange && onFiltersChange(next); };

  // Filter tasks by query, owner, status, priority
  const filteredTasks = React.useMemo(() => {
    const q = (filters.query || '').trim().toLowerCase();
    return tasks.filter(t => {
      if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (q) {
        const hay = `${t.code || ''} ${t.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters.query, filters.ownerId, filters.status, filters.priority]);

  // Compute minutes per task based on entries within date range
  const rangeStart = filters.dateStart ? new Date(filters.dateStart + 'T00:00:00').getTime() : null;
  const rangeEnd = filters.dateEnd ? new Date(filters.dateEnd + 'T23:59:59').getTime() : null;
  const minutesByTask: Record<string | number, number> = React.useMemo(() => {
    const acc: Record<string | number, number> = {};
    entries.forEach(e => {
      let mins = typeof e.minutes === 'number' ? e.minutes : minutesBetween(e.startedAt, e.endedAt);
      // Apply date filter: consider overlap with selected range
      const s = new Date(e.startedAt).getTime();
      const endTs = e.endedAt ? new Date(e.endedAt).getTime() : Date.now();
      let include = true;
      if (rangeStart != null && endTs < rangeStart) include = false;
      if (rangeEnd != null && s > rangeEnd) include = false;
      if (!include) return;
      acc[e.taskId] = (acc[e.taskId] || 0) + Math.max(0, mins);
    });
    // Add running timer minutes if running belongs to task and date range overlaps
    if (running) {
      const s = new Date(running.startedAt).getTime();
      const now = Date.now();
      let include = true;
      if (rangeStart != null && now < rangeStart) include = false;
      if (rangeEnd != null && s > rangeEnd) include = false;
      if (include) {
        acc[running.taskId] = (acc[running.taskId] || 0) + Math.max(0, minutesBetween(running.startedAt));
      }
    }
    return acc;
  }, [entries, running, rangeStart, rangeEnd]);

  // Owners directory for dropdown
  const owners = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }>();
    tasks.forEach(t => {
      if (!t.ownerId) return;
      if (!map.has(t.ownerId)) map.set(t.ownerId, { id: t.ownerId, name: t.ownerName || t.ownerId, avatar: t.ownerAvatarUrl });
    });
    return Array.from(map.values());
  }, [tasks]);

  const header = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', p: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>มุมมองเวลา (Timesheet Helper)</Typography>
      <Box sx={{ flex: 1 }} />
      <TextField size="small" label="ค้นหา" value={filters.query || ''} onChange={(e) => setF({ query: e.target.value })} />
      <TextField size="small" select label="ผู้รับผิดชอบ" value={filters.ownerId || ''} onChange={(e) => setF({ ownerId: e.target.value || null })} sx={{ minWidth: 180 }}>
        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
        {owners.map(o => (<MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>))}
      </TextField>
      <TextField size="small" select label="สถานะ" value={filters.status || ''} onChange={(e) => setF({ status: (e.target.value || null) as any })} sx={{ minWidth: 140 }}>
        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
        <MenuItem value="todo">ยังไม่เริ่ม</MenuItem>
        <MenuItem value="doing">กำลังทำ</MenuItem>
        <MenuItem value="review">รอตรวจ</MenuItem>
        <MenuItem value="done">เสร็จสิ้น</MenuItem>
      </TextField>
      <TextField size="small" select label="ความสำคัญ" value={filters.priority || ''} onChange={(e) => setF({ priority: (e.target.value || null) as any })} sx={{ minWidth: 160 }}>
        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
        <MenuItem value="critical">สูงมาก</MenuItem>
        <MenuItem value="high">สูง</MenuItem>
        <MenuItem value="medium">ปานกลาง</MenuItem>
        <MenuItem value="low">ต่ำ</MenuItem>
      </TextField>
      <TextField size="small" type="date" label="ตั้งแต่" InputLabelProps={{ shrink: true }} value={filters.dateStart || ''} onChange={(e) => setF({ dateStart: e.target.value || null })} />
      <TextField size="small" type="date" label="ถึง" InputLabelProps={{ shrink: true }} value={filters.dateEnd || ''} onChange={(e) => setF({ dateEnd: e.target.value || null })} />
    </Box>
  );

  const list = (
    <Stack spacing={1.25}>
      {filteredTasks.map(t => {
        const minutes = minutesByTask[t.id] || 0;
        const runningThis = running && running.taskId === t.id;
        return (
          <Box key={String(t.id)} sx={{ p: 1, borderRadius: 2, border: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar src={t.ownerAvatarUrl} sx={{ width: 28, height: 28 }}>{(t.ownerName || '?').slice(0,1)}</Avatar>
                <Box sx={{ minWidth: 160, overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.ownerName || '-'}</Typography>
                </Box>
                <Chip size="small" label={statusLabelThai(t.status)} color={statusColor(t.status) as any} />
                {t.priority && <Chip size="small" label={t.priority} sx={{ bgcolor: priorityColor(t.priority), color: '#fff' }} />}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ minWidth: 120, textAlign: 'right', fontWeight: 700 }}>{formatHM(minutes)}</Typography>
                {runningThis ? (
                  <Button size="small" variant="outlined" color="error" startIcon={<StopIcon />} onClick={() => onStopTimer && onStopTimer(t.id)}>หยุดจับเวลา</Button>
                ) : (
                  <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => onStartTimer && onStartTimer(t.id)}>เริ่มจับเวลา</Button>
                )}
              </Stack>
            </Stack>
          </Box>
        );
      })}
      {filteredTasks.length === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">ไม่มีงานที่ตรงกับตัวกรองหรือไม่มีงานในโครงการนี้</Typography>
        </Box>
      )}
    </Stack>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {header}
      <Divider />
      <Box sx={{ p: 1 }}>
        {list}
      </Box>
    </Box>
  );
}
