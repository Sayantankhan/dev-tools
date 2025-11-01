import { Tool, ToolId } from "@/pages/Index";
import { cn } from "@/lib/utils";

interface TabNavigationProps {
  tools: Tool[];
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
}

export const TabNavigation = ({ tools, activeTool, onToolChange }: TabNavigationProps) => {
  return (
    <nav className="flex flex-wrap gap-3" role="tablist">
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tool.id}`}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "group flex items-center gap-2 px-6 py-3 rounded-lg border transition-all duration-200",
              "hover:scale-105 hover:border-primary/50",
              isActive
                ? "tab-active animate-glow-pulse"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{tool.label}</span>
            <kbd className="ml-2 px-2 py-0.5 bg-background/50 rounded text-xs opacity-60">
              {index + 1}
            </kbd>
          </button>
        );
      })}
    </nav>
  );
};
