import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/**
 * Warns before in-app navigation or tab close while a form has unsaved edits. Call the
 * returned function right before a navigation that should never be blocked (e.g. after save).
 */
export function useUnsavedChanges(dirty: boolean): () => void {
  const bypass = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypass.current && dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return useCallback(() => {
    bypass.current = true;
  }, []);
}
