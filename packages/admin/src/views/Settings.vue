<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref } from 'vue';

const saving = ref(false);
const saved = ref(false);

const settings = ref({
  defaultTier: 'basic',
  autoVerifyDomains: false,
  notifyOnNewInstall: true,
  notifyOnEscalation: true,
  deepseekModel: 'deepseek-chat-v3.2',
  maxDocumentSizeMb: 10,
  sessionTimeoutHours: 24,
  maintenanceMode: false,
});

async function saveSettings() {
  saving.value = true;
  saved.value = false;

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  saving.value = false;
  saved.value = true;

  setTimeout(() => {
    saved.value = false;
  }, 3000);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
      <p class="text-gray-500">Platform configuration and preferences</p>
    </div>

    <form @submit.prevent="saveSettings" class="space-y-6">
      <!-- General Settings -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">General</h2>

        <div class="space-y-6 max-w-xl">
          <div>
            <label class="label">Default Tier for New Installations</label>
            <select v-model="settings.defaultTier" class="input">
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label class="label">Session Timeout (hours)</label>
            <input
              v-model.number="settings.sessionTimeoutHours"
              type="number"
              min="1"
              max="168"
              class="input"
            />
            <p class="text-xs text-gray-500 mt-1">Magic link validity for customer portal</p>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900">Auto-verify Domains</p>
              <p class="text-sm text-gray-500">Automatically attempt DNS verification</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.autoVerifyDomains" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900">Maintenance Mode</p>
              <p class="text-sm text-gray-500">Disable all portal access temporarily</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.maintenanceMode" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Notifications</h2>

        <div class="space-y-4 max-w-xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900">New Installation Alerts</p>
              <p class="text-sm text-gray-500">Email when a new tenant installs AUMA</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.notifyOnNewInstall" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900">SAFE Act Escalation Alerts</p>
              <p class="text-sm text-gray-500">Notify when compliance escalation occurs</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.notifyOnEscalation" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- AI Configuration -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">AI Configuration</h2>

        <div class="space-y-6 max-w-xl">
          <div>
            <label class="label">Deepseek Model</label>
            <select v-model="settings.deepseekModel" class="input">
              <option value="deepseek-chat-v3.2">Deepseek Chat v3.2 (Recommended)</option>
              <option value="deepseek-chat-v3.1">Deepseek Chat v3.1</option>
              <option value="deepseek-coder">Deepseek Coder</option>
            </select>
          </div>

          <div>
            <label class="label">Max Document Size (MB)</label>
            <input
              v-model.number="settings.maxDocumentSizeMb"
              type="number"
              min="1"
              max="50"
              class="input"
            />
            <p class="text-xs text-gray-500 mt-1">Maximum file size for OCR processing</p>
          </div>
        </div>
      </div>

      <!-- API Keys (Read Only) -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">API Keys</h2>
        <p class="text-sm text-gray-500 mb-4">
          API keys are managed via environment variables for security.
        </p>

        <div class="space-y-4 max-w-xl">
          <div>
            <label class="label">GHL Client ID</label>
            <input type="text" class="input bg-gray-50" value="••••••••••••••••" disabled />
          </div>
          <div>
            <label class="label">Deepseek API Key</label>
            <input type="text" class="input bg-gray-50" value="••••••••••••••••" disabled />
          </div>
          <div>
            <label class="label">Cloudflare API Token</label>
            <input type="text" class="input bg-gray-50" value="••••••••••••••••" disabled />
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex items-center gap-4">
        <button
          type="submit"
          :disabled="saving"
          class="btn-primary disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
        <span v-if="saved" class="text-sm text-green-600 font-medium">
          Settings saved successfully
        </span>
      </div>
    </form>
  </div>
</template>
