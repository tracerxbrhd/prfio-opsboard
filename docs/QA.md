# Release verification

Verified on 8 September 2026 on Windows with Python 3.12.14, Node.js 24.19.0, npm 11.17.0, SQLite, and Playwright Chromium. The UI ran at `http://127.0.0.1:5103`; Django ran at `http://127.0.0.1:8101`. Browser writes used a separate ignored `backend/qa-release.sqlite3` database, seeded with six people, six projects, and 45 tasks.

## Executed checks

| Check | Result |
| --- | --- |
| `python backend/manage.py test operations` | 23 tests passed |
| `ruff check backend` | Passed |
| `ruff format --check backend` | 17 files already formatted |
| `python backend/manage.py check` | No issues |
| `python backend/manage.py makemigrations --check --dry-run` | No changes detected |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `npm run build` | Passed; 34 modules transformed |
| `npm run test:e2e` | 8 tests passed in 1.0 minute, including technical administration and the four-width screenshot matrix |
| `docker compose config --quiet` | Passed with `.env` copied from `.env.example` |
| `docker compose -f compose.yaml -f compose.production.yaml config --quiet` | Passed with example production hostname/origin and a temporary validation-only secret supplied in the process environment |

The production build generated a 286.28 kB JavaScript entry (88.23 kB gzip) and 38.13 kB CSS (8.98 kB gzip), plus local IBM Plex fonts. These are build sizes, not field performance measurements.

## API coverage

The 23 Django tests cover session login/logout/current user, anonymous route denial, CSRF token rotation and enforcement, failed-login throttling, project and task CRUD, validation, archive/restore and archived-task immutability, role restrictions, self-role and superuser protection, active-account checks, project progress, completion timestamps, database-derived analytics and workload, activity authorship, public database health, query-count efficiency, repeat-safe seeding, password hashing, and refusal to seed when debug is off. Seed output is checked to exclude the demonstration password.

Expected 400, 403, 404, and 429 responses in test output are deliberate rejection tests.

## Browser coverage

The suite in [workspace.spec.js](../frontend/tests/workspace.spec.js) runs serially against the real API. It checks:

1. Invalid and valid login, protected routes, dashboard data, mobile navigation, logout, and post-logout access denial.
2. Login, dashboard, project list/detail, task list/detail, team, analytics, and activity layouts at widths **360, 768, 1440, and 1920**, with a 1000-pixel initial viewport height. Every checked page fits the viewport horizontally; wide semantic tables scroll inside their panels. The closed mobile navigation is fully offscreen.
3. Project creation, duplicate-code field validation, editing, task creation/editing, status persistence after reload, derived 100% completion, archive/restore, archived-task read-only controls, deletion cancellation, permanent deletion, and the resulting empty state.
4. Member status changes restricted to their assigned tasks, and Manager work controls without project deletion or role administration.
5. Workspace search, task search and filters, sort, downloaded CSV contents, analytics period/data-table/chart keyboard inspection, and actor filtering.
6. Administrator role changes persisted across reload, role restoration, a simulated failed submission retaining entered values, and Escape/focus restoration for the modal and mobile navigation.
7. Technical Django administration access and account controls for the demo staff account, and the login gate for nonstaff Members.
8. Automated WCAG 2 A/AA and WCAG 2.1 AA axe checks on login, dashboard, projects, tasks, team, and analytics: **zero detected violations across six screens**. Saved violation arrays are [login](axe-login.json), [dashboard](axe-dashboard.json), [projects](axe-projects.json), [tasks](axe-tasks.json), [team](axe-team.json), and [analytics](axe-analytics.json).

Page-error listeners reported no uncaught JavaScript errors during the login/responsive screen checks. Automated accessibility checks are scoped to those six default desktop states; they are not a claim of full accessibility conformance or a screen-reader audit. Escape dismissal and keyboard chart inspection are additionally exercised by interaction tests.

## Screenshot evidence

The repository includes **41 full-page PNG captures** from the running seeded application. Captures wait for a visible content heading, completed data loading, and loaded fonts, then finish finite animations before saving. The 1440-pixel hero captures are linked from the README; the width-specific matrix is below. Login, the dashboard at all four widths, tablet project detail, and the mobile task list were visually inspected for hierarchy, clipping, and stable rendering.

| Screen | 360 px | 768 px | 1440 px | 1920 px |
| --- | --- | --- | --- | --- |
| Login | [Image](screenshots/login-360.png) | [Image](screenshots/login-768.png) | [Image](screenshots/login.png) | [Image](screenshots/login-1920.png) |
| Dashboard | [Image](screenshots/dashboard-360.png) | [Image](screenshots/dashboard-768.png) | [Image](screenshots/dashboard-1440.png) | [Image](screenshots/dashboard-1920.png) |
| Projects | [Image](screenshots/projects-360.png) | [Image](screenshots/projects-768.png) | [Image](screenshots/projects-1440.png) | [Image](screenshots/projects-1920.png) |
| Project detail | [Image](screenshots/project-detail-360.png) | [Image](screenshots/project-detail-768.png) | [Image](screenshots/project-detail-1440.png) | [Image](screenshots/project-detail-1920.png) |
| Tasks | [Image](screenshots/tasks-360.png) | [Image](screenshots/tasks-768.png) | [Image](screenshots/tasks-1440.png) | [Image](screenshots/tasks-1920.png) |
| Task detail | [Image](screenshots/task-detail-360.png) | [Image](screenshots/task-detail-768.png) | [Image](screenshots/task-detail-1440.png) | [Image](screenshots/task-detail-1920.png) |
| Team | [Image](screenshots/team-360.png) | [Image](screenshots/team-768.png) | [Image](screenshots/team-1440.png) | [Image](screenshots/team-1920.png) |
| Analytics | [Image](screenshots/analytics-360.png) | [Image](screenshots/analytics-768.png) | [Image](screenshots/analytics-1440.png) | [Image](screenshots/analytics-1920.png) |
| Activity | [Image](screenshots/activity-360.png) | [Image](screenshots/activity-768.png) | [Image](screenshots/activity-1440.png) | [Image](screenshots/activity-1920.png) |

## Reproduce

Follow the [native setup](../README.md#run-natively) or Docker setup. For a separate browser-test database, set `DATABASE_URL` before migrating, seeding, and starting Django. On PowerShell, from the root with the virtual environment activated:

```powershell
$qaDatabase = (Join-Path (Get-Location) 'backend/qa-release.sqlite3').Replace('\', '/')
$env:DATABASE_URL = "sqlite:///$qaDatabase"
python backend/manage.py migrate --noinput
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8101 --noreload
```

Start `npm run dev` in `frontend` in a second terminal. In a third, from `frontend`:

```bash
npx playwright install chromium
npm run test:e2e
```

The original run used `PLAYWRIGHT_EXECUTABLE_PATH` to select the shared installed Chromium binary. A normal checkout can use Playwright's standard browser installation. `E2E_BASE_URL` optionally changes the frontend URL. Test artifacts are ignored under `frontend/test-results` and `frontend/playwright-report`; screenshots and the six axe violation arrays are retained under `docs`.

Browser tests make real database writes. A successful CRUD test removes its temporary `Release quality review` project; member status and role changes are restored. Activity entries remain as the history of those operations. An interrupted test can leave its clearly named temporary project; use a dedicated disposable database instead of operational data.

## Verification limits

- Docker Compose parsing and service wiring were validated locally. Docker image build, PostgreSQL execution, Gunicorn/Nginx runtime, and production HTTPS ingress were **not run locally**: the Docker daemon pipe was unavailable. CI is configured to build the images and run backend tests against PostgreSQL; no remote CI result is claimed here.
- Browser verification used Chromium on Windows. Safari, Firefox, physical-device interaction, assistive-technology reading, and load testing were not performed.
- Deployment requires real secrets, public host/origin configuration, HTTPS ingress, backups, and monitoring. The provided development credentials are documented in the [README](../README.md#demo-accounts), and are not suitable for a public deployment.
