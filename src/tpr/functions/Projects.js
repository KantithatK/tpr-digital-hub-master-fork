// ===== src/tpr/functions/Projects.js (แทนทั้งไฟล์) =====
// Lightweight project helper utilities (Create Project page)

const CONTRACT_TYPES = {
  FIXED_FEE: 'Fixed Fee',
  TM: 'T&M',
  RETAINER: 'Retainer',
  INTERNAL: 'Internal',
};

const CONTRACT_TYPE_SET = new Set(Object.values(CONTRACT_TYPES));

function normalizeContractType(v) {
  const s = String(v || '').trim();
  if (!s) return CONTRACT_TYPES.FIXED_FEE;

  const up = s.toUpperCase().replace(/\s+/g, ' ');
  if (up === 'FIXED FEE' || up === 'FIXED_FEE') return CONTRACT_TYPES.FIXED_FEE;
  if (up === 'T&M' || up === 'T & M' || up === 'TM' || up === 'TIME & MATERIAL') return CONTRACT_TYPES.TM;
  if (up === 'RETAINER') return CONTRACT_TYPES.RETAINER;
  if (up === 'INTERNAL') return CONTRACT_TYPES.INTERNAL;

  if (CONTRACT_TYPE_SET.has(s)) return s;
  return CONTRACT_TYPES.FIXED_FEE;
}

function parseBudgetNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDateISO(v) {
  if (!v) return null;

  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return normalizeDateISO(dt);

  return null;
}

function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function cleanText(v, max = 400) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function pickId(objOrId) {
  if (!objOrId) return null;
  if (typeof objOrId === 'string') return objOrId;
  if (typeof objOrId === 'object' && objOrId.id) return objOrId.id;
  return null;
}

function uniqStringList(list) {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const s = String(x || '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

// helper: keep lead PM first in list, and ensure lead exists in list
function normalizeProjectManagers(projectManagerIds, leadManagerId) {
  const pmIds = uniqStringList(projectManagerIds).filter(isUuid);
  const lead = pickId(leadManagerId);

  // allow lead even if not uuid (but ideally uuid) — if not uuid, ignore it
  const leadOk = isUuid(lead) ? String(lead) : null;

  let finalLead = leadOk || (pmIds[0] ? String(pmIds[0]) : null);
  let finalPmIds = pmIds;

  if (!finalPmIds.length && finalLead) finalPmIds = [String(finalLead)];

  if (finalLead) {
    // ensure included & place first
    finalPmIds = [String(finalLead), ...finalPmIds.filter((x) => String(x) !== String(finalLead))];
  }

  return { finalLead, finalPmIds };
}

// ✅ helper: normalize mode (create/update) from form or caller
function normalizeMode(form) {
  const m = String(form?.__mode || form?.mode || '').toLowerCase();
  if (m === 'update' || m === 'edit') return 'update';
  if (m === 'create' || m === 'new') return 'create';
  // if form has id -> update, else create
  return form?.id ? 'update' : 'create';
}

// ===== small numeric helpers (dashboard) =====
function toNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function clampPct(v) {
  const x = Math.round(toNum(v));
  return Math.max(0, Math.min(100, x));
}

const Projects = {
  // ---------- Default Form ----------
  getDefaultForm: () => ({
    id: null,

    // UI fields
    code: '', // maps to project_code
    name: '', // maps to name_th
    name_en: '',
    description: '',

    // customer (ลูกค้า)
    customer_id: null,
    customer_code: '',
    customer_name: '',
    client: '', // legacy display
    clientTitle: '', // legacy display

    // dates
    start: '', // maps to start_date
    end: '', // maps to end_date

    // responsibilities
    project_admin_id: null, // Project Admin
    projectAdmin: '',
    projectAdminTitle: '',

    // ✅ keep in form state for UI/backward compat ONLY (DB ไม่มี manager_id แล้ว)
    manager_id: null,
    manager: '',
    managerTitle: '',

    // Multiple PMs
    project_manager_ids: [],

    // principal (optional — keep for future / compat)
    principal_id: null,
    principal: '',
    principalTitle: '',

    // hierarchy
    parent_project_id: 'MAIN',

    // type & money
    contract_type: CONTRACT_TYPES.FIXED_FEE,
    project_type: CONTRACT_TYPES.FIXED_FEE,

    budget: '',

    // system
    status: 'Planning',
    image_path: '',

    // “ทีมเริ่มต้น”
    initial_team_ids: [],
  }),

  // ---------- Validation for Create/Update Project ----------
  validateCreateForm: (form) => {
    const errors = {};
    const mode = normalizeMode(form);

    const name = cleanText(form?.name);
    if (!name) errors.name = 'กรุณากรอกชื่อโครงการ';

    const customerId = pickId(form?.customer_id);
    if (!customerId) errors.customer_id = 'กรุณาเลือกลูกค้า';

    const start = normalizeDateISO(form?.start);
    if (!start) errors.start = 'กรุณาเลือกวันที่เริ่มโครงการ';

    // ✅ admin id (รองรับของเก่า principal_id)
    const projectAdminId = pickId(form?.project_admin_id) || pickId(form?.principal_id);
    if (!projectAdminId) errors.project_admin_id = 'กรุณาเลือก Project Admin';
    else if (!isUuid(String(projectAdminId))) errors.project_admin_id = 'Project Admin ไม่ถูกต้อง';

    // ✅ Project Managers (multiple) - require at least 1
    const pmIdsRaw = Array.isArray(form?.project_manager_ids) ? form.project_manager_ids : [];
    const { finalLead, finalPmIds } = normalizeProjectManagers(pmIdsRaw, form?.manager_id);
    if (!finalPmIds.length) errors.project_manager_ids = 'กรุณาเลือก Project Manager อย่างน้อย 1 คน';

    // ✅ ทีมเริ่มต้น
    const teamIds = uniqStringList(form?.initial_team_ids).filter(isUuid);
    if (mode === 'create' && teamIds.length === 0) {
      errors.initial_team_ids = 'กรุณาเลือกทีมเริ่มต้นอย่างน้อย 1 คน';
    }

    // ✅ budget ต้อง > 0
    const budget = parseBudgetNumber(form?.budget);
    if (form?.budget === '' || form?.budget === null || form?.budget === undefined) {
      errors.budget = 'กรุณากรอกงบประมาณ';
    } else if (!Number.isFinite(budget) || budget <= 0) {
      errors.budget = 'งบประมาณไม่ถูกต้อง';
    }

    const ctype = normalizeContractType(form?.contract_type || form?.project_type);
    if (!CONTRACT_TYPE_SET.has(ctype)) errors.contract_type = 'ประเภทโครงการไม่ถูกต้อง';

    const code = cleanText(form?.code, 64);
    if (!code) errors.code = 'กรุณากำหนดรหัสโครงการ (Project Code)';

    return {
      ok: Object.keys(errors).length === 0,
      errors,
      normalized: {
        ...form,
        __mode: mode,
        code,
        name,
        name_en: cleanText(form?.name_en, 400),
        start,
        end: normalizeDateISO(form?.end),
        budget,
        contract_type: ctype,
        project_type: ctype,

        // keep in normalized for UI compatibility only
        manager_id: finalLead || null,
        project_manager_ids: finalPmIds,
        initial_team_ids: teamIds,

        // normalized admin id
        project_admin_id: projectAdminId ? String(projectAdminId) : null,
      },
    };
  },

  // ---------- Mapping: Form -> DB Row for tpr_projects ----------
  toDbInsert: (form) => {
    const v = Projects.validateCreateForm(form);
    if (!v.ok) {
      const e = new Error('VALIDATION_ERROR');
      e.details = v.errors;
      throw e;
    }

    const f = v.normalized;

    const payload = {
      project_code: cleanText(f.code, 64),
      name_th: cleanText(f.name, 400),
      name_en: cleanText(f.name_en, 400) || null,
      description: f.description ? String(f.description).trim() : null,

      customer_id: pickId(f.customer_id),
      customer_code: cleanText(f.customer_code, 128) || null,
      customer_name: cleanText(f.customer_name, 400) || null,

      start_date: f.start,
      end_date: f.end || null,

      // responsibilities
      project_admin_id: pickId(f.project_admin_id),

      // ✅ IMPORTANT: DB ของคุณไม่มี manager_id แล้ว
      project_manager_ids: Array.isArray(f.project_manager_ids) ? f.project_manager_ids : [],

      // compat: principal_id เท่ากับ project_admin_id (ถ้าคอลัมน์มี)
      principal_id: pickId(f.principal_id) || pickId(f.project_admin_id) || null,

      // hierarchy
      parent_project_id: f.parent_project_id === 'MAIN' ? null : (f.parent_project_id || null),

      // type
      contract_type: normalizeContractType(f.contract_type),
      project_type: normalizeContractType(f.project_type),

      budget: parseBudgetNumber(f.budget),

      status: cleanText(f.status, 64) || 'Planning',
      image_path: f.image_path ? String(f.image_path).trim() : null,
    };

    if ('manager_id' in payload) delete payload.manager_id;
    return payload;
  },

  // ---------- Update mapping ----------
  toDbUpdate: (form) => {
    const v = Projects.validateCreateForm({ ...(form || {}), __mode: 'update' });
    if (!v.ok) {
      const e = new Error('VALIDATION_ERROR');
      e.details = v.errors;
      throw e;
    }
    return Projects.toDbInsert(v.normalized);
  },

  // ---------- Insert team members into tpr_project_members ----------
  addInitialTeamMembers: async (supabase, projectId, employeeIds, actor) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const ids = uniqStringList(employeeIds).filter(isUuid);
    if (ids.length === 0) return [];

    const createdBy = actor || null;

    const rows = ids.map((eid) => ({
      project_id: projectId,
      employee_id: eid,
      created_by: createdBy,
      updated_by: createdBy,
    }));

    const { data, error } = await supabase
      .from('tpr_project_members')
      .upsert(rows, { onConflict: 'project_id,employee_id' })
      .select('*');

    if (error) throw error;
    return data || [];
  },

  getProjectMembers: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_project_members')
      .select('id, project_id, employee_id, created_at, created_by, updated_at, updated_by')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  setProjectMembers: async (supabase, projectId, employeeIds, actor) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const nextIds = uniqStringList(employeeIds).filter(isUuid);
    const current = await Projects.getProjectMembers(supabase, projectId);
    const currentIds = uniqStringList((current || []).map((r) => r.employee_id)).filter(isUuid);

    const nextSet = new Set(nextIds);
    const curSet = new Set(currentIds);

    const toDelete = currentIds.filter((id) => !nextSet.has(id));
    const toInsert = nextIds.filter((id) => !curSet.has(id));

    if (toDelete.length) {
      const { error: delErr } = await supabase
        .from('tpr_project_members')
        .delete()
        .eq('project_id', projectId)
        .in('employee_id', toDelete);
      if (delErr) throw delErr;
    }

    if (toInsert.length) {
      await Projects.addInitialTeamMembers(supabase, projectId, toInsert, actor || null);
    }

    return Projects.getProjectMembers(supabase, projectId);
  },

  afterCreateProject: async ({ supabase, project, initial_team_ids, project_manager_ids, project_admin_id, actor }) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    const projectId = project?.id;
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const merged = uniqStringList([
      ...(Array.isArray(initial_team_ids) ? initial_team_ids : []),
      ...(Array.isArray(project_manager_ids) ? project_manager_ids : []),
      project_admin_id || null,
    ]).filter(isUuid);

    return Projects.addInitialTeamMembers(supabase, projectId, merged, actor || null);
  },

  // ---------- Mapping: DB Row -> Form (for edit / prefill) ----------
  fromDbRow: (row) => {
    if (!row) return Projects.getDefaultForm();

    const f = Projects.getDefaultForm();

    const dbPmIds = Array.isArray(row.project_manager_ids) ? row.project_manager_ids : [];
    const { finalLead, finalPmIds } = normalizeProjectManagers(dbPmIds, null);

    return {
      ...f,
      id: row.id ?? null,
      code: row.project_code ?? '',
      name: row.name_th ?? '',
      name_en: row.name_en ?? '',
      description: row.description ?? '',

      customer_id: row.customer_id ?? null,
      customer_code: row.customer_code ?? '',
      customer_name: row.customer_name ?? '',
      client: row.customer_name ?? '',
      clientTitle: row.customer_code ?? '',

      start: row.start_date ?? '',
      end: row.end_date ?? '',

      project_admin_id: row.project_admin_id ?? null,

      manager_id: finalLead || null,
      project_manager_ids: finalPmIds,

      principal_id: row.principal_id ?? null,

      contract_type: normalizeContractType(row.contract_type ?? row.project_type),
      project_type: normalizeContractType(row.project_type ?? row.contract_type),

      budget: row.budget ?? 0,
      status: row.status ?? 'Planning',
      parent_project_id: row.parent_project_id ?? 'MAIN',
      image_path: row.image_path ?? '',

      initial_team_ids: [],
    };
  },

  formatTypeLabel: (type) => normalizeContractType(type),

  // ---------- Supabase helpers ----------
  create: async (supabase, dbPayload) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    const { data, error } = await supabase
      .from('tpr_projects')
      .insert(dbPayload)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  update: async (supabase, id, dbPayload) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(id)) throw new Error('INVALID_ID');

    const payload = { ...(dbPayload || {}) };
    if ('manager_id' in payload) delete payload.manager_id;

    const { data, error } = await supabase
      .from('tpr_projects')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  getById: async (supabase, id) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(id)) throw new Error('INVALID_ID');
    const { data, error } = await supabase
      .from('tpr_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // ---------- Dashboard: Progress (from WBS tasks) ----------
  // ✅ นับเฉพาะ billable_mode = 'billable'
  getProgressFromTasks: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { count: total, error: totalErr } = await supabase
      .from('tpr_project_wbs_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('billable_mode', 'billable');

    if (totalErr) throw totalErr;

    const { count: done, error: doneErr } = await supabase
      .from('tpr_project_wbs_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('billable_mode', 'billable')
      .eq('metadata->>status', 'Done');

    if (doneErr) throw doneErr;

    const t = Number(total || 0);
    const d = Number(done || 0);
    const pct = t > 0 ? Math.round((d / t) * 100) : 0;

    return { done: d, total: t, pct };
  },

  // ---------- Dashboard: WIP ----------
  // WIP = SUM(approved_timesheet_hours * billing_rate)
  // approved_hours: tpr_time_entries.hours where status='Approved'
  // billing_rate: tpr_project_role_rates.bill_rate matched by (project_id, employees.position_id)
  //
  // NOTE: tpr_time_entries.user_id === employees.id
  getWipFromTimesheets: async (supabase, projectId, opts = {}) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const includeBilled = Boolean(opts.includeBilled); // default false -> invoice_id IS NULL

    let q = supabase
      .from('tpr_time_entries')
      .select('id, user_id, hours, invoice_id')
      .eq('project_id', projectId)
      .eq('status', 'Approved');

    if (!includeBilled) q = q.is('invoice_id', null);

    const { data: entries, error: entErr } = await q;
    if (entErr) throw entErr;

    const rows = Array.isArray(entries) ? entries : [];
    if (rows.length === 0) {
      return {
        wip: 0,
        currency: 'THB',
        entryCount: 0,
        hoursTotal: 0,
        missingPositionCount: 0,
        missingRateCount: 0,
      };
    }

    const userIds = uniqStringList(rows.map((r) => r.user_id)).filter(isUuid);
    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('id, position_id')
      .in('id', userIds);

    if (empErr) throw empErr;

    const userToPosition = new Map();
    for (const e of emps || []) {
      userToPosition.set(String(e.id), e.position_id ? String(e.position_id) : null);
    }

    const { data: rates, error: rateErr } = await supabase
      .from('tpr_project_role_rates')
      .select('position_id, bill_rate')
      .eq('project_id', projectId);

    if (rateErr) throw rateErr;

    const rateMap = new Map();
    for (const r of rates || []) {
      if (!r?.position_id) continue;
      rateMap.set(String(r.position_id), toNum(r.bill_rate));
    }

    let wip = 0;
    let hoursTotal = 0;
    let missingPositionCount = 0;
    let missingRateCount = 0;

    for (const r of rows) {
      const hrs = toNum(r.hours);
      if (hrs <= 0) continue;
      hoursTotal += hrs;

      const uid = String(r.user_id || '');
      const posId = userToPosition.get(uid) || null;
      if (!posId) {
        missingPositionCount += 1;
        continue;
      }

      const billRate = toNum(rateMap.get(posId));
      if (billRate <= 0) {
        missingRateCount += 1;
        continue;
      }

      wip += hrs * billRate;
    }

    return {
      wip,
      currency: 'THB',
      entryCount: rows.length,
      hoursTotal,
      missingPositionCount,
      missingRateCount,
    };
  },

  // ---------- Dashboard: AR ----------
  // AR = SUM(invoice.total_amount where status!='DRAFT') - SUM(payments.amount where status='RECEIVED')
  getArFromInvoices: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data: invoices, error: invErr } = await supabase
      .from('tpr_invoices')
      .select('id, total_amount')
      .eq('project_id', projectId)
      .not('status', 'eq', 'DRAFT');

    if (invErr) throw invErr;

    const invRows = Array.isArray(invoices) ? invoices : [];
    if (invRows.length === 0) {
      return {
        ar: 0,
        invoiceTotal: 0,
        receivedTotal: 0,
        invoiceCount: 0,
        paymentCount: 0,
      };
    }

    const invoiceIds = invRows.map((r) => r.id);
    const invoiceTotal = invRows.reduce((sum, r) => sum + toNum(r.total_amount), 0);

    const { data: payments, error: payErr } = await supabase
      .from('tpr_invoice_payments')
      .select('amount, status')
      .eq('project_id', projectId)
      .eq('status', 'RECEIVED')
      .in('invoice_id', invoiceIds);

    if (payErr) throw payErr;

    const payRows = Array.isArray(payments) ? payments : [];
    const receivedTotal = payRows.reduce((sum, r) => sum + toNum(r.amount), 0);

    const ar = Math.max(0, invoiceTotal - receivedTotal);

    return {
      ar,
      invoiceTotal,
      receivedTotal,
      invoiceCount: invRows.length,
      paymentCount: payRows.length,
    };
  },

  // ✅ Combined metric: Progress vs Budget Used (WIP + AR)
  // - Used = WIP + AR
  // - Budget = tpr_projects.budget
  getProgressVsBudget: async (supabase, projectId, opts = {}) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    // ✅ ตอนนี้มีตาราง tpr_invoice_payments แล้ว -> ไม่ fallback
    const { allowArFallback = false } = opts || {};

    const { data: proj, error: projErr } = await supabase
      .from('tpr_projects')
      .select('id, budget, status')
      .eq('id', projectId)
      .maybeSingle();

    if (projErr) throw projErr;

    const budgetTotal = parseBudgetNumber(proj?.budget);

    const progressRes = await Projects.getProgressFromTasks(supabase, projectId);
    const progressPct = clampPct(progressRes?.pct || 0);

    const wipRes = await Projects.getWipFromTimesheets(supabase, projectId);
    const wip = toNum(wipRes?.wip || 0);
    const wipHoursTotal = toNum(wipRes?.hoursTotal || 0);

    let arRes;
    try {
      arRes = await Projects.getArFromInvoices(supabase, projectId);
    } catch (e) {
      if (!allowArFallback) throw e;
      // fallback intentionally disabled by default
      throw e;
    }

    const ar = toNum(arRes?.ar || 0);
    const invoiceTotal = toNum(arRes?.invoiceTotal || 0);
    const receivedTotal = toNum(arRes?.receivedTotal || 0);

    const usedAmount = wip + ar;
    const usedPct = budgetTotal > 0 ? clampPct((usedAmount / budgetTotal) * 100) : 0;

    const remainingAmount = Math.max(0, budgetTotal - usedAmount);
    const deltaPct = clampPct(progressPct - usedPct);

    let health = 'GOOD';
    if (usedPct > progressPct + 10) health = 'RISK';
    else if (usedPct > progressPct) health = 'WARN';

    return {
      projectId,
      status: proj?.status || null,

      progressPct,
      progressDone: toNum(progressRes?.done || 0),
      progressTotal: toNum(progressRes?.total || 0),

      budgetTotal,
      usedAmount,
      usedPct,
      remainingAmount,

      wip,
      wipHoursTotal,

      ar,
      invoiceTotal,
      receivedTotal,

      deltaPct,
      health,
    };
  },

  // Lightweight initialization hook (optional)
  init: () => true,
};

export default Projects;
