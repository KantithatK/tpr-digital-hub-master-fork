import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';

export default function WorkstreamDetail({ workstream, onBack }) {
  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button variant="outlined" color="inherit" onClick={onBack}>ย้อนกลับ</Button>
        <Typography variant="h6">รายละเอียด Workstream</Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {workstream ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{workstream.name || workstream.title || 'ไม่ทราบชื่อ'}</Typography>
          <Typography variant="body2" color="text.secondary">รหัส: {workstream.id || '-'}</Typography>
          {workstream.description && (
            <Typography variant="body2">{workstream.description}</Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">ไม่พบข้อมูล Workstream</Typography>
      )}
    </Box>
  );
}
