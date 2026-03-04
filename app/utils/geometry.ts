// utils/geometry.ts
import * as THREE from 'three';
import type { BlockData, ProjectionId, ViewType } from '~/types';

/**
 * Generates Shear Matrices for Oblique Projections (Cavalier / Military).
 * Does NOT scale the geometry, ensuring true geometric distortion.
 */
export function getObliqueMatrix(mode: ProjectionId, coef: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (mode === 'iso') return m.identity();

  const alpha = Math.PI / 4; // 45 degrees
  const sCos = Math.cos(alpha) * coef;
  const sSin = Math.sin(alpha) * coef;

  if (mode === 'cab') {
    // Cavalier: Front plane (XY in ThreeJS) is True Magnitude. Shear Depth (Z) onto X and Y.
    m.set(
      1, 0, sCos, 0,
      0, 1, sSin, 0,
      0, 0, 1,    0,
      0, 0, 0,    1
    );
  } else if (mode === 'mil') {
    // Military: Floor plane (XZ in ThreeJS) is True Magnitude. Shear Height (Y) onto X and Z.
    m.set(
      1, sCos,  0, 0,
      0, 1,     0, 0,
      0, -sSin, 1, 0, // Negative Z shifts the view "up" visually on screen
      0, 0,     0, 1
    );
  }
  return m;
}

/**
 * Projects 3D block coordinates to strict 2D space (True Magnitude) for INEN SVGs.
 */
type Point3 = [number, number, number];

function mapToView(p: Point3, view: ViewType) {
  let u = 0;
  let v = 0;

  if (view === 'front') {
    // Front view: X horizontal, Z vertical.
    u = p[0];
    v = -p[2];
  } else if (view === 'top') {
    // Top view (first-angle unfolded below front): X horizontal, depth down.
    u = p[0];
    v = p[1];
  } else {
    // Left profile in first-angle: depth axis mirrored on sheet.
    u = -p[1];
    v = -p[2];
  }

  return { u, v };
}

export function projectTo2D(blocks: BlockData[], view: ViewType, scale: number = 3.0) {
  const CX = 150; // SVG Center X
  const CY = 150; // SVG Center Y

  return blocks.flatMap(b => {
    const hw = b.w / 2;
    const hd = b.d / 2;
    const hh = b.h / 2;

    // 8 Corners in local math (Syllabus: X=Width, Y=Depth, Z=Height)
    const corners: Point3[] = [
      [b.x - hw, b.y - hd, b.z - hh], [b.x + hw, b.y - hd, b.z - hh], // Bottom Front
      [b.x + hw, b.y + hd, b.z - hh], [b.x - hw, b.y + hd, b.z - hh], // Bottom Back
      [b.x - hw, b.y - hd, b.z + hh], [b.x + hw, b.y - hd, b.z + hh], // Top Front
      [b.x + hw, b.y + hd, b.z + hh], [b.x - hw, b.y + hd, b.z + hh]  // Top Back
    ];

    const edges = [
      [0,1], [1,2], [2,3], [3,0], // Bottom
      [4,5], [5,6], [6,7], [7,4], // Top
      [0,4], [1,5], [2,6], [3,7]  // Vertical Pillars
    ];

    return edges.map(([s, e], idx) => {
      const pt1 = corners[s];
      const pt2 = corners[e];

      const c1uv = mapToView(pt1, view);
      const c2uv = mapToView(pt2, view);
      const c1 = { u: CX + c1uv.u * scale, v: CY + c1uv.v * scale };
      const c2 = { u: CX + c2uv.u * scale, v: CY + c2uv.v * scale };

      if (Math.abs(c1.u - c2.u) < 0.001 && Math.abs(c1.v - c2.v) < 0.001) {
        return null;
      }

      return { id: `${b.id}-${idx}`, x1: c1.u, y1: c1.v, x2: c2.u, y2: c2.v };
    }).filter((line): line is { id: string; x1: number; y1: number; x2: number; y2: number } => line !== null);
  });
}
