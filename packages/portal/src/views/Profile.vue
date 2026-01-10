<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { computed } from 'vue';
import PortalLayout from '@/components/PortalLayout.vue';
import { usePortalStore } from '@/stores/portal';

const portalStore = usePortalStore();

const loan = computed(() => portalStore.loanProgress);
const branding = computed(() => portalStore.branding);

function formatPhone(phone?: string) {
  if (!phone) return 'Not provided';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatCurrency(amount?: number) {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
</script>

<template>
  <PortalLayout>
    <div class="space-y-6 pb-20 md:pb-6 md:ml-64">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p class="text-gray-500">View your loan and contact information</p>
      </div>

      <!-- Borrower Information -->
      <div class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Borrower Information</h2>
        </div>
        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Full Name</p>
              <p class="font-medium text-gray-900">{{ loan?.borrowerName || 'Not available' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="font-medium text-gray-900">{{ loan?.borrowerEmail || 'Not available' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Phone</p>
              <p class="font-medium text-gray-900">{{ formatPhone(loan?.borrowerPhone) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loan Details -->
      <div class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Loan Details</h2>
        </div>
        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Loan Number</p>
              <p class="font-medium text-gray-900">{{ loan?.loanNumber || 'Not assigned' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Loan Type</p>
              <p class="font-medium text-gray-900">{{ loan?.loanType || 'Not specified' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Loan Purpose</p>
              <p class="font-medium text-gray-900 capitalize">{{ loan?.loanPurpose || 'Not specified' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Status</p>
              <span class="inline-flex px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                {{ loan?.statusLabel || 'Unknown' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Property Information -->
      <div v-if="loan?.propertyAddress" class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Property Information</h2>
        </div>
        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <p class="text-sm text-gray-500">Property Address</p>
              <p class="font-medium text-gray-900">{{ loan.propertyAddress }}</p>
            </div>
            <div v-if="loan.purchasePrice">
              <p class="text-sm text-gray-500">Purchase Price</p>
              <p class="font-medium text-gray-900">{{ formatCurrency(loan.purchasePrice) }}</p>
            </div>
            <div v-if="loan.loanAmount">
              <p class="text-sm text-gray-500">Loan Amount</p>
              <p class="font-medium text-gray-900">{{ formatCurrency(loan.loanAmount) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Important Dates -->
      <div class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Important Dates</h2>
        </div>
        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="loan?.applicationDate">
              <p class="text-sm text-gray-500">Application Date</p>
              <p class="font-medium text-gray-900">{{ loan.applicationDate }}</p>
            </div>
            <div v-if="loan?.estimatedCloseDate">
              <p class="text-sm text-gray-500">Estimated Close Date</p>
              <p class="font-medium text-gray-900">{{ loan.estimatedCloseDate }}</p>
            </div>
          </div>
          <div v-if="!loan?.applicationDate && !loan?.estimatedCloseDate" class="text-gray-500 text-sm">
            No dates have been set for your loan yet.
          </div>
        </div>
      </div>

      <!-- Your Loan Team -->
      <div class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Your Loan Team</h2>
        </div>
        <div class="p-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ loan?.mloName || branding?.companyName || 'Your Loan Officer' }}</p>
              <p v-if="loan?.mloNmls" class="text-sm text-gray-500">NMLS# {{ loan.mloNmls }}</p>
              <p v-if="loan?.mloEmail" class="text-sm text-gray-600 mt-1">{{ loan.mloEmail }}</p>
              <p v-if="loan?.mloPhone" class="text-sm text-gray-600">{{ formatPhone(loan.mloPhone) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Privacy Notice -->
      <div class="card p-6 bg-gray-50">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h3 class="font-medium text-gray-900 mb-1">Your Data is Protected</h3>
            <p class="text-sm text-gray-600">
              Your information is encrypted and securely stored. We only share your data with authorized
              parties involved in processing your loan. For questions about data privacy, please contact
              your loan officer.
            </p>
          </div>
        </div>
      </div>
    </div>
  </PortalLayout>
</template>

<style scoped>
.bg-primary-50 {
  background-color: var(--color-primary-50);
}

.text-primary-700 {
  color: var(--color-primary-700);
}
</style>
