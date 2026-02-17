<template>
  <nav class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">S</div>
      <span class="logo-text">Sentinel</span>
    </div>

    <div class="sidebar-section-label">Main</div>

    <router-link class="nav-item" :class="{ active: isActive('/clients') }" to="/clients">
      <span class="nav-icon">&#9634;</span>
      Clients
    </router-link>

    <router-link class="nav-item" :class="{ active: isActive('/skills') }" to="/skills">
      <span class="nav-icon">&#9670;</span>
      Skills
    </router-link>

    <div class="sidebar-spacer"></div>

    <div class="sidebar-section-label">Account</div>

    <router-link class="nav-item" :class="{ active: isActive('/settings') }" to="/settings">
      <span class="nav-icon">&#9881;</span>
      Settings
    </router-link>

    <div class="nav-user">
      <div class="user-avatar">{{ userInitial }}</div>
      <div class="user-info">
        <div class="user-name">{{ user?.name }}</div>
        <div class="user-email">{{ user?.email }}</div>
      </div>
      <button class="logout-btn" title="Logout" @click="handleLogout">&#8594;</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const user = computed(() => auth.user)
const userInitial = computed(() => user.value?.name?.charAt(0).toUpperCase() ?? '?')

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

async function handleLogout() {
  auth.logout()
  await router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  overflow-y: auto;
  border-right: 1px solid var(--sidebar-border);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 24px;
  border-bottom: 1px solid var(--sidebar-border);
  margin-bottom: 16px;
}

.logo-icon {
  width: 30px;
  height: 30px;
  background: var(--primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--sidebar-text);
  padding: 0 20px 6px;
  opacity: 0.6;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  color: var(--sidebar-text);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background var(--transition), color var(--transition);
  border-radius: 0;
  margin: 1px 8px;
  border-radius: 6px;
}

.nav-item:hover {
  background: var(--sidebar-hover-bg);
  color: #f8fafc;
  text-decoration: none;
}

.nav-item.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.sidebar-spacer {
  flex: 1;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin: 8px;
  border-top: 1px solid var(--sidebar-border);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 11px;
  color: var(--sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--sidebar-text);
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color var(--transition);
}

.logout-btn:hover {
  color: var(--danger);
}
</style>
