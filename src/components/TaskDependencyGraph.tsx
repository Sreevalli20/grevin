import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { AffectedTask, Task } from '../types';
import { CriticalPathResult } from '../domain/graph';

interface TaskDependencyGraphProps {
  tasks: Task[];
  cpm: CriticalPathResult;
  affectedTasks?: AffectedTask[];
  onSelectTask?: (task: Task) => void;
}

interface NodePosition {
  id: string;
  task: Task;
  layer: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isCritical: boolean;
  affectedInfo?: AffectedTask;
}

export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  tasks,
  cpm,
  affectedTasks = [],
  onSelectTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.9);
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const affectedMap = useMemo(() => {
    return new Map<string, AffectedTask>(affectedTasks.map((at) => [at.taskId, at]));
  }, [affectedTasks]);

  // Compute topological layer layout
  const { nodes, edges, graphWidth, graphHeight } = useMemo(() => {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], graphWidth: 600, graphHeight: 400 };
    }

    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));

    // Compute layer (longest path from source)
    const layerMap = new Map<string, number>();

    function getLayer(taskId: string, visited: Set<string>): number {
      if (layerMap.has(taskId)) return layerMap.get(taskId)!;
      if (visited.has(taskId)) return 0; // Avoid cyclic blowup
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        layerMap.set(taskId, 0);
        return 0;
      }

      let maxPredLayer = -1;
      task.dependencies.forEach((predId) => {
        if (taskMap.has(predId)) {
          const l = getLayer(predId, new Set(visited));
          if (l > maxPredLayer) maxPredLayer = l;
        }
      });

      const finalLayer = maxPredLayer + 1;
      layerMap.set(taskId, finalLayer);
      return finalLayer;
    }

    tasks.forEach((t) => getLayer(t.id, new Set()));

    // Group by layer
    const layerBuckets = new Map<number, Task[]>();
    tasks.forEach((t) => {
      const l = layerMap.get(t.id) || 0;
      const bucket = layerBuckets.get(l) || [];
      bucket.push(t);
      layerBuckets.set(l, bucket);
    });

    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 100;
    const LAYER_GAP_X = 130;
    const NODE_GAP_Y = 40;

    const positionedNodes: NodePosition[] = [];
    let maxX = 0;
    let maxY = 0;

    const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);

    sortedLayers.forEach((layer) => {
      const tasksInLayer = layerBuckets.get(layer) || [];
      const x = layer * (NODE_WIDTH + LAYER_GAP_X) + 40;

      tasksInLayer.forEach((task, idx) => {
        const y = idx * (NODE_HEIGHT + NODE_GAP_Y) + 40;
        const isCritical = cpm.criticalTaskIds.has(task.id);
        const affectedInfo = affectedMap.get(task.id);

        positionedNodes.push({
          id: task.id,
          task,
          layer,
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          isCritical,
          affectedInfo,
        });

        if (x + NODE_WIDTH + 60 > maxX) maxX = x + NODE_WIDTH + 60;
        if (y + NODE_HEIGHT + 60 > maxY) maxY = y + NODE_HEIGHT + 60;
      });
    });

    // Node lookup for edges
    const posLookup = new Map<string, NodePosition>(positionedNodes.map((n) => [n.id, n]));

    // Construct directed edges
    const computedEdges: {
      id: string;
      from: NodePosition;
      to: NodePosition;
      pathD: string;
      isCritical: boolean;
      isAffected: boolean;
    }[] = [];

    tasks.forEach((task) => {
      const toNode = posLookup.get(task.id);
      if (!toNode) return;

      (task.dependencies || []).forEach((predId) => {
        const fromNode = posLookup.get(predId);
        if (!fromNode) return;

        const startX = fromNode.x + fromNode.width;
        const startY = fromNode.y + fromNode.height / 2;
        const endX = toNode.x;
        const endY = toNode.y + toNode.height / 2;

        const dx = endX - startX;
        const ctrl1X = startX + dx * 0.5;
        const ctrl1Y = startY;
        const ctrl2X = startX + dx * 0.5;
        const ctrl2Y = endY;

        const pathD = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;
        const isCriticalEdge = fromNode.isCritical && toNode.isCritical;
        const isAffectedEdge = Boolean(fromNode.affectedInfo || toNode.affectedInfo);

        computedEdges.push({
          id: `edge-${fromNode.id}-${toNode.id}`,
          from: fromNode,
          to: toNode,
          pathD,
          isCritical: isCriticalEdge,
          isAffected: isAffectedEdge,
        });
      });
    });

    return {
      nodes: positionedNodes,
      edges: computedEdges,
      graphWidth: Math.max(maxX, 800),
      graphHeight: Math.max(maxY, 500),
    };
  }, [tasks, cpm, affectedMap]);

  // Pan and Zoom event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on canvas background, not when clicking on nodes
    if ((e.target as HTMLElement).closest('.graph-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(2.0, Math.max(0.4, prev * zoomFactor)));
  };

  const zoomIn = () => setScale((prev) => Math.min(2.0, prev + 0.15));
  const zoomOut = () => setScale((prev) => Math.max(0.4, prev - 0.15));
  const resetView = () => {
    setScale(0.9);
    setPan({ x: 30, y: 30 });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#090d16] flex flex-col overflow-hidden relative select-none">
      
      {/* Interactive Controls Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg shadow-lg">
        <button
          onClick={zoomIn}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
        <button
          onClick={resetView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-2 tabular-nums">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center gap-3 px-3 py-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg shadow-lg text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-rose-500 bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <span className="text-rose-300">Critical Path (CPM)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-amber-500 bg-amber-500/20" />
          <span className="text-amber-300">Disruption Delay</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-teal-500 bg-teal-500/20" />
          <span className="text-teal-300">Standard Task</span>
        </div>
      </div>

      {/* Hint at bottom */}
      <div className="absolute bottom-3 left-3 z-20 text-[10px] font-mono text-slate-500 flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
        <Move className="w-3 h-3 text-slate-400" />
        <span>Click and drag to pan · Scroll wheel to zoom · Click node to inspect</span>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-[520px] overflow-hidden cursor-grab ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        <svg
          width="100%"
          height="100%"
          className="w-full h-full"
        >
          <defs>
            {/* Standard Teal Arrow Marker */}
            <marker
              id="arrow-teal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#14b8a6" />
            </marker>

            {/* Critical Path Rose Arrow Marker */}
            <marker
              id="arrow-rose"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
            </marker>

            {/* Disruption Amber Arrow Marker */}
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
            </marker>

            {/* Subtle Grid Pattern */}
            <pattern
              id="graph-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeOpacity="0.5"
              />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#graph-grid)" />

          {/* Transformable Canvas Group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            
            {/* EDGES LAYER */}
            {edges.map((edge) => {
              const isCrit = edge.isCritical;
              const isAff = edge.isAffected;

              return (
                <g key={edge.id}>
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={
                      isCrit
                        ? '#f43f5e'
                        : isAff
                        ? '#f59e0b'
                        : '#334155'
                    }
                    strokeWidth={isCrit ? 2.5 : isAff ? 2 : 1.5}
                    strokeDasharray={isAff && !isCrit ? '4,4' : undefined}
                    markerEnd={
                      isCrit
                        ? 'url(#arrow-rose)'
                        : isAff
                        ? 'url(#arrow-amber)'
                        : 'url(#arrow-teal)'
                    }
                    className="transition-colors duration-150"
                  />
                </g>
              );
            })}

            {/* NODES LAYER */}
            {nodes.map((node) => {
              const isSelected = selectedTaskId === node.id;
              const hasAff = Boolean(node.affectedInfo);
              const isCrit = node.isCritical;

              let borderStroke = '#334155';
              let bgFill = '#0f172a';

              if (isCrit) {
                borderStroke = '#f43f5e';
                bgFill = '#1a1018';
              } else if (hasAff) {
                borderStroke = '#f59e0b';
                bgFill = '#1c170f';
              } else if (isSelected) {
                borderStroke = '#14b8a6';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="graph-node cursor-pointer group"
                  onClick={() => {
                    setSelectedTaskId(node.id);
                    if (onSelectTask) onSelectTask(node.task);
                  }}
                >
                  {/* Node Background Box */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx="8"
                    ry="8"
                    fill={bgFill}
                    stroke={borderStroke}
                    strokeWidth={isCrit ? 2 : isSelected ? 2 : 1}
                    className="transition-all duration-150 group-hover:filter group-hover:brightness-110"
                    style={{
                      filter: isCrit
                        ? 'drop-shadow(0 0 10px rgba(244,63,94,0.25))'
                        : hasAff
                        ? 'drop-shadow(0 0 8px rgba(245,158,11,0.2))'
                        : undefined,
                    }}
                  />

                  {/* Header Row in SVG */}
                  <foreignObject
                    x="10"
                    y="8"
                    width={node.width - 20}
                    height={node.height - 16}
                  >
                    <div className="h-full flex flex-col justify-between text-left pointer-events-none">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
                          <span className="font-semibold text-teal-400">
                            {node.task.code}
                          </span>
                          <div className="flex items-center gap-1">
                            {isCrit && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                CPM
                              </span>
                            )}
                            {hasAff && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                +{node.affectedInfo?.delayDays}d
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-slate-100 mt-1.5 truncate leading-tight">
                          {node.task.title}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{node.task.durationDays}d duration</span>
                        <span>{node.task.startDate}</span>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}

          </g>
        </svg>
      </div>

    </div>
  );
};
