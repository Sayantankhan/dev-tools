import { useCallback, useState, useRef, useEffect } from 'react';
import { 
  EdgeProps, 
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
  Node,
} from '@xyflow/react';
import { toast } from 'sonner';

export function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  label,
  selected,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}: EdgeProps) {
  const { setEdges, getNodes } = useReactFlow();
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [tempTargetPos, setTempTargetPos] = useState<{ x: number; y: number } | null>(null);
  const [tempSourcePos, setTempSourcePos] = useState<{ x: number; y: number } | null>(null);
  
  // Calculate path
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: isDraggingSource && tempSourcePos ? tempSourcePos.x : sourceX,
    sourceY: isDraggingSource && tempSourcePos ? tempSourcePos.y : sourceY,
    sourcePosition,
    targetX: isDraggingTarget && tempTargetPos ? tempTargetPos.x : targetX,
    targetY: isDraggingTarget && tempTargetPos ? tempTargetPos.y : targetY,
    targetPosition,
  });

  // Find node at position
  const findNodeAtPosition = useCallback((x: number, y: number): Node | null => {
    const nodes = getNodes();
    return nodes.find(node => {
      const width = (node.measured?.width || (node.style?.width as number) || node.width || 160);
      const height = (node.measured?.height || (node.style?.height as number) || node.height || 60);
      
      return (
        x >= node.position.x &&
        x <= node.position.x + width &&
        y >= node.position.y &&
        y <= node.position.y + height
      );
    }) || null;
  }, [getNodes]);

  // Handle endpoint drag start
  const handleEndpointMouseDown = useCallback((e: React.MouseEvent, endpoint: 'source' | 'target') => {
    e.stopPropagation();
    if (endpoint === 'source') {
      setIsDraggingSource(true);
      setTempSourcePos({ x: sourceX, y: sourceY });
    } else {
      setIsDraggingTarget(true);
      setTempTargetPos({ x: targetX, y: targetY });
    }
  }, [sourceX, sourceY, targetX, targetY]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingTarget && !isDraggingSource) return;
    
    const flowPane = document.querySelector('.react-flow__pane') as HTMLElement;
    if (!flowPane) return;
    
    const bounds = flowPane.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    
    // Get zoom/pan transform
    const transform = window.getComputedStyle(flowPane).transform;
    const matrix = new DOMMatrix(transform);
    const scale = matrix.a;
    const translateX = matrix.e;
    const translateY = matrix.f;
    
    // Convert screen to flow coordinates
    const flowX = (x - translateX) / scale;
    const flowY = (y - translateY) / scale;
    
    if (isDraggingTarget) {
      setTempTargetPos({ x: flowX, y: flowY });
    } else if (isDraggingSource) {
      setTempSourcePos({ x: flowX, y: flowY });
    }
  }, [isDraggingTarget, isDraggingSource]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDraggingTarget && tempTargetPos) {
      const targetNode = findNodeAtPosition(tempTargetPos.x, tempTargetPos.y);
      
      if (targetNode && targetNode.id !== source) {
        setEdges((edges) =>
          edges.map((edge) =>
            edge.id === id
              ? { ...edge, target: targetNode.id }
              : edge
          )
        );
        toast.success('Connection reattached');
      }
      
      setIsDraggingTarget(false);
      setTempTargetPos(null);
    } else if (isDraggingSource && tempSourcePos) {
      const sourceNode = findNodeAtPosition(tempSourcePos.x, tempSourcePos.y);
      
      if (sourceNode && sourceNode.id !== target) {
        setEdges((edges) =>
          edges.map((edge) =>
            edge.id === id
              ? { ...edge, source: sourceNode.id }
              : edge
          )
        );
        toast.success('Connection reattached');
      }
      
      setIsDraggingSource(false);
      setTempSourcePos(null);
    }
  }, [isDraggingTarget, isDraggingSource, tempTargetPos, tempSourcePos, id, source, target, findNodeAtPosition, setEdges]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDraggingTarget(false);
      setIsDraggingSource(false);
      setTempTargetPos(null);
      setTempSourcePos(null);
    }
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isDraggingTarget || isDraggingSource) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDraggingTarget, isDraggingSource, handleMouseMove, handleMouseUp, handleKeyDown]);

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />

      {/* Source endpoint handle */}
      {selected && (
        <circle
          cx={sourceX}
          cy={sourceY}
          r={6}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth={2}
          className="cursor-move hover:scale-125 transition-transform"
          style={{ pointerEvents: 'all' }}
          onMouseDown={(e) => handleEndpointMouseDown(e, 'source')}
        />
      )}

      {/* Target endpoint handle */}
      {selected && (
        <circle
          cx={targetX}
          cy={targetY}
          r={6}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth={2}
          className="cursor-move hover:scale-125 transition-transform"
          style={{ pointerEvents: 'all' }}
          onMouseDown={(e) => handleEndpointMouseDown(e, 'target')}
        />
      )}

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan bg-background/90 px-2 py-1 rounded text-xs font-medium"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
