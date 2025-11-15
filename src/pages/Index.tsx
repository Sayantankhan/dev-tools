import { useState, useEffect, lazy, Suspense } from "react";
import { JSONTool } from "@/components/tools/JSONTool";
import { ImageTool } from "@/components/tools/ImageTool";
import { JWTTool } from "@/components/tools/JWTTool";
import { APITool } from "@/components/tools/APITool";
import { EncoderTool } from "@/components/tools/EncoderTool";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Code2, Image, Key, Globe, FileCode, FileSearch, ScrollText, Shuffle, ArrowRightLeft, MapPin, Terminal, BarChart3, Scissors, Search, Network, FileEdit, Clock, Info } from "lucide-react";

// Lazy load tools for better performance
const TextCompareTool = lazy(() => import("@/components/tools/TextCompareTool").then(m => ({ default: m.TextCompareTool })));
const LogParserTool = lazy(() => import("@/components/tools/LogParserTool").then(m => ({ default: m.LogParserTool })));
const RandomGeneratorTool = lazy(() => import("@/components/tools/RandomGeneratorTool").then(m => ({ default: m.RandomGeneratorTool })));
const DataConverterTool = lazy(() => import("@/components/tools/DataConverterTool").then(m => ({ default: m.DataConverterTool })));
const IPLookupTool = lazy(() => import("@/components/tools/IPLookupTool").then(m => ({ default: m.IPLookupTool })));
const JSEditorTool = lazy(() => import("@/components/tools/JSEditorTool").then(m => ({ default: m.JSEditorTool })));
const ConverterTool = lazy(() => import("@/components/tools/ConverterTool").then(m => ({ default: m.ConverterTool })));
const DataVizTool = lazy(() => import("@/components/tools/DataVizTool").then(m => ({ default: m.DataVizTool })));
const ImageConverterTool = lazy(() => import("@/components/tools/ImageConverterTool").then(m => ({ default: m.ImageConverterTool })));
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
  const [activeTool, setActiveTool] = useState<ToolId>("json");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keyboard shortcuts: 1-5 for tools
      // if (e.key >= "1" && e.key <= "5") {
      //   const toolIndex = parseInt(e.key) - 1;
      //   if (tools[toolIndex]) {
      //     setActiveTool(tools[toolIndex].id);
      //   }
      // }
      
      // Esc to clear (handled in individual tools)
      if (e.key === "Escape") {
        // Individual tools will handle this
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const ActiveComponent = tools.find((t) => t.id === activeTool)?.component;
  const activeToolLabel = tools.find((t) => t.id === activeTool)?.label;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          tools={tools}
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        <SidebarInset className="flex-1">
          {/* Header with Sidebar Toggle */}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/20 bg-background/95 backdrop-blur-sm px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold gradient-text">Developer Tools</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                <span className="text-foreground font-medium">{activeToolLabel}</span> • All client-side, secure, and fast
              </p>
            </div>
          </header>

          {/* Active Tool Panel */}
          <main className="flex-1 p-6">
            <div className="animate-fade-in">
              <div className="glass-card p-6">
                {ActiveComponent && (
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <ActiveComponent />
                  </Suspense>
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-sm text-muted-foreground">
              <p>
                All operations run locally in your browser. Your data never leaves your device.
              </p>
              <p className="mt-4">
                © {new Date().getFullYear()} Sayantan Khan.
              </p>
            </footer>
          </main>
        </SidebarInset>

        <Toaster />
      </div>
    </SidebarProvider>
  );
};

export default Index;
