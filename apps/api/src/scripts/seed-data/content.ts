import { aiLessons } from './lessons.ai.js';
import { devLessons } from './lessons.dev.js';
import { mcpLessons } from './lessons.mcp.js';
import type { SeedLesson, SeedNews, SeedPath, SeedQuestion } from './types.js';

export const seedLessons: SeedLesson[] = [...mcpLessons, ...aiLessons, ...devLessons];

export const seedPaths: SeedPath[] = [
  {
    slug: 'mcp-fundamentals-nodejs',
    title: 'MCP Fundamentals with Node.js',
    description:
      'Understand the Model Context Protocol from first principles, learn its building blocks, then ship your own MCP server in TypeScript.',
    technology: 'mcp',
    difficulty: 'beginner',
    lessonSlugs: ['what-is-mcp', 'mcp-tools-resources-prompts', 'build-mcp-server-nodejs'],
  },
  {
    slug: 'rag-zero-to-practical',
    title: 'RAG from Zero to Practical Implementation',
    description:
      'Go from "what is RAG?" to a working retrieval pipeline in Node.js: chunking, embeddings, similarity search and grounded prompts.',
    technology: 'rag',
    difficulty: 'intermediate',
    lessonSlugs: ['rag-explained', 'rag-chunking-embeddings-hinglish', 'rag-pipeline-nodejs'],
  },
  {
    slug: 'docker-fundamentals',
    title: 'Docker Fundamentals',
    description:
      'Containers explained simply, a production-ready Node.js image, and your first step into Kubernetes.',
    technology: 'docker',
    difficulty: 'beginner',
    lessonSlugs: [
      'docker-basics-hinglish',
      'dockerize-node-app',
      'kubernetes-pods-deployments-services',
    ],
  },
  {
    slug: 'ai-agents-tool-calling',
    title: 'AI Agents and Tool Calling',
    description:
      'Teach models to use your functions safely, build an agent loop with guardrails, and connect tools through MCP.',
    technology: 'ai-agents',
    difficulty: 'intermediate',
    lessonSlugs: ['openai-tool-calling', 'ai-agent-loop-hinglish', 'what-is-mcp'],
  },
];

const SAMPLE_NOTE =
  'Note: this is SAMPLE content seeded for local development. It does not describe a real, current news event.';

export const seedNews: SeedNews[] = [
  {
    slug: 'sample-why-mcp-matters-for-dev-tools',
    title: 'Sample article: Why a shared tool protocol matters for developer tools',
    summary:
      'An explainer-style sample article showing how the News tab renders source attribution, categories and sharing.',
    body: `${SAMPLE_NOTE}\n\nWhen every AI application integrates tools differently, tool authors have to maintain many adapters. A shared protocol such as MCP lets a single server work across editors, chat apps and agents.\n\nFor teams, this means internal APIs can be exposed once, with permissions enforced in one place, instead of being re-implemented for each assistant.`,
    category: 'ai-tools',
    sourceName: 'TechCapsule (sample content)',
    sourceUrl: 'https://modelcontextprotocol.io',
    isSample: true,
    publishedDaysAgo: 0,
  },
  {
    slug: 'sample-evaluating-rag-systems',
    title: 'Sample article: Teams are measuring retrieval quality before tuning prompts',
    summary:
      'A sample piece about evaluating RAG pipelines, used to demonstrate the article detail screen.',
    body: `${SAMPLE_NOTE}\n\nA common lesson from building RAG systems is that answer quality is capped by retrieval quality. Many teams start by building a small set of questions with known source passages.\n\nMeasuring whether the right passage appears in the top results makes it easier to compare chunk sizes, embedding models and metadata filters objectively.`,
    category: 'research',
    sourceName: 'TechCapsule (sample content)',
    sourceUrl: 'https://techcapsule.dev',
    isSample: true,
    publishedDaysAgo: 1,
  },
  {
    slug: 'sample-node-lts-upgrade-checklist',
    title: 'Sample article: A checklist for upgrading to a new Node.js LTS',
    summary:
      'Sample web-dev article: what to verify when moving production services to a new LTS line.',
    body: `${SAMPLE_NOTE}\n\nBefore upgrading, check the official release notes for removed or deprecated APIs, run your test suite on the new version in CI, and rebuild native modules.\n\nUpgrade the base image in your Dockerfile, roll out gradually, and watch error rates and memory usage after the switch.`,
    category: 'web-dev',
    sourceName: 'TechCapsule (sample content)',
    sourceUrl: 'https://nodejs.org/en/about/previous-releases',
    isSample: true,
    publishedDaysAgo: 2,
  },
  {
    slug: 'sample-kubernetes-resource-limits',
    title: 'Sample article: Why resource requests and limits matter on Kubernetes',
    summary: 'Sample cloud & DevOps article explaining CPU and memory requests for beginners.',
    body: `${SAMPLE_NOTE}\n\nRequests tell the scheduler how much CPU and memory a Pod needs; limits cap what it can use. Without requests, the scheduler can over-pack nodes.\n\nStart with measured usage from a staging environment and revisit the numbers after real traffic.`,
    category: 'cloud-devops',
    sourceName: 'TechCapsule (sample content)',
    sourceUrl: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
    isSample: true,
    publishedDaysAgo: 3,
  },
];

/** Sample community authors use the reserved .invalid TLD and can never log in. */
export const seedAuthors = [
  { key: 'priya', displayName: 'Priya (sample)', email: 'priya.sample@seed.techcapsule.invalid' },
  { key: 'arjun', displayName: 'Arjun (sample)', email: 'arjun.sample@seed.techcapsule.invalid' },
  { key: 'meera', displayName: 'Meera (sample)', email: 'meera.sample@seed.techcapsule.invalid' },
];

export const seedQuestions: SeedQuestion[] = [
  {
    authorKey: 'priya',
    title: 'My MCP server works in the Inspector but not in Claude Desktop',
    body: 'I built a stdio MCP server in TypeScript. The MCP Inspector lists my tools fine, but Claude Desktop shows the server as failed. I added a few console.log statements for debugging. What could be wrong?',
    tags: ['mcp', 'nodejs', 'debugging'],
    answers: [
      {
        authorKey: 'arjun',
        body: 'console.log writes to stdout, which is reserved for JSON-RPC messages in stdio servers. Replace them with console.error. Also make sure the path in claude_desktop_config.json is absolute and points to the built .js file.',
      },
    ],
  },
  {
    authorKey: 'meera',
    title: 'RAG mein chunk size kitna rakhna chahiye?',
    body: 'Main product documentation pe RAG bana rahi hoon. Kuch log 500 characters bolte hain, kuch 2000. Koi practical rule hai kya, ya sirf experiment karke pata chalega?',
    tags: ['rag', 'chunking'],
    answers: [
      {
        authorKey: 'priya',
        body: 'Shuruaat 800 characters aur 100 overlap se karo, phir 20-30 real questions ka chhota eval set banao. Check karo sahi chunk top 3 mein aa raha hai ya nahi. Docs headings pe split karna fixed size se aksar better hota hai.',
      },
      {
        authorKey: 'arjun',
        body: 'Ek aur tip: har chunk ke saath section title bhi embed karo. Isse short chunks ka context bhi clear rehta hai aur retrieval improve hota hai.',
      },
    ],
  },
  {
    authorKey: 'arjun',
    title: 'Docker container exits immediately after docker run',
    body: 'I built an image for my Express API. docker run starts the container but it exits right away with code 0 and docker ps shows nothing. Locally npm start works. How do I debug this?',
    tags: ['docker', 'nodejs'],
    answers: [
      {
        authorKey: 'meera',
        body: 'Run docker logs <container> to see output, and docker run -it <image> sh to inspect it. Exit code 0 usually means the CMD finished — check that CMD starts the server (e.g. ["node", "server.js"]) and is not a build script.',
      },
    ],
  },
  {
    authorKey: 'priya',
    title: 'When should I use an agent instead of a single tool call?',
    body: 'For my support bot, one tool call (look up an order) solves most questions. Is there a clear signal that I need a full agent loop with multiple steps?',
    tags: ['ai-agents', 'tool-calling'],
    answers: [],
  },
];
