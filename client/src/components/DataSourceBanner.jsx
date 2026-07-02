import { Info, Trash2, RotateCcw, Cloud } from 'lucide-react';

export default function DataSourceBanner({ dataSource, isAuthenticated, onClearExamples, onResetExamples }) {
  if (isAuthenticated && dataSource === 'local') {
    return (
      <div className="data-banner data-banner--local" role="status">
        <Cloud size={18} />
        <div>
          <strong>Signed in — saved in this browser</strong>
          <p>Your account is connected, but cloud database sync is unavailable. Data stays in this browser until Postgres is linked.</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="data-banner data-banner--account" role="status">
        <Cloud size={18} />
        <div>
          <strong>Saved to your account</strong>
          <p>Your pipeline syncs to your signed-in account on this server.</p>
        </div>
      </div>
    );
  }

  if (dataSource === 'examples') {
    return (
      <div className="data-banner data-banner--examples" role="status">
        <Info size={18} />
        <div>
          <strong>Example data — not your real applications</strong>
          <p>
            These are fictional demo companies. Add your own via voice dump, or sign in to save real data to your account.
          </p>
        </div>
        <div className="data-banner__actions">
          <button type="button" className="data-banner__btn" onClick={onClearExamples}>
            <Trash2 size={14} />
            Start blank
          </button>
        </div>
      </div>
    );
  }

  if (dataSource === 'local') {
    return (
      <div className="data-banner data-banner--local" role="status">
        <Info size={18} />
        <div>
          <strong>Saved locally in this browser</strong>
          <p>Sign in to move your data to your account. It won&apos;t be in the GitHub repo.</p>
        </div>
        <div className="data-banner__actions">
          <button type="button" className="data-banner__btn" onClick={onResetExamples}>
            <RotateCcw size={14} />
            Show examples
          </button>
        </div>
      </div>
    );
  }

  if (dataSource === 'empty') {
    return (
      <div className="data-banner data-banner--empty" role="status">
        <Info size={18} />
        <div>
          <strong>Blank slate</strong>
          <p>Do a voice dump to add companies, or sign in to load your saved account data.</p>
        </div>
        <div className="data-banner__actions">
          <button type="button" className="data-banner__btn" onClick={onResetExamples}>
            <RotateCcw size={14} />
            Load examples
          </button>
        </div>
      </div>
    );
  }

  return null;
}
