export const STATUS_LABELS = {
  applied: 'Applied',
  recruiter_screen: 'Recruiter / Phone Screen',
  phone_screen: 'Hiring Manager Round',
  interview_scheduled: 'Take-home / Onsite Scheduled',
  interview_completed: 'Take-home / Onsite Done',
  onsite: 'Final Onsite',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS = {
  applied: '#3B82F6',
  recruiter_screen: '#8B5CF6',
  phone_screen: '#A855F7',
  interview_scheduled: '#F59E0B',
  interview_completed: '#10B981',
  onsite: '#06B6D4',
  offer: '#22C55E',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
};

export const INDUSTRIES = [
  'healthtech',
  'healthcare',
  'fintech',
  'voice-ai',
  'edtech',
  'marketing',
  'other',
];

export const INDUSTRY_LABELS = {
  healthtech: 'Healthtech',
  healthcare: 'Healthcare',
  fintech: 'Fintech',
  'voice-ai': 'Voice AI',
  edtech: 'Edtech',
  marketing: 'Marketing',
  other: 'Other',
};

export const BUSINESS_MODELS = ['b2b', 'b2c', 'both'];

export const BUSINESS_MODEL_LABELS = {
  b2b: 'B2B',
  b2c: 'B2C',
  both: 'B2B & B2C',
};

export const FUNDING_STAGES = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'series-d',
  'series-e',
  'pre-ipo',
  'ipo',
  'public',
  'bootstrapped',
];

export const FUNDING_STAGE_LABELS = {
  'pre-seed': 'Pre-seed',
  seed: 'Seed',
  'series-a': 'Series A',
  'series-b': 'Series B',
  'series-c': 'Series C',
  'series-d': 'Series D',
  'series-e': 'Series E',
  'pre-ipo': 'Pre-IPO',
  ipo: 'IPO',
  public: 'Public',
  bootstrapped: 'Bootstrapped',
};

export const FINANCE_STANDINGS = ['good', 'fair', 'bad', 'unknown'];

export const FINANCE_STANDING_LABELS = {
  good: 'Good',
  fair: 'Fair',
  bad: 'Bad',
  unknown: 'Unknown',
};

export const FINANCE_STANDING_COLORS = {
  good: '#22C55E',
  fair: '#F59E0B',
  bad: '#EF4444',
  unknown: '#6B7280',
};

export const PIPELINE_STATUSES = [
  'applied',
  'recruiter_screen',
  'phone_screen',
  'interview_scheduled',
  'interview_completed',
  'onsite',
  'offer',
];

export const PIPELINE_MILESTONES = [
  {
    key: 'screen',
    label: 'Recruiter / Phone',
    statuses: ['recruiter_screen'],
    colorKey: 'recruiter_screen',
  },
  {
    key: 'hiring_manager',
    label: 'Hiring Manager',
    statuses: ['phone_screen'],
    colorKey: 'phone_screen',
  },
  {
    key: 'take_home_onsite',
    label: 'Take-home / Onsite',
    statuses: ['interview_scheduled', 'interview_completed', 'onsite'],
    colorKey: 'interview_scheduled',
  },
  {
    key: 'offer',
    label: 'Offer',
    statuses: ['offer'],
    colorKey: 'offer',
  },
];

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
