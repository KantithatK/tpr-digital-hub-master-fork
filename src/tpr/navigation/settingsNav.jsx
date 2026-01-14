import React from 'react';
import SettingsIcon from '@mui/icons-material/Settings';

const Icon32 = (icon) => React.cloneElement(icon, { sx: { width: 32, height: 32 } });

export const SETTINGS_NAV = {
  segment: 'settings',
  title: 'ตั้งค่าระบบ',
  icon: Icon32(<SettingsIcon />),
};
