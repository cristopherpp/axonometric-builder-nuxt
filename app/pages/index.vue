<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FigureData, FigureKind, ProjectionId } from '~/types';
import TechnicalSVG from '~/components/TechnicalSVG.vue';
import AxonometricScene from '~/components/AxonometricScene.vue';
import { getRecommendedProjectionCoefficient } from '~/utils/geometry';

const MIN_SIZE = 1;
let nextFigureId = 1;

const normalizeSize = (value: number) => {
  if (!Number.isFinite(value)) return MIN_SIZE;
  return Math.max(MIN_SIZE, value);
};

const toHexColor = (value: number) => `#${Math.floor(value).toString(16).padStart(6, '0')}`;

const figures = ref<FigureData[]>([
  { id: nextFigureId++, kind: 'box', x: 0, y: 0, z: 10, w: 20, d: 20, h: 20, color: '#3b82f6' }
]);

const mode = ref<ProjectionId>('iso');
const coef = ref(0.5);
const wireframe = ref(false);
const showOrthographicViews = ref(false);
const showAxes = ref(true);
const showSettings = ref(false);

const form = ref({ kind: 'box' as FigureKind, w: 20, d: 20, h: 20, x: 0, y: 0, z: 0 });

const addFigure = () => {
  const w = normalizeSize(form.value.w);
  const d = normalizeSize(form.value.d);
  const h = normalizeSize(form.value.h);

  figures.value.push({
    id: nextFigureId++,
    kind: form.value.kind,
    x: Number(form.value.x) || 0,
    y: Number(form.value.y) || 0,
    z: (Number(form.value.z) || 0) + (h / 2),
    w,
    d,
    h,
    color: toHexColor(Math.random() * 0xffffff)
  });

  form.value.w = w;
  form.value.d = d;
  form.value.h = h;
};

const addComplexFigure = () => {
  const originX = Number(form.value.x) || 0;
  const originY = Number(form.value.y) || 0;

  figures.value.push(
    {
      id: nextFigureId++,
      kind: 'box',
      x: originX,
      y: originY,
      z: 10,
      w: 32,
      d: 20,
      h: 20,
      color: '#22c55e'
    },
    {
      id: nextFigureId++,
      kind: 'box',
      x: originX + 10,
      y: originY,
      z: 28,
      w: 12,
      d: 20,
      h: 16,
      color: '#16a34a'
    },
    {
      id: nextFigureId++,
      kind: 'tri_prism',
      x: originX - 10,
      y: originY,
      z: 30,
      w: 18,
      d: 20,
      h: 20,
      color: '#f59e0b'
    }
  );
};

const removeFigure = (id: number) => {
  figures.value = figures.value.filter((f) => f.id !== id);
};

watch(mode, (nextMode, previousMode) => {
  if (nextMode === previousMode || nextMode === 'iso') return;

  coef.value = getRecommendedProjectionCoefficient(nextMode);
});
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans">
    <aside class="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-xl overflow-y-auto">
      <div class="p-5 border-b border-slate-700 bg-slate-800">
        <h2 class="text-xl font-bold text-blue-400 mb-6">Lab. Geometria INEN</h2>

        <div class="space-y-4 mb-6">
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase">Sistema de proyeccion</label>
            <select v-model="mode" class="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-2 text-sm text-white">
              <option value="iso">Isometrica (Ortogonal)</option>
              <option value="cab">Caballera (Frente VM)</option>
              <option value="mil">Militar (Planta VM)</option>
            </select>
          </div>

          <div v-if="mode !== 'iso'" class="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <label class="text-xs text-blue-300 block mb-2">Coeficiente de reduccion: {{ coef }}</label>
            <input type="range" min="0" max="1" step="0.05" v-model.number="coef" class="w-full" />
            <p class="mt-2 text-[11px] text-slate-300">
              {{ mode === 'cab' ? 'Valor tecnico recomendado: 0.5 para caballera reducida.' : 'Valor tecnico recomendado: 0.67 para militar reducida.' }}
            </p>
          </div>
        </div>

        <button @click="wireframe = !wireframe" class="w-full py-2 text-xs border border-slate-600 rounded hover:bg-slate-700 transition">
          Modo: {{ wireframe ? 'Alambrico' : 'Solido' }}
        </button>
      </div>

      <div class="p-5 space-y-4">
        <h3 class="text-xs font-bold text-slate-500 uppercase">Constructor</h3>

        <div>
          <label class="text-[10px] text-slate-400">Tipo de figura</label>
          <select v-model="form.kind" class="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white">
            <option value="box">Bloque rectangular</option>
            <option value="tri_prism">Prisma triangular</option>
          </select>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="flex flex-col"><label class="text-[10px] text-slate-400">W (X)</label><input type="number" v-model.number="form.w" class="bg-slate-700 p-1 text-xs rounded" /></div>
          <div class="flex flex-col"><label class="text-[10px] text-slate-400">D (Y)</label><input type="number" v-model.number="form.d" class="bg-slate-700 p-1 text-xs rounded" /></div>
          <div class="flex flex-col"><label class="text-[10px] text-slate-400">H (Z)</label><input type="number" v-model.number="form.h" class="bg-slate-700 p-1 text-xs rounded" /></div>

          <div class="flex flex-col"><label class="text-[10px] text-slate-400">Pos X</label><input type="number" v-model.number="form.x" class="bg-slate-700 p-1 text-xs rounded" /></div>
          <div class="flex flex-col"><label class="text-[10px] text-slate-400">Pos Y</label><input type="number" v-model.number="form.y" class="bg-slate-700 p-1 text-xs rounded" /></div>
          <div class="flex flex-col"><label class="text-[10px] text-slate-400">Pos Z</label><input type="number" v-model.number="form.z" class="bg-slate-700 p-1 text-xs rounded" /></div>
        </div>

        <button @click="addFigure" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold shadow">+ Anadir figura</button>
        <button @click="addComplexFigure" class="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-bold shadow">+ Anadir ejemplo complejo</button>

        <div class="space-y-1 mt-4">
          <div v-for="(f, idx) in figures" :key="f.id" class="flex items-center gap-2 bg-slate-700 p-1.5 rounded text-xs">
            <input type="color" v-model="f.color" class="w-5 h-5 rounded cursor-pointer border-none bg-transparent" />
            <span class="flex-1 text-slate-300">{{ idx + 1 }}. {{ f.kind === 'box' ? 'Bloque' : 'Prisma triangular' }}</span>
            <button @click="removeFigure(f.id)" class="text-slate-400 hover:text-red-400 px-2 font-bold">x</button>
          </div>
        </div>
      </div>
    </aside>

    <main
      class="flex-1 p-1 bg-slate-600"
      :class="showOrthographicViews ? 'grid grid-cols-2 grid-rows-2 gap-1' : 'relative'"
    >
      <button
        class="absolute top-3 right-3 z-20 px-3 py-1.5 text-xs font-semibold rounded border border-slate-500 bg-slate-900/85 text-slate-100 hover:bg-slate-800"
        @click="showSettings = true"
      >
        Configuración
      </button>

      <div v-if="showOrthographicViews" class="bg-slate-50 relative border border-slate-400">
        <span class="absolute top-2 left-2 text-[10px] font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">ALZADO (Frente)</span>
        <TechnicalSVG :figures="figures" view="front" />
      </div>

      <div v-if="showOrthographicViews" class="bg-slate-50 relative border border-slate-400">
        <span class="absolute top-2 left-2 text-[10px] font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">PERFIL IZQUIERDO</span>
        <TechnicalSVG :figures="figures" view="side" />
      </div>

      <div v-if="showOrthographicViews" class="bg-slate-50 relative border border-slate-400">
        <span class="absolute top-2 left-2 text-[10px] font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">PLANTA (Superior)</span>
        <TechnicalSVG :figures="figures" view="top" />
      </div>

      <div
        class="bg-slate-900 relative border border-slate-800"
        :class="showOrthographicViews ? '' : 'h-full w-full'"
      >
        <span class="absolute top-2 left-2 text-[10px] font-bold text-blue-300 bg-black/60 px-1.5 py-0.5 rounded shadow-sm z-10">AXONOMETRIA</span>
        <AxonometricScene :figures="figures" :mode="mode" :coef="coef" :wireframe="wireframe" :show-axes="showAxes" />
      </div>

      <div
        v-if="showSettings"
        class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4"
        @click.self="showSettings = false"
      >
        <section class="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
          <header class="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <h3 class="text-sm font-semibold text-slate-100">Configuración</h3>
            <button class="text-slate-300 hover:text-white" @click="showSettings = false">x</button>
          </header>
          <div class="px-4 py-4 space-y-4">
            <label class="flex items-center justify-between gap-3 rounded border border-slate-700 bg-slate-800/70 px-3 py-2">
              <span class="text-sm text-slate-200">Mostrar vistas ortogonales</span>
              <input v-model="showOrthographicViews" type="checkbox" class="h-4 w-4 accent-emerald-500" />
            </label>
            <label class="flex items-center justify-between gap-3 rounded border border-slate-700 bg-slate-800/70 px-3 py-2">
              <span class="text-sm text-slate-200">Mostrar ejes</span>
              <input v-model="showAxes" type="checkbox" class="h-4 w-4 accent-emerald-500" />
            </label>
          </div>
          <footer class="flex justify-end border-t border-slate-700 px-4 py-3">
            <button class="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500" @click="showSettings = false">
              Aceptar
            </button>
          </footer>
        </section>
      </div>
    </main>
  </div>
</template>
