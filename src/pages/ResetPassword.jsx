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
} from "@mui/material";
import { supabase } from "@/lib/supabaseClient";
import { useTheme, useMediaQuery } from "@mui/material";
import logo from "@/assets/logo.png";
import { colors } from "@/theme/colors";

export default function ResetPassword() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [loading, setLoading] = useState(false);

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

  return (
    <Box
      component="main"
      sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", px: 2 }}
    >
      <Paper elevation={5} sx={{ width: 420, maxWidth: "100%", p: 4, borderRadius: 3 }}>
        <Box textAlign="center" mb={2}>
          <Box
            component="img"
            src={logo}
            alt="TPR logo"
            sx={{ width: isSmall ? 80 : 96, height: "auto", mx: "auto", mb: 1 }}
          />
          <Typography variant="h5" fontWeight={700}>รีเซ็ตรหัสผ่าน</Typography>
          <Typography variant="body2" color="text.secondary">
            กรุณากรอกรหัสผ่านใหม่ของคุณ
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleReset}>
          <Stack spacing={2}>
            <TextField
              label="รหัสผ่านใหม่"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px #fff inset',
                },
              }}
            />
            <TextField
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            >
              {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
          </Stack>
        </Box>

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
      </Paper>
    </Box>
  );
}
