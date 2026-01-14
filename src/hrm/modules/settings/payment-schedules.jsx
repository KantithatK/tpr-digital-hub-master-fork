import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'dayjs/locale/th';

// MUI
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TablePagination from '@mui/material/TablePagination';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CircularProgress from '@mui/material/CircularProgress';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';


const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const initialRow = (monthIndex) => ({
    month_index: monthIndex,
    month_name: THAI_MONTHS[monthIndex - 1],
    // วันที่จ่าย
    payment_date: '',
    // 1. วันที่เริ่มต้น-สิ้นสุดงวด
    period_start: '', period_end: '',
    // 2. วันที่เริ่มต้น-สิ้นสุดคิดรายได้กะงาน
    work_start: '', work_end: '',
    // 3. วันที่เริ่มต้น-สิ้นสุดคิด OT
    ot_start: '', ot_end: '',
    // 4. วันที่เริ่มต้น-สิ้นสุดสวัสดิการ
    welfare_start: '', welfare_end: '',
    // 5. วันที่เริ่มต้น-สิ้นสุดคิดขาด
    absent_start: '', absent_end: '',
    // 6. วันที่เริ่มต้น-สิ้นสุดคิดลา
    leave_start: '', leave_end: '',
    // 7. วันที่เริ่มต้น-สิ้นสุดคิดมาสาย
    late_start: '', late_end: '',
    // 8. วันที่เริ่มต้น-สิ้นสุดคิดวงเวลาผิด
    wrong_start: '', wrong_end: '',
});

const FIELD_LABELS = {
    payment_date: 'วันที่จ่าย',
    period_start: 'วันที่เริ่มต้นงวด', period_end: 'วันที่สิ้นสุดงวด',
    work_start: 'วันที่เริ่มต้นคิดรายได้กะงาน', work_end: 'วันที่สิ้นสุดคิดรายได้กะงาน',
    ot_start: 'วันที่เริ่มต้นคิด OT', ot_end: 'วันที่สิ้นสุดคิด OT',
    welfare_start: 'วันที่เริ่มต้นสวัสดิการ', welfare_end: 'วันที่สิ้นสุดสวัสดิการ',
    absent_start: 'วันที่เริ่มต้นคิดขาด', absent_end: 'วันที่สิ้นสุดคิดขาด',
    leave_start: 'วันที่เริ่มต้นคิดลา', leave_end: 'วันที่สิ้นสุดคิดลา',
    late_start: 'วันที่เริ่มต้นคิดมาสาย', late_end: 'วันที่สิ้นสุดคิดมาสาย',
    wrong_start: 'วันที่เริ่มต้นคิดวงเวลาผิด', wrong_end: 'วันที่สิ้นสุดคิดวงเวลาผิด',
};

// (Removed month min/max restriction for payment_date — allow any date selection)

// normalize various date inputs to YYYY-MM-DD (ISO) used by <input type="date">
const normalizeToIsoDate = (val) => {
    if (!val && val !== 0) return '';
    // already ISO-like YYYY-MM-DD
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // handle common MM/DD/YYYY (browser placeholder) -> convert to YYYY-MM-DD
    if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const [m, d, y] = val.split('/').map((s) => s.padStart(2, '0'));
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // try Date parsing then format
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    return '';
};

function THDateField({ value, onChange, error, helperText }) {
    return (
        <DatePicker
            format="DD/MM/YYYY"                // 👈 บังคับรูปแบบ dd/MM/yyyy
            value={value ? dayjs(value) : null}
            onChange={(v) => onChange(v ? v.format('YYYY-MM-DD') : '')} // เก็บเป็น YYYY-MM-DD
            slotProps={{
                textField: {
                    size: 'small',
                    error,
                    helperText,
                    sx: { width: 170 },
                },
            }}
        />
    );
}


export default function PaymentSchedulesPage() {
    const [rows, setRows] = React.useState(() => Array.from({ length: 12 }, (_, i) => initialRow(i + 1)));
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogRows, setDialogRows] = React.useState(() => Array.from({ length: 12 }, (_, i) => initialRow(i + 1)));
    const [editMode, setEditMode] = React.useState(false);
    const [templates, setTemplates] = React.useState([]);
    const [selectedTemplate, setSelectedTemplate] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [searchField, setSearchField] = React.useState('name');
    const [searchInput, setSearchInput] = React.useState('');
    const [appliedSearch, setAppliedSearch] = React.useState({ field: 'name', text: '' });
    const [openDelete, setOpenDelete] = React.useState(false);
    const [targetTemplate, setTargetTemplate] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
    const [templateName, setTemplateName] = React.useState('');
    const [templateDesc, setTemplateDesc] = React.useState('');
    const [templateYear, setTemplateYear] = React.useState(new Date().getFullYear());
    // auto-fill dialog state (hidden for now)

    // clear validation when templateYear changes and ensure years are respected
    React.useEffect(() => {
        setErrors({});
        setSnackbar((s) => ({ ...s, open: false }));
    }, [templateYear]);

    React.useEffect(() => {
        // load templates list
        let isMounted = true;
        (async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('payroll_payment_schedule_templates').select('*').order('created_at', { ascending: false });
                if (error) {
                    // table might not exist or permission denied; show empty list so UI shows "ไม่พบข้อมูล"
                    if (isMounted) setTemplates([]);
                    return;
                }
                if (!isMounted) return;
                if (!data || data.length === 0) {
                    // no templates found
                    setTemplates([]);
                    setSelectedTemplate(null);
                } else {
                    setTemplates(data);
                    // select first
                    setSelectedTemplate(data[0]);
                    // load months for first template
                    loadTemplateMonths(data[0]);
                }
            } catch (err) {
                console.warn('Load templates ignored:', err?.message || err);
                if (isMounted) setTemplates([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    const loadTemplateMonths = async (template) => {
        // try to load months for template from `payroll_payment_schedules` using template_id
        if (!template) return;
        try {
            const { data, error } = await supabase.from('payroll_payment_schedules').select('*').eq('template_id', template.id).order('month_index', { ascending: true });
            if (error || !data || data.length === 0) {
                // fallback: initialize empty months
                setRows(Array.from({ length: 12 }, (_, i) => initialRow(i + 1)));
                return;
            }
            // normalize any date-like fields from DB into YYYY-MM-DD for the date inputs
            const dateKeys = [
                'payment_date',
                'period_start', 'period_end',
                'work_start', 'work_end',
                'ot_start', 'ot_end',
                'welfare_start', 'welfare_end',
                'absent_start', 'absent_end',
                'leave_start', 'leave_end',
                'late_start', 'late_end',
                'wrong_start', 'wrong_end',
            ];
            const mapped = Array.from({ length: 12 }, (_, i) => {
                const found = data.find((d) => Number(d.month_index) === i + 1) || {};
                const base = { ...initialRow(i + 1), ...found };
                // ensure dates are ISO YYYY-MM-DD strings
                for (const k of dateKeys) {
                    if (base[k]) base[k] = normalizeToIsoDate(base[k]);
                    else base[k] = '';
                }
                return base;
            });
            setRows(mapped);
        } catch (err) {
            console.warn('Load months failed:', err?.message || err);
            setRows(Array.from({ length: 12 }, (_, i) => initialRow(i + 1)));
        }
    };

    const handleApplySearch = () => {
        setAppliedSearch({ field: searchField, text: searchInput });
        setPage(0);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setAppliedSearch({ field: 'name', text: '' });
        setPage(0);
    };

    const handleSelectTemplate = (tpl) => {
        setSelectedTemplate(tpl);
        loadTemplateMonths(tpl);
    };

    // filtered templates according to applied search (used in rendering and pagination)
    const filteredTemplates = (templates || []).filter((t) => {
        const q = appliedSearch.text?.trim();
        if (!q) return true;
        const f = appliedSearch.field || 'name';
        return String(t[f] || '').toLowerCase().includes(q.toLowerCase());
    });

    const handleAskDelete = (tpl) => { setTargetTemplate(tpl); setOpenDelete(true); };
    const handleCloseDelete = () => { setTargetTemplate(null); setOpenDelete(false); };
    const handleConfirmDelete = async () => {
        if (!targetTemplate) return; setLoading(true);
        try {
            // attempt to delete template and its months
            await supabase.from('payroll_payment_schedules').delete().eq('template_id', targetTemplate.id);
            await supabase.from('payroll_payment_schedule_templates').delete().eq('id', targetTemplate.id);
            setTemplates((t) => t.filter((x) => x.id !== targetTemplate.id));
            setSnackbar({ open: true, message: 'ลบสำเร็จ', severity: 'success' });
            handleCloseDelete();
        } catch (err) {
            console.error('Delete failed', err);
            setSnackbar({ open: true, message: 'ไม่สามารถลบได้', severity: 'error' });
        } finally { setLoading(false); }
    };

    // main-page preview uses `rows`; edits happen inside dialogRows via setDialogCell

    const setDialogCell = (rowIdx, key, value) => {
        // normalize values for date fields so the native date input displays consistently
        const normalizedValue = (typeof value === 'string' && (key.includes('date') || key.endsWith('_start') || key.endsWith('_end')))
            ? normalizeToIsoDate(value)
            : value;
        setDialogRows((prev) => {
            const next = prev.map((r, idx) => (idx === rowIdx ? { ...r, [key]: normalizedValue } : r));
            return next;
        });
        // clear per-cell error for this field
        setErrors((prev) => {
            const copy = { ...prev };
            const keyName = `${rowIdx}_${key}`;
            if (copy[keyName]) delete copy[keyName];
            return copy;
        });
    };

    const handleOpenAdd = () => {
        setEditMode(false);
        setDialogRows(Array.from({ length: 12 }, (_, i) => initialRow(i + 1)));
        setTemplateName('');
        setTemplateDesc('');
        setTemplateYear(new Date().getFullYear());
        // clear previous validation state and snackbars so Add starts fresh
        setErrors({});
        setSnackbar({ open: false, message: '', severity: 'success' });
        setDialogOpen(true);
    };

    const handleOpenEdit = () => {
        setEditMode(true);
        // open dialog with current `rows` loaded
        setDialogRows(rows.map((r) => ({ ...r })));
        // populate template meta if available
        if (selectedTemplate) {
            setTemplateName(selectedTemplate.name || '');
            setTemplateDesc(selectedTemplate.description || '');
            setTemplateYear(selectedTemplate.year || new Date().getFullYear());
        } else {
            setTemplateName(''); setTemplateDesc(''); setTemplateYear(new Date().getFullYear());
        }
        // clear any existing errors/snackbar from prior edits
        setErrors({});
        setSnackbar({ open: false, message: '', severity: 'success' });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        // clear validation state when dialog closes so Cancel doesn't leave stale errors
        setErrors({});
        setSnackbar((s) => ({ ...s, open: false }));
    };

    // Save given rows (used by dialog Save)
    const saveRows = async (rowsToSave) => {
        setSaving(true);
        try {
            // ensure template exists first (insert or update)
            let tplId = selectedTemplate?.id || null;
            if (editMode && selectedTemplate) {
                // update template metadata
                const { error: errTpl } = await supabase.from('payroll_payment_schedule_templates').update({ name: templateName, description: templateDesc, year: templateYear, updated_at: new Date().toISOString() }).eq('id', selectedTemplate.id);
                if (errTpl) throw errTpl;
                tplId = selectedTemplate.id;
            } else {
                // create new template
                const { data: tplData, error: errInsert } = await supabase.from('payroll_payment_schedule_templates').insert([{ name: templateName, description: templateDesc, year: templateYear, created_at: new Date().toISOString() }]).select();
                if (errInsert) throw errInsert;
                tplId = tplData && tplData[0] ? tplData[0].id : null;
                // add to templates list for UI
                if (tplId) setTemplates((t) => [{ id: tplId, name: templateName, description: templateDesc, year: templateYear, created_at: new Date().toISOString() }, ...t]);
            }

            if (!tplId) throw new Error('Template id not available');

            // prepare months payload with template_id and updated_at
            const now = new Date().toISOString();
            // sanitize date fields: convert empty-string ('') to null so Postgres date columns accept it
            const dateKeys = [
                'payment_date',
                'period_start', 'period_end',
                'work_start', 'work_end',
                'ot_start', 'ot_end',
                'welfare_start', 'welfare_end',
                'absent_start', 'absent_end',
                'leave_start', 'leave_end',
                'late_start', 'late_end',
                'wrong_start', 'wrong_end',
            ];
            const sanitized = rowsToSave.map((r) => {
                const copy = { ...r };
                for (const k of dateKeys) {
                    if (copy[k] === '') copy[k] = null;
                }
                return copy;
            });
            const payload = sanitized.map((r) => ({ ...r, template_id: tplId, month_index: Number(r.month_index), updated_at: now }));
            // upsert months; assume unique constraint on (template_id, month_index)
            const { error } = await supabase.from('payroll_payment_schedules').upsert(payload, { onConflict: ['template_id', 'month_index'] });
            if (error) throw error;
            setSnackbar({ open: true, message: 'บันทึกสำเร็จ', severity: 'success' });
            // persist to main view
            setRows(rowsToSave.map((r) => ({ ...r })));
            // set selected template to the created/updated
            setSelectedTemplate({ id: tplId, name: templateName, description: templateDesc, year: templateYear, created_at: new Date().toISOString() });
            setDialogOpen(false);
        } catch (err) {
            // log full error and show a clearer message to the user
            console.error('Supabase save failed (full error):', err);
            const errMsg = err?.message || err?.error || (typeof err === 'string' ? err : JSON.stringify(err));
            setSnackbar({ open: true, message: `ไม่สามารถบันทึกลงฐานข้อมูลได้: ${errMsg}`, severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDialogSave = async () => {
        // validate before attempting to save
        const ok = validateDialog();
        if (!ok) return;
        await saveRows(dialogRows);
    };

    // validate a single field when user leaves the input (onBlur)
    const validateField = (rowIdx, key) => {
        const r = dialogRows[rowIdx];
        if (!r) return true;
        const newErrors = { ...errors };
        const keyName = `${rowIdx}_${key}`;

        // helper to set snackbar and error
        const setFieldError = (msg) => {
            newErrors[keyName] = msg;
            setErrors(newErrors);
            setSnackbar({ open: true, message: `เดือน ${r.month_name}: ${msg}`, severity: 'error' });
            return false;
        };

        // payment_date: required (no month/year restriction)
        if (key === 'payment_date') {
            if (!r.payment_date) return setFieldError(`${FIELD_LABELS.payment_date} ห้ามเว้นว่าง`);
            // clear existing error
            if (newErrors[keyName]) { delete newErrors[keyName]; setErrors(newErrors); }
            return true;
        }

        // for pair fields, determine companion
        const pairMap = {
            period_start: 'period_end', period_end: 'period_start',
            work_start: 'work_end', work_end: 'work_start',
            ot_start: 'ot_end', ot_end: 'ot_start',
            welfare_start: 'welfare_end', welfare_end: 'welfare_start',
            absent_start: 'absent_end', absent_end: 'absent_start',
            leave_start: 'leave_end', leave_end: 'leave_start',
            late_start: 'late_end', late_end: 'late_start',
            wrong_start: 'wrong_end', wrong_end: 'wrong_start',
        };

        if (pairMap[key]) {
            const otherKey = pairMap[key];
            const val = r[key];
            const otherVal = r[otherKey];
            // require both to be present
            if (!val && !otherVal) {
                // if both empty, set both errors
                newErrors[`${rowIdx}_${key}`] = 'กรุณาระบุวันที่';
                newErrors[`${rowIdx}_${otherKey}`] = 'กรุณาระบุวันที่';
                setErrors(newErrors);
                setSnackbar({ open: true, message: `เดือน ${r.month_name}: กรุณาระบุ ${FIELD_LABELS[key].replace('วันที่เริ่มต้น', '').replace('วันที่สิ้นสุด', '') || FIELD_LABELS[key]}`, severity: 'error' });
                return false;
            }
            if (!val) return setFieldError(`${FIELD_LABELS[key]} ห้ามเว้นว่าง`);
            if (!otherVal) return setFieldError(`${FIELD_LABELS[otherKey]} ห้ามเว้นว่าง`);

            // ensure any entered date uses the selected year
            const checkYear = (d) => {
                if (!d) return true;
                const y = new Date(d).getFullYear();
                return y === Number(templateYear);
            };
            if (!checkYear(val)) return setFieldError(`${FIELD_LABELS[key]} ต้องเป็นปี ${templateYear}`);
            if (!checkYear(otherVal)) return setFieldError(`${FIELD_LABELS[otherKey]} ต้องเป็นปี ${templateYear}`);

            // if both present, ensure start <= end
            let startKey = key, endKey = otherKey;
            // ensure we identify start vs end
            if (key.endsWith('_end')) { startKey = otherKey; endKey = key; }
            const sd = new Date(r[startKey]);
            const ed = new Date(r[endKey]);
            if (!isNaN(sd.getTime()) && !isNaN(ed.getTime()) && sd > ed) {
                newErrors[`${rowIdx}_${startKey}`] = 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด';
                setErrors(newErrors);
                setSnackbar({ open: true, message: `เดือน ${r.month_name}: ${FIELD_LABELS[startKey]} ต้องไม่มากกว่าวันที่สิ้นสุด`, severity: 'error' });
                return false;
            }

            // clear errors for both if any
            if (newErrors[`${rowIdx}_${startKey}`]) delete newErrors[`${rowIdx}_${startKey}`];
            if (newErrors[`${rowIdx}_${endKey}`]) delete newErrors[`${rowIdx}_${endKey}`];
            setErrors(newErrors);
            return true;
        }

        return true;
    };

    const validateDialog = () => {
        const newErrors = {};
        if (!templateName || String(templateName).trim() === '') {
            newErrors.templateName = 'กรุณากรอกชื่อรูปแบบงวดการจ่าย';
        }
        if (!templateYear || Number.isNaN(Number(templateYear))) {
            newErrors.templateYear = 'ระบุปีที่ถูกต้อง';
        }

        // validate date ranges: for each row, require both dates present and ensure start <= end
        const pairs = [
            ['period_start', 'period_end', 'วันที่เริ่มต้น-สิ้นสุดงวด'],
            ['work_start', 'work_end', 'วันที่เริ่มต้น-สิ้นสุดคิดรายได้กะงาน'],
            ['ot_start', 'ot_end', 'วันที่เริ่มต้น-สิ้นสุดคิด OT'],
            ['welfare_start', 'welfare_end', 'วันที่เริ่มต้น-สิ้นสุดสวัสดิการ'],
            ['absent_start', 'absent_end', 'วันที่เริ่มต้น-สิ้นสุดคิดขาด'],
            ['leave_start', 'leave_end', 'วันที่เริ่มต้น-สิ้นสุดคิดลา'],
            ['late_start', 'late_end', 'วันที่เริ่มต้น-สิ้นสุดคิดมาสาย'],
            ['wrong_start', 'wrong_end', 'วันที่เริ่มต้น-สิ้นสุดคิดวงเวลาผิด'],
        ];

        for (let i = 0; i < dialogRows.length; i++) {
            const r = dialogRows[i];
            // payment_date required and must be within selected year/month
            if (!r.payment_date) {
                newErrors[`${i}_payment_date`] = 'กรุณาระบุวันที่จ่าย';
                setSnackbar({ open: true, message: `เดือน ${r.month_name}: กรุณาระบุ วันที่จ่าย`, severity: 'error' });
                setErrors(newErrors);
                return false;
            }
            // no month/year restriction for payment_date; only require presence
            for (const [sKey, eKey, label] of pairs) {
                const s = r[sKey];
                const e = r[eKey];
                if (!s || !e) {
                    // require both
                    if (!s) newErrors[`${i}_${sKey}`] = 'กรุณาระบุวันที่';
                    if (!e) newErrors[`${i}_${eKey}`] = 'กรุณาระบุวันที่';
                    setSnackbar({ open: true, message: `เดือน ${r.month_name}: กรุณาระบุ ${label}`, severity: 'error' });
                    setErrors(newErrors);
                    return false;
                }
                const sd = new Date(s);
                const ed = new Date(e);
                // ensure years match selected year
                if (sd.getFullYear() !== Number(templateYear) || ed.getFullYear() !== Number(templateYear)) {
                    if (sd.getFullYear() !== Number(templateYear)) newErrors[`${i}_${sKey}`] = `ต้องเป็นปี ${templateYear}`;
                    if (ed.getFullYear() !== Number(templateYear)) newErrors[`${i}_${eKey}`] = `ต้องเป็นปี ${templateYear}`;
                    setSnackbar({ open: true, message: `เดือน ${r.month_name}: ${label} ต้องเป็นปี ${templateYear}`, severity: 'error' });
                    setErrors(newErrors);
                    return false;
                }
                if (!isNaN(sd.getTime()) && !isNaN(ed.getTime()) && sd > ed) {
                    newErrors[`${i}_${sKey}`] = 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด';
                    setSnackbar({ open: true, message: `เดือน ${r.month_name}: ${label} วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด`, severity: 'error' });
                    setErrors(newErrors);
                    return false;
                }
            }
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            setSnackbar({ open: true, message: 'กรุณาตรวจสอบข้อมูลก่อนบันทึก', severity: 'error' });
            return false;
        }
        return true;
    };

    // Auto-fill feature temporarily hidden: handlers removed to avoid unused symbols



    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรูปแบบงวดการจ่าย</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="จัดการ" size="small" />
                        <Button startIcon={<AddCircleOutlineIcon />} variant="contained" color="primary" onClick={handleOpenAdd}>เพิ่ม</Button>
                    </Stack>
                </Stack>

                {/* Search / templates list (mimic earn-deducts layout) */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel id="search-field-label">ค้นหาตาม</InputLabel>
                        <Select labelId="search-field-label" label="ค้นหาตาม" value={searchField} onChange={(e) => setSearchField(e.target.value)}>
                            <MenuItem value="name">ชื่อรูปแบบ</MenuItem>
                            <MenuItem value="year">ปีงวดการจ่าย</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField size="small" fullWidth label="คำค้น" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleApplySearch(); }} />
                    <Stack direction="row" spacing={1}>
                        <Button startIcon={<SearchIcon />} variant="outlined" onClick={handleApplySearch}>ค้นหา</Button>
                        <Button startIcon={<ClearIcon />} color="inherit" onClick={handleClearSearch}>ล้าง</Button>
                    </Stack>
                </Stack>

                <TableContainer sx={{ borderRadius: 2 }}>
                    <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบงวดการจ่าย</TableCell>
                                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ปีงวดการจ่าย</TableCell>
                                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
                                <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }} align="center">การทำงาน</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                            <CircularProgress size={18} />
                                            <Typography variant="body2">กำลังโหลดข้อมูล...</Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ) : filteredTemplates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell>
                                </TableRow>
                            ) : (
                                filteredTemplates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((tpl) => (
                                    <TableRow key={tpl.id} hover onClick={() => handleSelectTemplate(tpl)}>
                                        <TableCell>{tpl.name || tpl.code || 'ไม่ระบุ'}</TableCell>
                                        <TableCell>{tpl.year || ''}</TableCell>
                                        <TableCell>{tpl.description || ''}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="แก้ไข"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedTemplate(tpl); loadTemplateMonths(tpl); handleOpenEdit(); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                                            <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleAskDelete(tpl); }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={filteredTemplates.length} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="จำนวนแถวต่อหน้า" />

                {/* Editor dialog: full 12-month editable table shown when adding/editing */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xl">
                    <DialogTitle>{editMode ? 'แก้ไขรูปแบบงวดการจ่าย' : 'เพิ่มรูปแบบงวดการจ่าย'}</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
                                <TextField required label="ชื่อรูปแบบงวดการจ่าย" size="small" value={templateName} onChange={(e) => setTemplateName(e.target.value)} fullWidth error={Boolean(errors.templateName)} helperText={errors.templateName || ''} />
                                <TextField
                                    required
                                    label="ปีงวดการจ่าย"
                                    size="small"
                                    type="number"
                                    value={templateYear}
                                    onChange={(e) => {
                                        const current = new Date().getFullYear();
                                        const v = Number(e.target.value) || current;
                                        setTemplateYear(v < current ? current : v);
                                    }}
                                    inputProps={{ min: new Date().getFullYear(), step: 1 }}
                                    sx={{ width: 140 }}
                                    error={Boolean(errors.templateYear)}
                                    helperText={errors.templateYear || ''}
                                />
                            </Stack>
                            <TextField label="รายละเอียด" size="small" multiline minRows={2} value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} fullWidth />
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                                {/* Auto-fill hidden for now */}
                            </Stack>
                        </Stack>
                        <TableContainer sx={{ borderRadius: 1 }}>
                            <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" sx={{ bgcolor: 'grey.100', fontWeight: 'bold', minWidth: 72, width: 72 }}>งวดที่</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>เดือน</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>วันที่จ่าย</TableCell>
                                        {[
                                            'วันที่เริ่มต้น-สิ้นสุดงวด',
                                            'วันที่เริ่มต้น-สิ้นสุดคิดรายได้กะงาน',
                                            'วันที่เริ่มต้น-สิ้นสุดคิด OT',
                                            'วันที่เริ่มต้น-สิ้นสุดสวัสดิการ',
                                            'วันที่เริ่มต้น-สิ้นสุดคิดขาด',
                                            'วันที่เริ่มต้น-สิ้นสุดคิดลา',
                                            'วันที่เริ่มต้น-สิ้นสุดคิดมาสาย',
                                            'วันที่เริ่มต้น-สิ้นสุดคิดวงเวลาผิด',
                                        ].map((label, i) => (
                                            <TableCell key={i} align="center" colSpan={2} sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>{label}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dialogRows.map((r, idx) => (
                                        <TableRow key={r.month_index} hover>
                                            <TableCell align="center" sx={{ minWidth: 72, width: 72 }}>{r.month_index}</TableCell>
                                            <TableCell>{r.month_name}</TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.payment_date || ''}
                                                    onChange={(val) => setDialogCell(idx, 'payment_date', val)}
                                                    onBlur={() => validateField(idx, 'payment_date')}
                                                    // allow any date selection (no min/max)
                                                    error={Boolean(errors[`${idx}_payment_date`])}
                                                    helperText={errors[`${idx}_payment_date`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.period_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'period_start', val)}
                                                    onBlur={() => validateField(idx, 'period_start')}
                                                    error={Boolean(errors[`${idx}_period_start`])}
                                                    helperText={errors[`${idx}_period_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.period_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'period_end', val)}
                                                    onBlur={() => validateField(idx, 'period_end')}
                                                    error={Boolean(errors[`${idx}_period_end`])}
                                                    helperText={errors[`${idx}_period_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.work_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'work_start', val)}
                                                    onBlur={() => validateField(idx, 'work_start')}
                                                    error={Boolean(errors[`${idx}_work_start`])}
                                                    helperText={errors[`${idx}_work_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.work_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'work_end', val)}
                                                    onBlur={() => validateField(idx, 'work_end')}
                                                    error={Boolean(errors[`${idx}_work_end`])}
                                                    helperText={errors[`${idx}_work_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.ot_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'ot_start', val)}
                                                    onBlur={() => validateField(idx, 'ot_start')}
                                                    error={Boolean(errors[`${idx}_ot_start`])}
                                                    helperText={errors[`${idx}_ot_start`] || ''}
                                                    inputProps={{ lang: 'th-TH' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.ot_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'ot_end', val)}
                                                    onBlur={() => validateField(idx, 'ot_end')}
                                                    error={Boolean(errors[`${idx}_ot_end`])}
                                                    helperText={errors[`${idx}_ot_end`] || ''}
                                                    inputProps={{ lang: 'th-TH' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.welfare_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'welfare_start', val)}
                                                    onBlur={() => validateField(idx, 'welfare_start')}
                                                    error={Boolean(errors[`${idx}_welfare_start`])}
                                                    helperText={errors[`${idx}_welfare_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.welfare_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'welfare_end', val)}
                                                    onBlur={() => validateField(idx, 'welfare_end')}
                                                    error={Boolean(errors[`${idx}_welfare_end`])}
                                                    helperText={errors[`${idx}_welfare_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.absent_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'absent_start', val)}
                                                    onBlur={() => validateField(idx, 'absent_start')}
                                                    error={Boolean(errors[`${idx}_absent_start`])}
                                                    helperText={errors[`${idx}_absent_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.absent_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'absent_end', val)}
                                                    onBlur={() => validateField(idx, 'absent_end')}
                                                    error={Boolean(errors[`${idx}_absent_end`])}
                                                    helperText={errors[`${idx}_absent_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.leave_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'leave_start', val)}
                                                    onBlur={() => validateField(idx, 'leave_start')}
                                                    error={Boolean(errors[`${idx}_leave_start`])}
                                                    helperText={errors[`${idx}_leave_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.leave_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'leave_end', val)}
                                                    onBlur={() => validateField(idx, 'leave_end')}
                                                    error={Boolean(errors[`${idx}_leave_end`])}
                                                    helperText={errors[`${idx}_leave_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.late_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'late_start', val)}
                                                    onBlur={() => validateField(idx, 'late_start')}
                                                    error={Boolean(errors[`${idx}_late_start`])}
                                                    helperText={errors[`${idx}_late_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.late_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'late_end', val)}
                                                    onBlur={() => validateField(idx, 'late_end')}
                                                    error={Boolean(errors[`${idx}_late_end`])}
                                                    helperText={errors[`${idx}_late_end`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.wrong_start || ''}
                                                    onChange={(val) => setDialogCell(idx, 'wrong_start', val)}
                                                    onBlur={() => validateField(idx, 'wrong_start')}
                                                    error={Boolean(errors[`${idx}_wrong_start`])}
                                                    helperText={errors[`${idx}_wrong_start`] || ''}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <THDateField
                                                    size="small"
                                                    type="date"
                                                    value={r.wrong_end || ''}
                                                    onChange={(val) => setDialogCell(idx, 'wrong_end', val)}
                                                    onBlur={() => validateField(idx, 'wrong_end')}
                                                    error={Boolean(errors[`${idx}_wrong_end`])}
                                                    helperText={errors[`${idx}_wrong_end`] || ''}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>ยกเลิก</Button>
                        <Button variant="contained" onClick={handleDialogSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
                    </DialogActions>
                </Dialog>

                {/* Auto-fill dialog hidden */}

                {/* Delete confirmation dialog */}
                <Dialog open={openDelete} onClose={() => { if (loading) return; handleCloseDelete(); }} disableEscapeKeyDown={loading} fullWidth maxWidth="xs">
                    <DialogTitle>ยืนยันการลบ</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2">ต้องการลบรูปแบบ "{targetTemplate?.name || ''}" ใช่หรือไม่?</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>การลบจะทำให้ข้อมูลงวดการจ่ายทั้งหมดที่เกี่ยวข้องถูกลบด้วย</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDelete} color="inherit" disabled={loading}>ยกเลิก</Button>
                        <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loading}>
                            {loading ? (<><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />กำลังลบ...</>) : (<><DeleteOutlineIcon sx={{ mr: 1 }} />ลบ</>)}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
}
