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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-card/50 backdrop-blur-sm border-r border-border/20">
        {/* Header */}
        <div className={cn(
          "px-4 py-4 border-b border-border/20",
          isCollapsed && "px-2"
        )}>
          {!isCollapsed && (
            <h2 className="text-lg font-bold gradient-text">Dev Tools</h2>
          )}
        </div>

        {/* Categories */}
        {Object.entries(categories).map(([categoryName, _]) => {
          const categoryTools = getToolsByCategory(categoryName);
          if (categoryTools.length === 0) return null;

          return (
            <SidebarGroup key={categoryName}>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs text-muted-foreground">
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
                          tooltip={isCollapsed ? tool.label : undefined}
                          className={cn(
                            "transition-all duration-200",
                            isActive && "bg-primary/10 text-primary font-medium"
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
  );
}
