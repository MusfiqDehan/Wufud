import { ErrorCode, ERROR_MESSAGES, GENERIC_REQUEST_FAILED } from "@wufud/contracts";

export class DomainError extends Error {
  constructor(
    public readonly errorCode: ErrorCode | string,
    message?: string,
    public readonly status = 400,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message ?? ERROR_MESSAGES[errorCode as ErrorCode] ?? GENERIC_REQUEST_FAILED);
  }

  static notFound(message?: string) {
    return new DomainError(ErrorCode.NOT_FOUND, message, 404);
  }

  static unauthorized(code: ErrorCode = ErrorCode.AUTHENTICATION_REQUIRED, message?: string) {
    return new DomainError(code, message, 401);
  }

  static forbidden(message?: string, code: ErrorCode = ErrorCode.PERMISSION_DENIED) {
    return new DomainError(code, message, 403);
  }

  static conflict(message?: string, errors?: Record<string, string[]>) {
    return new DomainError(ErrorCode.DUPLICATE_RESOURCE, message, 409, errors);
  }
}
