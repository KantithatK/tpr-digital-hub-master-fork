// ===== CostByPersonTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import TextField from '@mui/material/TextField';
// import dayjs from 'dayjs';

export default function CostByPersonTab({
  loadingEmployees,
  employeesError,
  employees,
  positionMap,
  unitMap,
  standardHours,
  // markupTotal,
  search,
  // setSearch,
}) {
  const hours = Number(standardHours || 160) > 0 ? Number(standardHours || 160) : 160;
  // const markup = Number(markupTotal || 0);

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
    if (loadingEmployees) {
      setLoadingHold(true);
    } else {
      t = setTimeout(() => setLoadingHold(false), 280);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [loadingEmployees]);

  const showSkeleton = entering || loadingHold;

  const format2 = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0.00';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const salaryToNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const parsed = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const filteredEmployees = React.useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    const list = employees || [];
    if (!q) return list;

    return list.filter((emp) => {
      const code = String(emp.employee_code || emp.id || '').toLowerCase();
      const nameTh = `${emp.title_th ? emp.title_th + ' ' : ''}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.toLowerCase();
      const nameEn = `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.toLowerCase();
      const name = (nameTh + ' ' + nameEn).trim();
      const nid = String(emp.national_id || emp.id_card || emp.id_number || '').toLowerCase();

      const pos = String(emp.position || (emp.position_id ? positionMap?.[String(emp.position_id)] : '') || '').toLowerCase();
      const dept = String(emp.department_name || (emp.department_id ? unitMap?.[String(emp.department_id)] : '') || '').toLowerCase();

      return code.includes(q) || name.includes(q) || nid.includes(q) || pos.includes(q) || dept.includes(q);
    });
  }, [employees, positionMap, unitMap, search]);

  // ✅ แถวละ 3 card (flex) — ให้เหมือนหน้า bill rate
  const cardWidth = {
    xs: '100%',
    sm: 'calc((100% - 16px) / 2)',
    md: 'calc((100% - 32px) / 3)',
    lg: 'calc((100% - 32px) / 3)',
  };

  const CardSkeletonGrid = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: cardWidth,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Skeleton variant="text" width="75%" height={20} />
          <Skeleton variant="text" width="55%" height={18} />
          <Box sx={{ mt: 'auto', pt: 0.5 }}>
            <Skeleton variant="rounded" width="100%" height={34} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  if (showSkeleton) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
        {CardSkeletonGrid}
      </Box>
    );
  }

  if (employeesError) {
    return <Typography color="error">{employeesError}</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
      {/* <TextField
        size="small"
        placeholder="ค้นหา ชื่อ, รหัส, เลขบัตร, ตำแหน่ง, หน่วยงาน"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ background: 'white' }}
      /> */}

      {filteredEmployees.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">ไม่พบพนักงาน</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {filteredEmployees.map((emp) => {
            const code = emp.employee_code ?? emp.id;

            const nameTh =
              `${emp.first_name_th || ''}`.trim() + (emp.last_name_th ? ` ${emp.last_name_th}` : '');

            const displayName = nameTh.trim() || String(code || '');

            const position =
              emp.position || (emp.position_id ? positionMap?.[String(emp.position_id)] : '') || '-';

            const salary = salaryToNumber(emp.salary_rate);
            const costPerHour = salary / hours;

            return (
              <Box
                key={String(emp.id || code)}
                sx={{
                  width: cardWidth,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    color: 'common.black',
                    lineHeight: 1.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontWeight: 500,
                    minHeight: 36,
                  }}
                  title={displayName}
                >
                  {displayName}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ minHeight: 16 }} title={position}>
                  {position || '—'}
                </Typography>

                <Box sx={{ mt: 'auto', pt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Box
                    sx={{
                      fontSize: 14,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'common.black',
                      width: '100%',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                    title={`${format2(costPerHour)} บาท/ชม.`}
                  >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                        ต้นทุน/ชม.
                      </Typography>
                      <Tooltip title={`เงินเดือน ÷ ${hours}`}>
                        <IconButton size="small" sx={{ p: 0.25 }}>
                          <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box component="span" sx={{ fontSize: 14}}>
                      {format2(costPerHour)}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

    
    </Box>
  );
}
