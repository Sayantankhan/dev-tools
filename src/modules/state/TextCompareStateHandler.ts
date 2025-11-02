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
        if (part.added) additions += part.count || 0;
        else if (part.removed) deletions += part.count || 0;
        else unchanged += part.count || 0;
      });

      return { additions, deletions, unchanged };
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
