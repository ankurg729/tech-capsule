import { parseInline, type ContentBlock, type DiagramBlock } from '@techcapsule/contracts';

/**
 * Renders content the way learners see it. Everything goes through React text nodes —
 * never `dangerouslySetInnerHTML` — so markup in lesson content is displayed, not executed.
 */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) =>
        seg.type === 'bold' ? (
          <strong key={i}>{seg.text}</strong>
        ) : seg.type === 'code' ? (
          <code key={i}>{seg.text}</code>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

function DiagramPreview({ block }: { block: DiagramBlock }) {
  const byId = new Map(block.nodes.map((n) => [n.id, n]));
  return (
    <figure className="pv-diagram">
      {block.title ? <figcaption className="pv-diagram-title">{block.title}</figcaption> : null}
      <div className={`pv-nodes pv-${block.direction}`}>
        {block.nodes.map((n) => (
          <div key={n.id} className={`pv-node tone-${n.tone}`}>
            <strong>{n.label || n.id}</strong>
            {n.description ? <small>{n.description}</small> : null}
          </div>
        ))}
      </div>
      {block.edges.length ? (
        <ul className="pv-edges">
          {block.edges.map((e, i) => (
            <li key={i}>
              {byId.get(e.from)?.label || e.from} → {byId.get(e.to)?.label || e.to}
              {e.label ? <em> ({e.label})</em> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {block.caption ? <figcaption className="pv-caption">{block.caption}</figcaption> : null}
    </figure>
  );
}

function PreviewBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return block.level === 3 ? (
        <h4 className="pv-h3">{block.text}</h4>
      ) : (
        <h3 className="pv-h2">{block.text}</h3>
      );
    case 'paragraph':
      return (
        <p className="pv-p">
          <InlineText text={block.text} />
        </p>
      );
    case 'code':
      return (
        <figure className="pv-code">
          <div className="pv-code-head">
            <span>{block.filename ?? block.language}</span>
          </div>
          <pre>
            <code>{block.code}</code>
          </pre>
          {block.caption ? <figcaption className="pv-caption">{block.caption}</figcaption> : null}
        </figure>
      );
    case 'callout':
      return (
        <aside className={`pv-callout pv-callout-${block.variant}`}>
          {block.title ? <strong>{block.title}</strong> : null}
          <p>
            <InlineText text={block.text} />
          </p>
        </aside>
      );
    case 'image':
      return (
        <figure className="pv-image">
          {block.url ? (
            <img
              src={block.url}
              alt={block.alt}
              referrerPolicy="no-referrer"
              style={block.aspectRatio ? { aspectRatio: String(block.aspectRatio) } : undefined}
            />
          ) : (
            <div className="pv-image-missing">Image URL missing</div>
          )}
          {block.caption ? <figcaption className="pv-caption">{block.caption}</figcaption> : null}
        </figure>
      );
    case 'diagram':
      return <DiagramPreview block={block} />;
    case 'quiz':
      return (
        <section className="pv-quiz">
          <span className="pv-quiz-label">
            Quiz{block.correctOptionIds.length > 1 ? ' · select all that apply' : ''}
          </span>
          <p className="pv-quiz-q">{block.question}</p>
          <ul>
            {block.options.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
          <p className="pv-admin-note">
            Admin only — correct: {block.correctOptionIds.join(', ') || 'none selected'}.{' '}
            {block.explanation}
          </p>
        </section>
      );
  }
}

export function BlockPreview({
  title,
  summary,
  blocks,
  meta,
}: {
  title: string;
  summary?: string;
  blocks: ContentBlock[];
  meta?: string;
}) {
  return (
    <article className="preview" aria-label="Learner preview">
      {meta ? <span className="pv-meta">{meta}</span> : null}
      <h2 className="pv-title">{title || 'Untitled lesson'}</h2>
      {summary ? <p className="pv-summary">{summary}</p> : null}
      {blocks.map((block, i) => (
        <PreviewBlock key={`${block.id}-${i}`} block={block} />
      ))}
    </article>
  );
}
