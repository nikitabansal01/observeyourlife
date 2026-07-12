import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Building2, Settings } from 'lucide-react';
import Dashboard from './Dashboard';
import CompanyBrowser from './CompanyBrowser';
import CompanyWorkspace from './CompanyWorkspace';
import DataSourceBanner from './DataSourceBanner';
import LabelsSettingsOverlay from './LabelsSettingsOverlay';
import GoogleCalendarPanel from './GoogleCalendarPanel';
import { PageError, PageLoading } from './PageStatus';

export default function JobTrackerArea({
  applications,
  labels = [],
  loading,
  error,
  dataSource,
  isAuthenticated,
  onUpdateApplication,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onClearExamples,
  onResetExamples,
  onSyncToAccount,
  syncing,
  nested = false,
  onCalendarSynced,
  focusCompanyId = null,
  focusWorkspaceTab = 'overview',
  onFocusConsumed,
  profile = null,
  direction = null,
  onLearningFromReflection,
}) {
  const [jobTab, setJobTab] = useState('pipeline');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('overview');
  const activeCount = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status)).length;

  const selectedApp = useMemo(
    () => applications.find((app) => app.id === selectedAppId) || null,
    [applications, selectedAppId]
  );

  useEffect(() => {
    if (!focusCompanyId) return;
    setSelectedAppId(focusCompanyId);
    setWorkspaceTab(focusWorkspaceTab || 'overview');
    onFocusConsumed?.();
  }, [focusCompanyId, focusWorkspaceTab, onFocusConsumed]);

  const openWorkspace = (appId, tab = 'overview') => {
    setSelectedAppId(appId);
    setWorkspaceTab(tab);
  };

  if (selectedApp) {
    return (
      <CompanyWorkspace
        app={selectedApp}
        initialTab={workspaceTab}
        onBack={() => setSelectedAppId(null)}
        onUpdate={onUpdateApplication}
        profile={profile}
        direction={direction}
        onLearningFromReflection={onLearningFromReflection}
      />
    );
  }

  return (
    <section className={`job-tracker-area ${nested ? 'job-tracker-area--nested' : ''} job-tracker-area--focus`}>
      {!nested && (
        <header className="ui-section ui-section--header job-tracker-area__intro">
          <h2>Opportunities</h2>
          <p>Track status, stages, recruiter notes, and timeline for every opportunity.</p>
        </header>
      )}

      <GoogleCalendarPanel
        enabled={isAuthenticated}
        applications={applications}
        onSynced={onCalendarSynced}
      />

      <div className="job-tracker-area__toolbar">
        <div className="job-tracker-area__views" role="tablist" aria-label="Job search views">
          <button
            type="button"
            role="tab"
            aria-selected={jobTab === 'pipeline'}
            className={`job-tracker-area__view ${jobTab === 'pipeline' ? 'job-tracker-area__view--active' : ''}`}
            onClick={() => setJobTab('pipeline')}
          >
            <LayoutGrid size={15} />
            Pipeline
            {jobTab === 'pipeline' && activeCount > 0 && (
              <span className="job-tracker-area__count">{activeCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={jobTab === 'companies'}
            className={`job-tracker-area__view ${jobTab === 'companies' ? 'job-tracker-area__view--active' : ''}`}
            onClick={() => setJobTab('companies')}
          >
            <Building2 size={15} />
            Browse
          </button>
        </div>

        <button
          type="button"
          className="icon-btn job-tracker-area__settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Job tracker settings"
          title="Labels settings"
        >
          <Settings size={17} />
        </button>
      </div>

      <DataSourceBanner
        dataSource={dataSource}
        isAuthenticated={isAuthenticated}
        onClearExamples={onClearExamples}
        onResetExamples={onResetExamples}
        onSyncToAccount={onSyncToAccount}
        syncing={syncing}
        quiet
      />

      {error && <PageError message={error} />}

      {loading ? (
        <PageLoading label="Loading your pipeline…" />
      ) : jobTab === 'companies' ? (
        <CompanyBrowser
          applications={applications}
          labels={labels}
          onUpdate={onUpdateApplication}
          onOpenCompany={openWorkspace}
        />
      ) : (
        <Dashboard
          applications={applications}
          labels={labels}
          onUpdate={onUpdateApplication}
          onOpenCompany={openWorkspace}
        />
      )}

      {settingsOpen && (
        <LabelsSettingsOverlay
          labels={labels}
          onClose={() => setSettingsOpen(false)}
          onCreate={onCreateLabel}
          onUpdate={onUpdateLabel}
          onDelete={onDeleteLabel}
        />
      )}
    </section>
  );
}
