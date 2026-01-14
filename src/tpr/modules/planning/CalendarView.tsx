import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';

// Thai locale for date handling
dayjs.locale('th');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export type StatusKey = 'todo' | 'doing' | 'review' | 'done';
export type PriorityKey = 'low' | 'medium' | 'high' | 'critical';
export type CalendarViewMode = 'month' | 'week' | 'day';
export type DateMode = 'start' | 'end';

export type CalendarTask = {
  id: string | number;
  code: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  owner_id?: string | null;
  owner_name?: string | null;
  priority: PriorityKey;
  status: StatusKey;
};

export type CalendarFilters = {
  query: string;
  owners: string[];
  priorities: PriorityKey[];
};

export type OwnerDirectoryItem = { id: string; label: string; avatarUrl?: string };

export type CalendarProps = {
  tasks: CalendarTask[];
  view?: CalendarViewMode;
  onViewChange?: (v: CalendarViewMode) => void;
  dateMode?: DateMode; // whether to place tasks by start or end date
  onDateModeChange?: (m: DateMode) => void;
  anchorDate?: string; // YYYY-MM-DD view anchor
  onAnchorDateChange?: (d: string) => void;
  ownersDirectory?: OwnerDirectoryItem[];
  filters?: CalendarFilters;
  onFiltersChange?: (f: CalendarFilters) => void;
  // events
  onEventClick?: (taskId: string | number) => void;
  onEventDrop?: (taskId: string | number, newStart: string, newEnd: string) => void | Promise<void>;
};

function priorityColor(p: PriorityKey) {
  switch (p) {
    case 'critical': return '#8e0000';
    case 'high': return '#c62828';
    case 'medium': return '#f57c00';
    case 'low':
    default: return '#00796b';
  }
}
function isLate(t: CalendarTask) {
  return t.status !== 'done' && dayjs(t.end_date).isBefore(dayjs(), 'day');
}

function applyFilters(items: CalendarTask[], f?: CalendarFilters) {
  if (!f) return items;
  const { query, owners, priorities } = f;
  return items.filter(t => {
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${t.code} ${t.name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (owners && owners.length > 0) {
      if (!t.owner_id || !owners.includes(t.owner_id)) return false;
    }
    if (priorities && priorities.length > 0) {
      if (!priorities.includes(t.priority)) return false;
    }
    return true;
  });
}

function startOfCalendarMonth(d: Dayjs) {
  // Sunday start calendar grid
  const first = d.startOf('month');
  return first.startOf('week');
}
function endOfCalendarMonth(d: Dayjs) {
  const last = d.endOf('month');
  return last.endOf('week');
}

export default function CalendarView({
  tasks,
  view: viewProp,
  onViewChange,
  dateMode: dateModeProp,
  onDateModeChange,
  anchorDate: anchorProp,
  onAnchorDateChange,
  ownersDirectory = [],
  filters: filtersProp,
  onFiltersChange,
  onEventClick,
  onEventDrop,
}: CalendarProps) {
  const [view, setView] = React.useState<CalendarViewMode>(viewProp || 'month');
  React.useEffect(() => { if (viewProp) setView(viewProp); }, [viewProp]);
  const handleView = (v: CalendarViewMode) => { setView(v); onViewChange && onViewChange(v); };

  const [dateMode, setDateMode] = React.useState<DateMode>(dateModeProp || 'end');
  React.useEffect(() => { if (dateModeProp) setDateMode(dateModeProp); }, [dateModeProp]);
  const handleDateMode = (m: DateMode) => { setDateMode(m); onDateModeChange && onDateModeChange(m); };

  const [anchor, setAnchor] = React.useState<Dayjs>(anchorProp ? dayjs(anchorProp) : dayjs());
  React.useEffect(() => { if (anchorProp) setAnchor(dayjs(anchorProp)); }, [anchorProp]);
  const setAnchorStr = (d: Dayjs) => { setAnchor(d); onAnchorDateChange && onAnchorDateChange(d.format('YYYY-MM-DD')); };

  const [filters, setFilters] = React.useState<CalendarFilters>(filtersProp || { query: '', owners: [], priorities: [] });
  React.useEffect(() => { if (filtersProp) setFilters(filtersProp); }, [filtersProp]);
  const setF = (f: CalendarFilters) => { setFilters(f); onFiltersChange && onFiltersChange(f); };

  const filtered = React.useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  // DnD: event payload
  const dragRef = React.useRef<{ id: string|number; duration: number } | null>(null);

  const onEventDragStart = (e: React.DragEvent, t: CalendarTask) => {
    const dur = dayjs(t.end_date).diff(dayjs(t.start_date), 'day');
    dragRef.current = { id: t.id, duration: Math.max(0, dur) };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDayDrop = async (d: string) => {
    if (!dragRef.current) return;
    const { id, duration } = dragRef.current;
    if (!onEventDrop) return;
    try {
      let newStart = d;
      let newEnd = dayjs(d).add(duration, 'day').format('YYYY-MM-DD');
      if (dateMode === 'end') {
        // align end date to drop date
        newEnd = d;
        newStart = dayjs(d).add(-duration, 'day').format('YYYY-MM-DD');
      }
      await onEventDrop(id, newStart, newEnd);
    } finally {
      dragRef.current = null;
    }
  };

  // Toolbar
  const header = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', p: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{anchor.format('MMMM YYYY')}</Typography>
      <IconButton size="small" onClick={() => setAnchorStr(anchor.add(-1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'))}><ChevronLeftIcon /></IconButton>
      <IconButton size="small" onClick={() => setAnchorStr(anchor.add(1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'))}><ChevronRightIcon /></IconButton>
      <Button size="small" startIcon={<TodayIcon />} onClick={() => setAnchorStr(dayjs())}>วันนี้</Button>
      <Box sx={{ flex: 1 }} />
      <TextField size="small" select label="มุมมอง" value={view} onChange={(e) => handleView(e.target.value as CalendarViewMode)} sx={{ minWidth: 140 }}>
        <MenuItem value="month">เดือน</MenuItem>
        <MenuItem value="week">สัปดาห์</MenuItem>
        <MenuItem value="day">วัน</MenuItem>
      </TextField>
      <TextField size="small" select label="โหมดวันที่" value={dateMode} onChange={(e) => handleDateMode(e.target.value as DateMode)} sx={{ minWidth: 160 }}>
        <MenuItem value="start">แสดงตามวันที่เริ่ม</MenuItem>
        <MenuItem value="end">แสดงตามวันที่สิ้นสุด</MenuItem>
      </TextField>
      <TextField size="small" label="ค้นหา" value={filters.query} onChange={(e) => setF({ ...filters, query: e.target.value })} />
      <TextField size="small" select label="ผู้รับผิดชอบ" value={filters.owners[0] || ''} onChange={(e) => setF({ ...filters, owners: e.target.value ? [String(e.target.value)] : [] })} sx={{ minWidth: 180 }}>
        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
        {ownersDirectory.map(o => (<MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>))}
      </TextField>
      <TextField size="small" select label="ความสำคัญ" value={filters.priorities[0] || ''} onChange={(e) => setF({ ...filters, priorities: e.target.value ? [e.target.value as PriorityKey] : [] })} sx={{ minWidth: 160 }}>
        <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
        <MenuItem value="critical">สูงมาก</MenuItem>
        <MenuItem value="high">สูง</MenuItem>
        <MenuItem value="medium">ปานกลาง</MenuItem>
        <MenuItem value="low">ต่ำ</MenuItem>
      </TextField>
    </Box>
  );

  // Month grid helpers
  const renderDayCellContent = (day: Dayjs) => {
    const dayStr = day.format('YYYY-MM-DD');
    // tasks by dateMode
    const dayTasks = filtered.filter(t => {
      if (dateMode === 'start') return dayjs(t.start_date).isSame(day, 'day');
      return dayjs(t.end_date).isSame(day, 'day');
    });
    const maxInline = 3;
    const overflow = Math.max(0, dayTasks.length - maxInline);
    return (
      <Box
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDayDrop(dayStr)}
        sx={{ p: 0.5, minHeight: 88 }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
          <Box sx={{ width: 22, height: 22, lineHeight: '22px', textAlign: 'center', borderRadius: '50%', bgcolor: day.isSame(dayjs(), 'day') ? '#000' : 'transparent', color: day.isSame(dayjs(), 'day') ? '#fff' : 'inherit', fontSize: 12 }}>{day.date()}</Box>
          {day.month() !== anchor.month() && <Typography variant="caption" color="text.secondary">{day.format('MMM')}</Typography>}
        </Stack>
        <Stack spacing={0.5}>
          {dayTasks.slice(0, maxInline).map(t => (
            <Box key={t.id} draggable onDragStart={(e) => onEventDragStart(e, t)} onClick={() => onEventClick && onEventClick(t.id)} sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: priorityColor(t.priority), color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</Typography>
              {isLate(t) && <Chip size="small" label="เกินกำหนด" color="error" sx={{ height: 18 }} />}
            </Box>
          ))}
          {overflow > 0 && (
            <Typography variant="caption" color="text.secondary">+{overflow} งานเพิ่มเติม</Typography>
          )}
        </Stack>
      </Box>
    );
  };

  const monthView = () => {
    const start = startOfCalendarMonth(anchor);
    const end = endOfCalendarMonth(anchor);
    const days: Dayjs[] = [];
    let cur = start.clone();
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      days.push(cur);
      cur = cur.add(1, 'day');
    }
    const weekRows: Dayjs[][] = [];
    for (let i = 0; i < days.length; i += 7) weekRows.push(days.slice(i, i + 7));

    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', px: 1, py: 0.5, color: 'text.secondary', fontSize: 12 }}>
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<Box key={i} sx={{ px: 1 }}>{d}</Box>))}
        </Box>
        <Divider />
        <Box>
          {weekRows.map((week, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee', '& > *': { borderRight: '1px solid #eee' }, '& > *:last-child': { borderRight: 'none' } }}>
              {week.map((d, i) => (
                <Box key={i} sx={{ minHeight: 120 }}>{renderDayCellContent(d)}</Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const weekView = () => {
    const start = anchor.startOf('week');
    const days = Array.from({ length: 7 }).map((_, i) => start.add(i, 'day'));

    // Bars overlay within the week: build bars per row stacking
    type Bar = { task: CalendarTask; startIdx: number; endIdx: number; row: number };
    const weekTasks = filtered.filter(t => dayjs(t.end_date).isSameOrAfter(start, 'day') && dayjs(t.start_date).isSameOrBefore(start.add(6, 'day'), 'day'));
    const bars: Bar[] = [];
    const rows: number[][] = []; // occupancy by column index
    weekTasks.forEach(t => {
      const s = dayjs(t.start_date).isBefore(start) ? start : dayjs(t.start_date);
      const e = dayjs(t.end_date).isAfter(start.add(6, 'day')) ? start.add(6, 'day') : dayjs(t.end_date);
      const startIdx = Math.max(0, s.diff(start, 'day'));
      const endIdx = Math.min(6, e.diff(start, 'day'));
      // find row to place
      let row = 0;
      while (true) {
        if (!rows[row]) rows[row] = [];
        let collision = false;
        for (let c = startIdx; c <= endIdx; c++) {
          if (rows[row][c]) { collision = true; break; }
        }
        if (!collision) {
          for (let c = startIdx; c <= endIdx; c++) rows[row][c] = 1;
          bars.push({ task: t, startIdx, endIdx, row });
          break;
        }
        row += 1;
      }
    });

    const colWidth = 1 / 7 * 100;
    const rowHeight = 22;

    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', px: 1, py: 0.5, color: 'text.secondary', fontSize: 12 }}>
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<Box key={i} sx={{ px: 1 }}>{d}</Box>))}
        </Box>
        <Divider />
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee', '& > *': { borderRight: '1px solid #eee' }, '& > *:last-child': { borderRight: 'none' } }}>
            {days.map((d, i) => (
              <Box key={i} onDragOver={(e) => e.preventDefault()} onDrop={() => onDayDrop(d.format('YYYY-MM-DD'))} sx={{ minHeight: 120, p: 0.5 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box sx={{ width: 22, height: 22, lineHeight: '22px', textAlign: 'center', borderRadius: '50%', bgcolor: d.isSame(dayjs(), 'day') ? '#000' : 'transparent', color: d.isSame(dayjs(), 'day') ? '#fff' : 'inherit', fontSize: 12 }}>{d.date()}</Box>
                </Stack>
              </Box>
            ))}
          </Box>
          {/* Bars overlay */}
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 28 }}>
            {bars.map((b, i) => (
              <Box key={i} draggable onDragStart={(e) => onEventDragStart(e, b.task)} onClick={() => onEventClick && onEventClick(b.task.id)} sx={{ position: 'absolute', left: `${b.startIdx * colWidth}%`, width: `${(b.endIdx - b.startIdx + 1) * colWidth}%`, height: rowHeight, top: b.row * (rowHeight + 6), bgcolor: priorityColor(b.task.priority), borderRadius: 6, color: '#fff', px: 1, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'grab', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.task.name}</Typography>
                {isLate(b.task) && <Chip size="small" label="เกินกำหนด" color="error" sx={{ height: 18 }} />}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };

  const dayView = () => {
    const start = anchor.startOf('day');
    const items = filtered.filter(t => {
      if (dateMode === 'start') return dayjs(t.start_date).isSame(start, 'day');
      return dayjs(t.end_date).isSame(start, 'day');
    });
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', px: 1, py: 0.5, color: 'text.secondary', fontSize: 12 }}>
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<Box key={i} sx={{ px: 1 }}>{d}</Box>))}
        </Box>
        <Divider />
        <Box sx={{ p: 1 }}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">ยังไม่มีงานในช่วงเวลานี้</Typography>
          ) : (
            <Stack spacing={1}>
              {items.map(t => (
                <Box key={t.id} draggable onDragStart={(e) => onEventDragStart(e, t)} onClick={() => onEventClick && onEventClick(t.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDayDrop(start.format('YYYY-MM-DD'))}
                  sx={{ p: 1, borderRadius: 1, bgcolor: priorityColor(t.priority), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'grab' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.name}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>{t.code}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {isLate(t) && <Chip size="small" label="เกินกำหนด" color="error" />}
                    <Tooltip title="เปิดรายละเอียด"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(t.id); }}><OpenInNewOutlined fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="แก้ไข"><IconButton size="small"><EditOutlined fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small"><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {header}
      <Divider />
      <Box sx={{ p: 1 }}>
        {view === 'month' && monthView()}
        {view === 'week' && weekView()}
        {view === 'day' && dayView()}
      </Box>
    </Box>
  );
}
