<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full text-center">
      <div class="mb-8">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p class="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div class="space-y-4">
        <RouterLink to="/" class="btn-primary block w-full">
          Go to Dashboard
        </RouterLink>
        <RouterLink to="/request-access" class="btn-secondary block w-full">
          Request Portal Access
        </RouterLink>
      </div>

      <p class="mt-8 text-sm text-gray-400">
        If you believe this is an error, please contact your loan officer.
      </p>
    </div>
  </div>
</template>
