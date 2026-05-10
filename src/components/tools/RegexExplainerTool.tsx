import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { RegexExplainerStateHandler } from "@/modules/state/RegexExplainerStateHandler";

const PRESETS = [
  { id: "email", label: "Email" },
  { id: "url", label: "URL" },
  { id: "phone", label: "Phone" },
  { id: "ipv4", label: "IPv4" },
  { id: "date", label: "Date" },
];

const SectionLabel = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
    {hint && <span className="text-[10px] font-mono text-muted-foreground/70">{hint}</span>}
  </div>
);

export const RegexExplainerTool = () => {
  const { state, actions } = RegexExplainerStateHandler();

  const highlightMatches = () => {
    if (!state.sampleText || state.matches.length === 0) return state.sampleText;
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    state.matches.forEach((match, idx) => {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${idx}`}>{state.sampleText.substring(lastIndex, match.index)}</span>);
      }
      parts.push(
        <mark key={`m-${idx}`} className="bg-primary/25 text-primary px-0.5 rounded-sm border-b border-primary/60">
          {match.text}
        </mark>
      );
      lastIndex = match.index + match.text.length;
    });
    if (lastIndex < state.sampleText.length) {
      parts.push(<span key="end">{state.sampleText.substring(lastIndex)}</span>);
    }
    return parts;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              onClick={() => actions.applyPreset(p.id)}
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] font-mono"
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button onClick={actions.handleCopy} size="sm" variant="ghost" className="h-8 gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button onClick={actions.handleClear} size="sm" variant="ghost" className="h-8 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Pattern */}
      <div>
        <SectionLabel hint={state.error ? "invalid" : state.pattern ? "valid" : "/pattern/flags"}>
          Pattern
        </SectionLabel>
        <div className="flex items-stretch gap-0 rounded-md border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-ring">
          <span className="px-3 flex items-center text-muted-foreground font-mono text-sm select-none border-r border-border">/</span>
          <Input
            value={state.pattern}
            onChange={(e) => actions.updatePattern(e.target.value)}
            placeholder={`\\d{3}-\\d{4}`}
            className="flex-1 border-0 bg-transparent font-mono text-sm h-10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <span className="px-2 flex items-center text-muted-foreground font-mono text-sm select-none border-l border-border">/</span>
          <Input
            value={state.flags}
            onChange={(e) => actions.updateFlags(e.target.value)}
            placeholder="gim"
            className="w-20 border-0 bg-transparent font-mono text-sm h-10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="mt-1.5 min-h-[16px] text-[11px] font-mono">
          {state.error ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="w-3 h-3" />
              {state.error}
            </span>
          ) : state.pattern ? (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="w-3 h-3" />
              valid · {state.matches.length} match{state.matches.length !== 1 ? "es" : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">flags: g (global) · i (case-insensitive) · m (multiline)</span>
          )}
        </div>
      </div>

      {/* Two-column: explanation + sample */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <SectionLabel hint="breakdown">Explanation</SectionLabel>
          <div className="rounded-md border border-border bg-card p-3 min-h-[180px]">
            <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">
              {state.explanation || "Enter a pattern to see explanation."}
            </pre>
          </div>
        </div>
        <div>
          <SectionLabel hint="test against">Sample</SectionLabel>
          <Textarea
            value={state.sampleText}
            onChange={(e) => actions.updateSampleText(e.target.value)}
            placeholder="Paste text to test the pattern…"
            className="font-mono text-xs min-h-[180px] bg-card resize-none"
          />
        </div>
      </div>

      {/* Highlighted preview */}
      {state.sampleText && (
        <div>
          <SectionLabel hint={`${state.matches.length} highlighted`}>Matches</SectionLabel>
          <div className="rounded-md border border-border bg-card p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[240px] overflow-auto">
            {highlightMatches()}
          </div>
        </div>
      )}

      {/* Match details */}
      {state.matches.length > 0 && (
        <div>
          <SectionLabel hint="captures">Details</SectionLabel>
          <div className="rounded-md border border-border bg-card divide-y divide-border max-h-[280px] overflow-auto">
            {state.matches.map((match, index) => (
              <div key={index} className="px-3 py-2 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="text-muted-foreground/70">pos {match.index}</span>
                </div>
                <p className="font-mono text-xs mt-0.5 text-foreground">{match.text}</p>
                {match.groups && match.groups.length > 0 && (
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                    groups: {match.groups.map((g, i) => (
                      <span key={i} className="text-foreground/80">{i > 0 && ", "}{g || "∅"}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cheatsheet */}
      <div className="pt-2 text-[11px] font-mono text-muted-foreground leading-relaxed border-t border-border">
        <span className="text-foreground/80">\d</span> digit · <span className="text-foreground/80">\w</span> word ·{" "}
        <span className="text-foreground/80">\s</span> space · <span className="text-foreground/80">.</span> any ·{" "}
        <span className="text-foreground/80">*</span> 0+ · <span className="text-foreground/80">+</span> 1+ ·{" "}
        <span className="text-foreground/80">?</span> optional · <span className="text-foreground/80">^$</span> anchors
      </div>
    </div>
  );
};
