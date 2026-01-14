import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';

export type StatusKey = 'todo' | 'doing' | 'review' | 'done';

export type ChartsTask = {
  id: string | number;
  name?: string;
  status?: string | StatusKey;
};

export type ChartsViewProps = {
  tasks: ChartsTask[];
  title?: string;
};

function normalizeStatus(s?: string | StatusKey): StatusKey {
  if (!s) return 'todo';
  const x = String(s).toLowerCase();
  if (x.includes('todo') || x.includes('ยัง') || x.includes('ยังไม่')) return 'todo';
  if (x.includes('doing') || x.includes('กำลัง') || x.includes('ทำ') || x.includes('active') || x.includes('ดำเนิน')) return 'doing';
  if (x.includes('review') || x.includes('รอตรวจ') || x.includes('ตรวจ')) return 'review';
  if (x.includes('done') || x.includes('เสร') || x.includes('เสร็จ') || x.includes('complete')) return 'done';
  return 'todo';
}

function statusLabelThai(k: StatusKey) {
  switch (k) {
    case 'doing': return 'กำลังทำ';
    case 'review': return 'รอตรวจ';
    case 'done': return 'เสร็จสิ้น';
    case 'todo':
    default: return 'ยังไม่เริ่ม';
  }
}

function statusColor(k: StatusKey) {
  switch (k) {
    case 'doing': return '#7c4dff';
    case 'review': return '#ff9800';
    case 'done': return '#43a047';
    case 'todo':
    default: return '#9ca3af';
  }
}

export default function ChartsView({ tasks, title = 'มุมมองแผนภูมิ (Charts)' }: ChartsViewProps) {
  const counts = React.useMemo(() => {
    const init = { todo: 0, doing: 0, review: 0, done: 0 } as Record<StatusKey, number>;
    (tasks || []).forEach(t => { const k = normalizeStatus(t.status); init[k] += 1; });
    return init;
  }, [tasks]);

  const total = React.useMemo(() => (tasks || []).length, [tasks]);
  const doneCount = counts['done'];
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const maxCount = Math.max(1, ...Object.values(counts));

  const empty = (total === 0);

  return (
    <Box sx={{ p: 2, borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', bgcolor: '#fff', border: '1px solid #eee' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{title}</Typography>
      <Divider sx={{ mb: 2 }} />
      {empty ? (
        <Typography variant="body2" color="text.secondary">ยังไม่มีงานในโครงการนี้ จึงไม่สามารถคำนวณแผนภูมิได้ตอนนี้</Typography>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {/* Left: จำนวนงานตามสถานะ */}
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <Box sx={{ p: 1.5, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>จำนวนงานตามสถานะ</Typography>
              <Stack spacing={1}>
                {(Object.keys(counts) as StatusKey[]).map((k) => (
                  <Stack key={k} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 100, fontSize: 12 }}>{statusLabelThai(k)}</Box>
                    <Box sx={{ flex: 1, bgcolor: '#f5f5f5', borderRadius: 999, overflow: 'hidden', height: 12 }}>
                      <Box sx={{ width: `${(counts[k] / maxCount) * 100}%`, bgcolor: statusColor(k), height: '100%' }} />
                    </Box>
                    <Box sx={{ width: 60, textAlign: 'right', fontSize: 12 }}>{counts[k]} งาน</Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Right: ความคืบหน้าโครงการ */}
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <Box sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>ความคืบหน้าโครงการ</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                คิดจากสัดส่วน “จำนวนงานที่เสร็จแล้ว / งานทั้งหมด”
              </Typography>
              <Box sx={{ position: 'relative', height: 22, borderRadius: 999, bgcolor: '#f0f0f0', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, bgcolor: '#43a047' }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{progress}% เสร็จแล้ว</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      )}
    </Box>
  );
}
