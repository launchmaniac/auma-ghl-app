// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { createRouter, createWebHistory } from 'vue-router';
import { useAdminStore } from '@/stores/admin';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/components/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'tenants',
          name: 'tenants',
          component: () => import('@/views/TenantManagement.vue'),
        },
        {
          path: 'tenants/:id',
          name: 'tenant-detail',
          component: () => import('@/views/TenantDetail.vue'),
        },
        {
          path: 'domains',
          name: 'domains',
          component: () => import('@/views/DomainProvisioning.vue'),
        },
        {
          path: 'usage',
          name: 'usage',
          component: () => import('@/views/UsageMetrics.vue'),
        },
        {
          path: 'billing',
          name: 'billing',
          component: () => import('@/views/BillingOverview.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/Settings.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const adminStore = useAdminStore();

  if (to.meta.requiresAuth !== false) {
    if (!adminStore.isAuthenticated) {
      const isValid = await adminStore.checkAuth();
      if (!isValid) {
        next({ name: 'login', query: { redirect: to.fullPath } });
        return;
      }
    }
  }

  next();
});

export default router;
