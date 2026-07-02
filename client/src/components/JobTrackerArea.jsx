import { useState } from 'react';
import { LayoutGrid, Building2 } from 'lucide-react';
import Dashboard from './Dashboard';
import CompanyBrowser from './CompanyBrowser';
import DataSourceBanner from './DataSourceBanner';

export default function JobTrackerArea({
  applications,
  loading,
  error,
  dataSource,
  isAuthenticated,
  onUpdateApplication,
  onClearExamples,
  onResetExamples,
  onSyncToAccount,
  syncing,
  nested = false,
}) {
  const [jobTab, setJobTab] = useState('pipeline');

  return (
    <section className={`job-tracker-area ${nested ? 'job-tracker-area--nested' : ''}`}>
      {!nested && (
        <header className="ui-section ui-section--header job-tracker-area__intro">
          <h2>Job search</h2>
          <p>
            Your pipeline at a glance — voice-dump interviews, status changes, and next steps to keep everything current.
          </p>
        </header>
      )}

      <nav className="view-tabs view-tabs--nested ui-section ui-section--nav" aria-label="Job search views">
        <button
          type="button"
          className={`view-tab ${jobTab === 'pipeline' ? 'view-tab--active' : ''}`}
          onClick={() => setJobTab('pipeline')}
        >
          <LayoutGrid size={16} />
          Pipeline
        </button>
        <button
          type="button"
          className={`view-tab ${jobTab === 'companies' ? 'view-tab--active' : ''}`}
          onClick={() => setJobTab('companies')}
        >
          <Building2 size={16} />
          Browse companies
        </button>
      </nav>

      <div className="ui-stack ui-stack--work">
        <div className="ui-block ui-block--meta">
          <DataSourceBanner
            dataSource={dataSource}
            isAuthenticated={isAuthenticated}
            onClearExamples={onClearExamples}
            onResetExamples={onResetExamples}
            onSyncToAccount={onSyncToAccount}
            syncing={syncing}
          />
        </div>

        {error && <div className="error-banner ui-block--toast">{error}</div>}

        <div className="ui-block ui-block--content">
          {loading ? (
            <div className="loading">Loading your pipeline…</div>
          ) : jobTab === 'companies' ? (
            <CompanyBrowser applications={applications} onUpdate={onUpdateApplication} />
          ) : (
            <Dashboard applications={applications} />
          )}
        </div>
      </div>
    </section>
  );
}
