import { CheckCircle2, Clock, XCircle, AlertCircle, AlertTriangle, MinusCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status.toLowerCase()) {
    case 'success':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Success
        </div>
      );
    case 'partial':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Partial
        </div>
      );
    case 'skipped':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border text-xs font-medium">
          <MinusCircle className="w-3.5 h-3.5" />
          Skipped
        </div>
      );
    case 'running':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 animate-spin-slow" style={{ animationDuration: '3s' }} />
          Running
        </div>
      );
    case 'failed':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </div>
      );
    default:
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          {status}
        </div>
      );
  }
}
