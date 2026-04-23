import { db } from "./db";
import {
  connectorConfigs,
  runs,
  type ConnectorConfig,
  type InsertConnectorConfig,
  type Run,
  type InsertRun
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getConnectorConfigs(): Promise<ConnectorConfig[]>;
  getConnectorConfig(connectorName: string): Promise<ConnectorConfig | undefined>;
  upsertConnectorConfig(connectorName: string, config: Partial<InsertConnectorConfig>): Promise<ConnectorConfig>;
  
  getRuns(): Promise<Run[]>;
  getRun(id: number): Promise<Run | undefined>;
  createRun(run: InsertRun): Promise<Run>;
  updateRun(id: number, updates: Partial<InsertRun>): Promise<Run>;
}

export class DatabaseStorage implements IStorage {
  async getConnectorConfigs(): Promise<ConnectorConfig[]> {
    return await db.select().from(connectorConfigs);
  }

  async getConnectorConfig(connectorName: string): Promise<ConnectorConfig | undefined> {
    const [config] = await db
      .select()
      .from(connectorConfigs)
      .where(eq(connectorConfigs.connectorName, connectorName));
    return config;
  }

  async upsertConnectorConfig(connectorName: string, config: Partial<InsertConnectorConfig>): Promise<ConnectorConfig> {
    const [existing] = await db
      .select()
      .from(connectorConfigs)
      .where(eq(connectorConfigs.connectorName, connectorName));

    if (existing) {
      const [updated] = await db
        .update(connectorConfigs)
        .set(config)
        .where(eq(connectorConfigs.connectorName, connectorName))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(connectorConfigs)
        .values({
          connectorName,
          config: config.config || {},
          isActive: config.isActive !== undefined ? config.isActive : true,
        })
        .returning();
      return inserted;
    }
  }

  async getRuns(): Promise<Run[]> {
    return await db.select().from(runs).orderBy(desc(runs.id));
  }

  async getRun(id: number): Promise<Run | undefined> {
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    return run;
  }

  async createRun(run: InsertRun): Promise<Run> {
    const [inserted] = await db.insert(runs).values(run).returning();
    return inserted;
  }

  async updateRun(id: number, updates: Partial<InsertRun>): Promise<Run> {
    const [updated] = await db
      .update(runs)
      .set(updates)
      .where(eq(runs.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
