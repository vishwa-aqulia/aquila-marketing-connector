import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.configs.list.path, async (req, res) => {
    const configs = await storage.getConnectorConfigs();
    res.json(configs);
  });

  app.put(api.configs.update.path, async (req, res) => {
    try {
      const { connectorName } = req.params;
      const input = api.configs.update.input.parse(req.body);
      const config = await storage.upsertConnectorConfig(connectorName, input);
      res.json(config);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.runs.list.path, async (req, res) => {
    const runs = await storage.getRuns();
    res.json(runs);
  });

  app.get(api.runs.get.path, async (req, res) => {
    const run = await storage.getRun(Number(req.params.id));
    if (!run) {
      return res.status(404).json({ message: "Run not found" });
    }
    res.json(run);
  });

  app.post(api.runs.trigger.path, async (req, res) => {
    try {
      const input = api.runs.trigger.input.parse(req.body);
      
      const newRun = await storage.createRun({
        status: "running",
        logs: "Starting run...\n",
      });

      // We spawn the python script in the background so we don't block the request
      const pythonArgs = ["main.py"];
      
      if (input.connectorNames && input.connectorNames.length > 0) {
        pythonArgs.push("--connectors", ...input.connectorNames);
      }
      
      if (input.daysBack) {
        pythonArgs.push("--days-back", input.daysBack.toString());
      }
      
      if (input.dryRun) {
        pythonArgs.push("--dry-run");
      }

      // Generate .env file contents from connector configs
      // In a real production app, we would use a more robust way to pass secrets 
      // instead of writing to a local .env file or we'd set process.env for the child process.
      const configs = await storage.getConnectorConfigs();
      const envVars: Record<string, string> = { ...process.env };
      
      for (const config of configs) {
        if (config.isActive && config.config) {
          const confObj = config.config as Record<string, any>;
          for (const [key, value] of Object.entries(confObj)) {
            envVars[key] = String(value);
          }
        }
      }

      let saJsonTempFile: string | null = null;
      const saValue = envVars["GOOGLE_APPLICATION_CREDENTIALS"];
      if (saValue && saValue.trimStart().startsWith("{")) {
        saJsonTempFile = `/tmp/sa-${newRun.id}.json`;
        fs.writeFileSync(saJsonTempFile, saValue, "utf-8");
        envVars["GOOGLE_APPLICATION_CREDENTIALS"] = saJsonTempFile;
      }

      const child = spawn("python", pythonArgs, {
        cwd: path.resolve(process.cwd(), "python"),
        env: envVars,
      });

      let logs = "Starting run...\n";

      child.stdout.on("data", async (data) => {
        const text = data.toString();
        logs += text;
        await storage.updateRun(newRun.id, { logs });
      });

      child.stderr.on("data", async (data) => {
        const text = data.toString();
        logs += text;
        await storage.updateRun(newRun.id, { logs });
      });

      child.on("error", async (err) => {
        logs += `\nFailed to start process: ${err.message}`;
        await storage.updateRun(newRun.id, {
          logs,
          status: "failed",
          endTime: new Date()
        });
        if (saJsonTempFile) {
          try { fs.unlinkSync(saJsonTempFile); } catch {}
        }
      });

      child.on("close", async (code) => {
        logs += `\nProcess exited with code ${code}`;

        // Extract and strip the machine-readable summary line
        let summary: Record<string, any> = {};
        const summaryPrefix = "__SUMMARY_JSON__:";
        const summaryLineIndex = logs.split("\n").findIndex(l => l.startsWith(summaryPrefix));
        if (summaryLineIndex !== -1) {
          const lines = logs.split("\n");
          const summaryLine = lines[summaryLineIndex];
          try {
            summary = JSON.parse(summaryLine.slice(summaryPrefix.length));
          } catch {}
          lines.splice(summaryLineIndex, 1);
          logs = lines.join("\n");
        }

        // Derive real status from what actually happened, not just exit code
        const status = deriveRunStatus(summary, code ?? 1);

        await storage.updateRun(newRun.id, { 
          logs,
          summary,
          status,
          endTime: new Date()
        });
        if (saJsonTempFile) {
          try { fs.unlinkSync(saJsonTempFile); } catch {}
        }
      });

      res.status(201).json(newRun);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}

function deriveRunStatus(summary: Record<string, any>, exitCode: number): string {
  const connectorEntries = Object.entries(summary).filter(([k]) => k !== "bigquery_load");
  const bqLoad = summary["bigquery_load"] as Record<string, any> | undefined;

  if (connectorEntries.length === 0) return "failed";

  const extracted = connectorEntries.filter(([, v]) =>
    v.status === "extracted" || v.status === "extracted_dry_run"
  );
  const hardFailed = connectorEntries.filter(([, v]) =>
    v.status === "auth_failed" || v.status === "error"
  );
  const skipped = connectorEntries.filter(([, v]) => v.status === "skipped");

  // Nothing extracted at all
  if (extracted.length === 0) {
    if (hardFailed.length === 0) return "skipped"; // all were credential-skipped
    return "failed"; // at least one actually errored
  }

  // Something was extracted — check BQ
  const bqFailed = bqLoad?.status === "failed";
  if (bqFailed) return "partial"; // extracted but couldn't load

  // Extracted successfully — partial if some connectors didn't contribute
  if (hardFailed.length > 0 || skipped.length > 0) return "partial";

  return "success";
}

const DEFAULT_CONNECTOR_CONFIGS: Record<string, Record<string, string>> = {
  google_ads: { GOOGLE_ADS_DEVELOPER_TOKEN: "", GOOGLE_ADS_CLIENT_ID: "", GOOGLE_ADS_CLIENT_SECRET: "", GOOGLE_ADS_REFRESH_TOKEN: "", GOOGLE_ADS_CUSTOMER_ID: "", GOOGLE_ADS_LOGIN_CUSTOMER_ID: "" },
  ga4: { GA4_PROPERTY_ID: "", GOOGLE_APPLICATION_CREDENTIALS: "" },
  google_guaranteed: { GOOGLE_GUARANTEED_CLIENT_ID: "", GOOGLE_GUARANTEED_CLIENT_SECRET: "", GOOGLE_GUARANTEED_REFRESH_TOKEN: "" },
  google_business: { GOOGLE_BUSINESS_ACCOUNT_ID: "", GOOGLE_BUSINESS_LOCATION_ID: "", GOOGLE_BUSINESS_CLIENT_ID: "", GOOGLE_BUSINESS_CLIENT_SECRET: "", GOOGLE_BUSINESS_REFRESH_TOKEN: "" },
  facebook: { FACEBOOK_APP_ID: "", FACEBOOK_APP_SECRET: "", FACEBOOK_ACCESS_TOKEN: "", FACEBOOK_AD_ACCOUNT_ID: "" },
  instagram: { INSTAGRAM_ACCESS_TOKEN: "", INSTAGRAM_BUSINESS_ACCOUNT_ID: "" },
  youtube: { YOUTUBE_CLIENT_ID: "", YOUTUBE_CLIENT_SECRET: "", YOUTUBE_REFRESH_TOKEN: "", YOUTUBE_CHANNEL_ID: "" },
  bigquery: { BIGQUERY_PROJECT_ID: "", BIGQUERY_DATASET_ID: "marketing_data", BIGQUERY_LOCATION: "US" },
};

// Function to seed database initially — upserts any missing connectors without touching existing data
export async function seedDatabase() {
  const existing = await storage.getConnectorConfigs();
  const existingNames = new Set(existing.map(c => c.connectorName));
  for (const [name, config] of Object.entries(DEFAULT_CONNECTOR_CONFIGS)) {
    if (!existingNames.has(name)) {
      await storage.upsertConnectorConfig(name, { config });
    }
  }
}
