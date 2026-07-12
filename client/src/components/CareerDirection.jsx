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
  X,
  ArrowRight,
} from 'lucide-react';
import {
  EMPTY_SNAPSHOT,
  MOCK_RESUME_SNAPSHOT,
  MOCK_LINKEDIN_SNAPSHOT,
  REFLECTION_QUESTIONS,
  SNAPSHOT_FIELDS,
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

function RouteCard({ path, isPrimary, onExplore }) {
  const strengths = (path.strengths || path.evidence || []).slice(0, 3);
  const buildNext = (path.buildNext || path.deepen || []).slice(0, 2);

  return (
    <article
      className={`route-card${isPrimary ? ' route-card--selected' : ''}${path.rank === 1 ? ' route-card--best' : ''}`}
    >
      <div className="route-card__header">
        <span className={`route-card__rank route-card__rank--${path.rank || 1}`}>
          {path.rankLabel || 'Route'}
        </span>
        {isPrimary && <span className="route-card__selected-tag">Selected</span>}
      </div>

      <h3 className="route-card__title">{path.title}</h3>
      <p className="route-card__summary">{path.summary || path.exciting || path.whyFits}</p>

      <div className="route-card__lists">
        <div>
          <h4>You already have</h4>
          <ul>
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Build next</h4>
          <ul>
            {buildNext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" className="submit-btn route-card__cta" onClick={onExplore}>
        Explore route
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

function RouteExplorePanel({
  path,
  isPrimary,
  isSecondary,
  onClose,
  onSelectPrimary,
  onSaveSecondary,
}) {
  if (!path) return null;

  const skillsToBuild = (path.buildNext || path.deepen || []).slice(0, 4);
  const whatItDoes = (path.whatItDoes || path.focusAreas || []).slice(0, 4);

  return (
    <div className="route-explore-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="route-explore-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-explore-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="route-explore-panel__header">
          <div>
            <span className={`route-card__rank route-card__rank--${path.rank || 1}`}>
              {path.rankLabel}
            </span>
            <h2 id="route-explore-title">{path.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="route-explore-panel__body">
          <section>
            <h3>What this role does</h3>
            <p>{path.summary || path.exciting}</p>
            {whatItDoes.length > 0 && (
              <ul>
                {whatItDoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Why it may fit</h3>
            <p>{path.whyFits}</p>
          </section>

          <section>
            <h3>Main trade-offs</h3>
            <p>{path.tradeoffs}</p>
          </section>

          <section>
            <h3>Skills to build</h3>
            <ul>
              {skillsToBuild.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Example job titles</h3>
            <p className="route-explore-panel__titles">{(path.roles || []).join(' · ')}</p>
          </section>
        </div>

        <footer className="route-explore-panel__footer">
          <button
            type="button"
            className={`auth-btn${isPrimary ? ' auth-btn--primary' : ''}`}
            onClick={onSelectPrimary}
          >
            <Star size={14} />
            {isPrimary ? 'Primary route' : 'Make primary'}
          </button>
          <button
            type="button"
            className={`auth-btn${isSecondary ? ' auth-btn--primary' : ''}`}
            onClick={onSaveSecondary}
            disabled={isPrimary}
          >
            <Bookmark size={14} />
            {isSecondary ? 'Saved secondary' : 'Save secondary'}
          </button>
        </footer>
      </aside>
    </div>
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
  const [resumeText, setResumeText] = useState('');
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
  const [exploredRouteId, setExploredRouteId] = useState(null);
  const [importBaseline, setImportBaseline] = useState(null);
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
    setImportBaseline(profile.importBaseline || null);
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

  const parseResumeImport = async ({
    source,
    sourceLabel,
    nextFileName,
    nextLinkedinUrl,
    text = '',
  }) => {
    setImportStatus('loading');
    setImportMessage(`Reading your ${sourceLabel} with AI…`);
    setGenerateNote(null);
    setFocusField(null);

    let parsedSnapshot = source === 'linkedin' ? MOCK_LINKEDIN_SNAPSHOT : MOCK_RESUME_SNAPSHOT;
    let parseMode = 'heuristic';
    let warning = null;

    try {
      const res = await fetch('/api/career/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          fileName: nextFileName || '',
          linkedinUrl: nextLinkedinUrl || '',
          text: text || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snapshot && typeof data.snapshot === 'object') {
          parsedSnapshot = { ...EMPTY_SNAPSHOT, ...data.snapshot };
          parseMode = data.mode || 'llm';
          warning = data.warning || null;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Resume parse failed');
      }
    } catch (error) {
      warning = error.message || 'AI parse unavailable — using a demo snapshot.';
      parseMode = 'heuristic';
    }

    const next = importResume({
      source,
      fileName: nextFileName || '',
      linkedinUrl: nextLinkedinUrl || '',
      snapshot: parsedSnapshot,
    });

    const nextSnapshot = next?.snapshot || parsedSnapshot;
    setSnapshot(nextSnapshot);
    setImportBaseline({ ...EMPTY_SNAPSHOT, ...nextSnapshot });
    setHasParsed(true);
    setResumeSource(source);
    setFileName(next?.resume?.fileName || nextFileName || '');
    setLinkedinUrl(next?.resume?.linkedinUrl || nextLinkedinUrl || '');
    setImportStatus('success');

    if (parseMode === 'llm') {
      setImportMessage(warning || 'Cyan = from resume. Amber = still need you.');
    } else {
      setImportMessage(warning || 'Demo snapshot — paste resume text for AI parse.');
    }

    requestAnimationFrame(() => {
      snapshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  function fieldStatus(key) {
    const value = snapshot[key];
    const filled = fieldFilled(value);
    const needs = (insights?.highlightedFields || []).includes(key);
    const baseline = importBaseline?.[key];
    const hadBaseline = fieldFilled(baseline);
    const unchanged = hadBaseline && String(value || '').trim() === String(baseline || '').trim();

    if (needs && !filled) return 'add';
    if (needs && filled) return 'review';
    if (!filled) return 'add';
    if (hadBaseline && unchanged) return 'from-resume';
    if (hadBaseline && !unchanged) return 'yours';
    if (hasParsed && filled && !importBaseline) return 'from-resume';
    return 'yours';
  }

  const FIELD_STATUS_LABEL = {
    'from-resume': 'From resume',
    review: 'Review',
    add: 'Write new',
    yours: 'Yours',
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

    let text = resumeText.trim();
    if (ext === 'txt') {
      try {
        text = (await file.text()).trim() || text;
        setResumeText(text);
      } catch {
        // keep pasted text if any
      }
    } else if (!text) {
      // Binary formats: prefer pasted text for grounded LLM parse
      setImportStatus('error');
      setImportMessage(
        'PDF/DOCX text extraction is limited here. Paste your resume text below, then click Import from text — or upload a .txt export.'
      );
      return;
    }

    try {
      await parseResumeImport({
        source: 'upload',
        sourceLabel: 'resume',
        nextFileName: file.name,
        nextLinkedinUrl: linkedinUrl,
        text,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not parse that resume. Try pasting text or a LinkedIn URL.');
    }
  };

  const handleTextImport = async () => {
    const text = resumeText.trim();
    if (!text) {
      setImportStatus('error');
      setImportMessage('Paste resume text first, or upload a .txt file.');
      return;
    }
    try {
      await parseResumeImport({
        source: 'upload',
        sourceLabel: 'resume text',
        nextFileName: fileName || 'pasted-resume.txt',
        nextLinkedinUrl: linkedinUrl,
        text,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not parse that text. Try again.');
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
      await parseResumeImport({
        source: 'linkedin',
        sourceLabel: 'LinkedIn profile',
        nextFileName: '',
        nextLinkedinUrl: url,
        text: resumeText.trim(),
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not import from LinkedIn. Try pasting resume text instead.');
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

  const showResults = async (nextAssumptions) => {
    setGenerating(true);
    try {
      const next = await generatePaths({ assumptions: nextAssumptions });
      applyGeneratedProfile(next);
      if (next?.recommendMode === 'heuristic') {
        setGenerateNote('Ranked with rules — set OPENAI_API_KEY on the server for LLM-grounded routes.');
      }
    } finally {
      setGenerating(false);
    }
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
    try {
      setReflectionComplete(true);
      updateReflection(answers, { complete: true });
      const nextAssumptions = buildAssumptionsFromAnswers(answers, snapshot);
      const next = await generatePaths({
        assumptions: nextAssumptions,
        answers,
      });
      applyGeneratedProfile(next);
      if (next?.recommendMode === 'llm') {
        setGenerateNote(null);
      } else if (next?.recommendMode === 'heuristic') {
        setGenerateNote('Ranked with rules — set OPENAI_API_KEY on the server for LLM-grounded routes.');
      }
    } catch (error) {
      setGenerateNote(error.message || 'Could not generate routes. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReopenReflection = () => {
    setView('intake');
    setQuestionIndex(0);
    setGenerateNote('Update any answers, then generate paths again.');
  };

  const handleSaveAssumptions = async () => {
    if (!assumptions) return;
    updateAssumptions(assumptions);
    await showResults(assumptions);
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
    const rankedRoutes = paths.slice(0, 3);
    const exploredRoute = rankedRoutes.find((p) => p.id === exploredRouteId) || null;

    return (
      <section className="career-direction career-direction--results">
        <header className="ui-section ui-section--header career-direction__intro career-direction__intro--results">
          <h2>Your strongest routes</h2>
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
            onClick={() => {
              setExploredRouteId(null);
              showResults(assumptions || buildAssumptionsFromAnswers(answers, snapshot));
            }}
          >
            <RefreshCw size={14} />
            Refresh routes
          </button>
        </div>

        {editingAssumptions && assumptions && (
          <div className="career-direction__card">
            <div className="career-direction__card-header">
              <SlidersHorizontal size={18} />
              <div>
                <h3>Edit assumptions</h3>
                <p>Tweak these, then refresh routes.</p>
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
                Apply & refresh routes
              </button>
            </div>
          </div>
        )}

        {primaryPathId && (
          <p className="career-direction__selection-summary" aria-live="polite">
            Primary route: <strong>{paths.find((p) => p.id === primaryPathId)?.title}</strong>
            {secondaryPathId
              ? <> · Secondary: <strong>{paths.find((p) => p.id === secondaryPathId)?.title}</strong></>
              : null}
          </p>
        )}

        <div className="route-card-list">
          {rankedRoutes.map((path) => (
            <RouteCard
              key={path.id}
              path={path}
              isPrimary={primaryPathId === path.id}
              onExplore={() => setExploredRouteId(path.id)}
            />
          ))}
        </div>

        {exploredRoute && (
          <RouteExplorePanel
            path={exploredRoute}
            isPrimary={primaryPathId === exploredRoute.id}
            isSecondary={secondaryPathId === exploredRoute.id}
            onClose={() => setExploredRouteId(null)}
            onSelectPrimary={() => selectPrimary(exploredRoute.id)}
            onSaveSecondary={() => saveSecondary(exploredRoute.id)}
          />
        )}
      </section>
    );
  }

  return (
    <section className="career-direction">
      <header className="ui-section ui-section--header career-direction__intro">
        <div className="career-direction__intro-row">
          <div>
            <h2>Career Direction</h2>
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
          </div>
        </div>
      </header>

      <div className="career-direction__card">
        <div className="career-direction__card-header">
          <FileText size={18} />
          <div>
            <h3>Resume</h3>
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
            Upload .txt
          </button>
          <div className="career-direction__linkedin">
            <label htmlFor="linkedin-url">LinkedIn URL</label>
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

        <label className="career-direction__paste" htmlFor="resume-text">
          <span>Resume text</span>
          <textarea
            id="resume-text"
            className="compass-field__input"
            rows={4}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste resume text…"
            disabled={importStatus === 'loading'}
          />
        </label>
        <div className="career-direction__paste-actions">
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={handleTextImport}
            disabled={importStatus === 'loading'}
          >
            {importStatus === 'loading' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            Import
          </button>
          {fileName ? (
            <p className="career-direction__file-note">{fileName}</p>
          ) : null}
        </div>

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

      <div ref={snapshotSectionRef} className="career-direction__card">
        <div className="career-direction__card-header">
          <Sparkles size={18} />
          <div>
            <h3>Background</h3>
          </div>
        </div>

        {insights && (
          <div className="career-direction__lanes" aria-live="polite">
            <div className="career-direction__lane career-direction__lane--got">
              <div className="career-direction__lane-head">
                <span className="career-direction__lane-kicker">Pulled from resume</span>
                <p className="career-direction__lane-sub">Confirmed — edit if wrong</p>
              </div>
              {insights.signals.length === 0 ? (
                <span className="career-direction__parse-empty">Nothing solid yet.</span>
              ) : (
                <div className="career-direction__parse-chips">
                  {insights.signals.map((item) => (
                    <span key={item.id} className="career-direction__chip career-direction__chip--ai">
                      {item.label || item.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="career-direction__lane career-direction__lane--need">
              <div className="career-direction__lane-head">
                <span className="career-direction__lane-kicker">Still need from you</span>
                <p className="career-direction__lane-sub">Not on the resume — write these</p>
              </div>
              {(insights.fieldGaps?.length > 0 || insights.reflectionGap) ? (
                <div className="career-direction__parse-chips">
                  {insights.fieldGaps?.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="career-direction__chip career-direction__chip--you"
                      onClick={() => jumpToSnapshotField(item.field)}
                    >
                      {item.label || item.title}
                    </button>
                  ))}
                  {insights.reflectionGap && (
                    <button
                      type="button"
                      className="career-direction__chip career-direction__chip--you"
                      onClick={() => jumpToReflection(insights.reflectionGap.reflectionId)}
                    >
                      {insights.reflectionGap.label}
                    </button>
                  )}
                </div>
              ) : (
                <span className="career-direction__parse-empty">Gaps cleared.</span>
              )}
            </div>
          </div>
        )}

        <div className="career-direction__snapshot-grid">
          {SNAPSHOT_FIELDS.map((field) => {
            const status = hasParsed ? fieldStatus(field.key) : (fieldFilled(snapshot[field.key]) ? 'yours' : 'add');
            const hint = insights?.fieldHints?.[field.key];
            const focused = focusField === field.key;
            return (
              <label
                key={field.key}
                data-field={field.key}
                className={`career-direction__field career-direction__field--${status}${focused ? ' career-direction__field--focused' : ''}`}
              >
                <span className="career-direction__field-label">
                  {field.label}
                  <em className={`career-direction__field-badge career-direction__field-badge--${status}`}>
                    {FIELD_STATUS_LABEL[status]}
                  </em>
                </span>
                {hint && status !== 'from-resume' && (
                  <span className="career-direction__field-hint">{hint}</span>
                )}
                {field.multiline ? (
                  <textarea
                    className="compass-field__input"
                    rows={2}
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

      <div ref={reflectionSectionRef} className="career-direction__card career-direction__reflection career-direction__reflection--write">
        <div className="career-direction__card-header">
          <div>
            <span className="career-direction__write-kicker">Your words · not from resume</span>
            <h3>Preferences</h3>
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
          {generating ? 'Generating routes…' : 'Generate my career paths'}
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
