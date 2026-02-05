// ===== src/tpr/modules/projects/ProjectSubTask.jsx (แทนทั้งไฟล์) =====
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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";

import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import ReactApexChart from "react-apexcharts";

// ✅ Logic layer
import * as SubTask from "../../functions/SubTask";
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

// employee display helper moved to logic layer: SubTask.formatEmployee

function parseMaybeJsonObject(v) {
    if (!v) return null;
    if (typeof v === "object") return v;
    if (typeof v !== "string") return null;
    try {
        const o = JSON.parse(v);
        return o && typeof o === "object" ? o : null;
    } catch {
        return null;
    }
}

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
        "ยังไม่เริ่ม": { label: "ยังไม่เริ่ม", dot: "#64748B", border: "#64748B" },
        "กำลังทำ": { label: "กำลังทำ", dot: "#fdca01", border: "#fdca01" },
        "เสร็จแล้ว": { label: "เสร็จแล้ว", dot: "#08d84c", border: "#08d84c" },
    };
    const cfg = map[st] || map["ยังไม่เริ่ม"];

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

/**
 * ❗️ตาราง “รายการงานย่อย” ต้องเหมือนตาราง “รายการงานหลัก” แบบเป๊ะ ๆ
 * => คัดลอก TasksTable จาก ProjectMainTask มา 그대로 (ไม่เปลี่ยน layout/columns)
 */
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
                                const progressNum =
                                    progressRaw === null || progressRaw === undefined || progressRaw === "" ? NaN : Number(progressRaw);
                                const pct = clamp(
                                    Number.isFinite(progressNum) ? progressNum : fallbackProgressFromStatus(r.status),
                                    0,
                                    100
                                );
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

export default function ProjectSubTask({
    project,
    workstream,
    supabase,
    onBack,
    // รองรับการส่ง context จากงานหลัก (ถ้ามี)
    navPayload,
    phase,
    task,
    onNavProjects,
    onNavProject,
    onNavWorkstreams,
    onNavPhases,
}) {
    // ===== Context (พยายามดึงจาก props / navPayload) =====
    const projectId = project?.id || null;
    const projectName = project?.name_th || project?.name || project?.name_en || project?.project_code || "";

    const payload = navPayload || null;

    const wsObj = workstream || payload?.workstream || null;
    const wsId = wsObj?.id ?? payload?.workstreamId ?? null;
    const wsName = wsObj?.name || "";

    const phaseObj = phase || payload?.phase || null;
    const taskObj = task || payload?.task || null;

    const phaseId = phaseObj?.id ?? payload?.phaseId ?? null;
    const phaseName = phaseObj?.name || "";

    const taskId = taskObj?.id ?? payload?.taskId ?? null;
    const taskName = taskObj?.name || "";

    const phaseStartISO = phaseObj?.start_date || "";
    const phaseEndISO = phaseObj?.end_date || "";

    // Task-level boundaries (primary). Fallback to phase bounds if task lacks them.
    const taskStartISO = taskObj?.start_date || phaseStartISO || "";
    const taskEndISO = taskObj?.end_date || phaseEndISO || "";
    const taskStartDay = React.useMemo(() => toDayjsDate(taskStartISO), [taskStartISO]);
    const taskEndDay = React.useMemo(() => toDayjsDate(taskEndISO), [taskEndISO]);

    const [subTasksState, setSubTasksState] = React.useState(() => ({
        loading: true,
        rows: [],
    }));

    const [deleteDialog, setDeleteDialog] = React.useState(() => ({
        open: false,
        row: null,
        deleting: false,
    }));

    const [alertAnchor, setAlertAnchor] = React.useState(null);

    const [userId, setUserId] = React.useState(null);

    // ===== Employees (for owner picker) =====
    const [employees, setEmployees] = React.useState([]);
    const [employeeSearch, setEmployeeSearch] = React.useState("");
    const [ownerDialogOpen, setOwnerDialogOpen] = React.useState(false);
    const [ownerSelection, setOwnerSelection] = React.useState(null);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!supabase) return;
                if (!projectId) {
                    if (mounted) setEmployees([]);
                    return;
                }
                const list = await SubTask.listProjectMembers({ projectId, supabaseClient: supabase });
                if (!mounted) return;
                setEmployees(Array.isArray(list) ? list : []);
            } catch (e) {
                // non-blocking
                console.error("[ProjectSubTask] Failed to load employees", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [supabase, projectId]);

    const filteredEmployees = React.useMemo(() => {
        const q = String(employeeSearch || "")
            .trim()
            .toLowerCase();
        const list = Array.isArray(employees) ? employees : [];
        if (!q) return list;
        return list.filter((e) => {
            const nameStr = String(SubTask.formatEmployee(e) || "").toLowerCase();
            const code = String(e?.employee_code || e?.employee_id || e?.id || "").toLowerCase();
            return nameStr.includes(q) || code.includes(q);
        });
    }, [employees, employeeSearch]);

    const [subTaskDialog, setSubTaskDialog] = React.useState(() => ({
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
            owner: "", // uuid (1 คน)
        },
        errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
    }));

    const ownerDisplay = React.useMemo(() => {
        const ownerId = String(subTaskDialog?.form?.owner || "").trim();
        if (!ownerId) return "";
        const emp = (employees || []).find(
            (e) => String(e?.id) === ownerId || String(e?.employee_id) === ownerId || String(e?.employee_code) === ownerId
        );
        return emp ? SubTask.formatEmployee(emp) : ownerId;
    }, [employees, subTaskDialog?.form?.owner]);

    // ===== load current user (for audit) =====
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!supabase?.auth?.getUser) return;
                const { data } = await supabase.auth.getUser();
                const uid = data?.user?.id || null;
                if (mounted) setUserId(uid);
            } catch {
                // ignore
            }
        })();
        return () => {
            mounted = false;
        };
    }, [supabase]);

    const reloadSubTasks = React.useCallback(async () => {
        if (!projectId || !phaseId || !taskId) {
            setSubTasksState({ loading: false, rows: [] });
            return;
        }

        try {
            setSubTasksState({ loading: true, rows: [] });
            await new Promise((r) => setTimeout(r, 200));

            const rows = await SubTask.listSubTasks({
                projectId,
                phaseId,
                taskId,
                workstreamId: wsId,
                supabaseClient: supabase,
            });

            const mapped = (Array.isArray(rows) ? rows : []).map((r, idx) => {
                const md = parseMaybeJsonObject(r?.metadata);
                const stRaw = String(md?.status || r?.status || "").trim();
                const st = normalizeWbsStatus(stRaw);
                const seqNum = md?.seq != null ? String(md.seq) : null;
                const seq = seqNum ? `S-${seqNum}` : `S-${idx + 1}`;
                return {
                    ...r,
                    seq,
                    status: st,
                    planned_hours: r?.planned_hours != null ? Number(r.planned_hours || 0) : 0,
                    dateRange: fmtThaiRange(r?.start_date, r?.end_date),
                };
            });

            setSubTasksState({ loading: false, rows: mapped });
        } catch (e) {
            console.error("reloadSubTasks error:", e);
            setSubTasksState({ loading: false, rows: [] });
        }
    }, [phaseId, projectId, supabase, taskId, wsId]);

    React.useEffect(() => {
        reloadSubTasks();
    }, [reloadSubTasks]);

    React.useEffect(() => {
        try {
            if (typeof window !== "undefined" && window.scrollTo) {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            }
        } catch {
            // ignore
        }
    }, [projectId, phaseId, taskId]);

    const openAlerts = React.useCallback((e) => setAlertAnchor(e.currentTarget), []);
    const closeAlerts = React.useCallback(() => setAlertAnchor(null), []);

    const openCreateDialog = React.useCallback(() => {
        if (!taskStartISO || !taskEndISO) {
            window.alert("งานหลักยังไม่มีช่วงวันที่เริ่ม/สิ้นสุด จึงไม่สามารถสร้างงานย่อยได้");
            return;
        }

        setSubTaskDialog({
            open: true,
            mode: "create",
            saving: false,
            autoCalcDirty: false,
            plannedHoursAuto: false,
            form: {
                id: null,
                code: SubTask.genSubTaskCode(),
                name: "",
                workstream_id: wsId,
                status: "ยังไม่เริ่ม",
                start_date: "",
                end_date: "",
                planned_hours: "",
                owner: "",
            },
            errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
        });
    }, [wsId, taskStartISO, taskEndISO]);

    const openEditDialog = React.useCallback((row) => {
        if (!taskStartISO || !taskEndISO) {
            window.alert("งานหลักยังไม่มีช่วงวันที่เริ่ม/สิ้นสุด จึงไม่สามารถแก้ไขงานย่อยได้");
            return;
        }
        const md = parseMaybeJsonObject(row?.metadata);
        const stRaw = String(md?.status || row?.status || "ยังไม่เริ่ม").trim() || "ยังไม่เริ่ม";
        const st = normalizeWbsStatus(stRaw);
        setSubTaskDialog({
            open: true,
            mode: "edit",
            saving: false,
            autoCalcDirty: false,
            plannedHoursAuto: true,
            form: {
                id: row?.id || null,
                code: row?.code || "",
                workstream_id: row?.workstream_id || wsId || null,
                name: row?.name || "",
                status: st,
                start_date: row?.start_date || "",
                end_date: row?.end_date || "",
                planned_hours: row?.planned_hours != null ? String(Number(row.planned_hours || 0)) : "",
                owner: row?.owner || "",
            },
            errors: { start_date: "", end_date: "", planned_hours: "", owner: "" },
        });
    }, [wsId, taskStartISO, taskEndISO]);

    const closeSubTaskDialog = React.useCallback(() => {
        setSubTaskDialog((prev) => ({ ...prev, open: false, saving: false }));
    }, []);

    // auto-calc end_date when start_date/planned_hours changes
    React.useEffect(() => {
        let alive = true;

        async function run() {
            if (!subTaskDialog.open) return;
            if (!subTaskDialog.autoCalcDirty) return;
            // When planned hours are auto-derived from dates, do not auto-shift end_date.
            // This avoids ping-pong updates (start/end -> hours -> end -> ...).
            if (subTaskDialog.plannedHoursAuto) return;

            const start_date = String(subTaskDialog?.form?.start_date || "").trim();
            const planned_hours = String(subTaskDialog?.form?.planned_hours ?? "").trim();

            const plannedErr = validatePlannedHoursText(planned_hours);
            if (plannedErr) {
                setSubTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), planned_hours: plannedErr } }));
                return;
            }

            const hoursNum = Number(planned_hours || 0);
            if (!start_date || !Number.isFinite(hoursNum) || hoursNum <= 0) return;

            const res = await SubTask.calcSubTaskEndDateFromPlannedHours({
                start_date,
                planned_hours: hoursNum,
                boundary_start: taskStartISO || "",
                boundary_end: taskEndISO || "",
            });

            if (!alive) return;
            if (!res?.ok) return;

            setSubTaskDialog((prev) => ({
                ...prev,
                autoCalcDirty: false,
                form: { ...prev.form, start_date: res.startISO || start_date, end_date: res.endISO || "" },
                errors: { ...(prev.errors || {}), planned_hours: "" },
            }));
        }

        run();
        return () => {
            alive = false;
        };
    }, [subTaskDialog.autoCalcDirty, subTaskDialog.form.planned_hours, subTaskDialog.form.start_date, subTaskDialog.open, subTaskDialog.plannedHoursAuto, taskEndISO, taskStartISO]);

    // inverse calc planned_hours from dates (if planned empty or auto)
    React.useEffect(() => {
        let alive = true;

        async function runInv() {
            if (!subTaskDialog.open) return;

            const start = String(subTaskDialog?.form?.start_date || "").trim();
            const end = String(subTaskDialog?.form?.end_date || "").trim();
            const planned = String(subTaskDialog?.form?.planned_hours ?? "").trim();
            const plannedAuto = Boolean(subTaskDialog?.plannedHoursAuto);

            if (!start || !end) return;
            if (planned && !plannedAuto) return;

            const res = await SubTask.calcSubTaskPlannedHoursFromDates({ start_date: start, end_date: end });
            if (!alive) return;
            if (!res?.ok) return;

            const nextPlanned = res?.planned_hours ? String(res.planned_hours) : "";

            // No-op if nothing changes
            if (nextPlanned === planned && plannedAuto) return;

            setSubTaskDialog((prev) => ({
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
    }, [subTaskDialog.form.end_date, subTaskDialog.form.start_date, subTaskDialog.form.planned_hours, subTaskDialog.open, subTaskDialog.plannedHoursAuto]);

    const saveSubTask = React.useCallback(async () => {
        if (!projectId || !phaseId || !taskId) return;

        const form = subTaskDialog.form || {};
        const code = String(form.code || "").trim();
        const name = String(form.name || "").trim();
        const status = String(form.status || "ยังไม่เริ่ม").trim() || "ยังไม่เริ่ม";
        const owner = String(form.owner || "").trim();

        if (!code || !name) {
            window.alert("กรุณากรอก รหัส และ ชื่องานย่อย");
            return;
        }

        if (!owner) {
            setSubTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), owner: "กรุณาระบุผู้รับผิดชอบ" } }));
            return;
        }

        if (!taskStartISO || !taskEndISO) {
            window.alert("งานหลักยังไม่มีช่วงวันที่เริ่ม/สิ้นสุด จึงไม่สามารถสร้าง/แก้ไข งานย่อย ได้");
            return;
        }

        if (!form.start_date) {
            setSubTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), start_date: "กรุณาเลือกวันที่เริ่ม" } }));
            return;
        }
        if (!form.end_date) {
            setSubTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), end_date: "กรุณาเลือกวันที่สิ้นสุด" } }));
            return;
        }

        const plannedErr = validatePlannedHoursText(form.planned_hours);
        if (plannedErr) {
            setSubTaskDialog((prev) => ({ ...prev, errors: { ...(prev.errors || {}), planned_hours: plannedErr } }));
            return;
        }

        const rangeRes = SubTask.validateSubTaskRangeWithinTask({
            start_date: form.start_date,
            end_date: form.end_date,
            task_start: taskStartISO,
            task_end: taskEndISO,
        });

        if (!rangeRes?.ok) {
            window.alert(rangeRes?.messageTh || "ช่วงวันที่ไม่ถูกต้อง");
            return;
        }

        setSubTaskDialog((prev) => ({ ...prev, saving: true }));

        try {
            const payloadBase = {
                project_id: projectId,
                workstream_id: wsId,
                phase_id: phaseId,
                task_id: taskId,
                code,
                name,
                planned_hours: Number(form.planned_hours || 0),
                owner, // ✅ 1 คน
                start_date: form.start_date,
                end_date: form.end_date,
                status,
                metadata: { ...(form.metadata || {}), status },
            };

            // audit
            const payload =
                subTaskDialog.mode === "edit"
                    ? SubTask.withUpdateAudit(payloadBase, userId)
                    : SubTask.withCreateAudit(payloadBase, userId);

            if (subTaskDialog.mode === "edit" && form.id) {
                await SubTask.updateSubTask(form.id, payload, supabase);
            } else {
                // create ต้องมี created_by (ตามที่คุณเพิ่มไว้)
                if (!payload?.created_by) {
                    // ถ้า user ยังไม่พร้อม ให้กันพังแบบชัด ๆ
                    throw new Error("ไม่พบผู้ใช้ปัจจุบัน (created_by) กรุณาเข้าสู่ระบบใหม่");
                }
                await SubTask.createSubTask(payload, supabase);
            }

            closeSubTaskDialog();
            await reloadSubTasks();
        } catch (e) {
            console.error("saveSubTask error:", e);
            window.alert(`บันทึกล้มเหลว: ${String(e?.message || e)}`);
            setSubTaskDialog((prev) => ({ ...prev, saving: false }));
        }
    }, [closeSubTaskDialog, taskEndISO, phaseId, taskStartISO, projectId, reloadSubTasks, subTaskDialog.form, subTaskDialog.mode, taskId, userId, supabase, wsId]);

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
            await SubTask.deleteSubTask(id, supabase);
            closeDeleteDialog();
            await reloadSubTasks();
        } catch (e) {
            console.error("deleteSubTask error:", e);
            window.alert(`ลบไม่สำเร็จ: ${String(e?.message || e)}`);
            setDeleteDialog((prev) => ({ ...prev, deleting: false }));
        }
    }, [closeDeleteDialog, deleteDialog.row, reloadSubTasks, supabase]);

    // ===== Analytics (คิดใหม่/กราฟใหม่) =====
    const analytics = React.useMemo(() => {
        const rows = Array.isArray(subTasksState.rows) ? subTasksState.rows : [];
        const statuses = ["ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"];

        const base = {
            total: rows.length,
            done: 0,
            hoursTotal: 0,
            byStatus: statuses.reduce((acc, s) => ((acc[s] = 0), acc), {}),
            hoursByStatus: statuses.reduce((acc, s) => ((acc[s] = 0), acc), {}),
        };

        // planned hours by day (sparkline-ish)
        const dayMap = new Map(); // YYYY-MM-DD -> hours
        const endMap = new Map(); // YYYY-MM-DD -> count

        for (const r of rows) {
            const st = normalizeWbsStatus(r?.status);

            base.byStatus[st] += 1;
            if (st === "เสร็จแล้ว") base.done += 1;

            const h = Number(r?.planned_hours || 0);
            base.hoursTotal += Number.isFinite(h) ? h : 0;
            base.hoursByStatus[st] += Number.isFinite(h) ? h : 0;

            const startIso = String(r?.start_date || "").slice(0, 10);
            if (startIso) dayMap.set(startIso, (dayMap.get(startIso) || 0) + (Number.isFinite(h) ? h : 0));

            const endIso = String(r?.end_date || "").slice(0, 10);
            if (endIso) endMap.set(endIso, (endMap.get(endIso) || 0) + 1);
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

        // dueSoon / overdue
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
            else if (diffDays <= 7) dueSoon.push({ id: r?.id, name: r?.name || r?.code || "—", endMs });
        }
        dueSoon.sort((a, b) => (a.endMs || 0) - (b.endMs || 0));

        // Donut: count by status
        const donutLabels = statuses;
        const donutSeries = statuses.map((s) => Number(base.byStatus[s] || 0));

        // Area: planned hours accumulation by start_date (sorted)
        const points = Array.from(dayMap.entries())
            .map(([iso, hours]) => ({ iso, hours: Number(hours || 0) }))
            .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));

        let cum = 0;
        const areaSeries = [
            {
                name: "ชั่วโมงสะสม",
                data: points.map((p) => {
                    cum += Number(p.hours || 0);
                    return { x: p.iso, y: Math.round(cum) };
                }),
            },
        ];

        // Column: end_date density (top 10 days)
        const dens = Array.from(endMap.entries())
            .map(([iso, cnt]) => ({ iso, cnt }))
            .sort((a, b) => (b.cnt || 0) - (a.cnt || 0))
            .slice(0, 10)
            .reverse();

        const deadlineCategories = dens.map((d) => {
            try {
                return dayjs(d.iso).format("DD/MM");
            } catch {
                return d.iso;
            }
        });

        const deadlineSeries = [
            {
                name: "จำนวนงานย่อยครบกำหนด",
                data: dens.map((d) => Number(d.cnt || 0)),
            },
        ];

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
                donutLabels,
                donutSeries,
                areaSeries,
                deadlineCategories,
                deadlineSeries,
            },
        };
    }, [subTasksState.rows]);

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
                    งานย่อย
                </Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>กรุณาเลือกโครงการก่อน</Typography>
            </Box>
        );
    }

    // ถ้ายังไม่มี context จากงานหลัก (phase/task) ให้บอกชัด ๆ
    if (!phaseId || !taskId) {
        return (
            <Box sx={{ maxWidth: 1180, mx: "auto", width: "100%" }}>
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
                    <Typography sx={{ fontWeight: 950, color: "text.primary" }}>งานย่อย</Typography>
                </Stack>

                <Paper elevation={0} sx={{ border: "1px solid", borderColor: "grey.200", boxShadow: "none", p: 2 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 16 }}>งานย่อย</Typography>
                    <Typography variant="caption" color="text.secondary">
                        กรุณาเข้า “งานหลัก” แล้วกดเลือกรายการงานหลัก เพื่อส่ง context (Phase/Task) มายังหน้านี้
                    </Typography>
                </Paper>
            </Box>
        );
    }

    const alertCount = (analytics?.kpi?.dueSoonCount || 0) + (analytics?.kpi?.overdueCount || 0);

    return (
        <Box sx={{ maxWidth: 1180, mx: "auto", width: "100%" }}>
            {/* ===== breadcrumbs ===== */}
            {subTasksState.loading ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", mb: 1 }}>
                    <Skeleton variant="text" width={64} height={18} />
                    <Skeleton variant="text" width={10} height={18} />
                    <Skeleton variant="text" width={140} height={18} />
                    <Skeleton variant="text" width={10} height={18} />
                    <Skeleton variant="text" width={120} height={18} />
                    <Skeleton variant="text" width={10} height={18} />
                    <Skeleton variant="text" width={160} height={18} />
                    <Skeleton variant="text" width={10} height={18} />
                    <Skeleton variant="text" width={90} height={18} />
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
                        disabled={!projectId || !onNavProject}
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
                            "&:hover": { bgcolor: "transparent", textDecoration: onNavProject ? "underline" : "none" },
                        }}
                        title={projectName}
                    >
                        {projectName || "-"}
                    </Button>

                    <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>



                    <Button
                        onClick={() => {
                            try {
                                onNavWorkstreams?.();
                            } catch {
                                // ignore
                            }
                        }}
                        disabled={!wsId || !onNavWorkstreams}
                        variant="text"
                        sx={{
                            p: 0,
                            minWidth: 0,
                            textTransform: "none",
                            fontWeight: 700,
                            color: "text.secondary",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:hover": { bgcolor: "transparent", textDecoration: onNavWorkstreams ? "underline" : "none" },
                        }}
                        title={wsName}
                    >
                        {wsName || "-"}
                    </Button>

                    <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>

                    <Button
                        onClick={() => {
                            try {
                                onNavPhases?.();
                            } catch {
                                // ignore
                            }
                        }}
                        disabled={!phaseId || !onNavPhases}
                        variant="text"
                        sx={{
                            p: 0,
                            minWidth: 0,
                            textTransform: "none",
                            fontWeight: 700,
                            color: "text.secondary",
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:hover": { bgcolor: "transparent", textDecoration: onNavPhases ? "underline" : "none" },
                        }}
                        title={phaseName}
                    >
                        {phaseName || "-"}
                    </Button>

                    <Box sx={{ opacity: 0.55, color: "text.secondary" }}>›</Box>

                    <Button
                        variant="text"
                        sx={{
                            p: 0,
                            minWidth: 0,
                            textTransform: "none",
                            color: "text.secondary",
                            maxWidth: 280,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                        title={taskName}
                    >
                        {taskName || "-"}
                    </Button>


                </Stack>
            )}

            {/* ===== Title + Bell ===== */}
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                {subTasksState.loading ? (
                    <Skeleton variant="text" width={360} height={40} />
                ) : (
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h4" sx={{ lineHeight: 1.15, mt: 0.25, wordBreak: "break-word" }}>
                            งานหลัก : {taskName ? `${taskName}` : "—"}
                        </Typography>
                    </Box>
                )}

                {subTasksState.loading ? (
                    <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1 }} />
                ) : (
                    <Tooltip title="สัญญาณแจ้งเตือน">
                        <IconButton size="small" onClick={openAlerts} aria-label="แจ้งเตือน" sx={{ ml: 0.5 }}>
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
                onClose={closeAlerts}
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

            {/* ===== Summary (กราฟใหม่) ===== */}
            <Paper elevation={0} sx={{ boxShadow: "none", overflow: "hidden", mb: 2 }}>
                {subTasksState.loading ? (
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
                        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 1, mt: 1.25 }} />
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
                                label="จำนวนงานย่อยทั้งหมด"
                                value={formatNumber(analytics.kpi.total)}
                                sub="Total sub tasks"
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

                        {/* แถวกราฟ 1: Donut status + Area cumulative hours */}
                        <Box sx={{ mt: 2, display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" } }}>
                            <CardShell title="สัดส่วนสถานะงานย่อย" >
                                <ReactApexChart
                                    options={{
                                        chart: { type: "donut", toolbar: { show: false } },
                                        labels: analytics.charts.donutLabels,
                                        colors: analytics.statuses.map((s) => STATUS_COLORS[s] || "#64748B"),
                                        legend: { position: "bottom" },
                                        dataLabels: { enabled: true, style: { fontWeight: 900 } },
                                        plotOptions: {
                                            pie: {
                                                donut: {
                                                    size: "62%",
                                                    labels: {
                                                        show: true,
                                                        total: {
                                                            show: true,
                                                            label: "รวม",
                                                            formatter: () => formatNumber(analytics.kpi.total),
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        tooltip: { y: { formatter: (v) => `${formatNumber(v)} งาน` } },
                                    }}
                                    series={analytics.charts.donutSeries}
                                    type="donut"
                                    height={280}
                                />
                            </CardShell>

                            <CardShell title="ชั่วโมงวางแผนสะสมตามวันเริ่ม" >
                                {analytics.charts.areaSeries?.[0]?.data?.length ? (
                                    <ReactApexChart
                                        options={{
                                            chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false } },
                                            stroke: { curve: "smooth", width: 3 },
                                            dataLabels: { enabled: false },
                                            grid: { strokeDashArray: 4 },
                                            xaxis: {
                                                type: "category",
                                                labels: {
                                                    formatter: (v) => {
                                                        try {
                                                            return dayjs(v).format("DD/MM");
                                                        } catch {
                                                            return String(v);
                                                        }
                                                    },
                                                },
                                            },
                                            yaxis: { labels: { formatter: (v) => formatNumber(v) } },
                                            tooltip: { y: { formatter: (v) => `${formatNumber(v)} ชม.` } },
                                            colors: ["#fdca01"],
                                            fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.08 } },
                                        }}
                                        series={analytics.charts.areaSeries}
                                        type="area"
                                        height={280}
                                    />
                                ) : (
                                    <Typography variant="caption" color="text.secondary">

                                    </Typography>
                                )}
                            </CardShell>
                        </Box>

                        {/* แถวกราฟ 2: Deadline density */}
                        <Box sx={{ mt: 1.25 }}>
                            <CardShell title="Top 10 วันที่ครบกำหนดที่หนาแน่น">
                                {analytics.charts.deadlineCategories.length ? (
                                    <ReactApexChart
                                        options={{
                                            chart: { type: "bar", toolbar: { show: false } },
                                            plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
                                            dataLabels: { enabled: true, style: { fontWeight: 900 } },
                                            grid: { strokeDashArray: 4 },
                                            xaxis: { categories: analytics.charts.deadlineCategories },
                                            yaxis: { labels: { formatter: (v) => formatNumber(v) } },
                                            tooltip: { y: { formatter: (v) => `${formatNumber(v)} งาน` } },
                                            colors: ["#ff4059"],
                                            legend: { show: false },
                                        }}
                                        series={analytics.charts.deadlineSeries}
                                        type="bar"
                                        height={260}
                                    />
                                ) : (
                                    <Typography variant="caption" color="text.secondary">

                                    </Typography>
                                )}
                            </CardShell>
                        </Box>
                    </>
                )}
            </Paper>

            {/* ===== SubTasks Box ===== */}
            {/* ❗️ตามที่สั่ง: “Box รายการงานย่อย” ต้องมีตารางเหมือนงานหลักแบบเป๊ะ ๆ */}
            <Paper elevation={0} sx={{ border: "1px solid", borderColor: "grey.200", boxShadow: "none", overflow: "hidden" }}>
                {subTasksState.loading ? (
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
                            <Typography sx={{ fontWeight: 900, fontSize: 15 }}>รายการงานย่อย</Typography>

                        </Box>

                        <Tooltip title="เพิ่มงานย่อย">
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
                                aria-label="เพิ่มงานย่อย"
                            >
                                <AddCircleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                <Divider />

                {subTasksState.loading ? (
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
                        loading={subTasksState.loading}
                        rows={subTasksState.rows}
                        onRowClick={() => {
                            // งานย่อยในหน้านี้ยังไม่ต้อง navigate ต่อ (คง pattern กดแถวได้ แต่ไม่ทำอะไร)
                        }}
                        onEditRow={openEditDialog}
                        onDeleteRow={openDeleteDialog}
                    />
                )}
            </Paper>

            {/* ===== Delete dialog ===== */}
            <Dialog open={deleteDialog.open} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 900 }}>ยืนยันการลบ</DialogTitle>
                <DialogContent>
                    <Typography>ลบงานย่อย "{deleteDialog.row?.name || deleteDialog.row?.code || "—"}" หรือไม่?</Typography>
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
            <Dialog open={subTaskDialog.open} onClose={closeSubTaskDialog} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 900 }}>{subTaskDialog.mode === "edit" ? "แก้ไขงานย่อย" : "เพิ่มงานย่อย"}</DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {/* ซ่อน code เหมือนงานหลัก */}
                        <TextField
                            size="small"
                            label="รหัสงาน"
                            value={subTaskDialog.form.code}
                            onChange={(e) => setSubTaskDialog((prev) => ({ ...prev, form: { ...prev.form, code: e.target.value } }))}
                            fullWidth
                            required
                            sx={{ display: "none" }}
                        />

                        <TextField
                            size="small"
                            label="ชื่องานย่อย"
                            value={subTaskDialog.form.name}
                            onChange={(e) => setSubTaskDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
                            fullWidth
                            required
                        />

                        <TextField
                            select
                            size="small"
                            label="สถานะ"
                            value={subTaskDialog.form.status}
                            onChange={(e) => setSubTaskDialog((prev) => ({ ...prev, form: { ...prev.form, status: e.target.value } }))}
                            fullWidth
                            sx={{ display: "none" }}
                        >
                            {["ยังไม่เริ่ม", "กำลังทำ", "เสร็จแล้ว"].map((s) => (
                                <MenuItem key={s} value={s}>
                                    {s}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            size="small"
                            label="ผู้รับผิดชอบ"
                            value={ownerDisplay}
                            onClick={() => {
                                setOwnerSelection(String(subTaskDialog?.form?.owner || "").trim() || null);
                                setEmployeeSearch("");
                                setOwnerDialogOpen(true);
                            }}
                            error={Boolean(subTaskDialog?.errors?.owner)}
                            fullWidth
                            required
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setOwnerSelection(String(subTaskDialog?.form?.owner || "").trim() || null);
                                                setEmployeeSearch("");
                                                setOwnerDialogOpen(true);
                                            }}
                                            aria-label="ค้นหา/เลือกผู้รับผิดชอบ"
                                        >
                                            <SearchRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
                            <Stack direction="column" spacing={1.25}>
                                <DatePicker
                                    label="วันที่เริ่ม"
                                    value={subTaskDialog.form.start_date ? dayjs(subTaskDialog.form.start_date) : null}
                                    minDate={taskStartDay || undefined}
                                    maxDate={taskEndDay || undefined}
                                    onChange={(v) =>
                                        setSubTaskDialog((prev) => {
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
                                            error: Boolean(subTaskDialog?.errors?.start_date),
                                            helperText: subTaskDialog?.errors?.start_date || "",
                                        },
                                    }}
                                    sx={{ width: "100%" }}
                                />

                                <DatePicker
                                    label="วันที่สิ้นสุด"
                                    value={subTaskDialog.form.end_date ? dayjs(subTaskDialog.form.end_date) : null}
                                    minDate={toDayjsDate(subTaskDialog.form.start_date) || taskStartDay || undefined}
                                    maxDate={taskEndDay || undefined}
                                    onChange={(v) =>
                                        setSubTaskDialog((prev) => {
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
                                            error: Boolean(subTaskDialog?.errors?.end_date),
                                            helperText: subTaskDialog?.errors?.end_date || "",
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
                            value={subTaskDialog.form.planned_hours}
                            onChange={(e) =>
                                setSubTaskDialog((prev) => {
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
                            error={Boolean(subTaskDialog?.errors?.planned_hours)}
                            helperText={subTaskDialog?.errors?.planned_hours || ""}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "center" }}>
                    <Button onClick={closeSubTaskDialog} disabled={subTaskDialog.saving} sx={{ color: "#000", textTransform: "none" }} size="medium">
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={saveSubTask}
                        disabled={
                            subTaskDialog.saving ||
                            !subTaskDialog.form.start_date ||
                            !subTaskDialog.form.end_date ||
                            !String(subTaskDialog.form.owner || "").trim() ||
                            Boolean(subTaskDialog?.errors?.planned_hours)
                        }
                        sx={{ ...actionBtnSx }}
                        startIcon={<SaveIcon />}
                        size="medium"
                    >
                        บันทึก
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ===== Owner Picker Dialog ===== */}
            <Dialog
                open={ownerDialogOpen}
                onClose={() => setOwnerDialogOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
            >
                <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    เลือกผู้รับผิดชอบ
                    <IconButton onClick={() => setOwnerDialogOpen(false)} size="small" aria-label="ปิด">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, px: 2, py: 1, overflow: 'hidden' }}>
                    <TextField
                        size="small"
                        placeholder="ค้นหา"
                        fullWidth
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        sx={{ mt: 3, mb: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <List sx={{ mt: 0.5, flex: 1, overflow: "auto" }}>
                        {filteredEmployees.map((emp, idx) => {
                            const idKey = emp?.id;
                            const checked = String(ownerSelection || "") === String(idKey || "");
                            const code = String(emp?.employee_code || "").trim();
                            const name = String(SubTask.formatEmployee(emp) || "").trim();
                            const secondary = name && name !== code ? name : "";
                            return (
                                <ListItemButton
                                    key={String(idKey || emp?.employee_code || emp?.employee_id || idx)}
                                    onClick={() => setOwnerSelection(idKey || null)}
                                >
                                    <ListItemIcon>
                                        <Checkbox size="small" color="error" checked={checked} tabIndex={-1} disableRipple />
                                    </ListItemIcon>
                                    <ListItemText primary={secondary} />
                                </ListItemButton>
                            );
                        })}
                    </List>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "center", gap: 1.25 }}>
                    <Button onClick={() => setOwnerDialogOpen(false)} sx={{ color: "common.black", ...actionBtnSx }} disableElevation>
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                            const selected = ownerSelection ? String(ownerSelection) : "";
                            setSubTaskDialog((prev) => ({
                                ...prev,
                                form: { ...prev.form, owner: selected },
                                errors: { ...(prev.errors || {}), owner: "" },
                            }));
                            setOwnerDialogOpen(false);
                        }}
                        disableElevation
                    >
                        ตกลง
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
