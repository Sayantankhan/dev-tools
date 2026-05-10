import { Tool, ToolId } from "@/pages/Index";
import { Search, Command, Shield, ArrowRight } from "lucide-react";
import { useRecentTools } from "@/hooks/useRecentTools";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Props {
  tools: Tool[];
  onToolChange: (id: ToolId) => void;
  onOpenPalette: () => void;
}

const descriptions: Record<string, string> = {
  json: "Format, validate, query JSON",
  "text-compare": "Diff two text blocks",
  "log-parser": "Parse and cluster logs",
  image: "Crop, convert, edit images",
  "pdf-editor": "Annotate and edit PDFs",
  jwt: "Decode & inspect JWTs",
  api: "Test HTTP requests",
  encoder: "Base64 / URL / hash",
  "random-generator": "UUID, passwords, data",
  "data-converter": "JSON ↔ YAML ↔ CSV",
  "ip-lookup": "Geolocate IP addresses",
  "js-editor": "Run & visualize JS",
  "data-viz": "Quick charts from data",
  "bg-remover": "Remove image backgrounds",
  search: "Search across content",
  "topology-viewer": "Visualize topologies",
  "cron-generator": "Build cron expressions",
  "regex-explainer": "Explain regex patterns",
};

const categories: { name: string; ids: ToolId[] }[] = [
  { name: "Data & Encoding", ids: ["json", "encoder", "data-converter", "log-parser"] },
  { name: "API & Network", ids: ["api", "jwt", "ip-lookup", "search"] },
  { name: "Text & Code", ids: ["text-compare", "js-editor", "regex-explainer"] },
  { name: "Images & Media", ids: ["image", "bg-remover"] },
  { name: "Documents", ids: ["pdf-editor"] },
  { name: "Utilities", ids: ["random-generator", "data-viz", "topology-viewer", "cron-generator"] },
];

export function HomeDashboard({ tools, onToolChange, onOpenPalette }: Props) {
  const { recents } = useRecentTools();
  const [query, setQuery] = useState("");

  const byId = useMemo(() => Object.fromEntries(tools.map((t) => [t.id, t])), [tools]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return tools.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (descriptions[t.id] || "").toLowerCase().includes(q),
    );
  }, [query, tools]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Developer Tools
        </h1>
        <p className="mt-3 text-muted-foreground inline-flex items-center gap-2 text-sm">
          <Shield className="w-3.5 h-3.5 text-primary" />
          Client-side. Your data never leaves your device.
        </p>
      </div>

      {/* Search / palette */}
      <div className="mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered && filtered[0]) onToolChange(filtered[0].id);
            }}
            placeholder="Search tools or press ⌘K…"
            className="w-full h-14 pl-11 pr-24 rounded-lg bg-card border border-border/60 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
          />
          <button
            onClick={onOpenPalette}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition"
          >
            <Command className="w-3 h-3" /> K
          </button>
        </div>
      </div>

      {/* Recents */}
      {!filtered && recents.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Recent</h2>
          <div className="flex flex-wrap gap-2">
            {recents.map((id) => {
              const t = byId[id];
              if (!t) return null;
              const Icon = t.icon;
              return (
                <button
                  key={id}
                  onClick={() => onToolChange(t.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border/60 hover:border-primary/40 hover:bg-card/80 transition text-sm"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search results */}
      {filtered && (
        <div className="space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No tools match "{query}"</p>
          )}
          {filtered.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onToolChange(t.id)}
                className="w-full group flex items-center gap-3 px-3 py-3 rounded-md hover:bg-card border border-transparent hover:border-border/60 transition text-left"
              >
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{descriptions[t.id]}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </button>
            );
          })}
        </div>
      )}

      {/* Bento grid */}
      {!filtered && (
        <div className="space-y-10">
          {categories.map((cat) => {
            const items = cat.ids.map((id) => byId[id]).filter(Boolean) as Tool[];
            if (!items.length) return null;
            return (
              <section key={cat.name}>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onToolChange(t.id)}
                        className={cn(
                          "group text-left p-4 rounded-lg bg-card border border-border/60",
                          "hover:border-primary/50 hover:bg-card/70 transition",
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">{t.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {descriptions[t.id]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
