/**
 * Deterministic randomness for the seed (H1).
 *
 * `Math.random()` is banned here: eight agents run `pnpm db:reset` all day, and
 * a store whose products, prices and order history change on every reset makes
 * every screenshot, every acceptance walk and every bug report irreproducible.
 * mulberry32 is 4 lines, has no dependencies, and is more than good enough for
 * picking a shirt colour.
 */

/** Fixed so the demo store is byte-identical on every machine and every run. */
export const SEED = 0x4155524f; // "AURO"

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with the given probability (0–1). */
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** `count` distinct items, in the collection's own order. */
  sample<T>(items: readonly T[], count: number): T[];
  /** Fisher-Yates, non-mutating. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number = SEED): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  };

  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: (items) => items[int(0, items.length - 1)] as never,
    sample: (items, count) => {
      const wanted = Math.min(count, items.length);
      const chosen = new Set(shuffle(items.map((_, i) => i)).slice(0, wanted));
      return items.filter((_, i) => chosen.has(i));
    },
    shuffle,
  };
}

/**
 * Skews `next()` towards 1. Orders use this so recent days carry more of them —
 * a flat distribution makes the analytics dashboard's trend line look dead.
 */
export function skewRecent(rng: Rng, strength = 2): number {
  return rng.next() ** (1 / strength);
}
