import { useMemo } from 'react';
import {
  CalendarClock,
  CheckSquare,
  Compass,
  BookOpen,
  ArrowRight,
  Building2,
  User,
} from 'lucide-react';
import { STATUS_COLORS } from '../constants';
import {
  getNextInterview,
  getTodaysPriorities,
  getPipelineSummary,
  getCareerDirectionSnapshot,
  getLearningFocus,
} from '../utils/todayInsights';
import EmptyState from './EmptyState';

export default function Today({
  applications = [],
  profile = null,
  direction: directionProp,
  onNavigate,
  onContinuePrep,
}) {
  const direction = useMemo(
    () => directionProp || getCareerDirectionSnapshot(profile),
    [directionProp, profile]
  );

  const nextInterview = useMemo(() => getNextInterview(applications), [applications]);
  const priorities = useMemo(() => getTodaysPriorities(applications), [applications]);
  const pipeline = useMemo(() => getPipelineSummary(applications), [applications]);
  const learning = useMemo(
    () => getLearningFocus({ direction, nextInterview }),
    [direction, nextInterview]
  );

  const interviewAccent = nextInterview
    ? STATUS_COLORS[nextInterview.status] || 'var(--accent-cyan)'
    : 'var(--accent-cyan)';

  const handlePrepareNow = () => {
    if (nextInterview?.id && onContinuePrep) {
      onContinuePrep(nextInterview.id);
      return;
    }
    onNavigate?.('interview');
  };

  return (
    <section className="today page-section">
      <header className="ui-section ui-section--header today__intro">
        <h2>Today</h2>
      </header>

      <div className="today__grid">
        <article className="os-card today-card today-card--interview" style={{ '--today-accent': interviewAccent }}>
          <div className="os-card__header today-card__header">
            <CalendarClock size={18} />
            <div>
              <h3>Next interview</h3>
            </div>
          </div>

          {nextInterview ? (
            <>
              <dl className="today-interview__facts">
                <div>
                  <dt>Company</dt>
                  <dd>
                    <Building2 size={14} />
                    {nextInterview.company}
                  </dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{nextInterview.role}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>{nextInterview.stage}</dd>
                </div>
                <div>
                  <dt>Date & time</dt>
                  <dd>{nextInterview.whenLabel}</dd>
                </div>
                <div>
                  <dt>Interviewer</dt>
                  <dd>
                    <User size={14} />
                    {nextInterview.interviewer || 'To be confirmed'}
                  </dd>
                </div>
              </dl>
              <button type="button" className="submit-btn today-card__cta" onClick={handlePrepareNow}>
                Prepare now
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <EmptyState
              compact
              title="No upcoming interviews"
              body="When a screen or onsite is scheduled, it will show up here with a prep shortcut."
              actionLabel="Open opportunities"
              onAction={() => onNavigate?.('opportunities')}
            />
          )}
        </article>

        <article className="os-card today-card">
          <div className="os-card__header today-card__header">
            <CheckSquare size={18} />
            <div>
              <h3>Priorities</h3>
            </div>
          </div>
          {priorities.length === 0 ? (
            <EmptyState
              compact
              title="No priorities yet"
              body="Add next steps on opportunities."
              actionLabel="Opportunities"
              onAction={() => onNavigate?.('opportunities')}
            />
          ) : (
            <ul className="today-priority-list">
              {priorities.map((item) => (
                <li key={item.id}>
                  <span className="today-priority-list__dot" />
                  <div>
                    <strong>{item.label}</strong>
                    {item.meta && <span>{item.meta}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="os-card today-card">
          <div className="os-card__header today-card__header">
            <Compass size={18} />
            <div>
              <h3>Direction</h3>
            </div>
          </div>
          <dl className="today-direction__facts">
            <div>
              <dt>Path</dt>
              <dd>{direction.primaryTitle}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{direction.focusAreas.join(' · ')}</dd>
            </div>
            <div>
              <dt>Next</dt>
              <dd>{direction.nextAction}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => onNavigate?.('direction')}
          >
            {direction.isMock ? 'Choose a path' : 'Review'}
          </button>
        </article>

        <article className="os-card today-card today-card--pipeline">
          <div className="os-card__header today-card__header">
            <div>
              <h3>Pipeline</h3>
            </div>
          </div>
          <div className="today-stat-grid">
            <div className="today-stat">
              <strong>{pipeline.active}</strong>
              <span>Active opportunities</span>
            </div>
            <div className="today-stat">
              <strong>{pipeline.interviewsThisWeek}</strong>
              <span>Interviews this week</span>
            </div>
            <div className="today-stat">
              <strong>{pipeline.needingFollowUp}</strong>
              <span>Need follow-up</span>
            </div>
            <div className="today-stat">
              <strong>{pipeline.closed}</strong>
              <span>Rejected / closed</span>
            </div>
          </div>
        </article>

        <article className="os-card today-card today-card--learning">
          <div className="os-card__header today-card__header">
            <BookOpen size={18} />
            <div>
              <h3>Learning</h3>
            </div>
          </div>
          <ul className="today-learning-list">
            {learning.map((topic) => (
              <li key={topic.id}>
                <strong>{topic.title}</strong>
                <span>{topic.reason}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="auth-btn" onClick={() => onNavigate?.('learning')}>
            Open learning
          </button>
        </article>
      </div>
    </section>
  );
}
