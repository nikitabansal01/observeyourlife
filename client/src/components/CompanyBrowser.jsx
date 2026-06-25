import { useState } from 'react';
import { Search, X, Building2, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  BUSINESS_MODELS,
  BUSINESS_MODEL_LABELS,
  FUNDING_STAGES,
  FUNDING_STAGE_LABELS,
  FINANCE_STANDINGS,
  FINANCE_STANDING_LABELS,
  FINANCE_STANDING_COLORS,
  formatDate,
} from '../constants';
import {
  filterCompanies,
  getCompanyField,
  getFinanceStanding,
  formatFundingAmount,
} from '../utils/companyFilters';

const EMPTY_FILTERS = {
  industry: '',
  businessModel: '',
  fundingStage: '',
  financeStanding: '',
  search: '',
};

function FilterSelect({ label, value, onChange, options, labels }) {
  return (
    <label className="company-filter">
      <span className="company-filter__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="company-filter__select">
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt] || opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompanyRow({ app, onUpdate }) {
  const industry = getCompanyField(app, 'industry');
  const businessModel = getCompanyField(app, 'businessModel');
  const fundingStage = getCompanyField(app, 'fundingStage');
  const financeStanding = getFinanceStanding(app);
  const standingColor = FINANCE_STANDING_COLORS[financeStanding];

  const handleChange = (field, value) => {
    const payload = { [field]: value };
    if (field === 'lastFundingAmount') {
      payload.lastFundingAmount = value === '' ? null : Number(value);
    }
    onUpdate(app.id, payload);
  };

  return (
    <article className="company-row">
      <div className="company-row__main">
        <h3 className="company-row__name">
          <Building2 size={16} />
          {app.company || 'Unknown'}
        </h3>
        {app.positionTitle && <p className="company-row__role">{app.positionTitle}</p>}
      </div>

      <div className="company-row__fields">
        <label className="company-row__field">
          <span>Industry</span>
          <select
            value={app.industry || ''}
            onChange={(e) => handleChange('industry', e.target.value)}
          >
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {INDUSTRY_LABELS[i]}
              </option>
            ))}
          </select>
        </label>

        <label className="company-row__field">
          <span>Model</span>
          <select
            value={app.businessModel || ''}
            onChange={(e) => handleChange('businessModel', e.target.value)}
          >
            <option value="">—</option>
            {BUSINESS_MODELS.map((m) => (
              <option key={m} value={m}>
                {BUSINESS_MODEL_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="company-row__field">
          <span>Stage</span>
          <select
            value={app.fundingStage || ''}
            onChange={(e) => handleChange('fundingStage', e.target.value)}
          >
            <option value="">—</option>
            {FUNDING_STAGES.map((s) => (
              <option key={s} value={s}>
                {FUNDING_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="company-row__field">
          <span>Last round</span>
          <input
            type="date"
            value={app.lastFundingDate ? app.lastFundingDate.slice(0, 10) : ''}
            onChange={(e) => handleChange('lastFundingDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
          />
        </label>

        <label className="company-row__field">
          <span>Amount ($M)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="—"
            value={app.lastFundingAmount ?? ''}
            onChange={(e) => handleChange('lastFundingAmount', e.target.value)}
          />
        </label>
      </div>

      <div className="company-row__badges">
        {industry && (
          <span className="company-badge company-badge--industry">
            {INDUSTRY_LABELS[industry] || industry}
          </span>
        )}
        {businessModel && (
          <span className="company-badge company-badge--model">
            <Users size={12} />
            {BUSINESS_MODEL_LABELS[businessModel]}
          </span>
        )}
        {fundingStage && (
          <span className="company-badge company-badge--stage">
            <TrendingUp size={12} />
            {FUNDING_STAGE_LABELS[fundingStage] || fundingStage}
          </span>
        )}
        {app.lastFundingDate && (
          <span className="company-badge company-badge--funding">
            <Calendar size={12} />
            {formatDate(app.lastFundingDate)} · {formatFundingAmount(app.lastFundingAmount)}
          </span>
        )}
        <span
          className="company-badge company-badge--standing"
          style={{ '--standing-color': standingColor }}
        >
          <DollarSign size={12} />
          {FINANCE_STANDING_LABELS[financeStanding]}
        </span>
      </div>
    </article>
  );
}

export default function CompanyBrowser({ applications, onUpdate }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const filtered = filterCompanies(applications, filters);
  const hasFilters = Object.values(filters).some(Boolean);

  const standingCounts = applications.reduce((acc, app) => {
    const s = getFinanceStanding(app);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="company-browser">
      <div className="company-browser__header">
        <div>
          <h2>Browse companies</h2>
          <p>Filter by industry, business model, fundraising stage, and financial health</p>
        </div>
        <div className="company-browser__summary">
          {FINANCE_STANDINGS.filter((s) => standingCounts[s]).map((s) => (
            <button
              key={s}
              type="button"
              className={`standing-pill ${filters.financeStanding === s ? 'standing-pill--active' : ''}`}
              style={{ '--standing-color': FINANCE_STANDING_COLORS[s] }}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  financeStanding: f.financeStanding === s ? '' : s,
                }))
              }
            >
              <span className="standing-pill__count">{standingCounts[s]}</span>
              {FINANCE_STANDING_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="company-browser__filters">
        <div className="company-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search companies…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <FilterSelect
          label="Industry"
          value={filters.industry}
          onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
          options={INDUSTRIES}
          labels={INDUSTRY_LABELS}
        />
        <FilterSelect
          label="Business model"
          value={filters.businessModel}
          onChange={(v) => setFilters((f) => ({ ...f, businessModel: v }))}
          options={BUSINESS_MODELS}
          labels={BUSINESS_MODEL_LABELS}
        />
        <FilterSelect
          label="Fundraising stage"
          value={filters.fundingStage}
          onChange={(v) => setFilters((f) => ({ ...f, fundingStage: v }))}
          options={FUNDING_STAGES}
          labels={FUNDING_STAGE_LABELS}
        />
        <FilterSelect
          label="Finance standing"
          value={filters.financeStanding}
          onChange={(v) => setFilters((f) => ({ ...f, financeStanding: v }))}
          options={FINANCE_STANDINGS}
          labels={FINANCE_STANDING_LABELS}
        />

        {hasFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      <p className="company-browser__count">
        Showing {filtered.length} of {applications.length} companies
      </p>

      <div className="company-browser__list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No companies match your filters.</p>
            <p>Try adjusting filters or add companies via voice dump.</p>
          </div>
        ) : (
          filtered.map((app) => (
            <CompanyRow key={app.id} app={app} onUpdate={onUpdate} />
          ))
        )}
      </div>
    </section>
  );
}
