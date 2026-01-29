import * as React from 'react';
import PropTypes from 'prop-types';

import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { NotifyContext } from './notifyContext';

// ✅ Assets (ตามภาพที่แนบมาใน /assets)
import emojiSuccess from '../../assets/emoji-success.gif';
import emojiError from '../../assets/emoji-error.gif';
import emojiInfo from '../../assets/emoji-info.gif';
import emojiWarning from '../../assets/emoji-warning.gif';

// ✅ สีตาม requirement
const COLORS = {
  success: '#08d84c',
  error: '#ff415bff',
  info: '#2fcfff',
  warning: '#ffca00',
};

// ✅ ฟอนต์ที่ต้องการ (กันหลุดแม้ theme ไม่ครอบ)
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

// ✅ รองรับ override ได้ (payload.emoji เป็น path/string ก็ได้)
const defaultsBySeverity = (severity) => {
  switch (severity) {
    case 'success':
      return { emoji: emojiSuccess, title: 'สำเร็จ', buttonText: 'โอเค' };
    case 'warning':
      return { emoji: emojiWarning, title: 'แจ้งเตือน', buttonText: 'โอเค' };
    case 'error':
      return { emoji: emojiError, title: 'เกิดข้อผิดพลาด', buttonText: 'โอเค' };
    case 'info':
    default:
      return { emoji: emojiInfo, title: 'แจ้งเตือน', buttonText: 'โอเค' };
  }
};

function buildAccent(severity) {
  const color = COLORS[severity] || COLORS.info;
  return {
    color,
    bg: `color-mix(in srgb, ${color} 10%, transparent)`,
    bgFallback:
      severity === 'success'
        ? 'rgba(0,202,116,0.10)'
        : severity === 'error'
          ? 'rgba(248,58,85,0.10)'
          : severity === 'warning'
            ? 'rgba(254,204,0,0.14)'
            : 'rgba(89,122,252,0.10)',
  };
}

function NotifyDialog({ state, onClose }) {
  const open = !!state?.open;
  const severity = state?.severity || 'info';

  const d = defaultsBySeverity(severity);
  const emoji = state?.emoji ?? d.emoji;
  const title = state?.title ?? d.title;
  const buttonText = state?.buttonText ?? d.buttonText;
  const message = state?.message ?? '';

  const accent = buildAccent(severity);

  return (
    <Dialog
      open={open}
      onClose={(_e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(134, 134, 134, 0.25)', // ✅ โปร่งเบา ๆ
          backdropFilter: 'blur(2px)',         // (เลือกได้) ให้ดู modern
        },
      }}
      PaperComponent={Paper}
      PaperProps={{
        elevation: 0,
        sx: {
          width: 'min(320px, calc(100vw - 32px))',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 'none',
          bgcolor: '#fff',

          // ✅ ฟอนต์ให้ชัวร์ว่าเปลี่ยน (แม้ theme ไม่ครอบ)
          fontFamily: SARABUN_STACK,
          '& *': { fontFamily: SARABUN_STACK },
        },
      }}
    >
      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Box
            component="img"
            src={emoji}
            alt={severity}
            sx={{
              width: 96,
              height: 96,
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontFamily: SARABUN_STACK,
            }}
          >
            {title}
          </Typography>

          {!!message && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-line',
                maxWidth: 420,
                fontFamily: SARABUN_STACK,
              }}
            >
              {message}
            </Typography>
          )}

          <Button
            onClick={onClose}
            variant="contained"
            disableElevation
            sx={{
              mt: 1,
              px: 4,
              py: 1.1,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              fontFamily: SARABUN_STACK,

              bgcolor: accent.color,
              boxShadow: 'none',
              '&:hover': { bgcolor: accent.color, boxShadow: 'none' },
              '&:active': { boxShadow: 'none' },
            }}
          >
            {buttonText}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

NotifyDialog.propTypes = {
  state: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default function NotifyProvider({ children, onApi }) {
  const [state, setState] = React.useState({ open: false });

  const close = React.useCallback(() => {
    setState((prev) => {
      try {
        if (typeof prev?.onClose === 'function') prev.onClose();
      } catch {
        // ignore
      }
      return { open: false };
    });
  }, []);

  const open = React.useCallback((payload) => {
    const severity = payload?.severity || 'info';
    const d = defaultsBySeverity(severity);

    setState({
      open: true,
      severity,
      title: payload?.title ?? d.title,
      message: payload?.message ?? '',
      emoji: payload?.emoji ?? d.emoji,
      buttonText: payload?.buttonText ?? d.buttonText,
      onClose: payload?.onClose ?? null,
    });
  }, []);

  const api = React.useMemo(
    () => ({
      open,
      close,
      success: (message, opts = {}) => open({ ...opts, severity: 'success', message }),
      info: (message, opts = {}) => open({ ...opts, severity: 'info', message }),
      warning: (message, opts = {}) => open({ ...opts, severity: 'warning', message }),
      error: (message, opts = {}) => open({ ...opts, severity: 'error', message }),
    }),
    [open, close],
  );

  React.useEffect(() => {
    if (typeof onApi === 'function') onApi(api);
  }, [api, onApi]);

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <NotifyDialog state={state} onClose={close} />
    </NotifyContext.Provider>
  );
}

NotifyProvider.propTypes = {
  children: PropTypes.node,
  onApi: PropTypes.func,
};
