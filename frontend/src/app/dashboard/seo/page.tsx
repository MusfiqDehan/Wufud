"use client";

import { useEffect, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { useFeatureAccess } from "@/lib/auth";

export default function TenantSeo() {
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("seo", "edit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ title?: string; description?: string; keywords?: string; ogImageUrl?: string }>("/api/seo").then((s) => {
      if (!s) return;
      setTitle(s.title ?? "");
      setDescription(s.description ?? "");
      setKeywords(s.keywords ?? "");
      setOgImageUrl(s.ogImageUrl ?? "");
    });
  }, []);

  return (
    <GuardedShell plane="tenant" feature="seo" level="view">
      <h1 className="text-2xl font-semibold">SEO & branding</h1>
      <p className="mt-2 text-sm text-slate-500">
        How your agency appears on its storefront, in search results, and on branded pages. Agency name, logo, and color live under Settings.
      </p>
      <Card className="mt-4 max-w-xl space-y-3">
        <div>
          <Label>Page title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nur Travels — Hajj & Umrah" />
        </div>
        <div>
          <Label>Meta description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Trusted Hajj and Umrah packages from Dhaka" />
        </div>
        <div>
          <Label>Keywords (comma separated)</Label>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="hajj, umrah, ziyarah" />
        </div>
        <div>
          <Label>Social share image URL</Label>
          <Input value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {status ? <p role="status" className="text-sm text-teal-600">{status}</p> : null}
        <Button
          disabled={!canEdit}
          onClick={async () => {
            setError("");
            setStatus("");
            try {
              await api("/api/seo", { method: "POST", body: JSON.stringify({ title, description, keywords, ogImageUrl }) });
              setStatus("Branding saved.");
            } catch (err) {
              setError(formatApiError(err, "We couldn't save your SEO settings. Try again."));
            }
          }}
        >
          Save
        </Button>
      </Card>
    </GuardedShell>
  );
}
