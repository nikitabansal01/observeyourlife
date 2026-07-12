import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  CalendarRange,
  ClipboardList,
  Compass,
  Mic,
  NotebookPen,
  Search,
} from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, formatDate } from '../constants';
import { getProcess, isClosedStatus, inferStatusFromStep } from '../utils/processSteps';
import {
  appendStageHistory,
  buildStageTimeline,
  getOverviewDefaults,
  getReflectionDefaults,
  getResearchDefaults,
  getRoleFitDefaults,
  getWorkspace,
} from '../utils/companyWorkspace';
import MockInterviewChat from './MockInterviewChat';
import StudyPlanPanel from './StudyPlanPanel';

const TABS = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Building2 },
  { id: 'research', label: 'Company Research', shortLabel: 'Research', icon: Search },
  { id: 'fit', label: 'Role Fit', shortLabel: 'Fit', icon: Compass },
  { id: 'notes', label: 'Notes and Reflection', shortLabel: 'Notes', icon: NotebookPen },
  { id: 'plan', label: 'Planning', shortLabel: 'Plan', icon: CalendarRange },
  { id: 'mock', label: 'Mock Interview', shortLabel: 'Mock', icon: Mic },
];

function ListEditor({ items, onChange, placeholder }) {
  return (
    <div className="workspace-list-editor">
      {items.map((item, index) => (
        <div key={`${placeholder}-${index}`} className="workspace-list-editor__row">
          <input
            className="compass-field__input"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="auth-btn"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            disabled={items.length <= 1}
            aria-label="Remove item"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="auth-btn auth-btn--primary"
        onClick={() => onChange([...items, ''])}
      >
        Add item
      </button>
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="workspace-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function CompanyWorkspace({
  app,
  onBack,
  onUpdate,
  initialTab = 'overview',
  profile = null,
  direction = null,
  onLearningFromReflection,
}) {
  const resolveTab = (value) => {
    if (value === 'prep') return 'overview';
    if (TABS.some((t) => t.id === value)) return value;
    return 'overview';
  };
  const [tab, setTab] = useState(() => resolveTab(initialTab));

  const accent = STATUS_COLORS[app.status] || '#8B5CF6';
  const { steps, index, currentLabel } = getProcess(app);
  const overview = useMemo(() => getOverviewDefaults(app), [app]);
  const research = useMemo(() => getResearchDefaults(app), [app]);
  const roleFit = useMemo(() => getRoleFitDefaults(app, profile), [app, profile]);
  const reflection = useMemo(() => getReflectionDefaults(app), [app]);
  const timeline = useMemo(() => buildStageTimeline(app), [app]);
  const pathTitle = direction?.primaryTitle || roleFit.pathTitle;

  useEffect(() => {
    setTab(resolveTab(initialTab));
  }, [app.id, initialTab]);

  const patchWorkspace = (partial, extra = {}) => {
    const workspace = { ...getWorkspace(app), ...partial };
    onUpdate?.(app.id, { workspace, ...extra });

    if (partial.reflection?.struggled && onLearningFromReflection) {
      const topic = String(partial.reflection.struggled).trim();
      if (topic) {
        onLearningFromReflection({
          topic,
          company: app.company,
          appId: app.id,
          reason: `Surfaced after interviewing at ${app.company || 'this company'}.`,
        });
      }
    }
  };

  const updateOverviewField = (field, value) => {
    if (field === 'role') {
      onUpdate?.(app.id, { positionTitle: value });
      return;
    }
    patchWorkspace({ [field]: value });
  };

  const handleStatusChange = (status) => {
    const label = STATUS_LABELS[status] || status;
    const workspace = appendStageHistory(app, { label, status });
    const nextIndex = steps.findIndex((step) =>
      inferStatusFromStep(step, steps.indexOf(step), steps.length) === status
    );
    onUpdate?.(app.id, {
      status,
      workspace,
      ...(nextIndex >= 0 ? { processStepIndex: nextIndex } : {}),
    });
  };

  const handleStepSelect = (nextIndex) => {
    if (isClosedStatus(app.status)) return;
    const label = steps[nextIndex];
    const status = inferStatusFromStep(label, nextIndex, steps.length);
    const workspace = appendStageHistory(app, { label, status });
    onUpdate?.(app.id, {
      processSteps: steps,
      processStepIndex: nextIndex,
      status,
      workspace,
    });
  };

  return (
    <section className="company-workspace" style={{ '--workspace-accent': accent }}>
      <header className="company-workspace__header">
        <button type="button" className="auth-btn company-workspace__back" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to opportunities
        </button>
        <div className="company-workspace__title">
          <div>
            <p className="ui-block__label">Company workspace</p>
            <h2>{overview.company}</h2>
            <p>{overview.role || 'Role TBD'} · {currentLabel}</p>
          </div>
          <span
            className="company-workspace__status"
            style={{ '--status-color': accent }}
          >
            {STATUS_LABELS[app.status] || app.status}
          </span>
        </div>
      </header>

      <div className="company-workspace__tabs" role="tablist" aria-label="Company workspace">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-label={label}
            title={label}
            className={`company-workspace__tab${tab === id ? ' company-workspace__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            <span className="company-workspace__tab-label">{label}</span>
            <span className="company-workspace__tab-short">{shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="company-workspace__body" role="tabpanel">
        {tab === 'overview' && (
          <div className="workspace-panel">
            <div className="workspace-panel__grid">
              <article className="workspace-card">
                <h3>Opportunity details</h3>
                <dl className="workspace-facts">
                  <Fact label="Company">{overview.company}</Fact>
                  <Fact label="Role">
                    <input
                      className="compass-field__input"
                      value={overview.role}
                      onChange={(e) => updateOverviewField('role', e.target.value)}
                      placeholder="Role title"
                    />
                  </Fact>
                  <Fact label="Current stage">
                    <select
                      className="company-table__input company-table__input--status"
                      value={app.status || 'applied'}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ '--status-color': accent }}
                      aria-label="Opportunity status"
                    >
                      {Object.keys(STATUS_LABELS).map((key) => (
                        <option key={key} value={key}>
                          {STATUS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </Fact>
                  <Fact label="Upcoming interview">{overview.upcomingInterview}</Fact>
                  <Fact label="Recruiter">
                    <input
                      className="compass-field__input"
                      value={overview.recruiter}
                      onChange={(e) => updateOverviewField('recruiter', e.target.value)}
                      placeholder="Recruiter name"
                    />
                  </Fact>
                  <Fact label="Hiring manager">
                    <input
                      className="compass-field__input"
                      value={overview.hiringManager}
                      onChange={(e) => updateOverviewField('hiringManager', e.target.value)}
                      placeholder="Hiring manager"
                    />
                  </Fact>
                  <Fact label="Source or referral">
                    <input
                      className="compass-field__input"
                      value={overview.source}
                      onChange={(e) => updateOverviewField('source', e.target.value)}
                      placeholder="Referral, LinkedIn, career page…"
                    />
                  </Fact>
                </dl>

                <div className="workspace-process">
                  <div className="workspace-process__top">
                    <span>Process</span>
                    <strong>{currentLabel}</strong>
                  </div>
                  <div className="workspace-process__steps">
                    {steps.map((step, i) => (
                      <button
                        key={`${step}-${i}`}
                        type="button"
                        className={`workspace-process__step${i === index ? ' is-current' : ''}${i < index ? ' is-done' : ''}`}
                        onClick={() => handleStepSelect(i)}
                        disabled={isClosedStatus(app.status)}
                      >
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
              </article>

              <article className="workspace-card">
                <h3>Job description</h3>
                <textarea
                  className="compass-field__input"
                  rows={12}
                  value={overview.jobDescription}
                  onChange={(e) => updateOverviewField('jobDescription', e.target.value)}
                  placeholder="Paste the JD or key requirements here…"
                />
              </article>
            </div>

            <article className="workspace-card">
              <h3>Timeline of stage changes</h3>
              {timeline.length === 0 ? (
                <p className="workspace-muted">Stage changes will appear here as the process moves.</p>
              ) : (
                <ol className="workspace-timeline">
                  {timeline.map((item) => (
                    <li key={item.id || `${item.label}-${item.at}`}>
                      <strong>{item.label}</strong>
                      <span>{item.at ? formatDate(item.at) : 'Date unknown'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        )}

        {tab === 'research' && (
          <div className="workspace-panel">
            <article className="workspace-card">
              <div className="workspace-card__header">
                <ClipboardList size={18} />
                <div>
                  <h3>Company research</h3>
                  <p>Capture product, market, and culture context before interviews.</p>
                </div>
              </div>
              <div className="workspace-form-grid">
                <label className="career-direction__field">
                  <span>Company summary</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={research.summary}
                    onChange={(e) => patchWorkspace({ research: { ...research, summary: e.target.value } })}
                    placeholder="What does this company do, and for whom?"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Product</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={research.product}
                    onChange={(e) => patchWorkspace({ research: { ...research, product: e.target.value } })}
                    placeholder="Core product surfaces, users, differentiators…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Market</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={research.market}
                    onChange={(e) => patchWorkspace({ research: { ...research, market: e.target.value } })}
                    placeholder="Competitors, timing, business model notes…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Culture & team</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={research.culture}
                    onChange={(e) => patchWorkspace({ research: { ...research, culture: e.target.value } })}
                    placeholder="Working style, values, interview signals…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Open questions</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={research.openQuestions}
                    onChange={(e) => patchWorkspace({ research: { ...research, openQuestions: e.target.value } })}
                    placeholder="What do you still need to learn?"
                  />
                </label>
              </div>
            </article>
          </div>
        )}

        {tab === 'fit' && (
          <div className="workspace-panel">
            <div className="workspace-panel__grid workspace-panel__grid--fit">
              <article className="workspace-card">
                <h3>Role fit vs {pathTitle}</h3>
                <p className="workspace-muted">
                  Comparing this opportunity to your resume evidence and selected career path.
                </p>
                <ListEditor
                  items={roleFit.requirements}
                  onChange={(requirements) => patchWorkspace({ roleFit: { ...roleFit, requirements } })}
                  placeholder="Requirement"
                />
              </article>
              <article className="workspace-card">
                <h3>Relevant resume evidence</h3>
                <ListEditor
                  items={roleFit.evidence}
                  onChange={(evidence) => patchWorkspace({ roleFit: { ...roleFit, evidence } })}
                  placeholder="Evidence from your background"
                />
              </article>
              <article className="workspace-card">
                <h3>Strong matches</h3>
                <ListEditor
                  items={roleFit.matches}
                  onChange={(matches) => patchWorkspace({ roleFit: { ...roleFit, matches } })}
                  placeholder="Where you already fit"
                />
              </article>
              <article className="workspace-card">
                <h3>Gaps to prepare for</h3>
                <ListEditor
                  items={roleFit.gaps}
                  onChange={(gaps) => patchWorkspace({ roleFit: { ...roleFit, gaps } })}
                  placeholder="Gap to close"
                />
              </article>
            </div>
            <article className="workspace-card">
              <h3>Recommended stories to use</h3>
              <ListEditor
                items={roleFit.stories}
                onChange={(stories) => patchWorkspace({ roleFit: { ...roleFit, stories } })}
                placeholder="Story to prepare"
              />
            </article>
          </div>
        )}

        {tab === 'notes' && (
          <div className="workspace-panel">
            <article className="workspace-card">
              <div className="workspace-card__header">
                <Briefcase size={18} />
                <div>
                  <h3>Notes and reflection</h3>
                  <p>Capture prep and debrief without changing opportunity status.</p>
                </div>
              </div>
              <div className="workspace-form-grid">
                <label className="career-direction__field">
                  <span>Pre-interview notes</span>
                  <textarea
                    className="compass-field__input"
                    rows={4}
                    value={reflection.preNotes}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, preNotes: e.target.value } })}
                    placeholder="Goals, angles, reminders…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Post-interview reflection</span>
                  <textarea
                    className="compass-field__input"
                    rows={4}
                    value={reflection.postNotes}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, postNotes: e.target.value } })}
                    placeholder="Overall read on the conversation…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Questions asked</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={reflection.questionsAsked}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, questionsAsked: e.target.value } })}
                    placeholder="What did they ask?"
                  />
                </label>
                <label className="career-direction__field">
                  <span>What went well</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={reflection.wentWell}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, wentWell: e.target.value } })}
                    placeholder="Moments that landed…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Where you struggled</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={reflection.struggled}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, struggled: e.target.value } })}
                    placeholder="Rough spots to improve…"
                  />
                </label>
                <label className="career-direction__field">
                  <span>Next follow-up action</span>
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={reflection.followUp}
                    onChange={(e) => patchWorkspace({ reflection: { ...reflection, followUp: e.target.value } })}
                    placeholder="Thank-you note, referral ask, status check…"
                  />
                </label>
              </div>
            </article>
          </div>
        )}

        {tab === 'mock' && (
          <MockInterviewChat app={app} profile={profile} onUpdate={onUpdate} />
        )}

        {tab === 'plan' && (
          <StudyPlanPanel
            app={app}
            profile={profile}
            onUpdate={onUpdate}
            onOpenMock={() => setTab('mock')}
          />
        )}
      </div>
    </section>
  );
}
