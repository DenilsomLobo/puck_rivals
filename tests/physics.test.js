import { describe, it, expect } from 'vitest';
import { bounce, moveToward, intercept, H, difficulties } from '../src/physics.js';
describe('Pong e adversário computador', () => {
  it('limita deslocamento da IA pela velocidade e tempo', () => {
    expect(moveToward(100, 500, difficulties.easy.speed, .1)).toBe(126);
    expect(moveToward(100, 110, 260, .1)).toBe(110);
  });
  it('mantém velocidade e ângulo jogável mesmo nos extremos', () => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const v = bounce(offset, 600, -1);
      expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(600);
      expect(v.vx).toBeLessThanOrEqual(-299);
    }
  });
  it('prevê rebotes e mantém alvo dentro da mesa', () => {
    expect(intercept(100, 100, 1)).toBe(200);
    for (const vy of [-900, 900]) for (let t = 0; t < 20; t++) {
      expect(intercept(100, vy, t)).toBeGreaterThanOrEqual(12);
      expect(intercept(100, vy, t)).toBeLessThanOrEqual(H - 12);
    }
  });
});
