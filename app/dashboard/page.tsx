import Link from "next/link";

import { getAthleteClaims } from "@/src/features/claims/queries";
import { getCurrentProfile } from "@/src/features/profiles/queries";
import { ActiveRaceGoalCard } from "@/src/features/race-goals/components/active-race-goal-card";
import { getActiveRaceGoal } from "@/src/features/race-goals/queries";

export default async function DashboardPage() {
  const [profile, activeGoal, claims] = await Promise.all([
    getCurrentProfile(),
    getActiveRaceGoal(),
    getAthleteClaims(3),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">
          Welcome, {profile?.full_name ?? "athlete"}
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Your athlete identity and target race are the foundation for the training plan that will
          follow in later milestones.
        </p>
      </section>

      <ActiveRaceGoalCard goal={activeGoal} />

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Recent training claims</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your explicit links between prescriptions and activity evidence.
            </p>
          </div>
          <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/training">
            Open training
          </Link>
        </div>
        {claims.length === 0 ? (
          <p className="mt-5 text-sm text-gray-600">No training claims yet.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {claims.map((claim) => (
              <Link
                className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300"
                href={`/dashboard/claims/${claim.id}`}
                key={claim.id}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                  {claim.prescription.training_menu}
                </p>
                <h3 className="mt-1 font-bold">{claim.prescription.title}</h3>
                <p className="mt-2 text-xs font-semibold text-gray-500">{claim.status}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300"
          href="/dashboard/profile"
        >
          <span className="font-bold text-gray-950">Athlete profile</span>
          <span className="mt-1 block text-sm text-gray-600">View your current identity record.</span>
        </Link>
        <Link
          className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300"
          href="/dashboard/race-goals"
        >
          <span className="font-bold text-gray-950">Race goal history</span>
          <span className="mt-1 block text-sm text-gray-600">
            Manage the active goal and review previous targets.
          </span>
        </Link>
        <Link
          className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300"
          href="/dashboard/activities"
        >
          <span className="font-bold text-gray-950">Activity evidence</span>
          <span className="mt-1 block text-sm text-gray-600">
            Record what you actually did, independently from prescriptions.
          </span>
        </Link>
      </section>
    </div>
  );
}
