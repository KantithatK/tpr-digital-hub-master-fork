import React from 'react';
import ListAltIcon from '@mui/icons-material/ListAlt';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const PROJECTS_NAV = {
  segment: 'projects',
  title: 'โครงการ',
  icon: Icon32(<ListAltIcon />),
};
