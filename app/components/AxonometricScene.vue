<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { OrbitControls } from '@tresjs/cientos';
import * as THREE from 'three';
import { getAxonometricPreset, getSceneBounds } from '~/utils/geometry';
import type { FigureData, ProjectionId } from '~/types';

const props = defineProps<{
  figures: FigureData[];
  mode: ProjectionId;
  wireframe: boolean;
  showAxes: boolean;
}>();

const BASE_FRUSTUM_HALF_HEIGHT = 100;
const FIT_PADDING = 1.25;
const DEFAULT_SIZE = new THREE.Vector3(40, 40, 40);

const containerRef = ref<HTMLElement | null>(null);
const cameraRef = shallowRef<THREE.OrthographicCamera | null>(null);
const controlsRef = shallowRef<any>(null);
const containerSize = ref({ width: 1, height: 1 });

let resizeObserver: ResizeObserver | null = null;

function updateContainerSize() {
  if (!containerRef.value) return;

  containerSize.value = {
    width: Math.max(containerRef.value.clientWidth, 1),
    height: Math.max(containerRef.value.clientHeight, 1)
  };
}

function getCameraDirection(mode: ProjectionId) {
  const preset = getAxonometricPreset(mode);
  const azimuth = THREE.MathUtils.degToRad(preset.azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(preset.elevationDeg);
  const horizontalRadius = Math.cos(elevation);

  return new THREE.Vector3(
    Math.sin(azimuth) * horizontalRadius,
    Math.sin(elevation),
    Math.cos(azimuth) * horizontalRadius
  ).normalize();
}

function getBoundsCorners(bounds: THREE.Box3) {
  return [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
  ];
}

function fitCameraToFigures() {
  if (!cameraRef.value || !controlsRef.value) return;

  const cam = cameraRef.value;
  const ctr = controlsRef.value;
  const aspect = containerSize.value.width / containerSize.value.height;
  const direction = getCameraDirection(props.mode);
  const sceneBounds = getSceneBounds(props.figures);
  const center = sceneBounds?.center.clone() ?? new THREE.Vector3(0, 10, 0);
  const size = sceneBounds?.size.clone() ?? DEFAULT_SIZE.clone();
  const distance = Math.max(size.length() * 1.6, 120);

  cam.left = -BASE_FRUSTUM_HALF_HEIGHT * aspect;
  cam.right = BASE_FRUSTUM_HALF_HEIGHT * aspect;
  cam.top = BASE_FRUSTUM_HALF_HEIGHT;
  cam.bottom = -BASE_FRUSTUM_HALF_HEIGHT;
  cam.near = -4000;
  cam.far = 4000;
  cam.position.copy(center).addScaledVector(direction, distance);
  cam.up.set(0, 1, 0);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);

  const corners = sceneBounds ? getBoundsCorners(sceneBounds.box) : [
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(20, 40, 20)
  ];

  let maxHalfWidth = 1;
  let maxHalfHeight = 1;

  for (const corner of corners) {
    const cameraSpace = corner.clone().applyMatrix4(cam.matrixWorldInverse);
    maxHalfWidth = Math.max(maxHalfWidth, Math.abs(cameraSpace.x));
    maxHalfHeight = Math.max(maxHalfHeight, Math.abs(cameraSpace.y));
  }

  const zoomForWidth = (BASE_FRUSTUM_HALF_HEIGHT * aspect) / (maxHalfWidth * FIT_PADDING);
  const zoomForHeight = BASE_FRUSTUM_HALF_HEIGHT / (maxHalfHeight * FIT_PADDING);

  cam.zoom = Math.max(Math.min(zoomForWidth, zoomForHeight), 0.1);
  cam.updateProjectionMatrix();

  ctr.reset();
  ctr.enableRotate = false;
  ctr.enablePan = true;
  ctr.enableZoom = true;
  ctr.target.copy(center);
  ctr.update();
}

onMounted(() => {
  updateContainerSize();

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
      fitCameraToFigures();
    });
    resizeObserver.observe(containerRef.value);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateContainerSize);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateContainerSize);
  }
});

watch(
  () => [props.mode, props.figures, cameraRef.value, controlsRef.value, containerSize.value.width, containerSize.value.height],
  () => {
    fitCameraToFigures();
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div ref="containerRef" class="h-full w-full">
    <TresCanvas clear-color="#1e293b">
      <TresOrthographicCamera ref="cameraRef" />
      <OrbitControls ref="controlsRef" />

      <TresAmbientLight :intensity="0.7" />
      <TresDirectionalLight :position="[10, 20, 10]" :intensity="1.2" />

      <FigureMeshes :figures="figures" :wireframe="wireframe" />

      <TresAxesHelper v-if="showAxes" :args="[50]" />
    </TresCanvas>
  </div>
</template>
