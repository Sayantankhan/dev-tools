import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Locate, Trash2, Loader2 } from "lucide-react";
import { IPLookupStateHandler } from "@/modules/state/IPLookupStateHandler";

export const IPLookupTool = () => {
  const { state, setters, actions } = IPLookupStateHandler();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    actions.handleGetMyIP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lat = state.ipInfo?.latitude;
  const lng = state.ipInfo?.longitude;
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const delta = 0.01;
  const bbox = hasCoords
    ? `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
    : null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>IP Address (IPv4 or IPv6)</Label>
          <Input
            value={state.ipAddress}
            onChange={(e) => setters.setIpAddress(e.target.value)}
            placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
            className="mt-1 font-mono"
            onKeyDown={(e) => e.key === "Enter" && actions.handleLookup()}
          />
        </div>

        <Button onClick={() => actions.handleLookup()} className="btn-gradient" disabled={state.loading}>
          {state.loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Lookup
        </Button>

        <Button onClick={actions.handleGetMyIP} variant="outline" disabled={state.loading}>
          <Locate className="w-4 h-4 mr-2" />
          My IP
        </Button>

        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* IP Information */}
      {state.ipInfo && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">IP Information</CardTitle>
            <Badge variant="outline">{state.ipInfo.version}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p className="text-sm font-mono mt-1 break-all">{state.ipInfo.ip}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">City</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.city}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Region</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.region}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.country}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location (Lat, Lng)</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.loc}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.timezone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Postal Code</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.postal}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ISP/Organization</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.org}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* World Map */}
      {hasCoords && bbox && (
        <Card className="bg-card/50 border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Location on Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] md:h-[720px] rounded-md overflow-hidden border border-border">
              <iframe
                key={`${lat},${lng}`}
                title="IP location map"
                className="w-full h-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
              />
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-primary mt-2 inline-block"
            >
              View larger map
            </a>
          </CardContent>
        </Card>
      )}

      {/* Info Message */}
      {!state.ipInfo && state.loading && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground text-center">
          Detecting your IP address…
        </div>
      )}
    </div>
  );
};
