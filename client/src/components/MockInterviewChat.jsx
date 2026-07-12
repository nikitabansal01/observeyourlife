import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Square,
  Sparkles,
} from 'lucide-react';
import { authHeaders } from '../storage';
import useSpeechToText from '../hooks/useSpeechToText';
import { useAuth } from '../hooks';
import {
  buildMockApplicationContext,
  defaultMockConfig,
  getActiveMockSession,
  getMockInterviewState,
  mergeDrillIntoPrep,
} from '../utils/mockInterview';
import { getWorkspace } from '../utils/companyWorkspace';

const TYPES = [
  { id: 'recruiter', label: 'Recruiter screen' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'product', label: 'Product' },
  { id: 'mixed', label: 'Mixed' },
];

const PERSONAS = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'tough', label: 'Tough' },
  { id: 'bar-raiser', label: 'Bar-raiser' },
];

function newSessionId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MockInterviewChat({ app, profile = null, onUpdate }) {
  const { getToken } = useAuth();
  const defaults = useMemo(() => defaultMockConfig(app), [app]);
  const [config, setConfig] = useState(defaults);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFeedback, setLastFeedback] = useState(null);
  const bottomRef = useRef(null);

  const speech = useSpeechToText();
  const activeSession = useMemo(() => getActiveMockSession(app), [app]);
  const messages = activeSession?.messages || [];
  const isActive = activeSession?.status === 'active';
  const isCompleted = activeSession?.status === 'completed';

  useEffect(() => {
    setConfig(defaultMockConfig(app));
  }, [app.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, processing]);

  const persistMockState = (nextMock, extraWorkspace = {}) => {
    const workspace = getWorkspace(app);
    onUpdate?.(app.id, {
      workspace: {
        ...workspace,
        ...extraWorkspace,
        mockInterview: nextMock,
      },
    });
  };

  const upsertSession = (session, { active = true } = {}) => {
    const state = getMockInterviewState(app);
    const sessions = [...state.sessions.filter((s) => s.id !== session.id), session]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 8);
    persistMockState({
      sessions,
      activeSessionId: active ? session.id : state.activeSessionId,
    });
  };

  const callTurn = async ({ session, userMessage }) => {
    const applicationContext = buildMockApplicationContext(app, profile);
    const headers = {
      ...(await authHeaders(getToken)),
    };
    const res = await fetch('/api/mock-interview/turn', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        applicationContext,
        profileSnapshot: {
          pathTitle: applicationContext.pathTitle,
          resumeEvidence: applicationContext.resumeEvidence,
        },
        session,
        userMessage: userMessage || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Mock interview turn failed');
    }
    return res.json();
  };

  const startSession = async () => {
    setProcessing(true);
    setError(null);
    setLastFeedback(null);
    speech.stop();
    speech.reset();
    try {
      const seed = {
        id: newSessionId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        config,
        messages: [],
        feedback: [],
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      };
      const result = await callTurn({ session: seed, userMessage: null });
      const patch = result.sessionPatch || {};
      const session = {
        ...seed,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      upsertSession(session);
    } catch (e) {
      setError(e.message || 'Could not start mock interview');
    } finally {
      setProcessing(false);
    }
  };

  const sendAnswer = async () => {
    const text = speech.displayText.trim();
    if (!text || !activeSession || processing) return;
    setProcessing(true);
    setError(null);
    speech.stop();
    try {
      const result = await callTurn({ session: activeSession, userMessage: text });
      const patch = result.sessionPatch || {};
      const session = {
        ...activeSession,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      setLastFeedback(result.feedback || null);
      speech.reset();

      const workspaceExtras = {};
      if (result.done && Array.isArray(result.drillQuestions) && result.drillQuestions.length) {
        workspaceExtras.interviewPrep = mergeDrillIntoPrep(app, result.drillQuestions);
      } else if (result.done) {
        workspaceExtras.interviewPrep = mergeDrillIntoPrep(app, []);
      }

      const state = getMockInterviewState(app);
      const sessions = [...state.sessions.filter((s) => s.id !== session.id), session]
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, 8);
      persistMockState(
        { sessions, activeSessionId: session.id },
        workspaceExtras
      );
    } catch (e) {
      setError(e.message || 'Could not send answer');
    } finally {
      setProcessing(false);
    }
  };

  const resetToSetup = () => {
    const state = getMockInterviewState(app);
    persistMockState({
      sessions: state.sessions,
      activeSessionId: null,
    });
    setLastFeedback(null);
    setError(null);
    speech.reset();
  };

  return (
    <div className="workspace-panel mock-interview">
      <article className="workspace-card mock-interview__card">
        <div className="workspace-card__header">
          <Sparkles size={18} />
          <div>
            <h3>Mock interview</h3>
            <p>
              Practice for {app.company || 'this company'} — text chat with optional voice-to-text.
            </p>
          </div>
        </div>

        {!isActive && !isCompleted && (
          <div className="mock-interview__setup">
            <label className="career-direction__field">
              <span>Interview type</span>
              <select
                className="compass-field__input"
                value={config.type}
                onChange={(e) => setConfig((c) => ({ ...c, type: e.target.value }))}
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="career-direction__field">
              <span>Length</span>
              <select
                className="compass-field__input"
                value={config.maxTurns}
                onChange={(e) => setConfig((c) => ({ ...c, maxTurns: Number(e.target.value) }))}
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
              </select>
            </label>
            <label className="career-direction__field">
              <span>Persona</span>
              <select
                className="compass-field__input"
                value={config.persona}
                onChange={(e) => setConfig((c) => ({ ...c, persona: e.target.value }))}
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="submit-btn"
              onClick={startSession}
              disabled={processing}
            >
              {processing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Start mock interview
            </button>
          </div>
        )}

        {(isActive || isCompleted) && (
          <>
            <div className="mock-interview__transcript" aria-live="polite">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mock-interview__bubble mock-interview__bubble--${msg.role}`}
                >
                  <span className="mock-interview__role">
                    {msg.role === 'candidate' ? 'You' : 'Interviewer'}
                  </span>
                  <p>{msg.content}</p>
                </div>
              ))}
              {processing && (
                <div className="mock-interview__bubble mock-interview__bubble--interviewer">
                  <span className="mock-interview__role">Interviewer</span>
                  <p className="workspace-muted">Thinking…</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {lastFeedback?.notes && (
              <div className="mock-interview__feedback">
                <strong>Feedback</strong>
                <p>{lastFeedback.notes}</p>
              </div>
            )}

            {isActive && (
              <div className={`voice-compose mock-interview__compose ${speech.listening ? 'voice-compose--live' : ''}`}>
                <textarea
                  className="voice-compose__input"
                  placeholder={
                    speech.listening
                      ? 'Listening… keep talking'
                      : speech.supported
                        ? 'Type your answer or tap the mic'
                        : 'Type your answer (voice needs Chrome or Safari)'
                  }
                  value={speech.displayText}
                  onChange={(e) => speech.setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      sendAnswer();
                    }
                  }}
                  rows={3}
                  disabled={processing}
                  aria-label="Your interview answer"
                />
                <div className="voice-compose__actions">
                  {speech.supported && (
                    <button
                      type="button"
                      className={`voice-compose__mic ${speech.listening ? 'voice-compose__mic--active' : ''}`}
                      onClick={speech.toggle}
                      disabled={processing}
                      aria-label={speech.listening ? 'Stop recording' : 'Start recording'}
                      aria-pressed={speech.listening}
                    >
                      {speech.listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="voice-compose__send"
                    onClick={sendAnswer}
                    disabled={!speech.displayText.trim() || processing}
                    aria-label={processing ? 'Sending' : 'Send answer'}
                  >
                    {processing ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            )}

            <div className="mock-interview__footer">
              <button type="button" className="auth-btn" onClick={resetToSetup}>
                <RotateCcw size={14} />
                {isCompleted ? 'New session' : 'End & reset'}
              </button>
              {isCompleted && activeSession?.summary && (
                <p className="workspace-muted">{activeSession.summary}</p>
              )}
            </div>
          </>
        )}

        {error && <p className="mock-interview__error">{error}</p>}
      </article>
    </div>
  );
}
