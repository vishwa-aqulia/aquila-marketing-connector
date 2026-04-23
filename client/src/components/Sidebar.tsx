import { Link, useRoute } from "wouter";
import { 
  LayoutDashboard, 
  Settings, 
  Database,
  ChevronRight,
  Wand2
} from "lucide-react";
import { motion } from "framer-motion";

export function Sidebar() {
  const [isDashboard] = useRoute("/");
  const [isConfig] = useRoute("/configuration");
  const [isSetup] = useRoute("/setup");

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, isActive: isDashboard },
    { name: "Setup Wizard", path: "/setup", icon: Wand2, isActive: isSetup },
    { name: "Configuration", path: "/configuration", icon: Settings, isActive: isConfig },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card/50 backdrop-blur-2xl border-r border-border flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground leading-none">Nexus</h1>
          <p className="text-xs text-muted-foreground mt-1">Data Connector</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Platform
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
              className={`
                group relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300
                ${item.isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }
              `}
            >
              {item.isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative flex items-center gap-3">
                <Icon className={`w-5 h-5 ${item.isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${item.isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"}`} />
            </Link>
          );
        })}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">System Online</span>
        </div>
      </div>
    </aside>
  );
}
