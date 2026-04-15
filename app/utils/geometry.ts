import * as THREE from 'three';
import type { FigureData, PrismProfile, ProjectionId, TriPrismFigureData, ViewType } from '~/types';

const CABINET_REDUCTION = 0.5;
const SHORTENED_PLANOMETRIC_REDUCTION = 2 / 3;

type Point3 = [number, number, number];
type Point2 = [number, number];

const BOX_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

const TRI_PRISM_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 0],
  [3, 4], [4, 5], [5, 3],
  [0, 3], [1, 4], [2, 5]
];

function degreesToRadians(value: number) {
  return value * (Math.PI / 180);
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

function getFigureEdgeIndices(figure: FigureData) {
  return figure.kind === 'box' ? BOX_EDGES : TRI_PRISM_EDGES;
}

function rotatePoint(point: Point3, figure: TriPrismFigureData): Point3 {
  const vector = new THREE.Vector3(...point);
  const rotation = new THREE.Euler(
    degreesToRadians(figure.rotationX),
    degreesToRadians(figure.rotationY),
    degreesToRadians(figure.rotationZ),
    'XYZ'
  );

  vector.applyEuler(rotation);

  return [vector.x, vector.y, vector.z];
}

export function getPrismProfilePoints(profile: PrismProfile, w: number, h: number): Point2[] {
  const hw = w / 2;
  const hh = h / 2;

  if (profile === 'right') {
    return [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh]
    ];
  }

  return [
    [-hw, -hh],
    [hw, -hh],
    [0, hh]
  ];
}

export function getFigureVertices(figure: FigureData): Point3[] {
  const hw = figure.w / 2;
  const hd = figure.d / 2;
  const hh = figure.h / 2;

  if (figure.kind === 'box') {
    return [
      [figure.x - hw, figure.y - hd, figure.z - hh],
      [figure.x + hw, figure.y - hd, figure.z - hh],
      [figure.x + hw, figure.y + hd, figure.z - hh],
      [figure.x - hw, figure.y + hd, figure.z - hh],
      [figure.x - hw, figure.y - hd, figure.z + hh],
      [figure.x + hw, figure.y - hd, figure.z + hh],
      [figure.x + hw, figure.y + hd, figure.z + hh],
      [figure.x - hw, figure.y + hd, figure.z + hh]
    ];
  }

  const profilePoints = getPrismProfilePoints(figure.profile, figure.w, figure.h);
  const localVertices: Point3[] = [
    [profilePoints[0]![0], -hd, profilePoints[0]![1]],
    [profilePoints[1]![0], -hd, profilePoints[1]![1]],
    [profilePoints[2]![0], -hd, profilePoints[2]![1]],
    [profilePoints[0]![0], hd, profilePoints[0]![1]],
    [profilePoints[1]![0], hd, profilePoints[1]![1]],
    [profilePoints[2]![0], hd, profilePoints[2]![1]]
  ];

  return localVertices.map((point) => {
    const rotated = rotatePoint(point, figure);

    return [
      rotated[0] + figure.x,
      rotated[1] + figure.y,
      rotated[2] + figure.z
    ];
  });
}

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
      0, sSin, 1, 0,
      0, 0, 0, 1
    );
  }

  return m;
}

export function getRecommendedProjectionCoefficient(mode: ProjectionId) {
  if (mode === 'cab') return CABINET_REDUCTION;
  if (mode === 'mil') return SHORTENED_PLANOMETRIC_REDUCTION;

  return 1;
}

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

function getFigureWireframe(figure: FigureData) {
  return {
    corners: getFigureVertices(figure),
    edges: getFigureEdgeIndices(figure)
  };
}

export function getFigureEdges3D(figure: FigureData) {
  const corners = getFigureVertices(figure).map(([x, y, z]) => [x, z, y] as Point3);
  const edges = getFigureEdgeIndices(figure);

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
    for (const [x, y, z] of getFigureVertices(figure)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
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
