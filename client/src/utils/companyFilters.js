import { INDUSTRIES, FUNDING_STAGES } from '../constants';

const STAGE_MIN_FUNDING_M = {
  'pre-seed': 0.5,
  seed: 2,
  'series-a': 5,
  'series-b': 15,
  'series-c': 30,
  'series-d': 50,
  'series-e': 75,
  'pre-ipo': 100,
  ipo: 0,
  public: 0,
  bootstrapped: 0,
};

export function normalizeIndustry(value) {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  if (INDUSTRIES.includes(v)) return v;
  if (/health.?tech|digital health/.test(v)) return 'healthtech';
  if (/healthcare|health care|hospital|clinical/.test(v)) return 'healthcare';
  if (/fintech|financial tech|payments|banking/.test(v)) return 'fintech';
  if (/voice.?ai|speech|conversational ai/.test(v)) return 'voice-ai';
  if (/edtech|education|learning/.test(v)) return 'edtech';
  if (/marketing|martech|advertising/.test(v)) return 'marketing';
  return 'other';
}

export function normalizeFundingStage(value) {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  if (FUNDING_STAGES.includes(v)) return v;
  if (/pre.?seed/.test(v)) return 'pre-seed';
  if (/\bseed\b/.test(v) && !/series/.test(v)) return 'seed';
  if (/series\s*a\b/.test(v)) return 'series-a';
  if (/series\s*b\b/.test(v)) return 'series-b';
  if (/series\s*c\b/.test(v)) return 'series-c';
  if (/series\s*d\b/.test(v)) return 'series-d';
  if (/series\s*e\b/.test(v)) return 'series-e';
  if (/pre.?ipo/.test(v)) return 'pre-ipo';
  if (/\bipo\b/.test(v)) return 'ipo';
  if (/public|listed/.test(v)) return 'public';
  if (/bootstrap/.test(v)) return 'bootstrapped';
  return v;
}

export function normalizeBusinessModel(value) {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  if (v === 'b2b' || v === 'b2c' || v === 'both') return v;
  if (/both|b2b.*b2c|b2c.*b2b/.test(v)) return 'both';
  if (/b2c|consumer|b to c/.test(v)) return 'b2c';
  if (/b2b|enterprise|b to b/.test(v)) return 'b2b';
  return '';
}

export function getFinanceStanding(app) {
  const stage = normalizeFundingStage(app.fundingStage);
  const date = app.lastFundingDate;

  if (!date) {
    if (stage === 'public' || stage === 'ipo') return 'good';
    if (stage === 'bootstrapped') return 'fair';
    return 'unknown';
  }

  const fundingDate = new Date(date);
  if (Number.isNaN(fundingDate.getTime())) return 'unknown';

  const monthsAgo = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (monthsAgo > 18) return 'bad';

  if (monthsAgo <= 6) {
    const minAmount = STAGE_MIN_FUNDING_M[stage];
    const amount = app.lastFundingAmount;

    if (minAmount === 0 || stage === 'public' || stage === 'ipo') return 'good';
    if (amount == null) return 'fair';
    if (amount >= minAmount) return 'good';
    return 'fair';
  }

  return 'fair';
}

export function getCompanyField(app, field) {
  switch (field) {
    case 'industry':
      return normalizeIndustry(app.industry);
    case 'businessModel':
      return normalizeBusinessModel(app.businessModel);
    case 'fundingStage':
      return normalizeFundingStage(app.fundingStage);
    case 'financeStanding':
      return getFinanceStanding(app);
    default:
      return app[field] || '';
  }
}

export function filterCompanies(applications, filters) {
  return applications.filter((app) => {
    if (filters.industry && getCompanyField(app, 'industry') !== filters.industry) return false;
    if (filters.businessModel && getCompanyField(app, 'businessModel') !== filters.businessModel) return false;
    if (filters.fundingStage && getCompanyField(app, 'fundingStage') !== filters.fundingStage) return false;
    if (filters.financeStanding && getCompanyField(app, 'financeStanding') !== filters.financeStanding) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!app.company?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function formatFundingAmount(amount) {
  if (amount == null) return '—';
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}B`;
  if (amount >= 1) return `$${amount}M`;
  return `$${(amount * 1000).toFixed(0)}K`;
}
