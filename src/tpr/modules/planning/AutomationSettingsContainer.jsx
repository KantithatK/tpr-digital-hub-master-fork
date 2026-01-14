import * as React from 'react'
import AutomationPresetView from './AutomationPresetView'
import { getAutomationSettings, upsertAutomationSetting } from '@/api/automationSettings'

// Map DB rows -> initialEnabled map for the preset view
function rowsToEnabledMap(rows) {
  const map = {}
  for (const r of rows || []) {
    if (r && r.rule_key) map[r.rule_key] = !!r.enabled
  }
  return map
}

export default function AutomationSettingsContainer({ projectId }) {
  const [loading, setLoading] = React.useState(false)
  const [savingKey, setSavingKey] = React.useState(null)
  const [initialEnabled, setInitialEnabled] = React.useState({})
  const [error, setError] = React.useState(null)

  const load = React.useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    const { data, error } = await getAutomationSettings(projectId)
    if (error) setError(error.message || 'โหลดการตั้งค่าล้มเหลว')
    setInitialEnabled(rowsToEnabledMap(data))
    setLoading(false)
  }, [projectId])

  React.useEffect(() => { load() }, [load])

  const handleToggle = async (ruleKey, enabled) => {
    setSavingKey(ruleKey)
    const { error } = await upsertAutomationSetting(projectId, ruleKey, enabled)
    if (error) setError(error.message || 'บันทึกการตั้งค่าล้มเหลว')
    setSavingKey(null)
  }

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 8, color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}
      <AutomationPresetView
        includeOverdueRule={true}
        initialEnabled={initialEnabled}
        onToggle={handleToggle}
        savingKey={savingKey}
      />
    </div>
  )
}
