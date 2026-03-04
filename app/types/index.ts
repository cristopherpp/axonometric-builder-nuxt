// types/index.ts
export type ProjectionId = 'iso' | 'cab' | 'mil';
export type ViewType = 'front' | 'top' | 'side';

export interface BlockData {
  id: number;
  x: number;
  y: number; // Depth (Profundidad)
  z: number; // Height (Altura)
  w: number; // Width
  d: number; // Depth size
  h: number; // Height size
  color: string;
}