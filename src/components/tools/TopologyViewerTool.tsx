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
import { CustomEdge } from '@/components/topology/CustomEdge';

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

export function TopologyViewerTool() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Helper: Check if a point is inside container bounds
  const isPointInsideContainer = useCallback((point: { x: number; y: number }, container: Node) => {
    const containerWidth = container.measured?.width || (container.style?.width as number) || container.width || 400;
    const containerHeight = container.measured?.height || (container.style?.height as number) || container.height || 300;
    
    return (
      point.x >= container.position.x &&
      point.x <= container.position.x + containerWidth &&
      point.y >= container.position.y &&
      point.y <= container.position.y + containerHeight
    );
  }, []);

  // Helper: Get node center point
  const getNodeCenter = useCallback((node: Node) => {
    const nodeWidth = (node.style?.width as number) || node.width || 160;
    const nodeHeight = (node.style?.height as number) || node.height || 60;
    return {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + nodeHeight / 2,
    };
  }, []);

  // Helper: Update container children based on containment
  const updateContainment = useCallback((allNodes: Node[]) => {
    const containers = allNodes.filter(n => n.type === 'container');
    const regularNodes = allNodes.filter(n => n.type !== 'container');
    
    let updated = [...allNodes];
    
    // For each container, recompute its children list
    containers.forEach(container => {
      const newChildren: string[] = [];
      
      regularNodes.forEach(node => {
        const center = getNodeCenter(node);
        if (isPointInsideContainer(center, container)) {
          newChildren.push(node.id);
        }
      });
      
      // Update container's contains array
      const currentContains = (container.data as ContainerNodeData).contains || [];
      if (JSON.stringify(currentContains.sort()) !== JSON.stringify(newChildren.sort())) {
        updated = updated.map(n => 
          n.id === container.id
            ? { ...n, data: { ...n.data, contains: newChildren } }
            : n
        );
      }
    });
    
    return updated;
  }, [isPointInsideContainer, getNodeCenter]);

  const onNodesChange = useCallback(
    (changes: any) => {
      // Apply React Flow's changes first
      rfOnNodesChange(changes);

      // After position changes, update container containment
      const hasPositionChange = changes.some((c: any) => c.type === 'position');
      
      if (hasPositionChange) {
        setNodes((nds) => {
          // Update containment for all nodes
          return updateContainment(nds);
        });
      }
    },
    [rfOnNodesChange, setNodes, updateContainment]
  );
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [copiedEdges, setCopiedEdges] = useState<Edge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const connectStartRef = useRef<{ nodeId?: string; handleType?: 'source' | 'target' }>({});
  
  const nodeTypes = { topology: TopologyNode, container: ContainerNode };
  const edgeTypes = { smoothstep: CustomEdge };

  // Apply edge styles dynamically with proper z-index for visibility
  const styledEdges = useMemo(() => 
    edges.map((edge) => ({
      ...edge,
      style: {
        strokeWidth: 2,
        stroke: edge.selected ? 'hsl(var(--primary))' : (edge.data?.color || '#64748b'),
        strokeDasharray: edge.data?.lineStyle === 'dotted' ? '5,5' : undefined,
      },
      zIndex: 1000,
      label: edge.data?.label || edge.label,
      labelStyle: { fill: 'hsl(var(--foreground))', fontWeight: 500, fontSize: 12 },
      labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.8 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: edge.data?.edgeType === 'undirected' ? undefined : { 
        type: MarkerType.ArrowClosed, 
        color: edge.selected ? 'hsl(var(--primary))' : (edge.data?.color || '#64748b') 
      },
      markerStart: edge.data?.edgeType === 'bidirectional' ? {
        type: MarkerType.ArrowClosed,
        color: edge.selected ? 'hsl(var(--primary))' : (edge.data?.color || '#64748b')
      } : undefined,
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
          }),
        },
        zIndex: isContainer ? 0 : 10, // Containers below, regular nodes above
        ...(isContainer 
          ? { style: { width: 400, height: 300 } }
          : { style: { width: 160, height: 60 } }
        ),
      };

      setNodes((nds) => {
        const updated = updateContainment([...nds, newNode]);
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
    // Helper to convert handle ID to position number (1-4)
    const getPositionFromHandle = (handleId: string | null | undefined): number | undefined => {
      if (!handleId) return undefined;
      const map: Record<string, number> = {
        's-top': 1, 't-top': 1,
        's-right': 2, 't-right': 2,
        's-bottom': 3, 't-bottom': 3,
        's-left': 4, 't-left': 4,
      };
      return map[handleId];
    };

    // Find which container each node belongs to
    const containerMap = new Map<string, string>(); // nodeId -> containerId
    nodes.filter(n => n.type === 'container').forEach(container => {
      const contains = (container.data as ContainerNodeData).contains || [];
      contains.forEach(nodeId => containerMap.set(nodeId, container.id));
    });

    const data = {
      nodes: nodes.map((n) => {
        const { allowTypeEdit, ...userMetadata } = n.data.metadata || {};
        const baseNode = {
          id: n.id,
          label: n.data.label,
          type: n.data.symbolType,
          metadata: userMetadata,
          position: n.position,
        };

        // Add container-specific fields
        if (n.type === 'container') {
          return {
            ...baseNode,
            width: (n.style?.width as number) || n.width || 400,
            height: (n.style?.height as number) || n.height || 300,
            contains: (n.data as ContainerNodeData).contains || [],
          };
        }

        // Add container reference for regular nodes
        const containerId = containerMap.get(n.id);
        return containerId ? { ...baseNode, container: containerId } : baseNode;
      }),
      edges: edges.map((e) => {
        const baseEdge = {
          id: e.id,
          from: e.source,
          to: e.target,
          label: e.label,
          type: e.data?.edgeType,
          weight: e.data?.weight,
          lineStyle: e.data?.lineStyle,
        };

        // Add connection positions (1-4)
        const fromPosition = getPositionFromHandle(e.sourceHandle);
        const toPosition = getPositionFromHandle(e.targetHandle);

        return {
          ...baseEdge,
          ...(fromPosition && { fromPosition }),
          ...(toPosition && { toPosition }),
        };
      }),
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

      // Helper to convert position number (1-4) to handle ID
      const getHandleFromPosition = (position: number | undefined, isSource: boolean): string | undefined => {
        if (!position) return undefined;
        const prefix = isSource ? 's' : 't';
        const map: Record<number, string> = {
          1: `${prefix}-top`,
          2: `${prefix}-right`,
          3: `${prefix}-bottom`,
          4: `${prefix}-left`,
        };
        return map[position];
      };

      const importedNodes: Node[] = data.nodes.map((node: any) => {
        const isContainer = node.type?.startsWith('container-');
        
        return {
          id: node.id || getId(),
          type: isContainer ? 'container' : 'topology',
          position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
          data: {
            label: node.label || node.name || node.id,
            symbolType: (node.type || 'custom') as SymbolType,
            metadata: { ...(node.metadata || {}), allowTypeEdit: (node.type === 'custom') || (node.metadata?.allowTypeEdit === true) },
            ...(isContainer && { contains: node.contains || [] }),
          },
          zIndex: isContainer ? 0 : 10,
          ...(isContainer 
            ? { style: { width: node.width || 400, height: node.height || 300 } }
            : { style: { width: 160, height: 60 } }
          ),
        };
      });

      const importedEdges: Edge[] = (data.edges || []).map((edge: any) => {
        const sourceHandle = getHandleFromPosition(edge.fromPosition, true);
        const targetHandle = getHandleFromPosition(edge.toPosition, false);

        return {
          id: edge.id || `edge_${Date.now()}_${Math.random()}`,
          source: edge.from || edge.source,
          target: edge.to || edge.target,
          label: edge.label,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          ...(sourceHandle && { sourceHandle }),
          ...(targetHandle && { targetHandle }),
          data: {
            edgeType: edge.type || 'directed',
            weight: edge.weight,
            lineStyle: edge.lineStyle || 'solid',
            color: '#64748b',
          },
        };
      });

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
      {/* Portal container for dropdowns in fullscreen mode */}
      <div ref={portalContainerRef} className="absolute inset-0 pointer-events-none z-[9999]" />
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

              /* Ensure containers render below regular nodes */
              .react-flow__node-container { 
                z-index: 0 !important; 
                pointer-events: all !important;
              }
              .react-flow__node-topology { 
                z-index: 10 !important; 
              }
              /* Keep resize handles above for usability */
              .react-flow__resize-control { 
                z-index: 100 !important; 
                pointer-events: all !important;
              }
              /* Edges should render above nodes */
              .react-flow__edges { z-index: 50 !important; }
              .react-flow__edge { z-index: 50 !important; }
              /* Connection line during dragging */
              .react-flow__connectionline { z-index: 60 !important; }
            `}</style>
            <div ref={reactFlowWrapper} className="w-full h-full">
              <ReactFlow
                style={{ width: '100%', height: '100%' }}
                nodes={nodes}
                edges={styledEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                panOnScroll
                panOnScrollMode={PanOnScrollMode.Free}
                zoomOnScroll={false}
                zoomOnPinch
              
                onNodesChange={onNodesChange}
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
        <div className={`absolute top-4 right-4 ${isFullscreen ? 'w-72' : 'w-80'} h-[calc(100%-2rem)] z-[3000] pointer-events-auto animate-slide-in-right`}>
          <InspectorPanel
            selectedNodes={selectedNodes}
            selectedEdges={selectedEdges}
          allNodes={nodes}
          allEdges={edges}
          portalContainer={portalContainerRef.current}
          onUpdateNode={(id, data) => {
            setNodes((nds) => {
              const updated = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
              saveToHistory(updated, edges);
              return updated;
            });
          }}
          onUpdateEdge={(id, data) => {
            console.log('[TopologyViewerTool] onUpdateEdge called:', id, data);
            setEdges((eds) => {
              const updated = eds.map((e) => (e.id === id ? { ...e, data, label: data.label } : e));
              console.log('[TopologyViewerTool] Updated edges:', updated);
              saveToHistory(nodes, updated);
              return updated;
            });
          }}
          onReattachEdge={(id, updates) => {
            setEdges((eds) => {
              const updated = eds.map((e) => (e.id === id ? { ...e, ...updates } : e));
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