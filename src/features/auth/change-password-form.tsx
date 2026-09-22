"use client";

import { useActionState } from "react";

import { changeMyPassword, type PasswordActionState } from "@/src/features/auth/password-actions";

const initialState: PasswordActionState = { message: "" };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeMyPassword, initialState);
  return <form action={action} className="mt-5 space-y-4">
    {state.message ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{state.message}</p> : null}
    <label className="block text-sm font-semibold text-gray-700">New Password
      <input autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-md border border-gray-300 px-3 font-normal" maxLength={72} minLength={8} name="password" required type="password" />
    </label>
    <label className="block text-sm font-semibold text-gray-700">Confirm New Password
      <input autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-md border border-gray-300 px-3 font-normal" maxLength={72} minLength={8} name="confirmPassword" required type="password" />
    </label>
    <button className="min-h-11 rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Changing…" : "Change Password"}</button>
  </form>;
}
