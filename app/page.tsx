import Image from "next/image";
import Link from "next/link";

import { formatDistance } from "@/src/features/activities/format";
import { getCurrentSession } from "@/src/features/auth/session";
import { getHomepageActions } from "@/src/features/home/presentation";
import { formatTrainingDate } from "@/src/features/training/format";
import { getHomepageTrainingPrograms } from "@/src/features/training/queries";

export default async function Home() {
  const { user } = await getCurrentSession();
  const programs = user ? await getHomepageTrainingPrograms() : [];
  const actions = getHomepageActions(Boolean(user));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link aria-label="ProgrACE home" className="min-w-0" href="/">
            <Image
              alt="ProgrACE — Train Today. Go Further."
              className="h-auto w-36 rounded bg-white p-1 sm:w-52"
              height={724}
              priority
              src="/prograce-logo.png"
              width={2172}
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-md bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 sm:px-4"
                href={actions.header.href}
              >
                {actions.header.label}
              </Link>
            ) : (
              <>
                <Link
                  className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-3"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center rounded-md bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 sm:px-4"
                  href="/register"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(79,70,229,0.28),_transparent_45%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">ProgrACE</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Train with purpose.
              <span className="block text-emerald-300">Progress with evidence.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Follow structured training, record your effort, and move consistently toward your race goal.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300"
                href={actions.primary.href}
              >
                {actions.primary.label}
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/30 px-6 py-3 font-bold text-white hover:bg-white/10"
                href={actions.secondary.href}
              >
                {actions.secondary.label}
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 text-gray-950">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Structured progress</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Available Training Programs</h2>
              <p className="mt-3 text-gray-600">
                Training prescriptions stay distinct from the Activity Evidence you record.
              </p>
            </div>

            {!user ? (
              <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
                <h3 className="text-lg font-bold">Sign in to view your available programs</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Program access is private and follows your existing ProgrACE training permissions.
                </p>
                <Link className="mt-5 inline-flex min-h-11 items-center font-bold text-indigo-700" href="/login">
                  Sign in to ProgrACE →
                </Link>
              </div>
            ) : programs.length === 0 ? (
              <div className="mt-8 rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
                No published training programs are currently available to your account.
              </div>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programs.map((program) => (
                  <article
                    className="flex min-w-0 flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
                    key={program.id}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Published program</p>
                    <h3 className="mt-2 break-words text-xl font-bold">{program.name}</h3>
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                      {program.race_goal.race.name} · {formatDistance(program.race_goal.race.distance_m)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatTrainingDate(program.start_date)} – {formatTrainingDate(program.end_date)}
                    </p>
                    <Link
                      className="mt-6 inline-flex min-h-11 items-center font-bold text-indigo-700"
                      href={`/dashboard/training/${program.id}`}
                    >
                      View Program →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-sm text-slate-400">
        © ProgrACE · Train today. Go further.
      </footer>
    </div>
  );
}
