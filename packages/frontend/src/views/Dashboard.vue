<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { onMounted, computed } from 'vue';
import { useLoansStore } from '@/stores/loans';

const loansStore = useLoansStore();

onMounted(() => {
  loansStore.fetchLoans();
});

const stats = computed(() => {
  const loans = loansStore.loans;
  return {
    total: loans.length,
    inProgress: loans.filter(l => !['post_closing', 'denied'].includes(l.status)).length,
    closed: loans.filter(l => l.status === 'post_closing').length,
    denied: loans.filter(l => l.status === 'denied').length,
  };
});

const pipelineSummary = computed(() => {
  const stages = [
    { key: 'lead', label: 'Leads' },
    { key: 'app_in', label: 'Applications' },
    { key: 'pre_approval_prep', label: 'Pre-Approval' },
    { key: 'in_contract', label: 'In Contract' },
    { key: 'pipeline_mgmt', label: 'Processing' },
    { key: 'final_approval', label: 'Closing' },
  ];

  return stages.map(stage => ({
    ...stage,
    count: loansStore.loansByStatus[stage.key as keyof typeof loansStore.loansByStatus]?.length || 0,
  }));
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-sm text-gray-500">Total Loans</p>
        <p class="text-3xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-sm text-gray-500">In Progress</p>
        <p class="text-3xl font-bold text-blue-600">{{ stats.inProgress }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-sm text-gray-500">Closed</p>
        <p class="text-3xl font-bold text-green-600">{{ stats.closed }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-sm text-gray-500">Denied</p>
        <p class="text-3xl font-bold text-red-600">{{ stats.denied }}</p>
      </div>
    </div>

    <!-- Pipeline Summary -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
      <div class="flex justify-between">
        <div
          v-for="stage in pipelineSummary"
          :key="stage.key"
          class="text-center flex-1"
        >
          <div class="text-2xl font-bold text-gray-900">{{ stage.count }}</div>
          <div class="text-sm text-gray-500">{{ stage.label }}</div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Loans</h2>
      <div v-if="loansStore.loading" class="text-gray-500">Loading...</div>
      <div v-else-if="loansStore.loans.length === 0" class="text-gray-500">
        No loans found. Loans will appear here once created.
      </div>
      <div v-else class="space-y-4">
        <RouterLink
          v-for="loan in loansStore.loans.slice(0, 5)"
          :key="loan.id"
          :to="`/loans/${loan.id}`"
          class="block p-4 border rounded-lg hover:bg-gray-50"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="font-medium text-gray-900">{{ loan.loanNumber }}</p>
              <p class="text-sm text-gray-500">{{ loan.propertyAddress }}</p>
            </div>
            <span
              class="px-3 py-1 rounded-full text-sm"
              :class="{
                'bg-blue-100 text-blue-800': loan.status === 'lead',
                'bg-yellow-100 text-yellow-800': ['app_in', 'post_app_call'].includes(loan.status),
                'bg-purple-100 text-purple-800': ['pre_approval_prep', 'in_contract'].includes(loan.status),
                'bg-green-100 text-green-800': loan.status === 'post_closing',
                'bg-red-100 text-red-800': loan.status === 'denied',
              }"
            >
              {{ loan.status.replace(/_/g, ' ') }}
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
