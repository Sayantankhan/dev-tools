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

interface WebhookTest {
    timestamp: string;
    status: number;
    statusText: string;
    responseTime: number;
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
    const [webhookTests, setWebhookTests] = useState<WebhookTest[]>([]);
    const [webhookBody, setWebhookBody] = useState('{\n  "test": "data"\n}');
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);

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

        testWebhook: async () => {
            if (!webhookUrl) {
                toast.error("Please enter a webhook URL");
                return;
            }

            setIsTestingWebhook(true);
            const startTime = performance.now();

            try {
                const res = await fetch(webhookUrl, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: webhookBody,
                });

                const endTime = performance.now();

                const test: WebhookTest = {
                    timestamp: new Date().toISOString(),
                    status: res.status || 200,
                    statusText: res.statusText || "Sent (no-cors mode)",
                    responseTime: endTime - startTime,
                };

                setWebhookTests([test, ...webhookTests]);

                toast.success("Webhook request sent", {
                    description: `Response time: ${Math.round(endTime - startTime)}ms`,
                });
            } catch (error: any) {
                const endTime = performance.now();
                
                const test: WebhookTest = {
                    timestamp: new Date().toISOString(),
                    status: 0,
                    statusText: error.message,
                    responseTime: endTime - startTime,
                };

                setWebhookTests([test, ...webhookTests]);

                toast.error("Webhook test failed", {
                    description: error.message,
                });
            } finally {
                setIsTestingWebhook(false);
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

        clearWebhookTests: () => {
            setWebhookTests([]);
            toast.success("Test history cleared");
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
            webhookTests,
            webhookBody,
            isTestingWebhook,
            addHeader: helpers.addHeader,
            addQueryParam: helpers.addQueryParam,
            addBearerToken: helpers.addBearerToken,
        },
        setters: {
            setMethod,
            setUrl,
            setBody,
            setBodyType,
            setWebhookUrl,
            setWebhookBody,
        },
        helpers,
        actions
    }

}