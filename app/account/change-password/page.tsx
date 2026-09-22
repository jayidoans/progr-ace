import { redirect } from "next/navigation";

import { signOut } from "@/src/features/auth/actions";
import { ChangePasswordForm } from "@/src/features/auth/change-password-form";
import { currentUserMustChangePassword } from "@/src/features/auth/password-queries";

export default async function RequiredPasswordChangePage() {
  if (!(await currentUserMustChangePassword())) redirect("/dashboard/profile");
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
    <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Account security</p>
      <h1 className="mt-2 text-3xl font-bold">Change your password</h1>
      <p className="mt-3 text-sm text-gray-600">Your temporary password must be replaced before you continue to ProgrACE.</p>
      <ChangePasswordForm />
      <form action={signOut} className="mt-5 border-t border-gray-200 pt-5"><button className="min-h-11 text-sm font-semibold text-gray-700" type="submit">Sign out</button></form>
    </section>
  </main>;
}
