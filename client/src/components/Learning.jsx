import { useEffect, useMemo, useState } from 'react';
import {
  Map,
  Library,
  ArrowRight,
  Check,
  Pin,
  Sparkles,
  Plus,
  ChevronDown,
} from 'lucide-react';
import {
  getLearningRoadmapProgress,
  getLearningTab,
  getStoryBank,
  saveLearningRoadmapProgress,
  saveStoryBank,
  setLearningTab,
} from '../storage';
import {
  buildLearningRoadmap,
  ROADMAP_STATUS_LABELS,
  setRoadmapItemStatus,
} from '../utils/learningRoadmap';
import {
  STORY_COMPETENCIES,
  STORY_CONFIDENCE,
  STORY_TAG_OPTIONS,
  createEmptyStory,
  createStoryVersion,
  generateStoryFeedback,
  getActiveVersion,
  groupStoriesByCompetency,
  normalizeStoryBank,
  removeStoryFromBank,
  starCompleteness,
  upsertStoryInBank,
} from '../utils/storyBank';
import EmptyState from './EmptyState';

const TABS = [
  { id: 'roadmap', label: 'Learning Roadmap', shortLabel: 'Roadmap', icon: Map },
  { id: 'stories', label: 'Behavioral Story Bank', shortLabel: 'Stories', icon: Library },
];

function RoadmapTab({ roadmap, onStatusChange, onNavigate }) {
  const [openId, setOpenId] = useState(() => {
    const active = roadmap.milestones.find((m) => m.state === 'active');
    return active?.id || roadmap.milestones[0]?.id || null;
  });

  useEffect(() => {
    const active = roadmap.milestones.find((m) => m.state === 'active');
    if (active) setOpenId(active.id);
  }, [roadmap.pathId]);

  return (
    <div className="learning-roadmap">
      <header className="learning-roadmap__hero">
        <div>
          <p className="learning-roadmap__eyebrow">Becoming</p>
          <h3>{roadmap.pathTitle}</h3>
          <p className="learning-roadmap__progress-line">
            {roadmap.progress.milestonesComplete}/{roadmap.progress.milestoneCount} milestones ·{' '}
            {roadmap.progress.percent}% complete
          </p>
        </div>
        <button
          type="button"
          className="auth-btn"
          onClick={() => onNavigate?.('direction')}
        >
          {roadmap.isMockPath ? 'Choose direction' : 'Change direction'}
          <ArrowRight size={14} />
        </button>
      </header>

      <div
        className="learning-roadmap__track"
        role="progressbar"
        aria-valuenow={roadmap.progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Roadmap progress"
      >
        <span style={{ width: `${roadmap.progress.percent}%` }} />
      </div>

      <ol className="learning-journey">
        {roadmap.milestones.map((milestone, index) => {
          const isOpen = openId === milestone.id;
          return (
            <li
              key={milestone.id}
              className={`learning-journey__step learning-journey__step--${milestone.state}`}
            >
              {index > 0 ? <div className="learning-journey__connector" aria-hidden /> : null}

              <button
                type="button"
                className="learning-journey__header"
                onClick={() => setOpenId(isOpen ? null : milestone.id)}
                aria-expanded={isOpen}
              >
                <span className="learning-journey__marker">
                  {milestone.state === 'complete' ? <Check size={14} /> : index + 1}
                </span>
                <span className="learning-journey__titles">
                  <strong>{milestone.title}</strong>
                  <span>
                    {milestone.progress.completed}/{milestone.progress.total} · {milestone.progress.percent}%
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`learning-journey__chevron${isOpen ? ' is-open' : ''}`}
                />
              </button>

              {isOpen ? (
                <div className="learning-journey__body">
                  {milestone.sections.map((section) => (
                    <div key={section.key} className="learning-journey__section">
                      <h4>{section.label}</h4>
                      <ul>
                        {section.items.map((entry) => (
                          <li key={entry.fullId}>
                            <span>{entry.label}</span>
                            <select
                              className="company-table__input learning-journey__status"
                              value={entry.status}
                              onChange={(e) => onStatusChange(entry.fullId, e.target.value)}
                              aria-label={`Status for ${entry.label}`}
                            >
                              {Object.entries(ROADMAP_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StoryEditor({ story, onChange, onDelete }) {
  const version = getActiveVersion(story);
  const completeness = starCompleteness(version);
  const competency = STORY_COMPETENCIES.find((c) => c.id === story.competencyId);

  const patchStory = (partial) => onChange({ ...story, ...partial });

  const patchVersion = (partial) => {
    const versions = story.versions.map((v) =>
      v.id === version.id
        ? { ...v, ...partial, updatedAt: new Date().toISOString() }
        : v
    );
    patchStory({ versions });
  };

  const addVersion = () => {
    const next = createStoryVersion({
      situation: version.situation,
      task: version.task,
      action: version.action,
      result: version.result,
      reflection: version.reflection,
    });
    patchStory({
      versions: [...story.versions, next],
      activeVersionId: next.id,
    });
  };

  const requestFeedback = () => {
    const feedback = generateStoryFeedback(story, version);
    patchVersion({
      feedback: feedback.tips.join('\n'),
      feedbackAt: feedback.generatedAt,
    });
  };

  const toggleTag = (tag) => {
    const tags = story.tags.includes(tag)
      ? story.tags.filter((t) => t !== tag)
      : [...story.tags, tag];
    patchStory({ tags });
  };

  return (
    <article className={`story-workspace__card${story.pinned ? ' is-pinned' : ''}`}>
      <div className="story-workspace__card-top">
        <div>
          <input
            className="story-workspace__title-input"
            value={story.title}
            onChange={(e) => patchStory({ title: e.target.value })}
            aria-label="Story title"
          />
          <p className="story-workspace__meta">
            {competency?.label}
            {' · '}
            STARR {completeness.filledCount}/5
          </p>
        </div>
        <div className="story-workspace__card-actions">
          <button
            type="button"
            className={`story-workspace__icon-btn${story.pinned ? ' is-active' : ''}`}
            onClick={() => patchStory({ pinned: !story.pinned })}
            aria-label={story.pinned ? 'Unpin story' : 'Pin story'}
            title="Pin"
          >
            <Pin size={14} />
          </button>
          <select
            className="company-table__input"
            value={story.confidence}
            onChange={(e) => patchStory({ confidence: e.target.value })}
            aria-label="Readiness"
          >
            {STORY_CONFIDENCE.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="story-workspace__versions">
        <label>
          Version
          <select
            className="company-table__input"
            value={story.activeVersionId}
            onChange={(e) => patchStory({ activeVersionId: e.target.value })}
          >
            {story.versions.map((v, index) => (
              <option key={v.id} value={v.id}>
                Version {index + 1}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="auth-btn" onClick={addVersion}>
          New version
        </button>
      </div>

      <div className="story-workspace__star">
        {[
          ['situation', 'Situation'],
          ['task', 'Task'],
          ['action', 'Action'],
          ['result', 'Result'],
          ['reflection', 'Reflection'],
        ].map(([key, label]) => (
          <label key={key} className="story-workspace__field">
            <span>{label}</span>
            <textarea
              className="compass-field__input"
              rows={key === 'action' || key === 'reflection' ? 3 : 2}
              value={version[key] || ''}
              onChange={(e) => patchVersion({ [key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="story-workspace__tags">
        <span className="ui-block__label">Tags</span>
        <div className="story-workspace__tag-row">
          {STORY_TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`story-workspace__tag${story.tags.includes(tag) ? ' is-on' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="story-workspace__feedback">
        <div className="story-workspace__feedback-head">
          <strong>
            <Sparkles size={14} /> AI feedback
          </strong>
          <button type="button" className="auth-btn auth-btn--primary" onClick={requestFeedback}>
            Get feedback
          </button>
        </div>
        {version.feedback ? (
          <ul>
            {version.feedback.split('\n').filter(Boolean).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : (
          <p>Feedback appears after you generate it.</p>
        )}
      </div>

      <button type="button" className="story-workspace__delete" onClick={onDelete}>
        Remove story
      </button>
    </article>
  );
}

function StoriesTab() {
  const [bank, setBank] = useState(() => normalizeStoryBank(getStoryBank()));
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const onSync = () => {
      setBank(normalizeStoryBank(getStoryBank()));
    };
    window.addEventListener('career-os-synced', onSync);
    return () => window.removeEventListener('career-os-synced', onSync);
  }, []);

  const stories = bank.stories;

  const visible = useMemo(() => {
    if (filter === 'all') return stories;
    if (filter === 'pinned') return stories.filter((s) => s.pinned);
    return stories.filter((s) => s.competencyId === filter);
  }, [stories, filter]);

  const groups = useMemo(() => groupStoriesByCompetency(visible), [visible]);
  const selected = stories.find((s) => s.id === selectedId) || visible[0] || null;

  useEffect(() => {
    if (selected && selectedId !== selected.id) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const persist = (next) => {
    setBank(next);
    saveStoryBank(next);
  };

  const addStory = () => {
    const competencyId = filter !== 'all' && filter !== 'pinned' ? filter : 'leadership';
    const story = createEmptyStory(competencyId);
    const next = upsertStoryInBank(bank, story);
    persist(next);
    setSelectedId(story.id);
  };

  const saveStory = (story) => {
    persist(upsertStoryInBank(bank, story));
  };

  const deleteStory = (storyId) => {
    const next = removeStoryFromBank(bank, storyId);
    persist(next);
    if (selectedId === storyId) setSelectedId(null);
  };

  return (
    <div className="story-workspace">
      <header className="story-workspace__hero">
        <div>
          <h3>Behavioral Story Bank</h3>
          <p>Reusable across interviews.</p>
        </div>
        <button type="button" className="auth-btn auth-btn--primary" onClick={addStory}>
          <Plus size={14} />
          Add story
        </button>
      </header>

      <div className="story-workspace__filters" role="toolbar" aria-label="Filter stories">
        <button
          type="button"
          className={`story-workspace__filter${filter === 'all' ? ' is-on' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`story-workspace__filter${filter === 'pinned' ? ' is-on' : ''}`}
          onClick={() => setFilter('pinned')}
        >
          Pinned
        </button>
        {STORY_COMPETENCIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`story-workspace__filter${filter === c.id ? ' is-on' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {stories.length === 0 ? (
        <EmptyState
          compact
          title="No stories yet"
          body="Start a library you can reuse across interviews."
          actionLabel="Add story"
          onAction={addStory}
        />
      ) : (
        <div className="story-workspace__layout">
          <aside className="story-workspace__list">
            {groups.map((group) => (
              <div key={group.id} className="story-workspace__group">
                <h4>{group.label}</h4>
                <ul>
                  {group.stories.map((story) => {
                    const completeness = starCompleteness(getActiveVersion(story));
                    return (
                      <li key={story.id}>
                        <button
                          type="button"
                          className={`story-workspace__list-item${selected?.id === story.id ? ' is-selected' : ''}`}
                          onClick={() => setSelectedId(story.id)}
                        >
                          <span className="story-workspace__list-title">
                            {story.pinned ? <Pin size={12} /> : null}
                            {story.title}
                          </span>
                          <span className="story-workspace__list-meta">
                            {STORY_CONFIDENCE.find((c) => c.id === story.confidence)?.label}
                            {' · '}
                            {completeness.percent}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          <div className="story-workspace__editor">
            {selected ? (
              <StoryEditor
                story={selected}
                onChange={saveStory}
                onDelete={() => deleteStory(selected.id)}
              />
            ) : (
              <EmptyState compact title="Select a story" body="Or add a new one to start." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Learning({ profile = null, direction: directionProp, onNavigate }) {
  const direction = directionProp || null;
  const [tab, setTab] = useState(() => getLearningTab() || 'roadmap');
  const [roadmapProgress, setRoadmapProgress] = useState(() => getLearningRoadmapProgress());

  const roadmap = useMemo(
    () => buildLearningRoadmap(profile || direction, roadmapProgress),
    [profile, direction, roadmapProgress]
  );

  useEffect(() => {
    setLearningTab(tab);
  }, [tab]);

  useEffect(() => {
    const onSync = () => setRoadmapProgress(getLearningRoadmapProgress());
    window.addEventListener('career-os-synced', onSync);
    return () => window.removeEventListener('career-os-synced', onSync);
  }, []);

  const setItemStatus = (itemFullId, status) => {
    const next = setRoadmapItemStatus(roadmapProgress, roadmap.pathId, itemFullId, status);
    setRoadmapProgress(next);
    saveLearningRoadmapProgress(next);
  };

  return (
    <section className="learning-hub page-section">
      <header className="ui-section ui-section--header learning-hub__intro">
        <h2>Learning</h2>
        <p>Long-term growth toward who you want to become.</p>
      </header>

      <div className="learning-hub__tabs company-workspace__tabs" role="tablist" aria-label="Learning sections">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`company-workspace__tab${tab === id ? ' company-workspace__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} />
            <span className="company-workspace__tab-label">{label}</span>
            <span className="company-workspace__tab-short">{shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="learning-hub__panel" role="tabpanel">
        {tab === 'roadmap' ? (
          <RoadmapTab
            roadmap={roadmap}
            onStatusChange={setItemStatus}
            onNavigate={onNavigate}
          />
        ) : (
          <StoriesTab />
        )}
      </div>
    </section>
  );
}
