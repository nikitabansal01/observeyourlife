import { useState } from 'react';
import { Briefcase, RefreshCw, LayoutGrid, Building2 } from 'lucide-react';
import VoiceDump from './components/VoiceDump';
import Dashboard from './components/Dashboard';
import CompanyBrowser from './components/CompanyBrowser';
import { useApplications, useHealth } from './hooks';
import './App.css';

export default function App() {
  const { applications, loading, error, refresh, submitVoiceDump, updateApplication } = useApplications();
  const { aiEnabled } = useHealth();
  const [processing, setProcessing] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);
  const [view, setView] = useState('pipeline');

  const handleVoiceSubmit = async (transcript) => {
    setProcessing(true);
    setLastSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      setLastSummary(result.summary);
    } catch (e) {
      setLastSummary(`Error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="app">
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />
      <div className="bg-glow bg-glow--3" />

      <header className="header">
        <div className="header__brand">
          <div className="header__icon">
            <Briefcase size={22} />
          </div>
          <div>
            <h1>Job Hunt Assistant</h1>
            <p>Your personal job search command center</p>
          </div>
        </div>
        <div className="header__meta">
          <span className={`mode-badge ${aiEnabled ? 'mode-badge--ai' : ''}`}>
            {aiEnabled ? 'AI parsing on' : 'Heuristic mode'}
          </span>
          <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="main">
        <VoiceDump onSubmit={handleVoiceSubmit} processing={processing} />

        {lastSummary && (
          <div className="toast" role="status">
            {lastSummary}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <nav className="view-tabs" aria-label="Main views">
          <button
            type="button"
            className={`view-tab ${view === 'pipeline' ? 'view-tab--active' : ''}`}
            onClick={() => setView('pipeline')}
          >
            <LayoutGrid size={16} />
            Pipeline
          </button>
          <button
            type="button"
            className={`view-tab ${view === 'companies' ? 'view-tab--active' : ''}`}
            onClick={() => setView('companies')}
          >
            <Building2 size={16} />
            Browse companies
          </button>
        </nav>

        {loading ? (
          <div className="loading">Loading your pipeline…</div>
        ) : view === 'pipeline' ? (
          <Dashboard applications={applications} />
        ) : (
          <CompanyBrowser applications={applications} onUpdate={updateApplication} />
        )}
      </main>
    </div>
  );
}
