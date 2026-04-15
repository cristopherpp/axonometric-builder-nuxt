<script setup lang="ts">
import { Edges } from '@tresjs/cientos';
import * as THREE from 'three';
import { getPrismProfilePoints } from '~/utils/geometry';
import type { FigureData, TriPrismFigureData } from '~/types';

defineProps<{
  figures: FigureData[];
  wireframe: boolean;
}>();

function degreesToRadians(value: number) {
  return value * (Math.PI / 180);
}

function getPrismShape(figure: TriPrismFigureData) {
  const shape = new THREE.Shape();
  const points = getPrismProfilePoints(figure.profile, figure.w, figure.h);

  shape.moveTo(points[0]![0], points[0]![1]);

  for (const point of points.slice(1)) {
    shape.lineTo(point[0], point[1]);
  }

  shape.lineTo(points[0]![0], points[0]![1]);

  return shape;
}

function getPrismSceneRotation(figure: TriPrismFigureData): [number, number, number] {
  return [
    -degreesToRadians(figure.rotationX),
    -degreesToRadians(figure.rotationZ),
    -degreesToRadians(figure.rotationY)
  ];
}
</script>

<template>
  <template v-for="figure in figures" :key="figure.id">
    <TresMesh
      v-if="figure.kind === 'box'"
      :position="[figure.x, figure.z, figure.y]"
    >
      <TresBoxGeometry :args="[figure.w, figure.h, figure.d]" />
      <TresMeshBasicMaterial v-if="wireframe" color="#e2e8f0" :transparent="true" :opacity="0.04" />
      <TresMeshStandardMaterial v-else :color="figure.color" :roughness="0.5" />
      <Edges v-if="wireframe" color="#e2e8f0" :threshold="15" />
    </TresMesh>

    <TresGroup
      v-else
      :position="[figure.x, figure.z, figure.y]"
      :rotation="getPrismSceneRotation(figure)"
    >
      <TresMesh :position="[0, 0, -(figure.d / 2)]">
        <TresExtrudeGeometry :args="[getPrismShape(figure), { depth: figure.d, bevelEnabled: false }]" />
        <TresMeshBasicMaterial v-if="wireframe" color="#e2e8f0" :transparent="true" :opacity="0.04" />
        <TresMeshStandardMaterial v-else :color="figure.color" :roughness="0.5" :side="THREE.DoubleSide" />
        <Edges v-if="wireframe" color="#e2e8f0" :threshold="15" />
      </TresMesh>
    </TresGroup>
  </template>
</template>
