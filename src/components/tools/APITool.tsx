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
import { Send, Copy, Clock, FileCode, Plus, Trash2, Save } from "lucide-react";

interface Header {
  key: string;
  value: string;
}

interface QueryParam {
  key: string;
  value: string;
}

interface APIResponse {
  status: number;
  statusText: string;
  time: number;
  size: number;
  headers: Record<string, string>;
  data: any;
}

export const APITool = () => {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bodyType, setBodyType] = useState<"raw" | "json">("json");

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: "", value: "" }]);
  };

  const updateQueryParam = (index: number, field: "key" | "value", value: string) => {
    const updated = [...queryParams];
    updated[index][field] = value;
    setQueryParams(updated);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const addBearerToken = () => {
    const token = prompt("Enter Bearer token:");
    if (token) {
      setHeaders([...headers, { key: "Authorization", value: `Bearer ${token}` }]);
      toast.success("Bearer token added");
    }
  };

  const buildURL = () => {
    try {
      const urlObj = new URL(url);
      queryParams.forEach((param) => {
        if (param.key) {
          urlObj.searchParams.set(param.key, param.value);
        }
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const handleSend = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      const requestHeaders: Record<string, string> = {};
      headers.forEach((header) => {
        if (header.key) {
          requestHeaders[header.key] = header.value;
        }
      });

      if (bodyType === "json" && body) {
        requestHeaders["Content-Type"] = "application/json";
      }

      const finalURL = buildURL();

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (method !== "GET" && method !== "HEAD" && body) {
        fetchOptions.body = body;
      }

      const res = await fetch(finalURL, fetchOptions);
      const endTime = performance.now();

      let data: any;
      const contentType = res.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseSize = new Blob([JSON.stringify(data)]).size;

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: endTime - startTime,
        size: responseSize,
        headers: responseHeaders,
        data,
      });

      toast.success(`${res.status} ${res.statusText}`, {
        description: `${Math.round(endTime - startTime)}ms`,
      });
    } catch (error: any) {
      toast.error("Request failed", {
        description: error.message,
      });
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Pane: Request Builder */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Request</h3>

        {/* URL & Method */}
        <div className="flex gap-2">
          <Select value={method} onValueChange={setMethod}>
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
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1"
          />
        </div>

        {/* Query Params */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Query Parameters</Label>
            <Button size="sm" variant="ghost" onClick={addQueryParam}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          {queryParams.map((param, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={param.key}
                onChange={(e) => updateQueryParam(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={param.value}
                onChange={(e) => updateQueryParam(index, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeQueryParam(index)}
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
              <Button size="sm" variant="ghost" onClick={addBearerToken}>
                Bearer Token
              </Button>
              <Button size="sm" variant="ghost" onClick={addHeader}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={header.key}
                onChange={(e) => updateHeader(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => updateHeader(index, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeHeader(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Body */}
        {method !== "GET" && method !== "HEAD" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <Select value={bodyType} onValueChange={(v: any) => setBodyType(v)}>
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
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={bodyType === "json" ? '{"key": "value"}' : "Request body..."}
              className="code-editor min-h-[150px]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={loading} className="btn-gradient flex-1">
            {loading ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Right Pane: Response Viewer */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Response</h3>

        {response ? (
          <>
            {/* Status & Metrics */}
            <div className="flex flex-wrap gap-4 p-4 bg-card/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p
                  className={`font-bold ${
                    response.status >= 200 && response.status < 300
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {response.status} {response.statusText}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-mono">{Math.round(response.time)}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-mono">{formatSize(response.size)}</p>
              </div>
            </div>

            {/* Response Tabs */}
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
                      handleCopy(
                        typeof response.data === "string"
                          ? response.data
                          : JSON.stringify(response.data, null, 2),
                        "Response body"
                      )
                    }
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-input p-4 rounded-lg text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  {typeof response.data === "string"
                    ? response.data
                    : JSON.stringify(response.data, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="headers" className="space-y-2">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between p-3 bg-card/50 rounded-lg"
                  >
                    <code className="text-sm text-primary">{key}</code>
                    <code className="text-sm text-foreground/70">{value}</code>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Send a request to see the response</p>
          </div>
        )}
      </div>
    </div>
  );
};
