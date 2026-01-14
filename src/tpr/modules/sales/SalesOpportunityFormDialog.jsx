import * as React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Divider,
  TextField,
  Paper,
  InputAdornment,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  listCustomers,
  listEmployees,
  createOpportunity,
  updateOpportunity,
  getOpportunity,
  getEmployeeDisplayNameById,
  // createCustomerActivity removed
} from '../../functions/Sales';
import { useNotify } from '../../contexts/notifyContext';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
// BarChartRoundedIcon and PhoneRoundedIcon removed (status and additional info sections deleted)
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// status/probability UI removed

// addDaysISO removed

function SectionTitle({ icon, title, subtitle }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
      <Box sx={{ width: 3, height: 18, borderRadius: 999, bgcolor: 'primary.main' }} />
      <Box sx={{ width: 24, height: 24, display: 'grid', placeItems: 'center', fontSize: 18 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: 15 }}>{title}</Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function PillButton({ variant = 'outlined', children, ...props }) {
  return (
    <Button
      variant={variant}
      {...props}
      sx={{
        px: 2.5,
        height: 38,
        boxShadow: 'none',
        textTransform: 'none',
        fontSize: 14,
        ...(props.sx || {}),
      }}
    >
      {children}
    </Button>
  );
}

// Status pills removed

export default function SalesOpportunityFormDialog({ opportunityId, onClose, onSaved }) {
  const theme = useTheme();
  const mdDown = useMediaQuery(theme.breakpoints.down('md'));
  const notify = useNotify();

  const isCreate = !opportunityId;

  const [saving, setSaving] = React.useState(false);

  const [customers, setCustomers] = React.useState([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  const [openCustomerDialog, setOpenCustomerDialog] = React.useState(false);
  const [openEmployeeDialog, setOpenEmployeeDialog] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  const [form, setForm] = React.useState({
    project_name: '',
    customer_id: '',
    customer_display_name: '',
    estimated_value: '',
    expected_close_date: '',
    sales_owner: '',
    sales_owner_display_name: '',
  });

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // status handling removed

  const validate = () => {
    if (!form.project_name.trim()) return 'กรุณากรอกชื่อโครงการ';
    if (!form.customer_display_name.trim()) return 'กรุณาเลือกลูกค้า';

    // require estimated value
    if (form.estimated_value === '' || Number(form.estimated_value) <= 0) return 'กรุณาระบุมูลค่าโครงการเป็นตัวเลขมากกว่า 0';

    // ✅ โหมดสร้างใหม่ (Step 1) บังคับแค่นี้
    if (isCreate) {
      if (!form.sales_owner) return 'กรุณาเลือกผู้รับผิดชอบ';
      return '';
    }

    // full mode: require expected close date
    if (!form.expected_close_date) return 'กรุณาระบุวันที่คาดว่าจะปิดการขาย';
    return '';
  };

  const onSave = async () => {
    const msg = validate();
    if (msg) return notify.error(msg);

    setSaving(true);
    try {
      const payload = {
        project_name: form.project_name,
        customer_id: form.customer_id || null,
        estimated_value: form.estimated_value === '' ? 0 : Number(form.estimated_value) || 0,

        deadline_date: isCreate ? null : (form.expected_close_date || null),
        assigned_to: form.sales_owner || null,
      };

      let res;
      if (opportunityId) res = await updateOpportunity(opportunityId, payload);
      else res = await createOpportunity(payload);

      if (res?.error) throw res.error;

      // activity creation removed (status/additional info removed)

      notify.success('บันทึกสำเร็จ');
      onSaved?.(res.data || null);
      onClose?.();
    } catch (e) {
      notify.error(e?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // load existing opportunity when editing
  React.useEffect(() => {
    let mounted = true;
    if (!opportunityId) return;

    (async () => {
      try {
        const { data, error } = await getOpportunity(opportunityId);
        if (!mounted) return;
        if (error) {
          console.error('getOpportunity error', error);
          notify.error('ไม่สามารถโหลดข้อมูลโอกาสได้');
          return;
        }

        if (data) {
          setForm((prev) => ({
            ...prev,
            project_name: data.project_name || prev.project_name,
            customer_id: data.customer_id || prev.customer_id,
            customer_display_name: (data.customer && (data.customer.name_th || data.customer.name_en)) || prev.customer_display_name,
            estimated_value: data.estimated_value ?? prev.estimated_value,
            expected_close_date: data.deadline_date || prev.expected_close_date,
            sales_owner: data.assigned_to || prev.sales_owner,
            sales_owner_display_name: prev.sales_owner_display_name || '',
          }));

          if (data.assigned_to) {
            const { data: name, error: nameErr } = await getEmployeeDisplayNameById(data.assigned_to);
            if (!nameErr && name) setField('sales_owner_display_name', name);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [opportunityId, notify]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCustomers(true);
      try {
        const { data, error } = await listCustomers({ limit: 200 });
        if (!mounted) return;
        if (error) console.error('listCustomers error', error);
        else setCustomers(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingCustomers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingEmployees(true);
      try {
        const { data, error } = await listEmployees({ limit: 200 });
        if (!mounted) return;
        if (error) console.error('listEmployees error', error);
        else setEmployees(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingEmployees(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = React.useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return (customers || []).filter((c) => {
      const name = `${c.name_th || ''} ${c.name_en || ''} ${c.customer_id || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [customers, customerSearch]);

  const filteredEmployees = React.useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return (employees || []).filter((emp) => {
      const name = `${emp.employee_code || ''} ${emp.title_th || ''} ${emp.first_name_th || ''} ${emp.last_name_th || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [employees, employeeSearch]);

  return (
    <Box sx={{ px: mdDown ? 1 : 2, pb: mdDown ? 1 : 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
        <Paper elevation={0} sx={{ boxShadow: 'none', overflow: 'hidden', borderRadius: '6px' }}>
          <Box sx={{ p: mdDown ? 2 : 3 }}>
            {/* Section 1 */}
            <Box sx={{ mb: 3 }}>
              <SectionTitle
                icon={<BusinessRoundedIcon />}
                title="ข้อมูลโครงการ"
                subtitle={isCreate ? 'กรอกข้อมูลขั้นต่ำเพื่อสร้างโอกาสใหม่' : undefined}
              />

              <Stack spacing={2.5}>
                <TextField
                  size="small"
                  fullWidth
                  label="ชื่อโครงการ *"
                  value={form.project_name}
                  onChange={(e) => setField('project_name', e.target.value)}
                  placeholder="เช่น ทางด่วนระหว่างเมือง C"
                />

                <TextField
                  size="small"
                  fullWidth
                  label="ลูกค้า *"
                  value={form.customer_display_name || ''}
                  placeholder="เลือกจากรายการลูกค้า"
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCustomerSearch('');
                            setOpenCustomerDialog(true);
                          }}
                          disabled={loadingCustomers}
                          edge="end"
                        >
                          <SearchRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onClick={() => {
                    setCustomerSearch('');
                    setOpenCustomerDialog(true);
                  }}
                />

                <TextField
                  size="small"
                  fullWidth
                  label="มูลค่าโครงการ (โดยประมาณ)"
                  value={form.estimated_value}
                  onChange={(e) => setField('estimated_value', e.target.value)}
                  type="number"
                  inputProps={{ min: 0, style: { textAlign: 'right' } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                  }}
                />

                <TextField
                  size="small"
                  fullWidth
                  label={isCreate ? 'ผู้รับผิดชอบ *' : 'ผู้รับผิดชอบ'}
                  value={form.sales_owner_display_name || ''}
                  placeholder="เลือกจากรายชื่อพนักงาน"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEmployeeSearch('');
                            setOpenEmployeeDialog(true);
                          }}
                          disabled={loadingEmployees}
                          edge="end"
                        >
                          <SearchRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onClick={() => {
                    setEmployeeSearch('');
                    setOpenEmployeeDialog(true);
                  }}
                />

                {/* Full edit mode removed (status & additional info) */}
              </Stack>
            </Box>

            <Stack direction="row" justifyContent="center" spacing={1.5} sx={{ mt: 3, pt: 3, borderColor: 'grey.200' }}>
              <PillButton variant="outlined" onClick={onClose} disabled={saving} startIcon={<CloseRoundedIcon />}>
                ปิด
              </PillButton>
              <PillButton
                variant="contained"
                onClick={onSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </PillButton>
            </Stack>
          </Box>

          {/* เลือกลูกค้า */}
          <Dialog open={openCustomerDialog} onClose={() => setOpenCustomerDialog(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>เลือกลูกค้า</DialogTitle>
            <DialogContent dividers>
              <TextField
                size="small"
                fullWidth
                label="ค้นหาลูกค้า"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="พิมพ์ชื่อ / รหัสลูกค้า"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />

              {loadingCustomers ? (
                <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={22} />
                </Box>
              ) : (
                <List dense sx={{ p: 0 }}>
                  {filteredCustomers.map((c) => {
                    const display = c.name_th || c.name_en || c.customer_id || '-';
                    const secondary = c.customer_id ? `รหัส: ${c.customer_id}` : '';
                    return (
                      <ListItemButton
                        key={c.id}
                        onClick={() => {
                          setField('customer_id', c.id);
                          setField('customer_display_name', display);
                          setOpenCustomerDialog(false);
                        }}
                      >
                        <ListItemText primary={display} secondary={secondary} />
                      </ListItemButton>
                    );
                  })}
                  {!filteredCustomers.length ? (
                    <Box sx={{ py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        ไม่พบลูกค้าที่ตรงกับคำค้นหา
                      </Typography>
                    </Box>
                  ) : null}
                </List>
              )}
            </DialogContent>
          </Dialog>

          {/* เลือกพนักงาน */}
          <Dialog open={openEmployeeDialog} onClose={() => setOpenEmployeeDialog(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>เลือกผู้รับผิดชอบ</DialogTitle>
            <DialogContent dividers>
              <TextField
                size="small"
                fullWidth
                label="ค้นหาพนักงาน"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="พิมพ์ชื่อ / รหัสพนักงาน"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />

              {loadingEmployees ? (
                <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={22} />
                </Box>
              ) : (
                <List dense sx={{ p: 0 }}>
                  {filteredEmployees.map((emp) => {
                    const name = `${emp.title_th || ''}${emp.title_th ? ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
                    const display = emp.employee_code ? `${emp.employee_code} — ${name}` : name;
                    const secondary = [emp.position, emp.department_name].filter(Boolean).join(' • ');
                    return (
                      <ListItemButton
                        key={emp.id}
                        onClick={() => {
                          setField('sales_owner', emp.id);
                          setField('sales_owner_display_name', display);
                          setOpenEmployeeDialog(false);
                        }}
                      >
                        <ListItemText primary={display || '-'} secondary={secondary || undefined} />
                      </ListItemButton>
                    );
                  })}
                  {!filteredEmployees.length ? (
                    <Box sx={{ py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        ไม่พบพนักงานที่ตรงกับคำค้นหา
                      </Typography>
                    </Box>
                  ) : null}
                </List>
              )}
            </DialogContent>
          </Dialog>
        </Paper>
      </LocalizationProvider>
    </Box>
  );
}
