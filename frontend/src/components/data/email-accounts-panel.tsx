"use client";

import { useMemo, useState } from "react";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { useFeatureAccess } from "@/lib/auth";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { formatApiError } from "@/lib/api-error";

export type EmailAccount = {
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

const emptyForm = {
  label: "",
  host: "smtp.gmail.com",
  port: "465",
  username: "",
  password: "",
  fromAddress: "",
  fromName: "",
  useSsl: true,
  isDefault: false,
};

export function EmailAccountsPanel({
  path,
  feature,
  description,
}: {
  path: string;
  feature: string;
  description: string;
}) {
  const list = useCrudList<EmailAccount>("email-accounts", path);
  const mutate = useApiMutation<Record<string, unknown>>(["email-accounts"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can(feature, "edit");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const defaults = rows.filter((r) => r.is_default).length;

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, isDefault: rows.length === 0 });
    setOpen(true);
  };
  const startEdit = (row: EmailAccount) => {
    setEditing(row);
    setForm({
      label: row.label,
      host: row.host,
      port: String(row.port),
      username: row.username,
      password: "",
      fromAddress: row.from_address,
      fromName: row.from_name ?? "",
      useSsl: row.use_ssl,
      isDefault: row.is_default,
    });
    setOpen(true);
  };

  return (
    <>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {status ? <p role="status" className="mt-3 text-sm text-teal-700">{status}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mailboxes" value={list.data ? String(rows.length) : "—"} hint="Configured SMTP accounts" />
        <StatCard label="Default" value={String(defaults)} hint="Only one at a time" />
      </div>

      <div className="mt-4">
        <ManagedTable<EmailAccount>
          rows={rows}
          searchKeys={["label", "host", "username", "from_address"]}
          searchPlaceholder="Search mailboxes…"
          onAdd={canEdit ? startCreate : undefined}
          addLabel="Add mailbox"
          columns={[
            {
              key: "label",
              header: "Mailbox",
              render: (r) => (
                <div>
                  <p className="font-medium">{r.label}</p>
                  <p className="font-mono text-xs text-slate-500">{r.username} · {r.host}:{r.port}</p>
                </div>
              ),
            },
            { key: "from_address", header: "From", render: (r) => r.from_name ? `${r.from_name} <${r.from_address}>` : r.from_address },
            { key: "has_password", header: "Password", render: (r) => (r.has_password ? <Badge>saved</Badge> : <span className="text-xs text-slate-400">Missing</span>) },
            { key: "is_default", header: "Default", render: (r) => (r.is_default ? <Badge>default</Badge> : <span className="text-xs text-slate-400">—</span>) },
            {
              key: "actions",
              header: "",
              render: (row) =>
                canEdit ? (
                  <RowActions
                    actions={[
                      { label: "Edit", onSelect: () => startEdit(row) },
                      { label: "Set as default", onSelect: () => mutate.mutate({ path: `${path}/${row.id}/default`, method: "POST" }), disabled: row.is_default },
                      { label: "Send test", onSelect: () => mutate.mutate({ path: `${path}/${row.id}/test`, method: "POST", body: {} }, { onSuccess: () => setStatus("Test message sent."), onError: (err) => setError(formatApiError(err)) }) },
                      { label: "Remove", danger: true, onSelect: () => setRemoveId(row.id) },
                    ]}
                  />
                ) : (
                  <span className="text-xs text-slate-400">No access</span>
                ),
            },
          ]}
          empty="No mailboxes yet. Add SMTP credentials to send invitations."
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit mailbox" : "Add mailbox"} description="Passwords are stored server-side and never shown again. Leave the password blank to keep the current secret." wide>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setStatus("");
            mutate.mutate(
              {
                path: editing ? `${path}/${editing.id}` : path,
                method: editing ? "PATCH" : "POST",
                body: {
                  label: form.label,
                  host: form.host,
                  port: Number(form.port),
                  username: form.username,
                  password: form.password || undefined,
                  fromAddress: form.fromAddress || form.username,
                  fromName: form.fromName || undefined,
                  useSsl: form.useSsl,
                  isDefault: form.isDefault || rows.length === 0,
                },
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  setStatus("Mailbox saved.");
                },
                onError: (err) => setError(formatApiError(err)),
              },
            );
          }}
        >
          <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required placeholder="Gmail SMTP" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Host</Label><Input value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} required /></div>
            <div><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value, useSsl: e.target.value === "465" ? true : f.useSsl }))} required /></div>
          </div>
          <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required /></div>
          <div><Label>Password</Label><PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? "Leave blank to keep current" : "App password"} /></div>
          <div><Label>From address</Label><Input type="email" value={form.fromAddress} onChange={(e) => setForm((f) => ({ ...f, fromAddress: e.target.value }))} placeholder="same as username" /></div>
          <div><Label>From name</Label><Input value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} placeholder="Wufud" /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.useSsl} onChange={(e) => setForm((f) => ({ ...f, useSsl: e.target.checked }))} />
            Use SSL (port 465)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault || rows.length === 0} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default mailbox
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutate.isPending}>{mutate.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeId)}
        onClose={() => setRemoveId(null)}
        title="Remove mailbox?"
        body="Invitations will use the remaining default mailbox. If this is the last account, outbound email stops until you add another."
        onConfirm={() => {
          if (!removeId) return;
          mutate.mutate({ path: `${path}/${removeId}`, method: "DELETE" });
          setRemoveId(null);
        }}
      />
    </>
  );
}
