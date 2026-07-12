import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileText,
  Star,
  Bookmark,
  MessageCircle,
  SlidersHorizontal,
  RefreshCw,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import {
  EMPTY_SNAPSHOT,
  MOCK_RESUME_SNAPSHOT,
  MOCK_LINKEDIN_SNAPSHOT,
  REFLECTION_QUESTIONS,
  SNAPSHOT_FIELDS,
  COMPARISON_DIMENSIONS,
  ASSUMPTION_FIELDS,
  buildAssumptionsFromAnswers,
  buildCareerPaths,
  buildResumeInsights,
} from '../careerMocks';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt';
const ACCEPTED_LABEL = 'PDF, DOC, DOCX, or TXT';

function fieldFilled(value) {
  return Boolean(String(value || '').trim());
}

function PathCard({
  path,
  isPrimary,
  isSecondary,
  onSelectPrimary,
  onSaveSecondary,
}) {
  return (
    <article
      className={`path-card${isPrimary ? ' path-card--primary' : ''}${isSecondary ? ' path-card--secondary' : ''}`}
    >
      <div className="path-card__top">
        <div>
          <div className="path-card__meta">
            {path.trackLabel && <span className="path-card__track">{path.trackLabel}</span>}
            {path.category && (
              <span className={`path-card__category path-card__category--${path.category}`}>
                {path.category === 'emerging' ? 'AI & emerging' : path.category}
              </span>
            )}
          </div>
          <h3>{path.title}</h3>
          <p className="path-card__lead">{path.whyFits}</p>
        </div>
        <div className="path-card__badges">
          {isPrimary && <span className="path-card__badge path-card__badge--primary">Primary</span>}
          {isSecondary && <span className="path-card__badge path-card__badge--secondary">Secondary</span>}
        </div>
      </div>

      <dl className="path-card__facts">
        <div>
          <dt>Evidence</dt>
          <dd>
            <ul>
              {path.evidence.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Exciting</dt>
          <dd>{path.exciting}</dd>
        </div>
        <div>
          <dt>Trade-offs</dt>
          <dd>{path.tradeoffs}</dd>
        </div>
        <div>
          <dt>Deepen next</dt>
          <dd>{path.deepen.join(' · ')}</dd>
        </div>
        <div className="path-card__facts-span">
          <dt>Example roles</dt>
          <dd>{path.roles.join(' · ')}</dd>
        </div>
      </dl>

      <div className="path-card__actions">
        <button
          type="button"
          className={`auth-btn${isPrimary ? ' auth-btn--primary' : ''}`}
          onClick={onSelectPrimary}
        >
          <Star size={14} />
          {isPrimary ? 'Primary path' : 'Select primary'}
        </button>
        <button
          type="button"
          className={`auth-btn${isSecondary ? ' auth-btn--primary' : ''}`}
          onClick={onSaveSecondary}
          disabled={isPrimary}
        >
          <Bookmark size={14} />
          {isSecondary ? 'Secondary saved' : 'Save secondary'}
        </button>
      </div>
    </article>
  );
}

export default function CareerDirection({
  profile,
  importResume,
  updateSnapshot,
  updateReflection,
  generatePaths,
  selectPaths,
  updateAssumptions,
}) {
  const fileInputRef = useRef(null);
  const viewBootstrapped = useRef(false);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [importStatus, setImportStatus] = useState('idle');
  const [importMessage, setImportMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [hasParsed, setHasParsed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [generateNote, setGenerateNote] = useState(null);
  const [reflectionComplete, setReflectionComplete] = useState(false);
  const [view, setView] = useState('intake'); // intake | results
  const [paths, setPaths] = useState([]);
  const [primaryPathId, setPrimaryPathId] = useState(null);
  const [secondaryPathId, setSecondaryPathId] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [editingAssumptions, setEditingAssumptions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resumeSource, setResumeSource] = useState(null);
  const [focusField, setFocusField] = useState(null);
  const insightsRef = useRef(null);
  const snapshotSectionRef = useRef(null);
  const reflectionSectionRef = useRef(null);

  useEffect(() => {
    if (!profile) return;

    setSnapshot({ ...EMPTY_SNAPSHOT, ...(profile.snapshot || {}) });
    setAnswers(profile.reflection || {});
    setReflectionComplete(Boolean(profile.reflectionComplete));
    setHasParsed(Boolean(profile.workflow?.hasResume || profile.resume?.importedAt));
    setFileName(profile.resume?.fileName || '');
    setLinkedinUrl(profile.resume?.linkedinUrl || '');
    setResumeSource(profile.resume?.source || null);
    setPaths(Array.isArray(profile.generatedPaths) ? profile.generatedPaths : []);
    setAssumptions(profile.assumptions || null);
    setPrimaryPathId(profile.selection?.primaryPathId || null);
    setSecondaryPathId(profile.selection?.secondaryPathId || null);

    if (!viewBootstrapped.current) {
      viewBootstrapped.current = true;
      if (
        (profile.generatedPaths || []).length > 0
        && profile.selection?.primaryPathId
      ) {
        setView('results');
      } else {
        setView('intake');
      }
    }
  }, [profile]);

  const currentQuestion = REFLECTION_QUESTIONS[questionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const isLastQuestion = questionIndex === REFLECTION_QUESTIONS.length - 1;
  const answeredCount = REFLECTION_QUESTIONS.filter((q) => fieldFilled(answers[q.id])).length;

  const progress = useMemo(() => {
    const snapshotKeys = Object.keys(EMPTY_SNAPSHOT);
    const snapshotFilled = snapshotKeys.filter((key) => fieldFilled(snapshot[key])).length;
    const snapshotScore = snapshotFilled / snapshotKeys.length;
    const reflectionScore = answeredCount / REFLECTION_QUESTIONS.length;
    const importScore = hasParsed || importStatus === 'success' ? 1 : 0;
    const raw = importScore * 0.25 + snapshotScore * 0.4 + reflectionScore * 0.35;
    return Math.round(raw * 100);
  }, [answeredCount, hasParsed, importStatus, snapshot]);

  const insights = useMemo(() => {
    if (!hasParsed) return null;
    return buildResumeInsights(snapshot, { source: resumeSource || 'upload' });
  }, [hasParsed, resumeSource, snapshot]);

  const simulateParse = async ({ source, sourceLabel, nextFileName, nextLinkedinUrl }) => {
    setImportStatus('loading');
    setImportMessage(`Reading your ${sourceLabel}…`);
    setGenerateNote(null);
    setFocusField(null);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const parsedSnapshot = source === 'linkedin' ? MOCK_LINKEDIN_SNAPSHOT : MOCK_RESUME_SNAPSHOT;

    const next = importResume({
      source,
      fileName: nextFileName || '',
      linkedinUrl: nextLinkedinUrl || '',
      snapshot: parsedSnapshot,
    });

    setSnapshot(next?.snapshot || parsedSnapshot);
    setHasParsed(true);
    setResumeSource(source);
    setFileName(next?.resume?.fileName || nextFileName || '');
    setLinkedinUrl(next?.resume?.linkedinUrl || nextLinkedinUrl || '');
    setImportStatus('success');
    setImportMessage(
      'Context loaded. Review the insights below — they show what we understood and what still needs your input.'
    );

    requestAnimationFrame(() => {
      insightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const jumpToSnapshotField = (fieldKey) => {
    if (!fieldKey) return;
    setFocusField(fieldKey);
    snapshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const input = snapshotSectionRef.current?.querySelector(
        `[data-field="${fieldKey}"] .compass-field__input`
      );
      input?.focus?.();
    }, 280);
  };

  const jumpToReflection = (questionId) => {
    const index = REFLECTION_QUESTIONS.findIndex((q) => q.id === questionId);
    if (index >= 0) setQuestionIndex(index);
    reflectionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      setImportStatus('error');
      setImportMessage(`Unsupported file. Please upload a ${ACCEPTED_LABEL}.`);
      return;
    }

    setFileName(file.name);
    try {
      await simulateParse({
        source: 'upload',
        sourceLabel: 'resume',
        nextFileName: file.name,
        nextLinkedinUrl: linkedinUrl,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not parse that resume. Try another file or paste a LinkedIn URL.');
    }
  };

  const handleLinkedInImport = async () => {
    const url = linkedinUrl.trim();
    if (!url) {
      setImportStatus('error');
      setImportMessage('Add a LinkedIn profile URL, or upload a resume file.');
      return;
    }
    if (!/^https?:\/\//i.test(url) && !/linkedin\.com/i.test(url)) {
      setImportStatus('error');
      setImportMessage('That does not look like a LinkedIn URL. Check it and try again.');
      return;
    }

    setFileName('');
    try {
      await simulateParse({
        source: 'linkedin',
        sourceLabel: 'LinkedIn profile',
        nextFileName: '',
        nextLinkedinUrl: url,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not import from LinkedIn. Try uploading a resume instead.');
    }
  };

  const handleSnapshotChange = (key, value) => {
    setSnapshot((prev) => {
      const next = { ...prev, [key]: value };
      updateSnapshot(next);
      return next;
    });
  };

  const setAnswer = (value) => {
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion.id]: value };
      updateReflection(next, { complete: false });
      return next;
    });
  };

  const goNext = () => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    setReflectionComplete(true);
    updateReflection(answers, { complete: true });
    setGenerateNote('Reflection complete. Generate paths to compare options — not one answer.');
  };

  const goPrev = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  const applyGeneratedProfile = (next) => {
    const nextPaths = next?.generatedPaths?.length
      ? next.generatedPaths
      : buildCareerPaths(
        snapshot,
        next?.assumptions || assumptions || buildAssumptionsFromAnswers(answers, snapshot),
        { answers }
      );
    setPaths(nextPaths);
    setAssumptions(next?.assumptions || null);
    setPrimaryPathId(next?.selection?.primaryPathId || null);
    setSecondaryPathId(next?.selection?.secondaryPathId || null);
    setEditingAssumptions(false);
    setView('results');
    setGenerateNote(null);
  };

  const showResults = (nextAssumptions) => {
    const next = generatePaths({ assumptions: nextAssumptions });
    applyGeneratedProfile(next);
  };

  const handleGenerate = async () => {
    if (answeredCount < REFLECTION_QUESTIONS.length && !reflectionComplete) {
      setGenerateNote('Finish the reflection questions first — paths work better with your full context.');
      setQuestionIndex(Math.min(answeredCount, REFLECTION_QUESTIONS.length - 1));
      return;
    }
    if (progress < 35) {
      setGenerateNote('Add a bit more resume context before generating paths.');
      return;
    }

    setGenerating(true);
    setGenerateNote(null);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setReflectionComplete(true);
    updateReflection(answers, { complete: true });
    const nextAssumptions = buildAssumptionsFromAnswers(answers, snapshot);
    const next = generatePaths({ assumptions: nextAssumptions });
    applyGeneratedProfile(next);
    setGenerating(false);
  };

  const handleReopenReflection = () => {
    setView('intake');
    setQuestionIndex(0);
    setGenerateNote('Update any answers, then generate paths again.');
  };

  const handleSaveAssumptions = () => {
    if (!assumptions) return;
    updateAssumptions(assumptions);
    showResults(assumptions);
    setEditingAssumptions(false);
  };

  const selectPrimary = (id) => {
    setPrimaryPathId(id);
    const nextSecondary = secondaryPathId === id ? null : secondaryPathId;
    if (secondaryPathId === id) setSecondaryPathId(null);
    selectPaths({ primaryPathId: id, secondaryPathId: nextSecondary });
  };

  const saveSecondary = (id) => {
    if (id === primaryPathId) return;
    setSecondaryPathId((prev) => {
      const next = prev === id ? null : id;
      selectPaths({ primaryPathId, secondaryPathId: next });
      return next;
    });
  };

  if (view === 'results') {
    return (
      <section className="career-direction career-direction--results">
        <header className="ui-section ui-section--header career-direction__intro">
          <h2>Top routes for you</h2>
          <p>
            Ranked from your resume strengths and reflection answers
            {paths[0]?.trackLabel ? ` within ${paths[0].trackLabel}` : ''}
            — compare, then pick a primary.
          </p>
        </header>

        <div className="career-direction__results-toolbar">
          <button type="button" className="auth-btn" onClick={handleReopenReflection}>
            <MessageCircle size={14} />
            Reopen reflection
          </button>
          <button
            type="button"
            className={`auth-btn${editingAssumptions ? ' auth-btn--primary' : ''}`}
            onClick={() => setEditingAssumptions((open) => !open)}
          >
            <SlidersHorizontal size={14} />
            Edit assumptions
          </button>
          <button
            type="button"
            className="auth-btn"
            onClick={() => showResults(assumptions || buildAssumptionsFromAnswers(answers, snapshot))}
          >
            <RefreshCw size={14} />
            Refresh paths
          </button>
        </div>

        {editingAssumptions && assumptions && (
          <div className="career-direction__card">
            <div className="career-direction__card-header">
              <SlidersHorizontal size={18} />
              <div>
                <h3>Edit assumptions</h3>
                <p>Tweak the inputs behind these paths, then refresh the comparison.</p>
              </div>
            </div>
            <div className="career-direction__assumptions-grid">
              {ASSUMPTION_FIELDS.map((field) => (
                <label key={field.key} className="career-direction__field">
                  <span>{field.label}</span>
                  <input
                    className="compass-field__input"
                    type="text"
                    value={assumptions[field.key] || ''}
                    onChange={(e) =>
                      setAssumptions((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="career-direction__assumptions-actions">
              <button type="button" className="submit-btn" onClick={handleSaveAssumptions}>
                Apply & refresh paths
              </button>
            </div>
          </div>
        )}

        {(primaryPathId || secondaryPathId) && (
          <div className="career-direction__selection-summary" aria-live="polite">
            {primaryPathId && (
              <span>
                Primary: <strong>{paths.find((p) => p.id === primaryPathId)?.title}</strong>
              </span>
            )}
            {secondaryPathId && (
              <span>
                Secondary: <strong>{paths.find((p) => p.id === secondaryPathId)?.title}</strong>
              </span>
            )}
          </div>
        )}

        <div className="path-card-grid">
          {paths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              isPrimary={primaryPathId === path.id}
              isSecondary={secondaryPathId === path.id}
              onSelectPrimary={() => selectPrimary(path.id)}
              onSaveSecondary={() => saveSecondary(path.id)}
            />
          ))}
        </div>

        <div className="career-direction__card career-direction__compare">
          <div className="career-direction__card-header">
            <div>
              <h3>Compare across dimensions</h3>
              <p>Scan how the paths differ — then choose a primary and optional secondary.</p>
            </div>
          </div>

          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  {paths.map((path) => (
                    <th key={path.id} scope="col">
                      {path.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DIMENSIONS.map((dim) => (
                  <tr key={dim.key}>
                    <th scope="row">{dim.label}</th>
                    {paths.map((path) => (
                      <td key={`${path.id}-${dim.key}`}>{path.dimensions[dim.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="career-direction">
      <header className="ui-section ui-section--header career-direction__intro">
        <div className="career-direction__intro-row">
          <div>
            <h2>What do you want to build next?</h2>
            <p>Start with your experience, then explore the work that gives you energy.</p>
          </div>
          <div className="career-direction__progress-compact" aria-live="polite">
            <div className="career-direction__progress-compact-top">
              <span>Profile</span>
              <strong>{progress}%</strong>
            </div>
            <div
              className="career-direction__progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Career profile completeness"
            >
              <div className="career-direction__progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p>Resume is context, not a score.</p>
          </div>
        </div>
      </header>

      <div className="career-direction__card">
        <div className="career-direction__card-header">
          <FileText size={18} />
          <div>
            <h3>Resume import</h3>
            <p>Upload a resume or add LinkedIn so we can understand your background.</p>
          </div>
        </div>

        <div className="career-direction__import-row">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="visually-hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="submit-btn career-direction__upload-btn"
            onClick={handleUploadClick}
            disabled={importStatus === 'loading'}
          >
            {importStatus === 'loading' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            Upload resume
          </button>
          <div className="career-direction__linkedin">
            <label htmlFor="linkedin-url">LinkedIn URL (optional)</label>
            <div className="career-direction__linkedin-row">
              <div className="career-direction__linkedin-input-wrap">
                <Link2 size={16} />
                <input
                  id="linkedin-url"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  disabled={importStatus === 'loading'}
                />
              </div>
              <button
                type="button"
                className="auth-btn auth-btn--primary"
                onClick={handleLinkedInImport}
                disabled={importStatus === 'loading'}
              >
                Import
              </button>
            </div>
          </div>
        </div>

        <p className="career-direction__file-note">
          Supported files: {ACCEPTED_LABEL}
          {fileName ? ` · Selected: ${fileName}` : ''}
        </p>

        {importStatus === 'loading' && (
          <div className="career-direction__status career-direction__status--loading" role="status">
            <Loader2 size={16} className="spin" />
            {importMessage}
          </div>
        )}
        {importStatus === 'success' && (
          <div className="toast career-direction__status" role="status">
            <CheckCircle2 size={16} />
            {importMessage}
          </div>
        )}
        {importStatus === 'error' && (
          <div className="error-banner career-direction__status" role="alert">
            <AlertCircle size={16} />
            {importMessage}
          </div>
        )}
      </div>

      {insights && (
        <div
          ref={insightsRef}
          className="career-direction__card career-direction__insights"
          aria-live="polite"
        >
          <div className="career-direction__card-header">
            <Lightbulb size={18} />
            <div>
              <h3>Import insights</h3>
              <p>What we already understand — and where more context will improve your path options.</p>
            </div>
          </div>

          <p className="career-direction__insights-summary">{insights.summary}</p>

          <div className="career-direction__insights-grid">
            <section>
              <h4>Signals we picked up</h4>
              {insights.signals.length === 0 ? (
                <p className="career-direction__insights-empty">
                  Not much structured signal yet — fill the snapshot below so we have a baseline.
                </p>
              ) : (
                <ul className="career-direction__insight-list">
                  {insights.signals.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4>Add more context on</h4>
              <ul className="career-direction__insight-list career-direction__insight-list--gaps">
                {insights.gaps.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <button
                      type="button"
                      className="auth-btn career-direction__insight-action"
                      onClick={() => {
                        if (item.field) jumpToSnapshotField(item.field);
                        else if (item.reflectionId) jumpToReflection(item.reflectionId);
                      }}
                    >
                      {item.action}
                      <ArrowRight size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      <div ref={snapshotSectionRef} className="career-direction__card">
        <div className="career-direction__card-header">
          <Sparkles size={18} />
          <div>
            <h3>Parsed career snapshot</h3>
            <p>
              {hasParsed
                ? 'Edit anything that is incomplete or wrong — this stays your source of truth.'
                : 'Upload a resume to prefill, or fill these in yourself. Resume is context, not a score.'}
            </p>
          </div>
        </div>

        <div className="career-direction__snapshot-grid">
          {SNAPSHOT_FIELDS.map((field) => {
            const needsContext = insights?.highlightedFields?.includes(field.key);
            const focused = focusField === field.key;
            return (
              <label
                key={field.key}
                data-field={field.key}
                className={`career-direction__field${needsContext ? ' career-direction__field--needs-context' : ''}${focused ? ' career-direction__field--focused' : ''}`}
              >
                <span>
                  {field.label}
                  {needsContext ? ' · needs more context' : ''}
                </span>
                {field.multiline ? (
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={snapshot[field.key]}
                    onChange={(e) => handleSnapshotChange(field.key, e.target.value)}
                    onFocus={() => setFocusField(field.key)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    className="compass-field__input"
                    type="text"
                    value={snapshot[field.key]}
                    onChange={(e) => handleSnapshotChange(field.key, e.target.value)}
                    onFocus={() => setFocusField(field.key)}
                    placeholder={field.placeholder}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div ref={reflectionSectionRef} className="career-direction__card career-direction__reflection">
        <div className="career-direction__card-header">
          <div>
            <h3>Conversational reflection</h3>
            <p>One question at a time — help us understand the work that fits you.</p>
          </div>
          <span className="career-direction__question-count">
            {questionIndex + 1} / {REFLECTION_QUESTIONS.length}
            {reflectionComplete ? ' · Done' : ''}
          </span>
        </div>

        <div className="career-direction__question" key={currentQuestion.id}>
          <h4>{currentQuestion.prompt}</h4>

          {currentQuestion.type === 'choice' ? (
            <div className="career-direction__choices" role="group" aria-label={currentQuestion.prompt}>
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`career-direction__choice${currentAnswer === option ? ' career-direction__choice--active' : ''}`}
                  onClick={() => setAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="compass-field__input"
              rows={4}
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
            />
          )}
        </div>

        <div className="career-direction__question-nav">
          <button type="button" className="auth-btn" onClick={goPrev} disabled={questionIndex === 0}>
            <ChevronLeft size={16} />
            Back
          </button>
          <button type="button" className="auth-btn auth-btn--primary" onClick={goNext}>
            {isLastQuestion ? 'Finish reflection' : 'Next'}
            {!isLastQuestion && <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      <div className="career-direction__cta-row">
        <button
          type="button"
          className="submit-btn career-direction__cta"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
          Generate my career paths
        </button>
        {generateNote && (
          <p className="career-direction__cta-note" role="status">
            {generateNote}
          </p>
        )}
      </div>
    </section>
  );
}
