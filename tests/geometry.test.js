import { describe, it, expect } from 'vitest';
import { FIELD, arenaGeometry } from '../src/games/geometry.js';
import { Simulation } from '../src/games/Simulation.js';

describe('Geometria comum da mesa', () => {
  it('mantém campo, gols e elásticos idênticos nos três temas', () => {
    const sims = ['wood', 'cartoon', 'neon'].map(theme => new Simulation({ theme, mode: 'hockey' }));
    for (const s of sims) { expect(s.geometry).toEqual(arenaGeometry(FIELD)); expect(s.goal).toBe(s.geometry.goalBottom - s.geometry.goalTop); }
  });
  it('posiciona os fixadores de corda simetricamente dentro do campo', () => {
    const a = arenaGeometry();
    expect(a.cx - a.ropes[0].x).toBe(a.ropes[1].x - a.cx);
    for (const rope of a.ropes) { expect(rope.top).toBeGreaterThan(a.top); expect(rope.bottom).toBeLessThan(a.bottom); }
  });
  it('marca na mesma abertura usada para desenhar o gol, em ambas as extremidades', () => {
    for (let side = 0; side < 2; side++) for (const inside of [false, true]) {
      const s = new Simulation({ mode: 'hockey', ai: false }); s.countdown = 0;
      const a = s.geometry, d = s.discs[0];
      Object.assign(d, { x: side ? a.right - 11 : a.left + 11, y: inside ? a.goalTop + d.r + 2 : a.goalTop - d.r - 2, vx: side ? 700 : -700, vy: 0 });
      for (let i = 0; i < 20; i++) s.step(1 / 120);
      expect(s.points[side ? 0 : 1]).toBe(inside ? 1 : 0);
    }
  });
});
