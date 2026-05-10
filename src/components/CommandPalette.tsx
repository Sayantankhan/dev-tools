import { Tool, ToolId } from "@/pages/Index";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRecentTools } from "@/hooks/useRecentTools";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tools: Tool[];
  onToolChange: (id: ToolId) => void;
}

export function CommandPalette({ open, onOpenChange, tools, onToolChange }: Props) {
  const { recents } = useRecentTools();
  const recentTools = recents
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean) as Tool[];

  const select = (id: ToolId) => {
    onToolChange(id);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a tool name…" />
      <CommandList>
        <CommandEmpty>No tools found.</CommandEmpty>
        {recentTools.length > 0 && (
          <CommandGroup heading="Recent">
            {recentTools.map((t) => {
              const Icon = t.icon;
              return (
                <CommandItem key={t.id} value={`recent-${t.label}`} onSelect={() => select(t.id)}>
                  <Icon className="w-4 h-4 mr-2 text-primary" />
                  {t.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandGroup heading="All tools">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <CommandItem key={t.id} value={t.label} onSelect={() => select(t.id)}>
                <Icon className="w-4 h-4 mr-2" />
                {t.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
