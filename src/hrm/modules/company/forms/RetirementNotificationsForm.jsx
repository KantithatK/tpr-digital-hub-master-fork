// FILE: src/hrm/modules/company/forms/BirthdayNotificationsForm.jsx
import * as React from "react";
import {
  Card, CardContent, Box, Typography, FormControlLabel, Checkbox, TextField, Stack,
  Autocomplete, IconButton, Tooltip, Table, TableBody, TableHead, TableRow, TableCell,
  TableContainer, InputAdornment,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import ActionsRow from "./ActionsRow";
import { supabase } from "@/lib/supabaseClient";

/**
 * ฟอร์มแจ้งเตือนวันเกิดพนักงาน
 * ตาราง: option_birthday_notifications
 */
export default function BirthdayNotificationsForm({ value, onChange, onSave, onReset, loading }) {
  const enabled = !!value?.is_enabled;
  const [employees, setEmployees] = React.useState([]);         // options จาก employees
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [selected, setSelected] = React.useState(Array.isArray(value?.employees) ? value.employees : []);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // map แถวจาก employees -> { id, name }
  const toPerson = React.useCallback((r) => {
    if (!r) return null;
    const id = r.employee_id?.toString().trim();
    const name = (
      r.employee_name ||
      [r.first_name, r.last_name].filter(Boolean).join(" ") ||  // why: รองรับกรณีมีคอลัมน์แยกชื่อ-สกุล
      ""
    ).trim();
    if (!id || !name) return null; // why: กันข้อมูลไม่ครบ
    return { id, name };
  }, []);

  // โหลดรายการจาก employees
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      setUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("employee_id, employee_name")
          .order("employee_name", { ascending: true });
        if (error) throw error;

        const opts = (data || [])
          .map(toPerson)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, "th"));

        if (!ignore) setEmployees(opts);
      } catch (err) {
        console.error("Load employees failed:", err);
      } finally {
        if (!ignore) setUsersLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [toPerson]);

  // Prefill รายชื่อที่เคยเลือกไว้จาก option_notify_employees (sequence = 1)
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("option_notify_employees")
          .select("employee_id, employee_name")
          .eq("notify_type_sequence", 1);
        if (error) throw error;
        const picked = (data || [])
          .map((r) => ({ id: String(r.employee_id), name: r.employee_name }))
          .filter((x) => x.id && x.name);

        if (!ignore) {
          setSelected(picked);
          onChange?.({ employees: picked });
        }
      } catch (err) {
        console.error("Load option_notify_employees failed:", err);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDaysChange = (e) => {
    const v = Math.max(0, parseInt(e.target.value || 0, 10));
    onChange({ notify_before_days: Number.isFinite(v) ? v : 0 });
  };

  const handleSelectChange = (val) => {
    setSelected(val);
    onChange?.({ employees: val });
    setOpen(false);
    setInputValue("");
  };

  const removeUser = (id) => {
    const next = selected.filter((u) => u.id !== id);
    setSelected(next);
    onChange?.({ employees: next });
  };

  const shouldScroll = selected.length >= 5;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2, alignItems: "center" }}>
            <FormControlLabel
              control={<Checkbox checked={enabled} onChange={(e) => onChange({ is_enabled: e.target.checked })} />}
              label="เปิดการแจ้งเตือนแจ้งเตือนวันเกิดพนักงาน"
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="แจ้งเตือนล่วงหน้า (วัน)"
              type="number"
              size="small"
              inputProps={{ min: 0, max: 366 }}
              value={Number.isFinite(value?.notify_before_days) ? value.notify_before_days : 0}
              onChange={handleDaysChange}
              disabled={!enabled}
            />
          </Box>

          <Box>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={employees}
              getOptionLabel={(o) => o?.name || ""}
              value={selected}
              onChange={(e, val) => handleSelectChange(val)}
              isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
              renderTags={() => null}
              inputValue={inputValue}
              onInputChange={(e, v) => setInputValue(v)}
              open={open}
              onOpen={() => setOpen(true)}
              onClose={() => setOpen(false)}
              loading={usersLoading}
              filterSelectedOptions
              disabled={!enabled}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ค้นหาและเลือกพนักงาน (ชื่อเต็ม)"
                  placeholder={usersLoading ? "กำลังโหลด..." : "พิมพ์เพื่อค้นหา..."}
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            <TableContainer sx={{ maxHeight: shouldScroll ? 200 : "unset", overflowY: shouldScroll ? "auto" : "visible" }}>
              <Table stickyHeader size="small" sx={{ "& th, & td": { borderBottom: "none" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: "bold" }}>รายชื่อพนักงาน</TableCell>
                    <TableCell align="right" sx={{ bgcolor: "grey.200", fontWeight: "bold" }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography color="text.secondary">ยังไม่มีพนักงานที่เลือก</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selected.map((u, idx) => (
                      <TableRow key={u.id || idx} hover>
                        <TableCell><Typography variant="body2">🎂 {u.name}</Typography></TableCell>
                        <TableCell align="right">
                          <Tooltip title="ลบ">
                            <span>
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                size="small"
                                color="error"
                                onClick={() => removeUser(u.id)}
                                disabled={!enabled}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ px: 2, py: 1, textAlign: "right", borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption">พนักงานที่เลือก {selected.length} คน</Typography>
            </Box>
          </Box>

          <ActionsRow onSave={onSave} onReset={onReset} loading={loading} />
        </Stack>
      </CardContent>
    </Card>
  );
}
