<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { onMounted, computed } from 'vue';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();

onMounted(async () => {
  await adminStore.fetchTenants();
});

const tierCounts = computed(() => {
  const counts = { basic: 0, professional: 0, enterprise: 0 };
  adminStore.tenants.forEach(t => {
    if (t.isActive) {
      counts[t.tier]++;
    }
  });
  return counts;
});

const tierPricing = {
  basic: { monthly: 99, label: 'Basic' },
  professional: { monthly: 199, label: 'Professional' },
  enterprise: { monthly: 499, label: 'Enterprise' },
};

const estimatedMrr = computed(() => {
  return (
    tierCounts.value.basic * tierPricing.basic.monthly +
    tierCounts.value.professional * tierPricing.professional.monthly +
    tierCounts.value.enterprise * tierPricing.enterprise.monthly
  );
});

const recentInvoices = [
  { id: 'INV-001', tenant: 'ABC Mortgage', amount: 199, status: 'paid', date: '2024-01-15' },
  { id: 'INV-002', tenant: 'XYZ Lending', amount: 499, status: 'paid', date: '2024-01-15' },
  { id: 'INV-003', tenant: 'First Home Loans', amount: 99, status: 'pending', date: '2024-01-15' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Billing Overview</h1>
      <p class="text-gray-500">Revenue tracking and subscription management</p>
    </div>

    <!-- MRR Card -->
    <div class="card p-6 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-100">Estimated Monthly Recurring Revenue</p>
          <p class="text-4xl font-bold mt-2">{{ formatCurrency(estimatedMrr) }}</p>
          <p class="text-brand-200 text-sm mt-1">
            {{ adminStore.tenants.filter(t => t.isActive).length }} active subscriptions
          </p>
        </div>
        <div class="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Tier Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="stat-card">
        <div class="flex items-center justify-between mb-4">
          <span class="badge-gray">Basic</span>
          <span class="text-sm text-gray-500">{{ formatCurrency(tierPricing.basic.monthly) }}/mo</span>
        </div>
        <p class="stat-value">{{ tierCounts.basic }}</p>
        <p class="stat-label">Active Subscriptions</p>
        <p class="text-sm text-gray-500 mt-2">
          Revenue: {{ formatCurrency(tierCounts.basic * tierPricing.basic.monthly) }}/mo
        </p>
      </div>

      <div class="stat-card border-green-200">
        <div class="flex items-center justify-between mb-4">
          <span class="badge-success">Professional</span>
          <span class="text-sm text-gray-500">{{ formatCurrency(tierPricing.professional.monthly) }}/mo</span>
        </div>
        <p class="stat-value">{{ tierCounts.professional }}</p>
        <p class="stat-label">Active Subscriptions</p>
        <p class="text-sm text-gray-500 mt-2">
          Revenue: {{ formatCurrency(tierCounts.professional * tierPricing.professional.monthly) }}/mo
        </p>
      </div>

      <div class="stat-card border-blue-200">
        <div class="flex items-center justify-between mb-4">
          <span class="badge-info">Enterprise</span>
          <span class="text-sm text-gray-500">{{ formatCurrency(tierPricing.enterprise.monthly) }}/mo</span>
        </div>
        <p class="stat-value">{{ tierCounts.enterprise }}</p>
        <p class="stat-label">Active Subscriptions</p>
        <p class="text-sm text-gray-500 mt-2">
          Revenue: {{ formatCurrency(tierCounts.enterprise * tierPricing.enterprise.monthly) }}/mo
        </p>
      </div>
    </div>

    <!-- Recent Invoices -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Recent Invoices</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Invoice</th>
              <th class="table-header">Tenant</th>
              <th class="table-header text-right">Amount</th>
              <th class="table-header">Status</th>
              <th class="table-header">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="invoice in recentInvoices" :key="invoice.id" class="hover:bg-gray-50">
              <td class="table-cell font-mono text-sm">
                {{ invoice.id }}
              </td>
              <td class="table-cell font-medium text-gray-900">
                {{ invoice.tenant }}
              </td>
              <td class="table-cell text-right">
                {{ formatCurrency(invoice.amount) }}
              </td>
              <td class="table-cell">
                <span :class="invoice.status === 'paid' ? 'badge-success' : 'badge-warning'">
                  {{ invoice.status }}
                </span>
              </td>
              <td class="table-cell text-gray-500">
                {{ formatDate(invoice.date) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Billing Notes -->
    <div class="card p-6 bg-gray-50">
      <h3 class="font-medium text-gray-900 mb-3">Billing Configuration</h3>
      <ul class="space-y-2 text-sm text-gray-600">
        <li class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Billing is handled via GHL Marketplace subscriptions
        </li>
        <li class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Custom invoicing available for Enterprise tier
        </li>
        <li class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Revenue numbers are estimates based on active subscriptions
        </li>
      </ul>
    </div>
  </div>
</template>
