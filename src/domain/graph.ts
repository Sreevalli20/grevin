import { Task } from '../types';

/**
 * Add business days to a YYYY-MM-DD date string based on enabled working days.
 */
export function addBusinessDays(startDateStr: string, days: number, workingDays: number[] = [1, 2, 3, 4, 5]): string {
  if (days <= 0) return startDateStr;
  const current = new Date(startDateStr + 'T00:00:00');
  let added = 0;
  
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1-7 (Mon-Sun)
    if (workingDays.includes(adjustedDay)) {
      added++;
    }
  }
  
  return current.toISOString().split('T')[0];
}

/**
 * Calculate difference in business days between two YYYY-MM-DD date strings.
 */
export function businessDaysDiff(startStr: string, endStr: string, workingDays: number[] = [1, 2, 3, 4, 5]): number {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  if (end <= start) return 0;
  
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (workingDays.includes(adjustedDay)) {
      count++;
    }
  }
  return count;
}

/**
 * Format date nicely
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface DependencyGraph {
  // Map of taskId -> array of taskIds that this task directly depends ON (predecessors)
  predecessors: Map<string, string[]>;
  // Map of taskId -> array of taskIds that depend ON this task (successors)
  successors: Map<string, string[]>;
}

export function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  tasks.forEach((task) => {
    predecessors.set(task.id, [...(task.dependencies || [])]);
    if (!successors.has(task.id)) {
      successors.set(task.id, []);
    }
  });

  tasks.forEach((task) => {
    (task.dependencies || []).forEach((depId) => {
      const succ = successors.get(depId) || [];
      if (!succ.includes(task.id)) {
        succ.push(task.id);
      }
      successors.set(depId, succ);
    });
  });

  return { predecessors, successors };
}

/**
 * Detect cycles in tasks dependency graph using DFS 3-color graph traversal.
 */
export function detectCycles(tasks: Task[]): { hasCycle: boolean; cyclePath?: string[] } {
  const graph = buildDependencyGraph(tasks);
  const color = new Map<string, 'WHITE' | 'GRAY' | 'BLACK'>();
  const parent = new Map<string, string | null>();

  tasks.forEach((t) => color.set(t.id, 'WHITE'));

  let detectedCycle: string[] | null = null;

  function dfs(u: string, pathStack: string[]): boolean {
    color.set(u, 'GRAY');
    pathStack.push(u);

    const succs = graph.successors.get(u) || [];
    for (const v of succs) {
      if (!color.has(v)) continue;
      const vColor = color.get(v);
      if (vColor === 'GRAY') {
        // Cycle found
        const cycleStartIndex = pathStack.indexOf(v);
        detectedCycle = [...pathStack.slice(cycleStartIndex), v];
        return true;
      }
      if (vColor === 'WHITE') {
        parent.set(v, u);
        if (dfs(v, pathStack)) return true;
      }
    }

    pathStack.pop();
    color.set(u, 'BLACK');
    return false;
  }

  for (const t of tasks) {
    if (color.get(t.id) === 'WHITE') {
      if (dfs(t.id, [])) {
        return { hasCycle: true, cyclePath: detectedCycle || undefined };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Validates whether adding a proposed dependency from predecessorId -> successorId would create a cycle.
 */
export function wouldCauseCycle(tasks: Task[], predecessorId: string, successorId: string): boolean {
  if (predecessorId === successorId) return true;
  // Clone tasks with simulated dependency
  const cloned = tasks.map((t) => {
    if (t.id === successorId) {
      const deps = t.dependencies.includes(predecessorId)
        ? t.dependencies
        : [...t.dependencies, predecessorId];
      return { ...t, dependencies: deps };
    }
    return t;
  });
  return detectCycles(cloned).hasCycle;
}

/**
 * Performs topological sort (Kahn's Algorithm). Returns taskIds in valid topological order.
 * Throws error if cycle is detected.
 */
export function topologicalSort(tasks: Task[]): string[] {
  const graph = buildDependencyGraph(tasks);
  const inDegree = new Map<string, number>();

  tasks.forEach((t) => {
    inDegree.set(t.id, (t.dependencies || []).length);
  });

  const queue: string[] = [];
  tasks.forEach((t) => {
    if ((inDegree.get(t.id) || 0) === 0) {
      queue.push(t.id);
    }
  });

  const sorted: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);

    const succs = graph.successors.get(u) || [];
    for (const v of succs) {
      const deg = (inDegree.get(v) || 0) - 1;
      inDegree.set(v, deg);
      if (deg === 0) {
        queue.push(v);
      }
    }
  }

  if (sorted.length !== tasks.length) {
    throw new Error('Graph contains a dependency cycle; topological sort not possible.');
  }

  return sorted;
}

/**
 * Get all transitive downstream dependents of a task (BFS).
 */
export function getTransitiveDependents(taskId: string, tasks: Task[]): string[] {
  const graph = buildDependencyGraph(tasks);
  const visited = new Set<string>();
  const queue = [...(graph.successors.get(taskId) || [])];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (!visited.has(curr)) {
      visited.add(curr);
      const nextSuccs = graph.successors.get(curr) || [];
      for (const n of nextSuccs) {
        if (!visited.has(n)) {
          queue.push(n);
        }
      }
    }
  }

  return Array.from(visited);
}

export interface CriticalPathResult {
  criticalTaskIds: Set<string>;
  totalProjectDurationDays: number;
  slackByTask: Map<string, number>;
}

/**
 * Calculates Critical Path using forward & backward pass over the task DAG.
 */
export function calculateCriticalPath(tasks: Task[]): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      criticalTaskIds: new Set(),
      totalProjectDurationDays: 0,
      slackByTask: new Map(),
    };
  }

  const { hasCycle } = detectCycles(tasks);
  if (hasCycle) {
    return {
      criticalTaskIds: new Set(),
      totalProjectDurationDays: 0,
      slackByTask: new Map(),
    };
  }

  const order = topologicalSort(tasks);
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const graph = buildDependencyGraph(tasks);

  // Forward Pass: Earliest Start (ES) and Earliest Finish (EF) in days from start
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  order.forEach((id) => {
    const task = taskMap.get(id)!;
    const preds = graph.predecessors.get(id) || [];
    let maxPredEf = 0;
    preds.forEach((pId) => {
      const predEf = ef.get(pId) || 0;
      if (predEf > maxPredEf) maxPredEf = predEf;
    });
    es.set(id, maxPredEf);
    ef.set(id, maxPredEf + Math.max(1, task.durationDays));
  });

  // Project completion time
  let maxProjectDuration = 0;
  tasks.forEach((t) => {
    const finish = ef.get(t.id) || 0;
    if (finish > maxProjectDuration) {
      maxProjectDuration = finish;
    }
  });

  // Backward Pass: Latest Finish (LF) and Latest Start (LS)
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const task = taskMap.get(id)!;
    const succs = graph.successors.get(id) || [];

    if (succs.length === 0) {
      lf.set(id, maxProjectDuration);
    } else {
      let minSuccLs = Infinity;
      succs.forEach((sId) => {
        const succLs = ls.get(sId) ?? maxProjectDuration;
        if (succLs < minSuccLs) minSuccLs = succLs;
      });
      lf.set(id, minSuccLs);
    }

    const curLf = lf.get(id)!;
    ls.set(id, curLf - Math.max(1, task.durationDays));
  }

  // Slack / Float = LF - EF (or LS - ES)
  const slackByTask = new Map<string, number>();
  const criticalTaskIds = new Set<string>();

  tasks.forEach((t) => {
    const taskEf = ef.get(t.id) || 0;
    const taskLf = lf.get(t.id) || 0;
    const slack = Math.max(0, taskLf - taskEf);
    slackByTask.set(t.id, slack);
    if (slack === 0) {
      criticalTaskIds.add(t.id);
    }
  });

  return {
    criticalTaskIds,
    totalProjectDurationDays: maxProjectDuration,
    slackByTask,
  };
}
