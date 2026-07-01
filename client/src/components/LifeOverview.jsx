import { LIFE_AREAS } from '../lifeDesign';

function GaugeBar({ area, value, onChange }) {
  return (
    <div className="hwpl-gauge">
      <div className="hwpl-gauge__header">
        <span className="hwpl-gauge__label" style={{ color: area.color }}>
          {area.label}
        </span>
        <span className="hwpl-gauge__value">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(area.id, Number(e.target.value))}
        className="hwpl-gauge__slider"
        style={{ '--gauge-color': area.color }}
        aria-label={`${area.label} fullness`}
      />
    </div>
  );
}

export default function LifeOverview({ data, onGaugeChange, onNoteChange, onNavigate }) {
  return (
    <section className="life-overview ui-stack">
      <header className="ui-section ui-section--header life-overview__intro">
        <h2>Life dashboard</h2>
        <p>
          Rate each area 0–100% full — where you are <em>now</em>, not where you wish you were.
          You define what &ldquo;full&rdquo; means.
        </p>
      </header>

      <div className="ui-block">
        <h3 className="ui-block__label">Health · Work · Play · Love</h3>
        <div className="hwpl-grid">
        {LIFE_AREAS.map((area) => (
          <div key={area.id} className="hwpl-card">
            <GaugeBar
              area={area}
              value={data.dashboard[area.id]}
              onChange={onGaugeChange}
            />
            <p className="hwpl-card__desc">{area.description}</p>
            <textarea
              className="hwpl-card__note"
              placeholder={`What's going on in ${area.label.toLowerCase()}?`}
              value={data.dashboardNotes[area.id]}
              onChange={(e) => onNoteChange(area.id, e.target.value)}
              rows={2}
            />
            <button type="button" className="hwpl-card__link" onClick={() => onNavigate(area.id)}>
              Open {area.label} →
            </button>
          </div>
        ))}
        </div>
      </div>

      <div className="ui-block life-overview__compass-teaser">
        <h3>Compass</h3>
        <p>
          Your Workview (career philosophy) and Lifeview (whole-life meaning) guide every area.
          Build them slowly — ~250 words each.
        </p>
        <div className="compass-preview">
          <div className="compass-preview__item">
            <span className="compass-preview__label">Workview</span>
            <span className="compass-preview__status">
              {data.workview.trim() ? `${data.workview.trim().split(/\s+/).length} words` : 'Not started'}
            </span>
          </div>
          <div className="compass-preview__item">
            <span className="compass-preview__label">Lifeview</span>
            <span className="compass-preview__status">
              {data.lifeview.trim() ? `${data.lifeview.trim().split(/\s+/).length} words` : 'Not started'}
            </span>
          </div>
        </div>
        <button type="button" className="hwpl-card__link" onClick={() => onNavigate('compass')}>
          Edit compass →
        </button>
      </div>
    </section>
  );
}
