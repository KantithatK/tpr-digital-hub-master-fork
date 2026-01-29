// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import logo from "./assets/logo.png";
import { colors } from "./theme/colors";

// MUI
import { Button, Stack, Typography, Box, CssBaseline } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// Layouts
import HrmDashboardLayout from "./hrm/DashboardLayoutMain.jsx";
import TprDashboardLayout from "./tpr/DashboardLayoutMain.jsx";

// Pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

// Auth
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

// Fonts
import "@fontsource/kanit/300.css";
import "@fontsource/kanit/400.css";
import "@fontsource/kanit/500.css";
import "@fontsource/kanit/600.css";
import "@fontsource/kanit/700.css";

/* =========================
   HOME PAGE (optional)
   ========================= */
function Home() {
  const navigate = useNavigate();

  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        px: 2,
        bgcolor: "#ffffff",
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
        sx={{ width: { xs: "90%", sm: "70%", md: "50%" }, maxWidth: 600 }}
      >
        <Box textAlign="center" mb={1}>
          <Box
            component="img"
            src={logo}
            alt="logo"
            sx={{ width: { xs: 140, sm: 160, md: 200 }, height: "auto" }}
          />
        </Box>

        <Typography
          sx={{
            fontFamily: "Kanit",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem", lg: "3rem" },
            fontWeight: 700,
            mt: 1,
          }}
        >
          TPR SYSTEM
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mt: 2, width: "100%", maxWidth: 360, mx: "auto" }}
        >
          <Button
            variant="contained"
            onClick={() => navigate("/login")}
            sx={{
              fontFamily: "Kanit",
              backgroundColor: colors.buttonMain,
              color: colors.buttonText,
              "&:hover": { backgroundColor: colors.buttonHover },
              "& .ctaIcon": {
                ml: 1,
                transition: "transform 300ms ease, opacity 300ms ease",
                animation: "ctaFade 1600ms ease-in-out infinite",
              },
              "@keyframes ctaFade": {
                "0%": { opacity: 1, transform: "translateX(0)" },
                "50%": { opacity: 0.35, transform: "translateX(6px)" },
                "100%": { opacity: 1, transform: "translateX(0)" },
              },
              boxShadow: "none",
              width: { xs: "100%", sm: 240 },
              px: 3,
            }}
          >
            เข้าใช้งานระบบ
            <ArrowForwardIcon className="ctaIcon" />
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

/* =========================
   404 PAGE
   ========================= */
function NotFound() {
  return (
    <Box
      component="main"
      sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", px: 2 }}
    >
      <Box textAlign="center">
        <Typography sx={{ fontFamily: "Kanit", fontSize: 48, fontWeight: 700 }}>
          404
        </Typography>
        <Typography sx={{ fontFamily: "Kanit", color: "text.secondary" }}>
          ไม่พบหน้าที่คุณต้องการ
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2, fontFamily: "Kanit" }}
          onClick={() => (window.location.href = "/login")}
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </Box>
    </Box>
  );
}

/* =========================
   APP ROOT
   ========================= */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CssBaseline />

        <Routes>
          {/* ✅ เข้าเว็บครั้งแรก → ไปหน้า login ทันที */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/home" element={<Home />} />

          {/* Protected pages */}
          <Route
            path="/hrm"
            element={
              <ProtectedRoute requiredPermission="access_hrm_system">
                <HrmDashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpr"
            element={
              <ProtectedRoute requiredPermission="access_tpr_system">
                <TprDashboardLayout />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
