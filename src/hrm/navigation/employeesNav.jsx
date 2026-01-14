import PeopleIcon from '@mui/icons-material/People';

export const EMPLOYEES_NAV = {
  segment: 'employees',
  title: 'พนักงาน',
  icon: <PeopleIcon />,
  children: [
    { kind: 'header', title: 'ทั่วไป' },
    { segment: 'employee', title: 'ข้อมูลพนักงาน' },
    { segment: 'termination', title: 'บันทึกพ้นสภาพความเป็นพนักงาน' },
    { segment: 'position-salary-adjustment', title: 'บันทึกปรับตำแหน่งและเงินเดือน' },
    { kind: 'divider' },
    { kind: 'header', title: 'อื่นๆ' },
    { segment: 'reports', title: 'รายงาน' },
  ],
};
