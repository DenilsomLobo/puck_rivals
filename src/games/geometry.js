// Fonte única para colisões, pintura das linhas, gols e fixação dos elásticos.
export const FIELD = Object.freeze({ left: 90, right: 910, top: 70, bottom: 490 });
export function arenaGeometry(bounds = FIELD) {
  const { left, right, top, bottom } = bounds;
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const goalHeight = Math.min(132, (bottom - top) * .43);
  return {
    ...bounds, cx, cy, width: right - left, height: bottom - top,
    rail: 24, goalHeight, goalTop: cy - goalHeight / 2, goalBottom: cy + goalHeight / 2, goalDepth: 34,
    gap: 74, dividerWidth: 14,
    ropes: [left + 90, right - 90].map(x => ({ x, top: top + 24, bottom: bottom - 24 })),
  };
}
