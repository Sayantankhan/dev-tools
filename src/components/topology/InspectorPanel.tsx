import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Copy } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { SymbolType, allSymbols } from './SymbolPalette';
import { TopologyNodeData } from './TopologyNode';

interface InspectorPanelProps {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onUpdateNode: (nodeId: string, data: Partial<TopologyNodeData>) => void;
  onUpdateEdge: (edgeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onAddMetadata: (nodeId: string, key: string, value: string) => void;
  onRemoveMetadata: (nodeId: string, key: string) => void;
}

export function InspectorPanel({
  selectedNodes,
  selectedEdges,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onDuplicateNode,
  onAddMetadata,
  onRemoveMetadata,
}: InspectorPanelProps) {
  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-muted-foreground">Select a node or edge to inspect</p>
          <p className="text-xs text-muted-foreground mt-2">Click on elements or use drag selection</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Inspector</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedNodes.length > 0 && `${selectedNodes.length} node(s) selected`}
          {selectedEdges.length > 0 && `${selectedEdges.length} edge(s) selected`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Node Inspector */}
          {selectedNodes.length === 1 && (
            <NodeInspector
              node={selectedNodes[0]}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onDuplicateNode={onDuplicateNode}
              onAddMetadata={onAddMetadata}
              onRemoveMetadata={onRemoveMetadata}
            />
          )}

          {/* Multi-node selection */}
          {selectedNodes.length > 1 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Multiple nodes selected. Individual editing not available.
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">Align Left</Button>
                <Button size="sm" variant="outline" className="flex-1">Align Center</Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">Distribute H</Button>
                <Button size="sm" variant="outline" className="flex-1">Distribute V</Button>
              </div>
            </div>
          )}

          {/* Edge Inspector */}
          {selectedEdges.length === 1 && (
            <EdgeInspector
              edge={selectedEdges[0]}
              onUpdateEdge={onUpdateEdge}
              onDeleteEdge={onDeleteEdge}
            />
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

function NodeInspector({
  node,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onAddMetadata,
  onRemoveMetadata,
}: {
  node: Node;
  onUpdateNode: (nodeId: string, data: Partial<TopologyNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onAddMetadata: (nodeId: string, key: string, value: string) => void;
  onRemoveMetadata: (nodeId: string, key: string) => void;
}) {
  const nodeData = node.data as TopologyNodeData;
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label">Node Name</Label>
        <Input
          id="node-label"
          value={nodeData.label}
          onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          className="mt-2"
          placeholder="Enter node name"
        />
      </div>

      <div>
        <Label>Node Type</Label>
        {((nodeData.metadata as any)?.allowTypeEdit === true) ? (
          <Select
            value={nodeData.symbolType}
            onValueChange={(v) =>
              onUpdateNode(node.id, { 
                symbolType: v as SymbolType,
                metadata: { ...(nodeData.metadata || {}), allowTypeEdit: true }
              })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allSymbols.map((s) => (
                <SelectItem key={s.type} value={s.type}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={nodeData.symbolType} disabled>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={nodeData.symbolType}>{nodeData.symbolType}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <Label>Metadata</Label>
        <div className="mt-2 space-y-2">
          {nodeData.metadata && Object.entries(nodeData.metadata).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <Input value={key} disabled className="flex-1 text-xs" />
              <Input
                value={String(value)}
                onChange={(e) => {
                  const newMetadata = { ...nodeData.metadata, [key]: e.target.value };
                  onUpdateNode(node.id, { metadata: newMetadata });
                }}
                className="flex-1 text-xs"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemoveMetadata(node.id, key)}
                className="h-9 w-9"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const key = prompt('Enter metadata key:');
              if (key) onAddMetadata(node.id, key, '');
            }}
            className="w-full"
          >
            <Plus className="w-3 h-3 mr-2" />
            Add Metadata
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDuplicateNode(node.id)}
          className="flex-1"
        >
          <Copy className="w-3 h-3 mr-2" />
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDeleteNode(node.id)}
          className="flex-1"
        >
          <Trash2 className="w-3 h-3 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function EdgeInspector({
  edge,
  onUpdateEdge,
  onDeleteEdge,
}: {
  edge: Edge;
  onUpdateEdge: (edgeId: string, data: any) => void;
  onDeleteEdge: (edgeId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Connection</Label>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">{edge.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">{edge.target}</span>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="edge-label">Edge Label</Label>
        <Input
          id="edge-label"
          value={(edge.label as string) || ''}
          onChange={(e) => onUpdateEdge(edge.id, { ...edge.data, label: e.target.value })}
          className="mt-2"
          placeholder="e.g., 1 Gbps, REST API"
        />
      </div>

      <div>
        <Label>Edge Type</Label>
        <Select
          value={String(edge.data?.edgeType || 'directed')}
          onValueChange={(v) => onUpdateEdge(edge.id, { ...edge.data, edgeType: v })}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="directed">Directed</SelectItem>
            <SelectItem value="undirected">Undirected</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="edge-weight">Weight / Bandwidth</Label>
        <Input
          id="edge-weight"
          value={String(edge.data?.weight || '')}
          onChange={(e) => onUpdateEdge(edge.id, { ...edge.data, weight: e.target.value })}
          className="mt-2"
          placeholder="Optional"
        />
      </div>

      <Button
        size="sm"
        variant="destructive"
        onClick={() => onDeleteEdge(edge.id)}
        className="w-full"
      >
        <Trash2 className="w-3 h-3 mr-2" />
        Delete Edge
      </Button>
    </div>
  );
}