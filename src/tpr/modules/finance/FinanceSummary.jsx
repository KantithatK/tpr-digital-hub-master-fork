import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import ReceivablesInvoices from './ReceivablesInvoices';
import SummaryDashboard from './SummaryDashboard';
import Receipts from './Receipts';
import CreditRefund from './CreditRefund';
import Taxes from './Taxes';
import ClosingReports from './ClosingReports';

/* ---------- Tab Panel ---------- */
function TabPanel({ value, index, children }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        display: value === index ? 'block' : 'none',
        width: '100%',
        py: 2,
      }}
    >
      {children}
    </Box>
  );
}

/* ---------- Main Component ---------- */
export default function FinanceTabs() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Tabs Header */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="ภาพรวม" />
          <Tab label="ใบแจ้งหนี้" />
          <Tab label="ใบรับชำระ" />
          <Tab label="ใบลดหนี้ / คืนเงิน" />
          <Tab label="ภาษี" />
          <Tab label="ปิดงวด & รายงาน" />
        </Tabs>
      </Paper>

      {/* Tab Content (เต็มความกว้าง) */}
      <Box sx={{ px: 2 }}>
        <TabPanel value={tab} index={0}>
          <SummaryDashboard />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <ReceivablesInvoices />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Receipts />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <CreditRefund />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Taxes />
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <ClosingReports />
        </TabPanel>
      </Box>
    </Box>
  );
}
