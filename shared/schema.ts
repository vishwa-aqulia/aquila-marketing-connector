import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const connectorConfigs = pgTable("connector_configs", {
  id: serial("id").primaryKey(),
  connectorName: text("connector_name").notNull().unique(), // e.g., 'google_ads', 'ga4', 'facebook', 'bigquery'
  config: jsonb("config").notNull().default({}), // key-value pairs of config for this connector
  isActive: boolean("is_active").default(true),
});

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  status: text("status").notNull(), // 'running', 'success', 'failed'
  logs: text("logs").default(""),
  summary: jsonb("summary").default({}),
});

export const insertConnectorConfigSchema = createInsertSchema(connectorConfigs).omit({ id: true });
export const insertRunSchema = createInsertSchema(runs).omit({ id: true, startTime: true });

// Contract types
export type ConnectorConfig = typeof connectorConfigs.$inferSelect;
export type InsertConnectorConfig = z.infer<typeof insertConnectorConfigSchema>;
export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;
