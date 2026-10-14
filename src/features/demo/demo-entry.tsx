import { enterDemo } from "@/src/features/demo/login";

const errorMessages: Record<string, string> = {
  "rate-limited": "Too many demo entry attempts. Please wait a minute and try again.",
  unavailable: "The demonstration is temporarily unavailable. Please try again later.",
};

export function DemoEntry({ error }: { error?: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-10 lg:p-14">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-emerald-300">
            Progr-ACE DEMO PAGE
          </p>
          <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
            ProgrACE: Evidence-Based Training Management for Athlete–Coach Collaboration
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            ProgrACE is an online running training platform supporting structured coaching,
            evidence-based training claims, validation, and longitudinal training insights.
          </p>

          <aside className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm leading-6 text-amber-100">
            This demonstration contains synthetic data only. Changes are disabled and no real
            athlete information is displayed. The demonstration uses a fixed reference date of
            8 January 2027.
          </aside>

          {error && errorMessages[error] ? (
            <p className="mt-5 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert">
              {errorMessages[error]}
            </p>
          ) : null}

          <section className="mt-9 grid gap-4 md:grid-cols-2" aria-labelledby="demo-perspective-title">
            <h2 className="sr-only" id="demo-perspective-title">Choose a demonstration perspective</h2>
            <article className="rounded-2xl bg-white p-6 text-slate-950">
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Athlete perspective</p>
              <h3 className="mt-2 text-2xl font-black">Explore as Atlit Strava</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Review the published marathon plan, training evidence, validation outcomes,
                progress analytics, and weekly insights.
              </p>
              <form action={enterDemo} className="mt-6">
                <input name="role" type="hidden" value="ATHLETE" />
                <button className="min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500" type="submit">
                  Explore as Athlete
                </button>
              </form>
            </article>

            <article className="rounded-2xl bg-white p-6 text-slate-950">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Coach perspective</p>
              <h3 className="mt-2 text-2xl font-black">Explore as Kuch</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Review Athlete progress, submitted evidence, Coach evaluation, training insights,
                and the printable longitudinal report.
              </p>
              <form action={enterDemo} className="mt-6">
                <input name="role" type="hidden" value="COACH" />
                <button className="min-h-12 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-600" type="submit">
                  Explore as Coach
                </button>
              </form>
            </article>
          </section>

          <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            Contact: Jay Idoan Sihotang · jay.sihotang@unai.edu
          </footer>
        </div>
      </div>
    </main>
  );
}
