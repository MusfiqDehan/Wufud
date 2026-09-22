"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

type PermissionLevel = "none" | "view" | "edit" | "full";

type RolePermissionItem = {
  featureKey: string;
  permissionLevel: PermissionLevel;
};

type Role = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  color?: string;
  permissions?: RolePermissionItem[];
};

type Branch = {
  id: string;
  name: string;
  code: string;
  city?: string;
};

type Member = {
  id: string;
  full_name: string;
  email: string;
  roles?: { id: string; name: string; slug: string; branch_name?: string }[];
};

export default function UsersPage() {
  const list = useCrudList<Member>("users", "/api/users");
  const rolesList = useCrudList<Role>("roles", "/api/roles?page_size=100");
  const branchesList = useCrudList<Branch>("branches", "/api/branches?page_size=100");
  const mutate = useApiMutation<Record<string, unknown>>(["users"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("users", "edit");
  const canAssign = can("permissions", "edit");

  const roles = useMemo(() => rolesList.data?.items ?? [], [rolesList.data]);
  const branches = useMemo(() => branchesList.data?.items ?? [], [branchesList.data]);
  const defaultRoleSlug = useMemo(() => roles.find((r) => r.slug === "agent")?.slug ?? roles[0]?.slug ?? "agent", [roles]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [branchId, setBranchId] = useState("");

  const [assignFor, setAssignFor] = useState<Member | null>(null);
  const [assignSlug, setAssignSlug] = useState("");
  const [assignBranchId, setAssignBranchId] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const agents = rows.length;

  const currentInviteRole = roles.find((r) => r.slug === (roleSlug || defaultRoleSlug));
  const currentAssignRole = roles.find((r) => r.slug === (assignSlug || defaultRoleSlug));

  return (
    <GuardedShell plane="tenant" feature="users" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Invite staff and manage branch-scoped roles.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value={list.data ? String(agents) : "—"} hint="Across the agency" />
        <StatCard label="Available Roles" value={rolesList.data ? String(roles.length) : "—"} hint="Configured in Permissions" />
      </div>

      <div className="mt-4">
        <ManagedTable<Member>
            rows={rows}
            searchKeys={["full_name", "email"]}
            searchPlaceholder="Search name or email…"
            onAdd={canEdit ? () => { setInviteOpen(true); setRoleSlug(defaultRoleSlug); setBranchId(""); } : undefined}
            addLabel="Invite member"
            columns={[
              {
                key: "full_name",
                header: "Member",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">{r.full_name.slice(0, 1).toUpperCase()}</span>
                    <div><p className="font-medium">{r.full_name}</p><p className="text-xs text-slate-500">{r.email}</p></div>
                  </div>
                ),
              },
              { key: "email", header: "Email" },
              {
                key: "roles",
                header: "Assigned Role",
                render: (r) => (
                  <div className="flex flex-wrap gap-1.5">
                    {r.roles && r.roles.length > 0 ? (
                      r.roles.map((role) => (
                        <Badge
                          key={`${role.slug}-${role.branch_name ?? "global"}`}
                          className={cn(
                            role.slug === "admin"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : role.slug === "manager"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                          )}
                        >
                          {role.name}
                          {role.branch_name ? ` · ${role.branch_name}` : ""}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No role assigned</span>
                    )}
                  </div>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      ...(canAssign ? [{ label: "Assign role", onSelect: () => { setAssignFor(row); setAssignSlug(row.roles?.[0]?.slug ?? defaultRoleSlug); setAssignBranchId(""); } }] : []),
                      ...(canEdit ? [{ label: "Resend invite", onSelect: () => mutate.mutate({ path: "/api/users/invite", method: "POST", body: { email: row.email, fullName: row.full_name } }) }] : []),
                    ]}
                  />
                ),
              },
            ]}
          />
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite member" description="They receive an invitation to join your agency workspace with the assigned role permissions.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({
              path: "/api/users/invite",
              method: "POST",
              body: {
                email,
                fullName,
                roleSlug: roleSlug || defaultRoleSlug,
                branchId: branchId || undefined,
              },
            });
            setEmail("");
            setFullName("");
            setInviteOpen(false);
          }}
        >
          <div>
            <Label>Email address</Label>
            <Input type="email" placeholder="colleague@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Full name</Label>
            <Input placeholder="e.g. Sarah Khan" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
              value={roleSlug || defaultRoleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name} {r.isSystem ? "(System role)" : "(Custom role)"}
                </option>
              ))}
            </select>
            {currentInviteRole?.description && (
              <p className="mt-1 text-xs text-slate-500">{currentInviteRole.description}</p>
            )}
          </div>

          {branches.length > 0 && (
            <div>
              <Label>Branch scope (optional)</Label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">All branches (Headquarters / Agency-wide)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}){b.city ? ` — ${b.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentInviteRole?.permissions && currentInviteRole.permissions.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/75 p-3 dark:border-navy-700 dark:bg-navy-900/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Shield size={13} className="text-teal-600" />
                <span>Feature access granted by this role:</span>
              </div>
              <div className="mt-2.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {currentInviteRole.permissions
                  .filter((p) => p.permissionLevel !== "none")
                  .map((p) => (
                    <span
                      key={p.featureKey}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-2xs dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
                    >
                      <span className="capitalize">{p.featureKey.replace(/_/g, " ")}</span>
                      <span
                        className={cn(
                          "rounded px-1 text-[9px] font-semibold uppercase",
                          p.permissionLevel === "full"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                            : p.permissionLevel === "edit"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {p.permissionLevel}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit">Send invite</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(assignFor)} onClose={() => setAssignFor(null)} title={`Assign role · ${assignFor?.full_name ?? ""}`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!assignFor) return;
            mutate.mutate({
              path: `/api/users/${assignFor.id}/roles`,
              method: "POST",
              body: {
                assignments: [
                  {
                    roleSlug: assignSlug || defaultRoleSlug,
                    branchId: assignBranchId || undefined,
                  },
                ],
              },
            });
            setAssignFor(null);
          }}
        >
          <div>
            <Label>Select role</Label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
              value={assignSlug || defaultRoleSlug}
              onChange={(e) => setAssignSlug(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name} {r.isSystem ? "(System role)" : "(Custom role)"}
                </option>
              ))}
            </select>
            {currentAssignRole?.description && (
              <p className="mt-1 text-xs text-slate-500">{currentAssignRole.description}</p>
            )}
          </div>

          {branches.length > 0 && (
            <div>
              <Label>Branch scope (optional)</Label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
                value={assignBranchId}
                onChange={(e) => setAssignBranchId(e.target.value)}
              >
                <option value="">All branches (Headquarters / Agency-wide)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}){b.city ? ` — ${b.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentAssignRole?.permissions && currentAssignRole.permissions.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/75 p-3 dark:border-navy-700 dark:bg-navy-900/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Shield size={13} className="text-teal-600" />
                <span>Feature access granted:</span>
              </div>
              <div className="mt-2.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {currentAssignRole.permissions
                  .filter((p) => p.permissionLevel !== "none")
                  .map((p) => (
                    <span
                      key={p.featureKey}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-2xs dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
                    >
                      <span className="capitalize">{p.featureKey.replace(/_/g, " ")}</span>
                      <span
                        className={cn(
                          "rounded px-1 text-[9px] font-semibold uppercase",
                          p.permissionLevel === "full"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                            : p.permissionLevel === "edit"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {p.permissionLevel}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button size="sm" type="submit">Assign role</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
