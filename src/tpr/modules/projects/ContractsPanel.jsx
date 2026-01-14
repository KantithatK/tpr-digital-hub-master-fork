import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { supabase } from '@/lib/supabaseClient';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import BillingSchedule from './BillingSchedule';
// removed unused imports: Paper, Grid, CircularProgress

// Map available billing-cycle options per contract type (Thai labels preserved)
const CONTRACT_BILLING_MAP = {
    'แบบเหมารวม': [
        { value: 'milestone', label: 'รายเฟส', recommended: true },
        // 'percent' (ตามความก้าวหน้า %) removed per request
        { value: 'monthly', label: 'รายเดือน' },
        { value: 'oneoff', label: 'รายครั้งเดียว' },
    ],
    'แบบคิดตามชั่วโมงจริง': [
        { value: 'monthly', label: 'รายเดือน', recommended: true },
        { value: 'oneoff', label: 'รายครั้งเดียว' },
    ],
    'แบบต้นทุนบวก': [
        { value: 'monthly', label: 'รายเดือน', recommended: true },
        { value: 'milestone', label: 'รายเฟส' },
        { value: 'oneoff', label: 'รายครั้งเดียว' },
    ],
};

export default function ContractsPanel({ projectId }) {
    const getBillingTooltipContent = (mode) => {
        const boxSx = { maxWidth: 420, fontSize: '0.85rem', '& p': { margin: '6px 0', fontSize: '0.85rem' } };
        const m = (mode || '').toString().toLowerCase();
        if (m === 'monthly' || m === '') {
            return (
                <Box sx={boxSx}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Tooltip – รายเดือน</Typography>
                    <Typography>รอบการวางบิล (รายเดือน) : เก็บเงินทุกเดือนตามวันที่กำหนดจนจบโครงการ</Typography>
                    <Typography>วันที่ออกบิล : วันที่ออกบิลในแต่ละเดือน เช่น 1, 15, 30 หรือวันสิ้นเดือน</Typography>
                    <Typography>เริ่ม (เดือน/ปี) : เดือนแรกที่เริ่มวางบิลรายเดือน</Typography>
                    <Typography>สิ้นสุด (เดือน/ปี) : เดือนสุดท้ายของการวางบิลรายเดือน</Typography>
                    <Typography>วิธีคำนวณยอดรายเดือน : ระบบหารยอดเท่าๆ กัน อัตโนมัติ</Typography>
                    <Typography>งวดที่จะวางบิล : รายการงวดบิลรายเดือนที่ระบบสร้างให้ สามารถแก้ไขยอดได้</Typography>
                    <Typography>เครดิต (วัน) : จำนวนวันที่ลูกค้าต้องจ่ายหลังออกบิล ระบบจะคำนวณวันครบกำหนดชำระให้</Typography>
                </Box>
            );
        }
        if (m === 'milestone' || m === 'milestones' || m === 'milestonebilling') {
            return (
                <Box sx={boxSx}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Tooltip – รายเฟส</Typography>
                    <Typography>รอบการวางบิล (รายเฟส) — แบ่งการเก็บเงินตามงวดงานหรือ Milestone ของโครงการ</Typography>
                    <Typography>งวดงาน/Milestone — ชื่อเฟสหรือขั้นตอนงาน เช่น Concept, DD, CD, As-built</Typography>
                    <Typography>เปอร์เซ็นต์ (%) — สัดส่วนเงินของแต่ละงวด ต้องรวมกันเป็น 100%</Typography>
                    <Typography>จำนวนเงิน — ระบบคำนวณจากเปอร์เซ็นต์ของมูลค่าสัญญา หรือให้ผู้ใช้แก้ไขได้</Typography>
                    <Typography>วันที่ออกบิล — วันที่จะออกบิลของงวดนั้น เมื่อ Milestone นั้นเสร็จ</Typography>
                    <Typography>เครดิต (วัน) — จำนวนวันหลังออกบิลที่ลูกค้าต้องชำระเงิน</Typography>
                    <Typography>สร้างงวด — สร้างรายการงวดบิลจาก Milestone ทั้งหมดในสัญญา</Typography>
                </Box>
            );
        }
        if (m === 'oneoff' || m === 'one-off' || m === 'one') {
            return (
                <Box sx={boxSx}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Tooltip – รายครั้งเดียว</Typography>
                    <Typography>รอบการวางบิล (รายครั้งเดียว) — เก็บเงินครั้งเดียวเมื่อปิดงานหรือส่งงานเสร็จ</Typography>
                    <Typography>วันที่ออกบิล — วันที่จะออกบิลตามข้อตกลงในสัญญา</Typography>
                    <Typography>จำนวนเงิน — มูลค่าที่จะเรียกเก็บครั้งเดียว มักเป็นมูลค่าสัญญาทั้งหมด</Typography>
                    <Typography>เครดิต (วัน) — จำนวนวันที่ลูกค้าต้องจ่ายหลังออกบิล</Typography>
                </Box>
            );
        }
        // progress / percent
        return (
            <Box sx={boxSx}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Tooltip – ตามความก้าวหน้า</Typography>
                <Typography>รอบการวางบิล (%ความก้าวหน้า) — ออกบิลตามเปอร์เซ็นต์งานที่เสร็จจริงในแต่ละรอบ</Typography>
                <Typography>ความก้าวหน้าสะสม (%) — เปอร์เซ็นต์งานสะสมจนถึงขณะนั้น</Typography>
                <Typography>เปอร์เซ็นต์เพิ่มรอบนี้ (%) — ความก้าวหน้ารอบนี้ = สะสมใหม่ − สะสมเก่า</Typography>
                <Typography>จำนวนเงิน — ระบบคำนวณจากเปอร์เซ็นต์ความก้าวหน้าที่เพิ่มขึ้น × มูลค่าสัญญา</Typography>
                <Typography>วันที่ออกบิล — วันที่ออกบิลตามรอบประเมินความก้าวหน้า</Typography>
                <Typography>เครดิต (วัน) — ระยะเวลาที่ลูกค้าต้องชำระเงินหลังออกบิล</Typography>
            </Box>
        );
    };
    const [contractType, setContractType] = React.useState('แบบเหมารวม');
    const [contractValue, setContractValue] = React.useState('');
    const [fees, setFees] = React.useState('');
    const [consultants, setConsultants] = React.useState('');
    const [expenses, setExpenses] = React.useState('');
    const [billingCycle, setBillingCycle] = React.useState('monthly');
    const [creditDays, setCreditDays] = React.useState('30');
    // overall single-rate field removed; positions button replaces it
    // dialog & selection for positions (replaces overall cost field)
    // positions / per-position service rates removed — using single overall rates instead
    const [laborCost, setLaborCost] = React.useState('');
    const [memo, setMemo] = React.useState('');
    const [billingScheduleData, setBillingScheduleData] = React.useState([]);
    const [budgetError, setBudgetError] = React.useState('');
    // const [projectStart, setProjectStart] = React.useState(null);
    // const [projectEnd, setProjectEnd] = React.useState(null);
    // const [validationErrors, setValidationErrors] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarSeverity, setSnackbarSeverity] = React.useState('success');
    const [snackbarMessage, setSnackbarMessage] = React.useState('');

    // noop effect to keep billingScheduleData referenced until persistence is decided
    React.useEffect(() => {
        // intentionally empty; `billingScheduleData` will be used for save/load when DB mapping is in place
    }, [billingScheduleData]);



    // sanitize numeric input (allow digits and a single decimal point)
    const sanitizeNumberInput = (value) => {
        let cleaned = String(value ?? '')
            .replace(/,/g, '')
            .replace(/[^\d.]/g, '');
        const firstDot = cleaned.indexOf('.');
        if (firstDot !== -1) {
            cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
        }
        return cleaned;
    };

    // format number like SystemSettings: Thai locale, two decimals, no currency symbol
    const formatCurrencyNumber = (n) => {
        if (n === null || n === undefined) return '-';
        const num = Number(n);
        if (Number.isNaN(num)) return '-';
        return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // per-position cost derivation removed — using single overall rates instead

    // per-position cost derivation removed

    // When contract type changes, pick a recommended billing-cycle if current value isn't valid
    React.useEffect(() => {
        const options = CONTRACT_BILLING_MAP[contractType] || [];
        const values = options.map((o) => o.value);
        if (!values.includes(billingCycle)) {
            const recommended = options.find((o) => o.recommended) || options[0];
            if (recommended) setBillingCycle(recommended.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractType]);

    // load saved finance + selected positions when projectId changes
    React.useEffect(() => {
        let mounted = true;
        const loadSavedFinance = async () => {
            if (!projectId) return;
            try {
                setSaving(true);
                // positions removed — no per-position cost loading

                // load latest finance record for this project (most recent)
                const { data: finData, error: finErr } = await supabase
                    .from('tpr_project_finances')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (finErr) throw finErr;
                const finRow = (finData && finData.length) ? finData[0] : null;
                if (finRow && mounted) {
                    setContractValue(finRow.contract_value != null ? sanitizeNumberInput(finRow.contract_value) : '');
                    setFees(finRow.fees_budget != null ? sanitizeNumberInput(finRow.fees_budget) : '');
                    setConsultants(finRow.consultants_budget != null ? sanitizeNumberInput(finRow.consultants_budget) : '');
                    setExpenses(finRow.expenses_budget != null ? sanitizeNumberInput(finRow.expenses_budget) : '');
                    setLaborCost(finRow.labor_cost != null ? sanitizeNumberInput(finRow.labor_cost) : '');
                    setBillingCycle(finRow.billing_cycle || 'monthly');
                    // load billing schedule if present (best-effort)
                    try {
                        if (finRow.billing_schedule_json) setBillingScheduleData(finRow.billing_schedule_json);
                    } catch (e) { console.error('parse billing schedule', e); }
                    setCreditDays(finRow.credit_days != null ? String(finRow.credit_days) : '30');
                    setMemo(finRow.memo || '');
                }

                // load project dates (start_date, end_date) to default billing months
                // try {
                //     const { data: projectRow, error: projectErr } = await supabase.from('projects').select('start_date,end_date').eq('id', projectId).single();
                //     if (!projectErr && projectRow) {
                //         if (mounted) {
                //             setProjectStart(projectRow.start_date || null);
                //             setProjectEnd(projectRow.end_date || null);
                //         }
                //     }
                // } catch (err) {
                //     console.error('load project dates', err);
                // }

                // selected positions removed
            } catch (err) {
                console.error('loadSavedFinance', err);
            } finally {
                if (mounted) setSaving(false);
            }
        }
        loadSavedFinance();
        return () => { mounted = false; };
    }, [projectId]);

    const handleCancelChanges = () => {
        
    };

    const handleSaveChanges = async () => {
        // setValidationErrors([]);
        // basic required-field validation
        const errors = [];
        if (!projectId) errors.push('ไม่พบ `projectId` ของโครงการ — บันทึกไม่ได้');
        const contract = Number((contractValue || '').toString().replace(/,/g, '')) || 0;
        if (contract <= 0) errors.push('กรุณาระบุ มูลค่าสัญญารวม ที่มากกว่า 0');
        const feeNum = Number((fees || '').toString().replace(/,/g, '')) || 0;
        const consultantsNum = Number((consultants || '').toString().replace(/,/g, '')) || 0;
        const expensesNum = Number((expenses || '').toString().replace(/,/g, '')) || 0;
        // required checks for budget fields
        if ((fees || '').toString().trim() === '') errors.push('กรุณาระบุ งบค่าบริการ');
        if ((consultants || '').toString().trim() === '') errors.push('กรุณาระบุ งบที่ปรึกษา');
        if ((expenses || '').toString().trim() === '') errors.push('กรุณาระบุ งบค่าใช้จ่ายตรง');
        if (billingCycle === '' || billingCycle == null) errors.push('กรุณาระบุ รอบวางบิล');
        if (!creditDays || Number(creditDays) < 0) errors.push('กรุณาระบุ เครดิต (วัน) ที่ถูกต้อง');
        if (feeNum < 0 || consultantsNum < 0 || expensesNum < 0) errors.push('งบประมาณต้องไม่เป็นค่าติดลบ');
        // per-position selections removed — no per-position validation
        // existing budget error check
        if (budgetError) errors.push(budgetError);

        if (errors.length > 0) {
            // setValidationErrors(errors);
            // show first validation error in snackbar as well
            setSnackbarSeverity('error');
            setSnackbarMessage(errors.join('\n'));
            setSnackbarOpen(true);
            return;
        }

        setSaving(true);
        let financeId = null;
        try {
            // upsert-like behavior: if a finance row exists for this project, update it; otherwise insert
            const { data: existingRows, error: existingErr } = await supabase
                .from('tpr_project_finances')
                .select('id')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (existingErr) throw existingErr;

            if (existingRows && existingRows.length > 0) {
                // update the latest finance record
                const existingId = existingRows[0].id;
                const { data: updatedData, error: updateErr } = await supabase
                    .from('tpr_project_finances')
                    .update({ contract_value: contract, fees_budget: feeNum, consultants_budget: consultantsNum, expenses_budget: expensesNum, labor_cost: Number((laborCost || '').toString().replace(/,/g, '')) || 0, billing_cycle: billingCycle, credit_days: Number(creditDays) || 0, memo })
                    .eq('id', existingId)
                    .select('id')
                    .single();
                if (updateErr) throw updateErr;
                financeId = updatedData?.id;
            } else {
                // insert finance record
                const { data: financeData, error: financeErr } = await supabase
                    .from('tpr_project_finances')
                    .insert([{ project_id: projectId, contract_value: contract, fees_budget: feeNum, consultants_budget: consultantsNum, expenses_budget: expensesNum, labor_cost: Number((laborCost || '').toString().replace(/,/g, '')) || 0, billing_cycle: billingCycle, credit_days: Number(creditDays) || 0, memo }])
                    .select('id')
                    .single();
                if (financeErr) throw financeErr;
                financeId = financeData?.id;
            }

            // per-position persistence removed

            // setValidationErrors([]);
            setSnackbarSeverity('success');
            setSnackbarMessage('บันทึกเรียบร้อย');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('save error', err);
            // attempt basic rollback of finance row if created
            if (financeId) {
                try {
                    await supabase.from('tpr_project_finances').delete().eq('id', financeId);
                } catch (delErr) {
                    console.error('rollback failed', delErr);
                }
            }
            const msg = err.message || JSON.stringify(err);
            // setValidationErrors([msg]);
            setSnackbarSeverity('error');
            setSnackbarMessage(msg);
            setSnackbarOpen(true);
        } finally {
            setSaving(false);
        } 
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    return (
        <>
            <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        ข้อมูลสัญญา
                    </Typography>

                    <FormControl fullWidth size="small">
                        <InputLabel id="contract-type-label">ประเภทสัญญา</InputLabel>
                        <Select
                            labelId="contract-type-label"
                            label="ประเภทสัญญา"
                            value={contractType}
                            onChange={(e) => setContractType(e.target.value)}
                        >
                            <MenuItem value="แบบเหมารวม">แบบเหมารวม</MenuItem>
                            <MenuItem value="แบบคิดตามชั่วโมงจริง">แบบคิดตามชั่วโมงจริง</MenuItem>
                            <MenuItem value="แบบต้นทุนบวก">แบบต้นทุนบวก</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        label="มูลค่าสัญญารวม"
                        value={contractValue}
                        onChange={(e) => setContractValue(sanitizeNumberInput(e.target.value))}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                        fullWidth
                    />
                </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        การวางบิล
                         <Tooltip title={getBillingTooltipContent(billingCycle)} arrow placement="right">
                            <IconButton size="small" aria-label="billing-help">
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel id="billing-cycle-label">รอบวางบิล</InputLabel>
                            <Select
                                labelId="billing-cycle-label"
                                label="รอบวางบิล"
                                value={billingCycle}
                                onChange={(e) => setBillingCycle(e.target.value)}
                            >
                                {(CONTRACT_BILLING_MAP[contractType] || []).map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <TextField
                        size="small"
                        label="เครดิต (วัน)"
                        value={creditDays}
                        onChange={(e) => setCreditDays(e.target.value.replace(/\D/g, ''))}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                        fullWidth
                    />

                    {/* Billing schedule editor (shows only for monthly) */}
                    <BillingSchedule
                        billingCycle={billingCycle}
                        contractValue={Number((contractValue || '').toString().replace(/,/g, '')) || 0}
                        // projectStart={projectStart}
                        // projectEnd={projectEnd}
                        creditDays={creditDays}
                        projectId={projectId}
                        onCreditDaysChange={(v) => setCreditDays(v)}
                        onChange={(sched) => setBillingScheduleData(sched)}
                        onNotify={(msg, severity = 'success') => { setSnackbarSeverity(severity); setSnackbarMessage(msg); setSnackbarOpen(true); }}
                    />
                </Box>
            </Box>

            {/* NEW COLUMN: งบประมาณ */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    งบประมาณ
                </Typography>

                <TextField
                    size="small"
                    label="ค่าบริการ"
                    value={fees}
                    onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        const a = Number((v || '').toString().replace(/,/g, '')) || 0;
                        const b = Number((consultants || '').toString().replace(/,/g, '')) || 0;
                        const c = Number((expenses || '').toString().replace(/,/g, '')) || 0;
                        const contract = Number((contractValue || '').toString().replace(/,/g, '')) || 0;
                        const sum = a + b + c;
                        setFees(v);
                        setBudgetError(sum > contract ? 'ผลรวมงบเกินมูลค่าสัญญารวม ดังนั้นคุณจะไม่สามารถบันทึกข้อมูลได้' : '');
                    }}
                    inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.]?[0-9]*' }}
                    sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                    fullWidth
                />

                <TextField
                    size="small"
                    label="ค่าที่ปรึกษาภายนอก"
                    value={consultants}
                    onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        const a = Number((fees || '').toString().replace(/,/g, '')) || 0;
                        const b = Number((v || '').toString().replace(/,/g, '')) || 0;
                        const c = Number((expenses || '').toString().replace(/,/g, '')) || 0;
                        const contract = Number((contractValue || '').toString().replace(/,/g, '')) || 0;
                        const sum = a + b + c;
                        setConsultants(v);
                        setBudgetError(sum > contract ? 'ผลรวมงบเกินมูลค่าสัญญารวม ดังนั้นคุณจะไม่สามารถบันทึกข้อมูลได้' : '');
                    }}
                    inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.]?[0-9]*' }}
                    sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                    fullWidth
                />

                <TextField
                    size="small"
                    label="ค่าใช้จ่ายตามจริง"
                    value={expenses}
                    onChange={(e) => {
                        const v = sanitizeNumberInput(e.target.value);
                        const a = Number((fees || '').toString().replace(/,/g, '')) || 0;
                        const b = Number((consultants || '').toString().replace(/,/g, '')) || 0;
                        const c = Number((v || '').toString().replace(/,/g, '')) || 0;
                        const contract = Number((contractValue || '').toString().replace(/,/g, '')) || 0;
                        const sum = a + b + c;
                        setExpenses(v);
                        setBudgetError(sum > contract ? 'ผลรวมงบเกินมูลค่าสัญญารวม ดังนั้นคุณจะไม่สามารถบันทึกข้อมูลได้' : '');
                    }}
                    inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.]?[0-9]*' }}
                    sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                    fullWidth
                />
                {budgetError && (
                    <Typography variant="caption" sx={{ color: 'error.main' }}>{budgetError}</Typography>
                )}
            </Box>

            

            <Box sx={{ display: "flex", gap: 3, mt: 3 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>คำนวณภาพรวม</Typography>
                    <TextField
                        size="small"
                        label="ต้นทุนแรงงานรวม"
                        value={laborCost}
                        onChange={(e) => setLaborCost(sanitizeNumberInput(e.target.value))}
                        inputProps={{ inputMode: 'decimal', pattern: '[0-9]*[.]?[0-9]*' }}
                        sx={{ '& .MuiInputBase-input': { textAlign: 'right' } }}
                    />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 1 }}>
                        {/* Total budget box */}
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>งบรวม</Typography>
                            {(() => {
                                const total = Number((fees || '').toString().replace(/,/g, '')) || 0;
                                return <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrencyNumber(total)}</Typography>;
                            })()}
                        </Box>

                        {/* Forecast profit box (computed) */}
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>คาดการณ์กำไร</Typography>
                            {(() => {
                                const total = Number((fees || '').toString().replace(/,/g, '')) || 0;
                                const labor = Number((laborCost || '').toString().replace(/,/g, '')) || 0;
                                const profit = total - labor;
                                return <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>{formatCurrencyNumber(profit)}</Typography>;
                            })()}
                        </Box>

                        {/* Percentage badge (computed) */}
                        <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'white', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>เปอร์เซ็นต์</Typography>
                            {(() => {
                                const total = Number((fees || '').toString().replace(/,/g, '')) || 0;
                                const labor = Number((laborCost || '').toString().replace(/,/g, '')) || 0;
                                const profit = total - labor;
                                const contractNum = Number((contractValue || '').toString().replace(/,/g, '')) || 0;
                                const pct = contractNum > 0 ? ((profit / contractNum) * 100).toFixed(2) : '0.00';
                                return (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d69ff' }}>{pct}%</Typography>
                                    </Box>
                                );
                            })()}
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ width: '100%', display: 'flex' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>บันทึกช่วยจำ</Typography>
                    </Box>
                    <TextField
                        multiline
                        rows={8}
                        placeholder="หมายเหตุเกี่ยวกับสัญญา/การเงิน..."
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        fullWidth

                    />
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={handleCancelChanges} sx={{ color: 'common.black' }}>ยกเลิก</Button>
                    <Button
                        onClick={handleSaveChanges}
                        variant="contained"
                        disabled={saving}
                        sx={{ bgcolor: 'common.black', color: 'common.white', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' } }}
                    >
                        {saving && <CircularProgress size={18} color="error" sx={{ mr: 1 }} />}
                        บันทึกการเปลี่ยนแปลง
                    </Button>
                </Box>
            </Box>
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>

        </>
    );
}
