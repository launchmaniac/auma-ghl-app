<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

// This view handles the magic link token verification
// The actual verification is done in the router guard
// This component shows a loading state while verification is in progress
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Verifying your access...</p>
    </div>
  </div>
</template>

<style scoped>
.border-primary-500 {
  border-color: var(--color-primary);
}
</style>
