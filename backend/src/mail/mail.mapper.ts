import { PlatformEmailAccount } from "./entities/platform-email.entity";
import { TenantEmailAccount } from "./entities/tenant-email.entity";

export type PublicEmailAccount = {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  from_address: string;
  from_name?: string;
  use_ssl: boolean;
  is_default: boolean;
  has_password: boolean;
};

export function publicEmail(row: PlatformEmailAccount | TenantEmailAccount): PublicEmailAccount {
  return {
    id: row.id,
    label: row.label,
    host: row.host,
    port: row.port,
    username: row.username,
    from_address: row.fromAddress,
    from_name: row.fromName,
    use_ssl: row.useSsl,
    is_default: row.isDefault,
    has_password: Boolean(row.password),
  };
}

export type EmailWriteBody = {
  id?: string;
  label?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
  useSsl?: boolean;
  isDefault?: boolean;
};
