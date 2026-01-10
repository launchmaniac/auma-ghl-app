<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import PortalLayout from '@/components/PortalLayout.vue';
import { usePortalStore } from '@/stores/portal';

const portalStore = usePortalStore();

onMounted(() => {
  portalStore.fetchConditions();
});

const pendingConditions = computed(() =>
  portalStore.conditions.filter(c => c.status === 'pending')
);

const satisfiedConditions = computed(() =>
  portalStore.conditions.filter(c => c.status === 'satisfied')
);

function formatDate(dateString?: string) {
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function getDaysRemaining(dueDate?: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
</script>

<template>
  <PortalLayout>
    <div class="space-y-6 pb-20 md:pb-6 md:ml-64">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Loan Conditions</h1>
        <p class="text-gray-500">Items needed to complete your loan</p>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-2 gap-4">
        <div class="card p-4 text-center">
          <p class="text-3xl font-bold text-orange-600">{{ pendingConditions.length }}</p>
          <p class="text-sm text-gray-500">Outstanding</p>
        </div>
        <div class="card p-4 text-center">
          <p class="text-3xl font-bold text-green-600">{{ satisfiedConditions.length }}</p>
          <p class="text-sm text-gray-500">Satisfied</p>
        </div>
      </div>

      <!-- Pending Conditions -->
      <div v-if="pendingConditions.length > 0" class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Outstanding Conditions</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="condition in pendingConditions"
            :key="condition.id"
            class="p-4"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">{{ condition.type }}</span>
                  <span
                    v-if="isOverdue(condition.dueDate)"
                    class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"
                  >
                    Overdue
                  </span>
                  <span
                    v-else-if="getDaysRemaining(condition.dueDate) !== null && getDaysRemaining(condition.dueDate)! <= 3"
                    class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full"
                  >
                    Due Soon
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ condition.description }}</p>
                <p class="text-xs text-gray-400 mt-2">
                  <span v-if="condition.dueDate">
                    Due: {{ formatDate(condition.dueDate) }}
                    <span v-if="getDaysRemaining(condition.dueDate) !== null && getDaysRemaining(condition.dueDate)! > 0" class="text-gray-500">
                      ({{ getDaysRemaining(condition.dueDate) }} days remaining)
                    </span>
                  </span>
                  <span v-else>No due date set</span>
                </p>
              </div>
              <div class="ml-4">
                <RouterLink
                  to="/documents"
                  class="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Upload
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Pending Conditions -->
      <div v-else class="card p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
        <p class="text-gray-500">You have no outstanding conditions at this time.</p>
      </div>

      <!-- Satisfied Conditions -->
      <div v-if="satisfiedConditions.length > 0" class="card">
        <div class="p-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-900">Satisfied Conditions</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="condition in satisfiedConditions"
            :key="condition.id"
            class="p-4"
          >
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ condition.type }}</p>
                <p class="text-sm text-gray-500">{{ condition.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="card p-6">
        <h3 class="font-semibold text-gray-900 mb-3">Need Help?</h3>
        <p class="text-sm text-gray-600 mb-4">
          If you have questions about any condition or need clarification on what to provide,
          don't hesitate to reach out.
        </p>
        <RouterLink to="/messages" class="btn-secondary inline-block">
          Send a Message
        </RouterLink>
      </div>
    </div>
  </PortalLayout>
</template>

<style scoped>
.text-primary-600 {
  color: var(--color-primary);
}

.text-primary-700 {
  color: var(--color-primary-700);
}
</style>
