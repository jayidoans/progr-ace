import { createClient } from "@/src/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
        Dashboard
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        Welcome, {profile?.full_name ?? "athlete"}
      </h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Your account foundation is ready. Training, race, activity, and Strava features are not
        part of this milestone.
      </p>
    </section>
  );
}
