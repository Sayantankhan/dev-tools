import { useState, useEffect, lazy, Suspense } from "react";
import { JSONTool } from "@/components/tools/JSONTool";
import { ImageTool } from "@/components/tools/ImageTool";
import { JWTTool } from "@/components/tools/JWTTool";
import { APITool } from "@/components/tools/APITool";
import { EncoderTool } from "@/components/tools/EncoderTool";
import { Toaster } from "@/components/ui/sonner";
import {
  Code2, Image, Key, Globe, FileCode, FileSearch, ScrollText, Shuffle,
  ArrowRightLeft, MapPin, Terminal, BarChart3, Scissors, Search, Network,
  FileEdit, Clock, Info, FilePlus,
} from "lucide-react";
import { HomeDashboard } from "@/components/HomeDashboard";
import { ToolShell } from "@/components/ToolShell";
import { CommandPalette } from "@/components/CommandPalette";
import { useRecentTools } from "@/hooks/useRecentTools";

const TextCompareTool = lazy(() => import("@/components/tools/TextCompareTool").then(m => ({ default: m.TextCompareTool })));
const LogParserTool = lazy(() => import("@/components/tools/LogParserTool").then(m => ({ default: m.LogParserTool })));
const RandomGeneratorTool = lazy(() => import("@/components/tools/RandomGeneratorTool").then(m => ({ default: m.RandomGeneratorTool })));
const DataConverterTool = lazy(() => import("@/components/tools/DataConverterTool").then(m => ({ default: m.DataConverterTool })));
const IPLookupTool = lazy(() => import("@/components/tools/IPLookupTool").then(m => ({ default: m.IPLookupTool })));
const JSEditorTool = lazy(() => import("@/components/tools/JSEditorTool").then(m => ({ default: m.JSEditorTool })));
const DataVizTool = lazy(() => import("@/components/tools/DataVizTool").then(m => ({ default: m.DataVizTool })));
const BackgroundRemoverTool = lazy(() => import("@/components/tools/BackgroundRemoverTool").then(m => ({ default: m.BackgroundRemoverTool })));
const SearchTool = lazy(() => import("@/components/tools/SearchTool").then(m => ({ default: m.SearchTool })));
const TopologyViewerTool = lazy(() => import("@/components/tools/TopologyViewerTool").then(m => ({ default: m.TopologyViewerTool })));
const PDFEditorTool = lazy(() => import("@/components/tools/PDFEditorTool").then(m => ({ default: m.PDFEditorTool })));
const CronGeneratorTool = lazy(() => import("@/components/tools/CronGeneratorTool").then(m => ({ default: m.CronGeneratorTool })));
const RegexExplainerTool = lazy(() => import("@/components/tools/RegexExplainerTool").then(m => ({ default: m.RegexExplainerTool })));

export type ToolId = "json" | "image" | "jwt" | "api" | "encoder" | "text-compare" | "log-parser" | "random-generator" | "data-converter" | "ip-lookup" | "js-editor" | "data-viz" | "bg-remover" | "search" | "topology-viewer" | "pdf-editor" | "cron-generator" | "regex-explainer";

export interface Tool {
  id: ToolId;
  label: string;
  icon: typeof Code2;
  component: React.ComponentType;
}

const tools: Tool[] = [
  { id: "json", label: "JSON", icon: Code2, component: JSONTool },
  { id: "text-compare", label: "Text Diff", icon: FileSearch, component: TextCompareTool },
  { id: "log-parser", label: "Log Parser", icon: ScrollText, component: LogParserTool },
  { id: "image", label: "Image", icon: Image, component: ImageTool },
  { id: "pdf-editor", label: "PDF Editor", icon: FileEdit, component: PDFEditorTool },
  { id: "jwt", label: "JWT", icon: Key, component: JWTTool },
  { id: "api", label: "API", icon: Globe, component: APITool },
  { id: "encoder", label: "Encoder/Decoder", icon: FileCode, component: EncoderTool },
  { id: "random-generator", label: "Random", icon: Shuffle, component: RandomGeneratorTool },
  { id: "data-converter", label: "Convert", icon: ArrowRightLeft, component: DataConverterTool },
  { id: "ip-lookup", label: "IP Lookup", icon: MapPin, component: IPLookupTool },
  { id: "js-editor", label: "JS Editor", icon: Terminal, component: JSEditorTool },
  { id: "data-viz", label: "Charts", icon: BarChart3, component: DataVizTool },
  { id: "bg-remover", label: "BG Remover", icon: Scissors, component: BackgroundRemoverTool },
  { id: "search", label: "Search", icon: Search, component: SearchTool },
  { id: "topology-viewer", label: "Topology", icon: Network, component: TopologyViewerTool },
  { id: "cron-generator", label: "Cron", icon: Clock, component: CronGeneratorTool },
  { id: "regex-explainer", label: "Regex", icon: Info, component: RegexExplainerTool },
];

const Index = () => {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const { push } = useRecentTools();

  const handleToolChange = (id: ToolId) => {
    setActiveTool(id);
    push(id);
    setZen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && activeTool) {
        // Esc toggles chrome (zen). Second Esc could close — keep simple.
        setZen((z) => !z);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTool]);

  const active = tools.find((t) => t.id === activeTool);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {!activeTool && (
        <HomeDashboard
          tools={tools}
          onToolChange={handleToolChange}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      )}

      {active && ActiveComponent && (
        <ToolShell
          tool={active}
          onHome={() => setActiveTool(null)}
          onOpenPalette={() => setPaletteOpen(true)}
          zen={zen}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            }
          >
            <ActiveComponent />
          </Suspense>
        </ToolShell>
      )}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        tools={tools}
        onToolChange={handleToolChange}
      />

      <Toaster />
    </div>
  );
};

export default Index;
