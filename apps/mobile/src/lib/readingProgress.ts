/** Scroll-based progress stops short of 100 so completion is always an explicit action. */
export const MAX_SCROLL_PERCENT = 95;
/** Minimum change before a progress update is sent to the API. */
export const SAVE_STEP_PERCENT = 5;

export interface BlockPosition {
  id: string;
  y: number;
  isHeading: boolean;
}

/**
 * Derives reading progress from the scroll position: a block counts as read once its top edge
 * passes 85% of the viewport. The section is the last heading scrolled past (for resume).
 */
export function computeReadingState(
  positions: readonly BlockPosition[],
  scrollY: number,
  viewportHeight: number,
): { percent: number; sectionId: string | null } {
  if (positions.length === 0) return { percent: 0, sectionId: null };
  const readLine = scrollY + viewportHeight * 0.85;
  const sectionLine = scrollY + 96;
  let read = 0;
  let sectionId: string | null = positions[0]?.id ?? null;
  for (const p of positions) {
    if (p.y <= readLine) read += 1;
    if (p.isHeading && p.y <= sectionLine) sectionId = p.id;
  }
  const percent = Math.round((read / positions.length) * MAX_SCROLL_PERCENT);
  return { percent: Math.min(MAX_SCROLL_PERCENT, percent), sectionId };
}

export function shouldSave(
  last: { percent: number; sectionId: string | null },
  next: { percent: number; sectionId: string | null },
): boolean {
  return (
    next.percent >= last.percent + SAVE_STEP_PERCENT ||
    (next.sectionId !== null && next.sectionId !== last.sectionId)
  );
}
