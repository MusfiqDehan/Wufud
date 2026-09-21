export const PermissionLevel = {
  none: "none",
  view: "view",
  edit: "edit",
  full: "full",
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export const PERMISSION_RANK: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  full: 3,
};

export function levelAtLeast(actual: PermissionLevel | undefined, required: PermissionLevel): boolean {
  return PERMISSION_RANK[actual ?? "none"] >= PERMISSION_RANK[required];
}
