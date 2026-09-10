# API reference

Base path: `/api/`. Requests and responses use JSON. Authenticate with a session cookie; obtain a CSRF token before unsafe requests. All workspace read endpoints require a session. Missing session permissions return HTTP 403, as expected with DRF session authentication.

Session and CSRF cookies are named `opsboard_sessionid` and `opsboard_csrftoken`. These distinct names let local apps coexist on the same hostname across ports. The frontend uses the token returned by `/auth/csrf/` rather than reading a fixed cookie name.

## Session

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/auth/csrf/` | Set CSRF cookie and return `{ "csrfToken": "…" }` |
| POST | `/auth/login/` | Accept `{ "email", "password" }`, rotate the session and return the current user |
| GET | `/auth/me/` | Current user, role, capacity, display fields, and technical-admin access flag |
| POST | `/auth/logout/` | Invalidate session; return 204 |
| GET | `/health/` | Public database connectivity check |

For POST, PATCH, PUT and DELETE include `X-CSRFToken` and preserve the session/CSRF cookies. Fetch a new token after login because Django rotates it. Invalid login returns 400 without disclosing whether the email exists. Anonymous login requests use a basic 10-per-minute throttle; production replicas should use a shared cache and ingress rate limiting.

## Work

| Method | Path | Behavior |
| --- | --- | --- |
| GET / POST | `/projects/` | List in deadline order / create |
| GET / PATCH / PUT / DELETE | `/projects/{id}/` | Read / update / replace / delete with cascading tasks |
| POST | `/projects/{id}/archive/` | Accept `{ "archived": true }` or `false` to archive or restore |
| GET / POST | `/tasks/` | List / create; optional `?project={id}` |
| GET / PATCH / PUT / DELETE | `/tasks/{id}/` | Task CRUD |
| GET | `/team/` | Active users plus open effort, task counts, and capacity utilization |
| PATCH | `/team/{id}/` | Accept only `{ "role": "admin\|manager\|member" }`; admin-only |
| GET | `/analytics/?days=14` | Actual task series and workload; valid windows are 7, 14, 30 |
| GET | `/activity/` | Latest 100 events with actor and project |

Create a project:

```json
{
  "name": "Partner rollout",
  "code": "PRL",
  "client": "Partner operations",
  "description": "Ship the integration handover and launch checklist.",
  "owner": 1,
  "due_date": "2027-02-26",
  "status": "active",
  "color": "#277b70"
}
```

Project codes normalize to uppercase and must be unique, 2–8 characters, starting with a letter. Statuses are `planning`, `active`, `at_risk`, `completed`. Owners must be active accounts. Progress is derived from completed tasks.

Create a task:

```json
{
  "project": 1,
  "title": "Verify partner rollback",
  "description": "Restore staging and confirm the integration remains consistent.",
  "assignee": 3,
  "status": "backlog",
  "priority": "high",
  "due_date": "2027-02-22",
  "estimate_hours": 6,
  "tags": ["release", "qa"]
}
```

Task statuses: `backlog`, `in_progress`, `in_review`, `done`. Priorities: `low`, `medium`, `high`, `urgent`. Assignee may be `null`. Estimates must be integers from 1 to 160; at most six nonempty tags of up to 24 characters are allowed. Tags are trimmed, lowercased, and deduplicated.

Members may send only a `status` update for a task assigned to them. Archived tasks reject writes even if a caller attempts to move them to another project. A task's first transition to `done` records completion; ordinary edits preserve that time, reopening clears it, and a later completion records a new time.

## Errors and reporting semantics

Validation errors return 400 with field arrays or a `detail` message. Permission denial is 403, absent records 404, throttling 429. The frontend retains form values and associates field errors with inputs. Requests use ORM queries and serializers; no client-controlled SQL is assembled.

Reporting excludes archived projects. Active projects include every non-completed, non-archived project. Completed totals reflect current task status; the delivery series uses current completion timestamps. Open workload is all unfinished estimated effort across deadlines divided by weekly capacity, rather than hours booked for the coming week. Dates are stored as date-only deadlines; server analytics use UTC calendar days.
