import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { supabase } from '@/lib/supabaseClient';

dayjs.locale('th');

// Helper: format month-year label from yyyy-mm
const monthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('th-TH', { month: 'short', year: 'numeric' });
};

export default function BillingSchedule({
    billingCycle, // expected values: 'monthly' | 'periodic' | 'milestone'
    contractValue = 0,
    projectStart = null,
    projectEnd = null,
    creditDays = 0,
    projectId = null,
    onChange,
    onNotify = null,
}) {
    // activePattern: internal control of which pattern is currently shown.
    // Initialize from prop but allow detection from DB for existing projects.
    const [activePattern, setActivePattern] = React.useState(billingCycle || 'monthly');
    const [billingDay, setBillingDay] = React.useState('eom'); // '1','15','30','eom'
    const [startMonth, setStartMonth] = React.useState(projectStart ? dayjs(projectStart) : null);
    const [endMonth, setEndMonth] = React.useState(projectEnd ? dayjs(projectEnd) : null);
    // Always auto-calculate equal-split monthly amounts
    const [generated, setGenerated] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [hasLoadedFromDb, setHasLoadedFromDb] = React.useState(false); // monthly or periodic loaded flag
    // periodic (รายเฟส) manual periods
    const [periodicItems, setPeriodicItems] = React.useState([]); // periodic schedule items
    const [hasLoadedPeriodic, setHasLoadedPeriodic] = React.useState(false);
    // milestone (phase) structure items: { name, percent, amount, expected_billing_date }
    const [phaseItems, setPhaseItems] = React.useState([]); // each item will have stable id to prevent focus loss
    const [hasLoadedMilestone, setHasLoadedMilestone] = React.useState(false);
    const lastFocusedPhaseRef = React.useRef({ id: null, field: null });
    // one-off single billing state
    const [oneOffItem, setOneOffItem] = React.useState({ billing_date: null, description: '', amount: 0 });
    const [hasLoadedOneOff, setHasLoadedOneOff] = React.useState(false);

    // responsive hooks (placed early to avoid conditional hook warnings)
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));

    React.useEffect(() => {
        if (projectStart && !startMonth) setStartMonth(dayjs(projectStart));
        if (projectEnd && !endMonth) setEndMonth(dayjs(projectEnd));
    }, [projectStart, projectEnd, startMonth, endMonth]);

    // keep activePattern in sync if parent changes prop
    React.useEffect(() => {
        setActivePattern(billingCycle || 'monthly');
    }, [billingCycle]);

    // If project already has saved periods, detect the stored billing_pattern and show it
    React.useEffect(() => {
        let mounted = true;
        const detectPattern = async () => {
            if (!projectId) return;
            try {
                const { data, error } = await supabase
                    .from('tpr_project_billing_periods')
                    .select('billing_pattern')
                    .eq('project_id', projectId)
                    .limit(1);
                if (error) throw error;
                if (!mounted) return;
                if (data && data.length > 0) {
                    const pat = data[0].billing_pattern;
                    if (pat) setActivePattern(pat);
                }
            } catch (err) {
                // debug logging removed
            }
        };
        detectPattern();
        return () => { mounted = false; };
    }, [projectId]);

    // build month list between startMonth and endMonth inclusive
    const buildMonths = (start, end) => {
        if (!start || !end) return [];
        let s = dayjs(start).startOf('month');
        let e = dayjs(end).startOf('month');
        if (!s.isValid() || !e.isValid()) return [];
        const months = [];
        let cur = s;
        while (cur.isBefore(e) || cur.isSame(e, 'month')) {
            months.push(cur.format('YYYY-MM'));
            cur = cur.add(1, 'month');
        }
        return months;
    };

    const generateEqual = React.useCallback(() => {
        const months = buildMonths(startMonth, endMonth);
        if (months.length === 0) return [];
        const total = Number(contractValue) || 0;
        const base = Math.floor((total / months.length) * 100) / 100; // two decimals floor
        const items = months.map((m) => ({ month: m, amount: base }));
        const summed = items.reduce((s, it) => s + Number(it.amount), 0);
        const diff = Math.round((total - summed) * 100) / 100;
        if (Math.abs(diff) > 0) {
            items[items.length - 1].amount = Math.round((Number(items[items.length - 1].amount) + diff) * 100) / 100;
        }
        return items;
    }, [startMonth, endMonth, contractValue]);

    // Always auto-generate equal-split whenever inputs change
    React.useEffect(() => {
        // If we already loaded explicit periods from DB, don't auto-generate
        if (hasLoadedFromDb) return;
        if (activePattern !== 'monthly') return;
        const items = generateEqual();
        setGenerated(items);
        if (onChange) onChange(items);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePattern, startMonth, endMonth, contractValue, hasLoadedFromDb]);

    // Load existing billing periods from DB for this project (if any)
    React.useEffect(() => {
        let mounted = true;
        const loadMonthly = async () => {
            if (activePattern !== 'monthly') return;
            if (!projectId) return;
            try {
                const { data, error } = await supabase
                    .from('tpr_project_billing_periods')
                    .select('period_no, billing_date, amount')
                    .eq('project_id', projectId)
                    .eq('billing_pattern', 'monthly')
                    .order('period_no', { ascending: true });
                if (error) throw error;
                if (!mounted) return;
                if (data && data.length > 0) {
                    const items = data.map((r) => {
                        const ym = r.billing_date ? dayjs(r.billing_date).format('YYYY-MM') : null;
                        return { month: ym, amount: Number(r.amount) || 0 };
                    }).filter((it) => it.month);
                    setGenerated(items);
                    setHasLoadedFromDb(true);
                    const first = data[0]?.billing_date ? dayjs(data[0].billing_date).startOf('month') : null;
                    const last = data[data.length - 1]?.billing_date ? dayjs(data[data.length - 1].billing_date).startOf('month') : null;
                    if (first) setStartMonth(first);
                    if (last) setEndMonth(last);
                    if (onChange) onChange(items);
                }
            } catch (err) {
                console.error('load billing periods (monthly)', err);
            }
        };
        loadMonthly();
        return () => { mounted = false; };
    }, [projectId, activePattern, onChange]);

    // Load existing periodic periods
    React.useEffect(() => {
        let mounted = true;
        const loadPeriodic = async () => {
            if (activePattern !== 'periodic') return;
            if (!projectId) return;
            try {
                const { data, error } = await supabase
                    .from('tpr_project_billing_periods')
                    .select('period_no, billing_date, due_date, amount, period_label')
                    .eq('project_id', projectId)
                    .eq('billing_pattern', 'periodic')
                    .order('period_no', { ascending: true });
                if (error) throw error;
                if (!mounted) return;
                if (data && data.length > 0) {
                    const items = data.map((r) => ({
                        billing_date: r.billing_date,
                        due_date: r.due_date,
                        amount: Number(r.amount) || 0,
                        period_label: r.period_label || ''
                    }));
                    setPeriodicItems(items);
                    setHasLoadedPeriodic(true);
                    if (onChange) onChange(items);
                }
            } catch (err) {
                console.error('load billing periods (periodic)', err);
            }
        };
        const loadMilestone = async () => {
            if (activePattern !== 'milestone') return;
            if (!projectId) return;
            try {
                const { data, error } = await supabase
                    .from('tpr_project_billing_periods')
                    .select('period_no, period_label, amount, billing_date, metadata')
                    .eq('project_id', projectId)
                    .eq('billing_pattern', 'milestone')
                    .order('period_no', { ascending: true });
                if (error) throw error;
                if (!mounted) return;
                if (data && data.length > 0) {
                    const total = Number(contractValue) || 0;
                    const items = data.map((r) => {
                        const amount = Number(r.amount) || 0;
                        // prefer explicit percent stored in metadata.percent, fallback to amount/contract calculation
                        let percent = 0;
                        try {
                            if (r.metadata && r.metadata.percent != null) {
                                percent = Number(r.metadata.percent) || 0;
                            } else {
                                percent = total > 0 ? Math.round((amount / total) * 10000) / 100 : 0;
                            }
                        } catch (err) {
                            // debug logging removed
                            percent = total > 0 ? Math.round((amount / total) * 10000) / 100 : 0;
                        }
                        return { id: `milestone-${r.period_no || Date.now()}-${Math.random().toString(36).slice(2,7)}`, name: r.period_label || '', percent, amount, expected_billing_date: r.billing_date || null };
                    });
                    setPhaseItems(items);
                    setHasLoadedMilestone(true);
                    if (onChange) onChange(items);
                }
            } catch (err) {
                console.error('load billing periods (milestone)', err);
            }
        };
        loadPeriodic();
        loadMilestone();
        return () => { mounted = false; };
    }, [projectId, activePattern, onChange, contractValue]);

    // load existing one-off period (must be before any early return to avoid conditional hook warnings)
    React.useEffect(() => {
        let mounted = true;
        const loadOneOff = async () => {
            if (activePattern !== 'oneoff') return;
            if (!projectId) return;
            try {
                const { data, error } = await supabase
                    .from('tpr_project_billing_periods')
                    .select('period_label, billing_date, amount, metadata')
                    .eq('project_id', projectId)
                    .eq('billing_pattern', 'oneoff')
                    .limit(1);
                if (error) throw error;
                if (!mounted) return;
                if (data && data.length === 1) {
                    const row = data[0];
                    setOneOffItem({
                        billing_date: row.billing_date || null,
                        description: row.period_label || '',
                        amount: Number(row.amount) || 0,
                    });
                    setHasLoadedOneOff(true);
                    if (onChange) onChange([row]);
                } else {
                    setOneOffItem(prev => ({ ...prev, amount: prev.amount || Number(contractValue) || 0 }));
                }
            } catch (err) {
                console.error('load billing periods (oneoff)', err);
            }
        };
        loadOneOff();
        return () => { mounted = false; };
    }, [projectId, activePattern, onChange, contractValue]);

    // one-off derived due date memo (also before early return)
    const oneOffDueDate = React.useMemo(() => {
        if (!oneOffItem.billing_date) return null;
        return dayjs(oneOffItem.billing_date).add(Number(creditDays) || 0, 'day').format('YYYY-MM-DD');
    }, [oneOffItem.billing_date, creditDays]);

    // compute ISO billing date (YYYY-MM-DD) for a month string 'YYYY-MM'
    const computeBillingISO = (ym, billingDay) => {
        if (!ym) return null;
        const d = dayjs(ym + '-01');
        if (!d.isValid()) return null;
        const end = d.endOf('month').date();
        let dayNum = billingDay === 'eom' ? end : Math.min(Number(billingDay) || 1, end);
        return d.date(dayNum).format('YYYY-MM-DD');
    };

    const computeDueISO = (ym, billingDay, creditDays) => {
        const billIso = computeBillingISO(ym, billingDay);
        if (!billIso) return null;
        const due = dayjs(billIso).add(Number(creditDays) || 0, 'day');
        return due.format('YYYY-MM-DD');
    };

    const savePeriodsToDb = async (items) => {
        if (!projectId) {
            console.warn('BillingSchedule: no projectId, skipping DB save');
            return { error: 'no projectId' };
        }
        const pattern = activePattern === 'periodic' ? 'periodic' : (activePattern === 'milestone' ? 'milestone' : (activePattern === 'oneoff' ? 'oneoff' : 'monthly'));
        setSaving(true);
        try {
            const { error: delErr } = await supabase
                .from('tpr_project_billing_periods')
                .delete()
                .eq('project_id', projectId)
                .eq('billing_pattern', pattern);
            if (delErr) throw delErr;

            if (!items || items.length === 0) {
                setSaving(false);
                if (pattern === 'periodic') setHasLoadedPeriodic(true); else setHasLoadedFromDb(true);
                return { data: [] };
            }

            let payload;
            if (pattern === 'monthly') {
                payload = items.map((it, idx) => {
                    const billing_date = computeBillingISO(it.month, billingDay);
                    const due_date = computeDueISO(it.month, billingDay, creditDays);
                    return {
                        project_id: projectId,
                        billing_pattern: 'monthly',
                        period_no: idx + 1,
                        period_label: monthLabel(it.month),
                        billing_date,
                        due_date,
                        amount: Number(it.amount) || 0,
                        currency: 'THB',
                        status: 'scheduled',
                        metadata: {},
                    };
                });
            } else if (pattern === 'periodic') {
                payload = items.map((it, idx) => ({
                    project_id: projectId,
                    billing_pattern: 'periodic',
                    period_no: idx + 1,
                    period_label: it.period_label || `งวดที่ ${idx + 1}`,
                    billing_date: it.billing_date,
                    due_date: it.due_date,
                    amount: Number(it.amount) || 0,
                    currency: 'THB',
                    status: 'scheduled',
                    metadata: {},
                }));
            } else if (pattern === 'milestone') {
                payload = items.map((it, idx) => ({
                    project_id: projectId,
                    billing_pattern: 'milestone',
                    period_no: idx + 1,
                    period_label: it.name || `เฟสที่ ${idx + 1}`,
                    billing_date: it.expected_billing_date || null,
                    due_date: it.expected_billing_date ? dayjs(it.expected_billing_date).add(Number(creditDays) || 0, 'day').format('YYYY-MM-DD') : null,
                    amount: Number(it.amount) || 0,
                    currency: 'THB',
                    status: 'scheduled',
                    metadata: { percent: it.percent },
                }));
            } else if (pattern === 'oneoff') {
                payload = items.map((it) => {
                    const due = it.billing_date ? dayjs(it.billing_date).add(Number(creditDays) || 0, 'day').format('YYYY-MM-DD') : null;
                    return {
                        project_id: projectId,
                        billing_pattern: 'oneoff',
                        period_no: 1,
                        period_label: it.description || 'งวดที่ 1',
                        billing_date: it.billing_date || null,
                        due_date: due,
                        amount: Number(it.amount) || 0,
                        currency: 'THB',
                        status: 'scheduled',
                        metadata: {},
                    };
                });
            }

            const { data: insData, error: insErr } = await supabase
                .from('tpr_project_billing_periods')
                .insert(payload)
                .select('id,period_no');
            if (insErr) throw insErr;
            setSaving(false);
            if (pattern === 'periodic') setHasLoadedPeriodic(true); else if (pattern === 'milestone') setHasLoadedMilestone(true); else if (pattern === 'oneoff') setHasLoadedOneOff(true); else setHasLoadedFromDb(true);
            return { data: insData };
        } catch (err) {
            console.error('savePeriodsToDb', err);
            setSaving(false);
            return { error: err };
        }
    };

    // sanitize removed — system computes amounts automatically

    const computeBillingLabel = (ym, billingDay) => {
        if (!ym) return '';
        const d = dayjs(ym + '-01');
        if (!d.isValid()) return '';
        const end = d.endOf('month').date();
        let dayNum;
        if (billingDay === 'eom') dayNum = end;
        else {
            const n = Number(billingDay) || 1;
            dayNum = Math.min(n, end);
        }
        const yearBE = d.year() + 543;
        const yearShort = String(yearBE).slice(-2);
        const mm = String(d.month() + 1).padStart(2, '0');
        const dd = String(dayNum).padStart(2, '0');
        return `${dd}/${mm}/${yearShort}`;
    };

    const computeDueLabel = (ym, billingDay, creditDays) => {
        if (!ym) return '';
        const d = dayjs(ym + '-01');
        if (!d.isValid()) return '';
        const end = d.endOf('month').date();
        let dayNum;
        if (billingDay === 'eom') dayNum = end;
        else {
            const n = Number(billingDay) || 1;
            dayNum = Math.min(n, end);
        }
        // billing date
        const billingDate = d.date(dayNum);
        const due = billingDate.add(Number(creditDays) || 0, 'day');
        const dd = String(due.date()).padStart(2, '0');
        const mm = String(due.month() + 1).padStart(2, '0');
        const yearBE = due.year() + 543;
        const yearShort = String(yearBE).slice(-2);
        return `${dd}/${mm}/${yearShort}`;
    };

    

    // restore focus to the phase name input being edited after re-render (must be before any returns)
    React.useEffect(() => {
        if (lastFocusedPhaseRef.current.id) {
            const { id, field } = lastFocusedPhaseRef.current;
            const selector = `input[data-phase-id='${id}'][data-phase-field='${field}']`;
            const el = document.querySelector(selector);
            if (el) el.focus();
        }
    }, [phaseItems]);

    if (activePattern !== 'monthly' && activePattern !== 'periodic' && activePattern !== 'milestone' && activePattern !== 'oneoff') return null;
    // milestone helpers
    const addPhaseRow = () => {
        const id = `new-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        setPhaseItems((prev) => [...prev, { id, name: '', percent: 0, amount: 0, expected_billing_date: null }]);
    };
    const updatePhaseRow = (index, key, value) => {
        setPhaseItems((prev) => prev.map((row, i) => {
            if (i !== index) return row;
            let updated = { ...row, [key]: value };
            if (key === 'percent') {
                const total = Number(contractValue) || 0;
                const amt = Math.round((total * (Number(value) || 0) / 100) * 100) / 100;
                updated.amount = amt;
            }
            return updated;
        }));
    };
    const removePhaseRow = (index) => {
        setPhaseItems((prev) => prev.filter((_, i) => i !== index));
        // if removed focused row, clear ref
        if (phaseItems[index] && phaseItems[index].id === lastFocusedPhaseRef.current.id) {
            lastFocusedPhaseRef.current = { id: null, field: null };
        }
    };

    const percentSum = phaseItems.reduce((s, r) => s + (Number(r.percent) || 0), 0);
    const totalPhaseAmount = phaseItems.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    // Removed generateFromPhases button/action per latest request

    // responsive helpers

    const currencyFmt = (num) => Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const MonthlyTable = () => (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>ลำดับ</TableCell>
                        <TableCell>งวด</TableCell>
                        <TableCell align="right">วันที่เรียกเก็บ</TableCell>
                        <TableCell align="right">วันครบกำหนดชำระ</TableCell>
                        <TableCell align="right">จำนวนเงิน (บาท)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {generated.map((it, idx) => (
                        <TableRow key={it.month}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{monthLabel(it.month)}</TableCell>
                            <TableCell align="right">{computeBillingLabel(it.month, billingDay)}</TableCell>
                            <TableCell align="right">{computeDueLabel(it.month, billingDay, creditDays)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{currencyFmt(it.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );

    const MonthlyCards = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {generated.map((it, idx) => (
                <Box key={it.month} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Typography variant="subtitle2">งวดที่ {idx + 1}: {monthLabel(it.month)}</Typography>
                    <Typography variant="caption" color="text.secondary">เรียกเก็บ: {computeBillingLabel(it.month, billingDay)} | ครบกำหนด: {computeDueLabel(it.month, billingDay, creditDays)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: .5 }}>{currencyFmt(it.amount)} บาท</Typography>
                </Box>
            ))}
        </Box>
    );

    const PeriodicTable = () => (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>ลำดับ</TableCell>
                        <TableCell>วันที่เรียกเก็บ</TableCell>
                        <TableCell>วันครบกำหนด</TableCell>
                        <TableCell align="right">จำนวนเงิน (บาท)</TableCell>
                        <TableCell align="center">ลบ</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {periodicItems.map((row, idx) => (
                        <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                                <DatePicker
                                    value={dayjs(row.billing_date)}
                                    format="DD/MM/YYYY"
                                    onChange={(v) => updatePeriodicRow(idx, 'billing_date', v ? v.format('YYYY-MM-DD') : row.billing_date)}
                                    slotProps={{ textField: { size: 'small' } }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField size="small" value={dayjs(row.due_date).format('DD/MM/YYYY')} InputProps={{ readOnly: true }} />
                            </TableCell>
                            <TableCell align="right" sx={{ minWidth: 160 }}>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={row.amount}
                                    onChange={(e) => updatePeriodicRow(idx, 'amount', Number(e.target.value) || 0)}
                                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                                />
                            </TableCell>
                            <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => removePeriodicRow(idx)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );

    const PeriodicCards = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {periodicItems.map((row, idx) => (
                <Box key={idx} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2">งวด {idx + 1}</Typography>
                        <IconButton size="small" color="error" onClick={() => removePeriodicRow(idx)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <DatePicker
                        value={dayjs(row.billing_date)}
                        format="DD/MM/YYYY"
                        onChange={(v) => updatePeriodicRow(idx, 'billing_date', v ? v.format('YYYY-MM-DD') : row.billing_date)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    <TextField
                        size="small"
                        value={dayjs(row.due_date).format('DD/MM/YYYY')}
                        InputProps={{ readOnly: true }}
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        size="small"
                        type="number"
                        value={row.amount}
                        onChange={(e) => updatePeriodicRow(idx, 'amount', Number(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                        sx={{ mt: 1 }}
                    />
                </Box>
            ))}
        </Box>
    );

    const MilestoneTable = () => (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 680 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>ลำดับ</TableCell>
                        <TableCell>ชื่อเฟส / ตอน</TableCell>
                        <TableCell align="right">% สัญญา</TableCell>
                        <TableCell align="right">จำนวนเงิน (บาท)</TableCell>
                        <TableCell>วันที่คาดว่าจะออกบิล</TableCell>
                        <TableCell align="center">ลบ</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {phaseItems.map((row, idx) => (
                        <TableRow key={row.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                                <TextField
                                    size="small"
                                    value={row.name}
                                    disabled={hasLoadedMilestone}
                                    onFocus={() => { lastFocusedPhaseRef.current = { id: row.id, field: 'name' }; }}
                                    onChange={(e) => updatePhaseRow(idx, 'name', e.target.value)}
                                    placeholder="เช่น Concept Design"
                                    inputProps={{ 'data-phase-id': row.id, 'data-phase-field': 'name' }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ minWidth: 120 }}>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={row.percent}
                                    disabled={hasLoadedMilestone}
                                    onChange={(e) => updatePhaseRow(idx, 'percent', e.target.value)}
                                    onFocus={() => { lastFocusedPhaseRef.current = { id: row.id, field: 'percent' }; }}
                                    inputProps={{ min: 0, max: 100, step: 0.01, style: { textAlign: 'right' }, 'data-phase-id': row.id, 'data-phase-field': 'percent' }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, minWidth: 160 }}>
                                {currencyFmt(row.amount)}
                            </TableCell>
                            <TableCell>
                                <DatePicker
                                    value={row.expected_billing_date ? dayjs(row.expected_billing_date) : null}
                                    format="DD/MM/YYYY"
                                    onChange={(v) => updatePhaseRow(idx, 'expected_billing_date', v ? v.format('YYYY-MM-DD') : null)}
                                    slotProps={{ textField: { size: 'small', disabled: hasLoadedMilestone } }}
                                />
                            </TableCell>
                            <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => removePhaseRow(idx)} disabled={hasLoadedMilestone}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow>
                        <TableCell colSpan={2} sx={{ fontWeight: 600 }}>รวม</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: percentSum === 100 ? 'success.main' : (percentSum > 100 ? 'error.main' : 'warning.main') }}>{percentSum.toFixed(2)}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{currencyFmt(totalPhaseAmount)}</TableCell>
                        <TableCell colSpan={2} />
                    </TableRow>
                </TableBody>
            </Table>
        </Box>
    );

    const MilestoneCards = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {phaseItems.map((row, idx) => (
                        <Box key={row.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">เฟส {idx + 1}</Typography>
                        <IconButton size="small" color="error" onClick={() => removePhaseRow(idx)} disabled={hasLoadedMilestone}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                        <TextField
                        size="small"
                        value={row.name}
                        disabled={hasLoadedMilestone}
                            onFocus={() => { lastFocusedPhaseRef.current = { id: row.id, field: 'name' }; }}
                            onChange={(e) => updatePhaseRow(idx, 'name', e.target.value)}
                        placeholder="ชื่อเฟส"
                        sx={{ mt: 1 }}
                            inputProps={{ 'data-phase-id': row.id, 'data-phase-field': 'name' }}
                        />
                    <TextField
                        size="small"
                        type="number"
                        value={row.percent}
                        disabled={hasLoadedMilestone}
                        onChange={(e) => updatePhaseRow(idx, 'percent', e.target.value)}
                        onFocus={() => { lastFocusedPhaseRef.current = { id: row.id, field: 'percent' }; }}
                        inputProps={{ min: 0, max: 100, step: 0.01, style: { textAlign: 'right' }, 'data-phase-id': row.id, 'data-phase-field': 'percent' }}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="body2" sx={{ mt: .5, fontWeight: 600 }}>{currencyFmt(row.amount)} บาท</Typography>
                    <DatePicker
                        value={row.expected_billing_date ? dayjs(row.expected_billing_date) : null}
                        format="DD/MM/YYYY"
                        onChange={(v) => updatePhaseRow(idx, 'expected_billing_date', v ? v.format('YYYY-MM-DD') : null)}
                        slotProps={{ textField: { size: 'small', fullWidth: true, disabled: hasLoadedMilestone } }}
                        sx={{ mt: 1 }}
                    />
                </Box>
            ))}
            {phaseItems.length > 0 && (
                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: percentSum === 100 ? 'success.main' : (percentSum > 100 ? 'error.main' : 'warning.main') }}>รวม: {percentSum.toFixed(2)}% / {currencyFmt(totalPhaseAmount)} บาท</Typography>
                </Box>
            )}
        </Box>
    );

    const months = activePattern === 'monthly' ? buildMonths(startMonth, endMonth) : [];
// (removed duplicate oneOffDueDate declaration)


    // periodic helpers
    const addPeriodicRow = () => {
        const today = dayjs();
        const billing_date = today.format('YYYY-MM-DD');
        const due_date = today.add(Number(creditDays) || 0, 'day').format('YYYY-MM-DD');
        setPeriodicItems((prev) => [...prev, { billing_date, due_date, amount: 0 }]);
    };
    const updatePeriodicRow = (index, key, value) => {
        setPeriodicItems((prev) => prev.map((row, i) => {
            if (i !== index) return row;
            let updated = { ...row, [key]: value };
            if (key === 'billing_date') {
                const due = dayjs(value).add(Number(creditDays) || 0, 'day').format('YYYY-MM-DD');
                updated.due_date = due;
            }
            return updated;
        }));
    };
    const removePeriodicRow = (index) => {
        setPeriodicItems((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Box >

            {activePattern === 'monthly' && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="billing-day-label">วันที่ออกบิล</InputLabel>
                            <Select labelId="billing-day-label" value={billingDay} label="วันที่ออกบิล" onChange={(e) => setBillingDay(e.target.value)} fullWidth>
                                <MenuItem value={'1'}>1</MenuItem>
                                <MenuItem value={'15'}>15</MenuItem>
                                <MenuItem value={'30'}>30</MenuItem>
                                <MenuItem value={'eom'}>วันสิ้นเดือน</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            )}

            {activePattern === 'monthly' && (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                    <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column'}}>
                            <DatePicker
                                views={['year', 'month']}
                                label="เริ่ม (เดือน/ปี)"
                                value={startMonth}
                                onChange={(v) => setStartMonth(v)}
                                slotProps={{ textField: { size: 'small', fullWidth: true, required: true }, }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <DatePicker
                                views={['year', 'month']}
                                label="สิ้นสุด (เดือน/ปี)"
                                value={endMonth}
                                onChange={(v) => setEndMonth(v)}
                                slotProps={{ textField: { size: 'small', fullWidth: true, required: true }, }}
                            />
                        </Box>
                    </Box>
                </LocalizationProvider>
            )}

            {activePattern === 'monthly' && (
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'right' }}>งวดตัวอย่าง</Typography>
                    {months.length === 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>กรุณาระบุช่วงเวลาเริ่ม/สิ้นสุด</Typography>
                        </Box>
                    )}
                    {months.length > 0 && (isXs ? <MonthlyCards /> : <MonthlyTable />)}
                </Box>
            )}

            {activePattern === 'periodic' && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">กำหนดงวด (รายเฟส)</Typography>
                        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={addPeriodicRow}>เพิ่มงวด</Button>
                    </Box>
                    {periodicItems.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>ยังไม่มีงวด โปรดกด "เพิ่มงวด"</Typography>
                    )}
                    {periodicItems.length > 0 && (
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                            {isXs ? <PeriodicCards /> : <PeriodicTable />}
                        </LocalizationProvider>
                    )}
                </Box>
            )}

            {activePattern === 'milestone' && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">โครงสร้างการวางบิลตามเฟส</Typography>
                        <Button startIcon={<AddIcon />} variant="outlined" onClick={addPhaseRow} disabled={hasLoadedMilestone}>เพิ่มเฟส</Button>
                    </Box>
                    {phaseItems.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>ยังไม่มีเฟส โปรดกด "เพิ่มเฟส"</Typography>
                    )}
                    {phaseItems.length > 0 && (
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                            {isXs ? <MilestoneCards /> : <MilestoneTable />}
                        </LocalizationProvider>
                    )}
                    {percentSum > 100 && (
                        <Typography variant="caption" sx={{ color: 'error.main', mt: 1 }}>
                            เปอร์เซ็นต์รวม ({percentSum.toFixed(2)}%) มากกว่า 100% โปรดปรับลดให้ไม่เกิน 100%
                        </Typography>
                    )}
                    {/* Generation preview button removed as requested */}
                </Box>
            )}
            {activePattern === 'oneoff' && (
                <Box>
                    {/* <Typography variant="subtitle2" sx={{ mb: 1 }}>งวดรายครั้งเดียว</Typography> */}
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <DatePicker
                                label="วันที่คาดว่าจะออกบิล"
                                value={oneOffItem.billing_date ? dayjs(oneOffItem.billing_date) : null}
                                format="DD/MM/YYYY"
                                onChange={(v) => setOneOffItem(prev => ({ ...prev, billing_date: v ? v.format('YYYY-MM-DD') : null }))}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                            <TextField
                                label="รายละเอียด"
                                size="small"
                                value={oneOffItem.description}
                                onChange={(e) => setOneOffItem(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="เช่น ตรวจโครงสร้าง + ส่งรายงาน"
                                fullWidth
                            />
                            <TextField
                                label="จำนวนเงิน (บาท)"
                                size="small"
                                type="number"
                                value={oneOffItem.amount}
                                onChange={(e) => setOneOffItem(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                                onFocus={() => { if (oneOffItem.amount === 0 && contractValue) setOneOffItem(prev => ({ ...prev, amount: Number(contractValue) || 0 })); }}
                                inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                                fullWidth
                            />
                            {/* ใช้ creditDays ของโครงการสำหรับเครดิตเทอม ไม่ให้แก้รายครั้ง */}
                            <TextField
                                label="วันครบกำหนด (อัตโนมัติ)"
                                size="small"
                                value={oneOffDueDate ? dayjs(oneOffDueDate).format('DD/MM/YYYY') : ''}
                                InputProps={{ readOnly: true }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            {oneOffItem.billing_date && (
                                <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                    <Typography variant="caption">ตัวอย่างงวด: วันที่ออกบิล {dayjs(oneOffItem.billing_date).format('DD/MM/YYYY')} | ครบกำหนด {oneOffDueDate ? dayjs(oneOffDueDate).format('DD/MM/YYYY') : '-'} | จำนวนเงิน {Number(oneOffItem.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</Typography>
                                </Box>
                            )}
                        </Box>
                    </LocalizationProvider>
                </Box>
            )}

            {activePattern !== 'oneoff' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={async () => {
                        if (activePattern === 'monthly') setGenerated([]);
                        else if (activePattern === 'periodic') setPeriodicItems([]);
                        else if (activePattern === 'milestone') setPhaseItems([]);
                        else if (activePattern === 'oneoff') setOneOffItem({ billing_date: null, description: '', amount: 0 });
                        if (onChange) onChange([]);
                        try {
                            if (projectId) {
                                setSaving(true);
                                const pattern = activePattern === 'periodic' ? 'periodic' : (activePattern === 'milestone' ? 'milestone' : (activePattern === 'oneoff' ? 'oneoff' : 'monthly'));
                                const { error } = await supabase
                                    .from('tpr_project_billing_periods')
                                    .delete()
                                    .eq('project_id', projectId)
                                    .eq('billing_pattern', pattern);
                                if (error) throw error;
                                if (activePattern === 'monthly') setHasLoadedFromDb(false);
                                else if (activePattern === 'periodic') setHasLoadedPeriodic(false);
                                else if (activePattern === 'milestone') setHasLoadedMilestone(false);
                                else if (activePattern === 'oneoff') setHasLoadedOneOff(false);
                                if (typeof onNotify === 'function') onNotify('ล้างงวดเรียบร้อย', 'success');
                            }
                        } catch (err) {
                            console.error('clear periods', err);
                            if (typeof onNotify === 'function') onNotify(err.message || 'เกิดข้อผิดพลาดขณะล้างงวด', 'error');
                        } finally {
                            setSaving(false);
                        }
                    }}
                    disabled={saving || (activePattern === 'monthly' ? !hasLoadedFromDb : (activePattern === 'periodic' ? !hasLoadedPeriodic : (activePattern === 'milestone' ? !hasLoadedMilestone : !hasLoadedOneOff)))}
                >ล้างรอบวางบิล</Button>
                <Button
                    variant="outlined"
                    startIcon={<CheckIcon />}
                    onClick={async () => {
                        // If project already has saved periods of a different pattern, block creation and notify
                        if (projectId) {
                            try {
                                const { data: other, error: otherErr } = await supabase
                                    .from('tpr_project_billing_periods')
                                    .select('billing_pattern')
                                    .eq('project_id', projectId)
                                    .neq('billing_pattern', activePattern)
                                    .limit(1);
                                if (otherErr) throw otherErr;
                                if (other && other.length > 0) {
                                    if (typeof onNotify === 'function') onNotify(`มีรอบวางบิลที่กำหนดไว้แล้ว (แบบ ${other[0].billing_pattern}) - โปรดล้างรอบวางบิลเดิมก่อนสร้างใหม่`, 'warning');
                                    return;
                                }
                            } catch (err) {
                                console.error('check existing patterns', err);
                                if (typeof onNotify === 'function') onNotify('ตรวจสอบรอบวางบิลล้มเหลว', 'error');
                                return;
                            }
                        }

                        let itemsToSave;
                        if (activePattern === 'monthly') {
                            const items = generateEqual();
                            setGenerated(items);
                            itemsToSave = items;
                        } else if (activePattern === 'periodic') {
                            itemsToSave = periodicItems;
                        } else if (activePattern === 'milestone') {
                            // recompute amounts from percents before save
                            const recomputed = phaseItems.map((p) => {
                                const total = Number(contractValue) || 0;
                                const amount = Math.round((total * (Number(p.percent) || 0) / 100) * 100) / 100;
                                return { ...p, amount };
                            });
                            setPhaseItems(recomputed);
                            itemsToSave = recomputed;
                        } else if (activePattern === 'oneoff') {
                            const itm = { ...oneOffItem };
                            if (!itm.amount || itm.amount === 0) itm.amount = Number(contractValue) || 0;
                            itemsToSave = [itm];
                        }
                        if (onChange) onChange(itemsToSave);
                        try {
                            const res = await savePeriodsToDb(itemsToSave);
                            if (res && res.error) {
                                const msg = (res.error && res.error.message) ? res.error.message : 'เกิดข้อผิดพลาดขณะบันทึกรอบวางบิล';
                                if (typeof onNotify === 'function') onNotify(msg, 'error');
                            } else {
                                if (typeof onNotify === 'function') onNotify('สร้างรอบวางบิลเรียบร้อย', 'success');
                            }
                        } catch (err) {
                            console.error('persist periods', err);
                            if (typeof onNotify === 'function') onNotify(err.message || 'เกิดข้อผิดพลาดขณะบันทึกรอบวางบิล', 'error');
                        }
                    }}
                    disabled={saving || (
                        activePattern === 'monthly' ? months.length === 0 :
                        activePattern === 'periodic' ? periodicItems.length === 0 :
                        activePattern === 'milestone' ? (phaseItems.length === 0 || percentSum > 100) :
                        (!oneOffItem.billing_date || (Number(oneOffItem.amount) || 0) <= 0)
                    )}
                >สร้างรอบวางบิล</Button>
            </Box>
            )}
        </Box>
    );
}
