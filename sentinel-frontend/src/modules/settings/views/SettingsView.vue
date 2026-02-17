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
          <span v-if="auth.user?.slackWorkspaceId" class="badge badge-success">Connected</span>
          <span v-else class="badge badge-neutral">Not connected</span>
        </div>
        <p class="settings-description">
          Connect your Slack workspace to enable the Sentinel bot and receive reports directly in your channels.
        </p>
        <div style="margin-top:16px">
          <a :href="slackInstallUrl" class="btn btn-secondary" v-if="!auth.user?.slackWorkspaceId">
            <svg width="16" height="16" viewBox="0 0 122.8 122.8" style="margin-right:6px">
              <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/>
              <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0"/>
              <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/>
              <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/>
            </svg>
            Connect Slack
          </a>
          <div v-else class="alert alert-success" style="display:inline-flex;padding:8px 14px">
            &#10003; Workspace connected (ID: {{ auth.user?.slackWorkspaceId }})
          </div>
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
import { api, extractError } from '@/shared/composables/useApi'
import { useAuthStore } from '@/shared/stores/auth.store'

interface Settings {
  hasWindsorKey: boolean
  timezone: string
}

const auth = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const settings = ref<Settings | null>(null)
const showApiKey = ref(false)
const saveMsg = ref('')
const saveSuccess = ref(false)

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const slackInstallUrl = computed(() => `${BASE}/slack/install`)

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

onMounted(fetchSettings)
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

.settings-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
}
</style>
