<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEdit ? 'Edit Skill' : 'New Skill' }}</h2>
        <button class="icon-btn" @click="$emit('close')">&#215;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMsg" class="alert alert-error" style="margin-bottom:14px">{{ errorMsg }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="sk-name">Skill name</label>
              <input id="sk-name" v-model="form.name" type="text" class="form-input" placeholder="e.g. Competitor Insights" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="sk-cat">Category</label>
              <select id="sk-cat" v-model="form.category" class="form-select" required>
                <option value="reporting">Reporting</option>
                <option value="analysis">Analysis</option>
                <option value="optimization">Optimization</option>
                <option value="alerting">Alerting</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="sk-desc">Description</label>
            <input id="sk-desc" v-model="form.description" type="text" class="form-input" placeholder="Short description of what this skill does" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="sk-tpl">Prompt Template</label>
            <textarea
              id="sk-tpl"
              v-model="form.promptTemplate"
              class="form-textarea"
              style="min-height:140px;font-family:monospace;font-size:13px"
              placeholder="You are a marketing analyst. Analyze the following campaign data: {{campaignData}}"
              required
            />
            <p class="form-hint">Use <code>&#123;&#123;variableName&#125;&#125;</code> for dynamic values.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner spinner-sm"></span>
            {{ saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create skill') }}
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

interface Skill {
  _id: string
  name: string
  description: string
  promptTemplate: string
  category: string
}

const props = defineProps<{ skill?: Skill | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const notif = useNotification()
const saving = ref(false)
const errorMsg = ref('')
const isEdit = computed(() => !!props.skill)

const form = reactive({
  name: props.skill?.name ?? '',
  description: props.skill?.description ?? '',
  promptTemplate: props.skill?.promptTemplate ?? '',
  category: props.skill?.category ?? 'reporting',
  parameters: [] as unknown[],
})

async function handleSubmit() {
  errorMsg.value = ''
  saving.value = true
  try {
    if (isEdit.value && props.skill) {
      await api.put(`/skills/${props.skill._id}`, form)
      notif.success('Skill updated')
    } else {
      await api.post('/skills', form)
      notif.success('Skill created')
    }
    emit('saved')
  } catch (err) {
    errorMsg.value = extractError(err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-lg {
  max-width: 600px;
}
</style>
