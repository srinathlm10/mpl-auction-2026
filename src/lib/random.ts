/** Uniform float in [0, 1) from the browser's cryptographically secure generator. */
export function secureRandomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/**
 * Uniform integer in [0, max). Uses rejection sampling so there is no modulo
 * bias – every player on the wheel has exactly the same chance.
 */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) throw new Error("max must be a positive integer");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}
