import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ToolHandler } from "@/modules/types/ToolHandler";


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
    error?: string;
    requestHeaders?: Record<string, string>;
}

interface WebhookRequest {
    id: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
    timestamp: number;
}

export const ApiStateHandler = (): ToolHandler => {
    const [method, setMethod] = useState("GET");
    const [url, setUrl] = useState("");
    const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
    const [queryParams, setQueryParams] = useState<QueryParam[]>([{ key: "", value: "" }]);
    const [body, setBody] = useState("");
    const [response, setResponse] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [bodyType, setBodyType] = useState<"raw" | "json">("json");
    const [jsonError, setJsonError] = useState<string>("");
    
    // Webhook states
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookRequests, setWebhookRequests] = useState<WebhookRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

    // WebSocket states
    const [wsUrl, setWsUrl] = useState("wss://echo.websocket.org");
    const [wsConnected, setWsConnected] = useState(false);
    const [wsMessage, setWsMessage] = useState("");
    const [wsMessages, setWsMessages] = useState<any[]>([]);
    const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
    const [wsQueryParams, setWsQueryParams] = useState<QueryParam[]>([{ key: "", value: "" }]);

    // Generate initial webhook URL
    useEffect(() => {
        if (!webhookUrl) {
            const id = Math.random().toString(36).substring(2, 15);
            setWebhookUrl(`https://webhook.example.com/${id}`);
        }
    }, []);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsInstance) {
                wsInstance.close();
            }
        };
    }, [wsInstance]);

    const helpers = {
        addHeader: () => {
            setHeaders([...headers, { key: "", value: "" }]);
        },

        updateHeader: (index: number, field: "key" | "value", value: string) => {
            const updated = [...headers];
            updated[index][field] = value;
            setHeaders(updated);
        },

        removeHeader: (index: number) => {
            setHeaders(headers.filter((_, i) => i !== index));
        },

        addQueryParam: () => {
            setQueryParams([...queryParams, { key: "", value: "" }]);
        },

        updateQueryParam: (index: number, field: "key" | "value", value: string) => {
            const updated = [...queryParams];
            updated[index][field] = value;
            setQueryParams(updated);
        },

        removeQueryParam: (index: number) => {
            setQueryParams(queryParams.filter((_, i) => i !== index));
        },

        addBearerToken: () => {
            const token = prompt("Enter Bearer token:");
            if (token) {
                setHeaders([...headers, { key: "Authorization", value: `Bearer ${token}` }]);
                toast.success("Bearer token added");
            }
        },

        buildURL: () => {
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
        },

        formatSize: (bytes: number) => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        },

        validateJSON: (jsonString: string): boolean => {
            if (!jsonString.trim()) {
                setJsonError("");
                return true;
            }

            try {
                JSON.parse(jsonString);
                setJsonError("");
                return true;
            } catch (error: any) {
                setJsonError(error.message);
                return false;
            }
        },

        formatJSON: () => {
            if (!body.trim()) return;

            try {
                const parsed = JSON.parse(body);
                const formatted = JSON.stringify(parsed, null, 2);
                setBody(formatted);
                setJsonError("");
                toast.success("JSON formatted");
            } catch (error: any) {
                toast.error("Invalid JSON", {
                    description: error.message,
                });
                setJsonError(error.message);
            }
        },

        generateCurl: (): string => {
            const finalURL = helpers.buildURL();
            let curl = `curl -X ${method} '${finalURL}'`;

            // Add headers
            const requestHeaders: Record<string, string> = {};
            headers.forEach((header) => {
                if (header.key) {
                    requestHeaders[header.key] = header.value;
                }
            });

            if (bodyType === "json" && body) {
                requestHeaders["Content-Type"] = "application/json";
            }

            Object.entries(requestHeaders).forEach(([key, value]) => {
                curl += ` \\\n  -H '${key}: ${value}'`;
            });

            // Add body
            if (method !== "GET" && method !== "HEAD" && body) {
                const escapedBody = body.replace(/'/g, "'\\''");
                curl += ` \\\n  -d '${escapedBody}'`;
            }

            return curl;
        },
    }

    const actions = {
        handleSend: async () => {
            if (!url) {
                toast.error("Please enter a URL");
                return;
            }

            // Validate JSON before sending
            if (bodyType === "json" && body.trim() && !helpers.validateJSON(body)) {
                toast.error("Invalid JSON in request body");
                return;
            }

            setLoading(true);
            const startTime = performance.now();

            const requestHeaders: Record<string, string> = {};
            headers.forEach((header) => {
                if (header.key) {
                    requestHeaders[header.key] = header.value;
                }
            });

            if (bodyType === "json" && body) {
                requestHeaders["Content-Type"] = "application/json";
            }

            try {
                const finalURL = helpers.buildURL();

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
                    requestHeaders,
                });

                toast.success(`${res.status} ${res.statusText}`, {
                    description: `${Math.round(endTime - startTime)}ms`,
                });
            } catch (error: any) {
                const endTime = performance.now();
                const errorMessage = error.message || "Unknown error";
                const isCorsError = errorMessage.includes("Failed to fetch") || 
                                   errorMessage.includes("CORS") ||
                                   errorMessage.includes("NetworkError");
                
                const displayError = isCorsError 
                    ? "CORS Error: The server must include 'Access-Control-Allow-Origin' in its RESPONSE headers (not request headers). This is a browser security restriction - curl works because it doesn't enforce CORS. The server needs to allow your origin in its response."
                    : errorMessage;

                setResponse({
                    status: 0,
                    statusText: "Error",
                    time: endTime - startTime,
                    size: 0,
                    headers: {},
                    data: null,
                    error: displayError,
                    requestHeaders,
                });

                toast.error("Request failed", {
                    description: isCorsError ? "CORS Error - Check server configuration" : errorMessage,
                });
            } finally {
                setLoading(false);
            }
        },

        handleCopy: (text: string, label?: string) => {
            navigator.clipboard.writeText(text);
            toast.success(`${label || 'Content'} copied!`);
        },

        exportCurl: () => {
            const curlCommand = helpers.generateCurl();
            navigator.clipboard.writeText(curlCommand);
            toast.success("Curl command copied to clipboard!");
        },
    }

    // Webhook helpers
    const webhookHelpers = {
        generateNewWebhookUrl: () => {
            const id = Math.random().toString(36).substring(2, 15);
            setWebhookUrl(`https://webhook.example.com/${id}`);
            toast.success("New webhook URL generated");
        },

        addDemoRequest: () => {
            const demoRequests = [
                {
                    method: 'POST',
                    path: '/webhook/payment',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Stripe/1.0',
                        'X-Stripe-Signature': 'whsec_abc123...'
                    },
                    body: {
                        type: 'payment_intent.succeeded',
                        data: {
                            amount: 2999,
                            currency: 'usd',
                            status: 'succeeded'
                        }
                    }
                },
                {
                    method: 'POST',
                    path: '/webhook/order',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Shopify/1.0'
                    },
                    body: {
                        order_id: 12345,
                        customer: 'john@example.com',
                        total: 299.99
                    },
                    queryParams: {
                        source: 'shopify',
                        store: 'my-store'
                    }
                },
                {
                    method: 'POST',
                    path: '/webhook/user',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-GitHub-Event': 'push'
                    },
                    body: {
                        event: 'user.created',
                        user: {
                            id: 'usr_abc123',
                            email: 'user@example.com',
                            name: 'John Doe'
                        }
                    }
                }
            ];

            const randomDemo = demoRequests[Math.floor(Math.random() * demoRequests.length)];
            const newRequest: WebhookRequest = {
                id: Math.random().toString(36).substring(2, 15),
                timestamp: Date.now(),
                ...randomDemo
            };

            setWebhookRequests(prev => [newRequest, ...prev]);
            toast.success("Demo request added");
        },

        clearWebhookRequests: () => {
            setWebhookRequests([]);
            setSelectedRequest(null);
            toast.success("All webhook requests cleared");
        }
    };

    // WebSocket helpers
    const websocketHelpers = {
        addWsQueryParam: () => {
            setWsQueryParams([...wsQueryParams, { key: "", value: "" }]);
        },

        updateWsQueryParam: (index: number, field: "key" | "value", value: string) => {
            const updated = [...wsQueryParams];
            updated[index][field] = value;
            setWsQueryParams(updated);
        },

        removeWsQueryParam: (index: number) => {
            setWsQueryParams(wsQueryParams.filter((_, i) => i !== index));
        },

        buildWsURL: () => {
            try {
                const urlObj = new URL(wsUrl);
                wsQueryParams.forEach((param) => {
                    if (param.key) {
                        urlObj.searchParams.set(param.key, param.value);
                    }
                });
                return urlObj.toString();
            } catch {
                return wsUrl;
            }
        },

        connectWebSocket: () => {
            if (!wsUrl) {
                toast.error("Please enter a WebSocket URL");
                return;
            }

            try {
                const finalUrl = websocketHelpers.buildWsURL();
                const ws = new WebSocket(finalUrl);

                ws.onopen = () => {
                    setWsConnected(true);
                    setWsMessages(prev => [...prev, {
                        type: 'connection',
                        data: 'Connected to WebSocket',
                        timestamp: Date.now()
                    }]);
                    toast.success("WebSocket connected");
                };

                ws.onmessage = (event) => {
                    setWsMessages(prev => [...prev, {
                        type: 'received',
                        data: event.data,
                        timestamp: Date.now()
                    }]);
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    toast.error("WebSocket error");
                    setWsMessages(prev => [...prev, {
                        type: 'error',
                        data: 'Connection error occurred',
                        timestamp: Date.now()
                    }]);
                };

                ws.onclose = () => {
                    setWsConnected(false);
                    setWsMessages(prev => [...prev, {
                        type: 'connection',
                        data: 'Disconnected from WebSocket',
                        timestamp: Date.now()
                    }]);
                    toast.info("WebSocket disconnected");
                };

                setWsInstance(ws);
            } catch (error: any) {
                toast.error("Failed to connect", {
                    description: error.message
                });
            }
        },

        disconnectWebSocket: () => {
            if (wsInstance) {
                wsInstance.close();
                setWsInstance(null);
            }
        },

        sendWebSocketMessage: () => {
            if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
                toast.error("WebSocket not connected");
                return;
            }

            if (!wsMessage) {
                toast.error("Please enter a message");
                return;
            }

            try {
                wsInstance.send(wsMessage);
                setWsMessages(prev => [...prev, {
                    type: 'sent',
                    data: wsMessage,
                    timestamp: Date.now()
                }]);
                toast.success("Message sent");
            } catch (error: any) {
                toast.error("Failed to send message", {
                    description: error.message
                });
            }
        },

        clearWebSocketMessages: () => {
            setWsMessages([]);
            toast.success("Messages cleared");
        }
    };

    return {
        state: {
            method,
            url,
            headers,
            queryParams,
            body,
            response,
            loading,
            bodyType,
            jsonError,
            addHeader: helpers.addHeader,
            addQueryParam: helpers.addQueryParam,
            addBearerToken: helpers.addBearerToken,
            // Webhook states
            webhookUrl,
            webhookRequests,
            selectedRequest,
            setSelectedRequest,
            generateNewWebhookUrl: webhookHelpers.generateNewWebhookUrl,
            addDemoRequest: webhookHelpers.addDemoRequest,
            clearWebhookRequests: webhookHelpers.clearWebhookRequests,
            // WebSocket states
            wsUrl,
            wsConnected,
            wsMessage,
            wsMessages,
            wsQueryParams,
            clearWebSocketMessages: websocketHelpers.clearWebSocketMessages,
            addWsQueryParam: websocketHelpers.addWsQueryParam,
        },
        setters: {
            setMethod,
            setUrl,
            setBody: (value: string) => {
                setBody(value);
                if (bodyType === "json") {
                    helpers.validateJSON(value);
                }
            },
            setBodyType: (value: "raw" | "json") => {
                setBodyType(value);
                if (value === "json" && body) {
                    helpers.validateJSON(body);
                } else {
                    setJsonError("");
                }
            },
            setWsUrl,
            setWsMessage,
        },
        helpers: {
            ...helpers,
            updateWsQueryParam: websocketHelpers.updateWsQueryParam,
            removeWsQueryParam: websocketHelpers.removeWsQueryParam,
        },
        actions: {
            ...actions,
            connectWebSocket: websocketHelpers.connectWebSocket,
            disconnectWebSocket: websocketHelpers.disconnectWebSocket,
            sendWebSocketMessage: websocketHelpers.sendWebSocketMessage,
        }
    }

}