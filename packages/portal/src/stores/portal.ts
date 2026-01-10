// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface Branding {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface LoanProgress {
  loanNumber: string;
  status: string;
  statusLabel: string;
  purpose?: string;
  type?: string;
  propertyAddress?: string;
  estimatedCloseDate?: string;
  milestones: Array<{
    step: number;
    label: string;
    status: 'completed' | 'current' | 'pending';
  }>;
  // Borrower details (populated for profile view)
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  // Loan details
  loanType?: string;
  loanPurpose?: string;
  purchasePrice?: number;
  loanAmount?: number;
  applicationDate?: string;
  // MLO details
  mloName?: string;
  mloNmls?: string;
  mloEmail?: string;
  mloPhone?: string;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: string;
  validationStatus: string;
  uploadedAt: string;
}

interface Condition {
  id: string;
  type: string;
  description: string;
  status: string;
  dueDate?: string;
}

interface Message {
  id: string;
  text: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
}

export const usePortalStore = defineStore('portal', () => {
  const token = ref<string | null>(localStorage.getItem('portal_token'));
  const borrower = ref<Borrower | null>(null);
  const loanId = ref<string | null>(null);
  const branding = ref<Branding | null>(null);
  const loanProgress = ref<LoanProgress | null>(null);
  const documents = ref<Document[]>([]);
  const conditions = ref<Condition[]>([]);
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!borrower.value);

  async function verifyToken(magicToken: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/portal/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicToken }),
      });

      if (!response.ok) {
        throw new Error('Invalid or expired token');
      }

      const data = await response.json();
      token.value = data.session.token;
      borrower.value = data.session.borrower;
      loanId.value = data.session.loanId;
      branding.value = data.session.branding;

      localStorage.setItem('portal_token', data.session.token);

      // Fetch initial data
      await Promise.all([
        fetchLoanProgress(),
        fetchDocuments(),
        fetchConditions(),
      ]);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Authentication failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchLoanProgress() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/portal/loan', {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (response.ok) {
        const data = await response.json();
        loanProgress.value = data.loan;
      }
    } catch (err) {
      console.error('Failed to fetch loan progress:', err);
    }
  }

  async function fetchDocuments() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/portal/documents', {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (response.ok) {
        const data = await response.json();
        documents.value = data.documents;
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }

  async function uploadDocument(file: File, documentType: string): Promise<boolean> {
    if (!token.value) return false;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    try {
      const response = await fetch('/api/portal/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upload document:', err);
      return false;
    }
  }

  async function fetchConditions() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/portal/conditions', {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (response.ok) {
        const data = await response.json();
        conditions.value = data.conditions;
      }
    } catch (err) {
      console.error('Failed to fetch conditions:', err);
    }
  }

  async function fetchMessages() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/portal/messages', {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (response.ok) {
        const data = await response.json();
        messages.value = data.messages;
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }

  async function sendMessage(text: string): Promise<{ success: boolean; response?: string; escalated?: boolean }> {
    if (!token.value) return { success: false };

    try {
      const response = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchMessages();
        return {
          success: true,
          response: data.response,
          escalated: data.escalated,
        };
      }
      return { success: false };
    } catch (err) {
      console.error('Failed to send message:', err);
      return { success: false };
    }
  }

  async function fetchProfile() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/portal/profile', {
        headers: { Authorization: `Bearer ${token.value}` },
      });

      if (response.ok) {
        const data = await response.json();
        return data.profile;
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  }

  function logout() {
    token.value = null;
    borrower.value = null;
    loanId.value = null;
    branding.value = null;
    loanProgress.value = null;
    documents.value = [];
    conditions.value = [];
    messages.value = [];
    localStorage.removeItem('portal_token');
  }

  // Try to restore session on init
  async function initSession() {
    if (token.value) {
      loading.value = true;
      try {
        const response = await fetch('/api/portal/loan', {
          headers: { Authorization: `Bearer ${token.value}` },
        });

        if (!response.ok) {
          logout();
          return;
        }

        const data = await response.json();
        loanProgress.value = data.loan;

        await Promise.all([
          fetchDocuments(),
          fetchConditions(),
        ]);
      } catch {
        logout();
      } finally {
        loading.value = false;
      }
    }
  }

  // Initialize on store creation
  initSession();

  return {
    token,
    borrower,
    loanId,
    branding,
    loanProgress,
    documents,
    conditions,
    messages,
    loading,
    error,
    isAuthenticated,
    verifyToken,
    fetchLoanProgress,
    fetchDocuments,
    uploadDocument,
    fetchConditions,
    fetchMessages,
    sendMessage,
    fetchProfile,
    logout,
  };
});
