import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
// set global locale to Thai for the datepickers in this component
dayjs.locale('th');
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { StatusKey, PriorityKey } from './ProjectBoardView';

// Types
export type OwnerOption = { id: string; name: string };

export type TaskFilters = {
  status: StatusKey[]; // empty => all
  ownerMode: 'all' | 'mine' | 'custom';
  selectedOwners: string[]; // used when ownerMode === 'custom'
  datePreset: 'all' | 'today' | '7days' | 'month' | 'range';
  dateField: 'start' | 'end';
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  priority: PriorityKey[]; // empty => all
  search: string;
};

type Props = {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  availableOwners?: OwnerOption[]; // list used for "เลือกคน..."
  currentUserId?: string | null; // used for "งานของฉัน"
};

const STATUS_LABELS: { key: StatusKey; label: string }[] = [
  { key: 'todo', label: 'ยังไม่เริ่ม' },
  { key: 'doing', label: 'กำลังทำ' },
  { key: 'review', label: 'รอตรวจ' },
  { key: 'done', label: 'เสร็จสิ้น' },
];

const PRIORITY_LABELS: { key: PriorityKey; label: string }[] = [
  { key: 'high', label: 'สูง' },
  { key: 'medium', label: 'ปานกลาง' },
  { key: 'low', label: 'ต่ำ' },
];

export default function TaskQuickFilterBar({ filters, onChange, availableOwners = [], currentUserId }: Props) {
  const [localSearch, setLocalSearch] = React.useState<string>(filters.search || '');
  const searchTimer = React.useRef<number | null>(null);

  // keep localSearch in sync when parent updates search externally
  React.useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Debounce search: notify parent after 300ms
  React.useEffect(() => {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }
    // use window.setTimeout to get numeric id type
    searchTimer.current = window.setTimeout(() => {
      onChange({ ...filters, search: localSearch });
      searchTimer.current = null;
    }, 300) as unknown as number;
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  // Helper to update filters immediately (non-search fields)
  const update = (partial: Partial<TaskFilters>) => {
    onChange({ ...filters, ...partial });
  };

  const toggleStatus = (s: StatusKey) => {
    const next = new Set(filters.status || []);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    update({ status: Array.from(next) });
  };

  const togglePriority = (p: PriorityKey) => {
    const next = new Set(filters.priority || []);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    update({ priority: Array.from(next) });
  };

  const handleOwnerModeChange = (value: Props['filters']['ownerMode']) => {
    if (value === 'mine') {
      // set selectedOwners to currentUserId if available
      update({ ownerMode: 'mine', selectedOwners: currentUserId ? [currentUserId] : [] });
    } else if (value === 'all') {
      update({ ownerMode: 'all', selectedOwners: [] });
    } else {
      update({ ownerMode: 'custom' });
    }
  };

  const handleCustomOwnersChange = (selected: string[]) => {
    update({ selectedOwners: selected, ownerMode: 'custom' });
  };

  const handlePresetChange = (preset: TaskFilters['datePreset']) => {
    // when changing preset, clear range dates unless range selected
    if (preset === 'range') {
      update({ datePreset: 'range' });
    } else {
      update({ datePreset: preset, startDate: null, endDate: null });
    }
  };

  const handleDateFieldChange = (field: TaskFilters['dateField']) => update({ dateField: field });

  const handleRangeChange = (field: 'startDate' | 'endDate', value: string | null) => update({ [field]: value } as any);

  const handleClear = () => {
    const cleared: TaskFilters = {
      status: [],
      ownerMode: 'all',
      selectedOwners: [],
      datePreset: 'all',
      dateField: 'start',
      startDate: null,
      endDate: null,
      priority: [],
      search: '',
    };
    setLocalSearch('');
    onChange(cleared);
  };

  // helper for multi-select render
  const getOwnerName = (id: string) => availableOwners.find(a => a.id === id)?.name || id;

  return (
    <Paper sx={{ width: '100%', p: 2, borderRadius: 1 }} elevation={0}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหา รหัส/ชื่อ/คำอธิบาย"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="owner-mode-label">ผู้รับผิดชอบ</InputLabel>
            <Select
              labelId="owner-mode-label"
              value={filters.ownerMode}
              label="ผู้รับผิดชอบ"
              onChange={(e) => handleOwnerModeChange(e.target.value as any)}
              input={<OutlinedInput label="ผู้รับผิดชอบ" />}
            >
              <MenuItem value="all">ทุกคน</MenuItem>
              <MenuItem value="mine">งานของฉัน</MenuItem>
              <MenuItem value="custom">เลือกคน...</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="date-preset-label">ช่วงวันที่</InputLabel>
            <Select
              labelId="date-preset-label"
              value={filters.datePreset}
              label="ช่วงวันที่"
              onChange={(e) => handlePresetChange(e.target.value as any)}
              input={<OutlinedInput label="ช่วงวันที่" />}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="today">วันนี้</MenuItem>
              <MenuItem value="7days">7 วันข้างหน้า</MenuItem>
              <MenuItem value="month">เดือนนี้</MenuItem>
              <MenuItem value="range">ช่วงวันที่</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="date-field-label">อ้างอิงวันที่</InputLabel>
            <Select
              labelId="date-field-label"
              value={filters.dateField}
              label="อ้างอิงวันที่"
              onChange={(e) => handleDateFieldChange(e.target.value as any)}
              input={<OutlinedInput label="อ้างอิงวันที่" />}
            >
              <MenuItem value="start">วันที่เริ่มต้น</MenuItem>
              <MenuItem value="end">วันที่สิ้นสุด</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {filters.ownerMode === 'custom' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="custom-owners-label">เลือกคน</InputLabel>
              <Select
                labelId="custom-owners-label"
                multiple
                value={filters.selectedOwners}
                onChange={(e) => handleCustomOwnersChange(typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]))}
                input={<OutlinedInput label="เลือกคน" />}
                renderValue={(selected) => (selected as string[]).map(getOwnerName).join(', ')}
              >
                {availableOwners.map(o => (
                  <MenuItem key={o.id} value={o.id}>
                    <Checkbox checked={filters.selectedOwners.indexOf(o.id) > -1} />
                    <ListItemText primary={o.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {filters.datePreset === 'range' && (
          <Grid item xs={12} md={12}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="จาก"
                    value={filters.startDate ? dayjs(filters.startDate) : null}
                    onChange={(v) => handleRangeChange('startDate', v ? (v as any).format('YYYY-MM-DD') : null)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="ถึง"
                    value={filters.endDate ? dayjs(filters.endDate) : null}
                    onChange={(v) => handleRangeChange('endDate', v ? (v as any).format('YYYY-MM-DD') : null)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {STATUS_LABELS.map(s => {
              const selected = (filters.status || []).includes(s.key);
              return (
                <Chip
                  key={s.key}
                  label={s.label}
                  onClick={() => toggleStatus(s.key)}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              );
            })}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {PRIORITY_LABELS.map(p => {
              const selected = (filters.priority || []).includes(p.key);
              return (
                <Chip
                  key={p.key}
                  label={p.label}
                  onClick={() => togglePriority(p.key)}
                  variant={selected ? 'filled' : 'outlined'}
                  size="small"
                />
              );
            })}
          </Box>
        </Grid>

        <Grid item xs={12} md={2}>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Tooltip title="ล้างตัวกรอง">
              <IconButton size="small" onClick={handleClear}>
                <ClearAllIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
