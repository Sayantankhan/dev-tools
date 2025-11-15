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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Copy, Clock, FileCode, Plus, Trash2, Terminal, Webhook, ExternalLink } from "lucide-react";
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
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api">
            <Terminal className="w-4 h-4 mr-2" />
            API Tester
          </TabsTrigger>
          <TabsTrigger value="webhook">
            <Webhook className="w-4 h-4 mr-2" />
            Webhook Monitor
          </TabsTrigger>
          <TabsTrigger value="websocket">
            <ExternalLink className="w-4 h-4 mr-2" />
            WebSocket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
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
              <div className="flex gap-2">
                {state.bodyType === "json" && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={helpers.formatJSON}
                    disabled={!state.body.trim()}
                  >
                    <FileCode className="w-3 h-3 mr-1" />
                    Format
                  </Button>
                )}
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
            </div>
            <Textarea
              value={state.body}
              onChange={(e) => setters.setBody(e.target.value)}
              placeholder={state.bodyType === "json" ? '{"key": "value"}' : "Request body..."}
              className={`code-editor min-h-[150px] font-mono ${state.jsonError ? 'border-destructive' : ''}`}
            />
            {state.jsonError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <span className="text-destructive text-xs font-bold mt-0.5">!</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Invalid JSON</p>
                  <p className="text-xs text-foreground/70 mt-1">{state.jsonError}</p>
                </div>
              </div>
            )}
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
          <Button 
            variant="outline" 
            onClick={actions.exportCurl}
            disabled={!state.url}
          >
            <Terminal className="w-4 h-4 mr-2" />
            Export Curl
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Response Headers</TabsTrigger>
                <TabsTrigger value="request-headers">Request Headers</TabsTrigger>
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

              <TabsContent value="request-headers" className="space-y-2">
                {state.response.requestHeaders && Object.entries(state.response.requestHeaders).length > 0 ? (
                  Object.entries(state.response.requestHeaders).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between p-3 bg-card/50 rounded-lg"
                    >
                      <code className="text-sm text-primary">{key}</code>
                      <code className="text-sm text-foreground/70">{String(value)}</code>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No request headers sent</p>
                  </div>
                )}
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
        </TabsContent>

        <TabsContent value="webhook" className="space-y-6">
          {/* Webhook Monitor */}
          <div className="space-y-6">
            {/* Webhook URL */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Your Webhook URL</h3>
                    <p className="text-sm text-muted-foreground">
                      Use this URL to receive webhook events (Demo Mode)
                    </p>
                  </div>
                  <Badge variant="outline">Demo</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={state.webhookUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => actions.handleCopy(state.webhookUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={state.generateNewWebhookUrl}
                  >
                    New URL
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={state.addDemoRequest}
                  >
                    Add Demo Request
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={state.clearWebhookRequests}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </Card>

            {/* Webhook Requests List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Requests</h3>
                <Badge variant="secondary">{state.webhookRequests.length} requests</Badge>
              </div>

              {state.webhookRequests.length > 0 ? (
                <div className="space-y-3">
                  {state.webhookRequests.map((request: any) => (
                    <Card 
                      key={request.id} 
                      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => state.setSelectedRequest(request.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={request.method === 'POST' ? 'default' : 'secondary'}>
                              {request.method}
                            </Badge>
                            <span className="text-sm font-medium">{request.path}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {state.selectedRequest === request.id && (
                          <div className="mt-4 space-y-3 pt-3 border-t">
                            {/* Headers */}
                            <div>
                              <Label className="text-xs font-semibold">Headers</Label>
                              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                <pre className="text-xs font-mono overflow-auto">
                                  {JSON.stringify(request.headers, null, 2)}
                                </pre>
                              </div>
                            </div>

                            {/* Body */}
                            {request.body && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs font-semibold">Body</Label>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      actions.handleCopy(JSON.stringify(request.body, null, 2));
                                    }}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                  <pre className="text-xs font-mono overflow-auto max-h-64">
                                    {JSON.stringify(request.body, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Query Params */}
                            {request.queryParams && Object.keys(request.queryParams).length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold">Query Parameters</Label>
                                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <pre className="text-xs font-mono overflow-auto">
                                    {JSON.stringify(request.queryParams, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12">
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <Webhook className="w-12 h-12 text-muted-foreground/50" />
                    <div>
                      <p className="text-lg font-medium">No webhook requests yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Add Demo Request" to see how it works
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="websocket" className="space-y-6">
          {/* WebSocket Tester */}
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Connection & Send */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Connection</h3>
                
                {/* WebSocket URL */}
                <div className="space-y-2">
                  <Label>WebSocket URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={state.wsUrl}
                      onChange={(e) => setters.setWsUrl(e.target.value)}
                      placeholder="wss://echo.websocket.org"
                      className="flex-1"
                      disabled={state.wsConnected}
                    />
                    {!state.wsConnected ? (
                      <Button onClick={actions.connectWebSocket}>
                        Connect
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={actions.disconnectWebSocket}>
                        Disconnect
                      </Button>
                    )}
                  </div>
                  {state.wsConnected && (
                    <Badge variant="default" className="mt-2">
                      Connected
                    </Badge>
                  )}
                </div>

                {/* Query Parameters */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Query Parameters</Label>
                    <Button size="sm" variant="ghost" onClick={state.addWsQueryParam} disabled={state.wsConnected}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {state.wsQueryParams.map((param: any, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => helpers.updateWsQueryParam(index, "key", e.target.value)}
                        className="flex-1"
                        disabled={state.wsConnected}
                      />
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => helpers.updateWsQueryParam(index, "value", e.target.value)}
                        className="flex-1"
                        disabled={state.wsConnected}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => helpers.removeWsQueryParam(index)}
                        disabled={state.wsConnected}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <Label>Send Message</Label>
                  <div className="space-y-2">
                    <Textarea
                      value={state.wsMessage}
                      onChange={(e) => setters.setWsMessage(e.target.value)}
                      placeholder='{"type": "message", "content": "Hello"}'
                      className="font-mono text-sm min-h-32"
                      disabled={!state.wsConnected}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={actions.sendWebSocketMessage}
                        disabled={!state.wsConnected || !state.wsMessage}
                        className="flex-1"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          try {
                            const formatted = JSON.stringify(JSON.parse(state.wsMessage), null, 2);
                            setters.setWsMessage(formatted);
                            toast.success("JSON formatted");
                          } catch {
                            toast.error("Invalid JSON");
                          }
                        }}
                        disabled={!state.wsMessage}
                      >
                        Format JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Messages */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Messages</h3>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{state.wsMessages.length} messages</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={state.clearWebSocketMessages}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg h-[500px] overflow-auto bg-muted/20">
                  {state.wsMessages.length > 0 ? (
                    <div className="space-y-2 p-4">
                      {state.wsMessages.map((msg: any, index: number) => (
                        <Card
                          key={index}
                          className={`p-3 ${
                            msg.type === 'sent' 
                              ? 'bg-primary/10 border-primary/20' 
                              : msg.type === 'received'
                              ? 'bg-secondary/10 border-secondary/20'
                              : 'bg-muted/50 border-muted'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant={
                                  msg.type === 'sent' ? 'default' : 
                                  msg.type === 'received' ? 'secondary' : 
                                  'outline'
                                }
                              >
                                {msg.type === 'sent' ? 'Sent' : 
                                 msg.type === 'received' ? 'Received' : 
                                 msg.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <pre className="text-xs font-mono overflow-auto flex-1 bg-background/50 p-2 rounded">
                                {msg.data}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => actions.handleCopy(msg.data)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
