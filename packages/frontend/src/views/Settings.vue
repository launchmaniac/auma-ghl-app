<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-500">Location ID</label>
          <p class="font-medium">{{ authStore.session?.locationId || 'N/A' }}</p>
        </div>
        <div>
          <label class="block text-sm text-gray-500">Company ID</label>
          <p class="font-medium">{{ authStore.session?.companyId || 'N/A' }}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Email Notifications</p>
            <p class="text-sm text-gray-500">Receive email alerts for loan updates</p>
          </div>
          <input type="checkbox" checked class="h-4 w-4 text-primary-600 rounded border-gray-300" />
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">SMS Notifications</p>
            <p class="text-sm text-gray-500">Receive SMS alerts for urgent items</p>
          </div>
          <input type="checkbox" checked class="h-4 w-4 text-primary-600 rounded border-gray-300" />
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">SAFE Act Escalations</p>
            <p class="text-sm text-gray-500">Immediate notification for compliance escalations</p>
          </div>
          <input type="checkbox" checked class="h-4 w-4 text-primary-600 rounded border-gray-300" />
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Pipeline Configuration</h2>
      <p class="text-gray-500 mb-4">
        AUMA uses the following 8-step loan workflow mapped to your GHL pipeline.
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 1:</span> Initial Call
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 2:</span> App In
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 3:</span> Post-App Call
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 4:</span> Notes to LO
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 5:</span> Pre-Approval Prep
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 6:</span> In Contract (PSA)
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 7:</span> Pipeline Mgmt
        </div>
        <div class="p-3 bg-gray-50 rounded">
          <span class="text-sm font-medium">Step 8:</span> Final Approval
        </div>
      </div>
    </div>
  </div>
</template>
