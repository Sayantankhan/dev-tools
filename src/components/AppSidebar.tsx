import { Tool, ToolId } from "@/pages/Index";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  tools: Tool[];
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
}

// Categorize tools
const categories = {
  "Data & Encoding": ["json", "encoder", "data-converter", "log-parser"],
  "API & Network": ["api", "jwt", "ip-lookup", "search"],
  "Text & Code": ["text-compare", "js-editor", "regex-explainer"],
  "Images & Media": ["image", "bg-remover"],
  "Documents": ["pdf-editor"],
  "Utilities": ["random-generator", "data-viz", "topology-viewer", "cron-generator"],
};

export function AppSidebar({ tools, activeTool, onToolChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const getToolsByCategory = (category: string) => {
    const toolIds = categories[category as keyof typeof categories] || [];
    return tools.filter(tool => toolIds.includes(tool.id));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="border-r-0 w-48 data-[state=collapsed]:w-14">
        {/* Sticky Header */}
        <div className={cn(
          "sticky top-0 z-10 bg-card/50 backdrop-blur-sm border-b border-border/20",
          isCollapsed ? "px-2 py-4" : "px-4 py-4"
        )}>
          {!isCollapsed && (
            <h2 className="text-lg font-bold gradient-text">Dev Tools</h2>
          )}
        </div>

        {/* Scrollable Content */}
        <SidebarContent className="bg-card/50 backdrop-blur-sm border-r border-border/20 overflow-y-auto scrollbar-hide">
          {/* Categories */}
          {Object.entries(categories).map(([categoryName, _]) => {
          const categoryTools = getToolsByCategory(categoryName);
          if (categoryTools.length === 0) return null;

            return (
              <SidebarGroup key={categoryName}>
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
                    {categoryName}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {categoryTools.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeTool === tool.id;

                      return (
                        <SidebarMenuItem key={tool.id}>
                          <SidebarMenuButton
                            onClick={() => onToolChange(tool.id)}
                            isActive={isActive}
                            tooltip={{ children: tool.label, hidden: !isCollapsed, side: "right", align: "center" }}
                            className={cn(
                              "transition-all duration-200 px-3",
                              isActive && "bg-primary/15 text-primary font-medium border-l-2 border-primary pl-2"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {!isCollapsed && <span>{tool.label}</span>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
