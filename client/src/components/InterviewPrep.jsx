import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckSquare,
  Library,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { STATUS_COLORS } from '../constants';
import {
  getPracticedQuestions,
  savePracticedQuestions,
  setLearningTab,
} from '../storage';
import { getCareerDirectionSnapshot } from '../utils/todayInsights';
import {
  getIncompletePrepTasks,
  getRecentlyPracticedQuestions,
  getUpcomingInterviewCards,
} from '../utils/interviewPrepHub';
import { getWorkspace } from '../utils/companyWorkspace';
import EmptyState from './EmptyState';
import InterviewPrepWorkspace from './InterviewPrepWorkspace';

export default function InterviewPrep({
  applications = [],
  profile = null,
  direction: directionProp,
  onUpdateApplication,
  onNavigate,
  onOpenCompanyWorkspace,
  focusAppId = null,
  focusRoundIndex = null,
  focusRoundLabel = null,
  onFocusConsumed,
}) {
  const direction = directionProp || getCareerDirectionSnapshot(profile);
  const [practiced, setPracticed] = useState(() => getPracticedQuestions());
  const [selectedPrep, setSelectedPrep] = useState(null);

  useEffect(() => {
    const onSync = () => setPracticed(getPracticedQuestions());
    window.addEventListener('career-os-synced', onSync);
    return () => window.removeEventListener('career-os-synced', onSync);
  }, []);

  useEffect(() => {
    if (!focusAppId) return;
    setSelectedPrep({
      appId: focusAppId,
      roundIndex: focusRoundIndex,
      roundLabel: focusRoundLabel,
    });
    onFocusConsumed?.();
  }, [focusAppId, focusRoundIndex, focusRoundLabel, onFocusConsumed]);

  const interviews = useMemo(
    () => getUpcomingInterviewCards(applications, profile),
    [applications, profile]
  );
  const incompleteTasks = useMemo(
    () => getIncompletePrepTasks(applications, { profile }),
    [applications, profile]
  );
  const recentQuestions = useMemo(
    () => getRecentlyPracticedQuestions(applications, practiced),
    [applications, practiced]
  );

  const selectedApp = useMemo(() => {
    if (!selectedPrep?.appId) return null;
    return applications.find((app) => app.id === selectedPrep.appId) || null;
  }, [applications, selectedPrep]);

  const pathLabel = direction?.primaryTitle || 'your target path';

  const openPrepWorkspace = (item) => {
    const appId = item?.appId || item?.id;
    if (!appId) return;
    setSelectedPrep({
      appId,
      roundIndex: item.roundIndex ?? null,
      roundLabel: item.roundLabel || item.stage || null,
    });
  };

  const markPracticed = (item) => {
    const entry = {
      id: item.id || `q-${Date.now()}`,
      question: item.question,
      company: item.company,
      pathHint: direction?.primaryTitle || item.pathHint || 'Target path',
      practicedAt: new Date().toISOString(),
    };
    const next = [entry, ...practiced.filter((q) => q.question !== entry.question)].slice(0, 20);
    setPracticed(next);
    savePracticedQuestions(next);

    const app = applications.find((a) => a.company === item.company || a.id === item.appId);
    if (app && onUpdateApplication) {
      const workspace = getWorkspace(app);
      onUpdateApplication(app.id, {
        workspace: {
          ...workspace,
          interviewPrep: {
            ...(workspace.interviewPrep || {}),
            practiced: true,
            lastPracticedAt: entry.practicedAt,
          },
        },
      });
    }
  };

  const openStoryBank = () => {
    setLearningTab('stories');
    onNavigate?.('learning');
  };

  if (selectedApp) {
    return (
      <InterviewPrepWorkspace
        app={selectedApp}
        roundIndex={selectedPrep?.roundIndex}
        roundLabel={selectedPrep?.roundLabel}
        onBack={() => setSelectedPrep(null)}
        profile={profile}
        direction={direction}
        onOpenCompanyMock={(appId) => onOpenCompanyWorkspace?.(appId, 'mock')}
      />
    );
  }

  return (
    <section className="interview-hub page-section">
      <header className="ui-section ui-section--header interview-hub__intro">
        <h2>Interview Prep</h2>
        <p>
          Active prep across companies, personalized to your resume evidence and{' '}
          <strong>{pathLabel}</strong>.
        </p>
      </header>

      <div className="interview-hub__grid">
        <section className="os-card interview-hub__main">
          <div className="os-card__header interview-hub__section-head">
            <CalendarClock size={18} />
            <div>
              <h3>Upcoming interviews</h3>
              <p>Ordered by date — continue where you left off</p>
            </div>
          </div>

          {interviews.length === 0 ? (
            <EmptyState
              compact
              title="No active interview prep yet"
              body="When opportunities move into screens or onsites, they appear here with progress and next tasks."
              actionLabel="Track opportunities"
              onAction={() => onNavigate?.('opportunities')}
            />
          ) : (
            <div className="interview-card-list">
              {interviews.map((item) => {
                const accent = STATUS_COLORS[item.status] || 'var(--accent-cyan)';
                return (
                  <article
                    key={item.id}
                    className="interview-card"
                    style={{ '--interview-accent': accent }}
                  >
                    <div className="interview-card__top">
                      <div>
                        <h4>{item.company}</h4>
                        <p>{item.role}</p>
                      </div>
                      <span className="interview-card__stage">{item.roundLabel || item.stage}</span>
                    </div>

                    <dl className="interview-card__meta">
                      <div>
                        <dt>Interview date</dt>
                        <dd>{item.whenLabel}</dd>
                      </div>
                      <div>
                        <dt>Prep completion</dt>
                        <dd>{item.progress}%</dd>
                      </div>
                    </dl>

                    <div
                      className="interview-card__progress"
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.company} prep completion`}
                    >
                      <div style={{ width: `${item.progress}%` }} />
                    </div>

                    <p className="interview-card__next">
                      <span>Next</span>
                      {item.nextTask}
                    </p>

                    <button
                      type="button"
                      className="submit-btn interview-card__cta"
                      onClick={() => openPrepWorkspace(item)}
                    >
                      Continue prep
                      <ArrowRight size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="interview-hub__side">
          <article className="os-card interview-hub__card">
            <div className="os-card__header interview-hub__section-head">
              <CheckSquare size={18} />
              <div>
                <h3>Incomplete tasks</h3>
                <p>Across all active interviews</p>
              </div>
            </div>
            {incompleteTasks.length === 0 ? (
              <EmptyState
                compact
                title="All prep tasks complete"
                body="You’re caught up on checklists for active interviews."
              />
            ) : (
              <ul className="interview-task-list">
                {incompleteTasks.map((task) => (
                  <li key={task.id}>
                    <button type="button" onClick={() => openPrepWorkspace(task)}>
                      <strong>{task.label}</strong>
                      <span>
                        {task.company} · {task.roundLabel || task.whenLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="os-card interview-hub__card">
            <div className="os-card__header interview-hub__section-head">
              <MessageSquare size={18} />
              <div>
                <h3>Recently practiced questions</h3>
                <p>Pulled from your company loops</p>
              </div>
            </div>
            {recentQuestions.length === 0 ? (
              <EmptyState
                compact
                title="No practiced questions yet"
                body="Mark questions as practiced from a prep workspace, or start with the ready-to-practice list when interviews are active."
                actionLabel="Track opportunities"
                onAction={() => onNavigate?.('opportunities')}
              />
            ) : (
              <ul className="interview-question-list">
                {recentQuestions.map((item) => (
                  <li key={item.id}>
                    <p>{item.question}</p>
                    <div className="interview-question-list__meta">
                      <span>
                        {item.company}
                        {item.readyOnly ? ' · ready to practice' : ''}
                      </span>
                      <button type="button" className="auth-btn" onClick={() => markPracticed(item)}>
                        {item.readyOnly ? 'Mark practiced' : 'Practice again'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </div>

      <section className="os-card interview-hub__card interview-hub__story-bank interview-hub__story-bank--link">
        <div className="os-card__header interview-hub__section-head">
          <Library size={18} />
          <div>
            <h3>Behavioral Story Bank</h3>
            <p>Reusable STARR stories live in Learning.</p>
          </div>
        </div>
        <button type="button" className="auth-btn auth-btn--primary" onClick={openStoryBank}>
          Open story bank
          <ArrowRight size={14} />
        </button>
      </section>
    </section>
  );
}
