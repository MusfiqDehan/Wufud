"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";

type Member = { id: string; full_name: string; email: string };

export default function UsersPage() {
  const list = useCrudList<Member>("users", "/api/users");
  const mutate = useApiMutation<Record<string, unknown>>(["users"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("users", "edit");
  const canAssign = can("permissions", "edit");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleSlug, setRoleSlug] = useState("agent");
  const [assignFor, setAssignFor] = useState<Member | null>(null);
  const [assignSlug, setAssignSlug] = useState("agent");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const agents = rows.length;

  return (
    <GuardedShell plane="tenant" feature="users" level="view">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Invite staff and manage branch-scoped roles.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value={list.data ? String(agents) : "—"} hint="Across the agency" />
        <StatCard label="Invites open" value="—" hint="Share tokens with newcomers" />
      </div>

      <div className="mt-4">
        <ManagedTable<Member>
            rows={rows}
            searchKeys={["full_name", "email"]}
            searchPlaceholder="Search name or email…"
            onAdd={canEdit ? () => setInviteOpen(true) : undefined}
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
                key: "actions",
                header: "",
                render: (row) => (
                  <RowActions
                    actions={[
                      ...(canAssign ? [{ label: "Assign role", onSelect: () => { setAssignFor(row); setAssignSlug("agent"); } }] : []),
                      ...(canEdit ? [{ label: "Resend invite", onSelect: () => mutate.mutate({ path: "/api/users/invite", method: "POST", body: { email: row.email, fullName: row.full_name } }) }] : []),
                    ]}
                  />
                ),
              },
            ]}
          />
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite member" description="They receive an email when a default mailbox is configured.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate.mutate({ path: "/api/users/invite", method: "POST", body: { email, fullName, roleSlug } });
            setEmail(""); setFullName(""); setInviteOpen(false);
          }}
        >
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Role</Label><Input value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit">Send invite</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(assignFor)} onClose={() => setAssignFor(null)} title={`Assign role · ${assignFor?.full_name ?? ""}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!assignFor) return;
            mutate.mutate({ path: `/api/users/${assignFor.id}/roles`, method: "POST", body: { assignments: [{ roleSlug: assignSlug }] } });
            setAssignFor(null);
          }}
        >
          <div><Label>Role slug</Label><Input aria-label="Role slug" value={assignSlug} placeholder="agent" onChange={(e) => setAssignSlug(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button size="sm" type="submit">Assign</Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
