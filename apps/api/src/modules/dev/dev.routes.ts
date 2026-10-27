import { Router } from 'express';
import { devOutbox } from '../../integrations/email/index.js';
import { ok } from '../../lib/http.js';

/**
 * Development-only helpers. Mounted only when NODE_ENV !== 'production' AND
 * EMAIL_PROVIDER=log, so this can never expose codes in a real deployment.
 */
export function devRoutes(): Router | null {
  if (!devOutbox) return null;
  const outbox = devOutbox;
  const r = Router();
  r.get('/dev/emails', (req, res) => {
    const to = typeof req.query.to === 'string' ? req.query.to.toLowerCase() : undefined;
    ok(
      res,
      outbox.list().filter((m) => !to || m.to === to),
    );
  });
  return r;
}
