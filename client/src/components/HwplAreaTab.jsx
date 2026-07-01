import { useEffect, useState } from 'react';
import { Trash2, Mic, Plus } from 'lucide-react';
import VoiceDump from './VoiceDump';
import JobTrackerArea from './JobTrackerArea';
import { LIFE_AREAS, AREA_TAB_CONFIG } from '../lifeDesign';

function formatDate(iso) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function GaugeBar({ area, value, onChange }) {
  return (
    <div className="hwpl-gauge">
      <div className="hwpl-gauge__header">
        <span className="hwpl-gauge__label" style={{ color: area.color }}>
          {area.label}
        </span>
        <span className="hwpl-gauge__value">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hwpl-gauge__slider"
        style={{ '--gauge-color': area.color }}
        aria-label={`${area.label} fullness`}
      />
    </div>
  );
}

function EntryMeta({ entry, config }) {
  const field = config.extraField;
  if (!field) return null;

  const value = entry[field.key];
  if (value == null || value === '') return null;

  if (field.type === 'range') {
    return (
      <span className="area-log-entry__meta" style={{ '--meta-color': config.areaColor }}>
        {field.label}: {value}/5
      </span>
    );
  }

  return (
    <span className="area-log-entry__meta" style={{ '--meta-color': config.areaColor }}>
      {value}
    </span>
  );
}

function LogEntry({ entry, areaColor, config, onDelete }) {
  return (
    <article className="area-log-entry">
      <div className="area-log-entry__header">
        <time className="area-log-entry__date">{formatDate(entry.createdAt)}</time>
        <div className="area-log-entry__actions">
          {entry.source === 'voice' && (
            <span className="area-log-entry__badge area-log-entry__badge--voice">
              <Mic size={12} />
              voice
            </span>
          )}
          <button
            type="button"
            className="area-log-entry__delete"
            onClick={() => onDelete(entry.id)}
            aria-label="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <EntryMeta entry={entry} config={{ ...config, areaColor }} />
      <p className="area-log-entry__text">{entry.text}</p>
    </article>
  );
}

export default function HwplAreaTab({
  areaId,
  data,
  onGaugeChange,
  onGaugeNoteChange,
  onAddLogEntry,
  onDeleteLogEntry,
  onVoiceSubmit,
  voiceProcessing,
  voiceSummary,
  initialTab = 'dashboard',
  onTabChange,
  jobTracker,
}) {
  const area = LIFE_AREAS.find((a) => a.id === areaId);
  const config = AREA_TAB_CONFIG[areaId];
  const entries = data.areaLogs[areaId] || [];
  const hasJobSearch = areaId === 'work' && jobTracker;

  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState('');
  const [extraValue, setExtraValue] = useState(areaId === 'health' ? 3 : '');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!area || !config) return null;

  const isJobSearch = hasJobSearch && tab === 'job-search';

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    onTabChange?.(nextTab);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const payload = { text: draft, source: 'manual' };
    if (config.extraField?.key === 'energy') payload.energy = extraValue;
    if (config.extraField?.key === 'activity') payload.activity = extraValue;
    if (config.extraField?.key === 'person') payload.person = extraValue;
    if (config.extraField?.key === 'focus') payload.focus = extraValue;

    if (onAddLogEntry(areaId, payload)) {
      setDraft('');
      if (areaId !== 'health') setExtraValue('');
    }
  };

  const recentEntries = entries.slice(0, 3);

  return (
    <section className="hwpl-area-tab" style={{ '--area-color': area.color }}>
      <header className="ui-section ui-section--header hwpl-area-tab__intro">
        <h2>{area.label}</h2>
        <p>{config.intro}</p>
      </header>

      <div className="ui-block ui-block--capture">
        <VoiceDump
          onSubmit={isJobSearch ? jobTracker.onVoiceSubmit : onVoiceSubmit}
          processing={isJobSearch ? jobTracker.voiceProcessing : voiceProcessing}
          currentArea={isJobSearch ? 'jobs' : areaId}
        />
        {(isJobSearch ? jobTracker.voiceSummary : voiceSummary) && (
          <div className="toast hwpl-area-tab__toast" role="status">
            {isJobSearch ? jobTracker.voiceSummary : voiceSummary}
          </div>
        )}
      </div>

      <nav className="view-tabs view-tabs--nested ui-section ui-section--nav" aria-label={`${area.label} views`}>
        <button
          type="button"
          className={`view-tab ${tab === 'dashboard' ? 'view-tab--active' : ''}`}
          onClick={() => handleTabChange('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`view-tab ${tab === 'log' ? 'view-tab--active' : ''}`}
          onClick={() => handleTabChange('log')}
        >
          {config.logLabel}
          {entries.length > 0 && <span className="view-tab__count">{entries.length}</span>}
        </button>
        {hasJobSearch && (
          <button
            type="button"
            className={`view-tab ${tab === 'job-search' ? 'view-tab--active' : ''}`}
            onClick={() => handleTabChange('job-search')}
          >
            Job search
          </button>
        )}
      </nav>

      {tab === 'job-search' && hasJobSearch ? (
        <JobTrackerArea nested {...jobTracker} />
      ) : tab === 'dashboard' ? (
        <div className="ui-stack">
          <div className="ui-block hwpl-area-tab__dashboard">
            <h3 className="ui-block__label">How full is {area.label.toLowerCase()}?</h3>
            <GaugeBar
              area={area}
              value={data.dashboard[areaId]}
              onChange={(value) => onGaugeChange(areaId, value)}
            />
            <textarea
              className="hwpl-card__note hwpl-area-tab__note"
              placeholder={`What's going on in ${area.label.toLowerCase()}?`}
              value={data.dashboardNotes[areaId]}
              onChange={(e) => onGaugeNoteChange(areaId, e.target.value)}
              rows={3}
            />
          </div>

          {recentEntries.length > 0 && (
            <div className="ui-block hwpl-area-tab__recent">
              <div className="hwpl-area-tab__recent-header">
                <h3 className="ui-block__label">Recent {config.logLabel.toLowerCase()}</h3>
                <button type="button" className="hwpl-card__link" onClick={() => handleTabChange('log')}>
                  View all →
                </button>
              </div>
              <div className="area-log-list area-log-list--compact">
                {recentEntries.map((entry) => (
                  <LogEntry
                    key={entry.id}
                    entry={entry}
                    areaColor={area.color}
                    config={config}
                    onDelete={(id) => onDeleteLogEntry(areaId, id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ui-stack">
          <div className="ui-block hwpl-area-tab__add">
            <h3 className="ui-block__label">Add {config.logLabel.toLowerCase()}</h3>
            <p className="hwpl-area-tab__log-hint">{config.logHint}</p>
            <form className="area-log-form" onSubmit={handleManualSubmit}>
              {config.extraField?.type === 'range' && (
                <label className="area-log-form__field">
                  <span>{config.extraField.label} ({extraValue}/5)</span>
                  <input
                    type="range"
                    min={config.extraField.min}
                    max={config.extraField.max}
                    value={extraValue}
                    onChange={(e) => setExtraValue(Number(e.target.value))}
                    style={{ '--gauge-color': area.color }}
                  />
                </label>
              )}
              {config.extraField?.type === 'text' && (
                <label className="area-log-form__field">
                  <span>{config.extraField.label}</span>
                  <input
                    type="text"
                    value={extraValue}
                    onChange={(e) => setExtraValue(e.target.value)}
                    placeholder={config.extraField.placeholder}
                  />
                </label>
              )}
              <label className="area-log-form__field area-log-form__field--grow">
                <span>Note</span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={config.manualPlaceholder}
                  rows={3}
                  required
                />
              </label>
              <button type="submit" className="area-log-form__submit" disabled={!draft.trim()}>
                <Plus size={16} />
                Add entry
              </button>
            </form>
          </div>

          <div className="ui-block">
            {entries.length === 0 ? (
              <p className="area-log-empty">
                No entries yet — use the form above or voice update to log your first one.
              </p>
            ) : (
              <div className="area-log-list">
                {entries.map((entry) => (
                  <LogEntry
                    key={entry.id}
                    entry={entry}
                    areaColor={area.color}
                    config={config}
                    onDelete={(id) => onDeleteLogEntry(areaId, id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
