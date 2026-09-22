# Admin-controlled Strava access

Strava permission and connection are separate. Permission is denied by default and may be granted only by a user with the actual `ADMIN` role to a user with the actual `ATHLETE` role. Active UI mode is never authorization. Existing M7 connection rows, including those needing reauthorization, are granted permission during the forward migration so their credentials and history are preserved.

`strava_access_permissions` stores the current grant actor/time and, while revoked, the latest revocation actor/time. It is not a full event log. Browser roles have no direct table access. The athlete can read only their own allowed/denied boolean through `current_user_strava_permission()`. The admin status RPC returns only user ID, permission state and grant time, connection status, and last successful sync time. It never returns Strava credentials.

OAuth initiation checks permission on the server. The callback checks again before token exchange and before saving. A database trigger checks and locks the permission row inside the privileged connection upsert transaction, preventing a revoke/callback race from creating a denied-but-connected account. M8 sync checks permission before acquiring a sync lease; normal import behavior is unchanged.

Admin revoke is only available when no connection row exists. Admin disconnect and athlete self-disconnect use the same server-only core: revoke provider authorization first, then delete only the connection row. If provider revocation fails, encrypted local credentials remain for retry. Disconnect leaves permission allowed, so an athlete may reconnect; revoke is a separate explicit action. Historical Activities, athlete notes/RPE, Claims, Validations, and evaluation history are unaffected.

This phase does not enforce a hardcoded Strava capacity, change roles, reset passwords, or alter Claims/Validation. The forward migration must be applied before deploying the application; neither is deployed automatically by this task.
