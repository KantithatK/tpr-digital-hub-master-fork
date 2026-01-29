// ===== Login.jsx (แทนทั้งไฟล์) =====
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Link,
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

// ✅ ใช้ popup แจ้งเตือน
import { useNotify } from "@/tpr/contexts/notifyContext";

// ✅ ภาพฝั่งซ้าย
import heroImg from "@/assets/auth-img.webp";
import smile from "@/assets/emoji-smile.gif";

function normalizeEmail(v) {
  return (v || "").trim();
}

function mapAuthErrorToThai(error) {
  if (!error) return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

  const code = String(error.code || "").toLowerCase();
  const msg = String(error.message || "").toLowerCase();

  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return "อีเมลยังไม่ได้ยืนยัน กรุณาตรวจสอบกล่องจดหมายแล้วกดยืนยันอีเมลก่อนเข้าสู่ระบบ";
  }

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials") ||
    code === "invalid_login_credentials"
  ) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }

  if (msg.includes("user not found") || code === "user_not_found") {
    return "ไม่พบบัญชีผู้ใช้นี้ในระบบ";
  }

  if (msg.includes("user is banned") || code === "user_banned") {
    return "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
  }

  if (msg.includes("too many requests") || code === "over_request_rate_limit") {
    return "คุณทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch")) {
    return "เครือข่ายมีปัญหา กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }

  return error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

export default function Login() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const notify = useNotify();
  const { setUser: setAuthUser, setPermissions: setAuthPermissions } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);


  // ✅ color palette ตามที่สั่ง
  const PALETTE = useMemo(
    () => ({
      success: "#08d84c",
      warning: "#fdca01",
      error: "#ff4059",
    }),
    []
  );

  // ✅ ดึงคำคม random จากตาราง quotes (คง logic เดิม)
  useEffect(() => {
    let alive = true;

    const loadRandomQuote = async () => {
      try {
        const { data, error } = await supabase.from("quotes").select("id,name").limit(500);

        if (!alive) return;
        if (error || !data?.length) {
          return;
        }


      } catch {
        if (!alive) return;

      }
    };

    loadRandomQuote();
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailTrim = normalizeEmail(email);

    if (!emailTrim) return notify.warning("กรุณากรอกอีเมล");
    if (!password) return notify.warning("กรุณากรอกรหัสผ่าน");

    setLoading(true);
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password,
    });
    setLoading(false);

    if (error) return notify.error(mapAuthErrorToThai(error));

    const user = loginData.user;

    // 📝 Log login (ไม่บล็อก flow)
    try {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const platform = typeof navigator !== "undefined" ? navigator.platform : null;

      await supabase.from("user_login_logs").insert({
        user_id: user.id,
        email: user.email,
        user_agent: userAgent,
        platform,
        success: true,
      });

      const today = new Date();
      const loginDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      await supabase.from("user_daily_logins").upsert(
        {
          user_id: user.id,
          email: user.email,
          login_date: loginDate.toISOString().slice(0, 10),
          first_login_at: new Date().toISOString(),
        },
        { onConflict: "user_id,login_date" }
      );
    } catch {
      // ignore
    }

    // 🔑 ดึงสิทธิ์
    const { data: userAccess, error: permErr } = await supabase
      .from("user_permissions_view")
      .select("role_name, permission_name")
      .eq("user_id", user.id);

    if (permErr) {
      await supabase.auth.signOut();
      return notify.error("เกิดข้อผิดพลาดในการดึงสิทธิ์ผู้ใช้งาน กรุณาลองใหม่อีกครั้ง");
    }

    const permissions = userAccess ? [...new Set(userAccess.map((i) => i.permission_name))] : [];

    try {
      setAuthUser(user);
      setAuthPermissions(permissions);
    } catch {
      // ignore
    }

    // ✅ redirect
    if (permissions.includes("access_sys_system")) {
      notify.success("เข้าสู่ระบบสำเร็จ");
      return setTimeout(() => navigate("/sys"), 600);
    }
    if (permissions.includes("access_hrm_system")) {
      notify.success("เข้าสู่ระบบสำเร็จ");
      return setTimeout(() => navigate("/hrm"), 600);
    }
    if (permissions.includes("access_tpr_system")) {
      notify.success("เข้าสู่ระบบสำเร็จ");
      return setTimeout(() => navigate("/tpr"), 600);
    }

    await supabase.auth.signOut();
    notify.error("บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ");
  };

  const handleForgotPassword = async () => {
    const emailTrim = normalizeEmail(email);
    if (!emailTrim) return notify.error("กรุณากรอกอีเมลก่อน");

    notify.info("กำลังส่งอีเมลรีเซ็ตรหัสผ่าน...");
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    setResetLoading(false);

    if (error) return notify.error(mapAuthErrorToThai(error));

    notify.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
  };

  const textFieldFontSx = {
    "& .MuiInputBase-input": { fontFamily: "Kanit" },          // ตัวอักษรในช่อง
    "& .MuiInputLabel-root": { fontFamily: "Kanit" },          // label
    "& .MuiFormHelperText-root": { fontFamily: "Kanit" },      // helper text (ถ้ามี)
    "& input::placeholder": { fontFamily: "Kanit" },           // placeholder (ถ้ามี)
  };

  // ✅ แยก sx ของ email / password ตาม requirement
  const emailFieldSx = {
    "& .MuiInputLabel-root": { color: "#111" },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: "rgba(17,17,17,0.16)" },
      "&:hover fieldset": { borderColor: "rgba(17,17,17,0.30)" },
      "&.Mui-focused fieldset": { borderColor: PALETTE.success, borderWidth: 2 }, // ✅ 08d84c
    },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px #fff inset",
    },
  };

  const passwordFieldSx = {
    "& .MuiInputLabel-root": { color: "#111" },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: "rgba(17,17,17,0.16)" },
      "&:hover fieldset": { borderColor: "rgba(17,17,17,0.30)" },
      "&.Mui-focused fieldset": { borderColor: PALETTE.success, borderWidth: 2 }, // ✅ 08d84c
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
        bgcolor: "#ffffff", // ✅ พื้นหลังขาว
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
          border: "1px solid rgba(53, 53, 53, 0.08)", // ✅ border บาง ๆ
        }}
      >
        <Box
          sx={{
            display: "grid",
            // ✅ ฝั่งขวากว้างกว่าฝั่งซ้าย
            gridTemplateColumns: isMdDown ? "1fr" : "0.9fr 1.1fr",
            minHeight: isMdDown ? "unset" : 560,
          }}
        >
          {/* LEFT PANEL */}
          {!isMdDown && (
            <Box
              sx={{
                position: "relative",
                p: 3,
                color: "#111",
                bgcolor: "#fff",
              }}
            >
              {/* ✅ เอา gradient ออก เหลือรูปเพียวๆ + overlay ขาวบางๆ */}
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
                  // overlay ขาวบาง ๆ เพื่อให้อ่าน logo/text ได้
                  background: "rgba(255, 255, 255, 0.1)",
                }}
              />

              <Box sx={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>

                </Box>

                <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#0f172a" }}>

                    </Typography>
                    {/* ✅ ลบ “คำคมประจำวันนี้” ออกตามที่สั่ง (ไม่แสดง quote) */}
                  </Box>
                </Box>

                <Typography sx={{ opacity: 0.75, fontSize: 12, color: "rgba(15,23,42,0.75)", fontFamily: "Kanit", textAlign: "center" }}>
                  เวอร์ชัน 1.0.0 Beta
                </Typography>
              </Box>
            </Box>
          )}

          {/* RIGHT PANEL (FORM) */}
          <Box sx={{ p: isSmall ? 3 : 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ width: "min(400px, 100%)" }}>
              <Stack spacing={1.5} alignItems="center">
                {/* 🌞 รูปด้านบน */}
                <Box
                  component="img"
                  src={smile}
                  alt="sun"
                  sx={{
                    width: 70,          // ปรับขนาดได้
                    height: 70,
                    mb: 0.5,
                  }}
                />

                <Typography
                  sx={{
                    fontFamily: "Kanit",
                    fontSize: 30,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    textAlign: "center",
                  }}
                >
                  เริ่มต้นวันทำงาน
                </Typography>

                <Typography
                  sx={{
                    fontFamily: "Kanit",
                    mt: 0.5,
                    color: "text.secondary",
                    textAlign: "center",
                  }}
                >
                  กรุณาเข้าสู่ระบบเพื่อใช้งาน
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    label="อีเมล"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    size="medium"
                    sx={{ ...emailFieldSx, ...textFieldFontSx }}
                    disabled={loading}
                  />

                  <TextField
                    label="รหัสผ่าน"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    size="medium"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" disabled={loading}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ ...passwordFieldSx, ...textFieldFontSx }}
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
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                  </Button>


                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link
                      component="button"
                      underline="hover"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "text.secondary",
                        fontFamily: "Kanit",
                      }}
                    >
                      {resetLoading ? "กำลังส่ง..." : "ลืมรหัสผ่าน?"}
                    </Link>

                    <Link
                      component={RouterLink}
                      to="/register"
                      underline="hover"
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "text.secondary",
                        fontFamily: "Kanit",
                      }}
                    >
                      ลงทะเบียน
                    </Link>
                  </Box>

                  <Divider sx={{ opacity: 0.6 }} />

                  <Typography sx={{ color: "text.secondary", fontSize: 12, fontFamily: "Kanit" }}>
                    * หากเข้าสู่ระบบไม่ได้ กรุณาตรวจสอบการยืนยันอีเมล หรือ ติดต่อผู้ดูแลระบบ
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
