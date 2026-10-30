import { describe, it, expect } from 'vitest';
import { Simulation, FIELD, collideDiscs, moveBody } from '../src/games/Simulation.js';

const make = (mode, extra = {}) => new Simulation({ mode, ai: false, random: () => .5, ...extra });
const advance = (s, seconds) => { for (let t = 0; t < seconds; t += 1 / 120) s.step(1 / 120); };

describe('Controles e Classic Pong livre', () => {
  it('move nos dois eixos, limita a velocidade vetorial e preserva a metade', () => {
    const s = make('pong'), p = s.players[0], start = { x: p.x, y: p.y };
    s.setTarget(0, 10000, -10000); s.step(.05);
    expect(p.x).toBeGreaterThan(start.x); expect(p.y).toBeLessThan(start.y);
    expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeLessThanOrEqual(27.001);
    advance(s, 2);
    expect(p.x).toBeLessThan(s.cx); expect(p.y).toBeGreaterThanOrEqual(FIELD.top + p.halfHeight);
  });
  it('não teleporta nem ultrapassa o alvo', () => {
    const p = { x: 0, y: 0, vx: 0, vy: 0 }; moveBody(p, { x: 3, y: 4 }, 100, .1);
    expect(p).toMatchObject({ x: 3, y: 4 });
  });
  it('rebate na posição atual da raquete, fora da linha inicial', () => {
    const s = make('pong'), p = s.players[0], d = s.discs[0];
    s.countdown = 0; p.x = 350; s.targets[0] = { x: p.x, y: p.y };
    Object.assign(d, { x: 375, y: p.y + 15, vx: -500, vy: 0 }); s.step(.02);
    expect(d.vx).toBeGreaterThan(0); expect(d.vy).toBeGreaterThan(0);
    expect(s.events.some(e => e.type === 'hit')).toBe(true);
  });
  it('pontua, encerra a partida e não altera o resultado depois', () => {
    const s = make('pong', { limit: 1 }); s.countdown = 0;
    Object.assign(s.discs[0], { x: FIELD.right + 30, vx: 500 }); s.step(.01);
    expect(s.points).toEqual([1, 0]); expect(s.winner).toBe(0);
    advance(s, 5); expect(s.points).toEqual([1, 0]);
  });
  it('IA respeita velocidade e não altera a raquete humana', () => {
    const s = make('pong', { ai: true, difficulty: 'easy' }); s.countdown = 0; s.aiClock = 0;
    const initial = { ...s.players[1] }, human = { ...s.players[0] };
    Object.assign(s.discs[0], { y: FIELD.top + 20, vx: 300, vy: 0 }); s.step(.05);
    expect(Math.hypot(s.players[1].x - initial.x, s.players[1].y - initial.y)).toBeLessThanOrEqual(13.001);
    expect(s.players[0]).toEqual(human);
  });
});
describe('Air Hockey', () => {
  it('transfere o impacto de um rebatedor em movimento para o puck', () => {
    const s = make('hockey'), p = s.players[0], d = s.discs[0]; s.countdown = 0;
    Object.assign(d, { x: p.x + 35, y: p.y, vx: 0, vy: 0 });
    s.setTarget(0, p.x + 80, p.y); s.step(.02);
    expect(d.vx).toBeGreaterThan(0); expect(Math.hypot(d.vx, d.vy)).toBeLessThanOrEqual(760.001);
  });
  it('rebate na borda fora da abertura e marca dentro do gol', () => {
    const s = make('hockey'); s.countdown = 0;
    Object.assign(s.discs[0], { x: FIELD.left + 11, y: FIELD.top + 25, vx: -400, vy: 0 }); s.step(.02);
    expect(s.points).toEqual([0, 0]); expect(s.discs[0].vx).toBeGreaterThan(0);
    Object.assign(s.discs[0], { x: FIELD.left - 20, y: s.cy, vx: -400 }); s.step(.01);
    expect(s.points).toEqual([0, 1]); expect(s.countdown).toBeGreaterThan(0);
  });
  it('limita rebatedores à sua metade', () => {
    const s = make('hockey'); s.setTarget(1, -500, 1000); advance(s, 1);
    expect(s.players[1].x).toBeGreaterThanOrEqual(s.cx + s.players[1].r);
    expect(s.players[1].y).toBeLessThanOrEqual(FIELD.bottom - s.players[1].r);
  });
});
describe('Sling Puck', () => {
  it('começa com cinco discos em cada lado', () => {
    const s = make('sling'); expect(s.discs).toHaveLength(10); expect(s.points).toEqual([5, 5]);
    expect(s.discs.filter(d => d.x < s.cx)).toHaveLength(5);
  });
  it('restringe seleção ao próprio lado e lança para a abertura', () => {
    const s = make('sling'); s.countdown = 0;
    const d = s.discs[2], enemy = s.discs[7];
    expect(s.startDrag(0, enemy.x, enemy.y)).toBe(false);
    expect(s.startDrag(0, d.x, d.y)).toBe(true);
    s.drag(0, d.x - 60, d.y + 20); s.release(0);
    expect(d.vx).toBeGreaterThan(0); expect(d.vy).toBeLessThan(0);
    expect(Math.hypot(d.vx, d.vy)).toBeLessThanOrEqual(780);
  });
  it('cancela um toque sem disparar o disco', () => {
    const s = make('sling'); s.countdown = 0; const d = s.discs[2];
    s.startDrag(0, d.x, d.y); s.drag(0, d.x - 50, d.y); s.release(0, true);
    expect(d.vx).toBe(0); expect(d.vy).toBe(0); expect(s.drags.size).toBe(0);
  });
  it('permite recuperar um disco que parou junto à borda', () => {
    const s = make('sling'); s.countdown = 0; const d = s.discs[2]; d.x = FIELD.left + d.r;
    s.startDrag(0, d.x, d.y); s.drag(0, d.x, d.y); s.release(0);
    expect(d.vx).toBeGreaterThan(300);
  });
  it('bloqueia a divisória sólida e deixa passar pela abertura', () => {
    const s = make('sling'); s.countdown = 0; s.discs = [s.discs[0]];
    const d = s.discs[0]; Object.assign(d, { x: s.cx - 30, y: s.cy - 85, vx: 700, vy: 0 });
    s.step(.05); expect(d.x).toBeLessThan(s.cx); expect(d.vx).toBeLessThan(0);
    Object.assign(d, { x: s.cx - 30, y: s.cy, vx: 700, vy: 0 });
    s.step(.1); expect(d.x).toBeGreaterThan(s.cx);
  });
  it('transfere momento entre discos e resolve sobreposição', () => {
    const a = { x: 0, y: 0, r: 15, vx: 300, vy: 0 }, b = { x: 25, y: 0, r: 15, vx: 0, vy: 0 };
    expect(collideDiscs(a, b)).toBe(true); expect(b.vx).toBeGreaterThan(250);
    expect(b.x - a.x).toBeGreaterThanOrEqual(30);
  });
  it('declara vitória com todos os discos no rival, mesmo em movimento', () => {
    const s = make('sling'); s.countdown = 0;
    s.discs.forEach((d, i) => { d.x = s.cx + 50 + i % 3 * 55; d.y = FIELD.top + 30 + Math.floor(i / 3) * 55; d.vx = 400; d.vy = 120; });
    s.step(1 / 120);
    expect(s.winner).toBe(0); expect(s.points).toEqual([0, 10]);
  });
  it('espera o disco atravessar inteiro, sem exigir que pare', () => {
    const s = make('sling'); s.countdown = 0;
    s.discs.forEach((d, i) => Object.assign(d, { x: s.cx + 80 + (i % 3) * 55, y: FIELD.top + 30 + Math.floor(i / 3) * 55, vx: 0, vy: 0 }));
    const last = s.discs[0]; Object.assign(last, { x: s.cx + 2, y: s.cy, vx: 500, vy: 0 });
    s.step(1 / 120); expect(s.winner).toBeNull();
    advance(s, .1); expect(s.winner).toBe(0);
    expect(s.events.filter(e => e.type === 'win')).toHaveLength(1);
    advance(s, 2); expect(s.events.filter(e => e.type === 'win')).toHaveLength(1);
  });
  it('a vitória tem prioridade sobre uma devolução da IA', () => {
    const s = make('sling', { ai: true }); s.countdown = 0; s.aiClock = 0;
    s.discs.forEach((d, i) => Object.assign(d, { x: s.cx + 60 + i % 3 * 50, y: FIELD.top + 35 + Math.floor(i / 3) * 50, vx: 0, vy: 0 }));
    s.step(1 / 120); expect(s.winner).toBe(0);
    expect(s.events.some(e => e.type === 'launch')).toBe(false);
  });
  it('reconhece também a vitória do jogador da direita', () => {
    const s = make('sling'); s.countdown = 0;
    s.discs.forEach((d, i) => Object.assign(d, { x: s.cx - 60 - i % 3 * 50, y: FIELD.top + 35 + Math.floor(i / 3) * 50, vx: -400, vy: 120 }));
    s.step(1 / 120); expect(s.winner).toBe(1); expect(s.points).toEqual([10, 0]);
  });
  it('a origem da força coincide com a corda fixa e um clique não dispara', () => {
    const s = make('sling'); s.countdown = 0; const d = s.discs[0];
    s.startDrag(0, d.x, d.y); expect(s.drags.get(0).anchor.x).toBe(s.geometry.ropes[0].x);
    s.release(0); expect(d.vx).toBe(0);
  });
  it('IA escolhe e lança somente discos do próprio lado', () => {
    const s = make('sling', { ai: true }); s.countdown = 0; s.aiClock = 0;
    const left = s.discs.filter(d => d.x < s.cx).map(d => ({ ...d })); s.step(.01);
    expect(s.discs.filter(d => d.x < s.cx)).toEqual(left);
    expect(s.discs.some(d => d.x > s.cx && Math.abs(d.vx) > 100)).toBe(true);
  });
});
