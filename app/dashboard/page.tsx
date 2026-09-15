import Link from "next/link";

import { getCurrentProfile } from "@/src/features/profiles/queries";
import { ActiveRaceGoalCard } from "@/src/features/race-goals/components/active-race-goal-card";
import { getActiveRaceGoal } from "@/src/features/race-goals/queries";

export default async function DashboardPage() {
  const [profile, activeGoal] = await Promise.all([getCurrentProfile(), getActiveRaceGoal()]);

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

      <section className="grid gap-4 sm:grid-cols-2">
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
      </section>
    </div>
  );
}
