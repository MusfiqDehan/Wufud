import { FilterQuery, FindOptions, EntityManager, EntityName } from "@mikro-orm/core";
import { DomainError } from "../errors/domain.error";
import { ErrorCode } from "@wufud/contracts";

export type PageResult<T> = {
  items: T[];
  pagination: {
    has_next: boolean;
    has_previous: boolean;
    page_size: number;
    next_cursor?: string;
    previous_cursor?: string;
  };
};

function encodeCursor(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new DomainError(ErrorCode.INVALID_CURSOR, undefined, 400);
  }
}

export async function paginate<T extends { id: string }>(
  em: EntityManager,
  entity: EntityName<T>,
  where: FilterQuery<T>,
  opts: {
    cursor?: string;
    pageSize?: number;
    orderBy?: FindOptions<T>["orderBy"];
    populate?: string[];
    filters?: FindOptions<T>["filters"];
  } = {},
): Promise<PageResult<T>> {
  const pageSize = Math.min(opts.pageSize ?? 10, 100);
  const filter = { ...(where as object) } as FilterQuery<T>;
  if (opts.cursor) {
    const id = decodeCursor(opts.cursor);
    Object.assign(filter as object, { id: { $lt: id } });
  }
  const items = await em.find(entity, filter, {
    limit: pageSize + 1,
    filters: opts.filters,
    orderBy: opts.orderBy ?? ({ id: "DESC" } as FindOptions<T>["orderBy"]),
    populate: opts.populate as unknown as FindOptions<T>["populate"],
  });
  const hasNext = items.length > pageSize;
  const page = hasNext ? items.slice(0, pageSize) : items;
  return {
    items: page,
    pagination: {
      has_next: hasNext,
      has_previous: Boolean(opts.cursor),
      page_size: pageSize,
      next_cursor: hasNext && page.length ? encodeCursor(page[page.length - 1].id) : undefined,
      previous_cursor: opts.cursor,
    },
  };
}
