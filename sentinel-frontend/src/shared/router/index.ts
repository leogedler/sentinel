import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/modules/auth/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/shared/components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/clients',
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/modules/clients/views/ClientsListView.vue'),
        },
        {
          path: 'clients/:id',
          name: 'client-detail',
          component: () => import('@/modules/clients/views/ClientDetailView.vue'),
        },
        {
          path: 'skills',
          name: 'skills',
          component: () => import('@/modules/skills/views/SkillsView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/modules/settings/views/SettingsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.public && auth.isAuthenticated) {
    return { name: 'clients' }
  }

  if (auth.isAuthenticated && !auth.user) {
    await auth.fetchMe()
  }
})

export default router
