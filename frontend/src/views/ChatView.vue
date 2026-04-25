<template>
  <div class="flex h-screen bg-bg-primary">
    <!-- Sidebar -->
    <SessionSidebar
      :sessions="chatStore.sessions"
      :currentSessionId="chatStore.currentSessionId"
      @select="selectSession"
      @create="createNewSession"
      @delete="deleteSession"
    />

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col bg-bg-secondary">
      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="chatStore.messages.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center text-text-secondary animate-fade-in">
            <h2 class="text-2xl font-bold mb-2 gradient-text">HelpCenter RAG</h2>
            <p class="text-text-muted">输入问题，我将基于帮助中心文档为您解答</p>
          </div>
        </div>

        <ChatMessages v-else :messages="chatStore.messages" />
      </div>

      <!-- Input Area -->
      <div class="border-t border-border-default glass p-4">
        <ChatInput :loading="chatStore.isLoading" @send="sendMessage" />
        <div v-if="chatStore.error" class="text-red-400 text-sm mt-2">
          {{ chatStore.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import SessionSidebar from '../components/SessionSidebar.vue'
import ChatMessages from '../components/ChatMessages.vue'
import ChatInput from '../components/ChatInput.vue'

const chatStore = useChatStore()

onMounted(() => {
  chatStore.loadSessions()
})

function selectSession(sessionId: string) {
  chatStore.currentSessionId = sessionId
  chatStore.loadMessages(sessionId)
}

async function createNewSession() {
  await chatStore.createSession()
}

async function deleteSession(sessionId: string) {
  await chatStore.deleteSession(sessionId)
}

async function sendMessage(content: string) {
  await chatStore.sendMessage(content)
}
</script>
