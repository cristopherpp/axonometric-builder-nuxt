<script setup lang="ts">
import { computed } from 'vue';
import { projectTo2D } from '~/utils/geometry';
import type { BlockData, ViewType } from '~/types';

const props = defineProps<{
  blocks: BlockData[];
  view: ViewType;
}>();

const lines = computed(() => projectTo2D(props.blocks, props.view));
</script>

<template>
  <svg class="w-full h-full" viewBox="0 0 300 300">
    <line x1="150" y1="0" x2="150" y2="300" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4" />
    <line x1="0" y1="150" x2="300" y2="150" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4" />

    <line 
      v-for="line in lines" :key="line.id"
      :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
      stroke="#0f172a" stroke-width="2" stroke-linecap="round"
    />
  </svg>
</template>