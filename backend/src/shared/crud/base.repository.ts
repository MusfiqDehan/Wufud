import { EntityManager, EntityName, FilterQuery, RequiredEntityData } from "@mikro-orm/core";
import { BaseEntity } from "../entities/base.entity";
import { DomainError } from "../errors/domain.error";
import { paginate, PageResult } from "../pagination/cursor.paginator";

export class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entity: EntityName<T>,
  ) {}

  async findById(id: string): Promise<T> {
    const row = await this.em.findOne(this.entity, { id } as FilterQuery<T>);
    if (!row) {
      throw DomainError.notFound();
    }
    return row;
  }

  async paginate(where: FilterQuery<T>, cursor?: string, pageSize?: number): Promise<PageResult<T>> {
    return paginate(this.em, this.entity, where, { cursor, pageSize });
  }

  create(data: RequiredEntityData<T>): T {
    return this.em.create(this.entity, data);
  }

  async persist(entity: T): Promise<T> {
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async softDelete(entity: T, actorId?: string): Promise<void> {
    entity.softDelete(actorId);
    await this.em.flush();
  }
}
