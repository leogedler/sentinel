<template>
  <div class="layout">
    <AppNav />
    <main class="layout-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppNav from './AppNav.vue'
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.layout-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: var(--bg);
}
</style>
