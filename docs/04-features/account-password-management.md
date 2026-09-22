# Account password management

Manage Users derives account, athlete, and coach totals from the existing Admin-only directory response. A second narrow Admin-only RPC returns only `user_id` and whether the current Strava connection status is `CONNECTED`, allowing both the connected total and orange Athlete badge to be computed without per-user requests or credential exposure. Multi-role category counts are intentionally independent.

Authenticated users change their own password with Supabase Auth `updateUser`. The application retains the registration policy of 8–72 characters and requires matching confirmation. Password values are submitted only in the server-action body, are never logged, stored in application tables, or placed in URLs.

An actual Admin may reset another user's password through a server-only action backed by the existing privileged Supabase client. Temporary passwords use Web Crypto randomness, are sent directly to Supabase Auth, and are returned only in the successful action response for one-time display. Admin self-reset is rejected; self-service change remains available in Profile.

`profiles.must_change_password` contains no password material. Admin reset marks it before updating Supabase Auth. Middleware checks the flag for normal authenticated application routes and redirects the user to `/account/change-password`, where password change and logout remain available. After Supabase accepts the user-session password update, the server clears the flag through a service-only RPC. If password update fails, the flag is not cleared. No SMTP or recovery-email dependency is introduced.
