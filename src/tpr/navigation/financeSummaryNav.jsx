import React from 'react';
import PaidIcon from '@mui/icons-material/Paid';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const FINANCE_SUMMARY_NAV = {
  segment: 'finance-summary',
  title: 'สรุปการเงิน',
  icon: Icon32(<PaidIcon />),
};
