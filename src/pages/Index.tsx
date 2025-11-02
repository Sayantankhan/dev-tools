import { useState, useEffect } from "react";
import { JSONTool } from "@/components/tools/JSONTool";
import { ImageTool } from "@/components/tools/ImageTool";
import { JWTTool } from "@/components/tools/JWTTool";
import { APITool } from "@/components/tools/APITool";
import { Base64Tool } from "@/components/tools/Base64Tool";
import { URLTool } from "@/components/tools/URLTool";
import { TabNavigation } from "@/components/TabNavigation";
import { Toaster } from "@/components/ui/sonner";
import { Code2, Image, Key, Globe, FileCode, Link } from "lucide-react";

export type ToolId = "json" | "image" | "jwt" | "api" | "base64" | "url";

export interface Tool {
  id: ToolId;
  label: string;
  icon: typeof Code2;
  component: React.ComponentType;
}

const tools: Tool[] = [
  { id: "json", label: "JSON", icon: Code2, component: JSONTool },
  { id: "image", label: "Image", icon: Image, component: ImageTool },
  { id: "jwt", label: "JWT", icon: Key, component: JWTTool },
  { id: "api", label: "API", icon: Globe, component: APITool },
  { id: "base64", label: "Base64", icon: FileCode, component: Base64Tool },
  { id: "url", label: "URL", icon: Link, component: URLTool },
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
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            All operations run locally in your browser. Your data never leaves your device.
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
