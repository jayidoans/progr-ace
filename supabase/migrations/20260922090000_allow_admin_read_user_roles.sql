begin;

-- Admins may inspect role assignments for the read-only user directory.
-- This grants no write access and does not alter normal user visibility.
create policy "user_roles_select_admin"
on public.user_roles
for select
to authenticated
using (public.has_role('ADMIN'));

commit;
