import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftRight, Trash2, FileSearch, Plus, Minus, Equal } from "lucide-react";
import { TextCompareStateHandler } from "@/modules/state/TextCompareStateHandler";

const SectionLabel = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
    {hint && (
      <span className="text-[10px] font-mono text-muted-foreground/70">{hint}</span>
    )}
  </div>
);

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">
    {children}
  </kbd>
);

export const TextCompareTool = () => {
  const { state, setters, actions, helpers } = TextCompareStateHandler();
  const hasResult = state.diffResult.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Button onClick={actions.handleCompare} size="sm" className="h-8 gap-1.5">
            <FileSearch className="w-3.5 h-3.5" />
            Compare
          </Button>
          <Button onClick={actions.handleSwap} size="sm" variant="ghost" className="h-8 gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Swap
          </Button>
          <Button onClick={actions.handleClear} size="sm" variant="ghost" className="h-8 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
        {hasResult && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-success">
              <Plus className="w-3 h-3" />
              {state.stats.additions}
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <Minus className="w-3 h-3" />
              {state.stats.deletions}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Equal className="w-3 h-3" />
              {state.stats.unchanged}
            </span>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <SectionLabel hint="original">A</SectionLabel>
          <Textarea
            value={state.leftText}
            onChange={(e) => setters.setLeftText(e.target.value)}
            placeholder="Paste original text…"
            className="font-mono text-xs min-h-[280px] bg-card resize-none"
          />
        </div>
        <div>
          <SectionLabel hint="modified">B</SectionLabel>
          <Textarea
            value={state.rightText}
            onChange={(e) => setters.setRightText(e.target.value)}
            placeholder="Paste modified text…"
            className="font-mono text-xs min-h-[280px] bg-card resize-none"
          />
        </div>
      </div>

      {/* Diff */}
      {hasResult && (
        <div>
          <SectionLabel hint="unified diff">Result</SectionLabel>
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="font-mono text-xs max-h-[520px] overflow-auto">
              {helpers.generateLineDiff(state.diffResult).map((line: any, index: number) => {
                const bg =
                  line.type === "add"
                    ? "bg-success/10"
                    : line.type === "remove"
                    ? "bg-destructive/10"
                    : "bg-transparent";
                const accent =
                  line.type === "add"
                    ? "border-l-success"
                    : line.type === "remove"
                    ? "border-l-destructive"
                    : "border-l-transparent";
                const text =
                  line.type === "add"
                    ? "text-success"
                    : line.type === "remove"
                    ? "text-destructive"
                    : "text-foreground/80";
                const prefix = line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";
                return (
                  <div key={index} className={`${bg} ${accent} ${text} flex border-l-2`}>
                    <span className="select-none w-10 flex-shrink-0 text-right pr-2 text-muted-foreground/60">
                      {line.oldLineNum || ""}
                    </span>
                    <span className="select-none w-10 flex-shrink-0 text-right pr-2 text-muted-foreground/60 border-r border-border">
                      {line.lineNum || ""}
                    </span>
                    <span className="select-none w-6 text-center text-muted-foreground/80">{prefix}</span>
                    <span className="flex-1 whitespace-pre pr-3">{line.content}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
        <Kbd>Tab</Kbd> to indent · processed locally — your text never leaves the device
      </div>
    </div>
  );
};
