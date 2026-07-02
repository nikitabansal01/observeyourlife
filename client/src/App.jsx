import { useState } from 'react';
import { RefreshCw, LayoutGrid, Heart, Sparkles, Users, Briefcase, Compass } from 'lucide-react';
import LifeOverview from './components/LifeOverview';
import CompassEditor from './components/CompassEditor';
import HwplAreaTab from './components/HwplAreaTab';
import AuthPanel from './components/AuthPanel';
import { useApplications, useHealth, useAuth, useLifeDesign } from './hooks';
import { LIFE_AREAS } from './lifeDesign';
import './App.css';

const AREA_ICONS = {
  overview: LayoutGrid,
  compass: Compass,
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
  const [workSubTab, setWorkSubTab] = useState('dashboard');

  const handleJobVoiceSubmit = async (transcript) => {
    setJobVoiceProcessing(true);
    setJobVoiceSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      const warning = result.storageWarning
        ? ` (saved in browser only — ${result.storageWarning})`
        : '';
      setJobVoiceSummary(`${result.summary}${warning}`);
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

  const navigate = (nextArea, subTab) => {
    setArea(nextArea);
    setAreaVoiceSummary(null);
    setJobVoiceSummary(null);
    if (nextArea === 'work' && subTab) {
      setWorkSubTab(subTab);
    } else if (nextArea !== 'work') {
      setWorkSubTab('dashboard');
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'compass', label: 'Compass' },
    ...LIFE_AREAS.map((a) => ({ id: a.id, label: a.label })),
  ];

  const jobTrackerProps = {
    applications,
    loading,
    error,
    dataSource,
    isAuthenticated,
    onUpdateApplication: updateApplication,
    onClearExamples: clearExamples,
    onResetExamples: resetToExamples,
    onVoiceSubmit: handleJobVoiceSubmit,
    voiceProcessing: jobVoiceProcessing,
    voiceSummary: jobVoiceSummary,
  };

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
          {area === 'work' && workSubTab === 'job-search' && (
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
                setJobVoiceSummary(null);
                if (id !== 'work') setWorkSubTab('dashboard');
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
            initialTab={area === 'work' ? workSubTab : 'dashboard'}
            onTabChange={area === 'work' ? setWorkSubTab : undefined}
            jobTracker={area === 'work' ? jobTrackerProps : undefined}
          />
        )}
      </main>
    </div>
  );
}
