import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const INTERVIEW_TYPES = new Set(['behavioral', 'product', 'recruiter', 'mixed']);
const PERSONAS = new Set(['friendly', 'tough', 'bar-raiser']);

const FOLLOW_UPS = [
  'Can you be more specific about the metrics or outcome?',
  'What would you do differently if you ran that again?',
  'Who disagreed with you, and how did you handle it?',
  'Walk me through the trade-offs you considered.',
];

function truncate(text, max = 600) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function asList(value, limit = 4) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, limit);
}

function defaultTypeForStatus(status) {
  if (status === 'recruiter_screen') return 'recruiter';
  if (status === 'phone_screen' || status === 'interview_scheduled') return 'mixed';
  if (status === 'onsite' || status === 'interview_completed') return 'product';
  return 'mixed';
}

export function normalizeConfig(config = {}, applicationContext = {}) {
  const type = INTERVIEW_TYPES.has(config.type)
    ? config.type
    : defaultTypeForStatus(applicationContext.status);
  const maxTurns = [5, 10, 15].includes(Number(config.maxTurns))
    ? Number(config.maxTurns)
    : 5;
  const persona = PERSONAS.has(config.persona) ? config.persona : 'friendly';
  return { type, maxTurns, persona };
}

export function buildContextPack(applicationContext = {}, profileSnapshot = {}) {
  const company = applicationContext.company || 'the company';
  const role = applicationContext.role || applicationContext.positionTitle || 'the role';
  return {
    company,
    role,
    status: applicationContext.status || '',
    stageLabel: applicationContext.stageLabel || '',
    recruiter: applicationContext.recruiter || '',
    hiringManager: applicationContext.hiringManager || '',
    jobDescription: truncate(applicationContext.jobDescription || '', 900),
    researchSummary: truncate(applicationContext.researchSummary || '', 400),
    gaps: asList(applicationContext.gaps, 4),
    matches: asList(applicationContext.matches, 4),
    starStories: asList(applicationContext.starStories, 4),
    likelyQuestions: asList(applicationContext.likelyQuestions, 8),
    studyTopics: asList(applicationContext.studyTopics, 4),
    pathTitle: applicationContext.pathTitle || profileSnapshot.pathTitle || 'target path',
    resumeEvidence: asList(applicationContext.resumeEvidence || profileSnapshot.resumeEvidence, 4),
    checklistGaps: asList(applicationContext.checklistGaps, 6),
    interviewAt: applicationContext.interviewAt || null,
  };
}

function personaLine(persona) {
  if (persona === 'tough') return 'Be direct and skeptical; push for evidence.';
  if (persona === 'bar-raiser') return 'Probe for depth, clarity, and high bar judgment.';
  return 'Be warm but professional; keep the candidate at ease while still evaluating.';
}

function typeLine(type) {
  if (type === 'behavioral') return 'Focus on behavioral / STARR stories.';
  if (type === 'product') return 'Focus on product sense, prioritization, and metrics.';
  if (type === 'recruiter') return 'Focus on motivation, resume walkthrough, and logistics.';
  return 'Mix recruiter, behavioral, and light product questions.';
}

function countCandidateAnswers(messages = []) {
  return messages.filter((m) => m.role === 'candidate').length;
}

function lastInterviewerQuestion(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'interviewer') return messages[i].content;
  }
  return '';
}

function heuristicQuestionBank(ctx, type) {
  const bank = [...(ctx.likelyQuestions || [])];
  const company = ctx.company;
  const role = ctx.role;
  const path = ctx.pathTitle;

  const extras = {
    recruiter: [
      `Walk me through your background and why you're interested in ${company}.`,
      `Why this ${role} role, and why now?`,
      `What are you looking for in your next team?`,
    ],
    behavioral: [
      `Tell me about a time you influenced without authority — angle it toward ${path}.`,
      ctx.gaps[0]
        ? `Tell me about a time you closed a gap around: ${ctx.gaps[0]}.`
        : 'Tell me about a failure and what you changed afterward.',
      ctx.starStories[0]
        ? `Expand on this story: ${ctx.starStories[0]}`
        : `Share a STARR story that shows ownership for ${role}.`,
    ],
    product: [
      `How would you measure success in the first 90 days as ${role} at ${company}?`,
      ctx.jobDescription
        ? `Looking at this role's focus, how would you prioritize the first two quarters?`
        : `Pick a ${company}-like product and walk me through improving activation.`,
      'Walk me through a product decision where the data was incomplete.',
    ],
    mixed: [
      `Why ${company}, and why ${path}?`,
      `Walk me through a product you owned end to end.`,
      `How would you approach the first 90 days in ${role}?`,
    ],
  };

  for (const q of extras[type] || extras.mixed) {
    if (!bank.includes(q)) bank.push(q);
  }
  return bank.length ? bank : extras.mixed;
}

function heuristicFeedback(answer, question, ctx) {
  const length = String(answer || '').trim().length;
  const hasNumber = /\d/.test(answer || '');
  const mentionsCompany = new RegExp(ctx.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(answer || '');
  const notes = [];
  if (length < 80) notes.push('Answer was short — add situation, action, and a concrete result.');
  else notes.push('Good length; keep a clear Situation → Action → Result arc.');
  if (!hasNumber) notes.push('Add a metric or measurable outcome if you have one.');
  if (!mentionsCompany) notes.push(`Tie the ending back to ${ctx.company} or this role.`);
  else notes.push(`Nice company/role connection to ${ctx.company}.`);
  if (ctx.gaps[0]) notes.push(`Optional drill: prepare a sharper example for “${ctx.gaps[0]}”.`);
  return {
    questionId: uuidv4(),
    question: question || '',
    notes: notes.slice(0, 4).join(' '),
    scoreHints: {
      structure: length >= 120 ? 'solid' : 'needs_work',
      specificity: hasNumber ? 'solid' : 'needs_work',
      companyFit: mentionsCompany ? 'solid' : 'needs_work',
    },
  };
}

function makeMessage(role, content) {
  return {
    id: uuidv4(),
    role,
    content: String(content || '').trim(),
    at: new Date().toISOString(),
  };
}

export function heuristicTurn({ applicationContext, profileSnapshot, session, userMessage }) {
  const ctx = buildContextPack(applicationContext, profileSnapshot);
  const config = normalizeConfig(session?.config, applicationContext);
  const messages = Array.isArray(session?.messages) ? [...session.messages] : [];
  const feedback = Array.isArray(session?.feedback) ? [...session.feedback] : [];
  const bank = heuristicQuestionBank(ctx, config.type);
  const answersSoFar = countCandidateAnswers(messages);
  const followUpsUsed = Number(session?.followUpsUsed || 0);
  const questionIndex = Number(session?.questionIndex || 0);

  // Start: no candidate messages yet and no user message
  if (!userMessage?.trim() && answersSoFar === 0 && messages.length === 0) {
    const opener = makeMessage(
      'interviewer',
      `Thanks for joining — I'll run a short ${config.type} practice for the ${ctx.role} role at ${ctx.company}. Let's begin.`
    );
    const firstQ = makeMessage('interviewer', bank[0] || `Why ${ctx.company}?`);
    return {
      assistantMessages: [opener, firstQ],
      sessionPatch: {
        status: 'active',
        config,
        messages: [opener, firstQ],
        feedback: [],
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      },
      feedback: null,
      done: false,
      mode: 'heuristic',
    };
  }

  const answer = String(userMessage || '').trim();
  const candidateMsg = makeMessage('candidate', answer);
  messages.push(candidateMsg);

  const lastQ = lastInterviewerQuestion(messages);
  const nextFeedback = heuristicFeedback(answer, lastQ, ctx);
  feedback.push(nextFeedback);

  const shouldFollowUp = followUpsUsed < 1 && answer.length < 180;
  if (shouldFollowUp) {
    const follow = makeMessage(
      'interviewer',
      FOLLOW_UPS[answersSoFar % FOLLOW_UPS.length]
    );
    messages.push(follow);
    return {
      assistantMessages: [follow],
      sessionPatch: {
        status: 'active',
        config,
        messages,
        feedback,
        questionIndex,
        followUpsUsed: followUpsUsed + 1,
        summary: null,
      },
      feedback: nextFeedback,
      done: false,
      mode: 'heuristic',
    };
  }

  const nextIndex = questionIndex + 1;
  const reachedMax = nextIndex >= config.maxTurns;

  if (reachedMax) {
    const drill = feedback
      .filter((f) => f.scoreHints?.specificity === 'needs_work' || f.scoreHints?.structure === 'needs_work')
      .map((f) => f.question)
      .filter(Boolean)
      .slice(0, 3);
    const summary = [
      `Completed ${config.maxTurns} practice turns for ${ctx.company} (${ctx.role}).`,
      drill.length
        ? `Drill again: ${drill.join(' · ')}`
        : 'Strong pass — rehearse your top two stories once more before the real round.',
    ].join(' ');
    const closer = makeMessage('interviewer', summary);
    messages.push(closer);
    return {
      assistantMessages: [closer],
      sessionPatch: {
        status: 'completed',
        config,
        messages,
        feedback,
        questionIndex: nextIndex,
        followUpsUsed: 0,
        summary,
      },
      feedback: nextFeedback,
      done: true,
      mode: 'heuristic',
      drillQuestions: drill,
    };
  }

  const nextQ = makeMessage('interviewer', bank[nextIndex % bank.length]);
  const bridge = makeMessage(
    'interviewer',
    `Thanks — noted. ${nextFeedback.notes.split('.')[0]}. Next question:`
  );
  messages.push(bridge, nextQ);
  return {
    assistantMessages: [bridge, nextQ],
    sessionPatch: {
      status: 'active',
      config,
      messages,
      feedback,
      questionIndex: nextIndex,
      followUpsUsed: 0,
      summary: null,
    },
    feedback: nextFeedback,
    done: false,
    mode: 'heuristic',
  };
}

async function llmTurn({ applicationContext, profileSnapshot, session, userMessage }) {
  const ctx = buildContextPack(applicationContext, profileSnapshot);
  const config = normalizeConfig(session?.config, applicationContext);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You are a realistic job interviewer running a practice mock interview in text chat.
${personaLine(config.persona)}
${typeLine(config.type)}

Rules:
- Stay in character as the interviewer for ${ctx.company} (${ctx.role}).
- Ask ONE question at a time. You may ask at most one short follow-up before moving on.
- Ground questions in the provided context (JD, gaps, stories, evidence). Do not invent employers or metrics for the candidate.
- After a candidate answer, include brief feedback (2-4 short bullets in the feedback field).
- When the session should end (maxTurns primary questions reached), set done=true and write a short summary plus drillAgain questions.
- Return ONLY valid JSON with this shape:
{
  "assistantMessages": ["string", "..."],
  "feedback": { "notes": "string", "scoreHints": { "structure": "solid|needs_work", "specificity": "solid|needs_work", "companyFit": "solid|needs_work" } } | null,
  "done": boolean,
  "summary": "string or null",
  "drillAgain": ["questions"],
  "questionIndex": number,
  "followUpsUsed": number
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: JSON.stringify({
          context: ctx,
          config,
          sessionState: {
            questionIndex: session?.questionIndex || 0,
            followUpsUsed: session?.followUpsUsed || 0,
            answersSoFar: countCandidateAnswers(session?.messages || []),
            status: session?.status || 'active',
          },
          transcript: (session?.messages || []).slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: userMessage || null,
          isStart: !userMessage && !(session?.messages || []).length,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return heuristicTurn({ applicationContext, profileSnapshot, session, userMessage });
  }

  const assistantTexts = Array.isArray(parsed.assistantMessages)
    ? parsed.assistantMessages.map((t) => String(t || '').trim()).filter(Boolean)
    : [];
  if (!assistantTexts.length) {
    return heuristicTurn({ applicationContext, profileSnapshot, session, userMessage });
  }

  const messages = Array.isArray(session?.messages) ? [...session.messages] : [];
  const feedback = Array.isArray(session?.feedback) ? [...session.feedback] : [];
  if (userMessage?.trim()) {
    messages.push(makeMessage('candidate', userMessage.trim()));
  }
  const assistantMessages = assistantTexts.map((content) => makeMessage('interviewer', content));
  messages.push(...assistantMessages);

  let nextFeedback = null;
  if (parsed.feedback?.notes) {
    nextFeedback = {
      questionId: uuidv4(),
      question: lastInterviewerQuestion(session?.messages || []),
      notes: String(parsed.feedback.notes),
      scoreHints: parsed.feedback.scoreHints || {},
    };
    feedback.push(nextFeedback);
  }

  const done = Boolean(parsed.done);
  const summary = parsed.summary ? String(parsed.summary) : null;
  const drillQuestions = asList(parsed.drillAgain, 5);

  return {
    assistantMessages,
    sessionPatch: {
      status: done ? 'completed' : 'active',
      config,
      messages,
      feedback,
      questionIndex: Number.isInteger(parsed.questionIndex)
        ? parsed.questionIndex
        : (session?.questionIndex || 0) + (userMessage ? 1 : 0),
      followUpsUsed: Number(parsed.followUpsUsed || 0),
      summary,
    },
    feedback: nextFeedback,
    done,
    mode: 'openai',
    drillQuestions,
  };
}

export async function runMockInterviewTurn(payload) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await llmTurn(payload);
    } catch (error) {
      console.error('Mock interview LLM failed, falling back:', error.message);
    }
  }
  return heuristicTurn(payload);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, n) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

export function heuristicStudyPlan({ applicationContext, checklistGaps = [], interviewAt = null }) {
  const ctx = buildContextPack(applicationContext, {});
  const gaps = asList(checklistGaps.length ? checklistGaps : ctx.checklistGaps, 8);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const interviewDate = interviewAt ? new Date(interviewAt) : null;
  const hasInterview = interviewDate && !Number.isNaN(interviewDate.getTime());
  const daysUntil = hasInterview
    ? Math.max(0, Math.ceil((interviewDate - now) / (1000 * 60 * 60 * 24)))
    : 3;

  const dayCount = Math.min(5, Math.max(2, daysUntil + 1));
  const kindsFromGaps = gaps.map((label) => {
    const lower = label.toLowerCase();
    if (lower.includes('research')) return { kind: 'research', label };
    if (lower.includes('star') || lower.includes('stor')) return { kind: 'stories', label };
    if (lower.includes('question') || lower.includes('practice')) return { kind: 'mock', label };
    if (lower.includes('fit') || lower.includes('gap')) return { kind: 'fit', label };
    return { kind: 'concepts', label };
  });

  const defaults = [
    { kind: 'research', label: `Research ${ctx.company} product and market` },
    { kind: 'stories', label: 'Polish 2 STARR stories for this loop' },
    { kind: 'mock', label: 'Run a 15-minute mock interview' },
    { kind: 'fit', label: ctx.gaps[0] ? `Prep answer for gap: ${ctx.gaps[0]}` : 'Map role fit evidence' },
    { kind: 'concepts', label: ctx.studyTopics[0] || `Review concepts for ${ctx.pathTitle}` },
    { kind: 'ask', label: 'Finalize questions to ask the interviewer' },
  ];

  const pool = [...kindsFromGaps];
  for (const item of defaults) {
    if (!pool.some((p) => p.label === item.label)) pool.push(item);
  }

  const days = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = addDays(now, i);
    const isInterviewDay = hasInterview && dateKey(date) === dateKey(interviewDate);
    const labelPrefix = i === 0 ? 'Today' : isInterviewDay ? 'Interview day' : null;
    const items = [];
    if (isInterviewDay) {
      items.push(
        { id: uuidv4(), kind: 'warmup', label: 'Light warm-up: one story out loud', done: false },
        { id: uuidv4(), kind: 'ask', label: 'Review questions to ask', done: false },
        { id: uuidv4(), kind: 'logistics', label: 'Confirm logistics and environment', done: false },
      );
    } else {
      const slice = pool.splice(0, 2);
      if (!slice.length) {
        slice.push({ kind: 'mock', label: 'Short mock drill (2 questions)' });
      }
      for (const item of slice) {
        items.push({ id: uuidv4(), kind: item.kind, label: item.label, done: false });
      }
    }
    days.push({
      date: dateKey(date),
      label: labelPrefix,
      items,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    interviewAt: hasInterview ? interviewDate.toISOString() : null,
    company: ctx.company,
    role: ctx.role,
    days,
  };
}

async function llmStudyPlan(payload) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ctx = buildContextPack(payload.applicationContext || {}, {});
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You create a short interview study plan. Return ONLY JSON:
{
  "days": [
    { "date": "YYYY-MM-DD", "label": "Today|Tomorrow|Interview day|null", "items": [{ "kind": "research|stories|mock|fit|concepts|ask|warmup|logistics", "label": "string" }] }
  ]
}
Rules: 2-5 days, 2-3 items per day, concrete and grounded in context. Interview day should be lighter.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          context: ctx,
          checklistGaps: payload.checklistGaps || [],
          interviewAt: payload.interviewAt || null,
          today: dateKey(new Date()),
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return heuristicStudyPlan(payload);
  }

  if (!Array.isArray(parsed.days) || !parsed.days.length) {
    return heuristicStudyPlan(payload);
  }

  return {
    generatedAt: new Date().toISOString(),
    interviewAt: payload.interviewAt || null,
    company: ctx.company,
    role: ctx.role,
    days: parsed.days.slice(0, 5).map((day) => ({
      date: day.date || dateKey(new Date()),
      label: day.label || null,
      items: (day.items || []).slice(0, 4).map((item) => ({
        id: uuidv4(),
        kind: item.kind || 'concepts',
        label: String(item.label || 'Prep block').trim(),
        done: false,
      })),
    })),
  };
}

export async function generateStudyPlan(payload) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await llmStudyPlan(payload);
    } catch (error) {
      console.error('Study plan LLM failed, falling back:', error.message);
    }
  }
  return heuristicStudyPlan(payload);
}
