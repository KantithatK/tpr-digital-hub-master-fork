// ===== Register.jsx (แทนทั้งไฟล์) =====
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Paper,
  Skeleton,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { supabase } from "@/lib/supabaseClient";

// ✅ ใช้ Notify popup แทน Snackbar
import { useNotify } from "@/tpr/contexts/notifyContext";

// ✅ ภาพและอีโมจิเดียวกับหน้า Login (ตามฐานล่าสุด)
import heroImg from "@/assets/auth-img.png";
import smile from "@/assets/emoji-smile.gif";

function RegisterSkeleton({ isMdDown, isSmall }) {
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
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isMdDown ? "1fr" : "1fr 1fr",
            minHeight: isMdDown ? "unset" : 560,
          }}
        >
          {!isMdDown && (
            <Box sx={{ position: "relative", p: 3, bgcolor: "#fff" }}>
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
                <Skeleton variant="text" width={200} height={42} />
                <Skeleton variant="text" width={240} />
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={52} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Skeleton variant="text" width={120} />
                    <Skeleton variant="text" width={170} />
                  </Box>
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

function normalizeEmail(v) {
  return (v || "").trim();
}

function mapAuthErrorToThai(error) {
  if (!error) return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

  const code = String(error.code || "").toLowerCase();
  const msg = String(error.message || "").toLowerCase();

  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return "ลงทะเบียนแล้ว แต่อีเมลยังไม่ได้ยืนยัน กรุณาตรวจสอบกล่องจดหมายแล้วกดยืนยันอีเมล";
  }

  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "อีเมลนี้ถูกลงทะเบียนแล้ว";
  }

  if (msg.includes("password") && msg.includes("weak")) {
    return "รหัสผ่านไม่ปลอดภัย กรุณาตั้งรหัสผ่านให้คาดเดายากขึ้น";
  }

  if (msg.includes("too many requests") || code === "over_request_rate_limit") {
    return "คุณทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch")) {
    return "เครือข่ายมีปัญหา กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }

  return error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

export default function Register() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const notify = useNotify();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ✅ palette ตามฐาน Login ล่าสุด
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
    return <RegisterSkeleton isMdDown={isMdDown} isSmall={isSmall} />;
  }

  // ✅ ===== logic เดิม (ห้ามยุ่ง) =====
  const handleRegister = async (e) => {
    e.preventDefault();

    const emailTrim = normalizeEmail(email);

    if (!emailTrim) return notify.warning("กรุณากรอกอีเมล");
    if (!password) return notify.warning("กรุณากรอกรหัสผ่าน");
    if (password.length < 6) return notify.warning("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return notify.warning("รหัสผ่านไม่ตรงกัน");

    setLoading(true);
    try {
      // ✅ ตรวจสอบอีเมลพนักงาน (RPC: security definer) ไม่ติด RLS
      const { data: exists, error: rpcErr } = await supabase.rpc("check_employee_email", {
        p_email: emailTrim,
      });

      if (rpcErr) {
        notify.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูลพนักงาน");
        return;
      }

      if (!exists) {
        notify.error("ไม่พบอีเมลนี้ในรายชื่อพนักงาน กรุณาติดต่อผู้ดูแลระบบ");
        return;
      }

      // ✅ ลงทะเบียน
      const { error: signUpErr } = await supabase.auth.signUp({
        email: emailTrim,
        password,
      });

      if (signUpErr) {
        notify.error(mapAuthErrorToThai(signUpErr));
        return;
      }

      // ✅ role_id=11 จะถูกสร้างให้โดย Trigger ใน DB
      notify.success("ลงทะเบียนสำเร็จ กรุณายืนยันอีเมลของคุณ");

      setTimeout(() => navigate("/login"), 1200);
    } catch {
      notify.error("เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };
  // ✅ ===== end logic เดิม =====

  const textFieldFontSx = {
    "& .MuiInputBase-input": { fontFamily: "Kanit" },
    "& .MuiInputLabel-root": { fontFamily: "Kanit" },
    "& .MuiFormHelperText-root": { fontFamily: "Kanit" },
    "& input::placeholder": { fontFamily: "Kanit" },
  };

  // ✅ ให้สไตล์ field เหมือน Login ล่าสุด
  const emailFieldSx = {
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

  const passwordFieldSx = {
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
        }}
      >
        <Box
          sx={{
            display: "grid",
            // ✅ ฝั่งขวากว้างกว่าฝั่งซ้าย
            gridTemplateColumns: isMdDown ? "1fr" : "1fr 1fr",
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

          
            </Box>
          )}

          {/* RIGHT PANEL (FORM) */}
          <Box sx={{ p: isSmall ? 3 : 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ width: "min(400px, 100%)" }}>
              <Stack spacing={1.5} alignItems="center">
                <Box
                  component="img"
                  src={smile}
                  alt="smile"
                  sx={{
                    width: 70,
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
                  ลงทะเบียน
                </Typography>

                <Typography
                  sx={{
                    fontFamily: "Kanit",
                    mt: 0.5,
                    color: "text.secondary",
                    textAlign: "center",
                  }}
                >
                  กรอกข้อมูลเพื่อสร้างบัญชีใหม่
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleRegister} sx={{ mt: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    label="อีเมล"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    autoComplete="email"
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
                    autoComplete="new-password"
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

                  <TextField
                    label="ยืนยันรหัสผ่าน"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    fullWidth
                    autoComplete="new-password"
                    size="medium"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword((s) => !s)}
                            edge="end"
                            disabled={loading}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                    {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                  </Button>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link
                      component={RouterLink}
                      to="/login"
                      underline="hover"
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "text.secondary",
                        fontFamily: "Kanit",
                      }}
                    >
                      
                    </Link>

                    <Link
                      component={RouterLink}
                      to="/login"
                      underline="hover"
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "text.secondary",
                        fontFamily: "Kanit",
                      }}
                    >
                      มีบัญชีแล้ว? เข้าสู่ระบบ
                    </Link>
                  </Box>

                  <Divider sx={{ opacity: 0.6 }} />

                  <Typography sx={{ color: "text.secondary", fontSize: 12, fontFamily: "Kanit" }}>
                    * หลังลงทะเบียน กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ
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
