import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_APPLICATION, STATUSES } from './constants.js';
import { analyzeCalendarEvents } from './calendarIntelligence.js';

const STATUS_RANK = Object.fromEntries(STATUSES.map((status, index) => [status, index]));

const STATUS_TO_STEP = {
  applied: 0,
  recruiter_screen: 1,
  phone_screen: 2,
  interview_scheduled: 3,
  interview_completed: 3,
  onsite: 3,
  offer: 4,
};

const CLOSED = new Set(['rejected', 'withdrawn']);

function shouldAdvanceStatus(current, next) {
  if (!STATUSES.includes(next)) return false;
  if (CLOSED.has(current)) return false;
  if (current === 'offer' && next !== 'offer') return false;
  return (STATUS_RANK[next] ?? -1) > (STATUS_RANK[current] ?? -1);
}

function eventIsoDate(event) {
  if (!event?.start) return null;
  const date = new Date(event.start);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mergePatch(app, event, decision) {
  const alreadyLinked = (app.googleEventIds || []).includes(event.id);
  const patch = {
    googleEventIds: alreadyLinked
      ? app.googleEventIds
      : [...new Set([...(app.googleEventIds || []), event.id])],
  };
  const changes = [];

  const iso = eventIsoDate(event);
  const upcoming = iso && new Date(iso) >= new Date(Date.now() - 12 * 60 * 60 * 1000);

  if (decision.useForDate && iso) {
    const dates = [...new Set([...(app.interviewDates || []), iso])];
    if (dates.length !== (app.interviewDates || []).length) {
      patch.interviewDates = dates;
      changes.push('interview date');
    }
  }

  if (decision.useForStatus && decision.inferredStatus && shouldAdvanceStatus(app.status, decision.inferredStatus)) {
    patch.status = decision.inferredStatus;
    const step = STATUS_TO_STEP[decision.inferredStatus];
    if (Number.isInteger(step)) {
      patch.processStepIndex = Math.min(
        step,
        (app.processSteps || DEFAULT_APPLICATION.processSteps).length - 1
      );
    }
    changes.push(`status → ${decision.inferredStatus}`);
  }

  if (decision.setNeedsPrep && (upcoming || decision.kind === 'prep_task')) {
    if (app.needsPrep !== true) {
      patch.needsPrep = true;
      patch.needsFollowUp = false;
      changes.push('needs prep');
    }
  }

  if (event.hangoutLink && !(app.notes || '').includes(event.hangoutLink)) {
    const noteLine = `Calendar: ${event.title} — ${event.hangoutLink}`;
    patch.notes = app.notes ? `${app.notes.trim()}\n${noteLine}` : noteLine;
    changes.push('meet link note');
  } else if (decision.kind === 'prep_task' && !(app.notes || '').includes(event.title)) {
    const noteLine = `Prep from calendar: ${event.title}`;
    patch.notes = app.notes ? `${app.notes.trim()}\n${noteLine}` : noteLine;
    changes.push('prep note');
  }

  if (!alreadyLinked && changes.length === 0) {
    changes.push('linked calendar event');
  }

  if (changes.length === 0 && alreadyLinked) return null;

  return {
    applicationId: app.id,
    company: app.company,
    eventId: event.id,
    eventTitle: event.title,
    changes,
    patch,
    created: false,
    kind: decision.kind,
  };
}

function buildCreateFromGroup(group, eventById) {
  const usable = (group.events || [])
    .filter((e) => e.relevant && e.kind !== 'prep_task' && e.kind !== 'unrelated' && e.kind !== 'cancelled')
    .map((e) => ({ decision: e, event: eventById.get(e.eventId) }))
    .filter((row) => row.event);

  if (!usable.length || !group.canonicalName) return null;

  // Prefer highest inferred status / latest start for initial card
  usable.sort((a, b) => {
    const rankA = STATUS_RANK[a.decision.inferredStatus] ?? -1;
    const rankB = STATUS_RANK[b.decision.inferredStatus] ?? -1;
    if (rankA !== rankB) return rankB - rankA;
    return String(b.event.start || '').localeCompare(String(a.event.start || ''));
  });

  const primary = usable[0];
  const inferred = primary.decision.inferredStatus || 'interview_scheduled';
  const dates = [...new Set(
    usable
      .filter((row) => row.decision.useForDate)
      .map((row) => eventIsoDate(row.event))
      .filter(Boolean)
  )];
  const eventIds = usable.map((row) => row.event.id);
  const now = new Date().toISOString();
  const upcoming = dates.some((d) => new Date(d) >= new Date(Date.now() - 12 * 60 * 60 * 1000));

  const application = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isExample: false,
    ...DEFAULT_APPLICATION,
    company: group.canonicalName,
    status: inferred,
    processStepIndex: STATUS_TO_STEP[inferred] ?? 0,
    interviewDates: dates,
    needsPrep: Boolean(upcoming || usable.some((row) => row.decision.setNeedsPrep)),
    googleEventIds: eventIds,
    notes: `Added from Google Calendar via intelligence layer: ${usable.map((r) => r.event.title).join('; ')}`,
  };

  return {
    applicationId: application.id,
    company: application.company,
    eventId: primary.event.id,
    eventTitle: primary.event.title,
    changes: [
      'created company',
      `status → ${inferred}`,
      `${usable.length} grouped event${usable.length === 1 ? '' : 's'}`,
      group.reason ? `intel: ${group.reason}` : 'intel approved',
    ],
    patch: null,
    created: true,
    application,
    groupedEventIds: eventIds,
  };
}

/**
 * Intelligence-first sync plan:
 * retrieve events → analyze (LLM/heuristic) → updates/creates/skips.
 */
export async function buildCalendarSyncPlan(events, applications) {
  const intelligence = await analyzeCalendarEvents(events, applications);
  const eventById = new Map((events || []).map((e) => [e.id, e]));
  const cleanup = intelligence.cleanup || [];

  // Resolve renames/merges/deletes before attaching events
  const cleaned = applyCleanup(applications, cleanup);
  const apps = cleaned.applications.filter((app) => !app.isExample);

  const updates = [];
  const creates = [];
  const skipped = [...(intelligence.skippedEvents || [])];
  const groups = [];

  for (const group of intelligence.companies || []) {
    groups.push({
      company: group.canonicalName,
      action: group.action,
      eventCount: group.events?.length || 0,
      reason: group.reason,
    });

    if (group.action === 'ignore') {
      for (const ev of group.events || []) {
        const event = eventById.get(ev.eventId);
        skipped.push({
          eventId: ev.eventId,
          eventTitle: event?.title || '',
          reason: group.reason || ev.reason || 'Ignored by intelligence layer',
        });
      }
      continue;
    }

    if (group.action === 'create_new') {
      const create = buildCreateFromGroup(group, eventById);
      if (create) {
        creates.push(create);
        for (const ev of group.events || []) {
          if (!create.groupedEventIds.includes(ev.eventId)) {
            const event = eventById.get(ev.eventId);
            skipped.push({
              eventId: ev.eventId,
              eventTitle: event?.title || '',
              reason: ev.reason || 'Not used for new company create',
            });
          }
        }
      } else {
        for (const ev of group.events || []) {
          const event = eventById.get(ev.eventId);
          skipped.push({
            eventId: ev.eventId,
            eventTitle: event?.title || '',
            reason: 'Could not create company from grouped events',
          });
        }
      }
      continue;
    }

    // update_existing — fuzzy match messy prior names
    const app = apps.find((a) => a.id === group.existingApplicationId)
      || apps.find((a) => a.company?.toLowerCase() === group.canonicalName?.toLowerCase())
      || apps.find((a) => (a.company || '').toLowerCase().includes((group.canonicalName || '').toLowerCase()))
      || apps.find((a) => (group.canonicalName || '').toLowerCase().includes((a.company || '').toLowerCase()));

    if (!app) {
      const create = buildCreateFromGroup(group, eventById);
      if (create) creates.push(create);
      else {
        for (const ev of group.events || []) {
          const event = eventById.get(ev.eventId);
          skipped.push({
            eventId: ev.eventId,
            eventTitle: event?.title || '',
            reason: 'Existing company not found',
          });
        }
      }
      continue;
    }

    // Also rename to canonical while updating if name is messy
    if (group.canonicalName && app.company !== group.canonicalName) {
      updates.push({
        applicationId: app.id,
        company: group.canonicalName,
        eventId: `rename:${app.id}`,
        eventTitle: app.company,
        changes: [`renamed → ${group.canonicalName}`],
        patch: { company: group.canonicalName },
        created: false,
        kind: 'rename',
      });
      app.company = group.canonicalName;
    }

    const ordered = [...(group.events || [])].sort((a, b) => {
      const rankA = STATUS_RANK[a.inferredStatus] ?? -1;
      const rankB = STATUS_RANK[b.inferredStatus] ?? -1;
      return rankB - rankA;
    });

    let working = { ...app };
    for (const decision of ordered) {
      if (!decision.relevant || decision.kind === 'unrelated' || decision.kind === 'cancelled') {
        const event = eventById.get(decision.eventId);
        skipped.push({
          eventId: decision.eventId,
          eventTitle: event?.title || '',
          reason: decision.reason || `Skipped (${decision.kind})`,
        });
        continue;
      }

      const event = eventById.get(decision.eventId);
      if (!event) continue;

      const update = mergePatch(working, event, decision);
      if (update) {
        working = { ...working, ...update.patch };
        updates.push(update);
      } else {
        skipped.push({
          eventId: decision.eventId,
          eventTitle: event.title,
          reason: 'Already up to date',
        });
      }
    }
  }

  return {
    updates,
    creates,
    skipped,
    groups,
    cleanup,
    intelligenceMode: intelligence.mode,
  };
}

function applyCleanup(applications, cleanup = []) {
  const byId = new Map((applications || []).map((app) => [app.id, { ...app }]));
  const appliedCleanup = [];

  for (const item of cleanup) {
    if (item.action === 'rename') {
      const app = byId.get(item.applicationId);
      if (!app || app.isExample) continue;
      const prev = app.company;
      byId.set(item.applicationId, {
        ...app,
        company: item.canonicalName,
        updatedAt: new Date().toISOString(),
      });
      appliedCleanup.push({
        ...item,
        changes: [`renamed ${prev} → ${item.canonicalName}`],
      });
    } else if (item.action === 'merge') {
      const from = byId.get(item.fromApplicationId);
      const into = byId.get(item.intoApplicationId);
      if (!from || !into || from.isExample || into.isExample) continue;

      const higherStatus =
        (STATUS_RANK[from.status] ?? -1) > (STATUS_RANK[into.status] ?? -1)
          ? from.status
          : into.status;

      byId.set(item.intoApplicationId, {
        ...into,
        status: higherStatus,
        processStepIndex: Math.max(into.processStepIndex || 0, from.processStepIndex || 0),
        interviewDates: [...new Set([...(into.interviewDates || []), ...(from.interviewDates || [])])],
        googleEventIds: [...new Set([...(into.googleEventIds || []), ...(from.googleEventIds || [])])],
        needsPrep: Boolean(into.needsPrep || from.needsPrep),
        notes: [into.notes, from.notes].filter(Boolean).join('\n').trim(),
        updatedAt: new Date().toISOString(),
      });
      byId.delete(item.fromApplicationId);
      appliedCleanup.push({
        ...item,
        changes: [`merged ${from.company} → ${into.company}`],
      });
    } else if (item.action === 'delete') {
      const app = byId.get(item.applicationId);
      if (!app || app.isExample) continue;
      byId.delete(item.applicationId);
      appliedCleanup.push({
        ...item,
        changes: [`deleted ${app.company}`],
      });
    }
  }

  return {
    applications: [...byId.values()],
    appliedCleanup,
  };
}

export function applyCalendarSyncPlan(applications, plan) {
  const cleaned = applyCleanup(applications, plan.cleanup || []);
  const byId = new Map(cleaned.applications.map((app) => [app.id, { ...app }]));
  const applied = [];

  for (const item of cleaned.appliedCleanup) {
    applied.push({
      applicationId: item.applicationId || item.intoApplicationId || item.fromApplicationId,
      company: item.canonicalName || item.action,
      eventId: `cleanup:${item.action}:${item.applicationId || item.fromApplicationId}`,
      eventTitle: item.reason || item.action,
      changes: item.changes || [item.action],
      created: false,
      kind: 'cleanup',
    });
  }

  for (const update of plan.updates || []) {
    const current = byId.get(update.applicationId);
    if (!current || current.isExample) continue;
    byId.set(update.applicationId, {
      ...current,
      ...update.patch,
      isExample: false,
      updatedAt: new Date().toISOString(),
    });
    applied.push(update);
  }

  for (const create of plan.creates || []) {
    if (!create.application) continue;
    byId.set(create.application.id, create.application);
    applied.push(create);
  }

  const next = [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return {
    applications: next,
    applied,
    skipped: plan.skipped || [],
    groups: plan.groups || [],
    cleanup: plan.cleanup || [],
    intelligenceMode: plan.intelligenceMode || 'heuristic',
  };
}
