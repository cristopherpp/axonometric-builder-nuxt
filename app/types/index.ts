// types/index.ts
export type ProjectionId = 'iso' | 'cab' | 'mil';
export type ViewType = 'front' | 'top' | 'side';
export type FigureKind = 'box' | 'tri_prism';
export type PrismProfile = 'right' | 'isosceles';
export type QuarterTurn = 0 | 90 | 180 | 270;

interface BaseFigureData {
  id: number;
  kind: FigureKind;
  x: number;
  y: number; // Depth (Profundidad)
  z: number; // Height (Altura)
  color: string;
}

export interface BoxFigureData extends BaseFigureData {
  kind: 'box';
  w: number; // Width
  d: number; // Depth size
  h: number; // Height size
}

export interface TriPrismFigureData extends BaseFigureData {
  kind: 'tri_prism';
  w: number; // Base width
  d: number; // Prism depth
  h: number; // Triangle height
  profile: PrismProfile;
  rotationX: QuarterTurn;
  rotationY: QuarterTurn;
  rotationZ: QuarterTurn;
}

export type FigureData = BoxFigureData | TriPrismFigureData;
