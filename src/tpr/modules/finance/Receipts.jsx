import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Receipts() {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h6">รับชำระ</Typography>
      <Typography variant="body2" color="text.secondary">คอมโพเนนต์แยกรับชำระ (placeholder)</Typography>
    </Box>
  );
}
