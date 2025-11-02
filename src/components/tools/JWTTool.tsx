import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Key, Copy, AlertTriangle, Clock, Wand2 } from "lucide-react";
import { JWTStateHanler } from "@/modules/state/JWTStateHandler";

interface DecodedJWT {
  header: any;
  payload: any;
  signature: string;
}

export const JWTTool = () => {
  const {
      state,
      setters,
      actions
    } = JWTStateHanler();

  return (
    <div className="space-y-6">
      {/* Token Input */}
      <div className="space-y-3">
        <Label>JWT Token</Label>
        <Textarea
          value={state.token}
          onChange={(e) => setters.setToken(e.target.value)}
          placeholder="Paste your JWT token here..."
          className="code-editor min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          Paste your JWT token to decode it automatically
        </p>
      </div>

      {state.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {state.error}
        </div>
      )}

      {/* Decoded Content */}
      {state.decoded && (
        <>
          {/* Expiry Info */}
          {state.decoded.payload.exp && (
            <div className="p-4 bg-card/50 border border-border rounded-lg flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{state.expiryInfo}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(state.decoded.payload.exp * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Common Claims */}
          {actions.getClaims().length > 0 && (
            <div className="space-y-3">
              <Label>Common Claims</Label>
              <div className="grid gap-2">
                {actions.getClaims().map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg"
                  >
                    <div>
                      <code className="text-sm text-primary">{key}</code>
                      <p className="text-sm text-foreground/70 mt-1">
                        {typeof value === "number" && (key === "exp" || key === "iat" || key === "nbf")
                          ? new Date(value * 1000).toLocaleString()
                          : String(value)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => actions.handleCopy(String(value), key)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Header & Payload Tabs */}
          <Tabs defaultValue="header" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="header">Header</TabsTrigger>
              <TabsTrigger value="payload">Payload</TabsTrigger>
            </TabsList>

            <TabsContent value="header" className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Header (Editable)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    actions.handleCopy(state.editedHeader, "Header")
                  }
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={state.editedHeader}
                onChange={(e) => setters.setEditedHeader(e.target.value)}
                className="code-editor min-h-[200px] font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="payload" className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Payload (Editable)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    actions.handleCopy(state.editedPayload, "Payload")
                  }
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={state.editedPayload}
                onChange={(e) => setters.setEditedPayload(e.target.value)}
                className="code-editor min-h-[200px] font-mono text-sm"
              />
            </TabsContent>
          </Tabs>

          {/* Generate New JWT */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Generate New JWT</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={state.secret}
                  onChange={(e) => setters.setSecret(e.target.value)}
                  placeholder="Enter secret key (optional for unsigned)..."
                  className="flex-1"
                />
                <Button onClick={actions.generateJWT} variant="default">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
              <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="text-destructive">
                  Warning: Never paste production secrets in a browser tool
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Edit the header and payload above, then click Generate to create a new JWT token. Leave secret empty for unsigned tokens.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
