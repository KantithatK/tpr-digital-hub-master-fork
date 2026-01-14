// =======================================================================
// FILE: src/app/(protected)/hrm/organization/OrganizationRulesPage.jsx
// PURPOSE: Use a single table for all 16 notification options
//          - option_notify_types (is_enabled, notify_before_days) keyed by notify_type_sequence
//          - option_notify_employees for selected employees by notify_type_sequence
// NOTE: Only touched code related to notifications loading/saving. Others untouched.
// =======================================================================
import * as React from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";

import { supabase } from "@/lib/supabaseClient";

import CompanyRulesForm from "@/hrm/modules/company/forms/CompanyRulesForm";
import ReportFormatForm from "@/hrm/modules/company/forms/ReportFormatForm";
import EmployeeRequirementsForm from "@/hrm/modules/company/forms/EmployeeRequirementsForm";
import EmailSenderForm from "@/hrm/modules/company/forms/EmailSenderForm";
import EmailCancelDocumentForm from "@/hrm/modules/company/forms/EmailCancelDocumentForm"; // existing
import EmailSkipApprovalForm from "@/hrm/modules/company/forms/EmailSkipApprovalForm";
import EmailCcDocumentsForm from "@/hrm/modules/company/forms/EmailCcDocumentsForm"; // NEW
import EmailDocPasswordForm from "@/hrm/modules/company/forms/EmailDocPasswordForm"; // NEW
import NotificationsForm from "@/hrm/modules/company/forms/NotificationsForm"; // NEW generic
import TimeMobileConditionsForm from "@/hrm/modules/company/forms/TimeMobileConditionsForm";

// ----------------------------------
// Static options (hoisted to avoid identity changes)
// ----------------------------------
const TAX_METHODS = [
  { value: "FIXED", label: "ค่าคงที่" },
  { value: "ADJUST_BY_MONTH", label: "ปรับตามเดือน" },
];
const FISCAL_METHODS = [
  { value: "BY_START_DATE", label: "นับตามวันที่เริ่มต้น" },
  { value: "BY_END_DATE", label: "นับตามวันที่สิ้นสุด" },
];
const DOC_PW_METHODS = [
  { value: "ID_OR_TAXID", label: "หมายเลขบัตรประชาชน หรือ หมายเลขผู้เสียภาษี" },
  { value: "BIRTHDATE", label: "วันเกิด" },
];

// ----------------------------------
// Notification types mapping (1..16)
// ----------------------------------
const NOTIFY_TYPES = [
  { seq: 1, menuId: "birthday-notify", key: "birthday", label: "วันเกิดพนักงาน" },
  { seq: 2, menuId: "probation-notify", key: "probation", label: "ครบทดลองงาน" },
  { seq: 3, menuId: "retirement-notify", key: "retirement", label: "ครบเกษียณอายุ" },
  { seq: 4, menuId: "license-expiry-notify", key: "licenseExpiry", label: "ใบอนุญาตหมดอายุ" },
  { seq: 5, menuId: "exam-schedule-notify", key: "examSchedule", label: "นัดสอบ" },
  { seq: 6, menuId: "interview-schedule-notify", key: "interviewSchedule", label: "นัดสัมภาษณ์" },
  { seq: 7, menuId: "idcard-expiry-notify", key: "idcardExpiry", label: "บัตรประชาชนหมดอายุ" },
  { seq: 8, menuId: "visa-expiry-notify", key: "visaExpiry", label: " Visa หมดอายุ" },
  { seq: 9, menuId: "insurance-expiry-notify", key: "insuranceExpiry", label: "สิทธิ์ผู้ทำประกันหมดอายุ" },
  { seq: 10, menuId: "internal-training-due-notify", key: "internalTrainingDue", label: "พนักงานถึงกำหนดอบรมภายใน" },
  { seq: 11, menuId: "external-training-due-notify", key: "externalTrainingDue", label: "พนักงานถึงกำหนดอบรมภายนอก" },
  { seq: 12, menuId: "military-checkup-notify", key: "militaryCheckup", label: "วันทหารตรวจร่างกายทหาร" },
  { seq: 13, menuId: "annual-bonus-expiry-notify", key: "annualBonusExpiry", label: "โบนัสปีหมดอายุ" },
  { seq: 14, menuId: "training-consent-pending-notify", key: "trainingConsentPending", label: "เอกสารยอมรับเงื่อนไขอบรม (รอประเมิน)" },
  { seq: 15, menuId: "approval-rights-change-notify", key: "approvalRightsChange", label: "เปลี่ยนแปลงสิทธิ์การอนุมัติ" },
  { seq: 16, menuId: "training-assignment-notify", key: "trainingAssignment", label: "ส่งพนักงานฝึกอบรม" },
];

const NOTIFY_MENU_TO_SEQ = NOTIFY_TYPES.reduce((acc, t) => ((acc[t.menuId] = t.seq), acc), {});
const NOTIFY_MENU_TO_KEY = NOTIFY_TYPES.reduce((acc, t) => ((acc[t.menuId] = t.key), acc), {});
const NOTIFY_MENU_TO_LABEL = NOTIFY_TYPES.reduce((acc, t) => ((acc[t.menuId] = t.label), acc), {});
const NOTIFY_SEQ_TO_LABEL = NOTIFY_TYPES.reduce((acc, t) => ((acc[t.seq] = t.label), acc), {});

// ----------------------------------
// date helpers
// ----------------------------------
const pad = (n) => String(n).padStart(2, "0");
const fmt = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayStr = () => fmt(new Date());
const addYears = (date, years) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
};

export default function OrganizationRulesPage() {
  const [selected, setSelected] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" });

  const empty = {
    company: {
      id: null,
      tax_calc: "ADJUST_BY_MONTH",
      program_start_date: "",
      probation_days: 0,
      retirement_age_years: 0,
      fiscal_year_count: "BY_START_DATE",
      fiscal_year_start_date: "",
      fiscal_year_end_date: "",
      fiscal_year: 0,
    },
    report: { id: null, show_company_logo: true, show_report_creator_name: true, show_com_unit_on_header: true },
    employee: {
      id: null,
      allow_cross_line_supervisor: false,
      notify_more_employee_data: true,
      auto_post_probation_result: true,
      auto_post_employment_contract: true,
      auto_provision_user_login: true,
    },
    email: { id: null, sender_name: "", sender_email: "" },
    emailCancel: {
      id: null,
      is_enabled: true,
      notify_with_user_request: false,
      notify_with_user_approved: false,
      notify_with_user_approved_all: false,
      notify_with_user_approver_last: false,
      description: "",
    },
    emailSkip: { id: null, is_enabled: true, send_on_request: false, send_on_approve: false, send_on_reject: false },
    emailCc: {
      id: null,
      enable_cc_when_no_approval: false,
      enable_cc_when_has_approval: false,
      cc_emails: "",
    },
    emailDocPw: {
      id: null,
      doc_password_method: "ID_OR_TAXID",
    },
    birthday: {
      id: null,
      is_enabled: false,
      notify_before_days: 0,
      employees: [],
    },
    timeMobile: {
      id: null,
      locations: [],
    },
  };

  // Extend `empty` for the other 15 notification types
  NOTIFY_TYPES.forEach((t) => {
    if (!empty[t.key]) {
      empty[t.key] = { id: null, is_enabled: false, notify_before_days: 0, employees: [] };
    }
  });

  const [forms, setForms] = React.useState(empty);
  const [snapshots, setSnapshots] = React.useState(empty);

  const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
  });

  const computeFiscalYear = React.useCallback((method, startDate, endDate) => {
    const yearFrom = (d) => (d && d.length >= 4 ? new Date(d).getFullYear() : 0);
    return method === "BY_START_DATE" ? yearFrom(startDate) : yearFrom(endDate);
  }, []);

  const mapCompanyFrom = React.useCallback(
    (row) => ({
      id: row?.id ?? null,
      tax_calc: row?.tax_calc ?? "ADJUST_BY_MONTH",
      program_start_date: (row?.program_start_date || "").slice(0, 10),
      probation_days: row?.probation_days ?? 0,
      retirement_age_years: row?.retirement_age_years ?? 0,
      fiscal_year_count: row?.fiscal_year_count ?? "BY_START_DATE",
      fiscal_year_start_date: (row?.fiscal_year_start_date || "").slice(0, 10),
      fiscal_year_end_date: (row?.fiscal_year_end_date || "").slice(0, 10),
      fiscal_year: computeFiscalYear(
        row?.fiscal_year_count ?? "BY_START_DATE",
        row?.fiscal_year_start_date,
        row?.fiscal_year_end_date
      ),
    }),
    [computeFiscalYear]
  );

  const mapCompanyTo = (f) => ({
    tax_calc: f.tax_calc,
    program_start_date: f.program_start_date || null,
    probation_days: f.probation_days,
    retirement_age_years: f.retirement_age_years,
    fiscal_year_count: f.fiscal_year_count,
    fiscal_year_start_date: f.fiscal_year_start_date || null,
    fiscal_year_end_date: f.fiscal_year_end_date || null,
    updated_at: new Date().toISOString(),
  });

  const mapReportFrom = (d) => ({
    id: d?.id || null,
    show_company_logo: !!d?.show_company_logo,
    show_report_creator_name: !!d?.show_report_creator_name,
    show_com_unit_on_header: !!d?.show_com_unit_on_header,
  });
  const mapReportTo = (f) => ({
    show_company_logo: !!f.show_company_logo,
    show_report_creator_name: !!f.show_report_creator_name,
    show_com_unit_on_header: !!f.show_com_unit_on_header,
    updated_at: new Date().toISOString(),
  });

  const mapEmployeeFrom = (d) => ({
    id: d?.id || null,
    allow_cross_line_supervisor: !!d?.allow_cross_line_supervisor,
    notify_more_employee_data: !!d?.notify_more_employee_data,
    auto_post_probation_result: !!d?.auto_post_probation_result,
    auto_post_employment_contract: !!d?.auto_post_employment_contract,
    auto_provision_user_login: !!d?.auto_provision_user_login,
  });
  const mapEmployeeTo = (f) => ({
    allow_cross_line_supervisor: !!f.allow_cross_line_supervisor,
    notify_more_employee_data: !!f.notify_more_employee_data,
    auto_post_probation_result: !!f.auto_post_probation_result,
    auto_post_employment_contract: !!f.auto_post_employment_contract,
    auto_provision_user_login: !!f.auto_provision_user_login,
    updated_at: new Date().toISOString(),
  });

  const mapEmailFrom = (d) => ({ id: d?.id || null, sender_name: d?.sender_name || "", sender_email: d?.sender_email || "" });
  const mapEmailTo = (f) => ({ sender_name: f.sender_name?.trim() || "", sender_email: f.sender_email?.trim() || "", updated_at: new Date().toISOString() });

  const mapEmailCancelFrom = (d) => ({
    id: d?.id || null,
    is_enabled: !!d?.is_enabled,
    notify_with_user_request: !!d?.notify_with_user_request,
    notify_with_user_approved: !!d?.notify_with_user_approved,
    notify_with_user_approved_all: !!d?.notify_with_user_approved_all,
    notify_with_user_approver_last: !!d?.notify_with_user_approver_last,
    description: d?.description || "",
  });
  const mapEmailCancelTo = (f) => ({
    is_enabled: !!f.is_enabled,
    notify_with_user_request: !!f.notify_with_user_request,
    notify_with_user_approved: !!f.notify_with_user_approved,
    notify_with_user_approved_all: !!f.notify_with_user_approved_all,
    notify_with_user_approver_last: !!f.notify_with_user_approver_last,
    description: f.description || "",
    updated_at: new Date().toISOString(),
  });

  const mapEmailSkipFrom = (d) => ({
    id: d?.id || null,
    is_enabled: !!d?.is_enabled,
    send_on_request: !!d?.send_on_request,
    send_on_approve: !!d?.send_on_approve,
    send_on_reject: !!d?.send_on_reject,
  });
  const mapEmailSkipTo = (f) => ({
    is_enabled: !!f.is_enabled,
    send_on_request: !!f.send_on_request,
    send_on_approve: !!f.send_on_approve,
    send_on_reject: !!f.send_on_reject,
    updated_at: new Date().toISOString(),
  });

  const normalizeEmailList = (s) =>
    (s || "")
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  const mapEmailCcFrom = (d) => ({
    id: d?.id || null,
    enable_cc_when_no_approval: !!d?.enable_cc_when_no_approval,
    enable_cc_when_has_approval: !!d?.enable_cc_when_has_approval,
    cc_emails: normalizeEmailList(d?.cc_emails).join(", "),
  });
  const mapEmailCcTo = (f) => ({
    enable_cc_when_no_approval: !!f.enable_cc_when_no_approval,
    enable_cc_when_has_approval: !!f.enable_cc_when_has_approval,
    cc_emails: normalizeEmailList(f.cc_emails).join(","),
    updated_at: new Date().toISOString(),
  });

  const mapEmailDocPwFrom = (d) => ({
    id: d?.id || null,
    doc_password_method: d?.doc_password_method || "ID_OR_TAXID",
  });
  const mapEmailDocPwTo = (f) => ({
    doc_password_method: f.doc_password_method || "ID_OR_TAXID",
    updated_at: new Date().toISOString(),
  });

  const mapTimeMobileFrom = (d) => ({ id: d?.id || null, locations: Array.isArray(d?.locations) ? d.locations : [] });
  const mapTimeMobileTo = (f) => ({ locations: Array.isArray(f?.locations) ? f.locations : [], updated_at: new Date().toISOString() });

  const mapNotifyFrom = (d) => ({
    id: d?.id || null,
    is_enabled: !!d?.is_enabled,
    notify_before_days: Number.isFinite(d?.notify_before_days) ? d.notify_before_days : 0,
    employees: Array.isArray(d?.employees) ? d.employees : [],
  });
  const mapNotifyTo = (f) => ({
    is_enabled: !!f.is_enabled,
    notify_before_days: Math.max(0, parseInt(f?.notify_before_days ?? 0, 10)),
    updated_at: new Date().toISOString(),
  });

  const validateCompany = (f) => {
    if (!f.program_start_date) return "กรุณาระบุวันเริ่มใช้โปรแกรม";
    if (f.probation_days < 0 || f.probation_days > 366) return "จำนวนวันทดลองงานต้องอยู่ระหว่าง 0-366";
    if (f.retirement_age_years < 0 || f.retirement_age_years > 100) return "อายุเกษียณต้องอยู่ระหว่าง 0-100";
    if (!f.fiscal_year_start_date || !f.fiscal_year_end_date) return "กรุณาระบุวันที่เริ่มต้น/สิ้นสุดปีงบประมาณ";
    if (new Date(f.fiscal_year_end_date) < new Date(f.fiscal_year_start_date)) return "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น";
    return "";
  };
  const validateEmail = (f) => {
    if (!f.sender_name?.trim()) return "กรุณาระบุ Your Name";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(f.sender_email?.trim() || "")) return "รูปแบบ E-Mail Address ไม่ถูกต้อง";
    return "";
  };
  const validateEmailCancel = (f) => {
    if (!f.is_enabled) return "";
    if (f.notify_with_user_approved && !f.notify_with_user_approved_all && !f.notify_with_user_approver_last)
      return "กรุณาเลือกวิธีแจ้งเตือนผู้อนุมัติ (ทุกลำดับขั้น หรือ ขั้นสุดท้าย)";
    if (!f.description?.trim()) return "กรุณาระบุ CC: E-mail ผู้ส่ง";
    return "";
  };
  const validateEmailCc = (f) => {
    const anyEnabled = !!f.enable_cc_when_no_approval || !!f.enable_cc_when_has_approval;
    if (!anyEnabled) return "";
    const emails = normalizeEmailList(f.cc_emails);
    if (emails.length === 0) return "กรุณาระบุ E-mail สำหรับ CC";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.find((e) => !re.test(e));
    if (invalid) return `รูปแบบ E-Mail ไม่ถูกต้อง: ${invalid}`;
    return "";
  };
  const validateEmailDocPw = (f) => {
    if (["ID_OR_TAXID", "BIRTHDATE"].includes(f?.doc_password_method)) return "";
    return "กรุณาเลือกวิธีการตั้งรหัสผ่าน";
  };
  const validateNotify = (f) => {
    if (!f?.is_enabled) return "";
    const n = parseInt(f?.notify_before_days ?? 0, 10);
    if (Number.isNaN(n) || n < 0 || n > 366) return "jumlahวันแจ้งเตือนล่วงหน้าต้องอยู่ระหว่าง 0-366";
    return "";
  };

  // ----------------------------------
  // Supabase helpers
  // ----------------------------------
  const getSingle = async (table) => {
    const { data, error } = await supabase.from(table).select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
  };
  const saveById = async (table, id, row) => {
    if (id) {
      const { data, error } = await supabase.from(table).update(row).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.from(table).insert([row]).select("*").single();
    if (error) throw error;
    return data;
  };
  // Load a row from option_notify_types by sequence
  const getNotifyTypeBySeq = async (seq) => {
    const { data, error } = await supabase
      .from("option_notify_types")
      .select("*")
      .eq("notify_type_sequence", Number(seq))
      .maybeSingle();
    if (error) throw error;
    return data || null;
  };

  // ----------------------------------
  // resource configs (stable)
  // ----------------------------------
  const RESOURCES = React.useMemo(() => {
    const base = {
      "menu-company-requirement": {
        key: "company",
        table: "option_company_requirements",
        empty: empty.company,
        fromRow: mapCompanyFrom,
        toRow: mapCompanyTo,
        validate: validateCompany,
        component: CompanyRulesForm,
        extraProps: { taxMethodOptions: TAX_METHODS, fiscalMethodOptions: FISCAL_METHODS },
        defaultsWhenEmpty: () => {
          const t = todayStr();
          const end = fmt(addDays(addYears(t, 1), -1)) || t;
          return {
            id: null,
            tax_calc: "FIXED",
            program_start_date: t,
            probation_days: 0,
            retirement_age_years: 0,
            fiscal_year_count: "BY_START_DATE",
            fiscal_year_start_date: t,
            fiscal_year_end_date: end,
            fiscal_year: computeFiscalYear("BY_START_DATE", t, end),
          };
        },
      },
      "report-basic": {
        key: "report",
        table: "option_report_format",
        empty: empty.report,
        fromRow: mapReportFrom,
        toRow: mapReportTo,
        validate: null,
        component: ReportFormatForm,
      },
      "org-employee": {
        key: "employee",
        table: "option_employee_requirements",
        empty: empty.employee,
        fromRow: mapEmployeeFrom,
        toRow: mapEmployeeTo,
        validate: null,
        component: EmployeeRequirementsForm,
      },
      "email-sender": {
        key: "email",
        table: "option_email_sender",
        empty: empty.email,
        fromRow: mapEmailFrom,
        toRow: mapEmailTo,
        validate: validateEmail,
        component: EmailSenderForm,
      },
      "email-cancel-doc": {
        key: "emailCancel",
        table: "option_email_cancel_document",
        empty: empty.emailCancel,
        fromRow: mapEmailCancelFrom,
        toRow: mapEmailCancelTo,
        validate: validateEmailCancel,
        component: EmailCancelDocumentForm,
      },
      "email-skip-approval": {
        key: "emailSkip",
        table: "option_email_skip_approval",
        empty: empty.emailSkip,
        fromRow: mapEmailSkipFrom,
        toRow: mapEmailSkipTo,
        validate: null,
        component: EmailSkipApprovalForm,
      },
      "email-cc-doc": {
        key: "emailCc",
        table: "option_email_cc_documents",
        empty: empty.emailCc,
        fromRow: mapEmailCcFrom,
        toRow: mapEmailCcTo,
        validate: validateEmailCc,
        component: EmailCcDocumentsForm,
      },
      "email-doc-password": {
        key: "emailDocPw",
        table: "option_email_doc_password",
        empty: empty.emailDocPw,
        fromRow: mapEmailDocPwFrom,
        toRow: mapEmailDocPwTo,
        validate: validateEmailDocPw,
        component: EmailDocPasswordForm,
        extraProps: { methodOptions: DOC_PW_METHODS },
      },
      "time-mobile-conditions": {
        key: "timeMobile",
        table: "tpr_time_mobile_geofences",
        empty: empty.timeMobile,
        fromRow: mapTimeMobileFrom,
        toRow: mapTimeMobileTo,
        validate: null,
        component: TimeMobileConditionsForm,
      },
    };

    // Register 16 notification resources — use *one* table option_notify_types keyed by sequence
    NOTIFY_TYPES.forEach((t) => {
      base[t.menuId] = {
        key: t.key,
        table: "option_notify_types", // why: unified table for all options
        sequence: t.seq,
        empty: empty[t.key],
        fromRow: mapNotifyFrom,
        toRow: mapNotifyTo,
        validate: validateNotify,
        component: NotificationsForm,
        extraProps: { title: t.label, sequence: t.seq },
      };
    });

    return base;
  }, [mapCompanyFrom, computeFiscalYear]);

  // ----------------------------------
  // state helpers
  // ----------------------------------
  const setForm = (key, next) =>
    setForms((prev) => ({ ...prev, [key]: typeof next === "function" ? next(prev[key]) : next }));
  const setSnap = (key, next) => setSnapshots((prev) => ({ ...prev, [key]: next }));
  const handleChange = (key, patch) =>
    setForm(key, (prev) => {
      const next = { ...prev, ...patch };
      if (key === "company") {
        next.fiscal_year = computeFiscalYear(
          next.fiscal_year_count,
          next.fiscal_year_start_date,
          next.fiscal_year_end_date
        );
      }
      if (key === "emailCancel" && next.notify_with_user_approved) {
        if (patch.notify_with_user_approved_all) next.notify_with_user_approver_last = false;
        if (patch.notify_with_user_approver_last) next.notify_with_user_approved_all = false;
      }
      return next;
    });

  const notify = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const handleSave = async (menuId) => {
    const cfg = RESOURCES[menuId];
    if (!cfg) return;
    const form = forms[cfg.key];
    const msg = cfg.validate ? cfg.validate(form) : "";
    if (msg) return notify(msg, "warning");

    try {
      // Local save for timeMobile (no DB table mapped)
      if (cfg.key === "timeMobile") {
        setSnap(cfg.key, form);
        notify("บันทึกสำเร็จ", "success");
        return;
      }
      // Special path for the 16 notification options (single table)
      if (cfg.sequence) {
        const seq = cfg.sequence;
        const payload = {
          is_enabled: !!form.is_enabled,
          notify_before_days: Math.max(0, parseInt(form?.notify_before_days ?? 0, 10)),
          updated_at: new Date().toISOString(),
        };

        // Update by sequence; if nothing updated, insert a new row with proper name
        const { data: upd, error: typeErr } = await supabase
          .from("option_notify_types")
          .update(payload)
          .eq("notify_type_sequence", seq)
          .select("*");
        if (typeErr) throw typeErr;
        let typeRow = Array.isArray(upd) && upd.length > 0 ? upd[0] : null;
        if (!typeRow) {
          const { data: ins, error: insErr } = await supabase
            .from("option_notify_types")
            .insert([
              {
                notify_type_sequence: seq,
                notify_type_name: NOTIFY_SEQ_TO_LABEL[seq] || `ประเภทการแจ้งเตือน ${seq}`,
                is_enabled: payload.is_enabled,
                notify_before_days: payload.notify_before_days,
              },
            ])
            .select("*")
            .single();
          if (insErr) throw insErr;
          typeRow = ins;
        }

        // Reset employees for this sequence then insert current selections
        const { error: delErr } = await supabase
          .from("option_notify_employees")
          .delete()
          .eq("notify_type_sequence", seq);
        if (delErr) throw delErr;

        const rows = (form.employees || []).map((e) => ({
          notify_type_sequence: seq,
          employee_id: String(e.id),
          employee_name: e.name,
        }));
        if (rows.length > 0) {
          const { error: insErr2 } = await supabase.from("option_notify_employees").insert(rows);
          if (insErr2) throw insErr2;
        }

        const mapped = mapNotifyFrom(typeRow);
        // keep selected employees in state; NotificationsForm already handles its own preload
        const keepEmployees = { ...mapped, employees: form.employees || [] };
        setForm(cfg.key, keepEmployees);
        setSnap(cfg.key, keepEmployees);
        notify("บันทึกสำเร็จ", "success");
        return;
      }

      // Default path for non-notification resources
      const saved = await saveById(cfg.table, form.id, cfg.toRow(form));
      const mapped = cfg.fromRow(saved);
      setForm(cfg.key, mapped);
      setSnap(cfg.key, mapped);
      notify("บันทึกสำเร็จ", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // ----------------------------------
  // Load on selection change
  // ----------------------------------
  React.useEffect(() => {
    const cfg = RESOURCES[selected];
    if (!cfg) return;
    (async () => {
      setLoading(true);
      try {
        let data = null;
        // why: notifications use a single table and must fetch by sequence
        if (cfg.sequence) {
          data = await getNotifyTypeBySeq(cfg.sequence);
        } else {
          data = await getSingle(cfg.table);
        }
        const mapped = data
          ? cfg.fromRow(data)
          : cfg.defaultsWhenEmpty
            ? cfg.defaultsWhenEmpty()
            : cfg.empty;
        setForm(cfg.key, mapped);
        setSnap(cfg.key, mapped);
      } catch (err) {
        notify(err.message, "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const renderRightPane = () => {
    const cfg = RESOURCES[selected];
    if (!cfg) return null;
    const Comp = cfg.component;

    return (
      <Comp
        supabase={supabase}   // ✅ เพิ่มบรรทัดนี้
        loading={loading}
        value={forms[cfg.key]}
        onChange={(patch) => handleChange(cfg.key, patch)}
        onReset={() => setForm(cfg.key, snapshots[cfg.key])}
        onSave={() => handleSave(selected)}
        {...(cfg.extraProps || {})}
      />
    );
  };


  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: "bold" }} variant="h6">
          ข้อกำหนดบริษัท
        </Typography>
      </Stack>

      <Paper elevation={0} variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ width: { xs: "100%", md: 320 } }}>
            <SimpleTreeView
              selectedItems={selected ? [selected] : []}
              onSelectedItemsChange={(e, ids) => setSelected((Array.isArray(ids) ? ids.at(-1) : ids) || null)}
            >
              <TreeItem itemId="org-structure" label="ระบบโครงสร้างบริษัท">
                <TreeItem itemId="menu-company-requirement" label="ข้อกำหนดบริษัท" />
                <TreeItem itemId="org-employee" label="ข้อกำหนดพนักงาน" />
              </TreeItem>
              <TreeItem itemId="report-config" label="กำหนดรูปแบบการตั้งค่ารายงาน">
                <TreeItem itemId="report-basic" label="กำหนดรูปแบบรายงาน" />
              </TreeItem>
              <TreeItem itemId="email-config" label="การแจ้งเตือนและส่ง E-mail">
                <TreeItem itemId="email-sender" label="กำหนดการส่ง E-mail (ผู้ส่ง)" />
                <TreeItem itemId="email-cancel-doc" label="กำหนดการส่ง E-mail ยกเลิกเอกสาร" />
                <TreeItem
                  itemId="email-skip-approval"
                  label="กำหนดการส่ง E-mail ไม่ได้เข้าสู่ลำดับขั้นการอนุมัติ"
                />
                <TreeItem itemId="email-cc-doc" label="กำหนดการส่ง CC E-mail เอกสาร" />
                <TreeItem itemId="email-doc-password" label="กำหนดรหัสผ่านของอีเมลเอกสารระบบเงินเดือน" />
              </TreeItem>
              <TreeItem itemId="time-attendance" label="ระบบลงเวลางาน">
                <TreeItem itemId="time-mobile-conditions" label="กำหนดเงื่อนไขการลงเวลาผ่าน Mobile" />
              </TreeItem>
              <TreeItem itemId="notify-config" label="กำหนดรูปแบบการแจ้งเตือน">
                {NOTIFY_TYPES.map((t) => (
                  <TreeItem key={t.menuId} itemId={t.menuId} label={t.label} />
                ))}
              </TreeItem>
            </SimpleTreeView>
          </Box>

          <Box sx={{ flex: 1, minWidth: 280 }}>{renderRightPane()}</Box>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2600}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
