export const STATUSES = [
  'applied',
  'recruiter_screen',
  'phone_screen',
  'interview_scheduled',
  'interview_completed',
  'onsite',
  'offer',
  'rejected',
  'withdrawn',
];

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

export const BUSINESS_MODELS = ['b2b', 'b2c', 'both'];

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

export const DEFAULT_APPLICATION = {
  company: '',
  positionTitle: '',
  industry: '',
  businessModel: '',
  fundingStage: '',
  lastFundingDate: '',
  lastFundingAmount: null,
  status: 'applied',
  processSteps: [
    'Applied',
    'Recruiter / Phone',
    'Hiring Manager',
    'Take-home / Onsite',
    'Offer',
  ],
  processStepIndex: 0,
  interviewDates: [],
  nextSteps: [],
  needsFollowUp: false,
  needsPrep: false,
  labelIds: [],
  notes: '',
  isExample: false,
};

export const DEFAULT_LABEL_NAME = 'Referral requested';
