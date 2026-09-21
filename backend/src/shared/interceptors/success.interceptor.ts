import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { SUCCESS_MESSAGES } from "@wufud/contracts";
import { omitEmpty } from "../utils/omit-empty";

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload === undefined || payload === null) {
          return payload;
        }
        if (payload && typeof payload === "object" && "success" in payload) {
          return omitEmpty(payload);
        }
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? (payload as { message: string }).message
            : SUCCESS_MESSAGES.DEFAULT;
        const data =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : payload;
        return omitEmpty({ success: true, message, data });
      }),
    );
  }
}

export function successResponse<T>(data: T, message: string = SUCCESS_MESSAGES.DEFAULT) {
  return { success: true as const, message, data };
}

export function listSuccessResponse<T>(
  items: T[],
  pagination?: Record<string, unknown>,
  message: string = SUCCESS_MESSAGES.LIST,
  meta?: Record<string, unknown>,
) {
  return {
    success: true as const,
    message,
    data: { items, pagination, meta },
  };
}
