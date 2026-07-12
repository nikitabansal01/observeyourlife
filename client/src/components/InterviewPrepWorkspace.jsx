import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileQuestion,
  Library,
  Lightbulb,
  Mic,
  NotebookPen,
  Sparkles,
  Target,
} from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { getProcess } from '../utils/processSteps';
import {
  getInterviewPrepDefaults,
  getOverviewDefaults,
} from '../utils/companyWorkspace';
import {
  getNextPrepTask,
  getPrepChecklist,
  getPrepProgress,
} from '../utils/interviewPrepHub';
import { formatInterviewWhen } from '../utils/todayInsights';

/** Section shell for future prep work — only Overview is live this iteration. */
const SECTIONS = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: ClipboardList },
  { id: 'criteria', label: 'Evaluation criteria', shortLabel: 'Criteria', icon: Target },
  { id: 'questions', label: 'Practice questions', shortLabel: 'Questions', icon: FileQuestion },
  { id: 'exercise', label: 'Product exercise', shortLabel: 'Exercise', icon: Sparkles },
  { id: 'stories', label: 'Behavioral stories', shortLabel: 'Stories', icon: Library },
  { id: 'concepts', label: 'Concepts to review', shortLabel: 'Concepts', icon: Lightbulb },
  { id: 'notes', label: 'Notes', shortLabel: 'Notes', icon: NotebookPen },
  { id: 'mock', label: 'Mock interview', shortLabel: 'Mock', icon: Mic },
];

function upcomingAt(app) {
  const now = Date.now() - 60 * 60 * 1000;
  const dates = (app?.interviewDates || [])
    .map((value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter(Boolean)
    .filter((d) => d.getTime() >= now)
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() || null;
}

export default function InterviewPrepWorkspace({
  app,
  roundIndex: roundIndexProp = null,
  roundLabel: roundLabelProp = null,
  onBack,
  profile = null,
  direction = null,
  initialSection = 'overview',
  onOpenCompanyMock,
}) {
  const [section, setSection] = useState(initialSection);
  const accent = STATUS_COLORS[app.status] || 'var(--accent-cyan)';
  const { steps, index: processIndex, currentLabel } = getProcess(app);
  const roundIndex =
    Number.isInteger(roundIndexProp) && roundIndexProp >= 0
      ? Math.min(roundIndexProp, steps.length - 1)
      : processIndex;
  const roundLabel = roundLabelProp || steps[roundIndex] || currentLabel || 'Interview round';
  const overview = useMemo(() => getOverviewDefaults(app), [app]);
  const prep = useMemo(() => getInterviewPrepDefaults(app, profile), [app, profile]);
  const checklist = useMemo(() => getPrepChecklist(app, profile), [app, profile]);
  const progress = useMemo(() => getPrepProgress(app, profile), [app, profile]);
  const nextTask = useMemo(() => getNextPrepTask(app, profile), [app, profile]);
  const at = useMemo(() => upcomingAt(app), [app]);
  const pathTitle = direction?.primaryTitle || prep.pathTitle || 'Target path';
  const roleLabel = overview.role || 'Role TBD';
  const activeSection = SECTIONS.find((s) => s.id === section) || SECTIONS[0];

  useEffect(() => {
    setSection(initialSection);
  }, [app.id, roundIndex, initialSection]);

  return (
    <section className="prep-workspace" style={{ '--workspace-accent': accent }}>
      <header className="prep-workspace__header">
        <button type="button" className="auth-btn prep-workspace__back" onClick={onBack}>
          <ArrowLeft size={16} />
          Interview Prep
        </button>

        <nav className="prep-workspace__crumb" aria-label="Prep location">
          <span>Interview Prep</span>
          <span aria-hidden="true">→</span>
          <span>{overview.company}</span>
          <span aria-hidden="true">→</span>
          <span>{roundLabel}</span>
          <span aria-hidden="true">→</span>
          <span>
            {roleLabel} · {pathTitle}
          </span>
        </nav>

        <div className="prep-workspace__title">
          <div>
            <p className="ui-block__label">{overview.company}</p>
            <h2>{roundLabel}</h2>
            <p>
              {roleLabel} · {pathTitle}
            </p>
          </div>
          <span className="prep-workspace__status" style={{ '--status-color': accent }}>
            {STATUS_LABELS[app.status] || app.status}
          </span>
        </div>
      </header>

      <div className="company-workspace__tabs prep-workspace__tabs" role="tablist" aria-label="Prep sections">
        {SECTIONS.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            aria-label={label}
            title={label}
            className={`company-workspace__tab${section === id ? ' company-workspace__tab--active' : ''}`}
            onClick={() => setSection(id)}
          >
            <Icon size={15} />
            <span className="company-workspace__tab-label">{label}</span>
            <span className="company-workspace__tab-short">{shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="prep-workspace__body" role="tabpanel">
        {section === 'overview' ? (
          <div className="workspace-panel">
            <div className="workspace-panel__grid">
              <article className="workspace-card">
                <div className="workspace-card__header">
                  <CalendarClock size={18} />
                  <div>
                    <h3>This round</h3>
                  </div>
                </div>
                <dl className="workspace-facts">
                  <div className="workspace-fact">
                    <dt>When</dt>
                    <dd>{at ? formatInterviewWhen(at) : overview.upcomingInterview || 'Date TBD'}</dd>
                  </div>
                  <div className="workspace-fact">
                    <dt>Round</dt>
                    <dd>{roundLabel}</dd>
                  </div>
                  <div className="workspace-fact">
                    <dt>Company</dt>
                    <dd>{overview.company}</dd>
                  </div>
                  <div className="workspace-fact">
                    <dt>Role</dt>
                    <dd>{roleLabel}</dd>
                  </div>
                </dl>
              </article>

              <article className="workspace-card">
                <div className="workspace-card__header">
                  <CheckSquare size={18} />
                  <div>
                    <h3>Prep progress · {progress}%</h3>
                    <p>{nextTask}</p>
                  </div>
                </div>
                <div
                  className="interview-card__progress prep-workspace__progress"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Prep completion"
                >
                  <div style={{ width: `${progress}%` }} />
                </div>
                <ul className="prep-workspace__checklist">
                  {checklist.map((item) => (
                    <li key={item.id} className={item.done ? 'is-done' : ''}>
                      <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        ) : section === 'mock' ? (
          <div className="workspace-panel">
            <article className="workspace-card">
              <div className="workspace-card__header">
                <Mic size={18} />
                <div>
                  <h3>Mock interview</h3>
                  <p>
                    Practice lives on the company workspace for {overview.company}, grounded in
                    this role’s JD, personnel, and prep notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="submit-btn"
                onClick={() => onOpenCompanyMock?.(app.id)}
              >
                Open mock interview
                <ArrowRight size={16} />
              </button>
            </article>
          </div>
        ) : (
          <div className="workspace-panel">
            <article className="workspace-card">
              <h3>{activeSection.label}</h3>
              <p className="workspace-muted">Coming next.</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
