<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { RouterView } from 'vue-router';
import { watch } from 'vue';
import { usePortalStore } from './stores/portal';

const portalStore = usePortalStore();

// Apply tenant branding colors as CSS variables
watch(
  () => portalStore.branding,
  (branding) => {
    if (branding) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', branding.primaryColor || '#1976d2');
      root.style.setProperty('--color-secondary', branding.secondaryColor || '#424242');

      // Update page title
      document.title = `${branding.companyName || 'Loan'} Portal`;

      // Update favicon if provided
      if (branding.faviconUrl) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.faviconUrl;
        }
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <RouterView />
</template>
