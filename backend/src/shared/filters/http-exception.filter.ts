import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ErrorCode, ERROR_MESSAGES } from "@wufud/contracts";
import { DomainError } from "../errors/domain.error";
import { omitEmpty } from "../utils/omit-empty";
import { sanitizePublicMessage } from "../validation/sanitize-message";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();

    if (exception instanceof DomainError) {
      const code = (
        typeof exception.errorCode === "string" && exception.errorCode in ERROR_MESSAGES
          ? exception.errorCode
          : ErrorCode.VALIDATION_ERROR
      ) as ErrorCode;
      return res.status(exception.status).json(
        omitEmpty({
          success: false,
          message: sanitizePublicMessage(exception.message, code, exception.status),
          error_code: exception.errorCode,
          errors: exception.errors,
        }),
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code = httpStatusToCode(status);
      const parsed = parseHttpBody(body);
      return res.status(status).json(
        omitEmpty({
          success: false,
          message: sanitizePublicMessage(parsed.message, code, status),
          error_code: parsed.error_code ?? code,
          errors: parsed.errors,
        }),
      );
    }

    const unique = isUniqueViolation(exception);
    if (unique) {
      return res.status(409).json({
        success: false,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
        error_code: ErrorCode.DUPLICATE_RESOURCE,
      });
    }

    this.logger.error(exception, (exception as Error)?.stack, req.url);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error_code: ErrorCode.INTERNAL_SERVER_ERROR,
    });
  }
}

function httpStatusToCode(status: number): ErrorCode {
  if (status === 401) return ErrorCode.AUTHENTICATION_REQUIRED;
  if (status === 403) return ErrorCode.PERMISSION_DENIED;
  if (status === 404) return ErrorCode.NOT_FOUND;
  if (status === 429) return ErrorCode.RATE_LIMIT_EXCEEDED;
  if (status >= 500) return ErrorCode.INTERNAL_SERVER_ERROR;
  return ErrorCode.VALIDATION_ERROR;
}

function parseHttpBody(body: string | object): {
  message?: string;
  error_code?: string;
  errors?: Record<string, string[]>;
} {
  if (typeof body === "string") {
    return { message: body };
  }
  if (!body || typeof body !== "object") return {};
  const record = body as {
    message?: string | string[];
    error_code?: string;
    errors?: Record<string, string[]>;
  };
  const rawMessage = record.message;
  const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
  if (record.errors && typeof record.errors === "object") {
    return { message, error_code: record.error_code, errors: record.errors };
  }
  if (Array.isArray(rawMessage) && rawMessage.length > 1) {
    return { message: ERROR_MESSAGES.VALIDATION_ERROR, errors: { non_field_errors: rawMessage } };
  }
  if (Array.isArray(rawMessage)) {
    return { message: rawMessage[0] ?? ERROR_MESSAGES.VALIDATION_ERROR, errors: { non_field_errors: rawMessage } };
  }
  return { message, error_code: record.error_code };
}

function isUniqueViolation(exception: unknown): boolean {
  const e = exception as { code?: string; name?: string };
  return e?.code === "23505" || e?.name === "UniqueConstraintViolationException";
}
