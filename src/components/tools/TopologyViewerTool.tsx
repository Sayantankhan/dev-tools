import { useState, useCallback, useRef, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Undo2, Redo2, Grid3x3, Maximize2, Save, Trash2 } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { toast } from 'sonner';
import { SymbolPalette, SymbolType, getSymbolConfig } from '@/components/topology/SymbolPalette';
import { TopologyNode, TopologyNodeData } from '@/components/topology/TopologyNode';
import { InspectorPanel } from '@/components/topology/InspectorPanel';

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

export function TopologyViewerTool() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [rawInput, setRawInput] = useState('');
  
  const nodeTypes = { topology: TopologyNode };

  // Save to history
  const saveToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Drag & drop from palette
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as SymbolType;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const config = getSymbolConfig(type);
      const newNode: Node = {
        id: getId(),
        type: 'topology',
        position,
        data: {
          label: `${config.label} ${nodeId}`,
          symbolType: type,
          metadata: {},
        },
      };

      setNodes((nds) => {
        const updated = nds.concat(newNode);
        saveToHistory(updated, edges);
        return updated;
      });
      
      toast.success(`Added ${config.label}`);
    },
    [reactFlowInstance, edges, setNodes, saveToHistory]
  );

  // Connect nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdge = {
          ...connection,
          id: `edge_${Date.now()}`,
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { edgeType: 'directed' },
        };
        const updated = addEdge(newEdge, eds);
        saveToHistory(nodes, updated);
        return updated;
      });
    },
    [nodes, setEdges, saveToHistory]
  );

  // Export functions
  const exportPNG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;
    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: '#ffffff',
        filter: (node) => !node.classList?.contains('react-flow__controls'),
      });
      const link = document.createElement('a');
      link.download = `topology-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Exported as PNG');
    } catch (error) {
      toast.error('Failed to export PNG');
    }
  }, []);

  const exportSVG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;
    try {
      const svgData = await toSvg(reactFlowWrapper.current, {
        backgroundColor: '#ffffff',
        filter: (node) => !node.classList?.contains('react-flow__controls'),
      });
      const link = document.createElement('a');
      link.download = `topology-${Date.now()}.svg`;
      link.href = svgData;
      link.click();
      toast.success('Exported as SVG');
    } catch (error) {
      toast.error('Failed to export SVG');
    }
  }, []);

  const exportJSON = useCallback(() => {
    const data = {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        type: n.data.symbolType,
        metadata: n.data.metadata,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        from: e.source,
        to: e.target,
        label: e.label,
        type: e.data?.edgeType,
        weight: e.data?.weight,
      })),
      metadata: {
        author: 'Topology Editor',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `topology-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported topology JSON');
  }, [nodes, edges]);

  // Import JSON
  const importJSON = useCallback(async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('Invalid topology: nodes array required');
      }

      const importedNodes: Node[] = data.nodes.map((node: any) => ({
        id: node.id || getId(),
        type: 'topology',
        position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
        data: {
          label: node.label || node.name || node.id,
          symbolType: (node.type || 'custom') as SymbolType,
          metadata: node.metadata || {},
        },
      }));

      const importedEdges: Edge[] = (data.edges || []).map((edge: any) => ({
        id: edge.id || `edge_${Date.now()}_${Math.random()}`,
        source: edge.from || edge.source,
        target: edge.to || edge.target,
        label: edge.label,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          edgeType: edge.type || 'directed',
          weight: edge.weight,
        },
      }));

      setNodes(importedNodes);
      setEdges(importedEdges);
      setHistory([{ nodes: importedNodes, edges: importedEdges }]);
      setHistoryIndex(0);

      toast.success(`Loaded ${importedNodes.length} nodes and ${importedEdges.length} edges`);
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    }
  }, [setNodes, setEdges]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    importJSON(text);
  }, [importJSON]);

  // Load sample topologies
  const loadSample = useCallback((type: 'network' | 'cloud-3tier' | 'k8s') => {
    const samples = {
      network: {
        nodes: [
          { id: 'fw1', label: 'Firewall', type: 'firewall', position: { x: 250, y: 0 } },
          { id: 'lb1', label: 'Load Balancer', type: 'lb-l7', position: { x: 250, y: 120 } },
          { id: 'app1', label: 'App Server 1', type: 'compute', position: { x: 100, y: 250 } },
          { id: 'app2', label: 'App Server 2', type: 'compute', position: { x: 400, y: 250 } },
          { id: 'cache1', label: 'Redis Cache', type: 'cache', position: { x: 250, y: 380 } },
          { id: 'db1', label: 'PostgreSQL', type: 'postgres', position: { x: 250, y: 510 } },
        ],
        edges: [
          { from: 'fw1', to: 'lb1', label: 'HTTPS' },
          { from: 'lb1', to: 'app1' },
          { from: 'lb1', to: 'app2' },
          { from: 'app1', to: 'cache1' },
          { from: 'app2', to: 'cache1' },
          { from: 'app1', to: 'db1' },
          { from: 'app2', to: 'db1' },
        ],
      },
      'cloud-3tier': {
        nodes: [
          { id: 'gcp1', label: 'GCP Region', type: 'gcp-vpc', position: { x: 250, y: 0 } },
          { id: 'lb1', label: 'Cloud LB', type: 'aws-elb', position: { x: 250, y: 120 } },
          { id: 'web1', label: 'Web Tier', type: 'aws-ec2', position: { x: 100, y: 250 } },
          { id: 'web2', label: 'Web Tier', type: 'aws-ec2', position: { x: 400, y: 250 } },
          { id: 'app1', label: 'App Tier', type: 'compute', position: { x: 100, y: 380 } },
          { id: 'app2', label: 'App Tier', type: 'compute', position: { x: 400, y: 380 } },
          { id: 'db1', label: 'Cloud SQL', type: 'mysql', position: { x: 250, y: 510 } },
        ],
        edges: [
          { from: 'gcp1', to: 'lb1' },
          { from: 'lb1', to: 'web1' },
          { from: 'lb1', to: 'web2' },
          { from: 'web1', to: 'app1' },
          { from: 'web2', to: 'app2' },
          { from: 'app1', to: 'db1' },
          { from: 'app2', to: 'db1' },
        ],
      },
      k8s: {
        nodes: [
          { id: 'k8s1', label: 'K8s Cluster', type: 'kubernetes', position: { x: 250, y: 0 } },
          { id: 'ing1', label: 'Ingress', type: 'lb-l7', position: { x: 250, y: 120 } },
          { id: 'svc1', label: 'Frontend Service', type: 'compute', position: { x: 100, y: 250 } },
          { id: 'svc2', label: 'API Service', type: 'compute', position: { x: 400, y: 250 } },
          { id: 'cache1', label: 'Redis', type: 'cache', position: { x: 250, y: 380 } },
          { id: 'mq1', label: 'RabbitMQ', type: 'message-queue', position: { x: 100, y: 510 } },
          { id: 'db1', label: 'PostgreSQL', type: 'postgres', position: { x: 400, y: 510 } },
        ],
        edges: [
          { from: 'k8s1', to: 'ing1' },
          { from: 'ing1', to: 'svc1' },
          { from: 'ing1', to: 'svc2' },
          { from: 'svc1', to: 'cache1' },
          { from: 'svc2', to: 'cache1' },
          { from: 'svc2', to: 'mq1' },
          { from: 'svc2', to: 'db1' },
        ],
      },
    };

    importJSON(JSON.stringify(samples[type], null, 2));
  }, [importJSON]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (confirm('Clear the entire topology?')) {
      setNodes([]);
      setEdges([]);
      setHistory([]);
      setHistoryIndex(-1);
      toast.success('Canvas cleared');
    }
  }, [setNodes, setEdges]);

  // Fit view
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`flex gap-4 p-4 transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-120px)]'}`}>
      {/* Left Palette */}
      {!isFullscreen && (
        <div className="w-64 flex-shrink-0">
          <SymbolPalette onSymbolDragStart={() => {}} />
        </div>
      )}

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col gap-4">
        <Tabs defaultValue="editor" className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="import">Import/Export</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSnapToGrid(!snapToGrid)}>
                <Grid3x3 className="w-4 h-4 mr-2" />
                Snap: {snapToGrid ? 'On' : 'Off'}
              </Button>
              <Button size="sm" variant="outline" onClick={fitView}>
                <Maximize2 className="w-4 h-4 mr-2" />
                Fit
              </Button>
              <Button size="sm" variant="outline" onClick={clearCanvas}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsFullscreen(!isFullscreen)}>
                <Maximize2 className="w-4 h-4 mr-2" />
                {isFullscreen ? 'Exit' : 'Expand'}
              </Button>
            </div>
          </div>

          <TabsContent value="editor" className="flex-1 border rounded-lg overflow-hidden mt-4">
            <div ref={reactFlowWrapper} className="w-full h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(changes) => {
                  onNodesChange(changes);
                  if (changes.some((c: any) => c.type === 'position' && c.dragging === false)) {
                    saveToHistory(nodes, edges);
                  }
                }}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                snapToGrid={snapToGrid}
                snapGrid={[15, 15]}
                fitView
                attributionPosition="bottom-right"
              >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={exportPNG}>
                      <Download className="w-3 h-3 mr-2" />
                      PNG
                    </Button>
                    <Button size="sm" variant="secondary" onClick={exportSVG}>
                      <Download className="w-3 h-3 mr-2" />
                      SVG
                    </Button>
                    <Button size="sm" variant="secondary" onClick={exportJSON}>
                      <Download className="w-3 h-3 mr-2" />
                      JSON
                    </Button>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </TabsContent>

          <TabsContent value="import" className="flex-1 overflow-auto mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <Label>Upload JSON File</Label>
                <Input type="file" accept=".json" onChange={handleFileUpload} className="mt-2" />
              </Card>

              <Card className="p-4">
                <Label>Paste JSON</Label>
                <Textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Paste topology JSON..."
                  className="mt-2 h-20 font-mono text-xs"
                />
                <Button onClick={() => importJSON(rawInput)} className="mt-2" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Load
                </Button>
              </Card>

              <Card className="p-4 col-span-2">
                <Label>Sample Topologies</Label>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => loadSample('network')}>
                    Network
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadSample('cloud-3tier')}>
                    Cloud 3-Tier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadSample('k8s')}>
                    Kubernetes
                  </Button>
                </div>
              </Card>

              <Card className="p-4 col-span-2">
                <Label>Stats</Label>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nodes:</span>
                    <span className="ml-2 font-medium">{nodes.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Edges:</span>
                    <span className="ml-2 font-medium">{edges.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">History:</span>
                    <span className="ml-2 font-medium">{historyIndex + 1}/{history.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Inspector */}
      {!isFullscreen && (
        <div className="w-80 flex-shrink-0">
          <InspectorPanel
          selectedNodes={nodes.filter((n) => n.selected)}
          selectedEdges={edges.filter((e) => e.selected)}
          onUpdateNode={(id, data) => {
            setNodes((nds) => {
              const updated = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
              saveToHistory(updated, edges);
              return updated;
            });
          }}
          onUpdateEdge={(id, data) => {
            setEdges((eds) => {
              const updated = eds.map((e) => (e.id === id ? { ...e, data, label: data.label } : e));
              saveToHistory(nodes, updated);
              return updated;
            });
          }}
          onDeleteNode={(id) => {
            setNodes((nds) => {
              const updated = nds.filter((n) => n.id !== id);
              const updatedEdges = edges.filter((e) => e.source !== id && e.target !== id);
              setEdges(updatedEdges);
              saveToHistory(updated, updatedEdges);
              return updated;
            });
          }}
          onDeleteEdge={(id) => {
            setEdges((eds) => {
              const updated = eds.filter((e) => e.id !== id);
              saveToHistory(nodes, updated);
              return updated;
            });
          }}
          onDuplicateNode={(id) => {
            const node = nodes.find((n) => n.id === id);
            if (node) {
              const newNode = {
                ...node,
                id: getId(),
                position: { x: node.position.x + 50, y: node.position.y + 50 },
                data: { ...node.data, label: `${node.data.label} (copy)` },
              };
              setNodes((nds) => {
                const updated = nds.concat(newNode);
                saveToHistory(updated, edges);
                return updated;
              });
              toast.success('Node duplicated');
            }
          }}
          onAddMetadata={(id, key, value) => {
            setNodes((nds) => {
              const updated = nds.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, metadata: { ...n.data.metadata, [key]: value } } } : n
              );
              saveToHistory(updated, edges);
              return updated;
            });
          }}
          onRemoveMetadata={(id, key) => {
            setNodes((nds) => {
              const updated = nds.map((n) => {
                if (n.id === id) {
                  const { [key]: _, ...rest } = n.data.metadata || {};
                  return { ...n, data: { ...n.data, metadata: rest } };
                }
                return n;
              });
              saveToHistory(updated, edges);
              return updated;
            });
          }}
        />
        </div>
      )}
    </div>
  );
}