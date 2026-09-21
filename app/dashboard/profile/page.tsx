import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/src/features/profiles/queries";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?next=/dashboard/profile");
  }

  return (
    <section className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
        Athlete profile
      </p>
      <h1 className="mt-2 text-3xl font-bold text-gray-950">Your profile</h1>
      <p className="mt-3 text-gray-600">
        Keep your profile details in one place for your race goals and training history.
      </p>

      <dl className="mt-8 grid gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full name</dt>
          <dd className="mt-2 font-semibold text-gray-950">{profile.full_name ?? "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt>
          <dd className="mt-2 font-semibold text-gray-950">{profile.email ?? "Not available"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account reference</dt>
          <dd className="mt-2 break-all font-mono text-sm text-gray-700">{profile.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member since</dt>
          <dd className="mt-2 font-semibold text-gray-950">
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(profile.created_at))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
