import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Locate, Trash2, Loader2 } from "lucide-react";
import { IPLookupStateHandler } from "@/modules/state/IPLookupStateHandler";

export const IPLookupTool = () => {
  const { state, setters, actions } = IPLookupStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>IP Address</Label>
          <Input
            value={state.ipAddress}
            onChange={(e) => setters.setIpAddress(e.target.value)}
            placeholder="Enter IP address (e.g., 8.8.8.8)"
            className="mt-1"
          />
        </div>

        <Button onClick={actions.handleLookup} className="btn-gradient" disabled={state.loading}>
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
          <CardHeader>
            <CardTitle className="text-lg">IP Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p className="text-sm font-mono mt-1">{state.ipInfo.ip}</p>
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

      {/* Info Message */}
      {!state.ipInfo && !state.loading && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground text-center">
          Enter an IP address and click Lookup to get geolocation information
        </div>
      )}
    </div>
  );
};
