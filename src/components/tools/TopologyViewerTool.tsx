import { useCallback } from 'react';
import { TopologyViewerStateHandler } from '@/modules/state/TopologyViewerStateHandler';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReactFlow, Background, Controls, MiniMap, Panel, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Upload, Trash2, Network, Undo2, Redo2, Plus, Layout } from 'lucide-react';
import { toPng } from 'html-to-image';

export function TopologyViewerTool() {
  const handler = TopologyViewerStateHandler();
  const { state, setters, actions, helpers } = handler;

  const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges);

  // Sync state with react-flow
  const onConnect = useCallback((connection: any) => {
    setEdges((eds) => addEdge(connection, eds));
    actions.addEdge(connection);
  }, [actions, setEdges]);

  const handleNodeClick = useCallback((_event: any, node: any) => {
    setters.setSelectedNode(node);
  }, [setters]);

  const handleEdgeClick = useCallback((_event: any, edge: any) => {
    setters.setSelectedEdge(edge);
  }, [setters]);

  const handleExportPNG = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    
    try {
      const dataUrl = await toPng(element);
      const link = document.createElement('a');
      link.download = `topology-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  const handleExportSVG = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    
    try {
      const svgString = new XMLSerializer().serializeToString(element);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `topology-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting SVG:', error);
    }
  };

  // Custom node renderer
  const nodeTypes = {
    default: ({ data }: any) => {
      const icon = helpers.getNodeIcon(data.nodeType || 'default');
      const color = helpers.getNodeColor(data.nodeType || 'default');
      
      return (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: `2px solid ${color}`,
            backgroundColor: 'white',
            minWidth: '150px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: data.fields?.length > 0 ? '8px' : '0' }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a', flex: 1 }}>
              {data.label}
            </div>
          </div>
          {data.fields && data.fields.length > 0 && !data.collapsed && (
            <div style={{ fontSize: '11px', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${color}30` }}>
              {data.fields.map((field: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  {field.pk && <span style={{ fontSize: '14px' }}>🔑</span>}
                  {field.fk && <span style={{ fontSize: '14px' }}>🔗</span>}
                  <span style={{ fontWeight: field.pk ? 'bold' : 'normal', color: '#4a4a4a' }}>
                    {field.name}: <span style={{ color: '#666' }}>{field.type}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  };

  return (
    <div className="flex flex-col gap-4 p-4 min-h-[70vh]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Topology Viewer</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.loadSampleTopology('network')}>
            Sample Network
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.loadSampleTopology('database')}>
            Sample DB
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.loadSampleTopology('service')}>
            Sample Service
          </Button>
          <Button variant="outline" size="sm" onClick={actions.handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="data">Data Input</TabsTrigger>
          <TabsTrigger value="viewer">Topology Viewer</TabsTrigger>
          <TabsTrigger value="inspector">Inspector</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <Label>Upload JSON</Label>
              <Input
                type="file"
                accept=".json"
                onChange={actions.handleFileUpload}
                className="mt-2"
              />
              {state.fileName && (
                <p className="text-sm text-muted-foreground mt-2">Loaded: {state.fileName}</p>
              )}
            </Card>

            <Card className="p-4">
              <Label>Paste JSON</Label>
              <Textarea
                value={state.rawInput}
                onChange={(e) => setters.setRawInput(e.target.value)}
                placeholder="Paste topology JSON..."
                className="mt-2 h-20 font-mono text-xs"
              />
              <Button onClick={actions.handlePasteData} className="mt-2" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Load Topology
              </Button>
            </Card>
          </div>

          {state.nodes.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Topology Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nodes:</span>
                  <span className="ml-2 font-medium">{state.nodes.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Edges:</span>
                  <span className="ml-2 font-medium">{state.edges.length}</span>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="viewer" className="flex-1 flex flex-col">
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={actions.undo}
              disabled={!state.canUndo}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={actions.redo}
              disabled={!state.canRedo}
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            <div className="ml-2">
              <Select value={state.layoutType} onValueChange={(v: any) => actions.applyLayout(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dagre">Hierarchical</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                  <SelectItem value="force">Force</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => actions.applyLayout(state.layoutType)}
            >
              <Layout className="w-4 h-4 mr-2" />
              Auto Layout
            </Button>

            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportPNG}>
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportSVG}>
                <Download className="w-4 h-4 mr-2" />
                SVG
              </Button>
              <Button size="sm" variant="outline" onClick={actions.exportJSON}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          <div className="border rounded-lg h-[70vh] min-h-[400px]">
            <ReactFlow style={{ width: '100%', height: '100%' }}
              nodes={state.nodes}
              edges={state.edges}
              onNodesChange={(changes) => {
                onNodesChange(changes);
                const updatedNodes = changes.reduce((acc, change: any) => {
                  if (change.type === 'position' && change.position) {
                    return acc.map(n => 
                      n.id === change.id 
                        ? { ...n, position: change.position }
                        : n
                    );
                  }
                  return acc;
                }, state.nodes);
                setters.setNodes(updatedNodes);
              }}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
              <Panel position="top-left">
                <Card className="p-2">
                  <div className="text-xs space-y-1">
                    <div>🔀 Router | 🔁 Switch</div>
                    <div>🗄️ Database | ⚙️ Service</div>
                    <div>📊 Entity</div>
                  </div>
                </Card>
              </Panel>
            </ReactFlow>
          </div>
        </TabsContent>

        <TabsContent value="inspector" className="flex-1 overflow-auto">
          {state.selectedNode && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Node Inspector: {state.selectedNode.data.label}</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={state.selectedNode.data.label}
                    onChange={(e) => 
                      actions.updateNode(state.selectedNode!.id, { label: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Node Type</Label>
                  <Select
                    value={state.selectedNode.data.nodeType}
                    onValueChange={(v) => 
                      actions.updateNode(state.selectedNode!.id, { nodeType: v as any })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="switch">Switch</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="entity">Entity</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {state.selectedNode.data.fields && state.selectedNode.data.fields.length > 0 && (
                  <div>
                    <Label>Entity Fields</Label>
                    <div className="mt-2 space-y-2">
                      {state.selectedNode.data.fields.map((field, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded">
                          <div className="flex gap-2">
                            {field.pk && <span className="text-orange-500">🔑</span>}
                            {field.fk && <span className="text-blue-500">🔗</span>}
                            <span className="font-medium">{field.name}</span>
                            <span className="text-muted-foreground">: {field.type}</span>
                          </div>
                          {field.fk && (
                            <div className="text-xs text-muted-foreground mt-1">
                              FK → {field.fk}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={() => actions.deleteNode(state.selectedNode!.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Node
                </Button>
              </div>
            </Card>
          )}

          {state.selectedEdge && (
            <Card className="p-4 mt-4">
              <h3 className="font-semibold mb-4">Edge Inspector</h3>
              
              <div className="space-y-4">
                <div className="text-sm">
                  <div className="text-muted-foreground">From:</div>
                  <div className="font-medium">{state.selectedEdge.source}</div>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground">To:</div>
                  <div className="font-medium">{state.selectedEdge.target}</div>
                </div>

                {state.selectedEdge.label && (
                  <div className="text-sm">
                    <div className="text-muted-foreground">Label:</div>
                    <div className="font-medium">{state.selectedEdge.label}</div>
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={() => actions.deleteEdge(state.selectedEdge!.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Edge
                </Button>
              </div>
            </Card>
          )}

          {!state.selectedNode && !state.selectedEdge && (
            <Card className="p-4">
              <p className="text-muted-foreground text-center">
                Select a node or edge to inspect
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
