<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();

const showCreateModal = ref(false);
const searchQuery = ref('');
const tierFilter = ref<string>('all');

const newTenant = ref({
  companyName: '',
  locationId: '',
  tier: 'basic' as 'basic' | 'professional' | 'enterprise',
  primaryColor: '#1976d2',
});

const creating = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  adminStore.fetchTenants();
});

const filteredTenants = computed(() => {
  return adminStore.tenants.filter(tenant => {
    const matchesSearch = tenant.companyName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tenant.locationId.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesTier = tierFilter.value === 'all' || tenant.tier === tierFilter.value;
    return matchesSearch && matchesTier;
  });
});

async function createTenant() {
  if (!newTenant.value.companyName || !newTenant.value.locationId) {
    error.value = 'Company name and Location ID are required';
    return;
  }

  creating.value = true;
  error.value = null;

  const result = await adminStore.createTenant(newTenant.value);

  if (result) {
    showCreateModal.value = false;
    newTenant.value = {
      companyName: '',
      locationId: '',
      tier: 'basic',
      primaryColor: '#1976d2',
    };
  } else {
    error.value = 'Failed to create tenant. Please try again.';
  }

  creating.value = false;
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
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tenant Management</h1>
        <p class="text-gray-500">Manage GHL location installations</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">
        Add Tenant
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by company or location ID..."
            class="input"
          />
        </div>
        <div class="sm:w-48">
          <select v-model="tierFilter" class="input">
            <option value="all">All Tiers</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tenants Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Company</th>
              <th class="table-header">Tier</th>
              <th class="table-header">Domain</th>
              <th class="table-header">Loans</th>
              <th class="table-header">MAU</th>
              <th class="table-header">Status</th>
              <th class="table-header">Created</th>
              <th class="table-header"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="tenant in filteredTenants" :key="tenant.id" class="hover:bg-gray-50">
              <td class="table-cell">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                    :style="{ backgroundColor: tenant.primaryColor }"
                  >
                    {{ tenant.companyName.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ tenant.companyName }}</p>
                    <p class="text-xs text-gray-500">{{ tenant.locationId }}</p>
                  </div>
                </div>
              </td>
              <td class="table-cell">
                <span :class="getTierBadgeClass(tenant.tier)" class="capitalize">
                  {{ tenant.tier }}
                </span>
              </td>
              <td class="table-cell">
                <div v-if="tenant.customDomain">
                  <p class="text-sm text-gray-900">{{ tenant.customDomain }}</p>
                  <span :class="tenant.domainVerified ? 'badge-success' : 'badge-warning'" class="text-xs">
                    {{ tenant.domainVerified ? 'Verified' : 'Pending' }}
                  </span>
                </div>
                <div v-else-if="tenant.subdomainSlug">
                  <p class="text-sm text-gray-500">portal-{{ tenant.subdomainSlug }}.launchmaniac.com</p>
                </div>
                <span v-else class="text-sm text-gray-400">Default</span>
              </td>
              <td class="table-cell text-gray-500">
                {{ tenant.loansCount }}
              </td>
              <td class="table-cell text-gray-500">
                {{ tenant.monthlyActiveUsers }}
              </td>
              <td class="table-cell">
                <span :class="tenant.isActive ? 'badge-success' : 'badge-error'">
                  {{ tenant.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="table-cell text-gray-500">
                {{ formatDate(tenant.createdAt) }}
              </td>
              <td class="table-cell">
                <RouterLink
                  :to="`/tenants/${tenant.id}`"
                  class="text-brand-600 hover:text-brand-700 font-medium text-sm"
                >
                  View
                </RouterLink>
              </td>
            </tr>
            <tr v-if="filteredTenants.length === 0">
              <td colspan="8" class="table-cell text-center text-gray-500 py-8">
                <p v-if="searchQuery || tierFilter !== 'all'">No tenants match your filters</p>
                <p v-else>No tenants yet. Add your first tenant to get started.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showCreateModal = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Add New Tenant</h2>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="createTenant" class="space-y-4">
          <div>
            <label class="label">Company Name</label>
            <input
              v-model="newTenant.companyName"
              type="text"
              class="input"
              placeholder="ABC Mortgage Company"
              required
            />
          </div>

          <div>
            <label class="label">GHL Location ID</label>
            <input
              v-model="newTenant.locationId"
              type="text"
              class="input"
              placeholder="abc123xyz"
              required
            />
            <p class="text-xs text-gray-500 mt-1">From GHL installation webhook</p>
          </div>

          <div>
            <label class="label">Tier</label>
            <select v-model="newTenant.tier" class="input">
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label class="label">Primary Color</label>
            <div class="flex gap-2">
              <input
                v-model="newTenant.primaryColor"
                type="color"
                class="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                v-model="newTenant.primaryColor"
                type="text"
                class="input flex-1"
                placeholder="#1976d2"
              />
            </div>
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ error }}
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showCreateModal = false"
              class="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="flex-1 btn-primary disabled:opacity-50"
            >
              {{ creating ? 'Creating...' : 'Create Tenant' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
