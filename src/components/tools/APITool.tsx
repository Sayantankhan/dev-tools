import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Copy, Clock, FileCode, Plus, Trash2 } from "lucide-react";
import { ApiStateHandler } from "@/modules/state/ApiStateHandler";

export const APITool = () => {

  const {
    state,
    setters,
    helpers,
    actions
  } = ApiStateHandler();

  return (
    <div className="space-y-6">
      {/* API Tester */}
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Pane: Request Builder */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Request</h3>

        {/* URL & Method */}
        <div className="flex gap-2">
          <Select value={state.method} onValueChange={setters.setMethod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="OPTIONS">OPTIONS</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={state.url}
            onChange={(e) => setters.setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1"
          />
        </div>

        {/* Query Params */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Query Parameters</Label>
            <Button size="sm" variant="ghost" onClick={state.addQueryParam}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          {state.queryParams.map((param, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={param.key}
                onChange={(e) => helpers.updateQueryParam(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={param.value}
                onChange={(e) => helpers.updateQueryParam(index, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => helpers.removeQueryParam(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Headers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Headers</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={state.addBearerToken}>
                Bearer Token
              </Button>
              <Button size="sm" variant="ghost" onClick={state.addHeader}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
          {state.headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={header.key}
                onChange={(e) => helpers.updateHeader(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => helpers.updateHeader(index, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => helpers.removeHeader(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Body */}
        {state.method !== "GET" && state.method !== "HEAD" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <Select value={state.bodyType} onValueChange={(v: any) => setters.setBodyType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={state.body}
              onChange={(e) => setters.setBody(e.target.value)}
              placeholder={state.bodyType === "json" ? '{"key": "value"}' : "Request body..."}
              className="code-editor min-h-[150px]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={actions.handleSend} disabled={state.loading} className="btn-gradient flex-1">
            {state.loading ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Pane: Response Viewer */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Response</h3>

        {state.loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Sending request...</p>
          </div>
        ) : state.response ? (
          <>
            {/* Error Display */}
            {state.response.error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive mb-1">Request Failed</h4>
                    <p className="text-sm text-foreground/80">{state.response.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status & Metrics */}
            <div className="flex flex-wrap gap-4 p-4 bg-card/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p
                  className={`font-bold ${
                    state.response.status >= 200 && state.response.status < 300
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {state.response.status > 0 ? `${state.response.status} ${state.response.statusText}` : "Failed"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-mono">{Math.round(state.response.time)}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-mono">{helpers.formatSize(state.response.size)}</p>
              </div>
            </div>

            {/* Response Tabs */}
            {!state.response.error && (
            <Tabs defaultValue="body" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>

              <TabsContent value="body" className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      actions.handleCopy(
                        typeof state.response.data === "string"
                          ? state.response.data
                          : JSON.stringify(state.response.data, null, 2),
                        "Response body"
                      )
                    }
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-input p-4 rounded-lg text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  {typeof state.response.data === "string"
                    ? state.response.data
                    : JSON.stringify(state.response.data, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="headers" className="space-y-2">
                {Object.entries(state.response.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between p-3 bg-card/50 rounded-lg"
                  >
                    <code className="text-sm text-primary">{key}</code>
                    <code className="text-sm text-foreground/70">{String(value)}</code>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Send a request to see the response</p>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};
