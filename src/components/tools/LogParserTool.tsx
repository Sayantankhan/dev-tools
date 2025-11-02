import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSearch, Trash2 } from "lucide-react";
import { LogParserStateHandler } from "@/modules/state/LogParserStateHandler";

export const LogParserTool = () => {
  const { state, helpers, setters, actions } = LogParserStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Search Logs</Label>
            <Input
              value={state.searchQuery}
              onChange={(e) => setters.setSearchQuery(e.target.value)}
              placeholder="Search for keywords or regex pattern..."
              className="mt-1"
            />
          </div>

          <div className="min-w-[150px]">
            <Label>Log Level</Label>
            <Select value={state.logLevel} onValueChange={setters.setLogLevel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="trace">Trace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <input
            ref={state.fileInputRef}
            type="file"
            accept=".log,.txt"
            onChange={actions.handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => state.fileInputRef.current?.click()} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Log
            </Button>
            {state.fileName && (
              <span className="text-sm text-muted-foreground">📎 {state.fileName}</span>
            )}
          </div>

          <Button onClick={actions.handleFilter} className="btn-gradient">
            <FileSearch className="w-4 h-4 mr-2" />
            Filter
          </Button>

          <Button onClick={actions.handleClear} variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Advanced Options */}
        <div className="flex flex-wrap gap-4 items-center p-4 bg-card/30 rounded-lg border border-border">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-regex"
              checked={state.useRegex}
              onCheckedChange={(checked) => setters.setUseRegex(checked as boolean)}
            />
            <Label htmlFor="use-regex" className="cursor-pointer text-sm">
              Use Regex
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={state.caseSensitive}
              onCheckedChange={(checked) => setters.setCaseSensitive(checked as boolean)}
            />
            <Label htmlFor="case-sensitive" className="cursor-pointer text-sm">
              Case Sensitive
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">From:</Label>
            <Input
              type="date"
              value={state.dateFrom}
              onChange={(e) => setters.setDateFrom(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">To:</Label>
            <Input
              type="date"
              value={state.dateTo}
              onChange={(e) => setters.setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>

          {(state.dateFrom || state.dateTo) && (
            <Button
              onClick={() => {
                setters.setDateFrom("");
                setters.setDateTo("");
              }}
              variant="ghost"
              size="sm"
              className="h-9"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-3">
        <Label>Paste Log Content</Label>
        <Textarea
          value={state.logContent}
          onChange={(e) => setters.setLogContent(e.target.value)}
          placeholder="Paste your log content here or upload a file..."
          className="code-editor min-h-[200px]"
        />
      </div>

      {/* Parsed Logs Display */}
      {state.filteredLogs.length > 0 && (
        <div className="space-y-3">
          <Label>
            Filtered Logs ({state.filteredLogs.length} lines)
          </Label>
          <div className="code-editor p-4 max-h-[500px] overflow-auto">
            {state.filteredLogs.map((line, index) => {
              const level = helpers.detectLogLevel(line);
              const colorClass =
                level === "error"
                  ? "text-red-400"
                  : level === "warning"
                  ? "text-yellow-400"
                  : level === "info"
                  ? "text-blue-400"
                  : level === "debug"
                  ? "text-purple-400"
                  : level === "trace"
                  ? "text-gray-400"
                  : "text-foreground";

              return (
                <div key={index} className={`${colorClass} text-sm font-mono whitespace-pre-wrap mb-1 hover:bg-muted/20 transition-colors px-2 py-1 rounded`}>
                  <span className="text-muted-foreground mr-2 select-none">{index + 1}.</span>
                  {helpers.highlightMatch(line, state.searchQuery, state.useRegex, state.caseSensitive).map((part, i) => 
                    part.highlighted ? (
                      <span key={i} className="bg-yellow-500/30 font-bold">{part.text}</span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
