import SettingsIcon from '@mui/icons-material/Settings';

export const SETTINGS_NAV = {
	segment: 'settings',
	title: 'ตั้งค่า',
	icon: <SettingsIcon />,
	children: [
		{ kind: 'header', title: 'ทั่วไป' },
		{ segment: 'unit-codes', title: 'กำหนดรหัสหน่วยนับ' },
		{ segment: 'email-templates', title: 'กำหนดรูปแบบอีเมล' },
		{ segment: 'bank-codes', title: 'กำหนดรหัสธนาคาร' },
		{ segment: 'rounding-formats', title: 'กำหนดรูปแบบการปัดเศษ' },
		{ kind: 'divider' },
		{ kind: 'header', title: 'บุคลากร' },
		{ segment: 'user-groups', title: 'กำหนดกลุ่มผู้ใช้งาน' },
		{ segment: 'employee-groups', title: 'กำหนดกลุ่มพนักงาน' },
		{ segment: 'employee-levels', title: 'กำหนดระดับพนักงาน' },
		{ kind: 'divider' },
		{ kind: 'header', title: 'การลงเวลา' },
		{ segment: 'time-device-formats', title: 'กำหนดรูปแบบเครื่องลงเวลา' },
		{ segment: 'shift-schedules', title: 'บันทึกข้อมูลกะงาน' },
		{ segment: 'company-calendar', title: 'กำหนดปฏิทินบริษัท' },
		{ segment: 'payroll-processing-patterns', title: 'กำหนดรูปแบบการประมวลผลเข้าระบบเงินเดือน' },
		{ segment: 'leave-types', title: 'กำหนดประเภทการลา' },
		{ kind: 'divider' },
		{ kind: 'header', title: 'เงินเดือน' },
		{ segment: 'earn-deducts', title: 'กำหนดรายได้-รายหัก' },
		{ segment: 'payment-schedules', title: 'กำหนดรูปแบบงวดการจ่าย' },
		{ kind: 'divider' },
		{ kind: 'header', title: 'อื่นๆ' },
		{ segment: 'reports', title: 'รายงาน' },

	],
};
