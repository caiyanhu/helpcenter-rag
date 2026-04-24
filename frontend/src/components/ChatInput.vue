<template>
  <div class="flex gap-2 max-w-3xl mx-auto">
    <textarea
      v-model="input"
      :disabled="loading"
      @keydown.enter.prevent="handleEnter"
      placeholder="输入问题，按 Enter 发送，Shift+Enter 换行..."
      rows="1"
      class="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
      style="min-height: 44px; max-height: 120px;"
    ></textarea>

    <button
      :disabled="!input.trim() || loading"
      @click="send"
      class="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
    >
      <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const input = ref('')

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) {
    // Allow new line
    return
  }
  send()
}

function send() {
  const content = input.value.trim()
  if (!content || props.loading) return

  emit('send', content)
  input.value = ''
}
</script>
