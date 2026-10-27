import type { Model, Types } from 'mongoose';
import { badRequest, conflict } from './errors.js';
import { slugify } from './text.js';

/**
 * Explicit slugs must be free (409 otherwise). Generated slugs get a numeric suffix until
 * they're unique; the unique index remains the final guarantee against races.
 */
export async function resolveSlug(
  model: Model<{ slug: string }>,
  title: string,
  explicit: string | undefined,
  excludeId?: Types.ObjectId,
): Promise<string> {
  const taken = async (slug: string) =>
    Boolean(await model.exists(excludeId ? { slug, _id: { $ne: excludeId } } : { slug }));

  if (explicit) {
    if (await taken(explicit)) throw conflict(`Slug "${explicit}" is already in use`);
    return explicit;
  }
  const base = slugify(title);
  if (base.length < 3) throw badRequest('Title must produce a valid slug; provide one explicitly');
  let candidate = base;
  for (let i = 2; await taken(candidate); i++) candidate = `${base}-${i}`;
  return candidate;
}
