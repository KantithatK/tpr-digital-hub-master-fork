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

function formatMoneyTHB(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('th-TH', { maximumFractionDigits: 0 });
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

/* ===========================
   Workstream auto-create
   =========================== */

function bangkokStampYYYYMMDD_HHMM(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t) => parts.find((p) => p.type === t)?.value;
  const yyyy = get('year');
  const mm = get('month');
  const dd = get('day');
  const hh = get('hour');
  const mi = get('minute');
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

async function createInitialWorkstream(supabase, project, actor) {
  if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
  const projectId = project?.id;
  if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

  const stamp = bangkokStampYYYYMMDD_HHMM(new Date());
  const baseCode = `WS-${stamp}`;

  const budget_amount = parseBudgetNumber(project?.budget);
  const start_date = normalizeDateISO(project?.start_date) || null;
  const end_date = normalizeDateISO(project?.end_date) || null;

  // กันชน unique (project_id, code) เผื่อสร้างติดกันในนาทีเดียว
  const tries = [baseCode, `${baseCode}-01`, `${baseCode}-02`];

  let lastErr = null;

  for (const code of tries) {
    const payload = {
      project_id: projectId,
      code,
      name: 'Work 1',
      budget_amount,
      start_date,
      end_date,
      created_by: actor || null,
      updated_by: actor || null,
      // field อื่นปล่อย default DB
    };

    const { data, error } = await supabase.from('tpr_workstreams').insert([payload]).select('*').maybeSingle();

    if (!error) return data;
    lastErr = error;

    const msg = String(error?.message || '').toLowerCase();
    const isUnique =
      msg.includes('duplicate key') ||
      msg.includes('uq_tpr_workstreams_project_code') ||
      msg.includes('unique');

    if (!isUnique) throw error; // error อื่นๆ โยนเลย
  }

  throw lastErr || new Error('CREATE_INITIAL_WORKSTREAM_FAILED');
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

  // ✅ Create: หลังสร้างโปรเจค -> เพิ่มทีมเริ่มต้น + สร้าง workstream เริ่มต้น 1 ตัว
  afterCreateProject: async ({ supabase, project, initial_team_ids, project_manager_ids, project_admin_id, actor }) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    const projectId = project?.id;
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const merged = uniqStringList([
      ...(Array.isArray(initial_team_ids) ? initial_team_ids : []),
      ...(Array.isArray(project_manager_ids) ? project_manager_ids : []),
      project_admin_id || null,
    ]).filter(isUuid);

    const members = await Projects.addInitialTeamMembers(supabase, projectId, merged, actor || null);

    // ✅ auto create workstream 1 ตัว
    await createInitialWorkstream(supabase, project, actor || null);

    return members;
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
  formatMoneyTHB,

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
  // AR = SUM(invoice.total_amount where status!='DRAFT') - SUM(payments.amount by invoice_id)
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
      return { ar: 0, invoiceTotal: 0, receivedTotal: 0, invoiceCount: 0, paymentCount: 0 };
    }

    const invoiceIds = invRows.map((r) => r.id);
    const invoiceTotal = invRows.reduce((sum, r) => sum + toNum(r.total_amount), 0);

    // ✅ ตาราง payments ของคุณไม่มี project_id / status -> ดึงตาม invoice_id เท่านั้น
    const { data: payments, error: payErr } = await supabase
      .from('tpr_invoice_payments')
      .select('invoice_id, amount')
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

  // ---------- Dashboard: Signal / Alert ----------
  // รวมสัญญาณเตือนหลัก:
  // 1) No Approved timesheet in last N days (default 7) ใช้ tpr_time_entries.entry_date
  // 2) Invoice overdue (due_date < today) และยังรับชำระไม่ครบ (payments < total) — ไม่นับ DRAFT
  // 3) Overdue tasks (end_date < today) และ metadata->>'status' != 'Done' — billable เท่านั้น
  // 4) Budget risk (usedPct > progressPct) ใช้ getProgressVsBudget()
  // 5) Missing position/rate (จาก getWipFromTimesheets())
  getSignalsForProject: async (supabase, projectId, opts = {}) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const {
      daysNoTimesheetApproved = 7,
      // เพื่อให้หน้า dashboard reuse ผลที่โหลดมาแล้วได้ (optional)
      wipRes: wipResFromCaller = null,
      pvRes: pvResFromCaller = null,
    } = opts || {};

    const toNum2 = (v) => {
      const n = Number(v || 0);
      return Number.isFinite(n) ? n : 0;
    };

    const getBangkokDateISO = (date = new Date()) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);

      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const d = parts.find((p) => p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    };

    const addDays = (isoYYYYMMDD, deltaDays) => {
      // iso -> Date (treat as UTC midnight to avoid timezone surprises)
      const [y, m, d] = String(isoYYYYMMDD).split('-').map((x) => Number(x));
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      dt.setUTCDate(dt.getUTCDate() + Number(deltaDays || 0));
      const yy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    const today = getBangkokDateISO(new Date());
    const since = addDays(today, -Math.abs(Number(daysNoTimesheetApproved || 7)));

    const signals = [];

    // ===== 1) Timesheet Approved ล่าสุด =====
    try {
      const { count, error } = await supabase
        .from('tpr_time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'Approved')
        .gte('entry_date', since);

      if (error) throw error;

      const c = Number(count || 0);
      if (c === 0) {
        signals.push({
          level: 'WARN',
          key: 'NO_APPROVED_TIMESHEET',
          title: 'ไม่มี Timesheet Approved',
          detail: `ไม่พบการอนุมัติ Timesheet ใน ${daysNoTimesheetApproved} วันล่าสุด`,
          meta: { days: daysNoTimesheetApproved },
        });
      }
    } catch (e) {
      signals.push({
        level: 'INFO',
        key: 'TIMESHEET_CHECK_ERROR',
        title: 'ตรวจสอบ Timesheet ไม่สำเร็จ',
        detail: String(e?.message || 'TIMESHEET_CHECK_ERROR'),
      });
    }

    // ===== 2) Invoice Overdue (due_date < today และยังรับไม่ครบ) =====
    try {
      const { data: invRows, error: invErr } = await supabase
        .from('tpr_invoices')
        .select('id, due_date, total_amount, status')
        .eq('project_id', projectId)
        .not('status', 'eq', 'DRAFT')
        .not('due_date', 'is', null)
        .lt('due_date', today);

      if (invErr) throw invErr;

      const invoices = Array.isArray(invRows) ? invRows : [];
      if (invoices.length) {
        const invoiceIds = invoices.map((r) => r.id);

        const { data: payRows, error: payErr } = await supabase
          .from('tpr_invoice_payments')
          .select('invoice_id, amount')
          .in('invoice_id', invoiceIds);

        if (payErr) throw payErr;

        const paidMap = new Map();
        for (const p of payRows || []) {
          const id = String(p.invoice_id || '');
          const prev = toNum2(paidMap.get(id) || 0);
          paidMap.set(id, prev + toNum2(p.amount));
        }

        let overdueCount = 0;
        let overdueAmount = 0;

        for (const inv of invoices) {
          const total = toNum2(inv.total_amount);
          const paid = toNum2(paidMap.get(String(inv.id)) || 0);
          const remain = total - paid;
          if (remain > 0.00001) {
            overdueCount += 1;
            overdueAmount += remain;
          }
        }

        if (overdueCount > 0) {
          signals.push({
            level: 'RISK',
            key: 'INVOICE_OVERDUE',
            title: 'Invoice เกินกำหนดชำระ',
            detail: `ค้างชำระ ${overdueCount} ใบ (ยอดคงค้างรวม ${formatMoneyTHB(overdueAmount)} THB)`,
            meta: { overdueCount, overdueAmount },
          });
        }
      }
    } catch (e) {
      signals.push({
        level: 'INFO',
        key: 'INVOICE_OVERDUE_CHECK_ERROR',
        title: 'ตรวจสอบ Invoice Overdue ไม่สำเร็จ',
        detail: String(e?.message || 'INVOICE_OVERDUE_CHECK_ERROR'),
      });
    }

    // ===== 3) Overdue Tasks (WBS) =====
    try {
      const { count, error } = await supabase
        .from('tpr_project_wbs_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('billable_mode', 'billable')
        .not('end_date', 'is', null)
        .lt('end_date', today)
        .neq('metadata->>status', 'Done');

      if (error) throw error;

      const c = Number(count || 0);
      if (c > 0) {
        signals.push({
          level: 'WARN',
          key: 'TASKS_OVERDUE',
          title: 'มีงานเกินกำหนด (Overdue tasks)',
          detail: `พบ ${c} งานที่ end_date < วันนี้ และยังไม่ Done`,
          meta: { overdueTasks: c },
        });
      }
    } catch (e) {
      signals.push({
        level: 'INFO',
        key: 'TASKS_OVERDUE_CHECK_ERROR',
        title: 'ตรวจสอบ Overdue tasks ไม่สำเร็จ',
        detail: String(e?.message || 'TASKS_OVERDUE_CHECK_ERROR'),
      });
    }

    // ===== 4) Budget Risk (Used% > Progress%) =====
    try {
      const pvRes = pvResFromCaller || (await Projects.getProgressVsBudget(supabase, projectId, { allowArFallback: true }));
      const usedPct = toNum2(pvRes?.usedPct);
      const progressPct = toNum2(pvRes?.progressPct);
      const delta = toNum2(pvRes?.deltaPct);

      if (usedPct > progressPct + 10) {
        signals.push({
          level: 'RISK',
          key: 'BUDGET_RISK',
          title: 'งบใช้ไปแซงความคืบหน้า',
          detail: `Used ${Math.round(usedPct)}% > Progress ${Math.round(progressPct)}% (ต่าง ${Math.round(Math.abs(delta))}%)`,
          meta: { usedPct, progressPct, deltaPct: delta },
        });
      } else if (usedPct > progressPct) {
        signals.push({
          level: 'WARN',
          key: 'BUDGET_WARN',
          title: 'งบใช้ไปเริ่มแซงความคืบหน้า',
          detail: `Used ${Math.round(usedPct)}% > Progress ${Math.round(progressPct)}%`,
          meta: { usedPct, progressPct, deltaPct: delta },
        });
      }
    } catch (e) {
      signals.push({
        level: 'INFO',
        key: 'BUDGET_SIGNAL_ERROR',
        title: 'คำนวณสัญญาณงบไม่สำเร็จ',
        detail: String(e?.message || 'BUDGET_SIGNAL_ERROR'),
      });
    }

    // ===== 5) Missing position/rate (จาก WIP calc) =====
    try {
      const wipRes = wipResFromCaller || (await Projects.getWipFromTimesheets(supabase, projectId));
      const missPos = Number(wipRes?.missingPositionCount || 0);
      const missRate = Number(wipRes?.missingRateCount || 0);

      if (missPos > 0) {
        signals.push({
          level: 'WARN',
          key: 'MISSING_POSITION',
          title: 'Timesheet บางรายการไม่มี Position',
          detail: `พบ ${missPos} รายการ (employees.position_id ว่าง) ทำให้คำนวณ WIP ไม่ครบ`,
          meta: { missingPositionCount: missPos },
        });
      }
      if (missRate > 0) {
        signals.push({
          level: 'WARN',
          key: 'MISSING_RATE',
          title: 'ไม่มี Rate สำหรับบางตำแหน่ง',
          detail: `พบ ${missRate} รายการ (ไม่มี bill_rate ใน tpr_project_role_rates) ทำให้คำนวณ WIP ไม่ครบ`,
          meta: { missingRateCount: missRate },
        });
      }
    } catch (e) {
      signals.push({
        level: 'INFO',
        key: 'WIP_SIGNAL_ERROR',
        title: 'ตรวจสอบสัญญาณ WIP ไม่สำเร็จ',
        detail: String(e?.message || 'WIP_SIGNAL_ERROR'),
      });
    }

    // sort: RISK -> WARN -> INFO
    const order = { RISK: 0, WARN: 1, INFO: 2 };
    signals.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));

    return signals;
  },

  // ===== Workstreams =====
  getWorkstreamsForProject: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('id, project_id, code, name, status, progress, budget_amount, spent_amount, start_date, end_date, archived, deleted')
      .eq('project_id', projectId)
      .eq('deleted', false)
      .eq('archived', false)
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // ---------- Workstreams: Summary helper (DB-backed) ----------
  getWorkstreamsSummary: async (supabase, projectId) => {
    if (!supabase) throw new Error('MISSING_SUPABASE');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('id, name, code, status, progress, budget_amount, spent_amount, start_date, end_date')
      .eq('project_id', projectId)
      .eq('deleted', false)
      .eq('archived', false)
      .order('code', { ascending: true });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const totalCount = rows.length;
    const doneCount = rows.filter((r) => String(r?.status || '') === 'เสร็จแล้ว').length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    let spentTotal = 0;
    let budgetTotal = 0;
    for (const r of rows) {
      spentTotal += toNum(r?.spent_amount || 0);
      budgetTotal += toNum(r?.budget_amount || 0);
    }

    return {
      workstreams: rows,
      totalCount,
      doneCount,
      progressPct: clampPct(progressPct),
      spentTotal,
      budgetTotal,
    };
  },

  // ---------- Workstreams: Line series for charts ----------
  getWorkstreamsLineSeries: async (supabase, projectId) => {
    const summary = await Projects.getWorkstreamsSummary(supabase, projectId);
    const rows = Array.isArray(summary?.workstreams) ? summary.workstreams : [];

    const categories = rows.map((r) => {
      const name = String(r?.name || '').trim();
      if (!name) return (String(r?.code || '') || '').slice(0, 3).toUpperCase();
      return name.slice(0, 3).toUpperCase();
    });

    const seriesData = rows.map((r) => {
      let p = toNum(r?.progress || 0);
      if (p <= 1) p = p * 100;
      return clampPct(p);
    });

    return {
      categories,
      series: [{ name: 'Progress', data: seriesData }],
      raw: rows,
    };
  },

  // ---------- Project member avatars (for dashboard small bar) ----------
  getProjectMemberAvatars: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    // 1) get member rows
    const { data: memRows, error: memErr } = await supabase
      .from('tpr_project_members')
      .select('employee_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (memErr) throw memErr;

    const memberIds = Array.isArray(memRows) ? memRows.map((r) => String(r.employee_id)).filter(isUuid) : [];
    if (!memberIds.length) return [];

    // 2) load employees
    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('id, image_url, nickname_th, nickname_en, first_name_th, last_name_th, first_name_en, last_name_en')
      .in('id', memberIds);

    if (empErr) throw empErr;

    const empList = Array.isArray(emps) ? emps : [];

    const mapped = empList.map((e) => {
      const id = String(e.id || '');
      const nicknameRaw = (e.nickname_th || e.nickname_en || e.first_name_th || e.first_name_en || '').trim();
      const nickname = nicknameRaw || '—';
      return {
        employee_id: id,
        image_url: e.image_url || null,
        nickname,
      };
    });

    // sort by nickname using Thai collator fallback-safe
    try {
      const collator = new Intl.Collator('th', { sensitivity: 'base', numeric: true });
      mapped.sort((a, b) => collator.compare(a.nickname || '', b.nickname || ''));
    } catch (e) {
      mapped.sort((a, b) => String(a.nickname || '').localeCompare(String(b.nickname || '')));
    }

    return mapped;
  },

  // ---------- UI helpers for project list ----------
  // Map English status to Thai label used in list UI
  statusTh: (status) => {
    const s = String(status || '');
    if (s === 'Planning') return 'อยู่ระหว่างวางแผน';
    if (s === 'Active') return 'กำลังดำเนินการ';
    if (s === 'Completed') return 'เสร็จสิ้น';
    return s || '';
  },

  // Emoji indicator for status
  statusEmoji: (status) => {
    const s = String(status || '');
    if (s === 'Active') return '🌳';
    if (s === 'Planning') return '🌱';
    if (s === 'Completed') return '🌴';
    return '•';
  },

  // Calculate used percentage from budget and spent_amount
  calcUsedPct: (budget, spent_amount) => {
    const b = parseBudgetNumber(budget);
    const s = toNum(spent_amount);
    if (!b || b <= 0) return 0;
    return Math.round((s / b) * 100);
  },

  // Simple budget health classification for UI
  budgetHealth: (budget, spent_amount) => {
    const usedPct = (function () {
      const b = parseBudgetNumber(budget);
      const s = toNum(spent_amount);
      if (!b || b <= 0) return 0;
      return Math.round((s / b) * 100);
    })();

    if (usedPct === 0) return 'NO_SPEND';
    if (usedPct > 100) return 'OVER_BUDGET';
    if (usedPct >= 90) return 'NEAR_LIMIT';
    return 'IN_BUDGET';
  },

  // ---------- Fetch projects list (for "รายการโครงการ") ----------
  // NOTE: rely on summary fields already synced into tpr_projects
  getProjectsList: async (supabase) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');

    const { data, error } = await supabase
      .from('tpr_projects')
      .select(
        'id, project_code, name_th, name_en, customer_id, customer_code, customer_name, start_date, end_date, status, progress, budget, spent_amount, image_path, project_manager_ids, parent_project_id'
      )
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data || [];
  },

  // ---------- Workstream-based KPIs (Supabase queries) ----------
  // 1) Progress computed from workstreams (count done / total)
  getProgressFromWorkstreams: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('deleted', false)
      .eq('archived', false);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const total = rows.length;
    const done = rows.filter((r) => String(r?.status || '') === 'เสร็จแล้ว').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return { done, total, pct };
  },

  // 2) WIP computed from workstream spent_amount
  getWipFromWorkstreams: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('spent_amount')
      .eq('project_id', projectId)
      .eq('deleted', false)
      .eq('archived', false);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const wip = rows.reduce((s, r) => s + toNum(r?.spent_amount || 0), 0);
    return { wip, currency: 'THB', rowCount: rows.length };
  },

  // ---------- Workstream-based: Progress vs Budget (aggregate from workstreams) ----------
  getProgressVsBudgetFromWorkstreams: async (supabase, projectId) => {
    if (!supabase) throw new Error('SUPABASE_CLIENT_REQUIRED');
    if (!isUuid(projectId)) throw new Error('INVALID_PROJECT_ID');

    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('id, status, budget_amount, spent_amount')
      .eq('project_id', projectId)
      .eq('deleted', false)
      .eq('archived', false);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const total = rows.length;
    const done = rows.filter((r) => String(r?.status || '') === 'เสร็จแล้ว').length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

    let budgetTotal = 0;
    let usedAmount = 0;
    for (const r of rows) {
      budgetTotal += toNum(r?.budget_amount || 0);
      usedAmount += toNum(r?.spent_amount || 0);
    }

    const usedPct = budgetTotal > 0 ? Math.round((usedAmount / budgetTotal) * 100) : 0;
    const deltaPct = Math.round(progressPct - usedPct);
    const remainingAmount = Math.max(0, budgetTotal - usedAmount);

    let health = 'GOOD';
    if (usedPct > progressPct + 10) health = 'RISK';
    else if (usedPct > progressPct) health = 'WARN';

    return {
      progressPct,
      usedPct,
      usedAmount,
      budgetTotal,
      remainingAmount,
      deltaPct,
      health,
      done,
      total,
    };
  },

  // ---------- Derive project status from workstream aggregates (sync) ----------
  // input: { progressPct, total }
  deriveProjectStatusFromWorkstreams: ({ progressPct, total }) => {
    const pct = Number(progressPct || 0);
    const t = Number(total || 0);

    if (!Number.isFinite(t) || t <= 0) return 'Planning';
    if (pct >= 100) return 'Completed';
    if (pct > 0 && pct < 100) return 'Active';
    // pct === 0 && t > 0
    return 'Planning';
  },

  // map derived status to Thai label used in UI
  statusThFromDerived: (status) => {
    const s = String(status || '');
    if (s === 'Planning') return 'อยู่ระหว่างวางแผน';
    if (s === 'Active') return 'กำลังดำเนินการ';
    if (s === 'Completed') return 'เสร็จสิ้น';
    return 'อยู่ระหว่างวางแผน';
  },

  // ---------- Workstream budget/risk helper (synchronous, no DB calls) ----------
  // Compute display-ready metadata for a workstream row.
  // row: object from tpr_workstreams (or mapped row) with at least
  //   spent_amount, budget_amount, progress
  // opts: optional thresholds { nearLimitPct: 90, riskDeltaPct: 10 }
  getWorkstreamBudgetMeta: (row, opts = {}) => {
    const nearLimitPct = Number(opts?.nearLimitPct ?? 90);
    const riskDelta = Number(opts?.riskDeltaPct ?? 10);

    const usedAmount = toNum(row?.spent_amount ?? row?.usedAmount ?? row?.usedBudget ?? 0);
    const budgetAmount = toNum(row?.budget_amount ?? row?.budget ?? row?.totalBudget ?? 0);

    // normalize progress (support 0..1 and 0..100)
    let raw = toNum(row?.progress ?? row?.progressPct ?? 0);
    let progressPct = raw <= 1 ? raw * 100 : raw;
    progressPct = clampPct(progressPct);

    const usedPct = budgetAmount > 0 ? clampPct((usedAmount / budgetAmount) * 100) : 0;
    const gapPct = Math.round(progressPct - usedPct);

    // usage classification
    let usageKey = 'IN_BUDGET';
    let usageLabel = 'อยู่ในงบ';
    let usageColor = '#08d84c';

    if (budgetAmount <= 0) {
      usageKey = 'NO_PLAN';
      usageLabel = usedAmount > 0 ? 'ไม่มีแผนงบ' : 'ไม่มีงบ';
      usageColor = '#64748b';
    } else if (usedAmount <= 0) {
      usageKey = 'NO_SPEND';
      usageLabel = 'ยังไม่ใช้จ่าย';
      usageColor = '#64748b';
    } else if (usedPct > 100) {
      usageKey = 'OVER_BUDGET';
      usageLabel = 'เกินงบ';
      usageColor = '#ff4059';
    } else if (usedPct >= nearLimitPct) {
      usageKey = 'NEAR_LIMIT';
      usageLabel = 'ใกล้ขีดจำกัด';
      usageColor = '#f59e0b';
    } else {
      usageKey = 'IN_BUDGET';
      usageLabel = 'อยู่ในงบ';
      usageColor = '#08d84c';
    }

    // risk assessment vs progress
    let riskLevel = 'GOOD';
    let riskMessage = 'อยู่ในเกณฑ์ปกติ';
    if (usedPct > progressPct + riskDelta) {
      riskLevel = 'RISK';
      riskMessage = `งบใช้ไปมากกว่าความคืบหน้าเกิน ${riskDelta}%`;
    } else if (usedPct > progressPct) {
      riskLevel = 'INFO';
      riskMessage = 'งบใช้ไปเริ่มแซงความคืบหน้า';
    }

    const tooltip = {
      title: 'สรุปงบ Work',
      lines: [
        `ใช้ไป: ฿ ${formatMoneyTHB(usedAmount)} (${Math.round(usedPct)}%)`,
        `งบทั้งหมด: ฿ ${formatMoneyTHB(budgetAmount)}`,
        `ความคืบหน้า: ${Math.round(progressPct)}%`,
        `ความต่าง (Progress - Used): ${gapPct}%`,
        `${riskMessage}`,
      ],
    };

    return {
      usedAmount,
      budgetAmount,
      usage: {
        key: usageKey,
        label: usageLabel,
        color: usageColor,
        percent: Math.round(usedPct),
      },
      risk: {
        level: riskLevel,
        message: riskMessage,
        progressPct: Math.round(progressPct),
        usedPct: Math.round(usedPct),
        gapPct,
      },
      tooltip,
    };
  },


  // Lightweight initialization hook (optional)
  init: () => true,
};

export default Projects;
