"use client";

import { useEffect, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";

export default function SeoPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [robots, setRobots] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ title: string; description?: string; keywords?: string; ogImageUrl?: string; robots?: string }>("/api/platform/seo").then((s) => {
      setTitle(s.title ?? "");
      setDescription(s.description ?? "");
      setKeywords(s.keywords ?? "");
      setOgImageUrl(s.ogImageUrl ?? "");
      setRobots(s.robots ?? "");
    });
  }, []);

  return (
    <GuardedShell plane="platform" feature="platform.seo" level="view">
      <h1 className="text-2xl font-semibold">Platform SEO</h1>
      <p className="mt-2 text-sm text-slate-500">
        Defaults for the Wufud marketing site. Each agency overrides these on its own storefront under Dashboard → SEO & branding.
      </p>
      <Card className="mt-4 max-w-xl space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Keywords (comma separated)</Label>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </div>
        <div>
          <Label>Social share image URL</Label>
          <Input value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label>Robots directives</Label>
          <Input value={robots} onChange={(e) => setRobots(e.target.value)} placeholder="index, follow" />
        </div>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {status ? <p role="status" className="text-sm text-teal-600">{status}</p> : null}
        <Button
          onClick={async () => {
            setError("");
            setStatus("");
            try {
              await api("/api/platform/seo", { method: "PATCH", body: JSON.stringify({ title, description, keywords, ogImageUrl, robots }) });
              setStatus("Platform SEO saved.");
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
