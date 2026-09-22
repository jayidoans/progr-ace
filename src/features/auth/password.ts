import { z } from "zod";

export const passwordChangeSchema = z.object({
  password: z.string().min(8, "Password must contain at least 8 characters.").max(72, "Password must contain at most 72 characters."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export function generateTemporaryPassword(randomBytes = crypto.getRandomValues(new Uint8Array(18))) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return `Aa1!${Array.from(randomBytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}
