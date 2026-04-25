<template>
  <div class="mt-3 pt-3 border-t border-slate-700/50 bg-black/30">
    <button
      class="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
      @click="expanded = !expanded"
    >
      <svg
        :class="['w-4 h-4 transition-transform', expanded ? 'rotate-90' : '']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span>引用来源 ({{ sources.length }})</span>
    </button>

    <div v-if="expanded" class="mt-2 space-y-2 transition-all duration-300 ease-in-out">
      <div
        v-for="(source, index) in sources"
        :key="source.articleId"
        class="bg-slate-800/50 rounded-lg p-3 text-xs border-l-2 border-cyan-500/50"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-medium">
            [^{{ index + 1 }}]
          </span>
          <span class="font-medium text-slate-200">{{ source.title }}</span>
        </div>
        <div class="text-slate-500 mb-1">
          {{ source.categoryPath }}
        </div>
        <div class="text-slate-400 line-clamp-2">
          {{ source.excerpt }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Source } from '../stores/chat'

defineProps<{
  sources: Source[]
}>()

const expanded = ref(false)
</script>
