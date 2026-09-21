import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { Observable } from "rxjs";
import { getTenantStore } from "./tenant-context";

@Injectable()
export class SchemaInterceptor implements NestInterceptor {
  constructor(private readonly em: EntityManager) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const store = getTenantStore();
    this.em.schema = store?.schema && store.schema !== "public" ? store.schema : "public";
    return next.handle();
  }
}
