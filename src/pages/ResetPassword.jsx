// ===== ResetPassword.jsx (แทนทั้งไฟล์) =====
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Skeleton,
  Snackbar,
  Alert,
  Paper,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// ✅ ใช้ layout/asset เดียวกับหน้า Login ล่าสุด
import heroImg from "@/assets/auth-img.webp";
import smile from "@/assets/emoji-smile.gif";

function ResetPasswordSkeleton({ isMdDown, isSmall }) {
  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "#ffffff",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(980px, 100%)",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
          border: "1px solid rgba(53, 53, 53, 0.08)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMdDown ? "1fr" : "0.9fr 1.1fr",
            minHeight: isMdDown ? "unset" : 560,
          }}
        >
          {!isMdDown && (
            <Box sx={{ position: "relative", p: 3, color: "#111", bgcolor: "#fff" }}>
              <Skeleton variant="rectangular" sx={{ position: "absolute", inset: 0 }} />
              <Box sx={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="text" width={140} />
              </Box>
            </Box>
          )}

          <Box sx={{ p: isSmall ? 3 : 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ width: "min(400px, 100%)" }}>
              <Stack spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={70} height={70} />
                <Skeleton variant="text" width={260} height={42} />
                <Skeleton variant="text" width={300} />
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rectangular" height={1} />
                  <Skeleton variant="text" width="100%" />
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const PALETTE = useMemo(
    () => ({
      success: "#08d84c",
      warning: "#fdca01",
      error: "#ff4059",
    }),
    []
  );

  useEffect(() => {
    let alive = true;

    const preload = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });

    Promise.all([preload(heroImg), preload(smile)]).finally(() => {
      if (alive) setPageLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  if (pageLoading) {
    return <ResetPasswordSkeleton isMdDown={isMdDown} isSmall={isSmall} />;
  }

  // ✅ logic เดิม (ห้ามยุ่ง)
  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !confirm) {
      return setSnackbar({ open: true, message: "กรุณากรอกรหัสผ่านให้ครบ", severity: "error" });
    }
    if (password !== confirm) {
      return setSnackbar({ open: true, message: "รหัสผ่านไม่ตรงกัน", severity: "error" });
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      return setSnackbar({ open: true, message: error.message, severity: "error" });
    }

    setSnackbar({ open: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย", severity: "success" });
    setTimeout(() => navigate("/login"), 1200);
  };

  const textFieldFontSx = {
    "& .MuiInputBase-input": { fontFamily: "Kanit" },
    "& .MuiInputLabel-root": { fontFamily: "Kanit" },
    "& .MuiFormHelperText-root": { fontFamily: "Kanit" },
    "& input::placeholder": { fontFamily: "Kanit" },
  };

  // ใช้สไตล์เดียวกับหน้า Login (โฟกัสสีเขียว)
  const fieldSx = {
    "& .MuiInputLabel-root": { color: "#111" },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: "rgba(17,17,17,0.16)" },
      "&:hover fieldset": { borderColor: "rgba(17,17,17,0.30)" },
      "&.Mui-focused fieldset": { borderColor: PALETTE.success, borderWidth: 2 },
    },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px #fff inset",
    },
  };

  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "#ffffff",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(980px, 100%)",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
          border: "1px solid rgba(53, 53, 53, 0.08)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMdDown ? "1fr" : "0.9fr 1.1fr",
            minHeight: isMdDown ? "unset" : 560,
          }}
        >
          {/* LEFT PANEL */}
          {!isMdDown && (
            <Box sx={{ position: "relative", p: 3, color: "#111", bgcolor: "#fff" }}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${heroImg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 1,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255, 255, 255, 0.1)",
                }}
              />

              <Box sx={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ flex: 1 }} />
                <Typography
                  sx={{
                    opacity: 0.75,
                    fontSize: 12,
                    color: "rgba(15,23,42,0.75)",
                    fontFamily: "Kanit",
                    textAlign: "center",
                  }}
                >
                  เวอร์ชัน 1.0.0 Beta
                </Typography>
              </Box>
            </Box>
          )}

          {/* RIGHT PANEL */}
          <Box sx={{ p: isSmall ? 3 : 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ width: "min(400px, 100%)" }}>
              <Stack spacing={1.5} alignItems="center">
                <Box component="img" src={smile} alt="smile" sx={{ width: 70, height: 70, mb: 0.5 }} />

                <Typography
                  sx={{
                    fontFamily: "Kanit",
                    fontSize: 30,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    textAlign: "center",
                  }}
                >
                  เปลี่ยนรหัสผ่านใหม่
                </Typography>

                <Typography
                  sx={{
                    fontFamily: "Kanit",
                    mt: 0.5,
                    color: "text.secondary",
                    textAlign: "center",
                  }}
                >
                  กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleReset} sx={{ mt: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    label="รหัสผ่านใหม่"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    size="medium"
                    sx={{ ...fieldSx, ...textFieldFontSx }}
                    disabled={loading}
                  />

                  <TextField
                    label="ยืนยันรหัสผ่านใหม่"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    fullWidth
                    size="medium"
                    sx={{ ...fieldSx, ...textFieldFontSx }}
                    disabled={loading}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    sx={{
                      fontFamily: "Kanit",
                      mt: 0.5,
                      py: 1.25,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 500,
                      letterSpacing: "0.01em",
                      fontSize: 16,
                      backgroundColor: PALETTE.error,
                      boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
                      "&:hover": {
                        backgroundColor: PALETTE.error,
                        boxShadow: "0 16px 34px rgba(15, 23, 42, 0.16)",
                      },
                    }}
                  >
                    {loading ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนรหัสผ่าน"}
                  </Button>

                  <Divider sx={{ opacity: 0.6 }} />

                  <Typography sx={{ color: "text.secondary", fontSize: 12, fontFamily: "Kanit" }}>
                    * หากลิงก์หมดอายุ กรุณากด “ลืมรหัสผ่าน?” ใหม่จากหน้าเข้าสู่ระบบ
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
