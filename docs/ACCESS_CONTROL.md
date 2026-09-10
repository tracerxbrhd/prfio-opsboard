# Workspace access control

OpsBoard separates **workspace roles** from Django's technical administration flags. The React interface reflects permissions for usability, but the API is the authority for every protected mutation.

## Roles

### Admin

Admins can manage projects and tasks, permanently delete projects, and change another person's workspace role.

An Admin role does not automatically grant Django staff or superuser access. Technical administration remains a separate Django concern.

### Manager

Managers can create and edit projects and tasks, archive or restore projects, and move work through the delivery workflow. They cannot permanently delete projects or administer workspace roles.

### Member

Members can read the shared workspace and reporting data. They may change only the status of a task assigned to themselves; other task fields and project mutations remain protected.

## Mutation matrix

| Operation | Admin | Manager | Member |
| --- | --- | --- | --- |
| View projects, tasks, people, activity and analytics | Yes | Yes | Yes |
| Create/edit/archive/restore projects | Yes | Yes | No |
| Delete projects and their tasks | Yes | No | No |
| Create/edit/delete tasks | Yes | Yes | No |
| Change assigned task status | Yes | Yes | Own tasks |
| Change another person's workspace role | Yes | No | No |

## Important boundaries

Archived project tasks reject mutations for every role until the project is restored. This rule is enforced server-side rather than relying on disabled controls in the client.

Admins cannot demote their own workspace role through the team endpoint. Django superusers receive effective Admin privileges inside the application, but ordinary workspace Admins do not gain Django administration access from that role alone.

Inactive accounts cannot continue operating as normal workspace users. Project ownership and task assignment validation require appropriate active accounts.

The workspace is intentionally shared: authenticated members can read team projects and tasks. The role model controls mutations, not per-project secrecy or tenant isolation.

## Sessions and CSRF

Authentication uses Django sessions stored in HttpOnly cookies. OpsBoard names its cookies `opsboard_sessionid` and `opsboard_csrftoken` so another Django application running on the same development hostname does not overwrite them.

Unsafe requests require a CSRF token. The frontend fetches the token from the API and refreshes it after authentication changes. Credentials are not stored in local storage.

Login has a basic application throttle. A multi-process or replicated deployment should use shared throttle state and ingress-level controls rather than relying on process-local development behavior.