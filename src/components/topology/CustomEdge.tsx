import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

// Non-interactive edge: editing is handled exclusively via the Inspector.
export function CustomEdge({
  id,
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
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        vectorEffect="non-scaling-stroke"
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
            className="nodrag nopan bg-background px-3 py-1 rounded text-xs font-medium border border-border shadow-md"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
