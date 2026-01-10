<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminStore, type Tenant } from '@/stores/admin';

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();

const tenant = ref<Tenant | null>(null);
const editing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);

const editForm = ref({
  companyName: '',
  tier: 'basic' as 'basic' | 'professional' | 'enterprise',
  primaryColor: '#1976d2',
  subdomainSlug: '',
  isActive: true,
});

onMounted(async () => {
  await adminStore.fetchTenants();
  const found = adminStore.tenants.find(t => t.id === route.params.id);
  if (found) {
    tenant.value = found;
    editForm.value = {
      companyName: found.companyName,
      tier: found.tier,
      primaryColor: found.primaryColor,
      subdomainSlug: found.subdomainSlug || '',
      isActive: found.isActive,
    };
  }
});

async function saveChanges() {
  if (!tenant.value) return;

  saving.value = true;
  const success = await adminStore.updateTenant(tenant.value.id, editForm.value);

  if (success) {
    const updated = adminStore.tenants.find(t => t.id === tenant.value!.id);
    if (updated) {
      tenant.value = updated;
    }
    editing.value = false;
  }

  saving.value = false;
}

async function deleteTenant() {
  if (!tenant.value) return;

  deleting.value = true;
  const success = await adminStore.deleteTenant(tenant.value.id);

  if (success) {
    router.push('/tenants');
  }

  deleting.value = false;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
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

const portalUrl = computed(() => {
  if (!tenant.value) return '';
  if (tenant.value.customDomain) {
    return `https://${tenant.value.customDomain}`;
  }
  if (tenant.value.subdomainSlug) {
    return `https://portal-${tenant.value.subdomainSlug}.launchmaniac.com`;
  }
  return `https://portal.launchmaniac.com/${tenant.value.locationId}`;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Back Link -->
    <button @click="router.push('/tenants')" class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Tenants
    </button>

    <div v-if="tenant">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div class="flex items-center gap-4">
          <div
            class="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
            :style="{ backgroundColor: tenant.primaryColor }"
          >
            {{ tenant.companyName.charAt(0) }}
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ tenant.companyName }}</h1>
            <p class="text-gray-500">{{ tenant.locationId }}</p>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            v-if="!editing"
            @click="editing = true"
            class="btn-secondary"
          >
            Edit
          </button>
          <button
            v-if="!editing"
            @click="showDeleteConfirm = true"
            class="btn-danger"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stat-card">
          <p class="stat-value">{{ tenant.loansCount }}</p>
          <p class="stat-label">Total Loans</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ tenant.monthlyActiveUsers }}</p>
          <p class="stat-label">Monthly Active Users</p>
        </div>
        <div class="stat-card">
          <p class="stat-value capitalize">{{ tenant.tier }}</p>
          <p class="stat-label">Tier</p>
        </div>
        <div class="stat-card">
          <span :class="tenant.isActive ? 'badge-success' : 'badge-error'">
            {{ tenant.isActive ? 'Active' : 'Inactive' }}
          </span>
          <p class="stat-label mt-2">Status</p>
        </div>
      </div>

      <!-- Edit Form -->
      <div v-if="editing" class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Edit Tenant</h2>

        <form @submit.prevent="saveChanges" class="space-y-4 max-w-xl">
          <div>
            <label class="label">Company Name</label>
            <input v-model="editForm.companyName" type="text" class="input" required />
          </div>

          <div>
            <label class="label">Tier</label>
            <select v-model="editForm.tier" class="input">
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label class="label">Primary Color</label>
            <div class="flex gap-2">
              <input
                v-model="editForm.primaryColor"
                type="color"
                class="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                v-model="editForm.primaryColor"
                type="text"
                class="input flex-1"
              />
            </div>
          </div>

          <div v-if="editForm.tier !== 'basic'">
            <label class="label">Subdomain Slug</label>
            <div class="flex items-center gap-2">
              <span class="text-gray-500">portal-</span>
              <input v-model="editForm.subdomainSlug" type="text" class="input flex-1" placeholder="company" />
              <span class="text-gray-500">.launchmaniac.com</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <input
              v-model="editForm.isActive"
              type="checkbox"
              id="isActive"
              class="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
            />
            <label for="isActive" class="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="editing = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="saving" class="btn-primary disabled:opacity-50">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Details -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Basic Info -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-gray-500">Location ID</dt>
              <dd class="font-medium text-gray-900 font-mono">{{ tenant.locationId }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Tier</dt>
              <dd>
                <span :class="getTierBadgeClass(tenant.tier)" class="capitalize">
                  {{ tenant.tier }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Created</dt>
              <dd class="font-medium text-gray-900">{{ formatDate(tenant.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-sm text-gray-500">Primary Color</dt>
              <dd class="flex items-center gap-2">
                <div
                  class="w-6 h-6 rounded border border-gray-200"
                  :style="{ backgroundColor: tenant.primaryColor }"
                />
                <span class="font-mono text-sm">{{ tenant.primaryColor }}</span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Portal Access -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Portal Access</h2>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-gray-500">Portal URL</dt>
              <dd>
                <a :href="portalUrl" target="_blank" class="text-brand-600 hover:text-brand-700 font-medium">
                  {{ portalUrl }}
                </a>
              </dd>
            </div>
            <div v-if="tenant.customDomain">
              <dt class="text-sm text-gray-500">Custom Domain</dt>
              <dd class="flex items-center gap-2">
                <span class="font-medium text-gray-900">{{ tenant.customDomain }}</span>
                <span :class="tenant.domainVerified ? 'badge-success' : 'badge-warning'">
                  {{ tenant.domainVerified ? 'Verified' : 'Pending' }}
                </span>
              </dd>
            </div>
            <div v-if="tenant.customDomain">
              <dt class="text-sm text-gray-500">SSL Status</dt>
              <dd>
                <span :class="{
                  'badge-success': tenant.sslStatus === 'active',
                  'badge-warning': tenant.sslStatus === 'pending',
                  'badge-error': tenant.sslStatus === 'failed',
                }">
                  {{ tenant.sslStatus }}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-else class="text-center py-12">
      <p class="text-gray-500">Loading tenant...</p>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showDeleteConfirm = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Delete Tenant</h2>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{{ tenant?.companyName }}</strong>?
          This will remove all data associated with this tenant and cannot be undone.
        </p>
        <div class="flex gap-3">
          <button @click="showDeleteConfirm = false" class="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            @click="deleteTenant"
            :disabled="deleting"
            class="flex-1 btn-danger disabled:opacity-50"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
