import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Link,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/assets/logo.png";
import { colors } from "@/theme/colors";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm")); // ✅ ตรวจสอบว่าเป็นจอเล็ก

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const { setUser: setAuthUser, setPermissions: setAuthPermissions } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      return setSnackbar({ open: true, message: "กรุณากรอกอีเมล", severity: "error" });
    }
    if (!password) {
      return setSnackbar({ open: true, message: "กรุณากรอกรหัสผ่าน", severity: "error" });
    }

    setLoading(true);
    const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setSnackbar({ open: true, message: error.message, severity: "error" });

    const user = loginData.user;

    // 📝 Log successful login event and daily presence
    try {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const platform = typeof navigator !== "undefined" ? navigator.platform : null;
      // Note: client cannot reliably get IP; leave null or use edge function/server if needed

      // Insert event-level log
      await supabase.from("user_login_logs").insert({
        user_id: user.id,
        email: user.email,
        user_agent: userAgent,
        platform,
        success: true,
      });

      // Upsert daily presence (one per user per day)
      const today = new Date();
      const loginDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      await supabase.from("user_daily_logins").upsert({
        user_id: user.id,
        email: user.email,
        login_date: loginDate.toISOString().slice(0, 10),
        first_login_at: new Date().toISOString(),
      }, { onConflict: "user_id,login_date" });
    } catch (logErr) {
      // avoid blocking login flow due to log failure
      console.warn("login logging failed", logErr);
    }

    // 🔑 ดึงสิทธิ์จาก DB
    const { data: userAccess } = await supabase
      .from("user_permissions_view")
      .select("role_name, permission_name")
      .eq("user_id", user.id);

    const permissions = userAccess ? [...new Set(userAccess.map((i) => i.permission_name))] : [];

    // เก็บ user และ permissions ใน context เพื่อให้ App.jsx และ component อื่นใช้งานได้
    try {
      setAuthUser(user);
      setAuthPermissions(permissions);
    } catch {
      // ignore
    }

    // ✅ redirect ตามสิทธิ์
    if (permissions.includes("access_sys_system")) {
      setSnackbar({ open: true, message: "เข้าสู่ระบบสำเร็จ", severity: "success" });
      return setTimeout(() => navigate("/sys"), 1000);
    }
    if (permissions.includes("access_hrm_system")) {
      setSnackbar({ open: true, message: "เข้าสู่ระบบสำเร็จ", severity: "success" });
      return setTimeout(() => navigate("/hrm"), 1000);
    }
    if (permissions.includes("access_tpr_system")) {
      setSnackbar({ open: true, message: "เข้าสู่ระบบสำเร็จ", severity: "success" });
      return setTimeout(() => navigate("/tpr"), 1000);
    }

    // ❌ ไม่มีสิทธิ์ที่ตรงเลย → บังคับ logout
    await supabase.auth.signOut();
    setSnackbar({ open: true, message: "เกิดข้อผิดพลาดบางอย่างขึ้น กรุณาลองใหม่อีกครั้ง", severity: "error" });
  };
  // 🔑 ฟังก์ชันลืมรหัสผ่าน
  const handleForgotPassword = async () => {
    if (!email)
      return setSnackbar({
        open: true,
        message: "กรุณากรอกอีเมลก่อน",
        severity: "error",
      });

    setSnackbar({
      open: true,
      message: "กำลังส่งอีเมลรีเซ็ตรหัสผ่าน...",
      severity: "info",
    });

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password", // 👈 เปลี่ยนเป็น URL ของโปรเจกต์จริง
    });
    setResetLoading(false);

    if (error) {
      return setSnackbar({ open: true, message: error.message, severity: "error" });
    }

    setSnackbar({
      open: true,
      message: "ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว",
      severity: "success",
    });
  };

  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={5}
        sx={{
          width: isSmall ? "100%" : 420, // ✅ จอเล็กเต็มจอ, จอใหญ่ fix 420px
          maxWidth: "100%",
          p: isSmall ? 3 : 4,
          borderRadius: 3,
        }}
      >
        <Box textAlign="center" mb={2}>
          <Box
            component="img"
            src={logo}
            alt="TPR logo"
            sx={{ width: isSmall ? 80 : 96, height: "auto", mx: "auto", mb: 1 }}
          />
          <Typography
            variant={isSmall ? "h6" : "h5"}
            component="h1"
            fontWeight={700}
          >
            เข้าสู่ระบบ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            เข้าสู่ระบบเพื่อใช้งาน TPR System
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="อีเมล"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
              sx={{
                '& .MuiInputLabel-root': { color: '#000' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#000' },
                '& .MuiFormLabel-root': { color: '#000' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#000' },
                  '&:hover fieldset': { borderColor: '#000' },
                  '&.Mui-focused fieldset': { borderColor: '#000' },
                },
                // Chrome autofill background override
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px #fff inset',
                },
              }}
            />

            <TextField
              label="รหัสผ่าน"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{
                '& .MuiInputLabel-root': { color: '#000' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#000' },
                '& .MuiFormLabel-root': { color: '#000' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#000' },
                  '&:hover fieldset': { borderColor: '#000' },
                  '&.Mui-focused fieldset': { borderColor: '#000' },
                },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px #fff inset',
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="medium"
              sx={{
                backgroundColor: colors.buttonMain,
                color: colors.buttonText,
                '&:hover': { backgroundColor: colors.buttonHover },
              }}
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>

            <Box
              display="flex"
              justifyContent="space-between"
              // flexDirection={isSmall ? "column" : "row"} // ✅ ถ้าเป็นมือถือให้เรียงเป็น column
              alignItems={isSmall ? "flex-start" : "center"}
              gap={1}
            >
              <Link
                component="button"
                underline="hover"
                sx={{ textTransform: "none", color: colors.linkMain, '&:hover': { color: colors.linkHover } }}
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "กำลังส่ง..." : "ลืมรหัสผ่าน?"}
              </Link>


              <Link component={RouterLink} to="/register" underline="hover" sx={{ color: colors.linkMain, '&:hover': { color: colors.linkHover } }}>
                ลงทะเบียน
              </Link>
            </Box>
          </Stack>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}
