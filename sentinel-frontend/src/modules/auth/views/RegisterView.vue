<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">S</div>
        <span class="auth-logo-text">Sentinel</span>
      </div>

      <h1 class="auth-title">Create your account</h1>

      <div v-if="errorMsg" class="alert alert-error" style="margin-bottom:16px">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label" for="name">Full name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="form-input"
            placeholder="Jane Smith"
            required
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="you@company.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Min. 8 characters"
            minlength="8"
            required
            autocomplete="new-password"
          />
          <p class="form-hint">At least 8 characters</p>
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner spinner-sm"></span>
          {{ auth.loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="auth-footer">
        Already have an account?
        <router-link to="/login">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/shared/stores/auth.store'
import { extractError } from '@/shared/composables/useApi'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleRegister() {
  errorMsg.value = ''
  try {
    await auth.register(name.value, email.value, password.value)
    await router.push('/clients')
  } catch (err) {
    errorMsg.value = extractError(err)
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 36px;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.auth-logo-icon {
  width: 34px;
  height: 34px;
  background: var(--primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
  color: white;
}

.auth-logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.auth-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 24px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
