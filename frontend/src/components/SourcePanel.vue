<template>
  <div class="mt-3 pt-3 border-t border-slate-700/50 bg-black/30">
    <div class="text-xs text-slate-400 mb-2">引用来源 ({{ sources.length }})</div>

    <div class="flex gap-2 overflow-x-auto pb-2">
      <a
        v-for="source in sources"
        :key="source.articleId"
        :href="getArticleUrl(source.articleId)"
        target="_blank"
        rel="noopener noreferrer"
        class="flex-shrink-0 w-48 bg-slate-800/80 rounded-lg p-3 text-xs border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
      >
        <div class="font-medium text-slate-200 group-hover:text-cyan-400 line-clamp-1 mb-1">
          {{ source.title }}
        </div>
        <div class="text-slate-500 line-clamp-1 mb-1">
          {{ source.categoryPath }}
        </div>
        <div class="text-slate-400 line-clamp-2 text-[10px]">
          {{ source.excerpt }}
        </div>
        <div class="mt-2 flex items-center text-cyan-500 text-[10px]">
          <span>查看文档</span>
          <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Source } from '../stores/chat'

defineProps<{
  sources: Source[]
}>()

function getArticleUrl(articleId: number): string {
  return `https://ecloud.10086.cn/op-help-center/doc/article/${articleId}`
}
</script>
