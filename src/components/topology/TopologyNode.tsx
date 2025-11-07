import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getSymbolConfig, SymbolType } from './SymbolPalette';
import { Database, HardDrive, Cpu, Zap, Shield, Network, Server, Layers, Box, MessageSquare, Container, Cloud, CloudCog, CloudRain, Circle, Search, BarChart3, Flame, Binary, Workflow } from 'lucide-react';

const iconMap: Record<SymbolType, any> = {
  'mysql': Database,
  'postgres': Database,
  'mongodb': HardDrive,
  'cassandra': HardDrive,
  'timeseries': Database,
  'graphdb': Network,
  'cache': Zap,
  'compute': Server,
  'gpu-compute': Cpu,
  'firewall': Shield,
  'lb-l4': Network,
  'lb-l7': Layers,
  'storage': Box,
  'message-queue': MessageSquare,
  'kubernetes': Container,
  'kafka': Workflow,
  'elasticsearch': Search,
  'splunk': BarChart3,
  'spark': Flame,
  'hadoop': Binary,
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
};

export interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  symbolType: SymbolType;
  metadata?: Record<string, any>;
}

export const TopologyNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TopologyNodeData;
  const config = getSymbolConfig(nodeData.symbolType);
  const Icon = iconMap[nodeData.symbolType];

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 bg-background shadow-md min-w-[160px] transition-all"
      style={{
        borderColor: selected ? config.color : '#e5e7eb',
        boxShadow: selected ? `0 0 0 2px ${config.color}40` : undefined,
      }}
    >
      {/* Handles: target on all sides */}
      <Handle 
        id="t-top"
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
      <Handle 
        id="t-left"
        type="target" 
        position={Position.Left} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
      <Handle 
        id="t-right"
        type="target" 
        position={Position.Right} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
      
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.color }} />
        <div className="font-semibold text-sm text-foreground flex-1 truncate">
          {nodeData.label}
        </div>
      </div>
      
      {nodeData.metadata && Object.keys(nodeData.metadata).length > 0 && (
        <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
          {Object.entries(nodeData.metadata).slice(0, 3).map(([key, value]) => (
            <div key={key} className="truncate">
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
      
      {/* Handles: source on all sides */}
      <Handle 
        id="s-bottom"
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
      <Handle 
        id="s-left"
        type="source" 
        position={Position.Left} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
      <Handle 
        id="s-right"
        type="source" 
        position={Position.Right} 
        className="w-4 h-4 !bg-primary !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: 'hsl(var(--primary))', opacity: 1 }}
      />
    </div>
  );
});