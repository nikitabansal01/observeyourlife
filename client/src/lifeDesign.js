/** Designing Your Life — domain model for PA for NB */

export const LIFE_AREAS = [
  {
    id: 'health',
    label: 'Health',
    description: 'Mind, body, and spirit — the foundation everything else runs on.',
    color: '#00F5A0',
  },
  {
    id: 'work',
    label: 'Work',
    description: 'All contribution, paid and unpaid — including your job search.',
    color: '#00D4FF',
  },
  {
    id: 'play',
    label: 'Play',
    description: 'Activities done purely for joy, not outcomes or competition.',
    color: '#FFD60A',
  },
  {
    id: 'love',
    label: 'Love',
    description: 'Relationships — family, friends, community, and connection.',
    color: '#FF006E',
  },
];

export const WORK_SUB_AREAS = [
  {
    id: 'compass-workview',
    label: 'Workview',
    description: 'Your philosophy of work — why you work and what good work means.',
  },
  {
    id: 'job-search',
    label: 'Job search',
    description: 'Pipeline, voice dumps, and company tracking.',
  },
];

export const DEFAULT_LIFE_DESIGN = {
  dashboard: { health: 50, work: 50, play: 50, love: 50 },
  dashboardNotes: { health: '', work: '', play: '', love: '' },
  workview: '',
  lifeview: '',
  areaLogs: { health: [], work: [], play: [], love: [] },
};

export function normalizeLifeDesign(data) {
  const base = data || {};
  return {
    ...DEFAULT_LIFE_DESIGN,
    ...base,
    dashboard: { ...DEFAULT_LIFE_DESIGN.dashboard, ...base.dashboard },
    dashboardNotes: { ...DEFAULT_LIFE_DESIGN.dashboardNotes, ...base.dashboardNotes },
    areaLogs: {
      health: base.areaLogs?.health ?? [],
      work: base.areaLogs?.work ?? [],
      play: base.areaLogs?.play ?? [],
      love: base.areaLogs?.love ?? [],
    },
  };
}

export const AREA_TAB_CONFIG = {
  work: {
    intro: 'Track how full Work feels and log contributions — paid, unpaid, and personal projects.',
    logLabel: 'Work log',
    logHint: 'What you worked on — job, volunteer work, side projects, or unpaid contribution.',
    manualPlaceholder: 'What did you contribute or work on?',
    extraField: { key: 'focus', label: 'Focus', type: 'text', placeholder: 'e.g. job search, client project, volunteering' },
  },
  health: {
    intro: 'Track how full Health feels and log check-ins for energy, sleep, and movement.',
    logLabel: 'Check-ins',
    logHint: 'Energy, sleep, exercise, mood — how mind and body are doing.',
    manualPlaceholder: 'How are you feeling? Energy, sleep, movement…',
    extraField: { key: 'energy', label: 'Energy', type: 'range', min: 1, max: 5 },
  },
  play: {
    intro: 'Capture pure joy — activities done for fun, not outcomes or competition.',
    logLabel: 'Play moments',
    logHint: 'What you did just for fun, without goals or metrics.',
    manualPlaceholder: 'What did you do just for the joy of it?',
    extraField: { key: 'activity', label: 'Activity', type: 'text', placeholder: 'e.g. climbing, cooking, gaming' },
  },
  love: {
    intro: 'Nurture relationships — family, friends, community, and connection.',
    logLabel: 'Connections',
    logHint: 'Who you reached out to, quality time, and community moments.',
    manualPlaceholder: 'Who did you connect with? What happened?',
    extraField: { key: 'person', label: 'Person / group', type: 'text', placeholder: 'e.g. Sarah, book club, neighbors' },
  },
};

export const WORKVIEW_PROMPTS = [
  'Why do you work?',
  'What defines good or worthwhile work?',
  'What does money have to do with it?',
  'What do experience, growth, and fulfillment have to do with it?',
];

export const LIFEVIEW_PROMPTS = [
  'What is the meaning or purpose of life?',
  'What matters most in a life well lived?',
  'Where do family, community, and the wider world fit in?',
  'What role do joy, love, and struggle play in life?',
];
