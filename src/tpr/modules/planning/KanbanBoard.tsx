import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { ProjectBoardTask, StatusKey, PriorityKey } from './ProjectBoardView';

// Ensure Thai locale for date pickers
dayjs.locale('th');

export type KanbanOnDrop = (taskId: number, fromStatus: StatusKey, toStatus: StatusKey) => Promise<void> | void;
export type KanbanOnOpen = (taskId: number) => void;
export type KanbanOnEdit = (taskId: number) => void;
export type KanbanOnDelete = (taskId: number) => void;
export type KanbanOnMoveProject = (taskId: number) => void;
export type KanbanOnChangePriority = (taskId: number, priority: PriorityKey) => void;

export type SortKey = 'due' | 'priority' | 'created';

export type QuickFilters = {
    query: string;
    owners: string[]; // employee ids
    priorities: PriorityKey[];
    startDate: string | null; // YYYY-MM-DD
    endDate: string | null; // YYYY-MM-DD
};

export type WipLimits = Partial<Record<StatusKey, number>>;

export type KanbanProps = {
    tasks: ProjectBoardTask[];
    onDrop: KanbanOnDrop;
    onOpen?: KanbanOnOpen;
    onEdit?: KanbanOnEdit;
    onDelete?: KanbanOnDelete;
    onMoveProject?: KanbanOnMoveProject;
    onChangePriority?: KanbanOnChangePriority;
    onAddTask?: () => void;
    ownersDirectory?: Array<{ id: string; label: string; avatarUrl?: string }>; // for filter select, avatar
    sortKey?: SortKey;
    wipLimits?: WipLimits;
    hideDone?: boolean;
    collapsible?: boolean; // enable collapse/expand headers
    quickFilters?: QuickFilters;
    onQuickFiltersChange?: (filters: QuickFilters) => void;
};

const statusOrder: StatusKey[] = ['todo', 'doing', 'review', 'done'];

function statusLabelThai(key: StatusKey) {
    switch (key) {
        case 'doing': return 'กำลังทำ';
        case 'review': return 'รอตรวจ';
        case 'done': return 'เสร็จสิ้น';
        case 'todo':
        default: return 'ยังไม่เริ่ม';
    }
}

function statusColor(key: StatusKey) {
    switch (key) {
        case 'doing': return '#f1e9ff';
        case 'review': return '#fff1e6';
        case 'done': return '#e9fbf3';
        case 'todo':
        default: return '#f5f6f8';
    }
}

function priorityColor(p: PriorityKey) {
    switch (p) {
        case 'high': return '#c62828';
        case 'critical': return '#8e0000';
        case 'medium': return '#f57c00';
        case 'low':
        default: return '#00796b';
    }
}

function formatDate(d?: string | null) {
    if (!d) return '-';
    return dayjs(d).format('DD/MM/YYYY');
}

function sortTasks(items: ProjectBoardTask[], key: SortKey) {
    const arr = [...items];
    if (key === 'due') {
        arr.sort((a, b) => {
            const da = a.end_date ? dayjs(a.end_date).valueOf() : Number.POSITIVE_INFINITY;
            const db = b.end_date ? dayjs(b.end_date).valueOf() : Number.POSITIVE_INFINITY;
            return da - db;
        });
    } else if (key === 'priority') {
        const rank: Record<PriorityKey, number> = { critical: 0, high: 1, medium: 2, low: 3 } as any;
        arr.sort((a, b) => (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99));
    } else {
        // created: approximate by id ascending
        arr.sort((a, b) => a.id - b.id);
    }
    return arr;
}

function applyFilters(items: ProjectBoardTask[], filters?: QuickFilters) {
    if (!filters) return items;
    const { query, owners, priorities, startDate, endDate } = filters;
    return items.filter(t => {
        if (query && query.trim().length > 0) {
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
        if (startDate) {
            const sd = dayjs(startDate);
            const td = t.end_date ? dayjs(t.end_date) : null;
            if (td && td.isBefore(sd, 'day')) return false;
        }
        if (endDate) {
            const ed = dayjs(endDate);
            const td = t.end_date ? dayjs(t.end_date) : null;
            if (td && td.isAfter(ed, 'day')) return false;
        }
        return true;
    });
}

export default function KanbanBoard({
    tasks,
    onDrop,
    onOpen,
    onEdit,
    onDelete,
    onMoveProject,
    onChangePriority,
    onAddTask,
    ownersDirectory = [],
    sortKey = 'due',
    wipLimits,
    hideDone,
    collapsible = true,
    quickFilters,
    onQuickFiltersChange,
}: KanbanProps) {
    const [collapsed, setCollapsed] = React.useState<Record<StatusKey, boolean>>({ todo: false, doing: false, review: false, done: false });
    const [dragOver, setDragOver] = React.useState<StatusKey | null>(null);

    const grouped = React.useMemo(() => {
        const map: Record<StatusKey, ProjectBoardTask[]> = { todo: [], doing: [], review: [], done: [] } as any;
        tasks.forEach(t => { map[t.status].push(t); });
        statusOrder.forEach(s => { map[s] = sortTasks(applyFilters(map[s], quickFilters), sortKey); });
        return map;
    }, [tasks, quickFilters, sortKey]);

    const counts = React.useMemo(() => {
        const c: Record<StatusKey, number> = { todo: 0, doing: 0, review: 0, done: 0 } as any;
        statusOrder.forEach(s => { c[s] = grouped[s].length; });
        return c;
    }, [grouped]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, t: ProjectBoardTask) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: t.id, from: t.status }));
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: StatusKey) => {
        e.preventDefault();
        setDragOver(status);
    };
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, toStatus: StatusKey) => {
        e.preventDefault();
        setDragOver(null);
        try {
            const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
            const taskId = Number(payload.id);
            const from: StatusKey = payload.from;
            if (taskId && from && toStatus && from !== toStatus) {
                await onDrop(taskId, from, toStatus);
            }
        } catch (err) {
            // ignore
        }
    };

    const renderCard = (t: ProjectBoardTask) => (
        <Box
            key={t.id}
            draggable
            onDragStart={(e) => { e.currentTarget.style.cursor = 'grabbing'; handleDragStart(e, t); }}
            onDragEnd={(e) => { e.currentTarget.style.cursor = 'grab'; }}
            sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: '#fff',
                border: '1px solid #eee',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'grab',
                transition: 'box-shadow 120ms ease, transform 120ms ease',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transform: 'translateY(-2px)'
                },
                '&:active': {
                    cursor: 'grabbing'
                }
            }}
        >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                <Box sx={{ minWidth: 0 }}>
                    {/* <Typography variant="caption" color="text.secondary">{t.code}</Typography> */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</Typography>
                </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{(t.owner_name || '-').charAt(0) || '-'}</Avatar>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.owner_name || '-'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <Chip size="small" label={formatDate(t.end_date)} sx={{ bgcolor: '#f0f0f0' }} />
                <Chip size="small" label={t.priority === 'critical' ? 'สูงมาก' : t.priority === 'high' ? 'สูง' : t.priority === 'medium' ? 'ปานกลาง' : 'ต่ำ'} sx={{ bgcolor: priorityColor(t.priority), color: '#fff' }} />
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Tooltip title="ไฟล์แนบ"><AttachFileOutlined fontSize="small" /></Tooltip>
                    <Typography variant="caption">{t.attachments_count ?? 0}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Tooltip title="คอมเมนต์"><ChatBubbleOutlineOutlined fontSize="small" /></Tooltip>
                    <Typography variant="caption">{t.comments_count ?? 0}</Typography>
                </Stack>
            </Stack>
            {/* action icons removed per request */}
        </Box>
    );

    // Filter UI and the Add Task button were removed per request.

    const Column = ({ status }: { status: StatusKey }) => {
        if (hideDone && status === 'done') return null;
        const items = grouped[status];
        const limit = wipLimits?.[status];
        const overLimit = typeof limit === 'number' && items.length > limit;
        const isCollapsed = collapsed[status];
        const title = `${statusLabelThai(status)} (${items.length})`;
        return (
            <Box
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: { md: '1 1 0' },
                    width: { xs: '100%', md: 'auto' },
                    height: { xs: 'auto', md: '100%' },
                    minWidth: 0,
                    bgcolor: statusColor(status),
                    borderRadius: 1.5,
                    p: 1,
                    border: '1px solid #e0e0e0',
                    ...(dragOver === status ? { outline: '2px dashed #888' } : {}),
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
                    {collapsible && (
                        <IconButton size="small" onClick={() => setCollapsed((c) => ({ ...c, [status]: !c[status] }))} aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}>
                            {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                        </IconButton>
                    )}
                </Stack>
                {overLimit && (
                    <Box sx={{ p: 0.5, mb: 1, borderRadius: 1, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                        <Typography variant="caption" sx={{ color: '#e65100' }}>สถานะนี้เกิน WIP limit</Typography>
                    </Box>
                )}
                <Box sx={{ flex: 1, overflowY: 'auto', display: isCollapsed ? 'none' : 'block', gap: 1, '& > * + *': { mt: 1 } }}>
                    {items.length === 0 ? (
                        <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#fff', border: '1px dashed #ccc', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">ยังไม่มีงานในสถานะนี้</Typography>
                        </Box>
                    ) : (
                        items.map(renderCard)
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ width: '100%', p: 1, minHeight: '100vh' }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', overflowX: 'auto', pb: 1, flexDirection: { xs: 'column', md: 'row' } }}>
                {statusOrder.map((s) => (
                    <Column key={s} status={s} />
                ))}
            </Box>
        </Box>
    );
}
