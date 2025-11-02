import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSearch, Trash2 } from "lucide-react";
import { LogParserStateHandler } from "@/modules/state/LogParserStateHandler";

export const LogParserTool = () => {
  const { state, helpers, setters, actions } = LogParserStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Search Logs</Label>
          <Input
            value={state.searchQuery}
            onChange={(e) => setters.setSearchQuery(e.target.value)}
            placeholder="Search for keywords..."
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
                  ? "text-gray-400"
                  : "text-foreground";

              return (
                <div key={index} className={`${colorClass} text-sm font-mono whitespace-pre-wrap mb-1`}>
                  <span className="text-muted-foreground mr-2">{index + 1}.</span>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
