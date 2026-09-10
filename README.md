# OpsBoard

A shared operating view for small delivery teams. Keep project ownership, task priorities, deadlines, and workload in one workspace, with a record of what changed and who moved it forward.

![OpsBoard dashboard](docs/screenshots/dashboard.png)

## What it does

- **Project delivery:** create and edit briefs, set owners and target dates, track completion from actual tasks, archive and restore workstreams, and delete projects with explicit confirmation.
- **Task management:** assign people, priorities, deadlines, estimates, and tags. Search, filter by project/status/ownership, sort, export the current view to CSV, and move tasks through delivery states.
- **Team visibility:** compare open estimated effort with each person's weekly capacity; workspace administrators can change roles.
- **Measured reporting:** created/completed task timelines, status and priority distributions, overdue work, and workload, calculated from the database. Charts include keyboard inspection and a tabular alternative.
- **Account boundaries:** authenticated sessions, CSRF protection, and server-enforced Admin, Manager, and Member permissions. Technical account provisioning is available in Django administration.
- **Responsive work:** persistent desktop navigation, a keyboard-accessible mobile drawer, native modal forms, reduced-motion support, and local font assets.

| Login | Project management |
| --- | --- |
| ![Login](docs/screenshots/login.png) | ![Projects](docs/screenshots/projects.png) |

| Project detail | Delivery analytics |
| --- | --- |
| ![Project detail](docs/screenshots/project-detail.png) | ![Analytics](docs/screenshots/analytics.png) |

[Mobile dashboard](docs/screenshots/mobile.png) · [Design decisions](DESIGN.md) · [QA evidence](docs/QA.md)

## Stack and architecture

React 19, React Router, Vite 8, layered CSS, and IBM Plex typography form the client. Django 5.2, Django REST Framework, and PostgreSQL form the application service. SQLite is the default for a native local checkout. Docker uses PostgreSQL 17, Gunicorn, and Nginx.

```text
Browser → Nginx / Vite development proxy
                 ├── React application
                 ├── /api/ → DRF views → permissions → serializers → ORM → PostgreSQL
                 └── /admin/ → Django administration
```

Models hold database invariants; serializers validate API input; permission classes define role boundaries; services calculate reporting data and record activity. Writes and their activity entries share database transactions. The frontend API helper sends same-origin cookies and obtains a fresh CSRF token before mutations. Authentication tokens are never stored in local storage.

## Run with Docker

Requires Docker Engine with Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

On PowerShell, use `Copy-Item .env.example .env` for the first command. Open [localhost:8081](http://localhost:8081). The backend applies migrations, collects Django admin assets, and seeds an empty demonstration workspace. Database and collected static files have persistent named volumes. PostgreSQL and the API are not exposed to the host; the web port binds to loopback.

`docker compose down` stops the application while preserving its database. Demo seeding never overwrites existing accounts or work.

## Run natively

Requires Python 3.12+ and Node.js 24 LTS. From the repository root:

```bash
python -m venv .venv
```

Activate with `source .venv/bin/activate` on macOS/Linux or `.venv\Scripts\Activate.ps1` on Windows, then:

```bash
python -m pip install -r requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8101
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open [127.0.0.1:5103](http://127.0.0.1:5103). Vite proxies `/api`, `/admin`, and `/static` to port 8101. Use the same hostname consistently so session and CSRF cookies remain same-origin.

OpsBoard uses `opsboard_sessionid` and `opsboard_csrftoken` cookies so it can run beside other local portfolio apps without overwriting their authentication cookies. Browser cookies share a hostname across ports; the application-specific names keep these values separate. Existing users sign in once again after updating from the default cookie names.

## Demo accounts

The empty-workspace seed creates six teammates, six projects, and 45 tasks, with dates relative to the seed run.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `demo-password` |
| Manager | `manager@example.com` | `demo-password` |
| Member | `member@example.com` | `demo-password` |

The admin demo also has access to [Django administration](http://127.0.0.1:5103/admin/). These credentials are for a local demonstration only. `seed_demo` refuses to run when `DJANGO_DEBUG=false` and leaves any nonempty workspace unchanged. `DEMO_PASSWORD` can override the seed password before its first run.

## Permissions

| Operation | Admin | Manager | Member |
| --- | --- | --- | --- |
| View projects, tasks, people, activity, analytics | Yes | Yes | Yes |
| Create/edit/archive/restore projects | Yes | Yes | No |
| Delete projects and their tasks | Yes | No | No |
| Create/edit/delete tasks | Yes | Yes | No |
| Change assigned task status | Yes | Yes | Own tasks |
| Change another person's workspace role | Yes | No | No |

Archived project tasks are read-only for all API users until the project is restored. Admins cannot change their own workspace role; superuser roles are managed in Django administration. A workspace Admin role does not grant Django staff or superuser privileges. Technical superusers have an effective Admin role in the application.

This is one shared workspace. Members can read team work; role restrictions apply to mutations rather than per-project secrecy.

## Configuration

`.env.example` documents Docker environment variables. Compose reads `.env`; native Django reads process environment variables, so export variables in your shell when running without Compose.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Optional native database URL, e.g. `postgres://user:password@localhost:5432/opsboard`. Defaults to local SQLite. Compose constructs this from its PostgreSQL settings. |
| `DJANGO_DEBUG` | Defaults to `true` for native development. Set `false` for deployment. |
| `DJANGO_SECRET_KEY` | Required outside development. Local development generates a private ignored `.local-secret` file. |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames. Include `127.0.0.1` for the backend container health check. |
| `CSRF_TRUSTED_ORIGINS` | Exact trusted frontend origins, including scheme and port. |
| `CORS_ALLOWED_ORIGINS` | Exact origins allowed for credentialed CORS. The delivered client uses same-origin requests. |
| `SEED_DEMO` | Container-only startup seeding switch; keep `false` outside demonstrations. |
| `WEB_PORT` | Loopback web port for Docker, default `8081`. |
| `LOG_LEVEL` | Application console log level, default `INFO`. |

## Deployment

1. Create a dedicated `.env` with unique URL-safe database credentials and a strong `DJANGO_SECRET_KEY`. Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
2. Set `DJANGO_DEBUG=false`, `SEED_DEMO=false`, `ALLOWED_HOSTS=your-domain.example,127.0.0.1,backend`, and both origin variables to your exact `https://your-domain.example` origin.
3. Start with `docker compose -f compose.yaml -f compose.production.yaml up -d --build`.
4. Provision the first operator with `docker compose exec backend python manage.py createsuperuser`.
5. Put an HTTPS ingress in front of `127.0.0.1:8081`; enforce HTTPS redirects and HSTS there. Keep this HTTP upstream private. Secure session/CSRF cookies are enabled when debug is off. Nginx serves the built React app and preserves API/admin routes.
6. Configure PostgreSQL backups, restore drills, monitoring, and a deployment-specific request-rate limit at the ingress. Use a shared cache for Django login throttling if running more than one process or replica; the default process-local throttle is a basic development safeguard.

Run migrations as a dedicated release step if scaling beyond the supplied single backend container. Container images and PostgreSQL service execution are configured and covered by CI jobs; the original local verification environment did not have a Docker daemon. See [QA notes](docs/QA.md) for what was actually executed.

## Verification

The recorded local release checks passed **24 backend tests**, an **8-test browser release suite**, and a focused browser regression for cookie coexistence. Coverage includes role boundaries, real CRUD, technical administration, and four responsive widths. Six core screens produced no automated axe violations. See [QA evidence](docs/QA.md) for exact commands, 41 screenshots, and verification limits.

With the Python environment activated:

```bash
ruff check backend
ruff format --check backend
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test operations
```

Frontend:

```bash
cd frontend
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests require the seeded API at `127.0.0.1:8101` and the Vite app at `127.0.0.1:5103`. Run them against a dedicated demo database: they exercise real writes, restore changed demo roles/statuses, and delete their temporary project on success. A failed run may leave its clearly named test project. `E2E_BASE_URL` overrides the UI URL; `PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an installed Chromium binary.

GitHub Actions checks Python lint, migration consistency and API tests against PostgreSQL; checks frontend formatting, lint and production build; runs the browser suite; uploads browser evidence; and builds both containers.

## Project structure

```text
backend/
  config/                 Environment, Django URLs, WSGI
  operations/
    models.py              Users, projects, tasks, activity
    permissions.py         Mutation boundaries by role
    serializers.py         Validation and API representation
    services.py            Database analytics and activity
    views.py / urls.py     REST and session endpoints
    migrations/           Versioned database schema
    management/commands/  Repeat-safe demo seed
    tests.py               API, security-boundary and seed tests
frontend/
  src/                    React pages, shared components, modal editor, API helper
  tests/                  Playwright critical flows and axe accessibility checks
deploy/                   Nginx and container startup
docs/screenshots/         Captured running application screens
.github/workflows/         CI, PostgreSQL checks and container builds
```

[API reference](docs/API.md) · [Credits and licenses](CREDITS.md) · [MIT license](LICENSE)

## Scope

The application is designed for a small shared team. It loads the workspace into memory for immediate client filtering; server pagination, background exports, SSO, invitations, file attachments, notifications, and concurrent-edit conflict detection are outside this release. Analytics describe the current database, not an immutable audit warehouse. Workload compares all open estimates with weekly capacity and is explicitly a planning signal rather than a time-tracking metric.
