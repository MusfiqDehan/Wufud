import { EntityManager, EntityName, FilterQuery, wrap } from "@mikro-orm/core";
import { BaseEntity } from "../entities/base.entity";
import { ListQueryDto } from "../dto/list-query.dto";
import { paginate, PageResult } from "../pagination/cursor.paginator";

export abstract class CrudService<T extends BaseEntity> {
  protected searchFields: string[] = ["name"];

  constructor(
    protected readonly em: EntityManager,
    protected readonly entity: EntityName<T>,
  ) {}

  protected baseWhere(_query: ListQueryDto): FilterQuery<T> {
    return {} as FilterQuery<T>;
  }

  async list(query: ListQueryDto): Promise<PageResult<T>> {
    const where = this.buildWhere(query);
    return paginate(this.em, this.entity, where, {
      cursor: query.cursor,
      pageSize: query.page_size,
    });
  }

  async get(id: string): Promise<T> {
    return this.em.findOneOrFail(this.entity, { id } as FilterQuery<T>);
  }

  async create(data: Partial<T>, actorId?: string): Promise<T> {
    const entity = this.em.create(this.entity, {
      ...data,
      createdBy: actorId,
    } as never);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, data: Partial<T>, actorId?: string): Promise<T> {
    const entity = await this.get(id);
    wrap(entity).assign({ ...data, updatedBy: actorId } as never);
    await this.em.flush();
    return entity;
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const entity = await this.get(id);
    entity.softDelete(actorId);
    await this.em.flush();
  }

  protected buildWhere(query: ListQueryDto): FilterQuery<T> {
    const where: Record<string, unknown> = { ...(this.baseWhere(query) as object) };
    if (query.search && this.searchFields.length) {
      where.$or = this.searchFields.map((field) => ({
        [field]: { $ilike: `%${query.search}%` },
      }));
    }
    if (query.branch) {
      where.branch = query.branch;
    }
    return where as FilterQuery<T>;
  }
}
