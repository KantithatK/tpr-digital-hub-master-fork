import React from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const TIME_NAV = {
  segment: 'time-logging',
  title: 'บันทึกเวลา',
  icon: Icon32(<AccessTimeIcon />),
};
