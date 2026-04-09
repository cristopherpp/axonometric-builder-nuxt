<script setup lang="ts">
import { computed } from 'vue';
import { getDimensionLines2D, projectTo2D } from '~/utils/geometry';
import type { FigureData, ViewType } from '~/types';

const props = defineProps<{
  figures: FigureData[];
  view: ViewType;
}>();

const lines = computed(() => projectTo2D(props.figures, props.view));
const dimensions = computed(() => getDimensionLines2D(props.figures, props.view));
</script>

<template>
  <svg class="w-full h-full" viewBox="0 0 300 300">
    <defs>
      <marker
        id="dimension-arrow"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto-start-reverse"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="#475569" />
      </marker>
    </defs>

    <line x1="150" y1="0" x2="150" y2="300" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4" />
    <line x1="0" y1="150" x2="300" y2="150" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4" />

    <line 
      v-for="line in lines" :key="line.id"
      :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
      stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"
    />

    <g v-for="dimension in dimensions" :key="dimension.id">
      <line
        :x1="dimension.x1"
        :y1="dimension.y1"
        :x2="dimension.x2"
        :y2="dimension.y2"
        stroke="#475569"
        stroke-width="1.15"
        stroke-linecap="round"
        marker-start="url(#dimension-arrow)"
        marker-end="url(#dimension-arrow)"
      />
      <text
        :x="dimension.tx"
        :y="dimension.ty"
        :transform="dimension.rotate ? `rotate(${dimension.rotate} ${dimension.tx} ${dimension.ty})` : undefined"
        fill="#334155"
        font-size="8"
        font-weight="600"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {{ dimension.text }}
      </text>
    </g>
  </svg>
</template>
