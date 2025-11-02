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
      {state.diffResult.length > 0 && (() => {
        const helpers = state.helpers || {};
        return (
          <div className="space-y-3">
            <Label>Comparison Result (Git-style Diff)</Label>
            <div className="code-editor p-4 min-h-[300px] max-h-[600px] overflow-auto">
              <div className="font-mono text-xs">
                {helpers.generateLineDiff && helpers.generateLineDiff(state.diffResult).map((line: any, index: number) => {
                  const bgColor = line.type === 'add'
                    ? "bg-green-500/20"
                    : line.type === 'remove'
                    ? "bg-red-500/20"
                    : "bg-transparent";
                  const textColor = line.type === 'add'
                    ? "text-green-400"
                    : line.type === 'remove'
                    ? "text-red-400"
                    : "text-foreground";
                  const prefix = line.type === 'add' ? "+ " : line.type === 'remove' ? "- " : "  ";

                  return (
                    <div key={index} className={`${bgColor} ${textColor} flex hover:bg-opacity-30 transition-colors`}>
                      <span className="text-muted-foreground select-none w-16 flex-shrink-0 text-right pr-2 border-r border-border">
                        {line.oldLineNum || ''}
                      </span>
                      <span className="text-muted-foreground select-none w-16 flex-shrink-0 text-right pr-4 border-r border-border">
                        {line.lineNum || ''}
                      </span>
                      <span className="pl-4 flex-1 whitespace-pre">
                        <span className="select-none">{prefix}</span>{line.content}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
