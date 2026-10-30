import { clamp, bounce, difficulties } from '../physics.js';
import { FIELD, arenaGeometry } from './geometry.js';
export { FIELD } from './geometry.js';

const length = p => Math.hypot(p.vx, p.vy);
function capVelocity(p, max) { const speed = length(p); if (speed > max) { p.vx *= max / speed; p.vy *= max / speed; } }
export function moveBody(body, target, speed, dt) {
  const dx = target.x - body.x, dy = target.y - body.y, d = Math.hypot(dx, dy);
  const amount = Math.min(d, speed * dt);
  body.vx = d > 0 ? dx / d * amount / dt : 0; body.vy = d > 0 ? dy / d * amount / dt : 0;
  body.x += body.vx * dt; body.y += body.vy * dt;
}
export function collideDiscs(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
  if (distance >= a.r + b.r) return false;
  if (distance < .001) { dx = 1; dy = 0; distance = 1; }
  const nx = dx / distance, ny = dy / distance, overlap = (a.r + b.r - distance) / 2;
  a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative < 0) { const impulse = relative * .94; a.vx += impulse * nx; a.vy += impulse * ny; b.vx -= impulse * nx; b.vy -= impulse * ny; }
  return true;
}

export class Simulation {
  constructor({ mode = 'pong', bounds = FIELD, ai = true, difficulty = 'normal', limit = 7, random = Math.random }) {
    this.mode = mode; this.bounds = bounds; this.ai = ai; this.level = difficulties[difficulty]; this.limit = limit; this.random = random;
    this.geometry = arenaGeometry(bounds);
    this.cx = this.geometry.cx; this.cy = this.geometry.cy;
    this.gap = this.geometry.gap; this.goal = this.geometry.goalHeight;
    this.points = [0, 0]; this.winner = null; this.events = []; this.clock = 0; this.aiClock = .5; this.drags = new Map();
    this.players = [0, 1].map(side => ({ x: side ? bounds.right - 65 : bounds.left + 65, y: this.cy, vx: 0, vy: 0, r: mode === 'hockey' ? 24 : 14, halfHeight: 38 }));
    this.targets = this.players.map(p => ({ x: p.x, y: p.y }));
    if (mode === 'sling') {
      this.points = [5, 5];
      this.countdown = 2;
      this.discs = Array.from({ length: 10 }, (_, i) => ({ id: i, x: i < 5 ? bounds.left + 78 + (i % 2) * 42 : bounds.right - 78 - (i % 2) * 42, y: this.cy + ((i % 5) - 2) * 43, vx: 0, vy: 0, r: 15, owner: i < 5 ? 0 : 1 }));
    } else this.serve(1);
  }
  serve(direction) {
    this.discs = [{ id: 0, x: this.cx, y: this.cy, vx: direction * (this.mode === 'pong' ? 290 : 200), vy: (this.random() - .5) * 170, r: 10 }];
    this.countdown = 2; this.idle = 0;
  }
  sideOf(d) { return d.x < this.cx ? 0 : 1; }
  setTarget(side, x, y) {
    const p = this.players[side], b = this.bounds, rx = this.mode === 'pong' ? 14 : p.r, ry = this.mode === 'pong' ? p.halfHeight : p.r;
    this.targets[side] = { x: clamp(x, side ? this.cx + rx + 3 : b.left + rx, side ? b.right - rx : this.cx - rx - 3), y: clamp(y, b.top + ry, b.bottom - ry) };
  }
  startDrag(side, x, y) {
    if (this.mode !== 'sling' || this.countdown > 0 || this.winner !== null || this.drags.has(side)) return false;
    const candidates = this.discs.filter(d => this.sideOf(d) === side && length(d) < 90 && Math.hypot(x - d.x, y - d.y) < 33);
    const d = candidates.sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0];
    if (!d) return false;
    const rope = this.geometry.ropes[side];
    this.drags.set(side, { disc: d, anchor: { x: rope.x, y: d.y }, x: d.x, y: d.y, moved: false }); return true;
  }
  drag(side, x, y) {
    const drag = this.drags.get(side); if (!drag) return;
    const b = this.bounds, a = drag.anchor, d = drag.disc;
    // O jogador puxa para sua extremidade, mantendo o disco na própria metade.
    drag.x = side ? clamp(x, a.x, Math.min(b.right - d.r, a.x + 80)) : clamp(x, Math.max(b.left + d.r, a.x - 80), a.x);
    drag.y = clamp(y, Math.max(b.top + d.r, a.y - 65), Math.min(b.bottom - d.r, a.y + 65));
    d.x = drag.x; d.y = drag.y; d.vx = 0; d.vy = 0;
    drag.moved = true;
  }
  release(side, cancel = false) {
    const drag = this.drags.get(side); if (!drag) return;
    const d = drag.disc;
    if (!cancel && drag.moved) { d.vx = (drag.anchor.x - d.x) * 10; d.vy = (drag.anchor.y - d.y) * 10; capVelocity(d, 780); if (length(d) > 20) this.events.push({ type: 'launch', x: d.x, y: d.y, side }); }
    this.drags.delete(side);
  }
  score(side) {
    this.points[side]++; this.events.push({ type: 'score', side });
    if (this.points[side] >= this.limit) { this.winner = side; this.events.push({ type: 'win', side }); }
    else this.serve(side ? 1 : -1);
  }
  computer(dt) {
    this.aiClock -= dt; if (this.aiClock > 0) return;
    this.aiClock = this.mode === 'sling' ? this.level.reaction * 4 + .4 : this.level.reaction;
    if (this.mode === 'sling') {
      const d = this.discs.filter(d => this.sideOf(d) === 1 && length(d) < 45).sort((a, b) => a.x - b.x)[0];
      if (d && this.startDrag(1, d.x, d.y)) {
        const anchor = this.drags.get(1).anchor;
        const pull = Math.min(75, this.bounds.right - d.r - anchor.x), error = (this.random() - .5) * this.level.error * .3;
        const dy = (this.cy + error - d.y) / Math.max(35, anchor.x - this.cx);
        this.drag(1, anchor.x + pull, d.y - dy * pull); this.release(1);
      }
      return;
    }
    const d = this.discs[0], error = (this.random() - .5) * this.level.error;
    if (this.mode === 'pong') {
      const x = this.bounds.right - 65;
      let target = d.y;
      if (d.vx > 0) {
        const low = this.bounds.top + d.r, span = this.bounds.bottom - this.bounds.top - d.r * 2;
        let y = ((d.y - low + d.vy * Math.max(0, (x - d.x) / d.vx)) % (2 * span) + 2 * span) % (2 * span);
        target = low + (y > span ? 2 * span - y : y);
      }
      this.setTarget(1, x, d.vx > 0 ? target + error : this.cy);
    } else {
      const p = this.players[1];
      // Se posiciona atrás do disco antes de atacar, usando os mesmos limites do humano.
      if (d.x > this.cx + 12) {
        const behind = d.x + 38;
        if (p.x < d.x + 18) this.setTarget(1, behind, d.y + (p.y < d.y ? -60 : 60));
        else this.setTarget(1, d.x - 30, d.y + error * .35);
      } else this.setTarget(1, this.bounds.right - 58, this.cy + (d.y - this.cy) * .6);
    }
  }
  step(dt) {
    if (this.winner !== null) return;
    // Uma condição já concluída tem prioridade sobre a próxima ação da IA.
    if (this.mode === 'sling' && this.countdown <= 0) {
      this.checkSling(); if (this.winner !== null) return;
    }
    this.clock += dt;
    if (this.ai && this.countdown <= 0) this.computer(dt);
    if (this.mode !== 'sling') for (let side = 0; side < 2; side++) moveBody(this.players[side], this.targets[side], side === 1 && this.ai ? this.level.speed : 540, dt);
    if (this.countdown > 0) { this.countdown = Math.max(0, this.countdown - dt); return; }
    // Subpassos fixos evitam que um disco rápido atravesse um obstáculo fino.
    const substeps = Math.max(1, Math.ceil(dt / (1 / 240))), subdt = dt / substeps;
    for (let i = 0; i < substeps; i++) { if (this.integrate(subdt)) break; }
    if (this.mode === 'sling') this.checkSling();
    else if (this.mode === 'hockey') {
      this.idle = length(this.discs[0]) < 18 ? this.idle + dt : 0;
      if (this.idle > 3) { this.discs[0].vx = this.discs[0].x > this.cx ? -170 : 170; this.discs[0].vy = 30; this.idle = 0; this.events.push({ type: 'serve' }); }
    }
  }
  integrate(dt) {
    const b = this.bounds, held = new Set([...this.drags.values()].map(d => d.disc));
    for (const d of this.discs) {
      if (held.has(d)) continue;
      const oldX = d.x; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y - d.r < b.top || d.y + d.r > b.bottom) { d.y = clamp(d.y, b.top + d.r, b.bottom - d.r); d.vy *= -1; }
      if (this.mode === 'sling') {
        this.outerWalls(d);
        this.divider(d, oldX);
        d.vx *= Math.exp(-.65 * dt); d.vy *= Math.exp(-.65 * dt);
        if (length(d) < 7) { d.vx = 0; d.vy = 0; }
      } else {
        if (this.mode === 'pong') this.pongCollisions(d);
        else {
          for (const p of this.players) this.strikerCollision(d, p);
          if (Math.abs(d.y - this.cy) > this.goal / 2 - d.r) this.outerWalls(d);
          d.vx *= Math.exp(-.07 * dt); d.vy *= Math.exp(-.07 * dt);
        }
        if (d.x + d.r < b.left) { this.score(1); return true; }
        if (d.x - d.r > b.right) { this.score(0); return true; }
      }
      capVelocity(d, this.mode === 'sling' ? 780 : 760);
    }
    if (this.mode === 'sling') {
      for (let i = 0; i < this.discs.length; i++) for (let j = i + 1; j < this.discs.length; j++) {
        const a = this.discs[i], c = this.discs[j];
        if (!held.has(a) && !held.has(c)) collideDiscs(a, c);
      }
      // Corrige sobreposições com a divisória também após colisões disco-disco.
      for (const d of this.discs) if (!held.has(d)) { this.outerWalls(d); this.divider(d, d.x); d.y = clamp(d.y, b.top + d.r, b.bottom - d.r); }
      // Detecta a última passagem dentro do subpasso; não espera o próximo frame.
      this.checkSling(); if (this.winner !== null) return true;
    }
    return false;
  }
  outerWalls(d) {
    const b = this.bounds;
    if (d.x < b.left + d.r) { d.x = b.left + d.r; d.vx = Math.abs(d.vx) * .95; }
    if (d.x > b.right - d.r) { d.x = b.right - d.r; d.vx = -Math.abs(d.vx) * .95; }
  }
  divider(d, oldX) {
    if (Math.abs(d.y - this.cy) < this.gap / 2 - d.r) return;
    const wall = this.geometry.dividerWidth / 2 + d.r;
    if (Math.abs(d.x - this.cx) < wall || (oldX < this.cx - wall && d.x > this.cx) || (oldX > this.cx + wall && d.x < this.cx)) {
      const side = oldX < this.cx ? -1 : 1; d.x = this.cx + side * wall; d.vx = side * Math.abs(d.vx) * .9;
    }
  }
  pongCollisions(d) {
    for (let side = 0; side < 2; side++) {
      const p = this.players[side], dx = d.x - p.x, dy = d.y - p.y;
      if (Math.abs(dx) >= 10 + d.r || Math.abs(dy) >= p.halfHeight + d.r) continue;
      const direction = dx >= 0 ? 1 : -1;
      d.x = p.x + direction * (10 + d.r + .1);
      if ((d.vx - p.vx) * direction < 0) {
        const velocity = bounce(dy / p.halfHeight, Math.min(760, Math.max(300, length(d) * 1.055 + Math.abs(p.vx) * .14)), direction);
        d.vx = velocity.vx; d.vy = velocity.vy + p.vy * .12;
        this.events.push({ type: 'hit', x: d.x, y: d.y, side });
      }
    }
  }
  strikerCollision(d, p) {
    const dx = d.x - p.x, dy = d.y - p.y, distance = Math.hypot(dx, dy), radius = d.r + p.r;
    if (distance >= radius) return;
    const nx = distance > .001 ? dx / distance : -1, ny = distance > .001 ? dy / distance : 0;
    d.x = p.x + nx * (radius + .1); d.y = p.y + ny * (radius + .1);
    const relative = (d.vx - p.vx) * nx + (d.vy - p.vy) * ny;
    if (relative < 0) { d.vx -= 1.85 * relative * nx; d.vy -= 1.85 * relative * ny; this.events.push({ type: 'hit', x: d.x, y: d.y }); }
  }
  checkSling() {
    const counts = [0, 0]; for (const d of this.discs) counts[this.sideOf(d)]++;
    this.points = counts;
    if (this.winner !== null || this.discs.length !== 10) return;
    const edge = this.geometry.dividerWidth / 2;
    const allRight = this.discs.every(d => d.x - d.r >= this.cx + edge);
    const allLeft = this.discs.every(d => d.x + d.r <= this.cx - edge);
    if (!allRight && !allLeft) return;
    this.winner = allRight ? 0 : 1;
    this.drags.clear();
    this.events.push({ type: 'win', side: this.winner });
  }
}
