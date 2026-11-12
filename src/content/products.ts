import type { ConcernId } from '../engine/types';

export interface ProductDef {
  id: string;
  name: string;
  concern: ConcernId | 'any';
  cautions: string[];
}

// Directions stay with the pack. Same Spot adds only the cautions below and
// never makes claims about what a product does or how fast.
export const PRODUCTS: ProductDef[] = [
  { id: 'hair-serum', name: 'Hair Growth Serum Roll-On', concern: 'hair', cautions: [] },
  { id: 'rosemary-roll-on', name: 'Rosemary Hair Growth Roll-On', concern: 'hair', cautions: [] },
  { id: 'hair-gummies', name: 'Hair Health Gummies', concern: 'hair', cautions: [] },
  {
    id: 'aha-bha-underarm',
    name: '6% AHA BHA Underarm Roll On',
    concern: 'underarm',
    cautions: ["Don't use it on freshly shaved or broken skin.", 'Patch test first.'],
  },
  { id: 'pigmentation-cream', name: 'Pigmentation Repair Cream', concern: 'neck', cautions: [] },
];

export const OTHER_PRODUCT_ID = 'other';

export const DIRECTIONS_LINE = 'Follow the directions on your pack.';
export const PACK_WINS_LINE = 'If your pack says something different, follow your pack.';

export function productsFor(concern: ConcernId): ProductDef[] {
  return PRODUCTS.filter((p) => p.concern === concern);
}

export function productById(id: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
