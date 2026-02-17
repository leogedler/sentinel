<template>
  <Teleport to="body">
    <div class="notif-container">
      <TransitionGroup name="notif">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notif"
          :class="`notif-${n.type}`"
        >
          <span class="notif-icon">{{ icons[n.type] }}</span>
          <span class="notif-msg">{{ n.message }}</span>
          <button class="notif-close" @click="remove(n.id)">&#215;</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotification } from '../composables/useNotification'

const { notifications, remove } = useNotification()

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}
</script>

<style scoped>
.notif-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none;
}

.notif {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  box-shadow: var(--shadow-md);
  border: 1px solid transparent;
  pointer-events: all;
}

.notif-success {
  background: var(--success-light);
  color: #065f46;
  border-color: #6ee7b7;
}

.notif-error {
  background: var(--danger-light);
  color: #b91c1c;
  border-color: #fca5a5;
}

.notif-info {
  background: var(--info-light);
  color: #3730a3;
  border-color: #a5b4fc;
}

.notif-icon {
  font-weight: 700;
  flex-shrink: 0;
}

.notif-msg {
  flex: 1;
}

.notif-close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0.6;
  flex-shrink: 0;
  color: inherit;
}

.notif-close:hover { opacity: 1; }

.notif-enter-active,
.notif-leave-active {
  transition: all 0.25s ease;
}

.notif-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.notif-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
