<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted } from 'vue';
import PortalLayout from '@/components/PortalLayout.vue';
import { usePortalStore } from '@/stores/portal';

const portalStore = usePortalStore();

const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const selectedType = ref('');
const uploading = ref(false);
const uploadError = ref<string | null>(null);

const documentTypes = [
  { value: 'paystub', label: 'Pay Stub' },
  { value: 'w2', label: 'W-2' },
  { value: 'tax_return_1040', label: 'Tax Return (1040)' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'purchase_agreement', label: 'Purchase Agreement' },
  { value: 'other', label: 'Other Document' },
];

onMounted(() => {
  portalStore.fetchDocuments();
});

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
  }
}

async function uploadDocument() {
  if (!selectedFile.value || !selectedType.value) {
    uploadError.value = 'Please select a file and document type';
    return;
  }

  uploading.value = true;
  uploadError.value = null;

  const success = await portalStore.uploadDocument(selectedFile.value, selectedType.value);

  if (success) {
    showUploadModal.value = false;
    selectedFile.value = null;
    selectedType.value = '';
  } else {
    uploadError.value = 'Failed to upload document. Please try again.';
  }

  uploading.value = false;
}

function getStatusBadge(status: string) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Processed' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  };
  return badges[status] || badges.pending;
}

function getValidationBadge(status: string) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending Review' },
    valid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Verified' },
    needs_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Needs Review' },
    invalid: { bg: 'bg-red-100', text: 'text-red-800', label: 'Invalid' },
  };
  return badges[status] || badges.pending;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDocumentType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
</script>

<template>
  <PortalLayout>
    <div class="space-y-6 pb-20 md:pb-6 md:ml-64">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Documents</h1>
          <p class="text-gray-500">Upload and manage your loan documents</p>
        </div>
        <button @click="showUploadModal = true" class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </button>
      </div>

      <!-- Documents List -->
      <div class="card">
        <div v-if="portalStore.documents.length === 0" class="p-8 text-center">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-500 mb-4">No documents uploaded yet</p>
          <button @click="showUploadModal = true" class="btn-primary">
            Upload Your First Document
          </button>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="doc in portalStore.documents"
            :key="doc.id"
            class="p-4 hover:bg-gray-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ doc.fileName }}</p>
                  <p class="text-sm text-gray-500">{{ formatDocumentType(doc.type) }}</p>
                  <p class="text-xs text-gray-400 mt-1">Uploaded {{ formatDate(doc.uploadedAt) }}</p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span
                  class="px-2 py-1 text-xs rounded-full"
                  :class="[getStatusBadge(doc.status).bg, getStatusBadge(doc.status).text]"
                >
                  {{ getStatusBadge(doc.status).label }}
                </span>
                <span
                  class="px-2 py-1 text-xs rounded-full"
                  :class="[getValidationBadge(doc.validationStatus).bg, getValidationBadge(doc.validationStatus).text]"
                >
                  {{ getValidationBadge(doc.validationStatus).label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Tips -->
      <div class="card p-6">
        <h3 class="font-semibold text-gray-900 mb-3">Tips for Uploading Documents</h3>
        <ul class="space-y-2 text-sm text-gray-600">
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Ensure all pages are clear and readable</span>
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Include all pages of multi-page documents</span>
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Accepted formats: PDF, JPEG, PNG, TIFF (max 10MB)</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Upload Modal -->
    <div
      v-if="showUploadModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showUploadModal = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Upload Document</h2>
          <button @click="showUploadModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="uploadDocument" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
            <select v-model="selectedType" class="input">
              <option value="">Select type...</option>
              <option v-for="type in documentTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">File</label>
            <div
              class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              @click="($refs.fileInput as HTMLInputElement).click()"
            >
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.tiff"
                @change="handleFileSelect"
              />
              <svg v-if="!selectedFile" class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p v-if="selectedFile" class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
              <p v-else class="text-sm text-gray-500">Click to select or drag and drop</p>
              <p class="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, or TIFF (max 10MB)</p>
            </div>
          </div>

          <div v-if="uploadError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ uploadError }}
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              @click="showUploadModal = false"
              class="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="uploading || !selectedFile || !selectedType"
              class="flex-1 btn-primary disabled:opacity-50"
            >
              {{ uploading ? 'Uploading...' : 'Upload' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </PortalLayout>
</template>
