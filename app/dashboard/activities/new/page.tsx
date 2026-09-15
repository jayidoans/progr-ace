import Link from "next/link";

import { ActivityForm } from "@/src/features/activities/components/activity-form";

const errors: Record<string, string> = {
  "invalid-activity": "Check the activity values and try again.",
  "create-failed": "The activity could not be saved.",
};

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/activities">← Activities</Link>
        <h1 className="mt-3 text-3xl font-bold">Add manual activity</h1>
        <p className="mt-2 text-gray-600">Use meters and seconds internally; this form accepts kilometers and clock duration for convenience.</p>
      </header>
      {params.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors[params.error] ?? "The activity could not be saved."}</p> : null}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><ActivityForm /></section>
    </div>
  );
}

