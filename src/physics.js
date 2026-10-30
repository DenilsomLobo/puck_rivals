export const W = 1000, H = 560, PADDLE = 94;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function moveToward(current, target, speed, dt) {
  return current + clamp(target - current, -speed * dt, speed * dt);
}
export function bounce(offset, speed, direction) {
  const angle = clamp(offset, -1, 1) * Math.PI / 3;
  return { vx: direction * Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
// A reflexão prevê a posição após os rebotes nas bordas horizontais.
export function intercept(y, vy, seconds) {
  const span = H - 44;
  let p = ((y - 22 + vy * seconds) % (span * 2) + span * 2) % (span * 2);
  return 22 + (p > span ? span * 2 - p : p);
}
export const difficulties = {
  easy: { speed: 260, reaction: .28, error: 65 },
  normal: { speed: 370, reaction: .17, error: 32 },
  hard: { speed: 480, reaction: .09, error: 12 },
};
