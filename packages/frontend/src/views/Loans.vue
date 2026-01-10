<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, watch } from 'vue';
import { useLoansStore } from '@/stores/loans';
import type { LoanStatus } from '@auma/shared';

const loansStore = useLoansStore();
const searchQuery = ref('');
const selectedStatus = ref<LoanStatus | ''>('');

const statusOptions: { value: LoanStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'lead', label: 'Lead' },
  { value: 'initial_call', label: 'Initial Call' },
  { value: 'app_in', label: 'App In' },
  { value: 'post_app_call', label: 'Post-App Call' },
  { value: 'notes_to_lo', label: 'Notes to LO' },
  { value: 'pre_approval_prep', label: 'Pre-Approval Prep' },
  { value: 'in_contract', label: 'In Contract' },
  { value: 'pipeline_mgmt', label: 'Pipeline Mgmt' },
  { value: 'final_approval', label: 'Final Approval' },
  { value: 'post_closing', label: 'Post Closing' },
  { value: 'denied', label: 'Denied' },
];

onMounted(() => {
  loansStore.fetchLoans();
});

watch([searchQuery, selectedStatus], () => {
  loansStore.fetchLoans({
    search: searchQuery.value || undefined,
    status: selectedStatus.value || undefined,
  });
}, { debounce: 300 } as any);

function getStatusColor(status: LoanStatus): string {
  const colors: Record<LoanStatus, string> = {
    lead: 'bg-blue-100 text-blue-800',
    initial_call: 'bg-blue-100 text-blue-800',
    app_in: 'bg-yellow-100 text-yellow-800',
    post_app_call: 'bg-yellow-100 text-yellow-800',
    notes_to_lo: 'bg-orange-100 text-orange-800',
    pre_approval_prep: 'bg-purple-100 text-purple-800',
    in_contract: 'bg-purple-100 text-purple-800',
    pipeline_mgmt: 'bg-indigo-100 text-indigo-800',
    final_approval: 'bg-green-100 text-green-800',
    post_closing: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Loans</h1>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by loan number or address..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          v-model="selectedStatus"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loans Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loansStore.loading" class="p-8 text-center text-gray-500">
        Loading loans...
      </div>
      <div v-else-if="loansStore.error" class="p-8 text-center text-red-500">
        {{ loansStore.error }}
      </div>
      <div v-else-if="loansStore.loans.length === 0" class="p-8 text-center text-gray-500">
        No loans found matching your criteria.
      </div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Loan Number
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Borrower
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Property
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <RouterLink
            v-for="loan in loansStore.loans"
            :key="loan.id"
            :to="`/loans/${loan.id}`"
            custom
            v-slot="{ navigate }"
          >
            <tr @click="navigate" class="hover:bg-gray-50 cursor-pointer">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ loan.loanNumber }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ loan.borrowers?.[0]?.firstName }} {{ loan.borrowers?.[0]?.lastName }}
                </div>
                <div class="text-sm text-gray-500">{{ loan.borrowers?.[0]?.email }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 max-w-xs truncate">{{ loan.propertyAddress }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                  :class="getStatusColor(loan.status)"
                >
                  {{ loan.status.replace(/_/g, ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(loan.createdAt) }}
              </td>
            </tr>
          </RouterLink>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="loansStore.pagination.total > loansStore.pagination.limit" class="mt-4 flex justify-between items-center">
      <div class="text-sm text-gray-500">
        Showing {{ loansStore.pagination.offset + 1 }} to
        {{ Math.min(loansStore.pagination.offset + loansStore.pagination.limit, loansStore.pagination.total) }}
        of {{ loansStore.pagination.total }} loans
      </div>
      <div class="flex gap-2">
        <button
          :disabled="loansStore.pagination.offset === 0"
          @click="loansStore.pagination.offset -= loansStore.pagination.limit; loansStore.fetchLoans()"
          class="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          :disabled="loansStore.pagination.offset + loansStore.pagination.limit >= loansStore.pagination.total"
          @click="loansStore.pagination.offset += loansStore.pagination.limit; loansStore.fetchLoans()"
          class="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
