import { useState, useEffect, lazy, Suspense } from "react";
import { JSONTool } from "@/components/tools/JSONTool";
import { ImageTool } from "@/components/tools/ImageTool";
import { JWTTool } from "@/components/tools/JWTTool";
import { APITool } from "@/components/tools/APITool";
import { Base64Tool } from "@/components/tools/Base64Tool";
import { URLTool } from "@/components/tools/URLTool";
import { TabNavigation } from "@/components/TabNavigation";
import { Toaster } from "@/components/ui/sonner";
import { Code2, Image, Key, Globe, FileCode, Link, FileSearch, ScrollText, Shuffle, ArrowRightLeft, MapPin, Terminal, BarChart3, Scissors, Search, Map, Network } from "lucide-react";

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
const MapPlotTool = lazy(() => import("@/components/tools/MapPlotTool").then(m => ({ default: m.MapPlotTool })));
const TopologyViewerTool = lazy(() => import("@/components/tools/TopologyViewerTool").then(m => ({ default: m.TopologyViewerTool })));

export type ToolId = "json" | "image" | "jwt" | "api" | "base64" | "url" | "text-compare" | "log-parser" | "random-generator" | "data-converter" | "ip-lookup" | "js-editor" | "data-viz" | "bg-remover" | "search" | "map-plot" | "topology-viewer";

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
  { id: "jwt", label: "JWT", icon: Key, component: JWTTool },
  { id: "api", label: "API", icon: Globe, component: APITool },
  { id: "base64", label: "Base64", icon: FileCode, component: Base64Tool },
  { id: "url", label: "URL", icon: Link, component: URLTool },
  { id: "random-generator", label: "Random", icon: Shuffle, component: RandomGeneratorTool },
  { id: "data-converter", label: "Convert", icon: ArrowRightLeft, component: DataConverterTool },
  { id: "ip-lookup", label: "IP Lookup", icon: MapPin, component: IPLookupTool },
  { id: "js-editor", label: "JS Editor", icon: Terminal, component: JSEditorTool },
  { id: "data-viz", label: "Charts", icon: BarChart3, component: DataVizTool },
  { id: "bg-remover", label: "BG Remover", icon: Scissors, component: BackgroundRemoverTool },
  { id: "search", label: "Search", icon: Search, component: SearchTool },
  { id: "map-plot", label: "Map Plot", icon: Map, component: MapPlotTool },
  { id: "topology-viewer", label: "Topology", icon: Network, component: TopologyViewerTool },
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">Developer Tools</h1>
          <p className="text-muted-foreground">
            Handy utilities for developers — all client-side, secure, and fast
          </p>
        </header>

        {/* Tab Navigation */}
        <TabNavigation
          tools={tools}
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        {/* Active Tool Panel */}
        <div className="mt-6 animate-fade-in">
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
          {/* <p className="mt-2">
            Keyboard shortcuts: <kbd className="px-2 py-1 bg-muted rounded text-xs">1-5</kbd> to
            switch tools
          </p> */}
        </footer>
      </div>

      <Toaster />
    </div>
  );
};

export default Index;
