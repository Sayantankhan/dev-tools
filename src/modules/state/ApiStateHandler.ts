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
}

interface WebhookRequest {
    timestamp: string;
    method: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body: any;
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
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookRequests, setWebhookRequests] = useState<WebhookRequest[]>([]);
    const [isWebhookActive, setIsWebhookActive] = useState(false);

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

        generateWebhookUrl: () => {
            // Generate a unique webhook URL using webhook.site API
            return `https://webhook.site/${crypto.randomUUID()}`;
        },

        fetchWebhookRequests: async (webhookId: string) => {
            try {
                // Note: webhook.site doesn't have a public API for fetching requests
                // This is a placeholder - in production, you'd use a proper webhook service
                // or implement your own webhook receiver backend
                toast.info("Webhook monitoring active", {
                    description: "Send requests to the webhook URL to see them here"
                });
            } catch (error) {
                console.error("Error fetching webhook requests:", error);
            }
        },
    }

    const actions = {
        handleSend: async () => {
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
        },

        handleCopy: (text: string, label: string) => {
            navigator.clipboard.writeText(text);
            toast.success(`${label} copied!`);
        },

        startWebhook: () => {
            const newWebhookUrl = helpers.generateWebhookUrl();
            setWebhookUrl(newWebhookUrl);
            setIsWebhookActive(true);
            setWebhookRequests([]);
            toast.success("Webhook URL generated!", {
                description: "Copy the URL and use it to receive webhooks"
            });
        },

        stopWebhook: () => {
            setIsWebhookActive(false);
            toast.info("Webhook stopped");
        },

        clearWebhookRequests: () => {
            setWebhookRequests([]);
            toast.success("Webhook requests cleared");
        },

    }

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
            webhookUrl,
            webhookRequests,
            isWebhookActive,
            addHeader: helpers.addHeader,
            addQueryParam: helpers.addQueryParam,
            addBearerToken: helpers.addBearerToken,
        },
        setters: {
            setMethod,
            setUrl,
            setBody,
            setBodyType
        },
        helpers,
        actions
    }

}