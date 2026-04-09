// utils/geometry.ts
import * as THREE from 'three';
import type { FigureData, ProjectionId, ViewType } from '~/types';

/**
 * Generates Shear Matrices for Oblique Projections (Cavalier / Military).
 * Does NOT scale the geometry, ensuring true geometric distortion.
 */
export function getObliqueMatrix(mode: ProjectionId, coef: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (mode === 'iso') return m.identity();

  const alpha = Math.PI / 4;
  const sCos = Math.cos(alpha) * coef;
  const sSin = Math.sin(alpha) * coef;  

  if (mode === 'cab') {
    m.set(
      1, 0, sCos, 0,
      0, 1, sSin, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
  } else if (mode === 'mil') {
    m.set(
      1, sCos, 0, 0,
      0, 1, 0, 0,
      0, -sSin, 1, 0,
      0, 0, 0, 1
    );
  }

  return m;
}

type Point3 = [number, number, number];

export interface ProjectedLine2D {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DimensionLine2D extends ProjectedLine2D {
  text: string;
  tx: number;
  ty: number;
  rotate?: number;
}

function mapToView(p: Point3, view: ViewType) {
  let u = 0;
  let v = 0;

  if (view === 'front') {
    u = p[0];
    v = -p[2];
  } else if (view === 'top') {
    u = p[0];
    v = p[1];
  } else {
    u = -p[1];
    v = -p[2];
  }

  return { u, v };
}

function getFigureWireframe(figure: FigureData) {
  const hw = figure.w / 2;
  const hd = figure.d / 2;
  const hh = figure.h / 2;

  if (figure.kind === 'box') {
    const corners: Point3[] = [
      [figure.x - hw, figure.y - hd, figure.z - hh], [figure.x + hw, figure.y - hd, figure.z - hh],
      [figure.x + hw, figure.y + hd, figure.z - hh], [figure.x - hw, figure.y + hd, figure.z - hh],
      [figure.x - hw, figure.y - hd, figure.z + hh], [figure.x + hw, figure.y - hd, figure.z + hh],
      [figure.x + hw, figure.y + hd, figure.z + hh], [figure.x - hw, figure.y + hd, figure.z + hh]
    ];

    const edges: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    return { corners, edges };
  }

  const corners: Point3[] = [
    [figure.x - hw, figure.y - hd, figure.z - hh],
    [figure.x + hw, figure.y - hd, figure.z - hh],
    [figure.x, figure.y - hd, figure.z + hh],
    [figure.x - hw, figure.y + hd, figure.z - hh],
    [figure.x + hw, figure.y + hd, figure.z - hh],
    [figure.x, figure.y + hd, figure.z + hh]
  ];

  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 0],
    [3, 4], [4, 5], [5, 3],
    [0, 3], [1, 4], [2, 5]
  ];

  return { corners, edges };
}

export function getFigureEdges3D(figure: FigureData) {
  const hw = figure.w / 2;
  const hd = figure.d / 2;
  const hh = figure.h / 2;
  let corners: Point3[];
  let edges: Array<[number, number]>;

  if (figure.kind === 'box') {
    corners = [
      [figure.x - hw, figure.z - hh, figure.y - hd],
      [figure.x + hw, figure.z - hh, figure.y - hd],
      [figure.x + hw, figure.z + hh, figure.y - hd],
      [figure.x - hw, figure.z + hh, figure.y - hd],
      [figure.x - hw, figure.z - hh, figure.y + hd],
      [figure.x + hw, figure.z - hh, figure.y + hd],
      [figure.x + hw, figure.z + hh, figure.y + hd],
      [figure.x - hw, figure.z + hh, figure.y + hd]
    ];

    edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
  } else {
    corners = [
      [figure.x - hw, figure.z - hh, figure.y - hd],
      [figure.x + hw, figure.z - hh, figure.y - hd],
      [figure.x, figure.z + hh, figure.y - hd],
      [figure.x - hw, figure.z - hh, figure.y + hd],
      [figure.x + hw, figure.z - hh, figure.y + hd],
      [figure.x, figure.z + hh, figure.y + hd]
    ];

    edges = [
      [0, 1], [1, 2], [2, 0],
      [3, 4], [4, 5], [5, 3],
      [0, 3], [1, 4], [2, 5]
    ];
  }

  return edges.map(([s, e], idx) => {
    const start = new THREE.Vector3(...corners[s]!);
    const end = new THREE.Vector3(...corners[e]!);

    return {
      id: `${figure.id}-${idx}`,
      start,
      end,
      midpoint: start.clone().add(end).multiplyScalar(0.5)
    };
  });
}

export function projectTo2D(figures: FigureData[], view: ViewType, scale: number = 3.0): ProjectedLine2D[] {
  const cx = 150;
  const cy = 150;

  return figures.flatMap((figure) => {
    const { corners, edges } = getFigureWireframe(figure);

    return edges
      .map(([s, e], idx) => {
        const c1uv = mapToView(corners[s]!, view);
        const c2uv = mapToView(corners[e]!, view);
        const c1 = { u: cx + c1uv.u * scale, v: cy + c1uv.v * scale };
        const c2 = { u: cx + c2uv.u * scale, v: cy + c2uv.v * scale };

        if (Math.abs(c1.u - c2.u) < 0.001 && Math.abs(c1.v - c2.v) < 0.001) {
          return null;
        }

        return { id: `${figure.id}-${idx}`, x1: c1.u, y1: c1.v, x2: c2.u, y2: c2.v };
      })
      .filter((line): line is ProjectedLine2D => line !== null);
  });
}

function getFigureBounds(figures: FigureData[]) {
  if (!figures.length) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const figure of figures) {
    const hw = figure.w / 2;
    const hd = figure.d / 2;
    const hh = figure.h / 2;

    minX = Math.min(minX, figure.x - hw);
    maxX = Math.max(maxX, figure.x + hw);
    minY = Math.min(minY, figure.y - hd);
    maxY = Math.max(maxY, figure.y + hd);
    minZ = Math.min(minZ, figure.z - hh);
    maxZ = Math.max(maxZ, figure.z + hh);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

export function getDimensionLines2D(
  figures: FigureData[],
  view: ViewType,
  scale: number = 3.0
): DimensionLine2D[] {
  const bounds = getFigureBounds(figures);

  if (!bounds) return [];

  const cx = 150;
  const cy = 150;
  const offset = 18;

  const toCanvas = (u: number, v: number) => ({
    x: cx + u * scale,
    y: cy + v * scale
  });

  const makeHorizontalDimension = (
    id: string,
    leftU: number,
    rightU: number,
    baseV: number,
    value: number
  ): DimensionLine2D => {
    const start = toCanvas(leftU, baseV);
    const end = toCanvas(rightU, baseV);

    return {
      id,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      text: `${Math.round(value)}`,
      tx: (start.x + end.x) / 2,
      ty: start.y - 6
    };
  };

  const makeVerticalDimension = (
    id: string,
    baseU: number,
    topV: number,
    bottomV: number,
    value: number
  ): DimensionLine2D => {
    const start = toCanvas(baseU, topV);
    const end = toCanvas(baseU, bottomV);

    return {
      id,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      text: `${Math.round(value)}`,
      tx: start.x + 10,
      ty: (start.y + end.y) / 2,
      rotate: 90
    };
  };

  if (view === 'front') {
    return [
      makeHorizontalDimension('front-width', bounds.minX, bounds.maxX, -bounds.minZ + offset / scale, bounds.maxX - bounds.minX),
      makeVerticalDimension('front-height', bounds.maxX + offset / scale, -bounds.maxZ, -bounds.minZ, bounds.maxZ - bounds.minZ)
    ];
  }

  if (view === 'top') {
    return [
      makeHorizontalDimension('top-width', bounds.minX, bounds.maxX, bounds.maxY + offset / scale, bounds.maxX - bounds.minX),
      makeVerticalDimension('top-depth', bounds.maxX + offset / scale, bounds.minY, bounds.maxY, bounds.maxY - bounds.minY)
    ];
  }

  return [
    makeHorizontalDimension('side-depth', -bounds.maxY, -bounds.minY, -bounds.minZ + offset / scale, bounds.maxY - bounds.minY),
    makeVerticalDimension('side-height', -(bounds.maxY + offset / scale), -bounds.maxZ, -bounds.minZ, bounds.maxZ - bounds.minZ)
  ];
}
