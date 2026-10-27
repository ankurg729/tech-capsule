import {
  CALLOUT_VARIANTS,
  CODE_LANGUAGES,
  DIAGRAM_TONES,
  type CalloutBlock,
  type CodeBlock,
  type ContentBlock,
  type ContentBlockType,
  type DiagramBlock,
  type HeadingBlock,
  type ImageBlock,
  type ParagraphBlock,
  type QuizBlock,
} from '@techcapsule/contracts';
import {
  Button,
  Checkbox,
  optionsOf,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { capitalize } from '@/lib/format';
import {
  BLOCK_TYPES,
  duplicateBlock,
  errorsByBlock,
  moveItem,
  newBlock,
  uniqueId,
} from './blockModel';

type Errors = Record<string, string>;
interface EditorProps<B> {
  block: B;
  onChange: (block: B) => void;
  errors: Errors;
}

const INLINE_HINT = (
  <>
    Supports <code>**bold**</code> and <code>`inline code`</code>. HTML is shown as plain text.
  </>
);

function HeadingEditor({ block, onChange, errors }: EditorProps<HeadingBlock>) {
  return (
    <div className="grid-2">
      <TextField
        label="Heading text"
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        error={errors.text}
        className="span-2-sm"
      />
      <SelectField
        label="Level"
        options={[
          { value: '2', label: 'Section (H2)' },
          { value: '3', label: 'Subsection (H3)' },
        ]}
        value={String(block.level) as '2' | '3'}
        onValueChange={(v) => onChange({ ...block, level: v === '3' ? 3 : 2 })}
      />
    </div>
  );
}

function ParagraphEditor({ block, onChange, errors }: EditorProps<ParagraphBlock>) {
  return (
    <TextAreaField
      label="Text"
      rows={5}
      value={block.text}
      onChange={(e) => onChange({ ...block, text: e.target.value })}
      error={errors.text}
      hint={INLINE_HINT}
    />
  );
}

function CodeEditor({ block, onChange, errors }: EditorProps<CodeBlock>) {
  return (
    <>
      <div className="grid-2">
        <SelectField
          label="Language"
          options={optionsOf(CODE_LANGUAGES)}
          value={block.language}
          onValueChange={(language) => onChange({ ...block, language })}
          error={errors.language}
        />
        <TextField
          label="Filename (optional)"
          value={block.filename ?? ''}
          onChange={(e) => onChange({ ...block, filename: e.target.value })}
          error={errors.filename}
          placeholder="server.ts"
        />
      </div>
      <TextAreaField
        label="Code"
        className="mono-field"
        rows={Math.min(24, Math.max(6, block.code.split('\n').length + 1))}
        spellCheck={false}
        value={block.code}
        onChange={(e) => onChange({ ...block, code: e.target.value })}
        error={errors.code}
        hint="Shown as text with syntax highlighting. It is never executed."
      />
      <TextField
        label="Caption (optional)"
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        error={errors.caption}
      />
    </>
  );
}

function CalloutEditor({ block, onChange, errors }: EditorProps<CalloutBlock>) {
  return (
    <>
      <div className="grid-2">
        <SelectField
          label="Variant"
          options={optionsOf(CALLOUT_VARIANTS, capitalize)}
          value={block.variant}
          onValueChange={(variant) => onChange({ ...block, variant })}
        />
        <TextField
          label="Title (optional)"
          value={block.title ?? ''}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          error={errors.title}
        />
      </div>
      <TextAreaField
        label="Text"
        rows={3}
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        error={errors.text}
        hint={INLINE_HINT}
      />
    </>
  );
}

function ImageEditor({ block, onChange, errors }: EditorProps<ImageBlock>) {
  return (
    <>
      <TextField
        label="Image URL"
        type="url"
        value={block.url}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
        error={errors.url}
        placeholder="https://…"
        hint="Must be an http(s) URL. Images are loaded directly by the app."
      />
      <div className="grid-2">
        <TextField
          label="Alt text"
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          error={errors.alt}
          hint="Describe the image for screen readers."
        />
        <TextField
          label="Aspect ratio (optional)"
          type="number"
          step="0.05"
          min="0.25"
          max="4"
          value={block.aspectRatio ?? ''}
          onChange={(e) =>
            onChange({
              ...block,
              aspectRatio: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          error={errors.aspectRatio}
          hint="Width ÷ height, e.g. 1.78 for 16:9."
        />
      </div>
      <TextField
        label="Caption (optional)"
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        error={errors.caption}
      />
    </>
  );
}

function DiagramEditor({ block, onChange, errors }: EditorProps<DiagramBlock>) {
  const nodeOptions = block.nodes.map((n) => ({ value: n.id, label: n.label || n.id }));
  const setNode = (i: number, patch: Partial<DiagramBlock['nodes'][number]>) =>
    onChange({ ...block, nodes: block.nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)) });
  const setEdge = (i: number, patch: Partial<DiagramBlock['edges'][number]>) =>
    onChange({ ...block, edges: block.edges.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <>
      <div className="grid-2">
        <TextField
          label="Title (optional)"
          value={block.title ?? ''}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          error={errors.title}
        />
        <SelectField
          label="Direction"
          options={[
            { value: 'vertical', label: 'Vertical (top → bottom)' },
            { value: 'horizontal', label: 'Horizontal (left → right)' },
          ]}
          value={block.direction}
          onValueChange={(direction) => onChange({ ...block, direction })}
        />
      </div>

      <fieldset className="subgroup">
        <legend>Nodes</legend>
        {errors.nodes ? <p className="field-error">{errors.nodes}</p> : null}
        {block.nodes.map((node, i) => (
          <div className="subrow" key={i}>
            <TextField
              label="Id"
              className="w-id"
              value={node.id}
              onChange={(e) => {
                const id = e.target.value;
                onChange({
                  ...block,
                  nodes: block.nodes.map((n, j) => (j === i ? { ...n, id } : n)),
                  edges: block.edges.map((edge) => ({
                    ...edge,
                    from: edge.from === node.id ? id : edge.from,
                    to: edge.to === node.id ? id : edge.to,
                  })),
                });
              }}
              error={errors[`nodes.${i}.id`]}
            />
            <TextField
              label="Label"
              value={node.label}
              onChange={(e) => setNode(i, { label: e.target.value })}
              error={errors[`nodes.${i}.label`]}
            />
            <TextField
              label="Description"
              value={node.description ?? ''}
              onChange={(e) => setNode(i, { description: e.target.value })}
              error={errors[`nodes.${i}.description`]}
            />
            <SelectField
              label="Tone"
              options={optionsOf(DIAGRAM_TONES, capitalize)}
              value={node.tone}
              onValueChange={(tone) => setNode(i, { tone })}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove node ${node.id}`}
              disabled={block.nodes.length <= 2}
              onClick={() =>
                onChange({
                  ...block,
                  nodes: block.nodes.filter((_, j) => j !== i),
                  edges: block.edges.filter((e) => e.from !== node.id && e.to !== node.id),
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          disabled={block.nodes.length >= 12}
          onClick={() =>
            onChange({
              ...block,
              nodes: [
                ...block.nodes,
                {
                  id: uniqueId(
                    'node',
                    block.nodes.map((n) => n.id),
                  ),
                  label: '',
                  tone: 'neutral',
                },
              ],
            })
          }
        >
          Add node
        </Button>
      </fieldset>

      <fieldset className="subgroup">
        <legend>Connections</legend>
        {block.edges.map((edge, i) => (
          <div className="subrow" key={i}>
            <SelectField
              label="From"
              options={nodeOptions}
              value={edge.from}
              onValueChange={(from) => setEdge(i, { from })}
              error={errors[`edges.${i}`]}
            />
            <SelectField
              label="To"
              options={nodeOptions}
              value={edge.to}
              onValueChange={(to) => setEdge(i, { to })}
            />
            <TextField
              label="Label"
              value={edge.label ?? ''}
              onChange={(e) => setEdge(i, { label: e.target.value })}
              error={errors[`edges.${i}.label`]}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove connection ${i + 1}`}
              onClick={() => onChange({ ...block, edges: block.edges.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          disabled={block.edges.length >= 24 || block.nodes.length < 2}
          onClick={() =>
            onChange({
              ...block,
              edges: [...block.edges, { from: block.nodes[0]!.id, to: block.nodes[1]!.id }],
            })
          }
        >
          Add connection
        </Button>
      </fieldset>

      <TextField
        label="Caption (optional)"
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        error={errors.caption}
      />
    </>
  );
}

function QuizEditor({ block, onChange, errors }: EditorProps<QuizBlock>) {
  const toggleCorrect = (id: string, correct: boolean) =>
    onChange({
      ...block,
      correctOptionIds: correct
        ? [...block.correctOptionIds, id]
        : block.correctOptionIds.filter((c) => c !== id),
    });

  return (
    <>
      <TextAreaField
        label="Question"
        rows={2}
        value={block.question}
        onChange={(e) => onChange({ ...block, question: e.target.value })}
        error={errors.question}
      />
      <fieldset className="subgroup">
        <legend>Options</legend>
        <p className="field-hint">
          Tick every correct option. Answer keys stay on the server and are only revealed to a
          learner after they submit.
        </p>
        {errors.options ? <p className="field-error">{errors.options}</p> : null}
        {errors.correctOptionIds ? <p className="field-error">{errors.correctOptionIds}</p> : null}
        {block.options.map((option, i) => (
          <div className="subrow" key={i}>
            <TextField
              label="Id"
              className="w-id"
              value={option.id}
              onChange={(e) => {
                const id = e.target.value;
                onChange({
                  ...block,
                  options: block.options.map((o, j) => (j === i ? { ...o, id } : o)),
                  correctOptionIds: block.correctOptionIds.map((c) => (c === option.id ? id : c)),
                });
              }}
              error={errors[`options.${i}.id`]}
            />
            <TextField
              label={`Option ${i + 1}`}
              value={option.text}
              onChange={(e) =>
                onChange({
                  ...block,
                  options: block.options.map((o, j) =>
                    j === i ? { ...o, text: e.target.value } : o,
                  ),
                })
              }
              error={errors[`options.${i}.text`]}
            />
            <Checkbox
              label="Correct"
              checked={block.correctOptionIds.includes(option.id)}
              onChange={(c) => toggleCorrect(option.id, c)}
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove option ${i + 1}`}
              disabled={block.options.length <= 2}
              onClick={() =>
                onChange({
                  ...block,
                  options: block.options.filter((_, j) => j !== i),
                  correctOptionIds: block.correctOptionIds.filter((c) => c !== option.id),
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          disabled={block.options.length >= 6}
          onClick={() =>
            onChange({
              ...block,
              options: [
                ...block.options,
                {
                  id: uniqueId(
                    String.fromCharCode(97 + block.options.length),
                    block.options.map((o) => o.id),
                  ),
                  text: '',
                },
              ],
            })
          }
        >
          Add option
        </Button>
      </fieldset>
      <TextAreaField
        label="Explanation"
        rows={3}
        value={block.explanation}
        onChange={(e) => onChange({ ...block, explanation: e.target.value })}
        error={errors.explanation}
        hint="Shown after the learner answers."
      />
    </>
  );
}

function BlockFields(props: EditorProps<ContentBlock>) {
  const { block } = props;
  // Each branch narrows the union, so the cast only re-labels the matching editor's props.
  switch (block.type) {
    case 'heading':
      return <HeadingEditor {...(props as EditorProps<HeadingBlock>)} />;
    case 'paragraph':
      return <ParagraphEditor {...(props as EditorProps<ParagraphBlock>)} />;
    case 'code':
      return <CodeEditor {...(props as EditorProps<CodeBlock>)} />;
    case 'callout':
      return <CalloutEditor {...(props as EditorProps<CalloutBlock>)} />;
    case 'image':
      return <ImageEditor {...(props as EditorProps<ImageBlock>)} />;
    case 'diagram':
      return <DiagramEditor {...(props as EditorProps<DiagramBlock>)} />;
    case 'quiz':
      return <QuizEditor {...(props as EditorProps<QuizBlock>)} />;
  }
}

const TYPE_LABEL = Object.fromEntries(BLOCK_TYPES.map((t) => [t.type, t.label])) as Record<
  ContentBlockType,
  string
>;

export function BlockEditor({
  blocks,
  onChange,
  errors,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  errors: Errors;
}) {
  const perBlock = errorsByBlock(errors);
  const update = (i: number, block: ContentBlock) =>
    onChange(blocks.map((b, j) => (j === i ? block : b)));
  const add = (type: ContentBlockType) => onChange([...blocks, newBlock(type, blocks)]);

  return (
    <div className="block-editor">
      {errors.blocks ? <p className="field-error">{errors.blocks}</p> : null}
      {blocks.length === 0 ? (
        <p className="muted">No content yet. Add a first block below.</p>
      ) : null}
      {blocks.map((block, i) => {
        const blockErrors = perBlock.get(i) ?? {};
        const invalid = Object.keys(blockErrors).length > 0;
        return (
          <section
            key={i}
            className={`block-card ${invalid ? 'block-invalid' : ''}`}
            aria-label={`Block ${i + 1}: ${TYPE_LABEL[block.type]}`}
          >
            <header className="block-head">
              <span className="block-type">{TYPE_LABEL[block.type]}</span>
              <TextField
                label="Block id"
                className="w-id inline-field"
                value={block.id}
                onChange={(e) => update(i, { ...block, id: e.target.value })}
                error={blockErrors.id}
              />
              <div className="row gap-xs">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => onChange(moveItem(blocks, i, i - 1))}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={i === blocks.length - 1}
                  onClick={() => onChange(moveItem(blocks, i, i + 1))}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = blocks.slice();
                    next.splice(i + 1, 0, duplicateBlock(block, blocks));
                    onChange(next);
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (
                      window.confirm(`Delete this ${TYPE_LABEL[block.type].toLowerCase()} block?`)
                    ) {
                      onChange(blocks.filter((_, j) => j !== i));
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </header>
            {blockErrors[''] ? <p className="field-error">{blockErrors['']}</p> : null}
            <BlockFields block={block} onChange={(b) => update(i, b)} errors={blockErrors} />
          </section>
        );
      })}
      <div className="add-block" role="group" aria-label="Add block">
        <span className="muted small">Add block:</span>
        {BLOCK_TYPES.map(({ type, label }) => (
          <Button key={type} size="sm" onClick={() => add(type)}>
            + {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
