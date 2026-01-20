// ===== MarkupTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';

import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

import SaveIcon from '@mui/icons-material/Save';

export default function MarkupTab({
  standardHours,
  setStandardHours,
  overheadPercent,
  setOverheadPercent,
  profitPercent,
  setProfitPercent,
  markupTotal,
  loadingMarkup,
  saveMarkupSettings,

  aggregatedPositionStats, // [{ position, total, count, avgCostPerHour }]

  // optional: keep UI consistent with your existing feature flag
  HIDE_MARKUP_PROFILES = true, // currently not used in this separated tab
}) {
  const [previewPosition, setPreviewPosition] = React.useState('');
  const [positionPickerOpen, setPositionPickerOpen] = React.useState(false);
  const [positionSearch, setPositionSearch] = React.useState('');

  // ✅ เก็บข้อมูลที่เลือกเพื่อแสดงรายละเอียดการคำนวณใต้ช่องเลือกตำแหน่ง
  const [selectedStat, setSelectedStat] = React.useState(null);

  // ✅ Divider border style สำหรับทุก TextField (default/hover/focus)
  const inputSx = React.useMemo(
    () => ({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
      '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' },
    }),
    []
  );

  // ✅ Flat button (ไม่ให้มีเงา)
  const flatBtnSx = React.useMemo(() => ({ boxShadow: 'none', '&:hover': { boxShadow: 'none' } }), []);

  // ✅ ให้ Skeleton เห็นแน่นอน "ตอนเข้าหน้า" แม้โหลดเสร็จแล้ว
  const [entering, setEntering] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setEntering(false), 220);
    return () => clearTimeout(t);
  }, []);

  // ✅ หน่วงเวลาให้ Skeleton ตอนโหลดจริง (กันโหลดเร็วเกินไปจนไม่เห็น)
  const [loadingHold, setLoadingHold] = React.useState(false);
  React.useEffect(() => {
    let t;
    if (loadingMarkup) {
      setLoadingHold(true);
    } else {
      t = setTimeout(() => setLoadingHold(false), 280);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [loadingMarkup]);

  const showSkeleton = entering || loadingHold;

  function formatCurrencyNumber(n) {
    if (n === null || n === undefined) return '-';
    const num = Number(n);
    if (Number.isNaN(num)) return '-';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const hours = Number(standardHours || 160) > 0 ? Number(standardHours || 160) : 160;
  const markup = Number(markupTotal || 0);

  const listToShow = React.useMemo(() => {
    const q = (positionSearch || '').trim().toLowerCase();
    const base = aggregatedPositionStats || [];
    if (!q) return base;
    return base.filter((p) => String(p.position || '').toLowerCase().includes(q));
  }, [aggregatedPositionStats, positionSearch]);

  // ✅ sync กรณีพิมพ์ตำแหน่งเอง (ไม่ผ่าน dialog) แล้วพอดี match
  React.useEffect(() => {
    const key = String(previewPosition || '').trim();
    if (!key) {
      setSelectedStat(null);
      return;
    }
    const found = (aggregatedPositionStats || []).find((p) => String(p.position || '').trim() === key) || null;
    setSelectedStat(found);
  }, [previewPosition, aggregatedPositionStats]);

  // ================= Skeleton (2 cards, แถวเดียว 2 คอลัมน์) =================
  if (showSkeleton) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {/* Card ซ้าย: Settings */}
          <Paper
            elevation={0}
            sx={{
              width: { xs: '100%', md: 'calc((100% - 16px) / 2)' },
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              p: 2,
            }}
          >
            <Skeleton variant="text" width={280} height={28} />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Skeleton variant="rounded" width={120} height={36} />
            </Box>
          </Paper>

          {/* Card ขวา: Preview */}
          <Paper
            elevation={0}
            sx={{
              width: { xs: '100%', md: 'calc((100% - 16px) / 2)' },
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              p: 2,
            }}
          >
            <Skeleton variant="text" width={240} height={28} />
            <Skeleton variant="rounded" height={40} sx={{ mt: 2 }} />
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="rounded" height={74} />
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  const avgCost = Number(selectedStat?.avgCostPerHour || 0);
  const billRate = avgCost * (1 + markup / 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ✅ 2 cards แถวเดียว แบ่ง 2 คอลัมน์ด้วย flex */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
        {/* ================= Card ซ้าย: อัตราบวกเพิ่มจากต้นทุน ================= */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: 'calc((100% - 16px) / 2)' },
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            อัตราบวกเพิ่มจากต้นทุน
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              label="ชั่วโมงมาตรฐานต่อเดือน"
              type="number"
              size="small"
              value={standardHours}
              onChange={(e) => setStandardHours(Number(e.target.value || 0))}
              inputProps={{ style: { textAlign: 'right' } }}
              sx={{ flex: 1, ...inputSx }}
            />

            <TextField
              label="ค่าใช้จ่ายโสหุ้ย (Overhead %)"
              type="number"
              size="small"
              value={overheadPercent}
              onChange={(e) => setOverheadPercent(Number(e.target.value || 0))}
              inputProps={{ min: 0, max: 500, style: { textAlign: 'right' } }}
              sx={{ flex: 1, ...inputSx }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <TextField
              label="กำไรเป้าหมาย (Profit %)"
              type="number"
              size="small"
              fullWidth
              value={profitPercent}
              onChange={(e) => setProfitPercent(Number(e.target.value || 0))}
              inputProps={{ min: 0, max: 100, style: { textAlign: 'right' } }}
              sx={{ flex: 1, ...inputSx }}
            />

            <TextField
              label="อัตราบวกเพิ่มจากต้นทุน (Markup % รวม)"
              size="small"
              fullWidth
              value={`${markupTotal}`}
              
              inputProps={{ style: { textAlign: 'right' } }}
              InputProps={{
                endAdornment: (
                  <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
                    <Tooltip title="สูตร: Markup % รวม = Overhead % + Profit %">
                      <InfoOutlinedIcon fontSize="small" />
                    </Tooltip>
                  </Box>
                ),
              }}
              sx={{ flex: 1, ...inputSx }}
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={saveMarkupSettings}
              disabled={loadingMarkup}
              startIcon={<SaveIcon />}
              sx={flatBtnSx} // ✅ flat no shadow
              disableElevation
            >
              {loadingMarkup ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              บันทึก
            </Button>
          </Box>

          {HIDE_MARKUP_PROFILES ? null : null}
        </Paper>

        {/* ================= Card ขวา: ตัวอย่างคำนวณอัตราค่าบริการ ================= */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: 'calc((100% - 16px) / 2)' },
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            ตัวอย่างคำนวณ
          </Typography>

          <TextField
            label="เลือกตำแหน่ง"
            size="small"
            value={previewPosition}
            onChange={(e) => setPreviewPosition(e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton size="small" onClick={() => setPositionPickerOpen(true)} aria-label="ค้นหาตำแหน่ง">
                  <SearchIcon />
                </IconButton>
              ),
            }}
            fullWidth
            sx={inputSx}
          />

          {/* ✅ แสดงรายละเอียดการคำนวณใต้ช่องเลือกตำแหน่ง (แทน notify) */}
          <Box
            sx={{
              mt: 2,
              borderRadius: 1,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              minHeight: 74,
            }}
          >
            {!selectedStat ? (
              <Typography variant="caption" color="text.secondary">
                รายละเอียดการคำนวณ
              </Typography>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary">
                  ต้นทุนเฉลี่ยต่อชั่วโมง:{' '}
                  <Box component="span" sx={{ color: 'common.black', fontWeight: 700 }}>
                    {formatCurrencyNumber(avgCost)}
                  </Box>
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  สูตร: อัตราค่าบริการ = ต้นทุน/ชม. × (1 + Markup%)
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  แทนค่า: {formatCurrencyNumber(avgCost)} × (1 + {markup}%)
                  {' = '}
                  <Box component="span" sx={{ color: 'common.black', fontWeight: 800 }}>
                    {formatCurrencyNumber(billRate)}
                  </Box>{' '}
                  บาท/ชม.
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  ชั่วโมงมาตรฐาน:{' '}
                  <Box component="span" sx={{ color: 'common.black', fontWeight: 700 }}>
                    {hours}
                  </Box>
                </Typography>
              </>
            )}
          </Box>

          <Dialog open={positionPickerOpen} onClose={() => setPositionPickerOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box component="span">เลือกตำแหน่ง</Box>
              <IconButton aria-label="ปิด" onClick={() => setPositionPickerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <TextField
                size="small"
                placeholder="ค้นหา"
                fullWidth
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                sx={{ mb: 1, ...inputSx }}
              />

              <List>
                {(listToShow || []).map((p) => (
                  <ListItemButton
                    key={p.position}
                    onClick={() => {
                      setPreviewPosition(p.position);
                      setSelectedStat(p);
                      setPositionPickerOpen(false);
                      setPositionSearch('');
                    }}
                  >
                    <ListItemText
                      primary={p.position}
                    />
                  </ListItemButton>
                ))}
              </List>

              {(listToShow || []).length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  ไม่พบตำแหน่ง
                </Typography>
              ) : null}
            </DialogContent>
          </Dialog>
        </Paper>
      </Box>
    </Box>
  );
}
