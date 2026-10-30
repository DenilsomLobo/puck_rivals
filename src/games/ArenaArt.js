const materials = {
  wood: { dark: 0x24150f, body: 0x56351e, light: 0xc8914d, bolt: 0xf2d18a },
  cartoon: { dark: 0x3e281e, body: 0xa36531, light: 0xffc568, bolt: 0xffe2aa },
  neon: { dark: 0x080e20, body: 0x22304c, light: 0x526582, bolt: 0xa6c5de },
};

export function paintTable(scene, theme, colors) {
  const { geometry: a, mode } = scene.sim, m = materials[theme];
  // Cenário atrás da mesa: objetos nunca cobrem o campo, os gols ou a entrada.
  scene.environment = scene.add.image(500, 280, 'environment').setDisplaySize(1000, 560);
  const shadow = scene.add.graphics(); shadow.fillStyle(0x000000, .6);
  shadow.fillRoundedRect(a.left - 33, a.top - 22, a.width + 66, a.height + 68, 25);
  const floor = scene.add.image(a.cx, a.cy, 'surface').setDisplaySize(a.width, a.height);
  const g = scene.add.graphics();
  function rail(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    g.fillStyle(m.dark); g.fillRoundedRect(x, y, w, h, 6);
    g.fillStyle(m.body); g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 4);
    g.lineStyle(2, m.light, .85); g.lineBetween(x + 5, y + 4, x + w - 5, y + 4);
    g.lineStyle(1, m.light, .38); g.strokeRoundedRect(x + 5, y + 6, w - 10, h - 11, 3);
  }
  rail(a.left - a.rail, a.top - a.rail, a.width + a.rail * 2, a.rail);
  rail(a.left - a.rail, a.bottom, a.width + a.rail * 2, a.rail);
  for (let side = 0; side < 2; side++) {
    const x = side ? a.right : a.left - a.rail, color = colors[side];
    if (mode === 'sling') rail(x, a.top, a.rail, a.height);
    else {
      const goalTop = mode === 'pong' ? a.top : a.goalTop;
      const goalBottom = mode === 'pong' ? a.bottom : a.goalBottom;
      const edge = side ? a.right : a.left;
      // A boca pintada usa exatamente os limites empregados na colisão.
      const pocketX = side ? edge : edge - a.goalDepth;
      g.fillStyle(0x040811); g.fillRect(pocketX, goalTop, a.goalDepth, goalBottom - goalTop);
      g.lineStyle(1, color, .26);
      for (let y = goalTop + 5; y < goalBottom; y += 9) g.lineBetween(pocketX + 2, y, pocketX + a.goalDepth - 2, y);
      for (let gx = pocketX + 5; gx < pocketX + a.goalDepth; gx += 8) g.lineBetween(gx, goalTop + 2, gx, goalBottom - 2);
      g.lineStyle(3, color, .85); g.strokeRect(pocketX, goalTop, a.goalDepth, goalBottom - goalTop);
      rail(x, a.top, a.rail, goalTop - a.top); rail(x, goalBottom, a.rail, a.bottom - goalBottom);
      for (const y of [goalTop, goalBottom]) { g.fillStyle(m.dark); g.fillCircle(edge, y, 7); g.fillStyle(color); g.fillCircle(edge, y, 4); }
    }
  }
  // Rebites e acabamentos ficam fora do retângulo jogável.
  for (let x = a.left; x <= a.right; x += 82) for (const y of [a.top - 12, a.bottom + 12]) {
    g.fillStyle(m.dark); g.fillCircle(x + 1, y + 1, 4); g.fillStyle(m.bolt); g.fillCircle(x, y, 3);
    g.lineStyle(1, m.dark); g.lineBetween(x - 1.5, y, x + 1.5, y);
  }
  if (theme === 'neon') for (let side = 0; side < 2; side++) {
    g.lineStyle(3, colors[side], .9);
    for (const y of [a.top - 12, a.bottom + 12]) g.lineBetween(side ? a.cx + 15 : a.left + 15, y, side ? a.right - 15 : a.cx - 15, y);
  }
  return { floor, frame: g };
}

export function paintMarkings(g, sim, art, colors) {
  const a = sim.geometry;
  if (sim.mode === 'sling') {
    g.fillStyle(0x000000, .3);
    const half = a.dividerWidth / 2;
    for (const [y, h] of [[a.top, a.cy - a.gap / 2 - a.top], [a.cy + a.gap / 2, a.bottom - a.cy - a.gap / 2]]) {
      g.fillRoundedRect(a.cx - half + 3, y + 3, a.dividerWidth, h, 3);
      g.fillStyle(materials[sim.theme || 'wood']?.body || 0x3c3142);
      g.fillRoundedRect(a.cx - half, y, a.dividerWidth, h, 3);
      g.lineStyle(2, art.line, .8); g.strokeRoundedRect(a.cx - half, y, a.dividerWidth, h, 3);
    }
    for (let side = 0; side < 2; side++) for (const y of [a.ropes[side].top, a.ropes[side].bottom]) {
      const x = a.ropes[side].x;
      g.fillStyle(0x060a17, .7); g.fillCircle(x + 2, y + 2, 9);
      g.fillStyle(colors[side]); g.fillCircle(x, y, 7); g.fillStyle(0xfff0c4); g.fillCircle(x - 1, y - 1, 3);
    }
    return;
  }
  g.lineStyle(2, art.line, .45);
  for (let y = a.top + 5; y < a.bottom; y += 18) g.lineBetween(a.cx, y, a.cx, Math.min(y + 9, a.bottom));
  g.strokeCircle(a.cx, a.cy, 64); g.fillStyle(art.line, .7); g.fillCircle(a.cx, a.cy, 4);
  if (sim.mode === 'hockey') for (let side = 0; side < 2; side++) {
    const x = side ? a.right : a.left;
    g.lineStyle(2, colors[side], .55); g.beginPath();
    g.arc(x, a.cy, a.goalHeight * .68, side ? Math.PI / 2 : -Math.PI / 2, side ? Math.PI * 1.5 : Math.PI / 2);
    g.strokePath();
  }
}
