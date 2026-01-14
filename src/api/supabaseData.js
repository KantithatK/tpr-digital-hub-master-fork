import { supabase } from "../lib/supabaseClient";

// Centralized Supabase data helpers for project-wide usage.
// All methods return { data, error } with normalized error objects.

function normalizeError(error, hint) {
  if (!error) return null;
  return {
    message: error.message || "Unknown error",
    code: error.code,
    details: error.details,
    hint,
  };
}

/**
 * Helpers: date & time formatting utilities used by TimeClock and other modules
 */
export function getBangkokDateISO(date = new Date()) {
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
}

export function formatTimeTH(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });
  } catch {
    return '-';
  }
}

export function formatDateTHFromISO(dayISO) {
  try {
    const d = new Date(`${dayISO}T00:00:00`);
    return new Intl.DateTimeFormat('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    }).format(d);
  } catch {
    return dayISO;
  }
}

export function formatDurationHours(inTs, outTs) {
  if (!inTs || !outTs) return '-';
  try {
    const inMs = new Date(inTs).getTime();
    const outMs = new Date(outTs).getTime();
    if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return '-';
    const totalMinutes = Math.round((outMs - inMs) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '-';
  }
}

function buildQuery({ table, select = "*", filters = [], order = null }) {
  let query = supabase.from(table).select(select);

  for (const f of filters || []) {
    const { type = "eq", column, value, options } = f;
    if (!column) continue;
    switch (type) {
      case "eq":
        query = query.eq(column, value);
        break;
      case "neq":
        query = query.neq(column, value);
        break;
      case "gt":
        query = query.gt(column, value);
        break;
      case "gte":
        query = query.gte(column, value);
        break;
      case "lt":
        query = query.lt(column, value);
        break;
      case "lte":
        query = query.lte(column, value);
        break;
      case "ilike":
        query = query.ilike(column, value);
        break;
      case "like":
        query = query.like(column, value);
        break;
      case "in":
        query = query.in(column, Array.isArray(value) ? value : [value]);
        break;
      case "is":
        query = query.is(column, value);
        break;
      case "contains":
        query = query.contains(column, value);
        break;
      case "or":
        // example value: "col1.eq.value1,col2.eq.value2"
        query = query.or(value, options);
        break;
      default:
        break;
    }
  }

  if (order && order.column) {
    const { column, ascending = true, nullsFirst } = order;
    query = query.order(column, { ascending, nullsFirst });
  }

  return query;
}

export async function fetchAll({ table, select = "*", filters = [], order = null }) {
  const query = buildQuery({ table, select, filters, order });
  const { data, error } = await query;
  return { data, error: normalizeError(error, `fetchAll:${table}`) };
}

export async function fetchPage({
  table,
  select = "*",
  page = 1,
  pageSize = 20,
  filters = [],
  order = null,
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = buildQuery({ table, select, filters, order }).range(from, to);

  const { data, error, count } = await query;
  return {
    data,
    count,
    page,
    pageSize,
    error: normalizeError(error, `fetchPage:${table}`),
  };
}

export async function fetchById({ table, id, idColumn = "id", select = "*" }) {
  const { data, error } = await supabase.from(table).select(select).eq(idColumn, id).single();
  return { data, error: normalizeError(error, `fetchById:${table}`) };
}

export async function insert({ table, payload, returning = "representation" }) {
  const { data, error } = await supabase
    .from(table)
    .insert(payload, { returning })
    .select("*");
  return { data, error: normalizeError(error, `insert:${table}`) };
}

export async function update({ table, id, patch, idColumn = "id", returning = "representation" }) {
  const { data, error } = await supabase
    .from(table)
    .update(patch, { returning })
    .eq(idColumn, id)
    .select("*");
  return { data, error: normalizeError(error, `update:${table}`) };
}

export async function remove({ table, id, idColumn = "id" }) {
  const { data, error } = await supabase.from(table).delete().eq(idColumn, id);
  return { data, error: normalizeError(error, `remove:${table}`) };
}

export async function rpc({ fn, params = {}, options = {} }) {
  const { data, error } = await supabase.rpc(fn, params, options);
  return { data, error: normalizeError(error, `rpc:${fn}`) };
}

export async function upsert({ table, payload, onConflict, returning = "representation" }) {
  let q = supabase.from(table).upsert(payload, { onConflict, returning }).select("*");
  const { data, error } = await q;
  return { data, error: normalizeError(error, `upsert:${table}`) };
}

// --------- Project-specific helpers ---------

// Load positions that are registered for a project (from tpr_project_role_rates)
// and join with master `positions` table for labels/codes.
// Returns array: [{ project_role_id, position_id, code, label, cost_rate, bill_rate }]
export async function fetchProjectPositions(projectId) {
  if (!projectId) return { data: [], error: null };

  // First try: use PostgREST relationship select (single-query join).
  // This requires a foreign-key relationship from tpr_project_role_rates.position_id -> positions.id
  try {
    const { data, error } = await supabase
      .from("tpr_project_role_rates")
      .select("id, project_id, position_id, cost_rate, bill_rate, positions(id,position_code,position_name,position_name_eng)")
      .eq("project_id", projectId);

    if (!error) {
      const rows = (data || []).map((r) => {
        const pos = r.positions || {};
        const label = pos.position_name || pos.position_name_eng || pos.position_code || String(r.position_id);
        const code = pos.position_code || "";
        return {
          project_role_id: r.id,
          position_id: r.position_id,
          code,
          label,
          cost_rate: r.cost_rate ?? null,
          bill_rate: r.bill_rate ?? null,
        };
      });
      return { data: rows, error: null };
    }

    // If error is not relationship related, return normalized error
    const msg = (error && (error.message || '')).toString();
    const isRelationshipError = msg.toLowerCase().includes('relationship') || msg.toLowerCase().includes('could not find a relationship');
    if (!isRelationshipError) return { data: null, error: normalizeError(error, "fetchProjectPositions") };
  } catch (e) {
    // sometimes SDK throws; detect relationship message as well
    const emsg = (e && (e.message || '')).toString();
    const isRelationshipError = emsg.toLowerCase().includes('relationship') || emsg.toLowerCase().includes('could not find a relationship');
    if (!isRelationshipError) return { data: null, error: normalizeError(e, "fetchProjectPositions") };
    // else fall through to fallback path
  }

  // Fallback path: no DB relationship exists. Fetch project_role_rates, then fetch positions
  // by IDs and merge client-side. This is slightly less efficient but works without DB FKs.
  try {
    const { data: rates, error: ratesErr } = await supabase
      .from('tpr_project_role_rates')
      .select('id, position_id, cost_rate, bill_rate')
      .eq('project_id', projectId);
    if (ratesErr) return { data: null, error: normalizeError(ratesErr, 'fetchProjectPositions:fallback:rates') };

    const ids = Array.from(new Set((rates || []).map(r => r.position_id).filter(Boolean)));
    let positionsMap = {};
    if (ids.length) {
      const { data: posRows, error: posErr } = await supabase
        .from('positions')
        .select('id,position_code,position_name,position_name_eng')
        .in('id', ids)
        .limit(2000);
      if (posErr) return { data: null, error: normalizeError(posErr, 'fetchProjectPositions:fallback:positions') };
      positionsMap = (posRows || []).reduce((acc, p) => {
        acc[String(p.id)] = p;
        return acc;
      }, {});
    }

    const merged = (rates || []).map(r => {
      const p = positionsMap[String(r.position_id)] || {};
      const label = p.position_name || p.position_name_eng || p.position_code || String(r.position_id);
      const code = p.position_code || '';
      return {
        project_role_id: r.id,
        position_id: r.position_id,
        code,
        label,
        cost_rate: r.cost_rate ?? null,
        bill_rate: r.bill_rate ?? null,
      };
    });

    return { data: merged, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err, 'fetchProjectPositions:fallback') };
  }
}

// Load master positions list (for dialogs / selection)
// Returns array: [{ id, code, label }]
export async function fetchMasterPositions() {
  const { data, error } = await supabase
    .from("positions")
    .select("id,position_code,position_name,position_name_eng")
    .order("position_code", { ascending: true })
    .limit(2000);

  if (error) return { data: null, error: normalizeError(error, "fetchMasterPositions") };

  const rows = (data || []).map((p) => ({
    id: p.id,
    code: p.position_code || "",
    label: p.position_name || p.position_name_eng || p.position_code || String(p.id),
  }));

  return { data: rows, error: null };
}

// --------- Rate helpers (bill_rate / cost_rate) ---------

// Fetch latest markup settings used to derive bill rates from cost rates.
// Returns { standard_hours, overhead_percent, profit_percent }
export async function fetchMarkupSettings() {
  try {
    const { data, error } = await supabase
      .from('tpr_markup_settings')
      .select('standard_hours, overhead_percent, profit_percent')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return { data: null, error: normalizeError(error, 'fetchMarkupSettings') };
    const row = Array.isArray(data) && data.length ? data[0] : {};
    const out = {
      standard_hours: row?.standard_hours ? Number(row.standard_hours) || 160 : 160,
      overhead_percent: row?.overhead_percent !== undefined && row?.overhead_percent !== null ? Number(row.overhead_percent) || 0 : 0,
      profit_percent: row?.profit_percent !== undefined && row?.profit_percent !== null ? Number(row.profit_percent) || 0 : 0,
    };
    return { data: out, error: null };
  } catch (e) {
    return { data: { standard_hours: 160, overhead_percent: 0, profit_percent: 0 }, error: normalizeError(e, 'fetchMarkupSettings') };
  }
}

// Compute cost_rate and bill_rate per position based on employee salary aggregates
// and markup settings. The calculation mirrors WBS: cost = total_salary / standard_hours,
// bill = cost * (1 + (overhead + profit)/100).
// Returns map: { [position_id]: { cost_rate, bill_rate } }
export async function computeRatesForPositions(positionIds, opts = {}) {
  const ids = Array.from(new Set((positionIds || []).filter(Boolean).map(String)));
  if (!ids.length) return { data: {}, error: null };
  try {
    let standardHours = Number(opts.standard_hours || 0) || 160;
    let overheadPercent = Number(opts.overhead_percent || 0) || 0;
    let profitPercent = Number(opts.profit_percent || 0) || 0;
    if (!opts.standard_hours && !opts.overhead_percent && !opts.profit_percent) {
      const { data: mk, error: mkErr } = await fetchMarkupSettings();
      if (!mkErr && mk) {
        standardHours = Number(mk.standard_hours || 160);
        overheadPercent = Number(mk.overhead_percent || 0);
        profitPercent = Number(mk.profit_percent || 0);
      }
    }

    const { data: salaryRows, error: salaryErr } = await supabase
      .from('employees')
      .select('position_id,salary_rate')
      .in('position_id', ids)
      .limit(10000);
    if (salaryErr) return { data: null, error: normalizeError(salaryErr, 'computeRatesForPositions:employees') };

    const totals = {};
    (salaryRows || []).forEach(s => {
      const pid = s && s.position_id ? String(s.position_id) : null;
      if (!pid) return;
      const raw = s && s.salary_rate !== undefined && s.salary_rate !== null ? String(s.salary_rate) : '';
      const cleaned = raw.replace(/[^0-9.-]/g, '');
      const val = cleaned ? Number(cleaned) : 0;
      if (!totals[pid]) totals[pid] = 0;
      totals[pid] += Number.isFinite(val) ? val : 0;
    });

    const markupTotal = Number(overheadPercent || 0) + Number(profitPercent || 0);
    const out = {};
    ids.forEach(pid => {
      const totalSalary = totals[pid] || 0;
      const cost = totalSalary > 0 ? +(totalSalary / (Number(standardHours) || 160)) : 0;
      const bill = cost > 0 ? +(cost * (1 + (Number(markupTotal || 0) / 100))) : 0;
      out[pid] = { cost_rate: cost, bill_rate: bill };
    });
    return { data: out, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'computeRatesForPositions') };
  }
}

// Fetch project role rates for the given project. Returns map by position_id.
export async function fetchProjectRoleRatesMap(projectId) {
  if (!projectId) return { data: {}, error: null };
  try {
    const { data, error } = await supabase
      .from('tpr_project_role_rates')
      .select('position_id,bill_rate,cost_rate')
      .eq('project_id', projectId)
      .limit(5000);
    if (error) return { data: null, error: normalizeError(error, 'fetchProjectRoleRatesMap') };
    const map = {};
    (data || []).forEach(r => { map[String(r.position_id)] = { bill_rate: r.bill_rate ?? null, cost_rate: r.cost_rate ?? null }; });
    return { data: map, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchProjectRoleRatesMap') };
  }
}

// Get rates for positions: prefer existing project role rates; compute for missing ones.
// Returns map: { [position_id]: { bill_rate, cost_rate, source: 'db' | 'computed' } }
export async function getRatesForPositions(projectId, positionIds) {
  const ids = Array.from(new Set((positionIds || []).filter(Boolean).map(String)));
  if (!ids.length) return { data: {}, error: null };
  const { data: existingMap, error: existingErr } = await fetchProjectRoleRatesMap(projectId);
  if (existingErr) return { data: null, error: existingErr };
  const missing = ids.filter(pid => !existingMap[String(pid)] || (existingMap[String(pid)].bill_rate === null && existingMap[String(pid)].cost_rate === null));
  let computed = {};
  if (missing.length) {
    const { data: comp, error: compErr } = await computeRatesForPositions(missing);
    if (compErr) return { data: null, error: compErr };
    computed = comp || {};
  }
  const out = {};
  ids.forEach(pid => {
    const db = existingMap[String(pid)] || null;
    if (db && (db.bill_rate !== null || db.cost_rate !== null)) {
      out[String(pid)] = { bill_rate: db.bill_rate ?? null, cost_rate: db.cost_rate ?? null, source: 'db' };
    } else {
      const c = computed[String(pid)] || { bill_rate: null, cost_rate: null };
      out[String(pid)] = { bill_rate: c.bill_rate, cost_rate: c.cost_rate, source: 'computed' };
    }
  });
  return { data: out, error: null };
}

// Load aggregated team members for a project.
// Returns { data: [ { id, label, position_id, position_label, billingRate, costRate, allocationHours, status } ], error }
export async function fetchProjectTeam(projectId) {
  if (!projectId) return { data: [], error: null };

  try {
    // 1) load tasks for project
    const { data: taskRows, error: taskErr } = await supabase
      .from('tpr_project_wbs_tasks')
      .select('*')
      .eq('project_id', projectId)
      .limit(2000);
    if (taskErr) return { data: null, error: normalizeError(taskErr, 'fetchProjectTeam:tasks') };

    // collect owners and build owner->tasks map
    const owners = new Set();
    const ownerTaskMap = {};
    (taskRows || []).forEach(r => {
      const o = r && r.owner;
      if (!o) return;
      let list = [];
      try {
        if (typeof o === 'string' && o.trim().startsWith('[')) {
          const parsed = JSON.parse(o);
          if (Array.isArray(parsed)) list = parsed.map(x => String(x));
        } else if (Array.isArray(o)) {
          list = o.map(x => String(x));
        } else if (typeof o === 'string' && o.includes(',')) {
          list = o.split(',').map(s => s.trim()).filter(Boolean).map(x => String(x));
        } else {
          list = [String(o)];
        }
      } catch {
        list = [String(o)];
      }
      list.forEach(ownerId => {
        owners.add(String(ownerId));
        ownerTaskMap[String(ownerId)] = ownerTaskMap[String(ownerId)] || [];
        ownerTaskMap[String(ownerId)].push(r);
      });
    });

    const maybeIds = Array.from(owners).map(x => String(x).trim()).filter(Boolean);

    // 2) load employee rows for owners
    let empRows = [];
    if (maybeIds.length) {
      const { data: eRows, error: empErr } = await supabase
        .from('employees')
        .select('id,employee_code,title_th,first_name_th,last_name_th,first_name_en,last_name_en,position_id,salary_rate')
        .in('id', maybeIds)
        .order('employee_code', { ascending: true });
      if (empErr) return { data: null, error: normalizeError(empErr, 'fetchProjectTeam:employees') };
      empRows = eRows || [];
    }

    // 3) collect position ids and load salary rows by position to compute position-level cost
    const posIds = new Set();
    (empRows || []).forEach(e => { if (e.position_id) posIds.add(String(e.position_id)); });

    let positionCostMap = {};
    const pidListForSalary = Array.from(posIds);
    if (pidListForSalary.length > 0) {
      const { data: salaryRows, error: salaryErr } = await supabase
        .from('employees')
        .select('position_id,salary_rate')
        .in('position_id', pidListForSalary)
        .limit(10000);
      if (salaryErr) return { data: null, error: normalizeError(salaryErr, 'fetchProjectTeam:salaryRows') };
      const sums = {};
      (salaryRows || []).forEach(s => {
        const pid = String(s.position_id);
        const raw = s && s.salary_rate !== undefined && s.salary_rate !== null && s.salary_rate !== '' ? String(s.salary_rate) : '';
        const cleaned = raw.replace(/[^0-9.-]/g, '');
        const parsed = cleaned ? Number(cleaned) : 0;
        if (!sums[pid]) sums[pid] = 0;
        sums[pid] += Number.isFinite(parsed) ? parsed : 0;
      });
      Object.keys(sums).forEach(pid => {
        const total = sums[pid] || 0;
        positionCostMap[pid] = total > 0 ? +(total / 160) : null;
      });
    }

    // 4) compute members from empRows and ownerTaskMap
    const membersTmp = (empRows || []).map(e => {
      const nameTh = `${e.first_name_th || ''}`.trim() + (e.last_name_th ? ` ${e.last_name_th}` : '');
      const nameEn = `${e.first_name_en || ''}`.trim() + (e.last_name_en ? ` ${e.last_name_en}` : '');
      const label = (nameTh && nameTh.trim()) ? nameTh.trim() : (nameEn && nameEn.trim() ? nameEn.trim() : (e.employee_code || String(e.id)));

      const getSalaryNumber = (emp) => {
        if (!emp) return 0;
        const v = emp.salary_rate;
        if (v === null || v === undefined || v === '') return 0;
        const raw = String(v);
        const cleaned = raw.replace(/[^0-9.-]/g, '');
        const parsed = cleaned ? Number(cleaned) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const salaryNum = getSalaryNumber(e);
      const perPersonCost = salaryNum > 0 ? +(salaryNum / 160) : null;
      const ownerTasks = ownerTaskMap[String(e.id)] || [];

      const findNumeric = (task, keys) => {
        for (const k of keys) {
          const v = task[k];
          if (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v))) return Number(v);
        }
        return null;
      };

      const billingKeys = ['billing_rate', 'bill_rate', 'billing', 'rate', 'hourly_rate', 'price_per_hour', 'price_hour', 'bill_rate_baht'];
      const costKeys = ['cost_rate', 'cost_per_hour', 'cost', 'unit_cost', 'cost_hour'];
      const statusKeys = ['status', 'state', 'task_status'];

      let billingRate = null; let costRate = null; let allocationHours = null; let status = null;
      if (ownerTasks.length) {
        let allocSum = 0; let hasPlanned = false;
        for (const t of ownerTasks) {
          if (billingRate === null) billingRate = findNumeric(t, billingKeys);
          if (costRate === null) costRate = findNumeric(t, costKeys);
          const ph = t['planned_hours'];
          if (ph !== undefined && ph !== null && ph !== '' && !Number.isNaN(Number(ph))) {
            allocSum += Number(ph);
            hasPlanned = true;
          }
          if (!status) {
            for (const sk of statusKeys) {
              if (t[sk]) { status = t[sk]; break; }
            }
          }
        }
        allocationHours = hasPlanned ? allocSum : null;
      }

      return { id: e.id, label, position_id: e.position_id, billingRate, costRate, allocationHours, status, perPersonCost };
    });

    // 5) derive final cost and position labels
    const membersWithPosCost = membersTmp.map(m => {
      const posCost = m.position_id ? positionCostMap[String(m.position_id)] : null;
      const finalCost = (m.perPersonCost !== null && m.perPersonCost !== undefined) ? m.perPersonCost : (posCost !== null && posCost !== undefined ? posCost : m.costRate);
      return { ...m, costRate: finalCost };
    });

    // 6) Resolve position identifiers (employees may store codes/names) to canonical
    // position UUIDs, then load project-specific role rates from tpr_project_role_rates.
    const pidTokens = Array.from(new Set((membersWithPosCost || []).map(m => m.position_id).filter(Boolean))).map(String);

    const isUuid = (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
    const uuidTokens = pidTokens.filter(isUuid);
    const nonUuidTokens = pidTokens.filter(t => !isUuid(t));

    // Attempt to resolve non-UUID tokens by matching against positions' code/name fields
    let resolvedPositions = [];
    try {
      if (uuidTokens.length) {
        const { data: byId, error: byIdErr } = await supabase
          .from('positions')
          .select('id,position_code,position_name,position_name_eng')
          .in('id', uuidTokens)
          .limit(2000);
        if (!byIdErr && byId && byId.length) resolvedPositions = resolvedPositions.concat(byId);
      }
      if (nonUuidTokens.length) {
        const { data: byCode, error: byCodeErr } = await supabase
          .from('positions')
          .select('id,position_code,position_name,position_name_eng')
          .in('position_code', nonUuidTokens)
          .limit(2000);
        if (!byCodeErr && byCode && byCode.length) resolvedPositions = resolvedPositions.concat(byCode);

        const { data: byName, error: byNameErr } = await supabase
          .from('positions')
          .select('id,position_code,position_name,position_name_eng')
          .in('position_name', nonUuidTokens)
          .limit(2000);
        if (!byNameErr && byName && byName.length) resolvedPositions = resolvedPositions.concat(byName);

        const { data: byNameEng, error: byNameEngErr } = await supabase
          .from('positions')
          .select('id,position_code,position_name,position_name_eng')
          .in('position_name_eng', nonUuidTokens)
          .limit(2000);
        if (!byNameEngErr && byNameEng && byNameEng.length) resolvedPositions = resolvedPositions.concat(byNameEng);
      }
    } catch  {
      // ignore resolution errors; proceed with what we have
    }

    // Build lookup from token (id, code, name) -> canonical id
    const tokenToId = {};
    (resolvedPositions || []).forEach(p => {
      if (p.id) tokenToId[String(p.id)] = String(p.id);
      if (p.position_code) tokenToId[String(p.position_code)] = String(p.id);
      if (p.position_name) tokenToId[String(p.position_name)] = String(p.id);
      if (p.position_name_eng) tokenToId[String(p.position_name_eng)] = String(p.id);
    });
    

    // Normalized list of UUIDs to query project role rates
    const normalizedPidList = Array.from(new Set(pidTokens.map(t => tokenToId[t] || (isUuid(t) ? t : null)).filter(Boolean)));
    

    // Fetch project role rates by normalized position IDs; if none found, fall back to fetching all rates for the project
    let projectRoleRateMap = {};
    try {
      if (normalizedPidList.length > 0) {
        const { data: rrRows, error: rrErr } = await supabase
          .from('tpr_project_role_rates')
          .select('position_id,bill_rate,cost_rate')
          .eq('project_id', projectId)
          .in('position_id', normalizedPidList)
          .limit(2000);
        if (!rrErr && rrRows && rrRows.length) {
          projectRoleRateMap = (rrRows || []).reduce((acc, r) => {
            acc[String(r.position_id)] = { bill_rate: r.bill_rate ?? null, cost_rate: r.cost_rate ?? null };
            return acc;
          }, {});
          
        }
      }

      if (Object.keys(projectRoleRateMap).length === 0) {
        // broader fetch: all role rates for project
        const { data: allRrRows, error: allErr } = await supabase
          .from('tpr_project_role_rates')
          .select('position_id,bill_rate,cost_rate')
          .eq('project_id', projectId)
          .limit(2000);
        if (!allErr && allRrRows && allRrRows.length) {
          projectRoleRateMap = (allRrRows || []).reduce((acc, r) => {
            acc[String(r.position_id)] = { bill_rate: r.bill_rate ?? null, cost_rate: r.cost_rate ?? null };
            return acc;
          }, {});
          
        }
      }
    } catch  {
      // ignore errors; proceed with what we have
    }

    // Apply project role rates to members where task-level billingRate is missing/zero
    const membersAfterRates = (membersWithPosCost || []).map(m => {
      const rawPid = m.position_id ? String(m.position_id) : null;
      const canonicalPid = rawPid && tokenToId[rawPid] ? tokenToId[rawPid] : rawPid;

      // determine billingRate: prefer task-level > project role rate > null
      let billing = m.billingRate;
      if ((billing === null || billing === undefined || billing === 0) && canonicalPid) {
        const rr = projectRoleRateMap[String(canonicalPid)];
        if (rr && rr.bill_rate !== null && rr.bill_rate !== undefined) billing = rr.bill_rate;
      }

      // determine costRate: prefer task-level costRate > project role cost_rate > perPersonCost/positionCost
      let cost = m.costRate;
      if ((cost === null || cost === undefined) && canonicalPid) {
        const rr = projectRoleRateMap[String(canonicalPid)];
        if (rr && rr.cost_rate !== null && rr.cost_rate !== undefined) cost = rr.cost_rate;
      }
      if ((cost === null || cost === undefined) && m.perPersonCost !== null && m.perPersonCost !== undefined) cost = m.perPersonCost;

      return { ...m, billingRate: billing, costRate: cost };
    });

    // 7) load position labels (use resolvedPositions where possible)
    const pidList = Array.from(new Set((membersAfterRates || []).map(m => tokenToId[String(m.position_id)] || m.position_id).filter(Boolean))).filter(Boolean);
    let positionMap = {};
    if (pidList.length > 0) {
      const { data: posRows, error: posErr } = await supabase
        .from('positions')
        .select('id,position_name,position_name_eng')
        .in('id', pidList)
        .limit(2000);
      if (posErr) return { data: null, error: normalizeError(posErr, 'fetchProjectTeam:positions') };
      (posRows || []).forEach(p => { positionMap[String(p.id)] = (p.position_name || p.position_name_eng || ''); });
    }

    const members = (membersAfterRates || []).map(m => ({ ...m, position_label: positionMap[tokenToId[String(m.position_id)] || String(m.position_id)] || null }));
    return { data: members, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err, 'fetchProjectTeam') };
  }
}

// Convenience helpers for common patterns
export async function fetchWithSearch({
  table,
  searchColumn,
  term,
  select = "*",
  order = null,
  filters = [],
}) {
  const query = buildQuery({ table, select, filters, order }).ilike(searchColumn, `%${term}%`);
  const { data, error } = await query;
  return { data, error: normalizeError(error, `search:${table}`) };
}

export async function fetchEmployee(identifier) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let q = supabase
      .from('employees')
      .select('id,employee_code,position_id,position,first_name_th,last_name_th,nickname_th,current_address_email_1,current_address_email_2,current_address_email_3,timekeeping_exempt,image_url')
      .limit(1);

    if (isUuid) {
      q = q.eq('id', identifier);
    } else {
      // treat as email or code; try matching any of the email fields (case-insensitive)
      const val = identifier;
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      q = q.or(orCond);
    }

    const { data, error } = await q;
    if (error) return { data: null, error: normalizeError(error, 'fetchEmployee') };

    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) return { data: null, error: null };

    const name =
      row.nickname_th ||
      `${row.first_name_th || ''} ${row.last_name_th || ''}`.trim() ||
      row.employee_code ||
      row.email ||
      row.id;

    return { data: { id: row.id, displayName: name, row }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeDisplayName') };
  }
}

// Resolve an employee display name from either an email or UUID.
// Returns { data: { id, displayName, row }, error }
export async function fetchEmployeeDisplayName(identifier) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let q = supabase
      .from('employees')
      .select('id,employee_code,position_id,position,first_name_th,last_name_th,nickname_th,current_address_email_1,current_address_email_2,current_address_email_3, timekeeping_exempt')
      .limit(1);

    if (isUuid) {
      q = q.eq('id', identifier);
    } else {
      // treat as email or code; try matching any of the email fields (case-insensitive)
      const val = identifier;
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      q = q.or(orCond);
    }

    const { data, error } = await q;
    if (error) return { data: null, error: normalizeError(error, 'fetchEmployeeDisplayName') };

    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) return { data: null, error: null };

    const name =
      row.nickname_th ||
      `${row.first_name_th || ''} ${row.last_name_th || ''}`.trim() ||
      row.employee_code ||
      row.email ||
      row.id;

    return { data: { id: row.id, displayName: name, row }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeDisplayName') };
  }
}

// Resolve an employee image URL/path from UUID, email, or employee_code.
// Returns { data: { id, image_url, row }, error }
export async function fetchEmployeeImageUrl(identifier) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let q = supabase.from('employees').select('id,image_url,current_address_email_1,current_address_email_2,current_address_email_3,employee_code').limit(1);
    if (isUuid) {
      q = q.eq('id', identifier);
    } else {
      const val = String(identifier).trim();
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      q = q.or(orCond);
    }

    const { data, error } = await q;
    if (error) return { data: null, error: normalizeError(error, 'fetchEmployeeImageUrl') };

    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) return { data: null, error: null };

    return { data: { id: row.id, image_url: row.image_url || null, row }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeImageUrl') };
  }
}

// Resolve a position label from UUID, position_code, or name fragment.
// Returns { data: { id, label, row }, error }
export async function fetchPositionName(identifier) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let q = supabase.from('positions').select('id,position_code,position_name,position_name_eng').limit(1);
    if (isUuid) {
      q = q.eq('id', identifier);
    } else {
      const val = String(identifier).trim();
      const like = `%${val}%`;
      const orCond = [
        `position_code.eq.${val}`,
        `position_name.ilike.${like}`,
        `position_name_eng.ilike.${like}`,
      ].join(',');
      q = q.or(orCond);
    }

    const { data, error } = await q;
    if (error) return { data: null, error: normalizeError(error, 'fetchPositionName') };

    const row = Array.isArray(data) && data.length ? data[0] : null;
    if (!row) return { data: null, error: null };

    const label = row.position_name || row.position_name_eng || row.position_code || row.id;
    return { data: { id: row.id, label, row }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchPositionName') };
  }
}

// Fetch the shift schedule hours for an employee identified by UUID or email.
// Returns { data: { shift_schedule_id, segment_hours }, error }
export async function fetchEmployeeShiftHours({ identifier }) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let empQ = supabase.from('employees').select('id,shift_schedule_id').limit(1);
    if (isUuid) {
      empQ = empQ.eq('id', identifier);
    } else {
      const val = String(identifier).trim();
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      empQ = empQ.or(orCond);
    }

    const { data: empRows, error: empErr } = await empQ;
    if (empErr) return { data: null, error: normalizeError(empErr, 'fetchEmployeeShiftHours:employee') };
    const emp = Array.isArray(empRows) && empRows.length ? empRows[0] : null;
    if (!emp || !emp.shift_schedule_id) return { data: { shift_schedule_id: null, segment_hours: null }, error: null };

    const shiftId = emp.shift_schedule_id;
    const { data: shiftRow, error: shiftErr } = await supabase.from('shift_schedule').select('id,segment_hours').eq('id', shiftId).limit(1).single();
    if (shiftErr) return { data: null, error: normalizeError(shiftErr, 'fetchEmployeeShiftHours:shift') };

    return { data: { shift_schedule_id: shiftRow.id, segment_hours: shiftRow.segment_hours ?? null }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeShiftHours') };
  }
}

// Check whether an employee's shift schedule is linked to OT shift(s).
// Returns { data: { shift_schedule_id, linked_ot_shift_ids, linked_ot_shifts }, error }
export async function fetchEmployeeOtShifts({ identifier }) {
  if (!identifier) return { data: null, error: null };
  try {
    const isUuid = typeof identifier === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let empQ = supabase.from('employees').select('id,shift_schedule_id').limit(1);
    if (isUuid) {
      empQ = empQ.eq('id', identifier);
    } else {
      const val = String(identifier).trim();
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      empQ = empQ.or(orCond);
    }

    const { data: empRows, error: empErr } = await empQ;
    if (empErr) return { data: null, error: normalizeError(empErr, 'fetchEmployeeOtShifts:employee') };
    const emp = Array.isArray(empRows) && empRows.length ? empRows[0] : null;
    if (!emp || !emp.shift_schedule_id) return { data: { shift_schedule_id: null, linked_ot_shift_ids: null, linked_ot_shifts: [] }, error: null };

    const shiftId = emp.shift_schedule_id;
    const { data: shiftRow, error: shiftErr } = await supabase
      .from('shift_schedule')
      .select('id,linked_ot_shift_ids')
      .eq('id', shiftId)
      .limit(1)
      .single();
    if (shiftErr) return { data: null, error: normalizeError(shiftErr, 'fetchEmployeeOtShifts:shift') };

    let linked = shiftRow && shiftRow.linked_ot_shift_ids ? shiftRow.linked_ot_shift_ids : null;
    // Ensure linked is an array of ids if possible
    if (typeof linked === 'string') {
      try {
        linked = JSON.parse(linked);
      } catch {
        // leave as-is
      }
    }

    if (!linked || !Array.isArray(linked) || linked.length === 0) {
      return { data: { shift_schedule_id: shiftRow.id, linked_ot_shift_ids: linked, linked_ot_shifts: [] }, error: null };
    }

    // fetch linked shift rows
    const ids = Array.from(new Set(linked.map(String)));
    const { data: linkedRows, error: linkedErr } = await supabase
      .from('shift_schedule')
      .select('id,shift_name,shift_code,ot_type,first_in_time,first_out_time,segment_hours')
      .in('id', ids)
      .limit(200);
    if (linkedErr) return { data: null, error: normalizeError(linkedErr, 'fetchEmployeeOtShifts:linked') };

    return { data: { shift_schedule_id: shiftRow.id, linked_ot_shift_ids: linked, linked_ot_shifts: linkedRows || [] }, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeOtShifts') };
  }
}

// Return the working hours for morning and afternoon segments for an employee's linked shift.
// Tries to use `segment_hours` if present (array like [4,4]), otherwise computes from
// time fields (first_in_time/first_out_time and second_in_time/second_out_time).
// Returns { data: { shift_schedule_id, morning_hours, afternoon_hours, total_hours, segment_hours }, error }
export async function fetchEmployeeShiftSegmentsHours({ identifier }) {
  if (!identifier) return { data: null, error: null };

  try {
    const isUuid =
      typeof identifier === 'string' &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

    let empQ = supabase.from('employees').select('id,shift_schedule_id').limit(1);

    if (isUuid) {
      empQ = empQ.eq('id', identifier);
    } else {
      const val = String(identifier).trim();
      const like = `%${val}%`;
      const orCond = [
        `current_address_email_1.ilike.${like}`,
        `current_address_email_2.ilike.${like}`,
        `current_address_email_3.ilike.${like}`,
        `employee_code.eq.${val}`,
      ].join(',');
      empQ = empQ.or(orCond);
    }

    const { data: empRows, error: empErr } = await empQ;
    if (empErr) return { data: null, error: normalizeError(empErr, 'fetchEmployeeShiftSegmentsHours:employee') };

    const emp = Array.isArray(empRows) && empRows.length ? empRows[0] : null;
    if (!emp?.shift_schedule_id) {
      return {
        data: { shift_schedule_id: null, morning_hours: null, afternoon_hours: null, total_hours: null },
        error: null,
      };
    }

    const { data: shiftRow, error: shiftErr } = await supabase
      .from('shift_schedule')
      .select(`
        id,
        shift_type,
        total_hours,
        first_in_time, first_out_time,
        first_break_start, first_break_end,
        first_in_day, first_out_day,
        first_break_start_day, first_break_end_day
      `)
      .eq('id', emp.shift_schedule_id)
      .single();

    if (shiftErr) return { data: null, error: normalizeError(shiftErr, 'fetchEmployeeShiftSegmentsHours:shift') };

    // ---- helpers
    const dayFlagToOffset = (flag) => (flag === 'next' ? 24 * 60 : 0); // schema: same/next
    const parseTimeToMinutes = (t, dayFlag = 'same') => {
      if (!t) return null;
      // Supabase may return "08:30:00" or "08:30"
      const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      return hh * 60 + mm + dayFlagToOffset(dayFlag);
    };
    const diffHours = (a, b) => {
      if (a == null || b == null) return null;
      let mins = b - a;
      if (mins < 0) mins += 24 * 60; // กันกรณีข้ามวันแบบง่าย
      return Math.round((mins / 60) * 100) / 100;
    };

    // ---- pick segment boundaries
    const inMin = parseTimeToMinutes(shiftRow.first_in_time, shiftRow.first_in_day || 'same');
    const outMin = parseTimeToMinutes(shiftRow.first_out_time, shiftRow.first_out_day || 'same');
    const brStartMin = parseTimeToMinutes(shiftRow.first_break_start, shiftRow.first_break_start_day || 'same');
    const brEndMin = parseTimeToMinutes(shiftRow.first_break_end, shiftRow.first_break_end_day || 'same');

    let morning = null;
    let afternoon = null;

    // ✅ กรณีมีพักครบ: เช้า = in -> break_start, บ่าย = break_end -> out
    if (inMin != null && outMin != null && brStartMin != null && brEndMin != null) {
      morning = diffHours(inMin, brStartMin);
      afternoon = diffHours(brEndMin, outMin);

    // ✅ ไม่มีพัก: ถือว่าเช้า/บ่าย “แบ่งครึ่งตาม total_hours” (fallback)
    } else if (inMin != null && outMin != null) {
      const total = diffHours(inMin, outMin);
      const totalHoursRaw = shiftRow.total_hours != null ? Number(shiftRow.total_hours) : null;
      const useTotal = totalHoursRaw && totalHoursRaw > 0 ? totalHoursRaw : total;

      // แบ่งครึ่งเท่ากันเป็น fallback (คุณจะได้ไม่ null)
      if (useTotal != null) {
        morning = Math.round((useTotal / 2) * 100) / 100;
        afternoon = Math.round((useTotal - morning) * 100) / 100;
      }
    }

    const totalHours = (typeof morning === 'number' ? morning : 0) + (typeof afternoon === 'number' ? afternoon : 0);

    return {
      data: {
        shift_schedule_id: shiftRow.id,
        morning_hours: morning,
        afternoon_hours: afternoon,
        total_hours: totalHours,
        // ส่งเวลากลับไปด้วย เผื่อ UI อยากโชว์ช่วงเวลา
        segment_time: {
          morning: shiftRow.first_in_time && shiftRow.first_break_start ? `${shiftRow.first_in_time}–${shiftRow.first_break_start}` : null,
          afternoon: shiftRow.first_break_end && shiftRow.first_out_time ? `${shiftRow.first_break_end}–${shiftRow.first_out_time}` : null,
        },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchEmployeeShiftSegmentsHours') };
  }
}


// Example usage:
// import { fetchPage, fetchById, insert } from "../api/supabaseData";
// const employees = await fetchPage({ table: "employees", page: 1, pageSize: 20, order: { column: "created_at", ascending: false } });
// const employee = await fetchById({ table: "employees", id: someId });
// const created = await insert({ table: "employees", payload: { name: "John" } });

// Fetch all projects (useful for selectors/lists). Returns { data, error }.
// Options:
// - includeArchived: boolean (default false) to include archived projects
// - orderBy: { column, ascending } default { column: 'project_code', ascending: true }
// - limit: integer (default 2000)
export async function fetchAllProjects({ includeArchived = false, orderBy = { column: 'project_code', ascending: true }, limit = 2000 } = {}) {
  try {
    let q = supabase
      .from('tpr_projects')
      .select('id,project_code,name_th,name_en,description,customer_id,customer_code,customer_name,start_date,end_date,manager_id,principal_id,contract_type,budget,status,progress,tags,archived,parent_project_id,image_path,created_at,updated_at')
      .order(orderBy.column || 'project_code', { ascending: Boolean(orderBy.ascending) })
      .limit(limit || 2000);

    if (!includeArchived) {
      // filter to non-archived and not deleted
      q = q.eq('archived', false).eq('deleted', false);
    }

    const { data, error } = await q;
    return { data, error: normalizeError(error, 'fetchAllProjects') };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchAllProjects') };
  }
}

/* =======================================================================================
 * ✅ TIME / WINDOW HELPERS (กลาง)
 * ======================================================================================= */

export function hmToMinutes(hm) {
  if (!hm) return 0;
  const parts = String(hm).split(':').map((s) => parseInt(s, 10));
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

export function getNowBangkokHM() {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  });
}

export function isTimeInWindowBangkok(startHM, endHM, nowHM = null) {
  try {
    const hm = nowHM || getNowBangkokHM();
    const nm = hmToMinutes(hm);
    const s = hmToMinutes(startHM);
    const e = hmToMinutes(endHM);
    return nm >= s && nm <= e;
  } catch {
    return false;
  }
}

/* =======================================================================================
 * ✅ HOLIDAY HELPERS (กลาง)
 * ======================================================================================= */

export function isWeekendBangkok(date = new Date()) {
  try {
    const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Bangkok' });
    return weekday === 'Saturday' || weekday === 'Sunday';
  } catch {
    return false;
  }
}

export async function fetchIsCalendarHoliday(workDateISO) {
  if (!workDateISO) return { data: false, error: null };
  try {
    const { data, error } = await supabase
      .from('calendar_assignments')
      .select('day_type')
      .eq('assigned_date', workDateISO)
      .limit(1)
      .maybeSingle();

    if (error) return { data: false, error: normalizeError(error, 'fetchIsCalendarHoliday') };
    const isHoliday = !!(data && data.day_type && data.day_type !== 'work');
    return { data: isHoliday, error: null };
  } catch (e) {
    return { data: false, error: normalizeError(e, 'fetchIsCalendarHoliday') };
  }
}

/* =======================================================================================
 * ✅ ATTENDANCE FETCH HELPERS (กลาง)
 * ======================================================================================= */

export async function fetchAttendanceToday({ employeeId, workDateISO }) {
  if (!employeeId || !workDateISO) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('tpr_attendance_daily')
      .select('*')
      .eq('user_id', employeeId)
      .eq('work_date', workDateISO)
      .maybeSingle();

    if (error) return { data: null, error: normalizeError(error, 'fetchAttendanceToday') };
    return { data: data || null, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, 'fetchAttendanceToday') };
  }
}

export async function fetchAttendanceHistory({ employeeId, endISO, days = 7 }) {
  if (!employeeId || !endISO) return { data: [], error: null };
  try {
    const end = new Date(`${endISO}T00:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - Math.max(1, Number(days) || 7) + 1);

    const startISO = getBangkokDateISO(start);
    const { data, error } = await supabase
      .from('tpr_attendance_daily')
      .select('*')
      .eq('user_id', employeeId)
      .gte('work_date', startISO)
      .lte('work_date', endISO)
      .order('work_date', { ascending: false });

    if (error) return { data: [], error: normalizeError(error, 'fetchAttendanceHistory') };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: normalizeError(e, 'fetchAttendanceHistory') };
  }
}

/* =======================================================================================
 * ✅ STATUS FORMATTERS (กลาง)
 * ======================================================================================= */

export function getAttendanceStatusLabel(row, todayISO = null) {
  if (!row) return '—';

  if (row.day_status === 'HOLIDAY') return 'วันหยุด';
  if (row.day_status === 'LEAVE') return 'ลา';
  if (row.day_status === 'OFF') return 'ไม่ปฏิบัติงาน';

  const hasIn = !!row.clock_in_at;
  const hasOut = !!row.clock_out_at;

  if (!hasIn) return 'ยังไม่เข้างาน';

  if (hasIn && !hasOut) {
    try {
      const tISO = todayISO || getBangkokDateISO(new Date());
      if (row.work_date && row.work_date < tISO) return 'ลืมลงเวลา';
    } catch {
      // ignore
    }
    return 'กำลังทำงาน';
  }

  if (hasOut) return 'เลิกงานแล้ว';
  if (row.daily_status === 'CLOSED') return 'เลิกงานแล้ว';

  return '—';
}

export function getAttendanceStatusSeverity(row, todayISO = null) {
  if (!row) return 'text.secondary';

  if (row.day_status === 'HOLIDAY' || row.day_status === 'LEAVE' || row.day_status === 'OFF') return 'info';

  const hasIn = !!row.clock_in_at;
  const hasOut = !!row.clock_out_at;

  if (!hasIn) return 'info';

  if (hasIn && !hasOut) {
    try {
      const tISO = todayISO || getBangkokDateISO(new Date());
      if (row.work_date && row.work_date < tISO) return 'warning';
    } catch {
      // ignore
    }
    return 'info';
  }

  if (hasOut) return 'success';
  if (row.daily_status === 'CLOSED') return 'success';

  return 'text.secondary';
}

/* =======================================================================================
 * ✅ RPC ERROR MAPPER (กลาง)
 * ======================================================================================= */

export function mapAttendanceRpcErrorToThai(msg, windows = null) {
  const w = windows || {
    CLOCKIN_START: '05:00',
    CLOCKIN_END: '12:00',
    CLOCKOUT_START: '12:00',
    CLOCKOUT_END: '23:59',
  };

  if (!msg) return { message: null, severity: 'error' };

  if (String(msg).startsWith('CLOCK_IN_NOT_ALLOWED_WINDOW')) {
    return { message: `ไม่สามารถลงเวลาเข้าในช่วงเวลานี้ได้ (อนุญาต ${w.CLOCKIN_START}–${w.CLOCKIN_END})`, severity: 'info' };
  }
  if (String(msg).startsWith('CLOCK_OUT_NOT_ALLOWED_WINDOW')) {
    return { message: `ไม่สามารถลงเวลาออกในช่วงเวลานี้ได้ (อนุญาต ${w.CLOCKOUT_START}–${w.CLOCKOUT_END})`, severity: 'info' };
  }
  if (String(msg).startsWith('CLOCK_OUT_BEFORE_CLOCK_IN') || String(msg).startsWith('NO_CLOCK_IN')) {
    return { message: 'ไม่สามารถลงเวลาออกก่อนลงเวลาเข้าได้', severity: 'warning' };
  }
  if (String(msg).startsWith('ALREADY_CLOCKED_IN')) {
    return { message: 'ท่านได้ลงเวลาเข้าแล้ว', severity: 'info' };
  }
  if (String(msg).startsWith('ALREADY_CLOSED') || String(msg).startsWith('ALREADY_CLOSED_OR_CLOCKED_OUT')) {
    return { message: 'วันทำงานถูกปิดแล้ว', severity: 'info' };
  }
  if (String(msg).startsWith('NO_DAILY_RECORD')) {
    return { message: 'ไม่พบรายการการลงเวลาของวันนี้', severity: 'warning' };
  }

  return { message: String(msg), severity: 'error' };
}

/* =======================================================================================
 * ✅ GEOLOCATION / GEOFENCE HELPERS (กลาง) — ใช้ได้ทุกหน้า
 * ======================================================================================= */

export function isGeolocationSupported() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

// (optional) อ่าน permission ถ้ารองรับ Permissions API
export async function queryGeolocationPermission() {
  try {
    if (!isGeolocationSupported()) return { data: 'denied', error: null };
    if (!navigator.permissions?.query) return { data: 'unknown', error: null };
    const p = await navigator.permissions.query({ name: 'geolocation' });
    const state = p?.state || 'unknown'; // 'granted'|'denied'|'prompt'
    return { data: state, error: null };
  } catch (e) {
    return { data: 'unknown', error: normalizeError(e, 'queryGeolocationPermission') };
  }
}

// ✅ บังคับ GPS ใหม่ทุกครั้ง: maximumAge = 0
export async function getFreshCurrentPosition(opts = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
  } = opts;

  if (!isGeolocationSupported()) {
    return { ok: false, code: 'NO_GEO', message: 'อุปกรณ์/เบราว์เซอร์ไม่รองรับ Location' };
  }

  const res = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, pos: p }),
      (err) => resolve({ ok: false, err }),
      { enableHighAccuracy, timeout, maximumAge } // ✅ maximumAge = 0 บังคับใหม่
    );
  });

  if (!res.ok) {
    const code = res.err?.code;
    const msg =
      code === 1
        ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง (กรุณาอนุญาต Location)'
        : code === 2
        ? 'ไม่สามารถระบุตำแหน่งได้'
        : code === 3
        ? 'หมดเวลารอ GPS'
        : 'ไม่สามารถอ่านพิกัด GPS ได้';

    return { ok: false, code: 'GEO_FAIL', message: msg, raw: res.err || null };
  }

  const lat = Number(res.pos.coords.latitude);
  const lng = Number(res.pos.coords.longitude);
  const accuracy = Number(res.pos.coords.accuracy);

  const coords = { lat, lng, accuracy, at: new Date().toISOString() };
  return { ok: true, coords };
}

export async function checkMobileGeofence(coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    return { ok: false, code: 'NO_COORDS', message: 'ไม่มีพิกัดสำหรับตรวจสอบพื้นที่' };
  }

  try {
    const { data, error } = await supabase.rpc('tpr_check_mobile_geofence', {
      p_lat: coords.lat,
      p_lng: coords.lng,
    });

    if (error) {
      const msg = error.message || 'ตรวจสอบพื้นที่ลงเวลาไม่สำเร็จ';
      return { ok: false, code: 'RPC_FAIL', message: msg, error };
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || typeof row.ok !== 'boolean') {
      return { ok: false, code: 'BAD_RESULT', message: 'ผลตรวจสอบพื้นที่ไม่ถูกต้อง', row: row || null };
    }

    if (row.ok !== true) {
      const name = row.geofence_name ? ` (${row.geofence_name})` : '';
      return { ok: false, code: 'OUTSIDE', message: `ไม่อยู่ในพื้นที่ลงเวลาที่อนุญาต${name}`, row };
    }

    return { ok: true, row };
  } catch (e) {
    return { ok: false, code: 'EXCEPTION', message: e?.message || 'ตรวจสอบพื้นที่ลงเวลาไม่สำเร็จ', error: e };
  }
}

// รวม: บังคับ GPS ใหม่ + เช็ค geofence ใหม่ + คืน payload ที่พร้อมส่งไป RPC
export async function ensureFreshGeoOk({ exempt = false } = {}) {
  if (exempt) return { ok: true, coords: null, geofence: null };

  if (!isGeolocationSupported()) {
    return { ok: false, message: 'อุปกรณ์/เบราว์เซอร์ไม่รองรับ Location' };
  }

  const gp = await getFreshCurrentPosition();
  if (!gp.ok) return { ok: false, message: gp.message };

  const ge = await checkMobileGeofence(gp.coords);
  if (!ge.ok) return { ok: false, message: ge.message, coords: gp.coords, geofence: ge.row || null };

  return { ok: true, coords: gp.coords, geofence: ge.row };
}

// สร้าง params audit สำหรับ RPC (in/out)
export function buildAttendanceAuditParams({ action, coords, geofenceRow }) {
  const c = coords || null;
  const g = geofenceRow || null;

  if (action === 'in') {
    return {
      p_lat: c?.lat ?? null,
      p_lng: c?.lng ?? null,
      p_accuracy_m: c?.accuracy ?? null,
      p_geofence_id: g?.geofence_id ?? null,
      p_distance_m: g?.distance_m ?? null,
      p_geofence_ok: g?.ok ?? null,
    };
  }

  // action === 'out'
  return {
    p_lat: c?.lat ?? null,
    p_lng: c?.lng ?? null,
    p_accuracy_m: c?.accuracy ?? null,
    p_distance_m: g?.distance_m ?? null,
    p_geofence_ok: g?.ok ?? null,
  };
}

/* =======================================================================================
 * ✅ (ของเดิมต่อได้เลย) Project-specific helpers / employee helpers / etc...
 * ======================================================================================= */
// ... your existing functions below ...


export async function fetchRandomQuote() {
  try {
    const { data, error } = await supabase.rpc("get_random_quote");

    if (error) {
      return { data: null, error: normalizeError(error, "fetchRandomQuote") };
    }

    // data จะเป็น array เสมอใน rpc
    const quote = Array.isArray(data) && data.length ? data[0] : null;

    return { data: quote, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e, "fetchRandomQuote") };
  }
}
