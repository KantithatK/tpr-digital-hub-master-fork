import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function SummaryDashboard() {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h6">สรุปการเงิน</Typography>
      <Typography variant="body2" color="text.secondary">คอมโพเนนต์แยกสำหรับสรุปการเงิน (placeholder)</Typography>
    </Box>
  );
}
