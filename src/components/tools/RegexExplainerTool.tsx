import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { RegexExplainerStateHandler } from "@/modules/state/RegexExplainerStateHandler";

export const RegexExplainerTool = () => {
  const { state, actions } = RegexExplainerStateHandler();

  const highlightMatches = () => {
    if (!state.sampleText || state.matches.length === 0) {
      return state.sampleText;
    }

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    state.matches.forEach((match, idx) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {state.sampleText.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add highlighted match
      parts.push(
        <mark
          key={`match-${idx}`}
          className="bg-primary/30 text-primary-foreground px-1 rounded"
        >
          {match.text}
        </mark>
      );

      lastIndex = match.index + match.text.length;
    });

    // Add remaining text
    if (lastIndex < state.sampleText.length) {
      parts.push(
        <span key="text-end">{state.sampleText.substring(lastIndex)}</span>
      );
    }

    return parts;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Regex Explainer & Tester</h2>
        <div className="flex gap-2">
          <Button onClick={actions.handleCopy} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Pattern
          </Button>
          <Button onClick={actions.handleClear} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label>Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => actions.applyPreset("email")}
            variant="outline"
            size="sm"
          >
            Email
          </Button>
          <Button
            onClick={() => actions.applyPreset("url")}
            variant="outline"
            size="sm"
          >
            URL
          </Button>
          <Button
            onClick={() => actions.applyPreset("phone")}
            variant="outline"
            size="sm"
          >
            Phone
          </Button>
          <Button
            onClick={() => actions.applyPreset("ipv4")}
            variant="outline"
            size="sm"
          >
            IPv4
          </Button>
          <Button
            onClick={() => actions.applyPreset("date")}
            variant="outline"
            size="sm"
          >
            Date (YYYY-MM-DD)
          </Button>
        </div>
      </div>

      {/* Regex Pattern Input */}
      <div className="space-y-2">
        <Label>Regex Pattern</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={state.pattern}
              onChange={(e) => actions.updatePattern(e.target.value)}
              placeholder="Enter regex pattern (e.g., \d{3}-\d{4})"
              className={state.error ? "border-destructive" : ""}
            />
          </div>
          <Input
            value={state.flags}
            onChange={(e) => actions.updateFlags(e.target.value)}
            placeholder="Flags"
            className="w-20"
          />
        </div>
        {state.error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {state.error}
          </div>
        )}
        {!state.error && state.pattern && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Valid regex pattern
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Common flags: g (global), i (case-insensitive), m (multiline)
        </p>
      </div>

      {/* Explanation */}
      {state.explanation && (
        <div className="space-y-2">
          <Label>Pattern Explanation</Label>
          <div className="p-4 bg-muted/50 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {state.explanation}
            </pre>
          </div>
        </div>
      )}

      {/* Sample Text */}
      <div className="space-y-2">
        <Label>Sample Text</Label>
        <Textarea
          value={state.sampleText}
          onChange={(e) => actions.updateSampleText(e.target.value)}
          placeholder="Enter sample text to test the pattern..."
          rows={6}
        />
      </div>

      {/* Highlighted Matches */}
      {state.sampleText && (
        <div className="space-y-2">
          <Label>
            Matches Found: {state.matches.length}
          </Label>
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 font-mono text-sm whitespace-pre-wrap">
            {highlightMatches()}
          </div>
        </div>
      )}

      {/* Match Details */}
      {state.matches.length > 0 && (
        <div className="space-y-2">
          <Label>Match Details</Label>
          <div className="space-y-2">
            {state.matches.map((match, index) => (
              <div
                key={index}
                className="p-3 bg-muted/30 rounded border border-border/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">
                    Match {index + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Position: {match.index}
                  </span>
                </div>
                <p className="font-mono text-sm mt-1">&quot;{match.text}&quot;</p>
                {match.groups && match.groups.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Groups: </span>
                    {match.groups.map((group, idx) => (
                      <span key={idx} className="font-mono">
                        {idx > 0 && ", "}
                        &quot;{group}&quot;
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong>Common Patterns:</strong>
          <br />
          \d = digit | \w = word char | \s = whitespace | . = any char
          <br />
          * = 0+ times | + = 1+ times | ? = optional | {"{n,m}"} = n to m times
          <br />
          ^ = start | $ = end | [abc] = a or b or c | (x|y) = x or y
        </p>
      </div>
    </div>
  );
};