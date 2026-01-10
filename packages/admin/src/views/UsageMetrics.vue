<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, computed } from 'vue';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();

const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0],
});

onMounted(async () => {
  await Promise.all([
    adminStore.fetchUsageStats(),
    adminStore.fetchTenantUsage(dateRange.value),
  ]);
});

async function updateDateRange() {
  await adminStore.fetchTenantUsage(dateRange.value);
}

const stats = computed(() => adminStore.usageStats);

const sortedTenantUsage = computed(() =>
  [...adminStore.tenantUsage].sort((a, b) => b.loansProcessed - a.loansProcessed)
);

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return (mb / 1024).toFixed(1) + ' GB';
  }
  return mb.toFixed(0) + ' MB';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Usage Metrics</h1>
        <p class="text-gray-500">Platform-wide and per-tenant analytics</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="dateRange.start"
          type="date"
          class="input py-1.5 text-sm"
          @change="updateDateRange"
        />
        <span class="text-gray-500">to</span>
        <input
          v-model="dateRange.end"
          type="date"
          class="input py-1.5 text-sm"
          @change="updateDateRange"
        />
      </div>
    </div>

    <!-- Platform Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.totalLoans || 0) }}</p>
            <p class="stat-label">Total Loans</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.documentsProcessed || 0) }}</p>
            <p class="stat-label">Documents Processed</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.aiCalls || 0) }}</p>
            <p class="stat-label">AI API Calls</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ (stats?.storageUsedGb || 0).toFixed(1) }} GB</p>
            <p class="stat-label">Storage Used</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Per-Tenant Usage -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Usage by Tenant</h2>
        <p class="text-sm text-gray-500 mt-1">
          {{ formatDate(dateRange.start) }} - {{ formatDate(dateRange.end) }}
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Tenant</th>
              <th class="table-header text-right">Loans</th>
              <th class="table-header text-right">Documents</th>
              <th class="table-header text-right">AI Calls</th>
              <th class="table-header text-right">Storage</th>
              <th class="table-header text-right">Last Activity</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="usage in sortedTenantUsage" :key="usage.tenantId" class="hover:bg-gray-50">
              <td class="table-cell font-medium text-gray-900">
                {{ usage.companyName }}
              </td>
              <td class="table-cell text-right text-gray-500">
                {{ formatNumber(usage.loansProcessed) }}
              </td>
              <td class="table-cell text-right text-gray-500">
                {{ formatNumber(usage.documentsUploaded) }}
              </td>
              <td class="table-cell text-right text-gray-500">
                {{ formatNumber(usage.aiCalls) }}
              </td>
              <td class="table-cell text-right text-gray-500">
                {{ formatBytes(usage.storageUsedMb) }}
              </td>
              <td class="table-cell text-right text-gray-500">
                {{ formatDate(usage.lastActivity) }}
              </td>
            </tr>
            <tr v-if="sortedTenantUsage.length === 0">
              <td colspan="6" class="table-cell text-center text-gray-500 py-8">
                No usage data for this period
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Cost Breakdown -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Estimated Costs</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p class="text-sm text-gray-500">Deepseek API (AI/OCR)</p>
          <p class="text-2xl font-bold text-gray-900">
            ${{ ((stats?.aiCalls || 0) * 0.0015).toFixed(2) }}
          </p>
          <p class="text-xs text-gray-400">~$0.0015 per call</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Supabase Storage</p>
          <p class="text-2xl font-bold text-gray-900">
            ${{ ((stats?.storageUsedGb || 0) * 0.021).toFixed(2) }}
          </p>
          <p class="text-xs text-gray-400">$0.021 per GB/month</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Infrastructure (est.)</p>
          <p class="text-2xl font-bold text-gray-900">
            ${{ (50 + (stats?.activeTenants || 0) * 2).toFixed(2) }}
          </p>
          <p class="text-xs text-gray-400">Base + per-tenant overhead</p>
        </div>
      </div>
    </div>
  </div>
</template>
