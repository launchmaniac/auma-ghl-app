// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { createRouter, createWebHistory } from 'vue-router';
import { usePortalStore } from '@/stores/portal';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/Auth.vue'),
    },
    {
      path: '/request-access',
      name: 'request-access',
      component: () => import('@/views/RequestAccess.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/documents',
      name: 'documents',
      component: () => import('@/views/Documents.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/views/Messages.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/conditions',
      name: 'conditions',
      component: () => import('@/views/Conditions.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const portalStore = usePortalStore();

  // Handle magic link token verification
  if (to.name === 'auth' && to.query.token) {
    const success = await portalStore.verifyToken(to.query.token as string);
    if (success) {
      next({ name: 'home' });
      return;
    } else {
      next({ name: 'request-access' });
      return;
    }
  }

  // Check authentication for protected routes
  if (to.meta.requiresAuth && !portalStore.isAuthenticated) {
    next({ name: 'request-access' });
    return;
  }

  next();
});

export default router;
