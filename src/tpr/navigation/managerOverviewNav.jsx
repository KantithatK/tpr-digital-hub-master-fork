import React from 'react';
import InsightsIcon from '@mui/icons-material/Insights';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const MANAGER_OVERVIEW_NAV = {
  segment: 'manager-overview',
  title: 'ผู้จัดการ',
  icon: Icon32(<InsightsIcon />),
};
