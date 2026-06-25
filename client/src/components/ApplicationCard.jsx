import { Calendar, Building2, Briefcase, DollarSign, ArrowRight, Bell, BookOpen } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, PIPELINE_STATUSES, formatDate, relativeTime } from '../constants';

function Pipeline({ status }) {
  const activeIndex = PIPELINE_STATUSES.indexOf(status);

  return (
    <div className="pipeline">
      {PIPELINE_STATUSES.map((step, i) => {
        const done = activeIndex >= 0 && i <= activeIndex;
        const current = step === status;
        const color = STATUS_COLORS[step];

        return (
          <div key={step} className={`pipeline__step ${done ? 'pipeline__step--done' : ''} ${current ? 'pipeline__step--current' : ''}`}>
            <div className="pipeline__dot" style={{ background: done ? color : undefined, boxShadow: current ? `0 0 12px ${color}` : undefined }} />
            {i < PIPELINE_STATUSES.length - 1 && (
              <div className="pipeline__line" style={{ background: done && activeIndex > i ? color : undefined }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ApplicationCard({ app }) {
  const statusColor = STATUS_COLORS[app.status] || '#6B7280';

  return (
    <article className="app-card" style={{ '--accent': statusColor }}>
      <header className="app-card__header">
        <div>
          <h3>{app.company || 'Unknown company'}</h3>
          {app.positionTitle && (
            <p className="app-card__role">
              <Briefcase size={14} />
              {app.positionTitle}
            </p>
          )}
        </div>
        <span className="status-badge" style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}55` }}>
          {STATUS_LABELS[app.status] || app.status}
        </span>
      </header>

      <Pipeline status={app.status} />

      <div className="app-card__meta">
        {app.industry && (
          <span>
            <Building2 size={14} />
            {app.industry}
          </span>
        )}
        {app.fundingStage && (
          <span>
            <DollarSign size={14} />
            {app.fundingStage}
          </span>
        )}
        {app.interviewDates?.length > 0 && (
          <span>
            <Calendar size={14} />
            {app.interviewDates.map(formatDate).join(', ')}
          </span>
        )}
      </div>

      {(app.needsFollowUp || app.needsPrep) && (
        <div className="app-card__flags">
          {app.needsFollowUp && (
            <span className="flag flag--followup">
              <Bell size={13} /> Follow up
            </span>
          )}
          {app.needsPrep && (
            <span className="flag flag--prep">
              <BookOpen size={13} /> Needs prep
            </span>
          )}
        </div>
      )}

      {app.nextSteps?.length > 0 && (
        <div className="app-card__next">
          <strong>Next steps</strong>
          <ul>
            {app.nextSteps.map((step) => (
              <li key={step}>
                <ArrowRight size={14} />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {app.notes && <p className="app-card__notes">{app.notes}</p>}

      <footer className="app-card__footer">Updated {relativeTime(app.updatedAt)}</footer>
    </article>
  );
}
