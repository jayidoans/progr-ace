import type { AdminUserSummary } from "./queries";

export function filterAdminUsers(users: AdminUserSummary[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return users;
  return users.filter((user) =>
    user.fullName?.toLocaleLowerCase().includes(term) || user.email?.toLocaleLowerCase().includes(term),
  );
}
