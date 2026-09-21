import { User } from "./entities/user.entity";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    full_name: user.fullName,
    is_active: user.isActive,
    tenant_id: user.tenant?.id ?? null,
  };
}
