// ===== AccessTab.jsx (วางที่ src/tpr/modules/settings/components/AccessTab.jsx) =====
import * as React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';

/**
 * AccessTab
 * - แท็บ "🔐 กำหนดสิทธิ์"
 * - แสดงพนักงาน + dropdown เลือก role ต่อคน
 *
 * Props ที่รับจาก SystemSettings.jsx:
 * @param {boolean} loadingEmployees
 * @param {string} employeesError
 * @param {string} search
 * @param {(v:string)=>void} setSearch
 * @param {Array<any>} filteredEmployees
 * @param {Object} positionMap
 * @param {Object} unitMap
 * @param {Array<{id:any,label:string}>} rolesList
 * @param {Object} rolesById
 * @param {Object} accessMap
 * @param {Object} updatingMap
 * @param {(employeeId:any, newRoleId:any)=>Promise<void>} handleAccessChange
 * @param {any} dayjs  // pass dayjs instance from parent
 */
export default function AccessTab(props) {
  const {
    loadingEmployees,
    employeesError,
    search,
    setSearch,
    filteredEmployees,
    positionMap,
    unitMap,
    rolesList,
    rolesById,
    accessMap,
    updatingMap,
    handleAccessChange,
    dayjs,
  } = props;

  const getInitials = React.useCallback((emp) => {
    const fnTh = (emp?.first_name_th || '').toString().trim();
    if (fnTh) return fnTh.charAt(0).toUpperCase();
    const fnEn = (emp?.first_name_en || '').toString().trim();
    if (fnEn) return fnEn.charAt(0).toUpperCase();
    const fallback = String(emp?.employee_code || emp?.id || '').trim();
    return fallback ? fallback.charAt(0).toUpperCase() : '';
  }, []);

  const resolvePosition = React.useCallback(
    (emp) => {
      return (
        emp?.position ||
        (emp?.position_id ? (positionMap?.[String(emp.position_id)] || '') : '') ||
        '-'
      );
    },
    [positionMap]
  );

  const resolveDepartment = React.useCallback(
    (emp) => {
      return (
        emp?.department_name ||
        (emp?.department_id ? (unitMap?.[String(emp.department_id)] || String(emp.department_id)) : '') ||
        emp?.unit ||
        emp?.dept_name ||
        '-'
      );
    },
    [unitMap]
  );

  const SkeletonView = React.useMemo(() => {
    const rows = Array.from({ length: 8 }, (_, i) => i);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
        {/* Search skeleton */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
          <Skeleton variant="rounded" height={40} width="100%" />
        </Box>

        {/* Table skeleton (ครอบระดับ box/paper) */}
        <Box
          sx={{
            borderRadius: 2,
            flex: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: 'none',
          }}
        >
          {/* Sticky header mimic */}
          <Box sx={{ px: 1.5, py: 1.25, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' }}>
            <Skeleton variant="text" height={22} width="70%" />
          </Box>

          <Box sx={{ p: 1.5 }}>
            {rows.map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '56px 140px 1.2fr 1fr 1fr 150px 260px',
                  gap: 1,
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Skeleton variant="circular" width={32} height={32} />
                </Box>
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={20} />
                <Skeleton variant="rounded" height={32} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }, []);

  if (loadingEmployees) return SkeletonView;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 240 }}>
      {employeesError ? (
        <Typography color="error">{employeesError}</Typography>
      ) : (
        <>
          {/* Search */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
            <TextField
              size="small"
              placeholder="ค้นหา ชื่อ, รหัส, เลขบัตร, ตำแหน่ง, หน่วยงาน"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              fullWidth
              sx={{
                background: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.black' },
              }}
            />
          </Box>

          {/* Table */}
          <TableContainer
            sx={{
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'auto',
              bgcolor: 'background.paper',
              boxShadow: 'none',
              border: 'none',
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 900,
                borderCollapse: 'separate',
                '& th, & td': { padding: '10px 12px', borderBottom: 'none' },
              }}
            >
              <TableHead
                sx={{
                  '& th': {
                    position: 'sticky',
                    top: 0,
                    background: 'background.paper',
                    zIndex: 2,
                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)',
                  },
                }}
              >
                <TableRow>
                  <TableCell sx={{ width: 56, px: 1, fontWeight: 700, color: 'common.black', textAlign: 'center' }}>
                    รูปภาพ
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'common.black' }}>
                    รหัสพนักงาน
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ชื่อพนักงาน</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>ตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>หน่วยงาน</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>วันที่เริ่มงาน</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'common.black' }}>สิทธิ์ผู้ใช้งานระบบ</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {(filteredEmployees || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">ไม่พบพนักงาน</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (filteredEmployees || []).map((emp) => {
                    const code = emp?.employee_code ?? emp?.id;

                    const nameTh =
                      `${emp?.title_th ? emp.title_th + ' ' : ''}${emp?.first_name_th || ''}`.trim() +
                      (emp?.last_name_th ? ` ${emp.last_name_th}` : '');
                    const nameEn = `${emp?.first_name_en || ''}`.trim() + (emp?.last_name_en ? ` ${emp.last_name_en}` : '');
                    const displayName = (nameTh.trim() || nameEn.trim()) || String(code || '');

                    const start = emp?.start_date || null;
                    const startLabel = start && dayjs ? dayjs(start).format('DD/MM/YYYY') : '-';

                    const position = resolvePosition(emp);
                    const department = resolveDepartment(emp);
                    const initials = getInitials(emp);

                    const emailKey = (emp?.current_address_email_1 || emp?.email || '').toString().trim().toLowerCase();
                    const mapKey = emailKey || `__id_${emp?.id}`;
                    const value = accessMap?.[mapKey] ?? '';
                    const disabled = !!updatingMap?.[emp?.id] || !emailKey;

                    return (
                      <TableRow key={String(code)}>
                        <TableCell sx={{ width: 56, px: 1 }}>
                          <Avatar src={emp?.image_url || ''} alt={displayName} sx={{ width: 32, height: 32, fontSize: 14 }}>
                            {!emp?.image_url ? initials : null}
                          </Avatar>
                        </TableCell>

                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{code}</TableCell>
                        <TableCell>{displayName}</TableCell>
                        <TableCell>{position}</TableCell>
                        <TableCell>{department}</TableCell>
                        <TableCell>{startLabel}</TableCell>

                        <TableCell sx={{ minWidth: 220 }}>
                          {rolesList?.length === 0 ? (
                            <Skeleton variant="rounded" height={32} />
                          ) : (
                            <FormControl
                              size="small"
                              fullWidth
                              variant="outlined"
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'common.black',
                                },
                              }}
                            >
                              <Select
                                variant="outlined"
                                value={value}
                                onChange={(e) => handleAccessChange(emp.id, e.target.value)}
                                disabled={disabled}
                                displayEmpty
                                renderValue={(v) => {
                                  if (!v) return 'ยังไม่กำหนดสิทธิ์';
                                  const r = rolesById?.[String(v)];
                                  return r?.label || v || '-';
                                }}
                              >
                                <MenuItem value="">ยังไม่กำหนดสิทธิ์</MenuItem>
                                {(rolesList || []).map((r) => (
                                  <MenuItem key={r.id} value={r.id}>
                                    {r.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}

                          {!emailKey ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              * พนักงานยังไม่มีอีเมล จึงไม่สามารถบันทึกสิทธิ์ลงฐานข้อมูลได้
                            </Typography>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
