<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { OrbitControls, Edges } from '@tresjs/cientos';
import * as THREE from 'three';
import { getObliqueMatrix } from '~/utils/geometry';
import type { FigureData, ProjectionId } from '~/types';

const props = defineProps<{
  figures: FigureData[];
  mode: ProjectionId;
  coef: number;
  wireframe: boolean;
}>();

const groupRef = shallowRef<THREE.Group | null>(null);
const cameraRef = shallowRef<THREE.OrthographicCamera | null>(null);
const controlsRef = shallowRef<any>(null);

function getPrismShape(w: number, h: number) {
  const hw = w / 2;
  const hh = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(0, hh);
  shape.lineTo(-hw, -hh);
  return shape;
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
      <TresMesh
        v-for="figure in figures" :key="figure.id"
        :position="[figure.x, figure.z, figure.kind === 'tri_prism' ? figure.y - (figure.d / 2) : figure.y]"
      >
        <TresBoxGeometry v-if="figure.kind === 'box'" :args="[figure.w, figure.h, figure.d]" />
        <TresExtrudeGeometry
          v-else
          :args="[getPrismShape(figure.w, figure.h), { depth: figure.d, bevelEnabled: false }]"
        />
        <TresMeshBasicMaterial v-if="wireframe" color="#e2e8f0" :transparent="true" :opacity="0.04" />
        <TresMeshStandardMaterial v-else :color="figure.color" :roughness="0.5" />
        <Edges v-if="wireframe" color="#e2e8f0" :threshold="15" />
      </TresMesh>
    </TresGroup>
    
    <TresAxesHelper :args="[50]" />
  </TresCanvas>
</template>
