import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useRuns() {
  return useQuery({
    queryKey: [api.runs.list.path],
    queryFn: async () => {
      const res = await fetch(api.runs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch runs");
      const data = await res.json();
      return parseWithLogging(api.runs.list.responses[200], data, "runs.list");
    },
    // Poll every 3 seconds if any run is currently 'running'
    refetchInterval: (query) => {
      const runs = query.state.data;
      if (!runs) return false;
      const isRunning = runs.some(run => run.status === 'running');
      return isRunning ? 3000 : false;
    }
  });
}

export function useRun(id: number | null) {
  return useQuery({
    queryKey: [api.runs.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.runs.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch run details");
      const data = await res.json();
      return parseWithLogging(api.runs.get.responses[200], data, "runs.get");
    },
    enabled: id !== null,
    // Poll if this specific run is running
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 3000 : false;
    }
  });
}

export function useTriggerRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { connectorNames: string[]; daysBack: number; dryRun: boolean }) => {
      const validated = api.runs.trigger.input.parse(data);
      
      const res = await fetch(api.runs.trigger.path, {
        method: api.runs.trigger.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.runs.trigger.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to trigger run");
      }
      
      return api.runs.trigger.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.runs.list.path] });
    },
  });
}
