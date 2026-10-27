import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * List filters live in the URL so they survive reloads and can be shared. Changing any
 * filter resets pagination to page 1.
 */
export function useListParams<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const key of keys) out[key] = params.get(key) ?? '';
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, keys.join(',')]);

  const page = Math.max(1, Number(params.get('page')) || 1);

  const setFilter = useCallback(
    (key: K, value: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      });
    },
    [setParams],
  );

  const setPage = useCallback(
    (p: number) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p > 1) next.set('page', String(p));
        else next.delete('page');
        return next;
      });
    },
    [setParams],
  );

  return { values, page, setFilter, setPage };
}
