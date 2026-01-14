import RequestQuoteIcon from '@mui/icons-material/RequestQuote';

export const PAYROLL_NAV = {
  segment: 'payroll',
  title: 'เงินเดือน',
  icon: <RequestQuoteIcon />,
  children: [
    { segment: 'earn-deducts', title: 'กำหนดรายได้-รายหัก' },
  ],
};
