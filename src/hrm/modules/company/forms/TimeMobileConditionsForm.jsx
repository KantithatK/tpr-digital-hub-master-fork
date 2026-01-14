import * as React from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import Paper from "@mui/material/Paper";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import MapIcon from "@mui/icons-material/Map";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";

export default function TimeMobileConditionsForm({ supabase }) {
    const [loading, setLoading] = React.useState(false);
    const [formError, setFormError] = React.useState("");
    const [rowErrors, setRowErrors] = React.useState({}); // { [id]: {field:msg} }

    const [initial, setInitial] = React.useState({ locations: [] });
    const [value, setValue] = React.useState({ locations: [] });
    const [preview, setPreview] = React.useState(null);

    const [snack, setSnack] = React.useState({ open: false, message: "", severity: "info" });

    const locations = Array.isArray(value.locations) ? value.locations : [];

    const canGeolocate = typeof navigator !== "undefined" && !!navigator.geolocation;

    const makeId = React.useCallback(() => {
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }, []);

    const toNum = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const validateRow = (r) => {
        const errs = {};
        const name = String(r?.name || "").trim();
        const lat = toNum(r?.lat);
        const lng = toNum(r?.lng);
        const radius = toNum(r?.radius);

        if (!name) errs.name = "กรุณากรอกชื่อสถานที่";
        if (lat === null || lat < -90 || lat > 90) errs.lat = "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90";
        if (lng === null || lng < -180 || lng > 180) errs.lng = "ลองติจูดต้องอยู่ระหว่าง -180 ถึง 180";
        if (radius === null || radius <= 0) errs.radius = "รัศมีต้องมากกว่า 0 เมตร (แนะนำ 30–200)";
        return errs;
    };

    const normalizeLocations = React.useCallback(
        (list) =>
            (Array.isArray(list) ? list : []).map((r) => ({
                id: r?.id || makeId(),
                name: r?.name ?? "",
                lat: r?.lat ?? "",
                lng: r?.lng ?? "",
                radius: r?.radius ?? 50,
                is_active: r?.is_active ?? true,
            })),
        [makeId]
    );

    const buildOsmEmbed = (lat, lng) => {
        const la = Number(lat);
        const ln = Number(lng);
        if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
        const pad = 0.01;
        const left = ln - pad;
        const right = ln + pad;
        const top = la + pad;
        const bottom = la - pad;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${la}%2C${ln}`;
    };

    const buildGoogleMapsUrl = (lat, lng) => {
        const la = Number(lat);
        const ln = Number(lng);
        if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
        return `https://www.google.com/maps?q=${la},${ln}`;
    };

    const load = React.useCallback(async () => {
        if (!supabase) {
            setFormError("ไม่พบ Supabase client: กรุณาส่ง prop supabase เข้ามาในคอมโพเนนต์นี้");
            return;
        }

        setFormError("");
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("tpr_get_time_mobile_geofences");
            if (error) throw error;

            const next = {
                locations: normalizeLocations(
                    (data || []).map((r) => ({
                        id: r.id,
                        name: r.name ?? "",
                        lat: r.lat ?? "",
                        lng: r.lng ?? "",
                        radius: r.radius ?? r.radius_m ?? 50
                        ,
                        is_active: r.is_active ?? true,
                    }))
                ),
            };

            setInitial(next);
            setValue(next);
            setRowErrors({});
        } catch (e) {
            setFormError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    }, [supabase, normalizeLocations]);

    React.useEffect(() => {
        load();
    }, [load]);

    const pushChange = (next) => setValue({ locations: next });

    const handleRowChange = (rowId, field, v) => {
        const next = locations.map((r) => (r.id === rowId ? { ...r, [field]: v } : r));
        pushChange(next);

        const row = next.find((x) => x.id === rowId);
        const errs = validateRow(row);
        setRowErrors((prev) => ({ ...prev, [rowId]: errs }));
    };

    const handleAdd = () => {
        setFormError("");
        const next = [...locations, { id: makeId(), name: "", lat: "", lng: "", radius: 50, is_active: true }];
        pushChange(next);
    };

    const handleRemove = (rowId) => {
        setFormError("");

        // If row has an id and supabase is provided, attempt immediate delete in DB
        const row = locations.find((r) => r.id === rowId);
        if (row && row.id && supabase) {
            (async () => {
                setLoading(true);
                try {
                    const { error } = await supabase.from("tpr_time_mobile_geofences").delete().eq("id", rowId);
                    if (error) throw error;
                    setSnack({ open: true, message: "ลบเรียบร้อย", severity: "success" });
                } catch (e) {
                    const msg = e?.message || String(e) || "ลบข้อมูลไม่สำเร็จ";
                    setFormError(msg);
                    setSnack({ open: true, message: msg, severity: "error" });
                    setLoading(false);
                    return;
                }

                setLoading(false);
                const next = locations.filter((r) => r.id !== rowId);
                pushChange(next);
                setRowErrors((prev) => {
                    const cp = { ...prev };
                    delete cp[rowId];
                    return cp;
                });
            })();
            return;
        }

        // Otherwise just remove locally
        const next = locations.filter((r) => r.id !== rowId);
        pushChange(next);
        setRowErrors((prev) => {
            const cp = { ...prev };
            delete cp[rowId];
            return cp;
        });
    };

    const getCurrentPosition = () =>
        new Promise((resolve, reject) => {
            if (!canGeolocate) return reject(new Error("อุปกรณ์/เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง"));
            navigator.geolocation.getCurrentPosition(
                (pos) =>
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
            );
        });

    const handleFillGPS = async (rowId) => {
        setFormError("");
        try {
            const p = await getCurrentPosition();
            handleRowChange(rowId, "lat", Number(p.lat).toFixed(7));
            handleRowChange(rowId, "lng", Number(p.lng).toFixed(7));
        } catch (e) {
            setFormError(`ดึงตำแหน่งไม่สำเร็จ: ${e?.message || String(e)}`);
        }
    };

    const handleReset = () => {
        setFormError("");
        setRowErrors({});
        setValue(initial);
    };


    const handleSave = async () => {
        if (!supabase) {
            setFormError("ไม่พบ Supabase client: กรุณาส่ง prop supabase เข้ามาในคอมโพเนนต์นี้");
            return;
        }

        setFormError("");

        // validate all
        const nextErrors = {};
        for (const r of locations) {
            const errs = validateRow(r);
            if (Object.keys(errs).length) nextErrors[r.id] = errs;
        }
        setRowErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            const msg = "ข้อมูลยังไม่ถูกต้อง กรุณาตรวจสอบช่องที่ขึ้นสีแดง";
            setFormError(msg);
            setSnack({ open: true, message: msg, severity: "error" });
            return;
        }

        // payload: numeric + trim
        const p_rows = locations.map((r) => ({
            id: r.id || null,
            name: String(r.name || "").trim(),
            lat: toNum(r.lat),
            lng: toNum(r.lng),
            radius: Math.round(toNum(r.radius)),
            is_active: !!r.is_active,
        }));

        setLoading(true);
        try {
            const { error } = await supabase.rpc("tpr_upsert_time_mobile_geofences", { p_rows });
            if (error) throw error;

            // reload ให้ UI ตรง DB + เซ็ต initial ใหม่
            await load();
            setSnack({ open: true, message: "บันทึกเรียบร้อย", severity: "success" });
        } catch (e) {
            const msg = e?.message || String(e) || "บันทึกข้อมูลผิดพลาด";
            setFormError(msg);
            setSnack({ open: true, message: msg, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnack = (event, reason) => {
        if (reason === "clickaway") return;
        setSnack((s) => ({ ...s, open: false }));
    };

    return (
        <Box
            sx={{
                position: "relative",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                bgcolor: "background.paper",
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box>
                    <Typography variant="subtitle1">กำหนดพื้นที่อนุญาตลงเวลา (Mobile Geofence)</Typography>
                    <Typography variant="caption" color="text.secondary">
                        เพิ่ม “พิกัด + รัศมี” สำหรับตรวจการเข้างานผ่านมือถือ (รองรับหลายจุด)
                    </Typography>
                </Box>

                {/* Actions ขวาบน: โหลดใหม่ / เพิ่มสถานที่ / บันทึก */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Button onClick={load} size="small" sx={{display: 'none'}}>
                        โหลดใหม่
                    </Button>

                    <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAdd} size="small" disabled={loading}>
                        เพิ่มสถานที่
                    </Button>
                    {/* Save moved to bottom; keep only load/add here */}
                </Stack>
            </Stack>

            {formError ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {formError}
                </Alert>
            ) : null}

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                }}
            >
                <Table size="small" sx={{ "& th, & td": { borderBottom: "none" } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 220, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}>
                                ชื่อสถานที่
                            </TableCell>
                            <TableCell sx={{ width: 160, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}>
                                ละติจูด
                            </TableCell>
                            <TableCell sx={{ width: 160, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}>
                                ลองติจูด
                            </TableCell>
                            <TableCell sx={{ width: 140, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}>
                                รัศมี (m)
                            </TableCell>
                            <TableCell
                                sx={{ width: 120, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}
                                align="center"
                            >
                                สถานะ
                            </TableCell>
                            <TableCell
                                sx={{ width: 160, bgcolor: (t) => t.palette.grey[100], fontWeight: 600 }}
                                align="center"
                            >
                                Map / GPS
                            </TableCell>
                            <TableCell sx={{ width: 60, bgcolor: (t) => t.palette.grey[100] }}></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {locations.map((loc) => {
                            const e = rowErrors[loc.id] || {};
                            return (
                                <TableRow key={loc.id}>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={loc.name}
                                            onChange={(ev) => handleRowChange(loc.id, "name", ev.target.value)}
                                            disabled={loading}
                                            error={!!e.name}
                                            helperText={e.name || " "}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={loc.lat}
                                            inputProps={{ step: "0.0000001" }}
                                            onChange={(ev) => handleRowChange(loc.id, "lat", ev.target.value)}
                                            disabled={loading}
                                            error={!!e.lat}
                                            helperText={e.lat || " "}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={loc.lng}
                                            inputProps={{ step: "0.0000001" }}
                                            onChange={(ev) => handleRowChange(loc.id, "lng", ev.target.value)}
                                            disabled={loading}
                                            error={!!e.lng}
                                            helperText={e.lng || " "}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={loc.radius}
                                            inputProps={{ step: "1", min: 1 }}
                                            onChange={(ev) => handleRowChange(loc.id, "radius", ev.target.value)}
                                            disabled={loading}
                                            error={!!e.radius}
                                            helperText={e.radius || " "}
                                        />
                                    </TableCell>

                                    <TableCell align="center">
                                        <FormControlLabel
                                            sx={{ m: 0 }}
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={!!loc.is_active}
                                                    onChange={(ev) => handleRowChange(loc.id, "is_active", ev.target.checked)}
                                                    disabled={loading}
                                                />
                                            }
                                            label={loc.is_active ? "เปิด" : "ปิด"}
                                        />
                                    </TableCell>

                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} justifyContent="center">
                                            <Tooltip title={canGeolocate ? "ดึงพิกัดปัจจุบัน" : "อุปกรณ์ไม่รองรับ GPS"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleFillGPS(loc.id)}
                                                        disabled={loading || !canGeolocate}
                                                    >
                                                        <MyLocationIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="ดูแผนที่">
                                                <span>
                                                    <IconButton size="small" onClick={() => setPreview({ ...loc })} disabled={loading}>
                                                        <MapIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="เปิด Google Maps">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            const url = buildGoogleMapsUrl(loc.lat, loc.lng);
                                                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                                                            else setFormError("กรุณากรอก lat/lng ให้ถูกต้องก่อนเปิดแผนที่");
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        <OpenInNewIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleRemove(loc.id)} disabled={loading}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {locations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    {loading ? (
                                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                            <CircularProgress size={16} />
                                            <Typography variant="body2">กำลังโหลด...</Typography>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2">ไม่มีสถานที่</Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Actions: มุมล่างขวา ใต้ตาราง */}
            <Stack
                direction="row"
                justifyContent="flex-end"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1.5 }}
            >
                <Button
                    onClick={handleReset}
                    disabled={loading}
                    startIcon={<RestartAltIcon />}
                    variant="outlined"
                >
                    รีเซต
                </Button>

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                    startIcon={<SaveIcon />}
                >
                    {loading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
            </Stack>


            {/* Dialog / Snackbar เหมือนเดิม */}
            <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
                <DialogTitle>แผนที่ (Preview)</DialogTitle>
                <DialogContent>
                    {preview ? (
                        <Box>
                            <Typography sx={{ mb: 1 }}>
                                {preview.name || "—"} • {preview.lat || "—"},{preview.lng || "—"} • รัศมี {preview.radius || "—"} m
                            </Typography>

                            {buildOsmEmbed(preview.lat, preview.lng) ? (
                                <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                                    <iframe title="map" src={buildOsmEmbed(preview.lat, preview.lng)} width="100%" height="360" style={{ border: 0 }} />
                                </Box>
                            ) : (
                                <Alert severity="warning">กรุณากรอก lat/lng ให้ถูกต้องก่อน</Alert>
                            )}

                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button
                                    size="small"
                                    startIcon={<OpenInNewIcon />}
                                    onClick={() => {
                                        const url = buildGoogleMapsUrl(preview.lat, preview.lng);
                                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                                        else setFormError("กรุณากรอก lat/lng ให้ถูกต้องก่อนเปิดแผนที่");
                                    }}
                                >
                                    เปิดใน Google Maps
                                </Button>
                            </Stack>
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={handleCloseSnack}
                    severity={snack.severity}
                    variant="filled"
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );

}
