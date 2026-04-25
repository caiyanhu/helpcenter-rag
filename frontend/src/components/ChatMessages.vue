<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="[
        'flex gap-3 animate-fade-in',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
      ]"
    >
      <!-- Avatar -->
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 shadow-lg',
          message.role === 'user'
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
        ]"
      >
        <svg
          v-if="message.role === 'user'"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <!-- Content -->
      <div
        :class="[
          'max-w-[80%] rounded-2xl px-4 py-3 backdrop-blur-sm',
          message.role === 'user'
            ? 'bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20'
            : 'bg-slate-800/80 border border-slate-700/50 text-slate-100 shadow-lg',
        ]"
      >
        <div
          :class="[
            'text-sm leading-relaxed whitespace-pre-wrap',
            message.role === 'user' ? 'text-white' : 'text-slate-100',
          ]"
        >
          {{ message.content }}
          <span
            v-if="message.isStreaming"
            class="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse-glow ml-1 shadow-[0_0_8px_rgba(0,212,255,0.8)]"
          ></span>
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
