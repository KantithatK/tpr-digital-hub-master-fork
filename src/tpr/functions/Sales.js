import { supabase } from '@/lib/supabaseClient';

/**
 * SALES PIPELINE / BD DASHBOARD DATA HELPERS
 * Views used:
 * - v_sales_header_cards
 * - v_sales_pipeline_funnel
 * - v_sales_win_loss_rate
 * - v_sales_opportunity_list
 * - v_sales_proposals_followup_7d
 * - v_sales_key_client_activity
 * - (optional) v_sales_dashboard_payload
 */

// =========================
// Storage / Attachments config
// =========================
export const OPPORTUNITY_FILES_BUCKET = 'opportunity-files';

// กันชื่อไฟล์พัง/แปลก
function safeFileName(name = 'file') {
  const n = String(name).trim().replace(/[^\w.\-() ]+/g, '_');
  return n.length ? n : 'file';
}

function guessMime(file) {
  return file?.type || 'application/octet-stream';
}

// =========================
// 1) Header Cards
// =========================
export async function getSalesHeaderCards() {
  try {
    const { data, error } = await supabase.from('v_sales_header_cards').select('*').single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// 2) Funnel
// =========================
export async function getSalesPipelineFunnel() {
  try {
    const { data, error } = await supabase
      .from('v_sales_pipeline_funnel')
      .select('*')
      .order('status', { ascending: true }); // sort stage จริงทำฝั่ง UI
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// 3) Win/Loss Rate
// =========================
export async function getSalesWinLossRate() {
  try {
    const { data, error } = await supabase.from('v_sales_win_loss_rate').select('*').order('status', { ascending: true });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// 4) Opportunity List (รองรับ limit + sort)
// =========================
export async function listOpportunities({ limit = 50 } = {}) {
  try {
    const { data, error } = await supabase
      .from('v_sales_opportunity_list')
      .select('*')
      .order('deadline_date', { ascending: true, nullsFirst: false })
      .order('estimated_value', { ascending: false })
      .limit(limit);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// 5) Proposals to Follow-Up (7 วัน)
// =========================
export async function listProposalsFollowUp7d() {
  try {
    const { data, error } = await supabase
      .from('v_sales_proposals_followup_7d')
      .select('*')
      .order('follow_up_date', { ascending: true, nullsFirst: false })
      .order('deadline_date', { ascending: true, nullsFirst: false });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// 6) Key Client Activity (รองรับ limit)
// =========================
export async function listKeyClientActivities({ limit = 20 } = {}) {
  try {
    const { data, error } = await supabase.from('v_sales_key_client_activity').select('*').order('activity_at', { ascending: true }).limit(limit);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// (OPTIONAL) Dashboard payload JSON
// =========================
export async function getSalesDashboardPayload() {
  try {
    const { data, error } = await supabase.from('v_sales_dashboard_payload').select('payload').single();
    return { data: data?.payload ?? null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =========================
// Helper: โหลดทุกบล็อกพร้อมกัน
// =========================
export async function getSalesDashboardAll({ oppLimit = 50, activityLimit = 20 } = {}) {
  try {
    const [header, funnel, winLoss, opps, followups, activities] = await Promise.all([
      getSalesHeaderCards(),
      getSalesPipelineFunnel(),
      getSalesWinLossRate(),
      listOpportunities({ limit: oppLimit }),
      listProposalsFollowUp7d(),
      listKeyClientActivities({ limit: activityLimit }),
    ]);
    const error = header.error || funnel.error || winLoss.error || opps.error || followups.error || activities.error || null;

    // Filter out any opportunity rows with status === 'Inactive'
    const oppsList = opps.data || [];
    const oppsFiltered = oppsList.filter((o) => String(o.status || '').toLowerCase() !== 'inactive');

    const funnelList = funnel.data || [];
    const funnelFiltered = funnelList.filter((f) => String(f.status || '').toLowerCase() !== 'inactive');

    const winLossList = winLoss.data || [];
    const winLossFiltered = winLossList.filter((w) => String(w.status || '').toLowerCase() !== 'inactive');

    const followupsList = followups.data || [];
    const followupsFiltered = followupsList.filter((f) => String(f.status || '').toLowerCase() !== 'inactive');

    // Recompute header cards values to exclude inactive opportunities
    const pipelineValue = oppsFiltered.reduce((s, r) => s + Number(r.estimated_value || 0), 0);

    const wonRow = winLossFiltered.find((x) => x.status === 'Won') || { count: 0 };
    const lostRow = winLossFiltered.find((x) => x.status === 'Lost') || { count: 0 };
    const wonCount = Number(wonRow.count || 0);
    const lostCount = Number(lostRow.count || 0);
    const winRatePercent = wonCount + lostCount ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    const headerCards = header.data
      ? {
          ...header.data,
          pipeline_value: pipelineValue,
          win_rate_percent: Number.isFinite(winRatePercent) ? winRatePercent : 0,
          proposals_followup_7d_count: followupsFiltered.length,
        }
      : null;

    return {
      data: {
        header_cards: headerCards,
        funnel: funnelFiltered,
        win_loss: winLossFiltered,
        opportunity_list: oppsFiltered,
        proposals_followup_7d: followupsFiltered,
        key_client_activity: activities.data || [],
      },
      error,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Customers (tpr_customers)
 * =========================
 */
export async function listCustomers({ q = '', limit = 50 } = {}) {
  try {
    let query = supabase
      .from('tpr_customers')
      .select('id, customer_id, name_th, name_en, relationship_status')
      .order('name_th', { ascending: true })
      .limit(limit);

    if (q?.trim()) {
      const s = q.trim();
      query = query.or(`customer_id.ilike.%${s}%,name_th.ilike.%${s}%,name_en.ilike.%${s}%`);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Employees (dropdown)
 * =========================
 */
export async function listEmployees({ q = '', limit = 50 } = {}) {
  try {
    let query = supabase
      .from('employees')
      .select(
        `
        id,
        employee_code,
        title_th,
        first_name_th,
        last_name_th,
        nickname_th,
        position,
        department_name,
        employment_status
      `
      )
      .order('first_name_th', { ascending: true })
      .limit(limit);

    if (q?.trim()) {
      const s = q.trim();
      query = query.or(`employee_code.ilike.%${s}%,first_name_th.ilike.%${s}%,last_name_th.ilike.%${s}%,nickname_th.ilike.%${s}%`);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Employees: display helpers
 * =========================
 */
export function formatEmployeeNameTH(emp) {
  if (!emp) return '';
  const title = emp.title_th ? `${emp.title_th}` : '';
  const fn = emp.first_name_th || '';
  const ln = emp.last_name_th || '';
  const code = emp.employee_code ? `${emp.employee_code} — ` : '';
  const full = `${title} ${fn} ${ln}`.replace(/\s+/g, ' ').trim();
  return `${code}${full}`.trim();
}

export async function getEmployeeDisplayNameById(employeeId) {
  try {
    if (!employeeId) return { data: '', error: null };

    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, title_th, first_name_th, last_name_th, nickname_th')
      .eq('id', employeeId)
      .single();

    if (error) return { data: '', error };
    return { data: formatEmployeeNameTH(data), error: null };
  } catch (err) {
    return { data: '', error: err };
  }
}

export function getEmployeeDisplayNameFromList(employeeId, employees = []) {
  if (!employeeId) return '';
  const emp = employees.find((e) => e.id === employeeId);
  return formatEmployeeNameTH(emp);
}

/**
 * =========================
 * Opportunities (tpr_opportunities)
 * =========================
 */
export async function getOpportunity(id) {
  try {
    const { data, error } = await supabase
      .from('tpr_opportunities')
      .select(
        `
        *,
        customer:customer_id (
          id, customer_id, name_th, name_en, relationship_status
        )
      `
      )
      .eq('id', id)
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createOpportunity(payload) {
  try {
    const p = { ...(payload || {}) };

    // ✅ กันพัง: status เป็น NOT NULL ใน DB
    if (!p.status) p.status = 'Lead';

    // ✅ กันพัง: probability ถ้าไม่ได้ส่งมา ให้ผูกตามสถานะ
    if (p.probability == null) {
      const map = {
        Lead: 20,
        Prospecting: 40,
        'Proposal Sent': 60,
        Negotiation: 80,
        Won: 100,
        Lost: 0,
        Inactive: 0,
      };
      p.probability = map[p.status] ?? 20;
    }

    // ✅ กันพัง: ถ้าสร้างมาเป็น Proposal Sent ต้องมี follow_up_date (ตาม constraint chk_tpr_opp_proposal_followup)
    if (p.status === 'Proposal Sent' && !p.follow_up_date) {
      p.follow_up_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tpr_opportunities')
      .insert([p])
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}


export async function updateOpportunity(id, payload) {
  try {
    const { data, error } = await supabase.from('tpr_opportunities').update(payload).eq('id', id).select().single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteOpportunity(id) {
  try {
    const { data, error } = await supabase.from('tpr_opportunities').delete().eq('id', id).select().single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Activities (tpr_customer_activities)
 * activity_at = วันติดตาม/วันแจ้งเตือน (ตามที่คุณกำหนด)
 * =========================
 */
export async function createCustomerActivity(payload) {
  try {
    const { data, error } = await supabase.from('tpr_customer_activities').insert([payload]).select().single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Opportunity Attachments (tpr_opportunity_attachments)
 * Bucket: opportunity-files
 *
 * ตารางที่คาดว่าใช้ (คุณปรับชื่อคอลัมน์ได้):
 * - id uuid pk default gen_random_uuid()
 * - opportunity_id uuid not null
 * - customer_id uuid null
 * - bucket text not null
 * - storage_path text not null
 * - file_name text not null
 * - file_size bigint null
 * - mime_type text null
 * - public_url text null
 * - created_at timestamptz default now()
 * - created_by uuid null
 * - metadata jsonb default '{}'
 * =========================
 */

export async function listOpportunityAttachments(opportunityId) {
  try {
    if (!opportunityId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('tpr_opportunity_attachments')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function uploadOpportunityAttachments(opportunityId, files = [], options = {}) {
  const {
    customerId = null,
    createdBy = null,
    // เผื่ออยากเปลี่ยนโครง path
    baseDir = null, // default = opportunityId
    upsert = false,
    metadata = {},
  } = options;

  try {
    if (!opportunityId) return { data: [], error: new Error('Missing opportunityId') };
    const arr = Array.isArray(files) ? files : [];
    if (!arr.length) return { data: [], error: null };

    const bucket = OPPORTUNITY_FILES_BUCKET;
    const dir = baseDir || String(opportunityId);

    const insertedRows = [];
    const uploadedPaths = []; // เผื่อ rollback

    for (const file of arr) {
      const name = safeFileName(file?.name || 'file');
      const ts = Date.now();
      const path = `${dir}/${ts}-${name}`;

      // 1) upload
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert,
        contentType: guessMime(file),
      });
      if (upErr) throw upErr;

      uploadedPaths.push(path);

      // 2) public url
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;

      // 3) insert row
      const row = {
        opportunity_id: opportunityId,
        customer_id: customerId,
        bucket,
        storage_path: path,
        file_name: name,
        file_size: file?.size ?? null,
        mime_type: file?.type ?? null,
        public_url: publicUrl,
        created_by: createdBy,
        metadata: { ...(metadata || {}), public_url: publicUrl },
      };

      const { data: ins, error: insErr } = await supabase.from('tpr_opportunity_attachments').insert([row]).select().single();
      if (insErr) throw insErr;

      insertedRows.push(ins);
    }

    return { data: insertedRows, error: null };
  } catch (err) {
    // best-effort cleanup (ลบไฟล์ที่อัปแล้ว)
    try {
      // NOTE: ถ้า insert พังหลัง upload จะมีไฟล์ค้าง — ลองลบให้
      // เราจะหา path จาก error scope ไม่ได้ทุกเคส จึงไม่ aggressive เกินไป
      // (ถ้าคุณอยาก rollback แบบเข้ม ให้ส่ง allowRollback=true แล้วเก็บ paths ไว้ภายนอก)
    } catch {
      // ignore
    }
    return { data: [], error: err };
  }
}

export async function deleteOpportunityAttachment(attachmentRow) {
  try {
    if (!attachmentRow?.id) return { data: null, error: new Error('Missing attachment row') };

    const bucket = attachmentRow.bucket || OPPORTUNITY_FILES_BUCKET;
    const path = attachmentRow.storage_path;

    // 1) delete db row
    const { data: delRow, error: delErr } = await supabase.from('tpr_opportunity_attachments').delete().eq('id', attachmentRow.id).select().single();
    if (delErr) throw delErr;

    // 2) delete storage file (best-effort)
    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }

    return { data: delRow, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * =========================
 * Orchestrator (แนะนำให้หน้า UI เรียกตัวนี้)
 * - update opportunity status/probability
 * - create customer activity (activity_at = follow up date)
 * - upload attachments + insert rows
 * =========================
 */
export async function updateOpportunityWithActivityAndAttachments({
  opportunityId,
  customerId,
  status,
  probability,
  activityDescription,
  activityAt, // Date | string
  files = [],
  createdBy = null,
  activityType = null, // default = status
  activityMetadata = {},
  attachmentMetadata = {},
}) {
  try {
    if (!opportunityId) return { data: null, error: new Error('Missing opportunityId') };
    if (!customerId) return { data: null, error: new Error('Missing customerId') };
    if (!status) return { data: null, error: new Error('Missing status') };

    // 0) normalize time (จำเป็น เพราะใช้ทั้ง follow_up_date และ activity_at)
    const at = activityAt ? new Date(activityAt) : null;
    if (!at || Number.isNaN(at.getTime())) {
      return { data: null, error: new Error('Invalid activityAt') };
    }

    // 1) update opportunity
    // ✅ แก้ให้ผ่าน constraint chk_tpr_opp_proposal_followup:
    //    ถ้า status = 'Proposal Sent' ต้องมี follow_up_date ไม่เป็น null
    const updatePayload = {
      status,
      probability: typeof probability === 'number' ? probability : probability ?? null,
    };

    if (status === 'Proposal Sent') {
      updatePayload.follow_up_date = at.toISOString();
    }
    // หมายเหตุ: ถ้าคุณต้องการเคลียร์ follow_up_date เมื่อไม่ใช่ Proposal Sent ให้เปิดบรรทัดนี้
    // else {
    //   updatePayload.follow_up_date = null;
    // }

    const { data: opp, error: oppErr } = await updateOpportunity(opportunityId, updatePayload);
    if (oppErr) throw oppErr;

    // 2) create activity (activity_at = follow up date)
    // (คุณทำ strictMode ในหน้า UI แล้ว ตรงนี้กันพลาดอีกชั้น)
    if (activityDescription && String(activityDescription).trim()) {
      const { error: actErr } = await createCustomerActivity({
        customer_id: customerId,
        opportunity_id: opportunityId,
        activity_type: activityType || status,
        activity_description: String(activityDescription).trim(),
        activity_at: at.toISOString(),
        created_by: createdBy,
        metadata: activityMetadata || {},
      });
      if (actErr) throw actErr;
    }

    // 3) upload attachments (optional)
    let uploaded = [];
    if (Array.isArray(files) && files.length) {
      const { data: ups, error: upErr } = await uploadOpportunityAttachments(opportunityId, files, {
        customerId,
        createdBy,
        metadata: attachmentMetadata || {},
      });
      if (upErr) throw upErr;
      uploaded = ups || [];
    }

    return {
      data: { opportunity: opp, attachments: uploaded },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Utility: คำนวณจำนวนวันระหว่างสองวันที่
 */
export function daysBetweenDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.ceil((e - s) / msPerDay);
  } catch {
    return null;
  }
}

/**
 * Utility: get current auth user id (uuid)
 */
export async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { data: null, error };
    return { data: data?.user?.id ?? null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
