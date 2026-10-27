export type InlineSegment = { type: 'text' | 'bold' | 'code'; text: string };

/**
 * Lesson paragraphs support a deliberately tiny syntax: **bold** and `inline code`.
 * Everything else is rendered as literal text — there is no HTML or link rendering.
 */
export function parseInline(source: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  const pattern = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`/g;
  let last = 0;
  for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
    if (m.index > last) out.push({ type: 'text', text: source.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: 'bold', text: m[1] });
    else out.push({ type: 'code', text: m[2] ?? '' });
    last = pattern.lastIndex;
  }
  if (last < source.length) out.push({ type: 'text', text: source.slice(last) });
  return out;
}
