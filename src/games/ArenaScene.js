import Phaser from 'phaser';
import { themes } from '../art.js';
import { Simulation } from './Simulation.js';
import { PLAYER_COLORS, PLAYER_TINTS } from './pieceStyle.js';
import { paintTable, paintMarkings } from './ArenaArt.js';

export class ArenaScene extends Phaser.Scene {
  constructor(settings, callbacks) { super('arena'); this.settings = settings; this.callbacks = callbacks; }
  preload() {
    const art = themes[this.settings.theme];
    this.load.image('surface', art.surface); this.load.image('paddle', art.paddle); this.load.image('orb', art.ball);
    this.load.image('environment', art.environment);
    if (this.settings.mode === 'sling') this.load.image('rope', art.rope);
    if (this.settings.mode === 'hockey') this.load.image('striker', art.striker);
    this.load.on('loaderror', () => this.callbacks.error('Não foi possível carregar uma arte. Volte ao menu e tente novamente.'));
  }
  create() {
    this.art = themes[this.settings.theme]; this.sim = new Simulation(this.settings);
    this.paused = false; this.accumulator = 0; this.pointers = new Map(); this.effects = []; this.victoryShown = false;
    paintTable(this, this.settings.theme, this.sim.mode === 'sling' ? PLAYER_COLORS : this.art.colors);
    // Campo, arte e entrada agora compartilham as mesmas coordenadas em todos os temas.
    this.scaleX = 1; this.scaleY = 1; this.offsetX = 0; this.offsetY = 0;
    this.layer = this.add.container(0, 0);
    this.trimTexture('paddle'); this.trimTexture('orb');
    if (this.settings.mode === 'hockey') this.trimTexture('striker');
    if (this.settings.mode === 'sling') this.trimTexture('rope');
    this.decoration = this.add.graphics(); this.paintArena(); this.fx = this.add.graphics();
    this.ropeSprites = this.settings.mode === 'sling' ? [0, 1].map(() => [0, 1].map(() => this.add.image(0, 0, 'rope', 'trim').setOrigin(0, .5))) : [];
    this.playerSprites = this.sim.players.map((p, i) => {
      if (this.settings.mode === 'sling') return null;
      const sprite = this.add.image(p.x, p.y, this.settings.mode === 'pong' ? 'paddle' : 'striker', 'trim');
      if (this.settings.mode === 'pong') sprite.setDisplaySize(45, 92).setOrigin(i ? .28 : .72, .5).setFlipX(Boolean(i));
      else sprite.setDisplaySize(47, 47);
      return sprite;
    });
    this.discSprites = this.sim.discs.map(d => this.add.image(d.x, d.y, 'orb', 'trim').setDisplaySize(d.r * 2, d.r * 2));
    this.pieceMarks = this.add.graphics();
    this.discLabels = this.settings.mode === 'sling' ? this.sim.discs.map(() => this.add.text(0, 0, '', { fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', stroke: '#091329', strokeThickness: 3 }).setOrigin(.5)) : [];
    this.hud = this.add.graphics();
    this.count = this.add.text(500, 280, '', { fontFamily: 'Impact, sans-serif', fontSize: '50px', color: '#ffffff', stroke: '#100e27', strokeThickness: 8 }).setOrigin(.5);
    this.layer.add([this.decoration, ...this.ropeSprites.flat(), this.fx, ...this.playerSprites.filter(Boolean), ...this.discSprites, this.pieceMarks, ...this.discLabels, this.hud, this.count]);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ESC');
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']); this.input.addPointer(3);
    this.input.keyboard.on('keydown-ESC', () => this.callbacks.pause());
    this.input.on('pointerdown', p => this.pointerDown(p));
    this.input.on('pointermove', p => this.pointerMove(p));
    this.input.on('pointerup', p => this.pointerUp(p));
    this.input.on('pointerupoutside', p => this.pointerUp(p));
    this.cancelInput = () => this.clearControls();
    this.game.canvas.addEventListener('pointercancel', this.cancelInput);
    this.events.once('shutdown', () => this.game.canvas.removeEventListener('pointercancel', this.cancelInput));
    this.callbacks.ready(this); this.callbacks.score(this.sim.points); this.renderState(0);
  }
  trimTexture(key) {
    // Os PNGs originais são preservados; recortamos apenas a margem transparente no quadro de renderização.
    const texture = this.textures.get(key), source = texture.getSourceImage();
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(source, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 24) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    if (right > left) texture.add('trim', 0, left, top, right - left + 1, bottom - top + 1);
    else texture.add('trim', 0, 0, 0, source.width, source.height);
  }
  paintArena() {
    this.sim.theme = this.settings.theme;
    paintMarkings(this.decoration, this.sim, this.art, this.sim.mode === 'sling' ? PLAYER_COLORS : this.art.colors);
  }
  updateRopes() {
    this.ropeSprites.forEach((sprites, side) => {
      const anchor = this.sim.geometry.ropes[side], drag = this.sim.drags.get(side);
      const middle = drag ? { x: drag.x, y: drag.y } : { x: anchor.x, y: this.sim.cy };
      const points = [{ x: anchor.x, y: anchor.top }, middle, { x: anchor.x, y: anchor.bottom }];
      sprites.forEach((sprite, i) => {
        const start = points[i], end = points[i + 1], dx = end.x - start.x, dy = end.y - start.y;
        sprite.setPosition(start.x, start.y).setDisplaySize(Math.hypot(dx, dy), 7).setRotation(Math.atan2(dy, dx));
        sprite.setTint(this.settings.theme === 'neon' ? PLAYER_COLORS[side] : 0xffffff);
      });
    });
  }
  pointerDown(p) {
    if (this.paused || this.sim.winner !== null) return;
    const x = (p.x - this.offsetX) / this.scaleX, y = (p.y - this.offsetY) / this.scaleY;
    const s = this.sim, side = x < s.cx ? 0 : 1;
    if ((s.ai && side === 1) || [...this.pointers.values()].some(v => v.side === side)) return;
    if (s.mode === 'sling') {
      if (s.startDrag(side, x, y)) this.pointers.set(p.id, { side });
    } else {
      const body = s.players[side], offset = side ? 50 : -50;
      const nearControl = Math.hypot(x - body.x - offset, y - body.y) < 48;
      const nearBody = Math.hypot(x - body.x, y - body.y) < 55;
      if (!nearControl && !nearBody) return;
      // Arraste relativo: o dedo fica afastado da raquete e ela não salta ao ser tocada.
      this.pointers.set(p.id, { side, startX: x, startY: y, x: body.x, y: body.y });
    }
  }
  pointerMove(p) {
    const drag = this.pointers.get(p.id); if (!drag || this.paused) return;
    const x = (p.x - this.offsetX) / this.scaleX, y = (p.y - this.offsetY) / this.scaleY;
    if (this.sim.mode === 'sling') this.sim.drag(drag.side, x, y);
    else this.sim.setTarget(drag.side, drag.x + x - drag.startX, drag.y + y - drag.startY);
  }
  pointerUp(p) { const drag = this.pointers.get(p.id); if (!drag) return; this.sim.release(drag.side); this.pointers.delete(p.id); }
  clearControls() {
    for (const side of [0, 1]) this.sim?.release(side, true);
    this.pointers?.clear(); this.keys && Object.values(this.keys).forEach(key => key.reset());
    this.sim?.players.forEach((p, side) => { this.sim.targets[side] = { x: p.x, y: p.y }; p.vx = 0; p.vy = 0; });
  }
  setPaused(value) { this.paused = value; this.clearControls(); this.accumulator = 0; }
  keyboard(dt) {
    if (this.sim.mode === 'sling') return;
    [[this.keys.A, this.keys.D, this.keys.W, this.keys.S], [this.keys.LEFT, this.keys.RIGHT, this.keys.UP, this.keys.DOWN]].forEach((keys, side) => {
      if (side === 1 && this.sim.ai) return;
      const dx = Number(keys[1].isDown) - Number(keys[0].isDown), dy = Number(keys[3].isDown) - Number(keys[2].isDown), p = this.sim.players[side];
      if (dx || dy) this.sim.setTarget(side, p.x + dx * 540 * dt, p.y + dy * 540 * dt);
    });
  }
  update(_, delta) {
    if (!this.sim || this.paused || this.sim.winner !== null) return;
    const dt = Math.min(delta / 1000, .05); this.accumulator += dt;
    while (this.accumulator >= 1 / 120) { this.keyboard(1 / 120); this.sim.step(1 / 120); this.accumulator -= 1 / 120; }
    for (const event of this.sim.events.splice(0)) {
      if (event.type === 'hit' || event.type === 'launch') { this.effects.push({ x: event.x, y: event.y, life: .3, color: this.art.colors[event.side || 0] }); this.callbacks.sound(event.type); }
      if (event.type === 'score') { this.callbacks.score(this.sim.points); this.callbacks.sound('score'); }
      if (event.type === 'win' && !this.victoryShown) { this.victoryShown = true; this.callbacks.win(event.side); }
    }
    this.renderState(dt);
  }
  renderState(dt) {
    const s = this.sim, g = this.hud, marks = this.pieceMarks; g.clear(); this.fx.clear(); marks.clear();
    this.count.setText(s.countdown > 0 ? String(Math.ceil(s.countdown)) : '');
    s.players.forEach((p, side) => {
      const sprite = this.playerSprites[side]; if (!sprite) return;
      sprite.setPosition(p.x, p.y);
      const color = this.art.colors[side];
      if (s.mode === 'hockey') { marks.lineStyle(3, color, .9); marks.strokeCircle(p.x, p.y, p.r + 2); }
      if (s.ai && side === 1) return;
      const x = p.x + (side ? 50 : -50), active = [...this.pointers.values()].some(d => d.side === side);
      g.lineStyle(2, color, active ? .65 : .27); g.lineBetween(p.x + (side ? 16 : -16), p.y, x, p.y);
      g.fillStyle(color, active ? .14 : .065); g.fillCircle(x, p.y, 26); g.strokeCircle(x, p.y, 26);
      g.lineBetween(x - 10, p.y, x + 10, p.y); g.lineBetween(x, p.y - 10, x, p.y + 10);
    });
    s.discs.forEach((d, i) => {
      const sprite = this.discSprites[i]; sprite?.setPosition(d.x, d.y).setRotation(s.clock * .3 + i);
      if (s.mode !== 'sling') return;
      // A cor acompanha o lado atual: discos recebidos passam a ser jogáveis pelo rival.
      const side = s.sideOf(d), color = PLAYER_COLORS[side];
      sprite.setTint(PLAYER_TINTS[side]);
      marks.fillStyle(color, .45); marks.fillCircle(d.x, d.y, d.r - 1);
      marks.lineStyle(3, color, 1); marks.strokeCircle(d.x, d.y, d.r);
      this.discLabels[i].setPosition(d.x, d.y).setText(String(side + 1));
    });
    if (s.mode === 'sling') {
      this.updateRopes();
      this.callbacks.score(s.points);
      for (const [side, drag] of s.drags) {
        g.lineStyle(2, 0xffffff, .6); g.lineBetween(drag.x, drag.y, drag.x + (drag.anchor.x - drag.x) * 1.5, drag.y + (drag.anchor.y - drag.y) * 1.5);
      }
    }
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
    for (const e of this.effects) { this.fx.lineStyle(3, e.color, e.life / .3); this.fx.strokeCircle(e.x, e.y, 10 + (1 - e.life / .3) * 35); }
  }
}
