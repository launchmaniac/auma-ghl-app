<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();

onMounted(async () => {
  await Promise.all([
    adminStore.fetchUsageStats(),
    adminStore.fetchTenants(),
  ]);
});

const stats = computed(() => adminStore.usageStats);
const recentTenants = computed(() =>
  [...adminStore.tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
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
    year: 'numeric',
  });
}

function getTierBadgeClass(tier: string): string {
  switch (tier) {
    case 'enterprise':
      return 'badge-info';
    case 'professional':
      return 'badge-success';
    default:
      return 'badge-gray';
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-gray-500">Overview of AUMA platform metrics</p>
      </div>
      <RouterLink to="/tenants" class="btn-primary">
        Add Tenant
      </RouterLink>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.totalTenants || 0) }}</p>
            <p class="stat-label">Total Tenants</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <p class="stat-change-positive mt-2">{{ stats?.activeTenants || 0 }} active</p>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.totalLoans || 0) }}</p>
            <p class="stat-label">Total Loans</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <p class="stat-change-positive mt-2">{{ stats?.activeLoans || 0 }} in progress</p>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.documentsProcessed || 0) }}</p>
            <p class="stat-label">Documents Processed</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-2">Via Deepseek OCR</p>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="stat-value">{{ formatNumber(stats?.aiCalls || 0) }}</p>
            <p class="stat-label">AI Calls (30d)</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-2">{{ (stats?.storageUsedGb || 0).toFixed(1) }} GB storage</p>
      </div>
    </div>

    <!-- Recent Tenants -->
    <div class="card">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-900">Recent Tenants</h2>
          <RouterLink to="/tenants" class="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View All
          </RouterLink>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Company</th>
              <th class="table-header">Tier</th>
              <th class="table-header">Loans</th>
              <th class="table-header">Status</th>
              <th class="table-header">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="tenant in recentTenants" :key="tenant.id" class="hover:bg-gray-50">
              <td class="table-cell">
                <RouterLink :to="`/tenants/${tenant.id}`" class="font-medium text-gray-900 hover:text-brand-600">
                  {{ tenant.companyName }}
                </RouterLink>
                <p class="text-xs text-gray-500">{{ tenant.locationId }}</p>
              </td>
              <td class="table-cell">
                <span :class="getTierBadgeClass(tenant.tier)" class="capitalize">
                  {{ tenant.tier }}
                </span>
              </td>
              <td class="table-cell text-gray-500">
                {{ tenant.loansCount }}
              </td>
              <td class="table-cell">
                <span :class="tenant.isActive ? 'badge-success' : 'badge-error'">
                  {{ tenant.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="table-cell text-gray-500">
                {{ formatDate(tenant.createdAt) }}
              </td>
            </tr>
            <tr v-if="recentTenants.length === 0">
              <td colspan="5" class="table-cell text-center text-gray-500">
                No tenants yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <RouterLink to="/tenants" class="card p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">Add New Tenant</p>
            <p class="text-sm text-gray-500">Onboard a new mortgage company</p>
          </div>
        </div>
      </RouterLink>

      <RouterLink to="/domains" class="card p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">Manage Domains</p>
            <p class="text-sm text-gray-500">Provision custom domains</p>
          </div>
        </div>
      </RouterLink>

      <RouterLink to="/usage" class="card p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">View Usage</p>
            <p class="text-sm text-gray-500">Analytics per tenant</p>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
