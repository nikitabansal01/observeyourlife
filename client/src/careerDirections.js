/**
 * Career direction catalog + ranking.
 * Tracks: Product Manager, Software Engineer, Data Scientist.
 * Categories: emerging (AI evolution), core, leadership, research.
 */

export const TRACKS = {
  pm: { id: 'pm', label: 'Product Manager' },
  eng: { id: 'eng', label: 'Software Engineer' },
  ds: { id: 'ds', label: 'Data Scientist' },
};

/** Full catalog used to recommend top-3 routes from resume + reflection. */
export const CAREER_DIRECTIONS = [
  // —— Product Manager · AI & Emerging ——
  {
    id: 'pm-ai',
    track: 'pm',
    category: 'emerging',
    title: 'AI Product Manager',
    focusAreas: ['LLM applications', 'AI copilots', 'Agentic workflows', 'AI-native products'],
    keywords: ['ai', 'llm', 'ml', 'copilot', 'agent', 'genai', 'model', 'openai'],
    prefer: { ai: 2, surface: 'either', audience: 'either', stage: 'either', technical: 1 },
    exciting: 'Shipping model-powered experiences users feel day to day.',
    tradeoffs: 'Ambiguous roadmaps; eval quality often moves slower than demos.',
    roles: ['AI Product Manager', 'GenAI PM', 'AI Features PM'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: '0→1 + early scale',
      technicalDepth: 'Medium-high',
      gtmExposure: 'Medium',
      domainSpecialization: 'AI product',
    },
  },
  {
    id: 'pm-fdp',
    track: 'pm',
    category: 'emerging',
    title: 'Forward Deployed Product Manager',
    focusAreas: ['Customer-facing delivery', 'Solution shaping', 'Pilot → production', 'Field feedback loops'],
    keywords: ['forward deployed', 'customer', 'customer', 'implementation', 'customer success', 'solutions', 'deployed'],
    prefer: { ai: 1, surface: 'user', audience: 'b2b', stage: '0to1', technical: 1 },
    exciting: 'Sitting with customers and turning messy workflows into shipped product.',
    tradeoffs: 'Travel/context-switching; success depends on both product and delivery.',
    roles: ['Forward Deployed PM', 'Deployment PM', 'Solutions PM'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2B',
      stage: '0→1 with customers',
      technicalDepth: 'Medium',
      gtmExposure: 'High',
      domainSpecialization: 'Field / solutions',
    },
  },
  {
    id: 'pm-applied-ai',
    track: 'pm',
    category: 'emerging',
    title: 'Applied AI Product Manager',
    focusAreas: ['Applied ML use cases', 'Model ↔ workflow fit', 'Data readiness', 'Business impact of AI'],
    keywords: ['applied ai', 'ml', 'machine learning', 'prediction', 'classification', 'automation'],
    prefer: { ai: 2, surface: 'either', audience: 'b2b', stage: 'scale', technical: 1 },
    exciting: 'Finding where AI creates real leverage inside existing products.',
    tradeoffs: 'Legacy constraints; proving ROI beyond the demo.',
    roles: ['Applied AI PM', 'ML Product Manager'],
    dimensions: {
      surface: 'Mixed',
      audience: 'B2B-leaning',
      stage: 'Scale with AI',
      technicalDepth: 'Medium-high',
      gtmExposure: 'Medium',
      domainSpecialization: 'Applied AI',
    },
  },
  {
    id: 'pm-agent',
    track: 'pm',
    category: 'emerging',
    title: 'AI Agent Product Manager',
    focusAreas: ['Agentic workflows', 'Tool use & orchestration', 'Human-in-the-loop', 'Reliability of agents'],
    keywords: ['agent', 'agentic', 'orchestration', 'tools', 'autonomous', 'workflow automation'],
    prefer: { ai: 2, surface: 'either', audience: 'either', stage: '0to1', technical: 1 },
    exciting: 'Designing systems that take actions, not just generate text.',
    tradeoffs: 'Hard reliability bar; safety and control become product requirements.',
    roles: ['AI Agent PM', 'Agentic Workflows PM'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: '0→1',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'Agents',
    },
  },
  {
    id: 'pm-ai-eval',
    track: 'pm',
    category: 'emerging',
    title: 'AI Evaluation / AI Quality Product Manager',
    focusAreas: ['Eval frameworks', 'Quality bars', 'Red teaming', 'Trust & safety'],
    keywords: ['eval', 'evaluation', 'quality', 'safety', 'red team', 'hallucination', 'trust'],
    prefer: { ai: 2, surface: 'platform', audience: 'either', stage: 'scale', technical: 1 },
    exciting: 'Making AI products trustworthy enough to ship and scale.',
    tradeoffs: 'Invisible when it works; high scrutiny when quality slips.',
    roles: ['AI Quality PM', 'AI Eval PM', 'Trust & Safety PM'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal / B2B',
      stage: 'Scale quality',
      technicalDepth: 'High',
      gtmExposure: 'Low',
      domainSpecialization: 'AI quality',
    },
  },

  // —— Product Manager · Core ——
  {
    id: 'pm-platform',
    track: 'pm',
    category: 'core',
    title: 'Platform Product Manager',
    focusAreas: ['APIs', 'Internal platforms', 'Developer tools', 'Infrastructure leverage'],
    keywords: ['platform', 'api', 'internal tools', 'developer', 'infrastructure', 'sdk', 'shared services'],
    prefer: { ai: 0, surface: 'platform', audience: 'b2b', stage: 'scale', technical: 1 },
    exciting: 'Building shared capabilities that multiply many product teams.',
    tradeoffs: 'Success is indirect; less visible user love, more enablement politics.',
    roles: ['Platform PM', 'Internal Tools PM', 'Developer Experience PM'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'B2B / internal',
      stage: 'Scale systems',
      technicalDepth: 'High',
      gtmExposure: 'Low-medium',
      domainSpecialization: 'Platform',
    },
  },
  {
    id: 'pm-technical',
    track: 'pm',
    category: 'core',
    title: 'Technical Product Manager',
    focusAreas: ['ML / data platforms', 'Backend systems', 'Cloud infrastructure', 'Deep technical tradeoffs'],
    keywords: ['technical', 'backend', 'infrastructure', 'data platform', 'ml platform', 'systems', 'architecture'],
    prefer: { ai: 1, surface: 'platform', audience: 'either', stage: 'either', technical: 2 },
    exciting: 'Owning complex systems where product judgment and engineering depth meet.',
    tradeoffs: 'Less consumer polish; roadmap debates stay deep in the stack.',
    roles: ['Technical PM', 'Infrastructure PM', 'Data Platform PM'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Mixed',
      stage: 'Scale systems',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Technical platforms',
    },
  },
  {
    id: 'pm-growth',
    track: 'pm',
    category: 'core',
    title: 'Growth Product Manager',
    focusAreas: ['Acquisition', 'Activation', 'Retention', 'Monetization', 'Experimentation'],
    keywords: ['growth', 'acquisition', 'activation', 'retention', 'funnel', 'experiment', 'ab test', 'conversion'],
    prefer: { ai: 0, surface: 'user', audience: 'either', stage: 'scale', technical: 0 },
    exciting: 'Turning product loops into measurable growth engines.',
    tradeoffs: 'Metric pressure; risk of optimizing for short-term over craft.',
    roles: ['Growth PM', 'Activation PM', 'Lifecycle PM'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: 'Scale growth',
      technicalDepth: 'Medium',
      gtmExposure: 'High',
      domainSpecialization: 'Growth',
    },
  },
  {
    id: 'pm-enterprise',
    track: 'pm',
    category: 'core',
    title: 'Enterprise / B2B Product Manager',
    focusAreas: ['Enterprise SaaS', 'Internal workflows', 'Admin tools', 'Workflow automation'],
    keywords: ['enterprise', 'b2b', 'saas', 'admin', 'workflow', 'sales', 'crm', 'compliance'],
    prefer: { ai: 0, surface: 'user', audience: 'b2b', stage: 'scale', technical: 0 },
    exciting: 'Solving high-stakes workflows for teams that live in the product daily.',
    tradeoffs: 'Long sales cycles; customization vs platform tension.',
    roles: ['Enterprise PM', 'B2B SaaS PM', 'Workflow PM'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2B',
      stage: 'Scale enterprise',
      technicalDepth: 'Medium',
      gtmExposure: 'High',
      domainSpecialization: 'Enterprise',
    },
  },
  {
    id: 'pm-consumer',
    track: 'pm',
    category: 'core',
    title: 'Consumer Product Manager',
    focusAreas: ['Consumer apps', 'Marketplace', 'Social', 'Mobile products'],
    keywords: ['consumer', 'b2c', 'marketplace', 'mobile', 'social', 'app', 'community'],
    prefer: { ai: 0, surface: 'user', audience: 'b2c', stage: 'either', technical: 0 },
    exciting: 'Crafting delightful products used by millions of people.',
    tradeoffs: 'Taste debates; growth and brand can override technical elegance.',
    roles: ['Consumer PM', 'Mobile PM', 'Marketplace PM'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2C',
      stage: '0→1 or scale',
      technicalDepth: 'Medium',
      gtmExposure: 'High',
      domainSpecialization: 'Consumer',
    },
  },

  // —— Product Manager · Leadership ——
  {
    id: 'pm-founding',
    track: 'pm',
    category: 'leadership',
    title: 'Founding Product Manager',
    focusAreas: ['Early-stage startups', 'New product incubation', 'Broad ownership', 'Rapid execution'],
    keywords: ['founding', '0 to 1', '0→1', 'startup', 'incubation', 'first pm', 'generalist'],
    prefer: { ai: 0, surface: 'either', audience: 'either', stage: '0to1', technical: 0, founding: 2 },
    exciting: 'Owning the product end-to-end when nothing exists yet.',
    tradeoffs: 'Ambiguity, resource scarcity, and wearing every hat.',
    roles: ['Founding PM', '0→1 Product Lead', 'First Product Hire'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: '0→1',
      technicalDepth: 'Medium',
      gtmExposure: 'High',
      domainSpecialization: 'Early-stage',
    },
  },
  {
    id: 'pm-strategy',
    track: 'pm',
    category: 'leadership',
    title: 'Product Strategy & Monetization',
    focusAreas: ['Pricing', 'Packaging', 'GTM strategy', 'Product marketing'],
    keywords: ['pricing', 'packaging', 'monetization', 'gtm', 'strategy', 'product marketing', 'revenue'],
    prefer: { ai: 0, surface: 'either', audience: 'either', stage: 'scale', technical: 0 },
    exciting: 'Connecting product value to how the business captures it.',
    tradeoffs: 'Cross-org alignment; decisions touch sales, marketing, and finance.',
    roles: ['Product Strategy Lead', 'Monetization PM', 'Pricing PM'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: 'Scale monetization',
      technicalDepth: 'Low-medium',
      gtmExposure: 'Very high',
      domainSpecialization: 'Strategy / GTM',
    },
  },

  // —— Software Engineer · AI & Emerging ——
  {
    id: 'eng-fde',
    track: 'eng',
    category: 'emerging',
    title: 'Forward Deployed Engineer',
    focusAreas: ['Customer deployments', 'Integration work', 'Prototype → production', 'Field engineering'],
    keywords: ['forward deployed', 'fde', 'solutions engineer', 'deployment', 'customer engineer', 'integration'],
    prefer: { ai: 1, surface: 'user', audience: 'b2b', stage: '0to1', technical: 1 },
    exciting: 'Building with customers in the loop and shipping what actually sticks.',
    tradeoffs: 'Context switching; less pure platform craft time.',
    roles: ['Forward Deployed Engineer', 'Customer Engineer', 'Solutions Engineer'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2B',
      stage: '0→1 with customers',
      technicalDepth: 'High',
      gtmExposure: 'High',
      domainSpecialization: 'Field engineering',
    },
  },
  {
    id: 'eng-ai-app',
    track: 'eng',
    category: 'emerging',
    title: 'AI Application Engineer',
    focusAreas: ['LLM apps', 'RAG', 'Prompt + product UX', 'AI feature shipping'],
    keywords: ['llm', 'rag', 'openai', 'langchain', 'ai app', 'copilot', 'genai'],
    prefer: { ai: 2, surface: 'user', audience: 'either', stage: 'either', technical: 1 },
    exciting: 'Turning models into reliable product surfaces people use daily.',
    tradeoffs: 'Model APIs change fast; quality is product, not just plumbing.',
    roles: ['AI Application Engineer', 'Full Stack AI Engineer', 'GenAI Engineer'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: '0→1 + scale',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'AI applications',
    },
  },
  {
    id: 'eng-applied-ai',
    track: 'eng',
    category: 'emerging',
    title: 'Applied AI Engineer',
    focusAreas: ['Applied ML systems', 'Model integration', 'Feature pipelines', 'Production ML'],
    keywords: ['applied ai', 'ml engineer', 'model serving', 'inference', 'feature store'],
    prefer: { ai: 2, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Getting ML out of notebooks and into production systems.',
    tradeoffs: 'Data debt and monitoring become half the job.',
    roles: ['Applied AI Engineer', 'ML Engineer', 'ML Systems Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Mixed',
      stage: 'Scale ML',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Applied ML',
    },
  },
  {
    id: 'eng-agent',
    track: 'eng',
    category: 'emerging',
    title: 'Agent Engineer',
    focusAreas: ['Agent runtimes', 'Tool calling', 'Orchestration', 'Eval loops for agents'],
    keywords: ['agent', 'agentic', 'tool calling', 'orchestration', 'autonomous'],
    prefer: { ai: 2, surface: 'either', audience: 'either', stage: '0to1', technical: 2 },
    exciting: 'Building systems that plan, act, and recover across tools.',
    tradeoffs: 'Debugging non-determinism; safety constraints everywhere.',
    roles: ['Agent Engineer', 'Agentic Systems Engineer'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: '0→1',
      technicalDepth: 'Very high',
      gtmExposure: 'Low-medium',
      domainSpecialization: 'Agents',
    },
  },
  {
    id: 'eng-llm',
    track: 'eng',
    category: 'emerging',
    title: 'LLM Engineer',
    focusAreas: ['LLM infra', 'Fine-tuning', 'Serving', 'Context & retrieval systems'],
    keywords: ['llm engineer', 'fine-tune', 'serving', 'vllm', 'inference', 'embeddings'],
    prefer: { ai: 2, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Owning the model stack that product teams build on.',
    tradeoffs: 'Infra cost, latency, and eval become constant pressure.',
    roles: ['LLM Engineer', 'AI Infrastructure Engineer', 'ML Platform Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal / platform',
      stage: 'Scale infra',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'LLM infrastructure',
    },
  },
  {
    id: 'eng-ai-eval',
    track: 'eng',
    category: 'emerging',
    title: 'AI Evaluation Engineer',
    focusAreas: ['Eval harnesses', 'Offline + online metrics', 'Safety tests', 'Quality gates'],
    keywords: ['eval', 'evaluation', 'benchmark', 'quality', 'safety', 'red team'],
    prefer: { ai: 2, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Building the measurement systems that make AI shippable.',
    tradeoffs: 'Work is foundational but rarely flashy.',
    roles: ['AI Evaluation Engineer', 'AI Quality Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal',
      stage: 'Scale quality',
      technicalDepth: 'High',
      gtmExposure: 'Low',
      domainSpecialization: 'AI evaluation',
    },
  },

  // —— Software Engineer · Core ——
  {
    id: 'eng-fullstack',
    track: 'eng',
    category: 'core',
    title: 'Full Stack Engineer',
    focusAreas: ['End-to-end features', 'APIs + UI', 'Product velocity', 'Ownership across layers'],
    keywords: ['full stack', 'fullstack', 'react', 'node', 'typescript', 'frontend', 'backend'],
    prefer: { ai: 0, surface: 'user', audience: 'either', stage: 'either', technical: 1 },
    exciting: 'Shipping complete product slices without handoff friction.',
    tradeoffs: 'Breadth over depth; stack choices matter a lot.',
    roles: ['Full Stack Engineer', 'Product Engineer', 'Software Engineer'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: '0→1 or scale',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'Product engineering',
    },
  },
  {
    id: 'eng-backend',
    track: 'eng',
    category: 'core',
    title: 'Backend / Distributed Systems Engineer',
    focusAreas: ['Distributed systems', 'APIs', 'Reliability', 'Scale & performance'],
    keywords: ['backend', 'distributed', 'systems', 'kafka', 'microservices', 'scalability', 'reliability'],
    prefer: { ai: 0, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Designing systems that stay correct under real load.',
    tradeoffs: 'Longer feedback loops; operational burden is real.',
    roles: ['Backend Engineer', 'Distributed Systems Engineer', 'Senior Software Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Mixed',
      stage: 'Scale systems',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Backend systems',
    },
  },
  {
    id: 'eng-platform',
    track: 'eng',
    category: 'core',
    title: 'Platform Engineer',
    focusAreas: ['Internal platforms', 'Developer productivity', 'Shared services', 'Paved roads'],
    keywords: ['platform engineer', 'developer platform', 'internal platform', 'paved road', 'self-service'],
    prefer: { ai: 0, surface: 'platform', audience: 'b2b', stage: 'scale', technical: 2 },
    exciting: 'Making every other engineering team faster and safer.',
    tradeoffs: 'Customers are other engineers; adoption is the metric.',
    roles: ['Platform Engineer', 'Developer Platform Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal',
      stage: 'Scale platform',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Platform',
    },
  },
  {
    id: 'eng-cloud',
    track: 'eng',
    category: 'core',
    title: 'Cloud / Infrastructure Engineer',
    focusAreas: ['Cloud infra', 'CI/CD', 'Observability', 'Reliability engineering'],
    keywords: ['cloud', 'devops', 'sre', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure', 'infra'],
    prefer: { ai: 0, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Owning the foundation everything else runs on.',
    tradeoffs: 'On-call and cost pressure; work is often invisible until it breaks.',
    roles: ['Cloud Engineer', 'Infrastructure Engineer', 'DevOps Engineer', 'SRE'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal',
      stage: 'Scale infra',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Cloud / infra',
    },
  },
  {
    id: 'eng-devtools',
    track: 'eng',
    category: 'core',
    title: 'Developer Tools Engineer',
    focusAreas: ['IDEs & CLIs', 'Build systems', 'DX', 'Productivity tooling'],
    keywords: ['developer tools', 'devtools', 'cli', 'sdk', 'build system', 'dx', 'ide'],
    prefer: { ai: 0, surface: 'platform', audience: 'b2b', stage: 'either', technical: 2 },
    exciting: 'Building tools engineers love enough to change how they work.',
    tradeoffs: 'High bar for polish; your users are merciless about DX.',
    roles: ['Developer Tools Engineer', 'DX Engineer', 'Build Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Developers',
      stage: '0→1 or scale',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'Developer tools',
    },
  },
  {
    id: 'eng-security',
    track: 'eng',
    category: 'core',
    title: 'Security Engineer',
    focusAreas: ['Application security', 'Identity', 'Threat modeling', 'Secure defaults'],
    keywords: ['security', 'appsec', 'identity', 'auth', 'threat', 'vulnerability', 'zero trust'],
    prefer: { ai: 0, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Making secure the default without killing product velocity.',
    tradeoffs: 'Often a partner role; influence matters as much as code.',
    roles: ['Security Engineer', 'Application Security Engineer', 'Product Security'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal / enterprise',
      stage: 'Scale security',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Security',
    },
  },

  // —— Software Engineer · Leadership ——
  {
    id: 'eng-founding',
    track: 'eng',
    category: 'leadership',
    title: 'Founding Engineer',
    focusAreas: ['Early-stage startups', '0→1 systems', 'Broad ownership', 'Rapid execution'],
    keywords: ['founding engineer', 'first engineer', 'startup', '0 to 1', '0→1', 'generalist'],
    prefer: { ai: 0, surface: 'either', audience: 'either', stage: '0to1', technical: 1, founding: 2 },
    exciting: 'Building the technical foundation of a company from scratch.',
    tradeoffs: 'Ambiguity, speed pressure, and ownership of everything.',
    roles: ['Founding Engineer', 'Early Engineer', '0→1 Engineer'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: '0→1',
      technicalDepth: 'High',
      gtmExposure: 'Medium-high',
      domainSpecialization: 'Early-stage',
    },
  },

  // —— Data Scientist · AI & Emerging ——
  {
    id: 'ds-fds',
    track: 'ds',
    category: 'emerging',
    title: 'Forward Deployed Data Scientist',
    focusAreas: ['Customer analytics', 'Field modeling', 'Pilot impact', 'Solution co-creation'],
    keywords: ['forward deployed', 'customer', 'solutions', 'implementation', 'consulting'],
    prefer: { ai: 1, surface: 'user', audience: 'b2b', stage: '0to1', technical: 1 },
    exciting: 'Using data science to unlock value directly with customers.',
    tradeoffs: 'Less deep research time; delivery pressure is high.',
    roles: ['Forward Deployed Data Scientist', 'Solutions Data Scientist'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2B',
      stage: '0→1 with customers',
      technicalDepth: 'High',
      gtmExposure: 'High',
      domainSpecialization: 'Field DS',
    },
  },
  {
    id: 'ds-applied-ai',
    track: 'ds',
    category: 'emerging',
    title: 'Applied AI Scientist',
    focusAreas: ['Applied modeling', 'Production ML', 'Business problem framing', 'Model iteration'],
    keywords: ['applied ai', 'applied scientist', 'ml', 'model', 'prediction'],
    prefer: { ai: 2, surface: 'either', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Turning messy business problems into working AI systems.',
    tradeoffs: 'Impact over novelty; constraints beat perfect models.',
    roles: ['Applied AI Scientist', 'Applied Scientist', 'ML Scientist'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: 'Scale AI',
      technicalDepth: 'Very high',
      gtmExposure: 'Medium',
      domainSpecialization: 'Applied AI',
    },
  },
  {
    id: 'ds-llm',
    track: 'ds',
    category: 'emerging',
    title: 'LLM / Generative AI Scientist',
    focusAreas: ['Generative models', 'Fine-tuning', 'Eval science', 'Prompt + data strategy'],
    keywords: ['llm', 'generative', 'gpt', 'fine-tune', 'foundation model', 'transformers'],
    prefer: { ai: 2, surface: 'either', audience: 'either', stage: 'either', technical: 2 },
    exciting: 'Pushing generative systems toward reliable, useful behavior.',
    tradeoffs: 'Research pace vs product deadlines collide often.',
    roles: ['LLM Scientist', 'Generative AI Scientist', 'Foundation Model Scientist'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: '0→1 + research',
      technicalDepth: 'Very high',
      gtmExposure: 'Low-medium',
      domainSpecialization: 'Generative AI',
    },
  },
  {
    id: 'ds-ai-eval',
    track: 'ds',
    category: 'emerging',
    title: 'AI Evaluation Scientist',
    focusAreas: ['Eval methodology', 'Human prefs', 'Safety metrics', 'Quality science'],
    keywords: ['evaluation', 'eval', 'benchmark', 'rlhf', 'preference', 'safety'],
    prefer: { ai: 2, surface: 'platform', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Defining how we know an AI system is actually good.',
    tradeoffs: 'Methodological rigor with incomplete ground truth.',
    roles: ['AI Evaluation Scientist', 'AI Quality Scientist'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal',
      stage: 'Scale quality',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'AI evaluation',
    },
  },
  {
    id: 'ds-ai-solutions',
    track: 'ds',
    category: 'emerging',
    title: 'AI Solutions Scientist',
    focusAreas: ['Solution design', 'Custom AI workflows', 'Stakeholder translation', 'Impact measurement'],
    keywords: ['solutions', 'ai solutions', 'consulting', 'use case', 'workflow'],
    prefer: { ai: 2, surface: 'user', audience: 'b2b', stage: '0to1', technical: 1 },
    exciting: 'Designing AI solutions that map cleanly onto real org workflows.',
    tradeoffs: 'Less deep specialization; communication load is high.',
    roles: ['AI Solutions Scientist', 'AI Solutions Lead'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2B',
      stage: '0→1 solutions',
      technicalDepth: 'High',
      gtmExposure: 'High',
      domainSpecialization: 'AI solutions',
    },
  },

  // —— Data Scientist · Core ——
  {
    id: 'ds-product',
    track: 'ds',
    category: 'core',
    title: 'Product Data Scientist',
    focusAreas: ['Product metrics', 'User behavior', 'Experiment support', 'Insight → roadmap'],
    keywords: ['product data', 'metrics', 'funnel', 'user behavior', 'analytics', 'kpi'],
    prefer: { ai: 0, surface: 'user', audience: 'either', stage: 'scale', technical: 1 },
    exciting: 'Helping product teams decide what to build with evidence.',
    tradeoffs: 'Influence without ownership; insights must be actionable.',
    roles: ['Product Data Scientist', 'Product Analyst', 'Data Scientist'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: 'Scale product',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'Product analytics',
    },
  },
  {
    id: 'ds-decision',
    track: 'ds',
    category: 'core',
    title: 'Decision Scientist',
    focusAreas: ['Decision frameworks', 'Forecasting', 'Business modeling', 'Strategy support'],
    keywords: ['decision science', 'forecast', 'optimization', 'business model', 'strategy'],
    prefer: { ai: 0, surface: 'either', audience: 'b2b', stage: 'scale', technical: 1 },
    exciting: 'Structuring high-stakes decisions with clear models and tradeoffs.',
    tradeoffs: 'Politics and ambiguity; models are only as useful as adoption.',
    roles: ['Decision Scientist', 'Business Data Scientist'],
    dimensions: {
      surface: 'Mixed',
      audience: 'B2B / internal',
      stage: 'Scale decisions',
      technicalDepth: 'High',
      gtmExposure: 'Medium',
      domainSpecialization: 'Decision science',
    },
  },
  {
    id: 'ds-experiment',
    track: 'ds',
    category: 'core',
    title: 'Experimentation & Causal Inference',
    focusAreas: ['A/B testing', 'Causal methods', 'Experiment design', 'Measurement quality'],
    keywords: ['experiment', 'causal', 'ab test', 'a/b', 'inference', 'treatment effect'],
    prefer: { ai: 0, surface: 'user', audience: 'either', stage: 'scale', technical: 2 },
    exciting: 'Finding what actually causes outcomes, not just correlates.',
    tradeoffs: 'Methodological purity vs product urgency.',
    roles: ['Experimentation Scientist', 'Causal Inference Scientist', 'Experimentation Lead'],
    dimensions: {
      surface: 'User-facing',
      audience: 'Mixed',
      stage: 'Scale experimentation',
      technicalDepth: 'Very high',
      gtmExposure: 'Medium',
      domainSpecialization: 'Experimentation',
    },
  },
  {
    id: 'ds-recs',
    track: 'ds',
    category: 'core',
    title: 'Recommendation & Ranking Scientist',
    focusAreas: ['Recommenders', 'Ranking', 'Personalization', 'Retrieval quality'],
    keywords: ['recommendation', 'ranking', 'personalization', 'retrieval', 'feed', 'search ranking'],
    prefer: { ai: 1, surface: 'user', audience: 'b2c', stage: 'scale', technical: 2 },
    exciting: 'Making each user see the right thing at the right time.',
    tradeoffs: 'Metric wars; cold start and feedback loops are constant.',
    roles: ['Recommendation Scientist', 'Ranking Scientist', 'Personalization Scientist'],
    dimensions: {
      surface: 'User-facing',
      audience: 'B2C-leaning',
      stage: 'Scale personalization',
      technicalDepth: 'Very high',
      gtmExposure: 'Medium',
      domainSpecialization: 'Recommendations',
    },
  },
  {
    id: 'ds-analytics-eng',
    track: 'ds',
    category: 'core',
    title: 'Analytics Engineer',
    focusAreas: ['Data modeling', 'dbt / warehouses', 'Metric layers', 'Trusted datasets'],
    keywords: ['analytics engineer', 'dbt', 'warehouse', 'etl', 'data model', 'snowflake', 'bigquery'],
    prefer: { ai: 0, surface: 'platform', audience: 'either', stage: 'scale', technical: 1 },
    exciting: 'Building the data foundation teams trust for decisions.',
    tradeoffs: 'Invisible infrastructure; stakeholder definition work is endless.',
    roles: ['Analytics Engineer', 'Data Analytics Engineer'],
    dimensions: {
      surface: 'Infrastructure',
      audience: 'Internal',
      stage: 'Scale data',
      technicalDepth: 'High',
      gtmExposure: 'Low',
      domainSpecialization: 'Analytics engineering',
    },
  },

  // —— Data Scientist · Research ——
  {
    id: 'ds-research',
    track: 'ds',
    category: 'research',
    title: 'Research Scientist',
    focusAreas: ['Novel methods', 'Publications', 'Long-horizon bets', 'Scientific rigor'],
    keywords: ['research scientist', 'research', 'paper', 'phd', 'novel', 'state of the art'],
    prefer: { ai: 1, surface: 'either', audience: 'either', stage: '0to1', technical: 2 },
    exciting: 'Pushing the frontier of what models and methods can do.',
    tradeoffs: 'Longer cycles; product transfer is not automatic.',
    roles: ['Research Scientist', 'Staff Research Scientist'],
    dimensions: {
      surface: 'Mixed',
      audience: 'Mixed',
      stage: 'Research horizon',
      technicalDepth: 'Very high',
      gtmExposure: 'Low',
      domainSpecialization: 'Research',
    },
  },
];

const TRACK_ROLE_PATTERNS = [
  {
    track: 'pm',
    weight: 4,
    pattern: /\b(product manager|product lead|group pm|principal pm|\bpm\b|product owner|roadmap|discovery)\b/i,
  },
  {
    track: 'eng',
    weight: 4,
    pattern: /\b(software engineer|swe|full[\s-]?stack|backend|frontend|staff engineer|devops|sre|platform engineer|security engineer)\b/i,
  },
  {
    track: 'ds',
    weight: 4,
    pattern: /\b(data scientist|machine learning engineer|ml engineer|applied scientist|research scientist|analytics engineer|statistician)\b/i,
  },
];

function normalizeText(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s→+./%-]/g, ' ');
}

function includesAny(text, needles) {
  return needles.some((n) => text.includes(n));
}

/** Infer primary track from resume snapshot. */
export function inferCareerTrack(snapshot = {}) {
  const text = normalizeText(
    snapshot.currentRole,
    snapshot.previousRoles,
    snapshot.skills,
    snapshot.productsBuilt,
    snapshot.leadership,
    snapshot.industries
  );

  const scores = { pm: 0, eng: 0, ds: 0 };

  for (const rule of TRACK_ROLE_PATTERNS) {
    if (rule.pattern.test(text)) scores[rule.track] += rule.weight;
  }

  if (includesAny(text, ['sql', 'experiment', 'causal', 'modeling', 'statistics', 'forecast'])) {
    scores.ds += 1;
  }
  if (includesAny(text, ['react', 'typescript', 'kubernetes', 'api', 'distributed', 'infra'])) {
    scores.eng += 1;
  }
  if (includesAny(text, ['roadmap', 'stakeholder', 'discovery', 'prd', 'go-to-market', 'gtm'])) {
    scores.pm += 1;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestTrack, bestScore] = ranked[0];
  if (bestScore <= 0) {
    // Default to PM for this product’s current mock persona when unclear.
    return { track: 'pm', confidence: 'low', scores };
  }
  return {
    track: bestTrack,
    confidence: bestScore >= 4 ? 'high' : bestScore >= 2 ? 'medium' : 'low',
    scores,
  };
}

function preferenceProfile(assumptions = {}, answers = {}) {
  const blob = normalizeText(
    assumptions.domains,
    assumptions.energy,
    assumptions.learnNext,
    answers.energy,
    answers.lessOf,
    answers.domains,
    answers.learnNext
  );

  const surfaceRaw = assumptions.surface || answers.productSurface || '';
  const audienceRaw = assumptions.audience || answers.audience || '';
  const stageRaw = assumptions.stage || answers.stage || '';

  let surface = 'either';
  if (/internal|platform/i.test(surfaceRaw)) surface = 'platform';
  else if (/user-facing|user facing/i.test(surfaceRaw)) surface = 'user';

  let audience = 'either';
  if (/^b2b$/i.test(audienceRaw) || audienceRaw === 'B2B') audience = 'b2b';
  else if (/^b2c$/i.test(audienceRaw) || audienceRaw === 'B2C') audience = 'b2c';

  let stage = 'either';
  if (/0\s*→\s*1|0\s*to\s*1|building/i.test(stageRaw)) stage = '0to1';
  else if (/scaling/i.test(stageRaw)) stage = 'scale';

  return {
    blob,
    surface,
    audience,
    stage,
    wantsAi: includesAny(blob, ['ai', 'llm', 'ml', 'agent', 'genai', 'model', 'copilot']),
    wantsFounding: includesAny(blob, ['0→1', '0 to 1', 'startup', 'founding', 'early stage', 'incubat']),
    wantsTechnical: includesAny(blob, ['technical', 'architecture', 'infra', 'systems', 'engineering depth', 'fluency']),
    wantsGrowth: includesAny(blob, ['growth', 'acquisition', 'retention', 'experiment', 'funnel']),
    wantsStrategy: includesAny(blob, ['pricing', 'packaging', 'monetization', 'gtm', 'strategy']),
  };
}

function keywordHits(text, keywords = []) {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) hits += 1;
  }
  return hits;
}

function scoreDirection(direction, { resumeText, prefs }) {
  let score = 0;
  const reasons = [];

  const hits = keywordHits(resumeText, direction.keywords);
  if (hits > 0) {
    score += hits * 2;
    reasons.push(`Resume signals match ${direction.title.toLowerCase()} (${hits} cues).`);
  }

  if (direction.category === 'emerging' && prefs.wantsAi) {
    score += 3;
    reasons.push('Your interests lean into AI / emerging work.');
  }
  if (direction.prefer?.ai && prefs.wantsAi) {
    score += direction.prefer.ai;
  }
  if (!prefs.wantsAi && direction.category === 'core') {
    score += 1;
  }

  if (direction.prefer?.founding && prefs.wantsFounding) {
    score += direction.prefer.founding + 2;
    reasons.push('You signaled interest in 0→1 / early ownership.');
  }

  if (direction.prefer?.technical && prefs.wantsTechnical) {
    score += direction.prefer.technical;
    reasons.push('You want more technical depth next.');
  }

  if (prefs.wantsGrowth && /growth|experiment|acquisition/i.test(direction.title + direction.focusAreas.join(' '))) {
    score += 2;
  }
  if (prefs.wantsStrategy && /strategy|monetization|pricing/i.test(direction.title)) {
    score += 2;
  }

  const preferSurface = direction.prefer?.surface || 'either';
  if (preferSurface !== 'either' && prefs.surface !== 'either') {
    if (preferSurface === prefs.surface) {
      score += 2;
      reasons.push(`Fits your preference for ${prefs.surface === 'platform' ? 'platform / internal' : 'user-facing'} work.`);
    } else {
      score -= 1;
    }
  }

  const preferAudience = direction.prefer?.audience || 'either';
  if (preferAudience !== 'either' && prefs.audience !== 'either') {
    if (preferAudience === prefs.audience) {
      score += 2;
      reasons.push(`Aligned with your ${prefs.audience.toUpperCase()} preference.`);
    } else {
      score -= 1;
    }
  }

  const preferStage = direction.prefer?.stage || 'either';
  if (preferStage !== 'either' && prefs.stage !== 'either') {
    if (preferStage === prefs.stage) {
      score += 2;
      reasons.push(prefs.stage === '0to1' ? 'Matches your 0→1 preference.' : 'Matches your scaling preference.');
    } else {
      score -= 1;
    }
  }

  // Soft diversity nudge: leadership roles need a clear signal.
  if (direction.category === 'leadership' && !prefs.wantsFounding && !prefs.wantsStrategy) {
    score -= 1;
  }
  if (direction.category === 'research' && !includesAny(prefs.blob + resumeText, ['research', 'phd', 'paper', 'novel'])) {
    score -= 1;
  }

  return { score, reasons };
}

function firstSentence(text, fallback) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
}

function buildEvidence(snapshot, direction) {
  const skills = firstSentence(snapshot.skills, '');
  const products = firstSentence(snapshot.productsBuilt, '');
  const previous = firstSentence(snapshot.previousRoles, '');
  const leadership = firstSentence(snapshot.leadership, '');
  const industries = firstSentence(snapshot.industries, '');
  const items = [
    snapshot.currentRole && `${snapshot.currentRole}${snapshot.yearsExperience ? ` · ${snapshot.yearsExperience} yrs` : ''}`,
    skills,
    products,
    previous && `Prior roles: ${previous}`,
    leadership,
    industries && `Industries: ${industries}`,
  ].filter(Boolean);

  // Prefer items that overlap keywords.
  const ranked = items
    .map((item) => ({
      item,
      hits: keywordHits(item.toLowerCase(), direction.keywords),
    }))
    .sort((a, b) => b.hits - a.hits)
    .map((row) => row.item);

  return ranked.slice(0, 3);
}

function buildWhyFits({ direction, snapshot, assumptions, reasons, trackLabel }) {
  const role = snapshot.currentRole || trackLabel;
  const years = snapshot.yearsExperience || 'several';
  const domains = firstSentence(assumptions.domains, 'your target domains');
  const primary = reasons[0] || `Strong fit within the ${trackLabel} track.`;
  return `Based on ~${years} yrs as ${role} and interest in ${domains}: ${primary}`;
}

/**
 * Rank catalog directions for a resume + reflection profile.
 * Returns top N personalized path cards.
 */
export function recommendCareerPaths(snapshot = {}, assumptions = {}, { answers = {}, limit = 3 } = {}) {
  const trackInfo = inferCareerTrack(snapshot);
  const track = trackInfo.track;
  const trackLabel = TRACKS[track]?.label || 'Product Manager';
  const prefs = preferenceProfile(assumptions, answers);
  const resumeText = normalizeText(
    snapshot.currentRole,
    snapshot.previousRoles,
    snapshot.skills,
    snapshot.productsBuilt,
    snapshot.leadership,
    snapshot.industries,
    assumptions.domains,
    assumptions.energy,
    assumptions.learnNext
  );

  const candidates = CAREER_DIRECTIONS.filter((d) => d.track === track);
  const scored = candidates
    .map((direction) => {
      const { score, reasons } = scoreDirection(direction, { resumeText, prefs });
      return { direction, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.direction.title.localeCompare(b.direction.title));

  // Ensure some category diversity in top 3 when scores are close.
  const picked = [];
  for (const row of scored) {
    if (picked.length >= limit) break;
    const sameCategoryCount = picked.filter((p) => p.direction.category === row.direction.category).length;
    if (sameCategoryCount >= 2 && scored.length > limit) continue;
    picked.push(row);
  }
  while (picked.length < limit && picked.length < scored.length) {
    const next = scored.find((row) => !picked.includes(row));
    if (!next) break;
    picked.push(next);
  }

  return picked.map(({ direction, score, reasons }) => ({
    id: direction.id,
    title: direction.title,
    track,
    trackLabel,
    category: direction.category,
    matchScore: score,
    whyFits: buildWhyFits({ direction, snapshot, assumptions, reasons, trackLabel }),
    evidence: buildEvidence(snapshot, direction),
    exciting: direction.exciting,
    tradeoffs: direction.tradeoffs,
    deepen: direction.focusAreas.slice(0, 4),
    roles: direction.roles,
    dimensions: direction.dimensions,
    focusAreas: direction.focusAreas.slice(0, 3),
  }));
}

export function getDirectionById(id) {
  return CAREER_DIRECTIONS.find((d) => d.id === id) || null;
}

export function getLearningTopicsForDirection(pathTitle) {
  const direction =
    CAREER_DIRECTIONS.find((d) => d.title === pathTitle)
    || CAREER_DIRECTIONS.find((d) => pathTitle && d.title.toLowerCase().includes(String(pathTitle).toLowerCase()));

  if (!direction) {
    return [
      {
        topic: 'Career storytelling',
        time: '30 min',
        exercise: 'Write one story that shows your strongest recent impact.',
      },
    ];
  }

  return direction.focusAreas.slice(0, 2).map((topic, index) => ({
    topic,
    time: index === 0 ? '45 min' : '35 min',
    exercise: `Draft a concrete example or mini-project that demonstrates strength in ${topic.toLowerCase()}.`,
    why: `Core focus area for ${direction.title}.`,
  }));
}
