# Demo database overlay

These files are for the dedicated public-demo Supabase project only. They are
not production migrations and must never be applied to the production project.

Apply `0001_read_only_hardening.sql` after replaying the normal migrations. The
overlay creates a private registry of read-only Auth users and adds write guards
to every mutable public table. Because the guards execute on the tables, they
also cover writes performed through existing `SECURITY DEFINER` RPCs. A separate
`auth.users` trigger prevents shared demo credentials or metadata from being
changed through the Auth API.

Trusted provisioning uses `service_role`. Register demo users only after their
synthetic data is present. Routine sign-in and token refresh continue to work;
domain writes and account identity changes do not.
