# TechCapsule.dev

Mobile-first learning platform for developers: bite-sized lessons on MCP, RAG, AI agents,
OpenAI tool calling, Node.js, Docker, Kubernetes and React — in English and Hinglish. Free;
there are no payments.

| Workspace            | What it is                                                   |
| -------------------- | ------------------------------------------------------------ |
| `apps/api`           | Node + Express 5 + MongoDB (Mongoose) REST API at `/api/v1`  |
| `apps/mobile`        | Expo SDK 58 / React Native learner app                       |
| `apps/admin`         | React 19 + Vite admin panel (content, moderation, audit log) |
| `packages/contracts` | Zod schemas and DTO types shared by all apps                 |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, security model and the
Phase 2 (AI) boundary.

## Requirements

- **Node.js 22.13+** (22 LTS or 24 LTS). Older Node 22 releases install with engine warnings
  and **break Vite 8**: npm silently skips its native Rolldown binding, so the admin build and
  the Vitest runs fail with `Cannot find native binding`. If that happens, upgrade Node, delete
  `node_modules` and run `npm install` again.
- npm 10+
- MongoDB 7+ — either Docker (`docker compose up -d`) or a local MongoDB Community Server.
- For mobile: the Expo Go app (SDK 58) on a phone, or Android Studio (emulator) / Xcode
  (iOS simulator, macOS only).

## Quick start

```bash
# 1. Install everything (also builds packages/contracts)
npm install

# 2. Start MongoDB (skip if you already run mongod locally on 27017)
docker compose up -d

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
#    then set JWT_ACCESS_SECRET and AUTH_CODE_SECRET to long random values:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 4. Seed sample content (idempotent; safe to re-run)
npm run seed

# 5. Create an admin account (password is prompted, never stored in shell history)
npm run create-admin -w @techcapsule/api -- you@example.com

# 6. Run the apps (separate terminals)
npm run dev:api      # http://localhost:4000  (docs: http://localhost:4000/api/docs)
npm run dev:admin    # http://localhost:5173
npm run dev:mobile   # Expo dev server — scan the QR code with Expo Go
```

The seed can also create an admin: set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in
`apps/api/.env` before `npm run seed`.

### Windows (PowerShell)

Everything above works in PowerShell with two substitutions:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

- Install Node from [nodejs.org](https://nodejs.org) (LTS) and either
  [Docker Desktop](https://www.docker.com/products/docker-desktop/) or
  [MongoDB Community Server](https://www.mongodb.com/try/download/community).
- `argon2` ships prebuilt binaries for Windows x64; if `npm install` tries to compile it, install
  the "Desktop development with C++" workload from Visual Studio Build Tools.
- For a physical phone, allow Node.js through Windows Defender Firewall on **private**
  networks (ports 4000 for the API and 8081 for Metro), and keep the phone on the same Wi-Fi.
- The repo enforces LF line endings via `.gitattributes`; no `core.autocrlf` changes needed.

## Connecting the mobile app to the API

The app resolves the API URL in this order:

1. `EXPO_PUBLIC_API_URL` (copy `apps/mobile/.env.example` to `apps/mobile/.env.local`)
2. The LAN IP of the machine running Metro, port 4000 — works automatically with Expo Go on a
   phone on the same network
3. `http://10.0.2.2:4000/api/v1` on the Android emulator, `http://localhost:4000/api/v1` on the
   iOS simulator

| Where the app runs | API URL                                     |
| ------------------ | ------------------------------------------- |
| Android emulator   | `http://10.0.2.2:4000/api/v1`               |
| iOS simulator      | `http://localhost:4000/api/v1`              |
| Physical device    | `http://<your-computer-LAN-IP>:4000/api/v1` |

The API listens on `0.0.0.0` so devices on your LAN can reach it. If the app shows
"Can't reach TechCapsule", it displays the URL it tried — check that the API is running and
that the firewall allows port 4000. `EXPO_PUBLIC_*` values are bundled into the app, so never
put secrets there.

## Email in development

With `EMAIL_PROVIDER=log` (the default in `.env.example`) **no email is sent**. Verification
and password-reset codes are printed in the API console and listed at
`GET http://localhost:4000/api/v1/dev/emails` (development only; the route does not exist in
production). The mobile app says so explicitly instead of pretending an email was delivered.

To send real email set `EMAIL_PROVIDER=smtp` (any SMTP provider) or `EMAIL_PROVIDER=resend`
with the matching credentials. The API refuses to start in production with `EMAIL_PROVIDER=log`.

## Scripts

Run from the repository root:

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run lint`         | ESLint for all workspaces                                           |
| `npm run format:check` | Prettier check (`npm run format` to fix)                            |
| `npm run typecheck`    | TypeScript in every workspace                                       |
| `npm test`             | Contracts + API (Vitest/Supertest) + admin (Vitest) + mobile (Jest) |
| `npm run build`        | Build contracts, API and admin                                      |
| `npm run seed`         | Idempotent sample content                                           |

API tests start an in-memory MongoDB (downloaded on first run). To reuse a local binary set
`MONGOMS_SYSTEM_BINARY=/path/to/mongod`, or point at a running server with
`MONGODB_TEST_URI=mongodb://127.0.0.1:27017` (tests use separate `techcapsule_test_*` databases).

## Security notes

- Secrets live only in `apps/api/.env` (git-ignored). The mobile app and admin bundle contain no
  secrets.
- Users can never choose a role at registration; admin routes re-check the role in MongoDB.
- Mobile stores only the refresh token, in Expo SecureStore; the access token stays in memory.
  The admin panel uses an httpOnly cookie and keeps the access token in memory.
- Lesson content is rendered as text — no HTML, no executable code. Quiz answer keys never reach
  a client before it submits an answer. Drafts are invisible to public APIs.

## Status

Phase 1 (this repository) is complete for local development. Not yet done / not verified:

- No real email provider is configured — supply SMTP or Resend credentials to send mail.
- The mobile app has been type-checked, unit-tested and bundled for Android, but not yet
  exercised on a physical device or simulator in this environment.
- AI features (RAG with a vector store, OpenAI, MCP servers, Tavily) are Phase 2; only the
  indexing outbox and chunker exist.
