import { useState, useCallback, useRef, useEffect, DragEvent, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  MarkerType,
  ConnectionMode,
  PanOnScrollMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Undo2, Redo2, Grid3x3, Maximize2, Save, Trash2, Image, Expand, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { SymbolPalette, SymbolType, getSymbolConfig } from '@/components/topology/SymbolPalette';
import { TopologyNode, TopologyNodeData } from '@/components/topology/TopologyNode';
import { ContainerNode, ContainerNodeData } from '@/components/topology/ContainerNode';
import { InspectorPanel } from '@/components/topology/InspectorPanel';

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

export function TopologyViewerTool() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const onNodesChange = useCallback(
    (changes: any) => {
      // First, let React Flow apply the changes correctly
      rfOnNodesChange(changes);

      // Then, if a locked container is being dragged, move its children by the delta
      setNodes((nds) => {
        const changeById = new Map<string, any>(changes.map((c: any) => [c.id, c]));
        const lockedMoves = nds
          .map((n) => ({ n, ch: changeById.get(n.id) }))
          .filter(({ n, ch }) => ch?.type === 'position' && ch.dragging && n.type === 'container' && (n.data as ContainerNodeData).locked)
          .map(({ n, ch }) => ({
            containerId: n.id,
            deltaX: (ch.position?.x ?? n.position.x) - n.position.x,
            deltaY: (ch.position?.y ?? n.position.y) - n.position.y,
            children: ((n.data as ContainerNodeData).contains || []).slice(),
          }));

        if (!lockedMoves.length) return nds;

        const updated = nds.map((node) => {
          const move = lockedMoves.find((m) => m.children.includes(node.id));
          if (!move) return node;
          const original = nds.find((x) => x.id === node.id) || node;
          return { ...node, position: { x: original.position.x + move.deltaX, y: original.position.y + move.deltaY } };
        });
        return updated;
      });
    },
    [rfOnNodesChange, setNodes]
  );
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [copiedEdges, setCopiedEdges] = useState<Edge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const connectStartRef = useRef<{ nodeId?: string; handleType?: 'source' | 'target' }>({});
  
  const nodeTypes = { topology: TopologyNode, container: ContainerNode };

  // Apply edge styles dynamically with proper z-index for visibility
  const styledEdges = useMemo(() => 
    edges.map((edge) => ({
      ...edge,
      style: {
        strokeWidth: 2,
        stroke: edge.selected ? 'hsl(var(--primary))' : (edge.data?.color || '#64748b'),
        strokeDasharray: edge.data?.lineStyle === 'dotted' ? '5,5' : undefined,
      },
      zIndex: 1000, // Ensure edges render above nodes
      label: edge.data?.label || edge.label,
      labelStyle: { fill: 'hsl(var(--foreground))', fontWeight: 500, fontSize: 12 },
      labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.8 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: edge.data?.edgeType === 'undirected' ? undefined : { 
        type: MarkerType.ArrowClosed, 
        color: edge.selected ? 'hsl(var(--primary))' : (edge.data?.color || '#64748b') 
      },
    }))
  , [edges]);

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

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          e.preventDefault();
          setCopiedNodes(selectedNodes);
          
          // Copy edges between selected nodes
          const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
          const relevantEdges = edges.filter(
            e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
          );
          setCopiedEdges(relevantEdges);
          toast.success(`Copied ${selectedNodes.length} node(s)`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedNodes.length > 0) {
          e.preventDefault();
          
          // Calculate proper offset based on node sizes (like duplicate)
          let maxWidth = 0;
          copiedNodes.forEach(node => {
            const width = (node.style?.width as number) || node.width || (node.type === 'container' ? 400 : 160);
            maxWidth = Math.max(maxWidth, width);
          });
          
          const horizontalOffset = maxWidth + 50; // Largest width + spacing
          const verticalOffset = 0; // Keep same Y for side-by-side placement
          
          // Create ID mapping for duplicated nodes
          const idMap = new Map<string, string>();
          const newNodes = copiedNodes.map(node => {
            const newId = getId();
            idMap.set(node.id, newId);
            return {
              ...node,
              id: newId,
              position: { x: node.position.x + horizontalOffset, y: node.position.y + verticalOffset },
              selected: true,
            };
          });

          // Duplicate edges with updated IDs
          const newEdges = copiedEdges.map(edge => ({
            ...edge,
            id: `edge_${Date.now()}_${Math.random()}`,
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target,
          }));

          setNodes(prev => [...prev.map(n => ({ ...n, selected: false })), ...newNodes]);
          setEdges(prev => [...prev, ...newEdges]);
          saveToHistory([...nodes, ...newNodes], [...edges, ...newEdges]);
          toast.success(`Pasted ${newNodes.length} node(s)`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, copiedNodes, copiedEdges, setNodes, setEdges, saveToHistory]);

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

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const config = getSymbolConfig(type);
      const isContainer = type.startsWith('container-');
      
      const newNode: Node = {
        id: getId(),
        type: isContainer ? 'container' : 'topology',
        position,
        data: {
          label: `${config.label} ${nodeId}`,
          symbolType: type,
          metadata: { allowTypeEdit: type === 'custom' },
          ...(isContainer && { 
            contains: [],
            style: { width: 400, height: 300 }
          }),
        },
        ...(isContainer 
          ? { style: { width: 400, height: 300 } }
          : { style: { width: 160, height: 60 } }
        ),
      };

      setNodes((nds) => {
        let updated = nds.concat(newNode);
        
        // Check if new node was dropped inside a container
        if (!isContainer) {
          const containerNodes = updated.filter((n) => n.type === 'container');
          
          // DEBUG: Log bounds for all containers vs new node
          try {
            const nodeW = (newNode.style?.width as number) || newNode.width || 160;
            const nodeH = (newNode.style?.height as number) || newNode.height || 60;
            const cx = newNode.position.x + nodeW / 2;
            const cy = newNode.position.y + nodeH / 2;
            console.groupCollapsed('[DROP NEW] Container bounds vs node center', { newNodeId: newNode.id });
            console.log('Node position', newNode.position, 'size', { w: nodeW, h: nodeH }, 'center', { cx, cy });
            containerNodes.forEach((container) => {
              const w = container.measured?.width || (container.style?.width as number) || container.width || 400;
              const h = container.measured?.height || (container.style?.height as number) || container.height || 300;
              const left = container.position.x, top = container.position.y, right = left + w, bottom = top + h;
              const inside = cx >= left && cx <= right && cy >= top && cy <= bottom;
              console.table({ containerId: container.id, left, top, right, bottom, inside });
            });
            console.groupEnd();
          } catch {}
          
          for (const container of containerNodes) {
            const containerWidth = container.measured?.width || (container.style?.width as number) || container.width || 400;
            const containerHeight = container.measured?.height || (container.style?.height as number) || container.height || 300;
            
            const containerBounds = {
              left: container.position.x,
              right: container.position.x + containerWidth,
              top: container.position.y,
              bottom: container.position.y + containerHeight,
            };
            
            // Use node center for better drop detection
            const nodeCenterX = newNode.position.x + (newNode.style?.width as number || 80) / 2;
            const nodeCenterY = newNode.position.y + (newNode.style?.height as number || 30) / 2;
            
            if (
              nodeCenterX >= containerBounds.left &&
              nodeCenterX <= containerBounds.right &&
              nodeCenterY >= containerBounds.top &&
              nodeCenterY <= containerBounds.bottom
            ) {
              // Calculate relative position to parent
              const relativePosition = {
                x: newNode.position.x - container.position.x,
                y: newNode.position.y - container.position.y,
              };
              console.log('[DROP NEW] attach', { nodeId: newNode.id, to: container.id, relativePosition });
              
              // Update the new node to be a child of this container (no extent on first attach)
              updated = updated.map((n) =>
                n.id === newNode.id
                  ? { 
                      ...n,
                      position: relativePosition,
                      parentNode: container.id,
                    }
                  : n
              );
              
              // Add to container's contains array
              const cData = container.data as ContainerNodeData;
              const newContains = [...(cData.contains || []), newNode.id];
              updated = updated.map((n) =>
                n.id === container.id
                  ? { ...n, data: { ...n.data, contains: newContains } }
                  : n
              );
              
              break; // Only add to first matching container
            }
          }
        }
        
        saveToHistory(updated, edges);
        return updated;
      });
      
      toast.success(`Added ${config.label}`);
    },
    [reactFlowInstance, edges, setNodes, saveToHistory]
  );

  // Update edge styling
  const updateEdgeStyle = useCallback((edgeId: string, updates: any) => {
    setEdges((eds) => {
      const updated = eds.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: { ...edge.data, ...updates },
              label: updates.label !== undefined ? updates.label : edge.label,
            }
          : edge
      );
      saveToHistory(nodes, updated);
      return updated;
    });
  }, [nodes, setEdges, saveToHistory]);

  // Connect nodes with edge reconnection support
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const uniqueId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      
      const newEdge: Edge = {
        ...connection,
        id: `edge-${uniqueId}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, zIndex: 1000 },
        data: { color: '#64748b', lineStyle: 'solid' },
      };
      setEdges((eds) => {
        // avoid accidental duplicates by id
        const exists = eds.some((e) => e.id === newEdge.id);
        const next = exists ? eds : addEdge(newEdge, eds);
        saveToHistory(nodes, next);
        return next;
      });
      toast.success('Connection created');
    },
    [nodes, setEdges, saveToHistory]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => {
        const updated = els.map((edge) =>
          edge.id === oldEdge.id
            ? { ...edge, source: newConnection.source!, target: newConnection.target!, sourceHandle: newConnection.sourceHandle, targetHandle: newConnection.targetHandle }
            : edge
        );
        saveToHistory(nodes, updated);
        return updated;
      });
      toast.success('Connection updated');
    },
    [nodes, setEdges, saveToHistory]
  );

  // Export function
  const exportJSON = useCallback(() => {
    const data = {
      nodes: nodes.map((n) => {
        const { allowTypeEdit, ...userMetadata } = n.data.metadata || {};
        return {
          id: n.id,
          label: n.data.label,
          type: n.data.symbolType,
          metadata: userMetadata,
          position: n.position,
        };
      }),
      edges: edges.map((e) => ({
        id: e.id,
        from: e.source,
        to: e.target,
        label: e.label,
        type: e.data?.edgeType,
        weight: e.data?.weight,
        lineStyle: e.data?.lineStyle,
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

  // Export as JPG using html-to-image (better SVG support)
  const exportAsJPG = useCallback(() => {
    if (!reactFlowInstance) {
      toast.error('Canvas not ready');
      return;
    }
    
    toast.info('Generating image...');
    
    // Fit view to ensure all nodes are visible
    reactFlowInstance.fitView({ padding: 0.2 });
    
    // Wait for fitView to complete, then capture
    setTimeout(() => {
      import('html-to-image').then(({ toJpeg }) => {
        const reactFlowElement = reactFlowWrapper.current?.querySelector('.react-flow__viewport') as HTMLElement;
        if (!reactFlowElement) {
          toast.error('Canvas not found');
          return;
        }
        
        toJpeg(reactFlowElement, {
          backgroundColor: '#0f1419',
          quality: 0.95,
          pixelRatio: 2,
        })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `topology-${Date.now()}.jpg`;
          link.href = dataUrl;
          link.click();
          toast.success('Exported as JPG');
        })
        .catch((error) => {
          console.error('Export error:', error);
          toast.error('Export failed - try again');
        });
      }).catch(() => {
        toast.error('Failed to load export library');
      });
    }, 300);
  }, [reactFlowInstance]);

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
          metadata: { ...(node.metadata || {}), allowTypeEdit: (node.type === 'custom') || (node.metadata?.allowTypeEdit === true) },
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
          lineStyle: edge.lineStyle || 'solid',
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

  // Fullscreen API implementation
  const toggleFullscreen = useCallback(async () => {
    if (!fullscreenContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await fullscreenContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Failed to toggle fullscreen');
    }
  }, []);

  // Listen for fullscreen changes (handles ESC key automatically)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // Trigger resize and fit view when entering/exiting fullscreen
      setTimeout(() => {
        try {
          window.dispatchEvent(new Event('resize'));
          if (reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.1, duration: 200 });
          }
        } catch {}
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [reactFlowInstance]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

  return (
    <div 
      ref={fullscreenContainerRef}
      className={`flex gap-4 p-4 transition-all ${isFullscreen ? 'h-screen w-screen bg-background' : 'h-[calc(100vh-120px)]'} min-h-0 relative`}
    >
      {/* Left Palette */}
      <div className={`flex-shrink-0 h-full ${isFullscreen ? 'w-64' : 'w-48'}`}>
        <SymbolPalette onSymbolDragStart={() => {}} />
      </div>

      {/* Center Canvas */}
      <div className="flex-1 min-h-0 flex flex-col gap-4" style={{ width: '85%' }}>
        <Tabs defaultValue="editor" className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="import">Import/Export</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleFullscreen}
                className={isFullscreen ? 'bg-primary/10' : ''}
              >
                {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Expand className="w-4 h-4 mr-2" />}
                {isFullscreen ? 'Exit' : 'Expand'}
              </Button>
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
            </div>
          </div>

          <TabsContent value="editor" className="flex-1 min-h-0 border rounded-lg overflow-hidden mt-4">
            <style>{`
              /* React Flow Controls - dark theme contrast fixes */
              .react-flow__controls { 
                background-color: hsl(var(--card)) !important; 
                border: 1px solid hsl(var(--border)) !important; 
                box-shadow: var(--shadow-card);
              }
              .react-flow__controls-button { 
                background-color: hsl(var(--input)) !important; 
                color: hsl(var(--foreground)) !important; 
                border-color: hsl(var(--border)) !important;
              }
              .react-flow__controls-button:hover { 
                background-color: hsl(var(--muted)) !important; 
              }
              .react-flow__controls-button svg,
              .react-flow__controls-button path { 
                fill: currentColor !important; 
                stroke: currentColor !important; 
              }

              /* Ensure VPC containers don't block clicks on inner nodes */
              .react-flow__node-container { z-index: 0 !important; }
              .react-flow__node-topology { z-index: 1 !important; }
              /* Keep resize handles above for usability and connection handles */
              .react-flow__resize-control { z-index: 2002 !important; }
              /* Edges should render above nodes */
              .react-flow__edges { z-index: 1000 !important; }
              .react-flow__edge { z-index: 1000 !important; }
              /* Connection line during dragging */
              .react-flow__connectionline { z-index: 1001 !important; }
            `}</style>
            <div ref={reactFlowWrapper} className="w-full h-full">
              <ReactFlow
                style={{ width: '100%', height: '100%' }}
                nodes={nodes}
                edges={styledEdges}
                panOnScroll
                panOnScrollMode={PanOnScrollMode.Free}
                zoomOnScroll={false}
                zoomOnPinch
              
                onNodesChange={(changes) => {
                  onNodesChange(changes);

                  // Drag end: attach/detach to containers (no extent on first attach)
                  if (changes.some((c: any) => c.type === 'position' && c.dragging === false)) {
                    let newState: Node[] = [];
                    setNodes((current) => {
                      let updated = [...current];
                      const byId = new Map(updated.map((n) => [n.id, n] as const));
                      const containers = updated.filter((n) => n.type === 'container');

                      const getAbs = (n: any) => {
                        if (n.parentNode) {
                          const p = byId.get(n.parentNode);
                          if (p) return { x: n.position.x + p.position.x, y: n.position.y + p.position.y };
                        }
                        return { x: n.position.x, y: n.position.y };
                      };

                      const movedIds = changes.filter((c: any) => c.type === 'position').map((c: any) => c.id);

                      movedIds.forEach((id: string) => {
                        const n = byId.get(id);
                        if (!n || n.type === 'container') return;
                        const abs = getAbs(n);

                        // DEBUG: container bounds vs node position at drop
                        try {
                          const nodeW = (n.style?.width as number) || n.width || 160;
                          const nodeH = (n.style?.height as number) || n.height || 60;
                          const cx = abs.x + nodeW / 2;
                          const cy = abs.y + nodeH / 2;
                          console.groupCollapsed('[DROP] Node->Container check', { nodeId: n.id });
                          console.log('Node abs position', abs, 'size', { w: nodeW, h: nodeH }, 'center', { cx, cy });
                          containers.forEach((c: any) => {
                            const w = c.measured?.width || (c.style?.width as number) || c.width || 400;
                            const h = c.measured?.height || (c.style?.height as number) || c.height || 300;
                            const left = c.position.x, top = c.position.y, right = left + w, bottom = top + h;
                            const inside = cx >= left && cx <= right && cy >= top && cy <= bottom;
                            console.table({ containerId: c.id, left, top, right, bottom, inside });
                          });
                          console.groupEnd();
                        } catch {}

                        const target = containers.find((c: any) => {
                          const w = c.measured?.width || (c.style?.width as number) || c.width || 400;
                          const h = c.measured?.height || (c.style?.height as number) || c.height || 300;
                          const left = c.position.x, top = c.position.y, right = left + w, bottom = top + h;
                          const cx = abs.x + (((n.style?.width as number) || 160) / 2);
                          const cy = abs.y + (((n.style?.height as number) || 60) / 2);
                          return cx >= left && cx <= right && cy >= top && cy <= bottom;
                        });

                        if (target && n.parentNode !== target.id) {
                          const rel = { x: abs.x - target.position.x, y: abs.y - target.position.y };
                          console.log('[DROP] attach', { nodeId: n.id, to: target.id, rel });
                          updated = updated.map((nn) => (nn.id === n.id ? { ...nn, position: rel, parentNode: target.id } : nn));
                        } else if (!target && n.parentNode) {
                          console.log('[DROP] detach', { nodeId: n.id, from: n.parentNode, newAbs: abs });
                          updated = updated.map((nn) => (nn.id === n.id ? { ...nn, position: { x: abs.x, y: abs.y }, parentNode: undefined } : nn));
                        }
                      });

                      // recompute contains arrays
                      const recomputed = updated.map((nn) => {
                        if (nn.type !== 'container') return nn;
                        const contains = updated.filter((x) => x.parentNode === nn.id).map((x) => x.id);
                        const cData = nn.data as any;
                        if (JSON.stringify((cData.contains || []).sort()) !== JSON.stringify(contains.sort())) {
                          return { ...nn, data: { ...nn.data, contains } };
                        }
                        return nn;
                      });

                      newState = recomputed;
                      return recomputed;
                    });
                    if (newState.length) saveToHistory(newState, edges);
                  }

                  // While dragging, set visual hover on containers (no mutations on drop here)
                  if (changes.some((c: any) => c.type === 'position' && c.dragging === true)) {
                    const draggedIds = changes.filter((c: any) => c.type === 'position' && c.dragging).map((c: any) => c.id);
                    setNodes((currentNodes) => {
                      const byId = new Map(currentNodes.map((n) => [n.id, n] as const));
                      const getAbs = (n: any) => {
                        if (n.parentNode) {
                          const p = byId.get(n.parentNode);
                          if (p) return { x: n.position.x + p.position.x, y: n.position.y + p.position.y };
                        }
                        return { x: n.position.x, y: n.position.y };
                      };
                      const draggedNodes = currentNodes.filter((n) => draggedIds.includes(n.id));

                      // DEBUG: live hover bounds check
                      try {
                        draggedNodes.forEach((dn) => {
                          if (dn.type === 'container') return;
                          const abs = getAbs(dn);
                          const nodeW = (dn.style?.width as number) || dn.width || 160;
                          const nodeH = (dn.style?.height as number) || dn.height || 60;
                          const cx = abs.x + nodeW / 2;
                          const cy = abs.y + nodeH / 2;
                          console.groupCollapsed('[DRAG] Hover check for node', dn.id);
                          currentNodes.filter((x) => x.type === 'container').forEach((c: any) => {
                            const w = c.measured?.width || (c.style?.width as number) || c.width || 400;
                            const h = c.measured?.height || (c.style?.height as number) || c.height || 300;
                            const left = c.position.x, top = c.position.y, right = left + w, bottom = top + h;
                            const inside = cx >= left && cx <= right && cy >= top && cy <= bottom;
                            console.table({ containerId: c.id, left, top, right, bottom, nodeCx: cx, nodeCy: cy, inside });
                          });
                          console.groupEnd();
                        });
                      } catch {}

                      return currentNodes.map((node) => {
                        if (node.type !== 'container') return node;
                        const cData = node.data as ContainerNodeData;
                        const w = node.measured?.width || (node.style?.width as number) || node.width || 400;
                        const h = node.measured?.height || (node.style?.height as number) || node.height || 300;
                        const b = { left: node.position.x, right: node.position.x + w, top: node.position.y, bottom: node.position.y + h };
                        const isHovered = draggedNodes.some((dn) => {
                          if (dn.type === 'container') return false;
                          const abs = getAbs(dn);
                          const cx = abs.x + (((dn.style?.width as number) || 160) / 2);
                          const cy = abs.y + (((dn.style?.height as number) || 60) / 2);
                          return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
                        });
                        if (cData.isHovered !== isHovered) return { ...node, data: { ...node.data, isHovered } };
                        return node;
                      });
                    });
                  }
                }}
                onEdgesChange={(changes) => {
                  setEdges((eds) => {
                    const next = applyEdgeChanges(changes, eds);
                    if (changes.some((c: any) => c.type === 'remove' || c.type === 'add' || c.type === 'reset' || c.type === 'select')) {
                      saveToHistory(nodes, next);
                    }
                    return next;
                  });
                }}
                onConnect={onConnect}
                onConnectStart={(e, params) => {
                  connectStartRef.current = { nodeId: params.nodeId, handleType: params.handleType } as any;
                }}
                onConnectEnd={() => {
                  connectStartRef.current = {};
                }}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                snapToGrid={snapToGrid}
                snapGrid={[15, 15]}
                fitView
                connectionMode={ConnectionMode.Loose}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
                selectNodesOnDrag={true}
                panOnDrag={[1, 2]}
                selectionOnDrag={true}
                multiSelectionKeyCode="Shift"
                proOptions={{ hideAttribution: true }}
                connectionLineStyle={{ stroke: '#10b981', strokeWidth: 3, strokeDasharray: '5,5' }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                  zIndex: 1000,
                }}
              >
                <Background />
                <Controls />
                
                <Panel position="top-right">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => reactFlowInstance?.zoomIn()}
                      disabled={!reactFlowInstance}
                    >
                      +
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => reactFlowInstance?.zoomOut()}
                      disabled={!reactFlowInstance}
                    >
                      -
                    </Button>
                    <Button size="sm" variant="secondary" onClick={exportJSON}>
                      <Download className="w-3 h-3 mr-2" />
                      JSON
                    </Button>
                    <Button size="sm" variant="secondary" onClick={exportAsJPG}>
                      <Image className="w-3 h-3 mr-2" />
                      JPG
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

      {/* Floating Inspector Panel - Only visible when something is selected */}
      {hasSelection && (
        <div className={`absolute top-4 right-4 ${isFullscreen ? 'w-72' : 'w-80'} h-[calc(100%-2rem)] z-50 animate-slide-in-right`}>
          <InspectorPanel
            selectedNodes={selectedNodes}
            selectedEdges={selectedEdges}
          allNodes={nodes}
          allEdges={edges}
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
              
              // Remove from any container's contains array
              const finalUpdated = updated.map((n) => {
                if (n.type === 'container') {
                  const cData = n.data as ContainerNodeData;
                  if (cData.contains?.includes(id)) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        contains: cData.contains.filter((nid) => nid !== id),
                      },
                    };
                  }
                }
                return n;
              });
              
              const updatedEdges = edges.filter((e) => e.source !== id && e.target !== id);
              setEdges(updatedEdges);
              saveToHistory(finalUpdated, updatedEdges);
              return finalUpdated;
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
              // Check if this is a container with contents
              if (node.type === 'container') {
                const containerData = node.data as ContainerNodeData;
                const containedNodeIds = containerData.contains || [];
                
                // Create new IDs mapping for contained nodes
                const idMap = new Map<string, string>();
                const newContainedNodes: Node[] = [];
                
                // Calculate offset for side-by-side placement
                const containerWidth = (node.style?.width as number) || node.width || 400;
                const horizontalOffset = containerWidth + 50; // Container width + spacing
                const verticalOffset = 0; // Keep same Y position for side-by-side
                
                // Duplicate all contained nodes with same offset
                containedNodeIds.forEach((containedId) => {
                  const containedNode = nodes.find((n) => n.id === containedId);
                  if (containedNode) {
                    const newId = getId();
                    idMap.set(containedId, newId);
                    newContainedNodes.push({
                      ...containedNode,
                      id: newId,
                      position: { 
                        x: containedNode.position.x + horizontalOffset, 
                        y: containedNode.position.y + verticalOffset 
                      },
                      data: { ...containedNode.data },
                    });
                  }
                });
                
                // Create new container with same offset
                const newContainerId = getId();
                const newContainer: Node = {
                  ...node,
                  id: newContainerId,
                  position: { x: node.position.x + horizontalOffset, y: node.position.y + verticalOffset },
                  data: { 
                    ...node.data, 
                    label: `${node.data.label} (copy)`,
                    contains: Array.from(idMap.values()),
                  },
                };
                
                // Add all new nodes
                setNodes((nds) => {
                  const updated = [...nds, newContainer, ...newContainedNodes];
                  // history will be saved after edges are duplicated
                  return updated;
                });
                
                // Duplicate internal edges (connections between contained nodes and container)
                const containedSet = new Set(containedNodeIds);
                const edgesToCopy = edges.filter((e) => {
                  const sourceIn = containedSet.has(e.source as string) || e.source === node.id;
                  const targetIn = containedSet.has(e.target as string) || e.target === node.id;
                  return sourceIn && targetIn; // both ends inside the group (or container)
                });

                const newEdges = edgesToCopy.map((e) => ({
                  ...e,
                  id: `edge_${Date.now()}_${Math.random()}`,
                  source: e.source === node.id ? newContainerId : (idMap.get(e.source as string) || e.source),
                  target: e.target === node.id ? newContainerId : (idMap.get(e.target as string) || e.target),
                  data: { ...e.data },
                }));

                // Append edges and save combined state
                setEdges((eds) => {
                  const finalEdges = [...eds, ...newEdges];
                  const finalNodes = [...nodes, newContainer, ...newContainedNodes];
                  saveToHistory(finalNodes, finalEdges);
                  return finalEdges;
                });
                
                toast.success(`Duplicated container with ${newContainedNodes.length} nodes and ${newEdges.length} connections`);
              } else {
                // Regular node duplication
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
          onCreateConnection={(sourceId, targetId) => {
            setEdges((eds) => {
              const uniqueId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                ? (crypto as any).randomUUID()
                : Math.random().toString(36).slice(2) + Date.now().toString(36);
              const newEdge = {
                id: `edge-${uniqueId}`,
                source: sourceId,
                target: targetId,
                type: 'smoothstep' as const,
                markerEnd: { type: MarkerType.ArrowClosed },
                data: { edgeType: 'directed' },
              };
              const updated = addEdge(newEdge as any, eds);
              saveToHistory(nodes, updated);
              toast.success('Connection created');
              return updated;
            });
          }}
          />
        </div>
      )}
    </div>
  );
}