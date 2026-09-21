"use client";

import { useEffect, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { useFeatureAccess } from "@/lib/auth";

type Settings = {
  displayName: string;
  logoUrl?: string;
  primaryColor?: string;
  currency?: string;
};

export default function SettingsPage() {
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("general_settings", "edit");
  const [form, setForm] = useState<Settings>({ displayName: "", logoUrl: "", primaryColor: "#0d9488", currency: "BDT" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Settings>("/api/settings")
      .then((s) => {
        if (s) setForm({ displayName: s.displayName ?? "", logoUrl: s.logoUrl ?? "", primaryColor: s.primaryColor ?? "#0d9488", currency: s.currency ?? "BDT" });
      })
      .catch(() => setError("Could not load settings. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <GuardedShell plane="tenant" feature="general_settings" level="view">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-slate-500">
        Agency identity and defaults. Marketing copy (title, description, keywords) lives under SEO & branding; custom domains are managed
        under Domains.
      </p>
      <Card className="mt-4 max-w-xl space-y-4">
        {loading ? (
          <p role="status" className="text-sm text-slate-500">Loading settings…</p>
        ) : (
          <>
            <div>
              <Label>Agency display name</Label>
              <Input value={form.displayName} onChange={set("displayName")} required />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl ?? ""} onChange={set("logoUrl")} placeholder="https://…" />
            </div>
            <div>
              <Label>Primary color</Label>
              <div className="flex items-center gap-3">
                <input
                  aria-label="Primary color"
                  type="color"
                  value={form.primaryColor ?? "#0d9488"}
                  onChange={set("primaryColor")}
                  className="h-11 w-14 cursor-pointer rounded-xl border"
                />
                <Input value={form.primaryColor ?? ""} onChange={set("primaryColor")} className="max-w-40" />
              </div>
            </div>
            <div>
              <Label>Base currency</Label>
              <Input value={form.currency ?? "BDT"} onChange={set("currency")} />
              <p className="mt-1 text-xs text-slate-500">Collections are recorded in BDT; vendor costs may be entered in SAR with an FX rate.</p>
            </div>
            <p className="text-xs text-slate-500">Timezone: Asia/Dhaka.</p>
            {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
            {status ? <p role="status" className="text-sm text-teal-600">{status}</p> : null}
            <Button
              disabled={!canEdit}
              onClick={async () => {
                setError("");
                setStatus("");
                try {
                  await api("/api/settings", { method: "POST", body: JSON.stringify(form) });
                  setStatus("Settings saved.");
                } catch (err) {
                  setError(formatApiError(err, "We couldn't save your settings. Try again."));
                }
              }}
            >
              Save settings
            </Button>
          </>
        )}
      </Card>
    </GuardedShell>
  );
}
