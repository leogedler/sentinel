<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEdit ? 'Edit Client' : 'New Client' }}</h2>
        <button class="icon-btn" @click="$emit('close')">&#215;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMsg" class="alert alert-error" style="margin-bottom:14px">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label class="form-label" for="cf-name">Client name</label>
            <input
              id="cf-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g. Acme Corp"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="cf-channel">Slack Channel ID</label>
            <input
              id="cf-channel"
              v-model="form.slackChannelId"
              type="text"
              class="form-input"
              placeholder="e.g. C0123456789"
              required
            />
            <p class="form-hint">The Slack channel ID where this client's reports will be posted.</p>
          </div>

          <div v-if="isEdit" class="form-group">
            <label class="form-label">
              <input type="checkbox" v-model="form.isActive" style="margin-right:6px" />
              Active
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner spinner-sm"></span>
            {{ saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create client') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { api, extractError } from '@/shared/composables/useApi'
import { useNotification } from '@/shared/composables/useNotification'

interface Client {
  _id: string
  name: string
  slackChannelId: string
  isActive: boolean
}

const props = defineProps<{ client?: Client | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const notif = useNotification()
const saving = ref(false)
const errorMsg = ref('')
const isEdit = computed(() => !!props.client)

const form = reactive({
  name: props.client?.name ?? '',
  slackChannelId: props.client?.slackChannelId ?? '',
  isActive: props.client?.isActive ?? true,
})

async function handleSubmit() {
  errorMsg.value = ''
  saving.value = true
  try {
    if (isEdit.value && props.client) {
      await api.put(`/clients/${props.client._id}`, form)
      notif.success('Client updated')
    } else {
      await api.post('/clients', form)
      notif.success('Client created')
    }
    emit('saved')
  } catch (err) {
    errorMsg.value = extractError(err)
  } finally {
    saving.value = false
  }
}
</script>
