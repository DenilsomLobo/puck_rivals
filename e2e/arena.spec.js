import { test, expect } from '@playwright/test';

for (const theme of ['wood', 'cartoon', 'neon']) {
  test(`campo e gol no tema ${theme}`, async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.locator(`button[data-theme="${theme}"]`).click();
    await page.locator('[data-mode="hockey"]').click();
    await page.locator('[data-opponent="local"]').click();
    await page.locator('#play').click();
    await expect(page.locator('#loading')).toBeHidden();
    await page.evaluate(() => {
      const scene = window.__arenaForTest(); scene.setPaused(true);
      scene.sim.countdown = 0; scene.renderState(0);
    });
    await page.locator('#canvas-wrap').screenshot({ path: `test-results/hockey-${theme}.png` });
    const state = await page.evaluate(() => {
      const scene = window.__arenaForTest(), s = scene.sim, d = s.discs[0], a = s.geometry;
      Object.assign(d, { x: a.left + 12, y: a.cy, vx: -700, vy: 0 });
      for (let i = 0; i < 20; i++) s.step(1 / 120);
      return { points: s.points, geometry: a, transform: [scene.scaleX, scene.scaleY, scene.offsetX, scene.offsetY] };
    });
    expect(state.points).toEqual([0, 1]); expect(state.transform).toEqual([1, 1, 0, 0]);
    expect(state.geometry).toMatchObject({ left: 90, right: 910, top: 70, bottom: 490, goalTop: 214, goalBottom: 346 });
    await page.locator('#back').click();
    await expect(page.locator('#menu')).toBeVisible(); expect(errors).toEqual([]);
  });
}

test('corda acompanha os fixadores e vitória aparece imediatamente no Sling Puck', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.locator('[data-mode="sling"]').click(); await page.locator('#play').click();
  await expect(page.locator('#loading')).toBeHidden();
  const positions = await page.evaluate(() => {
    const scene = window.__arenaForTest(); scene.setPaused(true); scene.sim.countdown = 0; scene.renderState(0);
    return scene.ropeSprites.map((sprites, side) => ({ anchor: scene.sim.geometry.ropes[side], sprites: sprites.map(s => ({ x: s.x, y: s.y, rotation: s.rotation })) }));
  });
  for (const { anchor, sprites } of positions) {
    expect(sprites[0].x).toBe(anchor.x); expect(sprites[0].y).toBe(anchor.top);
    expect(sprites[1].x).toBe(anchor.x); expect(sprites[1].y).toBe(280);
  }
  await page.locator('#canvas-wrap').screenshot({ path: 'test-results/sling-rest.png' });
  await page.evaluate(() => {
    const scene = window.__arenaForTest(), s = scene.sim, d = s.discs[2];
    s.startDrag(0, d.x, d.y); s.drag(0, s.geometry.ropes[0].x - 60, s.cy + 35); scene.renderState(0);
  });
  await page.locator('#canvas-wrap').screenshot({ path: 'test-results/sling-pull.png' });
  await page.evaluate(() => {
    const scene = window.__arenaForTest(), s = scene.sim; s.release(0, true);
    s.discs.forEach((d, i) => Object.assign(d, { x: s.cx + 60 + i % 3 * 65, y: s.bounds.top + 35 + Math.floor(i / 3) * 65, vx: 300, vy: 90 }));
    scene.setPaused(false); scene.update(0, 17);
  });
  await expect(page.locator('#overlay')).toBeVisible(); await expect(page.locator('#message')).toHaveText('Você venceu!');
  await page.locator('#rematch').click(); await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#overlay')).toBeHidden(); await expect(page.locator('#score-left')).toHaveText('5');
  expect(errors).toEqual([]);
});
