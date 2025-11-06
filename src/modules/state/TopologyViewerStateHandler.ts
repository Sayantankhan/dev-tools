import { useState, useCallback } from 'react';
import { Node, Edge, Connection } from '@xyflow/react';
import dagre from 'dagre';
import { toast } from 'sonner';

export type NodeType = 'router' | 'switch' | 'database' | 'service' | 'entity' | 'default';

export interface EntityField {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
}

export interface TopologyNode extends Node {
  type: NodeType;
  data: {
    label: string;
    nodeType?: NodeType;
    fields?: EntityField[];
    metadata?: Record<string, any>;
    collapsed?: boolean;
  };
}

export interface TopologyEdge extends Edge {
  data?: {
    weight?: number;
    edgeType?: 'directed' | 'undirected' | 'fk';
  };
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  metadata?: Record<string, any>;
}

export type LayoutType = 'dagre' | 'force' | 'radial';

export function TopologyViewerStateHandler() {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TopologyEdge | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('dagre');
  const [isProcessing, setIsProcessing] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<{ nodes: TopologyNode[]; edges: TopologyEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const helpers = {
    getNodeIcon: (type: NodeType): string => {
      const icons = {
        router: '🔀',
        switch: '🔁',
        database: '🗄️',
        service: '⚙️',
        entity: '📊',
        default: '⭕',
      };
      return icons[type] || icons.default;
    },

    getNodeColor: (type: NodeType): string => {
      const colors = {
        router: '#3b82f6',
        switch: '#8b5cf6',
        database: '#22c55e',
        service: '#f59e0b',
        entity: '#ec4899',
        default: '#6b7280',
      };
      return colors[type] || colors.default;
    },

    parseJSON: (jsonString: string): TopologyData => {
      try {
        const parsed = JSON.parse(jsonString);
        
        // Validate structure
        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid topology: nodes array required');
        }

        // Convert to internal format
        const nodes: TopologyNode[] = parsed.nodes.map((node: any, index: number) => ({
          id: node.id || `node-${index}`,
          type: 'default',
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.label || node.id || `Node ${index}`,
            nodeType: node.type || 'default',
            fields: node.fields || [],
            metadata: node.metadata || {},
            collapsed: node.collapsed || false,
          },
        }));

        const edges: TopologyEdge[] = (parsed.edges || []).map((edge: any, index: number) => ({
          id: edge.id || `edge-${index}`,
          source: edge.from || edge.source,
          target: edge.to || edge.target,
          label: edge.label,
          type: edge.type === 'fk' ? 'default' : 'default',
          data: {
            weight: edge.weight,
            edgeType: edge.type || 'directed',
          },
        }));

        return {
          nodes,
          edges,
          metadata: parsed.metadata || {},
        };
      } catch (error: any) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
    },

    validateTopology: (data: TopologyData): { valid: boolean; warnings: string[] } => {
      const warnings: string[] = [];
      const nodeIds = new Set(data.nodes.map(n => n.id));

      // Check for orphan edges
      data.edges.forEach(edge => {
        if (!nodeIds.has(edge.source)) {
          warnings.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
        }
        if (!nodeIds.has(edge.target)) {
          warnings.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
        }
      });

      // Check for duplicate node IDs
      const duplicates = data.nodes
        .map(n => n.id)
        .filter((id, index, arr) => arr.indexOf(id) !== index);
      
      if (duplicates.length > 0) {
        warnings.push(`Duplicate node IDs found: ${duplicates.join(', ')}`);
      }

      // Check for FK references in entity nodes
      data.nodes.forEach(node => {
        if (node.data.nodeType === 'entity' && node.data.fields) {
          node.data.fields.forEach(field => {
            if (field.fk) {
              const [targetEntity] = field.fk.split('.');
              if (!nodeIds.has(targetEntity)) {
                warnings.push(`FK reference ${field.fk} in ${node.id}.${field.name} points to non-existent entity`);
              }
            }
          });
        }
      });

      return { valid: warnings.length === 0, warnings };
    },

    applyDagreLayout: (nodes: TopologyNode[], edges: TopologyEdge[]): TopologyNode[] => {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 80 });

      nodes.forEach(node => {
        dagreGraph.setNode(node.id, { width: 200, height: 100 });
      });

      edges.forEach(edge => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      return nodes.map(node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 100,
            y: nodeWithPosition.y - 50,
          },
        };
      });
    },

    applyRadialLayout: (nodes: TopologyNode[], edges: TopologyEdge[]): TopologyNode[] => {
      const radius = Math.max(300, nodes.length * 20);
      const centerX = 400;
      const centerY = 300;

      return nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length;
        return {
          ...node,
          position: {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          },
        };
      });
    },

    getSampleTopology: (type: 'network' | 'database' | 'service'): string => {
      if (type === 'network') {
        return JSON.stringify({
          nodes: [
            { id: 'r1', label: 'Router 1', type: 'router' },
            { id: 'r2', label: 'Router 2', type: 'router' },
            { id: 's1', label: 'Switch 1', type: 'switch' },
            { id: 's2', label: 'Switch 2', type: 'switch' },
            { id: 'db1', label: 'Database', type: 'database' },
          ],
          edges: [
            { from: 'r1', to: 's1', label: '1 Gbps' },
            { from: 'r2', to: 's2', label: '1 Gbps' },
            { from: 's1', to: 'db1', label: '10 Gbps' },
            { from: 's2', to: 'db1', label: '10 Gbps' },
            { from: 'r1', to: 'r2', label: '100 Gbps' },
          ],
          metadata: { type: 'network', description: 'Sample network topology' },
        }, null, 2);
      } else if (type === 'database') {
        return JSON.stringify({
          nodes: [
            {
              id: 'users',
              label: 'users',
              type: 'entity',
              fields: [
                { name: 'id', type: 'int', pk: true },
                { name: 'email', type: 'string' },
                { name: 'profile_id', type: 'int', fk: 'profiles.id' },
              ],
            },
            {
              id: 'profiles',
              label: 'profiles',
              type: 'entity',
              fields: [
                { name: 'id', type: 'int', pk: true },
                { name: 'name', type: 'string' },
                { name: 'bio', type: 'text' },
              ],
            },
            {
              id: 'posts',
              label: 'posts',
              type: 'entity',
              fields: [
                { name: 'id', type: 'int', pk: true },
                { name: 'user_id', type: 'int', fk: 'users.id' },
                { name: 'title', type: 'string' },
                { name: 'content', type: 'text' },
              ],
            },
          ],
          edges: [
            { from: 'users', to: 'profiles', type: 'fk', label: 'profile_id → id' },
            { from: 'posts', to: 'users', type: 'fk', label: 'user_id → id' },
          ],
          metadata: { type: 'database', description: 'Sample ER diagram' },
        }, null, 2);
      } else {
        return JSON.stringify({
          nodes: [
            { id: 'api', label: 'API Gateway', type: 'service' },
            { id: 'auth', label: 'Auth Service', type: 'service' },
            { id: 'user', label: 'User Service', type: 'service' },
            { id: 'post', label: 'Post Service', type: 'service' },
            { id: 'db1', label: 'Auth DB', type: 'database' },
            { id: 'db2', label: 'User DB', type: 'database' },
            { id: 'db3', label: 'Post DB', type: 'database' },
          ],
          edges: [
            { from: 'api', to: 'auth' },
            { from: 'api', to: 'user' },
            { from: 'api', to: 'post' },
            { from: 'auth', to: 'db1' },
            { from: 'user', to: 'db2' },
            { from: 'post', to: 'db3' },
            { from: 'user', to: 'auth' },
            { from: 'post', to: 'user' },
          ],
          metadata: { type: 'service', description: 'Sample service mesh' },
        }, null, 2);
      }
    },

    exportToJSON: (nodes: TopologyNode[], edges: TopologyEdge[], meta: Record<string, any>): string => {
      const exportData = {
        nodes: nodes.map(node => ({
          id: node.id,
          label: node.data.label,
          type: node.data.nodeType,
          fields: node.data.fields,
          metadata: node.data.metadata,
          position: node.position,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: edge.label,
          type: edge.data?.edgeType,
          weight: edge.data?.weight,
        })),
        metadata: meta,
      };

      return JSON.stringify(exportData, null, 2);
    },
  };

  const actions = {
    handleFileUpload: useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setFileName(file.name);

      try {
        const text = await file.text();
        const topology = helpers.parseJSON(text);
        
        const validation = helpers.validateTopology(topology);
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => toast.warning(warning));
        }

        const layoutedNodes = helpers.applyDagreLayout(topology.nodes, topology.edges);
        
        setNodes(layoutedNodes);
        setEdges(topology.edges);
        setMetadata(topology.metadata || {});
        setRawInput(text);

        // Initialize history
        setHistory([{ nodes: layoutedNodes, edges: topology.edges }]);
        setHistoryIndex(0);

        toast.success(`Loaded ${topology.nodes.length} nodes and ${topology.edges.length} edges`);
      } catch (error: any) {
        toast.error(`Error loading file: ${error.message}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }, []),

    handlePasteData: useCallback(async () => {
      if (!rawInput.trim()) {
        toast.error('Please paste topology JSON first');
        return;
      }

      setIsProcessing(true);

      try {
        const topology = helpers.parseJSON(rawInput);
        
        const validation = helpers.validateTopology(topology);
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => toast.warning(warning));
        }

        const layoutedNodes = helpers.applyDagreLayout(topology.nodes, topology.edges);
        
        setNodes(layoutedNodes);
        setEdges(topology.edges);
        setMetadata(topology.metadata || {});

        setHistory([{ nodes: layoutedNodes, edges: topology.edges }]);
        setHistoryIndex(0);

        toast.success(`Loaded ${topology.nodes.length} nodes and ${topology.edges.length} edges`);
      } catch (error: any) {
        toast.error(`Error parsing JSON: ${error.message}`);
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }, [rawInput]),

    loadSampleTopology: useCallback(async (type: 'network' | 'database' | 'service') => {
      const sampleJSON = helpers.getSampleTopology(type);
      setRawInput(sampleJSON);
      setFileName(`sample-${type}.json`);

      const topology = helpers.parseJSON(sampleJSON);
      const layoutedNodes = helpers.applyDagreLayout(topology.nodes, topology.edges);
      
      setNodes(layoutedNodes);
      setEdges(topology.edges);
      setMetadata(topology.metadata || {});

      setHistory([{ nodes: layoutedNodes, edges: topology.edges }]);
      setHistoryIndex(0);

      toast.success(`Loaded sample ${type} topology`);
    }, []),

    applyLayout: useCallback((type: LayoutType) => {
      setLayoutType(type);
      
      let layoutedNodes: TopologyNode[];
      if (type === 'dagre') {
        layoutedNodes = helpers.applyDagreLayout(nodes, edges);
      } else if (type === 'radial') {
        layoutedNodes = helpers.applyRadialLayout(nodes, edges);
      } else {
        // Force layout would use react-flow's built-in force layout
        layoutedNodes = nodes;
      }

      setNodes(layoutedNodes);
      actions.saveToHistory(layoutedNodes, edges);
    }, [nodes, edges]),

    addNode: useCallback((nodeType: NodeType, position: { x: number; y: number }) => {
      const newNode: TopologyNode = {
        id: `node-${Date.now()}`,
        type: 'default',
        position,
        data: {
          label: `New ${nodeType}`,
          nodeType,
          fields: nodeType === 'entity' ? [] : undefined,
          metadata: {},
        },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      actions.saveToHistory(newNodes, edges);
      toast.success('Node added');
    }, [nodes, edges]),

    deleteNode: useCallback((nodeId: string) => {
      const newNodes = nodes.filter(n => n.id !== nodeId);
      const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
      
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNode(null);
      actions.saveToHistory(newNodes, newEdges);
      toast.success('Node deleted');
    }, [nodes, edges]),

    updateNode: useCallback((nodeId: string, updates: Partial<TopologyNode['data']>) => {
      const newNodes = nodes.map(node => 
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      );
      
      setNodes(newNodes);
      if (selectedNode?.id === nodeId) {
        setSelectedNode(newNodes.find(n => n.id === nodeId) || null);
      }
      actions.saveToHistory(newNodes, edges);
    }, [nodes, edges, selectedNode]),

    addEdge: useCallback((connection: Connection) => {
      const newEdge: TopologyEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: 'default',
        data: { edgeType: 'directed' },
      };

      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      actions.saveToHistory(nodes, newEdges);
      toast.success('Edge added');
    }, [nodes, edges]),

    deleteEdge: useCallback((edgeId: string) => {
      const newEdges = edges.filter(e => e.id !== edgeId);
      setEdges(newEdges);
      setSelectedEdge(null);
      actions.saveToHistory(nodes, newEdges);
      toast.success('Edge deleted');
    }, [nodes, edges]),

    saveToHistory: useCallback((newNodes: TopologyNode[], newEdges: TopologyEdge[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, edges: newEdges });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]),

    undo: useCallback(() => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        const state = history[newIndex];
        setNodes(state.nodes);
        setEdges(state.edges);
        setHistoryIndex(newIndex);
        toast.info('Undo');
      }
    }, [history, historyIndex]),

    redo: useCallback(() => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        const state = history[newIndex];
        setNodes(state.nodes);
        setEdges(state.edges);
        setHistoryIndex(newIndex);
        toast.info('Redo');
      }
    }, [history, historyIndex]),

    exportJSON: useCallback(() => {
      const jsonData = helpers.exportToJSON(nodes, edges, metadata);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topology-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exported');
    }, [nodes, edges, metadata]),

    handleClear: useCallback(() => {
      setNodes([]);
      setEdges([]);
      setRawInput('');
      setFileName(null);
      setSelectedNode(null);
      setSelectedEdge(null);
      setMetadata({});
      setHistory([]);
      setHistoryIndex(-1);
      toast.info('Topology cleared');
    }, []),
  };

  return {
    state: {
      nodes,
      edges,
      rawInput,
      fileName,
      selectedNode,
      selectedEdge,
      layoutType,
      isProcessing,
      metadata,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
    },
    setters: {
      setNodes,
      setEdges,
      setRawInput,
      setSelectedNode,
      setSelectedEdge,
      setLayoutType,
    },
    helpers,
    actions,
  };
}
