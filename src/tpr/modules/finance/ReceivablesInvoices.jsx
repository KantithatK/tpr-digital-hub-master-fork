import * as React from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Badge,
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import BlockIcon from '@mui/icons-material/Block';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

import { supabase } from '../../../lib/supabaseClient';

// ===== Helpers =====
const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const typeLabel = (t) => {
  switch (t) {
    case 'PHASE':
      return 'รายเฟส';
    case 'PROGRESS':
      return 'ตามความก้าวหน้า %';
    case 'MONTHLY':
      return 'รายเดือน';
    case 'ONE_TIME':
      return 'รายครั้งเดียว';
    default:
      return t || '-';
  }
};

const statusMeta = (status) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'ร่าง', color: 'default' };
    case 'PENDING_APPROVAL':
      return { label: 'รออนุมัติ', color: 'warning' };
    case 'APPROVED':
      return { label: 'อนุมัติแล้ว', color: 'success' };
    case 'SENT':
      return { label: 'ส่งแล้ว', color: 'info' };
    case 'OVERDUE':
      return { label: 'เกินกำหนด', color: 'error' };
    case 'PAID':
      return { label: 'ชำระแล้ว', color: 'success' };
    case 'VOID':
      return { label: 'ยกเลิก', color: 'default' };
    default:
      return { label: status || '-', color: 'default' };
  }
};

const billTypeOptions = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'PHASE', label: 'รายเฟส' },
  { value: 'PROGRESS', label: 'ตามความก้าวหน้า %' },
  { value: 'MONTHLY', label: 'รายเดือน' },
  { value: 'ONE_TIME', label: 'รายครั้งเดียว' },
];

const statusOptions = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'PENDING_APPROVAL', label: 'รออนุมัติ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'SENT', label: 'ส่งแล้ว' },
  { value: 'OVERDUE', label: 'เกินกำหนด' },
  { value: 'PAID', label: 'ชำระแล้ว' },
  { value: 'VOID', label: 'ยกเลิก' },
];

// ===== Black button style (ทุกปุ่มเป็นสีดำ) =====
const blackBtnSx = {
  bgcolor: '#000',
  color: '#fff',
  borderColor: '#000',
  '&:hover': { bgcolor: '#111', borderColor: '#111' },
  '&.Mui-disabled': { bgcolor: '#E0E0E0', color: '#9E9E9E', borderColor: '#E0E0E0' },
};

const blackIconBtnSx = {
  color: '#000',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
  '&.Mui-disabled': { color: '#BDBDBD' },
};

export default function ReceivablesInvoices() {
  // invoices
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [rows, setRows] = React.useState([]);

  // filters
  const [q, setQ] = React.useState('');
  const [billType, setBillType] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');

  // create dialog (timesheet candidates)
  const [openCreateTimesheet, setOpenCreateTimesheet] = React.useState(false);
  const [candLoading, setCandLoading] = React.useState(false);
  const [candErr, setCandErr] = React.useState('');
  const [candidates, setCandidates] = React.useState([]);

  // create dialog (plan due queue)
  const [openCreatePlan, setOpenCreatePlan] = React.useState(false);
  const [planLoading, setPlanLoading] = React.useState(false);
  const [planErr, setPlanErr] = React.useState('');
  const [planRows, setPlanRows] = React.useState([]);

  const applyClientSideSearch = React.useCallback(
    (data) => {
      const s = q?.trim()?.toLowerCase();
      if (!s) return data || [];
      return (data || []).filter((r) => {
        const invNo = (r?.invoice_no || '').toLowerCase();
        const pcode = (r?.tpr_projects?.project_code || '').toLowerCase();
        const pname = (r?.tpr_projects?.name_th || '').toLowerCase();
        const cname =
          (r?.tpr_customers?.name_th || r?.customer_billing_name || '').toLowerCase();
        return invNo.includes(s) || pcode.includes(s) || pname.includes(s) || cname.includes(s);
      });
    },
    [q]
  );

  async function loadInvoices() {
    setLoading(true);
    setErr('');
    try {
      let query = supabase
        .from('tpr_invoices')
        .select(
          `
          id,
          invoice_no,
          invoice_date,
          due_date,
          bill_type,
          status,
          total_amount,
          sent_at,
          paid_at,
          period_start,
          period_end,
          project_id,
          customer_id,
          customer_billing_name,
          tpr_projects ( project_code, name_th ),
          tpr_customers ( name_th )
        `
        )
        .order('invoice_date', { ascending: false })
        .limit(200);

      if (billType !== 'ALL') query = query.eq('bill_type', billType);
      if (status !== 'ALL') query = query.eq('status', status);

      if (q?.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or(`invoice_no.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows(applyClientSideSearch(data));
    } catch (e) {
      setErr(e?.message || 'โหลดข้อมูลใบแจ้งหนี้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function loadTimesheetCandidates() {
    setCandLoading(true);
    setCandErr('');
    try {
      const { data, error } = await supabase
        .from('v_tpr_invoice_candidates')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(200);

      if (error) throw error;
      setCandidates(data || []);
    } catch (e) {
      setCandErr(e?.message || 'โหลดรายการพร้อมออกบิลไม่สำเร็จ');
    } finally {
      setCandLoading(false);
    }
  }

  async function loadPlanQueue() {
    setPlanLoading(true);
    setPlanErr('');
    try {
      const { data, error } = await supabase
        .from('v_tpr_ready_to_invoice_plan')
        .select('*')
        .order('billing_date', { ascending: false })
        .limit(300);

      if (error) throw error;
      setPlanRows(data || []);
    } catch (e) {
      setPlanErr(e?.message || 'โหลดรายการครบกำหนดตามแผนไม่สำเร็จ');
    } finally {
      setPlanLoading(false);
    }
  }

  React.useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeStatus(invoiceId, newStatus, extra = {}) {
    try {
      setErr('');
      const payload = { status: newStatus, ...extra };
      const { error } = await supabase.from('tpr_invoices').update(payload).eq('id', invoiceId);
      if (error) throw error;
      await loadInvoices();
    } catch (e) {
      setErr(e?.message || 'อัปเดตสถานะไม่สำเร็จ');
    }
  }

  async function createInvoiceFromTimesheetCandidate(c) {
    try {
      setCandErr('');
      const { error } = await supabase.rpc('tpr_create_invoice_from_timesheet_month', {
        p_project_id: c.project_id,
        p_period_start: c.period_start,
        p_period_end: c.period_end,
      });
      if (error) throw error;

      await loadInvoices();
      await loadTimesheetCandidates();
      await loadPlanQueue();
    } catch (e) {
      setCandErr(e?.message || 'สร้างใบแจ้งหนี้ไม่สำเร็จ');
    }
  }

  async function createInvoiceFromPlanRow(r) {
    try {
      setPlanErr('');
      const { error } = await supabase.rpc('tpr_create_invoice_from_billing_period', {
        p_billing_period_id: r.billing_period_id,
      });
      if (error) throw error;

      await loadInvoices();
      await loadPlanQueue();
      await loadTimesheetCandidates();
    } catch (e) {
      setPlanErr(e?.message || 'สร้างใบแจ้งหนี้จากแผนไม่สำเร็จ');
    }
  }

  const planCount = planRows?.length || 0;

  return (
    <Box sx={{ py: 1 }}>
      <Stack spacing={1.5}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6">ลูกหนี้ & ใบแจ้งหนี้</Typography>
            <Typography variant="body2" color="text.secondary">
              ออกใบแจ้งหนี้จาก “แผนวางบิลโครงการ” หรือ “Timesheet (Approved)” • ติดตามสถานะการส่ง/ชำระ • สำหรับฝ่ายบัญชีเท่านั้น
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Badge color="error" badgeContent={planCount} invisible={planCount === 0}>
              <Button
                variant="outlined"
                startIcon={<EventAvailableIcon />}
                sx={blackBtnSx}
                onClick={async () => {
                  setOpenCreatePlan(true);
                  await loadPlanQueue();
                }}
              >
                ออกบิลตามแผน
              </Button>
            </Badge>

            <Button
              variant="outlined"
              startIcon={<ReceiptLongIcon />}
              sx={blackBtnSx}
              onClick={async () => {
                setOpenCreateTimesheet(true);
                await loadTimesheetCandidates();
              }}
            >
              ออกบิลจากเวลางาน
            </Button>

            <Button variant="outlined" startIcon={<RefreshIcon />} sx={blackBtnSx} onClick={async () => {
              await loadInvoices();
              // โหลดคิวแผนแบบเบาๆ เพื่อ update badge
              await loadPlanQueue();
            }}>
              รีเฟรช
            </Button>
          </Stack>
        </Stack>

        {/* Filters + Table */}
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              label="ค้นหา"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="เลขที่ใบแจ้งหนี้ / รหัสโครงการ / ชื่อลูกค้า"
              size="small"
              sx={{ minWidth: 260, flex: 1 }}
            />
            <TextField
              label="ประเภทบิล"
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 220 }}
            >
              {billTypeOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="สถานะ"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 200 }}
            >
              {statusOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" sx={blackBtnSx} onClick={loadInvoices}>
              ค้นหา/กรอง
            </Button>
          </Stack>

          {err ? (
            <Alert sx={{ mt: 2 }} severity="error">
              {err}
            </Alert>
          ) : null}

          <Divider sx={{ my: 2 }} />

          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                กำลังโหลดข้อมูล…
              </Typography>
            </Stack>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เลขที่ใบแจ้งหนี้</TableCell>
                    <TableCell>โครงการ</TableCell>
                    <TableCell>ลูกค้า</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>วันที่ออก</TableCell>
                    <TableCell>ครบกำหนด</TableCell>
                    <TableCell align="right">ยอดรวม (฿)</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="right" width={170}>
                      การทำงาน
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((r) => {
                    const sm = statusMeta(r.status);
                    const canApprove = r.status === 'DRAFT' || r.status === 'PENDING_APPROVAL';
                    const canSend = r.status === 'APPROVED';
                    const canPaid = r.status === 'SENT' || r.status === 'OVERDUE';
                    const canVoid = r.status !== 'PAID' && r.status !== 'VOID';

                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography fontWeight={800}>{r.invoice_no || '(ยังไม่ออกเลขที่)'}</Typography>
                          {r.period_start && r.period_end ? (
                            <Typography variant="caption" color="text.secondary">
                              งวด: {r.period_start} ถึง {r.period_end}
                            </Typography>
                          ) : null}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {r?.tpr_projects?.project_code || '-'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r?.tpr_projects?.name_th || '-'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {r?.tpr_customers?.name_th || r?.customer_billing_name || '-'}
                          </Typography>
                        </TableCell>

                        <TableCell>{typeLabel(r.bill_type)}</TableCell>
                        <TableCell>{r.invoice_date || '-'}</TableCell>
                        <TableCell>{r.due_date || '-'}</TableCell>
                        <TableCell align="right">{fmtMoney(r.total_amount)}</TableCell>

                        <TableCell>
                          <Chip size="small" label={sm.label} color={sm.color} variant="outlined" />
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="อนุมัติ">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={blackIconBtnSx}
                                  disabled={!canApprove}
                                  onClick={() => changeStatus(r.id, 'APPROVED')}
                                >
                                  <CheckCircleIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="ส่งให้ลูกค้า">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={blackIconBtnSx}
                                  disabled={!canSend}
                                  onClick={() =>
                                    changeStatus(r.id, 'SENT', { sent_at: new Date().toISOString() })
                                  }
                                >
                                  <SendIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="ทำเป็นชำระแล้ว">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={blackIconBtnSx}
                                  disabled={!canPaid}
                                  onClick={() =>
                                    changeStatus(r.id, 'PAID', { paid_at: new Date().toISOString() })
                                  }
                                >
                                  <PaidIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="ยกเลิก (Void)">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={blackIconBtnSx}
                                  disabled={!canVoid}
                                  onClick={() => changeStatus(r.id, 'VOID')}
                                >
                                  <BlockIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary">
                          ไม่พบข้อมูล
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      {/* Dialog: Plan queue (ครบกำหนดตามแผน) */}
      <Dialog open={openCreatePlan} onClose={() => setOpenCreatePlan(false)} maxWidth="md" fullWidth>
        <DialogTitle>คิวครบกำหนดตามแผนวางบิล (พร้อมออกใบแจ้งหนี้)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            รายการด้านล่างคือ “งวดตามแผน” ที่ถึงวันวางบิลแล้ว (billing_date ≤ วันนี้) และยังไม่ถูกสร้าง Invoice
          </Typography>

          {planErr ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {planErr}
            </Alert>
          ) : null}

          {planLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                กำลังโหลด…
              </Typography>
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>โครงการ</TableCell>
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell>งวด</TableCell>
                  <TableCell>วันที่วางบิล</TableCell>
                  <TableCell>ครบกำหนดชำระ</TableCell>
                  <TableCell align="right">ยอดตามแผน (฿)</TableCell>
                  <TableCell align="right">สร้าง</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {planRows.map((r) => (
                  <TableRow key={r.billing_period_id} hover>
                    <TableCell>
                      <Typography fontWeight={800}>{r.project_code}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {r.period_label || `งวดที่ ${r.period_no}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        รูปแบบ: {String(r.billing_pattern || '').toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.billing_date || '-'}</TableCell>
                    <TableCell>{r.due_date_calc || '-'}</TableCell>
                    <TableCell align="right">{fmtMoney(r.planned_amount)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        variant="contained"
                        sx={blackBtnSx}
                        onClick={() => createInvoiceFromPlanRow(r)}
                      >
                        สร้าง Draft
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {planRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        ไม่มีรายการครบกำหนดตามแผน
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={loadPlanQueue} startIcon={<RefreshIcon />} sx={blackBtnSx}>
            รีเฟรช
          </Button>
          <Button onClick={() => setOpenCreatePlan(false)} sx={blackBtnSx}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Create from approved timesheets */}
      <Dialog
        open={openCreateTimesheet}
        onClose={() => setOpenCreateTimesheet(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>สร้างใบแจ้งหนี้จาก Timesheet (Approved)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            เลือก “ก้อนงานรายเดือน” ที่อนุมัติแล้ว (และยังไม่ถูกบิล) แล้วกดสร้างเป็น Draft Invoice
          </Typography>

          {candErr ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {candErr}
            </Alert>
          ) : null}

          {candLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                กำลังโหลด…
              </Typography>
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>โครงการ</TableCell>
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell>ช่วงเวลา</TableCell>
                  <TableCell align="right">ชั่วโมงรวม</TableCell>
                  <TableCell align="right">ยอดประมาณการ (฿)</TableCell>
                  <TableCell align="right">สร้าง</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.candidate_key} hover>
                    <TableCell>
                      <Typography fontWeight={800}>{c.project_code}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.project_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.customer_name}</TableCell>
                    <TableCell>
                      {c.period_start} ถึง {c.period_end}
                    </TableCell>
                    <TableCell align="right">{Number(c.total_hours || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{fmtMoney(c.total_amount_estimated)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        variant="contained"
                        sx={blackBtnSx}
                        onClick={() => createInvoiceFromTimesheetCandidate(c)}
                      >
                        สร้าง Draft
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        ไม่มีรายการพร้อมออกบิล
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={loadTimesheetCandidates} startIcon={<RefreshIcon />} sx={blackBtnSx}>
            รีเฟรช
          </Button>
          <Button onClick={() => setOpenCreateTimesheet(false)} sx={blackBtnSx}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
