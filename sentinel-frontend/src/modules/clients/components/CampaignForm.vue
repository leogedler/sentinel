<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEdit ? 'Edit Campaign' : 'Add Campaign' }}</h2>
        <button class="icon-btn" @click="$emit('close')">&#215;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMsg" class="alert alert-error" style="margin-bottom:14px">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label class="form-label" for="camp-name">Campaign name</label>
            <input
              id="camp-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g. Summer Sale 2025"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="camp-fbid">Facebook Campaign ID</label>
            <input
              id="camp-fbid"
              v-model="form.facebookCampaignId"
              type="text"
              class="form-input"
              placeholder="e.g. 120201234567890"
              :required="!isEdit"
            />
            <p class="form-hint">Find this in Facebook Ads Manager → Campaigns → Campaign ID column.</p>
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
            {{ saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Add campaign') }}
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

interface Campaign {
  _id: string
  name: string
  facebookCampaignId: string
  isActive: boolean
}

const props = defineProps<{
  clientId: string
  campaign?: Campaign | null
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const notif = useNotification()
const saving = ref(false)
const errorMsg = ref('')
const isEdit = computed(() => !!props.campaign)

const form = reactive({
  name: props.campaign?.name ?? '',
  facebookCampaignId: props.campaign?.facebookCampaignId ?? '',
  isActive: props.campaign?.isActive ?? true,
})

async function handleSubmit() {
  errorMsg.value = ''
  saving.value = true
  try {
    if (isEdit.value && props.campaign) {
      await api.put(`/clients/${props.clientId}/campaigns/${props.campaign._id}`, form)
      notif.success('Campaign updated')
    } else {
      await api.post(`/clients/${props.clientId}/campaigns`, form)
      notif.success('Campaign added')
    }
    emit('saved')
  } catch (err) {
    errorMsg.value = extractError(err)
  } finally {
    saving.value = false
  }
}
</script>
