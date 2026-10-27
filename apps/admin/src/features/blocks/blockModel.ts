import type { ContentBlock, ContentBlockType } from '@techcapsule/contracts';

export const BLOCK_TYPES: { type: ContentBlockType; label: string }[] = [
  { type: 'heading', label: 'Heading' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'code', label: 'Code' },
  { type: 'callout', label: 'Callout' },
  { type: 'diagram', label: 'Diagram' },
  { type: 'image', label: 'Image' },
  { type: 'quiz', label: 'Quiz' },
];

export function uniqueId(base: string, taken: Iterable<string>): string {
  const ids = new Set(taken);
  if (!ids.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!ids.has(candidate)) return candidate;
  }
}

export function newBlock(type: ContentBlockType, existing: ContentBlock[]): ContentBlock {
  const id = uniqueId(
    type,
    existing.map((b) => b.id),
  );
  switch (type) {
    case 'heading':
      return { id, type, text: '', level: 2 };
    case 'paragraph':
      return { id, type, text: '' };
    case 'code':
      return { id, type, language: 'typescript', code: '' };
    case 'callout':
      return { id, type, variant: 'tip', text: '' };
    case 'image':
      return { id, type, url: '', alt: '' };
    case 'diagram':
      return {
        id,
        type,
        direction: 'vertical',
        nodes: [
          { id: 'a', label: '', tone: 'primary' },
          { id: 'b', label: '', tone: 'neutral' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      };
    case 'quiz':
      return {
        id,
        type,
        question: '',
        options: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
        ],
        correctOptionIds: [],
        explanation: '',
      };
  }
}

export function duplicateBlock(block: ContentBlock, existing: ContentBlock[]): ContentBlock {
  const copy = structuredClone(block);
  copy.id = uniqueId(
    `${block.id}-copy`,
    existing.map((b) => b.id),
  );
  return copy;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

const blank = (v: string | undefined) => (v && v.trim() ? v : undefined);

/** Drops empty optional text fields so the shared schema treats them as absent. */
export function cleanBlock(block: ContentBlock): ContentBlock {
  switch (block.type) {
    case 'code':
      return { ...block, filename: blank(block.filename), caption: blank(block.caption) };
    case 'image':
      return { ...block, caption: blank(block.caption) };
    case 'callout':
      return { ...block, title: blank(block.title) };
    case 'diagram':
      return {
        ...block,
        title: blank(block.title),
        caption: blank(block.caption),
        nodes: block.nodes.map((n) => ({ ...n, description: blank(n.description) })),
        edges: block.edges.map((e) => ({ ...e, label: blank(e.label) })),
      };
    default:
      return block;
  }
}

/** Splits `blocks.3.options.0.text`-style error keys into per-block maps. */
export function errorsByBlock(errors: Record<string, string>): Map<number, Record<string, string>> {
  const out = new Map<number, Record<string, string>>();
  for (const [key, message] of Object.entries(errors)) {
    const match = /^blocks\.(\d+)(?:\.(.*))?$/.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2] ?? '';
    const entry = out.get(index) ?? {};
    if (!(field in entry)) entry[field] = message;
    out.set(index, entry);
  }
  return out;
}
