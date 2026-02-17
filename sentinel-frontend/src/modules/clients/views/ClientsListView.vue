<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Clients</h1>
        <p class="page-subtitle">Each client maps to a Slack channel and one or more campaigns.</p>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">+ New Client</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="clients.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-state-icon">&#9634;</div>
        <div class="empty-state-title">No clients yet</div>
        <div class="empty-state-text">Create your first client to start tracking Facebook Ads campaigns.</div>
        <button class="btn btn-primary" @click="showCreate = true">+ New Client</button>
      </div>
    </div>

    <div v-else class="clients-grid">
      <div v-for="client in clients" :key="client._id" class="client-card card">
        <div class="client-card-header">
          <div class="client-avatar">{{ client.name.charAt(0).toUpperCase() }}</div>
          <div class="client-meta">
            <div class="client-name">{{ client.name }}</div>
            <div class="client-channel">#{{ client.slackChannelId }}</div>
          </div>
          <span class="badge" :class="client.isActive ? 'badge-success' : 'badge-neutral'">
            {{ client.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <div class="client-stats" v-if="client.campaignCount !== undefined">
          <div class="stat">
            <div class="stat-value">{{ client.campaignCount }}</div>
            <div class="stat-label">Campaigns</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ client.scheduleCount ?? 0 }}</div>
            <div class="stat-label">Schedules</div>
          </div>
        </div>

        <div class="client-card-actions">
          <router-link :to="`/clients/${client._id}`" class="btn btn-secondary btn-sm">
            Manage
          </router-link>
          <button class="btn btn-ghost btn-sm" @click="editClient(client)">Edit</button>
          <button class="btn btn-ghost btn-sm icon-btn-danger" @click="confirmDelete(client)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <ClientForm
      v-if="showCreate || editTarget"
      :client="editTarget"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Delete client?</h2>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>?
          This will also remove all their campaigns and schedules.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" :disabled="deleting" @click="doDelete">
            <span v-if="deleting" class="spinner spinner-sm"></span>
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, extractError } from '@/shared/composables/useApi'
import { useNotification } from '@/shared/composables/useNotification'
import ClientForm from '../components/ClientForm.vue'

interface Client {
  _id: string
  name: string
  slackChannelId: string
  isActive: boolean
  campaignCount?: number
  scheduleCount?: number
}

const clients = ref<Client[]>([])
const loading = ref(true)
const showCreate = ref(false)
const editTarget = ref<Client | null>(null)
const deleteTarget = ref<Client | null>(null)
const deleting = ref(false)
const notif = useNotification()

async function fetchClients() {
  try {
    const res = await api.get('/clients')
    clients.value = res.data
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    loading.value = false
  }
}

function editClient(c: Client) {
  editTarget.value = c
}

function confirmDelete(c: Client) {
  deleteTarget.value = c
}

function closeModal() {
  showCreate.value = false
  editTarget.value = null
}

async function onSaved() {
  closeModal()
  loading.value = true
  await fetchClients()
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/clients/${deleteTarget.value._id}`)
    notif.success('Client deleted')
    deleteTarget.value = null
    await fetchClients()
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(fetchClients)
</script>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.client-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.client-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.client-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.client-meta {
  flex: 1;
  min-width: 0;
}

.client-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
}

.client-channel {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-stats {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.client-card-actions {
  display: flex;
  gap: 6px;
}
</style>
