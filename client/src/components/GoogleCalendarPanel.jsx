import { useEffect, useState } from 'react';
import { Calendar, Link2, Unlink, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks';
import { authHeaders } from '../storage';

function formatEventWhen(start) {
  if (!start) return 'No time';
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return start;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GoogleCalendarPanel({ enabled = true, onSynced }) {
  const { isAuthenticated, getToken } = useAuth();
  const [status, setStatus] = useState({ configured: false, connected: false });
  const [events, setEvents] = useState([]);
  const [applied, setApplied] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    if (!isAuthenticated || !enabled) return;
    try {
      setError(null);
      const res = await fetch('/api/google/status', {
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to check Google status');
      setStatus(data);
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const syncCalendar = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to sync calendar');

      setEvents(Array.isArray(data.events) ? data.events : []);
      setApplied(Array.isArray(data.applied) ? data.applied : []);
      setSkipped(Array.isArray(data.skipped) ? data.skipped : []);
      setGroups(Array.isArray(data.groups) ? data.groups : []);

      const updated = data.updatedCount || 0;
      const created = data.createdCount || 0;
      const skippedCount = data.skippedCount || 0;
      const mode = data.classifier === 'llm' ? 'LLM' : 'heuristic';
      if ((data.matched || 0) === 0) {
        setMessage('No job-related events found (personal calendar not listed).');
      } else {
        setMessage(
          `Intelligence [${mode}]: ${updated} updated, ${created} added, ${skippedCount} skipped across ${(data.groups || []).length} company group${(data.groups || []).length === 1 ? '' : 's'}.`
        );
      }

      if (Array.isArray(data.applications) && onSynced) {
        onSynced(data.applications, data.applied || []);
      }
    } catch (e) {
      setError(e.message);
      setEvents([]);
      setApplied([]);
      setSkipped([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'connected') {
      setMessage('Google Calendar connected.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (google === 'error') {
      setError(params.get('reason') || 'Google connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;
    (async () => {
      const next = await loadStatus();
      if (next?.connected) await syncCalendar();
    })();
  }, [isAuthenticated, enabled]);

  if (!enabled || !isAuthenticated) return null;

  const connect = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/google/connect', {
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to start Google connect');
      if (!data.url) throw new Error('Google connect URL missing');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/google/disconnect', {
        method: 'DELETE',
        headers: await authHeaders(getToken),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to disconnect Google');
      }
      setStatus({ configured: true, connected: false });
      setEvents([]);
      setApplied([]);
      setSkipped([]);
      setGroups([]);
      setMessage('Google Calendar disconnected.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!status.configured) {
    return (
      <section className="google-cal-panel google-cal-panel--muted">
        <div className="google-cal-panel__head">
          <Calendar size={16} />
          <h3>Google Calendar</h3>
        </div>
        <p>
          {error
            ? `Could not reach the calendar API (${error}). Restart the local server with npm run dev.`
            : 'Server is running without Google OAuth env vars. Restart npm run dev after saving GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI in .env.'}
        </p>
      </section>
    );
  }

  return (
    <section className="google-cal-panel">
      <div className="google-cal-panel__head">
        <Calendar size={16} />
        <h3>Google Calendar</h3>
        <span className={`google-cal-panel__badge ${status.connected ? 'is-on' : ''}`}>
          {status.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <p className="google-cal-panel__hint">
        After retrieval, an intelligence layer judges relevance, company vs task, existing vs new, and groups multiple events for the same employer before updating your pipeline.
      </p>

      <div className="google-cal-panel__actions">
        {!status.connected ? (
          <button type="button" className="auth-btn auth-btn--primary" onClick={connect} disabled={busy}>
            <Link2 size={15} />
            Connect Google Calendar
          </button>
        ) : (
          <>
            <button type="button" className="auth-btn auth-btn--primary" onClick={syncCalendar} disabled={loading || busy}>
              <RefreshCw size={15} />
              Sync to pipeline
            </button>
            <button type="button" className="auth-btn auth-btn--ghost" onClick={disconnect} disabled={busy}>
              <Unlink size={15} />
              Disconnect
            </button>
          </>
        )}
      </div>

      {message && <p className="google-cal-panel__msg">{message}</p>}
      {error && <p className="google-cal-panel__error">{error}</p>}

      {status.connected && groups.length > 0 && (
        <div className="google-cal-panel__groups">
          <p className="google-cal-panel__empty">Company groups</p>
          <ul>
            {groups.slice(0, 12).map((group) => (
              <li key={`${group.company}-${group.action}`}>
                <strong>{group.company}</strong>
                <span>{group.action} · {group.eventCount} event{group.eventCount === 1 ? '' : 's'}</span>
                {group.reason && <em className="google-cal-panel__match">{group.reason}</em>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.connected && applied.length > 0 && (
        <div className="google-cal-panel__applied">
          <p className="google-cal-panel__empty">Pipeline changes</p>
          <ul>
            {applied.slice(0, 12).map((item) => (
              <li key={`${item.eventId}-${item.applicationId}`}>
                <strong>{item.company}</strong>
                <span>{item.changes.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.connected && skipped.length > 0 && (
        <div className="google-cal-panel__skipped">
          <p className="google-cal-panel__empty">Skipped (task / not a company)</p>
          <ul>
            {skipped.slice(0, 8).map((item) => (
              <li key={item.eventId}>
                <strong>{item.eventTitle}</strong>
                <span>{item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status.connected && (
        <div className="google-cal-panel__events">
          {loading ? (
            <p className="google-cal-panel__empty">Syncing calendar…</p>
          ) : events.length === 0 ? (
            <p className="google-cal-panel__empty">
              No job-related events in this window.
            </p>
          ) : (
            <ul>
              {events.slice(0, 12).map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <span>{formatEventWhen(event.start)}</span>
                  {event.matchedCompany && (
                    <em className="google-cal-panel__match">{event.matchedCompany}</em>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
