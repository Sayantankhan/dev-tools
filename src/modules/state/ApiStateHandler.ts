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
                const endTime = performance.now();
                const errorMessage = error.message || "Unknown error";
                const isCorsError = errorMessage.includes("Failed to fetch") || 
                                   errorMessage.includes("CORS") ||
                                   errorMessage.includes("NetworkError");
                
                const displayError = isCorsError 
                    ? "CORS Error: The server doesn't allow requests from this origin. Check the server's CORS configuration."
                    : errorMessage;

                setResponse({
                    status: 0,
                    statusText: "Error",
                    time: endTime - startTime,
                    size: 0,
                    headers: {},
                    data: null,
                    error: displayError,
                });

                toast.error("Request failed", {
                    description: isCorsError ? "CORS Error - Check server configuration" : errorMessage,
                });
            } finally {
                setLoading(false);
            }
        },

        handleCopy: (text: string, label: string) => {
            navigator.clipboard.writeText(text);
            toast.success(`${label} copied!`);
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
            addHeader: helpers.addHeader,
            addQueryParam: helpers.addQueryParam,
            addBearerToken: helpers.addBearerToken,
        },
        setters: {
            setMethod,
            setUrl,
            setBody,
            setBodyType,
        },
        helpers,
        actions
    }

}