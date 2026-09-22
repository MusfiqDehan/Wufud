"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Sparkles, Tag, ArrowUpRight, CheckCircle2, ShieldCheck, Wrench, Zap, Bug, Filter, Activity } from "lucide-react";
import type { ChangelogRelease } from "@/data/changelog-data";

interface ChangelogViewProps {
  releases: ChangelogRelease[];
}

type FilterCategory = "all" | "features" | "perf" | "fixes" | "security" | "maintenance";

export function ChangelogView({ releases }: ChangelogViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");

  const categoryLabels: { key: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All Updates", icon: <Tag className="h-3.5 w-3.5" /> },
    { key: "features", label: "Features", icon: <Sparkles className="h-3.5 w-3.5 text-teal-500" /> },
    { key: "perf", label: "Performance", icon: <Zap className="h-3.5 w-3.5 text-amber-500" /> },
    { key: "fixes", label: "Fixes", icon: <Bug className="h-3.5 w-3.5 text-rose-500" /> },
    { key: "security", label: "Security", icon: <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> },
    { key: "maintenance", label: "Maintenance", icon: <Wrench className="h-3.5 w-3.5 text-slate-500" /> },
  ];

  // Filter releases based on search query and category
  const filteredReleases = useMemo(() => {
    return releases
      .map((release) => {
        // Filter changes inside release
        const filteredChanges = release.changes.filter((change) => {
          const matchesCategory = selectedCategory === "all" || change.category === selectedCategory;
          const matchesSearch =
            searchQuery.trim() === "" ||
            change.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            release.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
            release.summary.toLowerCase().includes(searchQuery.toLowerCase());

          return matchesCategory && matchesSearch;
        });

        // Does the release meta match search even if changes are empty?
        const releaseMetaMatches =
          searchQuery.trim() !== "" &&
          (release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            release.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
            release.summary.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filteredChanges.length > 0 || (releaseMetaMatches && selectedCategory === "all")) {
          return {
            ...release,
            changes: filteredChanges.length > 0 ? filteredChanges : release.changes,
          };
        }
        return null;
      })
      .filter((r): r is ChangelogRelease => r !== null);
  }, [releases, searchQuery, selectedCategory]);

  const formatDate = (dateString: string) => {
    try {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "features":
        return <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />;
      case "perf":
        return <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case "fixes":
        return <Bug className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
      case "security":
        return <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Wrench className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "features":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60";
      case "perf":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
      case "fixes":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
      case "security":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Top Banner linking to Status page */}
      <div className="mb-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-teal-200/60 bg-teal-50/70 p-4 text-xs text-teal-900 backdrop-blur-sm sm:flex-row dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-200">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500"></span>
          </span>
          <span className="font-medium">All Wufud Core Services are operational.</span>
        </div>
        <Link
          href="/status"
          className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
          <Activity className="h-3.5 w-3.5" />
          View Live System Status
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Hero Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-teal-500" />
          Product Release Notes
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Wufud Changelog
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
          We ship continuous improvements, new features, and infrastructure upgrades to power modern Hajj & Umrah agencies.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/80">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search features, fixes, versions (e.g. Stripe, POS, hold)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden dark:border-navy-700 dark:bg-navy-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryLabels.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-navy-900 text-white dark:bg-teal-500 dark:text-navy-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-700 dark:text-slate-300 dark:hover:bg-navy-600"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="relative mt-12">
        {/* Vertical Rail for desktop */}
        <div className="absolute top-4 bottom-4 left-6 hidden w-0.5 bg-gradient-to-b from-teal-500 via-teal-300 to-slate-200 md:block dark:from-teal-400 dark:via-navy-700 dark:to-navy-800" />

        {filteredReleases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-navy-700">
            <Filter className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">No matching updates found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search query or switching the category filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 inline-flex items-center rounded-lg bg-navy-900 px-4 py-2 text-xs font-medium text-white hover:bg-navy-800 dark:bg-teal-500 dark:text-navy-900"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredReleases.map((release, rIdx) => (
              <div key={release.version} className="relative md:pl-16">
                {/* Glowing Node on the timeline rail */}
                <div className="absolute top-6 left-4 hidden h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-teal-500 bg-surface shadow-xs md:flex dark:bg-navy-900">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                </div>

                {/* Release Card */}
                <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xs transition-shadow hover:shadow-md sm:p-8 dark:border-navy-700/80 dark:bg-navy-800/90">
                  {/* Top Release Metadata Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-navy-700/60">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 font-mono text-sm font-bold text-teal-700 ring-1 ring-teal-600/20 ring-inset dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-400/20">
                        {release.version}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${
                          release.type === "major"
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                            : release.type === "minor"
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {release.type}
                      </span>
                      <time
                        dateTime={release.date}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400"
                      >
                        {formatDate(release.date)}
                      </time>
                    </div>

                    {release.releaseUrl && (
                      <a
                        href={release.releaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-300"
                      >
                        GitHub Release
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <div className="mt-5">
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                      {release.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {release.summary}
                    </p>
                  </div>

                  {/* Detailed Changes List */}
                  {release.changes.length > 0 && (
                    <div className="mt-6 space-y-3 pt-2">
                      <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                        Changes in this release
                      </h3>
                      <ul className="space-y-2.5">
                        {release.changes.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm transition-colors hover:bg-slate-50 dark:border-navy-700/40 dark:bg-navy-900/40 dark:hover:bg-navy-900/60"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${getCategoryBadgeClass(
                                  item.category,
                                )}`}
                              >
                                {getCategoryIcon(item.category)}
                                {item.category}
                              </span>
                              <span className="text-slate-700 dark:text-slate-200">{item.text}</span>
                            </div>

                            {item.commit && (
                              <a
                                href={`https://github.com/MusfiqDehan/Wufud/commit/${item.commit}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden shrink-0 font-mono text-xs text-slate-400 hover:text-teal-600 sm:inline dark:hover:text-teal-300"
                              >
                                #{item.commit.slice(0, 7)}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Callout */}
      <div className="mt-16 rounded-3xl border border-slate-200 bg-linear-to-r from-teal-50 to-slate-50 p-8 text-center sm:p-10 dark:border-navy-700 dark:from-navy-800 dark:to-navy-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Continuous Deployment & Reliability</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          Every pull request merged to our main branch undergoes automated testing, database migration validation, and zero-downtime container rollout.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/status"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-navy-800 dark:bg-teal-500 dark:text-navy-900 dark:hover:bg-teal-400"
          >
            <Activity className="h-4 w-4" />
            Check System Status
          </Link>
          <a
            href="https://github.com/MusfiqDehan/Wufud/releases"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700"
          >
            All GitHub Releases
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
