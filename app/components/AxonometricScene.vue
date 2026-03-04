<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { OrbitControls, Edges } from '@tresjs/cientos';
import * as THREE from 'three';
import { getObliqueMatrix } from '~/utils/geometry';
import type { BlockData, ProjectionId } from '~/types';

const props = defineProps<{
  blocks: BlockData[];
  mode: ProjectionId;
  coef: number;
  wireframe: boolean;
}>();

const groupRef = shallowRef<THREE.Group | null>(null);
const cameraRef = shallowRef<THREE.OrthographicCamera | null>(null);
const controlsRef = shallowRef<any>(null);

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
    g.updateMatrixWorld(true);
  } else {
    g.matrixAutoUpdate = true;
  }
}, { immediate: true });

// Handle Camera Orientation based on Projection
watch(() => [props.mode, cameraRef.value, controlsRef.value], () => {
  if (!cameraRef.value || !controlsRef.value) return;
  const cam = cameraRef.value;
  const ctr = controlsRef.value;

  ctr.reset();
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
    <!-- <TresOrthographicCamera ref="cameraRef" :zoom="1.35" :near="0.1" :far="4000" />
    <OrbitControls ref="controlsRef" :enable-zoom="true" :enable-pan="true" :min-zoom="0.2" :max-zoom="25" /> -->
    <TresOrthographicCamera ref="cameraRef" :zoom="0.03" :near="-2000" :far="4000" />
    <OrbitControls ref="controlsRef" />

    <TresAmbientLight :intensity="0.7" />
    <TresDirectionalLight :position="[10, 20, 10]" :intensity="1.2" />

    <TresGroup ref="groupRef">
      <TresMesh 
        v-for="b in blocks" :key="b.id"
        :position="[b.x, b.z, b.y]"
      >
        <TresBoxGeometry :args="[b.w, b.h, b.d]" />
        <TresMeshBasicMaterial v-if="wireframe" color="#475569" :wireframe="true" :transparent="true" :opacity="0.3" />
        <TresMeshStandardMaterial v-else :color="b.color" :roughness="0.5" />
        <Edges :color="wireframe ? '#333' : 'black'" :threshold="15" />
      </TresMesh>
    </TresGroup>
    
    <TresAxesHelper :args="[50]" />
  </TresCanvas>
</template>
