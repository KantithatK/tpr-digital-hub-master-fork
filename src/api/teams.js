import { supabase } from '@/lib/supabaseClient';

export async function listTeams() {
  try {
    const { data, error } = await supabase
      .from('tpr_project_teams')
      .select(`*, department:department_id(id, name)`)
      .order('team_code', { ascending: true });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createTeam(payload) {
  try {
    const { data, error } = await supabase
      .from('tpr_project_teams')
      .insert([payload])
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateTeam(id, payload) {
  try {
    const { data, error } = await supabase
      .from('tpr_project_teams')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deactivateTeam(id) {
  try {
    const { data, error } = await supabase
      .from('tpr_project_teams')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}
