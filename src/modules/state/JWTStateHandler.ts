import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ToolHandler } from "@/modules/types/ToolHandler";

interface DecodedJWT {
    header: any;
    payload: any;
    signature: string;
}

export const JWTStateHanler = (): ToolHandler => {

    const [token, setToken] = useState("");
    const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
    const [error, setError] = useState("");
    const [secret, setSecret] = useState("");
    const [expiryInfo, setExpiryInfo] = useState<string>("");

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // Only handle paste when NOT focused on input/textarea (for convenience)
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }
            const text = e.clipboardData?.getData("text");
            if (text && text.includes(".")) {
                e.preventDefault();
                setToken(text);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    useEffect(() => {
        if (token) {
            helpers.decodeToken(token);
        }
    }, [token]);

    const helpers = {
        base64UrlDecode: (str: string): string => {
            try {
                str = str.replace(/-/g, "+").replace(/_/g, "/");
                const pad = str.length % 4;
                if (pad) {
                    if (pad === 1) {
                        throw new Error("Invalid token");
                    }
                    str += new Array(5 - pad).join("=");
                }
                return decodeURIComponent(
                    atob(str)
                        .split("")
                        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                        .join("")
                );
            } catch {
                throw new Error("Invalid base64 encoding");
            }
        },

        decodeToken: (jwtToken: string) => {
            try {
                setError("");
                const parts = jwtToken.trim().split(".");

                if (parts.length !== 3) {
                    throw new Error("Invalid JWT format. Expected 3 parts separated by dots.");
                }

                const header = JSON.parse(helpers.base64UrlDecode(parts[0]));
                const payload = JSON.parse(helpers.base64UrlDecode(parts[1]));
                const signature = parts[2];

                setDecoded({ header, payload, signature });

                // Check expiry
                if (payload.exp) {
                    const expDate = new Date(payload.exp * 1000);
                    const now = new Date();
                    const diff = expDate.getTime() - now.getTime();

                    if (diff < 0) {
                        setExpiryInfo(`Expired ${helpers.formatRelativeTime(-diff)} ago`);
                    } else {
                        setExpiryInfo(`Expires in ${helpers.formatRelativeTime(diff)}`);
                    }
                } else {
                    setExpiryInfo("No expiration claim (exp) found");
                }

                toast.success("JWT decoded successfully!");
            } catch (err: any) {
                setError(err.message);
                setDecoded(null);
                toast.error("Failed to decode JWT");
            }
        },

        formatRelativeTime: (ms: number) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
            if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
            return `${seconds} second${seconds !== 1 ? "s" : ""}`;
        },
    };

    const actions = {
        handleCopy: (text: string, label: string) => {
            navigator.clipboard.writeText(text);
            toast.success(`${label} copied!`);
        },

        handleValidate: () => {
            if (!secret) {
                toast.error("Please enter a secret key");
                return;
            }

            toast.warning("Signature validation", {
                description: "Client-side validation is limited. Use server-side validation for production.",
            });
        },


        getClaims: () => {
            if (!decoded?.payload) return [];

            const standardClaims = ["iss", "sub", "aud", "exp", "nbf", "iat", "jti"];
            return Object.entries(decoded.payload).filter(([key]) =>
                standardClaims.includes(key)
            );
        },
    }

    return {
        state: {
            token,
            decoded,
            error,
            secret,
            expiryInfo
        },
        setters: {
            setToken,
            setSecret
        },
        helpers,
        actions
    };

}