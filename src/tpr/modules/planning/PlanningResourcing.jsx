import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TimelineIcon from '@mui/icons-material/Timeline';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { supabase } from '@/lib/supabaseClient';
import ProjectBoardView from './ProjectBoardView';
import { fetchProjectTasksWithOwners } from './ProjectBoardView';
import KanbanBoard from './KanbanBoard';
import GanttView from './GanttView';
import CalendarView from './CalendarView';
import WorkloadView from './WorkloadView';
import ChartsView from './ChartsView';
import TimeView from './TimeView';
import AutomationSettingsContainer from './AutomationSettingsContainer';

/**
 * ViewKey type: 'board' | 'kanban' | 'gantt' | 'calendar' | 'workload' | 'charts' | 'time' | 'automation'
 * @typedef {'board'|'kanban'|'gantt'|'calendar'|'workload'|'charts'|'time'|'automation'} ViewKey
 */

// Pastel helpers
const pastel = {
  blue: '#e8f1ff',
  lilac: '#f5ecff',
  mint: '#e9fbf3',
  peach: '#fff1e6',
  gray: '#f5f6f8',
};

// Fallback project image (projects without `image_url` will use this)
// Using an external placeholder for now; replace with a local file later if desired.
// Use placehold.co which reliably returns an image with custom colors/text.
const FALLBACK_PROJECT_IMAGE = 'https://placehold.co/800x450/eeeeee/666666/png?text=No+Image';

// Temporary random progress generator
const randomProgress = () => Math.floor(Math.random() * 41) + 50; // 50-90%

// Mock data for previews (restored)
const boardRows = [
  { task: 'ตั้งค่าโปรเจค', status: 'กำลังทำ', assignee: 'ศศิธร', timeline: 'สัปดาห์นี้', due: 'พรุ่งนี้', priority: 'สูง', files: 2, comments: 3 },
  { task: 'ออกแบบหน้าแรก', status: 'ยังไม่เริ่ม', assignee: 'ธนวัต', timeline: 'สัปดาห์หน้า', due: '15 ธ.ค.', priority: 'กลาง', files: 1, comments: 1 },
];
const kanbanColumns = [
  { key: 'todo', title: 'ยังไม่เริ่ม', color: pastel.gray, items: ['ตั้งค่าโปรเจค', 'ตรวจสอบ requirement'] },
  { key: 'doing', title: 'กำลังทำ', color: pastel.lilac, items: ['ออกแบบหน้าแรก'] },
  { key: 'review', title: 'รอตรวจ', color: pastel.peach, items: ['แก้ไขคอมเมนต์ QA'] },
  { key: 'done', title: 'เสร็จสิ้น', color: pastel.mint, items: ['เตรียมเอกสารส่งมอบ'] },
];
const ganttRows = [
  { task: 'ตั้งค่าโปรเจค', start: 10, end: 12, color: pastel.blue },
  { task: 'ออกแบบหน้าแรก', start: 13, end: 16, color: pastel.lilac },
];
const calendarEvents = [
  { day: 1, title: 'ประชุมเตรียมงาน', color: pastel.blue },
  { day: 3, title: 'ตรวจงาน', color: pastel.peach },
  { day: 5, title: 'ส่งมอบระยะแรก', color: pastel.mint },
];
const workload = [
  { name: 'ศศิธร', hours: 28, capacity: 40 },
  { name: 'ธนวัต', hours: 22, capacity: 40 },
  { name: 'มยุรี', hours: 35, capacity: 40 },
];

function CircularProgressWithLabel({ value, size = 36, thickness = 4 }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" value={value} size={size} thickness={thickness} color="success" />
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <Typography variant="caption" component="div" color="text.primary" sx={{ fontSize: 10, fontWeight: 700 }}>
          {Math.round(Number(value) || 0)}%
        </Typography>
      </Box>
    </Box>
  );
}

const statusCounts = [
  { label: 'ยังไม่เริ่ม', value: 4, color: '#cfd8dc' },
  { label: 'กำลังทำ', value: 6, color: '#ce93d8' },
  { label: 'รอตรวจ', value: 3, color: '#ffcc80' },
  { label: 'เสร็จสิ้น', value: 12, color: '#a5d6a7' },
];

const progressPercent = 65;

const timeEntries = [
  { task: 'วางโครงหน้า Landing Page', by: 'ศศิธร', spent: 4 },
  { task: 'เชื่อมต่อแบบฟอร์มติดต่อ', by: 'ธนวัต', spent: 2.5 },
  { task: 'ตรวจแก้เนื้อหา', by: 'มยุรี', spent: 1.5 },
];

const automationRules = [
  { when: 'WHEN งานย้ายไปคอลัมน์ "รอตรวจ"', then: 'THEN แจ้งเตือนหัวหน้าทีมใน Slack' },
  { when: 'WHEN งานถูกตั้งความสำคัญเป็น "สูง"', then: 'THEN ส่งอีเมลแจ้งเตือนทีม' },
  { when: 'WHEN งานเสร็จสิ้น', then: 'THEN สร้างบันทึกเวลาอัตโนมัติ 0.5 ชม.' },
];

function Pill({ label, color }) {
  return (
    <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 999, bgcolor: color || pastel.gray, fontSize: 12 }}>{label}</Box>
  );
}

function LeftPanel({ activeView, onChangeView, horizontal = false, onPrev, onNext }) {
  if (horizontal) {
    const viewMeta = {
      board: { label: 'บอร์ด', icon: <DashboardIcon /> },
      kanban: { label: 'คัมบัง', icon: <ViewKanbanIcon /> },
      gantt: { label: 'ไทม์ไลน์', icon: <TimelineIcon /> },
      calendar: { label: 'ปฏิทิน', icon: <CalendarTodayIcon /> },
      workload: { label: 'ภาระงาน', icon: <PeopleIcon /> },
      charts: { label: 'แผนภูมิ', icon: <QueryStatsIcon /> },
      // time: { label: 'เวลา', icon: <AccessTimeIcon /> },
      automation: { label: 'อัตโนมัติ', icon: <SettingsIcon /> },
    };
    const views = Object.keys(viewMeta);
    return (
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', justifyContent: 'center', py: 1 }}>
        <IconButton size="small" onClick={() => onPrev && onPrev()}><ChevronLeftIcon /></IconButton>
        <Stack direction="row" spacing={1} sx={{ gap: 1, overflowX: 'auto', px: 1 }}>
          {views.map((k) => {
            const m = viewMeta[k];
            const active = k === activeView;
            return (
              <Box
                key={k}
                onClick={() => onChangeView && onChangeView(k)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.6,
                  borderRadius: 2,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all .15s ease',
                  border: active ? '1px solid rgba(0,0,0,0.12)' : '1px solid transparent',
                  bgcolor: active ? '#000' : 'transparent',
                  color: active ? '#fff' : 'inherit',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: active ? '#000' : '#fafafa',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: active ? 700 : 600 }}>{m.label}</Typography>
              </Box>
            );
          })}
        </Stack>
        <IconButton size="small" onClick={() => onNext && onNext()}><ChevronRightIcon /></IconButton>
      </Stack>
    );
  }
  return (
    <Stack spacing={2} direction={horizontal ? 'row' : 'column'} sx={horizontal ? { flexWrap: 'wrap', gap: 1 } : {}}>
      <Box sx={{ borderBottom: horizontal ? 'none' : '1px solid #eee', width: horizontal ? '100%' : 'auto' }}>
        <Stack direction={horizontal ? 'row' : 'column'} spacing={horizontal ? 1 : 1} sx={horizontal ? { flexWrap: 'wrap', gap: 1 } : {}}>
          <Button
            size="small"
            startIcon={<DashboardIcon />}
            variant={activeView === 'board' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'board' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'board' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('board')}
          >บอร์ด</Button>

          <Button
            size="small"
            startIcon={<ViewKanbanIcon />}
            variant={activeView === 'kanban' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'kanban' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'kanban' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('kanban')}
          >คัมบัง</Button>

          <Button
            size="small"
            startIcon={<TimelineIcon />}
            variant={activeView === 'gantt' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'gantt' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'gantt' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('gantt')}
          >ไทม์ไลน์</Button>

          <Button
            size="small"
            startIcon={<CalendarTodayIcon />}
            variant={activeView === 'calendar' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'calendar' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'calendar' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('calendar')}
          >ปฏิทิน</Button>

          <Button
            size="small"
            startIcon={<PeopleIcon />}
            variant={activeView === 'workload' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'workload' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'workload' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('workload')}
          >ภาระงาน</Button>

          <Button
            size="small"
            startIcon={<QueryStatsIcon />}
            variant={activeView === 'charts' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'charts' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'charts' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('charts')}
          >แผนภูมิ</Button>

          <Button
            size="small"
            startIcon={<AccessTimeIcon />}
            variant={activeView === 'time' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'time' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'time' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('time')}
          >เวลา</Button>

          <Button
            size="small"
            startIcon={<SettingsIcon />}
            variant={activeView === 'automation' ? 'contained' : 'outlined'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 0.5,
              px: 1,
              border: '1px solid #000',
              '&:hover': { borderColor: '#000' },
              ...(activeView === 'automation' ? { bgcolor: '#000', color: '#fff' } : { color: '#000' }),
              '& .MuiSvgIcon-root': { color: activeView === 'automation' ? '#fff' : '#000', fontSize: 18 },
            }}
            onClick={() => onChangeView && onChangeView('automation')}
          >อัตโนมัติ</Button>
        </Stack>
      </Box>
    </Stack>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <Box sx={{ p: 2, pb: 2, mb: 2, borderBottom: '1px solid #eee' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{subtitle}</Typography>}
      {children}
    </Box>
  );
}

// Project status helpers removed — project cards no longer show status badges

function BoardPreview() {
  return (
    <Section title="มุมมองบอร์ด">
      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell>งาน</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>ผู้รับผิดชอบ</TableCell>
              <TableCell>เส้นเวลา</TableCell>
              <TableCell>กำหนดส่ง</TableCell>
              <TableCell>ความสำคัญ</TableCell>
              <TableCell>ไฟล์/คอมเมนต์</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {boardRows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.task}</TableCell>
                <TableCell><Pill label={r.status} color={r.status === 'กำลังทำ' ? '#ce93d8' : '#cfd8dc'} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 20, height: 20, fontSize: 12 }}>{r.assignee[0]}</Avatar>
                    <Typography variant="body2">{r.assignee}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{r.timeline}</TableCell>
                <TableCell>{r.due}</TableCell>
                <TableCell><Pill label={r.priority} color={r.priority === 'สูง' ? '#ffcc80' : '#e0e0e0'} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Pill label={`ไฟล์ ${r.files}`} color={pastel.blue} />
                    <Pill label={`คอมเมนต์ ${r.comments}`} color={pastel.lilac} />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

function KanbanPreview() {
  return (
    <Section title="2) มุมมองคัมบัง (Kanban)" subtitle="ลากการ์ดงานระหว่างคอลัมน์ เพื่ออัปเดตสถานะแบบรวดเร็ว (ตัวอย่าง UI)">
      <Grid container spacing={2}>
        {kanbanColumns.map(col => (
          <Grid key={col.key} item xs={12} sm={6} md={3}>
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{col.title}</Typography>
              <Stack spacing={1}>
                {col.items.map((item, idx) => (
                  <Box key={idx} sx={{ p: 1, borderRadius: 2, bgcolor: col.color }}>
                    <Typography variant="body2">{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}

function GanttPreview() {
  return (
    <Section title="3) มุมมองไทม์ไลน์ (Gantt)" subtitle="ดูเส้นเวลาและการซ้อนทับของงาน เพื่อบริหารทรัพยากรได้ง่ายขึ้น">
      <Grid container spacing={1} alignItems="stretch">
        <Grid item xs={12} md={3}>
          <Stack spacing={1}>
            {ganttRows.map((r, i) => (<Box key={i} sx={{ p: 1, bgcolor: pastel.gray, borderRadius: 1 }}>{r.task}</Box>))}
          </Stack>
        </Grid>
        <Grid item xs={12} md={9}>
          <Stack spacing={1}>
            {ganttRows.map((r, i) => (
              <Box key={i} sx={{ position: 'relative', height: 32, bgcolor: '#fafafa', borderRadius: 1, border: '1px dashed #eee' }}>
                <Box sx={{ position: 'absolute', left: `${(r.start - 10) * 12}%`, width: `${(r.end - r.start + 1) * 12}%`, top: 6, bottom: 6, bgcolor: r.color, borderRadius: 1 }} />
                <Stack direction="row" spacing={1} sx={{ position: 'absolute', inset: 0, px: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption">10 11 12 13 14 15 16</Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Section>
  );
}

function CalendarPreview() {
  const days = [1, 2, 3, 4, 5, 6, 7];
  return (
    <Section title="4) มุมมองปฏิทิน (Calendar)" subtitle="ดูงานตามวัน/สัปดาห์ เพื่อเห็นกำหนดส่งชัดเจน">
      <Grid container spacing={1}>
        {days.map((d) => (
          <Grid key={d} item xs={12} sm={6} md={3} lg={12 / 7}>
            <Box sx={{ p: 1, minHeight: 80, border: '1px solid #eee', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">{d} พ.ย.</Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {calendarEvents.filter(e => e.day === d).map((e, i) => (
                  <Box key={i} sx={{ px: 1, py: 0.5, bgcolor: e.color, borderRadius: 1, fontSize: 12 }}>{e.title}</Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}

function WorkloadPreview() {
  return (
    <Section title="5) มุมมองภาระงาน (Workload)" subtitle="ช่วยกระจายชั่วโมงให้สมดุลในทีม">
      <Stack spacing={1.5}>
        {workload.map((w, i) => {
          const pct = Math.min(100, Math.round((w.hours / w.capacity) * 100));
          const color = pct > 85 ? 'error' : pct > 65 ? 'warning' : 'success';
          return (
            <Box key={i}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2">{w.name}</Typography>
                <Typography variant="caption" color="text.secondary">{w.hours} / {w.capacity} ชม.</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          );
        })}
      </Stack>
    </Section>
  );
}

function ChartsPreview() {
  const max = Math.max(...statusCounts.map(s => s.value));
  return (
    <Section title="6) มุมมองแผนภูมิ (Charts)" subtitle="ภาพรวมสถานะงานและความคืบหน้าของโครงการ">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>จำนวนงานตามสถานะ</Typography>
            <Stack spacing={1}>
              {statusCounts.map((s, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 90, fontSize: 12 }}>{s.label}</Box>
                  <Box sx={{ flex: 1, bgcolor: '#f0f0f0', borderRadius: 999, overflow: 'hidden' }}>
                    <Box sx={{ width: `${(s.value / max) * 100}%`, bgcolor: s.color, height: 10 }} />
                  </Box>
                  <Box sx={{ width: 36, textAlign: 'right', fontSize: 12 }}>{s.value}</Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>ความคืบหน้าโครงการ</Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{progressPercent}% เสร็จแล้ว</Typography>
            <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 10, borderRadius: 5 }} />
          </Box>
        </Grid>
      </Grid>
    </Section>
  );
}

function TimePreview() {
  return (
    <Section title="7) มุมมองเวลา (Time / Timesheet Helper)" subtitle="ตัวช่วยบันทึกเวลางานในแต่ละวัน (ตัวอย่าง UI)">
      <Stack spacing={1}>
        {timeEntries.map((t, i) => (
          <Box key={i} sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.task}</Typography>
              <Typography variant="caption" color="text.secondary">{t.by} • ใช้ไป: {t.spent} ชม.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined">เริ่มจับเวลา (mock)</Button>
              <Button size="small" variant="text">หยุด</Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Section>
  );
}

function AutomationPreview() {
  return (
    <Section title="8) มุมมองอัตโนมัติ (Automation)" subtitle="สร้างกติกาง่าย ๆ เพื่อช่วยงานซ้ำ ๆ">
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button variant="contained">+ เพิ่มกติกา (ตัวอย่าง)</Button>
      </Stack>
      <Stack spacing={1}>
        {automationRules.map((r, i) => (
          <Box key={i} sx={{ p: 1, borderRadius: 2, border: '1px dashed #cfcfcf', bgcolor: pastel.blue }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.when}</Typography>
            <Typography variant="body2">{r.then}</Typography>
          </Box>
        ))}
      </Stack>
    </Section>
  );
}

export default function PlanningResourcing({ onReady } = {}) {
  const [activeTab, setActiveTab] = React.useState(0); // 0: โครงการ, 1: การทำงานในโครงการ
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedProject, setSelectedProject] = React.useState(null);
  // active view for Project Suite (defaults to 'board')
  const [activeView, setActiveView] = React.useState('board');
  // ordered list of views for swipe navigation
  const viewOrder = React.useMemo(() => ['board','kanban','gantt','calendar','workload','charts','time','automation'], []);
  const startXRef = React.useRef(null);
  const threshold = 50; // px required to consider a swipe
  

  const goToIndex = (idx) => {
    if (idx < 0) idx = 0;
    if (idx >= viewOrder.length) idx = viewOrder.length - 1;
    handleChangeView(viewOrder[idx]);
  };
  const goNextView = () => { const i = viewOrder.indexOf(activeView); goToIndex(i + 1); };
  const goPrevView = () => { const i = viewOrder.indexOf(activeView); goToIndex(i - 1); };
  const handlePointerDown = (e) => { startXRef.current = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || null; };
  const handlePointerUp = (e) => {
    const endX = e.clientX || (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || null;
    const startX = startXRef.current;
    startXRef.current = null;
    if (startX == null || endX == null) return;
    const dx = endX - startX;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) goNextView(); else goPrevView();
  };

  const handleChangeView = (v) => {
    if (!v || v === activeView) return;
    setActiveView(v);
  };

  // Kanban state: tasks and loading when the Kanban view is active
  const [kanbanTasks, setKanbanTasks] = React.useState([]);
  const [kanbanLoading, setKanbanLoading] = React.useState(false);

  // Gantt state: tasks and loading when Gantt view is active
  const [ganttTasks, setGanttTasks] = React.useState([]);
  const [ganttLoading, setGanttLoading] = React.useState(false);

  // Calendar state: tasks and loading when Calendar view is active
  const [calendarTasks, setCalendarTasks] = React.useState([]);
  const [calendarLoading, setCalendarLoading] = React.useState(false);

  // Workload state: items (WorkItem[]), employees
  const [workloadTasks, setWorkloadTasks] = React.useState([]);
  const [workloadEmployees, setWorkloadEmployees] = React.useState([]);

  // Charts state: tasks
  const [chartsTasks, setChartsTasks] = React.useState([]);

  // Time state: tasks for time view
  const [timeTasks, setTimeTasks] = React.useState([]);

  // Search filter for projects
  const [projectSearch, setProjectSearch] = React.useState('');
  const projectsFiltered = React.useMemo(() => {
    const q = (projectSearch || '').trim().toLowerCase();
    if (!q) return projects;
    return (projects || []).filter(p => {
      const name = String(p.name || '').toLowerCase();
      const code = String(p.code || '').toLowerCase();
      const customer = String(p.customer || '').toLowerCase();
      return name.includes(q) || code.includes(q) || customer.includes(q);
    });
  }, [projectSearch, projects]);

  const ownersDirectory = React.useMemo(() => {
    const map = {};
    (kanbanTasks || []).forEach(t => {
      if (t.owner_id) map[t.owner_id] = { id: t.owner_id, label: t.owner_name || t.owner_id };
    });
    return Object.values(map);
  }, [kanbanTasks]);

  React.useEffect(() => {
    let mounted = true;
    let signalledReady = false;
    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('tpr_projects')
          .select('id, project_code, name_th, name_en, customer_name, status, created_at, image_path, manager_id')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (error) throw error;
        if (!mounted) return;

        // Build initial rows and collect manager ids
        const mgrIds = [];
        const rows = (data || []).map(r => {
          if (r.manager_id) mgrIds.push(r.manager_id);
          return {
          id: r.id,
          code: r.project_code || '-',
          name: r.name_th || r.name_en || '-',
          customer: r.customer_name || '-',
          status: r.status || '-',
          created_at: r.created_at || null,
          image_url: r.image_path || null,
          manager_id: r.manager_id || null,
          pm_name: null,
          pm_image_url: null,
          };
         });
        // If we have manager ids, fetch employee profiles
        let employeesById = {};
        if (mgrIds.length > 0) {
          const { data: empRows, error: empErr } = await supabase
            .from('employees')
            .select('id, first_name_th, last_name_th, first_name_en, last_name_en, image_url')
            .in('id', Array.from(new Set(mgrIds)));
          if (!empErr && Array.isArray(empRows)) {
            empRows.forEach(e => { employeesById[e.id] = e; });
          }
        }
        const enriched = rows.map(p => {
          const e = p.manager_id ? employeesById[p.manager_id] : null;
          const fullTh = e ? [e.first_name_th, e.last_name_th].filter(Boolean).join(' ') : null;
          const fullEn = e ? [e.first_name_en, e.last_name_en].filter(Boolean).join(' ') : null;
          return {
            ...p,
            pm_name: fullTh || fullEn || null,
            pm_image_url: e?.image_url || null,
          };
        });
        setProjects(enriched);
      } catch (err) {
        if (!mounted) return;
        console.error('loadProjects', err);
        setError('ไม่สามารถโหลดรายชื่อโครงการได้');
      } finally {
        if (mounted) setLoading(false);
        // Notify parent once after initial load completes so layout preload can clear
        try {
          if (onReady && !signalledReady) {
            signalledReady = true;
            onReady();
          }
        } catch (e) {
          console.error('onReady callback error', e);
        }
      }
    };
    loadProjects();
    return () => { mounted = false; };
  }, [onReady]);

  const handleSelectProject = (p) => {
    setSelectedProject(p);
    setActiveTab(1);
    // reset to default view when opening a project
    handleChangeView('board');
  };

  // Load Kanban tasks when a project is selected and Kanban view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'kanban') {
        if (mounted) setKanbanTasks([]);
        return;
      }
      setKanbanLoading(true);
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        setKanbanTasks(rows || []);
      } catch (err) {
        console.error('load kanban tasks', err);
      } finally {
        if (mounted) setKanbanLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // Load Gantt tasks when a project is selected and Gantt view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'gantt') {
        if (mounted) setGanttTasks([]);
        return;
      }
      setGanttLoading(true);
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        // map to GanttTask-like shape expected by GanttView
        const mapped = (rows || []).map(r => ({
          id: String(r.id),
          code: r.code,
          name: r.name,
          start_date: r.start_date || r.start_date || null,
          end_date: r.end_date || r.end_date || null,
          owner_id: r.owner_id || null,
          owner_name: r.owner_name || null,
          status: r.status || 'todo',
          priority: r.priority || 'medium',
          progress: (r.progress_percent != null ? Number(r.progress_percent) : undefined),
          parentId: r.parent_id || null,
          dependencies: r.dependencies || [],
        }));
        setGanttTasks(mapped);
      } catch (err) {
        console.error('load gantt tasks', err);
      } finally {
        if (mounted) setGanttLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // Load Time tasks when a project is selected and Time view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'time') {
        if (mounted) setTimeTasks([]);
        return;
      }
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        setTimeTasks(rows || []);
      } catch (err) {
        console.error('load time tasks', err);
      } finally {
        // loading flag removed
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // Load Calendar tasks when a project is selected and Calendar view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'calendar') {
        if (mounted) setCalendarTasks([]);
        return;
      }
      setCalendarLoading(true);
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        const mapped = (rows || []).map(r => ({
          id: String(r.id), code: r.code, name: r.name,
          start_date: r.start_date || r.start_date || null,
          end_date: r.end_date || r.end_date || null,
          owner_id: r.owner_id || null, owner_name: r.owner_name || null,
          status: r.status || 'todo', priority: r.priority || 'medium',
        }));
        setCalendarTasks(mapped);
      } catch (err) {
        console.error('load calendar tasks', err);
      } finally {
        if (mounted) setCalendarLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // Load Workload data when a project is selected and Workload view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'workload') {
        if (mounted) { setWorkloadTasks([]); setWorkloadEmployees([]); }
        return;
      }
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        // Derive employees from owner info
        const empMap = {};
        (rows || []).forEach(r => {
          const id = r.owner_id || null;
          if (!id) return;
          if (!empMap[id]) empMap[id] = { id: String(id), name: r.owner_name || String(id) };
        });
        const employees = Object.values(empMap);
        // Derive hours: prefer explicit fields if present, else approximate from dates (8h per day)
        const toHours = (start, end) => {
          if (!start || !end) return 0;
          const s = new Date(start);
          const e = new Date(end);
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
          const from = s.getTime();
          const to = e.getTime();
          const min = Math.min(from, to);
          const max = Math.max(from, to);
          const days = Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
          return days * 8;
        };
        const tasks = (rows || []).map(r => {
          const hours = (r.estimated_hours != null ? Number(r.estimated_hours) : null) ?? (r.hours != null ? Number(r.hours) : null);
          return {
            id: String(r.id),
            name: r.name || r.code || String(r.id),
            ownerId: r.owner_id ? String(r.owner_id) : '',
            ownerName: r.owner_name || undefined,
            hours: hours != null ? Math.max(0, Number(hours)) : toHours(r.start_date || null, r.end_date || null),
            planned_hours: Number(r.planned_hours ?? 0),
            status: r.status || 'todo',
            priority: r.priority || 'medium',
            dueDate: r.end_date || null,
            startDate: r.start_date || null,
            endDate: r.end_date || null,
            projectId: selectedProject.id,
            projectName: selectedProject.name,
          };
        }).filter(t => !!t.ownerId);
        setWorkloadEmployees(employees);
        setWorkloadTasks(tasks);
      } catch (err) {
        console.error('load workload data', err);
      } finally {
        // loading flag removed
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // Load Charts tasks when a project is selected and Charts view is active
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProject || activeView !== 'charts') {
        if (mounted) setChartsTasks([]);
        return;
      }
      try {
        const rows = await fetchProjectTasksWithOwners(selectedProject.id);
        if (!mounted) return;
        setChartsTasks(rows || []);
      } catch (err) {
        console.error('load charts tasks', err);
      } finally {
        // loading flag removed
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedProject, activeView]);

  // view-switch progress logic removed per request

  // Handle a Kanban drop: update metadata.status and refresh list
  const handleKanbanDrop = async (taskId, from, to) => {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('tpr_project_wbs_tasks')
        .select('id, metadata')
        .eq('id', taskId)
        .single();
      if (fetchErr) throw fetchErr;
      const metadata = existing?.metadata || {};
      metadata.status = to;
      const { error: updateErr } = await supabase
        .from('tpr_project_wbs_tasks')
        .update({ metadata })
        .eq('id', taskId);
      if (updateErr) throw updateErr;
      // refresh
      const rows = await fetchProjectTasksWithOwners(selectedProject.id);
      setKanbanTasks(rows || []);
    } catch (err) {
      console.error('handleKanbanDrop', err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{ display: 'none' }}
      >
        <Tab label="โครงการ" />
        <Tab label="การทำงานในโครงการ" />
      </Tabs>
      <Divider sx={{ mb: 2, display: 'none' }} />

      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, mb: 2, textAlign: 'center' }}>โครงการทั้งหมด</Typography>
          {/* loading indicator removed per request */}
          {error && <Typography variant="body2" color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Box>
            <Box sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                variant="outlined"
                fullWidth
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="ค้นหาโครงการ"
                InputProps={{ sx: { fontSize: 14 } }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.25 }}>
              {(projectsFiltered || []).map(p => (
                  <Box
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProject(p)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectProject(p); }}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      minHeight: 200,
                      height: '100%',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 160ms ease',
                      overflow: 'hidden',
                      '&:hover': {
                        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                        transform: 'translateY(-4px)'
                      },
                      '&:focus': { outline: 'none', boxShadow: '0 0 0 3px rgba(25,118,210,0.12)' }
                    }}
                  >
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <Box
                        role="img"
                        aria-label={p.name ? `${p.name} image` : 'project image'}
                        sx={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          maxHeight: 150,
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                          bgcolor: '#f0f0f0',
                          backgroundImage: `url(${p.image_url || FALLBACK_PROJECT_IMAGE})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                      {/* Circular progress with white background plate */}
                      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <Box
                          sx={{
                            bgcolor: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                            p: 0.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CircularProgressWithLabel
                            value={randomProgress()}
                            size={30}
                            thickness={4}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ p: 1.5, pt: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.customer}</Typography>
                      {/* <Divider sx={{mt:2, mb: 2, fontSize: 14}}>ผู้จัดการโครงการ</Divider> */}
                      <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
                        <Avatar src={p.pm_image_url || undefined} sx={{ width: 36, height: 36, fontSize: 16 }}>{(p.pm_name || '-').charAt(0)}</Avatar>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>PM : {p.pm_name || '-'}</Typography>
                      </Stack>
                    </Box>
                  </Box>
              ))}
            </Box>
            {(projectsFiltered || []).length === 0 && !loading && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">ยังไม่มีข้อมูลโครงการ</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 1 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link component="button" underline="hover" color="inherit" onClick={() => setActiveTab(0)}>
                โครงการ
              </Link>
              <Typography color="text.primary">การทำงานในโครงการ{selectedProject ? `: ${selectedProject.code} - ${selectedProject.name}` : ''}</Typography>
            </Breadcrumbs>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, textAlign: 'center' }}>
              
            </Typography>
           
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <LeftPanel horizontal activeView={activeView} onChangeView={handleChangeView} onPrev={goPrevView} onNext={goNextView} />
              {/* view-switch progress removed */}
            </Box>
            <Box
              sx={{ flex: 1, minWidth: 0 }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
            >
              <Stack spacing={2}>
                {activeView === 'board' && (
                  selectedProject
                    ? <ProjectBoardView projectId={selectedProject.id} />
                    : (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองบอร์ด</Typography>
                      </Box>
                    )
                )}
                {activeView === 'kanban' && (
                  selectedProject
                    ? (
                      <KanbanBoard
                        tasks={kanbanTasks}
                        onDrop={handleKanbanDrop}
                        ownersDirectory={ownersDirectory}
                        onAddTask={() => handleChangeView('board')}
                        loading={kanbanLoading}
                      />
                    )
                    : (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองคัมบัง</Typography>
                      </Box>
                    )
                )}
                {activeView === 'gantt' && (
                  selectedProject
                    ? (
                      <GanttView
                        tasks={ganttTasks}
                        zoom="week"
                        loading={ganttLoading}
                        ownersDirectory={ownersDirectory}
                        onTaskDateChange={async (taskId, start, end) => {
                          try {
                            // fetch existing metadata and update start/end in metadata (or top-level fields if preferred)
                            const { data: existing, error: fetchErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .select('id, metadata')
                              .eq('id', taskId)
                              .single();
                            if (fetchErr) throw fetchErr;
                            const metadata = existing?.metadata || {};
                            metadata.start_date = start;
                            metadata.end_date = end;
                            const { error: updateErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .update({ metadata })
                              .eq('id', taskId);
                            if (updateErr) throw updateErr;
                            // refresh gantt tasks
                            const rows = await fetchProjectTasksWithOwners(selectedProject.id);
                            const mapped = (rows || []).map(r => ({
                              id: String(r.id), code: r.code, name: r.name,
                              start_date: r.start_date || null, end_date: r.end_date || null,
                              owner_id: r.owner_id || null, owner_name: r.owner_name || null,
                              status: r.status || 'todo', priority: r.priority || 'medium',
                              progress: (r.progress_percent != null ? Number(r.progress_percent) : undefined),
                              parentId: r.parent_id || null, dependencies: r.dependencies || [],
                            }));
                            setGanttTasks(mapped);
                          } catch (err) {
                            console.error('gantt date update', err);
                          }
                        }}
                        onOpenTask={(id) => { /* open existing board view or dialog */ handleChangeView('board'); window.__openTaskId = id; }}
                      />
                    )
                    : (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองไทม์ไลน์</Typography>
                      </Box>
                    )
                )}
                {activeView === 'calendar' && (
                  selectedProject
                    ? (
                      <CalendarView
                        tasks={calendarTasks}
                        view="month"
                        loading={calendarLoading}
                        ownersDirectory={ownersDirectory}
                        onEventClick={(id) => { handleChangeView('board'); window.__openTaskId = id; }}
                        onEventDrop={async (taskId, newStart, newEnd) => {
                          try {
                            const { data: existing, error: fetchErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .select('id, metadata')
                              .eq('id', taskId)
                              .single();
                            if (fetchErr) throw fetchErr;
                            const metadata = existing?.metadata || {};
                            metadata.start_date = newStart;
                            metadata.end_date = newEnd;
                            const { error: updateErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .update({ metadata })
                              .eq('id', taskId);
                            if (updateErr) throw updateErr;
                            // refresh
                            const rows = await fetchProjectTasksWithOwners(selectedProject.id);
                            const mapped = (rows || []).map(r => ({
                              id: String(r.id), code: r.code, name: r.name,
                              start_date: r.start_date || null, end_date: r.end_date || null,
                              owner_id: r.owner_id || null, owner_name: r.owner_name || null,
                              status: r.status || 'todo', priority: r.priority || 'medium',
                            }));
                            setCalendarTasks(mapped);
                          } catch (err) {
                            console.error('calendar drop update', err);
                          }
                        }}
                      />
                    )
                    : (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองปฏิทิน</Typography>
                      </Box>
                    )
                )}
                {activeView === 'workload' && (
                  selectedProject ? (
                    <Box>
                      <WorkloadView
                        tasks={workloadTasks}
                        employees={workloadEmployees}
                        capacityPerWeek={40}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองภาระงาน</Typography>
                    </Box>
                  )
                )}
                {activeView === 'charts' && (
                  selectedProject ? (
                    <Box>
                      <ChartsView tasks={chartsTasks} />
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองแผนภูมิ</Typography>
                    </Box>
                  )
                )}
                {activeView === 'time' && (
                  selectedProject ? (
                    <Box>
                      <TimeView
                        tasks={timeTasks}
                        entries={(timeTasks || []).flatMap(t => {
                          const md = t.metadata || {};
                          const entries = Array.isArray(md.time_entries) ? md.time_entries : [];
                          return entries.map(e => ({
                            taskId: String(t.id),
                            taskName: t.name || t.code || String(t.id),
                            userId: e.user_id || t.owner_id || null,
                            userName: e.user_name || t.owner_name || null,
                            startedAt: e.started_at || null,
                            endedAt: e.ended_at || null,
                            durationHours: Number(e.duration_hours || 0),
                            note: e.note || '',
                          }));
                        })}
                        running={(timeTasks || []).reduce((acc, t) => {
                          const md = t.metadata || {};
                          if (md.timer_started_at) acc[String(t.id)] = md.timer_started_at;
                          return acc;
                        }, {})}
                        onStartTimer={async (taskId) => {
                          try {
                            const { data: existing, error: fetchErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .select('id, metadata')
                              .eq('id', taskId)
                              .single();
                            if (fetchErr) throw fetchErr;
                            const metadata = existing?.metadata || {};
                            metadata.timer_started_at = new Date().toISOString();
                            const { error: updateErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .update({ metadata })
                              .eq('id', taskId);
                            if (updateErr) throw updateErr;
                            const rows = await fetchProjectTasksWithOwners(selectedProject.id);
                            setTimeTasks(rows || []);
                          } catch (err) {
                            console.error('time start timer', err);
                          }
                        }}
                        onStopTimer={async (taskId) => {
                          try {
                            const { data: existing, error: fetchErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .select('id, metadata, owner_id, owner_name')
                              .eq('id', taskId)
                              .single();
                            if (fetchErr) throw fetchErr;
                            const metadata = existing?.metadata || {};
                            const started = metadata.timer_started_at ? new Date(metadata.timer_started_at) : null;
                            const ended = new Date();
                            let durationHours = 0;
                            if (started && !isNaN(started.getTime())) {
                              durationHours = Math.max(0, (ended.getTime() - started.getTime()) / (1000 * 60 * 60));
                            }
                            const entry = {
                              user_id: existing?.owner_id || null,
                              user_name: existing?.owner_name || null,
                              started_at: started ? started.toISOString() : null,
                              ended_at: ended.toISOString(),
                              duration_hours: Number(durationHours.toFixed(3)),
                            };
                            const arr = Array.isArray(metadata.time_entries) ? metadata.time_entries : [];
                            arr.push(entry);
                            metadata.time_entries = arr;
                            metadata.timer_started_at = null;
                            const total = (arr || []).reduce((sum, e) => sum + Number(e.duration_hours || 0), 0);
                            metadata.time_spent_hours = Number(total.toFixed(3));
                            const { error: updateErr } = await supabase
                              .from('tpr_project_wbs_tasks')
                              .update({ metadata })
                              .eq('id', taskId);
                            if (updateErr) throw updateErr;
                            const rows = await fetchProjectTasksWithOwners(selectedProject.id);
                            setTimeTasks(rows || []);
                          } catch (err) {
                            console.error('time stop timer', err);
                          }
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองเวลา</Typography>
                    </Box>
                  )
                )}
                {activeView === 'automation' && (
                  selectedProject ? (
                    <AutomationSettingsContainer projectId={selectedProject.id} />
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">กรุณาเลือกโครงการจากแท็บ "โครงการ" เพื่อดูมุมมองอัตโนมัติ</Typography>
                    </Box>
                  )
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
