import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
// Assumed table: rounding_format { id uuid pk, format_id text unique, format_name_th text, format_name_en text, format_type text, description text, is_active bool, created_at timestamptz, updated_at timestamptz }
// Adjust table & field names to match your DB.

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
// Removed Dialog related imports because add/edit/delete UI is hidden
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

// Removed action icons
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Read-only view: form definition removed

export default function RoundingFormatsPage() {
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchField, setSearchField] = React.useState('format_id');
  const [searchInput, setSearchInput] = React.useState('');
  const [appliedSearch, setAppliedSearch] = React.useState({ field: 'format_id', text: '' });

  // Removed add/edit/delete states (read-only view)

  // delete/edit states removed (read-only)

  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const Alert = React.forwardRef(function Alert(props, ref) { return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />; });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('rounding_format').select('*', { count: 'exact' });
      if (appliedSearch.text?.trim()) {
        const t = appliedSearch.text.trim();
        query = query.ilike(appliedSearch.field, `%${t}%`);
      }
      const from = page * rowsPerPage;
      const to = from + rowsPerPage - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data || []);
      setTotal(count || 0);
    } catch (err) { setSnackbar({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', severity: 'error' }); } finally { setLoading(false); }
  }, [appliedSearch, page, rowsPerPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // Add/Edit/Delete handlers removed (page is read-only)

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">กำหนดรูปแบบการปัดเศษ</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="ตั้งค่าโดยระบบ" size="small" />
          {/* ปุ่มเพิ่มถูกซ่อนตามคำขอ */}
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="rounding-format-search-field-label">ค้นหาตาม</InputLabel>
          <Select
            labelId="rounding-format-search-field-label"
            label="ค้นหาตาม"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <MenuItem value="format_id">รหัสรูปแบบการปัดเศษ</MenuItem>
            <MenuItem value="format_name_th">ชื่อรูปแบบการปัดเศษ (ไทย)</MenuItem>
            <MenuItem value="format_name_en">ชื่อรูปแบบการปัดเศษ (อังกฤษ)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          fullWidth
          label="คำค้น"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch({ field: searchField, text: searchInput }); }}
        />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<SearchIcon />} variant="outlined" onClick={() => setAppliedSearch({ field: searchField, text: searchInput })}>ค้นหา</Button>
          <Button startIcon={<ClearIcon />} color="inherit" onClick={() => { setSearchInput(''); setAppliedSearch({ field: 'format_id', text: '' }); setSearchField('format_id'); setPage(0); }}>ล้าง</Button>
        </Stack>
      </Stack>
      <TableContainer sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' }, '& th:last-of-type, & td:last-of-type': { borderRight: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold', whiteSpace: 'nowrap' }}>รหัสรูปแบบการปัดเศษ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบการปัดเศษ (ไทย)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ชื่อรูปแบบการปัดเศษ (อังกฤษ)</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>ประเภทรูปแบบการปัดเศษ</TableCell>
              <TableCell sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>รายละเอียด</TableCell>
              {/* ซ่อนคอลัมน์การทำงาน */}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={20} /><Typography variant="body2">กำลังโหลดข้อมูล...</Typography></Stack></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" sx={{ py: 2 }}>ไม่พบข้อมูล</Typography></TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.format_id}</TableCell>
                  <TableCell>{row.format_name_th || ''}</TableCell>
                  <TableCell>{row.format_name_en || ''}</TableCell>
                  <TableCell>{row.format_type || ''}</TableCell>
                  <TableCell>{row.description || ''}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} labelRowsPerPage="จำนวนแถวต่อหน้า" />
      {/* Dialogs for add/edit/delete removed */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
