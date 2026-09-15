import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityForm } from "@/src/features/activities/components/activity-form";
import { getActivity } from "@/src/features/activities/queries";

export default async function EditActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, feedback] = await Promise.all([params, searchParams]);
  const activity = await getActivity(id);
  if (activity.source !== "MANUAL") notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header><Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/activities/${activity.id}`}>← Activity</Link><h1 className="mt-3 text-3xl font-bold">Edit activity</h1></header>
      {feedback.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{feedback.error === "invalid-activity" ? "Check the activity values and try again." : "The activity could not be updated."}</p> : null}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><ActivityForm activity={activity} /></section>
    </div>
  );
}

