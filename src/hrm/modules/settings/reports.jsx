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
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
import { supabase } from '@/lib/supabaseClient';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import '@/fonts/THSarabunNew-normal';
import '@/fonts/THSarabunNew-bold';
import '@/fonts/THSarabunNew-italic';
import '@/fonts/THSarabunNew-bolditalic';
import { DemoProvider } from '@toolpad/core/internal';

// A simplified copy of the company Reports page used for Settings->รายงาน
const reports = [
    'รายงานข้อมูลกลุ่มผู้ใช้',
    'รายงานข้อมูลกลุ่มพนักงาน',
    'รายงานข้อมูลระดับพนักงาน',
    'รายงานข้อมูลรายได้ - รายหัก',
    'รายงานรายละเอียดรูปแบบงวดการจ่าย',
    'รายงานข้อมูลประเภทการลา',
    'รายงานข้อมูลสรุปแบบเครื่องลงเวลา',
    'รายงานกำหนดรูปแบบประมวลผลจากระบบเวลาเข้าสู่ระบบเงินเดือน',
    'รายงานวันหยุดประจำปี',
    // 'รายงานข้อมูลบุคคลทั่วไป',
    'รายงานสรุปจำนวนวันทำงานของพนักงานตามปฏิทิน',
];

export default function SettingsReports() {
    const [open, setOpen] = React.useState(false);
    const [pdfUrl, setPdfUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    // filter dialog state
    const [filterOpen, setFilterOpen] = React.useState(false);
    // keep both id and display name for selectors (some reports show name only)
    const [filterValues, setFilterValues] = React.useState({ startGroupId: '', startGroupName: '', endGroupId: '', endGroupName: '', dayType: '' });
    const [pendingAction, setPendingAction] = React.useState(null); // 'preview' | 'download'
    const [pendingReportKey, setPendingReportKey] = React.useState(null);
    // selector dialog for picking group ids
    const [selectorOpen, setSelectorOpen] = React.useState(false);
    const [selectorTarget, setSelectorTarget] = React.useState(null); // 'start'|'end'
    const [groupOptions, setGroupOptions] = React.useState([]);
    const [groupLoading, setGroupLoading] = React.useState(false);
    const [groupSearch, setGroupSearch] = React.useState('');

    // fetch groups for selector (optionally filter by search)
    const fetchGroups = React.useCallback(async (search = '') => {
        setGroupLoading(true);
        try {
            const s = search && search.trim();
            // If the pending report is employee groups, query employee_group table and normalize fields
                    if (pendingReportKey === employeeGroupsReport.title) {
                let query = supabase.from('employee_group').select('emp_group_id, emp_group_name_th').order('emp_group_id', { ascending: true });
                if (s) query = query.or(`emp_group_id.ilike.%${s}%,emp_group_name_th.ilike.%${s}%`);
                const { data, error } = await query;
                if (error) throw error;
                // normalize to same shape used by selector (group_id, group_name_th)
                setGroupOptions((data || []).map((d) => ({ group_id: d.emp_group_id, group_name_th: d.emp_group_name_th })));
                return;
            }

                    if (pendingReportKey === employeeLevelsReport.title) {
                        let query = supabase.from('employee_level').select('level_id, level_name_th').order('level_id', { ascending: true });
                        if (s) query = query.or(`level_id.ilike.%${s}%,level_name_th.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.level_id, group_name_th: d.level_name_th })));
                        return;
                    }

                    if (pendingReportKey === leaveTypesReport.title) {
                        let query = supabase.from('leave_type').select('leave_id, leave_name_th').order('leave_id', { ascending: true });
                        if (s) query = query.or(`leave_id.ilike.%${s}%,leave_name_th.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.leave_id, group_name_th: d.leave_name_th })));
                        return;
                    }

                    if (pendingReportKey === timeDeviceFormatsReport.title) {
                        let query = supabase.from('time_device_format').select('device_format_id, device_format_code').order('device_format_id', { ascending: true });
                        if (s) query = query.or(`device_format_id.ilike.%${s}%,device_format_code.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.device_format_id, group_name_th: d.device_format_code })));
                        return;
                    }

                    if (pendingReportKey === payrollProcessingPatternsReport.title || pendingReportKey === payrollProcessingPatternsDetailReport.title) {
                        let query = supabase.from('payroll_processing_patterns').select('code, name').order('code', { ascending: true });
                        if (s) query = query.or(`code.ilike.%${s}%,name.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.code, group_name_th: d.name })));
                        return;
                    }

                    if (pendingReportKey === paymentSchedulesReport.title) {
                        let query = supabase.from('payroll_payment_schedule_templates').select('id, name').order('name', { ascending: true });
                        if (s) query = query.or(`id.ilike.%${s}%,name.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.id, group_name_th: d.name })));
                        return;
                    }

                    if (pendingReportKey === earnDeductsReport.title) {
                        let query = supabase.from('payroll_earn_deduct').select('code, name_th').order('code', { ascending: true });
                        if (s) query = query.or(`code.ilike.%${s}%,name_th.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.code, group_name_th: d.name_th })));
                        return;
                    }

                    if (pendingReportKey === annualHolidaysReport.title || pendingReportKey === workingDaysSummaryReport.title) {
                        // company_calendars as selector for calendars
                        let query = supabase.from('company_calendars').select('code, name').order('code', { ascending: true });
                        if (s) query = query.or(`code.ilike.%${s}%,name.ilike.%${s}%`);
                        const { data, error } = await query;
                        if (error) throw error;
                        setGroupOptions((data || []).map((d) => ({ group_id: d.code, group_name_th: d.name })));
                        return;
                    }

            // default: user_group
            let query = supabase.from('user_group').select('group_id, group_name_th').order('group_id', { ascending: true });
            if (s) query = query.or(`group_id.ilike.%${s}%,group_name_th.ilike.%${s}%`);
            const { data, error } = await query;
            if (error) throw error;
            setGroupOptions(data || []);
        } catch (err) {
            console.error('Failed to load groups', err);
            setGroupOptions([]);
        } finally {
            setGroupLoading(false);
        }
    }, [pendingReportKey]);

    const openSelector = (target) => {
        setSelectorTarget(target);
        setSelectorOpen(true);
        // load options
        fetchGroups(groupSearch);
    };

    // Dynamic label base for the group/code fields depending on which report is selected
    const getLabelBase = () => {
        if (pendingReportKey === timeDeviceFormatsReport.title) return 'รหัสรูปแบบเครื่องลงเวลา';
        if (pendingReportKey === leaveTypesReport.title) return 'รหัสประเภทการลา';
        if (pendingReportKey === employeeLevelsReport.title) return 'รหัสระดับพนักงาน';
        if (pendingReportKey === employeeGroupsReport.title) return 'รหัสกลุ่มพนักงาน';
    if (pendingReportKey === payrollProcessingPatternsReport.title || pendingReportKey === payrollProcessingPatternsDetailReport.title) return 'รหัสรูปแบบประมวลผล';
    if (pendingReportKey === paymentSchedulesReport.title) return 'รหัสเทมเพลต';
        if (pendingReportKey === earnDeductsReport.title) return 'รหัสรายได้-รายหัก';
        if (pendingReportKey === annualHolidaysReport.title) return 'รหัสปฏิทิน';
        if (pendingReportKey === workingDaysSummaryReport.title) return 'รหัสปฏิทิน';
        // default
        return 'รหัสกลุ่มผู้ใช้';
    };

    const startLabel = `${getLabelBase()} (เริ่มต้น)`;
    const endLabel = `${getLabelBase()} (สิ้นสุด)`;

    const reportModules = {
        [userGroupsReport.title]: userGroupsReport,
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
    };

    const generateReport = async (reportKey, mode = 'preview', filters = {}) => {
        setLoading(true);
        try {
            let rows = [];
            let columns = [];

            if (reportModules[reportKey]) {
                const mod = reportModules[reportKey];
                // pass filters to fetchRows where supported
                rows = await mod.fetchRows(filters);
                columns = mod.columns;
            }

            const pdfOptions = (reportModules[reportKey] && reportModules[reportKey].pdfProps) || { orientation: 'p', unit: 'mm', format: 'a4' };
            const doc = new jsPDF(pdfOptions);
            doc.setFont('THSarabunNew', 'bold');
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(reportKey, pageWidth / 2, 10, { align: 'center' });

            // center-align numeric "*_days" columns (work_days, holiday_days, annual_days) in the PDF table
            const columnStyles = {};
            if (columns && columns.length) {
                columns.forEach((c, idx) => {
                    // center-align numeric "*_days" columns (existing rule)
                    if (typeof c.dataKey === 'string' && /(__days$|days$)/.test(c.dataKey)) {
                        columnStyles[idx] = { halign: 'center' };
                        return;
                    }
                    // right-align amount column
                    if (c.dataKey === 'amount' || c.dataKey === 'amount_value') {
                        columnStyles[idx] = { halign: 'right' };
                        return;
                    }
                    // center-align single-character/flag columns like taxable, sso, provident
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
                // ensure header and body cells for numeric day columns are centered
                didParseCell: function (data) {
                    try {
                        const col = data.column && data.column.index;
                        if (typeof col !== 'number' || !columns || !columns[col]) return;
                        const key = columns[col].dataKey;
                        // center-align *_days and flag columns
                        if (/(_days$|days$)/.test(key) || ['taxable', 'unit', 'sso', 'provident', 'has_tax', 'has_sso', 'has_provident'].includes(key)) {
                            data.cell.styles.halign = 'center';
                            return;
                        }
                        // right-align amount columns
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
                // Try to open PDF in a new browser tab. If blocked by popup blocker, fall back to in-app viewer.
                try {
                    const newWin = window.open(url, '_blank');
                    if (!newWin) {
                        // popup blocked - show in-app viewer
                        setPdfUrl(url);
                        setOpen(true);
                    }
                } catch {
                    // In case window.open throws for some reason, fallback to in-app viewer
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
                                                // open filter dialog for user-groups or employee-groups report
                                                if (r === userGroupsReport.title || r === employeeGroupsReport.title || r === employeeLevelsReport.title || r === leaveTypesReport.title || r === timeDeviceFormatsReport.title || r === payrollProcessingPatternsReport.title || r === payrollProcessingPatternsDetailReport.title || r === paymentSchedulesReport.title || r === earnDeductsReport.title || r === annualHolidaysReport.title || r === workingDaysSummaryReport.title) {
                                                    setPendingAction('preview');
                                                    setPendingReportKey(r);
                                                    setFilterOpen(true);
                                                    return;
                                                }
                                                generateReport(r, 'preview');
                                            }}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            aria-label="download"
                                            onClick={() => {
                                                if (r === userGroupsReport.title || r === employeeGroupsReport.title || r === employeeLevelsReport.title || r === leaveTypesReport.title || r === timeDeviceFormatsReport.title || r === payrollProcessingPatternsReport.title || r === payrollProcessingPatternsDetailReport.title || r === paymentSchedulesReport.title || r === earnDeductsReport.title || r === annualHolidaysReport.title || r === workingDaysSummaryReport.title) {
                                                    setPendingAction('download');
                                                    setPendingReportKey(r);
                                                    setFilterOpen(true);
                                                    return;
                                                }
                                                generateReport(r, 'download');
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

            {/* Filter dialog for reports that support filters (user groups) */}
            <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>
                    {pendingReportKey === timeDeviceFormatsReport.title
                        ? 'ตัวกรอง: รายงานข้อมูลสรุปแบบเครื่องลงเวลา'
                        : pendingReportKey === leaveTypesReport.title
                        ? 'ตัวกรอง: รายงานข้อมูลประเภทการลา'
                        : pendingReportKey === employeeLevelsReport.title
                        ? 'ตัวกรอง: รายงานข้อมูลระดับพนักงาน'
                        : pendingReportKey === employeeGroupsReport.title
                        ? 'ตัวกรอง: รายงานข้อมูลกลุ่มพนักงาน'
                        : pendingReportKey === paymentSchedulesReport.title
                        ? 'ตัวกรอง: รายงานรายละเอียดรูปแบบงวดการจ่าย'
                        : pendingReportKey === annualHolidaysReport.title
                        ? 'ตัวกรอง: รายงานวันหยุดประจำปี'
                        : pendingReportKey === workingDaysSummaryReport.title
                        ? 'ตัวกรอง: รายงานสรุปจำนวนวันทำงานของพนักงานตามปฏิทิน'
                        : 'ตัวกรอง: รายงานข้อมูลกลุ่มผู้ใช้'}
                </DialogTitle>
                <Divider />
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

                        {pendingReportKey === annualHolidaysReport.title && (
                            <FormControl fullWidth size="small">
                                <InputLabel id="annual-daytype-label">ประเภทวัน</InputLabel>
                                <Select
                                    labelId="annual-daytype-label"
                                    label="ประเภทวัน"
                                    value={filterValues.dayType}
                                    onChange={(e) => setFilterValues((s) => ({ ...s, dayType: e.target.value }))}
                                >
                                    <MenuItem value="holiday">วันหยุด</MenuItem>
                                    <MenuItem value="annual">วันหยุดประจำปี</MenuItem>
                                    <MenuItem value="both">วันหยุดและวันหยุดประจำปี</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        <TextField
                            label={startLabel}
                            value={pendingReportKey === paymentSchedulesReport.title ? filterValues.startGroupName : filterValues.startGroupId}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (pendingReportKey === paymentSchedulesReport.title) {
                                    setFilterValues((s) => ({ ...s, startGroupName: v, startGroupId: '' }));
                                } else {
                                    setFilterValues((s) => ({ ...s, startGroupId: v }));
                                }
                            }}
                            size="small"
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => { setSelectorTarget('start'); openSelector('start'); }} aria-label="ค้นหารหัสเริ่มต้น" sx={{ bgcolor: 'grey.100', color: 'text.primary', '&:hover': { bgcolor: 'grey.200' } }}>
                                            <SearchIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            label={endLabel}
                            value={pendingReportKey === paymentSchedulesReport.title ? filterValues.endGroupName : filterValues.endGroupId}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (pendingReportKey === paymentSchedulesReport.title) {
                                    setFilterValues((s) => ({ ...s, endGroupName: v, endGroupId: '' }));
                                } else {
                                    setFilterValues((s) => ({ ...s, endGroupId: v }));
                                }
                            }}
                            size="small"
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => { setSelectorTarget('end'); openSelector('end'); }} aria-label="ค้นหารหัสสิ้นสุด" sx={{ bgcolor: 'grey.100', color: 'text.primary', '&:hover': { bgcolor: 'grey.200' } }}>
                                            <SearchIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                    </Box>
                </DialogContent>
                <Divider></Divider>
                <DialogActions>
                    <Button onClick={() => setFilterOpen(false)} color="inherit">ยกเลิก</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            // trigger generation with filters
                            const filters = {
                                startGroupId: filterValues.startGroupId?.trim() || undefined,
                                endGroupId: filterValues.endGroupId?.trim() || undefined,
                                dayType: filterValues.dayType || undefined,
                            };
                            setFilterOpen(false);
                            // pass filters to generateReport
                            generateReport(pendingReportKey, pendingAction || 'preview', filters);
                            // reset pending state
                            setPendingAction(null);
                            setPendingReportKey(null);
                        }}
                    >
                        ตกลง
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Group selector dialog */}
            <Dialog open={selectorOpen} onClose={() => setSelectorOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    {pendingReportKey === timeDeviceFormatsReport.title
                        ? 'รหัสรูปแบบเครื่องลงเวลา'
                        : pendingReportKey === leaveTypesReport.title
                        ? 'รหัสประเภทการลา'
                        : pendingReportKey === employeeLevelsReport.title
                        ? 'รหัสระดับพนักงาน'
                        : pendingReportKey === employeeGroupsReport.title
                        ? 'รหัสกลุ่มพนักงาน'
                        : pendingReportKey === paymentSchedulesReport.title
                        ? 'รหัสเทมเพลต'
                        : pendingReportKey === annualHolidaysReport.title
                        ? 'รหัสปฏิทิน'
                        : 'รหัสกลุ่มผู้ใช้'}
                </DialogTitle>
                <Divider></Divider>
                <DialogContent>
                    <Box sx={{ mb: 1 }}>
                        <TextField size="small" fullWidth placeholder="ค้นหารหัสหรือชื่อ" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchGroups(groupSearch); }} />
                    </Box>
                    <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                        {groupLoading ? (
                            <ListItem><ListItemText primary="กำลังโหลด..." /></ListItem>
                        ) : groupOptions.length === 0 ? (
                            <ListItem><ListItemText primary="ไม่พบรายการ" /></ListItem>
                        ) : (
                            groupOptions.map((g) => (
                                <ListItemButton key={g.group_id} onClick={() => {
                                        if (selectorTarget === 'start') setFilterValues((s) => ({ ...s, startGroupId: g.group_id, startGroupName: g.group_name_th || g.group_id }));
                                        if (selectorTarget === 'end') setFilterValues((s) => ({ ...s, endGroupId: g.group_id, endGroupName: g.group_name_th || g.group_id }));
                                        setSelectorOpen(false);
                                    }}>
                                    <ListItemText
                                        primary={(
                                            pendingReportKey === paymentSchedulesReport.title ? (
                                                // For payment schedules, show only the template name (hide id)
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{g.group_name_th || g.group_id}</Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{g.group_id}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{g.group_name_th || ''}</Typography>
                                                </Box>
                                            )
                                        )}
                                    />
                                </ListItemButton>
                            ))
                        )}
                    </List>
                </DialogContent>
                <Divider></Divider>
                <DialogActions>
                    <Button onClick={() => setSelectorOpen(false)} color="inherit">ปิด</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={open} onClose={() => setOpen(false)} fullScreen PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
                {pdfUrl && (
                    <object data={pdfUrl} type="application/pdf" width="100%" height="100vh" style={{ minHeight: '100vh' }}>
                        <p>
                            ไม่สามารถแสดง PDF ได้ <a href={pdfUrl}>ดาวน์โหลดแทน</a>
                        </p>
                    </object>
                )}
            </Dialog>

            <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: '#fff' }}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
}
