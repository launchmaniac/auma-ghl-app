<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdminStore } from '@/stores/admin';

const router = useRouter();
const route = useRoute();
const adminStore = useAdminStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password';
    return;
  }

  loading.value = true;
  error.value = null;

  const success = await adminStore.login(email.value, password.value);

  if (success) {
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } else {
    error.value = 'Invalid email or password';
  }

  loading.value = false;
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">AUMA Admin</h1>
        <p class="text-gray-400">Launch Maniac Internal Dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="bg-white rounded-xl shadow-xl p-8">
        <div class="space-y-6">
          <div>
            <label for="email" class="label">Email Address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="admin@launchmaniac.com"
            />
          </div>

          <div>
            <label for="password" class="label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="input"
              placeholder="Enter your password"
            />
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </div>
      </form>

      <p class="mt-6 text-center text-sm text-gray-500">
        Launch Maniac LLC - Internal Use Only
      </p>
    </div>
  </div>
</template>
