"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiList } from "@/lib/api";
import type { ListData } from "@wufud/contracts";

export function useCrudList<T>(key: string, path: string) {
  return useQuery({
    queryKey: [key],
    queryFn: () => apiList<T>(path),
  });
}

export function useCrudMutation<TInput>(path: string, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TInput) => api(path, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      for (const k of invalidate) void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

export function useApiMutation<TInput>(invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: TInput }) =>
      api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () => {
      for (const k of invalidate) void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

export type { ListData };
