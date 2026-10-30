import { test, expect } from '@playwright/test';

async function openMatch(page) {
  await page.goto('/');
  await page.locator('[data-mode="hockey"]').click();
  await page.locator('[data-opponent="local"]').click();
  await page.locator('#play').click();
  await expect(page.locator('#loading')).toBeHidden();
  await page.evaluate(() => {
    const scene = window.__arenaForTest(); scene.setPaused(true);
    scene.sim.points = [2, 1]; scene.callbacks.score(scene.sim.points);
  });
}

test('tela cheia nativa amplia a mesa e preserva partida ao entrar e sair', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openMatch(page);
  const before = await page.locator('#canvas-wrap').boundingBox();
  const initial = await page.evaluate(() => ({ points: window.__arenaForTest().sim.points, geometry: window.__arenaForTest().sim.geometry }));
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await expect(page.locator('#match')).toHaveClass('is-expanded');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('match');
  await expect(page.getByRole('button', { name: 'Sair da tela cheia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await page.locator('#canvas-wrap').boundingBox()).width).toBeGreaterThan(before.width);
  await page.screenshot({ path: 'test-results/fullscreen-native.png' });
  // Exercita a conversão de mouse para coordenadas lógicas após a ampliação.
  const player = await page.evaluate(() => {
    const scene = window.__arenaForTest(); scene.sim.countdown = 100; scene.setPaused(false);
    return { x: scene.sim.players[0].x, y: scene.sim.players[0].y };
  });
  const canvas = await page.locator('#game canvas').boundingBox();
  const x = canvas.x + (player.x - 50) * canvas.width / 1000, y = canvas.y + player.y * canvas.height / 560;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 75, y + 40, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__arenaForTest().sim.players[0].x)).toBeGreaterThan(player.x + 20);
  await expect.poll(() => page.evaluate(() => window.__arenaForTest().sim.players[0].y)).toBeGreaterThan(player.y + 10);
  await page.evaluate(() => window.__arenaForTest().setPaused(true));
  await page.getByRole('button', { name: 'Sair da tela cheia', exact: true }).click();
  await expect(page.locator('#match')).not.toHaveClass('is-expanded');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(await page.evaluate(() => ({ points: window.__arenaForTest().sim.points, geometry: window.__arenaForTest().sim.geometry }))).toEqual(initial);
  await expect(page.locator('#score-left')).toHaveText('2'); expect(errors).toEqual([]);
});

test('saída externa da tela cheia e retorno ao menu restauram os controles', async ({ page }) => {
  await openMatch(page); await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#fullscreen').click(); await expect(page.locator('#match')).toHaveClass('is-expanded');
  await page.locator('#back').click(); await expect(page.locator('#menu')).toBeVisible();
  expect(await page.evaluate(() => ({ fullscreen: document.fullscreenElement, overflow: document.body.style.overflow }))).toEqual({ fullscreen: null, overflow: '' });
});

test('ampliação alternativa funciona em celular sem Fullscreen API e sai por Escape', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }));
  await page.setViewportSize({ width: 844, height: 390 }); await openMatch(page);
  await page.locator('#fullscreen').click(); await expect(page.locator('#match')).toHaveClass('is-expanded');
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect.poll(async () => {
    const box = await page.locator('#canvas-wrap').boundingBox(); return box.y >= 0 && box.y + box.height <= 391;
  }).toBe(true);
  await page.screenshot({ path: 'test-results/fullscreen-mobile.png' });
  const box = await page.locator('#canvas-wrap').boundingBox(); expect(box.width / box.height).toBeCloseTo(1000 / 560, 1);
  await page.keyboard.press('Escape'); await expect(page.locator('#match')).not.toHaveClass('is-expanded');
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed', 'false');
});

test('falha na solicitação nativa usa ampliação da página', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => true });
    Element.prototype.requestFullscreen = () => Promise.reject(new Error('Indisponível neste navegador'));
  });
  await openMatch(page); await page.locator('#fullscreen').click();
  await expect(page.locator('#match')).toHaveClass('is-expanded');
  await page.locator('#fullscreen').click(); await expect(page.locator('#match')).not.toHaveClass('is-expanded');
});
