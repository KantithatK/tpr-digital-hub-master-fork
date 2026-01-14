import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import dayjs, { Dayjs } from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import 'dayjs/locale/th';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

dayjs.locale('th');
dayjs.extend(weekOfYear);

// ---------- Types ----------
export type StatusKey = 'todo' | 'doing' | 'review' | 'done';
export type PriorityKey = 'low' | 'medium' | 'high' | 'critical';
export type ZoomLevel = 'day' | 'week' | 'month';

export type GanttTask = {
  id: string | number;
  code: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  owner_id?: string | null;
  owner_name?: string | null;
  status: StatusKey;
  priority: PriorityKey;
  progress?: number;
  parentId?: string | number | null;
  dependencies?: Array<string | number>;
};

export type OwnerDirectoryItem = { id: string; label: string; avatarUrl?: string };

export type GanttProps = {
  tasks: GanttTask[];
  zoom?: ZoomLevel;
  onZoomChange?: (z: ZoomLevel) => void;
  ownersDirectory?: OwnerDirectoryItem[];
  showDependencies?: boolean;
  onTaskDateChange?: (
    taskId: string | number,
    startDate: string,
    endDate: string
  ) => void | Promise<void>;
  onOpenTask?: (taskId: string | number) => void;
  onEditTask?: (taskId: string | number) => void;
  onDeleteTask?: (taskId: string | number) => void;
  onChangeStatus?: (taskId: string | number, next: StatusKey) => void;
};

// ---------- Visual constants ----------
const BRAND = '#0ea5e9';
const BG_GRID = '#f8fafc';
const BG_WEEKEND = '#f1f5f9';
const TODAY_COLOR = '#fb923c';

const HEADER_HEIGHT = 52;
const ROW_HEIGHT = 40;
const LEFT_COL_WIDTH = 340;

// ---------- Helpers ----------
function statusColor(s: StatusKey) {
  switch (s) {
    case 'doing':
      return BRAND;
    case 'review':
      return '#f59e0b';
    case 'done':
      return '#22c55e';
    case 'todo':
    default:
      return '#9ca3af';
  }
}

function priorityColor(p: PriorityKey) {
  switch (p) {
    case 'critical':
      return '#b91c1c';
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f97316';
    case 'low':
    default:
      return '#0f766e';
  }
}

function daysBetween(a: Dayjs, b: Dayjs) {
  return b.startOf('day').diff(a.startOf('day'), 'day');
}

function computeBaseRange(tasks: GanttTask[], pad = 3) {
  if (!tasks.length) {
    const today = dayjs().startOf('day');
    return {
      start: today.subtract(7, 'day'),
      end: today.add(21, 'day'),
    };
  }
  let minS = dayjs(tasks[0].start_date).startOf('day');
  let maxE = dayjs(tasks[0].end_date).startOf('day');
  tasks.forEach((t) => {
    const s = dayjs(t.start_date).startOf('day');
    const e = dayjs(t.end_date).startOf('day');
    if (s.isBefore(minS)) minS = s;
    if (e.isAfter(maxE)) maxE = e;
  });
  return { start: minS.subtract(pad, 'day'), end: maxE.add(pad, 'day') };
}

type TreeNode = GanttTask & { depth: number; children: TreeNode[] };

function buildTree(tasks: GanttTask[]): TreeNode[] {
  const map = new Map<string | number, TreeNode>();
  tasks.forEach((t) => map.set(t.id, { ...t, depth: 0, children: [] }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    const parent = node.parentId != null ? map.get(node.parentId) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const ordered: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    ordered.push(n);
    n.children
      .sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf())
      .forEach(walk);
  };
  roots
    .sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf())
    .forEach(walk);

  return ordered;
}

// drag
type DragMode = 'move' | 'resize-start' | 'resize-end';
type DragState = {
  mode: DragMode;
  id: string | number;
  startX: number;
  origStart: string;
  origEnd: string;
  currentStart: string;
  currentEnd: string;
};

const GanttView: React.FC<GanttProps> = ({
  tasks,
  zoom: zoomProp,
  onZoomChange,
  ownersDirectory = [],
  showDependencies = true,
  onTaskDateChange,
  onOpenTask,
  onEditTask,
}) => {
  // ---------- zoom ----------
  const [zoom, setZoom] = React.useState<ZoomLevel>(zoomProp || 'week');
  React.useEffect(() => {
    if (zoomProp) setZoom(zoomProp);
  }, [zoomProp]);

  const handleZoom = (z: ZoomLevel) => {
    setZoom(z);
    onZoomChange?.(z);
  };

  const pxPerDay =
    zoom === 'day' ? 44 :
    zoom === 'week' ? 20 :
    10;

  // ---------- range ----------
  const tree = React.useMemo(() => buildTree(tasks), [tasks]);
  const baseRange = React.useMemo(() => computeBaseRange(tasks), [tasks]);

  const [viewStart, setViewStart] = React.useState<Dayjs>(baseRange.start);
  const [viewEnd, setViewEnd] = React.useState<Dayjs>(baseRange.end);

  React.useEffect(() => {
    setViewStart(baseRange.start);
    setViewEnd(baseRange.end);
  }, [baseRange.start.valueOf(), baseRange.end.valueOf()]);

  const totalDays = Math.max(1, daysBetween(viewStart, viewEnd) + 1);
  const timelineWidth = Math.max(800, totalDays * pxPerDay);

  const shiftWindow = (dir: 'back' | 'forward') => {
    const factor = dir === 'back' ? -1 : 1;
    const step =
      zoom === 'day' ? 7 :
      zoom === 'week' ? 28 :
      90;
    setViewStart((prev) => prev.add(step * factor, 'day'));
    setViewEnd((prev) => prev.add(step * factor, 'day'));
  };

  const resetRange = () => {
    setViewStart(baseRange.start);
    setViewEnd(baseRange.end);
  };

  const centerToday = () => {
    const today = dayjs().startOf('day');
    const span =
      zoom === 'day' ? 7 :
      zoom === 'week' ? 21 :
      60;
    setViewStart(today.subtract(span, 'day'));
    setViewEnd(today.add(span, 'day'));
  };

  const headerScrollRef = React.useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = React.useRef<HTMLDivElement | null>(null);

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // ---------- hover / draft drag ----------
  const [hoverId, setHoverId] = React.useState<string | number | null>(null);
  const [activeId, setActiveId] = React.useState<string | number | null>(null);

  const [draftDates, setDraftDates] = React.useState<
    Record<string, { start: string; end: string }>
  >({});

  const dragRef = React.useRef<DragState | null>(null);

  const getTaskDates = (t: GanttTask) => {
    const key = String(t.id);
    const draft = draftDates[key];
    return {
      start: draft?.start ?? t.start_date,
      end: draft?.end ?? t.end_date,
    };
  };

  const xForDate = (d: string) => {
    const offset = daysBetween(viewStart, dayjs(d));
    return offset * pxPerDay;
  };

  const getBarInfo = (t: GanttTask) => {
    const { start, end } = getTaskDates(t);
    const x = xForDate(start);
    const w = Math.max(pxPerDay, (daysBetween(dayjs(start), dayjs(end)) + 1) * pxPerDay);
    return { x, width: w, start, end };
  };

  const beginDrag = (mode: DragMode, e: React.MouseEvent, t: GanttTask) => {
    e.preventDefault();
    const { start, end } = getTaskDates(t);
    dragRef.current = {
      mode,
      id: t.id,
      startX: e.clientX,
      origStart: start,
      origEnd: end,
      currentStart: start,
      currentEnd: end,
    };
    window.addEventListener('mousemove', onWinMove);
    window.addEventListener('mouseup', onWinUp);
  };

  const onWinMove = (e: MouseEvent) => {
    const st = dragRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dDays = Math.round(dx / pxPerDay);

    let newStart = st.origStart;
    let newEnd = st.origEnd;

    if (st.mode === 'move') {
      newStart = dayjs(st.origStart).add(dDays, 'day').format('YYYY-MM-DD');
      newEnd = dayjs(st.origEnd).add(dDays, 'day').format('YYYY-MM-DD');
    } else if (st.mode === 'resize-start') {
      newStart = dayjs(st.origStart).add(dDays, 'day').format('YYYY-MM-DD');
      if (dayjs(newStart).isAfter(dayjs(st.origEnd))) newStart = st.origEnd;
    } else if (st.mode === 'resize-end') {
      newEnd = dayjs(st.origEnd).add(dDays, 'day').format('YYYY-MM-DD');
      if (dayjs(newEnd).isBefore(dayjs(st.origStart))) newEnd = st.origStart;
    }

    st.currentStart = newStart;
    st.currentEnd = newEnd;

    setDraftDates((prev) => ({
      ...prev,
      [String(st.id)]: { start: newStart, end: newEnd },
    }));
  };

  const onWinUp = () => {
    const st = dragRef.current;
    if (st && onTaskDateChange) {
      const changed =
        st.currentStart !== st.origStart || st.currentEnd !== st.origEnd;
      if (changed) {
        onTaskDateChange(st.id, st.currentStart, st.currentEnd);
      }
    }
    if (st) {
      setDraftDates((prev) => {
        const copy = { ...prev };
        delete copy[String(st.id)];
        return copy;
      });
    }
    dragRef.current = null;
    window.removeEventListener('mousemove', onWinMove);
    window.removeEventListener('mouseup', onWinUp);
  };

  React.useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onWinMove);
      window.removeEventListener('mouseup', onWinUp);
    };
  }, []);

  const handleBarMouseDown = (e: React.MouseEvent, t: GanttTask) => {
    const target = e.target as HTMLElement;
    if (target.dataset.handle) return;
    beginDrag('move', e, t);
  };

  const handleHandleMouseDown = (
    e: React.MouseEvent,
    t: GanttTask,
    which: 'start' | 'end'
  ) => {
    e.stopPropagation();
    beginDrag(which === 'start' ? 'resize-start' : 'resize-end', e, t);
  };

  const scrollToTask = (id: string | number) => {
    const el = document.getElementById(`gbar-${id}`);
    if (!el || !bodyScrollRef.current) return;
    const container = bodyScrollRef.current;
    const rect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const offset = rect.left - cRect.left - 120;
    container.scrollLeft += offset;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = container.scrollLeft;
    }
    setActiveId(id);
    setTimeout(() => setActiveId(null), 700);
  };

  // ---------- header timeline ----------
  const renderHeader = () => {
    const start = viewStart.startOf('day');
    const today = dayjs().startOf('day');

    const topRow: React.ReactNode[] = [];
    const bottomRow: React.ReactNode[] = [];

    if (zoom === 'month') {
      let cur = start.clone();
      while (cur.isBefore(viewEnd)) {
        const mStart = cur.startOf('month');
        const mEnd = mStart.endOf('month');
        const spanEnd = mEnd.isBefore(viewEnd) ? mEnd : viewEnd;
        const spanDays = daysBetween(mStart, spanEnd) + 1;
        const w = spanDays * pxPerDay;
        const label = mStart.format('MMMM YYYY');

        topRow.push(
          <Box
            key={`m-${mStart.toString()}`}
            sx={{
              width: w,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {label}
          </Box>
        );

        // bottom row = week
        let curWeek = mStart.clone();
        while (curWeek.isBefore(spanEnd)) {
          const weekStart = curWeek.startOf('week');
          const weekEnd = weekStart.add(6, 'day');
          const weekSpanEnd = weekEnd.isBefore(spanEnd) ? weekEnd : spanEnd;
          const weekDays = daysBetween(weekStart, weekSpanEnd) + 1;
          const w2 = weekDays * pxPerDay;
          bottomRow.push(
            <Box
              key={`mw-${weekStart.toString()}`}
              sx={{
                width: w2,
                textAlign: 'center',
                fontSize: 11,
                borderRight: '1px solid #e5e7eb',
                py: 0.5,
              }}
            >
              {weekStart.week()}
            </Box>
          );
          curWeek = weekSpanEnd.add(1, 'day');
        }

        cur = spanEnd.add(1, 'day');
      }
    } else {
      const total = totalDays;
      for (let i = 0; i < total; i++) {
        const d = start.add(i, 'day');
        const isToday = d.isSame(today, 'day');
        const isWeekend = [0, 6].includes(d.day());

        topRow.push(
          <Box
            key={`top-${i}`}
            sx={{
              width: pxPerDay,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: d.date() === 1 ? 600 : 400,
              color: d.date() === 1 ? '#64748b' : '#94a3b8',
            }}
          >
            {d.date() === 1 ? d.format('MMM YY') : ''}
          </Box>
        );

        bottomRow.push(
          <Box
            key={`bot-${i}`}
            sx={{
              width: pxPerDay,
              textAlign: 'center',
              fontSize: 11,
              py: 0.3,
              borderRight: '1px solid #e5e7eb',
              bgcolor: isWeekend ? BG_WEEKEND : undefined,
              color: isToday ? TODAY_COLOR : '#0f172a',
              fontWeight: isToday ? 700 : 400,
            }}
          >
            <div>{d.format('DD')}</div>
            <div style={{ fontSize: 10 }}>{d.format('dd')}</div>
          </Box>
        );
      }
    }

    return (
      <Box sx={{ position: 'relative', width: timelineWidth }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>{topRow}</Box>
        <Box sx={{ display: 'flex' }}>{bottomRow}</Box>
      </Box>
    );
  };

  // ---------- dependencies ----------
  const depsOverlay = () => {
    if (!showDependencies || tree.length === 0) return null;

    const byId = new Map<string | number, TreeNode>();
    tree.forEach((n) => byId.set(n.id, n));

    const edges: Array<{ from: TreeNode; to: TreeNode }> = [];
    tree.forEach((n) => {
      (n.dependencies || []).forEach((pid) => {
        const from = byId.get(pid);
        if (from) edges.push({ from, to: n });
      });
    });

    const rowIndex = (node: TreeNode) =>
      tree.findIndex((x) => x.id === node.id);

    return (
      <svg
        width={timelineWidth}
        height={tree.length * ROW_HEIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: 0, // สำคัญ: ให้อยู่เส้นเดียวกับ bar
          pointerEvents: 'none',
        }}
      >
        {edges.map((e, idx) => {
          const fromInfo = getBarInfo(e.from);
          const toInfo = getBarInfo(e.to);
          const fromRow = rowIndex(e.from);
          const toRow = rowIndex(e.to);
          if (fromRow < 0 || toRow < 0) return null;

          const fromX = fromInfo.x + fromInfo.width;
          const fromY = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toX = toInfo.x;
          const toY = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;
          const midX = (fromX + toX) / 2;

          return (
            <path
              key={idx}
              d={`M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`}
              stroke="#bae6fd"
              strokeWidth={1}
              fill="none"
            />
          );
        })}
      </svg>
    );
  };

  // today line
  const today = dayjs().startOf('day');
  const isTodayInView =
    today.isSame(viewStart, 'day') ||
    (today.isAfter(viewStart) && today.isBefore(viewEnd));
  const todayX = isTodayInView
    ? xForDate(today.format('YYYY-MM-DD')) + pxPerDay / 2
    : null;

  // ---------- bar row ----------
  const renderBarRow = (node: TreeNode) => {
    const t = node as GanttTask;
    const { x, width, start, end } = getBarInfo(t);
    const isHover = hoverId === t.id;
    const isActive = activeId === t.id;

    const barColor = priorityColor(t.priority);
    const statusDot = statusColor(t.status);

    const ownerInitial =
      (t.owner_name || '')
        .trim()
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 1) || '?';

    return (
      <Box
        key={t.id}
        sx={{
          position: 'relative',
          height: ROW_HEIGHT,
          borderBottom: '1px solid #e5e7eb',
        }}
        onMouseEnter={() => setHoverId(t.id)}
        onMouseLeave={() => setHoverId(null)}
      >
        <Box
          id={`gbar-${t.id}`}
          onMouseDown={(e) => handleBarMouseDown(e, t)}
          onDoubleClick={() => onEditTask?.(t.id)}
          sx={{
            position: 'absolute',
            left: x,
            top: 6,
            height: ROW_HEIGHT - 12,
            width,
            borderRadius: 999,
            bgcolor: barColor,
            opacity: 0.95,
            border: isHover || isActive ? '2px solid #0f172a' : '1px solid #cbd5f5',
            boxShadow: isHover || isActive
              ? '0 6px 16px rgba(15,23,42,0.20)'
              : '0 2px 6px rgba(15,23,42,0.10)',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            px: 1,
          }}
        >
          {/* owner avatar */}
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '999px',
              bgcolor: 'rgba(15,23,42,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#fff',
              mr: 1,
            }}
          >
            {ownerInitial}
          </Box>

          {/* text */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t.owner_name || '-'}
            </Typography>
          </Box>

          {/* status dot */}
          <Box
            sx={{
              ml: 1,
              width: 10,
              height: 10,
              borderRadius: '999px',
              bgcolor: statusDot,
              border: '1px solid rgba(15,23,42,0.35)',
            }}
          />

          {/* resize handles */}
          <Box
            data-handle="start"
            onMouseDown={(e) => handleHandleMouseDown(e, t, 'start')}
            sx={{
              position: 'absolute',
              left: -5,
              top: 6,
              bottom: 6,
              width: 8,
              borderRadius: 999,
              bgcolor: 'rgba(15,23,42,0.08)',
              cursor: 'ew-resize',
            }}
          />
          <Box
            data-handle="end"
            onMouseDown={(e) => handleHandleMouseDown(e, t, 'end')}
            sx={{
              position: 'absolute',
              right: -5,
              top: 6,
              bottom: 6,
              width: 8,
              borderRadius: 999,
              bgcolor: 'rgba(15,23,42,0.08)',
              cursor: 'ew-resize',
            }}
          />
        </Box>
      </Box>
    );
  };

  // ---------- header controls ----------
  const headerControls = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 1,
        pt: 1,
        pb: 0.5,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        ไทม์ไลน์งานในโครงการ
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
        <Chip
          size="small"
          label="วัน"
          clickable
          variant={zoom === 'day' ? 'filled' : 'outlined'}
          sx={{
            borderRadius: 999,
            bgcolor: zoom === 'day' ? BRAND : undefined,
            color: zoom === 'day' ? '#fff' : undefined,
          }}
          onClick={() => handleZoom('day')}
        />
        <Chip
          size="small"
          label="สัปดาห์"
          clickable
          variant={zoom === 'week' ? 'filled' : 'outlined'}
          sx={{
            borderRadius: 999,
            bgcolor: zoom === 'week' ? BRAND : undefined,
            color: zoom === 'week' ? '#fff' : undefined,
          }}
          onClick={() => handleZoom('week')}
        />
        <Chip
          size="small"
          label="เดือน"
          clickable
          variant={zoom === 'month' ? 'filled' : 'outlined'}
          sx={{
            borderRadius: 999,
            bgcolor: zoom === 'month' ? BRAND : undefined,
            color: zoom === 'month' ? '#fff' : undefined,
          }}
          onClick={() => handleZoom('month')}
        />
      </Box>

      <Box sx={{ flex: 1 }} />

      <Button size="small" onClick={centerToday}>
        วันนี้
      </Button>
      <IconButton size="small" onClick={() => shiftWindow('back')}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => shiftWindow('forward')}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
      <Button size="small" onClick={resetRange}>
        ช่วงทั้งหมด
      </Button>
    </Box>
  );

  // ---------- render ----------
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {headerControls}
      <Divider />

      {/* header timeline */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid #e5e7eb', bgcolor: BG_GRID }}>
        <Box
          sx={{
            width: LEFT_COL_WIDTH,
            height: HEADER_HEIGHT,
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            รายการงาน (Phase / Task)
          </Typography>
        </Box>
        <Box
          ref={headerScrollRef}
          sx={{
            flex: 1,
            overflow: 'hidden',
            height: HEADER_HEIGHT,
          }}
        >
          {renderHeader()}
        </Box>
      </Box>

      {/* body */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 260 }}>
        {/* left list */}
        <Box
          sx={{
            width: LEFT_COL_WIDTH,
            overflowY: 'auto',
            borderRight: '1px solid #e5e7eb',
            bgcolor: '#ffffff',
          }}
        >
          {tree.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ยังไม่มีงานในช่วงเวลานี้
              </Typography>
            </Box>
          ) : (
            tree.map((n) => (
              <Box
                key={n.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: ROW_HEIGHT,
                  borderBottom: '1px solid #f1f5f9',
                  px: 1.5,
                  cursor: 'pointer',
                  bgcolor: hoverId === n.id ? '#f8fafc' : undefined,
                }}
                onClick={() => {
                  scrollToTask(n.id);
                  onOpenTask?.(n.id);
                }}
              >
                <Box sx={{ pl: n.depth * 14, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: n.depth === 0 ? 600 : 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {n.name}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* right timeline */}
        <Box
          ref={bodyScrollRef}
          onScroll={handleBodyScroll}
          sx={{ flex: 1, overflow: 'auto', position: 'relative', bgcolor: BG_GRID }}
        >
          <Box
            sx={{
              position: 'relative',
              width: timelineWidth,
              height: tree.length * ROW_HEIGHT, // ❗ ไม่มี header ซ้ำแล้ว
            }}
          >
            {/* grid background */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
              }}
            >
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = viewStart.add(i, 'day');
                const isWeekend = [0, 6].includes(d.day());
                return (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: i * pxPerDay,
                      width: pxPerDay,
                      bgcolor: isWeekend ? BG_WEEKEND : '#ffffff',
                      borderRight: '1px solid #eef2f7',
                    }}
                  />
                );
              })}

              {/* today line */}
              {isTodayInView && todayX != null && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: todayX,
                    width: 2,
                    bgcolor: TODAY_COLOR,
                    boxShadow: '0 0 0 1px rgba(248,113,113,0.2)',
                  }}
                />
              )}
            </Box>

            {/* bars */}
            <Box
              sx={{
                position: 'absolute',
                top: 0, // ❗ เริ่มแถวแรกตรงกับชื่อ task ด้านซ้าย
                left: 0,
                right: 0,
              }}
            >
              {tree.map((n) => renderBarRow(n))}
            </Box>
          </Box>

          {/* dependencies */}
          {depsOverlay()}
        </Box>
      </Box>
    </Box>
  );
};

export default GanttView;
