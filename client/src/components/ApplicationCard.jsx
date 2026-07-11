import { useState } from 'react';
import { Plus, Pencil, Check, X, GripVertical } from 'lucide-react';
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
      aria-label={`Interview process, step ${index + 1} of ${steps.length}: ${steps[index]}`}
    >
      {steps.map((label, i) => {
        const done = i < index;
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
              title={label}
              aria-current={current ? 'step' : undefined}
              aria-label={`${label}${current ? ', current' : done ? ', done' : ', upcoming'}`}
            >
              <span className="process-track__dot" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ProcessEditor({ steps, onSave, onCancel }) {
  const [draft, setDraft] = useState(() =>
    steps.map((label, i) => ({
      id: `round-${i}-${label}`,
      label,
    }))
  );
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const updateAt = (id, value) => {
    setDraft((prev) => prev.map((step) => (step.id === id ? { ...step, label: value } : step)));
  };

  const removeAt = (id) => {
    setDraft((prev) => (prev.length <= 1 ? prev : prev.filter((step) => step.id !== id)));
  };

  const addStep = () => {
    setDraft((prev) => [
      ...prev,
      { id: `round-${Date.now()}-${prev.length}`, label: `Round ${prev.length + 1}` },
    ]);
  };

  const moveStep = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setDraft((prev) => {
      const from = prev.findIndex((step) => step.id === fromId);
      const to = prev.findIndex((step) => step.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <div className="process-editor">
      <p className="process-editor__hint">
        Name each round for this company. Drag the handle to reorder.
      </p>
      <ul className="process-editor__list">
        {draft.map((step, i) => (
          <li
            key={step.id}
            className={`process-editor__row ${dragId === step.id ? 'process-editor__row--dragging' : ''} ${overId === step.id && dragId !== step.id ? 'process-editor__row--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (!dragId || dragId === step.id) return;

              const from = draft.findIndex((item) => item.id === dragId);
              const to = draft.findIndex((item) => item.id === step.id);
              if (from < 0 || to < 0 || from === to) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              // Only commit when the pointer crosses the row midpoint.
              if (from < to && e.clientY < midY) return;
              if (from > to && e.clientY > midY) return;

              setOverId(step.id);
              moveStep(dragId, step.id);
            }}
            onDragLeave={() => {
              if (overId === step.id) setOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverId(null);
              setDragId(null);
            }}
          >
            <button
              type="button"
              className="process-editor__handle"
              draggable
              aria-label={`Drag to reorder step ${i + 1}`}
              title="Drag to reorder"
              onDragStart={(e) => {
                setDragId(step.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', step.id);
                // Improve drag image in some browsers
                if (e.currentTarget.parentElement) {
                  e.dataTransfer.setDragImage(e.currentTarget.parentElement, 20, 20);
                }
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <GripVertical size={15} />
            </button>
            <span className="process-editor__num">{i + 1}</span>
            <input
              className="process-editor__input"
              value={step.label}
              onChange={(e) => updateAt(step.id, e.target.value)}
              aria-label={`Step ${i + 1} name`}
            />
            <button
              type="button"
              className="process-editor__remove"
              onClick={() => removeAt(step.id)}
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
            onClick={() => onSave(normalizeProcessSteps(draft.map((step) => step.label)))}
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
    const byLabel = nextSteps.indexOf(currentLabel);
    const nextIndex = byLabel >= 0 ? byLabel : Math.min(index, nextSteps.length - 1);
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
            <option value="active">Open</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        )}
      </header>

      {closed ? (
        <p className="app-card__closed-label">{closedStatusLabel(app.status)}</p>
      ) : editingProcess ? (
        <ProcessEditor
          steps={steps}
          onSave={saveProcess}
          onCancel={() => setEditingProcess(false)}
        />
      ) : (
        <div className="app-card__process">
          <div className="app-card__process-top">
            <p className="app-card__step-name">{currentLabel}</p>
            <span className="app-card__step-count">{index + 1}/{total}</span>
            {canUpdate && (
              <button
                type="button"
                className="app-card__edit-process"
                onClick={() => setEditingProcess(true)}
                aria-label={`Edit interview process for ${app.company || 'company'}`}
                title="Edit process"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
          <ProcessTrack
            steps={steps}
            index={index}
            closed={closed}
            onSelect={canUpdate ? setStepIndex : undefined}
            accent={accent}
          />
        </div>
      )}

      <div className="app-card__bottom">
        {subtleMeta.length > 0 && (
          <p className="app-card__subtle">{subtleMeta.join(' · ')}</p>
        )}
        <footer className="app-card__footer">Updated {relativeTime(app.updatedAt)}</footer>
      </div>
    </article>
  );
}
