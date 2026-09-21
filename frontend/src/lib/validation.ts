import { z } from "zod";

export { firstZodIssueMessage } from "@/lib/api-error";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.");

export const passwordField = z.string().min(8, "Use at least 8 characters for your password.");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: emailField,
  password: passwordField,
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(1, "This invitation link is not valid. Ask your admin for a new one."),
  fullName: z.string().trim().optional(),
  password: passwordField,
});

export const startAgencySchema = z.object({
  agencyName: z.string().trim().min(2, "Enter your agency name."),
  slug: z
    .string()
    .trim()
    .min(3, "Choose a subdomain with at least 3 characters.")
    .regex(slugPattern, "Use only lowercase letters, numbers, and hyphens."),
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: emailField,
  password: passwordField,
  planId: z.string().min(1, "Choose a plan."),
  mode: z.enum(["trial", "paid"]),
  gatewaySlug: z.string().optional(),
});

export function validateStartAgency(input: z.infer<typeof startAgencySchema> & { slugAvailable?: boolean }) {
  const parsed = startAgencySchema.safeParse(input);
  if (!parsed.success) return parsed;
  if (input.slugAvailable === false) {
    return {
      success: false as const,
      error: { issues: [{ message: "That subdomain is not available. Try another one." }] },
    };
  }
  if (parsed.data.mode === "paid" && !parsed.data.gatewaySlug?.trim()) {
    return {
      success: false as const,
      error: { issues: [{ message: "Choose a payment method." }] },
    };
  }
  return parsed;
}
