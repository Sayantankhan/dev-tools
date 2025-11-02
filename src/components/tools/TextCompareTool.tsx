import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Trash2, FileSearch } from "lucide-react";
import { TextCompareStateHandler } from "@/modules/state/TextCompareStateHandler";

export const TextCompareTool = () => {
  const { state, setters, actions } = TextCompareStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={actions.handleCompare} className="btn-gradient">
          <FileSearch className="w-4 h-4 mr-2" />
          Compare
        </Button>
        <Button onClick={actions.handleSwap} variant="outline">
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Swap
        </Button>
        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Input Fields */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Original Text</Label>
          <Textarea
            value={state.leftText}
            onChange={(e) => setters.setLeftText(e.target.value)}
            placeholder="Enter original text..."
            className="code-editor min-h-[300px]"
          />
        </div>

        <div className="space-y-3">
          <Label>Modified Text</Label>
          <Textarea
            value={state.rightText}
            onChange={(e) => setters.setRightText(e.target.value)}
            placeholder="Enter modified text..."
            className="code-editor min-h-[300px]"
          />
        </div>
      </div>

      {/* Stats */}
      {state.diffResult.length > 0 && (
        <div className="flex gap-4 p-4 bg-card/50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-muted-foreground">
              Additions: <span className="font-medium text-foreground">{state.stats.additions}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-muted-foreground">
              Deletions: <span className="font-medium text-foreground">{state.stats.deletions}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span>
            <span className="text-muted-foreground">
              Unchanged: <span className="font-medium text-foreground">{state.stats.unchanged}</span>
            </span>
          </div>
        </div>
      )}

      {/* Diff Result */}
      {state.diffResult.length > 0 && (
        <div className="space-y-3">
          <Label>Comparison Result</Label>
          <div className="code-editor p-4 min-h-[300px] max-h-[500px] overflow-auto">
            {state.diffResult.map((part, index) => {
              const bgColor = part.added
                ? "bg-green-500/20"
                : part.removed
                ? "bg-red-500/20"
                : "bg-transparent";
              const textColor = part.added
                ? "text-green-400"
                : part.removed
                ? "text-red-400"
                : "text-foreground";
              const prefix = part.added ? "+ " : part.removed ? "- " : "  ";

              return (
                <div key={index} className={`${bgColor} ${textColor} whitespace-pre-wrap font-mono text-sm`}>
                  {part.value.split("\n").map((line, i) => (
                    <div key={i}>
                      {prefix}
                      {line}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
