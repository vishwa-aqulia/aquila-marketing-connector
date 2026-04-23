import { X, Terminal, FileJson, Clock } from "lucide-react";
import { format } from "date-fns";
import { useRun } from "@/hooks/use-runs";
import { StatusBadge } from "./StatusBadge";
import { useEffect, useRef } from "react";

interface RunLogsModalProps {
  runId: number | null;
  onClose: () => void;
}

export function RunLogsModal({ runId, onClose }: RunLogsModalProps) {
  const { data: run, isLoading } = useRun(runId);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [run?.logs]);

  if (!runId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">
                Execution Logs #{runId}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {isLoading ? (
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                ) : (
                  <>
                    <StatusBadge status={run?.status || 'unknown'} />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {run?.startTime && format(new Date(run.startTime), "MMM d, HH:mm:ss")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Logs Terminal */}
          <div className="flex-1 bg-[#0d0d12] p-4 font-mono text-sm overflow-y-auto relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <span className="animate-pulse">Loading execution environment...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-zinc-300">
                {run?.logs || <span className="text-zinc-600 italic">No logs generated yet.</span>}
                <div ref={logsEndRef} />
              </div>
            )}
            
            {/* Overlay gradient for fade effect at top */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#0d0d12] to-transparent pointer-events-none" />
          </div>

          {/* Summary Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 bg-card/50 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-4">
              <FileJson className="w-4 h-4 text-primary" />
              Extraction Summary
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
              </div>
            ) : run?.summary && Object.keys(run.summary as object).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(run.summary as Record<string, any>).map(([key, value]) => {
                  const st: string = value?.status ?? "unknown";
                  const statusColor: Record<string, string> = {
                    extracted: "text-emerald-400",
                    extracted_dry_run: "text-sky-400",
                    success: "text-emerald-400",
                    skipped: "text-muted-foreground",
                    no_data: "text-yellow-500",
                    auth_failed: "text-destructive",
                    failed: "text-destructive",
                    error: "text-destructive",
                  };
                  const color = statusColor[st] ?? "text-muted-foreground";
                  const statusIcon: Record<string, string> = {
                    extracted: "✓", extracted_dry_run: "✓", success: "✓",
                    skipped: "–", no_data: "○",
                    auth_failed: "✗", failed: "✗", error: "✗",
                  };
                  const icon = statusIcon[st] ?? "?";
                  return (
                    <div key={key} className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{key.replace(/_/g, ' ')}</span>
                        <span className={`text-xs font-mono font-bold ${color}`}>{icon} {st}</span>
                      </div>
                      {value?.tables && (
                        <div className="mt-1.5 space-y-0.5">
                          {Object.entries(value.tables as Record<string, number>).map(([t, n]) => (
                            <div key={t} className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span className="truncate">{t}</span>
                              <span className="ml-2 shrink-0">{n} rows</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {value?.missing_config && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Missing: {(value.missing_config as string[]).join(", ")}
                        </p>
                      )}
                      {value?.error && (
                        <p className="text-xs text-destructive mt-1 break-all">{value.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center pt-4 pb-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {run?.status === "running" ? "Run in progress" : "No summary captured"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {run?.status === "running"
                      ? "Summary will appear here when the run completes."
                      : "No structured summary was output for this run."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
