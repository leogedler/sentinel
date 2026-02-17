<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Skills</h1>
        <p class="page-subtitle">Skills are prompt templates Claude uses to generate specialized marketing reports.</p>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">+ New Skill</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <template v-else>
      <!-- System Skills -->
      <div class="section-label">System Skills</div>
      <div class="skills-grid">
        <div v-for="skill in systemSkills" :key="skill._id" class="skill-card card">
          <div class="skill-header">
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <span class="badge badge-category" :class="`badge-${skill.category}`">
                {{ skill.category }}
              </span>
            </div>
            <span class="badge badge-neutral badge-sm">System</span>
          </div>
          <p class="skill-description">{{ skill.description }}</p>
          <div class="skill-params" v-if="skill.parameters?.length">
            <span class="params-label">Parameters:</span>
            <span v-for="p in skill.parameters" :key="p.name" class="param-chip">
              {{ p.name }}{{ p.required ? '*' : '' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Custom Skills -->
      <div v-if="customSkills.length > 0">
        <div class="section-label" style="margin-top:32px">Custom Skills</div>
        <div class="skills-grid">
          <div v-for="skill in customSkills" :key="skill._id" class="skill-card card">
            <div class="skill-header">
              <div class="skill-info">
                <div class="skill-name">{{ skill.name }}</div>
                <span class="badge badge-category" :class="`badge-${skill.category}`">
                  {{ skill.category }}
                </span>
              </div>
              <div class="skill-actions">
                <button class="icon-btn" title="Edit" @click="editSkill(skill)">&#9998;</button>
                <button class="icon-btn icon-btn-danger" title="Delete" @click="confirmDelete(skill)">&#215;</button>
              </div>
            </div>
            <p class="skill-description">{{ skill.description }}</p>
            <div class="skill-params" v-if="skill.parameters?.length">
              <span class="params-label">Parameters:</span>
              <span v-for="p in skill.parameters" :key="p.name" class="param-chip">
                {{ p.name }}{{ p.required ? '*' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="systemSkills.length === 0 && customSkills.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-title">No skills found</div>
        </div>
      </div>
    </template>

    <!-- Create/Edit Skill Modal -->
    <SkillFormModal
      v-if="showCreate || editTarget"
      :skill="editTarget"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Delete skill?</h2>
        </div>
        <div class="modal-body">
          <p>Delete <strong>{{ deleteTarget.name }}</strong>? This cannot be undone.</p>
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
import { ref, computed, onMounted } from 'vue'
import { api, extractError } from '@/shared/composables/useApi'
import { useNotification } from '@/shared/composables/useNotification'
import SkillFormModal from '../components/SkillFormModal.vue'

interface SkillParameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface Skill {
  _id: string
  name: string
  description: string
  promptTemplate: string
  parameters: SkillParameter[]
  type: 'system' | 'custom'
  category: 'reporting' | 'analysis' | 'optimization' | 'alerting'
  isActive: boolean
}

const skills = ref<Skill[]>([])
const loading = ref(true)
const showCreate = ref(false)
const editTarget = ref<Skill | null>(null)
const deleteTarget = ref<Skill | null>(null)
const deleting = ref(false)
const notif = useNotification()

const systemSkills = computed(() => skills.value.filter(s => s.type === 'system'))
const customSkills = computed(() => skills.value.filter(s => s.type === 'custom'))

async function fetchSkills() {
  try {
    const res = await api.get('/skills')
    skills.value = res.data
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    loading.value = false
  }
}

function editSkill(s: Skill) { editTarget.value = s }
function confirmDelete(s: Skill) { deleteTarget.value = s }

function closeModal() {
  showCreate.value = false
  editTarget.value = null
}

async function onSaved() {
  closeModal()
  loading.value = true
  await fetchSkills()
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/skills/${deleteTarget.value._id}`)
    notif.success('Skill deleted')
    deleteTarget.value = null
    await fetchSkills()
  } catch (err) {
    notif.error(extractError(err))
  } finally {
    deleting.value = false
  }
}

onMounted(fetchSkills)
</script>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.skill-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
}

.skill-description {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.skill-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.skill-params {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.params-label {
  font-size: 11px;
  color: var(--text-light);
  font-weight: 500;
}

.param-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 99px;
  color: var(--text-muted);
  font-family: monospace;
}

.badge-category { text-transform: capitalize; }
.badge-reporting { background: #eff6ff; color: #1d4ed8; }
.badge-analysis { background: #f5f3ff; color: #6d28d9; }
.badge-optimization { background: #ecfdf5; color: #065f46; }
.badge-alerting { background: #fff7ed; color: #c2410c; }

.badge-sm { font-size: 10px; padding: 1px 6px; }
</style>
