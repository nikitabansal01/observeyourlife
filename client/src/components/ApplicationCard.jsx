import { Calendar, Building2, Briefcase, DollarSign, ArrowRight, Bell, BookOpen } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, PIPELINE_MILESTONES, formatDate, relativeTime } from '../constants';

function Pipeline({ status }) {
  if (['rejected', 'withdrawn'].includes(status)) return null;

  const activeIndex = PIPELINE_MILESTONES.findIndex((milestone) =>
    milestone.statuses.includes(status)
  );

  return (
    <div className="pipeline" aria-label={`Pipeline stage: ${STATUS_LABELS[status] || status}`}>
      {PIPELINE_MILESTONES.map((milestone, i) => {
        const done = activeIndex >= 0 && i <= activeIndex;
        const current = milestone.statuses.includes(status);
        const color = STATUS_COLORS[milestone.colorKey];

        return (
          <div
            key={milestone.key}
            className={`pipeline__step ${done ? 'pipeline__step--done' : ''} ${current ? 'pipeline__step--current' : ''}`}
            title={milestone.label}
          >
            <div className="pipeline__milestone">
              <div
                className="pipeline__dot"
                style={{ background: done ? color : undefined, boxShadow: current ? `0 0 12px ${color}` : undefined }}
              />
              <span className="pipeline__label">{milestone.label}</span>
            </div>
            {i < PIPELINE_MILESTONES.length - 1 && (
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
          <div className="app-card__title-row">
            <h3>{app.company || 'Unknown company'}</h3>
            {app.isExample && <span className="example-badge">Example</span>}
          </div>
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
