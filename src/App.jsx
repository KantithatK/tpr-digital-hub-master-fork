// src/App.jsx
// no hooks imported at top-level
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import logo from "./assets/logo.png";
// import bg from "./assets/bg.jpg";
import { colors } from "./theme/colors";

// MUI
import { Button, Stack, Typography, Snackbar, Alert, Box, CssBaseline } from "@mui/material";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import HrmDashboardLayout from "./hrm/DashboardLayoutMain.jsx";
import TprDashboardLayout from "./tpr/DashboardLayoutMain.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { AuthProvider } from "./contexts/AuthContext";

import '@fontsource/kanit/300.css';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/500.css';
import '@fontsource/kanit/600.css';
import '@fontsource/kanit/700.css';


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
        px: 2
      }}
    >
      <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" sx={{ width: { xs: '90%', sm: '70%', md: '50%' }, maxWidth: 600 }}>
        <Box>
          <Box textAlign="center" mb={1}>
            <Box component="img" src={logo} alt="logo" sx={{ width: { xs: 140, sm: 160, md: 200 }, height: 'auto' }} />
          </Box>

          <Typography
            variant="h3"
            align="center"
            sx={{
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem", lg: "3rem" },
              fontWeight: "bold",
              mt: 1,
            }}
          >
            TPR SYSTEM
          </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 2, width: '100%', maxWidth: 360, mx: 'auto' }}
            >
            <Button
              variant="contained"
              onClick={() => navigate("/login")}
              sx={{
                backgroundColor: colors.buttonMain,
                color: colors.buttonText,
                '&:hover': { backgroundColor: colors.buttonHover },
                // animate the arrow inside the button
                '& .ctaIcon': {
                  ml: 1,
                  transition: 'transform 300ms ease, opacity 300ms ease',
                  animation: 'ctaFade 1600ms ease-in-out infinite',
                  fontSize: '1.1rem'
                },
                '@keyframes ctaFade': {
                  '0%': { opacity: 1, transform: 'translateX(0)' },
                  '50%': { opacity: 0.35, transform: 'translateX(6px)' },
                  '100%': { opacity: 1, transform: 'translateX(0)' },
                },
                boxShadow: 'none',
                width: { xs: '100%', sm: 240 },
                whiteSpace: 'nowrap',
                px: 3,
                maxWidth: '80%',
              }}
            >
              เข้าใช้งานระบบ
              <ArrowForwardIcon className="ctaIcon" />
            </Button>
          </Stack>

        </Box>
        {/* Snackbar removed: not used on this page */}
      </Box>
    </Box>
  );
}

// 👇 หน้า 404 Not Found
function NotFound() {
  return (
    <Box
      component="main"
      sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", px: 2 }}
    >
      <Box textAlign="center">
        <Typography variant="h2" fontWeight={700}>404</Typography>
        <Typography variant="h6" color="text.secondary">
          ไม่พบหน้าที่คุณต้องการ
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => (window.location.href = "/")}
        >
          กลับหน้าหลัก
        </Button>
      </Box>
    </Box>
  ); 
}

export default function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
        <CssBaseline />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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

          {/* 👇 route จับทุก path ที่ไม่ตรง */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
  );
}
