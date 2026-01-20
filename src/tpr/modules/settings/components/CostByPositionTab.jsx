// ===== CostByPositionTab.jsx (แทนทั้งไฟล์) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function CostByPositionTab({
  loadingEmployees,
  employeesError,
  employees,
  positionMap,
  unitMap,
  standardHours,
  markupTotal,
  search,
  // setSearch,
}) {
  const hours = Number(standardHours || 160) > 0 ? Number(standardHours || 160) : 160;
  const markup = Number(markupTotal || 0);

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

  function formatCurrencyNumber(n) {
    if (n === null || n === undefined) return '-';
    const num = Number(n);
    if (Number.isNaN(num)) return '-';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // filter by position name (ตามแท็บเดิม)
  const filteredEmployees = React.useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return employees || [];
    return (employees || []).filter((emp) => {
      const posLabel = String(
        emp.position || (emp.position_id ? positionMap?.[String(emp.position_id)] : '') || ''
      ).toLowerCase();
      return posLabel.includes(q);
    });
  }, [employees, positionMap, search]);

  // aggregate by position
  const aggregatedByPosition = React.useMemo(() => {
    const map = {};
    (filteredEmployees || []).forEach((emp) => {
      const position =
        emp.position ||
        (emp.position_id ? (positionMap?.[String(emp.position_id)] || '') : '') ||
        'ไม่ระบุ';

      const department =
        emp.department_name ||
        (emp.department_id ? (unitMap?.[String(emp.department_id)] || '') : '') ||
        emp.unit ||
        '-';

      let salary = 0;
      if (emp && emp.salary_rate !== undefined && emp.salary_rate !== null && emp.salary_rate !== '') {
        const parsed = Number(String(emp.salary_rate).replace(/,/g, ''));
        salary = Number.isFinite(parsed) ? parsed : 0;
      }

      if (!map[position]) map[position] = { position, departments: new Set(), total: 0, count: 0 };
      if (department) map[position].departments.add(department);
      map[position].total += salary;
      map[position].count += 1;
    });

    return Object.values(map)
      .map((it) => ({
        position: it.position,
        department: Array.from(it.departments).join(', '),
        total: it.total,
        count: it.count,
      }))
      .sort((a, b) => a.position.localeCompare(b.position, 'th'));
  }, [filteredEmployees, positionMap, unitMap]);

  // ✅ แถวละ 3 card (flex)
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
            <Skeleton variant="rounded" width="100%" height={58} />
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
      {aggregatedByPosition.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
          {aggregatedByPosition.map((row) => {
            const totalSalary = Number(row.total || 0);
            const count = Number(row.count || 0);

            const avgSalary = count > 0 ? totalSalary / count : 0;
            const costPerHour = hours > 0 ? avgSalary / hours : 0; // ✅ ต้นทุน/ชม. (เฉลี่ยต่อคนในตำแหน่ง)
            const billRate = costPerHour * (1 + markup / 100);

            return (
              <Box
                key={row.position}
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
                    fontWeight: 600,
                    minHeight: 36,
                  }}
                  title={row.position}
                >
                  {row.position}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ minHeight: 16 }}>
                  {row.department ? row.department : '—'}
                </Typography>

                {/* ✅ แถบล่าง: ต้นทุน/ชม. + icon-info + อัตราค่าบริการ (ตามภาพ) */}
                <Box sx={{ mt: 'auto', pt: 0.75 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                        ต้นทุน/ชม.
                      </Typography>
                      <Tooltip title={`คำนวณจาก: (เงินเดือนเฉลี่ยของตำแหน่ง) ÷ ${hours}`}>
                        <IconButton size="small" sx={{ p: 0.25 }} aria-label="ข้อมูลต้นทุนต่อชั่วโมง">
                          <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
                     
                      <Box
                        component="span"
                        title={`อัตราค่าบริการ ${formatCurrencyNumber(billRate)}`}
                        sx={{fontSize:14}}
                      >
                        {formatCurrencyNumber(billRate)}
                      </Box>
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
