<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FigureData, FigureKind, PrismProfile, ProjectionId, QuarterTurn, TriPrismFigureData } from '~/types';
import TechnicalSVG from '~/components/TechnicalSVG.vue';
import AxonometricScene from '~/components/AxonometricScene.vue';
import { getRecommendedProjectionCoefficient } from '~/utils/geometry';

const MIN_SIZE = 1;
const QUARTER_TURNS: QuarterTurn[] = [0, 90, 180, 270];

type RotationAxis = 'rotationX' | 'rotationY' | 'rotationZ';

interface BuilderForm {
  kind: FigureKind;
  w: number;
  d: number;
  h: number;
  x: number;
  y: number;
  z: number;
  prismProfile: PrismProfile;
  prismRotationX: QuarterTurn;
  prismRotationY: QuarterTurn;
  prismRotationZ: QuarterTurn;
}

let nextFigureId = 1;

const normalizeSize = (value: number) => {
  if (!Number.isFinite(value)) return MIN_SIZE;
  return Math.max(MIN_SIZE, value);
};

const toHexColor = (value: number) => `#${Math.floor(value).toString(16).padStart(6, '0')}`;

const getNextQuarterTurn = (value: QuarterTurn): QuarterTurn => {
  const nextIndex = (QUARTER_TURNS.indexOf(value) + 1) % QUARTER_TURNS.length;
  return QUARTER_TURNS[nextIndex]!;
};

const getRotationLabel = (value: QuarterTurn) => `${value}°`;

const getPrismProfileLabel = (profile: PrismProfile) => profile === 'right' ? 'rectangulo' : 'isosceles';

const describeFigure = (figure: FigureData) => {
  if (figure.kind === 'box') return 'Bloque rectangular';

  return `Prisma ${getPrismProfileLabel(figure.profile)} · X ${figure.rotationX}° · Y ${figure.rotationY}° · Z ${figure.rotationZ}°`;
};

const figures = ref<FigureData[]>([
  { id: nextFigureId++, kind: 'box', x: 0, y: 0, z: 10, w: 20, d: 20, h: 20, color: '#3b82f6' }
]);

const mode = ref<ProjectionId>('iso');
const coef = ref(0.5);
const wireframe = ref(false);
const showOrthographicViews = ref(false);
const showAxes = ref(true);
const showSettings = ref(false);

const form = ref<BuilderForm>({
  kind: 'box',
  w: 20,
  d: 20,
  h: 20,
  x: 0,
  y: 0,
  z: 0,
  prismProfile: 'right',
  prismRotationX: 0,
  prismRotationY: 0,
  prismRotationZ: 0
});

const isPrismForm = computed(() => form.value.kind === 'tri_prism');

const prismOrientationSummary = computed(() => {
  if (!isPrismForm.value) return '';

  return `Perfil ${getPrismProfileLabel(form.value.prismProfile)} · X ${getRotationLabel(form.value.prismRotationX)} · Y ${getRotationLabel(form.value.prismRotationY)} · Z ${getRotationLabel(form.value.prismRotationZ)}`;
});

const addFigure = () => {
  const w = normalizeSize(form.value.w);
  const d = normalizeSize(form.value.d);
  const h = normalizeSize(form.value.h);
  const baseFigure = {
    id: nextFigureId++,
    x: Number(form.value.x) || 0,
    y: Number(form.value.y) || 0,
    z: (Number(form.value.z) || 0) + (h / 2),
    w,
    d,
    h,
    color: toHexColor(Math.random() * 0xffffff)
  };

  if (form.value.kind === 'box') {
    figures.value.push({
      ...baseFigure,
      kind: 'box'
    });
  } else {
    figures.value.push({
      ...baseFigure,
      kind: 'tri_prism',
      profile: form.value.prismProfile,
      rotationX: form.value.prismRotationX,
      rotationY: form.value.prismRotationY,
      rotationZ: form.value.prismRotationZ
    });
  }

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
      z: 9,
      w: 34,
      d: 24,
      h: 18,
      color: '#2563eb'
    },
    {
      id: nextFigureId++,
      kind: 'tri_prism',
      x: originX,
      y: originY,
      z: 27,
      w: 34,
      d: 24,
      h: 14,
      color: '#f59e0b',
      profile: 'isosceles',
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0
    },
    {
      id: nextFigureId++,
      kind: 'tri_prism',
      x: originX - 20,
      y: originY + 10,
      z: 10,
      w: 16,
      d: 20,
      h: 20,
      color: '#22c55e',
      profile: 'right',
      rotationX: 0,
      rotationY: 90,
      rotationZ: 0
    }
  );
};

const removeFigure = (id: number) => {
  figures.value = figures.value.filter((f) => f.id !== id);
};

const cycleFormPrismRotation = (axis: RotationAxis) => {
  if (!isPrismForm.value) return;

  if (axis === 'rotationX') form.value.prismRotationX = getNextQuarterTurn(form.value.prismRotationX);
  if (axis === 'rotationY') form.value.prismRotationY = getNextQuarterTurn(form.value.prismRotationY);
  if (axis === 'rotationZ') form.value.prismRotationZ = getNextQuarterTurn(form.value.prismRotationZ);
};

const rotatePrism = (id: number, axis: RotationAxis) => {
  figures.value = figures.value.map((figure) => {
    if (figure.id !== id || figure.kind !== 'tri_prism') return figure;

    return {
      ...figure,
      [axis]: getNextQuarterTurn(figure[axis])
    } as TriPrismFigureData;
  });
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

        <UTooltip :text="wireframe ? 'Cambiar a vista solida' : 'Cambiar a vista alambrica'">
          <button @click="wireframe = !wireframe" class="w-full py-2 text-xs border border-slate-600 rounded hover:bg-slate-700 transition">
            Modo: {{ wireframe ? 'Alambrico' : 'Solido' }}
          </button>
        </UTooltip>
      </div>

      <div class="p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-500 uppercase">Constructor</h3>
          <span v-if="isPrismForm" class="text-[10px] text-amber-300">Prisma avanzado</span>
        </div>

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

        <div v-if="isPrismForm" class="space-y-3 rounded border border-amber-500/30 bg-amber-950/20 p-3">
          <div>
            <label class="text-[10px] text-amber-200 uppercase">Perfil del prisma</label>
            <select v-model="form.prismProfile" class="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white">
              <option value="right">Triangulo rectangulo</option>
              <option value="isosceles">Triangulo isosceles</option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="rounded bg-slate-900/50 p-2 text-center">
              <div class="text-[10px] text-slate-400">Giro X</div>
              <div class="text-xs font-semibold text-white">{{ getRotationLabel(form.prismRotationX) }}</div>
              <UTooltip text="Rotar el prisma 90 grados sobre el eje X">
                <button class="mt-2 w-full rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-700" @click="cycleFormPrismRotation('rotationX')">
                  +90°
                </button>
              </UTooltip>
            </div>
            <div class="rounded bg-slate-900/50 p-2 text-center">
              <div class="text-[10px] text-slate-400">Giro Y</div>
              <div class="text-xs font-semibold text-white">{{ getRotationLabel(form.prismRotationY) }}</div>
              <UTooltip text="Rotar el prisma 90 grados sobre el eje Y">
                <button class="mt-2 w-full rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-700" @click="cycleFormPrismRotation('rotationY')">
                  +90°
                </button>
              </UTooltip>
            </div>
            <div class="rounded bg-slate-900/50 p-2 text-center">
              <div class="text-[10px] text-slate-400">Giro Z</div>
              <div class="text-xs font-semibold text-white">{{ getRotationLabel(form.prismRotationZ) }}</div>
              <UTooltip text="Rotar el prisma 90 grados sobre el eje Z">
                <button class="mt-2 w-full rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-700" @click="cycleFormPrismRotation('rotationZ')">
                  +90°
                </button>
              </UTooltip>
            </div>
          </div>

          <p class="text-[11px] text-slate-300">
            {{ prismOrientationSummary }}
          </p>
        </div>

        <UTooltip :text="isPrismForm ? 'Agregar el prisma configurado al modelo' : 'Agregar una figura con las medidas actuales'">
          <button @click="addFigure" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold shadow">+ Anadir figura</button>
        </UTooltip>
        <UTooltip text="Insertar una composicion de ejemplo con prismas orientados">
          <button @click="addComplexFigure" class="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-bold shadow">+ Anadir ejemplo complejo</button>
        </UTooltip>

        <div class="space-y-2 mt-4">
          <div v-for="(f, idx) in figures" :key="f.id" class="bg-slate-700 p-2 rounded text-xs">
            <div class="flex items-start gap-2">
              <input type="color" v-model="f.color" class="w-5 h-5 rounded cursor-pointer border-none bg-transparent mt-0.5" />
              <div class="flex-1 min-w-0">
                <div class="text-slate-200">{{ idx + 1 }}. {{ describeFigure(f) }}</div>
                <div class="text-[10px] text-slate-400">W {{ f.w }} · D {{ f.d }} · H {{ f.h }}</div>
              </div>
              <UTooltip text="Eliminar esta figura">
                <button @click="removeFigure(f.id)" class="text-slate-400 hover:text-red-400 px-2 font-bold">x</button>
              </UTooltip>
            </div>

            <div v-if="f.kind === 'tri_prism'" class="mt-2 grid grid-cols-3 gap-2">
              <UTooltip text="Rotar este prisma 90 grados sobre X">
                <button class="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-600" @click="rotatePrism(f.id, 'rotationX')">
                  Giro X
                </button>
              </UTooltip>
              <UTooltip text="Rotar este prisma 90 grados sobre Y">
                <button class="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-600" @click="rotatePrism(f.id, 'rotationY')">
                  Giro Y
                </button>
              </UTooltip>
              <UTooltip text="Rotar este prisma 90 grados sobre Z">
                <button class="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-600" @click="rotatePrism(f.id, 'rotationZ')">
                  Giro Z
                </button>
              </UTooltip>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main
      class="flex-1 p-1 bg-slate-600"
      :class="showOrthographicViews ? 'grid grid-cols-2 grid-rows-2 gap-1' : 'relative'"
    >
      <UTooltip text="Abrir opciones de visualizacion">
        <button
          class="absolute top-3 right-3 z-20 px-3 py-1.5 text-xs font-semibold rounded border border-slate-500 bg-slate-900/85 text-slate-100 hover:bg-slate-800"
          @click="showSettings = true"
        >
          Configuración
        </button>
      </UTooltip>

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
            <UTooltip text="Cerrar configuracion">
              <button class="text-slate-300 hover:text-white" @click="showSettings = false">x</button>
            </UTooltip>
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
            <UTooltip text="Guardar y cerrar">
              <button class="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500" @click="showSettings = false">
                Aceptar
              </button>
            </UTooltip>
          </footer>
        </section>
      </div>
    </main>
  </div>
</template>
