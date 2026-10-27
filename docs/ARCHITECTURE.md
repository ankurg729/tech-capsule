# TechCapsule architecture

## Layout

```
apps/api         Express 5 + Mongoose modular monolith (REST, /api/v1)
apps/mobile      Expo SDK 58 + Expo Router learner app
apps/admin       React 19 + Vite admin panel
packages/contracts  Zod schemas + DTO types shared by all three apps
```

`@techcapsule/contracts` is the single source of truth for request validation. The API parses
every body/query/param with these schemas; the mobile app and admin panel run the same schemas
locally for instant form feedback. DTO interfaces describe every response.

## API

Each folder in `apps/api/src/modules/*` owns its model, service, controller and routes:

| Layer      | Responsibility                                                          |
| ---------- | ----------------------------------------------------------------------- |
| routes     | URL + middleware (auth, role, verified email, rate limits)              |
| controller | `validated({ body, query, params }, handler)` → call service → envelope |
| service    | All business rules and database access                                  |
| mapper     | Document → DTO (strips internal fields such as quiz answer keys)        |

Responses use envelopes: `{ data }`, `{ data, meta }` for pages, and
`{ error: { code, message, details?, requestId } }` for failures. OpenAPI is generated from
the same Zod schemas at `/api/docs`.

### Auth

- Passwords: Argon2id. Registration has no `role` field; admins are created only by
  `npm run create-admin` or the seed.
- Access tokens: short-lived JWT (15 min default). Role checks on admin routes re-read the user
  from MongoDB, so demotion or suspension is immediate.
- Refresh tokens: random, stored as SHA-256 hashes, rotated on every use. Reusing a rotated
  token revokes the whole session family (theft detection).
- Mobile keeps the refresh token in Expo SecureStore and the access token in memory only.
- The admin panel sends `X-Client: web`; the API then sets the refresh token as an httpOnly,
  `SameSite=Strict` cookie scoped to `/api/v1/auth` and only accepts that cookie when the header
  is present (a custom header cannot be sent cross-site without a CORS preflight).
- Login, registration, password reset and verification endpoints are rate limited. Password
  reset responses never reveal whether an account exists.

### Content safety

Lessons are typed blocks (heading, paragraph, code, image, diagram, callout, quiz). No block
carries HTML; paragraph text supports only `**bold**` and `` `code` ``, and every client renders
it as plain text nodes. Quiz answer keys are removed by `toPublicBlock` before any learner
response and are only returned by `POST /lessons/:id/quiz/:blockId/answer` after submission.
Public lesson, path and news queries always filter on `status: 'published'`.

## Phase 2 boundary (AI features)

Phase 1 deliberately ships **no** ChromaDB, OpenAI, MCP server or Tavily integration. The seam
for them already exists:

1. **Outbox.** Every publish, content edit of a published lesson, unpublish and archive writes a
   `ContentIndexJob` (`lessonId`, `contentVersion`, `operation: upsert | delete`, `status`). The
   write is idempotent per version and never blocks publishing.
2. **Chunking.** `buildLessonIndexDocuments()` (`modules/lessons/lessonIndexing.ts`) turns a
   lesson into heading-delimited chunks with metadata (language, technology, section, block ids,
   deep link). Quiz answer keys are excluded.
3. **Phase 2 worker** (not implemented): a separate process polls pending jobs, embeds the chunks,
   upserts/deletes them in the vector store, and marks jobs done. It should talk to MongoDB
   through a read-only, least-privilege user, and AI tools (MCP servers, agents) should call
   narrow API endpoints rather than receive database credentials.

## Mobile

- Expo Router file routes in `src/app`; `Stack.Protected` gates signed-in screens.
- TanStack Query for server state; a tiny `useSyncExternalStore` store holds the session.
- The API base URL comes from `EXPO_PUBLIC_API_URL`, else the Metro host's LAN IP, else
  `10.0.2.2` (Android emulator) / `localhost` (iOS simulator).
- Reading progress is saved from scroll position (capped at 95%; only "Mark complete" sets 100%).

## Admin

- React Router data router, TanStack Query, plain CSS.
- Vite proxies `/api` to the API so the browser sees a single origin (needed for the
  `SameSite=Strict` cookie). The UI gate is convenience only — every admin endpoint is protected
  by `requireAuth` + `requireRole('admin')` on the server, and every write is audit-logged.
