import { useMemo, useState } from 'react';
import { CalendarRange, CheckSquare, Loader2, RefreshCw } from 'lucide-react';
import { authHeaders } from '../storage';
import { useAuth } from '../hooks';
import {
  buildMockApplicationContext,
  getStudyPlan,
} from '../utils/mockInterview';
import { getWorkspace } from '../utils/companyWorkspace';
import { getPrepChecklist } from '../utils/interviewPrepHub';
import EmptyState from './EmptyState';

function formatDayLabel(day) {
  if (day.label) return day.label;
  try {
    return new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return day.date;
  }
}

export default function StudyPlanPanel({ app, profile = null, onUpdate, onOpenMock }) {
  const { getToken } = useAuth();
  const plan = useMemo(() => getStudyPlan(app), [app]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const checklistGaps = useMemo(() => {
    return getPrepChecklist(app, profile)
      .filter((item) => !item.done)
      .map((item) => item.label);
  }, [app, profile]);

  const persistPlan = (studyPlan) => {
    const workspace = getWorkspace(app);
    onUpdate?.(app.id, {
      workspace: {
        ...workspace,
        studyPlan,
      },
    });
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const ctx = buildMockApplicationContext(app, profile);
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders(getToken)),
      };
      const res = await fetch('/api/mock-interview/plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicationContext: ctx,
          checklistGaps,
          interviewAt: ctx.interviewAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate study plan');
      }
      const data = await res.json();
      persistPlan(data.studyPlan);
    } catch (e) {
      setError(e.message || 'Could not generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = (dayDate, itemId) => {
    if (!plan?.days) return;
    const days = plan.days.map((day) => {
      if (day.date !== dayDate) return day;
      return {
        ...day,
        items: (day.items || []).map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        ),
      };
    });
    const nextPlan = { ...plan, days };
    const workspace = getWorkspace(app);
    const extras = {};
    const mockDone = days.some((day) =>
      (day.items || []).some((item) => item.kind === 'mock' && item.done)
    );
    if (mockDone) {
      extras.interviewPrep = {
        ...(workspace.interviewPrep || {}),
        practiced: true,
        lastPracticedAt: new Date().toISOString(),
      };
    }
    onUpdate?.(app.id, {
      workspace: {
        ...workspace,
        ...extras,
        studyPlan: nextPlan,
      },
    });
  };

  const totalItems = plan?.days?.reduce((n, d) => n + (d.items?.length || 0), 0) || 0;
  const doneItems = plan?.days?.reduce(
    (n, d) => n + (d.items || []).filter((i) => i.done).length,
    0
  ) || 0;

  return (
    <div className="workspace-panel study-plan">
      <article className="workspace-card">
        <div className="workspace-card__header">
          <CalendarRange size={18} />
          <div>
            <h3>Study plan</h3>
            <p>
              A routine for {app.company || 'this'} interview
              {checklistGaps.length ? ` · ${checklistGaps.length} prep gaps` : ''}.
            </p>
          </div>
        </div>

        <div className="study-plan__actions">
          <button
            type="button"
            className="submit-btn"
            onClick={generate}
            disabled={generating}
          >
            {generating ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {plan ? 'Regenerate plan' : 'Generate study plan'}
          </button>
          {onOpenMock && (
            <button type="button" className="auth-btn" onClick={onOpenMock}>
              Open mock interview
            </button>
          )}
        </div>

        {error && <p className="mock-interview__error">{error}</p>}

        {!plan?.days?.length ? (
          <EmptyState
            compact
            title="No study plan yet"
            body="Generate a short daily routine from this job’s gaps, stage, and interview date."
          />
        ) : (
          <>
            <p className="study-plan__progress">
              <CheckSquare size={14} />
              {doneItems}/{totalItems} blocks done
              {plan.interviewAt
                ? ` · interview ${new Date(plan.interviewAt).toLocaleDateString()}`
                : ''}
            </p>
            <div className="study-plan__days">
              {plan.days.map((day) => (
                <article key={day.date} className="study-plan__day">
                  <header>
                    <strong>{formatDayLabel(day)}</strong>
                    <span>{day.date}</span>
                  </header>
                  <ul>
                    {(day.items || []).map((item) => (
                      <li key={item.id}>
                        <label className={item.done ? 'is-done' : ''}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.done)}
                            onChange={() => toggleItem(day.date, item.id)}
                          />
                          <span>
                            <em>{item.kind}</em>
                            {item.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  );
}
