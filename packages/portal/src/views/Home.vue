<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import PortalLayout from '@/components/PortalLayout.vue';
import { usePortalStore } from '@/stores/portal';

const portalStore = usePortalStore();

const loan = computed(() => portalStore.loanProgress);
const pendingConditions = computed(() =>
  portalStore.conditions.filter(c => c.status === 'pending').length
);
const pendingDocuments = computed(() =>
  portalStore.documents.filter(d => d.status === 'pending' || d.validationStatus === 'needs_review').length
);
</script>

<template>
  <PortalLayout>
    <div class="space-y-6 pb-20 md:pb-6 md:ml-64">
      <!-- Loan Overview Card -->
      <div class="card p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Your Loan</h2>
            <p class="text-sm text-gray-500">{{ loan?.loanNumber }}</p>
          </div>
          <span class="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
            {{ loan?.statusLabel }}
          </span>
        </div>

        <div v-if="loan?.propertyAddress" class="mb-4">
          <p class="text-sm text-gray-500">Property</p>
          <p class="font-medium">{{ loan.propertyAddress }}</p>
        </div>

        <div v-if="loan?.estimatedCloseDate" class="flex items-center gap-2 text-sm">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-gray-600">Est. Close: {{ loan.estimatedCloseDate }}</span>
        </div>
      </div>

      <!-- Progress Tracker -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-6">Loan Progress</h3>

        <div v-if="loan?.milestones" class="relative">
          <!-- Progress Line -->
          <div class="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />

          <!-- Steps -->
          <div class="relative flex justify-between">
            <div
              v-for="milestone in loan.milestones"
              :key="milestone.step"
              class="progress-step"
            >
              <div
                class="progress-step-circle"
                :class="{
                  'progress-step-completed': milestone.status === 'completed',
                  'progress-step-current': milestone.status === 'current',
                  'progress-step-pending': milestone.status === 'pending',
                }"
              >
                <svg
                  v-if="milestone.status === 'completed'"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else>{{ milestone.step }}</span>
              </div>
              <span class="mt-2 text-xs text-center text-gray-500 max-w-16">
                {{ milestone.label }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-4">
        <RouterLink to="/documents" class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Documents</p>
              <p class="text-sm text-gray-500">
                {{ portalStore.documents.length }} uploaded
              </p>
            </div>
          </div>
          <div v-if="pendingDocuments > 0" class="mt-2">
            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              {{ pendingDocuments }} need attention
            </span>
          </div>
        </RouterLink>

        <RouterLink to="/conditions" class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Conditions</p>
              <p class="text-sm text-gray-500">
                {{ portalStore.conditions.length }} total
              </p>
            </div>
          </div>
          <div v-if="pendingConditions > 0" class="mt-2">
            <span class="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
              {{ pendingConditions }} outstanding
            </span>
          </div>
        </RouterLink>
      </div>

      <!-- Recent Activity / Next Steps -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">What's Next</h3>
        <div class="space-y-3">
          <div v-if="pendingDocuments > 0" class="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="font-medium text-yellow-800">Documents Need Review</p>
              <p class="text-sm text-yellow-700">
                {{ pendingDocuments }} document(s) require your attention.
              </p>
              <RouterLink to="/documents" class="text-sm font-medium text-yellow-800 underline mt-1 inline-block">
                View Documents
              </RouterLink>
            </div>
          </div>

          <div v-if="pendingConditions > 0" class="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <svg class="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-medium text-orange-800">Outstanding Conditions</p>
              <p class="text-sm text-orange-700">
                {{ pendingConditions }} condition(s) need to be satisfied.
              </p>
              <RouterLink to="/conditions" class="text-sm font-medium text-orange-800 underline mt-1 inline-block">
                View Conditions
              </RouterLink>
            </div>
          </div>

          <div v-if="pendingDocuments === 0 && pendingConditions === 0" class="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-medium text-green-800">All Caught Up</p>
              <p class="text-sm text-green-700">
                No immediate action items. Your loan is progressing smoothly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <p class="text-gray-600 text-sm mb-4">
          Have questions about your loan? Send us a message and we'll get back to you.
        </p>
        <RouterLink to="/messages" class="btn-primary inline-block">
          Send a Message
        </RouterLink>
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
