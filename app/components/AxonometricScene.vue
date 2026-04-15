<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { OrbitControls, Edges } from '@tresjs/cientos';
import * as THREE from 'three';
import { getObliqueMatrix, getPrismProfilePoints } from '~/utils/geometry';
import type { FigureData, ProjectionId, TriPrismFigureData } from '~/types';

const props = defineProps<{
  figures: FigureData[];
  mode: ProjectionId;
  coef: number;
  wireframe: boolean;
  showAxes: boolean;
}>();

const groupRef = shallowRef<THREE.Group | null>(null);
const cameraRef = shallowRef<THREE.OrthographicCamera | null>(null);
const controlsRef = shallowRef<any>(null);

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
    degreesToRadians(figure.rotationX),
    degreesToRadians(figure.rotationZ),
    degreesToRadians(figure.rotationY)
  ];
}

// Apply Matrix Transformation
watch(() => [props.mode, props.coef, groupRef.value], () => {
  if (!groupRef.value) return;
  const g = groupRef.value;
  
  g.matrix.identity();
  g.position.set(0, 0, 0);
  g.rotation.set(0, 0, 0);
  g.scale.set(1, 1, 1);

  if (props.mode !== 'iso') {
    const m = getObliqueMatrix(props.mode, props.coef);
    g.matrixAutoUpdate = false; // Take control away from Three.js
    g.matrix.copy(m);
  } else {
    g.matrixAutoUpdate = true;
  }

  g.updateMatrixWorld(true);
}, { immediate: true });

// Handle Camera Orientation based on Projection
watch(() => [props.mode, cameraRef.value, controlsRef.value], () => {
  if (!cameraRef.value || !controlsRef.value) return;
  const cam = cameraRef.value;
  const ctr = controlsRef.value;

  ctr.reset();
  ctr.enableRotate = props.mode === 'iso';
  ctr.enablePan = true;
  ctr.enableZoom = true;
  ctr.target.set(0, 0, 0);
  cam.up.set(0, 1, 0);

  if (props.mode === 'iso') {
    cam.position.set(100, 100, 100);
  } else if (props.mode === 'cab') {
    // Front true-magnitude camera
    cam.position.set(0, 0, 200);
  } else if (props.mode === 'mil') {
    // Top true-magnitude camera. A Z-up vector avoids a singular up/forward pair.
    cam.position.set(0, 200, 0);
    cam.up.set(0, 0, 1);
  }

  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  ctr.update();
}, { immediate: true });
</script>

<template>
  <TresCanvas clear-color="#1e293b">
    <TresOrthographicCamera ref="cameraRef" :zoom="0.03" :near="-2000" :far="4000" />
    <OrbitControls ref="controlsRef" />

    <TresAmbientLight :intensity="0.7" />
    <TresDirectionalLight :position="[10, 20, 10]" :intensity="1.2" />

    <TresGroup ref="groupRef">
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
    </TresGroup>
    
    <TresAxesHelper v-if="showAxes" :args="[50]" />
  </TresCanvas>
</template>
