import { supabase } from '@/lib/supabaseClient';

// Helpers return { data, error }
export async function listWorkstreams(projectId) {
  if (!projectId) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('tpr_workstreams')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
}

export async function createWorkstream(payload) {
  try {
    const { data, error } = await supabase
      .from('tpr_workstreams')
      .insert(payload)
      .select('*')
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateWorkstream(id, payload) {
  try {
    const { data, error } = await supabase
      .from('tpr_workstreams')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteWorkstream(id) {
  try {
    const { error } = await supabase
      .from('tpr_workstreams')
      .delete()
      .eq('id', id);
    return { data: true, error };
  } catch (error) {
    return { data: false, error };
  }
}

// WBS by workstream
export async function listPhasesByWorkstream(workstreamId) {
  if (!workstreamId) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('tpr_project_wbs_phases')
      .select('id, code, name, planned_hours, fee, owner, start_date, end_date, status, note, workstream_id')
      .eq('workstream_id', workstreamId)
      .order('code', { ascending: true });
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listTasksByWorkstream(workstreamId) {
  if (!workstreamId) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('tpr_project_wbs_tasks')
      .select('id, code, name, phase_id, planned_hours, owner, workstream_id')
      .eq('workstream_id', workstreamId)
      .order('code', { ascending: true });
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
}

export async function createPhaseForWorkstream(workstreamId, payload) {
  try {
    const base = { ...payload, workstream_id: workstreamId };
    const { data, error } = await supabase
      .from('tpr_project_wbs_phases')
      .insert(base)
      .select('id')
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createTaskForWorkstream(workstreamId, payload) {
  try {
    const base = { ...payload, workstream_id: workstreamId };
    const { data, error } = await supabase
      .from('tpr_project_wbs_tasks')
      .insert(base)
      .select('id')
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
