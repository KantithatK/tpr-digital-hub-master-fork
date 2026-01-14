import React from 'react';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const PLANNING_NAV = {
	segment: 'planning',
	title: 'งานโครงการ',
	icon: Icon32(<BusinessCenterIcon />),
};
