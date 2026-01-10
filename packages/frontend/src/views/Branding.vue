<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const branding = computed(() => authStore.session?.branding);
const saving = ref(false);

const formData = ref({
  companyName: branding.value?.companyName || '',
  primaryColor: branding.value?.primaryColor || '#1976d2',
  secondaryColor: branding.value?.secondaryColor || '#424242',
  subdomainSlug: branding.value?.subdomainSlug || '',
});

function copyPortalUrl() {
  navigator.clipboard.writeText(portalUrl.value);
}

async function saveBranding() {
  saving.value = true;
  try {
    const response = await fetch('/api/branding', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(formData.value),
    });

    if (response.ok) {
      await authStore.fetchSession();
    }
  } finally {
    saving.value = false;
  }
}

const tierLabel = computed(() => {
  const tier = branding.value?.tier || 'basic';
  return {
    basic: 'Basic',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }[tier];
});

const portalUrl = computed(() => {
  if (branding.value?.customDomain && branding.value.tier === 'enterprise') {
    return `https://${branding.value.customDomain}`;
  }
  if (branding.value?.subdomainSlug && branding.value.tier === 'professional') {
    return `https://portal-${branding.value.subdomainSlug}.launchmaniac.com`;
  }
  return `https://portal.launchmaniac.com/${authStore.session?.locationId}`;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Branding Settings</h1>

    <!-- Current Tier -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Current Plan</h2>
          <p class="text-gray-500">Your white-label tier determines available customization options.</p>
        </div>
        <span class="px-4 py-2 bg-primary-100 text-primary-800 rounded-full font-medium">
          {{ tierLabel }}
        </span>
      </div>
    </div>

    <!-- Portal URL -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Your Portal URL</h2>
      <div class="flex items-center gap-2">
        <code class="flex-1 p-3 bg-gray-100 rounded font-mono text-sm">{{ portalUrl }}</code>
        <button
          @click="copyPortalUrl"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Copy
        </button>
      </div>
    </div>

    <!-- Branding Form -->
    <form @submit.prevent="saveBranding" class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Brand Customization</h2>

      <div class="space-y-6">
        <!-- Company Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            v-model="formData.companyName"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Your Company Name"
          />
        </div>

        <!-- Colors -->
        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="formData.primaryColor"
                type="color"
                class="h-10 w-20 rounded cursor-pointer"
              />
              <input
                v-model="formData.primaryColor"
                type="text"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
                placeholder="#1976d2"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="formData.secondaryColor"
                type="color"
                class="h-10 w-20 rounded cursor-pointer"
              />
              <input
                v-model="formData.secondaryColor"
                type="text"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
                placeholder="#424242"
              />
            </div>
          </div>
        </div>

        <!-- Subdomain (Professional+) -->
        <div v-if="branding?.tier !== 'basic'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Custom Subdomain</label>
          <div class="flex items-center">
            <span class="px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500">
              portal-
            </span>
            <input
              v-model="formData.subdomainSlug"
              type="text"
              class="flex-1 px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500"
              placeholder="yourcompany"
            />
            <span class="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">
              .launchmaniac.com
            </span>
          </div>
        </div>

        <!-- Enterprise Notice -->
        <div v-if="branding?.tier === 'enterprise'" class="p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>Enterprise Feature:</strong> Contact support to configure your custom domain
            (e.g., portal.yourcompany.com).
          </p>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="saving"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
