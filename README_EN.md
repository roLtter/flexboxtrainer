# FlexBox Trainer

## 1. Project overview

**FlexBox Trainer** is a Flexbox layout trainer.  
The user gets a random exercise with a flex container and several child blocks, writes a solution, and immediately sees how closely the result matches the reference.

Tasks can be solved in two modes:
- `html`
- `tsx + TailwindCSS`

The app also includes accounts, a history of attempts, and statistics.

---

## 2. Stack

### Frontend (UI + client logic)
- **React 19** — components, state, effects.
- **TypeScript** — typing for APIs, task models, and UI state.
- **Vite 8** — dev server, hot reload, production build.
- **Tailwind CSS 4** — styles and layout.
- **Monaco Editor (CDN)** — code editor in `html/tsx` mode.
- **html2canvas (CDN)** — render snapshot for comparing solutions.

### Backend (API + business logic)
- **Node.js (ESM)** — runtime.
- **Express 5** — HTTP API and routing.
- **pg** — PostgreSQL connection and SQL queries.
- **crypto (Node built-in)** — scrypt for passwords, sha256 for session token hashes.

### Data and storage
- **PostgreSQL**:
  - users and profiles;
  - sessions;
  - tasks;
  - attempts and statistics.
- **JSONB** for storing `task_config`.
- **Cookie-based sessions** (`HttpOnly`, `SameSite=Lax`, `Secure` in production).

### Infrastructure notes
- In development, the frontend proxies `/api` to the backend.
- Schema migrations run automatically in `initDb()` when the backend starts.

---

## 3. Repository layout

```text
csstrainer/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── createApp.js
│   │   ├── db.js
│   │   ├── auth.js
│   │   ├── generator.js
│   │   ├── middleware/
│   │   │   └── requireAuth.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── taskRoutes.js
│   │   │   └── userRoutes.js
│   │   └── services/
│   │       └── userStats.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── task.ts
│   │   │   └── history.ts
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── MainPage/
│   │   │       ├── MainPage.tsx
│   │   │       ├── previewDoc.ts
│   │   │       ├── storage.ts
│   │   │       ├── types.ts
│   │   │       └── components/
│   │   ├── components/
│   │   │   ├── Editor.tsx
│   │   │   ├── TargetRenderer.tsx
│   │   │   ├── SvgImportsPanel.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Tooltip.tsx
│   │   │   └── PreviewPanel.tsx
│   │   │   └── HtmlReference.tsx
│   │   └── utils/
│   │       ├── colors.ts
│   │       ├── generator.ts
│   │       ├── htmlBuilder.ts
│   │       ├── pixelCompare.ts
│   │       ├── svgIcons.ts
│   │       ├── taskCompare.ts
│   │       └── types.ts
│   └── package.json
├── README_EN.md
└── README.md
```

---

## 4. How the app works end to end

1. The frontend requests a task.
2. The backend generates the task configuration.
3. The user writes code and clicks `Check`.
4. The frontend compares the reference and the solution (pixel comparison).
5. The result is sent to the backend.
6. The backend stores the attempt and returns data for history and statistics.

---

## 5. Backend

## 5.1 Initialization

- `server.js` starts the server and calls `initDb()`.
- `createApp.js` wires middleware and routes:
  - `/api/auth`
  - `/api/users`
  - `/api/tasks`

Health check:
- `GET /api/health`

## 5.2 Authentication

- Passwords are stored as `salt + scrypt hash`.
- Sessions live in the `sessions` table.
- The session token is stored in a cookie (`HttpOnly`, `SameSite=Lax`).
- `Secure` is added in production.

## 5.3 Database

Main tables:
- `users`
- `sessions`
- `tasks`
- `attempts`

### Database schema

#### `users`
| Column | Type | Purpose |
|---|---|---|
| `id` | `bigserial` | PK |
| `email` | `text unique` | login |
| `password_hash` | `text` | password hash |
| `nickname` | `text` | display name |
| `country_code` | `text` | country code (ISO-2) |
| `workplace` | `text` | workplace / context |
| `avatar_variant` | `smallint` | gradient avatar index |
| `avatar_image_data` | `text` | custom png/jpg data URL |
| `created_at` | `timestamptz` | created at |

#### `sessions`
| Column | Type | Purpose |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `bigint` | FK -> `users.id` |
| `token_hash` | `text unique` | sha256 hash of the token |
| `created_at` | `timestamptz` | created at |
| `expires_at` | `timestamptz` | expiry |

#### `tasks`
| Column | Type | Purpose |
|---|---|---|
| `id` | `bigserial` | PK |
| `created_by` | `bigint` | FK -> `users.id` (nullable) |
| `task_config` | `jsonb` | full task configuration |
| `created_at` | `timestamptz` | created at |

#### `attempts`
| Column | Type | Purpose |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `bigint` | FK -> `users.id` |
| `task_id` | `bigint` | FK -> `tasks.id` |
| `score` | `integer` | 0..100 |
| `code` | `text` | latest solution |
| `editor_mode` | `text` | `html` / `tsx` |
| `created_at` | `timestamptz` | time of the latest attempt |

Indexes:
- `idx_sessions_user_id`
- `idx_sessions_expires_at`
- `idx_attempts_user_id`
- `idx_attempts_task_id`
- `uq_attempts_user_task` (unique on `(user_id, task_id)`)

`users` includes profile fields:
- `nickname`
- `country_code`
- `workplace`
- `avatar_variant`
- `avatar_image_data`

`attempts` stores:
- `score`
- `code`
- `editor_mode` (`html`/`tsx`)
- `created_at`

There is a unique index on `(user_id, task_id)`: one current attempt per user per task.

## 5.4 Task generator

`backend/src/generator.js`:
- creates a container and 2–5 blocks;
- randomly picks:
  - `flexDirection`
  - `justifyContent`
  - `alignItems`
  - gap mode (auto/fixed);
- sets sizes, colors, radii, borders;
- may add text or an SVG icon.

The generator respects container size limits so the task fits the available area.

## 5.5 Task routes

- `POST /api/tasks/generate`
  - returns a `task`;
  - does not write to the DB yet.

- `POST /api/tasks/attempts`
  - used for the first attempt on a new task;
  - creates a `tasks` row first, then `attempts`.

- `POST /api/tasks/:id/attempts`
  - updates the user’s attempt for that task (upsert).

- `GET /api/tasks/:id`
  - returns the task configuration by ID.

## 5.6 Profile, history, statistics

- `PATCH /api/users/:id/profile`
  - updates the user profile.

- `GET /api/users/:id/history`
  - returns tasks with best score and latest attempt.

- `GET /api/users/:id/stats`
  - returns aggregated statistics, daily activity, and heatmap.

---

## 6. Frontend

## 6.1 App shell and navigation

`App.tsx`:
- manages three areas: `auth`, `tasks`, `profile`;
- supports profile URLs (`/profile`, `/profile/:id`);
- handles `popstate` (back/forward);
- shows toast notifications.

## 6.2 Task page

`MainPage.tsx`:
- restores saved state from `localStorage`;
- if there is no task, requests a new one;
- shows:
  - target preview;
  - code editor;
  - check result;
  - SVG imports list.

On `Check`:
1. syntax is validated against the selected mode (`html/tsx`);
2. visual comparison runs;
3. the attempt is sent to the backend.

## 6.3 Editor

`components/Editor.tsx`:
- Monaco Editor from CDN;
- `HTML` / `TSX` mode toggle;
- reacts to code changes.

## 6.4 Profile page

`ProfilePage.tsx`:
- tabs:
  - History
  - Statistics
- profile editing:
  - nickname
  - country
  - workplace
  - avatar style
  - PNG/JPG avatar upload
- attempt history:
  - task id
  - theme
  - mode
  - status/score
  - date
- statistics:
  - status distribution (donut)
  - status mix
  - daily checks (heatmap)
  - KPI cards

---

## 7. Solution comparison

Files:
- `frontend/src/pages/MainPage/previewDoc.ts`
- `frontend/src/utils/pixelCompare.ts`

Approach:
- build reference HTML;
- build user HTML;
- render both in hidden iframes;
- capture with `html2canvas`;
- compare pixels;
- return a score from 0 to 100.

---

## 8. Current attempt storage behavior

- Generating a task does not create a DB row by itself.
- A task is inserted into `tasks` only after the user clicks `Check`.
- For each `(user, task)` pair, `attempts` holds one row:
  - the next `Check` overwrites it.

This reduces data volume and simplifies statistics.

---

## 9. Main API (short list)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Tasks
- `POST /api/tasks/generate`
- `POST /api/tasks/attempts`
- `POST /api/tasks/:id/attempts`
- `GET /api/tasks/:id`

### Users
- `PATCH /api/users/:id/profile`
- `GET /api/users/:id/history`
- `GET /api/users/:id/stats?activity=week|month|year`

---

## 10. Local development

## Backend
1. Create `backend/.env`:
   - `DATABASE_URL=...`
   - `NODE_ENV=development`
2. Install dependencies:
   - `cd backend && npm install`
3. Run:
   - `npm run dev`

## Frontend
1. Install dependencies:
   - `cd frontend && npm install`
2. Run:
   - `npm run dev`

Vite proxies `/api` to `http://localhost:3001`.

---
