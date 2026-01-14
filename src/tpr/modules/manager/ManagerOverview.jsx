import React, { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';

import { supabase } from '../../../lib/supabaseClient';
import ReactApexChart from 'react-apexcharts';

// Utility: Convert hours (number) to HH:MM string
function hoursToHHMM(hours) {
  if (typeof hours !== 'number' || isNaN(hours)) return '00:00';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function SmallCard({ title, value, subtitle, info, color = 'default', sx }) {
  const palette = {
    default: { bg: '#fff', border: '#e5e7eb', label: '#6b7280', value: '#111827' },
    info: { bg: '#eef6ff', border: '#93c5fd', label: '#1d4ed8', value: '#0b3aa7' },
    success: { bg: '#ecfdf5', border: '#a7f3d0', label: '#047857', value: '#065f46' },
    warning: { bg: '#fffbeb', border: '#fed7aa', label: '#c2410c', value: '#9a3412' },
    danger: { bg: '#fef2f2', border: '#fecaca', label: '#b91c1c', value: '#7f1d1d' },
  };
  const c = palette[color] || palette.default;

  return (
    <Paper
      sx={{
        p: 2,
        boxShadow: 'none',
        borderRadius: 2,
        width: '100%',
        height: '100%',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" sx={{ color: c.label, fontWeight: 800 }}>
          {title}
        </Typography>

        {info && (
          <Tooltip
            title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{info}</Box>}
            placement="top"
          >
            <IconButton size="small" aria-label="info" sx={{ p: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" sx={{ color: c.label, opacity: 0.85 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 900, color: c.value, lineHeight: 1.1, mt: 0.5 }}>
        {value}
      </Typography>

      {subtitle && (
        <Typography variant="caption" sx={{ color: c.label, opacity: 0.85 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}



function TeamWorkloadHeatmap() {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paperSx = { p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) throw new Error('No authenticated user');

        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;

        const managerId = (meCandidates || [])[0]?.id;
        if (!managerId) {
          setRows([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('v_manager_team_workload_next_week')
          .select('manager_id,user_id,work_date,workload_level,workload_hours')
          .eq('manager_id', managerId);
        if (error) throw error;
        if (!mounted) return;

        const typed = data || [];
        setRows(typed);
        

        const ids = Array.from(new Set(typed.map(r => r.user_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: emps, error: empErr } = await supabase
            .from('employees')
            .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
            .in('id', ids);

          if (!empErr && emps) {
            const map = {};
            for (const e of emps) {
              const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
              let name = '';
              if (thParts.length) name = thParts.join(' ');
              else {
                const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                if (enParts.length) name = enParts.join(' ');
                else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
              }
              map[String(e.id)] = name;
            }
            if (mounted) setNames(map);
          }
        }
      } catch (e) {
        console.error('Team workload heatmap error', e);
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const nextWeekDates = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const daysToNextMonday = ((8 - day) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToNextMonday);
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const COLORS = ['#f1f8ff', '#bbdefb', '#64b5f6', '#1976d2', '#0d47a1'];

  const weekRangeLabel = (nextWeekDates && nextWeekDates.length > 0)
    ? `${nextWeekDates[0].toLocaleDateString('th-TH')} - ${nextWeekDates[nextWeekDates.length - 1].toLocaleDateString('th-TH')}`
    : '';

  const users = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
  const heatmapSeries = useMemo(() => {
    return users.map(uid => {
      const name = names[String(uid)] || (uid ? `${String(uid).slice(0, 8)}...` : '-');
      const data = nextWeekDates.map(d => {
        const ds = d.toISOString().slice(0, 10);
        const row = rows.find(r => r.user_id === uid && (r.work_date || '').slice(0, 10) === ds);
        const level = row ? Number(row.workload_level || 0) : 0;
        const hours = row && row.workload_hours != null ? Number(row.workload_hours) : null;
        const label = new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(d) + ' ' + String(d.getDate()).padStart(2, '0');
        return { x: label, y: level, date: ds, hours };
      });
      return { name, data };
    });
  }, [rows, names, nextWeekDates, users]);

  const heatmapOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: COLORS[0] },
            { from: 1, to: 1, color: COLORS[1] },
            { from: 2, to: 2, color: COLORS[2] },
            { from: 3, to: 3, color: COLORS[3] },
            { from: 4, to: 4, color: COLORS[4] },
          ]
        }
      }
    },
    dataLabels: { enabled: false },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const dp = w.config.series[seriesIndex].data[dataPointIndex];
        const hoursVal = dp?.hours;
        return `
          <div style="padding:8px; font-size:13px;">
            <div style="font-weight:700;">${hoursVal} ชั่วโมง</div>
          </div>
        `;
      }
    },
    xaxis: { type: 'category' },
    stroke: { width: 1 },
    colors: COLORS,
    grid: { padding: { left: 12, right: 12 } },
  }), [users, nextWeekDates, rows, COLORS]);

  if (error) return <Alert severity="error">{error}</Alert>;

  if (loading) {
    return (
      <Paper sx={paperSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight={800}>📊 ภาระงานทีม (สัปดาห์ถัดไป)</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{weekRangeLabel}</Typography>
            <Tooltip
            title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{
              "การคำนวณภาระงานต่อวัน:\n- ระดับภาระงาน (0-4) มาจากชั่วโมงงานที่คาดว่าจะทำในวันนั้น\n- ตัวอย่างการแมประดับ: 0=0 ชม., 1=<=2 ชม., 2=<=4 ชม., 3=<=6 ชม., 4=>6 ชม.\n- ข้อมูลมาจากการประมาณหรือรายการงานที่มอบหมายต่อวัน\n- สีแสดงความหนาแน่นของภาระงานในแถบแต่ละวัน"
            }</Box>}
            placement="top"
          >
            <IconButton size="small" aria-label="info" sx={{ p: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.9 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Skeleton variant="rectangular" height={120} />
        </Box>
      </Paper>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Paper sx={paperSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>📊 ภาระงานทีม (สัปดาห์ถัดไป)</Typography>
          <Tooltip
            title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{
              "การคำนวณภาระงานต่อวัน:\n- ระดับภาระงาน (0-4) มาจากชั่วโมงงานที่คาดว่าจะทำในวันนั้น\n- ตัวอย่างการแมประดับ: 0=0 ชม., 1=<=2 ชม., 2=<=4 ชม., 3=<=6 ชม., 4=>6 ชม.\n- ข้อมูลมาจากการประมาณหรือรายการงานที่มอบหมายต่อวัน\n- สีแสดงความหนาแน่นของภาระงานในแถบแต่ละวัน"
            }</Box>}
            placement="top"
          >
            <IconButton size="small" aria-label="info" sx={{ p: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.9 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Typography color="text.secondary">ยังไม่มีข้อมูลภาระงานสัปดาห์ถัดไป</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={paperSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle1" fontWeight={800}>📊 ภาระงานทีม (สัปดาห์ถัดไป)</Typography>
        <Tooltip
          title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{
            "การคำนวณภาระงานต่อวัน:\n- ระดับภาระงาน (0-4) มาจากชั่วโมงงานที่คาดว่าจะทำในวันนั้น\n- ตัวอย่างการแมประดับ: 0=0 ชม., 1=<=2 ชม., 2=<=4 ชม., 3=<=6 ชม., 4=>6 ชม.\n- ข้อมูลมาจากการประมาณหรือรายการงานที่มอบหมายต่อวัน\n- สีแสดงความหนาแน่นของภาระงานในแถบแต่ละวัน"
          }</Box>}
          placement="top"
        >
          <IconButton size="small" aria-label="info" sx={{ p: 0.5 }}>
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.9 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ mt: 1 }}>
        {/* Header: weekday + date (highlight today) */}
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 240 }} />
          <Box sx={{ display: 'flex', gap: 0.6 }}>
            {nextWeekDates.map((d, idx) => {
              const ds = d.toISOString().slice(0, 10);
              const todayDs = new Date().toISOString().slice(0, 10);
              const isToday = ds === todayDs;
              const dayShort = new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(d);
              const dayNum = String(d.getDate()).padStart(2, '0');
              return (
                <Box key={idx} sx={{ width: 38, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: isToday ? 800 : 700, color: isToday ? 'primary.main' : 'text.secondary' }}>{dayShort}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: 11, fontWeight: isToday ? 900 : 700 }}>{dayNum}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box> */}

        <Box>
          <ReactApexChart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={Math.max(200, users.length * 42)} />
        </Box>
      </Box>
    </Paper>
  );
}

function TeamUtilization() {
  const [tuData, setTuData] = useState([]);
  const [tuNames, setTuNames] = useState({});
  const [tuLoading, setTuLoading] = useState(true);
  const [tuError, setTuError] = useState(null);

  const paperSx = { p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTuLoading(true);
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) throw new Error('No authenticated user');

        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;

        const managerId = (meCandidates || [])[0]?.id;
        if (!managerId) {
          setTuData([]);
          setTuLoading(false);
          return;
        }

        const { data: rows, error } = await supabase
          .from('v_manager_team_utilization_month')
          .select('manager_id,user_id,total_hours,billable_hours,non_billable_hours,unknown_hours,ot_hours,capacity_hours,total_util_pct,billable_util_pct,non_billable_util_pct,unknown_util_pct,ot_pct,month_start,month_end')
          .eq('manager_id', managerId)
          .order('total_util_pct', { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        const typed = rows || [];
        setTuData(typed);

        if (typed.length > 0) {
          // range state removed — we don't display month range here
        }

        const ids = Array.from(new Set(typed.map(r => r.user_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: emps, error: empErr } = await supabase
            .from('employees')
            .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
            .in('id', ids);

          if (!empErr && emps) {
            const map = {};
            for (const e of emps) {
              const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
              let name = '';
              if (thParts.length) name = thParts.join(' ');
              else {
                const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                if (enParts.length) name = enParts.join(' ');
                else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
              }
              map[String(e.id)] = name;
            }
            if (mounted) setTuNames(map);
          }
        }
      } catch (e) {
        console.error('Team utilization load error', e);
        if (mounted) setTuError(e.message || String(e));
      } finally {
        if (mounted) setTuLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  

  if (tuError) return <Alert severity="error">{tuError}</Alert>;

  return (
    <Paper sx={paperSx}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>👥 อัตราการใช้งานทีม (เดือนนี้)</Typography>
            <Tooltip
              title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{
                "การคำนวณอัตราการใช้งาน:\n- อัตราการใช้งานรวม (%) = (ชั่วโมงทั้งหมด / ชั่วโมงความสามารถ) × 100\n- ชั่วโมงความสามารถ = ชั่วโมงงานที่คาดว่าจะทำได้ในช่วงเวลา (เช่น ต่อเดือน)\n- อัตราการใช้งานคิดจากข้อมูลเวลาในโครงการที่คุณดูแล\n- ค่าที่แสดงอาจเป็นค่าเฉลี่ยหรือสัดส่วนต่อพนักงาน"
              }</Box>}
              placement="top"
            >
              <IconButton size="small" aria-label="info" sx={{ p: 0.5 }}>
                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.9 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 1 }}>
        {tuLoading ? (
          <Table sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
            <TableHead>
              <TableRow>
                <TableCell>พนักงาน</TableCell>
                <TableCell>ชั่วโมงที่คิดบิล</TableCell>
                <TableCell>อัตราการใช้งานรวม (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={160} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={200} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : tuData.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">เดือนนี้ยังไม่มีการลงเวลาในโครงการที่คุณดูแล</Typography>
          </Box>
        ) : (
          <Table sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
            <TableHead>
              <TableRow>
                <TableCell>พนักงาน</TableCell>
                <TableCell>ชั่วโมงที่คิดบิล</TableCell>
                <TableCell>อัตราการใช้งานรวม (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tuData.map((r) => {
                const uid = r.user_id || '—';
                const name = tuNames[uid] || (uid ? `${String(uid).slice(0, 8)}...` : '—');
                const utilPct = Number(r.total_util_pct || 0);

                return (
                  <TableRow key={uid}>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28 }}>{(name && name[0]) || '?'}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{Number(r.billable_hours ?? 0).toFixed(2)} ชม.</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress variant="determinate" value={Math.min(100, utilPct)} />
                        </Box>
                        <Typography variant="body2" sx={{ width: 52, textAlign: 'right', fontWeight: 700 }}>
                          {utilPct.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>
    </Paper>
  );
}

function OverdueTasksCard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paperSx = { p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) {
          if (mounted) setTasks([]);
          return;
        }

        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;

        const managerId = (meCandidates || [])[0]?.id;
        if (!managerId) {
          if (mounted) setTasks([]);
          return;
        }

        // 1) load projects for this manager to limit scope and get project_code + active flags
        const { data: projList, error: projErr } = await supabase
          .from('tpr_projects')
          .select('id,project_code,archived,deleted')
          .eq('manager_id', managerId);
        if (projErr) throw projErr;
        const projects = projList || [];
        if (projects.length === 0) {
          if (mounted) setTasks([]);
          return;
        }
        const projectIds = projects.map(p => p.id);
        const projMap = {};
        for (const p of projects) projMap[String(p.id)] = p;

        // 2) fetch tasks under these projects
        const { data: rows, error: tErr } = await supabase
          .from('tpr_project_wbs_tasks')
          .select('id,project_id,code,name,owner,metadata,start_date,end_date')
          .in('project_id', projectIds);
        if (tErr) throw tErr;

        const now = new Date();
        const all = rows || [];

        const filtered = all.filter(t => {
          if (!t) return false;
          const dueStr = t.end_date || t.start_date || null;
          if (!dueStr) return false;
          const d = new Date(dueStr);
          if (isNaN(d.getTime())) return false;
          // only overdue
          if (!(d < now)) return false;

          // project must be active
          const proj = projMap[String(t.project_id)];
          if (!proj) return false;
          if (proj.archived === true || proj.deleted === true) return false;

          // status from metadata JSON
          const status = (t.metadata && (t.metadata.status || t.metadata.state)) ? String((t.metadata.status || t.metadata.state)).toLowerCase() : '';
          if (['done', 'completed', 'cancelled', 'closed'].includes(status)) return false;

          // skip recognized subtask flags in metadata
          const isSub = t.metadata && (t.metadata.is_subtask === true || t.metadata.subtask === true || String(t.metadata.type || '').toLowerCase() === 'subtask');
          if (isSub) return false;

          return true;
        }).map(t => {
          const due = new Date(t.end_date || t.start_date);
          const overdueDays = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
          return { ...t, overdueDays };
        }).sort((a, b) => (b.overdueDays || 0) - (a.overdueDays || 0));

        // resolve owner -> assignee_name if owner looks like an id
        const normalizeOwner = (o) => {
          if (!o && o !== 0) return [];
          if (Array.isArray(o)) return o.filter(Boolean);
          if (typeof o === 'string') {
            const s = o.trim();
            // try parse JSON array stored as string: '["uuid"]'
            if (s.startsWith('[')) {
              try {
                const p = JSON.parse(s);
                if (Array.isArray(p)) return p.filter(Boolean);
              } catch  {
                // fallthrough to return raw string
              }
            }
            return [s];
          }
          return [o];
        };

        const ownerValsRaw = filtered.flatMap(f => normalizeOwner(f.owner));
        const ownerVals = Array.from(new Set(ownerValsRaw.map(String).filter(s => s && s.length > 0)));
        const namesMap = {};
        const numericIds = ownerVals.filter(o => (/^\d+$/.test(String(o))));
        const uuidIds = ownerVals.filter(o => typeof o === 'string' && /^[0-9a-fA-F-]{36}$/.test(o));
        const idCandidates = [...numericIds.map(String), ...uuidIds];
        if (idCandidates.length > 0) {
          const { data: emps } = await supabase
            .from('employees')
            .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
            .in('id', idCandidates);
          if (emps) {
            for (const e of emps) {
              const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
              let name = '';
              if (thParts.length) name = thParts.join(' ');
              else {
                const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                if (enParts.length) name = enParts.join(' ');
                else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
              }
              namesMap[String(e.id)] = name;
            }
          }
        }

        const withNames = filtered.map(t => {
          const owners = normalizeOwner(t.owner);
          const ownerRaw = owners && owners.length > 0 ? owners[0] : null;
          const ownerKey = ownerRaw != null ? String(ownerRaw).trim() : null;
          const assigneeName = ownerKey && namesMap[ownerKey] ? namesMap[ownerKey] : (ownerKey || '—');
          const taskName = t.name || t.code || '—';
          return {
            ...t,
            task_name: taskName,
            assignee_name: assigneeName,
            project_code: (projMap[String(t.project_id)] || {}).project_code || '—',
          };
        });

        if (mounted) setTasks(withNames);
      } catch (e) {
        console.error('Overdue tasks load error', e);
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Paper sx={paperSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={900}>⚠️ งานที่เลยกำหนด</Typography>
      </Box>
      {/* Removed duplicated list rendering to avoid showing tasks twice */}

      <Box sx={{ mt: 1 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ mb: 1 }}>
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </Box>
          ))
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : tasks.length === 0 ? (
          <Typography color="text.secondary">ไม่มีงานที่ต้องติดตาม</Typography>
        ) : (
          tasks.map(t => (
            <Box key={t.id} sx={{ mb: 1, p: 1, borderRadius: 1, border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: '0.98rem' }}>{t.task_name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{t.project_code || '—'} • ผู้รับผิดชอบ: {t.assignee_name}</Typography>
                <Typography variant="body2" color="text.secondary" display="block" sx={{ fontWeight: 700, mt: 0.25 }}>เลยกำหนด {t.overdueDays} วัน</Typography>
              </Box>
              <Chip label={(t.overdueDays || 0) >= 3 ? 'วิกฤต' : 'เตือน'} color={(t.overdueDays || 0) >= 3 ? 'error' : 'warning'} size="small" />
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}

// Unbilled Time & Expenses widget
function UnbilledBox({ projectIds }) {
  const [timeHours, setTimeHours] = useState(null);
  const [expenseAmount, setExpenseAmount] = useState(null);
  const [loadingUnbilled, setLoadingUnbilled] = useState(true);
  const [unbilledError, setUnbilledError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUnbilled(true);
        setUnbilledError(null);
        // Debug: show incoming projectIds and sanitized pids
        try {
          console.log('UnbilledBox: incoming projectIds', projectIds);
        } catch {/* intentionally empty */}
        const pids = (projectIds || []).filter((x) => x != null);
        if (pids.length === 0) {
          try { console.log('UnbilledBox: no project ids after sanitization'); } catch  { /* intentionally empty */ }
        }
        if (pids.length === 0) {
          if (mounted) {
            setTimeHours(0);
            setExpenseAmount(0);
            setLoadingUnbilled(false);
          }
          return;
        }

        // Fetch unbilled approved time entries (invoice_id IS NULL)
        const { data: timeRows, error: timeErr } = await supabase
          .from('tpr_time_entries')
          .select('hours')
          .in('project_id', pids)
          .eq('status', 'Approved')
          .is('invoice_id', null);
        if (timeErr) throw timeErr;
        const totalHours = (timeRows || []).reduce((s, r) => s + Number(r.hours || 0), 0);

        // Fetch unbilled approved expenses
        const { data: expRows, error: expErr } = await supabase
          .from('tpr_expenses')
          .select('amount')
          .in('project_id', pids)
          .eq('status', 'Approved')
          .is('invoice_id', null);
        if (expErr) throw expErr;
        const totalAmount = (expRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);

       console.log('UnbilledBox: unbilled totals', { totalHours, totalAmount });

        if (!mounted) return;
        setTimeHours(totalHours);
        setExpenseAmount(totalAmount);
      } catch (e) {
        console.error('Load unbilled failed', e);
        if (mounted) setUnbilledError(e.message || String(e));
      } finally {
        if (mounted) setLoadingUnbilled(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectIds]);

  return (
    <Paper sx={{ p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={900}>🧾 รายการยังไม่บิล</Typography>
      </Box>

      <Box sx={{ mt: 1 }}>
        {loadingUnbilled ? (
          <Box>
            <Skeleton width={160} />
            <Skeleton width={160} />
          </Box>
        ) : unbilledError ? (
          <Alert severity="error">{unbilledError}</Alert>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <Box sx={{textAlign:"center"}}>
              <Typography variant="caption" color="text.secondary">ชั่วโมงยังไม่บิล</Typography>
              <Typography sx={{ fontWeight: 900 }}>{hoursToHHMM(Number(timeHours || 0))} ชม.</Typography>
            </Box>
            <Box sx={{textAlign:"center"}}>
              <Typography variant="caption" color="text.secondary">ค่าใช้จ่ายยังไม่บิล</Typography>
              <Typography sx={{ fontWeight: 900 }}>{(Number(expenseAmount || 0)).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}


export default function ManagerOverview() {
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectIdsForUnbilled, setProjectIdsForUnbilled] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const paperSx = { p: 2, border: '1px solid #eee', boxShadow: 'none', borderRadius: 2, width: '100%' };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) {
          console.warn('No authenticated email for manager overview');
          if (mounted) setLoading(false);
          return;
        }

        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id, current_address_email_1, current_address_email_2, current_address_email_3')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;

        const me = (meCandidates || [])[0];
        if (!me?.id) {
          console.warn('No employee id mapped for', email);
          if (mounted) setLoading(false);
          return;
        }

        const managerId = me.id;

        const { data: sum, error: sumErr } = await supabase
          .from('v_manager_project_tracking_summary')
          .select('*')
          .eq('manager_id', managerId)
          .limit(1)
          .single();
        if (!sumErr && mounted) setSummary(sum || null);

        const { data: proj, error: projErr } = await supabase
          .from('v_project_tracking_kpi')
          .select('project_code, budget_hours, actual_hours, budget_cost, actual_cost, project_progress, next_milestone_date, is_at_risk')
          .eq('manager_id', managerId)
          .order('project_code', { ascending: true });
        if (!projErr && mounted) setProjects(proj || []);

        // Also load project ids from the base table to supply UnbilledBox
        try {
          const { data: projList } = await supabase
            .from('tpr_projects')
            .select('id')
            .eq('manager_id', managerId);
          if (projList && mounted) setProjectIdsForUnbilled(projList.map(p => p.id));
        } catch  {
          // ignore; Unbilled will handle empty ids
        }

        // Build Project Alerts (max 3) using project data + team utilization
        try {
          const alertsList = [];
          const today = new Date();

          // 1) Budget / Cost Risk
          (proj || []).forEach(p => {
            const code = p.project_code || '—';
            const budgetCost = Number(p.budget_cost ?? 0);
            const actualCost = Number(p.actual_cost ?? 0);
            let pct = null;
            if (budgetCost > 0) pct = (actualCost / budgetCost) * 100;
            else {
              const bh = Number(p.budget_hours ?? 0);
              const ah = Number(p.actual_hours ?? 0);
              if (bh > 0) pct = (ah / bh) * 100;
            }
            const isCompleted = Number(p.project_progress || 0) >= 100;
            const cpi = p.cpi != null ? Number(p.cpi) : null;
            if (!isCompleted && pct != null && pct >= 80) {
              const severity = (pct >= 90 || (cpi != null && cpi < 0.9)) ? 'critical' : 'warning';
              alertsList.push({
                type: 'budget',
                severity,
                key: `budget:${code}`,
                project: code,
                message: `${code} ใช้งบถึง ${Math.round(pct)}% แล้ว`,
                score: severity === 'critical' ? 2 : 1,
              });
            }
          });

          // 2) Schedule / Milestone Risk
          (proj || []).forEach(p => {
            const code = p.project_code || '—';
            if (p.next_milestone_date) {
              const msDate = new Date(p.next_milestone_date);
              if (!isNaN(msDate.getTime())) {
                const diffDays = Math.ceil((msDate - today) / (1000 * 60 * 60 * 24));
                const name = p.next_milestone_name || 'Milestone';
                const spi = p.spi != null ? Number(p.spi) : null;
                if (diffDays < 0) {
                  alertsList.push({ type: 'schedule', severity: 'critical', key: `sched_over:${code}:${name}`, project: code, message: `${code} milestone “${name}” เกินกำหนด (${Math.abs(diffDays)} วัน)`, score: 2 });
                } else if (diffDays <= 3) {
                  alertsList.push({ type: 'schedule', severity: 'warning', key: `sched_soon:${code}:${name}`, project: code, message: `${code} milestone “${name}” ใกล้ถึงกำหนด (${diffDays} วัน)`, score: 1 });
                }
                if (spi != null && spi < 0.9) {
                  alertsList.push({ type: 'schedule', severity: 'critical', key: `sched_spi:${code}`, project: code, message: `${code} มี SPI ต่ำ (${spi.toFixed(2)})`, score: 2 });
                }
              }
            }
          });

          // 3) Resource / Team Overload — fetch team utilization monthly summary
          try {
            const { data: tuRows } = await supabase
              .from('v_manager_team_utilization_month')
              .select('user_id,total_util_pct')
              .eq('manager_id', managerId);
            if (tuRows && tuRows.length > 0) {
              const vals = tuRows.map(r => Number(r.total_util_pct ?? 0)).filter(v => Number.isFinite(v));
              if (vals.length > 0) {
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                const severity = avg > 95 ? 'critical' : (avg >= 90 ? 'warning' : null);
                if (severity) {
                  alertsList.push({ type: 'resource', severity, key: `resource:team`, project: null, message: `ทีมใช้งานเฉลี่ย ${Math.round(avg)}%`, score: severity === 'critical' ? 2 : 1 });
                }
              }
            }
          } catch  {
            /* load team utilization failed; suppressed debug log */
          }

          // Deduplicate by key, sort by severity then score then type, limit 3
          const uniq = {};
          for (const a of alertsList) {
            if (!uniq[a.key] || uniq[a.key].score < a.score) uniq[a.key] = a;
          }
          const final = Object.values(uniq).sort((a, b) => {
            const sevRank = s => (s === 'critical' ? 2 : 1);
            const rd = sevRank(b.severity) - sevRank(a.severity);
            if (rd !== 0) return rd;
            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
            return (a.type || '').localeCompare(b.type || '');
          }).slice(0, 3);
          if (mounted) setAlerts(final);
        } catch (e) {
          console.error('Error building project alerts', e);
        }
      } catch (e) {
        console.error('Failed to load manager overview data', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const s = summary || {
    active_count: 0,
    completed_count: 0,
    at_risk_count: 0,
    avg_cpi: null,
    avg_spi: null,
    cpi_lt_09_count: 0,
    spi_lt_09_count: 0
  };

  const avgCpi = s?.avg_cpi != null ? Number(s.avg_cpi) : null;
  const avgSpi = s?.avg_spi != null ? Number(s.avg_spi) : null;

  const colorByAvg = (v) => {
    if (v == null || Number.isNaN(v)) return 'default';
    if (v < 0.9) return 'danger';
    if (v < 1) return 'warning';
    return 'success';
  };

  const chartOptionsHours = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: { categories: projects.map(p => p.project_code) },
    yaxis: { title: { text: 'ชั่วโมง' } },
    colors: ['#ff9800', '#d32f2f'],
    legend: { show: true, position: 'top' },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          if (opts.seriesIndex === 1) {
            return `${hoursToHHMM(val)}`;
          }
          return Number(val).toLocaleString();
        }
      }
    },
  }), [projects]);

  const chartSeriesHours = useMemo(() => [
    { name: 'ชั่วโมงที่วางแผน', data: projects.map(p => Number(p.budget_hours || 0)) },
    { name: 'ชั่วโมงที่ใช้จริง', data: projects.map(p => Number(p.actual_hours || 0)) },
  ], [projects]);

  const chartSeriesCost = useMemo(() => [
    { name: 'งบประมาณค่าใช้จ่าย', data: projects.map(p => Number(p.budget_cost || 0)) },
    { name: 'ค่าใช้จ่ายจริง', data: projects.map(p => Number(p.actual_cost || 0)) },
  ], [projects]);

  const chartOptionsCost = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: { categories: projects.map(p => p.project_code) },
    yaxis: { title: { text: 'ค่าใช้จ่าย' } },
    colors: ['#1976d2', '#388e3c'],
    legend: { show: true, position: 'top' },
    tooltip: { y: { formatter: (val) => (val != null ? Number(val).toLocaleString() : '0') } },
  }), [projects]);

  const timelineSeries = useMemo(() => [
    {
      name: 'ความคืบหน้า (%)',
      data: projects.map(p => ({
        x: p.project_code,
        y: Math.min(100, Math.max(0, Number(p.project_progress || 0))),
        is_at_risk: !!p.is_at_risk,
        milestone: p.next_milestone_date,
      })),
    },
  ], [projects]);

  const timelineOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,     // ✅ เป็น timeline style
        barHeight: '50%',
        borderRadius: 1,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Number(val).toFixed(0)}%`,
    },
    xaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      title: { text: 'ความคืบหน้า (%)' },
      labels: { formatter: (v) => `${Number(v).toFixed(0)}%` },
    },
    yaxis: {
      labels: { style: { fontSize: '12px' } },
    },
    tooltip: {
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const dp = w.config.series[seriesIndex].data[dataPointIndex];
        const ms = dp?.milestone
          ? (() => {
              const d = new Date(dp.milestone);
              if (isNaN(d.getTime())) return '-';
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              return `${dd}/${mm}/${yyyy}`;
            })()
          : '-';
        const risk = dp?.is_at_risk ? 'เสี่ยง' : 'ปกติ';
        const val = series[seriesIndex][dataPointIndex];
        return `
        <div style="padding:10px; font-size:12px;">
          
          <div>จุดสำคัญที่ใกล้ถึงกำหนด: <b>${ms}</b></div>
          <div>ความคืบหน้า: <b>${Number(val).toFixed(0)}%</b></div>
          <div>สถานะ: <b>${risk}</b></div>
        </div>
      `;
      },
    },
    // ✅ สีตามความเสี่ยงรายแท่ง
    colors: projects.map(p => (p.is_at_risk ? '#d32f2f' : '#1976d2')),
    legend: { show: false },
  }), [projects]);


  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ===== ROW: ภาพรวมโครงการ + EVM (Colored) ===== */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: 'row', alignItems: 'stretch' }}>
        {/* LEFT: Overview */}
        <Paper sx={{ ...paperSx, flex: '3 1 520px' }}>
          <Typography fontWeight={900}>📁 ภาพรวมโครงการ</Typography>

          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            <SmallCard title="กำลังดำเนินการ" value={s.active_count ?? 0} color="info" />
            <SmallCard title="เสร็จสิ้น" value={s.completed_count ?? 0} color="success" />
            <SmallCard
              title="ความเสี่ยง"
              value={s.at_risk_count ?? 0}
              color={(s.at_risk_count ?? 0) > 0 ? 'danger' : 'success'}
              sx={{ gridColumn: '1 / -1' }}   // ✅ เต็มความกว้าง 2 คอลัมน์
              info={
                "การคำนวณความเสี่ยง:\n" +
                "- ถือว่า 'เสี่ยง' หาก CPI < 0.9\n" +
                "- หรือ SPI < 0.9\n" +
                "- หรือมี milestone ถัดไปที่ล่าช้าหรือมีความไม่แน่นอน"
              }
            />

          </Box>
        </Paper>

        {/* RIGHT: EVM */}
        <Paper sx={{ ...paperSx, flex: '2 1 420px' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Typography fontWeight={900}>📈 EVM</Typography>
            <Typography variant="caption" color="text.secondary">(ตัวชี้วัดสุขภาพโครงการ)</Typography>
          </Box>

          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            <SmallCard
              title="CPI < 0.9"
              value={s.cpi_lt_09_count ?? 0}
              color={(s.cpi_lt_09_count ?? 0) > 0 ? 'danger' : 'success'}
              info={
                "CPI = EV / AC\nEV (มูลค่างานที่เสร็จ): มูลค่างานที่ประเมินว่าเสร็จแล้ว\nAC (ต้นทุนจริง): ต้นทุนที่เกิดขึ้นจริง\nถือว่า 'เสี่ยง' หาก CPI < 0.9"
              }
            />
            <SmallCard
              title="SPI < 0.9"
              value={s.spi_lt_09_count ?? 0}
              color={(s.spi_lt_09_count ?? 0) > 0 ? 'danger' : 'success'}
              info={
                "SPI = EV / PV\nPV (มูลค่างานตามแผน): มูลค่างานที่วางแผนไว้ภายในช่วงเวลาที่พิจารณา\nEV (มูลค่างานที่เสร็จ): มูลค่างานที่เสร็จจริงแล้ว\nถือว่า 'เสี่ยง' หาก SPI < 0.9"
              }
            />
            <SmallCard
              title="CPI (เฉลี่ย)"
              value={avgCpi != null ? avgCpi.toFixed(2) : '-'}
              color={colorByAvg(avgCpi)}
              info={
                "CPI (เฉลี่ย) = ค่าเฉลี่ยของ CPI ของโครงการภายใต้การดูแล\n= ค่าเฉลี่ยของ (EV/AC) ต่อโครงการ (อาจถ่วงน้ำหนักตามงบประมาณ)"
              }
            />
            <SmallCard
              title="SPI (เฉลี่ย)"
              value={avgSpi != null ? avgSpi.toFixed(2) : '-'}
              color={colorByAvg(avgSpi)}
              info={
                "SPI (เฉลี่ย) = ค่าเฉลี่ยของ SPI ของโครงการภายใต้การดูแล\n= ค่าเฉลี่ยของ (EV/PV) ต่อโครงการ (อาจถ่วงน้ำหนักตามงบประมาณ)"
              }
            />
          </Box>
        </Paper>
        {/* ALERTS: Project Alerts (column 3) */}
        <Paper sx={{ ...paperSx, flex: '1 1 300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography fontWeight={900}>🔔 การแจ้งเตือน</Typography>
            <Typography variant="caption" color="text.secondary">สูงสุด 3 รายการ</Typography>
          </Box>

          <Box sx={{ mt: 1 }}>
            {alerts.length === 0 ? (
              <Typography color="text.secondary" sx={{textAlign:"center"}}>ไม่มีการแจ้งเตือนที่ต้องตัดสินใจ</Typography>
            ) : (
              alerts.map((a) => (
                <Box key={a.key} sx={{ mb: 1, p: 1, borderRadius: 1, border: '1px solid #eee', backgroundColor: a.severity === 'critical' ? '#fff5f5' : '#fffbeb' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{a.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.project ? `Project: ${a.project}` : 'ทีม'}</Typography>
                    </Box>
                    <Chip label={a.severity === 'critical' ? 'วิกฤต' : 'เตือน'} color={a.severity === 'critical' ? 'error' : 'warning'} size="small" />
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Box>

      {/* ไทม์ไลน์ (Bar Chart) */}
      <Paper sx={paperSx}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ textAlign: 'center' }}>
          🚧 ความคืบหน้าโครงการ
        </Typography>

        <Box sx={{ mt: 2 }}>
          {loading && <Typography color="text.secondary">กำลังโหลด...</Typography>}

          {!loading && projects.length === 0 && (
            <Typography color="text.secondary">ไม่มีโครงการ</Typography>
          )}

          {!loading && projects.length > 0 && (
            <ReactApexChart
              options={timelineOptions}
              series={timelineSeries}
              type="bar"
              height={Math.max(260, projects.length * 45)} // ✅ ยิ่งโครงการเยอะ ยิ่งสูง
            />
          )}
        </Box>
      </Paper>


      {/* งบเทียบจริง */}
      <Paper sx={paperSx}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ textAlign: 'center' }}>
          💰 เปรียบเทียบการใช้งบชั่วโมงและงบค่าใช้จ่าย
        </Typography>

        <Box sx={{ mt: 1 }}>
          {loading && <Typography color="text.secondary">กำลังโหลด...</Typography>}
          {!loading && projects.length === 0 && <Typography color="text.secondary">ไม่มีโครงการ</Typography>}

          {!loading && projects.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch', mt: 1 }}>
              <Box sx={{ flex: '1 1 0', minWidth: 320 }}>
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
                  
                </Typography>
                <ReactApexChart options={chartOptionsHours} series={chartSeriesHours} type="bar" height={260} />
              </Box>

              <Box sx={{ flex: '1 1 0', minWidth: 320 }}>
                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
                  
                </Typography>
                <ReactApexChart options={chartOptionsCost} series={chartSeriesCost} type="bar" height={260} />
              </Box>
            </Box>
          )}
        </Box>
      </Paper>



      {/* Team Utilization / Heatmap */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Box sx={{ flex: '1 1 0', minWidth: 520 }}>
          <TeamUtilization />
        </Box>
        <Box sx={{ flex: '1 1 0', minWidth: 520 }}>
          <TeamWorkloadHeatmap />
        </Box>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Box sx={{ flex: '1 1 420px', minWidth: 320 }}>
          <OverdueTasksCard />
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <UnbilledBox projectIds={projectIdsForUnbilled} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <ExpensesBox />
      </Box>
      <Box sx={{ mt: 2 }}>
        <PendingTimeApprovalsBox />
      </Box>
    </Box>
  );
}

// Box for displaying expense records (ตารางค่าใช้จ่าย)
function ExpensesBox() {
  const [expenses, setExpenses] = useState([]);
  const [projectMap, setProjectMap] = useState({});
  const [submitterNames, setSubmitterNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingIds, setApprovingIds] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const paperSx = { p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 };

  const STATUS_LABELS = {
    Draft: 'ร่าง',
    Submitted: 'ส่งขออนุมัติ',
    Approved: 'อนุมัติ',
    Rejected: 'ปฏิเสธ',
    Cancelled: 'ยกเลิก',
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) throw new Error('No authenticated user');

        // Find employee id
        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;
        const managerId = (meCandidates || [])[0]?.id;
        if (!managerId) {
          if (mounted) setExpenses([]);
          return;
        }

        // Find projects managed by this manager
        const { data: projects, error: projErr } = await supabase
          .from('tpr_projects')
          .select('id,project_code')
          .eq('manager_id', managerId);
        if (projErr) throw projErr;
        const projectIds = (projects || []).map(p => p.id);
        if (projectIds.length === 0) {
          if (mounted) setExpenses([]);
          return;
        }
        // build project id -> project_code map for rendering
        const pMap = {};
        for (const p of (projects || [])) pMap[String(p.id)] = p.project_code || '-';
        if (mounted) setProjectMap(pMap);

        // Fetch only Submitted expenses for these projects (limit 10, latest first)
        const { data: rows, error: expErr } = await supabase
          .from('tpr_expenses')
          .select('id,project_id,expense_date,category,description,amount,status,created_at,submitted_by,attachments')
          .in('project_id', projectIds)
          .eq('status', 'Submitted')
          .order('expense_date', { ascending: false });
        if (expErr) throw expErr;
        const r = rows || [];
        if (!mounted) return;
        // Log attachments shape for debugging
        // removed debug logging of expenses attachments
        // fetch submitter names (submitted_by -> employee name)
        const submitterIds = Array.from(new Set((r || []).map(x => x.submitted_by).filter(Boolean)));
        if (submitterIds.length > 0) {
          try {
            const { data: emps } = await supabase
              .from('employees')
              .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
              .in('id', submitterIds);
            const sMap = {};
            if (emps) {
              for (const e of emps) {
                const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                let name = '';
                if (thParts.length) name = thParts.join(' ');
                else {
                  const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                  if (enParts.length) name = enParts.join(' ');
                  else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
                }
                sMap[String(e.id)] = name;
              }
            }
            if (mounted) setSubmitterNames(sMap);
          } catch  {
            /* submitter names load failed; suppressed debug log */
          }
        }
        setExpenses(r);

        // no submitter lookup here (we only display the requested columns)
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleApprove = async (expenseId) => {
    if (!expenseId) return;
    setApprovingIds(ids => Array.from(new Set([...ids, expenseId])));
    try {
      // resolve manager id for approved_by
      const { data: { session } = {} } = await supabase.auth.getSession();
      const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
      const { data: meCandidates } = await supabase
        .from('employees')
        .select('id')
        .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
        .limit(1);
      const managerId = (meCandidates || [])[0]?.id || null;

      const updates = { status: 'Approved', approved_at: new Date().toISOString(), approved_by: managerId };
      const { error } = await supabase.from('tpr_expenses').update(updates).eq('id', expenseId);
      if (error) throw error;

      // optimistic update locally
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status: 'Approved' } : e));
      setSnackbar({ open: true, message: 'อนุมัติค่าใช้จ่ายสำเร็จ', severity: 'success' });
    } catch (e) {
      console.error('Approve failed', e);
      setError(e.message || String(e));
      setSnackbar({ open: true, message: e.message || 'เกิดข้อผิดพลาดในการอนุมัติ', severity: 'error' });
    } finally {
      setApprovingIds(ids => ids.filter(i => i !== expenseId));
    }
  };

  return (
    <Paper sx={paperSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={900}>💸 ค่าใช้จ่ายที่ส่งขออนุมัติ</Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        {loading ? (
          <Table sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
            <TableHead>
              <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>วันที่</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>โครงการ</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>ผู้ส่ง</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>หมวดหมู่</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>รายละเอียด</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, textAlign: 'center' }}>ใบเสร็จมา</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>จำนวนเงิน</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, textAlign: 'center' }}>จัดการ</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={60} /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell><Skeleton width={32} /></TableCell>
                  <TableCell><Skeleton width={60} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : expenses.length === 0 ? (
          <Typography color="text.secondary">ไม่มีข้อมูลค่าใช้จ่ายที่ส่งขออนุมัติ</Typography>
        ) : (
          <Table sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>วันที่</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>โครงการ</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ผู้ส่ง</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>หมวดหมู่</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>รายละเอียด</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, textAlign: 'center' }}>ใบเสร็จมา</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>จำนวนเงิน</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, textAlign: 'center' }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((exp) => {
                const isApproving = approvingIds.includes(exp.id);
                return (
                  <TableRow key={exp.id}>
                    <TableCell>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                    <TableCell>{projectMap[String(exp.project_id)] || '-'}</TableCell>
                    <TableCell>{submitterNames[String(exp.submitted_by)] || exp.submitted_by || '-'}</TableCell>
                    <TableCell>{exp.category || '-'}</TableCell>
                    <TableCell>{exp.description || '-'}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {Array.isArray(exp.attachments) && exp.attachments.length > 0 ? (
                        <Tooltip title={`${exp.attachments.length} ไฟล์`}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              try {
                                const url = exp.attachments && exp.attachments[0] && exp.attachments[0].public_url;
                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                              } catch (err) {
                                console.error('Open attachment failed', err);
                              }
                            }}
                            sx={{ p: 0.5 }}
                            aria-label="open-receipt"
                          >
                            <ReceiptLongIcon fontSize="small" sx={{ color: 'primary.main' }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="ไม่มีใบเสร็จ">
                          <IconButton size="small" disabled sx={{ p: 0.5 }}>
                            <ReceiptLongIcon fontSize="medium" sx={{ color: 'text.disabled', opacity: 0.6 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'centสถานะ Submitteder' }}>
                      <Button
                        // size="small"
                        variant="contained"
                        startIcon={<CheckCircleIcon fontSize="small" />}
                        disabled={isApproving || exp.status !== 'Submitted'}
                        onClick={() => handleApprove(exp.id)}
                        sx={{ backgroundColor: '#000', color: '#fff', '&:hover': { backgroundColor: '#111' } }}
                      >
                        อนุมัติ
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>
    {/* Snackbar for expense approval */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <MuiAlert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
        {snackbar.message}
      </MuiAlert>
    </Snackbar>
    </Paper>
  );
}

// Box showing time entries awaiting approval for projects managed by this manager
function PendingTimeApprovalsBox() {
  const [entries, setEntries] = useState([]);
  const [projectMap, setProjectMap] = useState({});
  const [employeeNames, setEmployeeNames] = useState({});
  const [taskNames, setTaskNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingIds, setApprovingIds] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const paperSx = { p: 2, boxShadow: 'none', border: '1px solid #eee', borderRadius: 2 };

  // compute current week Monday..Friday (we only show weekdays)
  const weekStart = React.useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // monday
    const m = new Date(d);
    m.setDate(d.getDate() + diff);
    m.setHours(0,0,0,0);
    return m;
  }, []);
  const weekEnd = React.useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(weekStart.getDate() + 4); // Friday
    e.setHours(23,59,59,999);
    return e;
  }, [weekStart]);

  // displayed week can be navigated by manager (prev/next week)
  const [displayWeekStart, setDisplayWeekStart] = useState(() => new Date(weekStart));
  const prevWeek = () => setDisplayWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setDisplayWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d; });

  const formatDateKey = (d) => {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { session } = {} } = await supabase.auth.getSession();
        const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
        if (!email) throw new Error('No authenticated user');

        // find manager employee id
        const { data: meCandidates, error: meErr } = await supabase
          .from('employees')
          .select('id')
          .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
          .limit(1);
        if (meErr) throw meErr;
        const managerId = (meCandidates || [])[0]?.id;
        if (!managerId) {
          if (mounted) setEntries([]);
          return;
        }

        // get projects managed by this manager
        const { data: projects, error: projErr } = await supabase
          .from('tpr_projects')
          .select('id,project_code')
          .eq('manager_id', managerId);
        if (projErr) throw projErr;
        const projectIds = (projects || []).map(p => p.id);
        const pMap = {};
        for (const p of (projects || [])) pMap[String(p.id)] = p.project_code || '-';
        if (mounted) setProjectMap(pMap);

        if (!projectIds.length) {
          if (mounted) setEntries([]);
          return;
        }

        // fetch submitted time entries for these projects (include older weeks so managers see missed approvals)
        const { data: rows, error: rowsErr } = await supabase
          .from('tpr_time_entries')
          .select('id,entry_date,user_id,project_id,task_id,hours,note,status')
          .in('project_id', projectIds)
          .eq('status', 'Submitted')
          .order('entry_date', { ascending: false })
          .limit(1000);
        if (rowsErr) throw rowsErr;
        const r = rows || [];
        if (!mounted) return;

        // load employee names
        const userIds = Array.from(new Set(r.map(x => x.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          try {
            const { data: emps } = await supabase
              .from('employees')
              .select('id,employee_code,first_name_th,last_name_th,nickname_th,first_name_en,last_name_en,nickname_en')
              .in('id', userIds);
            const eMap = {};
            if (emps) {
              for (const e of emps) {
                const thParts = [(e.first_name_th || ''), (e.last_name_th || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                let name = '';
                if (thParts.length) name = thParts.join(' ');
                else {
                  const enParts = [(e.first_name_en || ''), (e.last_name_en || '')].map(s => (s || '').toString().trim()).filter(Boolean);
                  if (enParts.length) name = enParts.join(' ');
                  else name = (e.nickname_th || e.nickname_en || e.employee_code || String(e.id || '')).toString();
                }
                eMap[String(e.id)] = name;
              }
            }
            if (mounted) setEmployeeNames(eMap);
          } catch {/* ignore name fetch errors */}
        }

        // load task names (if task_id refers to tasks)
        const taskIds = Array.from(new Set(r.map(x => x.task_id).filter(Boolean)));
        if (taskIds.length > 0) {
          try {
            const { data: tasks } = await supabase
              .from('tpr_project_wbs_tasks')
              .select('id,code,name')
              .in('id', taskIds);
            const tMap = {};
            if (tasks) {
              for (const t of tasks) {
                tMap[String(t.id)] = (t.name || t.code || String(t.id));
              }
            }
            if (mounted) setTaskNames(tMap);
          } catch  {
            /* ignore task fetch errors */
          }
        }

        if (mounted) setEntries(r);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [weekStart, weekEnd]);
 
  const approveAllForUser = async (userId) => {
    try {
      const ids = entries.filter(e => String(e.user_id) === String(userId) && String(e.status || '').toLowerCase() === 'submitted').map(e => e.id);
      if (!ids.length) return;
      setApprovingIds(ids => Array.from(new Set([...ids, ...ids])));
      const { data: { session } = {} } = await supabase.auth.getSession();
      const email = session?.user?.email ? String(session.user.email).trim().toLowerCase() : '';
      const { data: meCandidates } = await supabase
        .from('employees')
        .select('id')
        .or(`current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`)
        .limit(1);
      const managerId = (meCandidates || [])[0]?.id || null;
      const updates = { status: 'Approved', approved_at: new Date().toISOString(), approved_by: managerId };
      const { error } = await supabase.from('tpr_time_entries').update(updates).in('id', ids);
      if (error) throw error;
      setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'Approved' } : e));
      setSnackbar({ open: true, message: 'อนุมัติการลงเวลาสำเร็จ', severity: 'success' });
    } catch (e) {
      console.error('Bulk approve failed', e);
      setError(e.message || String(e));
      setSnackbar({ open: true, message: e.message || 'เกิดข้อผิดพลาดในการอนุมัติ', severity: 'error' });
    } finally {
      setApprovingIds([]);
    }
  };

  const rejectAllForUser = async (userId) => {
    try {
      const ids = entries.filter(e => String(e.user_id) === String(userId) && String(e.status || '').toLowerCase() === 'submitted').map(e => e.id);
      if (!ids.length) return;
      setApprovingIds(ids => Array.from(new Set([...ids, ...ids])));
      const updates = { status: 'Rejected', approved_at: new Date().toISOString() };
      const { error } = await supabase.from('tpr_time_entries').update(updates).in('id', ids);
      if (error) throw error;
      setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'Rejected' } : e));
      setSnackbar({ open: true, message: 'ปฏิเสธการลงเวลาเรียบร้อย', severity: 'success' });
    } catch (e) {
      console.error('Bulk reject failed', e);
      setError(e.message || String(e));
      setSnackbar({ open: true, message: e.message || 'เกิดข้อผิดพลาดในการปฏิเสธ', severity: 'error' });
    } finally {
      setApprovingIds([]);
    }
  };

  // group entries by user and task, build weekday columns (Mon–Fri)
  const days = React.useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(displayWeekStart);
    d.setDate(displayWeekStart.getDate() + i); // Monday + i (0..4)
    return d;
  }), [displayWeekStart]);

  const grouped = React.useMemo(() => {
    const g = {};
    // build full grouping from all entries
    for (const e of entries) {
      const uid = String(e.user_id || '');
      if (!g[uid]) g[uid] = { userId: uid, tasks: {}, total: 0 };
      const taskKey = `${e.project_id || ''}::${e.task_id || ''}::${(e.note||'')}`;
      if (!g[uid].tasks[taskKey]) {
        g[uid].tasks[taskKey] = { project_id: e.project_id, task_id: e.task_id, note: e.note || '', dayMap: {}, total: 0 };
      }
      const t = g[uid].tasks[taskKey];
      const day = formatDateKey(e.entry_date);
      t.dayMap[day] = (t.dayMap[day] || 0) + Number(e.hours || 0);
      t.total = (t.total || 0) + Number(e.hours || 0);
      g[uid].total = (g[uid].total || 0) + Number(e.hours || 0);
    }

    // compute visible days set (keys) for the currently displayed week
    const visibleDayKeys = new Set(days.map(d => formatDateKey(d)).filter(Boolean));

    // filter tasks to only those with entries in the displayed week
    const filtered = {};
    for (const uid of Object.keys(g)) {
      const userGroup = g[uid];
      const tasks = {};
      let userTotal = 0;
      for (const [tk, t] of Object.entries(userGroup.tasks)) {
        // check if task has any dayMap key in visibleDayKeys
        const hasVisible = Object.keys(t.dayMap || {}).some(k => visibleDayKeys.has(k));
        if (hasVisible) {
          // build a task object that contains only dayMap entries for visible days
          const visibleDayMap = {};
          let taskVisibleTotal = 0;
          for (const k of Object.keys(t.dayMap || {})) {
            if (visibleDayKeys.has(k)) {
              visibleDayMap[k] = t.dayMap[k];
              taskVisibleTotal += Number(t.dayMap[k] || 0);
            }
          }
          tasks[tk] = { ...t, dayMap: visibleDayMap, total: taskVisibleTotal };
          userTotal += taskVisibleTotal;
        }
      }
      if (Object.keys(tasks).length) {
        filtered[uid] = { userId: uid, tasks, total: userTotal };
      }
    }

    return filtered;
  }, [entries, days]);

  return (
    <Paper sx={paperSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={900}>⏳ รออนุมัติการลงเวลา</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="สัปดาห์ก่อนหน้า" onClick={prevWeek} size="small"><ChevronLeftIcon /></IconButton>
          <Typography variant="subtitle2" sx={{ mx: 1, whiteSpace: 'nowrap' }}>{days && days.length === 5 ? `สัปดาห์: ${days[0].toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })} – ${days[4].toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}` : '-'}</Typography>
          <IconButton aria-label="สัปดาห์ถัดไป" onClick={nextWeek} size="small"><ChevronRightIcon /></IconButton>
        </Box>
      </Box>
      <Box sx={{ mt: 1 }}>
        {loading ? (
          <Typography color="text.secondary">กำลังโหลด...</Typography>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : Object.keys(grouped).length === 0 ? (
          <Typography color="text.secondary">ไม่มีรายการสำหรับสัปดาห์นี้</Typography>
        ) : (
          Object.values(grouped).map((grp) => (
            <Box key={grp.userId} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{employeeNames[grp.userId] || grp.userId}</Typography>
                  <Typography variant="caption" color="text.secondary">รวมชั่วโมงสัปดาห์นี้: {hoursToHHMM(grp.total)} (OT: {hoursToHHMM(Math.max(0, (grp.total || 0) - 40))})</Typography>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon fontSize="small" />}
                    onClick={() => approveAllForUser(grp.userId)}
                    disabled={approvingIds.length > 0}
                    sx={{ mr: 1, backgroundColor: '#000', color: '#fff' }}
                  >
                    อนุมัติ
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon fontSize="small" />}
                    onClick={() => rejectAllForUser(grp.userId)}
                    disabled={approvingIds.length > 0}
                  >
                    ปฏิเสธ
                  </Button>
                </Box>
              </Box>

              <Table size="small" sx={{ mt: 1, '& td, & th': { borderBottom: 'none' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>งาน</TableCell>
                    {days.map((d) => (<TableCell key={formatDateKey(d)} align="center" sx={{ fontWeight: 700 }}>{d.toLocaleDateString('th-TH', { weekday: 'long' })}</TableCell>))}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>รวม</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(grp.tasks).map((t, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{(projectMap[String(t.project_id)] || '-') + (t.task_id ? ` / ${taskNames[String(t.task_id)] || t.task_id}` : '')} {t.note ? `• ${t.note}` : ''}</TableCell>
                      {days.map((d) => {
                        const dayKey = formatDateKey(d);
                        return (<TableCell key={dayKey} align="center">{typeof t.dayMap[dayKey] !== 'undefined' ? hoursToHHMM(t.dayMap[dayKey]) : '-'}</TableCell>);
                      })}
                      <TableCell align="right">{hoursToHHMM(t.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ))
        )}
      </Box>
    {/* Snackbar for time approval/reject */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <MuiAlert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
        {snackbar.message}
      </MuiAlert>
    </Snackbar>
    </Paper>
  );
}
