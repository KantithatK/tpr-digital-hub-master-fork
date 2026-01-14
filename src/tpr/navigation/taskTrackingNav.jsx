import React from 'react';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const TASK_TRACKING_NAV = {
  segment: 'task-tracking',
  title: 'ติดตามงาน',
  icon: Icon32(<TrackChangesIcon />),
};
