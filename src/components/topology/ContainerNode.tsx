import { memo, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { getSymbolConfig, SymbolType } from './SymbolPalette';
import { Box } from 'lucide-react';

export interface ContainerNodeData extends Record<string, unknown> {
  label: string;
  symbolType: SymbolType;
  metadata?: Record<string, any>;
  contains?: string[]; // Array of node IDs contained in this container
  isHovered?: boolean; // Visual feedback when dragging over
}

export const ContainerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ContainerNodeData;
  const config = getSymbolConfig(nodeData.symbolType);
  const [isResizing, setIsResizing] = useState(false);
  
  const isHovered = nodeData.isHovered || false;
  const containsCount = nodeData.contains?.length || 0;

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        onResizeStart={() => setIsResizing(true)}
        onResizeEnd={() => setIsResizing(false)}
        lineClassName="!border-primary"
        handleClassName="!w-3 !h-3 !bg-primary"
      />
      
      <div
        className="w-full h-full rounded-lg border-2 transition-all"
        style={{
          borderColor: isHovered 
            ? 'hsl(var(--primary))' 
            : selected 
              ? config.color 
              : '#94a3b8',
          borderStyle: 'dashed',
          backgroundColor: 'transparent',
          boxShadow: isHovered 
            ? `0 0 0 4px ${config.color}20` 
            : selected 
              ? `0 0 0 2px ${config.color}40` 
              : undefined,
          pointerEvents: 'none',
        }}
      >
        {/* Container header */}
        <div
          className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card shadow-sm"
          style={{
            borderColor: config.color,
            borderLeftWidth: '3px',
            pointerEvents: 'auto',
          }}
        >
          <Box className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
          <div className="font-semibold text-sm text-foreground">
            {nodeData.label}
          </div>
          {containsCount > 0 && (
            <div className="text-xs text-muted-foreground ml-1">
              ({containsCount})
            </div>
          )}
        </div>

        {/* Metadata display */}
        {nodeData.metadata && Object.keys(nodeData.metadata).filter(k => k !== 'allowTypeEdit').length > 0 && (
          <div className="absolute top-12 left-2 text-xs text-muted-foreground space-y-0.5 bg-card px-2 py-1 rounded border" style={{ pointerEvents: 'auto' }}>
            {Object.entries(nodeData.metadata)
              .filter(([key]) => key !== 'allowTypeEdit')
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
          </div>
        )}

        {/* Visual feedback on hover - no text */}
      </div>

      {/* Connection handles */}
      <Handle 
        id="s-top"
        type="source" 
        position={Position.Top} 
        className="w-4 h-4 !bg-green-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#10b981', opacity: 1 }}
      />
      <Handle 
        id="s-right"
        type="source" 
        position={Position.Right} 
        className="w-4 h-4 !bg-green-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#10b981', opacity: 1 }}
      />
      <Handle 
        id="s-bottom"
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 !bg-green-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#10b981', opacity: 1 }}
      />
      <Handle 
        id="s-left"
        type="source" 
        position={Position.Left} 
        className="w-4 h-4 !bg-green-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#10b981', opacity: 1 }}
      />
      
      <Handle 
        id="t-top"
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 !bg-blue-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#3b82f6', opacity: 1 }}
      />
      <Handle 
        id="t-right"
        type="target" 
        position={Position.Right} 
        className="w-4 h-4 !bg-blue-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#3b82f6', opacity: 1 }}
      />
      <Handle 
        id="t-bottom"
        type="target" 
        position={Position.Bottom} 
        className="w-4 h-4 !bg-blue-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#3b82f6', opacity: 1 }}
      />
      <Handle 
        id="t-left"
        type="target" 
        position={Position.Left} 
        className="w-4 h-4 !bg-blue-500 !border-2 !border-background hover:scale-150 transition-transform !cursor-crosshair !opacity-100" 
        isConnectable={true}
        style={{ background: '#3b82f6', opacity: 1 }}
      />
    </>
  );
});
