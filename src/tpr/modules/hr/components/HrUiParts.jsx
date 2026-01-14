import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Avatar,
  Chip,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export function FlexRow({ children, gap = 2, min = 260 }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap, alignItems: 'stretch', '& > *': { flex: `1 1 ${min}px`, minWidth: min } }}>
      {children}
    </Box>
  );
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography>
        {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
      {right}
    </Stack>
  );
}

export function StatCard({ icon, title, value, subtitle }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 2.2 }}>
        <Stack direction="row" spacing={1.6} alignItems="flex-start">
          <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', color: 'text.primary', width: 42, height: 42 }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.4 }}>{value}</Typography>
            {subtitle ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.6 }}>{subtitle}</Typography> : null}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
      <Avatar sx={{ bgcolor: 'action.hover', color: 'text.primary', mb: 1 }}>
        <CheckCircleIcon />
      </Avatar>
      <Typography sx={{ fontWeight: 900 }}>{title}</Typography>
      {subtitle ? <Typography variant="body2" color="text.secondary" align="center">{subtitle}</Typography> : null}
    </Stack>
  );
}

export function DataTable({ columns, rows, rowKey, minWidth = 900, empty }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table size="small" style={{ minWidth, width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ fontWeight: 800, textAlign: c.align || 'left', ...c.headSx }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={typeof rowKey === 'function' ? rowKey(r, i) : r[rowKey] ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left', ...c.sx }}>{c.render(r, i)}</td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );
}
