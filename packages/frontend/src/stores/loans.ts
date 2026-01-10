// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Loan, LoanStatus } from '@auma/shared';
import { useAuthStore } from './auth';

export const useLoansStore = defineStore('loans', () => {
  const loans = ref<Loan[]>([]);
  const currentLoan = ref<Loan | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({ total: 0, limit: 50, offset: 0 });

  const authStore = useAuthStore();

  async function fetchLoans(params?: { status?: LoanStatus; search?: string }) {
    loading.value = true;
    error.value = null;

    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.search) queryParams.set('search', params.search);
      queryParams.set('limit', pagination.value.limit.toString());
      queryParams.set('offset', pagination.value.offset.toString());

      const response = await fetch(`/api/loans?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch loans');

      const data = await response.json();
      loans.value = data.loans;
      pagination.value = data.pagination;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  async function fetchLoan(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/loans/${id}`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch loan');

      const data = await response.json();
      currentLoan.value = data.loan;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  async function updateLoan(id: string, updates: Partial<Loan>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/loans/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update loan');

      const data = await response.json();
      currentLoan.value = data.loan;

      // Update in list if present
      const index = loans.value.findIndex(l => l.id === id);
      if (index !== -1) {
        loans.value[index] = data.loan;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateStatus(id: string, status: LoanStatus) {
    return updateLoan(id, { status });
  }

  const loansByStatus = computed(() => {
    const grouped: Record<LoanStatus, Loan[]> = {
      lead: [],
      initial_call: [],
      app_in: [],
      post_app_call: [],
      notes_to_lo: [],
      pre_approval_prep: [],
      in_contract: [],
      pipeline_mgmt: [],
      final_approval: [],
      post_closing: [],
      denied: [],
      cancelled: [],
    };

    loans.value.forEach(loan => {
      if (grouped[loan.status]) {
        grouped[loan.status].push(loan);
      }
    });

    return grouped;
  });

  return {
    loans,
    currentLoan,
    loading,
    error,
    pagination,
    loansByStatus,
    fetchLoans,
    fetchLoan,
    updateLoan,
    updateStatus,
  };
});
