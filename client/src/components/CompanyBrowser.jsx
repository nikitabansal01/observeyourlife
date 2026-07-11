import { Fragment, useMemo, useState, useRef, useEffect } from 'react';
import { Search, X, Plus, Tag } from 'lucide-react';
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  BUSINESS_MODELS,
  BUSINESS_MODEL_LABELS,
  FUNDING_STAGES,
  FUNDING_STAGE_LABELS,
  FINANCE_STANDINGS,
  FINANCE_STANDING_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  relativeTime,
} from '../constants';
import { filterCompanies } from '../utils/companyFilters';

const EMPTY_FILTERS = {
  industry: '',
  businessModel: '',
  fundingStage: '',
  financeStanding: '',
  search: '',
};

const GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'industry', label: 'Industry' },
  { value: 'businessModel', label: 'Model' },
  { value: 'status', label: 'Status' },
];

const COLUMN_COUNT = 8;

function byRecency(a, b) {
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

function getGroupKey(app, groupBy) {
  return app[groupBy] || '';
}

function getGroupLabel(key, groupBy) {
  if (!key) return 'Not set';
  if (groupBy === 'industry') return INDUSTRY_LABELS[key] || key;
  if (groupBy === 'businessModel') return BUSINESS_MODEL_LABELS[key] || key;
  if (groupBy === 'status') return STATUS_LABELS[key] || key;
  return key;
}

function buildGroups(apps, groupBy) {
  const sorted = [...apps].sort(byRecency);

  if (!groupBy) {
    return [{ key: null, label: null, items: sorted }];
  }

  const map = new Map();
  for (const app of sorted) {
    const key = getGroupKey(app, groupBy);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(app);
  }

  return [...map.entries()]
    .map(([key, items]) => ({
      key,
      label: getGroupLabel(key, groupBy),
      items,
      latest: Math.max(...items.map((a) => new Date(a.updatedAt).getTime())),
    }))
    .sort((a, b) => b.latest - a.latest);
}

function FilterSelect({ label, value, onChange, options, labels }) {
  return (
    <label className={`company-filter ${value ? 'company-filter--active' : ''}`}>
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

function QuietSelect({ value, onChange, options, labels, emptyLabel = '—', ariaLabel, className = '' }) {
  const empty = !value;
  return (
    <select
      className={`company-table__input ${empty ? 'company-table__input--empty' : ''} ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      <option value="">{emptyLabel}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels[opt] || opt}
        </option>
      ))}
    </select>
  );
}

function LabelsCell({ app, labels, onToggle }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedIds = app.labelIds || [];
  const attached = labels.filter((label) => selectedIds.includes(label.id));

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (labels.length === 0) {
    return <span className="company-table__labels-empty">—</span>;
  }

  return (
    <div className="company-table__labels" ref={rootRef}>
      <div className="company-table__labels-row">
        {attached.length === 0 ? (
          <span className="company-table__labels-empty">None</span>
        ) : (
          attached.map((label) => (
            <span key={label.id} className="company-table__label-chip company-table__label-chip--on">
              {label.name}
            </span>
          ))
        )}
        <button
          type="button"
          className={`company-table__labels-edit ${open ? 'company-table__labels-edit--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Edit labels for ${app.company || 'company'}`}
          title="Edit labels"
        >
          {attached.length === 0 ? <Plus size={12} /> : <Tag size={12} />}
        </button>
      </div>

      {open && (
        <div className="company-table__labels-menu" role="group" aria-label={`Toggle labels for ${app.company}`}>
          {labels.map((label) => {
            const on = selectedIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                className={`company-table__labels-option ${on ? 'company-table__labels-option--on' : ''}`}
                aria-pressed={on}
                onClick={() => onToggle(label.id)}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompanyTableRow({ app, labels, onUpdate, hideColumn }) {
  const statusColor = STATUS_COLORS[app.status] || '#6B7280';
  const selectedIds = app.labelIds || [];

  const handleChange = (field, value) => {
    const payload = { [field]: value };
    if (field === 'lastFundingAmount') {
      payload.lastFundingAmount = value === '' ? null : Number(value);
    }
    onUpdate(app.id, payload);
  };

  const toggleLabel = (labelId) => {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    onUpdate(app.id, { labelIds: next });
  };

  return (
    <tr className="company-table__row">
      <th scope="row" className="company-table__company">
        <span className="company-table__company-name">
          {app.company || 'Unknown'}
          {app.isExample && <span className="example-badge example-badge--table">Example</span>}
        </span>
        <span className="company-table__updated">{relativeTime(app.updatedAt)}</span>
      </th>
      <td className="company-table__cell company-table__cell--muted company-table__cell--role">
        {app.positionTitle || '—'}
      </td>
      <td className="company-table__cell">
        <LabelsCell app={app} labels={labels} onToggle={toggleLabel} />
      </td>
      {!hideColumn?.status && (
        <td className="company-table__cell">
          <select
            className="company-table__input company-table__input--status"
            value={app.status || 'applied'}
            onChange={(e) => handleChange('status', e.target.value)}
            aria-label={`Status for ${app.company}`}
            style={{ '--status-color': statusColor }}
          >
            {Object.keys(STATUS_LABELS).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </td>
      )}
      {!hideColumn?.industry && (
        <td className="company-table__cell">
          <QuietSelect
            value={app.industry}
            onChange={(v) => handleChange('industry', v)}
            options={INDUSTRIES}
            labels={INDUSTRY_LABELS}
            ariaLabel={`Industry for ${app.company}`}
          />
        </td>
      )}
      {!hideColumn?.businessModel && (
        <td className="company-table__cell">
          <QuietSelect
            value={app.businessModel}
            onChange={(v) => handleChange('businessModel', v)}
            options={BUSINESS_MODELS}
            labels={BUSINESS_MODEL_LABELS}
            ariaLabel={`Business model for ${app.company}`}
          />
        </td>
      )}
      <td className="company-table__cell">
        <QuietSelect
          value={app.fundingStage}
          onChange={(v) => handleChange('fundingStage', v)}
          options={FUNDING_STAGES}
          labels={FUNDING_STAGE_LABELS}
          ariaLabel={`Funding stage for ${app.company}`}
        />
      </td>
      <td className="company-table__cell company-table__cell--amount">
        <input
          className={`company-table__input company-table__input--number ${app.lastFundingAmount == null || app.lastFundingAmount === '' ? 'company-table__input--empty' : ''}`}
          type="number"
          min="0"
          step="0.1"
          placeholder="—"
          value={app.lastFundingAmount ?? ''}
          onChange={(e) => handleChange('lastFundingAmount', e.target.value)}
          aria-label={`Funding amount ($M) for ${app.company}`}
        />
      </td>
    </tr>
  );
}

export default function CompanyBrowser({ applications, labels = [], onUpdate }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState('');

  const filtered = useMemo(
    () => filterCompanies(applications, filters),
    [applications, filters]
  );

  const groups = useMemo(() => buildGroups(filtered, groupBy), [filtered, groupBy]);

  const hideColumn = groupBy ? { [groupBy]: true } : {};
  const visibleColumns = COLUMN_COUNT - (groupBy ? 1 : 0);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section className="company-browser company-browser--quiet">
      <div className="company-browser__toolbar">
        <div className="company-search">
          <Search size={15} />
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
          label="Model"
          value={filters.businessModel}
          onChange={(v) => setFilters((f) => ({ ...f, businessModel: v }))}
          options={BUSINESS_MODELS}
          labels={BUSINESS_MODEL_LABELS}
        />
        <FilterSelect
          label="Stage"
          value={filters.fundingStage}
          onChange={(v) => setFilters((f) => ({ ...f, fundingStage: v }))}
          options={FUNDING_STAGES}
          labels={FUNDING_STAGE_LABELS}
        />
        <FilterSelect
          label="Finance"
          value={filters.financeStanding}
          onChange={(v) => setFilters((f) => ({ ...f, financeStanding: v }))}
          options={FINANCE_STANDINGS}
          labels={FINANCE_STANDING_LABELS}
        />

        <label className={`company-filter ${groupBy ? 'company-filter--active' : ''}`}>
          <span className="company-filter__label">Group</span>
          <select
            className="company-filter__select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            aria-label="Group companies by"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

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

        <p className="company-browser__count">
          {filtered.length}/{applications.length}
        </p>
      </div>

      <div className="company-table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No companies match your filters.</p>
            <p>Try adjusting filters or add companies via voice dump.</p>
          </div>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th className="company-table__th company-table__th--company">Company</th>
                <th className="company-table__th">Role</th>
                <th className="company-table__th">Labels</th>
                {!hideColumn.status && <th className="company-table__th">Status</th>}
                {!hideColumn.industry && <th className="company-table__th">Industry</th>}
                {!hideColumn.businessModel && <th className="company-table__th">Model</th>}
                <th className="company-table__th">Stage</th>
                <th className="company-table__th">$M</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.key ?? 'all'}>
                  {group.label && (
                    <tr className="company-table__group-row">
                      <td colSpan={visibleColumns}>
                        <span className="company-table__group-label">{group.label}</span>
                        <span className="company-table__group-count">
                          {group.items.length}
                        </span>
                      </td>
                    </tr>
                  )}
                  {group.items.map((app) => (
                    <CompanyTableRow
                      key={app.id}
                      app={app}
                      labels={labels}
                      onUpdate={onUpdate}
                      hideColumn={hideColumn}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
