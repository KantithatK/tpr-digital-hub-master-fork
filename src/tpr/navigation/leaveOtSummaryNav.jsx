import React from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const LEAVE_OT_SUMMARY_NAV = {
  segment: 'leave-ot-summary',
  title: 'ลา & โอที',
  icon: Icon32(<BarChartIcon />),
};

export default LEAVE_OT_SUMMARY_NAV;
