import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useConfigs, useUpdateConfig } from "@/hooks/use-configs";
import { Settings, Save, AlertTriangle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CONNECTORS = [
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'ga4', label: 'Google Analytics 4' },
  { id: 'google_guaranteed', label: 'Google Guaranteed' },
  { id: 'google_business', label: 'Google Business Profile' },
  { id: 'facebook', label: 'Facebook Ads' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'bigquery', label: 'BigQuery Destination' },
];

export default function Configuration() {
  const { data: configs, isLoading } = useConfigs();
  const { mutate: updateConfig, isPending } = useUpdateConfig();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(CONNECTORS[0].id);
  const [jsonText, setJsonText] = useState("{}");
  const [isActive, setIsActive] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync state when tab changes or data loads
  useEffect(() => {
    if (!configs) return;
    
    const currentConfig = configs.find(c => c.connectorName === activeTab);
    if (currentConfig) {
      setJsonText(JSON.stringify(currentConfig.config, null, 2));
      setIsActive(currentConfig.isActive ?? true);
    } else {
      // Default template if doesn't exist
      setJsonText("{\n  \n}");
      setIsActive(true);
    }
    setJsonError(null);
  }, [activeTab, configs]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err) {
      setJsonError("Invalid JSON format");
    }
  };

  const handleSave = () => {
    try {
      const parsedConfig = JSON.parse(jsonText);
      updateConfig(
        { connectorName: activeTab, config: parsedConfig, isActive },
        {
          onSuccess: () => {
            toast({
              title: "Configuration Saved",
              description: `Settings for ${CONNECTORS.find(c => c.id === activeTab)?.label} updated successfully.`,
            });
          },
          onError: (err) => {
            toast({
              title: "Save Failed",
              description: err.message,
              variant: "destructive"
            });
          }
        }
      );
    } catch (err) {
      setJsonError("Cannot save invalid JSON");
      toast({
        title: "Validation Error",
        description: "Please fix JSON syntax errors before saving.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage API keys and settings for all connectors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Vertical Tabs */}
        <div className="md:col-span-1 space-y-2">
          {CONNECTORS.map((connector) => {
            const isSelected = activeTab === connector.id;
            const hasConfig = configs?.some(c => c.connectorName === connector.id);
            
            return (
              <button
                key={connector.id}
                onClick={() => setActiveTab(connector.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left
                  ${isSelected 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-card border border-border text-muted-foreground hover:bg-white/5 hover:border-muted-foreground/30 hover:text-foreground"
                  }
                `}
              >
                <span className="font-medium text-sm">{connector.label}</span>
                {hasConfig && !isSelected && (
                  <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Editor Panel */}
        <div className="md:col-span-3">
          <div className="glass-card rounded-2xl overflow-hidden h-[600px] flex flex-col">
            
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-border/50 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {CONNECTORS.find(c => c.id === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">JSON Configuration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Enabled</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`
                      relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none
                      ${isActive ? 'bg-success' : 'bg-muted-foreground/30'}
                    `}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4.5' : 'translate-x-1'}`} />
                  </button>
                </label>
                
                <button
                  onClick={handleSave}
                  disabled={isPending || !!jsonError}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  <Save className="w-4 h-4" />
                  {isPending ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {jsonError && (
              <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive-foreground">
                  <p className="font-semibold">JSON Syntax Error</p>
                  <p className="opacity-80 mt-0.5">Please ensure keys are quoted and commas are correct.</p>
                </div>
              </div>
            )}

            {/* Textarea Editor */}
            <div className="flex-1 relative bg-[#0d0d12]">
              {isLoading ? (
                <div className="absolute inset-0 p-6 space-y-3">
                  <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-white/5 rounded animate-pulse ml-6" />
                  <div className="h-4 w-56 bg-white/5 rounded animate-pulse ml-6" />
                  <div className="h-4 w-48 bg-white/5 rounded animate-pulse ml-6" />
                  <div className="h-4 w-60 bg-white/5 rounded animate-pulse ml-6" />
                  <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
                </div>
              ) : (() => {
                const currentConfig = configs?.find(c => c.connectorName === activeTab);
                const configObj = currentConfig?.config as Record<string, string> | undefined;
                const allEmpty = !configObj || Object.keys(configObj).length === 0 || Object.values(configObj).every(v => v === "" || v == null);
                return allEmpty ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <KeyRound className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No credentials saved yet</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs">
                        Use the Setup Wizard to fill in this connector's credentials step by step, or type directly into the editor below.
                      </p>
                    </div>
                    <textarea
                      value={jsonText}
                      onChange={handleJsonChange}
                      spellCheck={false}
                      className="w-full h-28 bg-white/[0.03] border border-white/10 text-zinc-400 font-mono text-xs p-3 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 leading-relaxed"
                      placeholder={`{\n  \n}`}
                    />
                  </div>
                ) : (
                  <textarea
                    value={jsonText}
                    onChange={handleJsonChange}
                    spellCheck={false}
                    className="absolute inset-0 w-full h-full bg-transparent text-zinc-300 font-mono text-sm p-6 resize-none focus:outline-none focus:ring-inset focus:ring-1 focus:ring-primary/20 leading-relaxed"
                    placeholder={`{\n  // Enter JSON config here\n}`}
                  />
                );
              })()}
            </div>
            
            {/* Editor Footer hints */}
            <div className="px-6 py-3 border-t border-border/50 bg-[#0d0d12] flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>{activeTab}.json</span>
              <span>UTF-8</span>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
