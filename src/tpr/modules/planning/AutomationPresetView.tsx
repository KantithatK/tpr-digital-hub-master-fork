import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import AlarmIcon from '@mui/icons-material/Alarm';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ForwardIcon from '@mui/icons-material/Forward';

// Keys for the preset rules we expose
export type AutomationPresetKey =
  | 'DONE_MOVE'
  | 'DUE_BEFORE_1D'
  | 'OVERDUE_NOTIFY';

export interface AutomationPresetRule {
  key: AutomationPresetKey;
  name: string; // short display name
  when: string; // WHEN text
  then: string; // THEN text
  enabled: boolean; // current toggle state
  iconWhen: React.ReactNode;
  iconThen: React.ReactNode;
}

export interface AutomationPresetViewProps {
  // Optional initial enabled map e.g. { DONE_MOVE: true }
  initialEnabled?: Partial<Record<AutomationPresetKey, boolean>>;
  // Callback when user toggles preset
  onToggle?: (key: AutomationPresetKey, enabled: boolean) => void;
  // Whether to include the overdue rule (can be disabled if not desired yet)
  includeOverdueRule?: boolean;
  // Optional loading state and disabled flag when persisting
  savingKey?: AutomationPresetKey | null;
}

function buildPresets(includeOverdue: boolean, initial?: Partial<Record<AutomationPresetKey, boolean>>): AutomationPresetRule[] {
  const base: AutomationPresetRule[] = [
    {
      key: 'DONE_MOVE',
      name: 'ย้ายการ์ดเมื่อเสร็จสิ้น',
      when: 'WHEN: เมื่อสถานะงานถูกเปลี่ยนเป็น “เสร็จสิ้น”',
      then: 'THEN: ย้ายการ์ดไปคอลัมน์ “เสร็จสิ้น” บนคัมบัง',
      enabled: !!initial?.DONE_MOVE,
      iconWhen: <DoneAllIcon fontSize="small" />,
      iconThen: <ForwardIcon fontSize="small" />,
    },
    {
      key: 'DUE_BEFORE_1D',
      name: 'เตือนก่อนถึงกำหนดส่ง 1 วัน',
      when: 'WHEN: ก่อนกำหนดส่ง 1 วัน',
      then: 'THEN: แจ้งเตือนผู้รับผิดชอบในระบบ / อีเมล',
      enabled: !!initial?.DUE_BEFORE_1D,
      iconWhen: <AlarmIcon fontSize="small" />,
      iconThen: <PlayArrowIcon fontSize="small" />,
    },
  ];
  if (includeOverdue) {
    base.push({
      key: 'OVERDUE_NOTIFY',
      name: 'เตือนเมื่อเลยกำหนดส่ง',
      when: 'WHEN: งานเลยกำหนดส่งและยังไม่เสร็จ',
      then: 'THEN: แจ้งเตือน PM และผู้รับผิดชอบ',
      enabled: !!initial?.OVERDUE_NOTIFY,
      iconWhen: <WarningAmberIcon fontSize="small" />,
      iconThen: <PlayArrowIcon fontSize="small" />,
    });
  }
  return base;
}

export default function AutomationPresetView({ initialEnabled, onToggle, includeOverdueRule = true, savingKey = null }: AutomationPresetViewProps) {
  const [rules, setRules] = React.useState<AutomationPresetRule[]>(() => buildPresets(includeOverdueRule, initialEnabled));

  const handleToggle = (key: AutomationPresetKey, enabled: boolean) => {
    setRules(prev => prev.map(r => (r.key === key ? { ...r, enabled } : r)));
    onToggle?.(key, enabled);
  };

  // Sync internal state when props change (e.g., after async load)
  React.useEffect(() => {
    setRules(buildPresets(includeOverdueRule, initialEnabled));
  }, [includeOverdueRule, initialEnabled]);

  const hasRules = rules.length > 0;

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#f9fafb', border: '1px solid #e5e7eb' }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>มุมมองอัตโนมัติ (Automation)</Typography>
          <Typography variant="body2" color="text.secondary">
            เปิด–ปิดกติกาอัตโนมัติสำเร็จรูปเพื่อช่วยจัดการงาน เช่น แจ้งเตือนใกล้กำหนดส่ง หรือย้ายการ์ดเมื่อสถานะเปลี่ยน
          </Typography>
        </Box>

        {!hasRules && (
          <Box sx={{ p: 2, border: '1px dashed #cbd5e1', borderRadius: 2, textAlign: 'center', bgcolor: '#ffffff' }}>
            <Typography variant="body2" color="text.secondary">
              ตอนนี้มีเพียงกติกามาตรฐานให้เปิด–ปิดตามต้องการ ระบบ Automation ขั้นสูงสามารถเพิ่มภายหลังได้
            </Typography>
          </Box>
        )}

        {hasRules && (
          <Stack spacing={1.5}>
            {rules.map(rule => (
              <Box
                key={rule.key}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  {/* WHEN column */}
                  <Stack sx={{ flex: 1 }} spacing={0.5}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="เงื่อนไข (WHEN)">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>{rule.iconWhen}</Box>
                      </Tooltip>
                      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>WHEN</Typography>
                    </Stack>
                    <Typography variant="body2">{rule.when.replace(/^WHEN:\s*/i, '')}</Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  {/* THEN column */}
                  <Stack sx={{ flex: 1 }} spacing={0.5}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="ผลลัพธ์ (THEN)">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>{rule.iconThen}</Box>
                      </Tooltip>
                      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>THEN</Typography>
                    </Stack>
                    <Typography variant="body2">{rule.then.replace(/^THEN:\s*/i, '')}</Typography>
                  </Stack>
                  {/* Toggle */}
                  <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 80 }}>
                    <Typography variant="caption" color="text.secondary">เปิดใช้</Typography>
                    <Switch
                      size="small"
                      checked={rule.enabled}
                      disabled={savingKey === rule.key}
                      onChange={(e) => handleToggle(rule.key, e.target.checked)}
                    />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
