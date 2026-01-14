import * as React from 'react';
import PropTypes from 'prop-types';

import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { LoadingContext } from './loadingContext';

// ✅ Assets (ตามภาพที่แนบมาใน /assets)
import emojiWheel from '../../assets/emoji-loading.gif';

const SARABUN_STACK = [
    'Kanit',
    'Sarabun',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Arial',
    'sans-serif',
].join(',');

function clampPercent(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return null;
    return Math.min(100, Math.max(0, Math.round(x)));
}

function LoadingDialog({ state }) {
    const open = !!state?.open;
    const message = state?.message ?? 'กำลังโหลด...';

    return (
        <Dialog
            open={open}
            onClose={() => {
                // ✅ ไม่ให้ปิดเอง
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)', // ✅ โปร่งเบา ๆ
                    backdropFilter: 'blur(2px)',         // (เลือกได้) ให้ดู modern
                },
            }}
            PaperComponent={Paper}
            PaperProps={{
                elevation: 0,
                sx: {
                    width: 'min(320px, calc(100vw - 32px))',
                    borderRadius: 4,
                    overflow: 'hidden',

                    // ✅ ทำให้กรอบแดงโปร่ง
                    bgcolor: 'transparent',

                    // (เลือกได้) ถ้าอยากให้ลอยนิด ๆ แบบ glass
                    backdropFilter: 'blur(6px)',
                    boxShadow: 'none',
                    fontFamily: SARABUN_STACK,
                    '& *': { fontFamily: SARABUN_STACK },
                },
            }}

        >

            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                    {/* ✅ แทน spinner ด้วยรูป */}
                    <Box
                        component="img"
                        src={emojiWheel}
                        alt="loading"
                        sx={{
                            width: 96,
                            height: 96,
                            objectFit: 'contain',
                            userSelect: 'none',
                            pointerEvents: 'none',
                        }}
                    />

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-line', fontWeight: 700 }}
                    >
                        {message}
                    </Typography>
                </Stack>
            </Box>
        </Dialog>
    );
}

LoadingDialog.propTypes = {
    state: PropTypes.object,
};

export default function LoadingProvider({ children, onApi }) {
    const [state, setState] = React.useState({ open: false, message: '', percent: null });

    // ✅ show: เปิด dialog (ตั้ง percent ได้)
    const show = React.useCallback((message = 'กำลังโหลด...', percent = null) => {
        setState({ open: true, message, percent: percent === null ? null : clampPercent(percent) });
    }, []);

    // ✅ hide: ปิด dialog
    const hide = React.useCallback(() => {
        setState({ open: false, message: '', percent: null });
    }, []);

    // ✅ set: อัปเดตระหว่างที่ dialog ยังเปิดอยู่ (สำคัญ: ใช้จากหน้าอื่น ๆ ได้)
    // ใช้ได้ทั้ง:
    //   set({ percent: 30 })
    //   set({ message: 'กำลังโหลดข้อมูล... 30%', percent: 30 })
    const set = React.useCallback((next) => {
        setState((prev) => {
            const n = next || {};
            return {
                ...prev,
                ...n,
                percent: typeof n.percent === 'undefined' ? prev.percent : (n.percent === null ? null : clampPercent(n.percent)),
            };
        });
    }, []);

    // ✅ helper: updatePercent(10), updatePercent(20) ...
    const updatePercent = React.useCallback((percent, message) => {
        set({
            percent,
            ...(typeof message === 'string' ? { message } : null),
        });
    }, [set]);

    const api = React.useMemo(() => ({ show, hide, set, updatePercent }), [show, hide, set, updatePercent]);

    React.useEffect(() => {
        if (typeof onApi === 'function') onApi(api);
    }, [api, onApi]);

    return (
        <LoadingContext.Provider value={api}>
            {children}
            <LoadingDialog state={state} />
        </LoadingContext.Provider>
    );
}

LoadingProvider.propTypes = {
    children: PropTypes.node,
    onApi: PropTypes.func,
};
