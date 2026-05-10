import { Tool } from "@/pages/Index";
import { ChevronRight, Shield, X, Command } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  tool: Tool;
  onHome: () => void;
  onOpenPalette: () => void;
  zen: boolean;
  children: React.ReactNode;
}

export function ToolShell({ tool, onHome, onOpenPalette, zen, children }: Props) {
  const Icon = tool.icon;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!zen && (
        <header className="sticky top-0 z-20 h-12 border-b border-border/60 bg-background/90 backdrop-blur flex items-center px-4 gap-3">
          <button
            onClick={onHome}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Home
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Icon className="w-3.5 h-3.5 text-primary" />
            {tool.label}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
              <Shield className="w-3 h-3 text-primary" /> Client-side
            </span>
            <button
              onClick={onOpenPalette}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 hover:text-foreground hover:border-border transition"
              title="Command palette (⌘K)"
            >
              <Command className="w-3 h-3" /> K
            </button>
            <button
              onClick={onHome}
              className="text-muted-foreground hover:text-foreground transition"
              title="Close (Esc twice)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
