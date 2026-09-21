"use client";

import { useMemo, useState } from "react";
import { GuardedShell } from "@/components/layout/guarded-shell";
import { ManagedTable } from "@/components/data/managed-table";
import { StatCard } from "@/components/data/stat-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/row-actions";
import { useApiMutation, useCrudList } from "@/features/crud";
import { TENANT_REGISTRY, PERMISSION_KEYS } from "@wufud/contracts";
import { useFeatureAccess } from "@/lib/auth";
import {
  Copy,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  Info,
  Lock,
  Package,
  Plus,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  permissions?: RolePermissionItem[];
};

// Standard Presets for quick role configuration
const ROLE_PRESETS: Record<string, { label: string; description: string; permissions: Record<string, PermissionLevel> }> = {
  accountant: {
    label: "Accountant",
    description: "Full control over payments, refunds, vendors, expenses, stock, POS and reconciliation",
    permissions: {
      dashboard: "view",
      bookings: "view",
      accounts: "full",
      payments: "full",
      refunds: "full",
      vendors: "full",
      disbursements: "full",
      stock: "full",
      expenses: "full",
      settlements: "full",
      pos: "full",
      reports: "full",
      audit: "view",
    },
  },
  agent: {
    label: "Agency Agent",
    description: "Pilgrim registrations, booking management, vouchers and customer payments",
    permissions: {
      dashboard: "view",
      packages: "view",
      bookings: "edit",
      pilgrims: "edit",
      payments: "view",
      pos: "view",
    },
  },
  manager: {
    label: "Operations Manager",
    description: "Operational management of travel packages, bookings, staff and settings",
    permissions: {
      dashboard: "view",
      packages: "edit",
      bookings: "edit",
      pilgrims: "edit",
      users: "view",
      branches: "view",
      payments: "edit",
      refunds: "edit",
      accounts: "view",
      vendors: "view",
      disbursements: "view",
      stock: "view",
      expenses: "view",
      settlements: "view",
      pos: "view",
      reports: "view",
      audit: "view",
      permissions: "view",
      gateways: "view",
      domains: "view",
      seo: "edit",
      email: "edit",
      general_settings: "edit",
    },
  },
  viewer: {
    label: "Read-Only Viewer",
    description: "Inspection and auditing across all tenant modules without modification rights",
    permissions: Object.fromEntries([...PERMISSION_KEYS].map((k) => [k, "view" as PermissionLevel])),
  },
  full_admin: {
    label: "Full Access",
    description: "Full administrative permissions on every available workspace feature",
    permissions: Object.fromEntries([...PERMISSION_KEYS].map((k) => [k, "full" as PermissionLevel])),
  },
};

function getGroupIcon(groupName: string) {
  if (/core/i.test(groupName)) return Package;
  if (/people/i.test(groupName)) return Users;
  if (/account/i.test(groupName)) return CreditCard;
  if (/report/i.test(groupName)) return FileText;
  return Sliders;
}

export default function PermissionsPage() {
  const list = useCrudList<Role>("roles", "/api/roles?page_size=100");
  const mutate = useApiMutation<Record<string, unknown>>(["roles"]);
  const { can } = useFeatureAccess(["workspace-guide-access"]);
  const canEdit = can("permissions", "edit");
  const canFull = can("permissions", "full");

  // Filter state
  const [sysFilter, setSysFilter] = useState<"all" | "system" | "custom">("all");

  // Create Role State
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPreset, setCreatePreset] = useState<string>("blank");
  const [createPerms, setCreatePerms] = useState<Record<string, PermissionLevel>>({});

  // Matrix Editor State
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [matrixPerms, setMatrixPerms] = useState<Record<string, PermissionLevel>>({});
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixGroupFilter, setMatrixGroupFilter] = useState<string>("all");
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const customCount = rows.filter((r) => !r.isSystem).length;
  const systemCount = rows.length - customCount;

  // Open the permission matrix modal for a role
  const openMatrix = (role: Role) => {
    setActiveRole(role);
    const map: Record<string, PermissionLevel> = {};
    for (const p of role.permissions ?? []) {
      map[p.featureKey] = p.permissionLevel as PermissionLevel;
    }
    setMatrixPerms(map);
    setMatrixSearch("");
    setMatrixGroupFilter("all");
  };

  // Open the create modal with optional preset or cloning an existing role
  const openCreateModal = (cloneFrom?: Role) => {
    if (cloneFrom) {
      setCreateName(`${cloneFrom.name} Copy`);
      setCreateSlug(`${cloneFrom.slug}_copy`.toLowerCase().replace(/[^a-z0-9_]/g, ""));
      setCreateDesc(cloneFrom.description ? `Copy of ${cloneFrom.description}` : `Customized copy of ${cloneFrom.name}`);
      const map: Record<string, PermissionLevel> = {};
      for (const p of cloneFrom.permissions ?? []) {
        map[p.featureKey] = p.permissionLevel as PermissionLevel;
      }
      setCreatePerms(map);
      setCreatePreset("custom");
    } else {
      setCreateName("");
      setCreateSlug("");
      setCreateDesc("");
      setCreatePreset("blank");
      setCreatePerms({});
    }
    setCreateOpen(true);
  };

  // Auto-slug generator when typing role name
  const handleNameChange = (val: string) => {
    setCreateName(val);
    if (!createSlug || createSlug === createName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")) {
      setCreateSlug(val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    }
  };

  // Preset changer in create dialog
  const handlePresetSelect = (key: string) => {
    setCreatePreset(key);
    if (key === "blank") {
      setCreatePerms({});
    } else if (ROLE_PRESETS[key]) {
      setCreatePerms({ ...ROLE_PRESETS[key].permissions });
    }
  };

  // Save the matrix changes via PATCH /api/roles/:id
  const handleSaveMatrix = async () => {
    if (!activeRole || activeRole.isSystem) return;
    setIsSavingMatrix(true);
    try {
      const permsArray: RolePermissionItem[] = Object.entries(matrixPerms)
        .filter(([, level]) => level && level !== "none")
        .map(([featureKey, permissionLevel]) => ({ featureKey, permissionLevel }));

      await mutate.mutateAsync({
        path: `/api/roles/${activeRole.id}`,
        method: "PATCH",
        body: {
          permissions: permsArray,
        },
      });
      setActiveRole(null);
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // Bulk set levels
  const setBulkLevel = (level: PermissionLevel, groupName?: string) => {
    setMatrixPerms((prev) => {
      const next = { ...prev };
      const groupsToUpdate = groupName
        ? TENANT_REGISTRY.filter((g) => g.group === groupName)
        : TENANT_REGISTRY;

      for (const grp of groupsToUpdate) {
        for (const f of grp.children) {
          if (level === "none") {
            delete next[f.key];
          } else {
            next[f.key] = level;
          }
        }
      }
      return next;
    });
  };

  // Apply a preset directly into active matrix
  const applyPresetToMatrix = (presetKey: string) => {
    if (!ROLE_PRESETS[presetKey]) return;
    setMatrixPerms({ ...ROLE_PRESETS[presetKey].permissions });
  };

  // Filtered registry for the matrix
  const filteredGroups = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase();
    return TENANT_REGISTRY.map((grp) => {
      if (matrixGroupFilter !== "all" && grp.group.toLowerCase() !== matrixGroupFilter.toLowerCase()) {
        return { ...grp, children: [] };
      }
      const matchingChildren = grp.children.filter((item) => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      });
      return { ...grp, children: matchingChildren };
    }).filter((grp) => grp.children.length > 0);
  }, [matrixSearch, matrixGroupFilter]);

  // Count active permissions in current matrix
  const matrixStats = useMemo(() => {
    let full = 0;
    let edit = 0;
    let view = 0;
    for (const lvl of Object.values(matrixPerms)) {
      if (lvl === "full") full++;
      else if (lvl === "edit") edit++;
      else if (lvl === "view") view++;
    }
    const totalGranted = full + edit + view;
    return { full, edit, view, totalGranted };
  }, [matrixPerms]);

  return (
    <GuardedShell plane="tenant" feature="permissions" level="view">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Role & Feature Access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define granular access permissions across Core, People, Accounts, Reports, and Administration modules.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Roles"
          value={list.data ? String(rows.length) : "—"}
          hint={`${customCount} custom · ${systemCount} system`}
          onClick={() => setSysFilter("all")}
          active={sysFilter === "all"}
        />
        <StatCard
          label="System Roles"
          value={String(systemCount)}
          hint="Platform defaults (Inspect & Clone)"
          onClick={() => setSysFilter("system")}
          active={sysFilter === "system"}
        />
        <StatCard
          label="Custom Roles"
          value={String(customCount)}
          hint="Fully customizable permissions"
          onClick={() => setSysFilter("custom")}
          active={sysFilter === "custom"}
        />
      </div>

      <div className="mt-6">
        <ManagedTable<Role>
          rows={rows}
          initialFilter={sysFilter === "all" ? undefined : sysFilter === "system" ? (r) => r.isSystem : (r) => !r.isSystem}
          searchKeys={["name", "slug", "description"]}
          searchPlaceholder="Search roles by name or slug…"
          onAdd={canEdit ? () => openCreateModal() : undefined}
          addLabel="Create role"
          columns={[
            {
              key: "name",
              header: "Role Profile",
              render: (r) => (
                <div className="min-w-44 py-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</p>
                    {r.isSystem ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-navy-700 dark:text-slate-300">
                        <Lock size={11} /> System
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        <Sparkles size={11} /> Custom
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{r.slug}</p>
                  {r.description ? <p className="mt-1 text-xs text-slate-500 line-clamp-1">{r.description}</p> : null}
                </div>
              ),
            },
            {
              key: "permissions",
              header: "Feature Access Summary",
              render: (r) => {
                if (r.slug === "admin") {
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        All features (Full Access)
                      </Badge>
                    </div>
                  );
                }

                const perms = r.permissions ?? [];
                if (perms.length === 0) {
                  return <span className="text-xs text-slate-400">No permissions assigned</span>;
                }

                const fullCount = perms.filter((p) => p.permissionLevel === "full").length;
                const editCount = perms.filter((p) => p.permissionLevel === "edit").length;
                const viewCount = perms.filter((p) => p.permissionLevel === "view").length;

                return (
                  <div className="space-y-1.5 py-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {perms.length} features:
                      </span>
                      {fullCount > 0 && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {fullCount} full
                        </span>
                      )}
                      {editCount > 0 && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          {editCount} edit
                        </span>
                      )}
                      {viewCount > 0 && (
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                          {viewCount} view
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {perms.slice(0, 4).map((p) => (
                        <span
                          key={p.featureKey}
                          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
                        >
                          {p.featureKey}
                        </span>
                      ))}
                      {perms.length > 4 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-navy-700 dark:text-slate-400">
                          +{perms.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex items-center gap-2">
                  {row.isSystem ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMatrix(row)}
                      className="h-8 gap-1 text-xs"
                      title="Inspect permissions of this system role"
                    >
                      <Eye size={13} /> View Matrix
                    </Button>
                  ) : (
                    canEdit && (
                      <Button
                        size="sm"
                        onClick={() => openMatrix(row)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Edit3 size={13} /> Manage Access
                      </Button>
                    )
                  )}

                  <RowActions
                    actions={[
                      ...(row.isSystem
                        ? [
                            {
                              label: "View permissions matrix",
                              onSelect: () => openMatrix(row),
                            },
                            ...(canEdit
                              ? [
                                  {
                                    label: "Duplicate as custom role",
                                    onSelect: () => openCreateModal(row),
                                  },
                                ]
                              : []),
                          ]
                        : [
                            ...(canEdit
                              ? [
                                  {
                                    label: "Configure feature access",
                                    onSelect: () => openMatrix(row),
                                  },
                                  {
                                    label: "Duplicate role",
                                    onSelect: () => openCreateModal(row),
                                  },
                                ]
                              : []),
                            ...(canFull
                              ? [
                                  {
                                    label: "Archive role",
                                    danger: true as const,
                                    onSelect: () => mutate.mutate({ path: `/api/roles/${row.id}`, method: "DELETE" }),
                                  },
                                ]
                              : []),
                          ]),
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. COMPREHENSIVE FEATURE ACCESS & PERMISSIONS MATRIX DIALOG                */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(activeRole)}
        onClose={() => setActiveRole(null)}
        extraWide
        title={
          activeRole?.isSystem
            ? `System Role Matrix · ${activeRole?.name ?? ""}`
            : `Feature Permissions · ${activeRole?.name ?? ""}`
        }
        description={
          activeRole?.isSystem
            ? "System roles are predefined platform profiles and read-only. You can clone this role into a custom role to customize feature access levels."
            : "Assign specific feature access levels (None, View, Edit, Full) across each workspace module."
        }
      >
        <div className="space-y-5">
          {/* Header Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-surface p-3.5 dark:border-navy-700 dark:bg-navy-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {activeRole?.name} <span className="font-mono text-xs font-normal text-slate-500">({activeRole?.slug})</span>
                </p>
                <p className="text-xs text-slate-500">
                  {activeRole?.description || (activeRole?.isSystem ? "Built-in system role" : "Custom agency role")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Current Access:</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {matrixStats.full} Full
                </span>
                <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {matrixStats.edit} Edit
                </span>
                <span className="rounded bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {matrixStats.view} View
                </span>
              </div>
            </div>
          </div>

          {/* Quick Toolbar for Custom Roles */}
          {!activeRole?.isSystem && canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-navy-700 dark:bg-navy-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preset:</span>
                <select
                  aria-label="Load preset permissions"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200"
                  onChange={(e) => {
                    if (e.target.value) {
                      applyPresetToMatrix(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Load preset...</option>
                  {Object.entries(ROLE_PRESETS).map(([k, p]) => (
                    <option key={k} value={k}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400">Set All:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setBulkLevel("view")}
                >
                  All View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-amber-700 dark:text-amber-300"
                  onClick={() => setBulkLevel("edit")}
                >
                  All Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-emerald-700 dark:text-emerald-300"
                  onClick={() => setBulkLevel("full")}
                >
                  All Full
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-rose-600 dark:text-rose-400"
                  onClick={() => setBulkLevel("none")}
                >
                  Revoke All
                </Button>
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                placeholder="Filter features by name or key…"
                aria-label="Filter features"
                className="h-10 pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {["all", "Core", "People", "Accounts", "Reports", "Administration"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMatrixGroupFilter(cat)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                    matrixGroupFilter.toLowerCase() === cat.toLowerCase()
                      ? "bg-navy-900 text-white dark:bg-teal-200 dark:text-navy-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-700 dark:text-slate-300"
                  )}
                >
                  {cat === "all" ? "All Domains" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Matrix Accordion / Table */}
          <div className="max-h-[50vh] space-y-4 overflow-y-auto overscroll-contain pr-1">
            {filteredGroups.map((group) => {
              const GroupIcon = getGroupIcon(group.group);
              const activeCount = group.children.filter((c) => matrixPerms[c.key] && matrixPerms[c.key] !== "none").length;

              return (
                <div
                  key={group.group}
                  className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs dark:border-navy-700 dark:bg-navy-900"
                >
                  {/* Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-navy-800 dark:bg-navy-800/60">
                    <div className="flex items-center gap-2">
                      <GroupIcon size={16} className="text-teal-600 dark:text-teal-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {group.group}
                      </h3>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-navy-700 dark:text-slate-300">
                        {activeCount} of {group.children.length} active
                      </span>
                    </div>

                    {!activeRole?.isSystem && canEdit && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400 mr-1">Group:</span>
                        <button
                          type="button"
                          onClick={() => setBulkLevel("view", group.group)}
                          className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-navy-700"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkLevel("edit", group.group)}
                          className="rounded px-1.5 py-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-navy-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkLevel("full", group.group)}
                          className="rounded px-1.5 py-0.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-navy-700"
                        >
                          Full
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkLevel("none", group.group)}
                          className="rounded px-1.5 py-0.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-navy-700"
                        >
                          None
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Feature Rows */}
                  <div className="divide-y divide-slate-100 dark:divide-navy-800">
                    {group.children.map((feature) => {
                      const currentLevel: PermissionLevel = matrixPerms[feature.key] ?? "none";

                      return (
                        <div
                          key={feature.key}
                          className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-navy-800/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {feature.name}
                              </p>
                              <span className="font-mono text-[11px] text-slate-400">
                                {feature.key}
                              </span>
                              {feature.route && (
                                <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-navy-800 md:inline">
                                  {feature.route}
                                </span>
                              )}
                            </div>
                            {feature.description && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {feature.description}
                              </p>
                            )}
                          </div>

                          {/* 4-Level Segmented Pill Selector */}
                          <div className="flex items-center self-start sm:self-center">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-navy-700 dark:bg-navy-800">
                              {(
                                [
                                  { level: "none", label: "None", color: "bg-white text-slate-700 shadow-xs dark:bg-navy-900 dark:text-slate-300" },
                                  { level: "view", label: "View", color: "bg-sky-600 text-white font-semibold shadow-xs" },
                                  { level: "edit", label: "Edit", color: "bg-amber-600 text-white font-semibold shadow-xs" },
                                  { level: "full", label: "Full", color: "bg-emerald-600 text-white font-semibold shadow-xs" },
                                ] as const
                              ).map((lvl) => {
                                const isSelected = currentLevel === lvl.level;
                                return (
                                  <button
                                    key={lvl.level}
                                    type="button"
                                    disabled={activeRole?.isSystem || !canEdit}
                                    onClick={() => {
                                      setMatrixPerms((prev) => {
                                        const next = { ...prev };
                                        if (lvl.level === "none") {
                                          delete next[feature.key];
                                        } else {
                                          next[feature.key] = lvl.level;
                                        }
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                                      isSelected
                                        ? lvl.color
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                                      activeRole?.isSystem && !isSelected && "opacity-40 cursor-default",
                                      activeRole?.isSystem && isSelected && "cursor-default"
                                    )}
                                  >
                                    {lvl.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-navy-700">
            <div className="text-xs text-slate-500">
              {activeRole?.isSystem ? (
                <span>System roles cannot be modified directly.</span>
              ) : (
                <span>Changes will take effect immediately upon saving.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeRole?.isSystem ? (
                <>
                  <Button variant="ghost" onClick={() => setActiveRole(null)}>
                    Close
                  </Button>
                  {canEdit && (
                    <Button
                      onClick={() => {
                        const target = activeRole;
                        setActiveRole(null);
                        openCreateModal(target);
                      }}
                      className="gap-1.5"
                    >
                      <Copy size={14} /> Duplicate as Custom Role
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setActiveRole(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveMatrix}
                    disabled={isSavingMatrix}
                    className="gap-1.5"
                  >
                    {isSavingMatrix ? "Saving…" : "Save Permissions"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. CREATE ROLE / CLONE ROLE MODAL                                         */}
      {/* ========================================================================= */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        wide
        title={createPreset === "custom" ? "Duplicate Role" : "Create New Custom Role"}
        description="Establish a branch-scoped role and define its initial feature access profile."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const permsArray: RolePermissionItem[] = Object.entries(createPerms)
              .filter(([, level]) => level && level !== "none")
              .map(([featureKey, permissionLevel]) => ({ featureKey, permissionLevel }));

            await mutate.mutateAsync({
              path: "/api/roles",
              method: "POST",
              body: {
                name: createName,
                slug: createSlug,
                description: createDesc || undefined,
                permissions: permsArray,
              },
            });
            setCreateOpen(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={createName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Branch Accountant"
                required
              />
            </div>
            <div>
              <Label htmlFor="role-slug">Identifier (Slug)</Label>
              <Input
                id="role-slug"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="e.g. branch_accountant"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role-desc">Description (Optional)</Label>
            <Input
              id="role-desc"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="e.g. Manages payments, vendor disbursement, and financial reconciliation"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-surface p-3 dark:border-navy-700 dark:bg-navy-800">
            <Label className="font-semibold text-slate-900 dark:text-slate-100">
              Start with Permission Preset
            </Label>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose an archetype template or configure custom feature access after creation.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition",
                  createPreset === "blank"
                    ? "border-teal-500 bg-teal-50/50 dark:border-teal-400 dark:bg-navy-900"
                    : "border-slate-200 hover:border-slate-300 dark:border-navy-700"
                )}
              >
                <input
                  type="radio"
                  name="preset"
                  className="mt-1"
                  checked={createPreset === "blank"}
                  onChange={() => handlePresetSelect("blank")}
                />
                <div>
                  <p className="text-xs font-semibold">Blank (No Access)</p>
                  <p className="text-[11px] text-slate-500">Starts with 0 permissions. Configure from scratch.</p>
                </div>
              </label>

              {Object.entries(ROLE_PRESETS).map(([k, p]) => (
                <label
                  key={k}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition",
                    createPreset === k
                      ? "border-teal-500 bg-teal-50/50 dark:border-teal-400 dark:bg-navy-900"
                      : "border-slate-200 hover:border-slate-300 dark:border-navy-700"
                  )}
                >
                  <input
                    type="radio"
                    name="preset"
                    className="mt-1"
                    checked={createPreset === k}
                    onChange={() => handlePresetSelect(k)}
                  />
                  <div>
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {createPreset !== "blank" && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-teal-100/70 p-2 text-xs text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                <Info size={14} className="shrink-0" />
                <span>
                  {Object.keys(createPerms).length} initial feature access permissions will be assigned. You can further fine-tune any feature level after creating.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!createName.trim() || !createSlug.trim()}>
              Create Role
            </Button>
          </div>
        </form>
      </Dialog>
    </GuardedShell>
  );
}
