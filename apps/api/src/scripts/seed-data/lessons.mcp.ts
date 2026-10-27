import type { SeedLesson } from './types.js';

export const mcpLessons: SeedLesson[] = [
  {
    slug: 'what-is-mcp',
    title: 'What is the Model Context Protocol (MCP)?',
    summary:
      'MCP is an open protocol that lets AI applications connect to tools and data through one standard interface. Learn the host, client and server roles in 6 minutes.',
    technology: 'mcp',
    tags: ['mcp', 'ai', 'protocols'],
    difficulty: 'beginner',
    language: 'en',
    blocks: [
      { id: 'why', type: 'heading', text: 'Why MCP exists' },
      {
        id: 'p-why',
        type: 'paragraph',
        text: 'Every AI app used to wire up tools its own way: one plugin format for the IDE, another for the chat app, another for the agent framework. The **Model Context Protocol** standardises that wiring so a tool written once works in any MCP-compatible app.',
      },
      {
        id: 'p-usb',
        type: 'paragraph',
        text: 'A useful mental model is a USB-C port for AI: the app exposes a port, and any MCP server can plug in to offer tools, data or prompt templates.',
      },
      {
        id: 'arch',
        type: 'diagram',
        title: 'MCP architecture',
        direction: 'vertical',
        nodes: [
          { id: 'host', label: 'Host app', description: 'IDE, chat app or agent', tone: 'primary' },
          {
            id: 'client',
            label: 'MCP client',
            description: 'One per server connection',
            tone: 'secondary',
          },
          {
            id: 'server',
            label: 'MCP server',
            description: 'Exposes tools, resources, prompts',
            tone: 'success',
          },
          {
            id: 'data',
            label: 'Your systems',
            description: 'APIs, files, databases',
            tone: 'neutral',
          },
        ],
        edges: [
          { from: 'host', to: 'client', label: 'creates' },
          { from: 'client', to: 'server', label: 'JSON-RPC' },
          { from: 'server', to: 'data', label: 'calls' },
        ],
        caption:
          'The host never talks to your systems directly; it goes through an MCP server you control.',
      },
      { id: 'roles', type: 'heading', text: 'The three roles' },
      {
        id: 'p-roles',
        type: 'paragraph',
        text: 'The **host** is the application the user interacts with. Inside it, an **MCP client** maintains a 1:1 connection with an **MCP server**. Servers advertise capabilities and the client calls them on behalf of the model.',
      },
      { id: 'transports', type: 'heading', text: 'Transports' },
      {
        id: 'p-transports',
        type: 'paragraph',
        text: 'Messages are JSON-RPC 2.0. Local servers usually run as a subprocess and talk over `stdio`. Remote servers use **Streamable HTTP**, so they can be deployed like any web service.',
      },
      {
        id: 'jsonrpc',
        type: 'code',
        language: 'json',
        filename: 'tools/call request',
        code: '{\n  "jsonrpc": "2.0",\n  "id": 7,\n  "method": "tools/call",\n  "params": {\n    "name": "get_forecast",\n    "arguments": { "city": "Bengaluru" }\n  }\n}',
        caption: 'What a client sends when the model decides to call a tool.',
      },
      {
        id: 'tip-security',
        type: 'callout',
        variant: 'warning',
        title: 'Security first',
        text: 'An MCP server runs with whatever permissions you give it. Expose narrow, purpose-built tools instead of raw database or shell access, and require user approval for actions with side effects.',
      },
      {
        id: 'quiz-roles',
        type: 'quiz',
        question: 'Which component keeps a 1:1 connection with an MCP server?',
        options: [
          { id: 'a', text: 'The host application' },
          { id: 'b', text: 'The MCP client' },
          { id: 'c', text: 'The language model' },
        ],
        correctOptionIds: ['b'],
        explanation:
          'The host creates one MCP client per server. Each client manages exactly one server connection.',
      },
      {
        id: 'quiz-transport',
        type: 'quiz',
        question: 'Which transports are standard in MCP? (Select all that apply)',
        options: [
          { id: 'stdio', text: 'stdio' },
          { id: 'http', text: 'Streamable HTTP' },
          { id: 'ftp', text: 'FTP' },
        ],
        correctOptionIds: ['stdio', 'http'],
        explanation:
          'Local servers typically use stdio; remote servers use Streamable HTTP. FTP is not an MCP transport.',
      },
    ],
  },
  {
    slug: 'mcp-tools-resources-prompts',
    title: 'MCP building blocks: Tools, Resources and Prompts',
    summary:
      'Servers can expose three kinds of capabilities. Learn when to use each one, who controls it, and how they look in code.',
    technology: 'mcp',
    tags: ['mcp', 'tools', 'nodejs'],
    difficulty: 'intermediate',
    language: 'en',
    blocks: [
      { id: 'overview', type: 'heading', text: 'Three primitives, three owners' },
      {
        id: 'p-overview',
        type: 'paragraph',
        text: 'MCP distinguishes capabilities by **who decides to use them**. Tools are model-controlled, resources are application-controlled, and prompts are user-controlled.',
      },
      {
        id: 'diagram',
        type: 'diagram',
        title: 'Who triggers what',
        direction: 'horizontal',
        nodes: [
          { id: 'tools', label: 'Tools', description: 'Model decides to call', tone: 'primary' },
          {
            id: 'resources',
            label: 'Resources',
            description: 'App attaches as context',
            tone: 'secondary',
          },
          {
            id: 'prompts',
            label: 'Prompts',
            description: 'User picks a template',
            tone: 'success',
          },
        ],
        edges: [],
      },
      { id: 'tools-h', type: 'heading', text: 'Tools: actions with typed inputs' },
      {
        id: 'p-tools',
        type: 'paragraph',
        text: 'A tool has a name, a description the model reads, and an input schema. Good descriptions matter: they are the only thing the model sees when deciding whether to call your tool.',
      },
      {
        id: 'code-tool',
        type: 'code',
        language: 'typescript',
        filename: 'tools.ts',
        code: "server.registerTool(\n  'search_docs',\n  {\n    title: 'Search docs',\n    description: 'Full-text search over the product documentation',\n    inputSchema: { query: z.string().min(2), limit: z.number().int().max(10).default(5) },\n  },\n  async ({ query, limit }) => {\n    const hits = await docs.search(query, limit);\n    return {\n      content: [{ type: 'text', text: hits.map((h) => `- ${h.title}: ${h.url}`).join('\\n') }],\n    };\n  },\n);",
      },
      { id: 'resources-h', type: 'heading', text: 'Resources: read-only context' },
      {
        id: 'p-resources',
        type: 'paragraph',
        text: 'Resources are addressed by URI and return content the host can show or attach to the conversation, such as a file, a schema or a log excerpt.',
      },
      {
        id: 'code-resource',
        type: 'code',
        language: 'typescript',
        code: "server.registerResource(\n  'changelog',\n  'docs://changelog',\n  { title: 'Changelog', mimeType: 'text/markdown' },\n  async (uri) => ({\n    contents: [{ uri: uri.href, text: await readFile('CHANGELOG.md', 'utf8') }],\n  }),\n);",
      },
      { id: 'prompts-h', type: 'heading', text: 'Prompts: reusable templates' },
      {
        id: 'code-prompt',
        type: 'code',
        language: 'typescript',
        code: "server.registerPrompt(\n  'review-code',\n  { title: 'Review code', argsSchema: { code: z.string() } },\n  ({ code }) => ({\n    messages: [\n      { role: 'user', content: { type: 'text', text: `Review this code for bugs:\\n\\n${code}` } },\n    ],\n  }),\n);",
      },
      {
        id: 'tip',
        type: 'callout',
        variant: 'tip',
        title: 'Rule of thumb',
        text: 'If it changes something or needs fresh computation, make it a tool. If it is data the user might want to look at, make it a resource.',
      },
      {
        id: 'quiz',
        type: 'quiz',
        question:
          'A "list my open GitHub issues" capability that the model should call on its own is best modelled as a…',
        options: [
          { id: 'tool', text: 'Tool' },
          { id: 'resource', text: 'Resource' },
          { id: 'prompt', text: 'Prompt' },
        ],
        correctOptionIds: ['tool'],
        explanation:
          'Model-initiated actions with inputs are tools. Resources are attached by the application, prompts are chosen by the user.',
      },
    ],
  },
  {
    slug: 'build-mcp-server-nodejs',
    title: 'Apna pehla MCP server Node.js mein banayein',
    summary:
      'Step-by-step Hinglish guide: TypeScript SDK install karo, ek tool register karo, aur Claude Desktop ya kisi bhi MCP host se connect karo.',
    technology: 'mcp',
    tags: ['mcp', 'nodejs', 'typescript'],
    difficulty: 'intermediate',
    language: 'hinglish',
    blocks: [
      { id: 'setup', type: 'heading', text: 'Step 1: Project setup' },
      {
        id: 'p-setup',
        type: 'paragraph',
        text: 'Chalo ek chhota sa "weather" MCP server banate hain. Pehle ek naya Node.js project banao aur official TypeScript SDK install karo. Node 18+ chahiye.',
      },
      {
        id: 'code-install',
        type: 'code',
        language: 'bash',
        code: 'mkdir weather-mcp && cd weather-mcp\nnpm init -y\nnpm install @modelcontextprotocol/sdk zod\nnpm install -D typescript @types/node\nnpx tsc --init',
      },
      {
        id: 'note-esm',
        type: 'callout',
        variant: 'info',
        text: 'package.json mein "type": "module" add karna mat bhoolna, kyunki SDK ESM imports use karta hai.',
      },
      { id: 'server', type: 'heading', text: 'Step 2: Server aur tool likho' },
      {
        id: 'p-server',
        type: 'paragraph',
        text: '`McpServer` hamara server hai aur `registerTool` se hum ek tool expose karte hain. Input schema Zod se define hota hai, toh model ko pata hota hai kaunse arguments bhejne hain.',
      },
      {
        id: 'code-server',
        type: 'code',
        language: 'typescript',
        filename: 'src/index.ts',
        code: "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';\nimport { z } from 'zod';\n\nconst server = new McpServer({ name: 'weather', version: '1.0.0' });\n\nserver.registerTool(\n  'get_forecast',\n  {\n    title: 'Get forecast',\n    description: 'Kisi city ka short weather forecast deta hai',\n    inputSchema: { city: z.string().describe('City ka naam, jaise Pune') },\n  },\n  async ({ city }) => {\n    // Real app mein yahan weather API call hogi\n    return { content: [{ type: 'text', text: `${city}: 31°C, halki dhoop` }] };\n  },\n);\n\nconst transport = new StdioServerTransport();\nawait server.connect(transport);\nconsole.error('weather MCP server ready');",
      },
      {
        id: 'warn-stdout',
        type: 'callout',
        variant: 'warning',
        title: 'Sabse common galti',
        text: 'stdio server mein console.log() mat use karo! stdout pe sirf JSON-RPC messages jaane chahiye. Logs ke liye console.error() use karo, warna client ka connection toot jayega.',
      },
      { id: 'connect', type: 'heading', text: 'Step 3: Host se connect karo' },
      {
        id: 'p-connect',
        type: 'paragraph',
        text: 'Build karo (`npx tsc`) aur phir host ki config mein server add karo. Claude Desktop ke liye config kuch aisa dikhta hai:',
      },
      {
        id: 'code-config',
        type: 'code',
        language: 'json',
        filename: 'claude_desktop_config.json',
        code: '{\n  "mcpServers": {\n    "weather": {\n      "command": "node",\n      "args": ["/absolute/path/to/weather-mcp/build/index.js"]\n    }\n  }\n}',
      },
      {
        id: 'flow',
        type: 'diagram',
        title: 'Request ka safar',
        direction: 'horizontal',
        nodes: [
          { id: 'user', label: 'User', tone: 'neutral' },
          { id: 'model', label: 'Model', tone: 'primary' },
          { id: 'client', label: 'MCP client', tone: 'secondary' },
          { id: 'tool', label: 'get_forecast', tone: 'success' },
        ],
        edges: [
          { from: 'user', to: 'model', label: 'Pune ka mausam?' },
          { from: 'model', to: 'client', label: 'tool call' },
          { from: 'client', to: 'tool', label: 'stdio' },
        ],
      },
      {
        id: 'tip-inspector',
        type: 'callout',
        variant: 'tip',
        text: 'Debugging ke liye MCP Inspector use karo: `npx @modelcontextprotocol/inspector node build/index.js`. Isse tum tools ko bina AI host ke test kar sakte ho.',
      },
      {
        id: 'quiz-log',
        type: 'quiz',
        question: 'stdio MCP server mein debug logs kahan likhne chahiye?',
        options: [
          { id: 'stdout', text: 'console.log() se stdout pe' },
          { id: 'stderr', text: 'console.error() se stderr pe' },
          { id: 'none', text: 'Logs allowed hi nahi hain' },
        ],
        correctOptionIds: ['stderr'],
        explanation:
          'stdout protocol messages ke liye reserved hai. stderr pe logs safe hain aur host unhe alag se dikha sakta hai.',
      },
    ],
  },
];
