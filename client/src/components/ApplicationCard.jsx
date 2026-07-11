import { useState } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { STATUS_COLORS, INDUSTRY_LABELS, relativeTime } from '../constants';
import {
  getProcess,
  isClosedStatus,
  inferStatusFromStep,
  formatBusinessModel,
  formatIndustry,
  closedStatusLabel,
  normalizeProcessSteps,
} from '../utils/processSteps';

function ProcessTrack({ steps, index, closed, onSelect, accent }) {
  if (closed) return null;

  return (
    <div
      className="process-track"
      style={{ '--process-accent': accent }}
      role="list"
      aria-label={`Interview process, step ${index + 1} of ${steps.length}`}
    >
      {steps.map((label, i) => {
        const done = i <= index;
        const current = i === index;
        return (
          <div key={`${label}-${i}`} className="process-track__item" role="listitem">
            {i > 0 && (
              <div
                className={`process-track__line ${i <= index ? 'process-track__line--done' : ''}`}
                aria-hidden
              />
            )}
            <button
              type="button"
              className={`process-track__step ${done ? 'process-track__step--done' : ''} ${current ? 'process-track__step--current' : ''}`}
              onClick={() => onSelect?.(i)}
              disabled={!onSelect}
              title={onSelect ? `Set current stage to ${label}` : label}
              aria-current={current ? 'step' : undefined}
              aria-label={`${label}${current ? ', current stage' : done ? ', completed' : ''}`}
            >
              <span className="process-track__dot" />
              <span className="process-track__label">{label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ProcessEditor({ steps, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => [...steps]);

  const updateAt = (i, value) => {
    setDraft((prev) => prev.map((step, idx) => (idx === i ? value : step)));
  };

  const removeAt = (i) => {
    setDraft((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const addStep = () => {
    setDraft((prev) => [...prev, `Round ${prev.length + 1}`]);
  };

  return (
    <div className="process-editor">
      <p className="process-editor__hint">Name each round for this company — every process can be different.</p>
      <ul className="process-editor__list">
        {draft.map((step, i) => (
          <li key={i} className="process-editor__row">
            <span className="process-editor__num">{i + 1}</span>
            <input
              className="process-editor__input"
              value={step}
              onChange={(e) => updateAt(i, e.target.value)}
              aria-label={`Step ${i + 1} name`}
            />
            <button
              type="button"
              className="process-editor__remove"
              onClick={() => removeAt(i)}
              disabled={draft.length <= 1}
              aria-label={`Remove step ${i + 1}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="process-editor__actions">
        <button type="button" className="process-editor__btn" onClick={addStep}>
          <Plus size={14} />
          Add round
        </button>
        <div className="process-editor__actions-end">
          <button type="button" className="process-editor__btn process-editor__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="process-editor__btn process-editor__btn--primary"
            onClick={() => onSave(normalizeProcessSteps(draft))}
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationCard({ app, onUpdate }) {
  const [editingProcess, setEditingProcess] = useState(false);
  const { steps, index, currentLabel, total } = getProcess(app);
  const closed = isClosedStatus(app.status);
  const accent = STATUS_COLORS[app.status] || '#8B5CF6';
  const canUpdate = typeof onUpdate === 'function';
  const industry = formatIndustry(app.industry, INDUSTRY_LABELS);
  const model = formatBusinessModel(app.businessModel);
  const subtleMeta = [industry, model].filter(Boolean);

  const persist = (updates) => {
    if (!canUpdate) return;
    onUpdate(app.id, updates);
  };

  const setStepIndex = (nextIndex) => {
    if (!canUpdate || closed) return;
    const clamped = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const label = steps[clamped];
    persist({
      processSteps: steps,
      processStepIndex: clamped,
      status: inferStatusFromStep(label, clamped, steps.length),
    });
  };

  const saveProcess = (nextSteps) => {
    const nextIndex = Math.min(index, nextSteps.length - 1);
    persist({
      processSteps: nextSteps,
      processStepIndex: nextIndex,
      status: closed
        ? app.status
        : inferStatusFromStep(nextSteps[nextIndex], nextIndex, nextSteps.length),
    });
    setEditingProcess(false);
  };

  const setOutcome = (status) => {
    if (!canUpdate) return;
    if (isClosedStatus(status)) {
      persist({ status });
      return;
    }
    persist({
      status: inferStatusFromStep(steps[index], index, steps.length),
      processSteps: steps,
      processStepIndex: index,
    });
  };

  return (
    <article className={`app-card app-card--simple ${closed ? 'app-card--closed' : ''}`} style={{ '--accent': accent }}>
      <header className="app-card__header">
        <div className="app-card__identity">
          <div className="app-card__title-row">
            <h3>{app.company || 'Unknown company'}</h3>
            {app.isExample && <span className="example-badge">Example</span>}
          </div>
          {app.positionTitle && <p className="app-card__role">{app.positionTitle}</p>}
        </div>
        {canUpdate && (
          <select
            className="app-card__outcome"
            value={closed ? app.status : 'active'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'active') setOutcome('applied');
              else setOutcome(value);
            }}
            aria-label={`Outcome for ${app.company || 'company'}`}
          >
            <option value="active">In process</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        )}
      </header>

      {closed ? (
        <p className="app-card__closed-label">{closedStatusLabel(app.status)}</p>
      ) : (
        <>
          <div className="app-card__process-meta">
            <span className="app-card__step-count">
              Step {index + 1} of {total}
            </span>
            <span className="app-card__step-name">{currentLabel}</span>
          </div>

          {editingProcess ? (
            <ProcessEditor
              steps={steps}
              onSave={saveProcess}
              onCancel={() => setEditingProcess(false)}
            />
          ) : (
            <>
              <ProcessTrack
                steps={steps}
                index={index}
                closed={closed}
                onSelect={canUpdate ? setStepIndex : undefined}
                accent={accent}
              />
              {canUpdate && (
                <button
                  type="button"
                  className="app-card__edit-process"
                  onClick={() => setEditingProcess(true)}
                >
                  <Pencil size={12} />
                  Edit process
                </button>
              )}
            </>
          )}
        </>
      )}

      {subtleMeta.length > 0 && (
        <p className="app-card__subtle">
          {subtleMeta.join(' · ')}
        </p>
      )}

      <footer className="app-card__footer">Updated {relativeTime(app.updatedAt)}</footer>
    </article>
  );
}
