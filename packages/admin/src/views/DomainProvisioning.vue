<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, computed } from 'vue';
import { useAdminStore, type DomainRequest } from '@/stores/admin';

const adminStore = useAdminStore();

const showProvisionModal = ref(false);
const selectedTenantId = ref('');
const newDomain = ref('');
const provisioning = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([
    adminStore.fetchDomainRequests(),
    adminStore.fetchTenants(),
  ]);
});

const enterpriseTenants = computed(() =>
  adminStore.tenants.filter(t => t.tier === 'enterprise' && !t.customDomain)
);

async function provisionDomain() {
  if (!selectedTenantId.value || !newDomain.value) {
    error.value = 'Please select a tenant and enter a domain';
    return;
  }

  provisioning.value = true;
  error.value = null;

  const result = await adminStore.provisionDomain(selectedTenantId.value, newDomain.value);

  if (result) {
    showProvisionModal.value = false;
    selectedTenantId.value = '';
    newDomain.value = '';
  } else {
    error.value = 'Failed to provision domain. Please try again.';
  }

  provisioning.value = false;
}

async function verifyDomain(request: DomainRequest) {
  await adminStore.verifyDomain(request.id);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'verified':
      return 'badge-success';
    case 'dns_pending':
      return 'badge-warning';
    case 'failed':
      return 'badge-error';
    default:
      return 'badge-gray';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'dns_pending':
      return 'DNS Pending';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Domain Provisioning</h1>
        <p class="text-gray-500">Manage custom domains for Enterprise tenants</p>
      </div>
      <button
        @click="showProvisionModal = true"
        :disabled="enterpriseTenants.length === 0"
        class="btn-primary disabled:opacity-50"
      >
        Provision Domain
      </button>
    </div>

    <!-- Info Box -->
    <div class="card p-6 bg-blue-50 border-blue-200">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-medium text-blue-900">Domain Setup Process</p>
          <ol class="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
            <li>Provision domain through this admin panel</li>
            <li>System generates DNS records via Cloudflare for Customers</li>
            <li>Client adds CNAME and TXT records to their registrar</li>
            <li>System verifies DNS and provisions SSL certificate</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Domain Requests Table -->
    <div class="card overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Domain Requests</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Company</th>
              <th class="table-header">Domain</th>
              <th class="table-header">Status</th>
              <th class="table-header">Created</th>
              <th class="table-header">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="request in adminStore.domainRequests" :key="request.id" class="hover:bg-gray-50">
              <td class="table-cell font-medium text-gray-900">
                {{ request.companyName }}
              </td>
              <td class="table-cell">
                <span class="font-mono text-sm">{{ request.requestedDomain }}</span>
              </td>
              <td class="table-cell">
                <span :class="getStatusBadgeClass(request.status)">
                  {{ getStatusLabel(request.status) }}
                </span>
              </td>
              <td class="table-cell text-gray-500">
                {{ formatDate(request.createdAt) }}
              </td>
              <td class="table-cell">
                <button
                  v-if="request.status === 'dns_pending'"
                  @click="verifyDomain(request)"
                  class="text-brand-600 hover:text-brand-700 font-medium text-sm"
                >
                  Verify DNS
                </button>
                <span v-else-if="request.status === 'verified'" class="text-green-600 text-sm">
                  Complete
                </span>
              </td>
            </tr>
            <tr v-if="adminStore.domainRequests.length === 0">
              <td colspan="5" class="table-cell text-center text-gray-500 py-8">
                No domain requests yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- DNS Records Example -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Required DNS Records</h2>
      <p class="text-gray-600 mb-4">
        After provisioning, provide these records to the client:
      </p>
      <div class="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-2">
        <div class="flex gap-4">
          <span class="text-gray-500 w-16">CNAME</span>
          <span class="text-gray-900">portal</span>
          <span class="text-gray-500">-></span>
          <span class="text-gray-900">portal-proxy.launchmaniac.com</span>
        </div>
        <div class="flex gap-4">
          <span class="text-gray-500 w-16">TXT</span>
          <span class="text-gray-900">_auma-verify</span>
          <span class="text-gray-500">-></span>
          <span class="text-gray-900">[verification_token]</span>
        </div>
      </div>
    </div>

    <!-- Provision Modal -->
    <div
      v-if="showProvisionModal"
      class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showProvisionModal = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Provision Custom Domain</h2>
          <button @click="showProvisionModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="provisionDomain" class="space-y-4">
          <div>
            <label class="label">Enterprise Tenant</label>
            <select v-model="selectedTenantId" class="input" required>
              <option value="">Select tenant...</option>
              <option v-for="tenant in enterpriseTenants" :key="tenant.id" :value="tenant.id">
                {{ tenant.companyName }}
              </option>
            </select>
          </div>

          <div>
            <label class="label">Custom Domain</label>
            <input
              v-model="newDomain"
              type="text"
              class="input"
              placeholder="portal.clientdomain.com"
              required
            />
            <p class="text-xs text-gray-500 mt-1">Full domain including subdomain</p>
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ error }}
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="showProvisionModal = false" class="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="provisioning" class="flex-1 btn-primary disabled:opacity-50">
              {{ provisioning ? 'Provisioning...' : 'Provision' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
