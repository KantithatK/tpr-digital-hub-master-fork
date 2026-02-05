// ===== src/tpr/modules/projects/ProjectMainTask.jsx (แทนทั้งไฟล์) =====
import * as React from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import Badge from "@mui/material/Badge";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import InputAdornment from "@mui/material/InputAdornment";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import ReactApexChart from "react-apexcharts";

// ✅ Logic layer
import * as MainTask from "../../functions/MainTask";
import Projects from "../../functions/Projects";

const BRAND = "#ff4059";

// use Thai locale for datepickers
try {
  dayjs.locale && dayjs.locale("th");
} catch {
  /* ignore */
}

const STATUS_COLORS = {
  "ยังไม่เริ่ม": "#64748B",
  "กำลังทำ": "#fdca01",
  "เสร็จแล้ว": "#08d84c",
};

function normalizeWbsStatus(s) {
  if (Projects?.normalizeWbsStatus) return Projects.normalizeWbsStatus(s);
  const raw = String(s || '').trim();
  if (raw === 'เสร็จแล้ว' || raw === 'DONE' || raw.toLowerCase() === 'done') return 'เสร็จแล้ว';
  if (raw === 'กำลังทำ' || raw === 'ทำอยู่' || raw === 'IN_PROGRESS' || raw.toLowerCase() === 'in_progress') return 'กำลังทำ';
  return 'ยังไม่เริ่ม';
}

function fallbackProgressFromStatus(status) {
  const st = normalizeWbsStatus(status);
  if (st === 'เสร็จแล้ว') return 100;
  if (st === 'กำลังทำ') return 50;
  return 0;
}

// รายชื่อผู้รับผิดชอบที่เลือกได้ ต้องดึงจากสมาชิกของโปรเจค (tpr_project_members)
// และให้ UI เรียกผ่าน logic layer: MainTask.listProjectMembers

function formatEmployeeFull(emp) {
  if (!emp) return "";
  const code = String(emp.employee_code || "").trim();
  const th = [
    String(emp.title_th || "").trim(),
    String(emp.first_name_th || "").trim(),
    String(emp.last_name_th || "").trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const en = [
    String(emp.title_en || "").trim(),
    String(emp.first_name_en || "").trim(),
    String(emp.last_name_en || "").trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nick = String(emp.nickname_th || emp.nickname_en || "").trim();
  const name = th || en || nick;
  if (code && name) return `${name}`;
  return name || code || "";
}

function formatEmployeeShort(emp) {
  if (!emp) return "";
  const first = String(emp.first_name_th || emp.first_name_en || emp.nickname_th || emp.nickname_en || "").trim();
  const last = String(emp.last_name_th || emp.last_name_en || "").trim();
  const lastInitial = last ? `${last.slice(0, 1)}.` : "";
  return `${first} ${lastInitial}`.trim();
}

function uniqStrings(list) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(list) ? list : []) {
    const s = String(x || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildOwnersSummary(ownerIds, employees) {
  const ids = uniqStrings(ownerIds);
  if (ids.length === 0) return "";

  const map = new Map((Array.isArray(employees) ? employees : []).map((e) => [String(e?.id || ""), e]));
  const names = ids
    .map((id) => formatEmployeeShort(map.get(String(id)) || null) || "ไม่ทราบชื่อ")
    .filter(Boolean);

  const head = names.slice(0, 2);
  const rest = Math.max(0, names.length - head.length);
  return rest > 0 ? `${head.join(", ")} +${rest}` : head.join(", ");
}

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function fmtThaiRange(startISO, endISO) {
  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };
  const a = fmt(startISO);
  const b = fmt(endISO);
  if (a && b) return `${a}–${b}`;
  return a || b || "";
}

function parseISODateOnlyToMs(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).slice(0, 10));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function toDayjsDate(iso) {
  try {
    const s = String(iso || "").trim();
    if (!s) return null;
    const d = dayjs(s);
    if (!d || !d.isValid || !d.isValid()) return null;
    return d.startOf("day");
  } catch {
    return null;
  }
}

function formatNumber(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function validatePlannedHoursText(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n)) return "กรุณากรอกชั่วโมงเป็นตัวเลข";
  if (n <= 0) return "ชั่วโมงต้องมากกว่า 0";
  return "";
}

function KpiTile({ label, value, sub, color }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 1.25,
        px: 1.75,
        py: 1.4,
        minWidth: 0,
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 900 }}>
          {label}
        </Typography>

      </Box>
      <Typography
        sx={{
          mt: 0.15,
          fontSize: 28,
          fontWeight: 950,
          lineHeight: 1.05,
          color: color || "text.primary",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

function StatusPill({ status }) {
  const st = normalizeWbsStatus(status);
  const map = {
    'ยังไม่เริ่ม': { label: 'ยังไม่เริ่ม', dot: '#64748B', border: '#64748B' },
    'กำลังทำ': { label: 'กำลังทำ', dot: '#fdca01', border: '#fdca01' },
    'เสร็จแล้ว': { label: 'เสร็จแล้ว', dot: '#08d84c', border: '#08d84c' },
  };
  const cfg = map[st] || map['ยังไม่เริ่ม'];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        borderRadius: 999,
        border: "1px solid",
        borderColor: cfg.border,
        bgcolor: "#fff",
        width: "fit-content",
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: 99, bgcolor: cfg.dot }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: cfg.dot, lineHeight: 1 }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

function TasksTable({ loading, rows, onRowClick, onEditRow, onDeleteRow }) {
  const list = Array.isArray(rows) ? rows : [];

  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [menuRow, setMenuRow] = React.useState(null);

  const handleOpenMenu = React.useCallback((e, r) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuRow(r || null);
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setMenuAnchor(null);
    setMenuRow(null);
  }, []);

  const clampPct = Projects?.clampPct ? Projects.clampPct : (v) => clamp(v, 0, 100);

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer sx={{ width: "100%" }}>
        <Table size="small" sx={{ "& th, & td": { py: 1, px: 1.5, borderBottom: "none" } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "transparent" }}>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 86 }}>ลำดับ</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>ชื่องานหลัก</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 130 }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: 170 }}>ความคืบหน้า</TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  display: { xs: "none", md: "table-cell" },
                  textAlign: "center",
                }}
              >
                ช่วงเวลา
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary", textAlign: "center", width: 90 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton variant="text" width={46} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={240} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={92} height={24} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={140} height={10} />
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" }, textAlign: "center" }}>
                    <Skeleton variant="text" width={90} />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Skeleton variant="text" width={40} />
                  </TableCell>
                </TableRow>
              ))
              : list.map((r, idx) => {
                const key = r.id || r.code || idx;
                const progressRaw = r?.progress;
                const progressNum = progressRaw === null || progressRaw === undefined || progressRaw === "" ? NaN : Number(progressRaw);
                const pct = clampPct(Number.isFinite(progressNum) ? progressNum : fallbackProgressFromStatus(r.status));
                const seq = r?.seq || `T-${idx + 1}`;

                return (
                  <TableRow
                    key={key}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      try {
                        onRowClick?.(r);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: 14 }}>{seq}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 14 }}>{r.name || "-"}</Typography>
                    </TableCell>

                    <TableCell>
                      <StatusPill status={r.status || "ยังไม่เริ่ม"} />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 8,
                              borderRadius: 99,
                              bgcolor: "#e2e8f0",
                              "& .MuiLinearProgress-bar": { bgcolor: "#08d84c" },
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500, minWidth: 40, textAlign: "right" }}>
                          {`${Math.round(pct)}%`}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ display: { xs: "none", md: "table-cell" }, textAlign: "center" }}>
                      {r.dateRange || "-"}
                    </TableCell>

                    <TableCell sx={{ textAlign: "center" }}>
                      <IconButton onClick={(e) => handleOpenMenu(e, r)} aria-label="เมนูเพิ่มเติม">
                        <MoreHorizIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}

            {!loading && list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">

                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        id="task-row-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            try {
              onEditRow?.(menuRow);
            } catch {
              // ignore
            }
            handleCloseMenu();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> แก้ไข
        </MenuItem>

        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            try {
              onDeleteRow?.(menuRow);
            } catch {
              // ignore
            }
            handleCloseMenu();
          }}
        >
          <DeleteIcon color="error" fontSize="small" sx={{ mr: 1 }} /> ลบข้อมูล
        </MenuItem>
      </Menu>
    </Box>
  );
}

function CardShell({ title, subtitle, children, right }) {
  return (
    <Box sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 1.25, p: 1.25, minWidth: 0, bgcolor: "#fff" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 900, mb: 0.25 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {right ? <Box sx={{ flexShrink: 0 }}>{right}</Box> : null}
      </Box>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
}

export default function ProjectMainTask({
  project,
  workstream,
  phase,
  onBack,
  onGoWork,
  onNavProjects,
  onNavProject,
  onNavWorkstreams,
}) {
  const CHART_COLORS = ["#64748B", "#fdca01", "#ff4059", "#8B5CF6", "#08d84c"];

  const projectId = project?.id || null;
  const projectName = project?.name_th || project?.name || project?.name_en || "";

  const wsId = workstream?.id || null;
  const wsName = workstream?.name || "";

  const phaseId = phase?.id || null;
  const phaseName = phase?.name || "";

  const phaseStartISO = phase?.start_date || "";
  const phaseEndISO = phase?.end_date || "";
  const phaseStartDay = React.useMemo(() => toDayjsDate(phaseStartISO), [phaseStartISO]);
  const phaseEndDay = React.useMemo(() => toDayjsDate(phaseEndISO), [phaseEndISO]);

  const [tasksState, setTasksState] = React.useState(() => ({
    loading: true,
    rows: [],
  }));

  const [deleteDialog, setDeleteDialog] = React.useState(() => ({
    open: false,
    row: null,
    deleting: false,
  }));

  const [alertAnchor, setAlertAnchor] = React.useState(null);

  // ===== Owner picker dialog state (multi owners) =====
  const [employees, setEmployees] = React.useState([]);
  const [ownerDialogOpen, setOwnerDialogOpen] = React.useState(false);
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [ownerSelections, setOwnerSelections] = React.useState([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!projectId) {
          setEmployees([]);
          return;
        }
        const list = await MainTask.listProjectMembers({ projectId });
        if (!alive) return;
        setEmployees(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("[ProjectMainTask] Failed to load project members", e);
        if (alive) setEmployees([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filteredEmployees = React.useMemo(() => {
    const q = String(employeeSearch || "").trim().toLowerCase();
    const list = Array.isArray(employees) ? employees : [];
    if (!q) return list;

    return list.filter((e) => {
      const hay = [
        String(e?.employee_code || "").trim(),
        String(e?.title_th || "").trim(),
        String(e?.first_name_th || "").trim(),
        String(e?.last_name_th || "").trim(),
        String(e?.title_en || "").trim(),
        String(e?.first_name_en || "").trim(),
        String(e?.last_name_en || "").trim(),
        String(e?.nickname_th || "").trim(),
        String(e?.nickname_en || "").trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [employeeSearch, employees]);

  const [taskDialog, setTaskDialog] = React.useState(() => ({
    open: false,
    mode: "create", // create | edit
    saving: false,
    autoCalcDirty: false,
    plannedHoursAuto: false,
    form: {
      id: null,
      code: "",
      name: "",
      status: "ยังไม่เริ่ม",
      start_date: "",
      end_date: "",
      planned_hours: "",
      billable_mode: "billable",
      owners: [],
    },
    errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
  }));

  const reloadTasks = React.useCallback(async () => {
    if (!projectId || !phaseId) {
      setTasksState({ loading: false, rows: [] });
      return;
    }

    try {
      setTasksState({ loading: true, rows: [] });
      await new Promise((r) => setTimeout(r, 200));

      const taskRows = await MainTask.listTasks({ projectId, phaseId, workstreamId: wsId });

      const mapped = (Array.isArray(taskRows) ? taskRows : []).map((r, idx) => {
        const st = String(r?.metadata?.status || "").trim() || "ยังไม่เริ่ม";
        return {
          ...r,
          seq: `T-${idx + 1}`,
          status: st,
          planned_hours: r?.planned_hours != null ? Number(r.planned_hours || 0) : 0,
          dateRange: fmtThaiRange(r?.start_date, r?.end_date),
        };
      });

      setTasksState({ loading: false, rows: mapped });
    } catch (e) {
      console.error("reloadTasks error:", e);
      setTasksState({ loading: false, rows: [] });
    }
  }, [phaseId, projectId, wsId]);

  React.useEffect(() => {
    reloadTasks();
  }, [reloadTasks]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    } catch {
      // ignore
    }
  }, [projectId, wsId, phaseId]);


  const openCreateDialog = React.useCallback(() => {
    setTaskDialog({
      open: true,
      mode: "create",
      saving: false,
      autoCalcDirty: false,
      plannedHoursAuto: false,
      form: {
        id: null,
        code: MainTask.genTaskCode(),
        name: "",
        status: "ยังไม่เริ่ม",
        start_date: "",
        end_date: "",
        planned_hours: "",
        billable_mode: "billable",
        owners: [],
      },
      errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
    });
  }, []);

  const openEditDialog = React.useCallback((row) => {
    const st = String(row?.metadata?.status || row?.status || "ยังไม่เริ่ม").trim() || "ยังไม่เริ่ม";
    const preOwners = Array.isArray(row?.owners) ? row.owners.map((o) => o?.employee_id).filter(Boolean) : [];
    setTaskDialog({
      open: true,
      mode: "edit",
      saving: false,
      autoCalcDirty: false,
      plannedHoursAuto: true,
      form: {
        id: row?.id || null,
        code: row?.code || "",
        name: row?.name || "",
        status: st,
        start_date: row?.start_date || "",
        end_date: row?.end_date || "",
        planned_hours: row?.planned_hours != null ? String(Number(row.planned_hours || 0)) : "",
        billable_mode: row?.billable_mode || "billable",
        owners: uniqStrings(preOwners),
      },
      errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
    });
  }, []);

  const closeTaskDialog = React.useCallback(() => {
    setTaskDialog((prev) => ({ ...prev, open: false, saving: false }));
  }, []);

  // auto-calc end_date when start_date/planned_hours changes
  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!taskDialog.open) return;
      if (!taskDialog.autoCalcDirty) return;

      const start_date = String(taskDialog?.form?.start_date || "").trim();
      const planned_hours = String(taskDialog?.form?.planned_hours ?? "").trim();

      const plannedErr = validatePlannedHoursText(planned_hours);
      if (plannedErr) {
        setTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), planned_hours: plannedErr } }));
        return;
      }

      const hoursNum = Number(planned_hours || 0);
      if (!start_date || !Number.isFinite(hoursNum) || hoursNum <= 0) return;

      const res = await MainTask.calcTaskEndDateFromPlannedHours({
        start_date,
        planned_hours: hoursNum,
        boundary_start: phaseStartISO || "",
        boundary_end: phaseEndISO || "",
      });

      if (!alive) return;
      if (!res?.ok) return;

      setTaskDialog((prev) => ({
        ...prev,
        form: { ...prev.form, start_date: res.startISO || start_date, end_date: res.endISO || "" },
        errors: { ...(prev.errors || {}), planned_hours: "" },
      }));
    }

    run();
    return () => {
      alive = false;
    };
  }, [taskDialog.autoCalcDirty, taskDialog.form.planned_hours, taskDialog.form.start_date, taskDialog.open, phaseEndISO, phaseStartISO]);

  // inverse calc planned_hours from dates (if planned empty or auto)
  React.useEffect(() => {
    let alive = true;

    async function runInv() {
      if (!taskDialog.open) return;

      const start = String(taskDialog?.form?.start_date || "").trim();
      const end = String(taskDialog?.form?.end_date || "").trim();
      const planned = String(taskDialog?.form?.planned_hours ?? "").trim();
      const plannedAuto = Boolean(taskDialog?.plannedHoursAuto);

      if (!start || !end) return;
      if (planned && !plannedAuto) return;

      const res = await MainTask.calcTaskPlannedHoursFromDates({ start_date: start, end_date: end });
      if (!alive) return;
      if (!res?.ok) return;

      const nextPlanned = res?.planned_hours ? String(res.planned_hours) : "";

      setTaskDialog((prev) => ({
        ...prev,
        plannedHoursAuto: true,
        form: { ...prev.form, planned_hours: nextPlanned },
        errors: { ...(prev.errors || {}), planned_hours: "" },
      }));
    }

    runInv();
    return () => {
      alive = false;
    };
  }, [taskDialog.form.end_date, taskDialog.form.start_date, taskDialog.form.planned_hours, taskDialog.open, taskDialog.plannedHoursAuto]);

  const ownersSummary = React.useMemo(
    () => buildOwnersSummary(taskDialog?.form?.owners, employees),
    [employees, taskDialog?.form?.owners]
  );

  const openOwnerPicker = React.useCallback(() => {
    const current = uniqStrings(taskDialog?.form?.owners);
    setOwnerSelections(current);
    setEmployeeSearch("");
    setOwnerDialogOpen(true);
  }, [taskDialog?.form?.owners]);

  const closeOwnerPicker = React.useCallback(() => {
    setOwnerDialogOpen(false);
  }, []);

  const toggleOwnerSelection = React.useCallback((employeeId) => {
    const id = String(employeeId || "").trim();
    if (!id) return;
    setOwnerSelections((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  }, []);

  const confirmOwnerPicker = React.useCallback(() => {
    const nextOwners = uniqStrings(ownerSelections);
    setTaskDialog((prev) => ({
      ...prev,
      form: { ...prev.form, owners: nextOwners },
      errors: { ...(prev.errors || {}), owner: "" },
    }));
    setOwnerDialogOpen(false);
  }, [ownerSelections]);

  const saveTask = React.useCallback(async () => {
    if (!projectId || !phaseId) return;

    const form = taskDialog.form || {};
    const code = String(form.code || "").trim();
    const name = String(form.name || "").trim();
    const owners = uniqStrings(form.owners);
    const billable_mode = String(form.billable_mode || "billable").trim() || "billable";
    const status = String(form.status || "ยังไม่เริ่ม").trim() || "ยังไม่เริ่ม";

    if (!code || !name) {
      window.alert("กรุณากรอก รหัส และ ชื่องานหลัก");
      return;
    }

    if (owners.length === 0) {
      setTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), owner: "กรุณาระบุผู้รับผิดชอบ" } }));
      return;
    }

    if (!phaseStartISO || !phaseEndISO) {
      window.alert("เฟสยังไม่มีช่วงวันที่เริ่ม/สิ้นสุด จึงไม่สามารถสร้าง/แก้ไข งานหลัก ได้");
      return;
    }

    if (!form.start_date) {
      setTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), start_date: "กรุณาเลือกวันที่เริ่ม" } }));
      return;
    }
    if (!form.end_date) {
      setTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), end_date: "กรุณาเลือกวันที่สิ้นสุด" } }));
      return;
    }

    const plannedErr = validatePlannedHoursText(form.planned_hours);
    if (plannedErr) {
      setTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), planned_hours: plannedErr } }));
      return;
    }

    const rangeRes = MainTask.validateTaskRangeWithinPhase({
      start_date: form.start_date,
      end_date: form.end_date,
      phase_start: phaseStartISO,
      phase_end: phaseEndISO,
    });

    if (!rangeRes?.ok) {
      window.alert(rangeRes?.messageTh || "ช่วงวันที่ไม่ถูกต้อง");
      return;
    }

    setTaskDialog((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        project_id: projectId,
        phase_id: phaseId,
        workstream_id: wsId || null,
        workstream_code: workstream?.code || null,
        code,
        name,
        planned_hours: Number(form.planned_hours || 0),
        start_date: form.start_date,
        end_date: form.end_date,
        billable_mode,
        metadata: { ...(form.metadata || {}), status },
      };

      if (taskDialog.mode === "edit" && form.id) {
        await MainTask.updateTask(form.id, { ...payload, owners });
      } else {
        await MainTask.createTask({ ...payload, owners });
      }

      closeTaskDialog();
      await reloadTasks();
    } catch (e) {
      console.error("saveTask error:", e);
      window.alert(`บันทึกล้มเหลว: ${String(e?.message || e)}`);
      setTaskDialog((prev) => ({ ...prev, saving: false }));
    }
  }, [closeTaskDialog, phaseEndISO, phaseId, phaseStartISO, projectId, reloadTasks, taskDialog.form, taskDialog.mode, wsId, workstream?.code]);

  const openDeleteDialog = React.useCallback((row) => {
    setDeleteDialog({ open: true, row: row || null, deleting: false });
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setDeleteDialog((prev) => ({ ...prev, open: false, deleting: false, row: null }));
  }, []);

  const confirmDelete = React.useCallback(async () => {
    const row = deleteDialog.row || null;
    const id = row?.id || null;
    if (!id) return;

    setDeleteDialog((prev) => ({ ...prev, deleting: true }));

    try {
      await MainTask.deleteTask(id);
      closeDeleteDialog();
      await reloadTasks();
    } catch (e) {
      console.error("deleteTask error:", e);
      window.alert(`ลบไม่สำเร็จ: ${String(e?.message || e)}`);
      setDeleteDialog((prev) => ({ ...prev, deleting: false }));
    }
  }, [closeDeleteDialog, deleteDialog.row, reloadTasks]);

  const analytics = React.useMemo(() => {
    const rows = Array.isArray(tasksState.rows) ? tasksState.rows : [];
    const statuses = ["ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"];

    const base = {
      total: rows.length,
      done: 0,
      hoursTotal: 0,
      byStatus: statuses.reduce((acc, s) => ((acc[s] = 0), acc), {}),
      hoursByStatus: statuses.reduce((acc, s) => ((acc[s] = 0), acc), {}),
    };

    for (const r of rows) {
      const st = normalizeWbsStatus(r?.status);

      base.byStatus[st] += 1;
      if (st === "เสร็จแล้ว") base.done += 1;

      const h = Number(r?.planned_hours || 0);
      base.hoursTotal += Number.isFinite(h) ? h : 0;
      base.hoursByStatus[st] += Number.isFinite(h) ? h : 0;
    }

    const clampPct = Projects?.clampPct ? Projects.clampPct : (v) => clamp(v, 0, 100);
    const progressList = rows
      .map((r) => {
        const v = r?.progress;
        const n = v === null || v === undefined || v === '' ? NaN : Number(v);
        return Number.isFinite(n) ? clampPct(n) : null;
      })
      .filter((x) => x !== null);

    const progressPct =
      progressList.length > 0
        ? clampPct(Math.round(progressList.reduce((sum, x) => sum + Number(x || 0), 0) / progressList.length))
        : (base.total > 0 ? Math.round((base.done / base.total) * 100) : 0);

    const notDoneCount = rows.reduce((acc, r) => {
      const v = r?.progress;
      const n = v === null || v === undefined || v === '' ? NaN : Number(v);
      if (Number.isFinite(n)) return acc + (clampPct(n) < 100 ? 1 : 0);
      return acc + (normalizeWbsStatus(r?.status) !== 'เสร็จแล้ว' ? 1 : 0);
    }, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const active = rows.filter((r) => {
      const v = r?.progress;
      const n = v === null || v === undefined || v === '' ? NaN : Number(v);
      if (Number.isFinite(n)) return clampPct(n) < 100;
      return normalizeWbsStatus(r?.status) !== 'เสร็จแล้ว';
    });
    const dueSoon = [];
    let overdueCount = 0;

    for (const r of active) {
      const endMs = parseISODateOnlyToMs(r?.end_date);
      if (!Number.isFinite(endMs)) continue;
      const diffDays = Math.floor((endMs - todayMs) / (24 * 60 * 60 * 1000));
      if (diffDays < 0) overdueCount += 1;
      else if (diffDays <= 7) {
        dueSoon.push({ id: r?.id, name: r?.name || r?.code || "—", endMs });
      }
    }
    dueSoon.sort((a, b) => (a.endMs || 0) - (b.endMs || 0));

    const topHours = [...rows]
      .map((r) => ({
        id: r?.id,
        label: String(r?.seq || r?.code || "T-?"),
        name: r?.name || "",
        planned: Number(r?.planned_hours || 0),
        status: normalizeWbsStatus(r?.status),
      }))
      .filter((x) => Number.isFinite(x.planned))
      .sort((a, b) => (b.planned || 0) - (a.planned || 0))
      .slice(0, 8);

    const topHoursSeries = [
      {
        name: "ชั่วโมงวางแผน",
        data: topHours.map((t) => Math.round(t.planned || 0)),
      },
    ];

    const topHoursCategories = topHours.map((t) => t.label);
    const topHoursMeta = topHours;

    const start = dayjs().startOf("day");
    const weekdays = [];
    let _d = start.clone();
    while (weekdays.length < 20) {
      const dow = _d.day();
      if (dow !== 0 && dow !== 6) {
        weekdays.push(_d.clone());
      }
      _d = _d.add(1, "day");
    }

    const endDateCounts = new Map();
    for (const r of rows) {
      const endIso = String(r?.end_date || "").slice(0, 10);
      if (!endIso) continue;
      endDateCounts.set(endIso, (endDateCounts.get(endIso) || 0) + 1);
    }

    const dayLabelTh = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

    const heatmapSeries = Array.from({ length: 4 }).map((_, w) => {
      const chunk = weekdays.slice(w * 5, w * 5 + 5);
      return {
        name: `สัปดาห์ ${w + 1}`,
        data: chunk.map((d) => {
          const iso = d.format("YYYY-MM-DD");
          const cnt = endDateCounts.get(iso) || 0;
          return {
            x: dayLabelTh[d.day()],
            y: cnt,
            meta: {
              date: d.format("DD/MM/YYYY"),
              iso,
              count: cnt,
            },
          };
        }),
      };
    });

    const scatterByStatus = statuses.reduce((acc, s) => ((acc[s] = []), acc), {});
    for (const r of rows) {
      const s = normalizeWbsStatus(r?.status);
      const stMs = parseISODateOnlyToMs(r?.start_date);
      const enMs = parseISODateOnlyToMs(r?.end_date);
      if (!Number.isFinite(stMs) || !Number.isFinite(enMs)) continue;

      const durDays = Math.max(1, Math.round((enMs - stMs) / (24 * 60 * 60 * 1000)) + 1);
      scatterByStatus[s].push({
        x: stMs,
        y: durDays,
        meta: {
          seq: r?.seq || r?.code || "T-?",
          name: r?.name || "",
          status: s,
          start_date: r?.start_date,
          end_date: r?.end_date,
          range: fmtThaiRange(r?.start_date, r?.end_date),
          planned_hours: Number(r?.planned_hours || 0),
        },
      });
    }

    const scatterSeries = statuses.map((s) => ({
      name: s,
      data: scatterByStatus[s],
    }));

    return {
      statuses,
      kpi: {
        total: base.total,
        progressPct,
        hoursTotal: base.hoursTotal,
        notDoneCount,
        byStatus: base.byStatus,
        dueSoonTop: dueSoon.slice(0, 3),
        dueSoonCount: dueSoon.length,
        overdueCount,
      },
      charts: {
        progressRadial: [clamp(progressPct, 0, 100)],
        topHoursSeries,
        topHoursCategories,
        topHoursMeta,
        deadlineHeatmapSeries: heatmapSeries,
        scatterSeries,
        scatterCount: scatterSeries.reduce((sum, s) => sum + (s?.data?.length || 0), 0),
      },
    };
  }, [tasksState.rows]);

  const handleRowClick = React.useCallback(
    (row) => {
      const payload = {
        toTab: "sub_task",
        projectId: project?.id ?? null,
        project: project || null,
        workstreamId: wsId ?? null,
        workstream: workstream || null,
        phaseId: phaseId ?? null,
        phase: phase || null,
        taskId: row?.id ?? null,
        task: row || null,
      };

      try {
        onGoWork?.(payload);
      } catch {
        // ignore
      }
    },
    [onGoWork, phase, phaseId, project, workstream, wsId]
  );

  const actionBtnSx = {
    borderRadius: 1,
    boxShadow: "none",
    textTransform: "none",
    fontWeight: 500,
  };

  if (!project) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          งานหลัก
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>กรุณาเลือกโครงการก่อน</Typography>
      </Box>
    );
  }

  const alertCount =
    (analytics?.kpi?.dueSoonCount || 0) + (analytics?.kpi?.overdueCount || 0);

  return (
    <Box sx={{ maxWidth: 1180, mx: "auto", width: "100%" }}>
      {/* ===== breadcrumbs ===== */}
      {tasksState.loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", mb: 1 }}>
          <Skeleton variant="text" width={64} height={18} />
          <Skeleton variant="text" width={10} height={18} />
          <Skeleton variant="text" width={90} height={18} />
          <Skeleton variant="text" width={10} height={18} />
          <Skeleton variant="text" width={72} height={18} />
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", mb: 1 }}>
          <Button
            onClick={() => {
              try {
                (onNavProjects || onBack)?.();
              } catch {
                // ignore
              }
            }}
            variant="text"
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: "none",
              fontWeight: 700,
              color: "text.secondary",
              "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
            }}
          >
            โครงการ
          </Button>
          <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>
          <Button
            onClick={() => {
              try {
                onNavProject?.();
              } catch {
                // ignore
              }
            }}
            variant="text"
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: "none",
              fontWeight: 700,
              color: "text.secondary",
              maxWidth: 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
            }}
            title={projectName}
          >
            {projectName || "-"}
          </Button>

          {wsName ? (
            <>
              <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>
              <Button
                onClick={() => {
                  try {
                    onNavWorkstreams?.();
                  } catch {
                    // ignore
                  }
                }}
                disabled={!onNavWorkstreams}
                variant="text"
                sx={{
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "text.secondary",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "transparent", textDecoration: onNavWorkstreams ? "underline" : "none" },
                }}
                title={wsName}
              >
                {wsName}
              </Button>
            </>
          ) : null}

          {phaseName ? (
            <>
              <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>
              <Button
                variant="body2"
                sx={{
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  color: "text.secondary",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={phaseName}
              >
                {phaseName}
              </Button>
            </>
          ) : null}
        </Stack>
      )}

      {/* ===== Title + Bell ===== */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexWrap: "wrap", gap: 1.5 }}
      >
        {tasksState.loading ? (
          <Skeleton variant="text" width={360} height={40} />
        ) : (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ lineHeight: 1.15, mt: 0.25, wordBreak: "break-word" }}>
              เฟส : {phaseName ? `${phaseName}` : "—"}
            </Typography>
          </Box>
        )}

        {tasksState.loading ? (
          <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
        ) : (
          <Tooltip title="สัญญาณแจ้งเตือน">
            <IconButton size="small" onClick={(e) => setAlertAnchor(e.currentTarget)} aria-label="แจ้งเตือน" sx={{ ml: 0.5 }}>
              <Badge badgeContent={alertCount} color="error">
                <NotificationsNoneRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Menu
        anchorEl={alertAnchor}
        open={Boolean(alertAnchor)}
        onClose={() => setAlertAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, borderRadius: 1 } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 800 }}>การแจ้งเตือน</Typography>
        </Box>
        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2">สรุปสถานะ</Typography>
          <Typography variant="caption" color="text.secondary">
            กำลังทำ {formatNumber(analytics.kpi.byStatus['กำลังทำ'] || 0)} เฟส, ยังไม่เริ่ม {formatNumber(analytics.kpi.byStatus['ยังไม่เริ่ม'] || 0)} เฟส
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2">
            ใกล้ถึงกำหนด (≤ 7 วัน)
          </Typography>
          {/* <Typography sx={{ mt: 0.25, fontSize: 13.5, fontWeight: 950 }}>{formatNumber(analytics.kpi.dueSoonCount)} งาน</Typography> */}
          <Box sx={{ mt: 0.75, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {(analytics.kpi.dueSoonTop.length ? analytics.kpi.dueSoonTop : [{ name: "—" }]).map((p) => (

              <Typography variant="caption" color="text.secondary">
                {p.name}
              </Typography>
            ))}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2">
            เลยกำหนด {formatNumber(analytics.kpi.overdueCount)} เฟส
          </Typography>
          <Typography variant="caption" color="text.secondary">
            เฟส (ไม่นับที่เสร็จแล้ว)
          </Typography>
        </Box>
      </Menu>

      {/* ===== Summary (ปรับใหม่) ===== */}
      <Paper elevation={0} sx={{ boxShadow: "none", overflow: "hidden", mb: 2 }}>
        {tasksState.loading ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Skeleton variant="text" width={220} height={22} />
            <Skeleton variant="text" width={320} height={14} />
            <Box sx={{ mt: 1.5, display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`kpi-sk-${i}`} variant="rounded" height={86} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
            <Box sx={{ mt: 2, display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <Skeleton variant="rounded" height={260} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rounded" height={260} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 1, mt: 1.25 }} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
                alignItems: "stretch",
              }}
            >
              <KpiTile
                label="จำนวนงานทั้งหมด"
                value={formatNumber(analytics.kpi.total)}
                sub="Total tasks"
                color={BRAND}
                icon={<FormatListNumberedRoundedIcon sx={{ fontSize: 24 }} />}
              />
              <KpiTile
                label="ความคืบหน้ารวม"
                value={`${clamp(analytics.kpi.progressPct, 0, 100)}%`}
                sub="เสร็จแล้ว / ทั้งหมด"
                color="#08d84c"
                icon={<TrendingUpRoundedIcon sx={{ fontSize: 24 }} />}
              />
              <KpiTile
                label="ชั่วโมงวางแผนรวม"
                value={formatNumber(Math.round(analytics.kpi.hoursTotal))}
                sub="Planned Hours"
                color="#fdca01"
                icon={<AccessTimeRoundedIcon sx={{ fontSize: 24 }} />}
              />
              <KpiTile
                label="ใกล้ครบกำหนด"
                value={formatNumber(analytics.kpi.dueSoonCount)}
                color="#3B82F6"
                sub="ภายใน 7 วัน"
                icon={<EventAvailableRoundedIcon sx={{ fontSize: 24 }} />}
              />
              <KpiTile
                label="ยังไม่เสร็จ"
                value={formatNumber(analytics.kpi.notDoneCount)}
                sub="progress < 100%"
                color="#fdca01"
                icon={<ReportProblemRoundedIcon sx={{ fontSize: 24 }} />}
              />
            </Box>

            <Box sx={{ mt: 2, display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" } }}>
              <CardShell title="ความคืบหน้า" >
                <ReactApexChart
                  options={{
                    chart: { type: "radialBar", toolbar: { show: false } },
                    plotOptions: {
                      radialBar: {
                        hollow: { size: "50%" },
                        track: { background: "rgba(2,6,23,0.06)" },
                        dataLabels: {
                          name: { show: true, fontSize: "15px", fontWeight: 950, offsetY: 18 },
                          value: {
                            show: true,
                            fontSize: "42px",
                            fontWeight: 950,
                            offsetY: -8,
                            formatter: (v) => `${Math.round(Number(v || 0))}%`,
                          },
                        },
                      },
                    },
                    labels: [""],
                    colors: ["#08d84c"],
                    stroke: { lineCap: "round" },
                  }}
                  series={analytics.charts.progressRadial}
                  type="radialBar"
                  height={250}
                />
                <Box sx={{ mt: 0.25, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                  {["กำลังทำ", "ยังไม่เริ่ม", "เสร็จแล้ว"].map((s) => (
                    <Box key={s} sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: 99, bgcolor: STATUS_COLORS[s] }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {s} {formatNumber(analytics.kpi.byStatus[s] || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardShell>

              <CardShell title="Top 8 งานที่ใช้ชั่วโมงมากสุด" >
                {analytics.charts.topHoursCategories.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">

                  </Typography>
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: "bar", toolbar: { show: false } },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          borderRadius: 4,
                          barHeight: "70%",
                          distributed: true,
                        },
                      },
                      dataLabels: {
                        enabled: true,
                        formatter: (val) => String(formatNumber(val)),
                        style: { fontWeight: 900 },
                      },
                      grid: { strokeDashArray: 4 },
                      xaxis: {
                        categories: analytics.charts.topHoursCategories,
                        labels: { formatter: (v) => formatNumber(v) },
                      },
                      yaxis: { labels: { formatter: (v) => String(v), align: "left" } },
                      tooltip: { y: { formatter: (v) => `${formatNumber(v)} ชม.` } },
                      colors: (analytics.charts.topHoursMeta || []).map(
                        (t) => STATUS_COLORS[normalizeWbsStatus(t?.status)] || STATUS_COLORS["ยังไม่เริ่ม"]
                      ),
                      legend: { show: false },
                    }}
                    series={analytics.charts.topHoursSeries}
                    type="bar"
                    height={320}
                  />
                )}
              </CardShell>
            </Box>

            <Box sx={{ mt: 1.25, display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <CardShell title="Heatmap กำหนดส่ง (4 สัปดาห์)">
                <ReactApexChart
                  options={{
                    chart: { type: "heatmap", toolbar: { show: false } },
                    dataLabels: { enabled: false },
                    plotOptions: {
                      heatmap: {
                        radius: 6,
                        enableShades: true,
                        shadeIntensity: 0.25,
                        colorScale: {
                          ranges: [
                            { from: 0, to: 0, color: "rgba(2,6,23,0.06)", name: "0" },
                            { from: 1, to: 1, color: "rgba(14,165,233,0.25)", name: "1" },
                            { from: 2, to: 3, color: "rgba(14,165,233,0.45)", name: "2-3" },
                            { from: 4, to: 99, color: "rgba(14,165,233,0.75)", name: "4+" },
                          ],
                        },
                      },
                    },
                    stroke: { width: 2, colors: ["#fff"] },
                    xaxis: { type: "category" },
                    yaxis: { labels: { style: { fontWeight: 900 } } },
                    tooltip: {
                      custom: ({ seriesIndex, dataPointIndex, w }) => {
                        const d = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
                        const m = d?.meta || {};
                        return `
                          <div style="padding:10px 12px;">
                            <div style="font-weight:950;">${m.date || "—"}</div>
                            <div style="margin-top:6px;font-size:12px;">งานครบกำหนด: <b>${formatNumber(m.count || 0)}</b> งาน</div>
                          </div>
                        `;
                      },
                    },
                  }}
                  series={analytics.charts.deadlineHeatmapSeries}
                  type="heatmap"
                  height={260}
                />

              </CardShell>

              <CardShell title="ระยะเวลางาน (วัน) ตามวันเริ่ม" >
                {analytics.charts.scatterCount === 0 ? (
                  <Typography variant="caption" color="text.secondary">

                  </Typography>
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: "scatter", toolbar: { show: false }, zoom: { enabled: false } },
                      colors: analytics.statuses.map((s) => STATUS_COLORS[s] || "#64748B"),
                      grid: { strokeDashArray: 4 },
                      markers: { size: 5 },
                      xaxis: {
                        type: "datetime",
                        labels: {
                          formatter: (val) => {
                            try {
                              return dayjs(val).format("DD/MM");
                            } catch {
                              return String(val);
                            }
                          },
                        },
                      },
                      yaxis: {
                        title: { text: "ระยะเวลา (วัน)" },
                        labels: { formatter: (v) => formatNumber(v) },
                        min: 0,
                      },
                      legend: { position: "bottom" },
                      tooltip: {
                        custom: ({ seriesIndex, dataPointIndex, w }) => {
                          const p = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
                          const m = p?.meta || {};
                          const st = m?.status || "—";
                          const color = STATUS_COLORS[st] || "#64748B";
                          const name = (m?.name || "").replace(/</g, "&lt;");
                          return `
                            <div style="padding:10px 12px;">
                              <div style="font-weight:950;">${m?.seq || "T-?"}</div>
                              <div style="opacity:.9;margin-top:2px;font-weight:800;">${name || "—"}</div>
                              <div style="margin-top:6px;font-size:12px;">ช่วงเวลา: <b>${m?.range || "—"}</b></div>
                              <div style="font-size:12px;">สถานะ: <b style="color:${color}">${st}</b></div>
                              <div style="font-size:12px;">ชั่วโมงวางแผน: <b>${formatNumber(m?.planned_hours || 0)}</b> ชม.</div>
                              <div style="font-size:12px;">ระยะเวลา: <b>${formatNumber(p?.y || 0)}</b> วัน</div>
                            </div>
                          `;
                        },
                      },
                    }}
                    series={analytics.charts.scatterSeries}
                    type="scatter"
                    height={260}
                  />
                )}
              </CardShell>
            </Box>
          </>
        )}
      </Paper>

      {/* ===== Tasks Box ===== */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "grey.200", boxShadow: "none", overflow: "hidden" }}>
        {tasksState.loading ? (
          <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="text" width={160} height={22} />
              <Skeleton variant="text" width={220} height={12} sx={{ mt: 0.5 }} />
            </Box>
            <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <Box sx={{ px: 2, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>รายการงานหลัก</Typography>

            </Box>

            <Tooltip title="เพิ่มงานหลัก">
              <IconButton
                onClick={openCreateDialog}
                sx={{
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "grey.200",
                  color: "text.primary",
                  bgcolor: "transparent",
                  "&:hover": { borderColor: "grey.300", bgcolor: "grey.50" },
                }}
                aria-label="เพิ่มงานหลัก"
              >
                <AddCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Divider />

        {tasksState.loading ? (
          <TableContainer sx={{ width: "100%", px: 2, py: 1 }}>
            <Table size="small" sx={{ "& th, & td": { py: 1, px: 1.5, borderBottom: "none" } }}>
              <TableHead>
                <TableRow>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableCell key={`h-${i}`}>
                      <Skeleton variant="text" width={80} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`r-${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={`c-${i}-${j}`}>
                        <Skeleton variant="text" width={j === 1 ? 240 : 80} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <TasksTable
            loading={tasksState.loading}
            rows={tasksState.rows}
            onRowClick={handleRowClick}
            onEditRow={openEditDialog}
            onDeleteRow={openDeleteDialog}
          />
        )}
      </Paper>

      {/* ===== Delete dialog ===== */}
      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>ลบงานหลัก "{deleteDialog.row?.name || deleteDialog.row?.code || "—"}" หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteDialog.deleting} sx={{ color: "common.black", ...actionBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleteDialog.deleting} sx={actionBtnSx} disableElevation>
            {deleteDialog.deleting ? "กำลังลบ..." : "ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Create/Edit dialog ===== */}
      <Dialog open={taskDialog.open} onClose={closeTaskDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{taskDialog.mode === "edit" ? "แก้ไขงานหลัก" : "เพิ่มงานหลัก"}</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {/* ซ่อน code เหมือนเฟส */}
            <TextField
              size="small"
              label="รหัสงาน"
              value={taskDialog.form.code}
              onChange={(e) => setTaskDialog((prev) => ({ ...prev, form: { ...prev.form, code: e.target.value } }))}
              fullWidth
              required
              sx={{ display: "none" }}
            />

            <TextField
              size="small"
              label="ชื่องานหลัก"
              value={taskDialog.form.name}
              onChange={(e) => setTaskDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
              fullWidth
              required
            />

            {/* ✅ ผู้รับผิดชอบ: TextField ปกติ + ปุ่มค้นหาชิดขวา */}
            <TextField

              size="small"
              label="ผู้รับผิดชอบ"
              value={ownersSummary || ""}
              onClick={openOwnerPicker}
              error={Boolean(taskDialog?.errors?.owner)}
              fullWidth
              required
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={openOwnerPicker} aria-label="ค้นหา/เลือกผู้รับผิดชอบ">
                      <SearchRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              sx={{ display: "none" }}
              select
              size="small"
              label="สถานะ"
              value={taskDialog.form.status}
              onChange={(e) => setTaskDialog((prev) => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
              fullWidth
            >
              {["ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              sx={{ display: "none" }}
              select
              size="small"
              label="โหมดบิล"
              value={taskDialog.form.billable_mode}
              onChange={(e) => setTaskDialog((prev) => ({ ...prev, form: { ...prev.form, billable_mode: e.target.value } }))}
              fullWidth
            >
              <MenuItem value="billable">billable</MenuItem>
              <MenuItem value="non_billable">non_billable</MenuItem>
              <MenuItem value="manual">manual</MenuItem>
            </TextField>

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <Stack direction="column" spacing={1.25}>
                <DatePicker
                  label="วันที่เริ่ม"
                  value={taskDialog.form.start_date ? dayjs(taskDialog.form.start_date) : null}
                  minDate={phaseStartDay || undefined}
                  maxDate={phaseEndDay || undefined}
                  onChange={(v) =>
                    setTaskDialog((prev) => {
                      const start_date = v ? (v.format ? v.format("YYYY-MM-DD") : String(v)) : "";
                      const nextForm = { ...prev.form, start_date };
                      const hadManualHours = Boolean(String(prev?.form?.planned_hours ?? "").trim()) && !prev?.plannedHoursAuto;
                      return {
                        ...prev,
                        autoCalcDirty: true,
                        plannedHoursAuto: hadManualHours ? false : true,
                        form: nextForm,
                        errors: { ...(prev.errors || {}), start_date: "" },
                      };
                    })
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      error: Boolean(taskDialog?.errors?.start_date),
                      helperText: taskDialog?.errors?.start_date || "",
                    },
                  }}
                  sx={{ width: "100%" }}
                />

                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={taskDialog.form.end_date ? dayjs(taskDialog.form.end_date) : null}
                  minDate={toDayjsDate(taskDialog.form.start_date) || phaseStartDay || undefined}
                  maxDate={phaseEndDay || undefined}
                  onChange={(v) =>
                    setTaskDialog((prev) => {
                      const end_date = v ? (v.format ? v.format("YYYY-MM-DD") : String(v)) : "";
                      const nextForm = { ...prev.form, end_date };
                      const hadManualHours = Boolean(String(prev?.form?.planned_hours ?? "").trim()) && !prev?.plannedHoursAuto;
                      return {
                        ...prev,
                        plannedHoursAuto: hadManualHours ? false : true,
                        form: nextForm,
                        errors: { ...(prev.errors || {}), end_date: "" },
                      };
                    })
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      error: Boolean(taskDialog?.errors?.end_date),
                      helperText: taskDialog?.errors?.end_date || "",
                    },
                  }}
                  sx={{ width: "100%" }}
                />
              </Stack>
            </LocalizationProvider>

            <TextField
              sx={{ display: 'none' }}
              size="small"
              label="ชั่วโมงวางแผน"
              type="number"
              value={taskDialog.form.planned_hours}
              onChange={(e) =>
                setTaskDialog((prev) => {
                  const planned_hours = e.target.value;
                  const plannedErr = validatePlannedHoursText(planned_hours);
                  return {
                    ...prev,
                    autoCalcDirty: true,
                    plannedHoursAuto: false,
                    form: { ...prev.form, planned_hours },
                    errors: { ...(prev.errors || {}), planned_hours: plannedErr },
                  };
                })
              }
              error={Boolean(taskDialog?.errors?.planned_hours)}
              helperText={taskDialog?.errors?.planned_hours || ""}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center" }}>
          <Button onClick={closeTaskDialog} disabled={taskDialog.saving} sx={{ color: "#000", textTransform: "none" }} size="medium">
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveTask}
            disabled={taskDialog.saving || !taskDialog.form.start_date || !taskDialog.form.end_date || Boolean(taskDialog?.errors?.planned_hours)}
            sx={{ ...actionBtnSx }}
            startIcon={<SaveIcon />}
            size="medium"
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Owner Picker Dialog (multi-select) ===== */}
      <Dialog
        open={ownerDialogOpen}
        onClose={closeOwnerPicker}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          เลือกผู้รับผิดชอบ
          <IconButton onClick={closeOwnerPicker} size="small" aria-label="ปิด">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <TextField
            size="small"
            placeholder="ค้นหา"
            fullWidth
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            sx={{ mt: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ mt: 0.5, flex: 1, overflow: "auto" }}>
            {filteredEmployees.map((emp) => {
              const id = String(emp?.id || "");
              const checked = Array.isArray(ownerSelections) ? ownerSelections.includes(id) : false;
              return (
                <ListItemButton key={id} onClick={() => toggleOwnerSelection(id)}>
                  <ListItemIcon>
                    <Checkbox checked={checked} tabIndex={-1} disableRipple color="error" size="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={formatEmployeeFull(emp) || "—"}
                    // secondary={checked ? "เลือกแล้ว" : null}
                    // primaryTypographyProps={{ sx: { fontSize: 14, fontWeight: 500 } }}
                    secondaryTypographyProps={{ sx: { fontSize: 12 } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", gap: 1.25 }}>
          <Button onClick={closeOwnerPicker} sx={{ color: "common.black", ...actionBtnSx }} disableElevation>
            ยกเลิก
          </Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={confirmOwnerPicker} sx={actionBtnSx} disableElevation>
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
