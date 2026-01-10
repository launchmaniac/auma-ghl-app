<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useLoansStore } from '@/stores/loans';
import { useAuthStore } from '@/stores/auth';
import type { LoanStatus } from '@auma/shared';

// Local type for income calculation display
interface IncomeCalcDisplay {
  id: string;
  incomeType: string;
  methodology: string;
  monthlyIncome: number;
  confidence: number;
}

const route = useRoute();
const loansStore = useLoansStore();
const authStore = useAuthStore();

const activeTab = ref<'overview' | 'documents' | 'income' | 'timeline'>('overview');
const documents = ref<any[]>([]);
const loadingDocuments = ref(false);

const loanId = computed(() => route.params.id as string);

onMounted(async () => {
  await loansStore.fetchLoan(loanId.value);
  await fetchDocuments();
});

async function fetchDocuments() {
  loadingDocuments.value = true;
  try {
    const response = await fetch(`/api/documents/loans/${loanId.value}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      documents.value = data.documents;
    }
  } finally {
    loadingDocuments.value = false;
  }
}

const loan = computed(() => loansStore.currentLoan);

const statusSteps: { status: LoanStatus; label: string }[] = [
  { status: 'lead', label: 'Lead' },
  { status: 'initial_call', label: 'Initial Call' },
  { status: 'app_in', label: 'App In' },
  { status: 'post_app_call', label: 'Post-App Call' },
  { status: 'notes_to_lo', label: 'Notes to LO' },
  { status: 'pre_approval_prep', label: 'Pre-Approval' },
  { status: 'in_contract', label: 'In Contract' },
  { status: 'pipeline_mgmt', label: 'Processing' },
  { status: 'final_approval', label: 'Final Approval' },
  { status: 'post_closing', label: 'Closed' },
];

const currentStepIndex = computed(() => {
  if (!loan.value) return -1;
  if (loan.value.status === 'denied') return -1;
  return statusSteps.findIndex(s => s.status === loan.value!.status);
});

function getStepStatus(index: number): 'completed' | 'current' | 'upcoming' {
  if (index < currentStepIndex.value) return 'completed';
  if (index === currentStepIndex.value) return 'current';
  return 'upcoming';
}

async function updateStatus(newStatus: LoanStatus) {
  if (!loan.value) return;
  await loansStore.updateStatus(loan.value.id, newStatus);
}
</script>

<template>
  <div v-if="loansStore.loading" class="text-center py-8">
    Loading loan details...
  </div>

  <div v-else-if="!loan" class="text-center py-8 text-red-500">
    Loan not found
  </div>

  <div v-else>
    <!-- Header -->
    <div class="flex justify-between items-start mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ loan.loanNumber }}</h1>
        <p class="text-gray-500">{{ loan.propertyAddress }}</p>
      </div>
      <div class="flex gap-2">
        <select
          :value="loan.status"
          @change="updateStatus(($event.target as HTMLSelectElement).value as LoanStatus)"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option v-for="step in statusSteps" :key="step.status" :value="step.status">
            {{ step.label }}
          </option>
          <option value="denied">Denied</option>
        </select>
      </div>
    </div>

    <!-- Progress Tracker -->
    <div class="bg-white rounded-lg shadow p-6 mb-6" v-if="loan.status !== 'denied'">
      <div class="flex justify-between relative">
        <div class="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        <div
          v-for="(step, index) in statusSteps"
          :key="step.status"
          class="relative z-10 flex flex-col items-center"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
            :class="{
              'bg-green-500 text-white': getStepStatus(index) === 'completed',
              'bg-blue-500 text-white ring-4 ring-blue-200': getStepStatus(index) === 'current',
              'bg-gray-200 text-gray-500': getStepStatus(index) === 'upcoming',
            }"
          >
            {{ index + 1 }}
          </div>
          <span class="mt-2 text-xs text-gray-500 text-center max-w-16">{{ step.label }}</span>
        </div>
      </div>
    </div>

    <!-- Denied Alert -->
    <div v-if="loan.status === 'denied'" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-red-800 font-medium">This loan has been denied</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex -mb-px">
        <button
          v-for="tab in ['overview', 'documents', 'income', 'timeline']"
          :key="tab"
          @click="activeTab = tab as any"
          class="px-6 py-3 border-b-2 font-medium text-sm capitalize"
          :class="{
            'border-primary-500 text-primary-600': activeTab === tab,
            'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== tab,
          }"
        >
          {{ tab }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Borrower Info -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Primary Borrower</h3>
        <div v-if="loan.borrowers?.[0]" class="space-y-3">
          <div>
            <span class="text-sm text-gray-500">Name</span>
            <p class="font-medium">{{ loan.borrowers[0].firstName }} {{ loan.borrowers[0].lastName }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">Email</span>
            <p class="font-medium">{{ loan.borrowers[0].email }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">Phone</span>
            <p class="font-medium">{{ loan.borrowers[0].phone || 'Not provided' }}</p>
          </div>
        </div>
      </div>

      <!-- Loan Info -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
        <div class="space-y-3">
          <div>
            <span class="text-sm text-gray-500">Purpose</span>
            <p class="font-medium capitalize">{{ loan.loanPurpose?.replace(/_/g, ' ') || 'Not specified' }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">Loan Type</span>
            <p class="font-medium capitalize">{{ loan.loanType?.replace(/_/g, ' ') || 'Not specified' }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-500">Est. Close Date</span>
            <p class="font-medium">{{ loan.estimatedCloseDate || 'TBD' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Documents Tab -->
    <div v-else-if="activeTab === 'documents'" class="bg-white rounded-lg shadow">
      <div class="p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Documents</h3>
      </div>
      <div v-if="loadingDocuments" class="p-8 text-center text-gray-500">
        Loading documents...
      </div>
      <div v-else-if="documents.length === 0" class="p-8 text-center text-gray-500">
        No documents uploaded yet.
      </div>
      <div v-else class="divide-y">
        <div v-for="doc in documents" :key="doc.id" class="p-4 flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">{{ doc.original_file_name }}</p>
            <p class="text-sm text-gray-500 capitalize">{{ doc.document_type?.replace(/_/g, ' ') }}</p>
          </div>
          <div class="flex items-center gap-4">
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="{
                'bg-green-100 text-green-800': doc.ocr_status === 'completed',
                'bg-yellow-100 text-yellow-800': doc.ocr_status === 'processing',
                'bg-gray-100 text-gray-800': doc.ocr_status === 'pending',
                'bg-red-100 text-red-800': doc.ocr_status === 'failed',
              }"
            >
              {{ doc.ocr_status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Income Tab -->
    <div v-else-if="activeTab === 'income'" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Income Calculations</h3>
      <div v-if="loan.incomeCalculations?.length">
        <div v-for="calc in (loan.incomeCalculations as IncomeCalcDisplay[])" :key="calc.id" class="border-b py-4 last:border-0">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-medium capitalize">{{ calc.incomeType?.replace(/_/g, ' ') }}</p>
              <p class="text-sm text-gray-500">{{ calc.methodology }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-lg">${{ calc.monthlyIncome?.toLocaleString() }}/mo</p>
              <p class="text-sm text-gray-500">Confidence: {{ (calc.confidence * 100).toFixed(0) }}%</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-gray-500">
        No income calculations available yet.
      </div>
    </div>

    <!-- Timeline Tab -->
    <div v-else-if="activeTab === 'timeline'" class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
      <p class="text-gray-500">Timeline view coming soon...</p>
    </div>
  </div>
</template>
