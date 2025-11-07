import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Database, HardDrive, Cpu, Zap, Shield, Network, Server, Layers, Box, MessageSquare, Container, Cloud, CloudCog, CloudRain, Circle, ChevronDown, Workflow, Search, BarChart3, Flame, Binary } from 'lucide-react';

export type SymbolType = 
  | 'mysql' | 'postgres' | 'mongodb' | 'cassandra' | 'timeseries' | 'graphdb'
  | 'cache' | 'compute' | 'gpu-compute'
  | 'firewall' | 'lb-l4' | 'lb-l7' | 'storage' | 'message-queue' 
  | 'kubernetes' | 'custom'
  | 'kafka' | 'elasticsearch' | 'splunk' | 'spark' | 'hadoop'
  | 'aws-s3' | 'aws-ec2' | 'aws-ecs' | 'aws-eks' | 'aws-vpc' | 'aws-lambda' 
  | 'aws-sagemaker' | 'aws-dynamodb' | 'aws-opensearch' | 'aws-sns' | 'aws-sqs' 
  | 'aws-eventbridge' | 'aws-elb' | 'aws-ebs' | 'aws-elasticache'
  | 'azure-storage' | 'azure-vm' | 'azure-aci' | 'azure-aks' | 'azure-vnet' 
  | 'azure-functions' | 'azure-ml' | 'azure-cosmosdb' | 'azure-search' 
  | 'azure-servicebus' | 'azure-eventgrid' | 'azure-lb' | 'azure-disk' | 'azure-cache'
  | 'gcp-storage' | 'gcp-compute' | 'gcp-cloudrun' | 'gcp-gke' | 'gcp-vpc' 
  | 'gcp-functions' | 'gcp-vertex' | 'gcp-firestore' | 'gcp-search' 
  | 'gcp-pubsub' | 'gcp-eventarc' | 'gcp-lb' | 'gcp-disk' | 'gcp-memorystore';

interface Symbol {
  type: SymbolType;
  label: string;
  icon: any;
  color: string;
}

const databaseSymbols: Symbol[] = [
  { type: 'mysql', label: 'MySQL', icon: Database, color: '#00758f' },
  { type: 'postgres', label: 'PostgreSQL', icon: Database, color: '#336791' },
  { type: 'mongodb', label: 'MongoDB', icon: HardDrive, color: '#4db33d' },
  { type: 'cassandra', label: 'Cassandra', icon: HardDrive, color: '#1287b1' },
  { type: 'timeseries', label: 'TimeSeries DB', icon: Database, color: '#ff6b6b' },
  { type: 'graphdb', label: 'GraphDB', icon: Network, color: '#9b59b6' },
];

const awsSymbols: Symbol[] = [
  { type: 'aws-s3', label: 'S3', icon: Box, color: '#ff9900' },
  { type: 'aws-ec2', label: 'EC2', icon: Server, color: '#ff9900' },
  { type: 'aws-ecs', label: 'ECS', icon: Container, color: '#ff9900' },
  { type: 'aws-eks', label: 'EKS', icon: Container, color: '#ff9900' },
  { type: 'aws-vpc', label: 'VPC', icon: Network, color: '#ff9900' },
  { type: 'aws-lambda', label: 'Lambda', icon: Zap, color: '#ff9900' },
  { type: 'aws-sagemaker', label: 'SageMaker', icon: Cpu, color: '#ff9900' },
  { type: 'aws-dynamodb', label: 'DynamoDB', icon: Database, color: '#ff9900' },
  { type: 'aws-opensearch', label: 'OpenSearch', icon: Search, color: '#ff9900' },
  { type: 'aws-sns', label: 'SNS', icon: MessageSquare, color: '#ff9900' },
  { type: 'aws-sqs', label: 'SQS', icon: MessageSquare, color: '#ff9900' },
  { type: 'aws-eventbridge', label: 'EventBridge', icon: Workflow, color: '#ff9900' },
  { type: 'aws-elb', label: 'ELB', icon: Layers, color: '#ff9900' },
  { type: 'aws-ebs', label: 'EBS', icon: HardDrive, color: '#ff9900' },
  { type: 'aws-elasticache', label: 'ElastiCache', icon: Zap, color: '#ff9900' },
];

const azureSymbols: Symbol[] = [
  { type: 'azure-storage', label: 'Blob Storage', icon: Box, color: '#0078d4' },
  { type: 'azure-vm', label: 'Virtual Machine', icon: Server, color: '#0078d4' },
  { type: 'azure-aci', label: 'Container Instances', icon: Container, color: '#0078d4' },
  { type: 'azure-aks', label: 'AKS', icon: Container, color: '#0078d4' },
  { type: 'azure-vnet', label: 'Virtual Network', icon: Network, color: '#0078d4' },
  { type: 'azure-functions', label: 'Functions', icon: Zap, color: '#0078d4' },
  { type: 'azure-ml', label: 'Machine Learning', icon: Cpu, color: '#0078d4' },
  { type: 'azure-cosmosdb', label: 'Cosmos DB', icon: Database, color: '#0078d4' },
  { type: 'azure-search', label: 'Cognitive Search', icon: Search, color: '#0078d4' },
  { type: 'azure-servicebus', label: 'Service Bus', icon: MessageSquare, color: '#0078d4' },
  { type: 'azure-eventgrid', label: 'Event Grid', icon: Workflow, color: '#0078d4' },
  { type: 'azure-lb', label: 'Load Balancer', icon: Layers, color: '#0078d4' },
  { type: 'azure-disk', label: 'Managed Disk', icon: HardDrive, color: '#0078d4' },
  { type: 'azure-cache', label: 'Cache for Redis', icon: Zap, color: '#0078d4' },
];

const gcpSymbols: Symbol[] = [
  { type: 'gcp-storage', label: 'Cloud Storage', icon: Box, color: '#4285f4' },
  { type: 'gcp-compute', label: 'Compute Engine', icon: Server, color: '#4285f4' },
  { type: 'gcp-cloudrun', label: 'Cloud Run', icon: Container, color: '#4285f4' },
  { type: 'gcp-gke', label: 'GKE', icon: Container, color: '#4285f4' },
  { type: 'gcp-vpc', label: 'VPC', icon: Network, color: '#4285f4' },
  { type: 'gcp-functions', label: 'Cloud Functions', icon: Zap, color: '#4285f4' },
  { type: 'gcp-vertex', label: 'Vertex AI', icon: Cpu, color: '#4285f4' },
  { type: 'gcp-firestore', label: 'Firestore', icon: Database, color: '#4285f4' },
  { type: 'gcp-search', label: 'Search', icon: Search, color: '#4285f4' },
  { type: 'gcp-pubsub', label: 'Pub/Sub', icon: MessageSquare, color: '#4285f4' },
  { type: 'gcp-eventarc', label: 'Eventarc', icon: Workflow, color: '#4285f4' },
  { type: 'gcp-lb', label: 'Load Balancer', icon: Layers, color: '#4285f4' },
  { type: 'gcp-disk', label: 'Persistent Disk', icon: HardDrive, color: '#4285f4' },
  { type: 'gcp-memorystore', label: 'Memorystore', icon: Zap, color: '#4285f4' },
];

const baseSymbols: Symbol[] = [
  { type: 'cache', label: 'Cache', icon: Zap, color: '#f59e0b' },
  { type: 'compute', label: 'Compute Server', icon: Server, color: '#3b82f6' },
  { type: 'gpu-compute', label: 'GPU Compute', icon: Cpu, color: '#8b5cf6' },
  { type: 'firewall', label: 'Firewall', icon: Shield, color: '#ef4444' },
  { type: 'lb-l4', label: 'L4 Load Balancer', icon: Network, color: '#06b6d4' },
  { type: 'lb-l7', label: 'L7 Load Balancer', icon: Layers, color: '#0891b2' },
  { type: 'storage', label: 'Object Storage', icon: Box, color: '#84cc16' },
  { type: 'message-queue', label: 'Message Queue', icon: MessageSquare, color: '#f97316' },
  { type: 'kubernetes', label: 'Kubernetes', icon: Container, color: '#326ce5' },
  { type: 'kafka', label: 'Apache Kafka', icon: Workflow, color: '#231f20' },
  { type: 'elasticsearch', label: 'Elasticsearch', icon: Search, color: '#005571' },
  { type: 'splunk', label: 'Splunk', icon: BarChart3, color: '#000000' },
  { type: 'spark', label: 'Apache Spark', icon: Flame, color: '#e25a1c' },
  { type: 'hadoop', label: 'Apache Hadoop', icon: Binary, color: '#66ccff' },
  { type: 'custom', label: 'Custom Node', icon: Circle, color: '#6b7280' },
];

export const allSymbols = [...databaseSymbols, ...awsSymbols, ...azureSymbols, ...gcpSymbols, ...baseSymbols];

interface SymbolPaletteProps {
  onSymbolDragStart: (type: SymbolType) => void;
}

const SymbolGroup = ({ title, symbols, onSymbolDragStart }: { title: string, symbols: Symbol[], onSymbolDragStart: (type: SymbolType) => void }) => (
  <Collapsible defaultOpen>
    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-1 mt-1">
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
            className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors text-xs"
            style={{ borderLeftColor: symbol.color, borderLeftWidth: '2px' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: symbol.color }} />
            <span className="font-medium">{symbol.label}</span>
          </div>
        );
      })}
    </CollapsibleContent>
  </Collapsible>
);

export function SymbolPalette({ onSymbolDragStart }: SymbolPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filterSymbols = (symbols: Symbol[]) => {
    if (!searchQuery.trim()) return symbols;
    return symbols.filter(s => 
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredDb = filterSymbols(databaseSymbols);
  const filteredAws = filterSymbols(awsSymbols);
  const filteredAzure = filterSymbols(azureSymbols);
  const filteredGcp = filterSymbols(gcpSymbols);
  const filteredBase = filterSymbols(baseSymbols);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-3 border-b space-y-2">
        <h3 className="font-semibold text-sm">Symbol Palette</h3>
        <Input
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {filteredDb.length > 0 && <SymbolGroup title="Databases" symbols={filteredDb} onSymbolDragStart={onSymbolDragStart} />}
          {filteredAws.length > 0 && <SymbolGroup title="AWS Services" symbols={filteredAws} onSymbolDragStart={onSymbolDragStart} />}
          {filteredAzure.length > 0 && <SymbolGroup title="Azure Services" symbols={filteredAzure} onSymbolDragStart={onSymbolDragStart} />}
          {filteredGcp.length > 0 && <SymbolGroup title="GCP Services" symbols={filteredGcp} onSymbolDragStart={onSymbolDragStart} />}
          {filteredBase.length > 0 && <SymbolGroup title="Infrastructure" symbols={filteredBase} onSymbolDragStart={onSymbolDragStart} />}
          {filteredDb.length === 0 && filteredAws.length === 0 && filteredAzure.length === 0 && filteredGcp.length === 0 && filteredBase.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">No symbols found</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

export function getSymbolConfig(type: SymbolType): Symbol {
  return allSymbols.find(s => s.type === type) || allSymbols[allSymbols.length - 1];
}