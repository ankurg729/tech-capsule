import { contentBlocksSchema, type ContentBlock } from '@techcapsule/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { issuesToFieldErrors } from '@/lib/forms';
import {
  BLOCK_TYPES,
  cleanBlock,
  duplicateBlock,
  errorsByBlock,
  moveItem,
  newBlock,
  uniqueId,
} from './blockModel';
import { BlockPreview } from './BlockPreview';

describe('block model', () => {
  it('creates a starter block for every type with unique ids', () => {
    const blocks: ContentBlock[] = [];
    for (const { type } of BLOCK_TYPES) blocks.push(newBlock(type, blocks));
    blocks.push(newBlock('paragraph', blocks));
    expect(new Set(blocks.map((b) => b.id)).size).toBe(blocks.length);
    expect(blocks.at(-1)!.id).toBe('paragraph-2');
  });

  it('maps shared-schema errors onto the block and field that caused them', () => {
    const quiz = newBlock('quiz', []);
    const result = contentBlocksSchema.safeParse([
      { id: 'intro', type: 'paragraph', text: 'Hello' },
      quiz,
    ]);
    expect(result.success).toBe(false);
    const errors = issuesToFieldErrors(
      result.error!.issues.map((i) => ({ ...i, path: ['blocks', ...i.path] })),
    );
    const perBlock = errorsByBlock(errors);
    expect(perBlock.has(0)).toBe(false);
    expect(perBlock.get(1)).toMatchObject({
      question: expect.any(String),
      'options.0.text': expect.any(String),
      correctOptionIds: expect.any(String),
    });
  });

  it('drops blank optional fields so they validate as absent', () => {
    const code = cleanBlock({
      id: 'c',
      type: 'code',
      language: 'bash',
      code: 'npm test',
      filename: '  ',
      caption: '',
    });
    expect(code).not.toHaveProperty('filename', '  ');
    expect(contentBlocksSchema.safeParse([code]).success).toBe(true);
  });

  it('duplicates, reorders and generates collision-free ids', () => {
    const a = newBlock('heading', []);
    const copy = duplicateBlock(a, [a]);
    expect(copy.id).toBe('heading-copy');
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(uniqueId('a', ['a', 'a-2'])).toBe('a-3');
  });
});

describe('learner preview', () => {
  it('renders HTML in content as literal text, never as markup', () => {
    const { container } = render(
      <BlockPreview
        title="XSS check"
        blocks={[
          { id: 'p', type: 'paragraph', text: 'Hi <script>alert(1)</script> **bold** `code`' },
          { id: 'c', type: 'code', language: 'text', code: '<img src=x onerror=alert(1)>' },
        ]}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
