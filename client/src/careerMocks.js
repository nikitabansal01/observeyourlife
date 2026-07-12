/** Centralized mock / seed data for Career OS personalized flows. */

import { recommendCareerPaths, getLearningTopicsForDirection } from './careerDirections';

export const EMPTY_SNAPSHOT = {
  currentRole: '',
  yearsExperience: '',
  previousRoles: '',
  industries: '',
  skills: '',
  productsBuilt: '',
  leadership: '',
};

export const MOCK_RESUME_SNAPSHOT = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager, Associate PM, Business Analyst',
  industries: 'SaaS, Fintech, Marketplace',
  skills: 'Roadmapping, discovery, experimentation, stakeholder alignment, SQL',
  productsBuilt: 'B2B analytics dashboard, onboarding funnel, internal ops tooling',
  leadership: 'Led a cross-functional squad of 7; mentored 2 PMs',
};

/** LinkedIn-style parse: role history is clearer than impact or craft depth. */
export const MOCK_LINKEDIN_SNAPSHOT = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager · Associate PM · Business Analyst',
  industries: 'SaaS, Fintech',
  skills: 'Product management, roadmapping, stakeholder management',
  productsBuilt: 'Analytics and onboarding products',
  leadership: 'Managed cross-functional partners',
};

export const DEFAULT_CAREER_PATH = {
  id: 'pm-ai',
  title: 'AI Product Manager',
  focusAreas: ['LLM applications', 'AI copilots', 'Agentic workflows'],
  nextAction: 'Map your strongest AI-adjacent stories from recent work',
  deepen: ['LLM applications', 'AI copilots', 'Agentic workflows'],
  roles: ['AI Product Manager', 'GenAI PM', 'AI Features PM'],
};

export const REFLECTION_QUESTIONS = [
  {
    id: 'energy',
    prompt: 'Which parts of your past work gave you the most energy?',
    type: 'text',
    placeholder: 'e.g. early discovery with customers, shipping 0→1 bets…',
  },
  {
    id: 'lessOf',
    prompt: 'Which responsibilities do you want less of?',
    type: 'text',
    placeholder: 'e.g. heavy process overhead, pure status reporting…',
  },
  {
    id: 'productSurface',
    prompt: 'Do you prefer user-facing products or internal/platform systems?',
    type: 'choice',
    options: ['User-facing products', 'Internal / platform systems', 'A mix of both'],
  },
  {
    id: 'audience',
    prompt: 'B2B, B2C, or both?',
    type: 'choice',
    options: ['B2B', 'B2C', 'Both'],
  },
  {
    id: 'stage',
    prompt: '0→1 building or scaling an existing product?',
    type: 'choice',
    options: ['0→1 building', 'Scaling an existing product', 'Either, depending on the problem'],
  },
  {
    id: 'domains',
    prompt: 'Which domains currently excite you?',
    type: 'text',
    placeholder: 'e.g. AI tooling, climate, health, developer platforms…',
  },
  {
    id: 'learnNext',
    prompt: 'What do you want your next role to teach you?',
    type: 'text',
    placeholder: 'e.g. deeper technical fluency, GTM ownership, org leadership…',
  },
];

export const SNAPSHOT_FIELDS = [
  { key: 'currentRole', label: 'Current role', placeholder: 'e.g. Senior Product Manager' },
  { key: 'yearsExperience', label: 'Years of experience', placeholder: 'e.g. 8' },
  { key: 'previousRoles', label: 'Previous roles', placeholder: 'Comma-separated roles', multiline: true },
  { key: 'industries', label: 'Industries', placeholder: 'e.g. SaaS, Fintech', multiline: true },
  { key: 'skills', label: 'Skills', placeholder: 'Skills that show up in your work', multiline: true },
  { key: 'productsBuilt', label: 'Products or systems built', placeholder: 'What you shipped or owned', multiline: true },
  { key: 'leadership', label: 'Leadership experience', placeholder: 'Teams led, mentoring, influence', multiline: true },
];

export const COMPARISON_DIMENSIONS = [
  { key: 'surface', label: 'User-facing vs infrastructure' },
  { key: 'audience', label: 'B2B vs B2C' },
  { key: 'stage', label: '0→1 vs scale' },
  { key: 'technicalDepth', label: 'Technical depth' },
  { key: 'gtmExposure', label: 'GTM exposure' },
  { key: 'domainSpecialization', label: 'Domain specialization' },
];

export const ASSUMPTION_FIELDS = [
  { key: 'surface', label: 'Product surface' },
  { key: 'audience', label: 'Audience' },
  { key: 'stage', label: 'Stage preference' },
  { key: 'domains', label: 'Exciting domains' },
  { key: 'energy', label: 'Energy sources' },
  { key: 'learnNext', label: 'What to learn next' },
];

export const STORY_GROUPS = [
  { id: 'leadership', label: 'Leadership' },
  { id: 'conflict', label: 'Conflict' },
  { id: 'prioritization', label: 'Prioritization' },
  { id: 'zeroToOne', label: '0→1 product building' },
  { id: 'failure', label: 'Failure' },
  { id: 'technical', label: 'Technical depth' },
  { id: 'stakeholders', label: 'Stakeholder management' },
];

export const PATH_LEARNING_TOPICS = {
  'AI Product Manager': [
    {
      topic: 'AI evaluation systems',
      time: '45 min',
      exercise: 'Design a lightweight eval set for one AI feature you have shipped or studied.',
    },
    {
      topic: 'LLM product sense',
      time: '40 min',
      exercise: 'Compare two AI workflows and score them on usefulness, reliability, and cost.',
    },
  ],
  'Platform Product Manager': [
    {
      topic: 'Platform adoption metrics',
      time: '45 min',
      exercise: 'Draft 3 leading indicators for a shared capability your last team shipped.',
    },
    {
      topic: 'API / developer UX critique',
      time: '40 min',
      exercise: 'Review one internal or public API and write a one-page friction list.',
    },
  ],
  'Growth Product Manager': [
    {
      topic: 'Experiment design',
      time: '40 min',
      exercise: 'Write an experiment brief for one activation or retention idea.',
    },
    {
      topic: 'Growth loop mapping',
      time: '35 min',
      exercise: 'Sketch the acquisition → activation → retention loop for a product you know.',
    },
  ],
};

export const TODAY_PRIORITY_DEFAULTS = [
  { id: 'default-follow', label: 'Follow up with recruiter', meta: 'Suggested' },
  { id: 'default-mock', label: 'Complete mock interview', meta: 'Suggested' },
  { id: 'default-research', label: 'Review company research', meta: 'Suggested' },
  { id: 'default-pipeline', label: 'Update pipeline status', meta: 'Suggested' },
];

function firstSentence(text, fallback) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

function fieldText(snapshot, key) {
  return String(snapshot?.[key] || '').trim();
}

function hasOutcomeSignal(text) {
  return /\d|%|\bx\b|growth|retention|revenue|users|nps|conversion|arr|mrr|latency|adoption/i.test(
    text || ''
  );
}

/**
 * After resume/LinkedIn import, surface what we understood and where
 * more context would improve career-path quality.
 */
export function buildResumeInsights(snapshot = {}, { source = 'upload' } = {}) {
  const signals = [];
  const gaps = [];

  const role = fieldText(snapshot, 'currentRole');
  const years = fieldText(snapshot, 'yearsExperience');
  const previous = fieldText(snapshot, 'previousRoles');
  const industries = fieldText(snapshot, 'industries');
  const skills = fieldText(snapshot, 'skills');
  const products = fieldText(snapshot, 'productsBuilt');
  const leadership = fieldText(snapshot, 'leadership');

  if (role && years) {
    signals.push({
      id: 'trajectory',
      title: 'Clear role trajectory',
      detail: `${role} with about ${years} years of experience.`,
    });
  } else if (role) {
    signals.push({
      id: 'role',
      title: 'Current role detected',
      detail: role,
    });
  }

  if (previous) {
    signals.push({
      id: 'history',
      title: 'Career path history',
      detail: firstSentence(previous, previous),
    });
  }

  if (industries) {
    signals.push({
      id: 'domains',
      title: 'Domain exposure',
      detail: firstSentence(industries, industries),
    });
  }

  if (skills && skills.split(/[,;]/).filter(Boolean).length >= 3) {
    signals.push({
      id: 'skills',
      title: 'Skill signal',
      detail: firstSentence(skills, skills),
    });
  }

  if (leadership && leadership.length > 40) {
    signals.push({
      id: 'leadership',
      title: 'Leadership evidence',
      detail: firstSentence(leadership, leadership),
    });
  }

  if (!role) {
    gaps.push({
      id: 'missing-role',
      field: 'currentRole',
      title: 'Current role',
      detail: 'We could not confidently read your latest title.',
      action: 'Confirm your current or most recent role title.',
    });
  }

  if (!years) {
    gaps.push({
      id: 'missing-years',
      field: 'yearsExperience',
      title: 'Years of experience',
      detail: 'Tenure helps us calibrate seniority of path options.',
      action: 'Add approximate years of experience.',
    });
  }

  if (!products || products.length < 36) {
    gaps.push({
      id: 'thin-products',
      field: 'productsBuilt',
      title: 'Products or systems built',
      detail: source === 'linkedin'
        ? 'LinkedIn rarely spells out what you actually shipped.'
        : 'Product ownership is thin relative to role history.',
      action: 'Name 1–2 products and the problem each one solved.',
    });
  } else if (!hasOutcomeSignal(products)) {
    gaps.push({
      id: 'product-outcomes',
      field: 'productsBuilt',
      title: 'Outcomes and impact',
      detail: 'We see what you built, but not what changed because of it.',
      action: 'Add a metric, adoption signal, or qualitative outcome for each product.',
    });
  }

  if (!skills || skills.length < 24) {
    gaps.push({
      id: 'thin-skills',
      field: 'skills',
      title: 'Distinctive skills',
      detail: 'Generic skill labels make path fit harder to judge.',
      action: 'List the craft skills you want to be known for (not a full keyword dump).',
    });
  }

  if (!leadership || leadership.length < 28) {
    gaps.push({
      id: 'thin-leadership',
      field: 'leadership',
      title: 'Leadership depth',
      detail: 'Influence and mentoring are easy to understate on a profile.',
      action: 'Note team size, mentoring, or a cross-org decision you owned.',
    });
  }

  if (!industries) {
    gaps.push({
      id: 'missing-industries',
      field: 'industries',
      title: 'Industry context',
      detail: 'Domain history helps separate platform, consumer, and specialized paths.',
      action: 'Add the industries or company types you have worked in.',
    });
  }

  // Preference gaps resumes cannot answer — always guide reflection.
  gaps.push({
    id: 'energy-pref',
    field: null,
    reflectionId: 'energy',
    title: 'What actually gives you energy',
    detail: 'Resumes list responsibilities, not which ones you want more of.',
    action: 'In reflection, describe the work that lit you up — and what you want less of.',
  });

  gaps.push({
    id: 'direction-pref',
    field: null,
    reflectionId: 'domains',
    title: 'Where you want to go next',
    detail: 'Past industries are not the same as future excitement.',
    action: 'Tell us the domains and stage (0→1 vs scale) you want next.',
  });

  const sourceLabel = source === 'linkedin' ? 'LinkedIn' : 'resume';
  const gapFocus = gaps
    .filter((g) => g.field)
    .slice(0, 2)
    .map((g) => g.title.toLowerCase());

  const summary = gapFocus.length
    ? `From your ${sourceLabel}, we have a usable baseline — but paths will be sharper if you add more on ${gapFocus.join(' and ')}. Reflection still covers preferences resumes cannot see.`
    : `From your ${sourceLabel}, the factual baseline looks solid. Use reflection for energy, preferences, and what you want to learn next.`;

  return {
    summary,
    source,
    signals: signals.slice(0, 4),
    gaps: gaps.slice(0, 5),
    highlightedFields: [...new Set(gaps.map((g) => g.field).filter(Boolean))],
  };
}

export function buildAssumptionsFromAnswers(answers = {}, snapshot = {}) {
  return {
    surface: answers.productSurface || 'A mix of both',
    audience: answers.audience || 'Both',
    stage: answers.stage || 'Either, depending on the problem',
    domains: answers.domains || snapshot.industries || 'AI, platform, health',
    energy: answers.energy || 'Discovery and shipping meaningful product bets',
    learnNext: answers.learnNext || 'Deeper technical fluency and domain ownership',
    lessOf: answers.lessOf || '',
  };
}

/** Generate top-3 career routes from resume snapshot + reflection preferences. */
export function buildCareerPaths(snapshot = {}, assumptions = {}, options = {}) {
  return recommendCareerPaths(snapshot, assumptions, {
    answers: options.answers || {},
    limit: options.limit || 3,
  });
}

export function getPathLearningTopics(pathTitle) {
  if (PATH_LEARNING_TOPICS[pathTitle]) return PATH_LEARNING_TOPICS[pathTitle];
  return getLearningTopicsForDirection(pathTitle);
}
