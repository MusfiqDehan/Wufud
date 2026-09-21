"use client";

import { PACKAGE_GATED_KEYS, TENANT_REGISTRY } from "@wufud/contracts";
import { Card } from "@/components/ui/card";

export function FeatureChecklist({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {TENANT_REGISTRY.map((group) => {
        const items = group.children.filter((c) => PACKAGE_GATED_KEYS.has(c.key));
        if (!items.length) return null;
        return (
          <Card key={group.group} className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{group.group}</h3>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={Boolean(value[item.key])}
                      disabled={disabled}
                      onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
                    />
                    <span>{item.name}</span>
                    <span className="text-xs text-slate-400">({item.key})</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
