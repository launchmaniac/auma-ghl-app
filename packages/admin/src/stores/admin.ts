// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'viewer';
}

export interface Tenant {
  id: string;
  locationId: string;
  companyName: string;
  tier: 'basic' | 'professional' | 'enterprise';
  subdomainSlug?: string;
  customDomain?: string;
  domainVerified: boolean;
  sslStatus: 'pending' | 'active' | 'failed';
  primaryColor: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  loansCount: number;
  monthlyActiveUsers: number;
}

export interface DomainRequest {
  id: string;
  tenantId: string;
  companyName: string;
  requestedDomain: string;
  status: 'pending' | 'dns_pending' | 'verified' | 'failed';
  createdAt: string;
  dnsRecords?: {
    type: string;
    name: string;
    value: string;
  }[];
}

export interface UsageStats {
  totalTenants: number;
  activeTenants: number;
  totalLoans: number;
  activeLoans: number;
  documentsProcessed: number;
  aiCalls: number;
  storageUsedGb: number;
}

export interface TenantUsage {
  tenantId: string;
  companyName: string;
  loansProcessed: number;
  documentsUploaded: number;
  aiCalls: number;
  storageUsedMb: number;
  lastActivity: string;
}

export const useAdminStore = defineStore('admin', () => {
  const user = ref<AdminUser | null>(null);
  const tenants = ref<Tenant[]>([]);
  const domainRequests = ref<DomainRequest[]>([]);
  const usageStats = ref<UsageStats | null>(null);
  const tenantUsage = ref<TenantUsage[]>([]);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin');

  async function checkAuth(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (response.ok) {
        user.value = await response.json();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        user.value = await response.json();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function logout(): Promise<void> {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    user.value = null;
  }

  async function fetchTenants(): Promise<void> {
    loading.value = true;
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        tenants.value = await response.json();
      }
    } finally {
      loading.value = false;
    }
  }

  async function createTenant(data: Partial<Tenant>): Promise<Tenant | null> {
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const tenant = await response.json();
        tenants.value.push(tenant);
        return tenant;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function updateTenant(id: string, data: Partial<Tenant>): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updated = await response.json();
        const index = tenants.value.findIndex(t => t.id === id);
        if (index !== -1) {
          tenants.value[index] = updated;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function deleteTenant(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/tenants/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        tenants.value = tenants.value.filter(t => t.id !== id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function fetchDomainRequests(): Promise<void> {
    loading.value = true;
    try {
      const response = await fetch('/api/admin/domains');
      if (response.ok) {
        domainRequests.value = await response.json();
      }
    } finally {
      loading.value = false;
    }
  }

  async function provisionDomain(tenantId: string, domain: string): Promise<DomainRequest | null> {
    try {
      const response = await fetch('/api/admin/domains/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, domain }),
      });

      if (response.ok) {
        const request = await response.json();
        domainRequests.value.push(request);
        return request;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function verifyDomain(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/domains/${requestId}/verify`, {
        method: 'POST',
      });

      if (response.ok) {
        const updated = await response.json();
        const index = domainRequests.value.findIndex(r => r.id === requestId);
        if (index !== -1) {
          domainRequests.value[index] = updated;
        }
        return updated.status === 'verified';
      }
      return false;
    } catch {
      return false;
    }
  }

  async function fetchUsageStats(): Promise<void> {
    loading.value = true;
    try {
      const response = await fetch('/api/admin/usage/stats');
      if (response.ok) {
        usageStats.value = await response.json();
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchTenantUsage(dateRange?: { start: string; end: string }): Promise<void> {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set('start', dateRange.start);
        params.set('end', dateRange.end);
      }
      const response = await fetch(`/api/admin/usage/tenants?${params}`);
      if (response.ok) {
        tenantUsage.value = await response.json();
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    tenants,
    domainRequests,
    usageStats,
    tenantUsage,
    loading,
    isAuthenticated,
    isSuperAdmin,
    checkAuth,
    login,
    logout,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    fetchDomainRequests,
    provisionDomain,
    verifyDomain,
    fetchUsageStats,
    fetchTenantUsage,
  };
});
