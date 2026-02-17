<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">New Schedule</h2>
        <button class="icon-btn" @click="$emit('close')">&#215;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMsg" class="alert alert-error" style="margin-bottom:14px">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label class="form-label" for="sch-campaign">Campaign</label>
            <select id="sch-campaign" v-model="form.campaignId" class="form-select" required>
              <option value="">Select a campaign...</option>
              <option v-for="c in campaigns" :key="c._id" :value="c._id">{{ c.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="sch-skill">Skill</label>
            <select id="sch-skill" v-model="form.skillId" class="form-select" required>
              <option value="">Select a skill...</option>
              <option v-for="s in skills" :key="s._id" :value="s._id">{{ s.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Frequency</label>
            <div class="frequency-picker">
              <label class="freq-option" :class="{ active: freq === 'daily' }">
                <input type="radio" v-model="freq" value="daily" style="display:none" />
                Daily
              </label>
              <label class="freq-option" :class="{ active: freq === 'weekly' }">
                <input type="radio" v-model="freq" value="weekly" style="display:none" />
                Weekly (Mon)
              </label>
              <label class="freq-option" :class="{ active: freq === 'custom' }">
                <input type="radio" v-model="freq" value="custom" style="display:none" />
                Custom cron
              </label>
            </div>
          </div>

          <div v-if="freq !== 'custom'" class="form-group">
            <label class="form-label" for="sch-time">Time (UTC)</label>
            <input
              id="sch-time"
              v-model="timeInput"
              type="time"
              class="form-input"
              required
            />
          </div>

          <div v-else class="form-group">
            <label class="form-label" for="sch-cron">Cron Expression</label>
            <input
              id="sch-cron"
              v-model="form.cronExpression"
              type="text"
              class="form-input"
              placeholder="e.g. 0 9 * * 1"
              required
            />
            <p class="form-hint">Standard cron format (minute hour day month weekday)</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="sch-tz">Timezone</label>
            <select id="sch-tz" v-model="form.timezone" class="form-select">
              <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
            </select>
          </div>

          <div class="cron-preview" v-if="form.cronExpression">
            <span class="cron-label">Cron:</span>
            <code>{{ form.cronExpression }}</code>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner spinner-sm"></span>
            {{ saving ? 'Creating...' : 'Create schedule' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { api, extractError } from '@/shared/composables/useApi'
import { useNotification } from '@/shared/composables/useNotification'

interface Campaign { _id: string; name: string }
interface Skill { _id: string; name: string }

const props = defineProps<{
  clientId: string
  campaigns: Campaign[]
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const notif = useNotification()
const saving = ref(false)
const errorMsg = ref('')
const skills = ref<Skill[]>([])
const freq = ref<'daily' | 'weekly' | 'custom'>('daily')
const timeInput = ref('09:00')

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
]

const form = reactive({
  campaignId: '',
  skillId: '',
  cronExpression: '0 9 * * *',
  timezone: 'UTC',
  isActive: true,
})

watch([freq, timeInput], () => {
  if (freq.value === 'custom') return
  const [hh, mm] = timeInput.value.split(':')
  if (freq.value === 'daily') {
    form.cronExpression = `${mm} ${hh} * * *`
  } else {
    form.cronExpression = `${mm} ${hh} * * 1`
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  saving.value = true
  try {
    await api.post(`/clients/${props.clientId}/schedules`, form)
    notif.success('Schedule created')
    emit('saved')
  } catch (err) {
    errorMsg.value = extractError(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/skills')
    skills.value = res.data
  } catch {
    // silent fail
  }
})
</script>

<style scoped>
.frequency-picker {
  display: flex;
  gap: 8px;
}

.freq-option {
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
  transition: all var(--transition);
  user-select: none;
}

.freq-option:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.freq-option.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 500;
}

.cron-preview {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cron-label {
  color: var(--text-muted);
  font-weight: 500;
}
</style>
