# Workflow Locks

Use this file to claim module ownership during active work and reduce merge conflicts.

## Lock entry template
| Module | Owner | Started (UTC) | Expires (UTC) | Notes |
| --- | --- | --- | --- | --- |
| frontend | @handle | 2026-01-01T00:00:00Z | 2026-01-01T04:00:00Z | Short reason |

## Rules
- Add a lock before editing a module with active collaborators.
- Keep lock windows short and renew only when needed.
- Remove your lock when your branch is merged or abandoned.
