export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function roundPrice(value: number, roundTo?: number): number {
  if (!roundTo || roundTo <= 0) {
    return Number(value.toFixed(2));
  }
  const rounded = Math.round(value / roundTo) * roundTo;
  return Number(rounded.toFixed(2));
}

export function applyDelta(sourcePrice: number, mode: 'fixed' | 'percent', deltaValue: number): number {
  if (mode === 'fixed') {
    return sourcePrice + deltaValue;
  }
  return sourcePrice * (1 + deltaValue / 100);
}

export function clampPrice(value: number, minPrice?: number, maxPrice?: number): number {
  let output = value;
  if (typeof minPrice === 'number') output = Math.max(output, minPrice);
  if (typeof maxPrice === 'number') output = Math.min(output, maxPrice);
  return Number(output.toFixed(2));
}

export function makeId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
