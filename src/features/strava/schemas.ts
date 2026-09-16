import { z } from "zod";

const tokenSchema = z.string().min(1).max(4096);
const epochSecondsSchema = z.number().int().positive();

export const stravaCallbackSchema = z
  .object({
    code: z.string().min(1).max(2048).optional(),
    error: z.string().min(1).max(100).optional(),
    scope: z.string().max(500).optional(),
    state: z.string().min(32).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(),
  })
  .refine((value) => value.error || value.code, {
    message: "An authorization code or denial is required.",
  });

const stravaAthleteSchema = z.object({
  id: z.number().int().positive().safe(),
  username: z.string().nullable().optional(),
  firstname: z.string().nullable().optional(),
  lastname: z.string().nullable().optional(),
});

export const stravaTokenExchangeSchema = z.object({
  access_token: tokenSchema,
  refresh_token: tokenSchema,
  expires_at: epochSecondsSchema,
  scope: z.string().max(500).optional(),
  athlete: stravaAthleteSchema,
});

export const stravaRefreshResponseSchema = z.object({
  access_token: tokenSchema,
  refresh_token: tokenSchema,
  expires_at: epochSecondsSchema,
});

export function stravaAthleteDisplayName(
  athlete: z.infer<typeof stravaAthleteSchema>,
) {
  const fullName = [athlete.firstname, athlete.lastname]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();

  return fullName || athlete.username?.trim() || `Athlete ${athlete.id}`;
}
