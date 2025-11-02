import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import * as Diff from "diff";

export const TextCompareStateHandler = (): ToolHandler => {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [diffResult, setDiffResult] = useState<any[]>([]);
  const [stats, setStats] = useState({ additions: 0, deletions: 0, unchanged: 0 });

  const helpers = {
    calculateStats: (diff: any[]) => {
      let additions = 0;
      let deletions = 0;
      let unchanged = 0;

      diff.forEach((part) => {
        const lines = part.value.split('\n').filter((l: string) => l);
        if (part.added) additions += lines.length;
        else if (part.removed) deletions += lines.length;
        else unchanged += lines.length;
      });

      return { additions, deletions, unchanged };
    },

    generateLineDiff: (diff: any[]) => {
      const result: Array<{ lineNum: number | null, oldLineNum: number | null, content: string, type: 'add' | 'remove' | 'unchanged' }> = [];
      let leftLineNum = 1;
      let rightLineNum = 1;

      diff.forEach((part) => {
        const lines = part.value.split('\n');
        
        lines.forEach((line, index) => {
          // Skip empty last line from split
          if (index === lines.length - 1 && line === '') return;

          if (part.added) {
            result.push({
              lineNum: rightLineNum++,
              oldLineNum: null,
              content: line,
              type: 'add'
            });
          } else if (part.removed) {
            result.push({
              lineNum: null,
              oldLineNum: leftLineNum++,
              content: line,
              type: 'remove'
            });
          } else {
            result.push({
              lineNum: rightLineNum++,
              oldLineNum: leftLineNum++,
              content: line,
              type: 'unchanged'
            });
          }
        });
      });

      return result;
    },
  };

  const actions = {
    handleCompare: () => {
      if (!leftText.trim() && !rightText.trim()) {
        toast.error("Please enter text in both fields");
        return;
      }

      const diff = Diff.diffLines(leftText, rightText);
      setDiffResult(diff);
      setStats(helpers.calculateStats(diff));
      toast.success("Comparison complete!");
    },

    handleSwap: () => {
      const temp = leftText;
      setLeftText(rightText);
      setRightText(temp);
      toast.success("Texts swapped!");
    },

    handleClear: () => {
      setLeftText("");
      setRightText("");
      setDiffResult([]);
      setStats({ additions: 0, deletions: 0, unchanged: 0 });
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      leftText,
      rightText,
      diffResult,
      stats,
    },
    setters: {
      setLeftText,
      setRightText,
      setDiffResult,
      setStats,
    },
    helpers,
    actions,
  };
};
