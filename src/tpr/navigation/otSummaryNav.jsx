import React from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const OT_SUMMARY_NAV = {
  segment: 'ot-summary',
  title: 'สรุป OT',
  icon: Icon32(<BarChartIcon />),
};

export default OT_SUMMARY_NAV;
