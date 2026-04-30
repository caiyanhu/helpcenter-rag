<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row']"
    >
      <!-- Avatar -->
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
          message.role === 'user'
            ? 'bg-[#00d4ff] text-white'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        ]"
      >
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </div>

      <!-- Content -->
      <div
        :class="[
          'max-w-[80%] rounded-2xl px-4 py-3',
          message.role === 'user'
            ? 'bg-gradient-to-br from-accent-primary to-indigo-500 text-white'
            : 'bg-slate-800/80 backdrop-blur border border-slate-700/50 text-slate-100',
        ]"
      >
        <div
          :class="[
            'text-sm leading-relaxed whitespace-pre-wrap',
            message.role === 'user' ? 'text-white' : 'text-slate-100',
          ]"
        >
          <span v-if="message.isThinking" class="thinking-indicator">
            正在思考
            <span class="thinking-dots">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
            </span>
          </span>
          <span v-else>{{ message.content }}</span>
          <span v-if="message.isStreaming && !message.isThinking" class="streaming-cursor animate-pulse-glow" />
        </div>

        <!-- Sources -->
        <SourcePanel
          v-if="
            message.role === 'assistant' &&
            message.sources &&
            message.sources.length > 0 &&
            !message.isStreaming
          "
          :sources="message.sources"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '../stores/chat'
import SourcePanel from './SourcePanel.vue'

defineProps<{
  messages: Message[]
}>()
</script>

<style scoped>
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: #00d4ff;
  margin-left: 4px;
  animation: cursor-blink 1s infinite;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  }
  50% {
    opacity: 0.3;
    box-shadow: 0 0 4px rgba(0, 212, 255, 0.3);
  }
}

.thinking-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-style: italic;
}

.thinking-dots {
  display: inline-flex;
  gap: 2px;
}

.dot {
  width: 4px;
  height: 4px;
  background-color: #94a3b8;
  border-radius: 50%;
  animation: dot-bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
