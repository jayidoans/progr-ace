import {
  STRAVA_ACTIVITY_MAX_PAGES,
  STRAVA_ACTIVITY_PER_PAGE,
  type StravaSummaryActivity,
} from "@/src/features/strava/activity-sync";

export class StravaActivityPageLimitError extends Error {
  constructor() {
    super("page_limit");
    this.name = "StravaActivityPageLimitError";
  }
}

export async function fetchAllStravaActivities(input: {
  after: number;
  fetchPage: (page: number, perPage: number) => Promise<StravaSummaryActivity[]>;
  perPage?: number;
  maxPages?: number;
}) {
  const perPage = input.perPage ?? STRAVA_ACTIVITY_PER_PAGE;
  const maxPages = input.maxPages ?? STRAVA_ACTIVITY_MAX_PAGES;
  const activities: StravaSummaryActivity[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageActivities = await input.fetchPage(page, perPage);
    activities.push(...pageActivities);
    if (pageActivities.length < perPage) return activities;
  }

  throw new StravaActivityPageLimitError();
}
