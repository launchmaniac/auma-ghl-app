<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

function enableDevMode() {
  window.location.href = '/?dev=true';
}
</script>

<template>
  <div class="not-authenticated">
    <div class="container">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h1>Authentication Required</h1>
      <p class="description">
        This application must be launched from within GoHighLevel.
        Please open the AUMA app from your GHL dashboard.
      </p>
      <div class="dev-section">
        <p class="dev-label">For development testing:</p>
        <button @click="enableDevMode" class="dev-button">
          Enable Dev Mode
        </button>
        <p class="dev-note">
          Dev mode uses mock data and bypasses authentication.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-authenticated {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  text-align: center;
  padding: 2rem;
  max-width: 400px;
}

.icon {
  color: #fbbf24;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.description {
  color: #a0aec0;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.dev-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dev-label {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 1rem;
}

.dev-button {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.dev-button:hover {
  background: #4338ca;
}

.dev-note {
  font-size: 0.75rem;
  color: #718096;
  margin-top: 1rem;
}
</style>
