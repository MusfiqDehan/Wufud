"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export type Field = { name: string; label: string; type?: string; required?: boolean };

export function EntityForm({
  fields,
  onSubmit,
  submitLabel = "Save",
}: {
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
  submitLabel?: string;
}) {
  const form = useForm<Record<string, string>>();
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(onSubmit, (invalid) => {
        const first = Object.values(invalid)[0]?.message;
        if (first) form.setError("root", { message: String(first) });
      })}
    >
      {fields.map((f) => (
        <div key={f.name}>
          <Label htmlFor={`field-${f.name}`}>{f.label}</Label>
          {f.type === "password" ? (
            <PasswordInput
              id={`field-${f.name}`}
              autoComplete="new-password"
              required={f.required}
              {...form.register(f.name, {
                required: f.required ? `${f.label} is required.` : false,
              })}
            />
          ) : (
            <Input
              id={`field-${f.name}`}
              type={f.type ?? "text"}
              required={f.required}
              {...form.register(f.name, {
                required: f.required ? `${f.label} is required.` : false,
                validate: (value) => {
                  if (f.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return "Enter a valid email address.";
                  }
                  return true;
                },
              })}
            />
          )}
          {form.formState.errors[f.name]?.message ? (
            <p className="mt-1 text-sm text-red-600">{String(form.formState.errors[f.name]?.message)}</p>
          ) : null}
        </div>
      ))}
      {form.formState.errors.root?.message ? (
        <p role="alert" className="text-sm text-red-600">
          {String(form.formState.errors.root.message)}
        </p>
      ) : null}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
