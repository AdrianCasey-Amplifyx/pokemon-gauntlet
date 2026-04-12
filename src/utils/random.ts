export function randomRange(
  min: number,
  max: number,
  rng: () => number = Math.random
): number {
  return min + rng() * (max - min);
}

export function randomInt(
  min: number,
  max: number,
  rng: () => number = Math.random
): number {
  return Math.floor(min + rng() * (max - min + 1));
}

export function pickRandom<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
