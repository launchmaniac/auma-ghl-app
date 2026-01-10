<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref } from 'vue';

const email = ref('');
const loanNumber = ref('');
const loading = ref(false);
const submitted = ref(false);
const error = ref<string | null>(null);

async function requestAccess() {
  if (!email.value || !loanNumber.value) {
    error.value = 'Please fill in all fields';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/portal/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        loanNumber: loanNumber.value,
        locationId: getLocationIdFromUrl(),
      }),
    });

    if (response.ok) {
      submitted.value = true;
    } else {
      error.value = 'Unable to send access link. Please check your information.';
    }
  } catch (err) {
    error.value = 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
}

function getLocationIdFromUrl(): string {
  // Extract location ID from URL path or subdomain
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Check for subdomain pattern: portal-{slug}.launchmaniac.com
  const subdomainMatch = hostname.match(/^portal-([^.]+)\./);
  if (subdomainMatch) {
    return subdomainMatch[1];
  }

  // Check for path pattern: portal.launchmaniac.com/{locationId}
  const pathMatch = pathname.match(/^\/([^/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return '';
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Loan Portal Access</h1>
        <p class="text-gray-600">Enter your information to receive a secure access link.</p>
      </div>

      <!-- Success State -->
      <div v-if="submitted" class="card p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
        <p class="text-gray-600 mb-6">
          If an account exists with that information, we've sent a secure access link to your email and phone.
        </p>
        <p class="text-sm text-gray-500">
          The link will expire in 24 hours.
        </p>
      </div>

      <!-- Request Form -->
      <form v-else @submit.prevent="requestAccess" class="card p-8">
        <div class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label for="loanNumber" class="block text-sm font-medium text-gray-700 mb-1">
              Loan Number
            </label>
            <input
              id="loanNumber"
              v-model="loanNumber"
              type="text"
              required
              class="input"
              placeholder="LN-2024-XXXXXXXX"
            />
          </div>

          <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50"
          >
            {{ loading ? 'Sending...' : 'Send Access Link' }}
          </button>
        </div>

        <p class="mt-6 text-center text-sm text-gray-500">
          Don't have a loan number? Contact your loan officer.
        </p>
      </form>
    </div>
  </div>
</template>
