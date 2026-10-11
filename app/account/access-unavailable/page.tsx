import Link from "next/link";

export default function AccountAccessUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">ProgrACE</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Service temporarily unavailable</h1>
        <p className="mt-3 text-sm text-gray-600">
          We couldn&apos;t verify your account security status. Your password has not been changed.
          Please try again in a moment.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          href="/dashboard"
        >
          Try again
        </Link>
      </section>
    </main>
  );
}
