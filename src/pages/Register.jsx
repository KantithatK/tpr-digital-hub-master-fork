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

export default function Register() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "info",
    });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email) {
            return setSnackbar({ open: true, message: "กรุณากรอกอีเมล", severity: "error" });
        }
        if (!password) {
            return setSnackbar({ open: true, message: "กรุณากรอกรหัสผ่าน", severity: "error" });
        }
        if (password.length < 6) {
            return setSnackbar({ open: true, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", severity: "error" });
        }
        if (password !== confirm) {
            return setSnackbar({ open: true, message: "รหัสผ่านไม่ตรงกัน", severity: "error" });
        }

        // Before creating an auth user, verify the email exists for a staff record
        setLoading(true);
        try {
            const emailTrim = (email || '').trim();
            const { data: emp, error: empErr } = await supabase
                .from('employees')
                .select('id, current_address_email_1')
                .ilike('current_address_email_1', emailTrim)
                .limit(1)
                .maybeSingle();

            if (empErr) {
                console.error('Failed to lookup employee by email', empErr);
                setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล', severity: 'error' });
                return;
            }

            if (!emp || !emp.id) {
                // email not associated with any employee
                setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการทะเบียน', severity: 'error' });
                return;
            }

            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                return setSnackbar({ open: true, message: error.message, severity: 'error' });
            }

            setSnackbar({ open: true, message: 'ลงทะเบียนสำเร็จ กรุณายืนยันอีเมลของคุณ', severity: 'success' });
            // รอ 1.2 วิ แล้ว redirect ไป login
            setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            console.error('Registration error', err);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการลงทะเบียน', severity: 'error' });
        } finally {
            setLoading(false);
        }
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
                    <Typography variant="h5" component="h1" fontWeight={700}>
                        สร้างบัญชีใหม่
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        ลงทะเบียนเพื่อเข้าสู่ระบบ TPR System
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleRegister}>
                    <Stack spacing={2}>
                        <TextField
                            label="อีเมล"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            autoComplete="email"
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
                            label="รหัสผ่าน"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            autoComplete="new-password"
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

                        <TextField
                            label="ยืนยันรหัสผ่าน"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            fullWidth
                            autoComplete="new-password"
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
                            {loading ? "กำลังสมัคร..." : "ลงทะเบียน"}
                        </Button>

                        <Box textAlign="center">
                            <Link
                                component={RouterLink}
                                to="/login"
                                underline="hover"
                                sx={{ textTransform: "none", color: colors.linkMain, '&:hover': { color: colors.linkHover } }}
                            >
                                มีบัญชีแล้ว? เข้าสู่ระบบ
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
