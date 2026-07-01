import { useState } from 'react';
import { RefreshCw, LayoutGrid, Heart, Sparkles, Users, Briefcase, Compass, Target } from 'lucide-react';
import LifeOverview from './components/LifeOverview';
import CompassEditor from './components/CompassEditor';
import JobTrackerArea from './components/JobTrackerArea';
import HwplAreaTab from './components/HwplAreaTab';
import AuthPanel from './components/AuthPanel';
import { useApplications, useHealth, useAuth, useLifeDesign } from './hooks';
import { LIFE_AREAS } from './lifeDesign';
import './App.css';

const AREA_ICONS = {
  overview: LayoutGrid,
  compass: Compass,
  jobs: Target,
  work: Briefcase,
  health: Heart,
  play: Sparkles,
  love: Users,
};

const HWPL_TABS = LIFE_AREAS.map((a) => a.id);

export default function App() {
  const { isAuthenticated } = useAuth();
  const {
    applications,
    loading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    clearExamples,
    resetToExamples,
  } = useApplications();
  const {
    data: lifeDesign,
    setGauge,
    setGaugeNote,
    setWorkview,
    setLifeview,
    addAreaLogEntry,
    deleteAreaLogEntry,
  } = useLifeDesign();
  const { aiEnabled } = useHealth();
  const [jobVoiceProcessing, setJobVoiceProcessing] = useState(false);
  const [jobVoiceSummary, setJobVoiceSummary] = useState(null);
  const [areaVoiceProcessing, setAreaVoiceProcessing] = useState(false);
  const [areaVoiceSummary, setAreaVoiceSummary] = useState(null);
  const [area, setArea] = useState('overview');

  const handleJobVoiceSubmit = async (transcript) => {
    setJobVoiceProcessing(true);
    setJobVoiceSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      setJobVoiceSummary(result.summary);
    } catch (e) {
      setJobVoiceSummary(`Error: ${e.message}`);
    } finally {
      setJobVoiceProcessing(false);
    }
  };

  const handleAreaVoiceSubmit = async (transcript) => {
    if (!HWPL_TABS.includes(area)) return;

    setAreaVoiceProcessing(true);
    setAreaVoiceSummary(null);
    try {
      addAreaLogEntry(area, { text: transcript, source: 'voice' });
      const label = LIFE_AREAS.find((a) => a.id === area)?.label || area;
      setAreaVoiceSummary(`Saved to your ${label.toLowerCase()} log.`);
    } finally {
      setAreaVoiceProcessing(false);
    }
  };

  const navigate = (nextArea) => {
    setArea(nextArea);
    setAreaVoiceSummary(null);
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'compass', label: 'Compass' },
    { id: 'jobs', label: 'Job tracker' },
    ...LIFE_AREAS.map((a) => ({ id: a.id, label: a.label })),
  ];

  return (
    <div className="app">
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />
      <div className="bg-glow bg-glow--3" />
      <div className="bg-glow bg-glow--4" />

      <header className="header">
        <div className="header__brand">
          <div className="header__icon">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1>PA for NB</h1>
            <p>Design your life — one area at a time</p>
          </div>
        </div>
        <div className="header__meta">
          <span className={`mode-badge ${aiEnabled ? 'mode-badge--ai' : ''}`}>
            {aiEnabled ? 'AI parsing on' : 'Heuristic mode'}
          </span>
          <AuthPanel />
          {area === 'jobs' && (
            <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh">
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </header>

      <nav className="area-nav" aria-label="Life areas">
        {navItems.map(({ id, label }) => {
          const Icon = AREA_ICONS[id] || LayoutGrid;
          return (
            <button
              key={id}
              type="button"
              className={`area-nav__btn ${area === id ? 'area-nav__btn--active' : ''}`}
              data-area={id}
              onClick={() => {
                setArea(id);
                setAreaVoiceSummary(null);
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <main className="main">
        {area === 'overview' && (
          <LifeOverview
            data={lifeDesign}
            onGaugeChange={setGauge}
            onNoteChange={setGaugeNote}
            onNavigate={navigate}
          />
        )}

        {area === 'compass' && (
          <CompassEditor
            data={lifeDesign}
            onWorkviewChange={setWorkview}
            onLifeviewChange={setLifeview}
          />
        )}

        {area === 'jobs' && (
          <JobTrackerArea
            applications={applications}
            loading={loading}
            error={error}
            dataSource={dataSource}
            isAuthenticated={isAuthenticated}
            onUpdateApplication={updateApplication}
            onClearExamples={clearExamples}
            onResetExamples={resetToExamples}
            onVoiceSubmit={handleJobVoiceSubmit}
            voiceProcessing={jobVoiceProcessing}
            voiceSummary={jobVoiceSummary}
          />
        )}

        {HWPL_TABS.includes(area) && (
          <HwplAreaTab
            areaId={area}
            data={lifeDesign}
            onGaugeChange={setGauge}
            onGaugeNoteChange={setGaugeNote}
            onAddLogEntry={addAreaLogEntry}
            onDeleteLogEntry={deleteAreaLogEntry}
            onVoiceSubmit={handleAreaVoiceSubmit}
            voiceProcessing={areaVoiceProcessing}
            voiceSummary={areaVoiceSummary}
          />
        )}
      </main>
    </div>
  );
}
