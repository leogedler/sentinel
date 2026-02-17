<template>
  <div v-if="loading" class="loading-state">
    <div class="spinner"></div>
  </div>

  <div v-else-if="!client" class="card">
    <div class="empty-state">
      <div class="empty-state-title">Client not found</div>
      <router-link to="/clients" class="btn btn-secondary" style="margin-top:12px">Back to clients</router-link>
    </div>
  </div>

  <div v-else>
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <router-link to="/clients" class="back-link">&#8592; Clients</router-link>
        <h1 class="page-title">{{ client.name }}</h1>
        <div class="page-subtitle">
          Slack: <code>#{{ client.slackChannelId }}</code>
          &nbsp;
          <span class="badge" :class="client.isActive ? 'badge-success' : 'badge-neutral'">
            {{ client.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'campaigns' }"
        @click="activeTab = 'campaigns'"
      >
        Campaigns ({{ campaigns.length }})
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'schedules' }"
        @click="activeTab = 'schedules'"
      >
        Schedules ({{ schedules.length }})
      </button>
    </div>

    <!-- Campaigns Tab -->
    <div v-if="activeTab === 'campaigns'">
      <div class="tab-actions">
        <button class="btn btn-primary btn-sm" @click="showCampaignForm = true">+ Add Campaign</button>
      </div>

      <div v-if="campaigns.length === 0" class="card" style="margin-top:16px">
        <div class="empty-state">
          <div class="empty-state-icon">&#128200;</div>
          <div class="empty-state-title">No campaigns</div>
          <div class="empty-state-text">Add a Facebook Ads campaign to start tracking performance.</div>
          <button class="btn btn-primary btn-sm" @click="showCampaignForm = true">+ Add Campaign</button>
        </div>
      </div>

      <div v-else class="table-wrap" style="margin-top:16px">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Facebook Campaign ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c._id">
              <td>
                <span class="campaign-name">{{ c.name }}</span>
              </td>
              <td>
                <code class="fb-id">{{ c.facebookCampaignId }}</code>
              </td>
              <td>
                <span class="badge" :class="c.isActive ? 'badge-success' : 'badge-neutral'">
                  {{ c.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn" title="Edit" @click="editCampaign(c)">&#9998;</button>
                  <button class="icon-btn icon-btn-danger" title="Delete" @click="confirmDeleteCampaign(c)">&#215;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Schedules Tab -->
    <div v-if="activeTab === 'schedules'">
      <div class="tab-actions">
        <button class="btn btn-primary btn-sm" @click="showScheduleForm = true">+ Add Schedule</button>
      </div>

      <div v-if="schedules.length === 0" class="card" style="margin-top:16px">
        <div class="empty-state">
          <div class="empty-state-icon">&#9201;</div>
          <div class="empty-state-title">No schedules</div>
          <div class="empty-state-text">Set up automatic report delivery to this client's Slack channel.</div>
          <button class="btn btn-primary btn-sm" @click="showScheduleForm = true">+ Add Schedule</button>
        </div>
      </div>

      <div v-else class="table-wrap" style="margin-top:16px">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Skill</th>
              <th>Cron</th>
              <th>Status</th>
              <th>Last run</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in schedules" :key="s._id">
              <td>{{ s.campaignId?.name ?? '—' }}</td>
              <td>{{ s.skillId?.name ?? '—' }}</td>
              <td><code>{{ s.cronExpression }}</code></td>
              <td>
                <span class="badge" :class="s.isActive ? 'badge-success' : 'badge-neutral'">
                  {{ s.isActive ? 'Active' : 'Paused' }}
                </span>
              </td>
              <td>{{ s.lastRunAt ? formatDate(s.lastRunAt) : 'Never' }}</td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn icon-btn-danger" title="Delete" @click="confirmDeleteSchedule(s)">&#215;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Campaign Form Modal -->
    <CampaignForm
      v-if="showCampaignForm || editCampaignTarget"
      :client-id="clientId"
      :campaign="editCampaignTarget"
      @close="closeCampaignModal"
      @saved="onCampaignSaved"
    />

    <!-- Schedule Form Modal -->
    <ScheduleForm
      v-if="showScheduleForm"
      :client-id="clientId"
      :campaigns="campaigns"
      @close="showScheduleForm = false"
      @saved="onScheduleSaved"
    />

    <!-- Delete Campaign Confirm -->
    <div v-if="deleteCampaignTarget" class="modal-backdrop" @click.self="deleteCampaignTarget = null">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Delete campaign?</h2>
        </div>
        <div class="modal-body">
          <p>Delete <strong>{{ deleteCampaignTarget.name }}</strong>? This cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteCampaignTarget = null">Cancel</button>
          <button class="btn btn-danger" :disabled="deleting" @click="doDeleteCampaign">
            <span v-if="deleting" class="spinner spinner-sm"></span>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Schedule Confirm -->
    <div v-if="deleteScheduleTarget" class="modal-backdrop" @click.self="deleteScheduleTarget = null">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Delete schedule?</h2>
        </div>
        <div class="modal-body">
          <p>Remove this scheduled report?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteScheduleTarget = null">Cancel</button>
          <button class="btn btn-danger" :disabled="deleting" @click="doDeleteSchedule">
            <span v-if="deleting" class="spinner spinner-sm"></span>
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api, extractError } from '@/shared/composables/useApi'
import { useNotification } from '@/shared/composables/useNotification'
import CampaignForm from '../components/CampaignForm.vue'
import ScheduleForm from '../components/ScheduleForm.vue'

interface Campaign {
  _id: string
  name: string
  facebookCampaignId: string
  isActive: boolean
}

interface Schedule {
  _id: string
  campaignId?: { _id: string; name: string }
  skillId?: { _id: string; name: string }
  cronExpression: string
  isActive: boolean
  lastRunAt?: string
}

interface Client {
  _id: string
  name: string
  slackChannelId: string
  isActive: boolean
}

const route = useRoute()
const notif = useNotification()

const clientId = computed(() => route.params.id as string)
const client = ref<Client | null>(null)
const campaigns = ref<Campaign[]>([])
const schedules = ref<Schedule[]>([])
const loading = ref(true)
const activeTab = ref<'campaigns' | 'schedules'>('campaigns')

const showCampaignForm = ref(false)
const editCampaignTarget = ref<Campaign | null>(null)
const deleteCampaignTarget = ref<Campaign | null>(null)

const showScheduleForm = ref(false)
const deleteScheduleTarget = ref<Schedule | null>(null)

const deleting = ref(false)

async function fetchAll() {
  loading.value = true
  try {
    const [clientRes, campaignsRes, schedulesRes] = await Promise.all([
      api.get(`/clients/${clientId.value}`),
      api.get(`/clients/${clientId.value}/campaigns`),
      api.get(`/clients/${clientId.value}/schedules`),
    ])
    client.value = clientRes.data
    campaigns.value = campaignsRes.data
    schedules.value = schedulesRes.data
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    loading.value = false
  }
}

function editCampaign(c: Campaign) {
  editCampaignTarget.value = c
}

function confirmDeleteCampaign(c: Campaign) {
  deleteCampaignTarget.value = c
}

function confirmDeleteSchedule(s: Schedule) {
  deleteScheduleTarget.value = s
}

function closeCampaignModal() {
  showCampaignForm.value = false
  editCampaignTarget.value = null
}

async function onCampaignSaved() {
  closeCampaignModal()
  const res = await api.get(`/clients/${clientId.value}/campaigns`)
  campaigns.value = res.data
}

async function onScheduleSaved() {
  showScheduleForm.value = false
  const res = await api.get(`/clients/${clientId.value}/schedules`)
  schedules.value = res.data
}

async function doDeleteCampaign() {
  if (!deleteCampaignTarget.value) return
  deleting.value = true
  const targetId = deleteCampaignTarget.value._id
  try {
    await api.delete(`/clients/${clientId.value}/campaigns/${targetId}`)
    notif.success('Campaign deleted')
    campaigns.value = campaigns.value.filter(c => c._id !== targetId)
    deleteCampaignTarget.value = null
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    deleting.value = false
  }
}

async function doDeleteSchedule() {
  if (!deleteScheduleTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/clients/${clientId.value}/schedules/${deleteScheduleTarget.value._id}`)
    notif.success('Schedule deleted')
    schedules.value = schedules.value.filter(s => s._id !== deleteScheduleTarget.value?._id)
    deleteScheduleTarget.value = null
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    deleting.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString()
}

onMounted(fetchAll)
</script>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.back-link {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.back-link:hover { color: var(--text); text-decoration: none; }

.tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  margin-bottom: 20px;
  gap: 0;
}

.tab {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  transition: color var(--transition), border-color var(--transition);
}

.tab:hover { color: var(--text); }

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
}

.campaign-name {
  font-weight: 500;
}

.fb-id {
  font-size: 12px;
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

.row-actions {
  display: flex;
  gap: 4px;
}
</style>
