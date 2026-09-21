export type Defaultable = { id: string; isDefault: boolean };

/** Exactly one row is default. Setting `targetId` clears every other flag. */
export function applyExclusiveDefault<T extends Defaultable>(rows: T[], targetId: string): T[] {
  return rows.map((row) => ({ ...row, isDefault: row.id === targetId }));
}

/**
 * If only one row exists it is always default.
 * If several exist and none is default, the first row (stable caller order) is promoted.
 */
export function ensureDefaultExists<T extends Defaultable>(rows: T[]): T[] {
  if (!rows.length) return rows;
  if (rows.length === 1) return [{ ...rows[0], isDefault: true }];
  if (rows.some((row) => row.isDefault)) {
    const firstDefault = rows.find((row) => row.isDefault)!.id;
    return applyExclusiveDefault(rows, firstDefault);
  }
  return applyExclusiveDefault(rows, rows[0].id);
}
