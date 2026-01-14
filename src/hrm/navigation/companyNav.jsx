import CorporateFareIcon from '@mui/icons-material/CorporateFare';

export const COMPANY_NAV = {
  segment: 'company',
  title: 'บริษัท',
  icon: <CorporateFareIcon />,
  children: [
    { kind: 'header', title: 'ทั่วไป' },
    { segment: 'info', title: 'ข้อมูลบริษัท' },
    { segment: 'departments', title: 'ข้อมูลหน่วยงาน' },
    { segment: 'positions', title: 'ข้อมูลตำแหน่ง' },
    { segment: 'policies', title: 'ข้อกำหนดบริษัท' },
    { segment: 'department-types', title: 'ประเภทหน่วยงาน' },
    { kind: 'divider' },
    { kind: 'header', title: 'อื่นๆ' },
    { segment: 'reports', title: 'รายงาน' },
  ],
};
