// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/app',
      name: 'app-callback',
      component: () => import('@/views/AppCallback.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/loans',
      name: 'loans',
      component: () => import('@/views/Loans.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/loans/:id',
      name: 'loan-detail',
      component: () => import('@/views/LoanDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/branding',
      name: 'branding',
      component: () => import('@/views/Branding.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Handle GHL OAuth callback
  if (to.name === 'app-callback' && to.query.session) {
    await authStore.handleCallback(to.query.session as string, to.query.locationId as string);
    next({ name: 'dashboard' });
    return;
  }

  // Check authentication for protected routes
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // In a real app, redirect to GHL login or show error
    console.error('Authentication required');
    return;
  }

  next();
});

export default router;
