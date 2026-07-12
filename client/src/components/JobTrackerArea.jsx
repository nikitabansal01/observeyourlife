import { useState } from 'react';
import { LayoutGrid, Building2, Settings } from 'lucide-react';
import Dashboard from './Dashboard';
import CompanyBrowser from './CompanyBrowser';
import DataSourceBanner from './DataSourceBanner';
import LabelsSettingsOverlay from './LabelsSettingsOverlay';
import GoogleCalendarPanel from './GoogleCalendarPanel';

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
}) {
  const [jobTab, setJobTab] = useState('pipeline');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeCount = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status)).length;

  return (
    <section className={`job-tracker-area ${nested ? 'job-tracker-area--nested' : ''} job-tracker-area--focus`}>
      {!nested && (
        <header className="ui-section ui-section--header job-tracker-area__intro">
          <h2>Job search</h2>
          <p>
            Your pipeline at a glance — voice-dump interviews, status changes, and next steps to keep everything current.
          </p>
        </header>
      )}

      <GoogleCalendarPanel enabled={isAuthenticated} onSynced={onCalendarSynced} />

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

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading your pipeline…</div>
      ) : jobTab === 'companies' ? (
        <CompanyBrowser
          applications={applications}
          labels={labels}
          onUpdate={onUpdateApplication}
        />
      ) : (
        <Dashboard
          applications={applications}
          labels={labels}
          onUpdate={onUpdateApplication}
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
