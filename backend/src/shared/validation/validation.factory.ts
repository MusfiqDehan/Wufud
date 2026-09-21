import { BadRequestException } from "@nestjs/common";
import { ErrorCode, ERROR_MESSAGES } from "@wufud/contracts";
import type { ValidationError } from "class-validator";

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Password",
  fullName: "Full name",
  agencyName: "Agency name",
  slug: "Subdomain",
  planId: "Plan",
  gatewaySlug: "Payment method",
  token: "Invitation",
  to: "Email",
};

const CONSTRAINT_MESSAGES: Record<string, (ctx?: Record<string, unknown>) => string> = {
  isEmail: () => "Enter a valid email address.",
  isString: () => "Enter text for this field.",
  isUUID: () => "Choose a valid plan.",
  isIn: () => "Choose one of the available options.",
  minLength: (ctx) => {
    const min = Number(ctx?.min ?? ctx?.length ?? 0);
    if (min >= 8) return "Use at least 8 characters.";
    if (min >= 3) return "Enter at least 3 characters.";
    if (min >= 2) return "Enter at least 2 characters.";
    return "This field is too short.";
  },
  isNotEmpty: () => "This field is required.",
  isOptional: () => "This field is invalid.",
};

function friendlyConstraint(error: ValidationError): string[] {
  if (!error.constraints) return [];
  return Object.entries(error.constraints).map(([key, raw]) => {
    const mapped = CONSTRAINT_MESSAGES[key]?.(error.contexts?.[key] as Record<string, unknown> | undefined);
    if (mapped) return mapped;
    const label = FIELD_LABELS[error.property] ?? "This field";
    if (raw.toLowerCase().includes("must be an email")) return "Enter a valid email address.";
    if (raw.toLowerCase().includes("must be longer")) return `${label} is too short.`;
    if (raw.toLowerCase().includes("must be shorter")) return `${label} is too long.`;
    if (raw.toLowerCase().includes("should not be empty")) return `${label} is required.`;
    return "Please check this field and try again.";
  });
}

function flattenErrors(errors: ValidationError[], prefix = ""): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const err of errors) {
    const key = prefix ? `${prefix}.${err.property}` : err.property;
    const messages = friendlyConstraint(err);
    if (messages.length) {
      out[key] = [...(out[key] ?? []), ...messages];
    }
    if (err.children?.length) {
      Object.assign(out, flattenErrors(err.children, key));
    }
  }
  return out;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const fieldErrors = flattenErrors(errors);
  return new BadRequestException({
    message: ERROR_MESSAGES.VALIDATION_ERROR,
    error_code: ErrorCode.VALIDATION_ERROR,
    errors: fieldErrors,
  });
}
