import { supabase } from '@/lib/supabaseClient'

// Table name constant
const TABLE = 'tpr_project_automation_settings'

// ruleKeys should align with AutomationPresetView keys
// 'DONE_MOVE' | 'DUE_BEFORE_1D' | 'OVERDUE_NOTIFY'

export async function getAutomationSettings(projectId) {
  if (!projectId) return { data: [], error: new Error('Missing projectId') }
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId)
  return { data: data || [], error }
}

export async function upsertAutomationSetting(projectId, ruleKey, enabled, config = null) {
  if (!projectId) return { data: null, error: new Error('Missing projectId') }
  if (!ruleKey) return { data: null, error: new Error('Missing ruleKey') }

  const row = {
    project_id: projectId,
    rule_key: ruleKey,
    enabled: !!enabled,
    config: config,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: 'project_id,rule_key' })
    .select()
    .single()

  return { data, error }
}
