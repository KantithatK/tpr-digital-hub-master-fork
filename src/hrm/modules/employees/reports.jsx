import * as React from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Backdrop,
    CircularProgress,
    Dialog,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabaseClient';

// Import report modules from the local employees/reports folder (copied from settings)
import * as userGroupsReport from './reports/userGroupsReport';
import * as employeeGroupsReport from './reports/employeeGroupsReport';
import * as employeeLevelsReport from './reports/employeeLevelsReport';
import * as timeDeviceFormatsReport from './reports/timeDeviceFormatsReport';
import * as leaveTypesReport from './reports/leaveTypesReport';
import * as payrollProcessingPatternsReport from './reports/payrollProcessingPatternsReport';
import * as payrollProcessingPatternsDetailReport from './reports/payrollProcessingPatternsDetailReport';
import * as paymentSchedulesReport from './reports/paymentSchedulesReport';
import * as annualHolidaysReport from './reports/annualHolidaysReport';
import * as workingDaysSummaryReport from './reports/workingDaysSummaryReport';
import * as earnDeductsReport from './reports/earnDeductsReport';
import * as birthdayAnniversaryReport from './reports/birthdayAnniversaryReport';
import * as addressReport from './reports/addressReport';
import * as serviceAgeReport from './reports/serviceAgeReport';
import * as employeeListReport from './reports/employeeListReport';
import * as employeeDetailReport from './reports/employeeDetailReport';
import * as idCardExpiryReport from './reports/idCardExpiryReport';
import * as idLicenseExpiryReport from './reports/idLicenseExpiryReport';
import * as positionSalaryAdjustmentsReport from './reports/positionSalaryAdjustmentsReport';
import * as salaryEarningsDeductionsReport from './reports/salaryEarningsDeductionsReport';
import * as terminationReport from './reports/terminationReport';
import * as monthlyComparisonReport from './reports/monthlyComparisonReport';
import * as monthlyDetailReport from './reports/monthlyDetailReport';
import * as employeeEducationReport from './reports/employeeEducationReport';
import * as employeeWorkExperienceReport from './reports/employeeWorkExperienceReport';
import * as branchTransfersReport from './reports/branchTransfersReport';
import * as payrollAdjustmentTypesReport from './reports/payrollAdjustmentTypesReport';
import * as employeeSalaryAdjustmentHistoryReport from './reports/employeeSalaryAdjustmentHistoryReport';
import * as employeeHistoryReport from './reports/employeeHistoryReport';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// set Dayjs locale to Thai for proper localized display
dayjs.locale('th');

import '@/fonts/THSarabunNew-normal';
import '@/fonts/THSarabunNew-bold';
import '@/fonts/THSarabunNew-italic';
import '@/fonts/THSarabunNew-bolditalic';

// Employee-specific reports list (as requested)
const reports = [
    'รายงานรายชื่อพนักงาน',
    'รายงานรายละเอียดทั่วไปของพนักงาน',
    'รายงานประวัติพนักงาน',
    'รายงานวันครบรอบวันเกิดของพนักงาน',
    'รายงานข้อมูลที่อยู่ของพนักงาน',
    'รายงานประวัติการศึกษาของพนักงาน',
    'รายงานข้อมูลประสบการณ์การทำงานของพนักงาน',
    'รายงานอายุการทำงานของพนักงาน',
    'รายงานข้อมูลพนักงานสำหรับกลุ่มผู้ใช้',
    'รายงานประวัติการโอนย้ายสาขา',
    'รายงานบัตรประจำตัวประชาชนหมดอายุ',
    'รายงานข้อมูลใบอนุญาตขับขี่หมดอายุ',
    'รายงานการปรับตำแหน่งและเงินเดือน',
    'รายงานการปรับอัตราค่าจ้าง (แยกตามประเภทการปรับ)',
    'รายงานประวัติการปรับอัตราจ้าง',
    'รายงานข้อมูลเงินเดือนและรายได้–รายหักประจำ',
    'รายงานรายชื่อพนักงานพ้นสภาพความเป็นพนักงาน',
    'รายงานเปรียบเทียบจำนวนพนักงานตามเดือน',
];

export default function EmployeesReports() {
    const [open, setOpen] = React.useState(false);
    const [pdfUrl, setPdfUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    // filter dialog state
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [pendingAction, setPendingAction] = React.useState(null); // 'preview' | 'download'
    const [pendingReportKey, setPendingReportKey] = React.useState(null);
    // universal filters state

    const reportModules = {
        // reuse some modules copied from settings where they apply (user/employee groups, levels, earn/deducts, calendars...)
        [userGroupsReport.title]: userGroupsReport,
        [employeeListReport.title]: employeeListReport,
        [employeeDetailReport.title]: employeeDetailReport,
        [employeeHistoryReport.title]: employeeHistoryReport,
        [branchTransfersReport.title]: branchTransfersReport,
        [payrollAdjustmentTypesReport.title]: payrollAdjustmentTypesReport,
        [employeeSalaryAdjustmentHistoryReport.title]: employeeSalaryAdjustmentHistoryReport,
        [employeeEducationReport.title]: employeeEducationReport,
        [employeeWorkExperienceReport.title]: employeeWorkExperienceReport,
        [idCardExpiryReport.title]: idCardExpiryReport,
        [idLicenseExpiryReport.title]: idLicenseExpiryReport,
        [positionSalaryAdjustmentsReport.title]: positionSalaryAdjustmentsReport,
        [salaryEarningsDeductionsReport.title]: salaryEarningsDeductionsReport,
        [terminationReport.title]: terminationReport,
        [monthlyComparisonReport.title]: monthlyComparisonReport,
        [monthlyDetailReport.title]: monthlyDetailReport,
        [employeeGroupsReport.title]: employeeGroupsReport,
        [employeeLevelsReport.title]: employeeLevelsReport,
        [leaveTypesReport.title]: leaveTypesReport,
        [timeDeviceFormatsReport.title]: timeDeviceFormatsReport,
        [payrollProcessingPatternsReport.title]: payrollProcessingPatternsReport,
        [payrollProcessingPatternsDetailReport.title]: payrollProcessingPatternsDetailReport,
        [paymentSchedulesReport.title]: paymentSchedulesReport,
        [earnDeductsReport.title]: earnDeductsReport,
        [annualHolidaysReport.title]: annualHolidaysReport,
        [workingDaysSummaryReport.title]: workingDaysSummaryReport,
        [addressReport.title]: addressReport,
        [serviceAgeReport.title]: serviceAgeReport,
        [birthdayAnniversaryReport.title]: birthdayAnniversaryReport,
    };

    // (universal filters only)
    // universal range filters (available for all reports)
    const [groupFrom, setGroupFrom] = React.useState('');
    const [groupTo, setGroupTo] = React.useState('');
    const [positionFrom, setPositionFrom] = React.useState('');
    const [positionTo, setPositionTo] = React.useState('');
    const [employeeFrom, setEmployeeFrom] = React.useState('');
    const [employeeTo, setEmployeeTo] = React.useState('');
    // use Dayjs objects (or null) so DatePicker can show localized Thai dates
    const [expiryFrom, setExpiryFrom] = React.useState(null);
    const [expiryTo, setExpiryTo] = React.useState(null);
    // month/year range for monthly reports
    const [reportYearFrom, setReportYearFrom] = React.useState(dayjs().year());
    const [reportYearTo, setReportYearTo] = React.useState(dayjs().year());

    // payroll adjustment-type selection (used by 'รายงานการปรับอัตราค่าจ้าง (แยกตามประเภทการปรับ)')
    // values: 'employee_type' | 'salary' | 'position' | 'level'
    const [adjustmentTypes, setAdjustmentTypes] = React.useState([]);

    // lookup dialog (opened when user clicks search icon in any filter)
    const [lookupOpen, setLookupOpen] = React.useState(false);
    const [lookupType, setLookupType] = React.useState(''); // 'department' | 'position' | 'employee'
    const [lookupTarget, setLookupTarget] = React.useState(''); // which field to write back
    const [lookupItems, setLookupItems] = React.useState([]);
    const [lookupLoading, setLookupLoading] = React.useState(false);
    const [lookupSearch, setLookupSearch] = React.useState('');

    const loadLookupItems = React.useCallback(async (s = '', type) => {
        try {
            setLookupLoading(true);
            let q;
            // department lookup (replace previous "group" semantics)
            if (type === 'department') {
                // department table fields: dept_id, dept_name, dept_name_eng
                q = supabase.from('department').select('id, dept_id, dept_name, dept_name_eng').order('dept_id', { ascending: true });
                if (s) q = q.or(`dept_id.ilike.%${s}%,dept_name.ilike.%${s}%,dept_name_eng.ilike.%${s}%`);
                const { data, error } = await q.limit(500);
                if (error) throw error;
                setLookupItems((data || []).map((d) => ({ value: d.dept_id || d.id, label: d.dept_name || d.dept_name_eng || d.dept_id })));
                return;
            }

            if (type === 'position') {
                q = supabase.from('positions').select('position_code, position_name').order('position_code', { ascending: true });
                if (s) q = q.or(`position_code.ilike.%${s}%,position_name.ilike.%${s}%`);
                const { data, error } = await q.limit(500);
                if (error) throw error;
                setLookupItems((data || []).map((d) => ({ value: d.position_code, label: d.position_name || d.position_code })));
                return;
            }

            // employee
            q = supabase.from('employees').select('employee_code, first_name_th, last_name_th').order('employee_code', { ascending: true });
            if (s) q = q.or(`employee_code.ilike.%${s}%,first_name_th.ilike.%${s}%,last_name_th.ilike.%${s}%`);
            const { data, error } = await q.limit(1000);
            if (error) throw error;
            setLookupItems((data || []).map((d) => ({ value: d.employee_code, label: `${d.employee_code} - ${d.first_name_th || ''} ${d.last_name_th || ''}`.trim() })));
        } catch (err) {
            console.error('Lookup load failed:', err);
            setLookupItems([]);
        } finally {
            setLookupLoading(false);
        }
    }, []);

    const handleOpenLookup = async (type, target) => {
        setLookupType(type);
        setLookupTarget(target);
        setLookupOpen(true);
        setLookupSearch('');
        await loadLookupItems('', type);
    };

    const handleSelectLookup = (item) => {
        if (!item) return setLookupOpen(false);
        const v = item.value || '';
        switch (lookupTarget) {
            case 'groupFrom': setGroupFrom(v); break;
            case 'groupTo': setGroupTo(v); break;
            case 'positionFrom': setPositionFrom(v); break;
            case 'positionTo': setPositionTo(v); break;
            case 'employeeFrom': setEmployeeFrom(v); break;
            case 'employeeTo': setEmployeeTo(v); break;
            default: break;
        }
        setLookupOpen(false);
    };

    const generateReport = async (reportKey, mode = 'preview', filters = {}) => {
        setLoading(true);
        try {
            let rows = [];
            let columns = [];

            if (reportModules[reportKey]) {
                const mod = reportModules[reportKey];
                rows = await mod.fetchRows(filters);
                const pdfOptions = (mod && mod.pdfProps) || { orientation: 'p', unit: 'mm', format: 'a4' };
                const doc = new jsPDF(pdfOptions);
                // If module provides custom render, delegate to it and skip autoTable
                if (typeof mod.render === 'function') {
                    // support async renderers (they may prefetch images). await in case mod.render returns a Promise
                    await mod.render(doc, rows, filters);
                    // finalize & open/save
                    const blob = doc.output('blob');
                    const url = URL.createObjectURL(blob);
                    if (mode === 'preview') {
                        try {
                            const newWin = window.open(url, '_blank');
                            if (!newWin) {
                                setPdfUrl(url);
                                setOpen(true);
                            }
                        } catch {
                            setPdfUrl(url);
                            setOpen(true);
                        }
                    } else {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${reportKey}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    setLoading(false);
                    return; // stop here; custom renderer handled output
                }

                // else: proceed with generic columns-based rendering below
                if (typeof mod.columns === 'function') {
                    columns = mod.columns(filters) || [];
                } else {
                    columns = mod.columns || [];
                }
            }

            const pdfOptions = (reportModules[reportKey] && reportModules[reportKey].pdfProps) || { orientation: 'p', unit: 'mm', format: 'a4' };
            const doc = new jsPDF(pdfOptions);
            doc.setFont('THSarabunNew', 'bold');
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(reportKey, pageWidth / 2, 10, { align: 'center' });

            const columnStyles = {};
            if (columns && columns.length) {
                columns.forEach((c, idx) => {
                    if (typeof c.dataKey === 'string' && /(__days$|days$)/.test(c.dataKey)) {
                        columnStyles[idx] = { halign: 'center' };
                        return;
                    }
                    if (c.dataKey === 'amount' || c.dataKey === 'amount_value') {
                        columnStyles[idx] = { halign: 'right' };
                        return;
                    }
                    if (['taxable', 'unit', 'sso', 'provident', 'has_tax', 'has_sso', 'has_provident'].includes(c.dataKey)) {
                        columnStyles[idx] = { halign: 'center' };
                        return;
                    }
                });
            }

            autoTable(doc, {
                head: [columns.map((c) => c.header)],
                body: rows.map((r) => columns.map((c) => r[c.dataKey])),
                startY: 15,
                theme: 'plain',
                styles: { font: 'THSarabunNew', fontSize: 12 },
                headStyles: { fillColor: [244, 244, 244], textColor: [0, 0, 0], fontStyle: 'bold' },
                tableWidth: '100%',
                margin: { left: 5, right: 5 },
                columnStyles,
                didParseCell: function (data) {
                    try {
                        const col = data.column && data.column.index;
                        if (typeof col !== 'number' || !columns || !columns[col]) return;
                        const key = columns[col].dataKey;
                        if (/(_days$|days$)/.test(key) || ['taxable', 'unit', 'sso', 'provident', 'has_tax', 'has_sso', 'has_provident'].includes(key)) {
                            data.cell.styles.halign = 'center';
                            return;
                        }
                        if (key === 'amount' || key === 'amount_value') {
                            data.cell.styles.halign = 'right';
                            return;
                        }
                    } catch {
                        // ignore
                    }
                },
                didDrawPage: function (data) {
                    const pageCount = doc.internal.getNumberOfPages();
                    const pageSize = doc.internal.pageSize;
                    doc.setFont('THSarabunNew', 'normal');
                    doc.setFontSize(10);
                    const pageText = `หน้า ${data.pageNumber} / ${pageCount}`;
                    doc.text(pageText, pageSize.width - 5, 10, { align: 'right' });
                },
            });

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);

            if (mode === 'preview') {
                try {
                    const newWin = window.open(url, '_blank');
                    if (!newWin) {
                        setPdfUrl(url);
                        setOpen(true);
                    }
                } catch {
                    setPdfUrl(url);
                    setOpen(true);
                }
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.download = `${reportKey}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('Report error:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    // filter dialog is now universal; no per-report async loading here

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                รายงาน
            </Typography>

            <List>
                {reports.map((r, idx) => {
                    const mod = reportModules[r];
                    const hasActions = !!mod;
                    return (
                        <React.Fragment key={idx}>
                            <ListItem sx={{ '&:hover': { bgcolor: 'grey.100' }, borderRadius: 1 }}>
                                <ListItemIcon>
                                    <DescriptionIcon color="primary" />
                                </ListItemIcon>

                                <ListItemText primary={r} />

                                {hasActions && (
                                    <>
                                        <IconButton
                                            edge="end"
                                            aria-label="preview"
                                            onClick={() => {
                                                setPendingAction('preview');
                                                setPendingReportKey(r);
                                                setFilterOpen(true);
                                            }}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            aria-label="download"
                                            onClick={() => {
                                                setPendingAction('download');
                                                setPendingReportKey(r);
                                                setFilterOpen(true);
                                            }}
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                    </>
                                )}
                            </ListItem>
                            <Divider />
                        </React.Fragment>
                    );
                })}
            </List>

            {/* Simple filter dialog (copied from settings) - kept minimal for now */}
            <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>ตัวกรองรายงาน</DialogTitle>
                <DialogContent>
                    {/* universal range filters shown for all reports */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="หน่วยงาน (เริ่ม)"
                                value={groupFrom}
                                onChange={(e) => setGroupFrom(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('department', 'groupFrom')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="หน่วยงาน (สิ้นสุด)"
                                value={groupTo}
                                onChange={(e) => setGroupTo(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('department', 'groupTo')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                    </Box>

                    {/* (Adjustment-type selector moved to bottom as a dropdown) */}

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="ตำแหน่ง (เริ่ม)"
                                value={positionFrom}
                                onChange={(e) => setPositionFrom(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('position', 'positionFrom')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="ตำแหน่ง (สิ้นสุด)"
                                value={positionTo}
                                onChange={(e) => setPositionTo(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('position', 'positionTo')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="พนักงาน (เริ่ม)"
                                value={employeeFrom}
                                onChange={(e) => setEmployeeFrom(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('employee', 'employeeFrom')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <TextField
                                size="small"
                                label="พนักงาน (สิ้นสุด)"
                                value={employeeTo}
                                onChange={(e) => setEmployeeTo(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => handleOpenLookup('employee', 'employeeTo')}><SearchIcon /></IconButton></InputAdornment> }}
                            />
                        </FormControl>
                    </Box>

                    {(pendingReportKey === idCardExpiryReport.title || pendingReportKey === idLicenseExpiryReport.title) && (
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <FormControl fullWidth size="small">
                                    <DatePicker
                                        label="วันที่บัตรหมดอายุ (เริ่ม)"
                                        value={expiryFrom}
                                        onChange={(newVal) => setExpiryFrom(newVal)}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                            },
                                        }}
                                    />
                                </FormControl>
                                <FormControl fullWidth size="small">
                                    <DatePicker
                                        label="วันที่บัตรหมดอายุ (สิ้นสุด)"
                                        value={expiryTo}
                                        onChange={(newVal) => setExpiryTo(newVal)}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                            },
                                        }}
                                    />
                                </FormControl>
                            </Box>
                        </LocalizationProvider>
                    )}

                    {/* Month/year selector for monthly comparison/detail reports */}
                    {(pendingReportKey === monthlyComparisonReport.title || pendingReportKey === monthlyDetailReport.title) && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <FormControl fullWidth size="small">
                                <TextField
                                    label="ปีเริ่มต้น"
                                    size="small"
                                    type="number"
                                    value={reportYearFrom}
                                    onChange={(e) => setReportYearFrom(Number(e.target.value) || dayjs().year())}
                                />
                            </FormControl>
                            <FormControl fullWidth size="small">
                                <TextField
                                    label="ปีสิ้นสุด"
                                    size="small"
                                    type="number"
                                    value={reportYearTo}
                                    onChange={(e) => setReportYearTo(Number(e.target.value) || dayjs().year())}
                                />
                            </FormControl>
                            {/* month selector removed — reports now use year range only */}
                        </Box>
                    )}

                    {/* No per-report filters: only universal range fields above are used */}

                    {/* Dropdown multi-select for adjustment types (placed at the bottom) */}
                    {pendingReportKey === payrollAdjustmentTypesReport.title && (
                        <Box sx={{ mt: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="adjustment-types-label">ประเภทการปรับ (เลือกได้หลายข้อ)</InputLabel>
                                <Select
                                    labelId="adjustment-types-label"
                                    multiple
                                    value={adjustmentTypes}
                                    onChange={(e) => setAdjustmentTypes(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                    input={<OutlinedInput label="ประเภทการปรับ (เลือกได้หลายข้อ)" />}
                                    renderValue={(selected) => selected
                                        .map((v) => (v === 'employee_type' ? 'ปรับประเภทพนักงาน' : v === 'salary' ? 'ปรับเงินเดือน/อัตราค่าจ้าง' : v === 'position' ? 'ปรับตำแหน่ง/โยกย้ายหน่วยงาน' : v === 'level' ? 'ปรับระดับพนักงาน' : v))
                                        .join(', ')
                                    }
                                >
                                    <MenuItem value="employee_type">ปรับประเภทพนักงาน</MenuItem>
                                    <MenuItem value="salary">ปรับเงินเดือน/อัตราค่าจ้าง</MenuItem>
                                    <MenuItem value="position">ปรับตำแหน่ง/โยกย้ายหน่วยงาน</MenuItem>
                                    <MenuItem value="level">ปรับระดับพนักงาน</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFilterOpen(false)}>ยกเลิก</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilterOpen(false);
                            if (pendingAction && pendingReportKey) {
                                const filters = {
                                    groupFrom: groupFrom || undefined,
                                    groupTo: groupTo || undefined,
                                    positionFrom: positionFrom || undefined,
                                    positionTo: positionTo || undefined,
                                    employeeFrom: employeeFrom || undefined,
                                    employeeTo: employeeTo || undefined,
                                    // if user selected Dayjs values, convert to YYYY-MM-DD string for backend/report modules
                                    expiryFrom: expiryFrom ? expiryFrom.format('YYYY-MM-DD') : undefined,
                                    expiryTo: expiryTo ? expiryTo.format('YYYY-MM-DD') : undefined,
                                };

                                // include month/year (range) when requesting monthly reports
                                if (pendingReportKey === monthlyComparisonReport.title || pendingReportKey === monthlyDetailReport.title) {
                                    filters.yearFrom = reportYearFrom;
                                    filters.yearTo = reportYearTo;
                                }
                                // include adjustment-type flags when using the payroll adjustment types report
                                if (pendingReportKey === payrollAdjustmentTypesReport.title) {
                                    filters.include_employee_type_change = adjustmentTypes.includes('employee_type');
                                    filters.include_salary_change = adjustmentTypes.includes('salary');
                                    filters.include_position_change = adjustmentTypes.includes('position');
                                    filters.include_level_change = adjustmentTypes.includes('level');
                                }
                                generateReport(pendingReportKey, pendingAction, filters);
                            }
                        }}
                    >
                        ตกลง
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Lookup dialog used by the small search buttons in the filters */}
            <Dialog open={lookupOpen} onClose={() => setLookupOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    {lookupType === 'department' ? 'ค้นหาหน่วยงาน' : lookupType === 'position' ? 'ค้นหาตำแหน่ง' : 'ค้นหาพนักงาน'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField size="small" fullWidth placeholder="พิมพ์คำค้น" value={lookupSearch} onChange={(e) => setLookupSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadLookupItems(lookupSearch, lookupType); }} />
                        <Button variant="contained" onClick={() => loadLookupItems(lookupSearch, lookupType)}>ค้นหา</Button>
                    </Box>

                    {lookupLoading ? (
                        <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        <List>
                            {lookupItems && lookupItems.length ? (
                                lookupItems.map((it) => (
                                    <ListItemButton key={it.value} onClick={() => handleSelectLookup(it)}>
                                        <ListItemText primary={it.label} secondary={it.value} />
                                    </ListItemButton>
                                ))
                            ) : (
                                <Typography sx={{ p: 2, color: 'text.secondary' }}>ไม่พบข้อมูล</Typography>
                            )}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLookupOpen(false)}>ปิด</Button>
                </DialogActions>
            </Dialog>

            <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <CircularProgress color="inherit" />
            </Backdrop>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xl">
                <DialogContent>
                    {pdfUrl ? <iframe title="preview" src={pdfUrl} style={{ width: '100%', height: '80vh', border: 0 }} /> : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>ปิด</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
