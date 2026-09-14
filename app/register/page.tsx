import Link from "next/link";
import { redirect } from "next/navigation";

import { register } from "@/src/features/auth/actions";
import { createClient } from "@/src/lib/supabase/server";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createClient();
  const [{ data }, params] = await Promise.all([supabase.auth.getUser(), searchParams]);

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            ProgrACE
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">Create an account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Registration creates an athlete profile for the signed-in user.
          </p>
        </div>

        {params.error ? (
          <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {params.error}
          </p>
        ) : null}

        <form action={register} className="space-y-5">
          <label className="block text-sm font-medium text-gray-800">
            Full name
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              maxLength={100}
              minLength={2}
              name="fullName"
              required
              type="text"
            />
          </label>

          <label className="block text-sm font-medium text-gray-800">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block text-sm font-medium text-gray-800">
            Password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          <label className="block text-sm font-medium text-gray-800">
            Confirm password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500"
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already registered?{" "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-500" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
