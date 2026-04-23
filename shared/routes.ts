import { z } from 'zod';
import { insertConnectorConfigSchema, connectorConfigs, runs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  configs: {
    list: {
      method: 'GET' as const,
      path: '/api/configs' as const,
      responses: {
        200: z.array(z.custom<typeof connectorConfigs.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/configs/:connectorName' as const,
      input: insertConnectorConfigSchema.partial(),
      responses: {
        200: z.custom<typeof connectorConfigs.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  runs: {
    list: {
      method: 'GET' as const,
      path: '/api/runs' as const,
      responses: {
        200: z.array(z.custom<typeof runs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/runs/:id' as const,
      responses: {
        200: z.custom<typeof runs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    trigger: {
      method: 'POST' as const,
      path: '/api/runs/trigger' as const,
      input: z.object({
        connectorNames: z.array(z.string()),
        daysBack: z.number().default(30),
        dryRun: z.boolean().default(false),
      }),
      responses: {
        201: z.custom<typeof runs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
