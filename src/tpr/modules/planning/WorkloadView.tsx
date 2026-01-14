import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ClearIcon from '@mui/icons-material/Clear';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SummarizeIcon from '@mui/icons-material/Summarize';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import isBetween from 'dayjs/plugin/isBetween';
// Date pickers (adapter uses dayjs locale set above)
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

dayjs.locale('th');
dayjs.extend(isBetween);

export type PriorityKey = 'low' | 'medium' | 'high' | 'critical';
export type StatusKey = 'todo' | 'doing' | 'review' | 'done';

export type WorkItem = {
  id: string | number;
  name: string;
  ownerId: string;
  ownerName?: string;
  hours: number; // legacy: kept for compatibility
  planned_hours?: number; // use this field (from DB) when summing per-person hours
  status?: StatusKey;
  priority?: PriorityKey;
  dueDate?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  projectId?: string | number;
  projectName?: string;
};

export type Employee = {
  id: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  team?: string;
};

export type TimeRange =
  | { type: 'this-week' }
  | { type: 'next-week' }
  | { type: 'custom'; start?: string; end?: string };

export type WorkloadFilters = {
  query?: string; // employee name search
  department?: string | null;
  team?: string | null;
  projectId?: string | number | null;
  timeRange?: TimeRange;
  sort?: 'overload' | 'name-asc' | 'name-desc';
  showAllEmployees?: boolean; // include employees with 0 hours
};

export type WorkloadViewProps = {
  tasks: WorkItem[];
  employees: Employee[];
  capacityPerWeek?: number; // default 40
  filters?: WorkloadFilters;
  onFiltersChange?: (f: WorkloadFilters) => void;
  onEmployeeClick?: (employeeId: string) => void;
  onOpenDetails?: (employeeId: string) => void;
  onCloseDetails?: (employeeId: string | null) => void;
};

function statusChipColor(s?: StatusKey) {
  switch (s) {
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

function getRange(range?: TimeRange): { start: Dayjs; end: Dayjs } {
  const today = dayjs();
  if (!range || range.type === 'this-week') {
    return { start: today.startOf('week'), end: today.endOf('week') };
  }
  if (range.type === 'next-week') {
    const next = today.add(1, 'week');
    return { start: next.startOf('week'), end: next.endOf('week') };
  }
  // custom
  const start = range.start ? dayjs(range.start) : today.startOf('week');
  const end = range.end ? dayjs(range.end) : today.endOf('week');
  return { start, end };
}

function taskOverlapsWindow(t: WorkItem, start: Dayjs, end: Dayjs): boolean {
  const hasSpan = t.startDate || t.endDate;
  if (hasSpan) {
    const s = dayjs(t.startDate || t.endDate);
    const e = dayjs(t.endDate || t.startDate);
    return s.isBefore(end, 'day') && e.isAfter(start, 'day') || s.isBetween(start, end, 'day', '[]') || e.isBetween(start, end, 'day', '[]');
  }
  if (t.dueDate) {
    const d = dayjs(t.dueDate);
    return d.isBetween(start, end, 'day', '[]');
  }
  return true; // if no dates, include by default
}

export default function WorkloadView({
  tasks,
  employees,
  capacityPerWeek = 40,
  filters: filtersProp,
  onFiltersChange,
  onEmployeeClick,
  onOpenDetails,
  onCloseDetails,
}: WorkloadViewProps) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const defaultFilters = React.useMemo<WorkloadFilters>(() => ({
    query: '',
    timeRange: { type: 'this-week' },
    sort: 'overload',
    showAllEmployees: true,
  }), []);

  const [filters, setFilters] = React.useState<WorkloadFilters>({ ...defaultFilters });
  React.useEffect(() => { if (filtersProp) setFilters({ ...filters, ...filtersProp }); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [filtersProp]);
  const updateFilters = (patch: Partial<WorkloadFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFiltersChange && onFiltersChange(next);
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
    setLocalSearch('');
    setAdvFilters(null);
    setAdvancedOpen(false);
    setSearchOpen(false);
    onFiltersChange && onFiltersChange({ ...defaultFilters });
  };

  const range = React.useMemo(() => getRange(filters.timeRange), [filters.timeRange]);

  // (Removed department/team/project dropdown data — filters removed)

  // Filter employees by name
  const filteredEmployees = React.useMemo(() => {
    const q = (filters.query || '').trim().toLowerCase();
    return employees.filter(e => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [employees, filters.query]);

  // Filter tasks by time window
  const filteredTasks = React.useMemo(() => {
    const { start, end } = range;
    return tasks.filter(t => taskOverlapsWindow(t, start, end));
  }, [tasks, range]);

  // Debug: log incoming tasks (sample) so we can inspect planned_hours values
  React.useEffect(() => {
    try {
      if (!tasks || tasks.length === 0) {
        return;
      }
      const sample = tasks.slice(0, 50).map(t => ({ id: t.id, ownerId: t.ownerId, planned_hours: t.planned_hours, hours: t.hours }));
      // sample kept for potential debugging; no console output
    } catch (err) {
      // suppressed debug logging
    }
  }, [tasks]);

  // Group by employee and sum hours
  // `hours` is the authoritative sum used for totals (planned_hours only)
  // `displayHours` is used for visual bars and falls back to legacy `hours` when planned is absent
  type EmpAgg = { emp: Employee; hours: number; displayHours: number; items: WorkItem[] };
  const aggregates: EmpAgg[] = React.useMemo(() => {
    const byId: Record<string, EmpAgg> = {};
    filteredEmployees.forEach(e => { byId[e.id] = { emp: e, hours: 0, displayHours: 0, items: [] }; });
    filteredTasks.forEach(t => {
      const agg = byId[t.ownerId];
      if (!agg) return; // skip tasks whose owner not in filteredEmployees
      // planned_hours is the authoritative source for aggregation
      const planned = Math.max(0, Number(t.planned_hours !== undefined && t.planned_hours !== null ? t.planned_hours : 0));
      // legacy hours field used only as a visual fallback when planned is missing
      const legacy = Math.max(0, Number(t.hours !== undefined && t.hours !== null ? t.hours : 0));
      agg.hours += planned;
      // prefer planned for display; fall back to legacy if planned is zero
      agg.displayHours += (planned > 0 ? planned : legacy);
      agg.items.push(t);
    });
    return Object.values(byId);
  }, [filteredEmployees, filteredTasks]);

  // Optionally remove zero-hour employees
  const aggregatesShown = React.useMemo(() => {
    const list = filters.showAllEmployees ? aggregates : aggregates.filter(a => a.hours > 0.0001);
    // sort
    if (filters.sort === 'name-asc') return list.sort((a, b) => a.emp.name.localeCompare(b.emp.name));
    if (filters.sort === 'name-desc') return list.sort((a, b) => b.emp.name.localeCompare(a.emp.name));
    // overload: highest percent first
    return list.sort((a, b) => (b.hours / capacityPerWeek) - (a.hours / capacityPerWeek));
  }, [aggregates, filters.showAllEmployees, filters.sort, capacityPerWeek]);

  // Determine max display hours among shown employees to scale bar widths proportionally
  // use displayHours (planned or legacy fallback) so bars remain visible even if planned_hours missing
  const maxDisplayHours = React.useMemo(() => {
    return aggregatesShown.reduce((m, a) => (a.displayHours > m ? a.displayHours : m), 0) || 0;
  }, [aggregatesShown]);

  // Color scale by usage (hours / capacityPerWeek)
  const usageColor = (usage: number) => {
    if (usage > 1.2) return '#b91c1c'; // >120%
    if (usage > 1.0) return '#dc2626'; // 100-120%
    if (usage >= 0.8) return '#fb923c'; // 80-100%
    if (usage >= 0.5) return '#facc15'; // 50-80%
    return '#22c55e'; // <50%
  };

  const [openEmpId, setOpenEmpId] = React.useState<string | null>(null);
  const openAgg = React.useMemo(() => aggregates.find(a => a.emp.id === openEmpId) || null, [aggregates, openEmpId]);

  // Local UI state for the moved toolbar (search / advanced / add / summary)
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [localSearch, setLocalSearch] = React.useState('');
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advFilters, setAdvFilters] = React.useState<WorkloadFilters | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  // keep localSearch in sync with external filters.query
  React.useEffect(() => {
    setLocalSearch(filters.query || '');
  }, [filters.query]);

  // initialize advFilters when opening advanced dialog
  React.useEffect(() => {
    if (advancedOpen) setAdvFilters({ ...filters });
  }, [advancedOpen]);

  // Debounce localSearch -> filters.query updates
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if ((filters.query || '') !== localSearch) {
        updateFilters({ query: localSearch });
      }
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const barColor = (pct: number) => {
    if (pct > 1.0) return '#c62828'; // >100%
    if (pct >= 0.9) return '#ef6c00'; // 90-100
    if (pct >= 0.6) return '#f9a825'; // 60-90
    return '#2e7d32'; // <60
  };

  const header = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center'}}>
      <Box />
      <Box sx={{ flex: 1 }} />
      {/* Advanced dialog opened from Paper's filter icon (TuneIcon) */}
    </Box>
  );

  return (
    <Box sx={{ width: '100%'}}>
      {header}
      <Paper sx={{ mb: 2, p: 1, display: 'flex', alignItems: 'center', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} elevation={0}>
        <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ fontWeight: 700 }}>ภาระงาน</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', pr: 1 }}>
          <Tooltip title="ค้นหา">
            <IconButton size="small" onClick={() => {
              setSearchOpen(s => {
                const next = !s;
                if (!s) setTimeout(() => searchInputRef.current && searchInputRef.current.focus(), 50);
                return next;
              });
            }}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Collapse in={searchOpen} orientation="horizontal" sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ ml: 0.5, width: 240 }}>
              <TextField
                size="small"
                placeholder="ค้นหา"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                inputRef={(el: any) => { searchInputRef.current = el; }}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
                fullWidth
              />
            </Box>
          </Collapse>

          <Tooltip title="ตัวกรองขั้นสูง">
            <IconButton size="small" onClick={() => setAdvancedOpen(true)}>
              <TuneIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="ล้างตัวกรองทั้งหมด">
            <span>
              <IconButton
                size="small"
                onClick={() => { resetFilters(); }}
                disabled={(() => {
                  // enable if any filter differs from default or localSearch has text
                  try {
                    const fStr = JSON.stringify(filters || {});
                    const dStr = JSON.stringify(defaultFilters || {});
                    return !(fStr !== dStr || (localSearch && localSearch.trim().length > 0));
                  } catch (e) {
                    return false;
                  }
                })()}
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>

        
        </Box>
      </Paper>

      {/* Add / Advanced / Summary dialogs (local placeholders) */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มงาน</DialogTitle>
        <DialogContent>
          <Typography>ฟอร์มการเพิ่มงานยังไม่ถูกผูกเข้ากับส่วนนี้ (placeholder)</Typography>
        </DialogContent>
      </Dialog>
      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สรุปงาน</DialogTitle>
        <DialogContent>
          <Typography>สรุปงาน (placeholder)</Typography>
        </DialogContent>
      </Dialog>
      <Dialog open={advancedOpen} onClose={() => { setAdvancedOpen(false); setAdvFilters(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>ตัวกรองขั้นสูง</DialogTitle>
        <DialogContent>
          {advFilters ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField size="small" label="ค้นหาชื่อพนักงาน" value={advFilters.query || ''} onChange={(e) => setAdvFilters(prev => ({ ...(prev || {}), query: e.target.value }))} />

              <FormControl size="small">
                <TextField size="small" select label="ช่วงเวลา" value={advFilters.timeRange?.type || 'this-week'} onChange={(e) => setAdvFilters(prev => ({ ...(prev || {}), timeRange: { type: e.target.value as any } }))} sx={{ minWidth: 260 }}>
                  <MenuItem value="this-week">สัปดาห์นี้</MenuItem>
                  <MenuItem value="next-week">สัปดาห์หน้า</MenuItem>
                  <MenuItem value="custom">ช่วงกำหนดเอง</MenuItem>
                </TextField>
              </FormControl>

              {advFilters.timeRange?.type === 'custom' && (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <DatePicker
                      label="เริ่ม"
                      value={(advFilters.timeRange as any).start ? dayjs((advFilters.timeRange as any).start) : null}
                      onChange={(d) => setAdvFilters(prev => ({ ...(prev || {}), timeRange: { type: 'custom', start: d ? (d as Dayjs).format('YYYY-MM-DD') : undefined, end: prev?.timeRange && 'end' in prev.timeRange ? (prev.timeRange as any).end : undefined } }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    <DatePicker
                      label="สิ้นสุด"
                      value={(advFilters.timeRange as any).end ? dayjs((advFilters.timeRange as any).end) : null}
                      onChange={(d) => setAdvFilters(prev => ({ ...(prev || {}), timeRange: { type: 'custom', start: prev?.timeRange && 'start' in prev.timeRange ? (prev.timeRange as any).start : undefined, end: d ? (d as Dayjs).format('YYYY-MM-DD') : undefined } }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Box>
                </LocalizationProvider>
              )}

              <FormControl size="small">
                <TextField size="small" select label="เรียง" value={advFilters.sort || 'overload'} onChange={(e) => setAdvFilters(prev => ({ ...(prev || {}), sort: e.target.value as any }))} sx={{ minWidth: 260 }}>
                  <MenuItem value="overload">ภาระงานมาก → น้อย</MenuItem>
                  <MenuItem value="name-asc">ชื่อ ก → ฮ</MenuItem>
                  <MenuItem value="name-desc">ชื่อ ฮ → ก</MenuItem>
                </TextField>
              </FormControl>
              <FormControlLabel control={<Checkbox checked={advFilters.showAllEmployees ?? true} onChange={(e) => setAdvFilters(prev => ({ ...(prev || {}), showAllEmployees: e.target.checked }))} />} label="แสดงพนักงานที่ไม่มีชั่วโมงด้วย" />

              {/* spacer to push the checkbox to the bottom */}
              <Box sx={{ flex: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button sx={{ color: 'common.black' }} onClick={() => { setAdvancedOpen(false); setAdvFilters(null); }}>ยกเลิก</Button>
                <Button variant="contained" sx={{ bgcolor: 'common.black', color: '#fff', '&:hover': { bgcolor: 'grey.900' } }} onClick={() => { if (advFilters) { updateFilters(advFilters); } setAdvancedOpen(false); setAdvFilters(null); }}>แสดงผล</Button>
              </Box>
            </Box>
          ) : (
            <Typography>กำลังเตรียมตัวกรอง...</Typography>
          )}
        </DialogContent>
      </Dialog>
      {/* <Divider /> */}
      <Box sx={{ p: 1 }}>
        {aggregatesShown.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center">ไม่มีภาระงานในช่วงเวลานี้</Typography>
        ) : (
          <Stack spacing={1.25} mt={2}>
            {aggregatesShown.map(({ emp, hours, displayHours }) => {
              const usage = capacityPerWeek > 0 ? hours / capacityPerWeek : 0;
              const widthPct = maxDisplayHours > 0 ? (displayHours / maxDisplayHours) * 100 : 0; // relative to max display hours among employees
              const color = usageColor(usage);
              return (
                <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', gap: 1}}>
                  <Avatar src={emp.avatarUrl} sx={{ width: 28, height: 28 }}>{emp.name?.[0] || '?'}</Avatar>
                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1 }}>{emp.name}</Typography>
                    {(emp.department || emp.team) && (
                      <Typography variant="caption" color="text.secondary">{emp.department}{emp.department && emp.team ? ' • ' : ''}{emp.team}</Typography>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      onClick={() => { setOpenEmpId(emp.id); onEmployeeClick && onEmployeeClick(emp.id); onOpenDetails && onOpenDetails(emp.id); }}
                      sx={{ position: 'relative', flex: 1, height: 10, bgcolor: '#f1f5f9', borderRadius: 999, cursor: 'pointer', overflow: 'hidden' }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${widthPct}%`,
                          bgcolor: color,
                          transition: 'width .3s',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 140, textAlign: 'right' }}>
                      {Math.round(hours * 10) / 10} ชม. / สัปดาห์
                      {/* <Typography component="span" variant="caption" sx={{ ml: 0.75, color: usage > 1 ? '#dc2626' : 'text.secondary' }}>
                        ({Math.round(usage * 100)}%)
                      </Typography> */}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Details: modal on desktop, drawer on small screens */}
      {openAgg && (
        small ? (
          <Drawer anchor="bottom" open={!!openAgg} onClose={() => { const id = openAgg.emp.id; setOpenEmpId(null); onCloseDetails && onCloseDetails(id); }} PaperProps={{ sx: { maxHeight: '70vh' } }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{openAgg.emp.name}</Typography>
                <IconButton size="small" onClick={() => { const id = openAgg.emp.id; setOpenEmpId(null); onCloseDetails && onCloseDetails(id); }}><CloseIcon /></IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>รวมชั่วโมง: {Math.round(openAgg.hours * 10) / 10} ชม. / สัปดาห์</Typography>
              <DetailsTable items={openAgg.items} />
            </Box>
          </Drawer>
        ) : (
          <Dialog open={!!openAgg} onClose={() => { const id = openAgg.emp.id; setOpenEmpId(null); onCloseDetails && onCloseDetails(id); }} maxWidth="md" fullWidth>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{openAgg.emp.name}</Typography>
                <IconButton size="small" onClick={() => { const id = openAgg.emp.id; setOpenEmpId(null); onCloseDetails && onCloseDetails(id); }}><CloseIcon /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>รวมชั่วโมง: {Math.round(openAgg.hours * 10) / 10} ชม. / สัปดาห์</Typography>
              <DetailsTable items={openAgg.items} />
            </DialogContent>
          </Dialog>
        )
      )}
    </Box>
  );
}

function DetailsTable({ items }: { items: WorkItem[] }) {
  const rows = React.useMemo(() => {
    // sort by planned_hours when available, otherwise treat missing as 0
    return [...items].sort((a, b) => ((b.planned_hours || 0) - (a.planned_hours || 0)));
  }, [items]);
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>งาน</TableCell>
          <TableCell align="right">ชั่วโมง</TableCell>
          <TableCell>สถานะ</TableCell>
          <TableCell>ความสำคัญ</TableCell>
          <TableCell>กำหนดส่ง</TableCell>
          <TableCell>โปรเจกต์</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(r => (
          <TableRow key={String(r.id)}>
            <TableCell>
              <Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                {r.startDate || r.endDate ? (
                  <Typography variant="caption" color="text.secondary">{r.startDate || '-'} → {r.endDate || '-'}</Typography>
                ) : null}
              </Stack>
            </TableCell>
            <TableCell align="right">{Math.round(((r.planned_hours !== undefined && r.planned_hours !== null) ? r.planned_hours : 0) * 10) / 10}</TableCell>
            <TableCell>{r.status ? <Chip size="small" label={r.status} color={statusChipColor(r.status) as any} /> : '-'}</TableCell>
            <TableCell>{r.priority ? <Chip size="small" label={r.priority} sx={{ bgcolor: priorityColor(r.priority), color: '#fff' }} /> : '-'}</TableCell>
            <TableCell>{r.dueDate || '-'}</TableCell>
            <TableCell>{r.projectName || r.projectId || '-'}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6}>
              <Typography variant="body2" color="text.secondary">ไม่มีงานของพนักงานคนนี้ในช่วงเวลาที่เลือก</Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
