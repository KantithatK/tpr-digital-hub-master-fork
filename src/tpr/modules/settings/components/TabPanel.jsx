// src/tpr/modules/settings/components/TabPanel.jsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

/**
 * TabPanel (with Skeleton)
 *
 * Props เพิ่มเติม (optional):
 * @param {boolean} loading  // ถ้า true จะแสดง skeleton แทน children
 */
export default function TabPanel(props) {
  const { children, value, index, loading = false, ...other } = props;

  const show = value === index;

  return (
    <Box
      component="div"
      role="tabpanel"
      hidden={!show}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      sx={{
        flex: 1,
        display: show ? 'flex' : 'none',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
      {...other}
    >
      {show ? (
        <Box
          sx={{
            p: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            /* ===== Skeleton ระดับ Tab / Page ===== */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {/* header / search */}
              <Skeleton variant="rounded" height={40} />

              {/* content block */}
              <Skeleton variant="rounded" height={120} />
              <Skeleton variant="rounded" height={120} />

              {/* table / long content */}
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="rounded" height="100%" />
              </Box>
            </Box>
          ) : (
            children
          )}
        </Box>
      ) : null}
    </Box>
  );
}
