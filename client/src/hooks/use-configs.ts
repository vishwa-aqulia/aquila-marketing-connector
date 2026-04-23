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

export function useConfigs() {
  return useQuery({
    queryKey: [api.configs.list.path],
    queryFn: async () => {
      const res = await fetch(api.configs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch configs");
      const data = await res.json();
      return parseWithLogging(api.configs.list.responses[200], data, "configs.list");
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ connectorName, config, isActive }: { connectorName: string; config?: Record<string, any>; isActive?: boolean }) => {
      const url = buildUrl(api.configs.update.path, { connectorName });
      
      const payload: Record<string, any> = {};
      if (config !== undefined) payload.config = config;
      if (isActive !== undefined) payload.isActive = isActive;
      payload.connectorName = connectorName;

      const validated = api.configs.update.input.parse(payload);
      
      const res = await fetch(url, {
        method: api.configs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.configs.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update config");
      }
      
      return api.configs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.configs.list.path] });
    },
  });
}
