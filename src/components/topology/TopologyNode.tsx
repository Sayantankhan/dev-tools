import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import { getSymbolConfig, SymbolType } from './SymbolPalette';
import { Database, HardDrive, Cpu, Zap, Shield, Network, Server, Layers, Box, MessageSquare, Container, Cloud, CloudCog, CloudRain, Circle, Search, BarChart3, Flame, Binary, Workflow, Type, GalleryVerticalEnd, Router, ArrowLeftRight, GitBranch, ServerCog, Globe, Smartphone, Monitor } from 'lucide-react';

const iconMap: Record<SymbolType, any> = {
  'mysql': Database,
  'postgres': Database,
  'mongodb': HardDrive,
  'cassandra': HardDrive,
  'timeseries': Database,
  'graphdb': Network,
  'cache': Zap,
  'redis': Zap,
  'memcached': Zap,
  'hazelcast': Zap,
  'compute': Server,
  'gpu-compute': Cpu,
  'firewall': Shield,
  'gateway': GalleryVerticalEnd,
  'nat-gateway': ArrowLeftRight,
  'router': Router,
  'switch': Network,
  'bgp-router': Router,
  'transit-gateway': GitBranch,
  'proxy': ServerCog,
  'dns': Globe,
  'cdn': CloudCog,
  'lb-l4': Network,
  'lb-l7': Layers,
  'storage': Box,
  'message-queue': MessageSquare,
  'rabbitmq': MessageSquare,
  'kubernetes': Container,
  'kafka': Workflow,
  'elasticsearch': Search,
  'splunk': BarChart3,
  'spark': Flame,
  'hadoop': Binary,
  'grafana': BarChart3,
  'mobile': Smartphone,
  'website': Monitor,
  'text': Type,
  'custom': Circle,
  'aws-s3': Box,
  'aws-ec2': Server,
  'aws-ecs': Container,
  'aws-eks': Container,
  'aws-vpc': Network,
  'aws-lambda': Zap,
  'aws-sagemaker': Cpu,
  'aws-dynamodb': Database,
  'aws-opensearch': Search,
  'aws-sns': MessageSquare,
  'aws-sqs': MessageSquare,
  'aws-eventbridge': Workflow,
  'aws-elb': Layers,
  'aws-ebs': HardDrive,
  'aws-elasticache': Zap,
  'azure-storage': Box,
  'azure-vm': Server,
  'azure-aci': Container,
  'azure-aks': Container,
  'azure-vnet': Network,
  'azure-functions': Zap,
  'azure-ml': Cpu,
  'azure-cosmosdb': Database,
  'azure-search': Search,
  'azure-servicebus': MessageSquare,
  'azure-eventgrid': Workflow,
  'azure-lb': Layers,
  'azure-disk': HardDrive,
  'azure-cache': Zap,
  'gcp-storage': Box,
  'gcp-compute': Server,
  'gcp-cloudrun': Container,
  'gcp-gke': Container,
  'gcp-vpc': Network,
  'gcp-functions': Zap,
  'gcp-vertex': Cpu,
  'gcp-firestore': Database,
  'gcp-search': Search,
  'gcp-pubsub': MessageSquare,
  'gcp-eventarc': Workflow,
  'gcp-lb': Layers,
  'gcp-disk': HardDrive,
  'gcp-memorystore': Zap,
  'container-vpc': Box,
  'container-vnet': Box,
  'container-gcp-vpc': Box,
  'container-generic': Box,
};

export interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  symbolType: SymbolType;
  metadata?: Record<string, any>;
}

export const TopologyNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as TopologyNodeData;
  const config = getSymbolConfig(nodeData.symbolType);
  const Icon = iconMap[nodeData.symbolType];
  const { setNodes } = useReactFlow();
  
  // Text node - simplified rendering without handles
  if (nodeData.symbolType === 'text') {
    return (
      <div
        className="px-3 py-2 bg-transparent text-foreground font-medium"
        style={{
          outline: selected ? `2px solid ${config.color}` : 'none',
          outlineOffset: '4px',
        }}
      >
        {nodeData.label}
      </div>
    );
  }

  return (
    <div
      className="group rounded-lg border-2 bg-background shadow-md transition-all flex flex-col relative"
      style={{
        borderColor: selected ? config.color : '#e5e7eb',
        boxShadow: selected ? `0 0 0 2px ${config.color}40` : undefined,
        width: '100%',
        height: '100%',
        minWidth: '160px',
        minHeight: nodeData.metadata && Object.keys(nodeData.metadata).filter(k => k !== 'allowTypeEdit').length > 0 ? '100px' : '60px',
        padding: '3%',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={nodeData.metadata && Object.keys(nodeData.metadata).filter(k => k !== 'allowTypeEdit').length > 0 ? 100 : 60}
        lineStyle={{ borderColor: config.color }}
        handleStyle={{ borderColor: config.color }}
        onResize={(_, params) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    style: {
                      ...n.style,
                      width: params.width,
                      height: params.height,
                    },
                  }
                : n
            )
          );
        }}
      />
      {/* Connection Handles - Hidden by default, visible on hover/select */}
      <Handle 
        id="s-top"
        type="source" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ top: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="s-left"
        type="source" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ left: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="s-right"
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ right: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="s-bottom"
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={true}
        isConnectableEnd={false}
        style={{ bottom: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      
      {/* Target handles (to receive connections) */}
      <Handle 
        id="t-top"
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ top: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="t-left"
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ left: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="t-right"
        type="target" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ right: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      <Handle 
        id="t-bottom"
        type="target" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-primary hover:!w-5 hover:!h-5 hover:!bg-primary/90 transition-all duration-200 !border-2 !border-background shadow-sm !cursor-crosshair opacity-0 group-hover:opacity-100" 
        isConnectable={true}
        isConnectableStart={false}
        isConnectableEnd={true}
        style={{ bottom: -6, zIndex: 10, opacity: selected ? 1 : undefined }}
      />
      
      <div className="flex items-center gap-2 min-h-0">
        <Icon className="flex-shrink-0" style={{ color: config.color, width: '20%', height: 'auto', maxWidth: '28px', minWidth: '16px' }} />
        <div className="font-semibold text-foreground flex-1 truncate" style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
          {nodeData.label}
        </div>
      </div>
      
      {nodeData.metadata && Object.keys(nodeData.metadata).filter(k => k !== 'allowTypeEdit').length > 0 && (
        <div className="text-muted-foreground mt-2 space-y-0.5 overflow-hidden" style={{ fontSize: 'clamp(0.625rem, 2.5vw, 0.75rem)' }}>
          {Object.entries(nodeData.metadata)
            .filter(([key]) => key !== 'allowTypeEdit')
            .slice(0, 3)
            .map(([key, value]) => (
            <div key={key} className="truncate">
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
});