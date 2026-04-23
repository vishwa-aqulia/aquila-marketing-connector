import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useRuns, useTriggerRun } from "@/hooks/use-runs";
import { StatusBadge } from "@/components/StatusBadge";
import { RunLogsModal } from "@/components/RunLogsModal";
import { format } from "date-fns";
import { 
  Play, 
  Terminal, 
  Settings2, 
  Calendar, 
  DatabaseZap,
  Activity,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_CONNECTORS = [
  { id: 'google_ads', label: 'Google Ads', color: 'from-[#4285F4] to-[#34A853]' },
  { id: 'ga4', label: 'GA4', color: 'from-[#F4B400] to-[#EA4335]' },
  { id: 'google_guaranteed', label: 'Google Guaranteed', color: 'from-[#4285F4] to-[#4285F4]' },
  { id: 'google_business', label: 'Google Business', color: 'from-[#4285F4] to-[#185ABC]' },
  { id: 'facebook', label: 'Facebook Ads', color: 'from-[#1877F2] to-[#0D47A1]' },
  { id: 'instagram', label: 'Instagram', color: 'from-[#E1306C] to-[#833AB4]' },
  { id: 'youtube', label: 'YouTube', color: 'from-[#FF0000] to-[#B31217]' },
];

export default function Dashboard() {
  const { data: runs, isLoading: runsLoading } = useRuns();
  const { mutate: triggerRun, isPending } = useTriggerRun();
  const { toast } = useToast();
  
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [daysBack, setDaysBack] = useState(30);
  const [dryRun, setDryRun] = useState(false);
  
  const [viewingRunId, setViewingRunId] = useState<number | null>(null);

  const handleToggleConnector = (id: string) => {
    setSelectedConnectors(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedConnectors.length === AVAILABLE_CONNECTORS.length) {
      setSelectedConnectors([]);
    } else {
      setSelectedConnectors(AVAILABLE_CONNECTORS.map(c => c.id));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConnectors.length === 0) {
      toast({
        title: "No connectors selected",
        description: "Please select at least one data source to extract.",
        variant: "destructive"
      });
      return;
    }

    triggerRun(
      { connectorNames: selectedConnectors, daysBack, dryRun },
      {
        onSuccess: () => {
          toast({
            title: "Pipeline triggered",
            description: "Data extraction process has started.",
          });
          // Reset slightly but keep connectors
        },
        onError: (err) => {
          toast({
            title: "Failed to trigger pipeline",
            description: err.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Pipeline Operations</h1>
        <p className="text-muted-foreground mt-2 text-lg">Extract, transform, and load your marketing data.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Trigger Form */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <DatabaseZap className="w-5 h-5 text-primary" />
              New Extraction
            </h2>

            <form onSubmit={onSubmit} className="space-y-6 relative z-10">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Data Sources</label>
                  <button 
                    type="button" 
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {selectedConnectors.length === AVAILABLE_CONNECTORS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_CONNECTORS.map(conn => {
                    const isSelected = selectedConnectors.includes(conn.id);
                    return (
                      <button
                        key={conn.id}
                        type="button"
                        data-testid={`button-connector-${conn.id}`}
                        onClick={() => handleToggleConnector(conn.id)}
                        data-selected={isSelected}
                        className={`
                          text-left px-3 py-2.5 rounded-xl border transition-all duration-200
                          ${isSelected 
                            ? "bg-primary/10 border-primary shadow-sm shadow-primary/10 text-primary-foreground" 
                            : "bg-background border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                          }
                        `}
                      >
                        <div className="text-xs font-medium truncate">{conn.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Lookback Period (Days)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1" 
                    max="365"
                    value={daysBack}
                    onChange={(e) => setDaysBack(parseInt(e.target.value) || 30)}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Dry Run Mode</span>
                  <span className="text-xs text-muted-foreground">Extract only, skip BigQuery load</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dryRun}
                  onClick={() => setDryRun(!dryRun)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    ${dryRun ? 'bg-accent' : 'bg-muted-foreground/30'}
                  `}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dryRun ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <button
                type="submit"
                data-testid="button-execute-pipeline"
                disabled={isPending || selectedConnectors.length === 0}
                className="w-full group relative overflow-hidden rounded-xl bg-primary text-primary-foreground font-semibold px-6 py-4 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <Activity className="w-5 h-5 animate-pulse" />
                      Initiating...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Execute Pipeline
                    </>
                  )}
                </span>
              </button>

            </form>
          </div>
        </div>

        {/* History Table */}
        <div className="xl:col-span-2">
          <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
                Execution History
              </h2>
              
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Sync
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Run ID</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Start Time</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {runsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><div className="h-4 w-8 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-white/5 rounded ml-auto animate-pulse" /></td>
                      </tr>
                    ))
                  ) : runs?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
                          <p>No execution history found.</p>
                          <p className="text-xs mt-1">Trigger a new run to see results here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    runs?.map((run) => {
                      const startTime = new Date(run.startTime!);
                      const endTime = run.endTime ? new Date(run.endTime) : null;
                      const durationStr = endTime 
                        ? `${Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000))}s`
                        : '-';

                      return (
                        <tr key={run.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 font-mono text-muted-foreground">#{run.id}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {format(startTime, "MMM d, HH:mm:ss")}
                          </td>
                          <td className="px-6 py-4 font-mono text-muted-foreground">
                            {durationStr}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setViewingRunId(run.id)}
                              className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="View Logs"
                            >
                              <Terminal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {viewingRunId && (
        <RunLogsModal 
          runId={viewingRunId} 
          onClose={() => setViewingRunId(null)} 
        />
      )}
    </AppLayout>
  );
}
