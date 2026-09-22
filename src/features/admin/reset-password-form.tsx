"use client";

import { useActionState } from "react";

import { resetUserPassword, type PasswordActionState } from "@/src/features/auth/password-actions";

const initialState: PasswordActionState = { message: "" };

export function ResetPasswordForm({ userId }: { userId: string }) {
  const reset = resetUserPassword.bind(null, userId);
  const [state, action, pending] = useActionState(reset, initialState);

  return <details className="mt-6 rounded-lg border border-gray-200 p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Reset Password</summary>
    <p className="mt-3 text-gray-600">The current password will stop working. A secure temporary password will be generated, shown once, and the user must change it after signing in.</p>
    {state.message ? <p className={`mt-4 rounded-md p-3 ${state.temporaryPassword ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role="status">{state.message}</p> : null}
    {state.temporaryPassword ? <div className="mt-3 rounded-md bg-gray-950 p-3 text-white">
      <p className="text-xs text-gray-300">Shown only once</p>
      <code className="mt-1 block break-all text-base font-bold" data-temporary-password>{state.temporaryPassword}</code>
      <button className="mt-3 rounded-md border border-gray-500 px-3 py-2 text-xs font-semibold" onClick={() => navigator.clipboard.writeText(state.temporaryPassword ?? "")} type="button">Copy password</button>
    </div> : <form action={action} className="mt-4"><button className="min-h-11 rounded-md border border-red-600 px-4 py-2 font-semibold text-red-700 disabled:opacity-60" disabled={pending} type="submit">{pending ? "Resetting…" : "Confirm password reset"}</button></form>}
  </details>;
}
