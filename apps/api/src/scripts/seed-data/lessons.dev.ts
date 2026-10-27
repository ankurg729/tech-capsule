import type { SeedLesson } from './types.js';

export const devLessons: SeedLesson[] = [
  {
    slug: 'nodejs-event-loop',
    title: 'The Node.js Event Loop, Simply Explained',
    summary:
      'How a single-threaded runtime handles thousands of connections: the call stack, microtasks, timers and why blocking code hurts everyone.',
    technology: 'nodejs',
    tags: ['nodejs', 'javascript', 'async'],
    difficulty: 'beginner',
    language: 'en',
    blocks: [
      { id: 'single', type: 'heading', text: 'One thread, many tasks' },
      {
        id: 'p-single',
        type: 'paragraph',
        text: 'Your JavaScript runs on one thread. Node stays responsive because slow work — network, disk, timers — is handed to the system, and your callback is queued when the result is ready. The **event loop** picks queued callbacks and runs them one at a time.',
      },
      {
        id: 'diagram',
        type: 'diagram',
        title: 'Where callbacks wait',
        direction: 'vertical',
        nodes: [
          {
            id: 'stack',
            label: 'Call stack',
            description: 'Runs sync code to completion',
            tone: 'primary',
          },
          {
            id: 'micro',
            label: 'Microtasks',
            description: 'process.nextTick, then Promises',
            tone: 'secondary',
          },
          {
            id: 'timers',
            label: 'Timers phase',
            description: 'setTimeout / setInterval',
            tone: 'neutral',
          },
          { id: 'poll', label: 'Poll phase', description: 'I/O callbacks', tone: 'neutral' },
          { id: 'check', label: 'Check phase', description: 'setImmediate', tone: 'neutral' },
        ],
        edges: [
          { from: 'stack', to: 'micro', label: 'stack empty' },
          { from: 'micro', to: 'timers' },
          { from: 'timers', to: 'poll' },
          { from: 'poll', to: 'check' },
        ],
        caption: 'Microtask queues are drained after every callback, before the loop moves on.',
      },
      { id: 'order', type: 'heading', text: 'Predict the output' },
      {
        id: 'code-order',
        type: 'code',
        language: 'javascript',
        filename: 'order.js',
        code: "console.log('A: sync');\nsetTimeout(() => console.log('timeout'), 0);\nsetImmediate(() => console.log('immediate'));\nPromise.resolve().then(() => console.log('C: promise'));\nprocess.nextTick(() => console.log('B: nextTick'));\nconsole.log('A2: sync');\n\n// A: sync\n// A2: sync\n// B: nextTick\n// C: promise\n// then 'timeout' and 'immediate' (their relative order can vary in the main module)",
      },
      {
        id: 'info-order',
        type: 'callout',
        variant: 'info',
        text: 'Inside an I/O callback, setImmediate always fires before a 0ms setTimeout. From the main module the order depends on process timing, so never rely on it.',
      },
      { id: 'blocking', type: 'heading', text: "Don't block the loop" },
      {
        id: 'p-blocking',
        type: 'paragraph',
        text: 'While a long synchronous loop runs, no other request can be served. Move CPU-heavy work to `worker_threads`, a job queue, or a separate service.',
      },
      {
        id: 'code-block',
        type: 'code',
        language: 'javascript',
        code: "import { createServer } from 'node:http';\n\ncreateServer((req, res) => {\n  if (req.url === '/slow') {\n    const end = Date.now() + 5000;\n    while (Date.now() < end) {} // blocks EVERY request for 5s\n  }\n  res.end('ok');\n}).listen(3000);",
      },
      {
        id: 'quiz',
        type: 'quiz',
        question: 'After synchronous code finishes, which callback runs first?',
        options: [
          { id: 'tick', text: 'process.nextTick' },
          { id: 'promise', text: 'Promise.then' },
          { id: 'timeout', text: 'setTimeout(fn, 0)' },
        ],
        correctOptionIds: ['tick'],
        explanation:
          'The nextTick queue is drained before the Promise microtask queue, and both run before any timer.',
      },
    ],
  },
  {
    slug: 'docker-basics-hinglish',
    title: 'Docker basics: Container kya hota hai?',
    summary:
      '"Mere machine pe toh chal raha tha" problem ka solution. Image vs container, pehla container run karna, aur zaroori commands.',
    technology: 'docker',
    tags: ['docker', 'containers', 'devops'],
    difficulty: 'beginner',
    language: 'hinglish',
    blocks: [
      { id: 'problem', type: 'heading', text: 'Problem kya hai?' },
      {
        id: 'p-problem',
        type: 'paragraph',
        text: 'Tumhare laptop pe Node 22 hai, teammate ke paas Node 18, aur server pe kuch aur. Docker app ko uski saari dependencies ke saath ek **image** mein pack kar deta hai, jo har jagah same chalti hai.',
      },
      {
        id: 'diagram',
        type: 'diagram',
        title: 'Image se container tak',
        direction: 'horizontal',
        nodes: [
          { id: 'dockerfile', label: 'Dockerfile', description: 'Recipe', tone: 'neutral' },
          { id: 'image', label: 'Image', description: 'Read-only template', tone: 'secondary' },
          { id: 'container', label: 'Container', description: 'Running instance', tone: 'success' },
        ],
        edges: [
          { from: 'dockerfile', to: 'image', label: 'docker build' },
          { from: 'image', to: 'container', label: 'docker run' },
        ],
      },
      {
        id: 'p-analogy',
        type: 'paragraph',
        text: 'Analogy: **image** ek class jaisi hai aur **container** uska object. Ek image se tum jitne chaaho utne containers bana sakte ho.',
      },
      { id: 'first', type: 'heading', text: 'Pehla container chalao' },
      {
        id: 'code-run',
        type: 'code',
        language: 'bash',
        code: '# nginx web server background mein chalao, port 8080 pe\ndocker run -d -p 8080:80 --name web nginx:alpine\n\ndocker ps            # running containers dekho\ndocker logs web      # logs dekho\ndocker exec -it web sh   # container ke andar shell kholo\ndocker stop web && docker rm web',
      },
      {
        id: 'info-ports',
        type: 'callout',
        variant: 'info',
        title: '-p 8080:80 ka matlab',
        text: 'Left side tumhari machine ka port hai, right side container ka. Browser mein http://localhost:8080 kholo, request container ke port 80 tak jayegi.',
      },
      {
        id: 'warn-data',
        type: 'callout',
        variant: 'warning',
        text: 'Container delete karte hi uske andar ka data bhi chala jata hai. Database jaisi cheezon ke liye volumes use karo: docker run -v mongo-data:/data/db mongo:7',
      },
      {
        id: 'quiz',
        type: 'quiz',
        question: 'Ek image se kitne containers bana sakte hain?',
        options: [
          { id: 'one', text: 'Sirf ek' },
          { id: 'many', text: 'Jitne chaaho' },
          { id: 'two', text: 'Maximum do' },
        ],
        correctOptionIds: ['many'],
        explanation:
          'Image ek template hai. Har docker run ek naya, isolated container banata hai.',
      },
    ],
  },
  {
    slug: 'dockerize-node-app',
    title: 'Dockerize a Node.js app the right way',
    summary:
      'A small, secure production image: multi-stage builds, layer caching, a non-root user, .dockerignore and Docker Compose with MongoDB.',
    technology: 'docker',
    tags: ['docker', 'nodejs', 'compose'],
    difficulty: 'intermediate',
    language: 'en',
    blocks: [
      { id: 'layers', type: 'heading', text: 'Order layers for caching' },
      {
        id: 'p-layers',
        type: 'paragraph',
        text: 'Each Dockerfile instruction creates a cached layer. Copy `package*.json` and install dependencies **before** copying source code, so editing a file does not reinstall every package.',
      },
      {
        id: 'code-dockerfile',
        type: 'code',
        language: 'dockerfile',
        filename: 'Dockerfile',
        code: 'FROM node:22-alpine AS deps\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]',
      },
      {
        id: 'tip-root',
        type: 'callout',
        variant: 'tip',
        title: 'Run as non-root',
        text: 'The official Node images ship a "node" user. USER node limits the damage if your app is ever compromised.',
      },
      {
        id: 'code-ignore',
        type: 'code',
        language: 'text',
        filename: '.dockerignore',
        code: 'node_modules\nnpm-debug.log\n.env\n.git\ncoverage',
      },
      {
        id: 'warn-env',
        type: 'callout',
        variant: 'warning',
        text: 'Never bake secrets into an image. Anyone who can pull the image can read them. Pass them at runtime with environment variables or a secrets manager.',
      },
      { id: 'compose', type: 'heading', text: 'Add MongoDB with Compose' },
      {
        id: 'code-compose',
        type: 'code',
        language: 'yaml',
        filename: 'compose.yaml',
        code: 'services:\n  api:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      MONGODB_URI: mongodb://mongo:27017/app\n    depends_on:\n      - mongo\n  mongo:\n    image: mongo:7\n    volumes:\n      - mongo-data:/data/db\nvolumes:\n  mongo-data:',
      },
      {
        id: 'p-dns',
        type: 'paragraph',
        text: 'Inside the Compose network, services reach each other by service name, so the API connects to `mongo:27017`, not `localhost`.',
      },
      {
        id: 'quiz',
        type: 'quiz',
        question: 'Why copy package.json before the rest of the source code?',
        options: [
          { id: 'a', text: 'npm requires it to be first' },
          { id: 'b', text: 'So the dependency layer stays cached when only source files change' },
          { id: 'c', text: 'It makes the image run as non-root' },
        ],
        correctOptionIds: ['b'],
        explanation:
          'Docker reuses cached layers until an input changes. Dependencies change rarely, so installing them first saves minutes per build.',
      },
    ],
  },
  {
    slug: 'kubernetes-pods-deployments-services',
    title: 'Kubernetes: Pods, Deployments and Services',
    summary:
      'The three objects you need to run a stateless app on Kubernetes, with a working manifest and the kubectl commands to apply and scale it.',
    technology: 'kubernetes',
    tags: ['kubernetes', 'k8s', 'devops'],
    difficulty: 'intermediate',
    language: 'en',
    blocks: [
      {
        id: 'logo',
        type: 'image',
        url: 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
        alt: 'Kubernetes logo, a blue heptagon with a white ship wheel',
        caption: 'Kubernetes (K8s) orchestrates containers across a cluster of machines.',
        aspectRatio: 1,
      },
      { id: 'objects', type: 'heading', text: 'The core objects' },
      {
        id: 'p-objects',
        type: 'paragraph',
        text: 'A **Pod** wraps one or more containers that share a network. A **Deployment** keeps the desired number of Pod replicas running and handles rolling updates. A **Service** gives those changing Pods one stable address.',
      },
      {
        id: 'diagram',
        type: 'diagram',
        title: 'Traffic to your app',
        direction: 'vertical',
        nodes: [
          {
            id: 'svc',
            label: 'Service: api',
            description: 'Stable DNS + load balancing',
            tone: 'primary',
          },
          { id: 'deploy', label: 'Deployment: api', description: 'replicas: 3', tone: 'secondary' },
          {
            id: 'pods',
            label: '3 × Pod',
            description: 'Containers from your image',
            tone: 'success',
          },
        ],
        edges: [
          { from: 'svc', to: 'pods', label: 'selects app=api' },
          { from: 'deploy', to: 'pods', label: 'creates / replaces' },
        ],
      },
      {
        id: 'code-manifest',
        type: 'code',
        language: 'yaml',
        filename: 'api.yaml',
        code: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: api\n  template:\n    metadata:\n      labels:\n        app: api\n    spec:\n      containers:\n        - name: api\n          image: ghcr.io/example/api:1.0.0\n          ports:\n            - containerPort: 3000\n          readinessProbe:\n            httpGet:\n              path: /health\n              port: 3000\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: api\nspec:\n  selector:\n    app: api\n  ports:\n    - port: 80\n      targetPort: 3000',
      },
      {
        id: 'code-kubectl',
        type: 'code',
        language: 'bash',
        code: 'kubectl apply -f api.yaml\nkubectl get pods -l app=api\nkubectl scale deployment api --replicas=5\nkubectl rollout status deployment/api',
      },
      {
        id: 'tip-probe',
        type: 'callout',
        variant: 'tip',
        title: 'Readiness probes',
        text: 'A Service only sends traffic to Pods whose readiness probe passes, so new Pods during a rollout do not receive requests before they are ready.',
      },
      {
        id: 'quiz',
        type: 'quiz',
        question: 'Which object gives a set of Pods a stable network address?',
        options: [
          { id: 'svc', text: 'Service' },
          { id: 'deploy', text: 'Deployment' },
          { id: 'pod', text: 'Pod' },
        ],
        correctOptionIds: ['svc'],
        explanation:
          'Pods come and go with new IPs. A Service selects Pods by label and provides a stable virtual IP and DNS name.',
      },
    ],
  },
];
