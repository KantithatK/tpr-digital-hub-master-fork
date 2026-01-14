import * as React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  ListItemSecondaryAction,
  Backdrop,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Button,
  ListItemButton,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '@/lib/supabaseClient';

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "@/fonts/THSarabunNew-normal";
import "@/fonts/THSarabunNew-bold";
import "@/fonts/THSarabunNew-italic";
import "@/fonts/THSarabunNew-bolditalic";

import * as deptTypeReport from "./reports/departmentTypeReport";
import * as deptReport from "./reports/departmentReport";
import * as positionReport from "./reports/positionReport";
import * as companyReport from "./reports/companyReport";
import * as companyBanksReport from "./reports/companyBanksReport";
import * as socialSecurityReport from "./reports/socialSecurityReport";

// ✅ mapping รายงาน → template
const reportConfigs = {
  "รายงานข้อมูลประเภทหน่วยงาน": { template: { name: "rpt-department-type" } },
  "รายงานข้อมูลบริษัท": { template: { name: "rpt-company" } },
  "รายงานข้อมูลประกันสังคมของบริษัท": { template: { name: "rpt-social-security" } },
  "รายงานรายชื่อธนาคารของบริษัท": { template: { name: "rpt-company-banks" } },
  "รายงานข้อมูลหน่วยงาน": { template: { name: "rpt-department" } },
  "รายงานข้อมูลตำแหน่งงาน": { template: { name: "rpt-position" } },
};

const reports = Object.keys(reportConfigs);

// รายการที่ยังไม่ต้องแสดงปุ่ม
const noActions = new Set([
  "รายงานข้อมูลองค์กร",
  "รายงานข้อมูลกองทุนสำรองเลี้ยงชีพขององค์กร",
  "รายงานข้อมูลองค์กรที่อยู่ภายใต้สังกัด",
  "รายงานข้อมูลที่อยู่ขององค์กร",
  "รายงานข้อมูล Job Description",
  "รายงานข้อมูลอัตรากำลังคน",
]);

// ---------------- MOCK + FETCH FUNCTIONS ----------------

// map title -> module
const reportModules = {
  [deptTypeReport.title]: deptTypeReport,
  [deptReport.title]: deptReport,
  [positionReport.title]: positionReport,
  [companyReport.title]: companyReport,
  [companyBanksReport.title]: companyBanksReport,
  [socialSecurityReport.title]: socialSecurityReport,
};

// ---------------- COMPONENT ----------------

export default function Reports() {
  const [open, setOpen] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  // filter dialog state (for reports that support code range filters)
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState(null); // 'preview' | 'download'
  const [pendingReportKey, setPendingReportKey] = React.useState(null);
  const [filterValues, setFilterValues] = React.useState({ startGroupId: '', endGroupId: '' });
  // selector dialog
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [selectorTarget, setSelectorTarget] = React.useState(null);
  const [groupOptions, setGroupOptions] = React.useState([]);
  const [groupLoading, setGroupLoading] = React.useState(false);
  const [groupSearch, setGroupSearch] = React.useState('');

  // load options for selector (department types or departments depending on pendingReportKey)
  const fetchGroups = React.useCallback(async (search = '') => {
    setGroupLoading(true);
    try {
      const s = search && search.trim();
      // if the pending report is departments, query v_department_form for dept_id + dept_name
      if (pendingReportKey === deptReport.title) {
        let q = supabase.from('v_department_form').select('dept_id, dept_name').order('dept_id', { ascending: true });
        if (s) q = q.or(`dept_id.ilike.%${s}%,dept_name.ilike.%${s}%`);
        const { data, error } = await q;
        if (error) throw error;
        setGroupOptions((data || []).map((d) => ({ group_id: d.dept_id, group_name_th: d.dept_name })));
      } else if (pendingReportKey === positionReport.title) {
        // positions: position_code + position_name
        let q = supabase.from('positions').select('position_code, position_name').order('position_code', { ascending: true });
        if (s) q = q.or(`position_code.ilike.%${s}%,position_name.ilike.%${s}%`);
        const { data, error } = await q;
        if (error) throw error;
        setGroupOptions((data || []).map((d) => ({ group_id: d.position_code, group_name_th: d.position_name })));
      } else {
        // department_type uses dept_type_id and dept_type_name
        let query = supabase.from('department_type').select('dept_type_id, dept_type_name').order('dept_type_id', { ascending: true });
        if (s) query = query.or(`dept_type_id.ilike.%${s}%,dept_type_name.ilike.%${s}%`);
        const { data, error } = await query;
        if (error) throw error;
        setGroupOptions((data || []).map((d) => ({ group_id: d.dept_type_id, group_name_th: d.dept_type_name })));
      }
    } catch (err) {
      console.error('Failed to load department types', err);
      setGroupOptions([]);
    } finally {
      setGroupLoading(false);
    }
  }, [pendingReportKey]);

  const openSelector = (target) => {
    setSelectorTarget(target);
    setSelectorOpen(true);
    fetchGroups(groupSearch);
  };

  // Filter dialog confirm handler
  const applyFiltersAndGenerate = () => {
    const filters = {
      startGroupId: filterValues.startGroupId?.trim() || undefined,
      endGroupId: filterValues.endGroupId?.trim() || undefined,
    };
    setFilterOpen(false);
    generateReport(pendingReportKey || deptTypeReport.title, pendingAction || 'preview', filters);
    setPendingAction(null);
    setPendingReportKey(null);
  };

  const getFilterTitle = () => {
    if (pendingReportKey === deptReport.title) return 'ตัวกรอง: รายงานข้อมูลหน่วยงาน';
    if (pendingReportKey === positionReport.title) return 'ตัวกรอง: รายงานข้อมูลตำแหน่งงาน';
    return 'ตัวกรอง: รายงานข้อมูลประเภทหน่วยงาน';
  };

  const getLabelBase = () => {
    if (pendingReportKey === deptReport.title) return 'รหัสหน่วยงาน';
    if (pendingReportKey === positionReport.title) return 'รหัสตำแหน่ง';
    return 'รหัสประเภท';
  };

  const generateReport = async (reportKey, mode = "preview", filters = {}) => {
    setLoading(true);
    try {
      let rows = [];
      let columns = [];

      // ✅ map รายงาน → fetch + columns using modules
      if (reportModules[reportKey]) {
        const mod = reportModules[reportKey];
        // pass filters where supported
        rows = await mod.fetchRows(filters);
        columns = mod.columns;
      }

      // ✅ Generate PDF แบบ A4
      const doc = new jsPDF({
        orientation: "p", // "p" = portrait, "l" = landscape
        unit: "mm",
        format: "a4",     // 📌 กำหนด A4
      });

      doc.setFont("THSarabunNew", "bold");
      doc.setFontSize(16);

      // 📌 คำนวณความกว้างของหน้า A4
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(reportKey, pageWidth / 2, 10, { align: "center" });

      autoTable(doc, {
        head: [columns.map((c) => c.header)],
        body: rows.map((r) => columns.map((c) => r[c.dataKey])),
        startY: 15,
        theme: "plain",
        styles: { font: "THSarabunNew", fontSize: 12 },
        headStyles: {
          fillColor: [244, 244, 244],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        didParseCell: function (data) {
          if (data.section === "head") {
            data.cell.styles.lineWidth = { top: 0.1, right: 0, bottom: 0.1, left: 0 };
            data.cell.styles.lineColor = [0, 0, 0];
          } else {
            data.cell.styles.lineWidth = 0;
          }
        },
        tableWidth: "100%",
        margin: { left: 5, right: 5 },

        // ✅ ใส่หมายเลขหน้าที่มุมขวาบน
        didDrawPage: function (data) {
          const pageCount = doc.internal.getNumberOfPages();
          const pageSize = doc.internal.pageSize;

          doc.setFont("THSarabunNew", "normal");
          doc.setFontSize(10);

          const pageText = `หน้า ${data.pageNumber} / ${pageCount}`;

          doc.text(pageText, pageSize.width - 5, 10, { align: "right" });
        },
      });

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);

      if (mode === "preview") {
        // Try to open in a new browser tab first. If blocked (returns null), fall back to in-app full-screen viewer.
        let newTab = null;
        try {
          newTab = window.open(url, "_blank");
          if (newTab && typeof newTab.focus === 'function') newTab.focus();
        } catch {
          newTab = null;
        }

        if (newTab) {
          // Schedule revoke after a short delay so the new tab has time to load the blob.
          setTimeout(() => {
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
          }, 10000);
        } else {
          // Fallback: open the in-app full-screen viewer
          setPdfUrl(url);
          setOpen(true);
        }
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${reportKey}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // revoke after download triggered
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        }, 10000);
      }
    } catch (err) {
      console.error("Report error:", err);
    } finally {
      setLoading(false);
    }
  };

  // cleanup object URL when changed/unmounted
  React.useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        รายงาน
      </Typography>

      <List>
        {reports.map((report, index) => {
          const config = reportConfigs[report];
          return (
            <React.Fragment key={index}>
              <ListItem
                sx={{
                  "&:hover": { bgcolor: "grey.100" },
                  borderRadius: 1,
                }}
              >
                <ListItemIcon>
                  <DescriptionIcon color="primary" />
                </ListItemIcon>

                <ListItemText primary={report} />

                <ListItemSecondaryAction>
                  {!noActions.has(report) && config && (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="preview"
                        onClick={() => {
                          // open filter dialog for dept-type, department, or position report
                            if (report === deptTypeReport.title || report === deptReport.title || report === positionReport.title) {
                            setPendingAction('preview');
                            setPendingReportKey(report);
                            setFilterOpen(true);
                            return;
                          }
                          generateReport(report, "preview");
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="download"
                          onClick={() => {
                          if (report === deptTypeReport.title || report === deptReport.title || report === positionReport.title) {
                            setPendingAction('download');
                            setPendingReportKey(report);
                            setFilterOpen(true);
                            return;
                          }
                          generateReport(report, "download");
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>

      {/* Filter dialog for department-type report */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{getFilterTitle()}</DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={`${getLabelBase()} (เริ่มต้น)`}
              value={filterValues.startGroupId}
              onChange={(e) => setFilterValues((s) => ({ ...s, startGroupId: e.target.value }))}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => openSelector('start')} aria-label="ค้นหารหัสเริ่มต้น">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label={`${getLabelBase()} (สิ้นสุด)`}
              value={filterValues.endGroupId}
              onChange={(e) => setFilterValues((s) => ({ ...s, endGroupId: e.target.value }))}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => openSelector('end')} aria-label="ค้นหารหัสสิ้นสุด">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setFilterOpen(false)} color="inherit">ยกเลิก</Button>
          <Button variant="contained" onClick={applyFiltersAndGenerate}>ตกลง</Button>
        </DialogActions>
      </Dialog>

      {/* Selector dialog for picking department types */}
      <Dialog open={selectorOpen} onClose={() => setSelectorOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{pendingReportKey === deptReport.title ? 'รหัสหน่วยงาน' : (pendingReportKey === positionReport.title ? 'รหัสตำแหน่ง' : 'รหัสประเภทหน่วยงาน')}</DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ mb: 1 }}>
            <TextField size="small" fullWidth placeholder="ค้นหารหัสหรือชื่อ" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchGroups(groupSearch); }} />
          </Box>
          <List sx={{ maxHeight: 320, overflow: 'auto' }}>
            {groupLoading ? (
              <ListItem><ListItemText primary="กำลังโหลด..." /></ListItem>
            ) : groupOptions.length === 0 ? (
              <ListItem><ListItemText primary="ไม่พบรายการ" /></ListItem>
            ) : (
              groupOptions.map((g) => (
                <ListItemButton key={g.group_id} onClick={() => {
                  if (selectorTarget === 'start') setFilterValues((s) => ({ ...s, startGroupId: g.group_id }));
                  if (selectorTarget === 'end') setFilterValues((s) => ({ ...s, endGroupId: g.group_id }));
                  setSelectorOpen(false);
                }}>
                  <ListItemText primary={<Box sx={{ display: 'flex', gap: 1 }}><Typography sx={{ fontWeight: 500 }}>{g.group_id}</Typography><Typography color="text.secondary">{g.group_name_th}</Typography></Box>} />
                </ListItemButton>
              ))
            )}
          </List>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={() => setSelectorOpen(false)} color="inherit">ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Dialog Preview PDF */}
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
        {pdfUrl && (
          <object data={pdfUrl} type="application/pdf" width="100%" height="100%" style={{ minHeight: '100vh' }}>
            <p>
              ไม่สามารถแสดง PDF ได้ <a href={pdfUrl}>ดาวน์โหลดแทน</a>
            </p>
          </object>
        )}
      </Dialog>
      {/* Backdrop loading spinner */}
      <Backdrop
        open={loading}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: "#fff" }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
