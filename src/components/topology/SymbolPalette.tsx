import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, HardDrive, Cpu, Zap, Shield, Network, Server, Layers, Box, MessageSquare, Container, Cloud, CloudCog, CloudRain, Circle } from 'lucide-react';

export type SymbolType = 
  | 'database-sql' | 'database-nosql' | 'cache' | 'compute' | 'gpu-compute'
  | 'firewall' | 'lb-l4' | 'lb-l7' | 'storage' | 'message-queue' 
  | 'kubernetes' | 'aws' | 'azure' | 'gcp' | 'custom';

interface Symbol {
  type: SymbolType;
  label: string;
  icon: any;
  color: string;
}

const symbols: Symbol[] = [
  { type: 'database-sql', label: 'SQL Database', icon: Database, color: '#22c55e' },
  { type: 'database-nosql', label: 'NoSQL DB', icon: HardDrive, color: '#10b981' },
  { type: 'cache', label: 'Cache', icon: Zap, color: '#f59e0b' },
  { type: 'compute', label: 'Compute Server', icon: Server, color: '#3b82f6' },
  { type: 'gpu-compute', label: 'GPU Compute', icon: Cpu, color: '#8b5cf6' },
  { type: 'firewall', label: 'Firewall', icon: Shield, color: '#ef4444' },
  { type: 'lb-l4', label: 'L4 Load Balancer', icon: Network, color: '#06b6d4' },
  { type: 'lb-l7', label: 'L7 Load Balancer', icon: Layers, color: '#0891b2' },
  { type: 'storage', label: 'Object Storage', icon: Box, color: '#84cc16' },
  { type: 'message-queue', label: 'Message Queue', icon: MessageSquare, color: '#f97316' },
  { type: 'kubernetes', label: 'Kubernetes', icon: Container, color: '#326ce5' },
  { type: 'aws', label: 'AWS', icon: Cloud, color: '#ff9900' },
  { type: 'azure', label: 'Azure', icon: CloudCog, color: '#0078d4' },
  { type: 'gcp', label: 'GCP', icon: CloudRain, color: '#4285f4' },
  { type: 'custom', label: 'Custom Node', icon: Circle, color: '#6b7280' },
];

interface SymbolPaletteProps {
  onSymbolDragStart: (type: SymbolType) => void;
}

export function SymbolPalette({ onSymbolDragStart }: SymbolPaletteProps) {
  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Symbol Palette</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag symbols to canvas</p>
      </div>
      
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-3 space-y-2">
          {symbols.map((symbol) => {
            const Icon = symbol.icon;
            return (
              <div
                key={symbol.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', symbol.type);
                  e.dataTransfer.effectAllowed = 'move';
                  onSymbolDragStart(symbol.type);
                }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                style={{ borderLeftColor: symbol.color, borderLeftWidth: '3px' }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: symbol.color }} />
                <span className="text-sm font-medium">{symbol.label}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

export function getSymbolConfig(type: SymbolType): Symbol {
  return symbols.find(s => s.type === type) || symbols[symbols.length - 1];
}