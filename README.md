# FlexBox Trainer

## 1. Описание проекта

**FlexBox Trainer** — тренажер по FlexBox верстке.  
Пользователь получает случайную задачу с flex-контейнером и несколькими дочерними блоками, пишет решение и сразу видит оценку, насколько результат совпадает с эталоном.

Задачи можно решать в двух режимах:
- `html`
- `tsx + TailwindCSS`

Также реализована система аккаунтов, история решения задач и статистика по ним.

---

## 2. Стек

### Frontend (UI + клиентская логика)
- **React 19** — компоненты, состояние, эффекты.
- **TypeScript** — типизация API, моделей задач и UI-состояний.
- **Vite 8** — dev-server, hot reload, production build.
- **Tailwind CSS 4** — стили и layout.
- **Monaco Editor (CDN)** — редактор кода в режиме `html/tsx`.
- **html2canvas (CDN)** — снимок рендера для сравнения решения.

### Backend (API + бизнес-логика)
- **Node.js (ESM)** — runtime.
- **Express 5** — HTTP API и роутинг.
- **pg** — подключение к PostgreSQL и SQL-запросы.
- **crypto (Node built-in)** — scrypt для паролей, sha256 для session token hash.

### Данные и хранение
- **PostgreSQL**:
  - пользователи и профили;
  - сессии;
  - задачи;
  - попытки и статистика.
- **JSONB** для хранения `task_config`.
- **Cookie-based sessions** (`HttpOnly`, `SameSite=Lax`, `Secure` в production).


### Инфраструктурные детали
- В dev-режиме фронт проксирует `/api` на backend.
- Миграции схемы выполняются автоматически в `initDb()` при старте backend.

---

## 3. Структура репозитория

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

## 4. Как работает приложение в целом

1. Frontend запрашивает задачу.
2. Backend генерирует конфигурацию задачи.
3. Пользователь пишет код и нажимает `Check`.
4. Frontend сравнивает эталон и решение (через пиксельное сравнение).
5. Результат отправляется в backend.
6. Backend сохраняет попытку и отдает данные для истории и статистики.

---

## 5. Backend

## 5.1 Инициализация

- `server.js` поднимает сервер и вызывает `initDb()`.
- `createApp.js` подключает middleware и роуты:
  - `/api/auth`
  - `/api/users`
  - `/api/tasks`

Есть health-check:
- `GET /api/health`

## 5.2 Аутентификация

- Пароли хранятся в виде `salt + scrypt hash`.
- Сессии хранятся в таблице `sessions`.
- В cookie хранится токен сессии (`HttpOnly`, `SameSite=Lax`).
- В production добавляется `Secure`.

## 5.3 База данных

Основные таблицы:
- `users`
- `sessions`
- `tasks`
- `attempts`

### Схема БД

#### `users`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | `bigserial` | PK |
| `email` | `text unique` | логин |
| `password_hash` | `text` | хеш пароля |
| `nickname` | `text` | отображаемое имя |
| `country_code` | `text` | код страны (ISO-2) |
| `workplace` | `text` | место работы/контекст |
| `avatar_variant` | `smallint` | индекс градиентного аватара |
| `avatar_image_data` | `text` | кастомный png/jpg data URL |
| `created_at` | `timestamptz` | дата создания |

#### `sessions`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `bigint` | FK -> `users.id` |
| `token_hash` | `text unique` | sha256 хеш токена |
| `created_at` | `timestamptz` | дата создания |
| `expires_at` | `timestamptz` | срок действия |

#### `tasks`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | `bigserial` | PK |
| `created_by` | `bigint` | FK -> `users.id` (nullable) |
| `task_config` | `jsonb` | полная конфигурация задачи |
| `created_at` | `timestamptz` | дата создания |

#### `attempts`
| Поле | Тип | Назначение |
|---|---|---|
| `id` | `bigserial` | PK |
| `user_id` | `bigint` | FK -> `users.id` |
| `task_id` | `bigint` | FK -> `tasks.id` |
| `score` | `integer` | 0..100 |
| `code` | `text` | последнее решение |
| `editor_mode` | `text` | `html` / `tsx` |
| `created_at` | `timestamptz` | время последней попытки |

Индексы:
- `idx_sessions_user_id`
- `idx_sessions_expires_at`
- `idx_attempts_user_id`
- `idx_attempts_task_id`
- `uq_attempts_user_task` (уникальный на `(user_id, task_id)`)

В `users` есть профильные поля:
- `nickname`
- `country_code`
- `workplace`
- `avatar_variant`
- `avatar_image_data`

В `attempts` хранится:
- `score`
- `code`
- `editor_mode` (`html`/`tsx`)
- `created_at`

На `(user_id, task_id)` есть уникальный индекс: у пользователя по задаче хранится одна актуальная попытка.

## 5.4 Генератор задач

`backend/src/generator.js`:
- создает контейнер и 2–5 блоков;
- случайно выбирает:
  - `flexDirection`
  - `justifyContent`
  - `alignItems`
  - gap mode (auto/fixed);
- задает размеры, цвета, радиусы, границы;
- может добавить текст или SVG-иконку.

Генератор учитывает ограничение размеров контейнера, чтобы задача помещалась в доступную область.

## 5.5 Роуты задач

- `POST /api/tasks/generate`
  - возвращает `task`;
  - в БД пока не пишет.

- `POST /api/tasks/attempts`
  - используется для первой попытки новой задачи;
  - сначала создает `tasks` запись, потом `attempts`.

- `POST /api/tasks/:id/attempts`
  - обновляет попытку пользователя по этой задаче (upsert).

- `GET /api/tasks/:id`
  - возвращает конфигурацию задачи по ID.

## 5.6 Профиль, история, статистика

- `PATCH /api/users/:id/profile`
  - обновляет профиль пользователя.

- `GET /api/users/:id/history`
  - отдает список задач с лучшим score и последней попыткой.

- `GET /api/users/:id/stats`
  - отдает агрегированную статистику, daily activity и heatmap.

---

## 6. Frontend

## 6.1 Приложение и навигация

`App.tsx`:
- управляет 3 состояниями: `auth`, `tasks`, `profile`;
- поддерживает URL профиля (`/profile`, `/profile/:id`);
- обрабатывает `popstate` (back/forward);
- показывает toast-уведомления.

## 6.2 Страница задач

`MainPage.tsx`:
- берет сохраненное состояние из `localStorage`;
- если задачи нет — запрашивает новую;
- показывает:
  - target preview;
  - редактор кода;
  - результат проверки;
  - список SVG imports.

При `Check`:
1. проверяется соответствие синтаксиса выбранному режиму (`html/tsx`);
2. запускается visual compare;
3. отправляется попытка в backend.

## 6.3 Редактор

`components/Editor.tsx`:
- Monaco Editor из CDN;
- переключатель режима `HTML` / `TSX`;
- реакция на изменение кода.

## 6.4 Страница профиля

`ProfilePage.tsx`:
- вкладки:
  - History
  - Statistics
- редактирование профиля:
  - ник
  - страна
  - место работы
  - стиль аватара
  - загрузка PNG/JPG аватара
- история попыток:
  - task id
  - тема
  - mode
  - статус/score
  - дата
- статистика:
  - status distribution (donut)
  - status mix
  - daily checks (heatmap)
  - KPI карточки

---

## 7. Сравнение решения

Файлы:
- `frontend/src/pages/MainPage/previewDoc.ts`
- `frontend/src/utils/pixelCompare.ts`

Идея:
- строится эталонный HTML;
- строится пользовательский HTML;
- оба варианта рендерятся в скрытых iframe;
- делается снимок `html2canvas`;
- сравниваются пиксели;
- возвращается score от 0 до 100.

---

## 8. Текущая логика хранения попыток

- Генерация задачи сама по себе не создает запись в БД.
- Задача попадает в `tasks` только когда пользователь нажал `Check`.
- Для пары `(user, task)` в `attempts` хранится одна запись:
  - при следующем `Check` она перезаписывается.

Это уменьшает объем данных и упрощает статистику.

---

## 9. Основные API (кратко)

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

## 10. Локальный запуск

## Backend
1. Создать `backend/.env`:
   - `DATABASE_URL=...`
   - `NODE_ENV=development`
2. Установить зависимости:
   - `cd backend && npm install`
3. Запуск:
   - `npm run dev`

## Frontend
1. Установить зависимости:
   - `cd frontend && npm install`
2. Запуск:
   - `npm run dev`

Vite проксирует `/api` на `http://localhost:3001`.

---

