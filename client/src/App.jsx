import { useState } from 'react';
import {
  Briefcase,
  RefreshCw,
  Sun,
  Compass,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import VoiceDump from './components/VoiceDump';
import JobTrackerArea from './components/JobTrackerArea';
import CareerDirection from './components/CareerDirection';
import Today from './components/Today';
import InterviewPrep from './components/InterviewPrep';
import Learning from './components/Learning';
import PillarsStrip from './components/PillarsStrip';
import { PageError, PageLoading } from './components/PageStatus';
import { useApplications, useHealth, useAuth, useCareerProfile } from './hooks';
import './App.css';

const NAV_ITEMS = [
  { id: 'today', label: 'Today', shortLabel: 'Today', icon: Sun, group: 'track' },
  { id: 'direction', label: 'Career Direction', shortLabel: 'Direction', icon: Compass, group: 'decide' },
  { id: 'opportunities', label: 'Opportunities', shortLabel: 'Track', icon: Briefcase, group: 'track' },
  { id: 'interview', label: 'Interview Prep', shortLabel: 'Prep', icon: MessageSquare, group: 'prepare' },
  { id: 'learning', label: 'Learning', shortLabel: 'Learn', icon: BookOpen, group: 'prepare' },
];

const NAV_GROUPS = [
  { id: 'decide', label: 'Decide where to go' },
  { id: 'track', label: 'Track opportunities' },
  { id: 'prepare', label: 'Prepare to succeed' },
];

export default function App() {
  const { isAuthenticated } = useAuth();
  const {
    applications,
    labels,
    loading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    createLabel,
    updateLabel,
    deleteLabel,
    clearExamples,
    resetToExamples,
    syncToAccount,
    applySyncedApplications,
  } = useApplications();
  const career = useCareerProfile();
  const { aiEnabled } = useHealth();
  const [jobVoiceProcessing, setJobVoiceProcessing] = useState(false);
  const [jobVoiceSummary, setJobVoiceSummary] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [activeNav, setActiveNav] = useState('today');
  const [interviewPrepFocus, setInterviewPrepFocus] = useState(null);
  const [companyFocus, setCompanyFocus] = useState(null);

  const handleContinuePrep = (appId, round = null) => {
    if (appId) {
      setInterviewPrepFocus({
        appId,
        roundIndex: round?.roundIndex ?? null,
        roundLabel: round?.roundLabel || null,
      });
    }
    setActiveNav('interview');
  };

  const handleOpenCompanyWorkspace = (appId, tab = 'overview') => {
    if (!appId) return;
    setCompanyFocus({ appId, tab });
    setActiveNav('opportunities');
  };

  const handleJobVoiceSubmit = async (transcript) => {
    setJobVoiceProcessing(true);
    setJobVoiceSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      const parserNote = result.parser === 'heuristic'
        ? ' Parsed with basic rules — add OPENAI_API_KEY on the server for smarter understanding.'
        : '';
      const warning = result.storageWarning
        ? ' Saved in this browser until your database is connected.'
        : '';
      setJobVoiceSummary(`${result.summary}${warning}${parserNote}`);
    } catch (e) {
      setJobVoiceSummary(`Error: ${e.message}`);
    } finally {
      setJobVoiceProcessing(false);
    }
  };

  const handleSyncToAccount = async () => {
    setSyncing(true);
    try {
      const synced = await syncToAccount(applications);
      if (!synced) {
        setJobVoiceSummary('Error: Could not sync to your account. Try again in a moment.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const renderNavButtons = (classPrefix) => {
    if (classPrefix === 'sidebar') {
      return NAV_GROUPS.map((group) => (
        <div key={group.id} className="sidebar__group">
          <p className="sidebar__group-label">{group.label}</p>
          {NAV_ITEMS.filter((item) => item.group === group.id).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar__item${activeNav === id ? ' sidebar__item--active' : ''}`}
              onClick={() => setActiveNav(id)}
              aria-current={activeNav === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ));
    }

    return NAV_ITEMS.map(({ id, label, shortLabel, icon: Icon }) => (
      <button
        key={id}
        type="button"
        className={`${classPrefix}__item${activeNav === id ? ` ${classPrefix}__item--active` : ''}`}
        onClick={() => setActiveNav(id)}
        aria-current={activeNav === id ? 'page' : undefined}
        aria-label={label}
        title={label}
      >
        <Icon size={20} />
        <span>{classPrefix === 'mobile-nav' ? shortLabel : label}</span>
      </button>
    ));
  };

  const showPipelineLoading = loading && ['today', 'interview', 'learning', 'opportunities'].includes(activeNav);

  return (
    <div className="app">
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />
      <div className="bg-glow bg-glow--3" />
      <div className="bg-glow bg-glow--4" />

      <div className="app-shell">
        <aside className="sidebar" aria-label="Primary">
          <div className="sidebar__brand">
            <div className="header__icon">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="sidebar__wordmark">Career OS</p>
            </div>
          </div>
          <nav className="sidebar__nav">{renderNavButtons('sidebar')}</nav>
        </aside>

        <div className="app-shell__main">
          <header className="header">
            <div className="header__brand header__brand--mobile-only">
              <div className="header__icon">
                <Briefcase size={22} />
              </div>
              <h1 className="header__wordmark">Career OS</h1>
            </div>
            <div className="header__meta">
              <span className={`mode-badge ${aiEnabled ? 'mode-badge--ai' : ''}`}>
                {aiEnabled ? 'AI parsing on' : 'Heuristic mode'}
              </span>
              <AuthPanel />
              <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh">
                <RefreshCw size={18} className={loading ? 'spin' : undefined} />
              </button>
            </div>
          </header>

          <div className="pillars-strip-wrap pillars-strip-wrap--mobile-only">
            <PillarsStrip activeNav={activeNav} onNavigate={setActiveNav} />
          </div>

          <main className="main">
            {error && activeNav !== 'opportunities' && (
              <PageError message={error} onRetry={refresh} />
            )}
            {showPipelineLoading && activeNav !== 'opportunities' ? (
              <PageLoading label="Loading your career workspace…" />
            ) : activeNav === 'today' ? (
              <Today
                applications={applications}
                profile={career.profile}
                direction={career.direction}
                onNavigate={setActiveNav}
                onContinuePrep={handleContinuePrep}
              />
            ) : activeNav === 'opportunities' ? (
              <>
                <div className="ui-block ui-block--capture">
                  <VoiceDump
                    onSubmit={handleJobVoiceSubmit}
                    processing={jobVoiceProcessing}
                    currentArea="jobs"
                  />
                  {jobVoiceSummary && (
                    <div className={`toast${jobVoiceSummary.startsWith('Error:') ? ' toast--error' : ''}`} role="status">
                      {jobVoiceSummary}
                    </div>
                  )}
                </div>

                <JobTrackerArea
                  applications={applications}
                  labels={labels}
                  loading={loading}
                  error={error}
                  dataSource={dataSource}
                  isAuthenticated={isAuthenticated}
                  onUpdateApplication={updateApplication}
                  onCreateLabel={createLabel}
                  onUpdateLabel={updateLabel}
                  onDeleteLabel={deleteLabel}
                  onClearExamples={clearExamples}
                  onResetExamples={resetToExamples}
                  onSyncToAccount={handleSyncToAccount}
                  syncing={syncing}
                  onCalendarSynced={applySyncedApplications}
                  profile={career.profile}
                  direction={career.direction}
                  onLearningFromReflection={career.addLearningFromReflection}
                  focusCompanyId={companyFocus?.appId || null}
                  focusWorkspaceTab={companyFocus?.tab || 'overview'}
                  onFocusConsumed={() => setCompanyFocus(null)}
                />
              </>
            ) : activeNav === 'direction' ? (
              <CareerDirection
                profile={career.profile}
                importResume={career.importResume}
                updateSnapshot={career.updateSnapshot}
                updateReflection={career.updateReflection}
                generatePaths={career.generatePaths}
                selectPaths={career.selectPaths}
                updateAssumptions={career.updateAssumptions}
              />
            ) : activeNav === 'interview' ? (
              <InterviewPrep
                applications={applications}
                profile={career.profile}
                direction={career.direction}
                onUpdateApplication={updateApplication}
                onNavigate={setActiveNav}
                onOpenCompanyWorkspace={handleOpenCompanyWorkspace}
                focusAppId={interviewPrepFocus?.appId || null}
                focusRoundIndex={interviewPrepFocus?.roundIndex ?? null}
                focusRoundLabel={interviewPrepFocus?.roundLabel || null}
                onFocusConsumed={() => setInterviewPrepFocus(null)}
              />
            ) : activeNav === 'learning' ? (
              <Learning
                applications={applications}
                profile={career.profile}
                direction={career.direction}
                onNavigate={setActiveNav}
              />
            ) : null}
          </main>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Primary">
        {renderNavButtons('mobile-nav')}
      </nav>
    </div>
  );
}
