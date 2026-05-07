import React, { useMemo } from "react";
import type { ReactiveNode } from "@/lib/nexus/interpreter";

interface ReactiveGraphProps {
  nodes: ReactiveNode[];
}

export default function ReactiveGraph({ nodes }: ReactiveGraphProps) {
  // Very simplistic auto-layout for DAGs
  const layout = useMemo(() => {
    if (!nodes || nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };
    
    // Calculate levels based on dependencies
    const nodeMap = new Map<string, ReactiveNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));
    
    const levels = new Map<string, number>();
    
    const getLevel = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0; // handle cycle
      if (levels.has(id)) return levels.get(id)!;
      
      const node = nodeMap.get(id);
      if (!node || !node.dependencies || node.dependencies.length === 0) {
        levels.set(id, 0);
        return 0;
      }
      
      visited.add(id);
      const depLevels = node.dependencies.map(depLabel => {
        // find node by label
        const depNode = nodes.find(n => n.label === depLabel);
        return depNode ? getLevel(depNode.id, visited) : -1;
      });
      visited.delete(id);
      
      const maxLvl = Math.max(-1, ...depLevels) + 1;
      levels.set(id, maxLvl);
      return maxLvl;
    };
    
    nodes.forEach(n => getLevel(n.id));
    
    // Group by level
    const levelGroups: Record<number, string[]> = {};
    let maxLevel = 0;
    levels.forEach((lvl, id) => {
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(id);
      if (lvl > maxLevel) maxLevel = lvl;
    });
    
    const NODE_WIDTH = 120;
    const NODE_HEIGHT = 40;
    const X_SPACING = 200;
    const Y_SPACING = 80;
    
    const positions = new Map<string, {x: number, y: number}>();
    
    for (let l = 0; l <= maxLevel; l++) {
      const group = levelGroups[l] || [];
      const totalH = group.length * Y_SPACING - (Y_SPACING - NODE_HEIGHT);
      let startY = (Math.max(1, nodes.length / 2) * Y_SPACING) - (totalH / 2);
      
      group.forEach((id, idx) => {
        positions.set(id, {
          x: 50 + l * X_SPACING,
          y: Math.max(50, startY + idx * Y_SPACING)
        });
      });
    }
    
    const laidOutNodes = nodes.map(n => ({
      ...n,
      ...positions.get(n.id)!
    }));
    
    const edges: {id: string, x1: number, y1: number, x2: number, y2: number}[] = [];
    
    laidOutNodes.forEach(target => {
      if (!target.dependencies) return;
      target.dependencies.forEach(depLabel => {
        const source = laidOutNodes.find(n => n.label === depLabel);
        if (source) {
          edges.push({
            id: `${source.id}-${target.id}`,
            x1: source.x + NODE_WIDTH,
            y1: source.y + NODE_HEIGHT / 2,
            x2: target.x,
            y2: target.y + NODE_HEIGHT / 2
          });
        }
      });
    });
    
    const width = 100 + (maxLevel + 1) * X_SPACING + NODE_WIDTH;
    let height = 0;
    positions.forEach(p => { if (p.y > height) height = p.y; });
    height += 100;
    
    return { nodes: laidOutNodes, edges, width, height: Math.max(height, 300) };
  }, [nodes]);

  if (!nodes || nodes.length === 0) {
    return <div className="p-4 text-xs text-muted-foreground italic">No reactive nodes registered</div>;
  }

  const getColor = (kind: string) => {
    switch (kind) {
      case "entity": return "#a855f7"; // purple
      case "sensor": return "#06b6d4"; // cyan
      case "equation": return "#f97316"; // orange
      case "variable": return "#3b82f6"; // blue
      case "skill": return "#22c55e"; // green
      default: return "#71717a";
    }
  };

  return (
    <div className="w-full h-full overflow-auto bg-[#0a0a0f] relative">
      <svg width={layout.width} height={layout.height} className="min-w-full min-h-full">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
          </marker>
        </defs>
        
        {layout.edges.map(e => {
          // simple bezier curve
          const mx = (e.x1 + e.x2) / 2;
          const path = `M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`;
          return (
            <g key={e.id}>
              <path 
                d={path} 
                fill="none" 
                stroke="#4b5563" 
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              <path 
                d={path} 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2"
                className="animate-pulse"
                style={{ animationDuration: '2s', opacity: 0.3 }}
              />
            </g>
          );
        })}
        
        {layout.nodes.map(n => {
          const color = getColor(n.kind);
          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect 
                width="120" 
                height="40" 
                rx="6" 
                fill="#18181b" 
                stroke={color}
                strokeWidth="1.5"
              />
              <circle cx="10" cy="20" r="4" fill={color} />
              <text x="22" y="18" fill="#e4e4e7" fontSize="11" fontFamily="monospace" fontWeight="bold">
                {n.label}
              </text>
              <text x="22" y="32" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                {n.kind} {n.value ? `(${n.value})` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
