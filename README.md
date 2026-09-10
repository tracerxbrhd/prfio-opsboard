# OpsBoard

OpsBoard is a shared delivery workspace for small teams that need one place to track projects, tasks, ownership, deadlines, capacity and recent changes.

![OpsBoard dashboard](docs/screenshots/dashboard.png)

The project is built around a simple operational question: **what is moving, what is at risk, and who has capacity to take the next piece of work?** Project progress, workload and reporting are derived from persisted task data rather than separate dashboard fixtures.

## Workspace model

OpsBoard connects four parts of delivery work:

- **Projects** hold the client/workstream context, owner, target date and delivery state. Progress is derived from their tasks.
- **Tasks** carry assignee, estimate, priority, tags, deadline and a four-stage delivery status.
- **People** have workspace roles and weekly capacity. Open estimated effort is compared with that capacity to expose workload pressure.
- **Activity** records meaningful project and task changes together with the actor that made them.

The seeded workspace contains six teammates, six projects and 45 tasks with dates relative to the seed run.

| Project detail | Delivery analytics |
| --- | --- |
| ![Project detail](docs/screenshots/project-detail.png) | ![Analytics](docs/screenshots/analytics.png) |

## Delivery workflow

Projects move through `planning`, `active`, `at_risk` and `completed`. Tasks move through `backlog`, `in_progress`, `in_review` and `done`.

Completing a task records its completion time; reopening it clears that timestamp. Archived projects preserve their history but make their tasks read-only until restored. Project completion percentages are calculated from current task state instead of being stored independently.

The dashboard and analytics views use the same database records as the workspace. They expose active delivery, overdue work, status and priority distributions, completion history and workload by teammate. Workload is deliberately a planning signal: unfinished estimated hours are compared with weekly capacity, not presented as time tracking.

## Roles and access

OpsBoard has three workspace roles:

| Capability | Admin | Manager | Member |
| --- | --- | --- | --- |
| Read workspace and reporting | Yes | Yes | Yes |
| Manage projects | Yes | Yes | No |
| Delete projects | Yes | No | No |
| Manage tasks | Yes | Yes | Own task status only |
| Change workspace roles | Yes | No | No |

Authorization is enforced by the API, not only by hidden interface controls. Django technical administration remains separate from the application role model.

See [Access control](docs/ACCESS_CONTROL.md) for the boundary rules and edge cases.

## Architecture

```text
Browser
  ↓
React / Vite
  ↓ same-origin /api
Django REST Framework
  ├─ permission policies
  ├─ serializers and validation
  ├─ delivery/reporting services
  └─ Django ORM
       ↓
    PostgreSQL
```

The frontend uses React 19 and React Router. Django 5.2 and Django REST Framework provide session authentication, authorization, validation and persistence. PostgreSQL 17 is used by the Compose stack; native development defaults to SQLite. Gunicorn and Nginx provide the container runtime.

Writes that also create activity records share database transactions. Reporting services use ORM annotations and conditional aggregation for project/workload data. Session credentials remain in HttpOnly cookies; unsafe requests require CSRF protection. OpsBoard uses application-specific session and CSRF cookie names so it can run beside other local portfolio applications on the same hostname.

The relational model and reporting semantics are documented in [Data model](docs/DATA_MODEL.md). Endpoint details are in the [API reference](docs/API.md).

## Run locally

### Docker

Requires Docker Engine with Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8081`. On an empty database the container applies migrations and seeds the demonstration workspace. PostgreSQL and the API remain inside the Compose network; the web service binds to loopback.

### Native development

Requires Python 3.12+ and Node.js 24.

```bash
python -m venv .venv
# activate the environment, then:
python -m pip install -r requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8101
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5103` and use the same hostname consistently so the session and CSRF cookies stay same-origin.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `demo-password` |
| Manager | `manager@example.com` | `demo-password` |
| Member | `member@example.com` | `demo-password` |

These credentials are only for the seeded local workspace. Demo seeding refuses to run with `DJANGO_DEBUG=false` and does not overwrite a non-empty workspace.

## Development checks

Backend:

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

The browser suite exercises authenticated workflows, project/task mutations, role boundaries, CSV export, analytics, keyboard interaction and accessibility checks. GitHub Actions runs backend tests against PostgreSQL, frontend checks, browser flows and container builds.

## Repository structure

```text
backend/
  config/                 Django settings, URLs and WSGI
  operations/
    models.py              Users, projects, tasks and activity
    permissions.py         Workspace authorization rules
    serializers.py         Input validation and representation
    services.py            Reporting and activity services
    views.py / urls.py     Session and REST endpoints
    migrations/            Database schema history
    management/commands/   Idempotent demo seed
frontend/
  src/                     Workspace UI and API client
  tests/                   Playwright workflows
docs/
  API.md                   Endpoint reference
  ACCESS_CONTROL.md        Role and mutation boundaries
  DATA_MODEL.md            Domain model and reporting semantics
  screenshots/             Running application captures
.github/workflows/         Continuous integration
```

## Scope

OpsBoard is intentionally a **single shared workspace for a small delivery team**. It does not currently provide tenant isolation, SSO, invitations, attachments, notifications, background exports or concurrent-edit conflict resolution. Workspace collections are small enough for client-side filtering; a larger installation would move pagination, filtering and more reporting aggregation to the server.

The project does not present estimated effort as recorded working time, and its analytics are operational views of the current database rather than an immutable reporting warehouse.

## Credits and license

Third-party software, typography and asset provenance are recorded in [CREDITS.md](CREDITS.md).

This repository is source-available for portfolio review and evaluation only. The original code and other original materials are **not open source** and may not be reused, redistributed, incorporated into other projects, or commercially exploited without prior written permission. See the [Portfolio Source License](LICENSE) for the complete terms. Third-party components remain subject to their respective licenses.
