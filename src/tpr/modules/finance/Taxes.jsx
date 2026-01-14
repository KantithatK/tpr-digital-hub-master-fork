import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Taxes() {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h6">ภาษี</Typography>
      <Typography variant="body2" color="text.secondary">คอมโพเนนต์แยกสำหรับภาษี (placeholder)</Typography>
    </Box>
  );
}
