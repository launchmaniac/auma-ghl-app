<script setup lang="ts">
// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { ref, onMounted, nextTick, computed } from 'vue';
import PortalLayout from '@/components/PortalLayout.vue';
import { usePortalStore } from '@/stores/portal';

const portalStore = usePortalStore();

const newMessage = ref('');
const sending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const showEscalationNotice = ref(false);
const escalationResponse = ref('');

onMounted(async () => {
  await portalStore.fetchMessages();
  scrollToBottom();
});

async function sendMessage() {
  if (!newMessage.value.trim() || sending.value) return;

  const messageText = newMessage.value;
  newMessage.value = '';
  sending.value = true;

  const result = await portalStore.sendMessage(messageText);

  if (result.success) {
    if (result.escalated) {
      showEscalationNotice.value = true;
      escalationResponse.value = result.response || '';
    }
    await nextTick();
    scrollToBottom();
  }

  sending.value = false;
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

const groupedMessages = computed(() => {
  const groups: { date: string; messages: typeof portalStore.messages }[] = [];
  let currentDate = '';

  portalStore.messages.forEach(msg => {
    const msgDate = formatDate(msg.timestamp);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  });

  return groups;
});
</script>

<template>
  <PortalLayout>
    <div class="flex flex-col h-[calc(100vh-8rem)] md:ml-64 pb-20 md:pb-0">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-900">Messages</h1>
        <p class="text-gray-500">Chat with our team about your loan</p>
      </div>

      <!-- Messages Container -->
      <div
        ref="messagesContainer"
        class="flex-1 card overflow-y-auto p-4 space-y-4"
      >
        <div v-if="portalStore.messages.length === 0" class="h-full flex items-center justify-center">
          <div class="text-center">
            <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p class="text-gray-500">No messages yet. Start a conversation!</p>
          </div>
        </div>

        <template v-for="group in groupedMessages" :key="group.date">
          <div class="flex items-center gap-4 my-4">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 font-medium">{{ group.date }}</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <div
            v-for="message in group.messages"
            :key="message.id"
            class="flex"
            :class="message.direction === 'inbound' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] rounded-2xl px-4 py-2"
              :class="message.direction === 'inbound'
                ? 'bg-primary-500 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'"
            >
              <p class="text-sm">{{ message.text }}</p>
              <p
                class="text-xs mt-1"
                :class="message.direction === 'inbound' ? 'text-primary-100' : 'text-gray-400'"
              >
                {{ formatTime(message.timestamp) }}
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- Escalation Notice -->
      <div
        v-if="showEscalationNotice"
        class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4"
      >
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm text-blue-800">{{ escalationResponse }}</p>
            <button
              @click="showEscalationNotice = false"
              class="text-sm text-blue-600 font-medium mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <form @submit.prevent="sendMessage" class="mt-4">
        <div class="flex gap-2">
          <input
            v-model="newMessage"
            type="text"
            class="flex-1 input"
            placeholder="Type your message..."
            :disabled="sending"
          />
          <button
            type="submit"
            :disabled="!newMessage.trim() || sending"
            class="btn-primary px-6 disabled:opacity-50"
          >
            <svg v-if="sending" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">
          Messages are monitored. Questions about rates or loan advice will be forwarded to your loan officer.
        </p>
      </form>
    </div>
  </PortalLayout>
</template>

<style scoped>
.bg-primary-500 {
  background-color: var(--color-primary);
}

.text-primary-100 {
  color: var(--color-primary-100);
}
</style>
