import type { AuditEntryDTO } from '@techcapsule/contracts';
import { formatDateTime } from '@/lib/format';
import { EmptyState } from './ui';

function summarize(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join(' · ');
}

export function AuditTable({ entries }: { entries: AuditEntryDTO[] }) {
  if (!entries.length) return <EmptyState title="No audit entries yet" />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="nowrap">{formatDateTime(e.createdAt)}</td>
              <td>{e.actor ? e.actor.displayName : <span className="muted">deleted user</span>}</td>
              <td>
                <code>{e.action}</code>
              </td>
              <td>
                {e.targetType}
                {e.targetId ? <small className="muted mono"> {e.targetId}</small> : null}
              </td>
              <td className="muted small">{summarize(e.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
