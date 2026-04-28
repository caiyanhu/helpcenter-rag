<template>
  <div
    class="chat-input-container flex gap-3 max-w-3xl mx-auto p-4 bg-slate-900/70 backdrop-blur-md border-t border-white/10 rounded-t-xl"
  >
    <textarea
      v-model="input"
      :disabled="loading"
      placeholder="输入问题，按 Enter 发送，Shift+Enter 换行..."
      rows="1"
      class="chat-input flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 disabled:bg-slate-700 disabled:text-slate-500 transition-all duration-200"
      style="min-height: 44px; max-height: 120px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3)"
      @keydown="handleKeydown"
    />

    <button
      :disabled="!input.trim() || loading"
      class="send-button bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-xl px-5 py-3 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
      @click="send"
    >
      <svg
        v-if="loading"
        class="w-5 h-5 text-cyan-400 animate-spin animate-spin-smooth"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path
          class="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />
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

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      event.stopPropagation()
    } else {
      event.preventDefault()
      send()
    }
  }
}

function send() {
  const content = input.value.trim()
  if (!content || props.loading) return

  emit('send', content)
  input.value = ''
}

defineExpose({ input, send })
</script>

<style scoped>
.chat-input:focus {
  box-shadow:
    0 0 0 2px rgba(0, 212, 255, 0.2),
    0 0 20px rgba(0, 212, 255, 0.1);
}

.chat-input::placeholder {
  color: #64748b;
}

.send-button:not(:disabled):hover {
  box-shadow:
    0 0 20px rgba(0, 212, 255, 0.4),
    0 0 40px rgba(99, 102, 241, 0.2);
}

@keyframes spin-smooth {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-smooth {
  animation: spin-smooth 1s linear infinite;
}
</style>
