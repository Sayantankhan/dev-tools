import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getSymbolConfig, SymbolType } from './SymbolPalette';
import { Database, HardDrive, Cpu, Zap, Shield, Network, Server, Layers, Box, MessageSquare, Container, Cloud, CloudCog, CloudRain, Circle } from 'lucide-react';

const iconMap: Record<SymbolType, any> = {
  'database-sql': Database,
  'database-nosql': HardDrive,
  'cache': Zap,
  'compute': Server,
  'gpu-compute': Cpu,
  'firewall': Shield,
  'lb-l4': Network,
  'lb-l7': Layers,
  'storage': Box,
  'message-queue': MessageSquare,
  'kubernetes': Container,
  'aws': Cloud,
  'azure': CloudCog,
  'gcp': CloudRain,
  'custom': Circle,
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
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
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
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
});