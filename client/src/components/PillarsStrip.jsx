const PILLARS = [
  {
    id: 'decide',
    label: 'Decide where to go',
    hint: 'Career Direction',
    navIds: ['direction'],
  },
{
  id: 'track',
  label: 'Track opportunities',
  hint: 'Today & Opportunities',
  navIds: ['opportunities', 'today'],
},
  {
    id: 'prepare',
    label: 'Prepare to succeed',
    hint: 'Interview Prep & Learning',
    navIds: ['interview', 'learning'],
  },
];

export function getPillarForNav(navId) {
  return PILLARS.find((pillar) => pillar.navIds.includes(navId)) || null;
}

export default function PillarsStrip({ activeNav, onNavigate }) {
  return (
    <section className="pillars-strip" aria-label="Career OS pillars">
      {PILLARS.map((pillar) => {
        const active = pillar.navIds.includes(activeNav);
        const target = pillar.navIds[0];
        return (
          <button
            key={pillar.id}
            type="button"
            className={`pillars-strip__item${active ? ' pillars-strip__item--active' : ''}`}
            onClick={() => onNavigate?.(target)}
            aria-current={active ? 'true' : undefined}
          >
            <span className="pillars-strip__label">{pillar.label}</span>
          </button>
        );
      })}
    </section>
  );
}

export { PILLARS };
