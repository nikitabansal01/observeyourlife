import { STATUS_LABELS } from '../constants';

export const DEFAULT_PROCESS_STEPS = [
  'Applied',
  'Recruiter / Phone',
  'Hiring Manager',
  'Take-home / Onsite',
  'Offer',
];

const STATUS_TO_DEFAULT_INDEX = {
  applied: 0,
  recruiter_screen: 1,
  phone_screen: 2,
  interview_scheduled: 3,
  interview_completed: 3,
  onsite: 3,
  offer: 4,
};

export function isClosedStatus(status) {
  return status === 'rejected' || status === 'withdrawn';
}

export function normalizeProcessSteps(steps) {
  if (!Array.isArray(steps)) return [...DEFAULT_PROCESS_STEPS];
  const cleaned = steps.map((s) => String(s || '').trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_PROCESS_STEPS];
}

export function defaultStepIndexForStatus(status, stepCount = DEFAULT_PROCESS_STEPS.length) {
  if (isClosedStatus(status)) return Math.max(0, stepCount - 1);
  const mapped = STATUS_TO_DEFAULT_INDEX[status];
  if (typeof mapped === 'number') {
    return Math.min(mapped, Math.max(0, stepCount - 1));
  }
  return 0;
}

/** Resolve process fields for an application, filling defaults for older records. */
export function getProcess(app) {
  const steps = normalizeProcessSteps(app?.processSteps);
  const rawIndex = app?.processStepIndex;
  const index =
    Number.isInteger(rawIndex) && rawIndex >= 0
      ? Math.min(rawIndex, steps.length - 1)
      : defaultStepIndexForStatus(app?.status, steps.length);

  return {
    steps,
    index,
    currentLabel: steps[index] || steps[0] || 'Applied',
    total: steps.length,
  };
}

export function inferStatusFromStep(label, index, total) {
  const text = String(label || '').toLowerCase();
  if (/withdraw/.test(text)) return 'withdrawn';
  if (/reject/.test(text)) return 'rejected';
  if (/offer/.test(text)) return 'offer';
  if (/recruiter|phone screen|phone call/.test(text)) return 'recruiter_screen';
  if (/hiring manager|\bhm\b/.test(text)) return 'phone_screen';
  if (/take[\s-]?home|onsite|final round|loop/.test(text)) {
    return /done|completed|finished/.test(text) ? 'interview_completed' : 'interview_scheduled';
  }
  if (index <= 0) return 'applied';
  if (total > 1 && index >= total - 1) return 'offer';
  return 'interview_scheduled';
}

export function formatBusinessModel(model) {
  if (!model) return '';
  if (model === 'both' || model === 'b2b2c') return 'b2b2c';
  return String(model).toLowerCase();
}

export function formatIndustry(industry, labels = {}) {
  if (!industry) return '';
  return labels[industry] || industry;
}

export function closedStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}
