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

export function projectTo2D(figures: FigureData[], view: ViewType, scale: number = 3.0) {
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
      .filter((line): line is { id: string; x1: number; y1: number; x2: number; y2: number } => line !== null);
  });
}
