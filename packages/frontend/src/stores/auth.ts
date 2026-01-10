// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TenantBranding } from '@auma/shared';

interface Session {
  locationId: string;
  companyId?: string;
  branding?: TenantBranding;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auma_token'));
  const session = ref<Session | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!session.value);

  async function handleCallback(sessionToken: string, _locationId: string) {
    token.value = sessionToken;
    localStorage.setItem('auma_token', sessionToken);

    // Fetch session details
    await fetchSession();
  }

  async function fetchSession() {
    if (!token.value) return;

    loading.value = true;
    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        throw new Error('Session fetch failed');
      }

      const data = await response.json();
      session.value = data.session;
    } catch (error) {
      console.error('Failed to fetch session:', error);
      logout();
    } finally {
      loading.value = false;
    }
  }

  async function refreshToken() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      token.value = data.token;
      localStorage.setItem('auma_token', data.token);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
    }
  }

  function logout() {
    token.value = null;
    session.value = null;
    localStorage.removeItem('auma_token');
  }

  // Initialize session if token exists
  if (token.value) {
    fetchSession();
  }

  return {
    token,
    session,
    loading,
    isAuthenticated,
    handleCallback,
    fetchSession,
    refreshToken,
    logout,
  };
});
