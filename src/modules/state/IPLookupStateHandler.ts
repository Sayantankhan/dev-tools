import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  latitude: number | null;
  longitude: number | null;
  org: string;
  postal: string;
  timezone: string;
  version: "IPv4" | "IPv6" | "Unknown";
}

export const IPLookupStateHandler = (): ToolHandler => {
  const [ipAddress, setIpAddress] = useState("");
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const helpers = {
    isValidIP: (ip: string): boolean => {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      // Full IPv6 incl. compressed (::), embedded IPv4, and zone IDs
      const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    },
  };

  const actions = {
    handleLookup: async () => {
      const ip = ipAddress.trim();
      
      if (!ip) {
        toast.error("Please enter an IP address");
        return;
      }

      if (!helpers.isValidIP(ip)) {
        toast.error("Invalid IP address format");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch IP information");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.reason || "Invalid IP address");
        }

        const lat = typeof data.latitude === "number" ? data.latitude : null;
        const lng = typeof data.longitude === "number" ? data.longitude : null;
        const version: IPInfo["version"] = data.version === "IPv6" || (data.ip || "").includes(":")
          ? "IPv6"
          : data.version === "IPv4" || /^(\d{1,3}\.){3}\d{1,3}$/.test(data.ip || "")
            ? "IPv4"
            : "Unknown";

        const info: IPInfo = {
          ip: data.ip,
          city: data.city || "N/A",
          region: data.region || "N/A",
          country: data.country_name || "N/A",
          loc: lat !== null && lng !== null ? `${lat}, ${lng}` : "N/A",
          latitude: lat,
          longitude: lng,
          org: data.org || "N/A",
          postal: data.postal || "N/A",
          timezone: data.timezone || "N/A",
          version,
        };

        setIpInfo(info);
        toast.success("IP information retrieved!");
      } catch (error: any) {
        toast.error(error.message || "Failed to lookup IP");
        setIpInfo(null);
      } finally {
        setLoading(false);
      }
    },

    handleGetMyIP: async () => {
      setLoading(true);

      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setIpAddress(data.ip);
        toast.success("Your IP address loaded");
      } catch (error) {
        toast.error("Failed to get your IP address");
      } finally {
        setLoading(false);
      }
    },

    handleClear: () => {
      setIpAddress("");
      setIpInfo(null);
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      ipAddress,
      ipInfo,
      loading,
    },
    setters: {
      setIpAddress,
      setIpInfo,
      setLoading,
    },
    helpers,
    actions,
  };
};
