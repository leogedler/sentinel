<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your account, integrations, and preferences.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="settings-grid">
      <!-- Account Section -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Account</h2>
        </div>
        <div class="settings-row">
          <div class="settings-label">Name</div>
          <div class="settings-value">{{ auth.user?.name }}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Email</div>
          <div class="settings-value">{{ auth.user?.email }}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Timezone</div>
          <div class="settings-value">
            <select v-model="form.timezone" class="form-select" style="max-width:260px">
              <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Windsor.ai Section -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Windsor.ai Integration</h2>
          <span v-if="settings?.hasWindsorKey" class="badge badge-success">Connected</span>
          <span v-else class="badge badge-neutral">Not connected</span>
        </div>
        <p class="settings-description">
          Windsor.ai aggregates your Facebook Ads data. Add your API key to enable campaign data fetching.
          <a href="https://windsor.ai" target="_blank" rel="noopener">Learn more &#8599;</a>
        </p>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label" for="windsor-key">Windsor.ai API Key</label>
          <div class="input-row">
            <input
              id="windsor-key"
              v-model="form.windsorApiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="form-input"
              :placeholder="settings?.hasWindsorKey ? '••••••••••••••••' : 'Enter your API key'"
            />
            <button type="button" class="btn btn-secondary btn-sm" @click="showApiKey = !showApiKey">
              {{ showApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <p class="form-hint">Your key is encrypted at rest with AES-256.</p>
        </div>
      </div>

      <!-- Slack Section -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Slack Integration</h2>
          <span v-if="auth.user?.slackWorkspaces?.length" class="badge badge-success">
            {{ auth.user.slackWorkspaces.length }} workspace{{ auth.user.slackWorkspaces.length > 1 ? 's' : '' }} connected
          </span>
          <span v-else class="badge badge-neutral">Not connected</span>
        </div>
        <p class="settings-description">
          Connect one or more Slack workspaces to enable the Sentinel bot and receive reports directly in your channels.
        </p>

        <!-- Connected workspaces list -->
        <div v-if="auth.user?.slackWorkspaces?.length" class="workspace-list">
          <div
            v-for="ws in auth.user.slackWorkspaces"
            :key="ws.teamId"
            class="workspace-row"
          >
            <div class="workspace-info">
              <svg width="16" height="16" viewBox="0 0 122.8 122.8" style="flex-shrink:0">
                <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/>
                <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"/>
                <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/>
                <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/>
              </svg>
              <span class="workspace-name">{{ ws.teamName }}</span>
              <span class="workspace-id">{{ ws.teamId }}</span>
            </div>
            <button
              class="btn btn-ghost btn-sm icon-btn-danger"
              :disabled="disconnecting === ws.teamId"
              @click="disconnectWorkspace(ws.teamId)"
            >
              <span v-if="disconnecting === ws.teamId" class="spinner spinner-sm"></span>
              <span v-else>Disconnect</span>
            </button>
          </div>
        </div>

        <div style="margin-top:16px">
          <a :href="slackInstallUrl" class="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 122.8 122.8" style="margin-right:6px">
              <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/>
              <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"/>
              <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/>
              <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/>
            </svg>
            {{ auth.user?.slackWorkspaces?.length ? 'Add another workspace' : 'Connect Slack' }}
          </a>
        </div>
      </div>

      <!-- Save Button -->
      <div class="settings-actions">
        <div v-if="saveMsg" class="alert" :class="saveSuccess ? 'alert-success' : 'alert-error'">
          {{ saveMsg }}
        </div>
        <button class="btn btn-primary" :disabled="saving" @click="saveSettings">
          <span v-if="saving" class="spinner spinner-sm"></span>
          {{ saving ? 'Saving...' : 'Save settings' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api, extractError } from '@/shared/composables/useApi'
import { useAuthStore } from '@/shared/stores/auth.store'
import { useNotification } from '@/shared/composables/useNotification'

interface Settings {
  hasWindsorKey: boolean
  timezone: string
}

const auth = useAuthStore()
const route = useRoute()
const notif = useNotification()
const loading = ref(true)
const saving = ref(false)
const disconnecting = ref<string | null>(null)
const settings = ref<Settings | null>(null)
const showApiKey = ref(false)
const saveMsg = ref('')
const saveSuccess = ref(false)

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const slackInstallUrl = computed(() => `${BASE}/slack/install?token=${encodeURIComponent(auth.token ?? '')}`)

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Asia/Tokyo',
  'Asia/Singapore', 'Asia/Dubai', 'Australia/Sydney',
]

const form = reactive({
  windsorApiKey: '',
  timezone: auth.user?.timezone || 'UTC',
})

async function fetchSettings() {
  try {
    const res = await api.get('/settings')
    settings.value = res.data
    form.timezone = res.data.timezone || 'UTC'
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

async function disconnectWorkspace(teamId: string) {
  disconnecting.value = teamId
  try {
    await api.delete(`/slack/workspace/${teamId}`)
    await auth.fetchMe()
    notif.success('Workspace disconnected')
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    disconnecting.value = null
  }
}

async function saveSettings() {
  saving.value = true
  saveMsg.value = ''
  try {
    const payload: Record<string, string> = { timezone: form.timezone }
    if (form.windsorApiKey) {
      payload.windsorApiKey = form.windsorApiKey
    }
    await api.put('/settings', payload)
    await auth.fetchMe()
    await fetchSettings()
    form.windsorApiKey = ''
    saveSuccess.value = true
    saveMsg.value = 'Settings saved successfully.'
    setTimeout(() => { saveMsg.value = '' }, 3000)
  } catch (err) {
    saveSuccess.value = false
    saveMsg.value = extractError(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchSettings()
  // Handle redirect back from Slack OAuth
  if (route.query.slack === 'connected') {
    await auth.fetchMe()
    notif.success('Slack workspace connected successfully!')
  } else if (route.query.slack === 'error') {
    notif.error('Failed to connect Slack workspace. Please try again.')
  }
})
</script>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 680px;
}

.settings-description {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  width: 120px;
  flex-shrink: 0;
}

.settings-value {
  flex: 1;
  font-size: 14px;
  color: var(--text);
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-row .form-input {
  flex: 1;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.workspace-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary, #f9f9f9);
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workspace-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text);
}

.workspace-id {
  font-size: 11px;
  color: var(--text-muted);
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
}
</style>
